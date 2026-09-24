"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { propertyApi } from "@/modules/property/api";
import { FormDialog, SimpleTable, dateOnly, errorText, rowsOf } from "@/modules/property/components/property-ui";
import { Panel } from "@/modules/shared/charts/primitives";

type DocumentableType = "property" | "property_building" | "property_unit" | "property_owner" | "property_tenant";

export function DocumentsPanel({ type, id }: { type: DocumentableType; id: number | string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const key = ["property", "documents", type, String(id)];

  const listQuery = useQuery({
    queryKey: key,
    queryFn: () => propertyApi.listDocuments(type, id).then((res) => res.data),
  });

  const upload = useMutation({
    mutationFn: (values: Record<string, any>) => {
      const form = new FormData();
      form.append("documentable_type", type);
      form.append("documentable_id", String(id));
      form.append("file", values.file);
      if (values.category) form.append("category", values.category);
      if (values.expires_on) form.append("expires_on", values.expires_on);
      form.append("is_required", values.is_required ? "1" : "0");
      return propertyApi.uploadDocument(form);
    },
    onSuccess: () => {
      toast.success("Document uploaded.");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (error) => toast.error(errorText(error, "Could not upload it.")),
  });

  const remove = useMutation({
    mutationFn: (documentId: number) => propertyApi.deleteDocument(documentId),
    onSuccess: () => {
      toast.success("Document removed.");
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (error) => toast.error(errorText(error, "Could not remove it.")),
  });

  const download = async (doc: any) => {
    try {
      const response = await propertyApi.downloadDocument(doc.id);
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.original_name || `document-${doc.id}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(errorText(error, "Could not download it."));
    }
  };

  return (
    <Panel
      title="Documents"
      description="Contracts, title deeds, permits and IDs, with expiry dates where they apply."
      action={
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Upload className="mr-2 h-4 w-4" /> Upload
        </Button>
      }
    >
      <SimpleTable
        loading={listQuery.isLoading}
        rows={rowsOf<any>(listQuery.data)}
        empty="No documents yet."
        columns={[
          { key: "original_name", label: "File", render: (row) => <span className="font-medium">{row.original_name}</span> },
          { key: "category", label: "Category" },
          { key: "expires_on", label: "Expires", render: (row) => dateOnly(row.expires_on) },
          {
            key: "actions",
            label: "",
            className: "text-right",
            render: (row) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" aria-label="Download" onClick={() => download(row)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  aria-label="Delete"
                  onClick={() => {
                    if (window.confirm("Delete this document?")) remove.mutate(row.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Upload document"
        fields={[
          { name: "file", label: "File (max 20 MB)", type: "file", required: true, wide: true },
          { name: "category", label: "Category", placeholder: "e.g. contract, title_deed, permit" },
          { name: "expires_on", label: "Expires on", type: "date" },
          { name: "is_required", label: "Required document", type: "checkbox" },
        ]}
        submitLabel="Upload"
        submitting={upload.isPending}
        onSubmit={(values) => upload.mutate(values)}
      />
    </Panel>
  );
}
