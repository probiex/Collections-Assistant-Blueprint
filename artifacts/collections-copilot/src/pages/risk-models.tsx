import { useMemo } from "react";
import { Link } from "wouter";
import { useGetCollectionsDashboard, useGetCollectionSettings, RiskResultRiskLevel, DashboardEngineSource } from "@workspace/api-client-react";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Zap, ServerOff, Info, Activity, GitCommit, Settings2, BarChart2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RiskBadge } from "@/components/status-badges";

export default function RiskModels() {
  const { data: dashboard, isLoading: isLoadingDash } = useGetCollectionsDashboard();
  const { data: settings } = useGetCollectionSettings();

  const riskDistribution = useMemo(() => {
    if (!dashboard?.invoices) return null;
    
    const dist = {
      [RiskResultRiskLevel.Critical]: { count: 0, amount: 0, color: "bg-red-500" },
      [RiskResultRiskLevel.High]: { count: 0, amount: 0, color: "bg-amber-500" },
      [RiskResultRiskLevel.Medium]: { count: 0, amount: 0, color: "bg-blue-500" },
      [RiskResultRiskLevel.Low]: { count: 0, amount: 0, color: "bg-emerald-500" },
    };

    let totalAmount = 0;

    dashboard.invoices.forEach(inv => {
      const level = inv.risk.risk_level;
      if (dist[level]) {
        dist[level].count += 1;
        dist[level].amount += inv.invoice_amount;
        totalAmount += inv.invoice_amount;
      }
    });

    return { dist, totalAmount };
  }, [dashboard]);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            Risk Models Explainability
          </h1>
          <p className="text-muted-foreground mt-1">Audit scoring factors and inspect decision logic.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {settings && (
            <div className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-card border border-border shadow-sm" data-testid="status-active-engine">
              <span className="text-muted-foreground mr-1">Active Engine:</span>
              {settings.active_source === DashboardEngineSource.ai ? (
                <span className="flex items-center gap-1.5 text-emerald-600"><Zap className="w-4 h-4" /> AI Copilot</span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600"><ServerOff className="w-4 h-4" /> Fallback Rules</span>
              )}
            </div>
          )}
          {dashboard && (
            <div className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-card border border-border shadow-sm">
              <span className="text-muted-foreground">Reference Date:</span>
              <span>{new Intl.DateTimeFormat("en-US", { dateStyle: 'medium' }).format(new Date(dashboard.reference_date))}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Exposure & Logic */}
        <div className="lg:col-span-1 space-y-6">
          {/* Exposure Dist */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-muted-foreground" />
              Exposure Distribution
            </h2>
            
            {isLoadingDash || !riskDistribution ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(riskDistribution.dist).map(([level, data]) => {
                  const percentage = riskDistribution.totalAmount > 0 
                    ? (data.amount / riskDistribution.totalAmount) * 100 
                    : 0;
                  
                  return (
                    <div key={level} className="space-y-2 group">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{level} Risk</span>
                        <span className="text-muted-foreground">{data.count} accounts</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden border border-border">
                          <div className={`h-full ${data.color} transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }} />
                        </div>
                        <div className="w-24 text-right font-mono text-sm font-medium text-foreground">
                          {formatCurrency(data.amount)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Model Parameters */}
          <div className="bg-primary/5 border border-primary/10 rounded-xl shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none">
              <Settings2 className="w-32 h-32 text-primary" />
            </div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary relative z-10">
              <GitCommit className="w-5 h-5" />
              Deterministic Logic Matrix
            </h2>
            <p className="text-sm text-foreground/80 mb-6 relative z-10 leading-relaxed">
              The offline model adds bounded points across five evidence categories, then clamps the result to a 0–100 score.
            </p>
            
            <div className="space-y-4 relative z-10">
              <div className="bg-background rounded-lg p-4 border border-border shadow-sm text-sm hover-elevate transition-transform">
                <div className="font-semibold mb-1 text-foreground">Overdue Duration</div>
                <div className="text-muted-foreground leading-relaxed">1–14 days: +5. 15–30 days: +15. 31–60 days: +28. More than 60 days: +40.</div>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border shadow-sm text-sm hover-elevate transition-transform">
                <div className="font-semibold mb-1 text-foreground">Payment History</div>
                <div className="text-muted-foreground leading-relaxed">Always on time: +0. First late payment: +8. Occasionally late: +15. Chronic late payer: +30.</div>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border shadow-sm text-sm hover-elevate transition-transform">
                <div className="font-semibold mb-1 text-foreground">Reminder Pressure</div>
                <div className="text-muted-foreground leading-relaxed">Each unresolved reminder adds 8 points, capped at 24 points.</div>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border shadow-sm text-sm hover-elevate transition-transform">
                <div className="font-semibold mb-1 text-foreground">Relative Exposure</div>
                <div className="text-muted-foreground leading-relaxed">Invoice value above 5% of annual account volume adds 8 points; above 15% adds 15 points.</div>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border shadow-sm text-sm hover-elevate transition-transform">
                <div className="font-semibold mb-1 text-foreground">Relationship Adjustment</div>
                <div className="text-muted-foreground leading-relaxed">A relationship of at least 2 years subtracts 12 points when the customer is not a chronic late payer.</div>
              </div>
              
              <div className="pt-4 border-t border-primary/10">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Score Thresholds</div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-background p-2.5 rounded border border-border shadow-sm flex justify-between"><span className="text-red-600 font-bold">Critical</span> <span>70–100</span></div>
                  <div className="bg-background p-2.5 rounded border border-border shadow-sm flex justify-between"><span className="text-amber-600 font-bold">High</span> <span>50–69</span></div>
                  <div className="bg-background p-2.5 rounded border border-border shadow-sm flex justify-between"><span className="text-blue-600 font-bold">Medium</span> <span>25–49</span></div>
                  <div className="bg-background p-2.5 rounded border border-border shadow-sm flex justify-between"><span className="text-emerald-600 font-bold">Low</span> <span>0–24</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Evidence Table */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-border bg-secondary/20 flex items-center justify-between sticky top-0 z-20">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Info className="w-5 h-5 text-muted-foreground" />
                Live Decision Evidence
              </h2>
            </div>
            
            <div className="overflow-x-auto flex-1 bg-background min-h-[400px]">
              <table className="w-full text-sm text-left whitespace-nowrap lg:whitespace-normal">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/10 border-b border-border sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-3 font-semibold w-[200px]">Account / Segment</th>
                    <th className="px-6 py-3 font-semibold text-center w-[80px]">Score</th>
                    <th className="px-6 py-3 font-semibold w-[120px]">Risk Level</th>
                    <th className="px-6 py-3 font-semibold min-w-[300px]">Engine Reasoning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {isLoadingDash ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="bg-card">
                        <td className="px-6 py-4"><Skeleton className="h-8 w-32" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-6 w-12 mx-auto" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-16 w-full" /></td>
                      </tr>
                    ))
                  ) : dashboard?.invoices.map(inv => (
                    <tr key={inv.invoice_id} className="bg-card hover:bg-secondary/20 transition-colors group">
                      <td className="px-6 py-4 align-top">
                        <Link
                          href={`/customers/${inv.invoice_id}`}
                          className="font-semibold text-foreground whitespace-nowrap hover:text-primary hover:underline underline-offset-2 transition-colors block"
                          data-testid={`link-risk-customer-${inv.invoice_id}`}
                        >
                          {inv.customer_name}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-1 font-medium">{inv.customer_segment}</div>
                      </td>
                      <td className="px-6 py-4 align-top text-center">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-mono font-bold text-sm border shadow-sm transition-transform group-hover:scale-105
                          ${inv.risk.risk_score > 75 ? 'bg-red-50 text-red-700 border-red-200' : 
                            inv.risk.risk_score > 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            inv.risk.risk_score > 25 ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                            'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {inv.risk.risk_score}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <RiskBadge level={inv.risk.risk_level} />
                        <div className="mt-2 text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1 bg-secondary/50 inline-flex px-1.5 py-0.5 rounded">
                          Source: {inv.risk.source === 'ai' ? <span className="text-primary flex items-center"><Zap className="w-3 h-3 mr-0.5"/> AI</span> : <span>Fallback</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="bg-secondary/40 border border-border rounded-lg p-3 text-sm text-foreground/90 leading-relaxed shadow-sm min-w-[200px]">
                          {inv.risk.reasoning}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}