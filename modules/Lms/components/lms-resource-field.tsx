"use client";

import * as React from "react";
import { FolderOpen, Link as LinkIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileManagerClient } from "@/components/dashboard/file-manager-client";
import { usePermissions } from "@/hooks/use-permissions";

type PickedFile = {
  name?: string;
  media_details?: { public_url?: string; url?: string };
  url?: string;
  path?: string;
};

/**
 * The File Manager reports a file's public URL using the backend's own base
 * URL, which inside Docker is the internal host — e.g.
 * http://backend:8000/api/v1/files/1/public-serve. A browser cannot resolve
 * that, so every lesson resource picked from the file manager was saved as a
 * dead link. Keeping only the path lets it resolve against whatever origin the
 * learner is actually on.
 */
const toBrowserResolvableUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    // Only rewrite our own API links; a genuine external URL is left alone.
    return parsed.pathname.startsWith("/api/")
      ? `${parsed.pathname}${parsed.search}`
      : trimmed;
  } catch {
    return trimmed;
  }
};

/**
 * Resource input for LMS lessons. The user can paste a URL directly, OR open the
 * platform File Manager to upload a new file and pick it. Selecting a file stores
 * its public URL so the resource plays for both authenticated learners and public
 * course previews.
 */
export function LmsResourceField({
  id,
  value,
  onChange,
  placeholder = "https://... or pick from files",
}: {
  id?: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const { hasAnyPermission, hasPermission } = usePermissions();
  const canRead = hasAnyPermission(["view_storage", "manage_storage"]);
  const canManage = hasPermission("manage_storage");

  const handleSelect = (file: PickedFile) => {
    const url =
      file.media_details?.public_url ||
      file.media_details?.url ||
      file.url ||
      file.path ||
      "";
    if (url) {
      onChange(toBrowserResolvableUrl(url));
    }
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <LinkIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id={id}
            type="url"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="pl-9"
          />
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Clear resource URL"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        {canRead ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(true)}
            className="shrink-0 gap-2"
          >
            <FolderOpen className="size-4" aria-hidden="true" />
            Browse files
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Paste a link, or upload &amp; select a file from your File Manager.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        {/*
          sm:max-w-6xl is required, not decorative. DialogContent's own default
          ends with `sm:max-w-lg`, and tailwind-merge keys `max-w-*` separately
          from `sm:max-w-*`, so a bare `max-w-[1000px]` never removes it and the
          512px cap wins inside the media query. That collapsed this modal to
          half width, leaving the file manager's 256px sidebar and a 256px file
          grid crushed side by side. Any override here has to carry the sm:
          variant to actually take effect.
        */}
        <DialogContent
          showCloseButton={false}
          className="flex h-[85vh] w-[95vw] max-w-6xl flex-col gap-0 overflow-hidden rounded-[2rem] border-border/50 bg-background p-0 shadow-2xl sm:max-w-6xl"
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <DialogTitle>File Manager</DialogTitle>
              <DialogDescription>Upload a new file or pick an existing one for this lesson.</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="rounded-full">
              <X className="size-4" />
            </Button>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <FileManagerClient isPickerMode onFileSelect={handleSelect} access={{ canRead, canManage }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
