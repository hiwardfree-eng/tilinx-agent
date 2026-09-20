/**
 * Host credentials and deployment controls never belong to a runtime.
 *
 * The child env is the parent's MINUS {@link HOST_ONLY}, so a secret the host
 * was given cannot reach a model-directed process by inheritance: a managed
 * assistant pod carries the gateway credential that acts on the whole account
 * (`TILINX_ASSISTANT_TOKEN` + `TILINX_ASSISTANT_CP_URL`), and the role a
 * runtime is told is stamped per-spawn from the host's own decision
 * (`assistant-role.ts`) rather than inherited, so an ordinary agent on that pod
 * can never read itself as the coordinator.
 *
 * WHY A DENYLIST, with a guard: the runtime and the model stack under it read
 * environment this package cannot enumerate — every provider key, the proxy and
 * certificate variables a corporate network needs, PATH, HOME, the locale. An
 * allowlist would silently strip the next one and break an agent in a way no
 * test here could see. What CAN be enumerated is the other half: every
 * `TILINX_*` / `COMPOSIO_*` name the host itself reads. So each one is
 * classified exactly once — host-only below, or {@link RUNTIME_PASS_THROUGH} —
 * and `runtime-parent-env.source.test.ts` fails the build on a name that is
 * neither, which is what keeps the next host-only secret from defaulting to
 * "inherited".
 */
export const HOST_ONLY: ReadonlySet<string> = new Set([
  "COMPOSIO_API_KEY",
  "TILINX_WORKSPACES_ROOT",
  "TILINX_CREDENTIALS_PATH",
  "TILINX_AGENTS_DIR",
  "TILINX_CHAT_HISTORY_DB",
  "TILINX_HOST_PORT",
  "TILINX_HOST_BIND",
  "TILINX_HOST_TOKEN",
  "TILINX_MASTER_TOKEN",
  "TILINX_SHELL_TOKEN",
  "TILINX_CREDENTIALS_URL",
  "TILINX_ORG_SLUG",
  "TILINX_AGENT_SLUG",
  "TILINX_USER_ID",
  "TILINX_RUNTIME_COMMAND",
  "TILINX_APP_SYSTEM_PROMPT",
  "TILINX_SHUTDOWN_DRAIN_MS",
  "TILINX_OAUTH_CALLBACK_BASE_URL",
  "TILINX_PASSIVE",
  "TILINX_ROUTINE_SCHEDULER_MODE",
  "TILINX_STORE_URL",
  "TILINX_TURNLOG_URL",
  "TILINX_TURN_LOG",
  "TILINX_INTEGRATIONS_URL",
  "TILINX_EAGER_RUNTIME",
  "TILINX_LOOPBACK_EGRESS",
  "TILINX_ASSISTANT_ROLE",
  "TILINX_ASSISTANT_TOKEN",
  "TILINX_ASSISTANT_CP_URL",
  "TILINX_ASSISTANT_USER_ID",
  "TILINX_SANDBOX_TOKEN",
  "TILINX_RUNTIME_TOKEN",
  "TILINX_CONTROL_PLANE_URL",
  "TILINX_SHARED_SKILLS_DIR",
  // Managed-pod object-store tuning, read by the host's own sync loop
  // (local/managed-store-config.ts) and meaningless inside a runtime.
  "TILINX_HYDRATE_MAX_MB",
  "TILINX_STORE_SYNC_QUIET_MS",
  "TILINX_STORE_SYNC_INTERVAL_MS",
  // Host-side service endpoints and dev seams.
  "TILINX_AGENTSTORE_API_URL",
  "TILINX_FAKE_ENGINE_URL",
  // Stamped per-spawn by `runtime-env.ts` from the host's own construction, so
  // inheriting either would let a stale parent value outrank the decision.
  "TILINX_SIDECAR_ROLE",
  "TILINX_TRANSCRIPT_DUAL_WRITE",
  // The desktop supervisor's marker for the HOST process: it arms the
  // parent-watchdog, which a runtime must never arm for itself.
  "TILINX_SUPERVISED",
]);

/**
 * Host-read names a runtime is DELIBERATELY given, each because the runtime
 * reads it too. Kept as a list rather than a comment so the source guard can
 * tell "decided to pass through" from "nobody looked at it yet".
 */
export const RUNTIME_PASS_THROUGH: ReadonlySet<string> = new Set([
  // A path, not a credential: the runtime resolves the SHARED Claude credential
  // directory from it (`backends/claude/paths.ts` →
  // `<TILINX_HOME>/claude-login`, the same dir the desktop's `claude auth
  // login` writes). Withholding it would send every agent to `~/.tilinx-ts`
  // and break the one login that connects them all.
  "TILINX_HOME",
  // Set by the compiled sidecar entry for itself and read by the runtime to
  // name its deployment in error reports
  // (`@tilinx/runtime-client` sentry/activation.ts).
  "TILINX_SIDECAR_BINARY",
  // A deployment flag, not a credential: the runtime's error reports name
  // their deployment from it (`@tilinx/runtime-client` engineDeployment), so
  // a managed pod's runtime reports `managed-cloud`, never `dev`.
  "TILINX_MANAGED_CLOUD",
]);

export function runtimeParentEnv(parent: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(parent).filter(([key]) => !HOST_ONLY.has(key)),
  );
}
