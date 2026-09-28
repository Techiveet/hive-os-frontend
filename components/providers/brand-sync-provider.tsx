// components/providers/brand-sync-provider.tsx
"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBackendApiRoot, getPublicServeUrl, getTenantHeaders, getWorkspaceScopeKey } from "@/lib/runtime-context";
import { applyBrandRuntime } from "@/lib/brand-theme";
import { formatDocumentTitle } from "@/lib/document-title";

export function BrandSyncProvider() {
    const workspaceScope = getWorkspaceScopeKey();

    // Public brand metadata is tenant-scoped by the signed runtime context.
    const { data: brandData, dataUpdatedAt } = useQuery({
      queryKey: ['publicBrandSettings', workspaceScope],
      queryFn: async () => {
          const res = await fetch(`${getBackendApiRoot()}/settings/brand/public`, {
              headers: {
                Accept: "application/json",
                ...getTenantHeaders(),
              },
          });

          if (!res.ok) return null;
          return res.json();
      },
      staleTime: 600000,
      retry: 1,
    });

    const brandSettings = brandData?.data;

    // 🌍 BROWSER METADATA SYNC (Favicon & Title)
    useEffect(() => {
      if (brandSettings) {
          applyBrandRuntime(brandSettings);
      }

      // Safely apply Favicon
      if (brandSettings?.favicon) {
        // The browser fetches <link rel="icon"> without our Authorization
        // header, so the favicon has to come from the public-serve route.
        const favUrl = getPublicServeUrl(brandSettings.favicon);
        if (favUrl) {
            let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.getElementsByTagName('head')[0].appendChild(link);
            }
            const versionedUrl = new URL(favUrl, window.location.origin);
          versionedUrl.searchParams.set("brand", String(dataUpdatedAt));
          link.href = versionedUrl.href;
        }
      }

      // Safely apply Document Title
      if (brandSettings?.app_title) {
          const routeTitle = document.title.split("|")[0]?.trim() || "Dashboard";
          document.title = formatDocumentTitle(routeTitle, brandSettings.app_title);
      }
    }, [brandSettings, dataUpdatedAt]);

    return null; // This component doesn't render any UI, it just manages the DOM!
}
