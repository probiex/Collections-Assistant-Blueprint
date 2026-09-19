import { useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Copy,
  Download,
  Printer,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import { useGetCollectionSettings, useGetCollectionsDashboard } from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { RiskBadge } from "@/components/status-badges";
import { formatCurrency } from "@/lib/utils";
import { calculateAgingBuckets } from "@/lib/finance-intelligence";
import {
  buildWeeklyNarrative,
  calculateCollectionsFunnel,
  calculateRiskDistribution,
  calculateTopAtRiskAccounts,
  totalAmount,
} from "@/lib/reporting";
import { copyText } from "@/lib/csv";
import { toast } from "@workspace/ref-design/hooks/use-toast";

const riskBarStyles: Record<string, string> = {
  Critical: "bg-destructive",
  High: "bg-accent",
  Medium: "bg-primary",
  Low: "bg-secondary-foreground/40",
};

export default function Reports() {
  const { data: dashboard, isLoading } = useGetCollectionsDashboard();
  const { data: settings } = useGetCollectionSettings();
  const invoices = dashboard?.invoices ?? [];
  const currency = settings?.currency ?? "INR";
  const locale = settings?.locale ?? "en-IN";
  const money = (amount: number) => formatCurrency(amount, currency, locale);
  const aging = useMemo(() => calculateAgingBuckets(invoices), [invoices]);
  const funnel = useMemo(() => calculateCollectionsFunnel(invoices), [invoices]);
  const risks = useMemo(() => calculateRiskDistribution(invoices), [invoices]);
  const topAccounts = useMemo(() => calculateTopAtRiskAccounts(invoices), [invoices]);
  const narrative = useMemo(() => buildWeeklyNarrative(invoices), [invoices]);
  const portfolioAmount = totalAmount(invoices);

  const handleShare = async () => {
    try {
      await copyText(`## Weekly collections narrative\n\n${narrative}`);
      toast({ title: "Report summary copied", description: "The weekly narrative is ready to paste." });
    } catch {
      toast({ title: "Could not copy the summary", variant: "destructive" });
    }
  };

  return (
    <div className="report-page p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <BarChart3 className="w-4 h-4" /> Portfolio intelligence
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Live collections funnel, aging, risk concentration, and weekly action context.
          </p>
        </div>
        <div className="flex gap-2 print-hide">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleShare}>
            <Copy className="w-3.5 h-3.5" /> Copy summary
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" /> Print report
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <>
          <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <SectionHeading
              icon={<TrendingUp className="w-5 h-5 text-primary" />}
              title="Collections funnel"
              description="Each stage is calculated from the current invoice portfolio."
            />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
              {funnel.map((stage, index) => {
                const previous = funnel[index - 1];
                const conversion = previous?.count ? Math.round((stage.count / previous.count) * 100) : 100;
                return (
                  <div key={stage.label} className="relative bg-secondary/40 border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stage.label}</span>
                      <span className="text-xs text-muted-foreground">{index === 0 ? "100%" : `${conversion}%`}</span>
                    </div>
                    <div className="text-2xl font-bold mt-3">{stage.count}</div>
                    <div className="text-sm font-medium mt-1">{money(stage.amount)}</div>
                    <p className="text-xs text-muted-foreground mt-2">{stage.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <SectionHeading icon={<ClipboardList className="w-5 h-5 text-primary" />} title="AR aging" description="Outstanding amount and invoice count by days overdue." />
              <div className="space-y-5 mt-6">
                {aging.map((bucket) => {
                  const percentage = portfolioAmount ? (bucket.amount / portfolioAmount) * 100 : 0;
                  return (
                    <div key={bucket.label}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium">{bucket.label}</span>
                        <span className="text-muted-foreground">{bucket.count} invoices · {money(bucket.amount)}</span>
                      </div>
                      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{percentage.toFixed(1)}% of portfolio value</div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <SectionHeading icon={<ShieldAlert className="w-5 h-5 text-destructive" />} title="Risk distribution" description="Compare risk by count and outstanding amount." />
              <div className="space-y-4 mt-6">
                {risks.map((risk) => {
                  const countPct = invoices.length ? (risk.count / invoices.length) * 100 : 0;
                  const amountPct = portfolioAmount ? (risk.amount / portfolioAmount) * 100 : 0;
                  return (
                    <div key={risk.label} className="grid grid-cols-[76px_1fr_100px] items-center gap-3">
                      <RiskBadge level={risk.label as "Low" | "Medium" | "High" | "Critical"} />
                      <div className="space-y-1.5">
                        <MetricBar value={countPct} color={riskBarStyles[risk.label]} label={`${risk.count} invoices`} />
                        <MetricBar value={amountPct} color={riskBarStyles[risk.label]} label={money(risk.amount)} muted />
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{countPct.toFixed(0)}% count</div>
                        <div>{amountPct.toFixed(0)}% amount</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-5 pt-4 border-t border-border">
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Count</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-secondary-foreground/40" /> Amount</span>
              </div>
            </section>
          </div>

          <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <SectionHeading icon={<Users className="w-5 h-5 text-destructive" />} title="Top at-risk accounts" description="Priority is weighted by risk score and invoice exposure." />
            <div className="overflow-x-auto mt-5">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left pb-3 font-semibold">Account</th>
                    <th className="text-left pb-3 font-semibold">Risk</th>
                    <th className="text-right pb-3 font-semibold">Score</th>
                    <th className="text-right pb-3 font-semibold">Amount</th>
                    <th className="text-right pb-3 font-semibold">Overdue</th>
                    <th className="text-right pb-3 font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {topAccounts.map(({ invoice, exposureShare }) => (
                    <tr key={invoice.invoice_id} className="hover:bg-secondary/30">
                      <td className="py-3 pr-4">
                        <Link href={`/customers/${invoice.invoice_id}`} className="font-medium hover:text-primary hover:underline underline-offset-2">
                          {invoice.customer_name}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">{invoice.invoice_id}</div>
                      </td>
                      <td className="py-3 pr-4"><RiskBadge level={invoice.risk.risk_level} /></td>
                      <td className="py-3 text-right font-mono">{invoice.risk.risk_score}</td>
                      <td className="py-3 text-right font-medium">{money(invoice.invoice_amount)}</td>
                      <td className="py-3 text-right">{invoice.days_overdue}d</td>
                      <td className="py-3 text-right text-muted-foreground">{exposureShare.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-primary/5 border border-primary/15 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h2 className="font-semibold text-lg">Weekly collections narrative</h2>
                <p className="text-sm leading-relaxed mt-2 max-w-4xl">{narrative}</p>
              </div>
            </div>
          </section>
        </>
      )}

      <div className="flex flex-wrap gap-2 print-hide">
        <Link href="/invoices"><Button variant="outline" size="sm" className="gap-1.5"><Download className="w-3.5 h-3.5" /> Export from invoices <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
        <Link href="/risk-models"><Button variant="ghost" size="sm">Open risk models <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
      </div>
    </div>
  );
}

function SectionHeading({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div>
      <h2 className="font-semibold text-lg flex items-center gap-2">{icon}{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

function MetricBar({ value, color, label, muted = false }: { value: number; color: string; label: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 flex-1 rounded-full overflow-hidden ${muted ? "bg-secondary" : "bg-secondary/70"}`}>
        <div className={`h-full rounded-full ${muted ? "bg-secondary-foreground/40" : color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-24 text-right text-xs text-muted-foreground">{label}</span>
    </div>
  );
}