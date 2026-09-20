import activitySchema from "@tilinx-ai/agent-schemas/activity.schema.json";
import configSchema from "@tilinx-ai/agent-schemas/config.schema.json";
import learningsSchema from "@tilinx-ai/agent-schemas/learnings.schema.json";
import routineRunsSchema from "@tilinx-ai/agent-schemas/routine_runs.schema.json";
import routinesSchema from "@tilinx-ai/agent-schemas/routines.schema.json";
import { jsonDoc, type TextStore } from "./store";

/**
 * The `.tilinx/` layout inside an agent's workspace — ONE convention for
 * every deployment. Locally `root` is the agent's directory (via FsVfs);
 * in cloud it is the agent's object prefix + "/workspace". Each typed family
 * lives at `.tilinx/<family>/<family>.json` beside its seeded JSON schema.
 */
export type TilinXFamily =
  | "activity"
  | "routines"
  | "routine_runs"
  | "config"
  | "learnings";

export const FAMILIES: TilinXFamily[] = [
  "activity",
  "routines",
  "routine_runs",
  "config",
  "learnings",
];

export const docKey = (root: string, family: TilinXFamily) =>
  `${root}/.tilinx/${family}/${family}.json`;

export const schemaKey = (root: string, family: TilinXFamily) =>
  `${root}/.tilinx/${family}/${family}.schema.json`;

/** Skills live beside `.tilinx`, in the Agent Skills standard layout. */
export const skillsDirKey = (root: string) => `${root}/.agents/skills`;

/**
 * Workspace-shared skills (ADR 0003): the ONE copy every agent in the
 * workspace/org mirrors read-only. `sharedRoot` comes from the paths seam
 * (cloud `ws/<org>/shared`, local `<Workspace>/.shared`); the skill folders
 * under it use the same `<slug>/SKILL.md` layout as agent skills.
 */
export const sharedSkillsDirKey = (sharedRoot: string) =>
  `${sharedRoot}/skills`;

/**
 * The Agent Store publication record for this agent — the storeAgentId, share
 * slug/url, and last-published identity. It follows the
 * `.tilinx/<name>/<name>.json` shape of the typed families but is DELIBERATELY
 * not one of them: it is not in `FAMILIES` (no seeded schema), it is machine-local
 * (a pointer into the account-owned listing; ownership is account-based, so it
 * holds no secrets), and it is never part of the four portable export surfaces,
 * so it never leaves the machine in a `.tilinxagent`.
 */
export const storePublicationKey = (root: string) =>
  `${root}/.tilinx/store-publication/store-publication.json`;

const SCHEMAS: Record<TilinXFamily, unknown> = {
  activity: activitySchema,
  routines: routinesSchema,
  routine_runs: routineRunsSchema,
  config: configSchema,
  learnings: learningsSchema,
};

/**
 * The EXACT document `seedSchemas` writes for a family. Exported so a re-seed
 * (the host's boot migration for agents created before a schema changed) can
 * compare byte-for-byte and skip the write when the file is already current.
 */
export function schemaDoc(family: TilinXFamily): string {
  return jsonDoc(SCHEMAS[family]);
}

/**
 * Seed every family's `.schema.json` (idempotent overwrite — the schema ships
 * with the app and is not user data). Run on agent creation so agents and
 * external tools can validate what they write. Existing agents are brought
 * forward on boot by the host's schema re-seed migration.
 */
export async function seedSchemas(
  store: TextStore,
  root: string,
): Promise<void> {
  for (const family of FAMILIES) {
    await store.writeText(schemaKey(root, family), schemaDoc(family));
  }
}
