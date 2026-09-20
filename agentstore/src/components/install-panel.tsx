"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@tilinx-ai/core";
import { ChevronDown, Download, Globe, Rocket } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  buildStoreInstallDeepLink,
  buildWebAppInstallUrl,
} from "@/lib/tilinx-launch";
import { CopyButton } from "./copy-button";

/** Where a visitor without the app goes to get it. */
const TILINX_DOWNLOAD_URL = "https://gettilinx.ai/#download";

/** How long we wait for TilinX to take focus before offering a fallback. */
const LAUNCH_FALLBACK_MS = 1500;

export interface InstallPanelProps {
  agentName: string;
  /** Agent Store slug, used to build the "Open in TilinX" deep link. */
  slug: string;
  /** Pre-built, server-rendered copy-paste install instructions. */
  instructions: string;
}

/**
 * The detail-page install surface: ONE "Try it now" button opening a
 * two-item menu — launch TilinX (existing deep-link + timed fallback) or
 * copy the coding-agent install instructions.
 */
export function InstallPanel({
  agentName,
  slug,
  instructions,
}: InstallPanelProps) {
  return (
    <OpenInTilinX
      agentName={agentName}
      slug={slug}
      instructions={instructions}
    />
  );
}

function OpenInTilinX({
  agentName,
  slug,
  instructions,
}: {
  agentName: string;
  slug: string;
  instructions: string;
}) {
  const [showFallback, setShowFallback] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  function openInTilinX() {
    const deepLink = buildStoreInstallDeepLink(slug);
    if (!deepLink) return;

    // A repeat click supersedes the previous attempt entirely.
    cleanupRef.current?.();

    // If TilinX opens, the browser tab loses focus or is hidden. Track that so
    // a user who already has the app never sees the "don't have it?" fallback.
    let launched = false;
    const markLaunched = () => {
      launched = true;
    };
    window.addEventListener("blur", markLaunched, { once: true });
    document.addEventListener("visibilitychange", markLaunched, { once: true });

    // A hidden iframe navigates to the custom scheme without a top-level
    // "unknown protocol" error page when TilinX is not installed.
    if (iframeRef.current) iframeRef.current.src = deepLink;

    const timer = window.setTimeout(() => {
      cleanupRef.current?.();
      if (!launched && document.visibilityState === "visible") {
        setShowFallback(true);
      }
    }, LAUNCH_FALLBACK_MS);

    cleanupRef.current = () => {
      window.clearTimeout(timer);
      window.removeEventListener("blur", markLaunched);
      document.removeEventListener("visibilitychange", markLaunched);
      cleanupRef.current = null;
    };
  }

  const webUrl = buildWebAppInstallUrl(slug);

  return (
    <div className="flex flex-col items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="lg" className="w-full rounded-full px-7 sm:w-auto">
            Try it now
            <ChevronDown aria-hidden className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-72">
          <DropdownMenuItem onSelect={openInTilinX}>
            <Rocket aria-hidden className="size-4" />
            Open in TilinX
          </DropdownMenuItem>
          <div className="p-1">
            <CopyButton
              value={instructions}
              label="Copy instructions for your coding agent"
              copiedLabel="Copied to clipboard"
              variant="ghost"
              className="w-full justify-start"
              aria-label={`Copy install instructions for ${agentName}`}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <iframe ref={iframeRef} title="Open in TilinX" className="hidden" />

      {showFallback && (
        <div className="flex w-full flex-col gap-2 rounded-xl bg-chip-subtle p-3 sm:w-72">
          <p className="text-sm text-ink-muted">Do not have TilinX yet?</p>
          <Button asChild variant="outline" size="lg" className="w-full">
            <a href={TILINX_DOWNLOAD_URL} target="_blank" rel="noreferrer">
              <Download aria-hidden className="size-4" />
              Download TilinX
            </a>
          </Button>
          {webUrl && (
            <Button asChild variant="outline" size="lg" className="w-full">
              <a href={webUrl}>
                <Globe aria-hidden className="size-4" />
                Open in TilinX Web
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
