import assert from "node:assert";
import { test } from "node:test";
import {
  type KeyedStorage,
  purgeAccountLocalState,
} from "../src/lib/tilinx-local-state.ts";

// PRODUCT-1235: sign-out must erase every account-scoped tilinx.* localStorage
// trace so the next sign-in (any account) starts clean — while keeping the
// device-level keys (host connection, standalone local data).

function keyedStorage(store: Map<string, string>): KeyedStorage {
  return {
    get length() {
      return store.size;
    },
    key(i: number) {
      return [...store.keys()][i] ?? null;
    },
    removeItem(k: string) {
      store.delete(k);
    },
  };
}

test("purgeAccountLocalState removes account traces, keeps device keys", () => {
  const store = new Map<string, string>([
    // Account-scoped — must go.
    ["tilinx.pref.last_agent_id", "agent-1"],
    ["tilinx.sidebar-layout", "{}"],
    ["tilinx.read-cursors.u1", "{}"],
    ["tilinx.onboarding-completed.u1", "true"],
    ["tilinx.last-sign-in", '{"provider":"google"}'],
    ["tilinx.providerStatusCache.v2", "{}"],
    ["tilinx.web.cp.agentColors", "{}"],
    ["tilinx.sdk.some-state", "{}"],
    ["tilinx.theme.cache", "dark"],
    // Device-level / recovery — must survive sign-out.
    ["tilinx.web.engine.new", '{"url":"https://my-vps.example"}'],
    ["tilinx.web.engine", '{"url":"legacy"}'],
    ["tilinx.web.agents", "[]"],
    ["tilinx.web.agentfile:ws/agent", "data"],
    ["tilinx.pendingAgentMoves", '[{"agentId":"a1"}]'],
    // Not ours — never touched.
    ["other-app.key", "keep"],
  ]);

  purgeAccountLocalState(keyedStorage(store));

  assert.deepStrictEqual([...store.keys()].sort(), [
    "tilinx.pendingAgentMoves",
    "tilinx.web.agentfile:ws/agent",
    "tilinx.web.agents",
    "tilinx.web.engine",
    "tilinx.web.engine.new",
    "other-app.key",
  ]);
});

test("purgeAccountLocalState survives index renumbering mid-walk", () => {
  const store = new Map<string, string>([
    ["tilinx.a", "1"],
    ["tilinx.b", "2"],
    ["tilinx.c", "3"],
    ["plain", "keep"],
  ]);

  purgeAccountLocalState(keyedStorage(store));

  assert.deepStrictEqual([...store.keys()], ["plain"]);
});
