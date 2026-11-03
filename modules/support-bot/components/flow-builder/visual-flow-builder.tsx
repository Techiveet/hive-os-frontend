"use client";

import * as React from "react";
import {
  Sparkles,
  Plus,
  Save,
  Play,
  Trash2,
  MessageSquare,
  HelpCircle,
  Headphones,
  CheckCircle2,
  Workflow,
  Layers,
  ArrowRight,
  Database,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Label } from "@/components/ui/label";
import { supportBotApi } from "../../api/support-bot-api";
import { SupportBot, SupportBotFlow, FlowNode, FlowEdge } from "../../types";

interface Props {
  bot: SupportBot;
  flowId?: number;
  onOpenSimulator?: () => void;
}

function defaultStartNodes(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const startId = `node_${Date.now()}`;
  const messageId = `node_${Date.now() + 1}`;
  return {
    nodes: [
      {
        id: startId,
        type: "start",
        position: { x: 150, y: 80 },
        data: { label: "Conversation Trigger" },
      },
      {
        id: messageId,
        type: "message",
        position: { x: 150, y: 210 },
        data: {
          label: "Welcome Message",
          message: "Hello! How may I assist your business today?",
          buttons: ["View Catalog", "Contact Agent"],
        },
      },
    ],
    edges: [{ id: `e_${startId}_${messageId}`, source: startId, target: messageId }],
  };
}

export function VisualFlowBuilder({ bot, flowId, onOpenSimulator }: Props) {
  const [flows, setFlows] = React.useState<SupportBotFlow[]>([]);
  const [activeFlow, setActiveFlow] = React.useState<SupportBotFlow | null>(null);
  const [nodes, setNodes] = React.useState<FlowNode[]>([]);
  const [edges, setEdges] = React.useState<FlowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newFlowName, setNewFlowName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteNodeOpen, setDeleteNodeOpen] = React.useState(false);
  const [deletingNodeId, setDeletingNodeId] = React.useState<string | null>(null);

  // Load flows
  React.useEffect(() => {
    loadFlows();
  }, [bot.id, flowId]);

  const loadFlows = async (preferFlowId?: number) => {
    try {
      setLoading(true);
      const data = await supportBotApi.getFlows(bot.id);
      setFlows(data);
      if (data.length > 0) {
        const preferredId = preferFlowId ?? flowId;
        const target = preferredId
          ? data.find((f) => f.id === preferredId) || data[0]
          : data[0];
        setActiveFlow(target);
        setNodes(target.nodes || []);
        setEdges(target.edges || []);
      } else {
        setActiveFlow(null);
        setNodes([]);
        setEdges([]);
      }
    } catch (e) {
      console.error("Failed to load flows", e);
      toast.error("Failed to load flows.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFlow = (flow: SupportBotFlow) => {
    setActiveFlow(flow);
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
    setSelectedNodeId(null);
  };

  const handleCreateFlow = async () => {
    const name = newFlowName.trim() || "Main Conversation Flow";
    try {
      setCreating(true);
      const starter = defaultStartNodes();
      const created = await supportBotApi.createFlow(bot.id, {
        name,
        trigger_type: "conversation_start",
        is_default: flows.length === 0,
        nodes: starter.nodes,
        edges: starter.edges,
      });
      toast.success(`Flow “${created.name}” created.`);
      setCreateOpen(false);
      setNewFlowName("");
      await loadFlows(created.id);
    } catch (e) {
      console.error("Failed to create flow", e);
      toast.error("Failed to create flow.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFlow = async () => {
    if (!activeFlow) return;
    try {
      setDeleting(true);
      await supportBotApi.deleteFlow(bot.id, activeFlow.id);
      toast.success(`Flow “${activeFlow.name}” deleted.`);
      setDeleteOpen(false);
      await loadFlows();
    } catch (e) {
      console.error("Failed to delete flow", e);
      toast.error("Failed to delete flow.");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddNode = (type: FlowNode["type"]) => {
    const id = `node_${Date.now()}`;
    const newY = nodes.length * 130 + 100;
    const newX = (nodes.length % 2 === 0 ? 150 : 450);

    const labels: Record<string, string> = {
      start: "Conversation Trigger",
      message: "Send Bot Message",
      question: "Ask Question & Collect Input",
      knowledge: "AI Knowledge (RAG) Lookup",
      condition: "Branching Condition",
      action: "ERP Tool / API Action",
      handover: "Escalate to Human Agent",
    };

    const newNode: FlowNode = {
      id,
      type,
      position: { x: newX, y: newY },
      data: {
        label: labels[type] || "Flow Step",
        message: type === "message" ? "Hello! How may I assist your business today?" : undefined,
        buttons: type === "message" ? ["View Catalog", "Contact Agent"] : [],
      },
    };

    setNodes((prev) => [...prev, newNode]);

    // Connect automatically from previous node if exists
    if (nodes.length > 0) {
      const prev = nodes[nodes.length - 1];
      setEdges((prevEdges) => [
        ...prevEdges,
        { id: `e_${prev.id}_${id}`, source: prev.id, target: id },
      ]);
    }

    setSelectedNodeId(id);
  };

  const handleUpdateSelectedNode = (dataPatch: Partial<FlowNode["data"]>) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, ...dataPatch } } : n))
    );
  };

  const handleDeleteNode = (id: string) => {
    setDeletingNodeId(id);
    setDeleteNodeOpen(true);
  };

  const confirmDeleteNode = () => {
    if (deletingNodeId === null) return;
    setNodes((prev) => prev.filter((n) => n.id !== deletingNodeId));
    setEdges((prev) => prev.filter((e) => e.source !== deletingNodeId && e.target !== deletingNodeId));
    if (selectedNodeId === deletingNodeId) setSelectedNodeId(null);
    setDeleteNodeOpen(false);
    setDeletingNodeId(null);
  };

  const handleSaveFlow = async () => {
    if (!activeFlow) {
      setCreateOpen(true);
      return;
    }
    try {
      setSaving(true);
      setSavedSuccess(false);
      await supportBotApi.saveFlow(bot.id, activeFlow.id, {
        nodes,
        edges,
      });
      setSavedSuccess(true);
      toast.success("Flow saved.");
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to save flow", e);
      toast.error("Failed to save flow.");
    } finally {
      setSaving(false);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex h-[calc(100vh-14rem)] flex-col rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
      {/* Studio Header Toolbar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <Workflow className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">Flow Studio:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {flows.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleSelectFlow(f)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeFlow?.id === f.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f.name} {f.is_default && "★"}
              </button>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNewFlowName(flows.length === 0 ? "Main Conversation Flow" : "");
                setCreateOpen(true);
              }}
              className="h-7 gap-1 px-2 text-xs shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              New Flow
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {savedSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved!
            </span>
          )}

          {onOpenSimulator && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenSimulator}
              disabled={!activeFlow}
              className="h-8 gap-1.5 text-xs text-primary border-primary/40 bg-primary/5 hover:bg-primary/10"
            >
              <Play className="h-3.5 w-3.5 fill-primary" />
              Test Run Flow
            </Button>
          )}

          {activeFlow && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSaveFlow}
            disabled={saving || (!activeFlow && flows.length > 0)}
            className="h-8 gap-1.5 text-xs shadow"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Flow"}
          </Button>
        </div>
      </div>

      {/* Main Studio Canvas & Inspector Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {!activeFlow && !loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <Workflow className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="font-semibold">No conversation flows yet</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-md">
                Create a flow to design welcome messages, knowledge lookups, ERP actions, and human handoff.
              </p>
            </div>
            <Button
              onClick={() => {
                setNewFlowName("Main Conversation Flow");
                setCreateOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create First Flow
            </Button>
          </div>
        ) : (
          <>
        {/* Left Floating Node Insertion Pallet */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 rounded-xl border border-border/80 bg-background/90 p-2 shadow-lg backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5">
            Add Node
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAddNode("message")}
            className="h-8 justify-start gap-2 text-xs font-normal hover:bg-primary/10 hover:text-primary"
          >
            <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
            Message
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAddNode("question")}
            className="h-8 justify-start gap-2 text-xs font-normal hover:bg-primary/10 hover:text-primary"
          >
            <HelpCircle className="h-3.5 w-3.5 text-purple-500" />
            Question / Input
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAddNode("knowledge")}
            className="h-8 justify-start gap-2 text-xs font-normal hover:bg-primary/10 hover:text-primary"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            AI RAG Knowledge
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAddNode("action")}
            className="h-8 justify-start gap-2 text-xs font-normal hover:bg-primary/10 hover:text-primary"
          >
            <Database className="h-3.5 w-3.5 text-emerald-500" />
            ERP Action Tool
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleAddNode("handover")}
            className="h-8 justify-start gap-2 text-xs font-normal hover:bg-primary/10 hover:text-primary"
          >
            <Headphones className="h-3.5 w-3.5 text-rose-500" />
            Human Handover
          </Button>
        </div>

        {/* Visual Graph Area */}
        <div className="flex-1 overflow-auto p-8 pl-56 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
          <div className="space-y-4 max-w-2xl">
            {nodes.map((node, index) => {
              const isSelected = node.id === selectedNodeId;

              const nodeColors: Record<string, string> = {
                start: "border-emerald-500/60 bg-emerald-500/5",
                message: "border-blue-500/60 bg-blue-500/5",
                question: "border-purple-500/60 bg-purple-500/5",
                knowledge: "border-amber-500/60 bg-amber-500/5",
                action: "border-teal-500/60 bg-teal-500/5",
                handover: "border-rose-500/60 bg-rose-500/5",
              };

              return (
                <React.Fragment key={node.id}>
                  <div
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`relative rounded-xl border-2 p-4 shadow-sm transition-all cursor-pointer ${
                      nodeColors[node.type] || "border-border"
                    } ${isSelected ? "ring-2 ring-primary shadow-md scale-[1.01]" : "hover:shadow"}`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase">
                          {node.type}
                        </Badge>
                        <span className="font-semibold text-xs text-foreground">{node.data.label}</span>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNode(node.id);
                        }}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="pt-2.5 text-xs text-muted-foreground">
                      {node.type === "message" && (
                        <div>
                          <p className="line-clamp-2 text-foreground/90 font-medium">{node.data.message}</p>
                          {node.data.buttons && node.data.buttons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {node.data.buttons.map((b, i) => (
                                <span
                                  key={i}
                                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-medium"
                                >
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {node.type === "knowledge" && (
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Queries RAG Knowledge Base and answers visitor automatically.</span>
                        </div>
                      )}

                      {node.type === "handover" && (
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                          <Headphones className="h-3.5 w-3.5" />
                          <span>Transfers visitor session to Live Agent Support Inbox.</span>
                        </div>
                      )}

                      {node.type === "action" && (
                        <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                          <Database className="h-3.5 w-3.5" />
                          <span>Executes ERP Item / Invoice lookup query tool.</span>
                        </div>
                      )}

                      {node.type === "start" && (
                        <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Triggered when visitor opens chat or visits page.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Visual Connection Arrow */}
                  {index < nodes.length - 1 && (
                    <div className="flex justify-center my-1 text-muted-foreground/60">
                      <ArrowRight className="h-4 w-4 rotate-90" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Right Properties Inspector Panel */}
        <div className="w-80 border-l border-border/60 bg-muted/20 p-4 overflow-y-auto">
          <div className="flex items-center gap-2 pb-3 border-b border-border/60">
            <Sliders className="h-4 w-4 text-primary" />
            <span className="font-bold text-xs uppercase tracking-wider">Node Inspector</span>
          </div>

          {selectedNode ? (
            <div className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-muted-foreground">Step Label</label>
                <Input
                  value={selectedNode.data.label || ""}
                  onChange={(e) => handleUpdateSelectedNode({ label: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              {selectedNode.type === "message" && (
                <>
                  <div>
                    <label className="font-semibold text-muted-foreground">Bot Message Text</label>
                    <Textarea
                      value={selectedNode.data.message || ""}
                      onChange={(e) => handleUpdateSelectedNode({ message: e.target.value })}
                      rows={4}
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-muted-foreground">
                      Quick Reply Buttons (comma-separated)
                    </label>
                    <Input
                      value={(selectedNode.data.buttons || []).join(", ")}
                      onChange={(e) =>
                        handleUpdateSelectedNode({
                          buttons: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="e.g. Products, Track Order, Talk to Human"
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </>
              )}

              {selectedNode.type === "knowledge" && (
                <div className="rounded-lg bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
                  <p className="font-semibold mb-1">Autonomous RAG Step</p>
                  <p className="text-[11px] leading-relaxed">
                    This step evaluates visitor natural language queries against your Knowledge Base articles and synced ERP catalog.
                  </p>
                </div>
              )}

              {selectedNode.type === "handover" && (
                <div className="rounded-lg bg-rose-500/10 p-3 text-rose-700 dark:text-rose-300">
                  <p className="font-semibold mb-1">Human Agent Handover</p>
                  <p className="text-[11px] leading-relaxed">
                    Marks conversation as Escalated and triggers desktop notifications to online support specialists.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Layers className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">Click any node on the canvas to inspect and edit its properties.</p>
            </div>
          )}
        </div>
          </>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New conversation flow</DialogTitle>
            <DialogDescription>
              Flows define how the bot greets visitors and routes them through knowledge, ERP actions, or human handoff.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="flow-name">Flow name</Label>
            <Input
              id="flow-name"
              value={newFlowName}
              onChange={(e) => setNewFlowName(e.target.value)}
              placeholder="e.g. Main Conversation Flow"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateFlow();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateFlow()} disabled={creating}>
              {creating ? "Creating..." : "Create Flow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this flow?</AlertDialogTitle>
            <AlertDialogDescription>
              “{activeFlow?.name}” will be permanently removed. Conversations already using it may fall back to another flow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteFlow();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Flow"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteNodeOpen} onOpenChange={setDeleteNodeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this node?</AlertDialogTitle>
            <AlertDialogDescription>
              This node will be permanently removed from the flow. Any connections to it will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteNode();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Node
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
