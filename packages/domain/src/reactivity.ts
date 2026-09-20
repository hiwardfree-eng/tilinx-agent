import type { TilinXEvent } from "@tilinx/protocol";

/**
 * Map an agent-relative path (the part AFTER `<Workspace>/<Agent>/`, e.g.
 * `.tilinx/config/config.json` or `CLAUDE.md`) to the reactivity event a
 * mutation of that path should raise.
 *
 * This is the ONE classification shared by the cloud/local host's file watcher
 * (`packages/host/src/watch/classify.ts`, which prepends the agent prefix) and
 * the web engine-adapter's write-through echo
 * (`packages/web/src/engine-adapter/client.ts`). Keeping it in the shared domain
 * means the watcher and the echo can never drift into disagreeing about which
 * file raises which event.
 *
 * Order matters: `routine_runs` must be tested before `routines` (prefix
 * overlap). Returns null for paths not worth an event (`.git/**`, `.DS_Store`).
 */
/**
 * The events a file mutation can raise — exactly the plain
 * `{ type, agentPath }` variants of {@link TilinXEvent}, so callers can pair
 * the returned type with an agentPath and get a valid event without casting.
 */
export type AgentFileChangeEvent = Extract<
  TilinXEvent,
  {
    type:
      | "RoutineRunsChanged"
      | "RoutinesChanged"
      | "ActivityChanged"
      | "ConfigChanged"
      | "LearningsChanged"
      | "ConversationsChanged"
      | "SkillsChanged"
      | "ContextChanged"
      | "FilesChanged";
  }
>;

export function agentFileEventType(
  relPath: string,
): AgentFileChangeEvent["type"] | null {
  if (relPath.startsWith(".tilinx/routine_runs")) return "RoutineRunsChanged";
  if (relPath.startsWith(".tilinx/routines")) return "RoutinesChanged";
  if (relPath.startsWith(".tilinx/activity")) return "ActivityChanged";
  if (relPath.startsWith(".tilinx/config")) return "ConfigChanged";
  if (relPath.startsWith(".tilinx/learnings")) return "LearningsChanged";
  if (
    relPath.startsWith(".tilinx/runtime/conversations") ||
    relPath.startsWith(".tilinx/runtime/sessions")
  ) {
    return "ConversationsChanged";
  }
  if (
    relPath.startsWith(".agents/skills") ||
    relPath.startsWith(".tilinx/skills") ||
    relPath.startsWith(".claude/skills")
  ) {
    return "SkillsChanged";
  }
  if (
    relPath === "CLAUDE.md" ||
    relPath === "AGENTS.md" ||
    relPath === "GEMINI.md" ||
    relPath === "WORKSPACE.md" ||
    relPath === "USER.md" ||
    relPath === "GROUP.md"
  )
    return "ContextChanged";
  // Internal bookkeeping we never surface.
  if (relPath.startsWith(".git/") || relPath === ".DS_Store") return null;
  // Any other file in the agent's working tree.
  return "FilesChanged";
}
