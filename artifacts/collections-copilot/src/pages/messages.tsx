import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  useGetCollectionTemplates,
  useUpdateCollectionTemplates,
  useGetCollectionMessageHistory,
  getGetCollectionTemplatesQueryKey,
  getGetCollectionMessageHistoryQueryKey,
  CollectionTemplates,
  MessageHistoryEntryTone,
  MessageHistoryEntryAction,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Input } from "@workspace/ref-design/components/ui/input";
import { Textarea } from "@workspace/ref-design/components/ui/textarea";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ref-design/components/ui/tabs";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import { Separator } from "@workspace/ref-design/components/ui/separator";
import {
  Save,
  MessageSquare,
  Clock,
  ArrowRight,
  RotateCcw,
  Zap,
  ServerOff,
  CheckCircle2,
  Send,
  FileText,
  Filter,
} from "lucide-react";
import { toast } from "@workspace/ref-design/hooks/use-toast";
import { cn } from "@workspace/ref-design/lib/utils";

type ToneKey = "gentle" | "firm" | "serious" | "final";

const TONE_META: Record<ToneKey, { label: string; desc: string; color: string; days: string }> = {
  gentle: {
    label: "Gentle",
    desc: "Polite reminder, first outreach",
    color: "bg-emerald-100 text-emerald-800",
    days: "1–14 days overdue",
  },
  firm: {
    label: "Firm",
    desc: "Clear follow-up, second contact",
    color: "bg-blue-100 text-blue-800",
    days: "15–30 days overdue",
  },
  serious: {
    label: "Serious",
    desc: "Urgent escalation",
    color: "bg-amber-100 text-amber-800",
    days: "31–60 days overdue",
  },
  final: {
    label: "Final",
    desc: "Pre-legal notice",
    color: "bg-red-100 text-red-800",
    days: "60+ days overdue",
  },
};

const HISTORY_TONE_COLORS: Record<MessageHistoryEntryTone, string> = {
  gentle: "bg-emerald-100 text-emerald-800",
  firm: "bg-blue-100 text-blue-800",
  serious: "bg-amber-100 text-amber-800",
  final: "bg-red-100 text-red-800",
};

function TemplateEditor({
  tone,
  template,
  onSaved,
}: {
  tone: ToneKey;
  template: { subject: string; body: string };
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const updateTemplates = useUpdateCollectionTemplates();
  const queryClient = useQueryClient();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      setSubject(template.subject);
      setBody(template.body);
      initializedRef.current = true;
    }
  }, [template]);

  const isDirty = subject !== template.subject || body !== template.body;

  const handleSave = () => {
    updateTemplates.mutate(
      { data: { [tone]: { subject, body } } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCollectionTemplatesQueryKey() });
          toast({ title: `${TONE_META[tone].label} template saved` });
          onSaved();
        },
        onError: () => toast({ title: "Failed to save template", variant: "destructive" }),
      }
    );
  };

  const handleReset = () => {
    setSubject(template.subject);
    setBody(template.body);
  };

  const meta = TONE_META[tone];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", meta.color)}>
              {meta.label}
            </span>
            <span className="text-xs text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
              {meta.days}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{meta.desc}</p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || updateTemplates.isPending}
            className="gap-1.5"
            data-testid={`btn-save-template-${tone}`}
          >
            <Save className="w-3.5 h-3.5" />
            {updateTemplates.isPending ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Subject Line
          </label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            className="bg-background"
            data-testid={`input-template-subject-${tone}`}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Message Body
            </label>
            <span className="text-xs text-muted-foreground">
              Use {"{customer_name}"}, {"{invoice_amount}"}, {"{days_overdue}"}, {"{company_name}"}
            </span>
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message body..."
            className="min-h-[280px] resize-y bg-background font-mono text-sm leading-relaxed"
            data-testid={`textarea-template-body-${tone}`}
          />
        </div>
      </div>

      {/* Preview box */}
      <div className="bg-secondary/30 border border-border rounded-lg p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Preview
        </div>
        <div className="bg-background border border-border rounded-lg p-4 text-sm space-y-2">
          <div className="font-semibold text-foreground">{subject || "(no subject)"}</div>
          <Separator />
          <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">
            {body || "(no message body)"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Messages() {
  const { data: templates, isLoading: isLoadingTemplates } = useGetCollectionTemplates();
  const { data: history, isLoading: isLoadingHistory } = useGetCollectionMessageHistory();
  const [historyToneFilter, setHistoryToneFilter] = useState<string>("all");
  const [historyActionFilter, setHistoryActionFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredHistory = (history ?? []).filter((entry) => {
    const matchTone = historyToneFilter === "all" || entry.tone === historyToneFilter;
    const matchAction = historyActionFilter === "all" || entry.action === historyActionFilter;
    return matchTone && matchAction;
  });

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">Messages</h1>
        <p className="text-muted-foreground mt-1">
          Manage outreach templates by tone and review the complete message history.
        </p>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2" data-testid="tab-history">
            <Clock className="w-4 h-4" />
            Message History
            {history && history.length > 0 && (
              <span className="ml-1 bg-primary/10 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-0">
          {isLoadingTemplates ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ))}
            </div>
          ) : templates ? (
            <Tabs defaultValue="gentle" orientation="vertical" className="flex flex-col md:flex-row gap-6">
              <TabsList className="flex md:flex-col md:h-auto md:w-48 gap-1 shrink-0 bg-secondary/30 border border-border rounded-xl p-2 h-auto flex-row flex-wrap justify-start">
                {(Object.keys(TONE_META) as ToneKey[]).map((t) => (
                  <TabsTrigger
                    key={t}
                    value={t}
                    className="md:w-full justify-start gap-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    data-testid={`tab-tone-${t}`}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0", {
                      "bg-emerald-500": t === "gentle",
                      "bg-blue-500": t === "firm",
                      "bg-amber-500": t === "serious",
                      "bg-red-500": t === "final",
                    })} />
                    {TONE_META[t].label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex-1 bg-card border border-border rounded-xl p-6">
                {(Object.keys(TONE_META) as ToneKey[]).map((t) => (
                  <TabsContent key={t} value={t} className="m-0">
                    <TemplateEditor
                      tone={t}
                      template={templates[t]}
                      onSaved={() => {}}
                    />
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
              Failed to load templates.
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {/* Filters */}
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={historyToneFilter}
              onChange={(e) => setHistoryToneFilter(e.target.value)}
              className="h-9 rounded-full border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              data-testid="select-history-tone"
              aria-label="Filter by tone"
            >
              <option value="all">All Tones</option>
              {Object.values(MessageHistoryEntryTone).map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={historyActionFilter}
              onChange={(e) => setHistoryActionFilter(e.target.value)}
              className="h-9 rounded-full border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              data-testid="select-history-action"
              aria-label="Filter by action"
            >
              <option value="all">All Actions</option>
              <option value={MessageHistoryEntryAction.generated}>Generated</option>
              <option value={MessageHistoryEntryAction.sent}>Sent</option>
            </select>
            <span className="text-sm text-muted-foreground ml-auto">
              {filteredHistory.length} entries
            </span>
          </div>

          {isLoadingHistory ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4">
                  <Skeleton className="h-5 w-64 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium text-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sent messages and AI-generated drafts will appear here.
              </p>
              <Link href="/invoices" className="inline-flex mt-4">
                <Button variant="outline" size="sm" className="gap-2">
                  Go to Invoices <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="divide-y divide-border">
                {filteredHistory.map((entry) => {
                  const isExpanded = expandedId === entry.id;
                  return (
                    <div
                      key={entry.id}
                      className="transition-colors hover:bg-secondary/30"
                      data-testid={`history-entry-${entry.id}`}
                    >
                      <button
                        className="w-full text-left p-4 flex items-start gap-4"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        aria-expanded={isExpanded}
                      >
                        <div className="mt-0.5">
                          {entry.action === MessageHistoryEntryAction.sent ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                              <Send className="w-4 h-4 text-emerald-700" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                              <Zap className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground truncate">
                              {entry.customer_name}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {entry.invoice_id}
                            </span>
                            <span
                              className={cn(
                                "text-xs font-semibold px-2 py-0.5 rounded-full",
                                HISTORY_TONE_COLORS[entry.tone]
                              )}
                            >
                              {entry.tone}
                            </span>
                            {entry.action === MessageHistoryEntryAction.sent ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                                <CheckCircle2 className="w-3 h-3" /> Sent
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full font-medium">
                                Generated
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {entry.source === "ai" ? (
                                <span className="flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-primary" /> AI
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <ServerOff className="w-3 h-3" /> Fallback
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="text-sm text-foreground mt-1 truncate">{entry.subject}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(entry.timestamp).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 ml-12 animate-in slide-in-from-top-2 duration-200">
                          <div className="bg-secondary/40 border border-border rounded-lg p-4 text-sm space-y-3">
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                Subject
                              </span>
                              <p className="font-medium text-foreground">{entry.subject}</p>
                            </div>
                            <Separator />
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                Message
                              </span>
                              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                                {entry.message}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              <Link href={`/customers/${entry.invoice_id}`}>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                  Customer Profile <ArrowRight className="w-3.5 h-3.5" />
                                </Button>
                              </Link>
                              <Link href={`/invoices/${entry.invoice_id}`}>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                  View Invoice <ArrowRight className="w-3.5 h-3.5" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
