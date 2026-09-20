import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

// Point the runtime's config at throwaway dirs BEFORE the module graph loads
// (config reads these at import), so wiring the backends doesn't touch the
// real ~/.tilinx.
process.env.TILINX_DATA_DIR = mkdtempSync(join(tmpdir(), "tilinx-cc-data-"));
process.env.TILINX_WORKSPACE_DIR = mkdtempSync(
  join(tmpdir(), "tilinx-cc-ws-"),
);

// The registrations (setDefaultBackend(pi) + registerBackend("anthropic",
// claude)) travel with `serverBackendFor`'s own module, so resolving through it
// can never find an empty registry.
const { serverBackendFor } = await import("./conversation-backends");

test("the anthropic provider resolves to the Claude backend, not pi", () => {
  const backend = serverBackendFor("anthropic");
  // The Claude Agent SDK backend registers under id "anthropic"; a fall-through
  // to the pi default (id "pi") would mean anthropic turns ran on pi's in-process
  // client — the harness-spoofing path the compliance gate forbids.
  expect(backend.id).toBe("anthropic");
  expect(backend.id).not.toBe("pi");
});

test("every other provider falls through to the pi default backend", () => {
  expect(serverBackendFor("openai-codex").id).toBe("pi");
  expect(serverBackendFor("google").id).toBe("pi");
});
