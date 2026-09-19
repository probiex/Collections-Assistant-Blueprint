import { Link } from "wouter";
import { useGetCollectionSettings } from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Separator } from "@workspace/ref-design/components/ui/separator";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import {
  Plug,
  ArrowRight,
  Clock,
  Database,
  Mail,
  FileSpreadsheet,
  Webhook,
  ShieldCheck,
  Zap,
  Building,
  AlertCircle,
} from "lucide-react";

const PLANNED_INTEGRATIONS = [
  {
    icon: <Database className="w-5 h-5" />,
    name: "Tally / SAP",
    category: "Accounting",
    desc: "Bi-directional sync of invoices, payments, and customers from your ERP",
    status: "planned",
  },
  {
    icon: <FileSpreadsheet className="w-5 h-5" />,
    name: "Zoho Books / QuickBooks",
    category: "Accounting",
    desc: "Pull overdue invoices automatically, push payment status back on settlement",
    status: "planned",
  },
  {
    icon: <Mail className="w-5 h-5" />,
    name: "Gmail / Outlook",
    category: "Email",
    desc: "Send collection notices directly from your business inbox with tracked opens",
    status: "planned",
  },
  {
    icon: <Webhook className="w-5 h-5" />,
    name: "Webhook Inbound",
    category: "Automation",
    desc: "Receive real-time invoice and payment events from any upstream system",
    status: "planned",
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    name: "CIBIL / Credit Bureau",
    category: "Risk",
    desc: "Enrich risk scores with live credit bureau data for enterprise debtors",
    status: "planned",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    name: "WhatsApp Business",
    category: "Messaging",
    desc: "Send collection notices as WhatsApp messages with delivery receipts",
    status: "planned",
  },
  {
    icon: <Building className="w-5 h-5" />,
    name: "Razorpay X",
    category: "Banking",
    desc: "Automated payouts and real-time NEFT/IMPS settlement feeds",
    status: "planned",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Accounting: "bg-blue-100 text-blue-800",
  Email: "bg-emerald-100 text-emerald-800",
  Automation: "bg-purple-100 text-purple-800",
  Risk: "bg-red-100 text-red-800",
  Messaging: "bg-amber-100 text-amber-800",
  Banking: "bg-primary/10 text-primary",
};

export default function Integrations() {
  const { data: settings } = useGetCollectionSettings();

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect your accounting, ERP, email, and payment systems.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-2 rounded-full shrink-0">
          <Clock className="w-3.5 h-3.5" />
          Integrations Phase — Coming Next
        </div>
      </div>

      {/* Current state card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
            <Plug className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Current Data Source</h2>
            <p className="text-sm text-muted-foreground">Running on demo data — integration connectors not yet wired</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-secondary/40 border border-border rounded-lg p-4 text-center">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Company
            </div>
            <div className="font-semibold text-foreground">{settings?.company_name ?? "—"}</div>
          </div>
          <div className="bg-secondary/40 border border-border rounded-lg p-4 text-center">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Currency
            </div>
            <div className="font-semibold text-foreground">{settings?.currency ?? "—"}</div>
          </div>
          <div className="bg-secondary/40 border border-border rounded-lg p-4 text-center">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Active Engine
            </div>
            <div className="font-semibold text-foreground capitalize">
              {settings?.active_source ?? "—"}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 bg-secondary/40 border border-border rounded-lg p-3 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            No fake connection actions are wired here. Full integration connectors will be implemented in the Integrations phase. Update company identity in{" "}
            <Link href="/settings" className="text-primary underline underline-offset-2">
              Settings
            </Link>
            .
          </span>
        </div>
      </div>

      {/* Planned integrations catalog */}
      <div className="bg-secondary/30 border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <Plug className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Planned Integration Catalog</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          These connectors are designed and scoped for the integrations phase. No placeholder actions are wired.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANNED_INTEGRATIONS.map((integration, i) => (
            <div
              key={i}
              className="bg-background border border-border rounded-xl p-4 flex items-start gap-4 opacity-75"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                {integration.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">{integration.name}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      CATEGORY_COLORS[integration.category] ?? "bg-secondary text-foreground"
                    }`}
                  >
                    {integration.category}
                  </span>
                  <span className="text-xs text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full ml-auto">
                    Planned
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{integration.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-5" />

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <p className="text-sm text-muted-foreground flex-1">
            While integrations are being built, you can manually configure your workspace identity and engine settings.
          </p>
          <div className="flex gap-2 shrink-0">
            <Link href="/settings">
              <Button variant="outline" size="sm" className="gap-1.5">
                Settings <ArrowRight className="w-3.5 h-3.5" />
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
