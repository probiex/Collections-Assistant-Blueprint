import { Invoice } from "@workspace/api-client-react";

const CSV_COLUMNS: Array<{ key: string; label: string; get: (invoice: Invoice) => string | number | null | undefined }> = [
  { key: "invoice_id", label: "Invoice ID", get: (invoice) => invoice.invoice_id },
  { key: "customer_name", label: "Customer", get: (invoice) => invoice.customer_name },
  { key: "contact_person", label: "Contact", get: (invoice) => invoice.contact_person },
  { key: "segment", label: "Segment", get: (invoice) => invoice.customer_segment },
  { key: "amount", label: "Amount", get: (invoice) => invoice.invoice_amount },
  { key: "invoice_date", label: "Invoice Date", get: (invoice) => invoice.invoice_date },
  { key: "due_date", label: "Due Date", get: (invoice) => invoice.due_date },
  { key: "days_overdue", label: "Days Overdue", get: (invoice) => invoice.days_overdue },
  { key: "status", label: "Status", get: (invoice) => invoice.status },
  { key: "risk_level", label: "Risk Level", get: (invoice) => invoice.risk.risk_level },
  { key: "risk_score", label: "Risk Score", get: (invoice) => invoice.risk.risk_score },
  { key: "payment_history", label: "Payment History", get: (invoice) => invoice.payment_history },
  { key: "reminders_sent", label: "Reminders Sent", get: (invoice) => invoice.reminders_sent },
  { key: "last_reminder_date", label: "Last Reminder", get: (invoice) => invoice.last_reminder_date },
  { key: "notes", label: "Notes", get: (invoice) => invoice.notes },
];

function escapeCsv(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function invoicesToCsv(invoices: Invoice[]): string {
  return [
    CSV_COLUMNS.map((column) => escapeCsv(column.label)).join(","),
    ...invoices.map((invoice) => CSV_COLUMNS.map((column) => escapeCsv(column.get(invoice))).join(",")),
  ].join("\r\n");
}

export function downloadInvoicesCsv(invoices: Invoice[], scope: "all" | "filtered"): void {
  const blob = new Blob([invoicesToCsv(invoices)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `collections-invoices-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}