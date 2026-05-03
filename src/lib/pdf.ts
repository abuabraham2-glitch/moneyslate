import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate } from "./format";

type Settings = {
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_logo_url?: string;
};

type Doc = {
  type: "invoice" | "po";
  number: string;
  issue_date: string;
  due_date?: string;
  expected_delivery_date?: string;
  client_po_number?: string;
  internal_po_number?: string;
  payment_terms?: string;
  notes?: string;
  subtotal: number;
  tax_amount?: number;
  total: number;
  party: {
    name: string;
    contact?: string;
    email?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  ship_to?: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  lines: Array<{ description: string; quantity: number; price: number; total: number }>;
};

export function generatePDF(doc: Doc, settings: Settings): jsPDF {
  const pdf = new jsPDF();
  const isInvoice = doc.type === "invoice";

  // Header
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text(isInvoice ? "INVOICE" : "PURCHASE ORDER", 15, 20);

  // Doc number + dates
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`#${doc.number}`, 15, 28);

  // Right-side dates
  const rightX = 195;
  pdf.setFont("helvetica", "bold");
  pdf.text("Date:", rightX - 30, 20);
  pdf.setFont("helvetica", "normal");
  pdf.text(formatDate(doc.issue_date), rightX, 20, { align: "right" });

  if (isInvoice && doc.due_date) {
    pdf.setFont("helvetica", "bold"); pdf.text("Due:", rightX - 30, 26);
    pdf.setFont("helvetica", "normal"); pdf.text(formatDate(doc.due_date), rightX, 26, { align: "right" });
  }
  if (!isInvoice && doc.expected_delivery_date) {
    pdf.setFont("helvetica", "bold"); pdf.text("Expected:", rightX - 30, 26);
    pdf.setFont("helvetica", "normal"); pdf.text(formatDate(doc.expected_delivery_date), rightX, 26, { align: "right" });
  }
  if (doc.client_po_number) {
    pdf.setFont("helvetica", "bold"); pdf.text("Client PO:", rightX - 30, 32);
    pdf.setFont("helvetica", "normal"); pdf.text(doc.client_po_number, rightX, 32, { align: "right" });
  }

  // Company (from)
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(settings.company_name || "Your Company", 15, 45);
  pdf.setFont("helvetica", "normal");
  let y = 50;
  if (settings.company_address) { settings.company_address.split("\n").forEach((l) => { pdf.text(l, 15, y); y += 5; }); }
  if (settings.company_phone) { pdf.text(settings.company_phone, 15, y); y += 5; }
  if (settings.company_email) { pdf.text(settings.company_email, 15, y); y += 5; }

  // To
  pdf.setFont("helvetica", "bold");
  pdf.text(isInvoice ? "Bill To:" : "Vendor:", 110, 45);
  pdf.setFont("helvetica", "normal");
  let ty = 50;
  pdf.text(doc.party.name, 110, ty); ty += 5;
  if (doc.party.contact) { pdf.text(doc.party.contact, 110, ty); ty += 5; }
  if (doc.party.street) { pdf.text(doc.party.street, 110, ty); ty += 5; }
  if (doc.party.city || doc.party.state || doc.party.zip) {
    pdf.text(`${doc.party.city || ""}${doc.party.state ? ", " + doc.party.state : ""} ${doc.party.zip || ""}`.trim(), 110, ty); ty += 5;
  }
  if (doc.party.email) { pdf.text(doc.party.email, 110, ty); ty += 5; }

  // Ship to (PO)
  if (!isInvoice && doc.ship_to?.street) {
    pdf.setFont("helvetica", "bold"); pdf.text("Ship To:", 110, ty + 3); ty += 8;
    pdf.setFont("helvetica", "normal");
    if (doc.ship_to.name) { pdf.text(doc.ship_to.name, 110, ty); ty += 5; }
    pdf.text(doc.ship_to.street, 110, ty); ty += 5;
    pdf.text(`${doc.ship_to.city || ""}${doc.ship_to.state ? ", " + doc.ship_to.state : ""} ${doc.ship_to.zip || ""}`.trim(), 110, ty);
  }

  const tableStart = Math.max(y, ty) + 12;

  // Line items
  autoTable(pdf, {
    startY: tableStart,
    head: [["Description", "Qty", isInvoice ? "Unit Price" : "Unit Cost", "Total"]],
    body: doc.lines.map((l) => [
      l.description,
      l.quantity.toString(),
      formatCurrency(l.price),
      formatCurrency(l.total),
    ]),
    headStyles: { fillColor: [40, 50, 70], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    theme: "grid",
    margin: { left: 15, right: 15 },
  });

  // Totals
  const finalY = (pdf as any).lastAutoTable.finalY + 6;
  const rx = 195;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Subtotal:", rx - 35, finalY); pdf.text(formatCurrency(doc.subtotal), rx, finalY, { align: "right" });
  let ty2 = finalY + 6;
  if (isInvoice && doc.tax_amount) {
    pdf.text("Tax:", rx - 35, ty2); pdf.text(formatCurrency(doc.tax_amount), rx, ty2, { align: "right" }); ty2 += 6;
  }
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
  pdf.text("Total:", rx - 35, ty2 + 2); pdf.text(formatCurrency(doc.total), rx, ty2 + 2, { align: "right" });

  // Payment terms / notes
  let by = ty2 + 16;
  if (doc.payment_terms) {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.text("Payment Terms:", 15, by);
    pdf.setFont("helvetica", "normal"); pdf.text(doc.payment_terms, 50, by); by += 6;
  }
  if (doc.notes) {
    pdf.setFont("helvetica", "bold"); pdf.text("Notes:", 15, by); by += 5;
    pdf.setFont("helvetica", "normal");
    const wrapped = pdf.splitTextToSize(doc.notes, 180);
    pdf.text(wrapped, 15, by);
  }

  return pdf;
}

export async function uploadPdfToStorage(pdf: jsPDF, filename: string): Promise<string> {
  const { supabase } = await import("@/integrations/supabase/client");
  const blob = pdf.output("blob");
  const path = `${Date.now()}-${filename}`;
  const { error } = await supabase.storage.from("outbound-pdfs").upload(path, blob, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("outbound-pdfs").getPublicUrl(path);
  return data.publicUrl;
}
