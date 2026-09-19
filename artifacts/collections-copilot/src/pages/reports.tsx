import { useMemo } from "react";
import { Link } from "wouter";
import { useGetCollectionsDashboard, useGetCollectionInsights } from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Separator } from "@workspace/ref-design/components/ui/separator";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  ArrowRight,
  Clock,
  AlertCircle,
  CalendarRange,
  Users,
  FileBarChart,
  Zap,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RiskBadge } from "@/components/status-badges";
import { calculateAgingBuckets, type AgingBucket } from "@/lib/finance-intelligence";

const PLANNED_CHARTS = [
  {
    icon: <PieChart className="w-5 h-5" />,
    title: "Exposure by Segment",
    desc: "Enterprise, SMB, and Startup exposure breakdown with drill-through",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Collection Rate Over Time",
    desc: "Monthly recovered amount vs outstanding with rolling 90-day average",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Top Accounts Heat Map",
    desc: "Risk score vs invoice amount scatter for all active debtors",
  },
  {
    icon: <CalendarRange className="w-5 h-5" />,
    title: "Reminder Effectiveness",
    desc: "Tone-to-payment conversion rate by escalation stage",
  },
  {
    icon: <FileBarChart className="w-5 h-5" />,
    title: "Period Comparison",
    desc: "Month-over-month and quarter-over-quarter overdue delta",
  },
];

const BUCKET_COLORS = [
  "bg-emerald-500",
  "bg-amber-400",
  "bg-orange-500",
  "bg-destructive",
];

export default function Reports() {
  const { data: dashboard, isLoading } = useGetCollectionsDashboard();
  const { data: insights, isLoading: isLoadingInsights } = useGetCollectionInsights();

  const agingBuckets = useMemo<AgingBucket[]>(() => {
    if (!dashboard?.invoices) return [];
    return calculateAgingBuckets(dashboard.invoices);
  }, [dashboard]);

  const totalAmount = agingBuckets.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">
            AR aging analysis and portfolio intelligence.
          </p>
        </div>
      </div>

      {/* AR Aging Distribution — Live */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              AR Aging Distribution
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Live breakdown by days outstanding. Totals reconcile to current dashboard invoices.
            </p>
          </div>
          <Link href="/invoices">
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              View Invoices <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : agingBuckets.length === 0 ? (
          <div className="mt-6 p-8 text-center text-muted-foreground text-sm">
            No invoice data available.
          </div>
        ) : (
          <>
            {/* Desktop: table */}
            <div className="mt-6 hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                    <th className="pb-3 text-left font-semibold">Aging Bucket</th>
                    <th className="pb-3 text-right font-semibold">Invoices</th>
                    <th className="pb-3 text-right font-semibold">Outstanding Amount</th>
                    <th className="pb-3 text-right font-semibold">% of Total</th>
                    <th className="pb-3 font-semibold pl-6">Distribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {agingBuckets.map((bucket, i) => {
                    const pct = totalAmount > 0 ? (bucket.amount / totalAmount) * 100 : 0;
                    return (
                      <tr key={bucket.label} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-4 pr-4 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${BUCKET_COLORS[i]}`} />
                            {bucket.label}
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-right font-mono font-semibold text-foreground">
                          {bucket.count}
                        </td>
                        <td className="py-4 pr-4 text-right font-semibold text-foreground">
                          {formatCurrency(bucket.amount)}
                        </td>
                        <td className="py-4 pr-4 text-right font-mono text-muted-foreground">
                          {pct.toFixed(1)}%
                        </td>
                        <td className="py-4 pl-6 w-48">
                          <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${BUCKET_COLORS[i]}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td className="py-3 font-bold text-foreground">Total</td>
                    <td className="py-3 text-right font-mono font-bold text-foreground">
                      {agingBuckets.reduce((s, b) => s + b.count, 0)}
                    </td>
                    <td className="py-3 text-right font-bold text-foreground" colSpan={3}>
                      {formatCurrency(totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:hidden">
              {agingBuckets.map((bucket, i) => {
                const pct = totalAmount > 0 ? (bucket.amount / totalAmount) * 100 : 0;
                return (
                  <div key={bucket.label} className="bg-secondary/20 border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${BUCKET_COLORS[i]}`} />
                        {bucket.label}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${BUCKET_COLORS[i]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{bucket.count} invoice{bucket.count !== 1 ? "s" : ""}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(bucket.amount)}</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between px-4 py-2 text-sm font-bold border-t border-border">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Current data snapshot */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-1">Portfolio Snapshot</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Live totals derived from the current invoice data.
        </p>

        {isLoading || isLoadingInsights ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : dashboard && insights ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SnapshotCard
              label="Total Overdue"
              value={formatCurrency(dashboard.metrics.total_overdue_amount)}
              sub={`${dashboard.metrics.overdue_count} invoices`}
            />
            <SnapshotCard
              label="Critical Exposure"
              value={formatCurrency(insights.critical_exposure)}
              sub={`${dashboard.metrics.critical_count} critical`}
              accent
            />
            <SnapshotCard
              label="Accounts Needing Action"
              value={String(insights.action_accounts)}
              sub="require contact now"
            />
            <SnapshotCard
              label="Top Segment Concentration"
              value={`${insights.top_customer_concentration.toFixed(1)}%`}
              sub="in leading segment"
            />
          </div>
        ) : null}

        {insights && (
          <div className="mt-5 bg-primary/5 border border-primary/10 rounded-lg p-4 flex gap-3 items-start">
            <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">{insights.summary}</p>
          </div>
        )}
      </div>

      {/* Risk distribution preview */}
      {!isLoading && dashboard && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-1">Risk Level Breakdown</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Live risk scores from the active engine, sorted by score.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                  <th className="pb-3 text-left font-semibold">Customer</th>
                  <th className="pb-3 text-left font-semibold">Risk</th>
                  <th className="pb-3 text-right font-semibold">Score</th>
                  <th className="pb-3 text-right font-semibold">Amount</th>
                  <th className="pb-3 text-right font-semibold">Days Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {dashboard.invoices
                  .slice()
                  .sort((a, b) => b.risk.risk_score - a.risk.risk_score)
                  .map((inv) => (
                    <tr key={inv.invoice_id} className="hover:bg-secondary/30 transition-colors group">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/customers/${inv.invoice_id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors"
                          data-testid={`link-reports-customer-${inv.invoice_id}`}
                        >
                          {inv.customer_name}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">{inv.invoice_id}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <RiskBadge level={inv.risk.risk_level} />
                      </td>
                      <td className="py-3 pr-4 text-right font-mono font-semibold">
                        {inv.risk.risk_score}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">
                        {formatCurrency(inv.invoice_amount)}
                      </td>
                      <td className="py-3 text-right">
                        <span className="font-mono font-bold text-foreground">{inv.days_overdue}d</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Planned charts */}
      <div className="bg-secondary/30 border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Planned in Analytics Phase</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          The following charts and views are scoped for the next task. The data pipeline is already live.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLANNED_CHARTS.map((chart, i) => (
            <div
              key={i}
              className="bg-background border border-border rounded-lg p-4 flex gap-3 opacity-70"
            >
              <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                {chart.icon}
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">{chart.title}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{chart.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-5" />

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <p className="text-sm text-muted-foreground flex-1">
            In the meantime, review live risk data on the Risk Models page or work the invoice queue.
          </p>
          <div className="flex gap-2 shrink-0">
            <Link href="/risk-models">
              <Button variant="outline" size="sm" className="gap-1.5">
                Risk Models <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="/invoices">
              <Button size="sm" className="gap-1.5">
                Invoices <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/30 border-border"}`}>
      <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
        {label}
      </div>
      <div className={`text-2xl font-bold tracking-tight ${accent ? "text-primary-foreground" : "text-foreground"}`}>
        {value}
      </div>
      <div className={`text-xs mt-1 ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
        {sub}
      </div>
    </div>
  );
}
