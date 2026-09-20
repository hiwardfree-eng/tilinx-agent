import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TilinXEvent } from "@tilinx/protocol";
import { expect, test } from "vitest";
import { FsWatcher } from "./watcher";

/**
 * A real fs.watch over a temp tree: a file write surfaces as a classified,
 * debounced event. Timing-tolerant — we wait up to a budget for the event.
 */
test("a write under an agent's .tilinx surfaces a debounced ActivityChanged", async () => {
  const root = mkdtempSync(join(tmpdir(), "tilinx-watch-"));
  const agentDir = join(root, "Work", "Sales", ".tilinx", "activity");
  mkdirSync(agentDir, { recursive: true });

  const events: TilinXEvent[] = [];
  const watcher = new FsWatcher(root, (e) => events.push(e), 50);
  watcher.start();

  try {
    // Give the recursive watch a moment to arm, then write.
    await new Promise((r) => setTimeout(r, 100));
    writeFileSync(
      join(agentDir, "activity.json"),
      JSON.stringify([{ id: "a1" }]),
    );

    const deadline = Date.now() + 3000;
    const expected = { type: "ActivityChanged", agentPath: "Work/Sales" };
    while (
      !events.some((event) =>
        Object.entries(expected).every(
          ([key, value]) => (event as Record<string, unknown>)[key] === value,
        ),
      ) &&
      Date.now() < deadline
    ) {
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(events).toContainEqual(expected);
  } finally {
    watcher.stop();
  }
});

test("a direct shared skill edit surfaces SharedSkillsChanged for its workspace", async () => {
  const root = mkdtempSync(join(tmpdir(), "tilinx-watch-"));
  const skillDir = join(root, "Work", ".shared", "skills", "research");
  mkdirSync(skillDir, { recursive: true });
  const events: TilinXEvent[] = [];
  const watcher = new FsWatcher(root, (event) => events.push(event), 50);
  watcher.start();

  try {
    await new Promise((resolve) => setTimeout(resolve, 100));
    writeFileSync(join(skillDir, "SKILL.md"), "---\nname: research\n---\n");

    const deadline = Date.now() + 3000;
    const expected = {
      type: "SharedSkillsChanged",
      workspaceId: "Work",
    };
    while (
      !events.some((event) =>
        Object.entries(expected).every(
          ([key, value]) => (event as Record<string, unknown>)[key] === value,
        ),
      ) &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(events).toContainEqual(expected);
  } finally {
    watcher.stop();
  }
});

test("stop() halts delivery", async () => {
  const root = mkdtempSync(join(tmpdir(), "tilinx-watch-"));
  mkdirSync(join(root, "W", "A"), { recursive: true });
  const events: TilinXEvent[] = [];
  const watcher = new FsWatcher(root, (e) => events.push(e), 20);
  watcher.start();
  watcher.stop();
  writeFileSync(join(root, "W", "A", "file.txt"), "x");
  await new Promise((r) => setTimeout(r, 200));
  expect(events).toHaveLength(0);
});
