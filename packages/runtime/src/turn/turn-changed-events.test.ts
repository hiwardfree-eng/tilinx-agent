import { describe, expect, it } from "vitest";
import { announcedOpEvents, changedEventTypes } from "./turn-changed-events";

const layout = {
  workspaceRel: "workspaces/TilinX/Agent",
  dataRel: "workspaces/TilinX/Agent/.tilinx/runtime",
};

describe("changedEventTypes", () => {
  it("maps family docs to their domain events", () => {
    expect(
      changedEventTypes(layout, [
        "workspaces/TilinX/Agent/.tilinx/activity/activity.json",
        "workspaces/TilinX/Agent/.tilinx/routine_runs/routine_runs.json",
        "workspaces/TilinX/Agent/.tilinx/routines/routines.json",
        "workspaces/TilinX/Agent/.tilinx/config/config.json",
        "workspaces/TilinX/Agent/.tilinx/learnings/learnings.json",
        "custom-integrations.json",
      ]),
    ).toEqual([
      "ActivityChanged",
      "ConfigChanged",
      "CustomIntegrationsChanged",
      "LearningsChanged",
      "RoutineRunsChanged",
      "RoutinesChanged",
    ]);
  });

  it("maps conversation, file and skill writes; ignores sessions", () => {
    expect(
      changedEventTypes(layout, [
        "workspaces/TilinX/Agent/.tilinx/runtime/sessions/c1/log.jsonl",
        "workspaces/TilinX/Agent/.tilinx/runtime/conversations/c1.json",
        "workspaces/TilinX/Agent/files/report.md",
        "workspaces/TilinX/Agent/.agents/skills/foo/SKILL.md",
      ]),
    ).toEqual(["ConversationsChanged", "FilesChanged", "SkillsChanged"]);
  });

  it("dedupes and sorts", () => {
    expect(
      changedEventTypes(layout, [
        "workspaces/TilinX/Agent/.tilinx/runtime/conversations/c1.json",
        "workspaces/TilinX/Agent/.tilinx/activity/activity.json",
        "workspaces/TilinX/Agent/.tilinx/runtime/conversations/c2.json",
      ]),
    ).toEqual(["ActivityChanged", "ConversationsChanged"]);
  });

  it("isolates a sibling agent's doc; classifies this agent's schema file via the canonical rule", () => {
    // A sibling agent's key is outside this turn's workspaceRel, so it never
    // contributes — cross-agent isolation holds.
    expect(
      changedEventTypes(layout, [
        "workspaces/TilinX/Other/.tilinx/activity/activity.json",
      ]),
    ).toEqual([]);
    // The canonical classifier (agentFileEventType) is prefix-based, so this
    // agent's own activity SCHEMA file maps to ActivityChanged — a rare, safe
    // over-fire (a refetch), never a miss.
    expect(
      changedEventTypes(layout, [
        "workspaces/TilinX/Agent/.tilinx/activity/activity.schema.json",
      ]),
    ).toEqual(["ActivityChanged"]);
  });
});

describe("announcedOpEvents", () => {
  it("announces the handler's agent events once, sorted", () => {
    expect(
      announcedOpEvents(
        [
          { type: "RoutinesChanged", agentPath: "a" },
          { type: "ActivityChanged", agentPath: "a" },
          { type: "RoutinesChanged", agentPath: "a" },
          { type: "Toast", level: "info", message: "x" },
        ],
        [],
      ),
    ).toEqual(["ActivityChanged", "RoutinesChanged"]);
  });

  it("announces nothing when a projection failed", () => {
    // Other tabs would refetch a doc that lagged: the read falls to the pod.
    expect(
      announcedOpEvents(
        [{ type: "RoutinesChanged", agentPath: "a" }],
        ["routines: PUT rejected (503)"],
      ),
    ).toEqual([]);
  });
});
