import { useEffect, useState, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { 
  useGetCollectionInvoice, 
  useRegenerateCollectionDraft,
  useMarkCollectionMessageSent,
  getGetCollectionInvoiceQueryKey,
  DraftRegenerationInputDirection,
  SendMessageInputToneUsed
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { RiskBadge, StatusBadge } from "@/components/status-badges";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Textarea } from "@workspace/ref-design/components/ui/textarea";
import { Input } from "@workspace/ref-design/components/ui/input";
import { 
  ArrowLeft, 
  Send, 
  Wand2, 
  AlertTriangle, 
  ShieldAlert,
  Building,
  Calendar,
  CreditCard,
  History,
  CheckCircle2,
  RefreshCw,
  Zap,
  ServerOff
} from "lucide-react";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { toast } from "sonner";

export default function InvoiceDetail() {
  const [, params] = useRoute("/invoices/:id");
  const id = params?.id;
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading, error } = useGetCollectionInvoice(id || "", {
    query: { enabled: !!id, queryKey: getGetCollectionInvoiceQueryKey(id || "") }
  });

  const regenerate = useRegenerateCollectionDraft();
  const markSent = useMarkCollectionMessageSent();

  // Composer State
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const initializedForId = useRef<string | null>(null);

  // Track if user has modified the initial draft
  const hasUnsavedChanges = invoice ? 
    (subject !== invoice.draft.subject || message !== invoice.draft.message) : false;

  useEffect(() => {
    if (invoice && invoice.invoice_id !== initializedForId.current) {
      setSubject(invoice.draft.subject);
      setMessage(invoice.draft.message);
      initializedForId.current = invoice.invoice_id;
    }
  }, [invoice]);

  // Protect against window unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleBackNavigation = (e: React.MouseEvent) => {
    if (hasUnsavedChanges && !window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
      e.preventDefault();
      return;
    }
    setLocation("/");
  };

  const handleRegenerate = (direction: DraftRegenerationInputDirection) => {
    if (!id) return;
    regenerate.mutate({ invoiceId: id, data: { direction } }, {
      onSuccess: (result) => {
        setSubject(result.subject);
        setMessage(result.message);
        toast.success(`Draft regenerated with ${direction} tone`);
        // We patch the local cache so we don't trigger a full refetch that would overwrite the user's focus
        queryClient.setQueryData(getGetCollectionInvoiceQueryKey(id), (old: any) => 
          old ? { ...old, draft: result } : old
        );
      },
      onError: () => {
        toast.error("Failed to regenerate draft");
      }
    });
  };

  const handleSend = () => {
    if (!id || !invoice) return;
    markSent.mutate({ 
      invoiceId: id, 
      data: { 
        subject, 
        message,
        tone_used: invoice.draft.tone_used as SendMessageInputToneUsed // Best effort mapping
      } 
    }, {
      onSuccess: (updatedInvoice) => {
        toast.success("Message sent successfully");
        queryClient.setQueryData(getGetCollectionInvoiceQueryKey(id), updatedInvoice);
        // Navigate back after a short delay
        setTimeout(() => setLocation("/"), 1500);
      },
      onError: () => {
        toast.error("Failed to send message");
      }
    });
  };

  if (!id) return <div>Invalid ID</div>;
  if (error) return <div className="p-8 text-destructive">Failed to load invoice.</div>;

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <header className="h-16 px-6 border-b border-border flex items-center justify-between flex-shrink-0 bg-card z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackNavigation} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-6 w-[1px] bg-border mx-2"></div>
          {isLoading ? (
            <Skeleton className="h-6 w-48" />
          ) : invoice ? (
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold">{invoice.customer_name}</h1>
              <span className="text-muted-foreground text-sm font-mono">{invoice.invoice_id}</span>
              <StatusBadge status={invoice.status} />
            </div>
          ) : null}
        </div>
      </header>

      {/* Main Content Split */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Pane: Facts & Risk (Scrollable) */}
        <div className="w-full lg:w-[450px] xl:w-[500px] border-r border-border bg-secondary/20 flex flex-col overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-6">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : invoice ? (
            <div className="p-6 space-y-6">
              
              {/* Core Financial Facts */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Amount Due</div>
                    <div className="text-3xl font-bold text-foreground" data-testid="detail-amount">
                      {formatCurrency(invoice.invoice_amount)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Days Overdue</div>
                    <div className="text-3xl font-bold text-destructive font-mono" data-testid="detail-overdue">
                      {invoice.days_overdue}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm">
                  <div>
                    <div className="text-muted-foreground flex items-center gap-1.5 mb-1"><Calendar className="w-3.5 h-3.5" /> Due Date</div>
                    <div className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground flex items-center gap-1.5 mb-1"><Building className="w-3.5 h-3.5" /> Segment</div>
                    <div className="font-medium">{invoice.customer_segment}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground flex items-center gap-1.5 mb-1"><CreditCard className="w-3.5 h-3.5" /> Terms</div>
                    <div className="font-medium">{invoice.payment_terms}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground flex items-center gap-1.5 mb-1"><History className="w-3.5 h-3.5" /> History</div>
                    <div className="font-medium capitalize">{invoice.payment_history}</div>
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <ShieldAlert className="w-24 h-24" />
                </div>
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    Risk Assessment
                  </h3>
                  <RiskBadge level={invoice.risk.risk_level} />
                </div>
                
                <div className="space-y-4 relative z-10">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">Risk Score</span>
                      <span className="font-mono">{invoice.risk.risk_score}/100</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          invoice.risk.risk_score > 75 ? 'bg-destructive' : 
                          invoice.risk.risk_score > 50 ? 'bg-amber-500' : 
                          invoice.risk.risk_score > 25 ? 'bg-blue-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${invoice.risk.risk_score}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-secondary/50 rounded-lg p-3 text-sm border border-border/50 text-foreground leading-relaxed" data-testid="detail-reasoning">
                    {invoice.risk.reasoning}
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 justify-end">
                    Powered by {invoice.risk.source === 'ai' ? <span className="font-semibold text-primary flex items-center gap-1"><Zap className="w-3 h-3"/> Copilot Engine</span> : 'Fallback Engine'}
                  </div>
                </div>
              </div>
              
              {/* Additional Context */}
              <div className="text-sm space-y-3">
                <h4 className="font-semibold text-foreground uppercase tracking-wider text-xs">Relationship Context</h4>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Annual Volume</span>
                  <span className="font-medium">{formatCurrency(invoice.annual_volume)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Years Active</span>
                  <span className="font-medium">{invoice.relationship_years} years</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Reminders Sent</span>
                  <span className="font-medium">{invoice.reminders_sent}</span>
                </div>
                {invoice.notes && (
                  <div className="pt-2">
                    <span className="text-muted-foreground block mb-1 text-xs">Internal Notes</span>
                    <p className="text-foreground bg-white/50 dark:bg-black/20 p-2 rounded border border-border/50">{invoice.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Pane: Action/Composer */}
        <div className="flex-1 flex flex-col bg-background relative">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : invoice ? (
            <>
              {invoice.sent_at ? (
                <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                  <div className="bg-card border border-border rounded-xl p-8 shadow-xl text-center max-w-md">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Message Sent</h2>
                    <p className="text-muted-foreground mb-6">
                      The collection notice was successfully sent to {invoice.contact_person}.
                    </p>
                    <Link href="/">
                      <Button className="w-full">Return to Dashboard</Button>
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Draft Message</h2>
                      <p className="text-muted-foreground text-sm mt-1">
                        To: {invoice.contact_person} ({invoice.customer_name})
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-full text-xs font-medium border border-border">
                      <Wand2 className="w-3.5 h-3.5 text-accent" />
                      Tone: <span className="capitalize text-foreground">{invoice.draft.tone_used}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">Subject</label>
                      <Input 
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="font-medium text-base h-12 bg-card"
                        data-testid="input-subject"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="text-sm font-semibold text-foreground">Message</label>
                      <Textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="min-h-[300px] resize-y bg-card text-base leading-relaxed p-4"
                        data-testid="input-message"
                      />
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 flex gap-3 text-amber-800 dark:text-amber-400 text-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>
                      This is a <strong>{invoice.risk.risk_level.toLowerCase()} risk</strong> account. The drafted tone is currently set to <strong>{invoice.draft.tone_used}</strong> based on the relationship history and risk model.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-4 md:p-6 border-t border-border bg-card flex flex-col sm:flex-row gap-4 items-center justify-between sticky bottom-0">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-2 hidden sm:inline-block">Regenerate:</span>
                  <Button 
                    variant="outline" 
                    onClick={() => handleRegenerate("softer")}
                    disabled={regenerate.isPending || !!invoice.sent_at}
                    className="flex-1 sm:flex-none"
                    data-testid="btn-regen-softer"
                  >
                    {regenerate.isPending && regenerate.variables?.data.direction === "softer" ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Make Softer
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleRegenerate("firmer")}
                    disabled={regenerate.isPending || !!invoice.sent_at}
                    className="flex-1 sm:flex-none text-destructive hover:text-destructive hover:bg-destructive/10"
                    data-testid="btn-regen-firmer"
                  >
                    {regenerate.isPending && regenerate.variables?.data.direction === "firmer" ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Make Firmer
                  </Button>
                </div>
                
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto font-semibold gap-2 shadow-sm px-8"
                  onClick={handleSend}
                  disabled={markSent.isPending || !!invoice.sent_at || !subject || !message}
                  data-testid="btn-send"
                >
                  {markSent.isPending ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Send Notice
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
