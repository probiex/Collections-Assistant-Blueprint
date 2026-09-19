export interface WalkthroughStep {
  id: string;
  route: string;
  title: string;
  body: string;
  /** data-testid of the sidebar nav element this step points at */
  targetTestId: string;
  /** Legacy – kept so context consumers still compile */
  category: "overview" | "invoices" | "messages" | "risk" | "reports" | "payments" | "integrations" | "export" | "settings";
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "overview",
    route: "/",
    title: "Overview",
    body: "Your command center: live KPIs, aging charts, risk ring, and the AI-ranked priority queue — everything your team needs to start collecting.",
    targetTestId: "nav-dashboard",
    category: "overview",
  },
  {
    id: "invoices",
    route: "/invoices",
    title: "Invoices",
    body: "Browse the full receivables book with combined filters for risk tier, status, segment, and aging bracket. Switch between the sortable table and Risk Kanban board.",
    targetTestId: "nav-invoices",
    category: "invoices",
  },
  {
    id: "messages",
    route: "/messages",
    title: "Messages",
    body: "Review and send AI-drafted collection messages. Each notice is tailored to the account's risk level and days overdue so your outreach always hits the right tone.",
    targetTestId: "nav-messages",
    category: "messages",
  },
  {
    id: "risk-models",
    route: "/risk-models",
    title: "Risk Models",
    body: "Inspect the AI scoring engine that ranks every debtor. Understand model inputs, tune thresholds, and compare AI versus rule-based predictions side by side.",
    targetTestId: "nav-risk-models",
    category: "risk",
  },
  {
    id: "reports",
    route: "/reports",
    title: "Reports",
    body: "Executive dashboards with AR aging matrices, collection velocity charts, and a Copilot digest — exportable to CSV or print for stakeholder review.",
    targetTestId: "nav-reports",
    category: "reports",
  },
  {
    id: "payment-collection",
    route: "/payment-collection",
    title: "Payment Collection",
    body: "Track payment promises, log manual collections, and see a running tally of recovered capital against outstanding balances across the portfolio.",
    targetTestId: "nav-payment",
    category: "payments",
  },
  {
    id: "integrations",
    route: "/integrations",
    title: "Integrations",
    body: "Connect your ERP, accounting software, or CRM. Integrations keep invoice and payment data in sync without manual imports.",
    targetTestId: "nav-integrations",
    category: "integrations",
  },
  {
    id: "export",
    route: "/export",
    title: "Export & Share",
    body: "Download full portfolio data or filtered snapshots as CSV, and share formatted reports with leadership or external auditors.",
    targetTestId: "nav-export",
    category: "export",
  },
  {
    id: "settings",
    route: "/settings",
    title: "Settings",
    body: "Configure the Copilot engine mode, company identity, locale, and escalation thresholds that govern AI tone selection across all outreach.",
    targetTestId: "nav-settings",
    category: "settings",
  },
];

// Kept for any residual consumers
export const CATEGORY_LABELS: Record<WalkthroughStep["category"], string> = {
  overview: "Overview",
  invoices: "Invoices",
  messages: "Messages",
  risk: "Risk Models",
  reports: "Reports",
  payments: "Payment Collection",
  integrations: "Integrations",
  export: "Export & Share",
  settings: "Settings",
};
