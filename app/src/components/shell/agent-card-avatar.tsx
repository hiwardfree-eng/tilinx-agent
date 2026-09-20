import { TilinXAvatar, resolveAgentColor } from "@tilinx-ai/core";

export function AgentCardAvatar({ color }: { color?: string }) {
  return <TilinXAvatar color={resolveAgentColor(color)} diameter={16} />;
}
