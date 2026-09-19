import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  useGetCollectionsDashboard, 
  useGetCollectionInsights, 
  useResetCollectionsDemo,
  getGetCollectionsDashboardQueryKey,
  getGetCollectionInsightsQueryKey,
  Invoice,
  DashboardEngineSource
} from "@workspace/api-client-react";
import { 
  ArrowRight, 
  AlertCircle, 
  TrendingUp, 
  BarChart3, 
  Clock, 
  Zap,
  ServerOff,
  RefreshCw,
  Search,
  Info,
  TrendingDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RiskBadge, StatusBadge } from "@/components/status-badges";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Input } from "@workspace/ref-design/components/ui/input";
import { useState, useMemo } from "react";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ref-design/components/ui/tooltip";
import { calculateDSO, calculatePriorPeriodDSO } from "@/lib/finance-intelligence";

export default function Dashboard() {
  const { data: dashboard, isLoading: isLoadingDash } = useGetCollectionsDashboard();
  const { data: insights, isLoading: isLoadingInsights } = useGetCollectionInsights();
  const resetDemo = useResetCollectionsDemo();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [segmentFilter, setSegmentFilter] = useState("All");

  const handleReset = () => {
    resetDemo.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCollectionsDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCollectionInsightsQueryKey() });
      }
    });
  };

  const filteredInvoices = useMemo(() => {
    if (!dashboard?.invoices) return [];
    const term = searchTerm.toLowerCase();
    return dashboard.invoices.filter(inv => 
      (!term || inv.customer_name.toLowerCase().includes(term) || inv.invoice_id.toLowerCase().includes(term)) &&
      (riskFilter === "All" || inv.risk.risk_level === riskFilter) &&
      (statusFilter === "All" || inv.status === statusFilter) &&
      (segmentFilter === "All" || inv.customer_segment === segmentFilter)
    );
  }, [dashboard, searchTerm, riskFilter, statusFilter, segmentFilter]);

  // Derived finance metrics
  const currentDSO = useMemo(
    () => (dashboard?.invoices ? calculateDSO(dashboard.invoices) : 0),
    [dashboard]
  );

  const priorDSO = useMemo(
    () => (dashboard?.invoices ? calculatePriorPeriodDSO(dashboard.invoices) : 0),
    [dashboard]
  );

  const dsoDelta = currentDSO - priorDSO;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">Portfolio Overview</h1>
          <p className="text-muted-foreground mt-1">Command center for overdue receivables.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {dashboard && (
            <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground border border-border" data-testid="engine-indicator">
              {dashboard.engine_source === DashboardEngineSource.ai ? (
                <><Zap className="w-3.5 h-3.5 text-accent" /> AI Engine Active</>
              ) : (
                <><ServerOff className="w-3.5 h-3.5 text-amber-500" /> Fallback Engine</>
              )}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} disabled={resetDemo.isPending} data-testid="btn-reset-demo" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${resetDemo.isPending ? 'animate-spin' : ''}`} />
            Reset Demo
          </Button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Overdue Amount" 
          value={dashboard ? formatCurrency(dashboard.metrics.total_overdue_amount) : undefined}
          icon={<BarChart3 className="w-4 h-4 text-muted-foreground" />}
          subtitle={`${dashboard?.metrics.overdue_count || 0} open invoices`}
          loading={isLoadingDash}
        />
        <MetricCard 
          title="Actionable Value" 
          value={dashboard ? formatCurrency(dashboard.metrics.amount_requiring_action) : undefined}
          icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
          subtitle={`${dashboard?.metrics.overdue_count || 0} invoices`}
          loading={isLoadingDash}
          highlight
        />
        <MetricCard 
          title="Critical Risk Amount" 
          value={insights ? formatCurrency(insights.critical_exposure) : undefined}
          icon={<AlertCircle className="w-4 h-4 text-muted-foreground" />}
          subtitle={`${dashboard?.metrics.critical_count || 0} critical accounts`}
          loading={isLoadingDash || isLoadingInsights}
        />

        {/* DSO Card — prominent */}
        <div className="rounded-xl border p-5 flex flex-col justify-between bg-card border-border" data-testid="metric-dso">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-medium text-muted-foreground">Days Sales Outstanding</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button aria-label="What is DSO?" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-relaxed">
                  <p className="font-semibold mb-1">Days Sales Outstanding (DSO)</p>
                  <p>Invoice-amount-weighted average of days overdue plus payment terms. Lower is better. Measures how long it takes to collect payment relative to agreed terms.</p>
                  <p className="mt-1 text-muted-foreground">Prior benchmark: {priorDSO}d (avg terms × 1.5)</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="p-2 rounded-lg bg-secondary text-foreground">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <div>
            {isLoadingDash ? (
              <Skeleton className="h-9 w-2/3" />
            ) : (
              <div className="text-3xl font-bold tracking-tight text-foreground" data-testid="metric-dso-value">
                {currentDSO > 0 ? `${currentDSO}d` : "—"}
              </div>
            )}
            {!isLoadingDash && currentDSO > 0 && (
              <div className="mt-2 text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                {dsoDelta > 0 ? (
                  <span className="flex items-center gap-0.5 text-destructive">
                    <TrendingUp className="w-3 h-3" />
                    +{dsoDelta}d vs benchmark
                  </span>
                ) : dsoDelta < 0 ? (
                  <span className="flex items-center gap-0.5 text-emerald-600">
                    <TrendingDown className="w-3 h-3" />
                    {dsoDelta}d vs benchmark
                  </span>
                ) : (
                  <span>On par with benchmark</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insights Section */}
      {isLoadingInsights ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : insights ? (
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 md:p-6 flex gap-4 md:gap-6 items-start relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-24 h-24 text-primary" />
          </div>
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mt-1">
            <Zap className="w-5 h-5" />
          </div>
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-primary mb-1 uppercase tracking-wider">Copilot Insight</h3>
            <p className="text-foreground leading-relaxed md:text-lg font-medium max-w-4xl" data-testid="insight-summary">
              {insights.summary}
            </p>
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground bg-background/60 px-2 py-1 rounded-md">
                <span className="font-semibold text-foreground">{insights.action_accounts}</span> accounts require immediate contact
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground bg-background/60 px-2 py-1 rounded-md">
                <span className="font-semibold text-foreground">{insights.top_customer_concentration.toFixed(1)}%</span> exposure in top segment
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Invoice Queue */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4 bg-secondary/30">
          <h2 className="font-semibold text-lg">Action Queue</h2>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search queue..." 
                className="pl-9 h-9 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-queue-search"
              />
            </div>
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" data-testid="select-risk-filter" aria-label="Filter by risk">
              <option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" data-testid="select-status-filter" aria-label="Filter by status">
              <option>All</option><option>Overdue</option><option>Reminder Sent</option><option>Escalated</option>
            </select>
            <select value={segmentFilter} onChange={(event) => setSegmentFilter(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" data-testid="select-segment-filter" aria-label="Filter by segment">
              <option>All</option><option>Enterprise</option><option>SMB</option><option>Startup</option>
            </select>
          </div>
        </div>
        
        {/* Mobile cards */}
        <div className="divide-y divide-border md:hidden">
          {isLoadingDash ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))
          ) : filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No invoices match your search.
            </div>
          ) : (
            filteredInvoices.map((invoice: Invoice) => (
              <MobileInvoiceCard key={invoice.invoice_id} invoice={invoice} />
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-background border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Customer</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Amount</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-center">Overdue</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Risk Level</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoadingDash ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="bg-card">
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-16 mx-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No invoices match your search.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice: Invoice) => (
                  <DashboardTableRow key={invoice.invoice_id} invoice={invoice} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MobileInvoiceCard({ invoice }: { invoice: Invoice }) {
  const [, navigate] = useLocation();

  const handleCardClick = () => {
    navigate(`/customers/${invoice.invoice_id}`);
  };

  return (
    <div
      className="relative p-4 hover:bg-secondary/40 transition-colors cursor-pointer"
      onClick={handleCardClick}
      role="link"
      aria-label={`Open ${invoice.customer_name} customer workspace`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      data-testid={`mobile-dash-card-${invoice.invoice_id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate">{invoice.customer_name}</div>
          <div className="text-xs text-muted-foreground mt-0.5 font-mono">{invoice.invoice_id} &bull; {invoice.customer_segment}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-semibold text-foreground">{formatCurrency(invoice.invoice_amount)}</div>
          <div className="text-xs text-muted-foreground font-mono">{invoice.days_overdue}d overdue</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex flex-wrap gap-2">
          <RiskBadge level={invoice.risk.risk_level} />
          <StatusBadge status={invoice.status} />
        </div>
        <ArrowRight className="w-4 h-4 text-primary shrink-0" />
      </div>
    </div>
  );
}

function DashboardTableRow({ invoice }: { invoice: Invoice }) {
  return (
    <tr
      className="bg-card hover:bg-secondary/40 transition-colors group"
      data-testid={`row-invoice-${invoice.invoice_id}`}
    >
      <td className="px-6 py-4">
        <Link
          href={`/customers/${invoice.invoice_id}`}
          className="font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors"
          data-testid={`link-customer-${invoice.invoice_id}`}
        >
          {invoice.customer_name}
        </Link>
        <div className="text-xs text-muted-foreground mt-0.5">{invoice.invoice_id} &bull; {invoice.customer_segment}</div>
      </td>
      <td className="px-6 py-4 text-right font-medium text-foreground">
        {formatCurrency(invoice.invoice_amount)}
      </td>
      <td className="px-6 py-4 text-center">
        <div className="inline-flex items-center justify-center font-bold font-mono text-sm px-2 py-1 bg-secondary rounded-md">
          {invoice.days_overdue}d
        </div>
      </td>
      <td className="px-6 py-4">
        <RiskBadge level={invoice.risk.risk_level} />
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={invoice.status} />
      </td>
      <td className="px-6 py-4 text-right">
        <Link href={`/invoices/${invoice.invoice_id}`}>
          <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`btn-review-${invoice.invoice_id}`}>
            Review <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </td>
    </tr>
  );
}

function MetricCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  subtitle,
  highlight = false,
  loading = false
}: { 
  title: string; 
  value?: string; 
  icon: React.ReactNode; 
  trend?: string; 
  trendUp?: boolean;
  subtitle?: string;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 flex flex-col justify-between ${highlight ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className={`text-sm font-medium ${highlight ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{title}</h3>
        <div className={`p-2 rounded-lg ${highlight ? 'bg-primary-foreground/10 text-primary-foreground' : 'bg-secondary text-foreground'}`}>
          {icon}
        </div>
      </div>
      <div>
        {loading ? (
          <Skeleton className={`h-9 w-2/3 ${highlight ? 'bg-primary-foreground/20' : ''}`} />
        ) : (
          <div className="text-3xl font-bold tracking-tight" data-testid={`metric-${title.replace(/\s+/g, '-')}`}>
            {value || "—"}
          </div>
        )}
        
        {!loading && (trend || subtitle) && (
          <div className={`mt-2 text-xs font-medium flex items-center gap-1.5 ${highlight ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            {trend && (
              <span className={highlight ? '' : trendUp ? 'text-emerald-600' : 'text-destructive'}>
                {trend}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
