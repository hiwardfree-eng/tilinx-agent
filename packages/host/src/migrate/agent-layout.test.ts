import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { learningsFromMarkdown, migrateAgentLayouts } from "./agent-layout";

let root: string;
let agent: string;

const write = (rel: string, content: string) => {
  const path = join(agent, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content, "utf8");
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "agent-layout-"));
  agent = join(root, "Personal", "Alfred");
  mkdirSync(join(agent, ".tilinx"), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("migrateAgentLayouts", () => {
  it("moves flat family files into per-type folders and keeps the originals", () => {
    write(".tilinx/activity.json", '{"items":[1]}');
    write(".tilinx/routines.json", "[]");

    const result = migrateAgentLayouts({ workspacesRoot: root, log: () => {} });

    expect(result).toEqual({ migratedAgents: 1, migratedFiles: 2 });
    expect(
      readFileSync(join(agent, ".tilinx/activity/activity.json"), "utf8"),
    ).toBe('{"items":[1]}');
    expect(
      readFileSync(join(agent, ".tilinx/routines/routines.json"), "utf8"),
    ).toBe("[]");
    // Rollback net: originals stay.
    expect(existsSync(join(agent, ".tilinx/activity.json"))).toBe(true);
    // Families that never existed are not created.
    expect(existsSync(join(agent, ".tilinx/config"))).toBe(false);
  });

  it("never overwrites an existing per-type file (idempotent re-run)", () => {
    write(".tilinx/config.json", '{"model":"opus"}');
    write(".tilinx/config/config.json", '{"model":"claude-opus-4-8"}');

    const result = migrateAgentLayouts({ workspacesRoot: root, log: () => {} });

    expect(result.migratedFiles).toBe(0);
    expect(
      readFileSync(join(agent, ".tilinx/config/config.json"), "utf8"),
    ).toBe('{"model":"claude-opus-4-8"}');
  });

  it("converts learnings.md bullets to learnings.json entries", () => {
    write(
      ".tilinx/memory/learnings.md",
      "- Prefers short answers\n\n* Uses metric units\nplain line\n   \n",
    );

    migrateAgentLayouts({ workspacesRoot: root, log: () => {} });

    const entries = JSON.parse(
      readFileSync(join(agent, ".tilinx/learnings/learnings.json"), "utf8"),
    ) as { id: string; text: string; created_at: string }[];
    expect(entries.map((e) => e.text)).toEqual([
      "Prefers short answers",
      "Uses metric units",
      "plain line",
    ]);
    for (const e of entries) {
      expect(e.id).toBeTruthy();
      expect(() => new Date(e.created_at)).not.toThrow();
    }
  });

  it("removes retired product prompt files", () => {
    write(".tilinx/prompts/system.md", "old product prompt");
    write(".tilinx/prompts/self-improvement.md", "old");

    migrateAgentLayouts({ workspacesRoot: root, log: () => {} });

    expect(existsSync(join(agent, ".tilinx/prompts/system.md"))).toBe(false);
    expect(
      existsSync(join(agent, ".tilinx/prompts/self-improvement.md")),
    ).toBe(false);
  });

  it("skips dirs without a .tilinx and dot-dirs, and survives a broken agent", () => {
    mkdirSync(join(root, "Personal", "no-tilinx-here"), { recursive: true });
    mkdirSync(join(root, ".hidden", "Agent", ".tilinx"), { recursive: true });
    // A .tilinx that is a FILE, not a dir → per-agent failure must not throw.
    const broken = join(root, "Personal", "Broken");
    mkdirSync(broken, { recursive: true });
    writeFileSync(join(broken, ".tilinx"), "not a dir", "utf8");
    write(".tilinx/activity.json", "[]");

    const lines: string[] = [];
    const result = migrateAgentLayouts({
      workspacesRoot: root,
      log: (l) => lines.push(l),
    });

    expect(result.migratedAgents).toBe(1);
    expect(
      existsSync(join(root, "Personal", "no-tilinx-here", ".tilinx")),
    ).toBe(false);
  });

  it("is a no-op on a missing workspaces root", () => {
    expect(
      migrateAgentLayouts({
        workspacesRoot: join(root, "does-not-exist"),
        log: () => {},
      }),
    ).toEqual({ migratedAgents: 0, migratedFiles: 0 });
  });
});

describe("learningsFromMarkdown", () => {
  it("strips bullet markers and blank lines", () => {
    const entries = learningsFromMarkdown(
      "- a\n* b\nc\n\n",
      "2026-01-01T00:00:00Z",
    ) as {
      text: string;
      created_at: string;
    }[];
    expect(entries.map((e) => e.text)).toEqual(["a", "b", "c"]);
    expect(entries.every((e) => e.created_at === "2026-01-01T00:00:00Z")).toBe(
      true,
    );
  });
});
