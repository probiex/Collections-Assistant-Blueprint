import { useMemo } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetCollectionInvoice,
  useGetCollectionMessageHistory,
  useGetCollectionsDashboard,
  getGetCollectionInvoiceQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ref-design/components/ui/tooltip";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  History,
  Info,
  Send,
  ShieldAlert,
  TrendingUp,
  Zap,
} from "lucide-react";
import { RiskBadge } from "@/components/status-badges";
import { formatCurrency } from "@/lib/utils";
import {
  buildCustomerContext,
  buildCustomerTimeline,
  predictPayment,
  type PredictionConfidence,
  type TimelineEvent,
} from "@/lib/finance-intelligence";

const CONFIDENCE_COLORS: Record<PredictionConfidence, string> = {
  High: "bg-primary/10 text-primary border-primary/20",
  Medium: "bg-secondary text-secondary-foreground border-border",
  Low: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function CustomerWorkspace() {
  const [, params] = useRoute("/customers/:invoiceId");
  const invoiceId = params?.invoiceId;

  const { data: invoice, isLoading: isLoadingInvoice } = useGetCollectionInvoice(
    invoiceId || "",
    { query: { enabled: !!invoiceId, queryKey: getGetCollectionInvoiceQueryKey(invoiceId || "") } }
  );
  const { data: allHistory, isLoading: isLoadingHistory } = useGetCollectionMessageHistory();
  const { data: dashboard } = useGetCollectionsDashboard();

  const customerHistory = useMemo(() => {
    if (!allHistory || !invoiceId) return [];
    return allHistory.filter((entry) => entry.invoice_id === invoiceId);
  }, [allHistory, invoiceId]);

  const prediction = useMemo(() => {
    if (!invoice) return null;
    return predictPayment(invoice, dashboard?.reference_date);
  }, [invoice, dashboard?.reference_date]);

  const customerContext = useMemo(() => {
    if (!invoice) return null;
    return buildCustomerContext(invoice);
  }, [invoice]);

  const timeline = useMemo(() => {
    if (!invoice) return [];
    return buildCustomerTimeline(invoice, customerHistory, dashboard?.reference_date);
  }, [invoice, customerHistory, dashboard?.reference_date]);

  if (!invoiceId) {
    return <div className="p-8 text-destructive">Invalid customer ID.</div>;
  }

  if (isLoadingInvoice) {
    return (
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl lg:col-span-1" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Customer not found.</p>
        <Link href="/" className="inline-flex mt-4">
          <Button variant="outline" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-foreground">
              {invoice.customer_name}
            </h1>
            <RiskBadge level={invoice.risk.risk_level} />
            <span className="text-sm text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border font-mono">
              {invoice.customer_segment}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Customer Relationship Workspace &mdash; {invoice.contact_person}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Link href={`/invoices/${invoiceId}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Review Invoice
            </Button>
          </Link>
          <Link href={`/invoices/${invoiceId}`}>
            <Button size="sm" className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Send Notice
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ContextCard
          icon={<Clock className="w-4 h-4" />}
          label="Relationship Duration"
          value={customerContext?.relationshipDurationLabel ?? "—"}
        />
        <ContextCard
          icon={<ShieldAlert className="w-4 h-4" />}
          label="Current Exposure"
          value={formatCurrency(customerContext?.currentExposure ?? 0)}
          accent
        />
        <ContextCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Annual Volume"
          value={formatCurrency(customerContext?.annualVolume ?? 0)}
        />
        <ContextCard
          icon={<CreditCard className="w-4 h-4" />}
          label="Lifetime Value (Est.)"
          value={formatCurrency(customerContext?.lifetimeEstimate ?? 0)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Invoice & Prediction Details */}
        <div className="space-y-5 lg:col-span-1">
          {/* Current Invoice */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Current Invoice
            </h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Invoice ID" value={<span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{invoice.invoice_id}</span>} />
              <DetailRow label="Amount Due" value={<span className="font-bold text-foreground">{formatCurrency(invoice.invoice_amount)}</span>} />
              <DetailRow label="Days Overdue" value={<span className="font-bold text-destructive font-mono">{invoice.days_overdue}d</span>} />
              <DetailRow label="Due Date" value={dateFormatter.format(new Date(invoice.due_date))} />
              <DetailRow label="Payment Terms" value={invoice.payment_terms} />
              <DetailRow label="Reminders Sent" value={String(invoice.reminders_sent)} />
              {invoice.last_reminder_date && (
                <DetailRow label="Last Reminder" value={dateFormatter.format(new Date(invoice.last_reminder_date))} />
              )}
            </dl>
          </div>

          {/* Risk Assessment */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-muted-foreground" />
              Risk Assessment
            </h2>
            <div className="flex items-center justify-between mb-3">
              <RiskBadge level={invoice.risk.risk_level} />
              <span className="font-mono font-bold text-sm">{invoice.risk.risk_score}/100</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${
                  invoice.risk.risk_score > 75
                    ? "bg-destructive"
                    : invoice.risk.risk_score > 50
                    ? "bg-primary"
                    : invoice.risk.risk_score > 25
                    ? "bg-muted-foreground"
                    : "bg-secondary-foreground"
                }`}
                style={{ width: `${invoice.risk.risk_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/50 rounded-lg p-3 border border-border/50">
              {invoice.risk.reasoning}
            </p>
            <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 justify-end">
              Source:{" "}
              {invoice.risk.source === "ai" ? (
                <span className="text-primary font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> AI Engine
                </span>
              ) : (
                "Fallback Engine"
              )}
            </div>
          </div>

          {/* Predicted Payment */}
          {prediction && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Payment Prediction
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button aria-label="How is this calculated?" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-relaxed">
                    Predicted from due date, days overdue, reminders sent, payment history, risk score, and relationship length. Fully deterministic.
                  </TooltipContent>
                </Tooltip>
              </h2>
              <div className="text-2xl font-bold text-foreground mb-1">
                {dateFormatter.format(prediction.predictedDate)}
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                In approximately {prediction.daysFromNow} days
              </div>
              <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${CONFIDENCE_COLORS[prediction.confidence]}`}>
                {prediction.confidence} Confidence
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                {prediction.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Right: Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-secondary/20 flex items-center justify-between">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Communication &amp; Activity Timeline
              </h2>
              {isLoadingHistory && (
                <span className="text-xs text-muted-foreground">Loading history...</span>
              )}
            </div>

            <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto">
              {timeline.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  No timeline events available.
                </div>
              ) : (
                timeline.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))
              )}
            </div>
          </div>

          {/* Additional Context */}
          <div className="mt-5 bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              Account Context
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label="Segment" value={invoice.customer_segment} />
              <DetailRow label="Payment History" value={<span className="capitalize">{invoice.payment_history}</span>} />
              <DetailRow label="Relationship" value={`${invoice.relationship_years} years`} />
              <DetailRow label="Annual Volume" value={formatCurrency(invoice.annual_volume)} />
              {invoice.notes && (
                <div className="col-span-2 pt-2 border-t border-border/50">
                  <dt className="text-muted-foreground text-xs mb-1">Internal Notes</dt>
                  <dd className="text-foreground bg-secondary/30 p-2.5 rounded-lg border border-border/50 text-xs leading-relaxed">
                    {invoice.notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-2 ${
        accent
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border"
      }`}
    >
      <div className={`flex items-center gap-1.5 text-xs font-medium ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
        {icon}
        {label}
      </div>
      <div className={`text-xl font-bold tracking-tight ${accent ? "text-primary-foreground" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium text-foreground text-xs text-right">{value}</dd>
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const iconMap: Record<TimelineEvent["type"], React.ReactNode> = {
    invoice_issued: <FileText className="w-3.5 h-3.5" />,
    reminder: <Send className="w-3.5 h-3.5" />,
    escalation: <ShieldAlert className="w-3.5 h-3.5" />,
    payment: <TrendingUp className="w-3.5 h-3.5" />,
    draft: <Zap className="w-3.5 h-3.5" />,
  };

  const colorMap: Record<TimelineEvent["type"], string> = {
    invoice_issued: "bg-secondary text-foreground",
    reminder: "bg-primary/10 text-primary",
    escalation: "bg-destructive/10 text-destructive",
    payment: "bg-secondary text-secondary-foreground",
    draft: "bg-primary/10 text-primary",
  };

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex gap-4 p-4 hover:bg-secondary/20 transition-colors">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorMap[event.type]}`}>
          {iconMap[event.type]}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="font-medium text-sm text-foreground">{event.title}</span>
          {event.isDemo && (
            <span className="text-xs text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded font-medium">
              Historical Demo
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
        <time className="text-xs text-muted-foreground/60 mt-1 block">
          {dateFormatter.format(event.date)}
        </time>
      </div>
    </div>
  );
}
import { useMemo } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetCollectionInvoice,
  useGetCollectionMessageHistory,
  useGetCollectionsDashboard,
  getGetCollectionInvoiceQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ref-design/components/ui/tooltip";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  History,
  Info,
  Send,
  ShieldAlert,
  TrendingUp,
  Zap,
} from "lucide-react";
import { RiskBadge } from "@/components/status-badges";
import { formatCurrency } from "@/lib/utils";
import {
  buildCustomerContext,
  buildCustomerTimeline,
  predictPayment,
  type PredictionConfidence,
  type TimelineEvent,
} from "@/lib/finance-intelligence";

const CONFIDENCE_COLORS: Record<PredictionConfidence, string> = {
  High: "bg-primary/10 text-primary border-primary/20",
  Medium: "bg-secondary text-secondary-foreground border-border",
  Low: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function CustomerWorkspace() {
  const [, params] = useRoute("/customers/:invoiceId");
  const invoiceId = params?.invoiceId;

  const { data: invoice, isLoading: isLoadingInvoice } = useGetCollectionInvoice(
    invoiceId || "",
    { query: { enabled: !!invoiceId, queryKey: getGetCollectionInvoiceQueryKey(invoiceId || "") } }
  );
  const { data: allHistory, isLoading: isLoadingHistory } = useGetCollectionMessageHistory();
  const { data: dashboard } = useGetCollectionsDashboard();

  const customerHistory = useMemo(() => {
    if (!allHistory || !invoiceId) return [];
    return allHistory.filter((entry) => entry.invoice_id === invoiceId);
  }, [allHistory, invoiceId]);

  const prediction = useMemo(() => {
    if (!invoice) return null;
    return predictPayment(invoice, dashboard?.reference_date);
  }, [invoice, dashboard?.reference_date]);

  const customerContext = useMemo(() => {
    if (!invoice) return null;
    return buildCustomerContext(invoice);
  }, [invoice]);

  const timeline = useMemo(() => {
    if (!invoice) return [];
    return buildCustomerTimeline(invoice, customerHistory, dashboard?.reference_date);
  }, [invoice, customerHistory, dashboard?.reference_date]);

  if (!invoiceId) {
    return <div className="p-8 text-destructive">Invalid customer ID.</div>;
  }

  if (isLoadingInvoice) {
    return (
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl lg:col-span-1" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Customer not found.</p>
        <Link href="/" className="inline-flex mt-4">
          <Button variant="outline" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-foreground">
              {invoice.customer_name}
            </h1>
            <RiskBadge level={invoice.risk.risk_level} />
            <span className="text-sm text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border font-mono">
              {invoice.customer_segment}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Customer Relationship Workspace &mdash; {invoice.contact_person}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Link href={`/invoices/${invoiceId}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Review Invoice
            </Button>
          </Link>
          <Link href={`/invoices/${invoiceId}`}>
            <Button size="sm" className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Send Notice
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ContextCard
          icon={<Clock className="w-4 h-4" />}
          label="Relationship Duration"
          value={customerContext?.relationshipDurationLabel ?? "—"}
        />
        <ContextCard
          icon={<ShieldAlert className="w-4 h-4" />}
          label="Current Exposure"
          value={formatCurrency(customerContext?.currentExposure ?? 0)}
          accent
        />
        <ContextCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Annual Volume"
          value={formatCurrency(customerContext?.annualVolume ?? 0)}
        />
        <ContextCard
          icon={<CreditCard className="w-4 h-4" />}
          label="Lifetime Value (Est.)"
          value={formatCurrency(customerContext?.lifetimeEstimate ?? 0)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Invoice & Prediction Details */}
        <div className="space-y-5 lg:col-span-1">
          {/* Current Invoice */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Current Invoice
            </h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Invoice ID" value={<span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{invoice.invoice_id}</span>} />
              <DetailRow label="Amount Due" value={<span className="font-bold text-foreground">{formatCurrency(invoice.invoice_amount)}</span>} />
              <DetailRow label="Days Overdue" value={<span className="font-bold text-destructive font-mono">{invoice.days_overdue}d</span>} />
              <DetailRow label="Due Date" value={dateFormatter.format(new Date(invoice.due_date))} />
              <DetailRow label="Payment Terms" value={invoice.payment_terms} />
              <DetailRow label="Reminders Sent" value={String(invoice.reminders_sent)} />
              {invoice.last_reminder_date && (
                <DetailRow label="Last Reminder" value={dateFormatter.format(new Date(invoice.last_reminder_date))} />
              )}
            </dl>
          </div>

          {/* Risk Assessment */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-muted-foreground" />
              Risk Assessment
            </h2>
            <div className="flex items-center justify-between mb-3">
              <RiskBadge level={invoice.risk.risk_level} />
              <span className="font-mono font-bold text-sm">{invoice.risk.risk_score}/100</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${
                  invoice.risk.risk_score > 75
                    ? "bg-destructive"
                    : invoice.risk.risk_score > 50
                    ? "bg-primary"
                    : invoice.risk.risk_score > 25
                    ? "bg-muted-foreground"
                    : "bg-secondary-foreground"
                }`}
                style={{ width: `${invoice.risk.risk_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/50 rounded-lg p-3 border border-border/50">
              {invoice.risk.reasoning}
            </p>
            <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 justify-end">
              Source:{" "}
              {invoice.risk.source === "ai" ? (
                <span className="text-primary font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> AI Engine
                </span>
              ) : (
                "Fallback Engine"
              )}
            </div>
          </div>

          {/* Predicted Payment */}
          {prediction && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Payment Prediction
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button aria-label="How is this calculated?" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-relaxed">
                    Predicted from due date, days overdue, reminders sent, payment history, risk score, and relationship length. Fully deterministic.
                  </TooltipContent>
                </Tooltip>
              </h2>
              <div className="text-2xl font-bold text-foreground mb-1">
                {dateFormatter.format(prediction.predictedDate)}
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                In approximately {prediction.daysFromNow} days
              </div>
              <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${CONFIDENCE_COLORS[prediction.confidence]}`}>
                {prediction.confidence} Confidence
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                {prediction.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Right: Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-secondary/20 flex items-center justify-between">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Communication &amp; Activity Timeline
              </h2>
              {isLoadingHistory && (
                <span className="text-xs text-muted-foreground">Loading history...</span>
              )}
            </div>

            <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto">
              {timeline.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  No timeline events available.
                </div>
              ) : (
                timeline.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))
              )}
            </div>
          </div>

          {/* Additional Context */}
          <div className="mt-5 bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              Account Context
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label="Segment" value={invoice.customer_segment} />
              <DetailRow label="Payment History" value={<span className="capitalize">{invoice.payment_history}</span>} />
              <DetailRow label="Relationship" value={`${invoice.relationship_years} years`} />
              <DetailRow label="Annual Volume" value={formatCurrency(invoice.annual_volume)} />
              {invoice.notes && (
                <div className="col-span-2 pt-2 border-t border-border/50">
                  <dt className="text-muted-foreground text-xs mb-1">Internal Notes</dt>
                  <dd className="text-foreground bg-secondary/30 p-2.5 rounded-lg border border-border/50 text-xs leading-relaxed">
                    {invoice.notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-2 ${
        accent
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border"
      }`}
    >
      <div className={`flex items-center gap-1.5 text-xs font-medium ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
        {icon}
        {label}
      </div>
      <div className={`text-xl font-bold tracking-tight ${accent ? "text-primary-foreground" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium text-foreground text-xs text-right">{value}</dd>
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const iconMap: Record<TimelineEvent["type"], React.ReactNode> = {
    invoice_issued: <FileText className="w-3.5 h-3.5" />,
    reminder: <Send className="w-3.5 h-3.5" />,
    escalation: <ShieldAlert className="w-3.5 h-3.5" />,
    payment: <TrendingUp className="w-3.5 h-3.5" />,
    draft: <Zap className="w-3.5 h-3.5" />,
  };

  const colorMap: Record<TimelineEvent["type"], string> = {
    invoice_issued: "bg-secondary text-foreground",
    reminder: "bg-primary/10 text-primary",
    escalation: "bg-destructive/10 text-destructive",
    payment: "bg-secondary text-secondary-foreground",
    draft: "bg-primary/10 text-primary",
  };

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex gap-4 p-4 hover:bg-secondary/20 transition-colors">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorMap[event.type]}`}>
          {iconMap[event.type]}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="font-medium text-sm text-foreground">{event.title}</span>
          {event.isDemo && (
            <span className="text-xs text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded font-medium">
              Historical Demo
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
        <time className="text-xs text-muted-foreground/60 mt-1 block">
          {dateFormatter.format(event.date)}
        </time>
      </div>
    </div>
  );
}
import { useMemo } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetCollectionInvoice,
  useGetCollectionMessageHistory,
  useGetCollectionsDashboard,
  getGetCollectionInvoiceQueryKey,
  MessageHistoryEntryAction,
} from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ref-design/components/ui/tooltip";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  History,
  Info,
  Send,
  ShieldAlert,
  TrendingUp,
  Zap,
} from "lucide-react";
import { RiskBadge } from "@/components/status-badges";
import { formatCurrency } from "@/lib/utils";
import {
  buildCustomerContext,
  buildCustomerTimeline,
  predictPayment,
  type PredictionConfidence,
  type TimelineEvent,
} from "@/lib/finance-intelligence";

const CONFIDENCE_COLORS: Record<PredictionConfidence, string> = {
  High: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Medium: "bg-amber-100 text-amber-800 border-amber-200",
  Low: "bg-red-100 text-red-800 border-red-200",
};

export default function CustomerWorkspace() {
  const [, params] = useRoute("/customers/:invoiceId");
  const invoiceId = params?.invoiceId;

  const { data: invoice, isLoading: isLoadingInvoice } = useGetCollectionInvoice(
    invoiceId || "",
    { query: { enabled: !!invoiceId, queryKey: getGetCollectionInvoiceQueryKey(invoiceId || "") } }
  );
  const { data: allHistory, isLoading: isLoadingHistory } = useGetCollectionMessageHistory();
  const { data: dashboard } = useGetCollectionsDashboard();

  const customerHistory = useMemo(() => {
    if (!allHistory || !invoiceId) return [];
    return allHistory.filter((entry) => entry.invoice_id === invoiceId);
  }, [allHistory, invoiceId]);

  const prediction = useMemo(() => {
    if (!invoice) return null;
    return predictPayment(invoice, dashboard?.reference_date);
  }, [invoice, dashboard?.reference_date]);

  const customerContext = useMemo(() => {
    if (!invoice) return null;
    return buildCustomerContext(invoice);
  }, [invoice]);

  const timeline = useMemo(() => {
    if (!invoice) return [];
    return buildCustomerTimeline(invoice, customerHistory, dashboard?.reference_date);
  }, [invoice, customerHistory, dashboard?.reference_date]);

  if (!invoiceId) {
    return <div className="p-8 text-destructive">Invalid customer ID.</div>;
  }

  if (isLoadingInvoice) {
    return (
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl lg:col-span-1" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Customer not found.</p>
        <Link href="/" className="inline-flex mt-4">
          <Button variant="outline" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-foreground">
              {invoice.customer_name}
            </h1>
            <RiskBadge level={invoice.risk.risk_level} />
            <span className="text-sm text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border font-mono">
              {invoice.customer_segment}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Customer Relationship Workspace &mdash; {invoice.contact_person}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Link href={`/invoices/${invoiceId}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Review Invoice
            </Button>
          </Link>
          <Link href={`/invoices/${invoiceId}`}>
            <Button size="sm" className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Send Notice
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ContextCard
          icon={<Clock className="w-4 h-4" />}
          label="Relationship Duration"
          value={customerContext?.relationshipDurationLabel ?? "—"}
        />
        <ContextCard
          icon={<ShieldAlert className="w-4 h-4" />}
          label="Current Exposure"
          value={formatCurrency(customerContext?.currentExposure ?? 0)}
          accent
        />
        <ContextCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Annual Volume"
          value={formatCurrency(customerContext?.annualVolume ?? 0)}
        />
        <ContextCard
          icon={<CreditCard className="w-4 h-4" />}
          label="Lifetime Value (Est.)"
          value={formatCurrency(customerContext?.lifetimeEstimate ?? 0)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Invoice & Prediction Details */}
        <div className="space-y-5 lg:col-span-1">
          {/* Current Invoice */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Current Invoice
            </h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Invoice ID" value={<span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{invoice.invoice_id}</span>} />
              <DetailRow label="Amount Due" value={<span className="font-bold text-foreground">{formatCurrency(invoice.invoice_amount)}</span>} />
              <DetailRow label="Days Overdue" value={<span className="font-bold text-destructive font-mono">{invoice.days_overdue}d</span>} />
              <DetailRow label="Due Date" value={dateFormatter.format(new Date(invoice.due_date))} />
              <DetailRow label="Payment Terms" value={invoice.payment_terms} />
              <DetailRow label="Reminders Sent" value={String(invoice.reminders_sent)} />
              {invoice.last_reminder_date && (
                <DetailRow label="Last Reminder" value={dateFormatter.format(new Date(invoice.last_reminder_date))} />
              )}
            </dl>
          </div>

          {/* Risk Assessment */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-muted-foreground" />
              Risk Assessment
            </h2>
            <div className="flex items-center justify-between mb-3">
              <RiskBadge level={invoice.risk.risk_level} />
              <span className="font-mono font-bold text-sm">{invoice.risk.risk_score}/100</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${
                  invoice.risk.risk_score > 75
                    ? "bg-destructive"
                    : invoice.risk.risk_score > 50
                    ? "bg-amber-500"
                    : invoice.risk.risk_score > 25
                    ? "bg-blue-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${invoice.risk.risk_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/50 rounded-lg p-3 border border-border/50">
              {invoice.risk.reasoning}
            </p>
            <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 justify-end">
              Source:{" "}
              {invoice.risk.source === "ai" ? (
                <span className="text-primary font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> AI Engine
                </span>
              ) : (
                "Fallback Engine"
              )}
            </div>
          </div>

          {/* Predicted Payment */}
          {prediction && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Payment Prediction
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button aria-label="How is this calculated?" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-relaxed">
                    Predicted from due date, days overdue, reminders sent, payment history, risk score, and relationship length. Fully deterministic.
                  </TooltipContent>
                </Tooltip>
              </h2>
              <div className="text-2xl font-bold text-foreground mb-1">
                {dateFormatter.format(prediction.predictedDate)}
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                In approximately {prediction.daysFromNow} days
              </div>
              <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${CONFIDENCE_COLORS[prediction.confidence]}`}>
                {prediction.confidence} Confidence
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                {prediction.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Right: Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-secondary/20 flex items-center justify-between">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Communication &amp; Activity Timeline
              </h2>
              {isLoadingHistory && (
                <span className="text-xs text-muted-foreground">Loading history...</span>
              )}
            </div>

            <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto">
              {timeline.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  No timeline events available.
                </div>
              ) : (
                timeline.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))
              )}
            </div>
          </div>

          {/* Additional Context */}
          <div className="mt-5 bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              Account Context
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label="Segment" value={invoice.customer_segment} />
              <DetailRow label="Payment History" value={<span className="capitalize">{invoice.payment_history}</span>} />
              <DetailRow label="Relationship" value={`${invoice.relationship_years} years`} />
              <DetailRow label="Annual Volume" value={formatCurrency(invoice.annual_volume)} />
              {invoice.notes && (
                <div className="col-span-2 pt-2 border-t border-border/50">
                  <dt className="text-muted-foreground text-xs mb-1">Internal Notes</dt>
                  <dd className="text-foreground bg-secondary/30 p-2.5 rounded-lg border border-border/50 text-xs leading-relaxed">
                    {invoice.notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-2 ${
        accent
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border"
      }`}
    >
      <div className={`flex items-center gap-1.5 text-xs font-medium ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
        {icon}
        {label}
      </div>
      <div className={`text-xl font-bold tracking-tight ${accent ? "text-primary-foreground" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium text-foreground text-xs text-right">{value}</dd>
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const iconMap: Record<TimelineEvent["type"], React.ReactNode> = {
    invoice_issued: <FileText className="w-3.5 h-3.5" />,
    reminder: <Send className="w-3.5 h-3.5" />,
    escalation: <ShieldAlert className="w-3.5 h-3.5" />,
    payment: <TrendingUp className="w-3.5 h-3.5" />,
    draft: <Zap className="w-3.5 h-3.5" />,
  };

  const colorMap: Record<TimelineEvent["type"], string> = {
    invoice_issued: "bg-secondary text-foreground",
    reminder: "bg-blue-100 text-blue-700",
    escalation: "bg-red-100 text-red-700",
    payment: "bg-emerald-100 text-emerald-700",
    draft: "bg-primary/10 text-primary",
  };

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex gap-4 p-4 hover:bg-secondary/20 transition-colors">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorMap[event.type]}`}>
          {iconMap[event.type]}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="font-medium text-sm text-foreground">{event.title}</span>
          {event.isDemo && (
            <span className="text-xs text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded font-medium">
              Historical Demo
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
        <time className="text-xs text-muted-foreground/60 mt-1 block">
          {dateFormatter.format(event.date)}
        </time>
      </div>
    </div>
  );
}
import { useMemo } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetCollectionInvoice,
  useGetCollectionMessageHistory,
  useGetCollectionsDashboard,
  getGetCollectionInvoiceQueryKey,
  MessageHistoryEntryAction,
} from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ref-design/components/ui/tooltip";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  History,
  Info,
  Send,
  ShieldAlert,
  TrendingUp,
  Zap,
} from "lucide-react";
import { RiskBadge } from "@/components/status-badges";
import { formatCurrency } from "@/lib/utils";
import {
  buildCustomerContext,
  buildCustomerTimeline,
  predictPayment,
  type PredictionConfidence,
  type TimelineEvent,
} from "@/lib/finance-intelligence";

const CONFIDENCE_COLORS: Record<PredictionConfidence, string> = {
  High: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Medium: "bg-amber-100 text-amber-800 border-amber-200",
  Low: "bg-red-100 text-red-800 border-red-200",
};

export default function CustomerWorkspace() {
  const [, params] = useRoute("/customers/:invoiceId");
  const invoiceId = params?.invoiceId;

  const { data: invoice, isLoading: isLoadingInvoice } = useGetCollectionInvoice(
    invoiceId || "",
    { query: { enabled: !!invoiceId, queryKey: getGetCollectionInvoiceQueryKey(invoiceId || "") } }
  );
  const { data: allHistory, isLoading: isLoadingHistory } = useGetCollectionMessageHistory();
  const { data: dashboard } = useGetCollectionsDashboard();

  const customerHistory = useMemo(() => {
    if (!allHistory || !invoiceId) return [];
    return allHistory.filter((entry) => entry.invoice_id === invoiceId);
  }, [allHistory, invoiceId]);

  const prediction = useMemo(() => {
    if (!invoice) return null;
    return predictPayment(invoice, dashboard?.reference_date);
  }, [invoice, dashboard?.reference_date]);

  const customerContext = useMemo(() => {
    if (!invoice) return null;
    return buildCustomerContext(invoice);
  }, [invoice]);

  const timeline = useMemo(() => {
    if (!invoice) return [];
    return buildCustomerTimeline(invoice, customerHistory, dashboard?.reference_date);
  }, [invoice, customerHistory, dashboard?.reference_date]);

  if (!invoiceId) {
    return <div className="p-8 text-destructive">Invalid customer ID.</div>;
  }

  if (isLoadingInvoice) {
    return (
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl lg:col-span-1" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Customer not found.</p>
        <Link href="/" className="inline-flex mt-4">
          <Button variant="outline" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-foreground">
              {invoice.customer_name}
            </h1>
            <RiskBadge level={invoice.risk.risk_level} />
            <span className="text-sm text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border font-mono">
              {invoice.customer_segment}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Customer Relationship Workspace &mdash; {invoice.contact_person}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Link href={`/invoices/${invoiceId}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Review Invoice
            </Button>
          </Link>
          <Link href={`/invoices/${invoiceId}`}>
            <Button size="sm" className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Send Notice
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ContextCard
          icon={<Clock className="w-4 h-4" />}
          label="Relationship Duration"
          value={customerContext?.relationshipDurationLabel ?? "—"}
        />
        <ContextCard
          icon={<ShieldAlert className="w-4 h-4" />}
          label="Current Exposure"
          value={formatCurrency(customerContext?.currentExposure ?? 0)}
          accent
        />
        <ContextCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Annual Volume"
          value={formatCurrency(customerContext?.annualVolume ?? 0)}
        />
        <ContextCard
          icon={<CreditCard className="w-4 h-4" />}
          label="Lifetime Value (Est.)"
          value={formatCurrency(customerContext?.lifetimeEstimate ?? 0)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Invoice & Prediction Details */}
        <div className="space-y-5 lg:col-span-1">
          {/* Current Invoice */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Current Invoice
            </h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Invoice ID" value={<span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{invoice.invoice_id}</span>} />
              <DetailRow label="Amount Due" value={<span className="font-bold text-foreground">{formatCurrency(invoice.invoice_amount)}</span>} />
              <DetailRow label="Days Overdue" value={<span className="font-bold text-destructive font-mono">{invoice.days_overdue}d</span>} />
              <DetailRow label="Due Date" value={dateFormatter.format(new Date(invoice.due_date))} />
              <DetailRow label="Payment Terms" value={invoice.payment_terms} />
              <DetailRow label="Reminders Sent" value={String(invoice.reminders_sent)} />
              {invoice.last_reminder_date && (
                <DetailRow label="Last Reminder" value={dateFormatter.format(new Date(invoice.last_reminder_date))} />
              )}
            </dl>
          </div>

          {/* Risk Assessment */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-muted-foreground" />
              Risk Assessment
            </h2>
            <div className="flex items-center justify-between mb-3">
              <RiskBadge level={invoice.risk.risk_level} />
              <span className="font-mono font-bold text-sm">{invoice.risk.risk_score}/100</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${
                  invoice.risk.risk_score > 75
                    ? "bg-destructive"
                    : invoice.risk.risk_score > 50
                    ? "bg-amber-500"
                    : invoice.risk.risk_score > 25
                    ? "bg-blue-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${invoice.risk.risk_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/50 rounded-lg p-3 border border-border/50">
              {invoice.risk.reasoning}
            </p>
            <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 justify-end">
              Source:{" "}
              {invoice.risk.source === "ai" ? (
                <span className="text-primary font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> AI Engine
                </span>
              ) : (
                "Fallback Engine"
              )}
            </div>
          </div>

          {/* Predicted Payment */}
          {prediction && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Payment Prediction
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button aria-label="How is this calculated?" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-relaxed">
                    Predicted from due date, days overdue, reminders sent, payment history, risk score, and relationship length. Fully deterministic.
                  </TooltipContent>
                </Tooltip>
              </h2>
              <div className="text-2xl font-bold text-foreground mb-1">
                {dateFormatter.format(prediction.predictedDate)}
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                In approximately {prediction.daysFromNow} days
              </div>
              <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${CONFIDENCE_COLORS[prediction.confidence]}`}>
                {prediction.confidence} Confidence
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                {prediction.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Right: Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-secondary/20 flex items-center justify-between">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Communication &amp; Activity Timeline
              </h2>
              {isLoadingHistory && (
                <span className="text-xs text-muted-foreground">Loading history...</span>
              )}
            </div>

            <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto">
              {timeline.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  No timeline events available.
                </div>
              ) : (
                timeline.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))
              )}
            </div>
          </div>

          {/* Additional Context */}
          <div className="mt-5 bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              Account Context
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label="Segment" value={invoice.customer_segment} />
              <DetailRow label="Payment History" value={<span className="capitalize">{invoice.payment_history}</span>} />
              <DetailRow label="Relationship" value={`${invoice.relationship_years} years`} />
              <DetailRow label="Annual Volume" value={formatCurrency(invoice.annual_volume)} />
              {invoice.notes && (
                <div className="col-span-2 pt-2 border-t border-border/50">
                  <dt className="text-muted-foreground text-xs mb-1">Internal Notes</dt>
                  <dd className="text-foreground bg-secondary/30 p-2.5 rounded-lg border border-border/50 text-xs leading-relaxed">
                    {invoice.notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-2 ${
        accent
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border"
      }`}
    >
      <div className={`flex items-center gap-1.5 text-xs font-medium ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
        {icon}
        {label}
      </div>
      <div className={`text-xl font-bold tracking-tight ${accent ? "text-primary-foreground" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium text-foreground text-xs text-right">{value}</dd>
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const iconMap: Record<TimelineEvent["type"], React.ReactNode> = {
    invoice_issued: <FileText className="w-3.5 h-3.5" />,
    reminder: <Send className="w-3.5 h-3.5" />,
    escalation: <ShieldAlert className="w-3.5 h-3.5" />,
    payment: <TrendingUp className="w-3.5 h-3.5" />,
    draft: <Zap className="w-3.5 h-3.5" />,
  };

  const colorMap: Record<TimelineEvent["type"], string> = {
    invoice_issued: "bg-secondary text-foreground",
    reminder: "bg-blue-100 text-blue-700",
    escalation: "bg-red-100 text-red-700",
    payment: "bg-emerald-100 text-emerald-700",
    draft: "bg-primary/10 text-primary",
  };

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex gap-4 p-4 hover:bg-secondary/20 transition-colors">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorMap[event.type]}`}>
          {iconMap[event.type]}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="font-medium text-sm text-foreground">{event.title}</span>
          {event.isDemo && (
            <span className="text-xs text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded font-medium">
              Historical Demo
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
        <time className="text-xs text-muted-foreground/60 mt-1 block">
          {dateFormatter.format(event.date)}
        </time>
      </div>
    </div>
  );
}
import { useMemo } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetCollectionInvoice,
  useGetCollectionMessageHistory,
  useGetCollectionsDashboard,
  getGetCollectionInvoiceQueryKey,
  MessageHistoryEntryAction,
} from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ref-design/components/ui/tooltip";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  History,
  Info,
  Send,
  ShieldAlert,
  TrendingUp,
  Zap,
} from "lucide-react";
import { RiskBadge } from "@/components/status-badges";
import { formatCurrency } from "@/lib/utils";
import {
  buildCustomerContext,
  buildCustomerTimeline,
  predictPayment,
  type PredictionConfidence,
  type TimelineEvent,
} from "@/lib/finance-intelligence";

const CONFIDENCE_COLORS: Record<PredictionConfidence, string> = {
  High: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Medium: "bg-amber-100 text-amber-800 border-amber-200",
  Low: "bg-red-100 text-red-800 border-red-200",
};

export default function CustomerWorkspace() {
  const [, params] = useRoute("/customers/:invoiceId");
  const invoiceId = params?.invoiceId;

  const { data: invoice, isLoading: isLoadingInvoice } = useGetCollectionInvoice(
    invoiceId || "",
    { query: { enabled: !!invoiceId, queryKey: getGetCollectionInvoiceQueryKey(invoiceId || "") } }
  );
  const { data: allHistory, isLoading: isLoadingHistory } = useGetCollectionMessageHistory();
  const { data: dashboard } = useGetCollectionsDashboard();

  const customerHistory = useMemo(() => {
    if (!allHistory || !invoiceId) return [];
    return allHistory.filter((entry) => entry.invoice_id === invoiceId);
  }, [allHistory, invoiceId]);

  const prediction = useMemo(() => {
    if (!invoice) return null;
    return predictPayment(invoice, dashboard?.reference_date);
  }, [invoice, dashboard?.reference_date]);

  const customerContext = useMemo(() => {
    if (!invoice) return null;
    return buildCustomerContext(invoice);
  }, [invoice]);

  const timeline = useMemo(() => {
    if (!invoice) return [];
    return buildCustomerTimeline(invoice, customerHistory, dashboard?.reference_date);
  }, [invoice, customerHistory, dashboard?.reference_date]);

  if (!invoiceId) {
    return <div className="p-8 text-destructive">Invalid customer ID.</div>;
  }

  if (isLoadingInvoice) {
    return (
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl lg:col-span-1" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Customer not found.</p>
        <Link href="/" className="inline-flex mt-4">
          <Button variant="outline" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-foreground">
              {invoice.customer_name}
            </h1>
            <RiskBadge level={invoice.risk.risk_level} />
            <span className="text-sm text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border font-mono">
              {invoice.customer_segment}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Customer Relationship Workspace &mdash; {invoice.contact_person}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Link href={`/invoices/${invoiceId}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Review Invoice
            </Button>
          </Link>
          <Link href={`/invoices/${invoiceId}`}>
            <Button size="sm" className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Send Notice
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ContextCard
          icon={<Clock className="w-4 h-4" />}
          label="Relationship Duration"
          value={customerContext?.relationshipDurationLabel ?? "—"}
        />
        <ContextCard
          icon={<ShieldAlert className="w-4 h-4" />}
          label="Current Exposure"
          value={formatCurrency(customerContext?.currentExposure ?? 0)}
          accent
        />
        <ContextCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Annual Volume"
          value={formatCurrency(customerContext?.annualVolume ?? 0)}
        />
        <ContextCard
          icon={<CreditCard className="w-4 h-4" />}
          label="Lifetime Value (Est.)"
          value={formatCurrency(customerContext?.lifetimeEstimate ?? 0)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Invoice & Prediction Details */}
        <div className="space-y-5 lg:col-span-1">
          {/* Current Invoice */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Current Invoice
            </h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Invoice ID" value={<span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{invoice.invoice_id}</span>} />
              <DetailRow label="Amount Due" value={<span className="font-bold text-foreground">{formatCurrency(invoice.invoice_amount)}</span>} />
              <DetailRow label="Days Overdue" value={<span className="font-bold text-destructive font-mono">{invoice.days_overdue}d</span>} />
              <DetailRow label="Due Date" value={dateFormatter.format(new Date(invoice.due_date))} />
              <DetailRow label="Payment Terms" value={invoice.payment_terms} />
              <DetailRow label="Reminders Sent" value={String(invoice.reminders_sent)} />
              {invoice.last_reminder_date && (
                <DetailRow label="Last Reminder" value={dateFormatter.format(new Date(invoice.last_reminder_date))} />
              )}
            </dl>
          </div>

          {/* Risk Assessment */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-muted-foreground" />
              Risk Assessment
            </h2>
            <div className="flex items-center justify-between mb-3">
              <RiskBadge level={invoice.risk.risk_level} />
              <span className="font-mono font-bold text-sm">{invoice.risk.risk_score}/100</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${
                  invoice.risk.risk_score > 75
                    ? "bg-destructive"
                    : invoice.risk.risk_score > 50
                    ? "bg-amber-500"
                    : invoice.risk.risk_score > 25
                    ? "bg-blue-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${invoice.risk.risk_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/50 rounded-lg p-3 border border-border/50">
              {invoice.risk.reasoning}
            </p>
            <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 justify-end">
              Source:{" "}
              {invoice.risk.source === "ai" ? (
                <span className="text-primary font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> AI Engine
                </span>
              ) : (
                "Fallback Engine"
              )}
            </div>
          </div>

          {/* Predicted Payment */}
          {prediction && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Payment Prediction
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button aria-label="How is this calculated?" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-relaxed">
                    Predicted from due date, days overdue, reminders sent, payment history, risk score, and relationship length. Fully deterministic.
                  </TooltipContent>
                </Tooltip>
              </h2>
              <div className="text-2xl font-bold text-foreground mb-1">
                {dateFormatter.format(prediction.predictedDate)}
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                In approximately {prediction.daysFromNow} days
              </div>
              <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${CONFIDENCE_COLORS[prediction.confidence]}`}>
                {prediction.confidence} Confidence
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                {prediction.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Right: Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-secondary/20 flex items-center justify-between">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Communication &amp; Activity Timeline
              </h2>
              {isLoadingHistory && (
                <span className="text-xs text-muted-foreground">Loading history...</span>
              )}
            </div>

            <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto">
              {timeline.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  No timeline events available.
                </div>
              ) : (
                timeline.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))
              )}
            </div>
          </div>

          {/* Additional Context */}
          <div className="mt-5 bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              Account Context
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label="Segment" value={invoice.customer_segment} />
              <DetailRow label="Payment History" value={<span className="capitalize">{invoice.payment_history}</span>} />
              <DetailRow label="Relationship" value={`${invoice.relationship_years} years`} />
              <DetailRow label="Annual Volume" value={formatCurrency(invoice.annual_volume)} />
              {invoice.notes && (
                <div className="col-span-2 pt-2 border-t border-border/50">
                  <dt className="text-muted-foreground text-xs mb-1">Internal Notes</dt>
                  <dd className="text-foreground bg-secondary/30 p-2.5 rounded-lg border border-border/50 text-xs leading-relaxed">
                    {invoice.notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-2 ${
        accent
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border"
      }`}
    >
      <div className={`flex items-center gap-1.5 text-xs font-medium ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
        {icon}
        {label}
      </div>
      <div className={`text-xl font-bold tracking-tight ${accent ? "text-primary-foreground" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium text-foreground text-xs text-right">{value}</dd>
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const iconMap: Record<TimelineEvent["type"], React.ReactNode> = {
    invoice_issued: <FileText className="w-3.5 h-3.5" />,
    reminder: <Send className="w-3.5 h-3.5" />,
    escalation: <ShieldAlert className="w-3.5 h-3.5" />,
    payment: <TrendingUp className="w-3.5 h-3.5" />,
    draft: <Zap className="w-3.5 h-3.5" />,
  };

  const colorMap: Record<TimelineEvent["type"], string> = {
    invoice_issued: "bg-secondary text-foreground",
    reminder: "bg-blue-100 text-blue-700",
    escalation: "bg-red-100 text-red-700",
    payment: "bg-emerald-100 text-emerald-700",
    draft: "bg-primary/10 text-primary",
  };

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex gap-4 p-4 hover:bg-secondary/20 transition-colors">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorMap[event.type]}`}>
          {iconMap[event.type]}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="font-medium text-sm text-foreground">{event.title}</span>
          {event.isDemo && (
            <span className="text-xs text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded font-medium">
              Historical Demo
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
        <time className="text-xs text-muted-foreground/60 mt-1 block">
          {dateFormatter.format(event.date)}
        </time>
      </div>
    </div>
  );
}
import { useMemo } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetCollectionInvoice,
  useGetCollectionMessageHistory,
  useGetCollectionsDashboard,
  getGetCollectionInvoiceQueryKey,
  MessageHistoryEntryAction,
} from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ref-design/components/ui/tooltip";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  History,
  Info,
  Send,
  ShieldAlert,
  TrendingUp,
  Zap,
} from "lucide-react";
import { RiskBadge } from "@/components/status-badges";
import { formatCurrency } from "@/lib/utils";
import {
  buildCustomerContext,
  buildCustomerTimeline,
  predictPayment,
  type PredictionConfidence,
  type TimelineEvent,
} from "@/lib/finance-intelligence";

const CONFIDENCE_COLORS: Record<PredictionConfidence, string> = {
  High: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Medium: "bg-amber-100 text-amber-800 border-amber-200",
  Low: "bg-red-100 text-red-800 border-red-200",
};

export default function CustomerWorkspace() {
  const [, params] = useRoute("/customers/:invoiceId");
  const invoiceId = params?.invoiceId;

  const { data: invoice, isLoading: isLoadingInvoice } = useGetCollectionInvoice(
    invoiceId || "",
    { query: { enabled: !!invoiceId, queryKey: getGetCollectionInvoiceQueryKey(invoiceId || "") } }
  );
  const { data: allHistory, isLoading: isLoadingHistory } = useGetCollectionMessageHistory();
  const { data: dashboard } = useGetCollectionsDashboard();

  const customerHistory = useMemo(() => {
    if (!allHistory || !invoiceId) return [];
    return allHistory.filter((entry) => entry.invoice_id === invoiceId);
  }, [allHistory, invoiceId]);

  const prediction = useMemo(() => {
    if (!invoice) return null;
    return predictPayment(invoice, dashboard?.reference_date);
  }, [invoice, dashboard?.reference_date]);

  const customerContext = useMemo(() => {
    if (!invoice) return null;
    return buildCustomerContext(invoice);
  }, [invoice]);

  const timeline = useMemo(() => {
    if (!invoice) return [];
    return buildCustomerTimeline(invoice, customerHistory, dashboard?.reference_date);
  }, [invoice, customerHistory, dashboard?.reference_date]);

  if (!invoiceId) {
    return <div className="p-8 text-destructive">Invalid customer ID.</div>;
  }

  if (isLoadingInvoice) {
    return (
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl lg:col-span-1" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Customer not found.</p>
        <Link href="/" className="inline-flex mt-4">
          <Button variant="outline" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-foreground">
              {invoice.customer_name}
            </h1>
            <RiskBadge level={invoice.risk.risk_level} />
            <span className="text-sm text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border font-mono">
              {invoice.customer_segment}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Customer Relationship Workspace &mdash; {invoice.contact_person}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Link href={`/invoices/${invoiceId}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Review Invoice
            </Button>
          </Link>
          <Link href={`/invoices/${invoiceId}`}>
            <Button size="sm" className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Send Notice
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ContextCard
          icon={<Clock className="w-4 h-4" />}
          label="Relationship Duration"
          value={customerContext?.relationshipDurationLabel ?? "—"}
        />
        <ContextCard
          icon={<ShieldAlert className="w-4 h-4" />}
          label="Current Exposure"
          value={formatCurrency(customerContext?.currentExposure ?? 0)}
          accent
        />
        <ContextCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Annual Volume"
          value={formatCurrency(customerContext?.annualVolume ?? 0)}
        />
        <ContextCard
          icon={<CreditCard className="w-4 h-4" />}
          label="Lifetime Value (Est.)"
          value={formatCurrency(customerContext?.lifetimeEstimate ?? 0)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Invoice & Prediction Details */}
        <div className="space-y-5 lg:col-span-1">
          {/* Current Invoice */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Current Invoice
            </h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Invoice ID" value={<span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{invoice.invoice_id}</span>} />
              <DetailRow label="Amount Due" value={<span className="font-bold text-foreground">{formatCurrency(invoice.invoice_amount)}</span>} />
              <DetailRow label="Days Overdue" value={<span className="font-bold text-destructive font-mono">{invoice.days_overdue}d</span>} />
              <DetailRow label="Due Date" value={dateFormatter.format(new Date(invoice.due_date))} />
              <DetailRow label="Payment Terms" value={invoice.payment_terms} />
              <DetailRow label="Reminders Sent" value={String(invoice.reminders_sent)} />
              {invoice.last_reminder_date && (
                <DetailRow label="Last Reminder" value={dateFormatter.format(new Date(invoice.last_reminder_date))} />
              )}
            </dl>
          </div>

          {/* Risk Assessment */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-muted-foreground" />
              Risk Assessment
            </h2>
            <div className="flex items-center justify-between mb-3">
              <RiskBadge level={invoice.risk.risk_level} />
              <span className="font-mono font-bold text-sm">{invoice.risk.risk_score}/100</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${
                  invoice.risk.risk_score > 75
                    ? "bg-destructive"
                    : invoice.risk.risk_score > 50
                    ? "bg-amber-500"
                    : invoice.risk.risk_score > 25
                    ? "bg-blue-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${invoice.risk.risk_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/50 rounded-lg p-3 border border-border/50">
              {invoice.risk.reasoning}
            </p>
            <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 justify-end">
              Source:{" "}
              {invoice.risk.source === "ai" ? (
                <span className="text-primary font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> AI Engine
                </span>
              ) : (
                "Fallback Engine"
              )}
            </div>
          </div>

          {/* Predicted Payment */}
          {prediction && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Payment Prediction
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button aria-label="How is this calculated?" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-relaxed">
                    Predicted from due date, days overdue, reminders sent, payment history, risk score, and relationship length. Fully deterministic.
                  </TooltipContent>
                </Tooltip>
              </h2>
              <div className="text-2xl font-bold text-foreground mb-1">
                {dateFormatter.format(prediction.predictedDate)}
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                In approximately {prediction.daysFromNow} days
              </div>
              <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${CONFIDENCE_COLORS[prediction.confidence]}`}>
                {prediction.confidence} Confidence
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                {prediction.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Right: Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-secondary/20 flex items-center justify-between">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Communication &amp; Activity Timeline
              </h2>
              {isLoadingHistory && (
                <span className="text-xs text-muted-foreground">Loading history...</span>
              )}
            </div>

            <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto">
              {timeline.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  No timeline events available.
                </div>
              ) : (
                timeline.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))
              )}
            </div>
          </div>

          {/* Additional Context */}
          <div className="mt-5 bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              Account Context
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label="Segment" value={invoice.customer_segment} />
              <DetailRow label="Payment History" value={<span className="capitalize">{invoice.payment_history}</span>} />
              <DetailRow label="Relationship" value={`${invoice.relationship_years} years`} />
              <DetailRow label="Annual Volume" value={formatCurrency(invoice.annual_volume)} />
              {invoice.notes && (
                <div className="col-span-2 pt-2 border-t border-border/50">
                  <dt className="text-muted-foreground text-xs mb-1">Internal Notes</dt>
                  <dd className="text-foreground bg-secondary/30 p-2.5 rounded-lg border border-border/50 text-xs leading-relaxed">
                    {invoice.notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-2 ${
        accent
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border"
      }`}
    >
      <div className={`flex items-center gap-1.5 text-xs font-medium ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
        {icon}
        {label}
      </div>
      <div className={`text-xl font-bold tracking-tight ${accent ? "text-primary-foreground" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium text-foreground text-xs text-right">{value}</dd>
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const iconMap: Record<TimelineEvent["type"], React.ReactNode> = {
    invoice_issued: <FileText className="w-3.5 h-3.5" />,
    reminder: <Send className="w-3.5 h-3.5" />,
    escalation: <ShieldAlert className="w-3.5 h-3.5" />,
    payment: <TrendingUp className="w-3.5 h-3.5" />,
    draft: <Zap className="w-3.5 h-3.5" />,
  };

  const colorMap: Record<TimelineEvent["type"], string> = {
    invoice_issued: "bg-secondary text-foreground",
    reminder: "bg-blue-100 text-blue-700",
    escalation: "bg-red-100 text-red-700",
    payment: "bg-emerald-100 text-emerald-700",
    draft: "bg-primary/10 text-primary",
  };

  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex gap-4 p-4 hover:bg-secondary/20 transition-colors">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorMap[event.type]}`}>
          {iconMap[event.type]}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="font-medium text-sm text-foreground">{event.title}</span>
          {event.isDemo && (
            <span className="text-xs text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded font-medium">
              Historical Demo
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
        <time className="text-xs text-muted-foreground/60 mt-1 block">
          {dateFormatter.format(event.date)}
        </time>
      </div>
    </div>
  );
}
