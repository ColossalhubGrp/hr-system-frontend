"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";

/**
 * Renders a "Download" button that snapshots the element identified
 * by `targetId` (the payslip card) via html2canvas, converts to a PDF
 * with jsPDF, and triggers a browser download. No system print dialog.
 *
 * The libraries are heavy (~120KB each), so we lazy-load them on
 * click instead of bloating the initial route bundle for every viewer.
 */
export function DownloadPayslipButton({
  targetId,
  filename,
  label = "Download",
}: {
  targetId: string;
  /** Suggested filename (extension appended automatically). */
  filename: string;
  label?: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    const el = document.getElementById(targetId);
    if (!el) {
      toast.error("Couldn't find the payslip to render.");
      return;
    }
    setPending(true);
    try {
      // Lazy-load both packages so their bundles only ship when a user
      // actually clicks download.
      const [{ default: html2canvas }, jsPDFMod] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const JsPDF = (jsPDFMod as { jsPDF?: typeof jsPDFMod.jsPDF }).jsPDF
        ?? (jsPDFMod as unknown as { default: typeof jsPDFMod.jsPDF }).default;

      const canvas = await html2canvas(el, {
        scale: 2,               // 2× for sharp text on printers
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");

      // Fit the canvas into A4 portrait, preserving aspect ratio.
      const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20; // 10mm margins each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let position = 10;
      let heightLeft = imgHeight;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
      // Overflow → additional pages until the whole snapshot is placed.
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }
      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error("[DownloadPayslipButton] failed:", err);
      toast.error("Couldn't build the PDF. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60 print:hidden"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {pending ? "Preparing PDF…" : label}
    </button>
  );
}
