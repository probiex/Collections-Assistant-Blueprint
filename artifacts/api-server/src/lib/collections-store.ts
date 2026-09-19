import { seedInvoices, type SeedInvoice } from "./collections-data";
import type { MessageResult, Tone } from "./collections-engine";

type Mutation = {
  status?: SeedInvoice["status"];
  reminders_sent?: number;
  last_reminder_date?: string | null;
  sent_at?: string | null;
  draft?: MessageResult;
};

const mutations = new Map<string, Mutation>();
let forceOffline = true;

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
  reset() { mutations.clear(); forceOffline = true; },
};