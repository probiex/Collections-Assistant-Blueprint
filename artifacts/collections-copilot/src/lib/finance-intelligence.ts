/**
 * Finance Intelligence Helper
 * Deterministic, frontend-side calculations for DSO, aging, payment prediction,
 * and customer history. All values derived from live dashboard invoice data.
 * No random numbers. Prior-period DSO is a stable deterministic benchmark.
 */

import { Invoice } from "@workspace/api-client-react";

// ---------------------------------------------------------------------------
// Payment terms parsing
// ---------------------------------------------------------------------------

/**
 * Parse the numeric days from a payment_terms string.
 * Handles "Net 30", "30 days", "NET-60", etc.
 * Falls back to 30 if unparseable.
 */
export function parsePaymentTermsDays(terms: string): number {
  if (!terms) return 30;
  const match = terms.match(/\d+/);
  return match ? parseInt(match[0], 10) : 30;
}

// ---------------------------------------------------------------------------
// DSO (Days Sales Outstanding)
// ---------------------------------------------------------------------------

/**
 * Invoice-amount-weighted average DSO.
 * DSO per invoice = days_overdue + payment_terms_days.
 * This represents the total days from invoice date to (expected) collection.
 */
export function calculateDSO(invoices: Invoice[]): number {
  if (!invoices || invoices.length === 0) return 0;

  let weightedSum = 0;
  let totalAmount = 0;

  for (const inv of invoices) {
    const termsDays = parsePaymentTermsDays(inv.payment_terms);
    const dso = inv.days_overdue + termsDays;
    weightedSum += dso * inv.invoice_amount;
    totalAmount += inv.invoice_amount;
  }

  if (totalAmount === 0) return 0;
  return Math.round(weightedSum / totalAmount);
}

/**
 * Deterministic prior-period DSO benchmark.
 * Derived by applying a stable heuristic: average the payment terms across all
 * invoices and add a "standard" overdue buffer proportional to the portfolio.
 * This represents what DSO would look like if every invoice paid at 1.5x terms.
 * Stable across renders; does not use random numbers.
 */
export function calculatePriorPeriodDSO(invoices: Invoice[]): number {
  if (!invoices || invoices.length === 0) return 0;

  let totalTermsDays = 0;
  for (const inv of invoices) {
    totalTermsDays += parsePaymentTermsDays(inv.payment_terms);
  }
  const avgTerms = totalTermsDays / invoices.length;

  // Prior period benchmark: average terms × 1.5 (industry standard for
  // a portfolio at this overdue stage in the prior period)
  return Math.round(avgTerms * 1.5);
}

// ---------------------------------------------------------------------------
// AR Aging Buckets
// ---------------------------------------------------------------------------

export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null; // null = unbounded
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
  const buckets: AgingBucket[] = AGING_BUCKET_DEFS.map((def) => ({
    ...def,
    amount: 0,
    count: 0,
  }));

  for (const inv of invoices) {
    for (const bucket of buckets) {
      const inBucket =
        inv.days_overdue >= bucket.minDays &&
        (bucket.maxDays === null || inv.days_overdue <= bucket.maxDays);
      if (inBucket) {
        bucket.amount += inv.invoice_amount;
        bucket.count += 1;
        break;
      }
    }
  }

  return buckets;
}

// ---------------------------------------------------------------------------
// Payment Prediction
// ---------------------------------------------------------------------------

export type PredictionConfidence = "High" | "Medium" | "Low";

export interface PaymentPrediction {
  predictedDate: Date;
  confidence: PredictionConfidence;
  explanation: string;
  daysFromNow: number;
}

/**
 * Derive a predicted payment date deterministically from invoice signals.
 *
 * Logic:
 * 1. Start with the due date as baseline.
 * 2. Apply a penalty for each reminder sent (signals delay behaviour).
 * 3. Apply a penalty based on payment_history classification.
 * 4. Apply a penalty for risk score.
 * 5. Subtract a bonus for long relationship_years.
 * 6. Confidence = High when risk_score < 30, Medium when < 60, Low otherwise.
 */
export function predictPayment(
  invoice: Invoice,
  referenceDate?: string
): PaymentPrediction {
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const due = new Date(invoice.due_date);

  // Already-overdue baseline: start from reference date
  let baseDaysFromRef = Math.max(0, invoice.days_overdue);

  // Reminder penalty: each reminder adds ~7 days delay (signals avoidance)
  const reminderPenalty = Math.min(invoice.reminders_sent * 7, 42);

  // Payment history penalty
  const historyPenalty = getHistoryPenalty(invoice.payment_history);

  // Risk score penalty: higher risk = longer delay
  // risk_score 0-100 → 0-30 days additional delay
  const riskPenalty = Math.round((invoice.risk.risk_score / 100) * 30);

  // Relationship bonus: long relationship = faster resolution
  const relationshipBonus = invoice.relationship_years >= 3 ? 5 : 0;

  // Total additional days from today
  const totalAdditionalDays =
    baseDaysFromRef +
    reminderPenalty +
    historyPenalty +
    riskPenalty -
    relationshipBonus;

  const predictedDate = new Date(ref);
  predictedDate.setDate(ref.getDate() + Math.max(1, totalAdditionalDays));

  const daysFromNow = Math.round(
    (predictedDate.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Confidence determination
  let confidence: PredictionConfidence;
  let explanation: string;

  if (invoice.risk.risk_score < 30 && invoice.relationship_years >= 2) {
    confidence = "High";
    explanation =
      "Low risk score and established relationship support a reliable payment estimate.";
  } else if (invoice.risk.risk_score < 60) {
    confidence = "Medium";
    explanation =
      "Moderate risk signals with some uncertainty in timing based on payment history.";
  } else {
    confidence = "Low";
    explanation =
      "Elevated risk score and payment history reduce prediction reliability. Proactive escalation recommended.";
  }

  return { predictedDate, confidence, explanation, daysFromNow };
}

function getHistoryPenalty(history: string): number {
  const h = history.toLowerCase();
  if (h.includes("chronic") || h.includes("chronic late")) return 21;
  if (h.includes("occasionally") || h.includes("late")) return 10;
  if (h.includes("first")) return 5;
  return 0; // "always on time" or similar
}

// ---------------------------------------------------------------------------
// Customer relationship context
// ---------------------------------------------------------------------------

export interface CustomerContext {
  relationshipDurationLabel: string;
  currentExposure: number;
  annualVolume: number;
  lifetimeEstimate: number;
}

export function buildCustomerContext(invoice: Invoice): CustomerContext {
  const years = invoice.relationship_years;
  const relationshipDurationLabel =
    years < 1
      ? "Less than a year"
      : years === 1
      ? "1 year"
      : `${years} years`;

  return {
    relationshipDurationLabel,
    currentExposure: invoice.invoice_amount,
    annualVolume: invoice.annual_volume,
    lifetimeEstimate: Math.round(invoice.annual_volume * years),
  };
}

// ---------------------------------------------------------------------------
// Deterministic historical demo events
// ---------------------------------------------------------------------------

export interface TimelineEvent {
  id: string;
  date: Date;
  type: "invoice_issued" | "reminder" | "escalation" | "payment" | "draft";
  title: string;
  description: string;
  isDemo: boolean; // true = clearly labeled historical demo event
}

/**
 * Build a reverse-chronological timeline for a customer.
 * Live events come from the actual invoice + message history.
 * Historical demo events are deterministic (derived from invoice data, not random).
 */
export function buildCustomerTimeline(
  invoice: Invoice,
  messageHistory: Array<{
    id: string;
    timestamp: string;
    tone: string;
    action: string;
    subject: string;
    message: string;
  }>,
  referenceDate?: string
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const ref = referenceDate ? new Date(referenceDate) : new Date();

  // Live: message history events for this invoice
  for (const entry of messageHistory) {
    events.push({
      id: `msg-${entry.id}`,
      date: new Date(entry.timestamp),
      type: entry.action === "sent" ? "reminder" : "draft",
      title:
        entry.action === "sent"
          ? `Reminder sent (${entry.tone} tone)`
          : `Draft generated (${entry.tone} tone)`,
      description: entry.subject,
      isDemo: false,
    });
  }

  // Live: invoice issued event
  const invoiceDate = new Date(invoice.invoice_date);
  events.push({
    id: "invoice-issued",
    date: invoiceDate,
    type: "invoice_issued",
    title: `Invoice ${invoice.invoice_id} issued`,
    description: `Amount: ${invoice.invoice_amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })} — Terms: ${invoice.payment_terms}`,
    isDemo: false,
  });

  // Deterministic historical demo events based on invoice data
  // These simulate the prior relationship history
  const yearsAgo = invoice.relationship_years;

  if (yearsAgo >= 1) {
    // First contact / relationship start
    const startDate = new Date(invoiceDate);
    startDate.setFullYear(startDate.getFullYear() - yearsAgo);
    events.push({
      id: "demo-relationship-start",
      date: startDate,
      type: "invoice_issued",
      title: "Customer relationship established",
      description: `Account opened — ${invoice.customer_segment} segment`,
      isDemo: true,
    });
  }

  if (yearsAgo >= 2) {
    // Prior year payment — deterministic date derived from invoice_id hash
    const priorPaymentDate = new Date(invoiceDate);
    priorPaymentDate.setFullYear(priorPaymentDate.getFullYear() - 1);
    priorPaymentDate.setDate(priorPaymentDate.getDate() + (invoice.reminders_sent * 3));
    events.push({
      id: "demo-prior-payment",
      date: priorPaymentDate,
      type: "payment",
      title: "Prior-year invoice settled",
      description:
        invoice.payment_history.toLowerCase().includes("chronic")
          ? "Payment received after extended follow-up"
          : "Payment received on schedule",
      isDemo: true,
    });
  }

  if (invoice.payment_history.toLowerCase().includes("late") && yearsAgo >= 1) {
    // Historical late payment event
    const lateDate = new Date(invoiceDate);
    lateDate.setMonth(lateDate.getMonth() - 8);
    events.push({
      id: "demo-late-payment",
      date: lateDate,
      type: "escalation",
      title: "Late payment recorded",
      description: "Previous invoice required escalation before payment",
      isDemo: true,
    });
  }

  // Sort reverse-chronological
  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return events;
}
