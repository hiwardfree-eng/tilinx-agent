import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { expect, test } from "vitest";
import { tilinxToolServerLost } from "./tool-server-lost";

const init = (servers: unknown): SDKMessage =>
  ({
    type: "system",
    subtype: "init",
    session_id: "s",
    mcp_servers: servers,
  }) as unknown as SDKMessage;

const toolResult = (content: unknown, isError = true): SDKMessage =>
  ({
    type: "user",
    message: {
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "t1", is_error: isError, content },
      ],
    },
    session_id: "s",
  }) as unknown as SDKMessage;

test("an init that lists tilinx as connected is fine", () => {
  expect(
    tilinxToolServerLost(init([{ name: "tilinx", status: "connected" }])),
  ).toBe(false);
});

test("an init with tilinx failed or absent means the tools are gone", () => {
  expect(
    tilinxToolServerLost(init([{ name: "tilinx", status: "failed" }])),
  ).toBe(true);
  expect(tilinxToolServerLost(init([]))).toBe(true);
  expect(
    tilinxToolServerLost(init([{ name: "other", status: "connected" }])),
  ).toBe(true);
});

test("an init without the servers list (an older CLI) is not a verdict", () => {
  expect(tilinxToolServerLost(init(undefined))).toBe(false);
});

test("the live signature: an error tool_result naming a tilinx tool as unavailable", () => {
  expect(
    tilinxToolServerLost(
      toolResult(
        "<tool_use_error>Error: No such tool available: mcp__tilinx__integration_execute</tool_use_error>",
      ),
    ),
  ).toBe(true);
  expect(
    tilinxToolServerLost(
      toolResult([
        {
          type: "text",
          text: "No such tool available: mcp__tilinx__ask_user",
        },
      ]),
    ),
  ).toBe(true);
});

test("other tool errors and successful results are left alone", () => {
  expect(
    tilinxToolServerLost(toolResult("No such tool available: WebSearch")),
  ).toBe(false);
  expect(
    tilinxToolServerLost(
      toolResult("No such tool available: mcp__tilinx__x", false),
    ),
  ).toBe(false);
  expect(
    tilinxToolServerLost({
      type: "assistant",
      message: { content: [] },
    } as unknown as SDKMessage),
  ).toBe(false);
});
