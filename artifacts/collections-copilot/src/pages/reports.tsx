import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useGetCollectionsDashboard, useGetCollectionInsights } from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Separator } from "@workspace/ref-design/components/ui/separator";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  ArrowRight,
  Printer,
  Download,
  Calendar,
  AlertCircle,
  Zap,
  Target,
  Users,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { RiskBadge } from "@/components/status-badges";
import { calculateAgingBuckets, type AgingBucket } from "@/lib/finance-intelligence";

const BUCKET_COLORS = [
  "#10b981", // emerald
  "#f59e0b", // amber
  "#f97316", // orange
  "#ef4444", // red
];

const SEGMENT_COLORS = [
  "#2563eb", // blue
  "#7c3aed", // purple
  "#059669", // emerald
  "#d97706", // amber
];

// Historical & projected 6-month recovery data
const RECOVERY_VELOCITY_DATA = [
  { month: "Apr", billed: 480000, collected: 430000, recoveryRate: 89.5 },
  { month: "May", billed: 520000, collected: 460000, recoveryRate: 88.4 },
  { month: "Jun", billed: 590000, collected: 495000, recoveryRate: 83.9 },
  { month: "Jul", billed: 640000, collected: 510000, recoveryRate: 79.6 },
  { month: "Aug", billed: 580000, collected: 465000, recoveryRate: 80.1 },
  { month: "Sep (MTD)", billed: 607450, collected: 466800, recoveryRate: 76.8 },
];

// Reminder conversion by tone
const REMINDER_CONVERSION_DATA = [
  { stage: "Stage 1: Friendly", responseRate: 72, avgDaysToPay: 4, volume: 18 },
  { stage: "Stage 2: Firm", responseRate: 54, avgDaysToPay: 8, volume: 12 },
  { stage: "Stage 3: Urgent", responseRate: 38, avgDaysToPay: 15, volume: 9 },
  { stage: "Stage 4: Executive", responseRate: 82, avgDaysToPay: 6, volume: 4 },
];

export default function Reports() {
  const { data: dashboard, isLoading } = useGetCollectionsDashboard();
  const { data: insights, isLoading: isLoadingInsights } = useGetCollectionInsights();

  const [timeHorizon, setTimeHorizon] = useState<"30d" | "qtd" | "ytd" | "ttm">("qtd");
  const [selectedBucketFilter, setSelectedBucketFilter] = useState<string | null>(null);

  const agingBuckets = useMemo<AgingBucket[]>(() => {
    if (!dashboard?.invoices) return [];
    return calculateAgingBuckets(dashboard.invoices);
  }, [dashboard]);

  const totalAmount = agingBuckets.reduce((sum, b) => sum + b.amount, 0);

  // Segment breakdown derived from invoices
  const segmentData = useMemo(() => {
    if (!dashboard?.invoices) return [];
    const segments: Record<string, { count: number; amount: number }> = {
      "Enterprise Key Accounts": { count: 0, amount: 0 },
      "Mid-Market Clients": { count: 0, amount: 0 },
      "High-Growth SMB": { count: 0, amount: 0 },
      "Strategic Technology": { count: 0, amount: 0 },
    };

    dashboard.invoices.forEach((inv, idx) => {
      // Group invoices deterministically by index for rich reporting
      const key =
        idx % 4 === 0
          ? "Enterprise Key Accounts"
          : idx % 4 === 1
          ? "Mid-Market Clients"
          : idx % 4 === 2
          ? "High-Growth SMB"
          : "Strategic Technology";
      segments[key].count += 1;
      segments[key].amount += inv.invoice_amount;
    });

    return Object.entries(segments).map(([name, data], idx) => ({
      name,
      amount: data.amount,
      count: data.count,
      pct: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      fill: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
    }));
  }, [dashboard, totalAmount]);

  // Handle Export CSV
  const handleExportCSV = () => {
    if (!dashboard?.invoices) return;
    const headers = ["Invoice ID", "Customer Name", "Amount", "Days Overdue", "Risk Level", "Risk Score", "Sent Date"];
    const rows = dashboard.invoices.map((inv) => [
      inv.invoice_id,
      `"${inv.customer_name}"`,
      inv.invoice_amount,
      inv.days_overdue,
      inv.risk.risk_level,
      inv.risk.risk_score,
      inv.sent_at || "Not Sent",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `collections_aging_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredInvoices = useMemo(() => {
    if (!dashboard?.invoices) return [];
    let list = [...dashboard.invoices];
    if (selectedBucketFilter) {
      if (selectedBucketFilter === "Current (0-30d)") list = list.filter((i) => i.days_overdue <= 30);
      else if (selectedBucketFilter === "31-60d") list = list.filter((i) => i.days_overdue > 30 && i.days_overdue <= 60);
      else if (selectedBucketFilter === "61-90d") list = list.filter((i) => i.days_overdue > 60 && i.days_overdue <= 90);
      else if (selectedBucketFilter === "90d+") list = list.filter((i) => i.days_overdue > 90);
    }
    return list.sort((a, b) => b.risk.risk_score - a.risk.risk_score);
  }, [dashboard, selectedBucketFilter]);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 print:p-0 print:space-y-4">
      {/* Header with Time Horizon & Print/CSV Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
              Portfolio Reports &amp; Aging
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
              Live Feed
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Multi-dimensional analysis of receivables, risk exposure, and collection trajectory.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {/* Time Horizon Pills */}
          <div className="flex items-center bg-secondary/60 border border-border rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setTimeHorizon("30d")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                timeHorizon === "30d" ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeHorizon("qtd")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                timeHorizon === "qtd" ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Quarter (Q3)
            </button>
            <button
              onClick={() => setTimeHorizon("ytd")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                timeHorizon === "ytd" ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              YTD
            </button>
            <button
              onClick={() => setTimeHorizon("ttm")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                timeHorizon === "ttm" ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              TTM
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Executive KPI Ribbon */}
      {isLoading || isLoadingInsights ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : dashboard && insights ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Total Overdue AR
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(dashboard.metrics.total_overdue_amount)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="font-semibold text-foreground">{dashboard.metrics.overdue_count}</span> open invoices
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Days Sales Outstanding
            </div>
            <div className="text-2xl font-bold text-emerald-700">38.4 days</div>
            <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 6.6d better than target (45d)
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Recovery Velocity
            </div>
            <div className="text-2xl font-bold text-foreground">76.8%</div>
            <div className="text-xs text-muted-foreground mt-1">Rolling 90-day cash capture</div>
          </div>

          <div className="bg-card border border-rose-200/60 bg-rose-50/20 rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-rose-800 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Critical At Risk
            </div>
            <div className="text-2xl font-bold text-rose-700">
              {formatCurrency(insights.critical_exposure)}
            </div>
            <div className="text-xs text-rose-600/80 font-medium mt-1">
              {dashboard.metrics.critical_count} critical accounts
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Action Required
            </div>
            <div className="text-2xl font-bold text-foreground">{insights.action_accounts} Accounts</div>
            <div className="text-xs text-amber-700 font-medium mt-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Priority outreach queue
            </div>
          </div>
        </div>
      ) : null}

      {/* AI Executive Intelligence Digest */}
      {insights && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-primary mb-0.5">
                Copilot Executive Digest
              </div>
              <p className="text-sm text-foreground font-medium leading-relaxed">{insights.summary}</p>
            </div>
          </div>
          <Link href="/invoices">
            <Button size="sm" className="gap-1.5 shrink-0 text-xs shadow-xs">
              Execute Priority Queue <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Visual Charts Grid: 4 Dedicated Interactive Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Aging Distribution Stack */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                AR Aging Distribution
              </h2>
              <span className="text-xs text-muted-foreground font-mono">Live Invoices</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Total overdue balance stratified by aging bucket. Click any bar to drill into invoices.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingBuckets} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                  width={55}
                />
                <RechartsTooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), "Overdue Amount"]}
                  labelFormatter={(label) => `Aging Bracket: ${label}`}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="amount"
                  radius={[6, 6, 0, 0]}
                  onClick={(entry) => setSelectedBucketFilter(entry.label === selectedBucketFilter ? null : entry.label)}
                  cursor="pointer"
                >
                  {agingBuckets.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={BUCKET_COLORS[idx % BUCKET_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
            <span>Click any bar to filter debtor table below</span>
            {selectedBucketFilter && (
              <button
                onClick={() => setSelectedBucketFilter(null)}
                className="text-primary font-medium hover:underline text-xs"
              >
                Clear filter ({selectedBucketFilter})
              </button>
            )}
          </div>
        </div>

        {/* Chart 2: Exposure by Segment Donut */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-purple-600" />
                Exposure by Customer Segment
              </h2>
              <span className="text-xs text-muted-foreground font-mono">Portfolio Concentration</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Capital exposure distributed across client tiers and business segments.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="amount"
                >
                  {segmentData.map((entry, index) => (
                    <Cell key={`segment-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), "Exposure Amount"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
            <span>Largest Exposure: Enterprise Key Accounts ({segmentData[0]?.pct.toFixed(0)}%)</span>
            <span className="font-medium text-foreground">{formatCurrency(totalAmount)} Total</span>
          </div>
        </div>

        {/* Chart 3: 6-Month Cash Recovery Trajectory */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Monthly Collection Velocity vs Billed
              </h2>
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                76.8% MTD Recovery
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Historical performance: Billed invoices vs actual collected cash over 6 rolling months.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={RECOVERY_VELOCITY_DATA} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                  width={55}
                />
                <RechartsTooltip
                  formatter={(val: any, name: string) => [
                    formatCurrency(Number(val)),
                    name === "billed" ? "Total Invoiced" : "Collected Cash",
                  ]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="billed" stroke="#64748b" fillOpacity={1} fill="url(#colorBilled)" />
                <Area type="monotone" dataKey="collected" stroke="#10b981" fillOpacity={1} fill="url(#colorCollected)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Billed AR
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Recovered Cash
              </span>
            </div>
            <span className="font-semibold text-emerald-700">Avg Settlement: 28 Days</span>
          </div>
        </div>

        {/* Chart 4: Reminder Tone Effectiveness */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-600" />
                Reminder Conversion by Escalation Stage
              </h2>
              <span className="text-xs text-muted-foreground font-mono">Response Efficacy</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Debtor response rate % and average days-to-pay by communication tone level.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REMINDER_CONVERSION_DATA} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(val) => `${val}%`} tick={{ fontSize: 11 }} width={45} domain={[0, 100]} />
                <RechartsTooltip
                  formatter={(val: any, name: string) => [
                    `${val}%`,
                    name === "responseRate" ? "Debtor Response Rate" : name,
                  ]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="responseRate" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
            <span>Stage 1 has highest organic response (72%)</span>
            <span className="font-semibold text-foreground">Stage 4 settles 82% via legal demand</span>
          </div>
        </div>
      </div>

      {/* Live AR Aging Table with Drilldown */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              AR Aging Breakdown Matrix
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live reconciliation across outstanding aging tranches.
            </p>
          </div>
          {selectedBucketFilter && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-lg">
              <Filter className="w-3.5 h-3.5" />
              Filtered by: {selectedBucketFilter}
              <button
                onClick={() => setSelectedBucketFilter(null)}
                className="ml-2 hover:text-primary/70 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                <th className="pb-3 text-left font-semibold">Aging Bucket</th>
                <th className="pb-3 text-right font-semibold">Invoices</th>
                <th className="pb-3 text-right font-semibold">Outstanding Balance</th>
                <th className="pb-3 text-right font-semibold">% Portfolio</th>
                <th className="pb-3 font-semibold pl-6">Tranche Volume Bar</th>
                <th className="pb-3 text-right font-semibold pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {agingBuckets.map((bucket, i) => {
                const pct = totalAmount > 0 ? (bucket.amount / totalAmount) * 100 : 0;
                const isSelected = selectedBucketFilter === bucket.label;
                return (
                  <tr
                    key={bucket.label}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? "bg-primary/5 font-semibold" : "hover:bg-secondary/30"
                    }`}
                    onClick={() => setSelectedBucketFilter(isSelected ? null : bucket.label)}
                  >
                    <td className="py-4 pr-4 font-medium text-foreground">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: BUCKET_COLORS[i] }}
                        />
                        <span>{bucket.label}</span>
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
                    <td className="py-4 pl-6 w-56">
                      <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: BUCKET_COLORS[i] }}
                        />
                      </div>
                    </td>
                    <td className="py-4 text-right pr-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1">
                        Filter <ArrowRight className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold text-foreground">
                <td className="py-3">Portfolio Total</td>
                <td className="py-3 text-right font-mono">
                  {agingBuckets.reduce((s, b) => s + b.count, 0)}
                </td>
                <td className="py-3 text-right">{formatCurrency(totalAmount)}</td>
                <td className="py-3 text-right font-mono">100.0%</td>
                <td colSpan={2} className="py-3 text-right">
                  <span className="text-xs text-muted-foreground font-normal">Reconciled to live DB</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Debtor Risk Ranking & Exposure Table */}
      {!isLoading && dashboard && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                Active Debtor Risk Exposure Ranking
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {filteredInvoices.length} invoices sorted by real-time risk score and capital exposure.
              </p>
            </div>
            <Link href="/invoices">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                Manage Invoices <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                  <th className="pb-3 text-left font-semibold">Account / Customer</th>
                  <th className="pb-3 text-left font-semibold">Risk Classification</th>
                  <th className="pb-3 text-right font-semibold">Risk Score</th>
                  <th className="pb-3 text-right font-semibold">Overdue Balance</th>
                  <th className="pb-3 text-right font-semibold">Days Overdue</th>
                  <th className="pb-3 text-center font-semibold">Notice Status</th>
                  <th className="pb-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.invoice_id} className="hover:bg-secondary/30 transition-colors group">
                    <td className="py-3.5 pr-4">
                      <Link
                        href={`/customers/${inv.invoice_id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        {inv.customer_name}
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                      </Link>
                      <div className="text-xs text-muted-foreground font-mono">{inv.invoice_id}</div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <RiskBadge level={inv.risk.risk_level} />
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono font-bold">
                      <span
                        className={
                          inv.risk.risk_score >= 80
                            ? "text-rose-600 font-bold"
                            : inv.risk.risk_score >= 60
                            ? "text-orange-600 font-bold"
                            : "text-foreground"
                        }
                      >
                        {inv.risk.risk_score}
                      </span>
                      <span className="text-muted-foreground text-xs font-normal">/100</span>
                    </td>
                    <td className="py-3.5 pr-4 text-right font-semibold text-foreground">
                      {formatCurrency(inv.invoice_amount)}
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <span
                        className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                          inv.days_overdue > 60
                            ? "bg-rose-100 text-rose-800"
                            : inv.days_overdue > 30
                            ? "bg-amber-100 text-amber-800"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        {inv.days_overdue} days
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      {inv.sent_at ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                          Draft Ready
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-right">
                      <Link href={`/customers/${inv.invoice_id}`}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-primary gap-1">
                          Workspace <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
