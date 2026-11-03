"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { KnowledgeBaseHub } from "@/modules/support-bot/components/knowledge-base/knowledge-base-hub";
import { NoBotConfigured } from "@/modules/support-bot/components/no-bot-configured";
import { supportBotApi } from "@/modules/support-bot/api/support-bot-api";
import { SupportBot } from "@/modules/support-bot/types/index";

export default function SupportBotKnowledgePage() {
  const [bots, setBots] = React.useState<SupportBot[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    supportBotApi
      .getBots()
      .then((data: SupportBot[]) => setBots(data))
      .catch((e: unknown) => console.error("Failed to load bots", e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm font-medium">Loading Knowledge Base & RAG...</span>
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div className="p-6">
        <NoBotConfigured area="The knowledge base" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Knowledge Base & RAG Training</h1>
        <p className="text-xs text-muted-foreground">
          Browse FAQs across all bots, or filter to train one assistant.
        </p>
      </div>
      <KnowledgeBaseHub bots={bots} />
    </div>
  );
}
