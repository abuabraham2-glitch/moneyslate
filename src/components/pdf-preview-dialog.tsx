import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// @ts-ignore - pdfjs ESM build
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
// @ts-ignore - worker as URL
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!open || !blob) return;
    let cancelled = false;
    let loadingTask: any;
    (async () => {
      try {
        setError(null);
        setRendering(true);
        const buf = await blob.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({ data: buf });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";
        const containerWidth = container.clientWidth || 800;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(2, (containerWidth - 8) / baseViewport.width);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = "mx-auto mb-3 shadow-md rounded-sm bg-white";
          const ctx = canvas.getContext("2d")!;
          ctx.scale(dpr, dpr);
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to render PDF");
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
      try { loadingTask?.destroy?.(); } catch {}
    };
  }, [open, blob]);

  const download = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-4 flex-1 min-h-0 overflow-auto bg-muted/30">
          <div ref={containerRef} className="py-2">
            {!blob && (
              <div className="text-sm text-muted-foreground text-center py-12">PDF preview unavailable.</div>
            )}
            {rendering && blob && (
              <div className="text-sm text-muted-foreground text-center py-12">Rendering PDF…</div>
            )}
            {error && (
              <div className="text-sm text-destructive text-center py-12">{error}</div>
            )}
          </div>
        </div>
        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={download} disabled={!blob}>Download PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
