import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  initEngineSentry,
  installConsoleCapture,
} from "@tilinx/runtime-client/sentry";
import {
  LOCAL_CAPABILITIES,
  MANAGED_CLOUD_CAPABILITIES,
} from "../capabilities";
import { tilinxSystemPrompt } from "../tilinx-prompt";
import { installParentWatchdog } from "../parent-watchdog";
import { isBenignRecursiveWatchRace } from "../watch/watcher-race";
import { buildLocalHost } from "./host";
import { managedStoreConfig } from "./managed-store-config";
import { runtimeCommand } from "./runtime-command";

/**
 * The local host entry point — the desktop sidecar the Tauri shell spawns. Same
 * host server, local adapter profile. The shell parses the `TILINX_HOST_LISTENING`
 * banner for {port, token}, exactly as it parses the runtime's today.
 *
 * Config (env, all optional):
 *   TILINX_HOME              ~/.tilinx (base for the three paths below)
 *   TILINX_WORKSPACES_ROOT   ~/.tilinx/workspaces
 *   TILINX_CREDENTIALS_PATH  ~/.tilinx/credentials.json
 *   TILINX_AGENTS_DIR        ~/.tilinx/agents (installed agent-config library)
 *   TILINX_CHAT_HISTORY_DB   ~/.tilinx/db/tilinx.db (Rust-era chat to migrate)
 *   TILINX_HOST_PORT         4318
 *   TILINX_HOST_BIND         127.0.0.1 (desktop). Self-host on a VPS sets
 *                             0.0.0.0 to expose it behind a TLS reverse proxy.
 *   TILINX_HOST_TOKEN        random per boot (set a fixed one for self-host)
 *   TILINX_CREDENTIALS_URL   managed pod only: gateway base URL for org credentials
 *   TILINX_ORG_SLUG          managed pod only: org slug for org credentials
 *   TILINX_AGENT_SLUG        managed pod only: agent slug for org credentials
 *   TILINX_RUNTIME_COMMAND   argv to launch a pi-runtime (space-separated);
 *                             explicit override (highest priority). Otherwise:
 *                             the compiled sidecar spawns ITSELF (in runtime
 *                             role via TILINX_SIDECAR_ROLE — see host.ts);
 *                             bundled Docker spawns dist/runtime/main.mjs; dev
 *                             falls back to `node --import tsx <repo>/packages/runtime/src/main.ts`.
 *   TILINX_APP_SYSTEM_PROMPT the product voice prompt (from the app)
 *   TILINX_MANAGED_CLOUD=1  serve managed-cloud capabilities (K8s pod)
 *   TILINX_SHUTDOWN_DRAIN_MS  managed pod only: how long a shutdown lets
 *                            in-flight turns finish (termination grace minus
 *                            the final sync's share); unset = short default
 *   TILINX_OAUTH_CALLBACK_BASE_URL  self-host only: the public origin for the
 *                             custom-integration OAuth callback (PRODUCT-1172)
 *   TILINX_PASSIVE=1        migration-source mode: no scheduler, no watcher
 *   TILINX_ROUTINE_SCHEDULER_MODE  local (default) | external (managed pod
 *                             only; disables cron fires, keeps reconcile)
 *   TILINX_STORE_URL         managed pod only: object-store gateway base URL
 *   TILINX_TRANSCRIPT_DUAL_WRITE=1  file-first transcript/doc DB shadow
 *   TILINX_TURN_LOG=1        relay-frame batches to managed turnlog ingest
 */

// Crash reporting. Dormant without SENTRY_DSN; a DSN in a source run needs the
// SENTRY_SEND_IN_DEV opt-in (activation rules: runtime-client/src/sentry/).
// Console capture mirrors the Rust engine's sentry-tracing wiring — every
// console.error becomes a Sentry event, info/warn become breadcrumbs — so the
// beta "no silent failures" error sites all report without per-site changes.
const sentry = initEngineSentry("host");
if (sentry) installConsoleCapture(sentry);
// The credential IS the switch — when it's absent (or dev-suppressed), say so
// loudly and name the remedy, per the features-default-ON rule.
console.info(
  sentry
    ? "[local-host] crash reporting: on (Sentry)"
    : process.env.SENTRY_DSN
      ? "[local-host] crash reporting: off (dev run; set SENTRY_SEND_IN_DEV=1 to send)"
      : "[local-host] crash reporting: off (no SENTRY_DSN)",
);

/** Log a fatal config/boot error, deliver it, and exit non-zero. */
async function fatal(...message: unknown[]): Promise<never> {
  console.error(...message);
  await sentry?.flush();
  process.exit(1);
}

async function remoteCredentialConfig(hostTokenEnv: string | undefined) {
  const url = process.env.TILINX_CREDENTIALS_URL;
  const orgSlug = process.env.TILINX_ORG_SLUG;
  const agentSlug = process.env.TILINX_AGENT_SLUG;
  if (url && orgSlug && agentSlug && hostTokenEnv) {
    return { url, orgSlug, agentSlug, podToken: hostTokenEnv };
  }
  if (url || (!process.env.TILINX_STORE_URL && (orgSlug || agentSlug))) {
    // A partial env is always a deploy bug — no profile sets only some of these.
    // Falling back to the (empty) file store would make every credential serve
    // read as an org-wide logout, and a legacy pod would even start rotating
    // refresh tokens locally against the gateway's rotation. Die loudly so the
    // pod restarts into a fixed spec instead of degrading silently.
    return fatal(
      "[local-host] incomplete managed credential gateway env: set TILINX_CREDENTIALS_URL, TILINX_ORG_SLUG, TILINX_AGENT_SLUG, and TILINX_HOST_TOKEN together.",
    );
  }
  return undefined;
}

const tilinxHome = process.env.TILINX_HOME || join(homedir(), ".tilinx");
const hostTokenEnv = process.env.TILINX_HOST_TOKEN;
const hostToken = hostTokenEnv || randomBytes(32).toString("hex");
const remoteGateway = await remoteCredentialConfig(hostTokenEnv);
const managedStore = await managedStoreConfig(
  hostTokenEnv,
  tilinxHome,
  (message) => fatal(message),
);
// Event-driven routines fire only where a trigger backend exists (a Composio
// project key + a public webhook URL) — that is TilinX Cloud, i.e. a managed
// pod. Desktop and self-host carry no trigger backend. This one fact drives the
// product prompt (event wakes advertised only when true), the routine write
// gate, and the trigger-status route.
const triggersEnabled = process.env.TILINX_MANAGED_CLOUD === "1";
const routineSchedulerModeRaw =
  process.env.TILINX_ROUTINE_SCHEDULER_MODE || undefined;
const routineSchedulerMode =
  routineSchedulerModeRaw === undefined || routineSchedulerModeRaw === "local"
    ? "local"
    : routineSchedulerModeRaw === "external"
      ? "external"
      : await fatal(
          `[local-host] invalid TILINX_ROUTINE_SCHEDULER_MODE=${routineSchedulerModeRaw}; expected local or external.`,
        );
if (routineSchedulerMode === "external" && !triggersEnabled) {
  await fatal(
    "[local-host] TILINX_ROUTINE_SCHEDULER_MODE=external is valid only on managed cloud pods.",
  );
}
const durableTurns = managedStore?.podGateway
  ? (() => {
      const transcriptDualWrite =
        process.env.TILINX_TRANSCRIPT_DUAL_WRITE === "1";
      const turnLog = process.env.TILINX_TURN_LOG === "1";
      console.info(
        transcriptDualWrite
          ? "[boot] transcript dual-write ON (TILINX_TRANSCRIPT_DUAL_WRITE=1)"
          : "[boot] transcript dual-write OFF (TILINX_TRANSCRIPT_DUAL_WRITE unset)",
      );
      console.info(
        turnLog
          ? "[boot] turnlog capture ON (TILINX_TURN_LOG=1)"
          : "[boot] turnlog capture OFF (TILINX_TURN_LOG unset)",
      );
      return {
        gateway: managedStore.podGateway,
        turnlogGateway: process.env.TILINX_TURNLOG_URL
          ? {
              ...managedStore.podGateway,
              baseUrl: process.env.TILINX_TURNLOG_URL,
              // The turnlog is a different backend service and must never
              // share or mutate the object store's lease fence.
              fence: { ...managedStore.podGateway.fence },
            }
          : undefined,
        transcriptDualWrite,
        turnLog,
      };
    })()
  : undefined;
const host = buildLocalHost({
  workspacesRoot:
    process.env.TILINX_WORKSPACES_ROOT || join(tilinxHome, "workspaces"),
  credentialsPath:
    process.env.TILINX_CREDENTIALS_PATH ||
    join(tilinxHome, "credentials.json"),
  // The installed agent-config library — the Rust engine's tree, carried over
  // so previously installed agents keep showing in the create-agent picker.
  agentConfigsDir:
    process.env.TILINX_AGENTS_DIR || join(tilinxHome, "agents"),
  // The Rust-era chat-history db. Default to the canonical path; the migration
  // is a no-op when it is absent (a fresh install) or already done (marker).
  chatHistoryDbPath:
    process.env.TILINX_CHAT_HISTORY_DB ||
    join(tilinxHome, "db", "tilinx.db"),
  port: Number(process.env.TILINX_HOST_PORT || 4318),
  // Loopback by default (desktop). Self-host sets TILINX_HOST_BIND=0.0.0.0.
  bind: process.env.TILINX_HOST_BIND || undefined,
  // Self-host opt-in for custom-integration OAuth (PRODUCT-1172): the public
  // origin the user's browser can reach (e.g. https://tilinx.example.com).
  // Desktop needs nothing — a loopback-bound local host derives its own.
  oauthCallbackBase: process.env.TILINX_OAUTH_CALLBACK_BASE_URL || undefined,
  token: hostToken,
  // Redact the token in the startup banner whenever it came from the
  // environment (a pod/self-host token an orchestrator already knows) or we are
  // a managed cloud pod — echoing it there just leaks a credential into
  // plaintext logs. The desktop sidecar mints a random per-boot token (no
  // TILINX_HOST_TOKEN) and its supervisor reads it back from this line, so
  // that case keeps the full token.
  redactBannerToken:
    !!hostTokenEnv || process.env.TILINX_MANAGED_CLOUD === "1",
  runtimeCommand: runtimeCommand(),
  // Managed pods pre-spawn their agent's runtime at boot so the ~10s runtime
  // start overlaps the pod wake instead of the user's first message.
  eagerRuntime: process.env.TILINX_EAGER_RUNTIME === "1",
  // The real Tauri app hands over its own product prompt; this is the built-in
  // default so the agent knows how to create Skills/Routines/learnings. The
  // Routines section advertises event wakes only where triggers can fire.
  systemPrompt:
    process.env.TILINX_APP_SYSTEM_PROMPT ||
    tilinxSystemPrompt({ triggers: triggersEnabled }),
  capabilities:
    process.env.TILINX_MANAGED_CLOUD === "1"
      ? MANAGED_CLOUD_CAPABILITIES
      : LOCAL_CAPABILITIES,
  // A trigger backend exists only on managed cloud (see `triggersEnabled`).
  triggersEnabled,
  routineSchedulerMode,
  // The control plane's fire scheduler delivers scheduled instants (with the
  // creator's minted acting identity) only in the managed-cloud topology; the
  // pod-store env is its marker. Self-host sets TILINX_MANAGED_CLOUD with no
  // control plane, so it must NOT get the backstop grace this enables — its
  // local cron is the only scheduler.
  externalRoutineFires: !!managedStore?.podGateway,
  // Managed pods sit behind the gateway (it enforces the pod token and mints
  // x-tilinx-acting-as); relay that header to the runtime so integration
  // calls act as the driving user. Desktop/self-host stay direct → false.
  gatewayFronted: process.env.TILINX_MANAGED_CLOUD === "1",
  // The org owner's canonical user id, stamped into managed pods by the
  // control plane. Backfills `created_by` on pre-rollout routines at boot and
  // backstops routine writes that carry no acting header — an authorless
  // routine is one the control-plane fire planner refuses to fire.
  ownerSub: process.env.TILINX_USER_ID || undefined,
  // Dev launcher only (scripts/dev/control-plane.sh): its managed-cloud "pods"
  // are processes on the developer's machine, so their egress reaches loopback
  // and the public-HTTPS endpoint validation must not apply. Real pods never
  // set this — their NetworkPolicy is what the validation models.
  loopbackEgress: process.env.TILINX_LOOPBACK_EGRESS === "1",
  credentials: remoteGateway,
  sharedEndpoints: remoteGateway,
  // Active-time reporting rides the same managed-pod gateway quadruple: the
  // env being present IS the switch (desktop/self-host never set it).
  usageReporting: remoteGateway,
  // A pod's termination grace is what makes a drain worth anything; the
  // orchestrator that sets the grace sets this alongside it. The desktop
  // never does: its app is gone by the time the sidecar hears about it.
  shutdownDrainMs: shutdownDrainMs(),
  durableTurns,
  // Migration-source spawns (HOU-719): serve + migrate on boot, but never fire
  // routines or churn watch events while the cloud app reads the old tree.
  passive: process.env.TILINX_PASSIVE === "1",
  storeSync: managedStore?.storeSync,
  sharedMirror: managedStore?.sharedMirror,
  // Platform-mode integrations: desktops get TILINX_INTEGRATIONS_URL (the
  // cloud gateway holding TilinX's Composio key); self-host + the managed pod
  // set their own COMPOSIO_API_KEY and go direct. Neither → integrations off.
  integrations: {
    composioApiKey: process.env.COMPOSIO_API_KEY || undefined,
    gatewayUrl: process.env.TILINX_INTEGRATIONS_URL || undefined,
    // Managed pods run with a real TILINX_HOST_TOKEN (the gateway can recompute
    // it): pass it as the pod token so a routine turn authenticates as its
    // creator (C2). The desktop's token is a random per-boot secret, not a pod
    // token the gateway knows, so leave it unset there.
    podToken: hostTokenEnv || undefined,
  },
  onRuntimeLog: (line) => process.stderr.write(line),
});

// (Integrations on/off/direct is announced by the host's own boot log —
// formatIntegrationsModeLog in local/host.ts — so no extra warning here.)

// A desktop supervisor must not die on a stray error from a child runtime, a
// dropped SSE socket, or a transient fetch. Log loudly and stay up — the user
// would otherwise see "NetworkError" on the next request.
process.on("uncaughtException", (err) => {
  // One narrow demotion: Node's Linux recursive-watcher ENOENT race on a
  // transient dir (see watch/watcher-race.ts). Warning breadcrumb, not a
  // Sentry error event; every other uncaught error stays loud.
  if (isBenignRecursiveWatchRace(err)) {
    console.warn(
      "[local-host] transient fs-watch race (ignored):",
      err.message,
    );
    return;
  }
  console.error("[local-host] uncaughtException (staying up):", err);
});
process.on("unhandledRejection", (reason) => {
  // Same benign-race demotion as above: Node's promise-based watcher
  // internals can surface the ENOENT as a rejection instead of a throw.
  if (isBenignRecursiveWatchRace(reason)) {
    console.warn(
      "[local-host] transient fs-watch race (ignored):",
      (reason as Error).message,
    );
    return;
  }
  console.error("[local-host] unhandledRejection (staying up):", reason);
});

try {
  await host.start();
} catch (err) {
  // Hydration is a boot invariant in store-backed mode. Exit non-zero so the
  // orchestrator retries with a fresh emptyDir; never linger unready or sync it.
  await fatal("[local-host] startup failed:", err);
}

/** TILINX_SHUTDOWN_DRAIN_MS, parsed strictly: a garbled value must not
 *  silently become a multi-minute (or zero) drain. */
function shutdownDrainMs(): number | undefined {
  const raw = process.env.TILINX_SHUTDOWN_DRAIN_MS;
  if (!raw) return undefined;
  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms < 0) {
    console.error(
      `[local-host] ignoring invalid TILINX_SHUTDOWN_DRAIN_MS=${JSON.stringify(raw)}`,
    );
    return undefined;
  }
  return ms;
}

let shuttingDown = false;
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    if (shuttingDown) return process.exit(0);
    shuttingDown = true;
    void host
      .stop()
      .catch((err) => console.error("[local-host] shutdown failed:", err))
      .finally(async () => {
        // Deliver anything still queued (e.g. a shutdown-failure event). A
        // clean stop has an empty queue and this resolves immediately.
        await sentry?.flush(500);
        process.exit(0);
      });
  });
}

// Unix orphan-prevention: when the Tauri app is FORCE-QUIT or crashes it sends
// no signal, but the OS closes the write-end of our piped stdin. Watch for that
// EOF and tear down (killing every runtime) so a hard app exit never orphans the
// host + its runtimes. Arms ONLY when the supervisor set `TILINX_SUPERVISED=1`
// (its default signal); self-host Docker, plain `tsx`, and tests leave it
// unset and stay inert. Windows force-quit is covered by the supervisor's
// kill-on-close Job Object.
installParentWatchdog({ onParentExit: async () => await host.stop() });
