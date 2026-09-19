export interface WalkthroughStep {
  id: string;
  route: string;
  title: string;
  body: string;
  detail?: string;
  category: "overview" | "invoices" | "reports" | "settings";
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  // ── Welcome ────────────────────────────────────────────────────────────
  {
    id: "welcome",
    route: "/",
    title: "Welcome to Collections Copilot",
    body: "This workspace gives your finance team a single, clear view of every overdue account — with AI-powered risk scoring, smart message drafts, and real-time portfolio analytics.",
    detail:
      "You can move through the tour at your own pace, skip it at any time, and restart it later from the help button in the sidebar.",
    category: "overview",
  },

  // ── Overview / Dashboard ────────────────────────────────────────────────
  {
    id: "portfolio-kpis",
    route: "/",
    title: "Portfolio KPIs at a glance",
    body: "The top ribbon shows your total overdue capital, the portion requiring action today, critical-risk exposure, and Days Sales Outstanding — all updated from live invoice data.",
    detail:
      "DSO tracks the invoice-weighted average time from issuance to settlement. A rising DSO signals collection delays before they become write-offs.",
    category: "overview",
  },
  {
    id: "aging-chart",
    route: "/",
    title: "Aging distribution and risk ring",
    body: "The bar chart groups outstanding balances by overdue bracket so you can see where capital is concentrated. The risk ring on the right shows how many accounts fall into each AI-assigned tier.",
    detail:
      "Click any risk tier to filter the priority queue below — the table updates immediately to show only matching accounts.",
    category: "overview",
  },
  {
    id: "priority-queue",
    route: "/",
    title: "Priority action queue",
    body: "Below the charts is your ranked work list. Accounts are ordered by loss probability, days overdue, and relationship exposure — not just invoice date.",
    detail:
      "Use the tabs to switch between all accounts, critical-only, follow-ups due today, or notices already sent. The search and filter controls let you narrow further without losing the priority ranking.",
    category: "overview",
  },

  // ── Invoices ────────────────────────────────────────────────────────────
  {
    id: "invoices-filters",
    route: "/invoices",
    title: "Filtering and sorting invoices",
    body: "The Invoices page lets you slice the full receivables book by risk tier, status, customer segment, and aging bracket simultaneously. Combine filters freely — the count in the header updates as you go.",
    detail:
      "Amount range filters let you focus on high-value tranches quickly. All active filters are summarised in a count badge you can clear in one click.",
    category: "invoices",
  },
  {
    id: "invoices-views",
    route: "/invoices",
    title: "Table view and Risk Kanban",
    body: "Toggle between the sortable table and the Risk Kanban board. The Kanban groups invoices into four risk columns so you can see at a glance how much capital sits in each band.",
    detail:
      "In the Kanban view, click any card to preview invoice details. In the table, click column headers to re-sort by customer name, amount, overdue days, due date, or risk score.",
    category: "invoices",
  },
  {
    id: "invoices-bulk",
    route: "/invoices",
    title: "Batch collection actions",
    body: "Select one or more invoices using the checkboxes, then choose a batch action from the toolbar that appears: mark as sent, regenerate AI drafts, or export to CSV.",
    detail:
      "Each row also has a direct link to the invoice detail page, where you can read the full AI-generated collection notice, preview it, and record any manual follow-up notes.",
    category: "invoices",
  },

  // ── Reports ─────────────────────────────────────────────────────────────
  {
    id: "reports-kpis",
    route: "/reports",
    title: "Executive analytics and digest",
    body: "The Reports page consolidates your portfolio health into five executive KPIs, four interactive charts, and a full aging breakdown matrix — updated from the same live data as the dashboard.",
    detail:
      "The Copilot Executive Digest at the top summarises AI observations about your current portfolio and links directly to the priority action queue.",
    category: "reports",
  },
  {
    id: "reports-charts",
    route: "/reports",
    title: "Interactive charts and drilldown",
    body: "Click any bar in the AR Aging chart to filter the debtor table below to that bracket. The monthly collection velocity chart shows billed vs recovered cash over six rolling months.",
    detail:
      "Use the time horizon selector — 30 days, quarter, YTD, or TTM — to adjust the reporting window. Export to CSV or print a formatted report for stakeholder review.",
    category: "reports",
  },

  // ── Settings ────────────────────────────────────────────────────────────
  {
    id: "settings-engine",
    route: "/settings",
    title: "Copilot engine and operating mode",
    body: "Settings controls which engine drives risk scoring and message generation. The AI engine is on by default; toggling Offline Mode switches to deterministic rule-based scoring for auditing or resilience testing.",
    detail:
      "The engine indicator in the sidebar header and the dashboard always reflect the current mode so everyone on the team can see what is driving decisions.",
    category: "settings",
  },
  {
    id: "settings-identity",
    route: "/settings",
    title: "Company identity and thresholds",
    body: "Set your company name, logo URL, currency, and locale. These appear in every AI-generated outreach message and printed report.",
    detail:
      "Escalation thresholds define how many days overdue trigger each tone level — gentle, firm, serious, and final. The AI selects the right tone automatically based on these values.",
    category: "settings",
  },

  // ── Finish ──────────────────────────────────────────────────────────────
  {
    id: "finish",
    route: "/",
    title: "You are ready to start",
    body: "That covers the key areas of Collections Copilot. Your portfolio is loaded and the priority queue is waiting. Start with the accounts the AI has ranked highest and work from there.",
    detail:
      "You can restart this walkthrough at any time using the help button in the bottom of the sidebar.",
    category: "overview",
  },
];

export const CATEGORY_LABELS: Record<WalkthroughStep["category"], string> = {
  overview: "Overview",
  invoices: "Invoices",
  reports: "Reports",
  settings: "Settings",
};
