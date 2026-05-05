import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isOverdue } from "@/lib/format";

type Variant = "draft" | "sent" | "paid" | "overdue" | "unpaid" | "received" | "billed" | "completed" | "ignored" | "matched" | "unmatched";

const styles: Record<Variant, string> = {
  draft: "bg-muted text-muted-foreground border border-border",
  sent: "bg-warning/15 text-warning-foreground border border-warning/30 dark:text-warning",
  paid: "bg-success/15 text-success border border-success/30",
  overdue: "bg-destructive/15 text-destructive border border-destructive/30",
  unpaid: "bg-warning/15 text-warning border border-warning/30",
  received: "bg-primary/15 text-primary border border-primary/30",
  billed: "bg-success/15 text-success border border-success/30",
  completed: "bg-success/15 text-success border border-success/30",
  ignored: "bg-muted text-muted-foreground border border-border",
  matched: "bg-success/15 text-success border border-success/30",
  unmatched: "bg-warning/15 text-warning border border-warning/30",
};

export function StatusBadge({
  status,
  dueDate,
}: {
  status: string;
  dueDate?: string | null;
}) {
  let v: Variant = (status as Variant) || "draft";
  let label = status;
  if ((status === "sent" || status === "unpaid") && dueDate && isOverdue(dueDate, status)) {
    v = "overdue";
    label = "overdue";
  }
  return (
    <Badge variant="outline" className={cn("capitalize font-medium border", styles[v])}>
      {label}
    </Badge>
  );
}
