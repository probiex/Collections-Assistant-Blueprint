import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useGetCollectionsDashboard } from "@workspace/api-client-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Input } from "@workspace/ref-design/components/ui/input";
import { Label } from "@workspace/ref-design/components/ui/label";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Separator } from "@workspace/ref-design/components/ui/separator";
import {
  CreditCard,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Zap,
  ArrowRight,
  ShieldCheck,
  Receipt,
  RefreshCw,
  Send,
  Calendar,
  DollarSign,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sliders,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@workspace/ref-design/hooks/use-toast";

interface PaymentLinkItem {
  id: string;
  invoiceId: string;
  customerName: string;
  amount: number;
  status: "settled" | "pending" | "viewed" | "expired";
  createdAt: string;
  expiresAt: string;
  gatewayRef: string;
  method?: string;
}

const INITIAL_PAYMENT_LINKS: PaymentLinkItem[] = [
  {
    id: "pl_948194",
    invoiceId: "INV-2024-001",
    customerName: "Acme Industrial Supplies",
    amount: 145000,
    status: "settled",
    createdAt: "2026-09-18 10:30",
    expiresAt: "2026-09-21 10:30",
    gatewayRef: "pay_rzp_live_992144",
    method: "UPI (HDFC)",
  },
  {
    id: "pl_837102",
    invoiceId: "INV-2024-002",
    customerName: "Nexus Retail Solutions",
    amount: 85000,
    status: "viewed",
    createdAt: "2026-09-19 08:15",
    expiresAt: "2026-09-22 08:15",
    gatewayRef: "pay_rzp_live_883210",
  },
  {
    id: "pl_726354",
    invoiceId: "INV-2024-004",
    customerName: "Zenith Construction Group",
    amount: 180000,
    status: "pending",
    createdAt: "2026-09-19 11:45",
    expiresAt: "2026-09-26 11:45",
    gatewayRef: "pay_rzp_live_774129",
  },
  {
    id: "pl_615243",
    invoiceId: "INV-2024-007",
    customerName: "Apex Logistics Ltd",
    amount: 62000,
    status: "settled",
    createdAt: "2026-09-17 14:20",
    expiresAt: "2026-09-20 14:20",
    gatewayRef: "pay_rzp_live_665091",
    method: "NetBanking (ICICI)",
  },
];

const INITIAL_WEBHOOKS = [
  {
    event: "payment.captured",
    ref: "pay_rzp_live_992144",
    amount: "₹1,45,000",
    time: "2 mins ago",
    status: "200 OK",
  },
  {
    event: "payment_link.opened",
    ref: "pl_837102",
    amount: "₹85,000",
    time: "48 mins ago",
    status: "200 OK",
  },
  {
    event: "settlement.processed",
    ref: "setl_live_382910",
    amount: "₹2,07,000",
    time: "3 hours ago",
    status: "200 OK",
  },
];

export default function PaymentCollection() {
  const { data: dashboard, isLoading } = useGetCollectionsDashboard();

  const [paymentLinks, setPaymentLinks] = useState<PaymentLinkItem[]>(INITIAL_PAYMENT_LINKS);
  const [webhooks, setWebhooks] = useState(INITIAL_WEBHOOKS);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Link Generator Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [linkAmount, setLinkAmount] = useState<string>("");
  const [expiryDays, setExpiryDays] = useState<number>(3);
  const [allowPartial, setAllowPartial] = useState<boolean>(true);
  const [generatedLinkUrl, setGeneratedLinkUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Instalment Calculator State
  const [instalmentPlanCount, setInstalmentPlanCount] = useState<number>(3);

  // Select first invoice default once loaded
  const invoices = dashboard?.invoices ?? [];

  // When invoice selection changes
  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    const found = invoices.find((i) => i.invoice_id === id);
    if (found) {
      setLinkAmount(String(found.invoice_amount));
      setGeneratedLinkUrl(null);
    }
  };

  const selectedInvoice = useMemo(() => {
    return invoices.find((i) => i.invoice_id === selectedInvoiceId) ?? invoices[0];
  }, [invoices, selectedInvoiceId]);

  // Handle Generate Link
  const handleGenerateLink = () => {
    if (!selectedInvoice) return;
    const newId = `pl_${Math.floor(100000 + Math.random() * 900000)}`;
    const url = `https://pay.razorpay.com/${newId}`;
    setGeneratedLinkUrl(url);

    const newLink: PaymentLinkItem = {
      id: newId,
      invoiceId: selectedInvoice.invoice_id,
      customerName: selectedInvoice.customer_name,
      amount: Number(linkAmount) || selectedInvoice.invoice_amount,
      status: "pending",
      createdAt: "Just now",
      expiresAt: `${expiryDays} days`,
      gatewayRef: `pay_rzp_live_${Math.floor(100000 + Math.random() * 900000)}`,
    };

    setPaymentLinks([newLink, ...paymentLinks]);
    toast({
      title: "Payment Link Generated!",
      description: `Hosted checkout link ready for ${selectedInvoice.customer_name}`,
    });
  };

  // Copy Link
  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: "Copied link to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Simulate instant payment webhook
  const handleSimulatePayment = (item: PaymentLinkItem) => {
    setPaymentLinks((prev) =>
      prev.map((l) => (l.id === item.id ? { ...l, status: "settled", method: "UPI (Simulated)" } : l))
    );

    setWebhooks([
      {
        event: "payment.captured",
        ref: item.gatewayRef,
        amount: formatCurrency(item.amount),
        time: "Just now",
        status: "200 OK",
      },
      ...webhooks,
    ]);

    toast({
      title: "Simulated Payment Captured!",
      description: `Settlement of ${formatCurrency(item.amount)} for ${item.customerName} processed.`,
    });
  };

  const totalCollectable = dashboard?.metrics.total_overdue_amount ?? 0;
  const settledTotal = paymentLinks
    .filter((l) => l.status === "settled")
    .reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">
              Payment Collection &amp; Gateways
            </h1>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs gap-1">
              <Zap className="w-3 h-3" /> Live Rails Active
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Generate hosted Razorpay links, accept instant UPI/NEFT settlements, and track instalment schedules.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/50 border border-border px-3 py-2 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          PCI-DSS Level 1 &amp; RBI Compliant Escrow
        </div>
      </div>

      {/* Top Operational Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Total Receivables
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(totalCollectable)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Across all open overdue invoices</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Active Payment Links
            </div>
            <div className="text-2xl font-bold text-primary">{paymentLinks.length} Links</div>
            <div className="text-xs text-muted-foreground mt-1">
              {paymentLinks.filter((l) => l.status === "pending" || l.status === "viewed").length} awaiting payment
            </div>
          </div>

          <div className="bg-card border border-emerald-200/70 bg-emerald-50/20 rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
              Settled Collections
            </div>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(settledTotal)}</div>
            <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Reconciled to ledger
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Avg Settlement Turnaround
            </div>
            <div className="text-2xl font-bold text-foreground">3.2 Days</div>
            <div className="text-xs text-muted-foreground mt-1">From link dispatch to bank credit</div>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout: Link Generator & Instalment Planner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Link Generator Form (7 cols) */}
        <div className="lg:col-span-7 bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Instant Payment Link Generator</h2>
                <p className="text-xs text-muted-foreground">
                  Generate secure, branded payment URLs for any customer invoice
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Razorpay API v2
            </Badge>
          </div>

          <Separator />

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select Customer &amp; Outstanding Invoice
              </Label>
              <select
                value={selectedInvoiceId || (invoices[0]?.invoice_id ?? "")}
                onChange={(e) => handleSelectInvoice(e.target.value)}
                className="mt-1.5 w-full bg-background border border-input rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {invoices.map((inv) => (
                  <option key={inv.invoice_id} value={inv.invoice_id}>
                    {inv.customer_name} — {inv.invoice_id} ({formatCurrency(inv.invoice_amount)} · {inv.days_overdue}d overdue)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Payment Link Amount
                </Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                    ₹
                  </span>
                  <Input
                    type="number"
                    value={linkAmount || (selectedInvoice ? String(selectedInvoice.invoice_amount) : "")}
                    onChange={(e) => setLinkAmount(e.target.value)}
                    className="pl-7 text-sm font-mono font-semibold"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="flex gap-2 mt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => selectedInvoice && setLinkAmount(String(selectedInvoice.invoice_amount))}
                    className="text-primary hover:underline"
                  >
                    100% Full
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    onClick={() =>
                      selectedInvoice && setLinkAmount(String(Math.round(selectedInvoice.invoice_amount * 0.5)))
                    }
                    className="text-primary hover:underline"
                  >
                    50% Token
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    onClick={() =>
                      selectedInvoice && setLinkAmount(String(Math.round(selectedInvoice.invoice_amount * 0.25)))
                    }
                    className="text-primary hover:underline"
                  >
                    25% Minimum
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Link Expiry Horizon
                </Label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="mt-1.5 w-full bg-background border border-input rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value={1}>24 Hours (Urgent Settlement)</option>
                  <option value={3}>3 Days (Standard Notice)</option>
                  <option value={7}>7 Days (Extended Period)</option>
                  <option value={14}>14 Days (Instalment Window)</option>
                </select>
                <div className="text-xs text-muted-foreground mt-1">
                  Automatic email reminder sent 6 hours before expiry
                </div>
              </div>
            </div>

            {/* Supported Payment Rails */}
            <div className="bg-secondary/40 border border-border rounded-lg p-3 text-xs space-y-1.5">
              <span className="font-semibold text-foreground">Enabled Rails for this Link:</span>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="secondary" className="text-xs bg-background">
                  UPI (GPay, PhonePe, Paytm)
                </Badge>
                <Badge variant="secondary" className="text-xs bg-background">
                  Corporate NetBanking (54 Banks)
                </Badge>
                <Badge variant="secondary" className="text-xs bg-background">
                  Credit / Debit Cards
                </Badge>
                <Badge variant="secondary" className="text-xs bg-background">
                  Virtual NEFT/RTGS Account
                </Badge>
              </div>
            </div>

            <Button onClick={handleGenerateLink} className="w-full gap-2 shadow-sm font-semibold">
              <Zap className="w-4 h-4" />
              Generate Razorpay Hosted Checkout Link
            </Button>
          </div>

          {/* Generated Result Callout */}
          {generatedLinkUrl && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Link Active &amp; Ready to Dispatch
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowQrModal(!showQrModal)}
                  className="h-7 text-xs gap-1 border-emerald-300 text-emerald-800"
                >
                  <QrCode className="w-3.5 h-3.5" /> {showQrModal ? "Hide QR" : "Show QR Code"}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={generatedLinkUrl}
                  className="bg-background text-xs font-mono font-semibold"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopyLink(generatedLinkUrl, "active")}
                  className="shrink-0 gap-1.5 text-xs"
                >
                  {copiedId === "active" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>

              {/* QR Preview Widget */}
              {showQrModal && (
                <div className="bg-background border border-emerald-200 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="p-3 bg-white border border-border rounded-xl shadow-xs">
                    {/* Stylized simulated QR SVG */}
                    <svg className="w-36 h-36" viewBox="0 0 100 100" fill="currentColor">
                      <path d="M0,0 h30 v30 h-30 z M5,5 v20 h20 v-20 z M10,10 h10 v10 h-10 z" />
                      <path d="M70,0 h30 v30 h-30 z M75,5 v20 h20 v-20 z M80,10 h10 v10 h-10 z" />
                      <path d="M0,70 h30 v30 h-30 z M5,75 v20 h20 v-20 z M10,80 h10 v10 h-10 z" />
                      <rect x="40" y="10" width="10" height="20" />
                      <rect x="55" y="10" width="10" height="10" />
                      <rect x="40" y="40" width="20" height="20" />
                      <rect x="70" y="40" width="10" height="30" />
                      <rect x="85" y="55" width="15" height="10" />
                      <rect x="10" y="40" width="15" height="10" />
                      <rect x="40" y="70" width="10" height="20" />
                      <rect x="55" y="80" width="20" height="10" />
                      <rect x="80" y="80" width="15" height="15" />
                    </svg>
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    Scan via any UPI App (GPay / PhonePe / Paytm / BHIM)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Instant webhook trigger on scan completion
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Link href={`/messages`}>
                  <Button size="sm" variant="default" className="h-7 text-xs gap-1.5">
                    <Send className="w-3 h-3" /> Embed in WhatsApp Notice
                  </Button>
                </Link>
                <a href={generatedLinkUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground">
                    Test Customer Checkout View <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Partial Payment & Instalment Calculator (5 cols) */}
        <div className="lg:col-span-5 bg-card border border-border rounded-xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Instalment Plan Structuring</h2>
                <p className="text-xs text-muted-foreground">
                  Propose structured debt settlement for distressed accounts
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="bg-secondary/30 rounded-lg p-3 text-xs">
                <div className="text-muted-foreground">Selected Customer:</div>
                <div className="font-semibold text-foreground text-sm mt-0.5">
                  {selectedInvoice ? selectedInvoice.customer_name : "Acme Supplies"}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  Balance: {selectedInvoice ? formatCurrency(selectedInvoice.invoice_amount) : "₹1,45,000"}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Split Milestones:
                </Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {[2, 3, 4].map((splits) => (
                    <Button
                      key={splits}
                      type="button"
                      variant={instalmentPlanCount === splits ? "default" : "outline"}
                      size="sm"
                      onClick={() => setInstalmentPlanCount(splits)}
                      className="text-xs font-medium"
                    >
                      {splits} Tranches
                    </Button>
                  ))}
                </div>
              </div>

              {/* Breakdown Schedule */}
              <div className="space-y-2 border border-border rounded-lg p-3 bg-background">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Proposed Payment Cadence:
                </div>
                {Array.from({ length: instalmentPlanCount }).map((_, idx) => {
                  const total = selectedInvoice?.invoice_amount ?? 145000;
                  const trancheAmt = Math.round(total / instalmentPlanCount);
                  const daysLater = (idx + 1) * 14;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center font-mono font-bold text-[10px]">
                          T{idx + 1}
                        </span>
                        <span className="font-medium text-foreground">In {daysLater} days</span>
                      </div>
                      <div className="font-mono font-semibold text-foreground">
                        {formatCurrency(trancheAmt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              toast({
                title: "Instalment Plan Drafted",
                description: `${instalmentPlanCount}-part settlement plan ready for customer sign-off.`,
              });
            }}
            className="w-full gap-1.5 text-xs mt-4"
          >
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            Lock Instalment Agreement
          </Button>
        </div>
      </div>

      {/* Live Payment Links History Table */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5 text-muted-foreground" />
              Active Payment Links &amp; Settlement Ledger
            </h2>
            <p className="text-sm text-muted-foreground">
              Monitor customer click status, settlement confirmation, and reconcile gateway payouts.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast({ title: "Refreshing Gateway Ledger..." });
            }}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            Refresh Gateway
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                <th className="pb-3 text-left font-semibold">Link ID / Gateway Ref</th>
                <th className="pb-3 text-left font-semibold">Customer / Invoice</th>
                <th className="pb-3 text-right font-semibold">Amount</th>
                <th className="pb-3 text-center font-semibold">Status</th>
                <th className="pb-3 text-left font-semibold pl-4">Payment Method</th>
                <th className="pb-3 text-right font-semibold">Created</th>
                <th className="pb-3 text-right font-semibold pr-2">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paymentLinks.map((item) => (
                <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3.5 pr-4">
                    <div className="font-mono text-xs font-bold text-foreground">{item.id}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{item.gatewayRef}</div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <div className="font-medium text-foreground">{item.customerName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{item.invoiceId}</div>
                  </td>
                  <td className="py-3.5 pr-4 text-right font-semibold text-foreground">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="py-3.5 text-center">
                    {item.status === "settled" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Settled
                      </Badge>
                    ) : item.status === "viewed" ? (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs gap-1">
                        <Clock className="w-3 h-3" /> Viewed
                      </Badge>
                    ) : item.status === "pending" ? (
                      <Badge variant="outline" className="text-muted-foreground text-xs gap-1">
                        <Clock className="w-3 h-3" /> Pending
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        Expired
                      </Badge>
                    )}
                  </td>
                  <td className="py-3.5 pl-4 text-xs font-medium text-foreground">
                    {item.method ?? "—"}
                  </td>
                  <td className="py-3.5 text-right text-xs text-muted-foreground">
                    {item.createdAt}
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyLink(`https://pay.razorpay.com/${item.id}`, item.id)}
                        className="h-7 px-2 text-xs"
                        title="Copy Link"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </Button>

                      {item.status !== "settled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSimulatePayment(item)}
                          className="h-7 text-xs gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                        >
                          <Zap className="w-3 h-3" /> Test Pay
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gateway Webhook Real-time Stream */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-base">Gateway Webhook Ingestion Stream</h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">Status: Connected (200 OK)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {webhooks.map((wb, idx) => (
            <div key={idx} className="bg-secondary/40 border border-border rounded-lg p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-primary">{wb.event}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                  {wb.status}
                </span>
              </div>
              <div className="text-muted-foreground font-mono text-[11px] truncate">Ref: {wb.ref}</div>
              <div className="flex items-center justify-between pt-1 border-t border-border/50 text-muted-foreground">
                <span className="font-semibold text-foreground">{wb.amount}</span>
                <span>{wb.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
