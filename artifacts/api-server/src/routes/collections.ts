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
  BulkCollectionInvoiceActionBody,
  BulkCollectionInvoiceActionResponse,
  GetCollectionTemplatesResponse,
  UpdateCollectionTemplatesBody,
  UpdateCollectionTemplatesResponse,
  GetCollectionMessageHistoryResponse,
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
  const config = collectionsStore.getSettings();
  const draft = invoice.draft ?? await getMessage(invoice, "recommended", forceOffline, undefined, {
    thresholds: config.thresholds,
    templates: collectionsStore.getTemplates(),
    companyName: config.company_name,
    currency: config.currency,
    locale: config.locale,
  });
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
  const config = collectionsStore.getSettings();
  const invoices = await Promise.all(collectionsStore.list().map(async (item) => {
    const risk = await getRisk(item, forceOffline, fallbackLog(req));
    const draft = item.draft ?? await getMessage(item, "recommended", forceOffline, fallbackLog(req), {
      thresholds: config.thresholds,
      templates: collectionsStore.getTemplates(),
      companyName: config.company_name,
      currency: config.currency,
      locale: config.locale,
    });
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

router.post("/collections/invoices/bulk", async (req, res): Promise<void> => {
  const body = BulkCollectionInvoiceActionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid bulk invoice action" }); return; }
  const config = collectionsStore.getSettings();
  const updated: Awaited<ReturnType<typeof enrichInvoice>>[] = [];
  for (const invoiceId of body.data.invoice_ids) {
    const invoice = collectionsStore.get(invoiceId);
    if (!invoice) continue;
    const options = { thresholds: config.thresholds, templates: collectionsStore.getTemplates(), companyName: config.company_name, currency: config.currency, locale: config.locale };
    if (body.data.action === "regenerate") {
      const draft = await getMessage(invoice, "recommended", collectionsStore.getForceOffline(), fallbackLog(req), options);
      collectionsStore.saveDraft(invoice.invoice_id, draft);
      collectionsStore.addHistory(invoice, draft, "generated");
    } else {
      const draft = invoice.draft ?? await getMessage(invoice, "recommended", collectionsStore.getForceOffline(), fallbackLog(req), options);
      const sent = collectionsStore.markSent(invoice.invoice_id, draft.subject, draft.message, draft.tone_used, draft.source);
      if (sent) collectionsStore.addHistory(sent, draft, "sent");
    }
    const current = collectionsStore.get(invoiceId);
    if (current) updated.push(await enrichInvoice(current));
  }
  res.json(BulkCollectionInvoiceActionResponse.parse({
    action: body.data.action,
    requested_count: body.data.invoice_ids.length,
    updated_count: updated.length,
    skipped_count: body.data.invoice_ids.length - updated.length,
    invoices: updated,
  }));
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
  const config = collectionsStore.getSettings();
  const draft = await getMessage(invoice, body.data.direction, collectionsStore.getForceOffline(), fallbackLog(req), {
    thresholds: config.thresholds,
    templates: collectionsStore.getTemplates(),
    companyName: config.company_name,
    currency: config.currency,
    locale: config.locale,
  });
  collectionsStore.saveDraft(invoice.invoice_id, draft);
  collectionsStore.addHistory(invoice, draft, "generated");
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
  if (updated) collectionsStore.addHistory(updated, { subject: body.data.subject, message: body.data.message, tone_used: body.data.tone_used, source }, "sent");
  res.json(MarkCollectionMessageSentResponse.parse(await enrichInvoice(updated!)));
});

router.get("/collections/settings", (_req, res): void => {
  const force_offline = collectionsStore.getForceOffline();
  res.json(GetCollectionSettingsResponse.parse({ ...collectionsStore.getSettings(), force_offline, active_source: force_offline ? "fallback" : "ai", ai_available: Boolean(process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL && process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY), reference_date: REFERENCE_DATE }));
});

router.patch("/collections/settings", (req, res): void => {
  const body = UpdateCollectionSettingsBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  if (body.data.force_offline !== undefined) collectionsStore.setForceOffline(body.data.force_offline);
  collectionsStore.updateSettings({
    company_name: body.data.company_name,
    company_logo: body.data.company_logo,
    currency: body.data.currency,
    locale: body.data.locale,
    thresholds: body.data.thresholds,
  });
  const aiAvailable = Boolean(process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL && process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY);
  const forceOffline = collectionsStore.getForceOffline();
  res.json(UpdateCollectionSettingsResponse.parse({ ...collectionsStore.getSettings(), force_offline: forceOffline, active_source: forceOffline || !aiAvailable ? "fallback" : "ai", ai_available: aiAvailable, reference_date: REFERENCE_DATE }));
});

router.get("/collections/templates", (_req, res): void => {
  res.json(GetCollectionTemplatesResponse.parse(collectionsStore.getTemplates()));
});

router.patch("/collections/templates", (req, res): void => {
  const body = UpdateCollectionTemplatesBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid collection templates" }); return; }
  res.json(UpdateCollectionTemplatesResponse.parse(collectionsStore.updateTemplates(body.data)));
});

router.get("/collections/history", (_req, res): void => {
  res.json(GetCollectionMessageHistoryResponse.parse(collectionsStore.getHistory()));
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