import { useState, useMemo } from "react";
import { Link } from "wouter";
import { 
  useGetCollectionsDashboard, 
  Invoice, 
  RiskResultRiskLevel, 
  InvoiceStatus, 
  InvoiceCustomerSegment 
} from "@workspace/api-client-react";
import { Search, ArrowRight, X, Calendar, ShieldAlert, Building, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@workspace/ref-design/components/ui/input";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { RiskBadge, StatusBadge } from "@/components/status-badges";
import { formatCurrency } from "@/lib/utils";

type SortField = "customer_name" | "invoice_amount" | "days_overdue" | "risk_score" | "due_date";
type SortOrder = "asc" | "desc";

export default function Invoices() {
  const { data: dashboard, isLoading } = useGetCollectionsDashboard();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [segmentFilter, setSegmentFilter] = useState<string>("All");
  const [sortField, setSortField] = useState<SortField>("days_overdue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const filteredInvoices = useMemo(() => {
    if (!dashboard?.invoices) return [];
    const term = searchTerm.toLowerCase();
    
    let filtered = dashboard.invoices.filter(inv => {
      const matchSearch = !term || 
        inv.customer_name.toLowerCase().includes(term) || 
        inv.invoice_id.toLowerCase().includes(term);
      const matchRisk = riskFilter === "All" || inv.risk.risk_level === riskFilter;
      const matchStatus = statusFilter === "All" || inv.status === statusFilter;
      const matchSegment = segmentFilter === "All" || inv.customer_segment === segmentFilter;
      
      return matchSearch && matchRisk && matchStatus && matchSegment;
    });

    filtered.sort((a, b) => {
      let valA: any = a[sortField as keyof Invoice];
      let valB: any = b[sortField as keyof Invoice];

      if (sortField === "risk_score") {
        valA = a.risk.risk_score;
        valB = b.risk.risk_score;
      } else if (sortField === "due_date") {
        valA = new Date(a.due_date).getTime();
        valB = new Date(b.due_date).getTime();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [dashboard, searchTerm, riskFilter, statusFilter, segmentFilter, sortField, sortOrder]);

  const activeFiltersCount = (riskFilter !== "All" ? 1 : 0) + 
    (statusFilter !== "All" ? 1 : 0) + 
    (segmentFilter !== "All" ? 1 : 0) + 
    (searchTerm ? 1 : 0);

  const handleClearFilters = () => {
    setSearchTerm("");
    setRiskFilter("All");
    setStatusFilter("All");
    setSegmentFilter("All");
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUp className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />;
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-1">Detailed portfolio view and collections workflow.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className="text-sm text-muted-foreground font-medium bg-secondary/50 px-3 py-1.5 rounded-full border border-border">
             <span className="text-foreground font-bold">{filteredInvoices.length}</span> results found
           </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-border space-y-4 bg-secondary/10">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:max-w-md">
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
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="h-10 rounded-full border border-input bg-background px-4 text-sm focus:ring-2 focus:ring-ring focus:outline-none min-w-[120px]" data-testid="select-invoices-risk">
                <option value="All">All Risks</option>
                {Object.values(RiskResultRiskLevel).map(r => <option key={r} value={r}>{r} Risk</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-full border border-input bg-background px-4 text-sm focus:ring-2 focus:ring-ring focus:outline-none min-w-[120px]" data-testid="select-invoices-status">
                <option value="All">All Statuses</option>
                {Object.values(InvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)} className="h-10 rounded-full border border-input bg-background px-4 text-sm focus:ring-2 focus:ring-ring focus:outline-none min-w-[120px]" data-testid="select-invoices-segment">
                <option value="All">All Segments</option>
                {Object.values(InvoiceCustomerSegment).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          
          {/* Active Filters Row */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mr-1">Filters:</span>
              {searchTerm && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-xs font-medium border border-border">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm("")} className="hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                </div>
              )}
              {riskFilter !== "All" && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-xs font-medium border border-border">
                  Risk: {riskFilter}
                  <button onClick={() => setRiskFilter("All")} className="hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                </div>
              )}
              {statusFilter !== "All" && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-xs font-medium border border-border">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter("All")} className="hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                </div>
              )}
              {segmentFilter !== "All" && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-xs font-medium border border-border">
                  Segment: {segmentFilter}
                  <button onClick={() => setSegmentFilter("All")} className="hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                </div>
              )}
              <button onClick={handleClearFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 ml-1" data-testid="btn-clear-filters">
                Clear all
              </button>
            </div>
          )}
        </div>
        
        {/* Mobile invoice cards */}
        <div className="divide-y divide-border md:hidden">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-3 p-5">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))
          ) : filteredInvoices.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No invoices match these filters.
            </div>
          ) : (
            filteredInvoices.map((invoice: Invoice) => (
              <Link
                key={invoice.invoice_id}
                href={`/invoices/${invoice.invoice_id}`}
                className="block p-5 transition-colors hover:bg-secondary/40"
                data-testid={`mobile-invoice-${invoice.invoice_id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-foreground">{invoice.customer_name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{invoice.invoice_id}</span>
                      <span>·</span>
                      <span>{invoice.customer_segment}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold">{formatCurrency(invoice.invoice_amount)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{invoice.days_overdue}d overdue</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge level={invoice.risk.risk_level} />
                    <StatusBadge status={invoice.status} />
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Desktop data table */}
        <div className="hidden overflow-x-auto min-h-[400px] md:block">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-background border-b border-border sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider cursor-pointer group hover:bg-secondary/30 transition-colors" onClick={() => handleSort("customer_name")}>
                  <div className="flex items-center gap-2">Customer <SortIcon field="customer_name" /></div>
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right cursor-pointer group hover:bg-secondary/30 transition-colors" onClick={() => handleSort("invoice_amount")}>
                  <div className="flex items-center justify-end gap-2"><SortIcon field="invoice_amount" /> Amount</div>
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider text-center cursor-pointer group hover:bg-secondary/30 transition-colors" onClick={() => handleSort("days_overdue")}>
                  <div className="flex items-center justify-center gap-2">Overdue <SortIcon field="days_overdue" /></div>
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider cursor-pointer group hover:bg-secondary/30 transition-colors" onClick={() => handleSort("due_date")}>
                  <div className="flex items-center gap-2">Due Date <SortIcon field="due_date" /></div>
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider cursor-pointer group hover:bg-secondary/30 transition-colors" onClick={() => handleSort("risk_score")}>
                  <div className="flex items-center gap-2">Risk <SortIcon field="risk_score" /></div>
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="bg-card">
                    <td className="px-6 py-4"><Skeleton className="h-8 w-40" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-16 mx-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Search className="w-10 h-10 mb-4 opacity-20" />
                      <p className="text-lg font-medium text-foreground">No invoices found</p>
                      <p className="text-sm mt-1">Adjust your filters or search term to see more results.</p>
                      {activeFiltersCount > 0 && (
                        <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice: Invoice) => (
                  <tr key={invoice.invoice_id} className="bg-card hover:bg-secondary/40 transition-colors group" data-testid={`row-invoice-${invoice.invoice_id}`}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{invoice.customer_name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="font-mono">{invoice.invoice_id}</span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {invoice.customer_segment}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-medium text-foreground">{formatCurrency(invoice.invoice_amount)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(invoice.amount_ratio * 100).toFixed(1)}% of volume
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center font-bold font-mono text-sm px-2.5 py-1 bg-secondary border border-border rounded-md text-foreground shadow-sm">
                        {invoice.days_overdue}d
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {new Date(invoice.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <RiskBadge level={invoice.risk.risk_level} />
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                          Score: {invoice.risk.risk_score}
                          <ShieldAlert className="w-3 h-3 opacity-50" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/invoices/${invoice.invoice_id}`}>
                        <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity hover-elevate shadow-sm" data-testid={`btn-review-${invoice.invoice_id}`}>
                          Review <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}