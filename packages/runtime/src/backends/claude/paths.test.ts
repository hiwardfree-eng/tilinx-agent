import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { claudeLoginConfigDir, claudeProjectsDir, tilinxHome } from "./paths";

const saved = process.env.TILINX_HOME;
afterEach(() => {
  if (saved === undefined) delete process.env.TILINX_HOME;
  else process.env.TILINX_HOME = saved;
});

test("claudeLoginConfigDir roots at TILINX_HOME/claude-login (workspace-shared)", () => {
  process.env.TILINX_HOME = "/home/x/.tilinx";
  // Not the per-agent dataDir: one dir all agents share, so a single login
  // connects every agent, and the Tauri shell (tilinx_dir()/claude-login)
  // derives the identical path.
  expect(claudeLoginConfigDir()).toBe("/home/x/.tilinx/claude-login");
  expect(claudeProjectsDir()).toBe("/home/x/.tilinx/claude-login/projects");
});

test("claudeLoginConfigDir takes an explicit home for testability", () => {
  expect(claudeLoginConfigDir("/data/root")).toBe(
    join("/data/root", "claude-login"),
  );
});

test("tilinxHome honors TILINX_HOME", () => {
  process.env.TILINX_HOME = "/opt/tilinx";
  expect(tilinxHome()).toBe("/opt/tilinx");
});
