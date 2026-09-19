import { Link } from "wouter";
import { useGetCollectionsDashboard } from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Separator } from "@workspace/ref-design/components/ui/separator";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import {
  CreditCard,
  ArrowRight,
  Clock,
  Shield,
  Zap,
  Link as LinkIcon,
  Bell,
  Receipt,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const PLANNED_FEATURES = [
  {
    icon: <LinkIcon className="w-5 h-5" />,
    title: "Payment Link Generation",
    desc: "Generate Razorpay-hosted payment links per invoice, shareable via email or WhatsApp",
  },
  {
    icon: <Bell className="w-5 h-5" />,
    title: "Automated Payment Reminders",
    desc: "Schedule Razorpay reminder sequences tied to escalation thresholds",
  },
  {
    icon: <Receipt className="w-5 h-5" />,
    title: "Real-time Settlement Tracking",
    desc: "Live webhook feed from Razorpay — mark invoices paid on settlement",
  },
  {
    icon: <RefreshCw className="w-5 h-5" />,
    title: "Reconciliation Dashboard",
    desc: "Match Razorpay settlements to invoices and flag discrepancies automatically",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Partial Payment Handling",
    desc: "Track instalments, update outstanding balance, and re-score risk",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "AI Payment Nudge",
    desc: "Copilot selects the optimal payment link timing based on customer response patterns",
  },
];

export default function PaymentCollection() {
  const { data: dashboard, isLoading } = useGetCollectionsDashboard();

  const totalCollectable = dashboard?.metrics.total_overdue_amount ?? 0;
  const invoiceCount = dashboard?.metrics.overdue_count ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
            Payment Collection
          </h1>
          <p className="text-muted-foreground mt-1">
            Razorpay-powered payment links, reminders, and settlement reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-2 rounded-full shrink-0">
          <Clock className="w-3.5 h-3.5" />
          Razorpay Phase — Coming Next
        </div>
      </div>

      {/* Collection opportunity */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="bg-primary px-6 py-5">
          <h2 className="text-primary-foreground font-semibold text-lg mb-1">
            Collection Opportunity Ready
          </h2>
          <p className="text-primary-foreground/70 text-sm">
            Your portfolio has collectable receivables waiting for payment link activation.
          </p>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <ReadyCard label="Total Collectible" value={formatCurrency(totalCollectable)} />
              <ReadyCard label="Open Invoices" value={String(invoiceCount)} />
              <ReadyCard
                label="Critical / High"
                value={`${(dashboard?.metrics.critical_count ?? 0) + (dashboard?.metrics.high_count ?? 0)}`}
                note="accounts"
              />
              <ReadyCard
                label="Action Value"
                value={dashboard ? formatCurrency(dashboard.metrics.amount_requiring_action) : "—"}
                note="priority"
              />
            </div>
          )}

          <div className="flex items-start gap-3 bg-secondary/40 border border-border rounded-lg p-4 text-sm">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-muted-foreground">
              Payment link generation and Razorpay integration are scoped for the next phase. Until then, use the Invoice workflow to manually mark payments received via email or phone.
            </div>
          </div>
        </div>
      </div>

      {/* Planned features */}
      <div className="bg-secondary/30 border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Planned Razorpay Features</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Full Razorpay integration is planned for the next phase. No placeholder actions are wired — these will be real payment flows.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLANNED_FEATURES.map((feature, i) => (
            <div
              key={i}
              className="bg-background border border-border rounded-lg p-4 flex gap-3 opacity-70"
            >
              <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                {feature.icon}
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">{feature.title}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{feature.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-5" />

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <p className="text-sm text-muted-foreground flex-1">
            Track outstanding invoices and send collection notices through the invoice workflow today.
          </p>
          <div className="flex gap-2 shrink-0">
            <Link href="/invoices">
              <Button size="sm" className="gap-1.5">
                Go to Invoices <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadyCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-secondary/40 border border-border rounded-xl p-4">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {note && <div className="text-xs text-muted-foreground mt-1">{note}</div>}
    </div>
  );
}
