import { seedInvoices, type SeedInvoice } from "./collections-data";
import { defaultTemplates, defaultThresholds, type EscalationThresholds, type MessageResult, type MessageTemplates, type Source, type Tone } from "./collections-engine";

export type CollectionSettings = {
  company_name: string;
  company_logo: string | null;
  currency: string;
  locale: string;
  thresholds: EscalationThresholds;
};
export type CollectionSettingsInput = Partial<Omit<CollectionSettings, "thresholds">> & { thresholds?: Partial<EscalationThresholds> };

export type MessageHistoryEntry = {
  id: string;
  timestamp: string;
  invoice_id: string;
  customer_name: string;
  tone: Tone;
  source: Source;
  action: "generated" | "sent";
  subject: string;
  message: string;
};

type Mutation = {
  status?: SeedInvoice["status"];
  reminders_sent?: number;
  last_reminder_date?: string | null;
  sent_at?: string | null;
  draft?: MessageResult;
};

const mutations = new Map<string, Mutation>();
let forceOffline = true;
let settings: CollectionSettings = {
  company_name: "Accounts Team",
  company_logo: null,
  currency: "INR",
  locale: "en-IN",
  thresholds: { ...defaultThresholds },
};
let templates: MessageTemplates = structuredClone(defaultTemplates);
let history: MessageHistoryEntry[] = [];
let historySequence = 0;

export const collectionsStore = {
  list(): Array<SeedInvoice & Mutation> {
    return seedInvoices.map((item) => ({ ...item, ...mutations.get(item.invoice_id) }));
  },
  get(id: string): (SeedInvoice & Mutation) | undefined {
    const item = seedInvoices.find((candidate) => candidate.invoice_id === id);
    return item ? { ...item, ...mutations.get(id) } : undefined;
  },
  saveDraft(id: string, draft: MessageResult) {
    mutations.set(id, { ...mutations.get(id), draft });
  },
  markSent(id: string, subject: string, message: string, tone_used: Tone, source: MessageResult["source"]) {
    const current = this.get(id);
    if (!current) return undefined;
    const sent_at = new Date().toISOString();
    mutations.set(id, {
      ...mutations.get(id),
      status: "Reminder Sent",
      reminders_sent: current.reminders_sent + 1,
      last_reminder_date: sent_at.slice(0, 10),
      sent_at,
      draft: { subject, message, tone_used, source },
    });
    return this.get(id);
  },
  getForceOffline: () => forceOffline,
  setForceOffline(value: boolean) { forceOffline = value; },
  getSettings(): CollectionSettings { return { ...settings, thresholds: { ...settings.thresholds } }; },
  updateSettings(input: CollectionSettingsInput) {
    const next = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<Omit<CollectionSettings, "thresholds">>;
    settings = {
      ...settings,
      ...next,
      thresholds: { ...settings.thresholds, ...(input.thresholds ?? {}) },
    };
    return this.getSettings();
  },
  getTemplates(): MessageTemplates {
    return structuredClone(templates);
  },
  updateTemplates(input: Partial<MessageTemplates>) {
    templates = {
      ...templates,
      ...input,
    };
    return this.getTemplates();
  },
  addHistory(invoice: SeedInvoice, draft: MessageResult, action: MessageHistoryEntry["action"]) {
    const entry: MessageHistoryEntry = {
      id: `message-${++historySequence}`,
      timestamp: new Date().toISOString(),
      invoice_id: invoice.invoice_id,
      customer_name: invoice.customer_name,
      tone: draft.tone_used,
      source: draft.source,
      action,
      subject: draft.subject,
      message: draft.message,
    };
    history = [entry, ...history];
    return entry;
  },
  getHistory(): MessageHistoryEntry[] { return history.map((entry) => ({ ...entry })); },
  reset() {
    mutations.clear();
    forceOffline = true;
    settings = { company_name: "Accounts Team", company_logo: null, currency: "INR", locale: "en-IN", thresholds: { ...defaultThresholds } };
    templates = structuredClone(defaultTemplates);
    history = [];
    historySequence = 0;
  },
};