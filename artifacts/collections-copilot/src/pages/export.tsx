import { Link } from "wouter";
import { useGetCollectionsDashboard } from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Separator } from "@workspace/ref-design/components/ui/separator";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import {
  Download,
  Share2,
  ArrowRight,
  Clock,
  FileText,
  Table,
  Printer,
  Link as LinkIcon,
  Mail,
  FileBarChart,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const PLANNED_EXPORTS = [
  {
    icon: <Table className="w-5 h-5" />,
    title: "Invoice CSV Export",
    desc: "Export filtered invoice list with all fields, ready for Excel or Tally import",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Collection Notice PDF",
    desc: "Generate a print-ready PDF of a sent notice, with your logo and signature",
  },
  {
    icon: <FileBarChart className="w-5 h-5" />,
    title: "Portfolio Report PDF",
    desc: "Full aging analysis report with risk breakdown and AI insights, ready for management",
  },
  {
    icon: <Printer className="w-5 h-5" />,
    title: "Browser Print",
    desc: "Print-optimized layout for any page — charts, tables, and notices",
  },
  {
    icon: <LinkIcon className="w-5 h-5" />,
    title: "Shareable Dashboard Link",
    desc: "Generate a read-only, time-limited link to share portfolio status with stakeholders",
  },
  {
    icon: <Mail className="w-5 h-5" />,
    title: "Email Digest",
    desc: "Scheduled daily or weekly portfolio summary delivered to your inbox",
  },
];

export default function Export() {
  const { data: dashboard, isLoading } = useGetCollectionsDashboard();

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
            Export &amp; Share
          </h1>
          <p className="text-muted-foreground mt-1">
            Export invoices, reports, and notices in multiple formats.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-2 rounded-full shrink-0">
          <Clock className="w-3.5 h-3.5" />
          Export Phase — Coming Next
        </div>
      </div>

      {/* Data readiness */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-1">Data Ready for Export</h2>
        <p className="text-sm text-muted-foreground mb-5">
          All portfolio data is available and structured for export. File generation is planned for the next phase.
        </p>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : dashboard ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ExportReadyCard label="Invoices" value={String(dashboard.metrics.overdue_count)} sub="records" />
            <ExportReadyCard label="Total Value" value={formatCurrency(dashboard.metrics.total_overdue_amount)} sub="overdue" />
            <ExportReadyCard label="Risk Assessed" value={String(dashboard.invoices.length)} sub="accounts" />
            <ExportReadyCard label="Messages Sent" value={String(dashboard.invoices.filter(i => i.sent_at).length)} sub="notices" />
          </div>
        ) : null}

        <div className="mt-4 flex items-start gap-3 bg-secondary/40 border border-border rounded-lg p-3 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            No fake download actions are wired. Export formats will be fully implemented in the Export phase. Until then, use the browser's native print function for basic printing.
          </span>
        </div>
      </div>

      {/* Planned exports */}
      <div className="bg-secondary/30 border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <Download className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Planned Export Formats</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          These formats are designed and scoped for the next phase. No placeholder download buttons are wired.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLANNED_EXPORTS.map((exp, i) => (
            <div
              key={i}
              className="bg-background border border-border rounded-lg p-4 flex gap-3 opacity-70"
            >
              <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                {exp.icon}
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">{exp.title}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{exp.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-5" />

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <p className="text-sm text-muted-foreground flex-1">
            Review your full portfolio and risk breakdown while export is being built.
          </p>
          <div className="flex gap-2 shrink-0">
            <Link href="/reports">
              <Button variant="outline" size="sm" className="gap-1.5">
                Reports <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="/invoices">
              <Button size="sm" className="gap-1.5">
                Invoices <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportReadyCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-secondary/40 border border-border rounded-xl p-4">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}
