import { useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { shouldAllowDialogClose } from "@/lib/dialog";

export function PdfPreviewDialog({
  open,
  onOpenChange,
  title,
  blob,
  filename,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  blob: Blob | null;
  filename: string;
}) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const download = () => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl h-[90vh] p-0 overflow-hidden"
        onPointerDownOutside={(e) => {
          if (!shouldAllowDialogClose(false)) e.preventDefault();
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-4 flex-1 min-h-0">
          {url ? (
            <iframe title={title} src={url} className="w-full h-full min-h-[68vh] border border-border rounded-md bg-background" />
          ) : (
            <div className="h-full min-h-[68vh] border border-border rounded-md grid place-items-center text-sm text-muted-foreground">
              PDF preview unavailable.
            </div>
          )}
        </div>
        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={download} disabled={!url}>Download PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}