"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, Flag, MessageSquare, Send } from "lucide-react";

interface Review {
  id: string;
  comment: string | null;
  created_at: string | null;
  reviewer_name: string;
  mentions: string[] | null;
}

interface User {
  id: string;
  full_name: string;
}

interface ReviewPanelProps {
  reportId: string;
  orgId: string;
  userId: string;
  reportStatus: string;
  reviews: Review[];
  orgUsers: User[];
  isAdmin: boolean;
}

export function ReviewPanel({
  reportId,
  orgId,
  userId,
  reportStatus,
  reviews,
  orgUsers,
  isAdmin,
}: ReviewPanelProps) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const router = useRouter();

  async function addComment() {
    if (!comment.trim()) return;
    setSubmitting(true);

    const mentionRegex = /@(\w[\w\s]*?\w)/g;
    const mentionedNames = [...comment.matchAll(mentionRegex)].map((m) => m[1].trim());
    const mentionedIds = orgUsers
      .filter((u) => mentionedNames.some((name) => u.full_name.toLowerCase().includes(name.toLowerCase())))
      .map((u) => u.id);

    const supabase = createClient();
    const { error } = await supabase.from("report_reviews").insert({
      org_id: orgId,
      report_id: reportId,
      reviewer_id: userId,
      comment: comment.trim(),
      mentions: mentionedIds.length > 0 ? mentionedIds : null,
    });

    if (error) {
      toast.error(error.message);
    } else {
      if (mentionedIds.length > 0) {
        const notifications = mentionedIds.map((uid) => ({
          org_id: orgId,
          user_id: uid,
          type: "mention",
          title: "You were mentioned in a report review",
          body: comment.trim().substring(0, 200),
          reference_id: reportId,
          reference_type: "report",
        }));
        await supabase.from("notifications").insert(notifications);
      }

      setComment("");
      toast.success("Comment added");
      router.refresh();
    }
    setSubmitting(false);
  }

  async function updateStatus(status: "reviewed" | "flagged") {
    const supabase = createClient();
    const { error } = await supabase
      .from("reports")
      .update({
        status,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (status === "flagged") {
      await supabase.from("intelligence_flags").insert({
        org_id: orgId,
        flag_type: "report_flagged",
        severity: "warning",
        title: "Report flagged for review",
        reference_id: reportId,
        reference_type: "report",
      });
    }

    toast.success(status === "reviewed" ? "Marked as reviewed" : "Report flagged");
    router.refresh();
  }

  function insertMention(name: string) {
    setComment((prev) => prev + `@${name} `);
    setShowMentions(false);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Review
          </CardTitle>
          <Badge variant={reportStatus === "flagged" ? "destructive" : reportStatus === "reviewed" ? "secondary" : "default"}>
            {reportStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.length > 0 && (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-md bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">{review.reviewer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {review.created_at
                      ? new Date(review.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                      : ""}
                  </p>
                </div>
                <p className="text-sm mt-1">{review.comment}</p>
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <>
            <div className="relative">
              <Textarea
                placeholder="Add a comment... Use @name to mention someone"
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  const lastChar = e.target.value[e.target.value.length - 1];
                  if (lastChar === "@") setShowMentions(true);
                  else if (lastChar === " ") setShowMentions(false);
                }}
                rows={2}
              />
              {showMentions && (
                <div className="absolute bottom-full mb-1 left-0 w-full bg-background border rounded-md shadow-md z-10 max-h-40 overflow-y-auto">
                  {orgUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => insertMention(u.full_name)}
                    >
                      {u.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addComment} disabled={submitting || !comment.trim()}>
                <Send className="h-3.5 w-3.5 mr-1" />
                Comment
              </Button>
              {reportStatus !== "reviewed" && (
                <Button size="sm" variant="secondary" onClick={() => updateStatus("reviewed")}>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Mark Reviewed
                </Button>
              )}
              {reportStatus !== "flagged" && (
                <Button size="sm" variant="destructive" onClick={() => updateStatus("flagged")}>
                  <Flag className="h-3.5 w-3.5 mr-1" />
                  Flag
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
