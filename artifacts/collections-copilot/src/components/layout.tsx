import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Search, Bell, Settings, ArrowRight, LayoutDashboard, CreditCard, Activity, Command } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex-shrink-0 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
            <Command className="w-5 h-5 text-accent" />
            <span>Copilot</span>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
            Workspace
          </div>
          <nav className="space-y-1">
            <Link href="/" className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === '/' ? 'bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`} data-testid="nav-dashboard">
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed">
              <CreditCard className="w-4 h-4" />
              Invoices
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed">
              <Activity className="w-4 h-4" />
              Risk Models
            </Link>
          </nav>
        </div>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              FT
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">Finance Team</span>
              <span className="text-xs text-muted-foreground mt-1">Admin</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 flex-shrink-0 z-10 relative">
          <div className="flex items-center flex-1">
            <div className="relative w-full max-w-md hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search invoices, customers, or amounts..." 
                className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-transparent rounded-md text-sm focus:outline-none focus:border-border focus:ring-1 focus:ring-ring transition-all"
                data-testid="global-search"
              />
            </div>
            <div className="md:hidden font-bold flex items-center gap-2">
               <Command className="w-5 h-5 text-accent" />
               Copilot
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground hidden sm:flex">
              <Bell className="w-4 h-4" />
            </Button>
            <SettingsDialog />
          </div>
        </header>
        
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGetCollectionSettings, getGetCollectionSettingsQueryKey, useUpdateCollectionSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Zap, ServerOff } from "lucide-react";

function SettingsDialog() {
  const { data: settings, isLoading } = useGetCollectionSettings();
  const updateSettings = useUpdateCollectionSettings();
  const queryClient = useQueryClient();

  const handleToggle = (checked: boolean) => {
    updateSettings.mutate({ data: { force_offline: checked } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCollectionSettingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/collections/dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/collections/insights"] });
      }
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="btn-settings">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Copilot Settings</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : settings ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-semibold">Offline Mode (Fallback Engine)</Label>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Disable the AI copilot engine and use basic rule-based fallbacks. Useful for testing resilience.
                  </p>
                </div>
                <Switch 
                  checked={settings.force_offline} 
                  onCheckedChange={handleToggle}
                  disabled={updateSettings.isPending}
                  data-testid="switch-offline-mode"
                />
              </div>
              
              <div className="bg-secondary/50 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Active Engine Status</span>
                </div>
                <div className="flex items-center gap-3">
                  {settings.active_source === "ai" ? (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-md text-sm font-medium" data-testid="status-engine-ai">
                      <Zap className="w-4 h-4" />
                      AI Copilot Active
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-md text-sm font-medium" data-testid="status-engine-fallback">
                      <ServerOff className="w-4 h-4" />
                      Fallback Rules Active
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-destructive">Failed to load settings</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
