import { ReactNode, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Search,
  Bell,
  LayoutDashboard,
  CreditCard,
  Activity,
  Command,
  Menu,
  X,
  MessageSquare,
  BarChart3,
  Banknote,
  Plug,
  Download,
  Settings,
  ChevronDown,
  Zap,
  ServerOff,
} from "lucide-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { useGetCollectionSettings, useGetCollectionsDashboard } from "@workspace/api-client-react";
import { cn } from "@workspace/ref-design/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard, testId: "nav-dashboard" },
      { href: "/invoices", label: "Invoices", icon: CreditCard, testId: "nav-invoices" },
      { href: "/messages", label: "Messages", icon: MessageSquare, testId: "nav-messages" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/risk-models", label: "Risk Models", icon: Activity, testId: "nav-risk-models" },
      { href: "/reports", label: "Reports", icon: BarChart3, testId: "nav-reports" },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/payment-collection",
        label: "Payment Collection",
        icon: Banknote,
        testId: "nav-payment",
      },
      { href: "/integrations", label: "Integrations", icon: Plug, testId: "nav-integrations" },
      { href: "/export", label: "Export & Share", icon: Download, testId: "nav-export" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, testId: "nav-settings" },
    ],
  },
];

function NavLink({
  href,
  label,
  icon: Icon,
  testId,
  active,
  badge,
  badgeColor,
  onClick,
}: NavItem & {
  active: boolean;
  badge?: string | number;
  badgeColor?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group",
        active
          ? "bg-primary text-primary-foreground shadow-sm font-semibold"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
      data-testid={testId}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", active ? "text-primary-foreground" : "text-muted-foreground")} />
        <span className="truncate">{label}</span>
      </div>
      {badge !== undefined && (
        <span
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
            badgeColor || (active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-secondary-foreground")
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const [location] = useLocation();
  const { data: settings } = useGetCollectionSettings();
  const { data: dashboard } = useGetCollectionsDashboard();

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  const getBadge = (href: string) => {
    if (href === "/invoices" && dashboard?.metrics?.critical_count) {
      return { count: dashboard.metrics.critical_count, color: "bg-destructive/15 text-destructive font-bold border border-destructive/30" };
    }
    if (href === "/risk-models") {
      return { count: "AI", color: "bg-primary/10 text-primary border border-primary/20" };
    }
    if (href === "/" && dashboard?.metrics?.overdue_count) {
      return { count: dashboard.metrics.overdue_count, color: "bg-secondary text-muted-foreground" };
    }
    return null;
  };

  return (
    <>
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border shrink-0 justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-serif font-semibold text-lg tracking-tight hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <Command className="w-4 h-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span>Collections</span>
            <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-widest">Copilot OS</span>
          </div>
        </Link>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="text-[11px] font-bold text-sidebar-foreground/50 uppercase tracking-[0.16em] mb-2 px-3">
              {group.label}
            </div>
            <nav className="space-y-1">
              {group.items.map((item) => {
                const badgeInfo = getBadge(item.href);
                return (
                  <NavLink
                    key={item.href}
                    {...item}
                    active={isActive(item.href)}
                    badge={badgeInfo?.count}
                    badgeColor={badgeInfo?.color}
                    onClick={onLinkClick}
                  />
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-sidebar-border shrink-0">
        {settings && (
          <div className="px-3 mb-3">
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full w-fit",
                settings.active_source === "ai"
                  ? "bg-emerald-100/80 text-emerald-700"
                  : "bg-amber-100/80 text-amber-700"
              )}
            >
              {settings.active_source === "ai" ? (
                <>
                  <Zap className="w-3 h-3" /> AI Engine
                </>
              ) : (
                <>
                  <ServerOff className="w-3 h-3" /> Fallback Mode
                </>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">
            FT
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium leading-none truncate">Finance Team</span>
            <span className="text-xs text-sidebar-foreground/60 mt-1">Admin</span>
          </div>
        </div>
      </div>
    </>
  );
}

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const { data: dashboard } = useGetCollectionsDashboard();

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !dashboard?.invoices) return [];
    const q = searchQuery.toLowerCase();
    return dashboard.invoices
      .filter((inv) => inv.customer_name.toLowerCase().includes(q) || inv.invoice_id.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchQuery, dashboard]);

  // Derive current page label for the mobile header
  const allItems = NAV_GROUPS.flatMap((g) => g.items);
  const currentItem = allItems.find((item) => {
    if (item.href === "/" && location === "/") return true;
    if (item.href !== "/" && location.startsWith(item.href)) return true;
    return false;
  });

  return (
    <div className="app-shell flex h-[100dvh] w-full bg-background overflow-hidden text-foreground relative">
      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85%] bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-2xl h-full flex flex-col animate-in slide-in-from-left duration-300">
            <div className="absolute top-4 right-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                className="text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <SidebarContent onLinkClick={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Sidebar (Desktop) */}
      <aside className="app-sidebar w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex-shrink-0 flex-col hidden md:flex">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="app-main flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        <header className="app-header h-16 border-b border-border bg-background/90 backdrop-blur flex items-center justify-between px-6 flex-shrink-0 z-10 relative">
          <div className="flex items-center flex-1">
            {/* Mobile: hamburger + page name */}
            <div className="md:hidden flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="-ml-2 text-muted-foreground"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="font-serif font-medium flex items-center gap-2">
                <Command className="w-5 h-5 text-primary" />
                <span className="text-sm">{currentItem?.label ?? "Copilot"}</span>
              </div>
            </div>

            {/* Desktop: search with live dropdown */}
            <div className="relative w-full max-w-md hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search invoices, customers, or amounts..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                className="w-full pl-9 pr-8 py-2 bg-card border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                data-testid="global-search"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Floating search dropdown */}
              {showResults && searchQuery.trim().length > 0 && (
                <div 
                  className="absolute top-full mt-2 left-0 right-0 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-border/60 animate-in fade-in slide-in-from-top-2 duration-200"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="p-2 bg-muted/40 text-[11px] font-semibold text-muted-foreground flex justify-between items-center uppercase tracking-wider">
                    <span>Matching Accounts & Invoices</span>
                    <span>{searchResults.length} found</span>
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No matching records found for "{searchQuery}"
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      {searchResults.map((inv) => (
                        <Link
                          key={inv.invoice_id}
                          href={`/invoices/${inv.invoice_id}`}
                          onClick={() => {
                            setShowResults(false);
                            setSearchQuery("");
                          }}
                          className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-xs group"
                        >
                          <div className="min-w-0 flex-1 mr-3">
                            <div className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {inv.customer_name}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5 font-mono">
                              <span>{inv.invoice_id}</span>
                              <span>•</span>
                              <span>{inv.days_overdue}d overdue</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-foreground font-mono">
                              ₹{inv.invoice_amount.toLocaleString("en-IN")}
                            </div>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.2 rounded font-bold uppercase",
                              inv.risk.risk_level === "Critical" ? "text-destructive" :
                              inv.risk.risk_level === "High" ? "text-amber-600" : "text-emerald-600"
                            )}>
                              {inv.risk.risk_level}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-muted-foreground hidden sm:flex" aria-label="Notifications">
              <Bell className="w-4 h-4" />
            </Button>
            <Link
              href="/settings"
              className={cn(
                "hidden sm:flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium border transition-colors",
                location.startsWith("/settings")
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              data-testid="btn-settings-nav"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
