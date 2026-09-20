import type { CreatorDirectoryEntry } from "@tilinx/agentstore-client";
import { CreatorCard as StoreCreatorCard } from "@tilinx-ai/store";
import Link from "next/link";

export function CreatorCard({ creator }: { creator: CreatorDirectoryEntry }) {
  return (
    <StoreCreatorCard
      creator={creator}
      href={`/creators/${encodeURIComponent(creator.handle)}`}
      LinkComponent={Link}
    />
  );
}
