"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Star, Trash2, Loader2, CheckCircle2, CornerDownRight, Quote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  fetchHospitalityFeedback,
  updateHospitalityFeedback,
  deleteHospitalityFeedback,
} from "@/modules/hospitality/api";
import type { HospitalityFeedback } from "@/modules/hospitality/types";
import { cn } from "@/lib/utils";

export default function FeedbackPage() {
  const queryClient = useQueryClient();
  const [selectedFeedback, setSelectedFeedback] = useState<HospitalityFeedback | null>(null);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ["hospitality", "feedback"],
    queryFn: () => fetchHospitalityFeedback(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateHospitalityFeedback(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitality", "feedback"] });
      toast.success("Feedback updated");
      setIsReplyDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update feedback");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHospitalityFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitality", "feedback"] });
      toast.success("Feedback deleted");
    },
    onError: () => {
      toast.error("Failed to delete feedback");
    },
  });

  const handleReplySubmit = () => {
    if (!selectedFeedback) return;
    updateMutation.mutate({
      id: selectedFeedback.id,
      payload: { response: replyText }
    });
  };

  const togglePublish = (feedback: HospitalityFeedback) => {
    updateMutation.mutate({
      id: feedback.id,
      payload: { is_published: !feedback.is_published }
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        className={cn("h-4 w-4", i < rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground opacity-30")} 
      />
    ));
  };

  return (
    <div className="space-y-8 p-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-indigo-500" />
            Feedback & Reviews
          </h1>
          <p className="text-muted-foreground">Manage customer feedback, reply to reviews, and track satisfaction.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center p-12 border rounded-[2rem] bg-card text-muted-foreground">
          No feedback available yet.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {feedbacks.map((feedback: HospitalityFeedback) => (
            <div key={feedback.id} className="rounded-[2rem] border bg-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{feedback.customer_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(feedback.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {renderStars(feedback.rating)}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-4 relative">
                  <Quote className="absolute top-2 left-2 h-6 w-6 text-indigo-500 opacity-10" />
                  <p className="text-sm italic relative z-10 pl-4">{feedback.comment || "No comment provided."}</p>
                </div>

                {feedback.response && (
                  <div className="ml-6 mb-4 relative">
                    <CornerDownRight className="absolute -left-5 top-1 h-4 w-4 text-muted-foreground" />
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/50">
                      <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-1">
                        Response from Management:
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{feedback.response}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => togglePublish(feedback)}
                  className={cn(
                    "text-xs font-bold",
                    feedback.is_published ? "text-emerald-600 hover:text-emerald-700" : "text-muted-foreground"
                  )}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  {feedback.is_published ? "Published" : "Publish"}
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFeedback(feedback);
                      setReplyText(feedback.response || "");
                      setIsReplyDialogOpen(true);
                    }}
                  >
                    Reply
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Delete this feedback?")) {
                        deleteMutation.mutate(feedback.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Feedback</DialogTitle>
            <DialogDescription>
              Your response will be visible to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Management Response</Label>
              <Textarea 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Thank you for your feedback..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReplyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReplySubmit} disabled={updateMutation.isPending || !replyText.trim()}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
