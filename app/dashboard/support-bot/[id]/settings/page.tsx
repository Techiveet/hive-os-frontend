"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, Sliders, Sparkles, MessageSquare, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supportBotApi } from "@/modules/support-bot/api/support-bot-api";
import { SupportBot } from "@/modules/support-bot/types";

export default function BotSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const botId = Number(params.id);

  const [bot, setBot] = React.useState<SupportBot | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [systemPrompt, setSystemPrompt] = React.useState("");
  const [model, setModel] = React.useState("gpt-4o-mini");
  const [temperature, setTemperature] = React.useState(0.3);
  const [greeting, setGreeting] = React.useState("");
  const [fallback, setFallback] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [enableEscalation, setEnableEscalation] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (botId) {
      supportBotApi.getBot(botId).then((b) => {
        setBot(b);
        setName(b.name);
        setSlug(b.slug);
        setDescription(b.description || "");
        setSystemPrompt(b.system_prompt || "");
        setModel(b.model || "gpt-4o-mini");
        setTemperature(b.temperature ?? 0.3);
        setGreeting(b.greeting_message || "");
        setFallback(b.fallback_message || "");
        setIsActive(b.is_active);
        setEnableEscalation(b.enable_human_escalation);
      });
    }
  }, [botId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await supportBotApi.updateBot(botId, {
        name,
        slug,
        description,
        system_prompt: systemPrompt,
        model,
        temperature,
        greeting_message: greeting,
        fallback_message: fallback,
        is_active: isActive,
        enable_human_escalation: enableEscalation,
      });
      toast.success("Bot settings saved.");
      router.push(`/dashboard/support-bot/${botId}`);
    } catch (e) {
      console.error("Save settings error", e);
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await supportBotApi.deleteBot(botId);
      toast.success("Bot deleted.");
      setDeleteOpen(false);
      router.push("/dashboard/support-bot");
    } catch (e) {
      console.error("Delete bot error", e);
      toast.error("Failed to delete bot.");
    } finally {
      setDeleting(false);
    }
  };

  if (!bot) return <div className="p-6 text-sm text-muted-foreground">Loading settings...</div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/support-bot/${bot.id}`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Bot Configuration & Model Settings</h1>
            <p className="text-xs text-muted-foreground">Manage LLM parameters and system persona for {bot.name}</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2 shadow">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            General Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-muted-foreground">Bot Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 text-xs" />
            </div>
            <div>
              <label className="font-semibold text-muted-foreground">Identifier / Slug</label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 text-xs font-mono" />
            </div>
          </div>

          <div>
            <label className="font-semibold text-muted-foreground">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 text-xs" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            AI Model & Persona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-muted-foreground">System Persona Prompt</label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="mt-1 text-xs leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-muted-foreground">LLM Model</label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 text-xs" />
            </div>
            <div>
              <label className="font-semibold text-muted-foreground">Creativity Temperature ({temperature})</label>
              <Input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-muted-foreground">Fallback Response (When no match is found)</label>
            <Textarea
              value={fallback}
              onChange={(e) => setFallback(e.target.value)}
              rows={2}
              className="mt-1 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Greeting & Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-xs">
          <div>
            <label className="font-semibold text-muted-foreground">Greeting Message</label>
            <Textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              rows={3}
              placeholder={`Hello! Welcome to ${bot.name}. How can we help?`}
              className="mt-1 text-xs leading-relaxed"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Shown when a visitor opens the widget (also editable in Widget Studio).
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Power className="h-3.5 w-3.5 text-muted-foreground" />
                <Label htmlFor="bot-active" className="text-xs font-semibold">
                  Bot is active
                </Label>
              </div>
              <p className="text-[11px] text-muted-foreground pl-5">
                Inactive bots reject new conversations and hide the public widget.
              </p>
            </div>
            <Switch id="bot-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="bot-escalation" className="text-xs font-semibold">
                Enable human escalation
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Allows the bot to hand conversations to live agents in the inbox.
              </p>
            </div>
            <Switch
              id="bot-escalation"
              checked={enableEscalation}
              onCheckedChange={setEnableEscalation}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2 text-xs">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Bot
        </Button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bot?</AlertDialogTitle>
            <AlertDialogDescription>
              "{bot.name}" will be permanently removed. All its flows, knowledge base entries, and conversation history will be deleted.
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
              {deleting ? "Deleting..." : "Delete Bot"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
