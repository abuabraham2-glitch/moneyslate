import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { uploadPdfToStorage } from "@/lib/pdf";

export async function sendDocumentEmail(params: {
  type: "invoice" | "po";
  number: string;
  recipientEmail?: string | null;
  recipientName?: string | null;
  subject: string;
  pdf: jsPDF;
  filename: string;
  extra?: Record<string, any>;
}) {
  const { data: settings } = await supabase.from("settings").select("email_webhook_url,company_name,company_email").limit(1).single();
  const url = settings?.email_webhook_url;
  const pdfUrl = await uploadPdfToStorage(params.pdf, params.filename);

  const payload = {
    type: params.type,
    document_number: params.number,
    to: params.recipientEmail,
    to_name: params.recipientName,
    from_name: settings?.company_name,
    from_email: settings?.company_email,
    subject: params.subject,
    pdf_url: pdfUrl,
    ...params.extra,
  };

  if (!url) {
    return { ok: true, pdfUrl, skipped: true, reason: "No webhook URL configured" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status, pdfUrl };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Webhook failed", pdfUrl };
  }
}
