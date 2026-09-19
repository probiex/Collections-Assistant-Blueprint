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

const PLANNED_CHARTS = [
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Aging Bucket Analysis",
    desc: "Days-overdue distribution across 0–30, 31–60, 61–90, and 90+ buckets with trend lines",
  },
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

export default function Reports() {
  const { data: dashboard, isLoading } = useGetCollectionsDashboard();
  const { data: insights, isLoading: isLoadingInsights } = useGetCollectionInsights();

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Analytics and portfolio intelligence — enhanced charts arriving in the next phase.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-2 rounded-full">
          <Clock className="w-3.5 h-3.5" />
          Analytics Phase — Coming Next
        </div>
      </div>

      {/* Current data snapshot */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-1">Current Portfolio Snapshot</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Live data is ready. Charts and trend views below will visualise this in the analytics phase.
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
            Live risk scores from the active engine. Bar charts will replace this table in the analytics phase.
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
                        <div className="font-medium text-foreground">{inv.customer_name}</div>
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
