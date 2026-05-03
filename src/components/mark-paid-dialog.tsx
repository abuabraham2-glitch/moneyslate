import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PaymentInfo = { date_paid: string; payment_method: string; payment_notes?: string };

export function MarkPaidDialog({
  open, onOpenChange, onConfirm, title = "Mark as Paid",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (info: PaymentInfo) => Promise<void> | void;
  title?: string;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("ACH");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5"><Label className="text-xs">Payment date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Payment method</Label>
            <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="ACH, Check, Card…" />
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy} onClick={async () => {
            setBusy(true);
            try { await onConfirm({ date_paid: date, payment_method: method, payment_notes: notes }); onOpenChange(false); }
            finally { setBusy(false); }
          }}>{busy ? "Saving…" : "Mark Paid"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
