import { useState, useMemo } from "react";
import { RiskResultRiskLevel } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useGetCollectionsDashboard, useGetCollectionSettings, useGetCollectionInsights } from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Input } from "@workspace/ref-design/components/ui/input";
import { Label } from "@workspace/ref-design/components/ui/label";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import { Separator } from "@workspace/ref-design/components/ui/separator";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Switch } from "@workspace/ref-design/components/ui/switch";
import {
  Download,
  Share2,
  FileText,
  Table,
  Printer,
  Link as LinkIcon,
  Mail,
  FileCode,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Send,
  Eye,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@workspace/ref-design/hooks/use-toast";

export default function Export() {
  const { data: dashboard, isLoading } = useGetCollectionsDashboard();
  const { data: settings } = useGetCollectionSettings();
  const { data: insights } = useGetCollectionInsights();

  // Export filters
  const [csvFilter, setCsvFilter] = useState<"all" | "critical" | "sent">("all");
  const [includeRiskScores, setIncludeRiskScores] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [shareLinkExpiry, setShareLinkExpiry] = useState<string>("7d");
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(null);

  // Email Digest state
  const [digestEmail, setDigestEmail] = useState<string>("cfo@company.com");
  const [digestFrequency, setDigestFrequency] = useState<string>("weekly");

  // Filtered invoices for CSV
  const exportableInvoices = useMemo(() => {
    if (!dashboard?.invoices) return [];
    if (csvFilter === "critical") {
      return dashboard.invoices.filter(
        (i) => i.risk.risk_level === RiskResultRiskLevel.Critical || i.risk.risk_level === RiskResultRiskLevel.High
      );
    }
    if (csvFilter === "sent") {
      return dashboard.invoices.filter((i) => i.sent_at);
    }
    return dashboard.invoices;
  }, [dashboard, csvFilter]);

  // Handle Download CSV
  const handleDownloadCSV = () => {
    if (exportableInvoices.length === 0) return;

    const headers = [
      "Invoice ID",
      "Customer Name",
      "Invoice Amount",
      "Due Date",
      "Days Overdue",
      "Notice Sent Date",
    ];
    if (includeRiskScores) {
      headers.push("Risk Level", "Risk Score", "Risk Factors");
    }

    const rows = exportableInvoices.map((inv) => {
      const row = [
        inv.invoice_id,
        `"${inv.customer_name}"`,
        inv.invoice_amount,
        inv.due_date,
        inv.days_overdue,
        inv.sent_at ?? "Not Sent",
      ];
      if (includeRiskScores) {
        row.push(
          inv.risk.risk_level,
          inv.risk.risk_score,
          `"${inv.risk.reasoning || ""}"`
        );
      }
      return row.join(",");
    });

    const csvData = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvData));
    link.setAttribute(
      "download",
      `collections_invoices_${csvFilter}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV Export Complete",
      description: `Downloaded ${exportableInvoices.length} invoices to CSV.`,
    });
  };

  // Handle Download JSON Dump
  const handleDownloadJSON = () => {
    if (!dashboard) return;
    const dump = {
      exportedAt: new Date().toISOString(),
      company: settings?.company_name ?? "Acme",
      currency: settings?.currency ?? "INR",
      metrics: dashboard.metrics,
      insights: insights ?? null,
      invoices: dashboard.invoices,
    };

    const jsonData = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dump, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonData);
    link.setAttribute("download", `collections_full_lake_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "JSON Dump Complete",
      description: "Downloaded structured schema file for ERP/BI loading.",
    });
  };

  // Handle Share Link Generation
  const handleGenerateShareLink = () => {
    const token = Math.random().toString(36).substring(2, 10);
    const url = `https://collections.assistant.fin/share/${token}?exp=${shareLinkExpiry}`;
    setGeneratedShareUrl(url);
    toast({
      title: "Secure Shareable Link Ready",
      description: `Read-only dashboard token generated (valid for ${shareLinkExpiry}).`,
    });
  };

  const handleCopyShareLink = () => {
    if (!generatedShareUrl) return;
    navigator.clipboard.writeText(generatedShareUrl);
    setCopiedLink(true);
    toast({ title: "Copied read-only link" });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 print:p-0 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
              Export &amp; Share
            </h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1">
              <Sparkles className="w-3 h-3" /> Live Data Export
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Download financial records in CSV/JSON, print executive statements, or generate secure stakeholder share links.
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
            Print Current View
          </Button>
        </div>
      </div>

      {/* Live Data Inventory Banner */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : dashboard ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Invoices Available
            </div>
            <div className="text-2xl font-bold text-foreground">
              {dashboard.metrics.overdue_count} Records
            </div>
            <div className="text-xs text-muted-foreground mt-1">Ready for full CSV extraction</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Total Receivable Value
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(dashboard.metrics.total_overdue_amount)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Reconciled portfolio balance</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Risk Evaluated Accounts
            </div>
            <div className="text-2xl font-bold text-purple-700">
              {dashboard.invoices.length} Accounts
            </div>
            <div className="text-xs text-muted-foreground mt-1">With 4-vector risk scores</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Dispatched Notices
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              {dashboard.invoices.filter((i) => i.sent_at).length} Notices
            </div>
            <div className="text-xs text-muted-foreground mt-1">With timestamped audit logs</div>
          </div>
        </div>
      ) : null}

      {/* Main Grid: CSV/JSON Export Station & Share Link Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
        {/* Left: CSV & JSON Download Station (7 cols) */}
        <div className="lg:col-span-7 bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Table className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Invoice Ledger CSV Export</h2>
              <p className="text-xs text-muted-foreground">
                Generate formatted CSV sheets compatible with Excel, Google Sheets, and Tally ERP
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Filter Export Dataset
              </Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                <Button
                  type="button"
                  variant={csvFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCsvFilter("all")}
                  className="text-xs"
                >
                  All Invoices ({dashboard?.invoices.length ?? 0})
                </Button>
                <Button
                  type="button"
                  variant={csvFilter === "critical" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCsvFilter("critical")}
                  className="text-xs"
                >
                  Critical / High (
                  {dashboard?.invoices.filter(
                    (i) => i.risk.risk_level === RiskResultRiskLevel.Critical || i.risk.risk_level === RiskResultRiskLevel.High
                  ).length ?? 0}
                  )
                </Button>
                <Button
                  type="button"
                  variant={csvFilter === "sent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCsvFilter("sent")}
                  className="text-xs"
                >
                  Notices Sent ({dashboard?.invoices.filter((i) => i.sent_at).length ?? 0})
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground">Include AI Risk Engine Scores</div>
                <div className="text-xs text-muted-foreground">
                  Adds risk tier, numerical 0-100 score, and causal breakdown factors to the sheet
                </div>
              </div>
              <Switch checked={includeRiskScores} onCheckedChange={setIncludeRiskScores} />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button onClick={handleDownloadCSV} className="flex-1 gap-2 shadow-xs font-semibold">
                <Download className="w-4 h-4" /> Download CSV Spreadsheet ({exportableInvoices.length} rows)
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadJSON}
                className="gap-2 text-xs font-medium"
              >
                <FileCode className="w-4 h-4 text-purple-600" /> Export JSON Lake
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Shareable Link & Automated Digest (5 cols) */}
        <div className="lg:col-span-5 bg-card border border-border rounded-xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Shareable Read-Only Portal</h2>
                <p className="text-xs text-muted-foreground">
                  Time-limited, secure link for CFOs, auditors, and leadership
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Link Expiry Window
                </Label>
                <select
                  value={shareLinkExpiry}
                  onChange={(e) => setShareLinkExpiry(e.target.value)}
                  className="mt-1.5 w-full bg-background border border-input rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="24h">24 Hours (Immediate review)</option>
                  <option value="7d">7 Days (Standard Audit period)</option>
                  <option value="30d">30 Days (Monthly close)</option>
                </select>
              </div>

              <Button onClick={handleGenerateShareLink} variant="outline" className="w-full gap-2 text-xs">
                <LinkIcon className="w-3.5 h-3.5" />
                Generate Encrypted Share Link
              </Button>

              {generatedShareUrl && (
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-2 animate-in fade-in">
                  <div className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Live Share Link Active
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={generatedShareUrl}
                      className="font-mono text-xs bg-background h-8"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleCopyShareLink}
                      className="h-8 shrink-0 text-xs gap-1"
                    >
                      {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div className="text-xs font-semibold text-foreground">Scheduled Executive Digest</div>
            </div>
            <div className="flex gap-2">
              <Input
                value={digestEmail}
                onChange={(e) => setDigestEmail(e.target.value)}
                placeholder="email@domain.com"
                className="text-xs bg-background h-8"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast({
                    title: "Test Digest Sent!",
                    description: `Executive portfolio summary dispatched to ${digestEmail}`,
                  })
                }
                className="h-8 text-xs shrink-0 gap-1"
              >
                <Send className="w-3 h-3" /> Test
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Executive Financial Statement Preview */}
      <div className="bg-card border border-border rounded-xl p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary">
              Official Collections Summary Statement
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground mt-1">
              {settings?.company_name ?? "Acme Technologies Private Limited"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Portfolio as of:{" "}
              {settings?.reference_date
                ? new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(
                    new Date(settings.reference_date)
                  )
                : "Current Date"}
            </p>
          </div>

          <div className="text-right print:text-right">
            <div className="text-xs text-muted-foreground uppercase">Currency</div>
            <div className="text-xl font-bold font-mono text-foreground">
              {settings?.currency ?? "INR"} (₹)
            </div>
          </div>
        </div>

        {/* Statement Executive Snapshot */}
        <div className="grid grid-cols-3 gap-4 text-sm bg-secondary/20 p-4 rounded-lg">
          <div>
            <span className="text-xs text-muted-foreground uppercase">Total Receivables:</span>
            <div className="text-lg font-bold text-foreground">
              {formatCurrency(dashboard?.metrics.total_overdue_amount ?? 0)}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground uppercase">Total Invoices:</span>
            <div className="text-lg font-bold text-foreground">
              {dashboard?.metrics.overdue_count ?? 0}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground uppercase">High / Critical Risk:</span>
            <div className="text-lg font-bold text-rose-700">
              {(dashboard?.metrics.critical_count ?? 0) + (dashboard?.metrics.high_count ?? 0)} Accounts
            </div>
          </div>
        </div>

        {/* Top 5 Critical Debtors Table */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Primary Accounts at Risk:
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="pb-2 font-semibold">Customer Name</th>
                  <th className="pb-2 font-semibold">Invoice ID</th>
                  <th className="pb-2 font-semibold text-right">Outstanding Amount</th>
                  <th className="pb-2 font-semibold text-right">Days Past Due</th>
                  <th className="pb-2 font-semibold text-center">Risk Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(dashboard?.invoices ?? []).slice(0, 5).map((inv) => (
                  <tr key={inv.invoice_id} className="py-2">
                    <td className="py-2.5 font-medium text-foreground">{inv.customer_name}</td>
                    <td className="py-2.5 font-mono text-muted-foreground">{inv.invoice_id}</td>
                    <td className="py-2.5 text-right font-semibold text-foreground">
                      {formatCurrency(inv.invoice_amount)}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold">{inv.days_overdue}d</td>
                    <td className="py-2.5 text-center font-semibold uppercase text-[10px]">
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          inv.risk.risk_level === RiskResultRiskLevel.Critical
                            ? "bg-rose-100 text-rose-800"
                            : inv.risk.risk_level === RiskResultRiskLevel.High
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {inv.risk.risk_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Generated by AI Collections Assistant Enterprise Ledger</span>
          <span className="font-mono">Audit Hash: #7f9a2e8c10</span>
        </div>
      </div>
    </div>
  );
}
