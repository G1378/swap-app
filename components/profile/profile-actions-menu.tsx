"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Flag, MoreHorizontal, ShieldOff, ShieldX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { blockUser, unblockUser } from "@/lib/blocks";
import { createReport } from "@/lib/reports";
import { REPORT_REASONS } from "@/lib/constants";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ReportReason } from "@/types";

interface ProfileActionsMenuProps {
  viewerId: string;
  profileId: string;
  profileUsername: string;
  initialIsBlocked: boolean;
}

export function ProfileActionsMenu({
  viewerId,
  profileId,
  profileUsername,
  initialIsBlocked,
}: ProfileActionsMenuProps) {
  const router = useRouter();
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blocked, setBlocked] = useState(initialIsBlocked);
  const [blocking, setBlocking] = useState(false);

  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleToggleBlock() {
    setMenuOpen(false);
    const confirmMessage = blocked
      ? `Unblock @${profileUsername}? They'll be able to contact you and see your listings again.`
      : `Block @${profileUsername}? You won't see each other's listings, and neither of you can start new swap requests.`;

    if (!confirm(confirmMessage)) return;

    setBlocking(true);
    try {
      if (blocked) {
        await unblockUser(supabase, viewerId, profileId);
      } else {
        await blockUser(supabase, viewerId, profileId);
      }
      setBlocked((v) => !v);
      router.refresh();
    } finally {
      setBlocking(false);
    }
  }

  async function handleSubmitReport(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await createReport(supabase, { reporterId: viewerId, reportedId: profileId, reason, details });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  function closeReportDialog() {
    setReportOpen(false);
    setSubmitted(false);
    setDetails("");
    setReason("spam");
    setError(null);
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Profile actions"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {menuOpen && (
          <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setReportOpen(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-accent"
            >
              <Flag className="h-4 w-4" /> Report user
            </button>
            <button
              type="button"
              onClick={handleToggleBlock}
              disabled={blocking}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-destructive hover:bg-accent disabled:opacity-60"
            >
              {blocked ? <ShieldOff className="h-4 w-4" /> : <ShieldX className="h-4 w-4" />}
              {blocked ? "Unblock user" : "Block user"}
            </button>
          </div>
        )}
      </div>

      <Dialog
        open={reportOpen}
        onClose={closeReportDialog}
        title="Report user"
        description={`Reporting @${profileUsername}`}
      >
        {submitted ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Thanks — your report has been submitted for review.</p>
            <Button onClick={closeReportDialog}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmitReport} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="details">Details (optional)</Label>
              <Textarea
                id="details"
                maxLength={500}
                placeholder="Anything that would help us understand what happened..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeReportDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit report"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
