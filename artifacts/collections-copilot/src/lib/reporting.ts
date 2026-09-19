import { Invoice } from "@workspace/api-client-react";
import { calculateAgingBuckets, type AgingBucket } from "@/lib/finance-intelligence";

export interface FunnelStage {
  label: string;
  description: string;
  count: number;
  amount: number;
}

export interface RiskDistribution {
  label: string;
  count: number;
  amount: number;
}

export interface AtRiskAccount {
  invoice: Invoice;
  exposureShare: number;
}

export function totalAmount(invoices: Invoice[]): number {
  return invoices.reduce((sum, invoice) => sum + invoice.invoice_amount, 0);
}

export function calculateCollectionsFunnel(invoices: Invoice[]): FunnelStage[] {
  const stages = [
    {
      label: "Portfolio",
      description: "All active invoices",
      invoices,
    },
    {
      label: "Needs action",
      description: "Past the due date",
      invoices: invoices.filter((invoice) => invoice.days_overdue > 0),
    },
    {
      label: "Reminder sent",
      description: "At least one notice recorded",
      invoices: invoices.filter((invoice) => invoice.reminders_sent > 0 || Boolean(invoice.sent_at)),
    },
    {
      label: "Escalated",
      description: "Requires senior follow-up",
      invoices: invoices.filter(
        (invoice) => invoice.status === "Escalated" || invoice.risk.risk_level === "Critical"
      ),
    },
  ];
  return stages.map(({ label, description, invoices: stageInvoices }) => ({
    label,
    description,
    count: stageInvoices.length,
    amount: totalAmount(stageInvoices),
  }));
}

export function calculateRiskDistribution(invoices: Invoice[]): RiskDistribution[] {
  return ["Critical", "High", "Medium", "Low"].map((label) => {
    const matches = invoices.filter((invoice) => invoice.risk.risk_level === label);
    return { label, count: matches.length, amount: totalAmount(matches) };
  });
}

export function calculateTopAtRiskAccounts(invoices: Invoice[], limit = 5): AtRiskAccount[] {
  const amount = totalAmount(invoices);
  return invoices
    .slice()
    .sort((a, b) => {
      const aPriority = a.risk.risk_score * a.invoice_amount;
      const bPriority = b.risk.risk_score * b.invoice_amount;
      return bPriority - aPriority;
    })
    .slice(0, limit)
    .map((invoice) => ({
      invoice,
      exposureShare: amount ? (invoice.invoice_amount / amount) * 100 : 0,
    }));
}

export function buildWeeklyNarrative(invoices: Invoice[]): string {
  if (!invoices.length) return "No invoice activity is available for this reporting period.";
  const overdue = invoices.filter((invoice) => invoice.days_overdue > 0);
  const highRisk = invoices.filter(
    (invoice) => invoice.risk.risk_level === "Critical" || invoice.risk.risk_level === "High"
  );
  const escalated = invoices.filter((invoice) => invoice.status === "Escalated");
  const top = calculateTopAtRiskAccounts(invoices, 1)[0]?.invoice;
  const aging = calculateAgingBuckets(invoices).sort((a, b) => b.amount - a.amount)[0];
  const parts = [
    `${overdue.length} of ${invoices.length} invoices are past due, representing ${Math.round(
      overdue.length / invoices.length * 100
    )}% of the portfolio.`,
    `${highRisk.length} accounts are high or critical risk${escalated.length ? `, with ${escalated.length} already escalated` : ""}.`,
    top ? `${top.customer_name} is the highest-priority account at ${top.risk.risk_score}/100 risk and ${top.days_overdue} days overdue.` : "",
    aging && aging.amount > 0 ? `${aging.label} holds the largest aging concentration.` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

export function buildShareSummary(invoices: Invoice[]): string {
  const overdue = invoices.filter((invoice) => invoice.days_overdue > 0);
  const risk = calculateRiskDistribution(invoices);
  const top = calculateTopAtRiskAccounts(invoices, 3);
  return [
    `## Collections summary`,
    ``,
    `- Portfolio: ${invoices.length} invoices · ${totalAmount(invoices).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}`,
    `- Past due: ${overdue.length} invoices · ${totalAmount(overdue).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}`,
    `- High / critical risk: ${risk.filter((item) => item.label === "High" || item.label === "Critical").reduce((sum, item) => sum + item.count, 0)} accounts`,
    ``,
    `### Priority accounts`,
    ...top.map(({ invoice }) => `- ${invoice.customer_name} — ${invoice.risk.risk_level} (${invoice.risk.risk_score}/100), ${invoice.days_overdue} days overdue`),
    ``,
    buildWeeklyNarrative(invoices),
  ].join("\n");
}

export type { AgingBucket };