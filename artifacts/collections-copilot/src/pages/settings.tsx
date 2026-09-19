import { useState, useEffect, useRef } from "react";
import {
  useGetCollectionSettings,
  useUpdateCollectionSettings,
  getGetCollectionSettingsQueryKey,
  getGetCollectionsDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ref-design/components/ui/button";
import { Input } from "@workspace/ref-design/components/ui/input";
import { Label } from "@workspace/ref-design/components/ui/label";
import { Switch } from "@workspace/ref-design/components/ui/switch";
import { Separator } from "@workspace/ref-design/components/ui/separator";
import { Skeleton } from "@workspace/ref-design/components/ui/skeleton";
import { Badge } from "@workspace/ref-design/components/ui/badge";
import {
  Save,
  Zap,
  ServerOff,
  Building2,
  Globe,
  AlertTriangle,
  Settings2,
  ChevronRight,
  Info,
  RotateCcw,
} from "lucide-react";
import { toast } from "@workspace/ref-design/hooks/use-toast";
import { cn } from "@workspace/ref-design/lib/utils";
import { useOnboardingContext } from "@/components/walkthrough/onboarding-context";

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function Settings() {
  const { data: settings, isLoading } = useGetCollectionSettings();
  const updateSettings = useUpdateCollectionSettings();
  const queryClient = useQueryClient();
  const { restart: restartOnboarding } = useOnboardingContext();

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [currency, setCurrency] = useState("");
  const [locale, setLocale] = useState("");
  const [forceOffline, setForceOffline] = useState(false);
  const [thresholds, setThresholds] = useState({ gentle: 0, firm: 0, serious: 0, final: 0 });
  const initializedRef = useRef(false);

  useEffect(() => {
    if (settings && !initializedRef.current) {
      setCompanyName(settings.company_name ?? "");
      setCompanyLogo(settings.company_logo ?? "");
      setCurrency(settings.currency ?? "");
      setLocale(settings.locale ?? "");
      setForceOffline(settings.force_offline ?? false);
      setThresholds({
        gentle: settings.thresholds?.gentle ?? 0,
        firm: settings.thresholds?.firm ?? 0,
        serious: settings.thresholds?.serious ?? 0,
        final: settings.thresholds?.final ?? 0,
      });
      initializedRef.current = true;
    }
  }, [settings]);

  const handleSaveCompany = () => {
    updateSettings.mutate(
      { data: { company_name: companyName, company_logo: companyLogo || null, currency, locale } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetCollectionSettingsQueryKey(), updated);
          toast({ title: "Company settings saved" });
        },
        onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
      }
    );
  };

  const handleSaveThresholds = () => {
    updateSettings.mutate(
      { data: { thresholds } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetCollectionSettingsQueryKey(), updated);
          toast({ title: "Escalation thresholds saved" });
        },
        onError: () => toast({ title: "Failed to save thresholds", variant: "destructive" }),
      }
    );
  };

  const handleToggleOffline = (checked: boolean) => {
    setForceOffline(checked);
    updateSettings.mutate(
      { data: { force_offline: checked } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetCollectionSettingsQueryKey(), updated);
          queryClient.invalidateQueries({ queryKey: getGetCollectionsDashboardQueryKey() });
          toast({ title: checked ? "Switched to fallback engine" : "AI engine re-enabled" });
        },
        onError: () => {
          setForceOffline(!checked);
          toast({ title: "Failed to update engine mode", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-[1000px] mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 text-center text-destructive">Failed to load settings.</div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1000px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure AI mode, thresholds, and workspace identity.</p>
      </div>

      {/* Engine Mode */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <SectionHeader
          icon={<Zap className="w-4 h-4 text-muted-foreground" />}
          title="Copilot Engine"
          description="Control which engine drives risk scoring and message generation"
        />

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1 flex-1">
              <Label htmlFor="offline-mode" className="text-sm font-semibold">
                Offline / Fallback Mode
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Force the system to use deterministic rule-based scoring and template-based messages, bypassing AI inference. Useful for auditing, testing resilience, or when AI is unavailable.
              </p>
            </div>
            <Switch
              id="offline-mode"
              checked={forceOffline}
              onCheckedChange={handleToggleOffline}
              disabled={updateSettings.isPending}
              data-testid="switch-offline-mode"
            />
          </div>

          <Separator />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-muted-foreground">Active source:</span>
              {settings.active_source === "ai" ? (
                <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-semibold" data-testid="status-engine-ai">
                  <Zap className="w-3.5 h-3.5" /> AI Copilot
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full font-semibold" data-testid="status-engine-fallback">
                  <ServerOff className="w-3.5 h-3.5" /> Fallback Rules
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <span className={cn("w-2 h-2 rounded-full", settings.ai_available ? "bg-emerald-500" : "bg-muted-foreground")} />
              AI {settings.ai_available ? "available" : "unavailable"}
            </div>
          </div>

          {!settings.ai_available && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>The AI engine is currently unavailable. The system is using fallback rules automatically.</span>
            </div>
          )}
        </div>
      </div>

      {/* Company Identity */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <SectionHeader
          icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
          title="Company Identity"
          description="Used in outreach messages and reports"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="company-name" className="text-sm font-semibold">
              Company Name
            </Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company name"
              className="bg-background"
              data-testid="input-company-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-logo" className="text-sm font-semibold">
              Logo URL
              <span className="text-muted-foreground font-normal ml-1">(optional)</span>
            </Label>
            <Input
              id="company-logo"
              value={companyLogo}
              onChange={(e) => setCompanyLogo(e.target.value)}
              placeholder="https://..."
              className="bg-background"
              data-testid="input-company-logo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency" className="text-sm font-semibold">
              Currency Code
            </Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="INR"
              maxLength={3}
              className="bg-background uppercase"
              data-testid="input-currency"
            />
            <p className="text-xs text-muted-foreground">ISO 4217 code (e.g. INR, USD, EUR)</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="locale" className="text-sm font-semibold">
              Locale
            </Label>
            <Input
              id="locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              placeholder="en-IN"
              className="bg-background"
              data-testid="input-locale"
            />
            <p className="text-xs text-muted-foreground">BCP-47 tag (e.g. en-IN, en-US)</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            onClick={handleSaveCompany}
            disabled={updateSettings.isPending}
            className="gap-2"
            data-testid="btn-save-company"
          >
            <Save className="w-4 h-4" />
            Save Company Settings
          </Button>
        </div>
      </div>

      {/* Escalation Thresholds */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <SectionHeader
          icon={<AlertTriangle className="w-4 h-4 text-muted-foreground" />}
          title="Escalation Thresholds"
          description="Number of days overdue that triggers each tone level"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(["gentle", "firm", "serious", "final"] as const).map((tone) => {
            const colors = {
              gentle: { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" },
              firm: { dot: "bg-blue-500", badge: "bg-blue-100 text-blue-800" },
              serious: { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800" },
              final: { dot: "bg-red-500", badge: "bg-red-100 text-red-800" },
            };
            return (
              <div key={tone} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", colors[tone].dot)} />
                  <Label htmlFor={`threshold-${tone}`} className="text-sm font-semibold capitalize">
                    {tone}
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id={`threshold-${tone}`}
                    type="number"
                    min={0}
                    value={thresholds[tone]}
                    onChange={(e) =>
                      setThresholds((prev) => ({ ...prev, [tone]: Number(e.target.value) }))
                    }
                    className="bg-background pr-12"
                    data-testid={`input-threshold-${tone}`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    days
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground bg-secondary/40 rounded-lg p-3">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Thresholds determine the tone the AI selects when auto-generating messages. An invoice overdue by fewer days than the gentle threshold uses the gentle tone, and so on up the chain.
          </span>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            onClick={handleSaveThresholds}
            disabled={updateSettings.isPending}
            className="gap-2"
            data-testid="btn-save-thresholds"
          >
            <Save className="w-4 h-4" />
            Save Thresholds
          </Button>
        </div>
      </div>

      {/* Onboarding */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <SectionHeader
          icon={<RotateCcw className="w-4 h-4 text-muted-foreground" />}
          title="Onboarding"
          description="Replay the guided tour of every Collections Copilot tab"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Reset your onboarding progress and start the tab-by-tab walkthrough again from Overview.
          </p>
          <Button
            variant="outline"
            onClick={restartOnboarding}
            className="gap-2 shrink-0"
            data-testid="btn-reset-onboarding"
          >
            <RotateCcw className="w-4 h-4" />
            Reset onboarding
          </Button>
        </div>
      </div>

      {/* Reference Info */}
      <div className="bg-secondary/30 border border-border rounded-xl p-5 text-sm text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Globe className="w-4 h-4 shrink-0" />
        <span>
          Reference date:{" "}
          <strong className="text-foreground">
            {new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(
              new Date(settings.reference_date)
            )}
          </strong>
          . This is the fixed demo date used for all overdue calculations.
        </span>
      </div>
    </div>
  );
}
