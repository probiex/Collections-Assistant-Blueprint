import { useState, useMemo, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetCollectionsDashboard,
  useBulkCollectionInvoiceAction,
  getGetCollectionsDashboardQueryKey,
  getGetCollectionMessageHistoryQueryKey,
  Invoice,
  RiskResultRiskLevel,
  InvoiceStatus,
  BulkInvoiceActionInputAction,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ArrowRight,
  X,
  Calendar,
  ShieldAlert,
  Building,
  ArrowUp,
  ArrowDown,
  Send,
  RefreshCw,
  AlertTriangle,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  Download,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  User,
  ExternalLink,
} from "lucide-react";
import { Input } from "@workspace/ref-design/components/ui/input";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Checkbox } from "@workspace/ref-design/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ref-design/components/ui/alert-dialog";
import { RiskBadge, StatusBadge } from "@/components/status-badges";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@workspace/ref-design/hooks/use-toast";

type SortField = "customer_name" | "invoice_amount" | "days_overdue" | "risk_score" | "due_date";
type SortOrder = "asc" | "desc";
type ViewMode = "table" | "kanban";

const AGING_BUCKETS = [
  { label: "All Ages", value: "all" },
  { label: "1–14 days", value: "1-14" },
  { label: "15–30 days", value: "15-30" },
  { label: "31–60 days", value: "31-60" },
  { label: "60+ days", value: "60+" },
];

function agingMatch(days: number, bucket: string): boolean {
  if (bucket === "all") return true;
  if (bucket === "1-14") return days >= 1 && days <= 14;
  if (bucket === "15-30") return days >= 15 && days <= 30;
  if (bucket === "31-60") return days >= 31 && days <= 60;
  if (bucket === "60+") return days > 60;
  return true;
}

export default function Invoices() {
  const { data: dashboard, isLoading } = useGetCollectionsDashboard();
  const bulkAction = useBulkCollectionInvoiceAction();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [riskFilter, setRiskFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [segmentFilter, setSegmentFilter] = useState<string>("All");
  const [agingFilter, setAgingFilter] = useState<string>("all");
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("days_overdue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = useMemo(() => {
    if (!dashboard?.invoices) return [];
    const term = searchTerm.toLowerCase();
    const minAmt = amountMin ? Number(amountMin) : undefined;
    const maxAmt = amountMax ? Number(amountMax) : undefined;

    let filtered = dashboard.invoices.filter((inv) => {
      const matchSearch =
        !term ||
        inv.customer_name.toLowerCase().includes(term) ||
        inv.invoice_id.toLowerCase().includes(term);
      const matchRisk = riskFilter === "All" || inv.risk.risk_level === riskFilter;
      const matchStatus = statusFilter === "All" || inv.status === statusFilter;
      const matchSegment = segmentFilter === "All" || inv.customer_segment === segmentFilter;
      const matchAging = agingMatch(inv.days_overdue, agingFilter);
      const matchAmountMin = minAmt === undefined || inv.invoice_amount >= minAmt;
      const matchAmountMax = maxAmt === undefined || inv.invoice_amount <= maxAmt;
      return (
        matchSearch &&
        matchRisk &&
        matchStatus &&
        matchSegment &&
        matchAging &&
        matchAmountMin &&
        matchAmountMax
      );
    });

    filtered.sort((a, b) => {
      let valA: number | string =
        sortField === "risk_score"
          ? a.risk.risk_score
          : sortField === "due_date"
          ? new Date(a.due_date).getTime()
          : (a[sortField as keyof Invoice] as number | string);
      let valB: number | string =
        sortField === "risk_score"
          ? b.risk.risk_score
          : sortField === "due_date"
          ? new Date(b.due_date).getTime()
          : (b[sortField as keyof Invoice] as number | string);
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    dashboard,
    searchTerm,
    riskFilter,
    statusFilter,
    segmentFilter,
    agingFilter,
    amountMin,
    amountMax,
    sortField,
    sortOrder,
  ]);

  const activeFiltersCount =
    (riskFilter !== "All" ? 1 : 0) +
    (statusFilter !== "All" ? 1 : 0) +
    (segmentFilter !== "All" ? 1 : 0) +
    (agingFilter !== "all" ? 1 : 0) +
    (amountMin ? 1 : 0) +
    (amountMax ? 1 : 0) +
    (searchTerm ? 1 : 0);

  const handleClearFilters = () => {
    setSearchTerm("");
    setRiskFilter("All");
    setStatusFilter("All");
    setSegmentFilter("All");
    setAgingFilter("all");
    setAmountMin("");
    setAmountMax("");
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Selection logic
  const visibleIds = filteredInvoices.map((i) => i.invoice_id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));
  const selectedCount = [...selectedIds].filter((id) => visibleIds.includes(id)).length;

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const executeBulk = useCallback(
    (action: BulkInvoiceActionInputAction, label: string) => {
      const ids = [...selectedIds].filter((id) => visibleIds.includes(id));
      if (ids.length === 0) return;
      bulkAction.mutate(
        { data: { invoice_ids: ids, action } },
        {
          onSuccess: (result) => {
            queryClient.setQueryData(
              getGetCollectionsDashboardQueryKey(),
              (old: any) => {
                if (!old) return old;
                const updatedMap = new Map(result.invoices.map((inv) => [inv.invoice_id, inv]));
                return {
                  ...old,
                  invoices: old.invoices.map((inv: Invoice) =>
                    updatedMap.has(inv.invoice_id) ? updatedMap.get(inv.invoice_id)! : inv
                  ),
                };
              }
            );
            queryClient.invalidateQueries({
              queryKey: getGetCollectionMessageHistoryQueryKey(),
            });
            setSelectedIds(new Set());
            toast({
              title: `${label}: ${result.updated_count} updated, ${result.skipped_count} skipped`,
            });
          },
          onError: () => toast({ title: `Bulk ${label.toLowerCase()} failed`, variant: "destructive" }),
        }
      );
    },
    [selectedIds, visibleIds, bulkAction, queryClient]
  );

  const handleExportSelectedCSV = () => {
    const ids = selectedIds.size > 0 ? [...selectedIds] : visibleIds;
    const targetInvoices = (dashboard?.invoices || []).filter((inv) => ids.includes(inv.invoice_id));

    const headers = [
      "Invoice ID",
      "Customer Name",
      "Segment",
      "Amount (INR)",
      "Due Date",
      "Days Overdue",
      "Risk Level",
      "Risk Score",
      "Status",
      "Contact Person",
    ];

    const rows = targetInvoices.map((inv) => [
      inv.invoice_id,
      `"${inv.customer_name.replace(/"/g, '""')}"`,
      inv.customer_segment,
      inv.invoice_amount,
      inv.due_date,
      inv.days_overdue,
      inv.risk.risk_level,
      inv.risk.risk_score,
      inv.status,
      `"${inv.contact_person}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: `Exported ${targetInvoices.length} invoices to CSV` });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return (
        <ArrowUp className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      );
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3 h-3 text-primary" />
    ) : (
      <ArrowDown className="w-3 h-3 text-primary" />
    );
  };

  // KPIs
  const totalAmount = dashboard?.metrics.total_overdue_amount ?? 0;
  const criticalCount = dashboard?.metrics.critical_count ?? 0;
  const avgDaysOverdue = useMemo(() => {
    if (!dashboard?.invoices || dashboard.invoices.length === 0) return 0;
    const sum = dashboard.invoices.reduce((acc, inv) => acc + inv.days_overdue, 0);
    return Math.round(sum / dashboard.invoices.length);
  }, [dashboard]);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Top Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
            Invoices Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track receivables, inspect risk scores, and execute batch collection workflows.
          </p>
        </div>

        {/* View Switcher and Quick Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-secondary/60 p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "kanban"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Risk Kanban
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportSelectedCSV} className="gap-1.5 text-xs h-9">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
            <span>Total Receivables</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{formatCurrency(totalAmount)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{dashboard?.metrics.overdue_count ?? 0} active accounts</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
            <span>Critical Exposure</span>
            <ShieldAlert className="w-4 h-4 text-destructive" />
          </div>
          <div className="text-2xl font-bold font-mono text-destructive">{criticalCount} accounts</div>
          <div className="text-[11px] text-muted-foreground mt-1">Requiring legal/senior escalation</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
            <span>Average Overdue</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{avgDaysOverdue} days</div>
          <div className="text-[11px] text-muted-foreground mt-1">Weighted across portfolio</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-1">
            <span>Collection Efficiency</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">78.4%</div>
          <div className="text-[11px] text-muted-foreground mt-1">+4.2% vs last month</div>
        </div>
      </div>

      {/* Main Workspace Card */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-border bg-secondary/20 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer name, invoice ID..."
                className="pl-9 h-9 text-xs bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-invoices-search"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                data-testid="select-invoices-risk"
                aria-label="Filter by risk"
              >
                <option value="All">All Risks</option>
                {Object.values(RiskResultRiskLevel).map((r) => (
                  <option key={r} value={r}>
                    {r} Risk
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                data-testid="select-invoices-status"
                aria-label="Filter by status"
              >
                <option value="All">All Statuses</option>
                {Object.values(InvoiceStatus).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                data-testid="select-invoices-segment"
                aria-label="Filter by segment"
              >
                <option value="All">All Segments</option>
                <option value="Enterprise">Enterprise</option>
                <option value="SMB">SMB</option>
                <option value="Startup">Startup</option>
              </select>

              <select
                value={agingFilter}
                onChange={(e) => setAgingFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                aria-label="Filter by aging"
              >
                {AGING_BUCKETS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>

          {/* Batch Actions Bar (Visible when rows selected) */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">{selectedCount} invoices selected</span>
                <span className="text-muted-foreground">across current view</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => executeBulk(BulkInvoiceActionInputAction.mark_sent, "Mark as Sent")}
                  disabled={bulkAction.isPending}
                >
                  <Send className="w-3 h-3" /> Batch Mark Sent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => executeBulk(BulkInvoiceActionInputAction.regenerate, "Regenerate Drafts")}
                  disabled={bulkAction.isPending}
                >
                  <RefreshCw className="w-3 h-3 text-primary" /> Batch Regenerate Drafts
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Deselect
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* VIEW 1: KANBAN BOARD VIEW */}
        {viewMode === "kanban" ? (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 bg-secondary/10 min-h-[500px]">
            {(["Low", "Medium", "High", "Critical"] as const).map((level) => {
              const columnInvoices = filteredInvoices.filter((i) => i.risk.risk_level === level);
              const columnTotal = columnInvoices.reduce((sum, i) => sum + i.invoice_amount, 0);

              return (
                <div key={level} className="flex flex-col rounded-xl bg-card border border-border/70 shadow-sm overflow-hidden">
                  <div className="p-3 border-b border-border bg-secondary/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          level === "Critical" ? "bg-red-500" :
                          level === "High" ? "bg-amber-500" :
                          level === "Medium" ? "bg-blue-500" : "bg-emerald-500"
                        }`}
                      />
                      <span className="font-bold text-xs text-foreground uppercase tracking-wide">
                        {level} Risk
                      </span>
                      <span className="text-[11px] font-mono bg-secondary px-1.5 py-0.2 rounded text-muted-foreground font-semibold">
                        {columnInvoices.length}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {formatCurrency(columnTotal)}
                    </span>
                  </div>

                  <div className="p-2 flex-1 overflow-y-auto space-y-2 max-h-[650px]">
                    {columnInvoices.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No {level.toLowerCase()} risk invoices
                      </div>
                    ) : (
                      columnInvoices.map((inv) => (
                        <div
                          key={inv.invoice_id}
                          className="p-3 rounded-lg bg-background border border-border/80 hover:border-primary/50 transition-all shadow-xs space-y-2 group cursor-pointer"
                          onClick={() => setPreviewInvoice(inv)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                                {inv.customer_name}
                              </h4>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {inv.invoice_id} &bull; {inv.customer_segment}
                              </div>
                            </div>
                            <span className="text-xs font-bold font-mono text-foreground shrink-0">
                              {formatCurrency(inv.invoice_amount)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border/40">
                            <span className="font-mono text-destructive font-bold">
                              {inv.days_overdue}d overdue
                            </span>
                            <StatusBadge status={inv.status} />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                            <span>{inv.contact_person}</span>
                            <Link
                              href={`/invoices/${inv.invoice_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5"
                            >
                              Notice <ArrowRight className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* VIEW 2: TABLE VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-muted-foreground uppercase bg-background border-b border-border">
                <tr>
                  <th className="w-10 px-4 py-3.5 text-center">
                    <Checkbox
                      checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all visible invoices"
                    />
                  </th>
                  <th
                    className="px-4 py-3.5 font-semibold tracking-wider cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort("customer_name")}
                  >
                    <div className="flex items-center gap-1">
                      Account / Customer <SortIcon field="customer_name" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3.5 font-semibold tracking-wider text-right cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort("invoice_amount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Amount <SortIcon field="invoice_amount" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3.5 font-semibold tracking-wider text-center cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort("days_overdue")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Aging <SortIcon field="days_overdue" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3.5 font-semibold tracking-wider cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort("due_date")}
                  >
                    <div className="flex items-center gap-1">
                      Due Date <SortIcon field="due_date" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3.5 font-semibold tracking-wider cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort("risk_score")}
                  >
                    <div className="flex items-center gap-1">
                      Risk Rating <SortIcon field="risk_score" />
                    </div>
                  </th>
                  <th className="px-4 py-3.5 font-semibold tracking-wider">Status</th>
                  <th className="px-4 py-3.5 font-semibold tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="bg-card">
                      <td className="px-4 py-4"><Skeleton className="h-4 w-4 mx-auto" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-36" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-24 ml-auto" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-16 mx-auto" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-20" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-20" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      No invoices match the active filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const isSelected = selectedIds.has(invoice.invoice_id);
                    return (
                      <tr
                        key={invoice.invoice_id}
                        className={`transition-colors group ${
                          isSelected ? "bg-primary/5 hover:bg-primary/10" : "bg-card hover:bg-secondary/40"
                        }`}
                      >
                        <td className="px-4 py-4 text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(invoice.invoice_id)}
                            aria-label={`Select ${invoice.customer_name}`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => setPreviewInvoice(invoice)}
                            className="font-semibold text-foreground hover:text-primary transition-colors text-left group-hover:underline underline-offset-2"
                          >
                            {invoice.customer_name}
                          </button>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 font-mono">
                            <span>{invoice.invoice_id}</span>
                            <span>&bull;</span>
                            <span>{invoice.customer_segment}</span>
                            <span>&bull;</span>
                            <span>{invoice.contact_person}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-bold font-mono text-foreground">
                            {formatCurrency(invoice.invoice_amount)}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {(invoice.amount_ratio * 100).toFixed(1)}% of volume
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center font-bold font-mono text-xs px-2.5 py-1 bg-secondary rounded-md text-foreground">
                            {invoice.days_overdue}d
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                          {new Date(invoice.due_date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <RiskBadge level={invoice.risk.risk_level} />
                            <span className="text-xs font-mono font-bold text-muted-foreground">
                              {invoice.risk.risk_score}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewInvoice(invoice)}
                              className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            >
                              Quick View
                            </Button>
                            <Link href={`/invoices/${invoice.invoice_id}`}>
                              <Button size="sm" className="h-8 text-xs gap-1">
                                Notice <ArrowRight className="w-3 h-3" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-out Invoice Quick Peek Modal */}
      {previewInvoice && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewInvoice(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded font-semibold text-muted-foreground">
                  {previewInvoice.invoice_id}
                </span>
                <h3 className="font-serif text-2xl font-bold text-foreground mt-1">
                  {previewInvoice.customer_name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span>{previewInvoice.customer_segment} Segment</span>
                  <span>&bull;</span>
                  <span>{previewInvoice.relationship_years} yrs relationship</span>
                </p>
              </div>
              <RiskBadge level={previewInvoice.risk.risk_level} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-secondary/30 rounded-lg text-xs">
              <div>
                <span className="text-muted-foreground">Amount Due</span>
                <p className="font-bold text-base font-mono text-foreground mt-0.5">
                  {formatCurrency(previewInvoice.invoice_amount)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Days Overdue</span>
                <p className="font-bold text-base font-mono text-destructive mt-0.5">
                  {previewInvoice.days_overdue} days
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Payment Terms</span>
                <p className="font-semibold text-foreground mt-0.5">
                  {previewInvoice.payment_terms}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Risk Score</span>
                <p className="font-semibold font-mono text-foreground mt-0.5">
                  {previewInvoice.risk.risk_score} / 100
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-secondary/40 rounded-lg border border-border/50">
                <span className="font-semibold text-foreground flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5 text-primary" /> Key Contact:
                </span>
                <p className="text-muted-foreground">
                  {previewInvoice.contact_person} &bull; Reminders dispatched: {previewInvoice.reminders_sent}
                </p>
              </div>

              <div className="p-3 bg-secondary/40 rounded-lg border border-border/50">
                <span className="font-semibold text-foreground flex items-center gap-1 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> AI Risk Assessment:
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  {previewInvoice.risk.reasoning}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Link href={`/customers/${previewInvoice.invoice_id}`} className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1">
                Open Customer 360 Workspace <ExternalLink className="w-3 h-3" />
              </Link>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewInvoice(null)}>
                  Close
                </Button>
                <Link href={`/invoices/${previewInvoice.invoice_id}`}>
                  <Button size="sm" className="gap-1.5">
                    Launch Notice Composer <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
