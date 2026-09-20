"use client";

import type { AgentSkill } from "@tilinx/agentstore-contract";
import { SkillList as StoreSkillList } from "@tilinx-ai/store";
import { Markdown } from "@/components/markdown";

/**
 * The agent page's Skills section: four quiet title-only rows, a "View N
 * more" expander, and a solid inspect dialog per skill. Titles only on the
 * rows by design — the dialog carries the depth.
 */
export function SkillList({ skills }: { skills: AgentSkill[] }) {
  return (
    <StoreSkillList
      skills={skills}
      renderContent={(content) => <Markdown content={content} />}
    />
  );
}
