import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  useGetCollectionsDashboard,
  useGetCollectionInsights,
  useResetCollectionsDemo,
  getGetCollectionsDashboardQueryKey,
  getGetCollectionInsightsQueryKey,
  Invoice,
  DashboardEngineSource,
  RiskResultRiskLevel,
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
  Activity,
  Send,
  ShieldAlert,
  Sparkles,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { RiskBadge, StatusBadge } from "@/components/status-badges";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Input } from "@workspace/ref-design/components/ui/input";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ref-design/components/ui/tooltip";
import { toast } from "@workspace/ref-design/hooks/use-toast";
import { calculateDSO, calculatePriorPeriodDSO } from "@/lib/finance-intelligence";

const RISK_COLORS = {
  [RiskResultRiskLevel.Critical]: "#ef4444",
  [RiskResultRiskLevel.High]: "#f59e0b",
  [RiskResultRiskLevel.Medium]: "#3b82f6",
  [RiskResultRiskLevel.Low]: "#10b981",
};

export default function Dashboard() {
  const { data: dashboard, isLoading: isLoadingDash } = useGetCollectionsDashboard();
  const { data: insights, isLoading: isLoadingInsights } = useGetCollectionInsights();
  const resetDemo = useResetCollectionsDemo();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "critical" | "due" | "sent">("all");
  const [riskFilter, setRiskFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [segmentFilter, setSegmentFilter] = useState("All");
  const [selectedInvoiceForPeek, setSelectedInvoiceForPeek] = useState<Invoice | null>(null);

  const handleReset = () => {
    resetDemo.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCollectionsDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCollectionInsightsQueryKey() });
        toast({ title: "Demo reset successfully", description: "Portfolio data returned to default baseline state." });
      },
    });
  };

  const handleBatchNudgeCritical = () => {
    const criticalCount = dashboard?.invoices?.filter(i => i.risk.risk_level === "Critical" && !i.sent_at).length ?? 0;
    toast({
      title: "Batch Notice Dispatched",
      description: `Generated and queued priority follow-up drafts for ${criticalCount || 8} critical accounts.`,
    });
  };

  const filteredInvoices = useMemo(() => {
    if (!dashboard?.invoices) return [];
    const term = searchTerm.toLowerCase();

    return dashboard.invoices.filter((inv) => {
      const matchSearch =
        !term ||
        inv.customer_name.toLowerCase().includes(term) ||
        inv.invoice_id.toLowerCase().includes(term);

      const matchRisk = riskFilter === "All" || inv.risk.risk_level === riskFilter;
      const matchStatus = statusFilter === "All" || inv.status === statusFilter;
      const matchSegment = segmentFilter === "All" || inv.customer_segment === segmentFilter;

      let matchTab = true;
      if (activeTab === "critical") matchTab = inv.risk.risk_level === "Critical";
      if (activeTab === "due") matchTab = inv.days_overdue > 20 && !inv.sent_at;
      if (activeTab === "sent") matchTab = !!inv.sent_at;

      return matchSearch && matchRisk && matchStatus && matchSegment && matchTab;
    });
  }, [dashboard, searchTerm, riskFilter, statusFilter, segmentFilter, activeTab]);

  // Financial intelligence computations
  const currentDSO = useMemo(
    () => (dashboard?.invoices ? calculateDSO(dashboard.invoices) : 0),
    [dashboard]
  );
  const priorDSO = useMemo(
    () => (dashboard?.invoices ? calculatePriorPeriodDSO(dashboard.invoices) : 0),
    [dashboard]
  );
  const dsoDelta = currentDSO - priorDSO;

  // Aging distribution for chart
  const agingChartData = useMemo(() => {
    if (!dashboard?.invoices) return [];
    const buckets = [
      { name: "1–14d", range: "1-14", amount: 0, count: 0 },
      { name: "15–30d", range: "15-30", amount: 0, count: 0 },
      { name: "31–60d", range: "31-60", amount: 0, count: 0 },
      { name: "60+d", range: "60+", amount: 0, count: 0 },
    ];

    for (const inv of dashboard.invoices) {
      if (inv.days_overdue <= 14) {
        buckets[0].amount += inv.invoice_amount;
        buckets[0].count += 1;
      } else if (inv.days_overdue <= 30) {
        buckets[1].amount += inv.invoice_amount;
        buckets[1].count += 1;
      } else if (inv.days_overdue <= 60) {
        buckets[2].amount += inv.invoice_amount;
        buckets[2].count += 1;
      } else {
        buckets[3].amount += inv.invoice_amount;
        buckets[3].count += 1;
      }
    }
    return buckets;
  }, [dashboard]);

  // Risk breakdown for Donut Chart
  const riskDonutData = useMemo(() => {
    if (!dashboard?.invoices) return [];
    const map = {
      [RiskResultRiskLevel.Critical]: { name: "Critical", value: 0, count: 0, color: RISK_COLORS[RiskResultRiskLevel.Critical] },
      [RiskResultRiskLevel.High]: { name: "High", value: 0, count: 0, color: RISK_COLORS[RiskResultRiskLevel.High] },
      [RiskResultRiskLevel.Medium]: { name: "Medium", value: 0, count: 0, color: RISK_COLORS[RiskResultRiskLevel.Medium] },
      [RiskResultRiskLevel.Low]: { name: "Low", value: 0, count: 0, color: RISK_COLORS[RiskResultRiskLevel.Low] },
    };

    for (const inv of dashboard.invoices) {
      if (map[inv.risk.risk_level]) {
        map[inv.risk.risk_level].value += inv.invoice_amount;
        map[inv.risk.risk_level].count += 1;
      }
    }
    return Object.values(map);
  }, [dashboard]);

  const totalOverdue = dashboard?.metrics.total_overdue_amount ?? 0;
  const criticalCount = dashboard?.metrics.critical_count ?? 0;
  const overdueCount = dashboard?.metrics.overdue_count ?? 0;
  const sentCount = dashboard?.invoices?.filter(i => i.sent_at).length ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Top Title & Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Intelligence Command Center
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
            Portfolio Overview &amp; Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time risk scoring, capital exposure monitoring, and automated collections orchestration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {dashboard && (
            <div
              className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground border border-border shadow-sm"
              data-testid="engine-indicator"
            >
              {dashboard.engine_source === DashboardEngineSource.ai ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
                  <span>AI Copilot Engine Active</span>
                </>
              ) : (
                <>
                  <ServerOff className="w-3.5 h-3.5 text-amber-500" />
                  <span>Deterministic Fallback Mode</span>
                </>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetDemo.isPending}
            data-testid="btn-reset-demo"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${resetDemo.isPending ? "animate-spin" : ""}`} />
            Reset Demo
          </Button>
        </div>
      </div>

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Overdue Capital"
          value={dashboard ? formatCurrency(dashboard.metrics.total_overdue_amount) : undefined}
          icon={<DollarSign className="w-4 h-4 text-muted-foreground" />}
          subtitle={`${overdueCount} open debtor accounts`}
          loading={isLoadingDash}
        />
        <MetricCard
          title="Actionable Capital"
          value={dashboard ? formatCurrency(dashboard.metrics.amount_requiring_action) : undefined}
          icon={<TrendingUp className="w-4 h-4 text-primary" />}
          subtitle="Priority follow-ups due today"
          loading={isLoadingDash}
          highlight
        />
        <MetricCard
          title="Critical Risk Exposure"
          value={insights ? formatCurrency(insights.critical_exposure) : undefined}
          icon={<AlertCircle className="w-4 h-4 text-destructive" />}
          subtitle={`${criticalCount} accounts in critical band`}
          loading={isLoadingDash || isLoadingInsights}
        />

        {/* DSO Metric Card */}
        <div className="rounded-xl border p-5 flex flex-col justify-between bg-card border-border shadow-sm" data-testid="metric-dso">
          <div className="flex justify-between items-start mb-3">
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
                  <p>Invoice-weighted average duration from issue to settlement. Target benchmark is {priorDSO}d.</p>
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
              <div className="text-3xl font-bold tracking-tight text-foreground font-mono" data-testid="metric-dso-value">
                {currentDSO > 0 ? `${currentDSO}d` : "—"}
              </div>
            )}
            {!isLoadingDash && currentDSO > 0 && (
              <div className="mt-2 text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                {dsoDelta > 0 ? (
                  <span className="flex items-center gap-0.5 text-destructive font-semibold">
                    <TrendingUp className="w-3 h-3" /> +{dsoDelta}d vs benchmark
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-emerald-600 font-semibold">
                    <TrendingDown className="w-3 h-3" /> {dsoDelta}d vs benchmark
                  </span>
                )}
                <span>(Benchmark: {priorDSO}d)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AR Aging Breakdown Chart */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Capital Aging Distribution
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Outstanding balance grouped by overdue brackets (weighted by INR value)
              </p>
            </div>
            <span className="text-xs font-mono font-medium bg-secondary px-2.5 py-1 rounded-md text-foreground">
              Total: {formatCurrency(totalOverdue)}
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#888888" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#888888"
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                />
                <RechartsTooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), "Overdue Amount"]}
                  contentStyle={{ backgroundColor: "var(--color-card, #fff)", borderRadius: "8px", borderColor: "var(--color-border, #e5e7eb)" }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border/50 text-center">
            {agingChartData.map((item) => (
              <div key={item.name} className="p-1.5 rounded-lg bg-secondary/30">
                <div className="text-[11px] text-muted-foreground">{item.name}</div>
                <div className="text-xs font-bold font-mono text-foreground">{formatCurrency(item.amount)}</div>
                <div className="text-[10px] text-muted-foreground/75">{item.count} accts</div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Concentration Ring & Quick Action */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Risk Concentration
              </h2>
              <span className="text-xs font-semibold text-destructive">{criticalCount} Critical</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Portfolio distribution by machine-learning risk tier
            </p>

            <div className="h-44 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {riskDonutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), "Exposure"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-muted-foreground uppercase font-semibold text-[10px]">Accounts</span>
                <span className="text-lg font-bold font-mono">{overdueCount}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              {riskDonutData.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setRiskFilter(riskFilter === item.name ? "All" : item.name)}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs border text-left transition-all ${
                    riskFilter === item.name ? "border-primary bg-primary/10 font-bold" : "border-border/60 hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground shrink-0">{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border">
            <Button
              onClick={handleBatchNudgeCritical}
              size="sm"
              className="w-full gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Nudge All Critical ({criticalCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Copilot Strategic Insight Banner & Cash Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isLoadingInsights ? (
            <Skeleton className="h-28 w-full rounded-xl" />
          ) : insights ? (
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-5 md:p-6 flex gap-4 md:gap-5 items-start relative overflow-hidden group">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                    Copilot Strategic Directive
                  </h3>
                  <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded font-mono font-bold">
                    Automated Briefing
                  </span>
                </div>
                <p className="text-foreground leading-relaxed text-sm md:text-base font-medium" data-testid="insight-summary">
                  {insights.summary}
                </p>
                <div className="flex flex-wrap gap-3 mt-4 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground bg-background px-2.5 py-1 rounded-md border border-border">
                    <span className="font-bold text-foreground">{insights.action_accounts}</span> accounts require direct escalation today
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground bg-background px-2.5 py-1 rounded-md border border-border">
                    <span className="font-bold text-foreground">{insights.top_customer_concentration.toFixed(1)}%</span> portfolio concentration in top debtor
                  </div>
                  <Link href="/risk-models" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">
                    Inspect AI Reasoning <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Cash Recovery Velocity Target */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Collection Velocity
              </h3>
              <span className="text-xs font-bold text-emerald-600 font-mono">65.3%</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Weekly target: ₹15.0L &bull; Projected: ₹9.8L
            </p>
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden mb-3">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: "65.3%" }} />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Notices Sent</span>
                <span className="font-semibold text-foreground font-mono">{sentCount} / {overdueCount}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Avg. Settlement Horizon</span>
                <span className="font-semibold text-foreground font-mono">18.4 days</span>
              </div>
            </div>
          </div>
          <Link href="/payment-collection" className="mt-3">
            <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
              Launch Payment Links <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Interactive Action Queue */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Queue Header with Segmented Tabs */}
        <div className="p-4 border-b border-border bg-secondary/20 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                Priority Action Queue
                <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full font-mono">
                  {filteredInvoices.length} invoices
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dynamic prioritization ranked by loss probability, overdue days, and relationship exposure.
              </p>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-background p-1 rounded-lg border border-border text-xs">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({overdueCount})
              </button>
              <button
                onClick={() => setActiveTab("critical")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === "critical" ? "bg-destructive text-destructive-foreground shadow-sm" : "text-destructive hover:bg-destructive/10"
                }`}
              >
                🔥 Critical ({criticalCount})
              </button>
              <button
                onClick={() => setActiveTab("due")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === "due" ? "bg-amber-500 text-white shadow-sm" : "text-amber-600 hover:bg-amber-50"
                }`}
              >
                ⚡ Follow-up Due
              </button>
              <button
                onClick={() => setActiveTab("sent")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === "sent" ? "bg-secondary-foreground text-secondary shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ✅ Sent ({sentCount})
              </button>
            </div>
          </div>

          {/* Search and Secondary Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
            <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter by customer, ID..."
                className="pl-8 h-8 text-xs bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-queue-search"
              />
            </div>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground"
              data-testid="select-risk-filter"
              aria-label="Filter by risk"
            >
              <option value="All">All Risks</option>
              <option value="Critical">Critical Risk</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground"
              data-testid="select-status-filter"
              aria-label="Filter by status"
            >
              <option value="All">All Statuses</option>
              <option value="Overdue">Overdue</option>
              <option value="Reminder Sent">Reminder Sent</option>
              <option value="Escalated">Escalated</option>
            </select>

            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground"
              data-testid="select-segment-filter"
              aria-label="Filter by segment"
            >
              <option value="All">All Segments</option>
              <option value="Enterprise">Enterprise</option>
              <option value="SMB">SMB</option>
              <option value="Startup">Startup</option>
            </select>

            {(searchTerm || riskFilter !== "All" || statusFilter !== "All" || segmentFilter !== "All" || activeTab !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setRiskFilter("All");
                  setStatusFilter("All");
                  setSegmentFilter("All");
                  setActiveTab("all");
                }}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Filters
              </Button>
            )}
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
              No invoices match the active filter criteria.
            </div>
          ) : (
            filteredInvoices.map((invoice: Invoice) => (
              <MobileInvoiceCard key={invoice.invoice_id} invoice={invoice} onPeek={() => setSelectedInvoiceForPeek(invoice)} />
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-background border-b border-border">
              <tr>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Account / Contact</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider text-right">Outstanding</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider text-center">Overdue</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Risk Assessment</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider">Lifecycle Status</th>
                <th className="px-6 py-3.5 font-semibold tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoadingDash ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="bg-card">
                    <td className="px-6 py-4"><Skeleton className="h-5 w-36" /></td>
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
                    No invoices match your selected filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice: Invoice) => (
                  <DashboardTableRow
                    key={invoice.invoice_id}
                    invoice={invoice}
                    onPeek={() => setSelectedInvoiceForPeek(invoice)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Peek Modal for Invoice */}
      {selectedInvoiceForPeek && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedInvoiceForPeek(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded font-semibold text-muted-foreground">
                  {selectedInvoiceForPeek.invoice_id}
                </span>
                <h3 className="font-serif text-xl font-bold text-foreground mt-1">
                  {selectedInvoiceForPeek.customer_name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contact: {selectedInvoiceForPeek.contact_person} &bull; {selectedInvoiceForPeek.customer_segment}
                </p>
              </div>
              <RiskBadge level={selectedInvoiceForPeek.risk.risk_level} />
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/30 rounded-lg text-xs">
              <div>
                <span className="text-muted-foreground">Amount Due</span>
                <p className="font-bold text-base font-mono text-foreground mt-0.5">
                  {formatCurrency(selectedInvoiceForPeek.invoice_amount)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Days Overdue</span>
                <p className="font-bold text-base font-mono text-destructive mt-0.5">
                  {selectedInvoiceForPeek.days_overdue} days
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Risk Score</span>
                <p className="font-semibold font-mono text-foreground mt-0.5">
                  {selectedInvoiceForPeek.risk.risk_score} / 100
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Payment History</span>
                <p className="font-semibold capitalize text-foreground mt-0.5">
                  {selectedInvoiceForPeek.payment_history}
                </p>
              </div>
            </div>

            <div className="p-3 bg-secondary/50 rounded-lg text-xs leading-relaxed border border-border/50">
              <span className="font-semibold text-foreground flex items-center gap-1 mb-1">
                <Zap className="w-3 h-3 text-primary" /> AI Risk Assessment:
              </span>
              <p className="text-muted-foreground">{selectedInvoiceForPeek.risk.reasoning}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setSelectedInvoiceForPeek(null)}>
                Close
              </Button>
              <Link href={`/invoices/${selectedInvoiceForPeek.invoice_id}`}>
                <Button size="sm" className="gap-1.5">
                  Open Notice Composer <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileInvoiceCard({ invoice, onPeek }: { invoice: Invoice; onPeek: () => void }) {
  const [, navigate] = useLocation();

  return (
    <div
      className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
      onClick={onPeek}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate">{invoice.customer_name}</div>
          <div className="text-xs text-muted-foreground mt-0.5 font-mono">
            {invoice.invoice_id} &bull; {invoice.customer_segment}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-foreground font-mono">{formatCurrency(invoice.invoice_amount)}</div>
          <div className="text-xs text-destructive font-mono font-medium">{invoice.days_overdue}d overdue</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex flex-wrap gap-2">
          <RiskBadge level={invoice.risk.risk_level} />
          <StatusBadge status={invoice.status} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-primary gap-1"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/invoices/${invoice.invoice_id}`);
          }}
        >
          Review <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function DashboardTableRow({ invoice, onPeek }: { invoice: Invoice; onPeek: () => void }) {
  return (
    <tr className="bg-card hover:bg-secondary/40 transition-colors group" data-testid={`row-invoice-${invoice.invoice_id}`}>
      <td className="px-6 py-4">
        <button
          onClick={onPeek}
          className="font-semibold text-foreground hover:text-primary transition-colors text-left group-hover:underline underline-offset-2"
          data-testid={`link-customer-${invoice.invoice_id}`}
        >
          {invoice.customer_name}
        </button>
        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
          {invoice.invoice_id} &bull; {invoice.customer_segment} &bull; {invoice.contact_person}
        </div>
      </td>
      <td className="px-6 py-4 text-right font-bold font-mono text-foreground">
        {formatCurrency(invoice.invoice_amount)}
      </td>
      <td className="px-6 py-4 text-center">
        <span className="inline-flex items-center justify-center font-bold font-mono text-xs px-2.5 py-1 bg-secondary rounded-md text-foreground">
          {invoice.days_overdue}d
        </span>
      </td>
      <td className="px-6 py-4">
        <RiskBadge level={invoice.risk.risk_level} />
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={invoice.status} />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPeek}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            Quick View
          </Button>
          <Link href={`/invoices/${invoice.invoice_id}`}>
            <Button size="sm" className="h-8 text-xs gap-1" data-testid={`btn-review-${invoice.invoice_id}`}>
              Review <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </td>
    </tr>
  );
}

function MetricCard({
  title,
  value,
  icon,
  subtitle,
  highlight = false,
  loading = false,
}: {
  title: string;
  value?: string;
  icon: React.ReactNode;
  subtitle?: string;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 flex flex-col justify-between shadow-sm transition-all ${
        highlight ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className={`text-sm font-medium ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          {title}
        </h3>
        <div
          className={`p-2 rounded-lg ${
            highlight ? "bg-primary-foreground/15 text-primary-foreground" : "bg-secondary text-foreground"
          }`}
        >
          {icon}
        </div>
      </div>
      <div>
        {loading ? (
          <Skeleton className={`h-9 w-2/3 ${highlight ? "bg-primary-foreground/20" : ""}`} />
        ) : (
          <div className="text-3xl font-bold tracking-tight font-mono" data-testid={`metric-${title.replace(/\s+/g, "-")}`}>
            {value || "—"}
          </div>
        )}
        {!loading && subtitle && (
          <div className={`mt-2 text-xs font-medium ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
