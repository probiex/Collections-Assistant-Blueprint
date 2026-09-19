import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";
import {
  useGetCollectionTemplates,
  useUpdateCollectionTemplates,
  useGetCollectionMessageHistory,
  useGetCollectionsDashboard,
  getGetCollectionTemplatesQueryKey,
  MessageHistoryEntryTone,
  Invoice,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Input } from "@workspace/ref-design/components/ui/input";
import { Textarea } from "@workspace/ref-design/components/ui/textarea";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ref-design/components/ui/tabs";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import {
  Save,
  MessageSquare,
  Clock,
  ArrowRight,
  RotateCcw,
  Zap,
  CheckCircle2,
  Send,
  FileText,
  Mail,
  Smartphone,
  Sparkles,
  ShieldAlert,
  Search,
  CheckCheck,
  Eye,
} from "lucide-react";
import { toast } from "@workspace/ref-design/hooks/use-toast";
import { cn } from "@workspace/ref-design/lib/utils";
import { formatCurrency } from "@/lib/utils";

type ToneKey = "gentle" | "firm" | "serious" | "final";
type PreviewChannel = "email" | "whatsapp" | "sms";

const TONE_META: Record<
  ToneKey,
  { label: string; desc: string; color: string; days: string; firmnessScore: number; politenessScore: number }
> = {
  gentle: {
    label: "Gentle",
    desc: "Polite cordial reminder for first-stage overdue invoices",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    days: "1–14 days overdue",
    firmnessScore: 25,
    politenessScore: 95,
  },
  firm: {
    label: "Firm",
    desc: "Direct and assertive reminder detailing pending terms and impact",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    days: "15–30 days overdue",
    firmnessScore: 50,
    politenessScore: 75,
  },
  serious: {
    label: "Serious",
    desc: "Urgent escalation warning before finance suspension",
    color: "bg-amber-100 text-amber-800 border-amber-300",
    days: "31–60 days overdue",
    firmnessScore: 75,
    politenessScore: 50,
  },
  final: {
    label: "Final",
    desc: "Pre-legal final demand notice prior to formal collections referral",
    color: "bg-red-100 text-red-800 border-red-300",
    days: "60+ days overdue",
    firmnessScore: 95,
    politenessScore: 25,
  },
};

const DYNAMIC_TOKENS = [
  { token: "{customer_name}", label: "Customer Name", desc: "e.g. Acme Corp" },
  { token: "{invoice_id}", label: "Invoice ID", desc: "e.g. INV-2051" },
  { token: "{amount_due}", label: "Amount Due", desc: "e.g. ₹4,50,000" },
  { token: "{days_overdue}", label: "Days Overdue", desc: "e.g. 24" },
  { token: "{due_date}", label: "Due Date", desc: "e.g. 15 Sep 2026" },
  { token: "{payment_link}", label: "Payment Link", desc: "e.g. pay.link/inv-2051" },
  { token: "{company_name}", label: "Your Company", desc: "e.g. Apex Global" },
];

export default function Messages() {
  const { data: templates, isLoading: isLoadingTemplates } = useGetCollectionTemplates();
  const { data: history, isLoading: isLoadingHistory } = useGetCollectionMessageHistory();
  const { data: dashboard } = useGetCollectionsDashboard();

  const [activeTone, setActiveTone] = useState<ToneKey>("gentle");
  const [selectedSampleInvoice, setSelectedSampleInvoice] = useState<Invoice | null>(null);
  const [previewChannel, setPreviewChannel] = useState<PreviewChannel>("email");
  const [historySearch, setHistorySearch] = useState("");
  const [viewHistoryItem, setViewHistoryItem] = useState<any | null>(null);

  // Set default sample invoice when dashboard loads
  useEffect(() => {
    if (dashboard?.invoices?.length && !selectedSampleInvoice) {
      setSelectedSampleInvoice(dashboard.invoices[0]);
    }
  }, [dashboard, selectedSampleInvoice]);

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    if (!historySearch.trim()) return history;
    const q = historySearch.toLowerCase();
    return history.filter(
      (h) =>
        h.customer_name.toLowerCase().includes(q) ||
        h.invoice_id.toLowerCase().includes(q) ||
        h.subject.toLowerCase().includes(q)
    );
  }, [history, historySearch]);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Omnichannel Outreach Studio
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
            Messages &amp; Escalation Studio
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure relationship-aware notice templates, test live customer simulations, and inspect delivery logs.
          </p>
        </div>

        {/* Live Customer Simulation Dropdown */}
        <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border shadow-xs">
          <span className="text-xs font-medium text-muted-foreground ml-1">Simulate with:</span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-semibold text-foreground"
            value={selectedSampleInvoice?.invoice_id ?? ""}
            onChange={(e) => {
              const found = dashboard?.invoices?.find((i) => i.invoice_id === e.target.value);
              if (found) setSelectedSampleInvoice(found);
            }}
          >
            {dashboard?.invoices?.map((inv) => (
              <option key={inv.invoice_id} value={inv.invoice_id}>
                {inv.customer_name} ({inv.invoice_id} - {formatCurrency(inv.invoice_amount)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Studio Card */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {isLoadingTemplates || !templates ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs value={activeTone} onValueChange={(v) => setActiveTone(v as ToneKey)}>
            {/* Tone Selector Tab Bar */}
            <div className="p-4 border-b border-border bg-secondary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabsList className="bg-background border border-border p-1">
                {(["gentle", "firm", "serious", "final"] as ToneKey[]).map((t) => (
                  <TabsTrigger key={t} value={t} className="text-xs capitalize font-semibold px-4">
                    {t}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Channel Selector */}
              <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border">
                <button
                  onClick={() => setPreviewChannel("email")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                    previewChannel === "email" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button
                  onClick={() => setPreviewChannel("whatsapp")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                    previewChannel === "whatsapp" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                </button>
                <button
                  onClick={() => setPreviewChannel("sms")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                    previewChannel === "sms" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Smartphone className="w-3.5 h-3.5" /> SMS
                </button>
              </div>
            </div>

            {/* Studio Workspace Content */}
            {(["gentle", "firm", "serious", "final"] as ToneKey[]).map((t) => (
              <TabsContent key={t} value={t} className="p-6 m-0">
                <StudioToneEditor
                  tone={t}
                  template={templates[t]}
                  sampleInvoice={selectedSampleInvoice}
                  channel={previewChannel}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* Message Audit Log Section */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-secondary/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Communication Audit Trail
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historical record of all notices drafted, edited, and dispatched across channels.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search history by customer..."
              className="pl-8 h-8 text-xs bg-background"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="text-[11px] text-muted-foreground uppercase bg-background border-b border-border">
              <tr>
                <th className="px-6 py-3 font-semibold">Timestamp</th>
                <th className="px-6 py-3 font-semibold">Recipient Account</th>
                <th className="px-6 py-3 font-semibold">Invoice ID</th>
                <th className="px-6 py-3 font-semibold">Tone / Stage</th>
                <th className="px-6 py-3 font-semibold">Engine Source</th>
                <th className="px-6 py-3 font-semibold">Subject</th>
                <th className="px-6 py-3 font-semibold text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoadingHistory ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="bg-card">
                    <td className="px-6 py-3.5"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-6 py-3.5"><Skeleton className="h-4 w-36" /></td>
                    <td className="px-6 py-3.5"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-3.5"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-3.5"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-3.5"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-6 py-3.5"><Skeleton className="h-6 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No communication history records found.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="bg-card hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-foreground">
                      {item.customer_name}
                    </td>
                    <td className="px-6 py-3.5 font-mono">
                      <Link href={`/invoices/${item.invoice_id}`} className="hover:underline text-primary">
                        {item.invoice_id}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", TONE_META[item.tone as ToneKey]?.color)}>
                        {item.tone}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                        {item.source === "ai" ? (
                          <>
                            <Zap className="w-3 h-3 text-primary" /> AI Copilot
                          </>
                        ) : (
                          "Rule Engine"
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 max-w-xs truncate text-muted-foreground font-mono">
                      {item.subject}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewHistoryItem(item)}
                        className="h-7 text-xs gap-1 text-primary hover:text-primary"
                      >
                        <Eye className="w-3 h-3" /> View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Inspection Modal */}
      {viewHistoryItem && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setViewHistoryItem(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase bg-secondary px-2 py-0.5 rounded font-bold">
                  {viewHistoryItem.tone} Notice &bull; {viewHistoryItem.action}
                </span>
                <h3 className="font-semibold text-lg text-foreground mt-1">
                  {viewHistoryItem.customer_name}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {viewHistoryItem.invoice_id} &bull; {new Date(viewHistoryItem.timestamp).toLocaleString()}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setViewHistoryItem(null)}>
                Close
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-muted-foreground block mb-1">Subject:</span>
                <p className="p-2 bg-secondary/30 rounded border border-border font-medium text-foreground">
                  {viewHistoryItem.subject}
                </p>
              </div>

              <div>
                <span className="font-bold text-muted-foreground block mb-1">Delivered Content:</span>
                <div className="p-3 bg-secondary/40 rounded border border-border font-sans whitespace-pre-wrap leading-relaxed text-foreground max-h-60 overflow-y-auto">
                  {viewHistoryItem.message}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Link href={`/invoices/${viewHistoryItem.invoice_id}`}>
                <Button size="sm" className="gap-1.5">
                  Open Invoice Detail <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudioToneEditor({
  tone,
  template,
  sampleInvoice,
  channel,
}: {
  tone: ToneKey;
  template: { subject: string; body: string };
  sampleInvoice: Invoice | null;
  channel: PreviewChannel;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const updateTemplates = useUpdateCollectionTemplates();
  const queryClient = useQueryClient();

  useEffect(() => {
    setSubject(template.subject);
    setBody(template.body);
  }, [template]);

  const isDirty = subject !== template.subject || body !== template.body;

  const handleSave = () => {
    updateTemplates.mutate(
      { data: { [tone]: { subject, body } } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCollectionTemplatesQueryKey() });
          toast({ title: `${TONE_META[tone].label} template updated successfully` });
        },
        onError: () => toast({ title: "Failed to save template", variant: "destructive" }),
      }
    );
  };

  const handleReset = () => {
    setSubject(template.subject);
    setBody(template.body);
  };

  const insertToken = (token: string) => {
    if (bodyRef.current) {
      const start = bodyRef.current.selectionStart;
      const end = bodyRef.current.selectionEnd;
      const newBody = body.substring(0, start) + token + body.substring(end);
      setBody(newBody);
      setTimeout(() => {
        if (bodyRef.current) {
          bodyRef.current.focus();
          bodyRef.current.setSelectionRange(start + token.length, start + token.length);
        }
      }, 0);
    } else {
      setBody((prev) => prev + " " + token);
    }
  };

  // Interpolate sample invoice data for live preview
  const interpolatedSubject = useMemo(() => {
    if (!sampleInvoice) return subject;
    return subject
      .replace(/\{customer_name\}/g, sampleInvoice.customer_name)
      .replace(/\{invoice_id\}/g, sampleInvoice.invoice_id)
      .replace(/\{amount_due\}/g, formatCurrency(sampleInvoice.invoice_amount))
      .replace(/\{days_overdue\}/g, String(sampleInvoice.days_overdue))
      .replace(/\{due_date\}/g, new Date(sampleInvoice.due_date).toLocaleDateString())
      .replace(/\{payment_link\}/g, `https://pay.copilot.dev/${sampleInvoice.invoice_id.toLowerCase()}`)
      .replace(/\{company_name\}/g, "Accounts Receivables");
  }, [subject, sampleInvoice]);

  const interpolatedBody = useMemo(() => {
    if (!sampleInvoice) return body;
    return body
      .replace(/\{customer_name\}/g, sampleInvoice.customer_name)
      .replace(/\{invoice_id\}/g, sampleInvoice.invoice_id)
      .replace(/\{amount_due\}/g, formatCurrency(sampleInvoice.invoice_amount))
      .replace(/\{days_overdue\}/g, String(sampleInvoice.days_overdue))
      .replace(/\{due_date\}/g, new Date(sampleInvoice.due_date).toLocaleDateString())
      .replace(/\{payment_link\}/g, `https://pay.copilot.dev/${sampleInvoice.invoice_id.toLowerCase()}`)
      .replace(/\{company_name\}/g, "Accounts Receivables");
  }, [body, sampleInvoice]);

  const meta = TONE_META[tone];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Template Editor & Dynamic Tokens */}
      <div className="lg:col-span-7 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full border", meta.color)}>
                {meta.label} Escalation Cadence
              </span>
              <span className="text-xs text-muted-foreground border border-border rounded-full px-2.5 py-0.5 font-mono">
                {meta.days}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{meta.desc}</p>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-xs gap-1 text-muted-foreground">
                <RotateCcw className="w-3.5 h-3.5" /> Revert
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || updateTemplates.isPending}
              className="h-8 text-xs gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {updateTemplates.isPending ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>

        {/* Dynamic Variable Chips */}
        <div>
          <span className="text-xs font-semibold text-foreground block mb-1.5">
            Click variable token to insert into body:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DYNAMIC_TOKENS.map((t) => (
              <button
                key={t.token}
                type="button"
                onClick={() => insertToken(t.token)}
                className="px-2 py-1 rounded bg-secondary hover:bg-primary/15 hover:text-primary transition-colors text-[11px] font-mono border border-border"
                title={t.desc}
              >
                {t.token}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Subject Line</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="text-xs font-mono bg-background"
            placeholder="Subject line with tokens..."
          />
        </div>

        {/* Body Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground">Message Body</label>
            <span className="text-[11px] text-muted-foreground font-mono">{body.length} characters</span>
          </div>
          <Textarea
            ref={bodyRef}
            rows={11}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="text-xs font-mono leading-relaxed bg-background resize-none"
            placeholder="Message template..."
          />
        </div>

        {/* Tone & Firmness Analyzer Gauge */}
        <div className="p-4 bg-secondary/30 rounded-xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" /> AI Tone Assessment
            </span>
            <span className="text-[11px] font-mono font-bold text-primary">
              Firmness: {meta.firmnessScore}% &bull; Empathy: {meta.politenessScore}%
            </span>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                tone === "final" ? "bg-red-500" :
                tone === "serious" ? "bg-amber-500" :
                tone === "firm" ? "bg-blue-500" : "bg-emerald-500"
              }`}
              style={{ width: `${meta.firmnessScore}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {tone === "gentle" && "Designed to preserve positive customer goodwill during initial payment lag."}
            {tone === "firm" && "Emphasizes agreed commercial terms and prompts commitment without burning rapport."}
            {tone === "serious" && "Alerts senior leadership to impending service suspension if unresolved."}
            {tone === "final" && "Formal legal collections warning serving as prerequisite documentation before litigation."}
          </p>
        </div>
      </div>

      {/* Right Column: Live Channel Preview */}
      <div className="lg:col-span-5 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-primary" />
            Live Client Simulation Preview
          </span>
          <span className="text-[11px] text-muted-foreground capitalize font-mono">
            {channel} Channel
          </span>
        </div>

        {/* EMAIL PREVIEW */}
        {channel === "email" && (
          <div className="flex-1 rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 bg-secondary/40 border-b border-border text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-semibold w-12">From:</span>
                <span className="text-foreground font-mono">billing@apexglobal.in</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-semibold w-12">To:</span>
                <span className="text-foreground font-mono">
                  {sampleInvoice ? `${sampleInvoice.contact_person.toLowerCase().replace(/\s+/g, ".")}@${sampleInvoice.customer_name.toLowerCase().replace(/[^a-z]/g, "")}.com` : "customer@domain.com"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-semibold w-12">Subject:</span>
                <span className="text-foreground font-semibold truncate">{interpolatedSubject}</span>
              </div>
            </div>

            <div className="p-5 flex-1 bg-background text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans overflow-y-auto max-h-[480px]">
              {interpolatedBody}
            </div>

            <div className="p-3 border-t border-border bg-secondary/20 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Apex Receivables Portal</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> DKIM / SPF Verified
              </span>
            </div>
          </div>
        )}

        {/* WHATSAPP BUSINESS PREVIEW */}
        {channel === "whatsapp" && (
          <div className="flex-1 rounded-xl border border-border bg-[#0b141a]/95 text-white shadow-md overflow-hidden flex flex-col">
            <div className="p-3 bg-[#202c33] flex items-center gap-3 border-b border-[#2a3942]">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                AG
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs text-white flex items-center gap-1">
                  Apex Global Accounts <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">Verified Business Account</div>
              </div>
            </div>

            <div className="p-4 flex-1 bg-[#0b141a] overflow-y-auto max-h-[480px] space-y-3">
              <div className="max-w-[88%] bg-[#005c4b] text-white p-3.5 rounded-2xl rounded-tl-xs shadow-xs text-xs space-y-2">
                <div className="font-bold text-emerald-200 border-b border-white/20 pb-1.5">
                  {interpolatedSubject}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {interpolatedBody}
                </div>
                <div className="text-[10px] text-white/70 text-right flex items-center justify-end gap-1 pt-1 font-mono">
                  <span>14:32</span>
                  <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#202c33] text-[11px] text-white/60 text-center border-t border-[#2a3942]">
              WhatsApp Cloud Business API &bull; 99.4% Delivery SLA
            </div>
          </div>
        )}

        {/* SMS PREVIEW */}
        {channel === "sms" && (
          <div className="flex-1 rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 bg-secondary/40 border-b border-border text-xs text-center font-semibold text-foreground">
              SMS Sender: APEXBL &bull; Delivered via Telecom Route
            </div>

            <div className="p-4 flex-1 bg-background overflow-y-auto max-h-[480px] flex items-center justify-center">
              <div className="max-w-xs w-full bg-primary/10 border border-primary/20 p-3.5 rounded-2xl rounded-tl-xs text-xs leading-relaxed text-foreground space-y-2">
                <p className="whitespace-pre-wrap">{interpolatedBody.slice(0, 320)}</p>
                <div className="text-[10px] text-muted-foreground text-right font-mono">
                  {Math.min(320, interpolatedBody.length)}/320 chars (2 SMS parts)
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-border bg-secondary/20 text-[11px] text-muted-foreground text-center">
              DLT-Registered Header: APEXBL
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
