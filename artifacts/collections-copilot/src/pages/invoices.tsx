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
  InvoiceCustomerSegment,
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
  CheckSquare,
  Square,
  Minus,
  Send,
  RefreshCw,
  AlertTriangle,
  Filter,
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

const AGING_BUCKETS = [
  { label: "All", value: "all" },
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
  const [riskFilter, setRiskFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [segmentFilter, setSegmentFilter] = useState<string>("All");
  const [agingFilter, setAgingFilter] = useState<string>("all");
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("days_overdue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
            // Update dashboard cache with returned invoices
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return (
        <ArrowUp className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      );
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary" />
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Detailed portfolio view and collections workflow.
          </p>
        </div>
        <div className="text-sm text-muted-foreground font-medium bg-secondary/50 px-3 py-1.5 rounded-full border border-border">
          <span className="text-foreground font-bold">{filteredInvoices.length}</span> results found
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-border space-y-4 bg-secondary/10">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer or ID..."
                className="pl-9 h-10 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-invoices-search"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="h-10 rounded-full border border-input bg-background px-4 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
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
                className="h-10 rounded-full border border-input bg-background px-4 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
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
                className="h-10 rounded-full border border-input bg-background px-4 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                data-testid="select-invoices-segment"
                aria-label="Filter by segment"
              >
                <option value="All">All Segments</option>
                {Object.values(InvoiceCustomerSegment).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Second row: aging bucket + amount range */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {AGING_BUCKETS.map((b) => (
                <button
                  key={b.value}
                  onClick={() => setAgingFilter(b.value)}
                  className={`h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${
                    agingFilter === b.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:bg-secondary"
                  }`}
                  data-testid={`btn-aging-${b.value}`}
                  aria-pressed={agingFilter === b.value}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground font-medium">Amount:</span>
              <Input
                type="number"
                placeholder="Min"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                className="h-8 w-24 text-xs bg-background"
                data-testid="input-amount-min"
                aria-label="Minimum amount filter"
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="number"
                placeholder="Max"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                className="h-8 w-24 text-xs bg-background"
                data-testid="input-amount-max"
                aria-label="Maximum amount filter"
              />
            </div>
          </div>

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mr-1">
                Filters:
              </span>
              {searchTerm && (
                <FilterChip label={`Search: "${searchTerm}"`} onRemove={() => setSearchTerm("")} />
              )}
              {riskFilter !== "All" && (
                <FilterChip label={`Risk: ${riskFilter}`} onRemove={() => setRiskFilter("All")} />
              )}
              {statusFilter !== "All" && (
                <FilterChip
                  label={`Status: ${statusFilter}`}
                  onRemove={() => setStatusFilter("All")}
                />
              )}
              {segmentFilter !== "All" && (
                <FilterChip
                  label={`Segment: ${segmentFilter}`}
                  onRemove={() => setSegmentFilter("All")}
                />
              )}
              {agingFilter !== "all" && (
                <FilterChip
                  label={`Aging: ${AGING_BUCKETS.find((b) => b.value === agingFilter)?.label}`}
                  onRemove={() => setAgingFilter("all")}
                />
              )}
              {amountMin && (
                <FilterChip label={`Min: ${amountMin}`} onRemove={() => setAmountMin("")} />
              )}
              {amountMax && (
                <FilterChip label={`Max: ${amountMax}`} onRemove={() => setAmountMax("")} />
              )}
              <button
                onClick={handleClearFilters}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 ml-1"
                data-testid="btn-clear-filters"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Bulk action bar */}
        {selectedCount > 0 && (
          <div className="px-5 py-3 bg-primary/5 border-b border-primary/10 flex items-center gap-4 animate-in slide-in-from-top-2 duration-200">
            <span className="text-sm font-semibold text-primary">
              {selectedCount} {selectedCount === 1 ? "invoice" : "invoices"} selected
            </span>
            <div className="flex gap-2 flex-wrap">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={bulkAction.isPending}
                    data-testid="btn-bulk-mark-sent"
                  >
                    {bulkAction.isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Mark Sent
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark {selectedCount} invoice{selectedCount !== 1 ? "s" : ""} as sent?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the selected invoices as reminder-sent and record a sent action in message history. Invoices already sent will be skipped.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => executeBulk(BulkInvoiceActionInputAction.mark_sent, "Mark Sent")}
                    >
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={bulkAction.isPending}
                    data-testid="btn-bulk-regenerate"
                  >
                    {bulkAction.isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Regenerate Drafts
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate drafts for {selectedCount} invoice{selectedCount !== 1 ? "s" : ""}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will request a fresh AI-generated (or fallback) draft for each selected invoice. Current draft content will be replaced.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        executeBulk(BulkInvoiceActionInputAction.regenerate, "Regenerate Drafts")
                      }
                    >
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Mobile invoice cards */}
        <div className="divide-y divide-border md:hidden">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-3 p-5">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))
            : filteredInvoices.length === 0
            ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No invoices match these filters.
              </div>
            )
            : filteredInvoices.map((invoice: Invoice) => (
                <MobileInvoiceCard
                  key={invoice.invoice_id}
                  invoice={invoice}
                  isSelected={selectedIds.has(invoice.invoice_id)}
                  onToggleSelect={() => toggleRow(invoice.invoice_id)}
                />
              ))}
        </div>

        {/* Desktop data table */}
        <div className="hidden overflow-x-auto min-h-[400px] md:block">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-background border-b border-border sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-4 w-12">
                  <button
                    onClick={toggleSelectAll}
                    aria-label={allVisibleSelected ? "Deselect all" : someVisibleSelected ? "Select all visible" : "Select all visible"}
                    className="flex items-center justify-center"
                    data-testid="btn-select-all"
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : someVisibleSelected ? (
                      <Minus className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th
                  className="px-4 py-4 font-semibold tracking-wider cursor-pointer group hover:bg-secondary/30 transition-colors"
                  onClick={() => handleSort("customer_name")}
                >
                  <div className="flex items-center gap-2">
                    Customer <SortIcon field="customer_name" />
                  </div>
                </th>
                <th
                  className="px-4 py-4 font-semibold tracking-wider text-right cursor-pointer group hover:bg-secondary/30 transition-colors"
                  onClick={() => handleSort("invoice_amount")}
                >
                  <div className="flex items-center justify-end gap-2">
                    <SortIcon field="invoice_amount" /> Amount
                  </div>
                </th>
                <th
                  className="px-4 py-4 font-semibold tracking-wider text-center cursor-pointer group hover:bg-secondary/30 transition-colors"
                  onClick={() => handleSort("days_overdue")}
                >
                  <div className="flex items-center justify-center gap-2">
                    Overdue <SortIcon field="days_overdue" />
                  </div>
                </th>
                <th
                  className="px-4 py-4 font-semibold tracking-wider cursor-pointer group hover:bg-secondary/30 transition-colors"
                  onClick={() => handleSort("due_date")}
                >
                  <div className="flex items-center gap-2">
                    Due Date <SortIcon field="due_date" />
                  </div>
                </th>
                <th
                  className="px-4 py-4 font-semibold tracking-wider cursor-pointer group hover:bg-secondary/30 transition-colors"
                  onClick={() => handleSort("risk_score")}
                >
                  <div className="flex items-center gap-2">
                    Risk <SortIcon field="risk_score" />
                  </div>
                </th>
                <th className="px-4 py-4 font-semibold tracking-wider">Status</th>
                <th className="px-4 py-4 font-semibold tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="bg-card">
                      <td className="px-4 py-4"><Skeleton className="h-4 w-4" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-8 w-40" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-6 w-24 ml-auto" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-6 w-16 mx-auto" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-6 w-20" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                    </tr>
                  ))
                : filteredInvoices.length === 0
                ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Search className="w-10 h-10 mb-4 opacity-20" />
                        <p className="text-lg font-medium text-foreground">No invoices found</p>
                        <p className="text-sm mt-1">
                          Adjust your filters or search term to see more results.
                        </p>
                        {activeFiltersCount > 0 && (
                          <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
                : filteredInvoices.map((invoice: Invoice) => (
                    <tr
                      key={invoice.invoice_id}
                      className={`bg-card hover:bg-secondary/40 transition-colors group ${
                        selectedIds.has(invoice.invoice_id) ? "bg-primary/5" : ""
                      }`}
                      data-testid={`row-invoice-${invoice.invoice_id}`}
                    >
                      <td className="px-4 py-4">
                        <Checkbox
                          checked={selectedIds.has(invoice.invoice_id)}
                          onCheckedChange={() => toggleRow(invoice.invoice_id)}
                          aria-label={`Select ${invoice.customer_name}`}
                          data-testid={`checkbox-${invoice.invoice_id}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/customers/${invoice.invoice_id}`}
                          className="font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors"
                          data-testid={`link-customer-${invoice.invoice_id}`}
                        >
                          {invoice.customer_name}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="font-mono">{invoice.invoice_id}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3" /> {invoice.customer_segment}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-medium text-foreground">
                          {formatCurrency(invoice.invoice_amount)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(invoice.amount_ratio * 100).toFixed(1)}% of volume
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex items-center justify-center font-bold font-mono text-sm px-2.5 py-1 bg-secondary border border-border rounded-md text-foreground shadow-sm">
                          {invoice.days_overdue}d
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {new Date(invoice.due_date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <RiskBadge level={invoice.risk.risk_level} />
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                            Score: {invoice.risk.risk_score}
                            <ShieldAlert className="w-3 h-3 opacity-50" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link href={`/invoices/${invoice.invoice_id}`}>
                          <Button
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover-elevate shadow-sm"
                            data-testid={`btn-review-${invoice.invoice_id}`}
                          >
                            Review <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MobileInvoiceCard({
  invoice,
  isSelected,
  onToggleSelect,
}: {
  invoice: Invoice;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const [, navigate] = useLocation();

  const handleCardClick = () => {
    navigate(`/customers/${invoice.invoice_id}`);
  };

  return (
    <div className="flex items-start gap-3 p-4 hover:bg-secondary/40 transition-colors">
      {/* Checkbox — does NOT navigate */}
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className="mt-1 shrink-0"
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          aria-label={`Select ${invoice.customer_name}`}
          data-testid={`checkbox-mobile-${invoice.invoice_id}`}
        />
      </div>

      {/* Card body — navigates to customer workspace */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
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
        data-testid={`mobile-invoice-${invoice.invoice_id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">
              {invoice.customer_name}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{invoice.invoice_id}</span>
              <span>·</span>
              <span>{invoice.customer_segment}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-semibold">
              {formatCurrency(invoice.invoice_amount)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {invoice.days_overdue}d overdue
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge level={invoice.risk.risk_level} />
            <StatusBadge status={invoice.status} />
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string | undefined; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-xs font-medium border border-border">
      {label}
      <button onClick={onRemove} className="hover:text-destructive transition-colors" aria-label="Remove filter">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
