import { REFERENCE_DATE, type SeedInvoice } from "./collections-data";

export type Source = "ai" | "fallback";
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type Tone = "gentle" | "firm" | "serious" | "final";
export type RiskResult = { risk_level: RiskLevel; risk_score: number; reasoning: string; source: Source };
export type MessageResult = { subject: string; message: string; tone_used: Tone; source: Source };
export type EscalationThresholds = Record<Tone, number>;
export type MessageTemplates = Record<Tone, { subject: string; body: string }>;

export const daysOverdue = (dueDate: string) =>
  Math.max(0, Math.floor((Date.parse(`${REFERENCE_DATE}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`)) / 86400000));

const date = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const riskForScore = (score: number): RiskLevel => score >= 70 ? "Critical" : score >= 50 ? "High" : score >= 25 ? "Medium" : "Low";
export const defaultThresholds: EscalationThresholds = { gentle: 0, firm: 15, serious: 31, final: 61 };
export const defaultTemplates: MessageTemplates = {
  gentle: {
    subject: "Following up — Invoice {{invoice_id}}",
    body: "Hi {{contact_person}},\n\nHope you're doing well. Just a quick note that invoice {{invoice_id}} for {{amount}}, due {{due_date}}, is now {{days_overdue}} days overdue. It may simply have slipped through processing. Could you share an expected payment date when convenient?",
  },
  firm: {
    subject: "Following up — Invoice {{invoice_id}}",
    body: "Hi {{contact_person}},\n\nI'm following up on invoice {{invoice_id}} for {{amount}}, due {{due_date}} and now {{days_overdue}} days overdue. Please confirm the payment date at your earliest convenience, or let us know if anything is blocking settlement.",
  },
  serious: {
    subject: "Following up — Invoice {{invoice_id}}",
    body: "Hi {{contact_person}},\n\nWe have contacted you {{reminders_sent}} time{{reminder_plural}} regarding invoice {{invoice_id}} for {{amount}}, now {{days_overdue}} days past due. Please give this immediate attention and provide a firm payment date within the next few days.",
  },
  final: {
    subject: "Final notice — Invoice {{invoice_id}}",
    body: "Hi {{contact_person}},\n\nInvoice {{invoice_id}} for {{amount}} remains unpaid at {{days_overdue}} days overdue despite {{reminders_sent}} prior reminders. Please treat this as a final notice and arrange payment within 7 days to avoid further escalation, including a possible pause on ongoing services.",
  },
};

export function fallbackRisk(invoice: SeedInvoice): RiskResult {
  const overdue = daysOverdue(invoice.due_date);
  const ratio = invoice.invoice_amount / invoice.annual_volume;
  let score = overdue > 60 ? 40 : overdue > 30 ? 28 : overdue > 14 ? 15 : 5;
  score += ({ "chronic late payer": 30, "occasionally late": 15, "first time late": 8, "always on time": 0 } as Record<string, number>)[invoice.payment_history] ?? 10;
  score += Math.min(invoice.reminders_sent * 8, 24);
  score += ratio > 0.15 ? 15 : ratio > 0.05 ? 8 : 0;
  const relationshipSoftened = invoice.relationship_years >= 2 && invoice.payment_history !== "chronic late payer";
  if (relationshipSoftened) score -= 12;
  score = Math.max(0, Math.min(100, score));
  const level = riskForScore(score);
  const facts = [`${overdue} days overdue`];
  if (invoice.reminders_sent) facts.push(`${invoice.reminders_sent} prior reminder${invoice.reminders_sent === 1 ? "" : "s"} without resolution`);
  if (invoice.payment_history === "chronic late payer") facts.push("a recurring late-payment pattern");
  else if (invoice.payment_history === "always on time") facts.push("an otherwise reliable payment history");
  else if (invoice.payment_history === "first time late") facts.push("a first late payment");
  else facts.push("occasional past delays");
  if (ratio > 0.15) facts.push(`material exposure at ${Math.round(ratio * 100)}% of annual account volume`);
  else facts.push(`exposure equal to ${Math.round(ratio * 100)}% of annual account volume`);
  if (relationshipSoftened) facts.push(`${invoice.relationship_years}-year relationship equity softens the escalation`);
  else if (invoice.relationship_years >= 3) facts.push(`${invoice.relationship_years}-year relationship warrants a direct but measured approach`);
  facts.push(invoice.notes.toLowerCase());
  return { risk_level: level, risk_score: score, reasoning: `${facts.join("; ")}. ${level} priority with an invoice-specific follow-up recommended.`, source: "fallback" };
}

function recommendedTone(invoice: SeedInvoice, thresholds: EscalationThresholds = defaultThresholds): Tone {
  const overdue = daysOverdue(invoice.due_date);
  const toneOrder: Tone[] = ["gentle", "firm", "serious", "final"];
  let tone: Tone = "gentle";
  for (const candidate of toneOrder) {
    if (overdue >= thresholds[candidate]) tone = candidate;
  }
  if (invoice.relationship_years >= 3 && invoice.payment_history !== "chronic late payer" && (tone === "serious" || tone === "final")) {
    tone = toneOrder[Math.max(0, toneOrder.indexOf(tone) - 1)];
  }
  return tone;
}

export type MessageOptions = {
  thresholds?: EscalationThresholds;
  templates?: MessageTemplates;
  companyName?: string;
  currency?: string;
  locale?: string;
};

export function fallbackMessage(invoice: SeedInvoice, direction: "recommended" | "softer" | "firmer" = "recommended", options: MessageOptions = {}): MessageResult {
  const toneOrder: Tone[] = ["gentle", "firm", "serious", "final"];
  let index = toneOrder.indexOf(recommendedTone(invoice, options.thresholds));
  if (direction === "softer") index = Math.max(0, index - 1);
  if (direction === "firmer") index = Math.min(toneOrder.length - 1, index + 1);
  const tone = toneOrder[index];
  const amount = new Intl.NumberFormat(options.locale ?? "en-IN", { style: "currency", currency: options.currency ?? "INR", maximumFractionDigits: 0 }).format(invoice.invoice_amount);
  const overdue = daysOverdue(invoice.due_date);
  const values: Record<string, string> = {
    contact_person: invoice.contact_person,
    invoice_id: invoice.invoice_id,
    amount,
    due_date: date(invoice.due_date),
    days_overdue: String(overdue),
    reminders_sent: String(invoice.reminders_sent),
    reminder_plural: invoice.reminders_sent === 1 ? "" : "s",
    company_name: options.companyName ?? "Accounts Team",
  };
  const template = (options.templates ?? defaultTemplates)[tone];
  const interpolate = (value: string) => value.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
  const relationship = invoice.relationship_years >= 3 ? ` We value our ${invoice.relationship_years}-year relationship and would prefer to resolve this directly.` : "";
  return {
    subject: interpolate(template.subject),
    message: `${interpolate(template.body)}${relationship}\n\nRegards,\n${options.companyName ?? "Accounts Team"}`,
    tone_used: tone,
    source: "fallback",
  };
}

const riskLevels = new Set(["Low", "Medium", "High", "Critical"]);
const tones = new Set(["gentle", "firm", "serious", "final"]);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function parseRisk(value: unknown): Omit<RiskResult, "source"> | null {
  if (!isRecord(value) || !riskLevels.has(value.risk_level as string) || !Number.isInteger(value.risk_score) || (value.risk_score as number) < 0 || (value.risk_score as number) > 100 || typeof value.reasoning !== "string" || !value.reasoning.trim()) return null;
  return { risk_level: value.risk_level as RiskLevel, risk_score: value.risk_score as number, reasoning: value.reasoning };
}
function parseMessage(value: unknown): Omit<MessageResult, "source"> | null {
  if (!isRecord(value) || typeof value.subject !== "string" || !value.subject.trim() || typeof value.message !== "string" || !value.message.trim() || !tones.has(value.tone_used as string)) return null;
  return { subject: value.subject, message: value.message, tone_used: value.tone_used as Tone };
}

async function callAi(kind: "risk" | "message", invoice: SeedInvoice, direction?: string): Promise<unknown> {
  const baseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("missing_configuration");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const requested = kind === "risk"
      ? "Return ONLY JSON with risk_level (Low|Medium|High|Critical), risk_score integer 0-100, reasoning. Weigh overdue duration, history, reminders, relative exposure, and relationship equity."
      : `Return ONLY JSON with subject, message, tone_used (gentle|firm|serious|final). Requested adjustment: ${direction ?? "recommended"}.`;
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 8192, messages: [{ role: "user", content: `${requested}\nInvoice: ${JSON.stringify({ ...invoice, days_overdue: daysOverdue(invoice.due_date) })}` }] }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`provider_${response.status}`);
    const envelope = await response.json() as { content?: Array<{ type?: string; text?: string }> };
    const text = envelope.content?.find((block) => block.type === "text")?.text;
    if (!text) throw new Error("empty_response");
    return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
  } finally {
    clearTimeout(timeout);
  }
}

export async function getRisk(invoice: SeedInvoice, forceOffline: boolean, onFallback?: (category: string) => void): Promise<RiskResult> {
  if (forceOffline) return fallbackRisk(invoice);
  try {
    const parsed = parseRisk(await callAi("risk", invoice));
    if (!parsed) throw new Error("invalid_output");
    return { ...parsed, source: "ai" };
  } catch (error) {
    onFallback?.(error instanceof Error ? error.message : "unknown_failure");
    return fallbackRisk(invoice);
  }
}

export async function getMessage(invoice: SeedInvoice, direction: "recommended" | "softer" | "firmer", forceOffline: boolean, onFallback?: (category: string) => void, options?: MessageOptions): Promise<MessageResult> {
  if (forceOffline) return fallbackMessage(invoice, direction, options);
  try {
    const parsed = parseMessage(await callAi("message", invoice, direction));
    if (!parsed) throw new Error("invalid_output");
    return { ...parsed, source: "ai" };
  } catch (error) {
    onFallback?.(error instanceof Error ? error.message : "unknown_failure");
    return fallbackMessage(invoice, direction, options);
  }
}