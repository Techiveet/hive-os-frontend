"use client";

import * as React from "react";
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  HelpCircle,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supportBotApi } from "../../api/support-bot-api";
import { SupportBot, SupportBotKnowledgeBase } from "../../types";

interface Props {
  /** Single-bot knowledge (e.g. /support-bot/2/knowledge). */
  bot?: SupportBot;
  /** Multi-bot library with selector (e.g. /support-bot/knowledge). */
  bots?: SupportBot[];
  onRefresh?: () => void;
}

export function KnowledgeBaseHub({ bot, bots, onRefresh }: Props) {
  const scopedBot = bot ?? null;
  const availableBots = React.useMemo(
    () => (scopedBot ? [scopedBot] : bots ?? []),
    [scopedBot, bots],
  );
  const multiBot = !scopedBot && availableBots.length > 0;

  const [botFilter, setBotFilter] = React.useState<string>("all");
  const [items, setItems] = React.useState<SupportBotKnowledgeBase[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [syncingErp, setSyncingErp] = React.useState(false);
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<SupportBotKnowledgeBase | null>(null);
  const [formTitle, setFormTitle] = React.useState("");
  const [formQuestion, setFormQuestion] = React.useState("");
  const [formAnswer, setFormAnswer] = React.useState("");
  const [formCategory, setFormCategory] = React.useState("General");
  const [formBotId, setFormBotId] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingItem, setDeletingItem] = React.useState<SupportBotKnowledgeBase | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const botNameById = React.useMemo(() => {
    const map = new Map<number, SupportBot>();
    for (const b of availableBots) map.set(b.id, b);
    return map;
  }, [availableBots]);

  const writeBotId = React.useMemo(() => {
    if (scopedBot) return scopedBot.id;
    if (botFilter !== "all") return Number(botFilter);
    return null;
  }, [scopedBot, botFilter]);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = scopedBot
        ? await supportBotApi.getKnowledgeBases(scopedBot.id)
        : await supportBotApi.getAllKnowledgeBases({
            bot_id: botFilter === "all" ? undefined : Number(botFilter),
          });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load KB", e);
      setItems([]);
      toast.error("Failed to load knowledge base.");
    } finally {
      setLoading(false);
    }
  }, [scopedBot, botFilter]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const labelForItem = (item: SupportBotKnowledgeBase) =>
    item.bot?.name || botNameById.get(item.bot_id)?.name || `Bot #${item.bot_id}`;

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormQuestion("");
    setFormAnswer("");
    setFormCategory("General");
    setFormBotId(
      writeBotId
        ? String(writeBotId)
        : availableBots[0]
          ? String(availableBots[0].id)
          : "",
    );
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: SupportBotKnowledgeBase) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormQuestion(item.question || "");
    setFormAnswer(item.answer);
    setFormCategory(item.category || "General");
    setFormBotId(String(item.bot_id));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle || !formAnswer) return;
    const targetBotId = editingItem?.bot_id ?? Number(formBotId);
    if (!targetBotId) {
      toast.error("Select a bot for this entry.");
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        await supportBotApi.updateKnowledgeEntry(targetBotId, editingItem.id, {
          title: formTitle,
          question: formQuestion,
          answer: formAnswer,
          category: formCategory,
        });
        toast.success("Knowledge entry updated.");
      } else {
        await supportBotApi.createKnowledgeEntry(targetBotId, {
          title: formTitle,
          question: formQuestion,
          answer: formAnswer,
          category: formCategory,
          type: "faq",
        });
        toast.success("Knowledge entry added.");
      }
      setDialogOpen(false);
      void loadData();
      onRefresh?.();
    } catch (e) {
      console.error("Save KB error", e);
      toast.error("Failed to save knowledge entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: SupportBotKnowledgeBase) => {
    setDeletingItem(item);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    try {
      setDeleting(true);
      await supportBotApi.deleteKnowledgeEntry(deletingItem.bot_id, deletingItem.id);
      toast.success("Knowledge entry deleted.");
      setDeleteOpen(false);
      setDeletingItem(null);
      void loadData();
      onRefresh?.();
    } catch (e) {
      console.error("Delete KB error", e);
      toast.error("Failed to delete knowledge entry.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSyncErp = async () => {
    const targetBotId = writeBotId ?? (availableBots[0]?.id ?? null);
    if (!targetBotId) {
      toast.error("Select a bot before syncing ERP catalog.");
      return;
    }
    try {
      setSyncingErp(true);
      setSyncMessage(null);
      const res = await supportBotApi.syncErpCatalog(targetBotId);
      setSyncMessage(res.message);
      toast.success("ERP catalog sync finished.");
      void loadData();
      onRefresh?.();
    } catch (e) {
      console.error("Sync ERP error", e);
      toast.error("ERP catalog sync failed.");
    } finally {
      setSyncingErp(false);
    }
  };

  const categories = ["all", ...Array.from(new Set(items.map((i) => i.category || "General")))];

  const filtered = items.filter((item) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(term) ||
      (item.question && item.question.toLowerCase().includes(term)) ||
      item.answer.toLowerCase().includes(term) ||
      (multiBot && labelForItem(item).toLowerCase().includes(term));

    const matchesCategory =
      selectedCategory === "all" || (item.category || "General") === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const headingName = scopedBot
    ? scopedBot.name
    : botFilter === "all"
      ? "all bots"
      : botNameById.get(Number(botFilter))?.name || "this bot";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">RAG Knowledge Base & Training</h2>
          <p className="text-sm text-muted-foreground">
            Teach {headingName} using FAQs, company policies, and live ERP product catalog data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => void handleSyncErp()}
            disabled={syncingErp || (multiBot && botFilter === "all" && availableBots.length !== 1)}
            variant="outline"
            className="gap-2 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary"
            title={
              multiBot && botFilter === "all"
                ? "Pick a bot first to sync its ERP catalog"
                : undefined
            }
          >
            <Boxes className={`h-4 w-4 ${syncingErp ? "animate-spin" : ""}`} />
            {syncingErp ? "Syncing ERP..." : "Sync ERP Catalog"}
          </Button>

          <Button onClick={handleOpenCreate} className="gap-2 shadow">
            <Plus className="h-4 w-4" />
            Add Knowledge / FAQ
          </Button>
        </div>
      </div>

      {syncMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center max-w-xl">
          {multiBot && (
            <Select value={botFilter} onValueChange={setBotFilter}>
              <SelectTrigger className="h-9 w-full sm:w-48 text-sm bg-background">
                <SelectValue placeholder="All bots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All bots</SelectItem>
                {availableBots.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FAQs, questions, keywords..."
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-base">No knowledge entries found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
            Add FAQs or sync your ERP catalog so your AI assistant can accurately answer customer inquiries.
          </p>
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create First FAQ
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="group relative overflow-hidden transition-all hover:shadow-md border-border/80"
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[11px] font-normal">
                      {item.category || "General"}
                    </Badge>
                    {multiBot && (
                      <Badge variant="secondary" className="text-[11px] font-normal">
                        {labelForItem(item)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(item)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <CardTitle className="text-sm font-semibold mt-1 leading-snug line-clamp-1">
                  {item.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 pt-2 text-xs space-y-2">
                {item.question && (
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <HelpCircle className="h-3.5 w-3.5 shrink-0 text-primary/70 mt-0.5" />
                    <span className="line-clamp-2 font-medium text-foreground/90">
                      {item.question}
                    </span>
                  </div>
                )}

                <div className="rounded-lg bg-muted/40 p-2.5 text-muted-foreground leading-relaxed line-clamp-3">
                  {item.answer}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Knowledge Entry" : "Add Knowledge Base FAQ"}
            </DialogTitle>
            <DialogDescription>
              Provide the question, answer, and category to train your AI assistant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {multiBot && !editingItem && (
              <div>
                <label className="text-xs font-semibold">Bot</label>
                <Select value={formBotId} onValueChange={setFormBotId}>
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue placeholder="Select bot" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBots.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold">Title / Topic</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Return Policy, Pricing & VAT, Branch Locations"
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold">Typical Question Asked by Customers</label>
              <Input
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="e.g. How does your 15% VAT invoice calculation work?"
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold">AI Verified Answer</label>
              <Textarea
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                placeholder="Write the exact answer the bot should provide when queried..."
                rows={4}
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold">Category</label>
              <Input
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="e.g. Finance, Shipping, General, Technical"
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!formTitle || !formAnswer || saving || (!editingItem && !formBotId)}
            >
              {saving ? "Saving..." : editingItem ? "Update Entry" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this knowledge entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This knowledge entry will be permanently removed from the AI assistant&apos;s training
              data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
