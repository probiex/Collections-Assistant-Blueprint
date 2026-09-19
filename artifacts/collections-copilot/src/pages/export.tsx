import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useGetCollectionSettings, useGetCollectionsDashboard } from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import {
  ArrowRight,
  Check,
  Clipboard,
  Copy,
  Download,
  FileBarChart,
  FileText,
  Printer,
  Table,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { downloadInvoicesCsv, copyText } from "@/lib/csv";
import { buildShareSummary } from "@/lib/reporting";
import { toast } from "@workspace/ref-design/hooks/use-toast";

export default function Export() {
  const { data: dashboard, isLoading } = useGetCollectionsDashboard();
  const { data: settings } = useGetCollectionSettings();
  const [copied, setCopied] = useState(false);
  const invoices = dashboard?.invoices ?? [];
  const money = (amount: number) => formatCurrency(amount, settings?.currency ?? "INR", settings?.locale ?? "en-IN");
  const summary = useMemo(() => buildShareSummary(invoices), [invoices]);

  const handleCopy = async () => {
    try {
      await copyText(summary);
      setCopied(true);
      toast({ title: "Collections summary copied", description: "The markdown-friendly summary is ready to paste." });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Could not copy summary", description: "Your browser did not allow clipboard access.", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Export &amp; Share</h1>
          <p className="text-muted-foreground mt-1">Download live invoice data or share a concise portfolio summary.</p>
        </div>
        <Link href="/reports" className="print-hide">
          <Button variant="outline" size="sm" className="gap-1.5">Open reports <ArrowRight className="w-3.5 h-3.5" /></Button>
        </Link>
      </div>

      <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-lg">Invoice CSV</h2>
            <p className="text-sm text-muted-foreground mt-1">Correctly escaped CSV files for Excel, Tally, or finance review.</p>
          </div>
          <Table className="w-5 h-5 text-primary" />
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <ReadyCard label="Invoices" value={String(invoices.length)} sub="all active records" />
            <ReadyCard label="Portfolio" value={money(invoices.reduce((sum, invoice) => sum + invoice.invoice_amount, 0))} sub="total exposure" />
            <ReadyCard label="Past due" value={String(invoices.filter((invoice) => invoice.days_overdue > 0).length)} sub="records" />
            <ReadyCard label="Messages sent" value={String(invoices.filter((invoice) => invoice.sent_at).length)} sub="notices" />
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-6 print-hide">
          <Button onClick={() => downloadInvoicesCsv(invoices, "all")} disabled={!invoices.length} className="gap-1.5">
            <Download className="w-4 h-4" /> Download all invoices
          </Button>
          <Link href="/invoices">
            <Button variant="outline" className="gap-1.5"><Table className="w-4 h-4" /> Filter and export a view</Button>
          </Link>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-lg">Share portfolio summary</h2>
            <p className="text-sm text-muted-foreground mt-1">A compact markdown summary with live totals, risk, and priority accounts.</p>
          </div>
          <Copy className="w-5 h-5 text-primary" />
        </div>
        <pre className="mt-5 rounded-xl bg-secondary/50 border border-border p-4 text-sm whitespace-pre-wrap font-sans leading-relaxed overflow-x-auto">{summary || "No invoice data available."}</pre>
        <div className="flex flex-wrap gap-2 mt-4 print-hide">
          <Button onClick={handleCopy} disabled={!invoices.length} className="gap-1.5">
            {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
            {copied ? "Copied" : "Copy summary"}
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-1.5"><Printer className="w-4 h-4" /> Print this page</Button>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <FormatCard icon={<FileBarChart className="w-5 h-5" />} title="Portfolio report" description="Use Reports for aging, risk, funnel, and narrative analysis." href="/reports" />
        <FormatCard icon={<FileText className="w-5 h-5" />} title="Invoice detail" description="Open an invoice to review its collection notice and print the detail view." href="/invoices" />
        <FormatCard icon={<Table className="w-5 h-5" />} title="Filtered export" description="Apply search, risk, status, segment, aging, or amount filters before downloading." href="/invoices" />
      </section>
    </div>
  );
}

function ReadyCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="bg-secondary/40 border border-border rounded-xl p-4"><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</div><div className="text-xl font-bold mt-2 truncate">{value}</div><div className="text-xs text-muted-foreground mt-1">{sub}</div></div>;
}

function FormatCard({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href: string }) {
  return <Link href={href} className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors"><div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div><div className="font-medium mt-4">{title}</div><p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p><ArrowRight className="w-4 h-4 text-muted-foreground mt-4" /></Link>;
}