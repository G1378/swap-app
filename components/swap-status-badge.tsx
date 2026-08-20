import { Badge } from "@/components/ui/badge";
import type { SwapRequestStatus } from "@/types";

const STATUS_CONFIG: Record<SwapRequestStatus, { label: string; variant: "default" | "secondary" | "outline" | "accent" }> = {
  pending: { label: "Pending", variant: "outline" },
  accepted: { label: "Accepted", variant: "accent" },
  completed: { label: "Completed", variant: "default" },
  declined: { label: "Declined", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export function SwapStatusBadge({ status }: { status: SwapRequestStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
