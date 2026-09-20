import { TilinXAvatar, resolveAgentColor } from "@tilinx-ai/core";

export function AgentPanelAvatar({
  color,
  running,
}: {
  color?: string;
  running: boolean;
}) {
  return (
    <TilinXAvatar
      color={resolveAgentColor(color)}
      diameter={40}
      running={running}
    />
  );
}
