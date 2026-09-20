import { expect, test } from "vitest";
import { agentScopeIncludes } from "./turn-agent-scope";

const ROOT = "workspaces/Personal/Bob";

test.each([
  `${ROOT}/.tilinx/routines/routines.json`,
  `${ROOT}/.tilinx/learnings/learnings.json`,
  "custom-integrations.json",
  `${ROOT}/.agents/skills/example/SKILL.md`,
  `${ROOT}/notes.md`,
])("agent scope includes %s", (path) => {
  expect(agentScopeIncludes(path, ROOT)).toBe(true);
});

test.each([
  `${ROOT}/.tilinx/runtime/settings.json`,
  `${ROOT}/.tilinx/runtime/conversations/c1.json`,
  `${ROOT}/.tilinx/docs/activity/activity.json`,
  `${ROOT}/.tilinx/routines/other.json`,
  "workspaces/Personal/Alice/notes.md",
])("agent scope excludes %s", (path) => {
  expect(agentScopeIncludes(path, ROOT)).toBe(false);
});
