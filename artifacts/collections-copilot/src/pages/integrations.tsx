import { useState } from "react";
import { Link } from "wouter";
import { useGetCollectionSettings } from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Input } from "@workspace/ref-design/components/ui/input";
import { Label } from "@workspace/ref-design/components/ui/label";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import { Separator } from "@workspace/ref-design/components/ui/separator";
import { Switch } from "@workspace/ref-design/components/ui/switch";
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  Database,
  Mail,
  FileSpreadsheet,
  Webhook,
  ShieldCheck,
  Zap,
  Building,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Settings2,
  X,
  Play,
  ArrowRight,
  Shield,
} from "lucide-react";
import { toast } from "@workspace/ref-design/hooks/use-toast";

interface IntegrationItem {
  id: string;
  name: string;
  category: "Accounting" | "Email" | "Messaging" | "Banking" | "Risk" | "Automation";
  iconName: string;
  desc: string;
  status: "connected" | "paused" | "disconnected";
  lastSync?: string;
  stats?: string;
  configFields: { label: string; placeholder: string; key: string }[];
}

const INTEGRATION_CATALOG: IntegrationItem[] = [
  {
    id: "zoho_books",
    name: "Zoho Books",
    category: "Accounting",
    iconName: "FileSpreadsheet",
    desc: "Bi-directional ledger sync. Auto-ingest overdue receivables and push settlement reconciliations.",
    status: "connected",
    lastSync: "4 mins ago",
    stats: "24 invoices synced today",
    configFields: [
      { label: "Organization ID", placeholder: "org_7381920", key: "org_id" },
      { label: "Client OAuth Token", placeholder: "1000.xxxx.yyyy", key: "auth_token" },
    ],
  },
  {
    id: "whatsapp_business",
    name: "WhatsApp Cloud API",
    category: "Messaging",
    iconName: "Zap",
    desc: "Send interactive collection reminders and Razorpay payment links with delivery & read receipts.",
    status: "connected",
    lastSync: "12 mins ago",
    stats: "98.4% delivery rate (32 sent)",
    configFields: [
      { label: "Phone Number ID", placeholder: "109823487192", key: "phone_id" },
      { label: "Meta System User Token", placeholder: "EAAxxxx...", key: "access_token" },
    ],
  },
  {
    id: "razorpay_gateway",
    name: "Razorpay Standard & Route",
    category: "Banking",
    iconName: "Building",
    desc: "Instant payment link dispatch, automated UPI QR generation, and real-time webhook settlement capture.",
    status: "connected",
    lastSync: "Active live webhook",
    stats: "₹3,92,000 reconciled",
    configFields: [
      { label: "Key ID", placeholder: "rzp_live_xxxxxxxx", key: "key_id" },
      { label: "Key Secret", placeholder: "••••••••••••••••", key: "key_secret" },
    ],
  },
  {
    id: "tally_prime",
    name: "Tally Prime ERP",
    category: "Accounting",
    iconName: "Database",
    desc: "Local connector agent to synchronize customer ledgers, sales vouchers, and outstanding ageing.",
    status: "disconnected",
    configFields: [
      { label: "Tally Server Host", placeholder: "http://localhost:9000", key: "host" },
      { label: "Company Name in Tally", placeholder: "Acme Corp Ltd", key: "company" },
    ],
  },
  {
    id: "gmail_workspace",
    name: "Google Workspace / Gmail",
    category: "Email",
    iconName: "Mail",
    desc: "Dispatch personalized escalation notices directly from your finance domain (e.g. billing@company.com).",
    status: "disconnected",
    configFields: [
      { label: "Sending Email Address", placeholder: "billing@yourdomain.com", key: "email" },
      { label: "OAuth Consent Authorized", placeholder: "Click to authorize via Google", key: "auth" },
    ],
  },
  {
    id: "cibil_bureau",
    name: "CIBIL / Experian Bureau",
    category: "Risk",
    iconName: "ShieldCheck",
    desc: "Real-time credit score enrichment and default reporting for commercial enterprise debtors.",
    status: "disconnected",
    configFields: [
      { label: "Commercial Member Code", placeholder: "MEM_IND_9921", key: "member_code" },
      { label: "Bureau API Secret", placeholder: "••••••••••••••••", key: "secret" },
    ],
  },
  {
    id: "custom_webhooks",
    name: "Inbound ERP Webhooks",
    category: "Automation",
    iconName: "Webhook",
    desc: "RESTful HTTP endpoint to stream invoice creation, credit notes, and external adjustments in real-time.",
    status: "connected",
    lastSync: "Live listening",
    stats: "128 events ingested",
    configFields: [
      { label: "Webhook Secret Key", placeholder: "whsec_live_9984712", key: "secret" },
    ],
  },
];

export default function Integrations() {
  const { data: settings } = useGetCollectionSettings();

  const [integrations, setIntegrations] = useState<IntegrationItem[]>(INTEGRATION_CATALOG);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeModalItem, setActiveModalItem] = useState<IntegrationItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);

  const categories = ["All", "Accounting", "Messaging", "Banking", "Email", "Risk", "Automation"];

  const filteredIntegrations = integrations.filter(
    (item) => selectedCategory === "All" || item.category === selectedCategory
  );

  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  const handleToggleStatus = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newStatus = item.status === "connected" ? "disconnected" : "connected";
          toast({
            title: newStatus === "connected" ? `${item.name} Connected` : `${item.name} Disconnected`,
            description: newStatus === "connected" ? "Sync credentials verified successfully." : "Pipeline paused.",
          });
          return {
            ...item,
            status: newStatus,
            lastSync: newStatus === "connected" ? "Just now" : undefined,
          };
        }
        return item;
      })
    );
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    setTimeout(() => {
      setTestingConnection(false);
      if (activeModalItem) {
        handleToggleStatus(activeModalItem.id);
        setActiveModalItem(null);
      }
      toast({
        title: "Connection Handshake Successful!",
        description: "Credentials verified with 200 OK HTTP heartbeat.",
      });
    }, 1200);
  };

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText("https://api.copilot.fin/v1/webhooks/inbound_wh_984128");
    setCopiedKey(true);
    toast({ title: "Copied webhook endpoint URL" });
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getIcon = (name: string) => {
    switch (name) {
      case "FileSpreadsheet":
        return <FileSpreadsheet className="w-5 h-5 text-blue-600" />;
      case "Zap":
        return <Zap className="w-5 h-5 text-amber-600" />;
      case "Building":
        return <Building className="w-5 h-5 text-primary" />;
      case "Database":
        return <Database className="w-5 h-5 text-emerald-600" />;
      case "Mail":
        return <Mail className="w-5 h-5 text-indigo-600" />;
      case "ShieldCheck":
        return <ShieldCheck className="w-5 h-5 text-rose-600" />;
      case "Webhook":
        return <Webhook className="w-5 h-5 text-purple-600" />;
      default:
        return <Plug className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
              Integrations &amp; Connectors
            </h1>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs gap-1">
              <CheckCircle2 className="w-3 h-3" /> Sync Active
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Bi-directional data pipelines connecting your ERP, accounting software, messaging APIs, and payment rails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast({ title: "Triggering Full Ledger Re-sync across all 4 connectors..." })}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            Sync All Pipelines
          </Button>
        </div>
      </div>

      {/* Health & Throughput Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Connected Systems
          </div>
          <div className="text-2xl font-bold text-foreground">
            {connectedCount} of {integrations.length} Active
          </div>
          <div className="text-xs text-muted-foreground mt-1">Ready for real-time dispatch</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Active Accounting Source
          </div>
          <div className="text-2xl font-bold text-blue-600">Zoho Books</div>
          <div className="text-xs text-muted-foreground mt-1">Company: {settings?.company_name ?? "Acme Technologies"}</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Sync Reliability
          </div>
          <div className="text-2xl font-bold text-emerald-700">99.9%</div>
          <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Zero webhook dropouts
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Primary Currency / Rail
          </div>
          <div className="text-2xl font-bold text-foreground">{settings?.currency ?? "INR"} (₹)</div>
          <div className="text-xs text-muted-foreground mt-1">UPI, NEFT &amp; IMPS settlement</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 items-center border-b border-border pb-3">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredIntegrations.map((item) => (
          <div
            key={item.id}
            className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/60 flex items-center justify-center shrink-0">
                  {getIcon(item.iconName)}
                </div>
                <Badge
                  variant={item.status === "connected" ? "default" : "outline"}
                  className={`text-[11px] ${
                    item.status === "connected"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.status === "connected" ? "Connected" : "Not Configured"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-base text-foreground">{item.name}</h3>
                <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                  {item.category}
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{item.desc}</p>
            </div>

            <div className="pt-3 border-t border-border/60 space-y-3">
              {item.status === "connected" ? (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono text-[11px]">{item.lastSync}</span>
                  <span className="font-medium text-emerald-700">{item.stats}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">OAuth 2.0 / REST API credentials required</div>
              )}

              <div className="flex items-center gap-2">
                {item.status === "connected" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveModalItem(item)}
                      className="flex-1 text-xs gap-1 h-8"
                    >
                      <Settings2 className="w-3.5 h-3.5" /> Config
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(item.id)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setActiveModalItem(item)}
                    className="w-full text-xs gap-1.5 h-8 font-semibold shadow-xs"
                  >
                    <Plug className="w-3.5 h-3.5" /> Connect Integration
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inbound Webhook Center */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Inbound Automation Webhook Endpoint</h2>
              <p className="text-xs text-muted-foreground">
                Point ERP, Billing systems, or Stripe/Razorpay webhooks here to auto-update receivables.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toast({
                title: "Test Inbound Webhook Ping Emitted",
                description: "Received 200 OK — simulated invoice payload processed in 14ms.",
              })
            }
            className="text-xs gap-1.5"
          >
            <Play className="w-3 h-3 text-primary" /> Send Test Payload
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
          <div className="md:col-span-8 space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Live Inbound Webhook URL
            </Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value="https://api.copilot.fin/v1/webhooks/inbound_wh_984128"
                className="font-mono text-xs bg-background"
              />
              <Button size="sm" variant="secondary" onClick={handleCopyWebhookUrl} className="shrink-0 gap-1 text-xs">
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </Button>
            </div>
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Signature Verification Secret
            </Label>
            <Input readOnly value="whsec_live_9984712••••••••" className="font-mono text-xs bg-background" />
          </div>
        </div>
      </div>

      {/* Interactive Setup / Config Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  {getIcon(activeModalItem.iconName)}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{activeModalItem.name} Setup</h3>
                  <p className="text-xs text-muted-foreground">{activeModalItem.category} Integration</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <Separator />

            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">{activeModalItem.desc}</p>

              {activeModalItem.configFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs font-semibold">{field.label}</Label>
                  <Input placeholder={field.placeholder} className="text-xs bg-background font-mono" />
                </div>
              ))}

              <div className="bg-secondary/40 border border-border rounded-lg p-3 text-xs flex items-start gap-2 text-muted-foreground">
                <Shield className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>
                  API secrets are encrypted at rest with AES-256 and authenticated with TLS 1.3 mutual handshake.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setActiveModalItem(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="text-xs gap-1.5 font-semibold"
              >
                {testingConnection ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying Handshake...
                  </>
                ) : (
                  <>
                    <Plug className="w-3.5 h-3.5" /> Test &amp; Save Connection
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
