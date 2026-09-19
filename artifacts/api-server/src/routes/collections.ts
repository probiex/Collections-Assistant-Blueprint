import { Router, type IRouter } from "express";
import {
  GetCollectionsDashboardResponse,
  GetCollectionInvoiceParams,
  GetCollectionInvoiceResponse,
  RegenerateCollectionDraftParams,
  RegenerateCollectionDraftBody,
  RegenerateCollectionDraftResponse,
  MarkCollectionMessageSentParams,
  MarkCollectionMessageSentBody,
  MarkCollectionMessageSentResponse,
  GetCollectionSettingsResponse,
  UpdateCollectionSettingsBody,
  UpdateCollectionSettingsResponse,
  GetCollectionInsightsResponse,
  ResetCollectionsDemoResponse,
} from "@workspace/api-zod";
import { REFERENCE_DATE } from "../lib/collections-data";
import { collectionsStore } from "../lib/collections-store";
import { daysOverdue, fallbackMessage, fallbackRisk, getMessage, getRisk, type MessageResult } from "../lib/collections-engine";

const router: IRouter = Router();
const severity = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const fallbackLog = (req: Parameters<Parameters<IRouter["get"]>[1]>[0]) => (category: string) =>
  req.log.warn({ category }, "AI engine fallback activated");

async function enrichInvoice(invoice: NonNullable<ReturnType<typeof collectionsStore.get>>, forceOffline = collectionsStore.getForceOffline()) {
  const risk = await getRisk(invoice, forceOffline);
  const draft = invoice.draft ?? await getMessage(invoice, "recommended", forceOffline);
  return {
    ...invoice,
    days_overdue: daysOverdue(invoice.due_date),
    amount_ratio: invoice.invoice_amount / invoice.annual_volume,
    risk,
    draft,
    sent_at: invoice.sent_at ?? null,
  };
}

router.get("/collections/dashboard", async (req, res): Promise<void> => {
  const forceOffline = collectionsStore.getForceOffline();
  const invoices = await Promise.all(collectionsStore.list().map(async (item) => {
    const risk = await getRisk(item, forceOffline, fallbackLog(req));
    const draft = item.draft ?? await getMessage(item, "recommended", forceOffline, fallbackLog(req));
    return { ...item, days_overdue: daysOverdue(item.due_date), amount_ratio: item.invoice_amount / item.annual_volume, risk, draft, sent_at: item.sent_at ?? null };
  }));
  invoices.sort((a, b) => severity[b.risk.risk_level] - severity[a.risk.risk_level] || b.risk.risk_score - a.risk.risk_score || b.days_overdue - a.days_overdue || b.invoice_amount - a.invoice_amount);
  const count = (level: keyof typeof severity) => invoices.filter((item) => item.risk.risk_level === level).length;
  const response = {
    metrics: {
      total_overdue_amount: invoices.reduce((sum, item) => sum + item.invoice_amount, 0),
      overdue_count: invoices.length,
      critical_count: count("Critical"),
      high_count: count("High"),
      medium_count: count("Medium"),
      low_count: count("Low"),
      amount_requiring_action: invoices.filter((item) => item.risk.risk_level === "Critical" || item.risk.risk_level === "High").reduce((sum, item) => sum + item.invoice_amount, 0),
    },
    invoices,
    reference_date: REFERENCE_DATE,
    engine_source: invoices.some((item) => item.risk.source === "ai") ? "ai" as const : "fallback" as const,
  };
  res.json(GetCollectionsDashboardResponse.parse(response));
});

router.get("/collections/invoices/:invoiceId", async (req, res): Promise<void> => {
  const params = GetCollectionInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const invoice = collectionsStore.get(params.data.invoiceId);
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(GetCollectionInvoiceResponse.parse(await enrichInvoice(invoice)));
});

router.post("/collections/invoices/:invoiceId/draft", async (req, res): Promise<void> => {
  const params = RegenerateCollectionDraftParams.safeParse(req.params);
  const body = RegenerateCollectionDraftBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid draft request" }); return; }
  const invoice = collectionsStore.get(params.data.invoiceId);
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  const draft = await getMessage(invoice, body.data.direction, collectionsStore.getForceOffline(), fallbackLog(req));
  collectionsStore.saveDraft(invoice.invoice_id, draft);
  res.json(RegenerateCollectionDraftResponse.parse(draft));
});

router.post("/collections/invoices/:invoiceId/send", async (req, res): Promise<void> => {
  const params = MarkCollectionMessageSentParams.safeParse(req.params);
  const body = MarkCollectionMessageSentBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid message" }); return; }
  const current = collectionsStore.get(params.data.invoiceId);
  if (!current) { res.status(404).json({ error: "Invoice not found" }); return; }
  const source: MessageResult["source"] = current.draft?.source ?? (collectionsStore.getForceOffline() ? "fallback" : "ai");
  const updated = collectionsStore.markSent(current.invoice_id, body.data.subject, body.data.message, body.data.tone_used, source);
  res.json(MarkCollectionMessageSentResponse.parse(await enrichInvoice(updated!)));
});

router.get("/collections/settings", (_req, res): void => {
  const force_offline = collectionsStore.getForceOffline();
  res.json(GetCollectionSettingsResponse.parse({ force_offline, active_source: force_offline ? "fallback" : "ai", ai_available: Boolean(process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL && process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY), reference_date: REFERENCE_DATE }));
});

router.patch("/collections/settings", (req, res): void => {
  const body = UpdateCollectionSettingsBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  collectionsStore.setForceOffline(body.data.force_offline);
  const aiAvailable = Boolean(process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL && process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY);
  res.json(UpdateCollectionSettingsResponse.parse({ force_offline: body.data.force_offline, active_source: body.data.force_offline || !aiAvailable ? "fallback" : "ai", ai_available: aiAvailable, reference_date: REFERENCE_DATE }));
});

router.get("/collections/insights", (_req, res): void => {
  const invoices = collectionsStore.list().map((item) => ({ ...item, risk: fallbackRisk(item) }));
  const critical = invoices.filter((item) => item.risk.risk_level === "Critical");
  const total = invoices.reduce((sum, item) => sum + item.invoice_amount, 0);
  const topThree = [...invoices].sort((a, b) => b.invoice_amount - a.invoice_amount).slice(0, 3).reduce((sum, item) => sum + item.invoice_amount, 0);
  res.json(GetCollectionInsightsResponse.parse({
    critical_exposure: critical.reduce((sum, item) => sum + item.invoice_amount, 0),
    action_accounts: invoices.filter((item) => item.risk.risk_level === "Critical" || item.risk.risk_level === "High").length,
    top_customer_concentration: Math.round(topThree / total * 100),
    summary: `${critical.length} critical accounts need immediate action. Start with Ashoka Steel and Kaveri Foods, then use a relationship-preserving approach for Ganges Pharma and Meridian Textiles.`,
    source: "fallback",
  }));
});

router.post("/collections/reset", (_req, res): void => {
  collectionsStore.reset();
  res.json(ResetCollectionsDemoResponse.parse({ reset: true, invoice_count: 18 }));
});

export default router;