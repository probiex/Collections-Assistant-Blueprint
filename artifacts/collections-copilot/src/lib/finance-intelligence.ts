/**
 * Deterministic frontend finance intelligence derived from live invoice data.
 */
import { Invoice } from "@workspace/api-client-react";

export function parsePaymentTermsDays(terms: string): number {
  const match = terms?.match(/\d+/);
  return match ? Number(match[0]) : 30;
}

export function calculateDSO(invoices: Invoice[]): number {
  const total = invoices.reduce((sum, invoice) => sum + invoice.invoice_amount, 0);
  if (!total) return 0;
  const weighted = invoices.reduce(
    (sum, invoice) =>
      sum + (parsePaymentTermsDays(invoice.payment_terms) + invoice.days_overdue) * invoice.invoice_amount,
    0
  );
  return Math.round(weighted / total);
}

export function calculatePriorPeriodDSO(invoices: Invoice[]): number {
  if (!invoices.length) return 0;
  const averageTerms =
    invoices.reduce((sum, invoice) => sum + parsePaymentTermsDays(invoice.payment_terms), 0) /
    invoices.length;
  return Math.round(averageTerms * 1.5);
}

export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  amount: number;
  count: number;
}

export const AGING_BUCKET_DEFS = [
  { label: "0–30 days", minDays: 0, maxDays: 30 },
  { label: "31–60 days", minDays: 31, maxDays: 60 },
  { label: "61–90 days", minDays: 61, maxDays: 90 },
  { label: "90+ days", minDays: 91, maxDays: null },
] as const;

export function calculateAgingBuckets(invoices: Invoice[]): AgingBucket[] {
  return AGING_BUCKET_DEFS.map((definition) => {
    const matches = invoices.filter(
      (invoice) =>
        invoice.days_overdue >= definition.minDays &&
        (definition.maxDays === null || invoice.days_overdue <= definition.maxDays)
    );
    return {
      ...definition,
      amount: matches.reduce((sum, invoice) => sum + invoice.invoice_amount, 0),
      count: matches.length,
    };
  });
}

export type PredictionConfidence = "High" | "Medium" | "Low";

export interface PaymentPrediction {
  predictedDate: Date;
  confidence: PredictionConfidence;
  explanation: string;
  daysFromNow: number;
}

function historyPenalty(history: string): number {
  const value = history.toLowerCase();
  if (value.includes("chronic")) return 21;
  if (value.includes("late")) return 10;
  if (value.includes("mixed")) return 5;
  return 0;
}

export function predictPayment(invoice: Invoice, referenceDate?: string): PaymentPrediction {
  const reference = referenceDate ? new Date(referenceDate) : new Date();
  const dueDate = new Date(invoice.due_date);
  const history = invoice.payment_history.toLowerCase();
  const alwaysOnTime = history.includes("always") || history.includes("on time");
  const latePayment = history.includes("late") || history.includes("chronic");

  const predictedDate = new Date(alwaysOnTime ? dueDate : reference);
  if (!alwaysOnTime) {
    predictedDate.setDate(
      predictedDate.getDate() +
        Math.max(
          7,
          parsePaymentTermsDays(invoice.payment_terms) / 2 +
            invoice.reminders_sent * 4 +
            historyPenalty(invoice.payment_history) +
            Math.round(invoice.risk.risk_score / 5) -
            Math.min(invoice.relationship_years, 6)
        )
    );
  }

  const daysFromNow = Math.max(
    0,
    Math.ceil((predictedDate.getTime() - reference.getTime()) / 86400000)
  );
  const confidence: PredictionConfidence =
    alwaysOnTime && invoice.risk.risk_score < 40
      ? "High"
      : latePayment || invoice.risk.risk_score >= 70
        ? "Low"
        : "Medium";
  const explanation = alwaysOnTime
    ? "Projected from the due date because this account has a consistent on-time payment history."
    : "Projected from the current collection cycle using reminders, payment history, relationship length, and risk.";

  return { predictedDate, confidence, explanation, daysFromNow };
}

export interface CustomerContext {
  relationshipDurationLabel: string;
  currentExposure: number;
  annualVolume: number;
  lifetimeEstimate: number;
  paymentPattern: string;
  nextBestAction: string;
}

export function buildCustomerContext(invoice: Invoice): CustomerContext {
  const years = invoice.relationship_years;
  const relationshipDurationLabel = years <= 1 ? "New relationship" : `${years} years`;
  const history = invoice.payment_history.toLowerCase();
  const paymentPattern = history.includes("chronic")
    ? "Chronic late payer"
    : history.includes("late")
      ? "Occasionally late"
      : "Consistently on time";
  const nextBestAction =
    invoice.days_overdue > 60
      ? "Escalate with a firm payment plan request"
      : invoice.reminders_sent > 0
        ? "Follow up with a concise payment date request"
        : "Send the first friendly reminder";

  return {
    relationshipDurationLabel,
    currentExposure: invoice.invoice_amount,
    annualVolume: invoice.annual_volume,
    lifetimeEstimate: invoice.annual_volume * Math.max(years, 1),
    paymentPattern,
    nextBestAction,
  };
}

export interface TimelineEvent {
  id: string;
  date: Date;
  type: "invoice_issued" | "reminder" | "escalation" | "payment" | "draft";
  title: string;
  description: string;
  isDemo: boolean;
}

type CustomerMessage = {
  id: string;
  timestamp: string;
  tone: string;
  action: string;
  subject: string;
};

export function buildCustomerTimeline(
  invoice: Invoice,
  messageHistory: CustomerMessage[],
  _referenceDate?: string
): TimelineEvent[] {
  const events: TimelineEvent[] = messageHistory.map((entry) => ({
    id: `msg-${entry.id}`,
    date: new Date(entry.timestamp),
    type: entry.action === "sent" ? "reminder" : "draft",
    title:
      entry.action === "sent"
        ? `Reminder sent (${entry.tone} tone)`
        : `Draft generated (${entry.tone} tone)`,
    description: entry.subject,
    isDemo: false,
  }));

  events.push({
    id: "invoice-issued",
    date: new Date(invoice.invoice_date),
    type: "invoice_issued",
    title: `Invoice ${invoice.invoice_id} issued`,
    description: `${invoice.payment_terms} terms · ${invoice.customer_segment} account`,
    isDemo: false,
  });

  if (invoice.relationship_years >= 1) {
    const startDate = new Date(invoice.invoice_date);
    startDate.setFullYear(startDate.getFullYear() - invoice.relationship_years);
    events.push({
      id: "relationship-start",
      date: startDate,
      type: "invoice_issued",
      title: "Customer relationship established",
      description: `${invoice.relationship_years}-year relationship`,
      isDemo: true,
    });
  }

  if (invoice.payment_history.toLowerCase().includes("late") && invoice.relationship_years >= 1) {
    const lateDate = new Date(invoice.invoice_date);
    lateDate.setMonth(lateDate.getMonth() - 8);
    events.push({
      id: "prior-late-payment",
      date: lateDate,
      type: "escalation",
      title: "Late payment recorded",
      description: "Previous invoice required escalation before payment",
      isDemo: true,
    });
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}