"use client";

import React, { useRef, useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SecureAssetImage } from "@/components/ui/secure-asset-image";
import { FileManagerClient } from "@/components/dashboard/file-manager-client";
import { usePermissions } from "@/hooks/use-permissions";
import { B2BDash } from "@/modules/b2b-marketplace/api";

type PickedFile = {
  media_details?: { public_url?: string; url?: string };
  url?: string;
  path?: string;
};

/**
 * Reusable image field backed by the platform File Manager. Lets the user upload
 * a new file or pick an existing one, and stores the file's ABSOLUTE public URL
 * (`/api/v1/files/{id}/public-serve`) so the image loads on any device, logged in
 * or not.
 */
export function MarketplaceImagePicker({
  value,
  onChange,
  label = "Image",
}: {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const { hasAnyPermission, hasPermission } = usePermissions();
  const canRead = hasAnyPermission(["view_storage", "manage_storage"]);
  const canManage = hasPermission("manage_storage");

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const { url } = await B2BDash.uploadProductImage(file);
      onChange(url);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setUploadError(err?.response?.data?.message || err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const choose = () => (canRead ? setOpen(true) : fileInput.current?.click());

  const handleSelect = (file: PickedFile) => {
    const url = file.media_details?.public_url || file.media_details?.url || file.url || file.path || "";
    onChange(url);
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs font-bold text-muted-foreground">{label}</Label>}
      <div className="group relative h-28 overflow-hidden rounded-xl border bg-gradient-to-br from-muted/40 to-muted/10">
        {value ? (
          <>
            <SecureAssetImage src={value} alt={label} className="h-full w-full object-cover object-center" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Button type="button" variant="secondary" size="sm" onClick={choose} className="rounded-full text-xs shadow-lg">Change</Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => onChange("")} className="rounded-full text-xs shadow-lg">Remove</Button>
            </div>
          </>
        ) : (
          <button type="button" disabled={uploading} onClick={choose} className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground/50 transition-colors hover:text-primary">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6" />}
            <span className="text-[11px] font-medium">{uploading ? "Uploading…" : "Choose / upload image"}</span>
          </button>
        )}
      </div>

      <input
        ref={fileInput} type="file" className="hidden"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => handleUpload(e.target.files?.[0])}
      />
      {uploadError && <p className="text-[11px] text-destructive" role="alert">{uploadError}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[80vh] max-w-[1000px] flex-col overflow-hidden rounded-[2rem] p-0">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <DialogTitle>Media Library</DialogTitle>
              <DialogDescription>Upload a new image or pick an existing one.</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="rounded-full"><X className="h-4 w-4" /></Button>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <FileManagerClient isPickerMode onFileSelect={handleSelect} access={{ canRead, canManage }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
