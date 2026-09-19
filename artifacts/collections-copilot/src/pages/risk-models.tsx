import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useGetCollectionsDashboard,
  useGetCollectionSettings,
  RiskResultRiskLevel,
  DashboardEngineSource,
  Invoice,
} from "@workspace/api-client-react";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Slider } from "@workspace/ref-design/components/ui/slider";
import {
  Zap,
  ServerOff,
  Activity,
  GitCommit,
  BarChart2,
  Sliders,
  ShieldAlert,
  Sparkles,
  Info,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Scale,
  Brain,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RiskBadge } from "@/components/status-badges";

export default function RiskModels() {
  const { data: dashboard, isLoading: isLoadingDash } = useGetCollectionsDashboard();
  const { data: settings } = useGetCollectionSettings();

  // Simulator State
  const [simDaysOverdue, setSimDaysOverdue] = useState(38);
  const [simAmountRatio, setSimAmountRatio] = useState(35); // 35% of annual volume
  const [simReminders, setSimReminders] = useState(2);
  const [simHistory, setSimHistory] = useState<"prompt" | "occasional" | "chronic">("occasional");
  const [simRelationshipYears, setSimRelationshipYears] = useState(3);

  // Real-time Risk Simulator Calculation
  const simResult = useMemo(() => {
    let score = 0;
    const factors: string[] = [];

    // 1. Overdue days (up to 45 pts)
    if (simDaysOverdue > 60) {
      score += 45;
      factors.push(`Severe overdue status (+45 pts for ${simDaysOverdue}d)`);
    } else if (simDaysOverdue > 30) {
      score += 30;
      factors.push(`Significant overdue delay (+30 pts for ${simDaysOverdue}d)`);
    } else if (simDaysOverdue > 14) {
      score += 18;
      factors.push(`Moderate overdue lag (+18 pts for ${simDaysOverdue}d)`);
    } else {
      score += Math.round((simDaysOverdue / 14) * 10);
      factors.push(`Standard overdue phase (+${Math.round((simDaysOverdue / 14) * 10)} pts)`);
    }

    // 2. Exposure Concentration Ratio (up to 25 pts)
    if (simAmountRatio > 50) {
      score += 25;
      factors.push(`High portfolio concentration risk (+25 pts for ${simAmountRatio}% volume)`);
    } else if (simAmountRatio > 25) {
      score += 15;
      factors.push(`Moderate volume exposure (+15 pts for ${simAmountRatio}% volume)`);
    } else {
      score += 5;
    }

    // 3. Payment Track Record (up to 20 pts)
    if (simHistory === "chronic") {
      score += 20;
      factors.push("Chronic delinquent payment pattern (+20 pts)");
    } else if (simHistory === "occasional") {
      score += 10;
      factors.push("Historical occasional settlement delays (+10 pts)");
    } else {
      score -= 5;
      factors.push("Established prompt settlement track record (-5 pts credit)");
    }

    // 4. Reminders fatigue (up to 10 pts)
    if (simReminders >= 3) {
      score += 10;
      factors.push(`Unresponsive after ${simReminders} reminders (+10 pts)`);
    } else if (simReminders > 0) {
      score += simReminders * 3;
    }

    // 5. Relationship goodwill discount
    if (simRelationshipYears >= 5) {
      score -= 8;
      factors.push("Long-standing relationship resilience (-8 pts credit)");
    }

    const finalScore = Math.min(100, Math.max(0, score));

    let level: "Critical" | "High" | "Medium" | "Low" = "Low";
    if (finalScore >= 75) level = "Critical";
    else if (finalScore >= 50) level = "High";
    else if (finalScore >= 25) level = "Medium";

    return {
      score: finalScore,
      level,
      factors,
    };
  }, [simDaysOverdue, simAmountRatio, simReminders, simHistory, simRelationshipYears]);

  const riskDistribution = useMemo(() => {
    if (!dashboard?.invoices) return null;

    const dist = {
      [RiskResultRiskLevel.Critical]: { count: 0, amount: 0, color: "bg-red-500", barColor: "#ef4444" },
      [RiskResultRiskLevel.High]: { count: 0, amount: 0, color: "bg-amber-500", barColor: "#f59e0b" },
      [RiskResultRiskLevel.Medium]: { count: 0, amount: 0, color: "bg-blue-500", barColor: "#3b82f6" },
      [RiskResultRiskLevel.Low]: { count: 0, amount: 0, color: "bg-emerald-500", barColor: "#10b981" },
    };

    let totalAmount = 0;

    dashboard.invoices.forEach((inv) => {
      const level = inv.risk.risk_level;
      if (dist[level]) {
        dist[level].count += 1;
        dist[level].amount += inv.invoice_amount;
        totalAmount += inv.invoice_amount;
      }
    });

    return { dist, totalAmount };
  }, [dashboard]);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <Brain className="w-3.5 h-3.5" /> Explainable Risk Intelligence
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground flex items-center gap-3">
            Risk Models &amp; Scoring Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Audit predictive credit scoring weights, simulate what-if risk scenarios, and inspect dual-engine logic.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {settings && (
            <div
              className="flex items-center gap-2 text-xs font-medium px-3.5 py-1.5 rounded-full bg-card border border-border shadow-xs"
              data-testid="status-active-engine"
            >
              <span className="text-muted-foreground">Active Engine:</span>
              {settings.active_source === DashboardEngineSource.ai ? (
                <span className="flex items-center gap-1.5 text-primary font-semibold">
                  <Zap className="w-3.5 h-3.5 text-primary" /> AI Copilot
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                  <ServerOff className="w-3.5 h-3.5" /> Fallback Rules
                </span>
              )}
            </div>
          )}
          {dashboard && (
            <div className="flex items-center gap-2 text-xs font-medium px-3.5 py-1.5 rounded-full bg-card border border-border shadow-xs font-mono">
              <span className="text-muted-foreground">Base Reference Date:</span>
              <span>{new Date(dashboard.reference_date).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
            </div>
          )}
        </div>
      </div>

      {/* TOP ROW: INTERACTIVE RISK SIMULATOR */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden p-6 space-y-6">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              Interactive "What-If" Risk Scoring Simulator
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tweak parameters to inspect real-time scoring behavior and observe threshold transitions.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSimDaysOverdue(18);
              setSimAmountRatio(20);
              setSimReminders(1);
              setSimHistory("prompt");
              setSimRelationshipYears(4);
            }}
            className="text-xs h-8"
          >
            Reset to Baseline
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sliders Controls Column */}
          <div className="lg:col-span-7 space-y-5">
            {/* Slider 1: Days Overdue */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-foreground flex items-center gap-1.5 font-semibold">
                  Days Overdue
                </span>
                <span className="font-mono font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                  {simDaysOverdue} days
                </span>
              </div>
              <Slider
                value={[simDaysOverdue]}
                min={0}
                max={95}
                step={1}
                onValueChange={(vals) => setSimDaysOverdue(vals[0])}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0d (Current)</span>
                <span>15d (Gentle)</span>
                <span>30d (Firm)</span>
                <span>60d (Serious)</span>
                <span>90d+ (Final)</span>
              </div>
            </div>

            {/* Slider 2: Invoice Amount to Annual Volume */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-foreground flex items-center gap-1.5 font-semibold">
                  Exposure Ratio (% of Annual Volume)
                </span>
                <span className="font-mono font-bold text-foreground bg-secondary px-2 py-0.5 rounded">
                  {simAmountRatio}%
                </span>
              </div>
              <Slider
                value={[simAmountRatio]}
                min={1}
                max={85}
                step={1}
                onValueChange={(vals) => setSimAmountRatio(vals[0])}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1% (Minor)</span>
                <span>25% (Moderate)</span>
                <span>50%+ (Substantial Concentration)</span>
              </div>
            </div>

            {/* Slider 3: Reminders Dispatched */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-foreground font-semibold">Reminders Already Dispatched</span>
                <span className="font-mono font-bold text-foreground bg-secondary px-2 py-0.5 rounded">
                  {simReminders} notices
                </span>
              </div>
              <Slider
                value={[simReminders]}
                min={0}
                max={6}
                step={1}
                onValueChange={(vals) => setSimReminders(vals[0])}
                className="w-full"
              />
            </div>

            {/* Dropdowns: History & Relationship */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Customer Track Record</label>
                <select
                  value={simHistory}
                  onChange={(e) => setSimHistory(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="prompt">Prompt Settler (Always on time)</option>
                  <option value="occasional">Occasional Lag (10-15d delay)</option>
                  <option value="chronic">Chronic Delinquent (Repeated escalations)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Relationship Tenure</label>
                <select
                  value={simRelationshipYears}
                  onChange={(e) => setSimRelationshipYears(Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value={1}>1 year (New customer)</option>
                  <option value={3}>3 years (Established partner)</option>
                  <option value={6}>6+ years (Legacy strategic client)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Real-time Simulator Outcome Card */}
          <div className="lg:col-span-5 bg-secondary/30 border border-border rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Calculated Risk Output
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl font-extrabold font-mono text-foreground">
                  {simResult.score}
                </span>
                <span className="text-xs text-muted-foreground font-mono">/ 100</span>
                <div className="ml-auto">
                  <RiskBadge level={simResult.level} />
                </div>
              </div>

              {/* Visual Score Gauge Bar */}
              <div className="w-full bg-secondary h-3 rounded-full overflow-hidden my-3">
                <div
                  className={`h-full transition-all duration-300 ${
                    simResult.level === "Critical" ? "bg-red-500" :
                    simResult.level === "High" ? "bg-amber-500" :
                    simResult.level === "Medium" ? "bg-blue-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${simResult.score}%` }}
                />
              </div>

              {/* Dynamic Factor Contributions */}
              <div className="space-y-2 mt-4">
                <span className="text-xs font-semibold text-foreground block">
                  Scoring Factors Detected:
                </span>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {simResult.factors.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-foreground bg-background/80 p-2 rounded border border-border/50 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground leading-relaxed">
              Recommended action:{" "}
              <strong className="text-foreground">
                {simResult.level === "Critical" && "Direct telephone escalation & pause further commercial deliverables."}
                {simResult.level === "High" && "Dispatch Serious tone reminder with cc to internal account executive."}
                {simResult.level === "Medium" && "Dispatch Firm tone follow-up requesting settlement date confirmation."}
                {simResult.level === "Low" && "Cordial gentle nudge or regular statement dispatch."}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* DUAL COLUMN: EXPOSURE DISTRIBUTION & FACTOR WEIGHT VECTORS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Factor Weights Vector Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Scoring Vector Weight Matrix
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mathematical weights assigned across behavioral vectors
              </p>
            </div>
            <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded font-bold">100% Total</span>
          </div>

          <div className="space-y-4 pt-1">
            <VectorRow
              label="1. Overdue Chronology & Aging Velocity"
              weight="40%"
              percent={40}
              desc="Exponential curve based on days past agreed credit terms"
              color="bg-primary"
            />
            <VectorRow
              label="2. Payment Track Record & Delinquency History"
              weight="25%"
              percent={25}
              desc="Derived from past 12-month settlement behavior and disputes"
              color="bg-amber-500"
            />
            <VectorRow
              label="3. Concentration & Capital Exposure Ratio"
              weight="20%"
              percent={20}
              desc="Single-invoice amount proportional to client annual turnover"
              color="bg-blue-500"
            />
            <VectorRow
              label="4. Commercial Relationship Longevity"
              weight="15%"
              percent={15}
              desc="Years of continuous business serves as counter-balancing goodwill"
              color="bg-emerald-500"
            />
          </div>
        </div>

        {/* Current Portfolio Exposure Breakdown */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="font-semibold text-base flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                Active Portfolio Risk Migration
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live receivables balance mapped to model tiers
              </p>
            </div>
            <Link href="/invoices" className="text-xs font-semibold text-primary hover:underline">
              Inspect in Invoices &rarr;
            </Link>
          </div>

          {isLoadingDash || !riskDistribution ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {Object.entries(riskDistribution.dist).map(([level, data]) => {
                const percentage =
                  riskDistribution.totalAmount > 0
                    ? (data.amount / riskDistribution.totalAmount) * 100
                    : 0;

                return (
                  <div key={level} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="font-bold text-foreground">{level} Risk Tier</span>
                      <span className="font-mono text-muted-foreground">
                        {data.count} accounts &bull; {formatCurrency(data.amount)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${data.color} transition-all duration-1000`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DUAL-ENGINE ARCHITECTURE COMPARISON */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-primary" />
            Dual-Engine Resilient Architecture
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            How Collections Copilot ensures 100% operational uptime through seamless AI &amp; deterministic failover.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-primary/5 border border-primary/15 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Zap className="w-4 h-4" /> Mode 1: AI Copilot Engine
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Leverages large context windows to synthesize qualitative relationship factors, communication logs, and natural-language payment promises into explainable reasoning and drafted follow-up notices.
            </p>
            <ul className="space-y-1.5 text-xs text-foreground">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Dynamic tone adjustment tailored to account contact
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Multi-factor qualitative risk reasoning
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> 250ms avg response latency
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-secondary/40 border border-border space-y-3">
            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
              <ServerOff className="w-4 h-4 text-amber-500" /> Mode 2: Deterministic Rule Engine
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Guarantees zero-downtime operations. If upstream AI APIs encounter network failure or latency degradation, the app transparently shifts to mathematical threshold models with identical response contracts.
            </p>
            <ul className="space-y-1.5 text-xs text-foreground">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100% deterministic mathematical calculations
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Zero external network dependencies
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sub-1ms in-process evaluation speed
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function VectorRow({
  label,
  weight,
  percent,
  desc,
  color,
}: {
  label: string;
  weight: string;
  percent: number;
  desc: string;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-foreground">{label}</span>
        <span className="font-mono text-primary font-bold">{weight}</span>
      </div>
      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground">{desc}</p>
    </div>
  );
}