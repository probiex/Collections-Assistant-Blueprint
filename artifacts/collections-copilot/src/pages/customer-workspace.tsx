import { useMemo } from "react";
import { Link, useRoute } from "wouter";
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
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  History,
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

const confidenceStyles: Record<PredictionConfidence, string> = {
  High: "bg-primary/10 text-primary border-primary/20",
  Medium: "bg-secondary text-secondary-foreground border-border",
  Low: "bg-destructive/10 text-destructive border-destructive/20",
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default function CustomerWorkspace() {
  const [, params] = useRoute("/customers/:invoiceId");
  const invoiceId = params?.invoiceId;
  const { data: invoice, isLoading } = useGetCollectionInvoice(invoiceId || "", {
    query: { enabled: !!invoiceId, queryKey: getGetCollectionInvoiceQueryKey(invoiceId || "") },
  });
  const { data: history = [] } = useGetCollectionMessageHistory();
  const { data: dashboard } = useGetCollectionsDashboard();

  const customerHistory = useMemo(
    () => history.filter((entry) => entry.invoice_id === invoiceId),
    [history, invoiceId]
  );
  const prediction = useMemo(
    () => (invoice ? predictPayment(invoice, dashboard?.reference_date) : null),
    [invoice, dashboard?.reference_date]
  );
  const context = useMemo(() => (invoice ? buildCustomerContext(invoice) : null), [invoice]);
  const timeline = useMemo(
    () =>
      invoice
        ? buildCustomerTimeline(invoice, customerHistory, dashboard?.reference_date)
        : [],
    [invoice, customerHistory, dashboard?.reference_date]
  );

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
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

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start gap-4">
        <Link href="/invoices">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 items-center">
            <h1 className="font-serif text-3xl font-medium tracking-tight truncate">{invoice.customer_name}</h1>
            <RiskBadge level={invoice.risk.risk_level} />
          </div>
          <p className="text-muted-foreground mt-1">
            Customer relationship workspace · {invoice.invoice_id}
          </p>
        </div>
        <Link href={`/invoices/${invoice.invoice_id}`}>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            Invoice <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Current exposure" value={formatCurrency(context?.currentExposure ?? 0)} icon={<CreditCard className="w-4 h-4" />} />
        <Metric label="Annual volume" value={formatCurrency(context?.annualVolume ?? 0)} icon={<TrendingUp className="w-4 h-4" />} />
        <Metric label="Relationship" value={context?.relationshipDurationLabel ?? "—"} icon={<Building className="w-4 h-4" />} />
        <Metric label="Payment pattern" value={context?.paymentPattern ?? "—"} icon={<History className="w-4 h-4" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <section className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-lg mb-4">Current invoice</h2>
            <div className="text-3xl font-bold">{formatCurrency(invoice.invoice_amount)}</div>
            <div className="grid grid-cols-2 gap-4 mt-5 text-sm">
              <Detail label="Due date" value={dateFormatter.format(new Date(invoice.due_date))} icon={<Calendar className="w-3.5 h-3.5" />} />
              <Detail label="Days overdue" value={`${invoice.days_overdue} days`} icon={<Clock className="w-3.5 h-3.5" />} />
              <Detail label="Contact" value={invoice.contact_person} icon={<Building className="w-3.5 h-3.5" />} />
              <Detail label="Terms" value={invoice.payment_terms} icon={<FileText className="w-3.5 h-3.5" />} />
            </div>
          </section>
          {prediction && (
            <section className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Payment prediction</h2>
                <Badge variant="outline" className={confidenceStyles[prediction.confidence]}>
                  {prediction.confidence}
                </Badge>
              </div>
              <div className="text-2xl font-bold">{dateFormatter.format(prediction.predictedDate)}</div>
              <p className="text-sm text-muted-foreground mt-1">{prediction.explanation}</p>
            </section>
          )}
          <section className="bg-primary/5 border border-primary/15 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Next best action</h2>
            </div>
            <p className="text-sm leading-relaxed">{context?.nextBestAction}</p>
          </section>
        </div>

        <section className="bg-card border border-border rounded-xl p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-lg">Relationship timeline</h2>
              <p className="text-sm text-muted-foreground mt-1">Live collection activity with historical context.</p>
            </div>
            <Badge variant="outline">{timeline.length} events</Badge>
          </div>
          <div className="space-y-5">
            {timeline.map((event) => <TimelineItem key={event.id} event={event} />)}
            {timeline.length === 0 && <p className="text-sm text-muted-foreground">No timeline events yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
        {icon}{label}
      </div>
      <div className="font-bold text-lg mt-2 truncate">{value}</div>
    </div>
  );
}

function Detail({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground flex items-center gap-1.5 mb-1">{icon}{label}</div>
      <div className="font-medium truncate">{value}</div>
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const Icon = event.type === "invoice_issued" ? FileText : event.type === "reminder" ? SendIcon : event.type === "escalation" ? ShieldAlert : Clock;
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{event.title}</span>
          {event.isDemo && <Badge variant="outline" className="text-[10px]">Historical</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
        <time className="text-xs text-muted-foreground/70 mt-1 block">{dateFormatter.format(event.date)}</time>
      </div>
    </div>
  );
}

function SendIcon({ className }: { className?: string }) {
  return <ArrowRight className={className} />;
}