# Payment Collections Assistant — Build Plan (v2)
### Razorpay Rize × Replit Buildathon | Track: Finance & Business Ops
### v2 additions: production-realistic sample data + AI fallback system

---

## 1. The Pitch

> "Every business loses time and cash chasing overdue invoices manually. We built an AI collections assistant that scores every overdue invoice by risk, explains *why*, and drafts a personalized, appropriately-escalated follow-up message for each customer — gentle nudge for day 5, firm reminder for day 30, final notice for day 60+. What used to take a finance person an afternoon takes 10 seconds."

Submission one-liner:
> "AI-powered collections dashboard that scores overdue invoices by risk and auto-drafts tone-escalated follow-up messages per customer — works fully offline with smart fallback if no AI key is available."

That last clause is now a genuine selling point — it shows engineering maturity, not just a prompt wrapper. Say it out loud on stage.

---

## 2. What You're Building

Same three-part app as before:
1. **Collections Dashboard** — invoices sorted by risk
2. **Risk Engine** — Claude-scored, with a rules-based fallback that's just as convincing
3. **Message Composer** — Claude-drafted, tone-escalated, with a template-based fallback

**Critical design principle for v2:** the UI must never know or care whether a score/message came from Claude or from the fallback engine. Both return the exact same JSON shape. This is what makes the demo bulletproof — if the API key is missing, rate-limited, or the wifi drops mid-showcase, nothing visibly breaks.

---

## 3. Why This Still Scores Well

| Judging criterion | How this hits it |
|---|---|
| Real, well-defined problem | Universal, direct Razorpay alignment |
| Actually works | Live scores + live messages, resilient to demo-day failures |
| Creative use of Agent | Multi-step reasoning + a designed fallback architecture (shows real engineering judgment, not just prompting) |
| Wow-factor | Risk reasoning + tone contrast + "it still works even if I turn off wifi" moment |

---

## 4. Production-Realistic Sample Dataset

Build this as `invoices.json`, seeded at app start (or read from this file directly). 18 invoices, deliberately varied so the risk engine and message generator have real contrast to work with. Amounts and names read like a real Indian SMB/enterprise ledger, not placeholder text.

```json
[
  {
    "invoice_id": "INV-2041",
    "customer_name": "Meridian Textiles Pvt Ltd",
    "customer_segment": "Enterprise",
    "contact_person": "Rohan Kapoor",
    "invoice_amount": 245000,
    "invoice_date": "2026-07-05",
    "due_date": "2026-08-04",
    "payment_terms": "Net 30",
    "payment_history": "always on time",
    "reminders_sent": 1,
    "last_reminder_date": "2026-09-10",
    "relationship_years": 3,
    "annual_volume": 1200000,
    "status": "Reminder Sent",
    "notes": "First late payment in 3-year relationship"
  },
  {
    "invoice_id": "INV-2042",
    "customer_name": "Bluepeak Analytics",
    "customer_segment": "Startup",
    "contact_person": "Sneha Iyer",
    "invoice_amount": 18500,
    "invoice_date": "2026-08-20",
    "due_date": "2026-09-05",
    "payment_terms": "Net 15",
    "payment_history": "chronic late payer",
    "reminders_sent": 2,
    "last_reminder_date": "2026-09-15",
    "relationship_years": 1,
    "annual_volume": 90000,
    "status": "Escalated",
    "notes": "Late on 4 of last 5 invoices"
  },
  {
    "invoice_id": "INV-2043",
    "customer_name": "Kaveri Foods & Beverages",
    "customer_segment": "SMB",
    "contact_person": "Anand Menon",
    "invoice_amount": 62000,
    "invoice_date": "2026-06-01",
    "due_date": "2026-07-01",
    "payment_terms": "Net 30",
    "payment_history": "chronic late payer",
    "reminders_sent": 3,
    "last_reminder_date": "2026-09-08",
    "relationship_years": 2,
    "annual_volume": 340000,
    "status": "Escalated",
    "notes": "90+ days overdue, no response to last 2 reminders"
  },
  {
    "invoice_id": "INV-2044",
    "customer_name": "NovaCart Retail Solutions",
    "customer_segment": "SMB",
    "contact_person": "Priya Deshmukh",
    "invoice_amount": 9200,
    "invoice_date": "2026-09-08",
    "due_date": "2026-09-14",
    "payment_terms": "Net 7",
    "payment_history": "always on time",
    "reminders_sent": 0,
    "last_reminder_date": null,
    "relationship_years": 0.5,
    "annual_volume": 42000,
    "status": "Overdue",
    "notes": "New customer, likely just an oversight"
  },
  {
    "invoice_id": "INV-2045",
    "customer_name": "Suryodaya Constructions",
    "customer_segment": "Enterprise",
    "contact_person": "Vikram Rathore",
    "invoice_amount": 480000,
    "invoice_date": "2026-06-15",
    "due_date": "2026-07-15",
    "payment_terms": "Net 30",
    "payment_history": "occasionally late",
    "reminders_sent": 2,
    "last_reminder_date": "2026-09-01",
    "relationship_years": 5,
    "annual_volume": 2800000,
    "status": "Escalated",
    "notes": "Largest account, historically pays within 45-60 days"
  },
  {
    "invoice_id": "INV-2046",
    "customer_name": "Whistlewind Media",
    "customer_segment": "Startup",
    "contact_person": "Arjun Bhatt",
    "invoice_amount": 27500,
    "invoice_date": "2026-08-28",
    "due_date": "2026-09-11",
    "payment_terms": "Net 14",
    "payment_history": "first time late",
    "reminders_sent": 1,
    "last_reminder_date": "2026-09-16",
    "relationship_years": 1.5,
    "annual_volume": 150000,
    "status": "Reminder Sent",
    "notes": "Previously reliable, missed this one"
  },
  {
    "invoice_id": "INV-2047",
    "customer_name": "Ganges Pharma Distributors",
    "customer_segment": "Enterprise",
    "contact_person": "Dr. Neha Suresh",
    "invoice_amount": 156000,
    "invoice_date": "2026-05-20",
    "due_date": "2026-06-19",
    "payment_terms": "Net 30",
    "payment_history": "chronic late payer",
    "reminders_sent": 4,
    "last_reminder_date": "2026-09-12",
    "relationship_years": 4,
    "annual_volume": 980000,
    "status": "Escalated",
    "notes": "90+ days, high value, high relationship equity — sensitive case"
  },
  {
    "invoice_id": "INV-2048",
    "customer_name": "Orbit Learning Pvt Ltd",
    "customer_segment": "SMB",
    "contact_person": "Kavita Nair",
    "invoice_amount": 14200,
    "invoice_date": "2026-09-10",
    "due_date": "2026-09-17",
    "payment_terms": "Net 7",
    "payment_history": "always on time",
    "reminders_sent": 0,
    "last_reminder_date": null,
    "relationship_years": 2,
    "annual_volume": 68000,
    "status": "Overdue",
    "notes": "2 days overdue, likely just processing"
  },
  {
    "invoice_id": "INV-2049",
    "customer_name": "Zenith Logistics",
    "customer_segment": "Enterprise",
    "contact_person": "Manoj Pillai",
    "invoice_amount": 310000,
    "invoice_date": "2026-07-01",
    "due_date": "2026-07-31",
    "payment_terms": "Net 30",
    "payment_history": "occasionally late",
    "reminders_sent": 2,
    "last_reminder_date": "2026-09-05",
    "relationship_years": 2,
    "annual_volume": 1500000,
    "status": "Reminder Sent",
    "notes": "Mid-range risk, consistent pattern of ~20 days late"
  },
  {
    "invoice_id": "INV-2050",
    "customer_name": "Coral Bay Hospitality",
    "customer_segment": "SMB",
    "contact_person": "Farah Shaikh",
    "invoice_amount": 41000,
    "invoice_date": "2026-08-01",
    "due_date": "2026-08-31",
    "payment_terms": "Net 30",
    "payment_history": "chronic late payer",
    "reminders_sent": 2,
    "last_reminder_date": "2026-09-14",
    "relationship_years": 1,
    "annual_volume": 210000,
    "status": "Reminder Sent",
    "notes": "Seasonal cash flow issues, known pattern"
  },
  {
    "invoice_id": "INV-2051",
    "customer_name": "Ashoka Steel Traders",
    "customer_segment": "Enterprise",
    "contact_person": "Deepak Chawla",
    "invoice_amount": 720000,
    "invoice_date": "2026-05-10",
    "due_date": "2026-06-09",
    "payment_terms": "Net 30",
    "payment_history": "chronic late payer",
    "reminders_sent": 3,
    "last_reminder_date": "2026-09-10",
    "relationship_years": 6,
    "annual_volume": 4200000,
    "status": "Escalated",
    "notes": "Highest value invoice on ledger, 100+ days overdue"
  },
  {
    "invoice_id": "INV-2052",
    "customer_name": "Fernhill Design Studio",
    "customer_segment": "Startup",
    "contact_person": "Aisha Rahman",
    "invoice_amount": 6800,
    "invoice_date": "2026-09-05",
    "due_date": "2026-09-12",
    "payment_terms": "Net 7",
    "payment_history": "always on time",
    "reminders_sent": 0,
    "last_reminder_date": null,
    "relationship_years": 0.8,
    "annual_volume": 30000,
    "status": "Overdue",
    "notes": "Small amount, brand new relationship, no history of issues"
  },
  {
    "invoice_id": "INV-2053",
    "customer_name": "Trident Auto Components",
    "customer_segment": "Enterprise",
    "contact_person": "Ramesh Iyengar",
    "invoice_amount": 198000,
    "invoice_date": "2026-07-20",
    "due_date": "2026-08-19",
    "payment_terms": "Net 30",
    "payment_history": "occasionally late",
    "reminders_sent": 1,
    "last_reminder_date": "2026-09-11",
    "relationship_years": 3,
    "annual_volume": 950000,
    "status": "Reminder Sent",
    "notes": "Usually pays within a week of reminder"
  },
  {
    "invoice_id": "INV-2054",
    "customer_name": "Lumen Solar Energy",
    "customer_segment": "SMB",
    "contact_person": "Divya Krishnan",
    "invoice_amount": 87000,
    "invoice_date": "2026-06-25",
    "due_date": "2026-07-25",
    "payment_terms": "Net 30",
    "payment_history": "chronic late payer",
    "reminders_sent": 3,
    "last_reminder_date": "2026-09-13",
    "relationship_years": 1.5,
    "annual_volume": 310000,
    "status": "Escalated",
    "notes": "55+ days, repeated broken payment promises"
  },
  {
    "invoice_id": "INV-2055",
    "customer_name": "Harborline Freight",
    "customer_segment": "Enterprise",
    "contact_person": "Sunil Vora",
    "invoice_amount": 132000,
    "invoice_date": "2026-08-15",
    "due_date": "2026-09-14",
    "payment_terms": "Net 30",
    "payment_history": "always on time",
    "reminders_sent": 0,
    "last_reminder_date": null,
    "relationship_years": 4,
    "annual_volume": 780000,
    "status": "Overdue",
    "notes": "1 day overdue, near-perfect history"
  },
  {
    "invoice_id": "INV-2056",
    "customer_name": "Pixel & Palette Studio",
    "customer_segment": "Startup",
    "contact_person": "Ritu Bansal",
    "invoice_amount": 22000,
    "invoice_date": "2026-08-01",
    "due_date": "2026-08-15",
    "payment_terms": "Net 14",
    "payment_history": "chronic late payer",
    "reminders_sent": 2,
    "last_reminder_date": "2026-09-09",
    "relationship_years": 0.7,
    "annual_volume": 88000,
    "status": "Escalated",
    "notes": "Short relationship, already showing pattern"
  },
  {
    "invoice_id": "INV-2057",
    "customer_name": "Windrose Apparel Exports",
    "customer_segment": "SMB",
    "contact_person": "Karan Malhotra",
    "invoice_amount": 54500,
    "invoice_date": "2026-08-10",
    "due_date": "2026-08-24",
    "payment_terms": "Net 14",
    "payment_history": "first time late",
    "reminders_sent": 1,
    "last_reminder_date": "2026-09-14",
    "relationship_years": 2.5,
    "annual_volume": 260000,
    "status": "Reminder Sent",
    "notes": "Reliable customer, cited a client payment delay of their own"
  },
  {
    "invoice_id": "INV-2058",
    "customer_name": "Everstone Realty Advisors",
    "customer_segment": "Enterprise",
    "contact_person": "Nikhil Oberoi",
    "invoice_amount": 410000,
    "invoice_date": "2026-06-05",
    "due_date": "2026-07-05",
    "payment_terms": "Net 30",
    "payment_history": "occasionally late",
    "reminders_sent": 3,
    "last_reminder_date": "2026-09-07",
    "relationship_years": 3.5,
    "annual_volume": 1900000,
    "status": "Escalated",
    "notes": "75+ days overdue, went quiet after 2nd reminder"
  }
]
```

**Note on `days_overdue`:** don't hardcode it — compute it in the app as `today - due_date`. That way the dataset stays "live" no matter what day you demo it, and you never have to remember to edit the JSON before showcase.

### The 4 "hero" invoices to memorize for your demo
- **INV-2041 (Meridian Textiles)** — Enterprise, first-time late, 3-year relationship → should score Medium, soft tone
- **INV-2043 (Kaveri Foods)** — chronic late payer, 90+ days, ignored reminders → should score Critical, firm tone
- **INV-2047 (Ganges Pharma)** — chronic late, but huge relationship value (4 yrs, ₹9.8L/yr) → interesting tension case, good for showing nuance
- **INV-2052 (Fernhill Design)** — brand new customer, tiny amount, 1 week overdue → Low risk, gentle tone, near-zero urgency

These four alone tell a complete story across the risk spectrum — build your whole demo script around them.

---

## 5. Risk Scoring Logic (unchanged, restated for clarity)

Score = function of:
- **Days overdue** (computed live, not linear — first 15 days is low concern)
- **Payment history pattern** (chronic >> first-time-late, even at equal days-overdue)
- **Amount at stake** relative to typical invoice size
- **Reminders already ignored**
- **Relationship value** (years + annual volume — can *soften* a score even when other factors point to Critical; this nuance is your best talking point)

Required output shape (same whether from Claude or fallback):
```json
{
  "risk_level": "High",
  "risk_score": 78,
  "reasoning": "45 days overdue with 2 reminders unanswered, but this is a first-time late payment from a 3-year customer with strong payment history — recommend firm but relationship-preserving tone rather than aggressive escalation."
}
```

---

## 6. Message Escalation Ladder (unchanged)

| Stage | Days overdue | Tone | Contains |
|---|---|---|---|
| Gentle nudge | 1–14 | Friendly, assumes oversight | "just a heads up," no pressure |
| Firm reminder | 15–30 | Professional, direct | Amount, due date, ask for payment date |
| Serious follow-up | 31–60 | Formal, urgent | References prior reminders, requests action |
| Final notice | 60+ | Firm, consequence-aware, never rude | States next steps professionally |

Required output shape:
```json
{
  "subject": "Following up on Invoice INV-2043",
  "message": "Hi Anand, I wanted to follow up on Invoice INV-2043 for ₹62,000, which is now over 90 days past due...",
  "tone_used": "serious_followup"
}
```

---

## 7. AI Fallback System — THE NEW CORE OF THIS VERSION

This is the part that makes the build genuinely demo-proof and also a good engineering talking point ("we built this so a missing API key or a wifi drop never breaks the demo").

### 7.1 Architecture

```
[Invoice data] → [tryClaudeScoring()] → success? → use it
                        ↓ fail/no key/timeout
                  [fallbackScoring()] → rules-based, same JSON shape
```

Same pattern for message generation. Wrap every AI call like this:

```javascript
async function getRiskScore(invoice) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("no key");
    const result = await callClaudeForRiskScore(invoice); // with a timeout, e.g. 8s
    return { ...result, source: "ai" };
  } catch (err) {
    console.warn("Falling back to rules-based scoring:", err.message);
    return { ...fallbackRiskScore(invoice), source: "fallback" };
  }
}
```

Do the same wrapper for message generation. **Always catch, always timeout, always fall back — never let a failed fetch show an error state to the user.**

### 7.2 Fallback Risk Scoring (rules-based, no AI needed)

A simple weighted point system that mimics what Claude would reason about:

```javascript
function fallbackRiskScore(invoice) {
  let points = 0;

  // Days overdue
  if (invoice.days_overdue > 60) points += 40;
  else if (invoice.days_overdue > 30) points += 28;
  else if (invoice.days_overdue > 14) points += 15;
  else points += 5;

  // Payment history
  const historyPoints = {
    "chronic late payer": 30,
    "occasionally late": 15,
    "first time late": 8,
    "always on time": 0
  };
  points += historyPoints[invoice.payment_history] ?? 10;

  // Reminders ignored
  points += Math.min(invoice.reminders_sent * 8, 24);

  // Amount relative to their annual volume (bigger relative bite = more urgency)
  const amountRatio = invoice.invoice_amount / (invoice.annual_volume || invoice.invoice_amount);
  if (amountRatio > 0.15) points += 15;
  else if (amountRatio > 0.05) points += 8;

  // Relationship value SOFTENS the score
  if (invoice.relationship_years >= 2 && invoice.payment_history !== "chronic late payer") {
    points -= 12;
  }

  points = Math.max(0, Math.min(100, points));

  let risk_level;
  if (points >= 70) risk_level = "Critical";
  else if (points >= 50) risk_level = "High";
  else if (points >= 25) risk_level = "Medium";
  else risk_level = "Low";

  // Template-based reasoning that still sounds specific and human
  const reasoning = buildFallbackReasoning(invoice, risk_level, points);

  return { risk_level, risk_score: points, reasoning };
}

function buildFallbackReasoning(inv, level, score) {
  const parts = [];
  parts.push(`${inv.days_overdue} days overdue`);
  if (inv.reminders_sent > 0) parts.push(`${inv.reminders_sent} reminder(s) sent with no resolution`);
  if (inv.payment_history === "chronic late payer") parts.push("this customer has a recurring late-payment pattern");
  if (inv.payment_history === "first time late" && inv.relationship_years >= 2)
    parts.push(`this is unusual for a customer with a ${inv.relationship_years}-year reliable history`);
  if (inv.relationship_years >= 3) parts.push("high relationship value suggests a measured approach");

  return `${parts.join(", ")}. Suggested risk level: ${level}.`;
}
```

This produces reasoning text that reads *almost* as well as Claude's for the demo, and the numbers-driven logic means it genuinely varies across your 18 invoices — it won't look canned.

### 7.3 Fallback Message Generation (template-based, tone-matched)

Pre-write 4 templates (one per escalation stage), each with variable slots, and pick tone modifiers based on relationship/history — this is what keeps fallback messages from sounding robotic:

```javascript
const templates = {
  gentle: (inv) =>
`Hi ${inv.contact_person},

Hope you're doing well! Just a quick note — Invoice ${inv.invoice_id} for ₹${inv.invoice_amount.toLocaleString('en-IN')} was due on ${formatDate(inv.due_date)}. It's possible this slipped through, so wanted to flag it. Could you let us know an expected payment date when you get a chance?

Thanks so much,
Accounts Team`,

  firm: (inv) =>
`Hi ${inv.contact_person},

This is a follow-up regarding Invoice ${inv.invoice_id} for ₹${inv.invoice_amount.toLocaleString('en-IN')}, which was due on ${formatDate(inv.due_date)} and is now ${inv.days_overdue} days overdue. Could you confirm a payment date at your earliest convenience? Happy to answer any questions on the invoice.

Best regards,
Accounts Team`,

  serious: (inv) =>
`Hi ${inv.contact_person},

We've reached out ${inv.reminders_sent} time(s) previously regarding Invoice ${inv.invoice_id} for ₹${inv.invoice_amount.toLocaleString('en-IN')}, now ${inv.days_overdue} days past due. We'd appreciate immediate attention on this — please share a firm payment date within the next few days, or let us know if there's an issue we should be aware of.

Regards,
Accounts Team`,

  final: (inv) =>
`Dear ${inv.contact_person},

Invoice ${inv.invoice_id} for ₹${inv.invoice_amount.toLocaleString('en-IN')} remains unpaid at ${inv.days_overdue} days overdue, despite ${inv.reminders_sent} prior reminders. Please treat this as a final notice — we request payment within 7 days to avoid further escalation, including a possible pause on ongoing services. We value the relationship and would much rather resolve this directly, so please reach out at the earliest.

Regards,
Accounts Team`
};

function fallbackMessage(invoice) {
  let stage = "gentle";
  if (invoice.days_overdue > 60) stage = "final";
  else if (invoice.days_overdue > 30) stage = "serious";
  else if (invoice.days_overdue > 14) stage = "firm";

  // Relationship-aware softening: long-term reliable customers get gentler treatment
  // even at higher days-overdue, mirroring what we ask Claude to do
  if (invoice.relationship_years >= 3 && invoice.payment_history !== "chronic late payer" && stage === "serious") {
    stage = "firm";
  }

  return {
    subject: `Following up on Invoice ${invoice.invoice_id}`,
    message: templates[stage](invoice),
    tone_used: stage
  };
}
```

### 7.4 Make the fallback visible (don't hide it — flaunt it)

Add a small, tasteful badge in the UI: `⚡ AI-generated` vs `🔧 Rules-based (offline mode)`. This is a deliberate choice:
- If your API key works all day: badge always shows "AI-generated," fine.
- If it fails mid-demo: judges *see* the system gracefully degrade instead of crashing — that's a stronger engineering story than pretending it never happens.
- You can literally demo this live: "and here's what happens if I simulate no API key" → toggle a debug flag → same UI, same quality bar, fallback badge appears. That's a great, memorable 20-second bit for the judges.

### 7.5 Testing checklist for the fallback
- [ ] App works with `ANTHROPIC_API_KEY` unset entirely
- [ ] App works if the Claude API call times out (simulate with a short artificial delay + low timeout)
- [ ] App works if Claude returns malformed JSON (wrap `JSON.parse` in try/catch, fall back on parse failure too)
- [ ] Fallback reasoning text varies meaningfully across your 18 invoices — spot check 4–5 of them
- [ ] Fallback messages are grammatically clean and tone-distinct at all 4 stages

---

## 8. Screens (unchanged from v1, restated)

### Screen 1 — Dashboard
- Summary stats bar: total overdue ₹, # invoices, # Critical, projected recovery
- Table/cards sorted by risk (Critical → Low), color-coded badges
- Small source indicator (AI / fallback) per row, subtle

### Screen 2 — Invoice Detail / Message Composer
- Full invoice details + payment history
- Risk score + reasoning (visible, not tucked away)
- Editable drafted message + subject line
- "Regenerate — softer / firmer" dropdown
- "Mark as Sent" button → updates status + timestamp

### Screen 3 (optional) — Insights Summary
- AI (or fallback) generated 2–3 sentence portfolio summary: total at risk, which accounts need urgent attention this week

---

## 9. Build Order (fits ~4hr window, fallback work folded in)

| Time | Task |
|---|---|
| 0:00–0:20 | Drop in the seed dataset above as `invoices.json`; compute `days_overdue` live from `due_date` |
| 0:20–1:00 | Dashboard UI reading from seed data, sorting, risk badges (placeholder scores) |
| 1:00–1:20 | Build `fallbackRiskScore()` + `fallbackMessage()` first — get these working and looking good on their own, no API needed yet |
| 1:20–2:00 | Wire up real Claude scoring + messages with the try/catch/timeout → fallback pattern from Section 7.1 |
| 2:00–2:30 | Message composer screen, regenerate tone dropdown, "Mark as Sent" flow |
| 2:30–3:15 | Lunch |
| 3:15–3:35 | Add the AI/fallback source badge + a demo toggle to force fallback mode on stage |
| 3:35–3:50 | Insights summary screen (optional) |
| 3:50–4:15 | Visual polish — fintech aesthetic, spacing, color, fonts |
| 4:15–4:30 | Rehearse demo (Section 11), publish, get Replit link, submit |

**Why build fallback first:** it de-risks your whole day. You'll have a fully working, good-looking demo before you've spent a single API call — then the Claude integration is strictly additive, not a single point of failure.

---

## 10. Prompts to Feed the Replit Agent

**Prompt 1 — scaffold + seed data:**
> Build a web app called "Collections Copilot" — a payment collections dashboard. Use this invoice data as a seed JSON file: [paste the 18-invoice JSON from Section 4]. Compute `days_overdue` live from `due_date` vs today's date, don't hardcode it. Show a dashboard with a summary stats bar (total overdue amount, invoice count, count by risk level) and a card/table grid sorted by risk (Critical first), color-coded risk badges. Clean modern fintech UI — Razorpay/Stripe dashboard aesthetic. Clicking an invoice opens a detail panel.

**Prompt 2 — fallback scoring first:**
> Before adding any external AI calls, implement a rules-based risk scoring function using this logic: [paste Section 7.2 code]. Wire this into the dashboard so every invoice shows a risk badge and a short reasoning sentence generated by this logic. This will be our fallback — build it to genuinely look good on its own.

**Prompt 3 — fallback messages:**
> Now add rules-based message generation using this logic: [paste Section 7.3 code]. Show the generated subject + message in the invoice detail panel, editable in a textarea.

**Prompt 4 — real AI layer with graceful fallback:**
> Now add a Claude API integration that replaces the rules-based scoring and messaging when an API key is available. Use this pattern: try the Claude call with an 8-second timeout, and if it fails, times out, returns malformed JSON, or no API key is present, silently fall back to the existing rules-based functions — never show an error to the user. Both paths must return the same JSON shape: risk_level, risk_score, reasoning for scoring; subject, message, tone_used for messages. Add a small badge on each invoice showing "AI-generated" or "Rules-based" depending on which path was used. For the Claude prompt itself: ask it to weigh days overdue, payment history pattern, reminders ignored, amount relative to typical invoice size, and relationship value (years + annual volume) — relationship value should be able to soften an otherwise high score. For messages, escalate tone across 4 stages (gentle/firm/serious/final) based on days overdue, further adjusted by payment history and relationship value.

**Prompt 5 — polish + demo toggle:**
> Add a "Mark as Sent" button that updates invoice status with a timestamp and shows a success toast. Add a debug toggle (hidden in a settings icon or query param like ?mode=fallback) that forces the app to use the rules-based path even if the API key is present, so we can demo the fallback behavior live. Add an optional insights summary box using the same AI-with-fallback pattern that generates a short weekly collections summary. Polish the UI: consistent spacing, clean sans-serif font, subtle shadows, a fintech-appropriate color palette (avoid default Bootstrap blue).

**Iteration reminder:** after each prompt, actually inspect the output and push back on specifics — "the fallback reasoning for INV-2047 doesn't mention the relationship softening, make that logic show up in the text" — this visible iteration is explicitly part of what's being judged.

---

## 11. Demo Script (~3 minutes, updated with fallback beat)

1. **Hook (15s):** "Every business has this problem — money owed, someone has to chase it, manually."
2. **Dashboard (25s):** Show dashboard, summary stats, risk-sorted list.
3. **Reasoning moment #1 — Meridian Textiles (30s):** Click in. "45 days late — normally Critical. But 3-year customer, first time late, so it's scored Medium with a softer recommended tone. That's not a template, that's reasoning."
4. **Reasoning moment #2 — Kaveri Foods (25s):** Click in, contrast tone. "Same logic, completely different customer — chronic late payer, 90+ days, ignored reminders — Critical, firm tone."
5. **Live regenerate (15s):** Click "regenerate — firmer" to show live flexibility.
6. **The fallback moment (25s):** "One more thing — this doesn't depend on an API key being up during the demo." Toggle fallback mode live. "Same UI, same quality bar, rules-based engine takes over instantly — the app never breaks." This is your most memorable beat; don't skip it even if you're tight on time.
7. **Close (15s):** "Built entirely with Replit Agent and Claude — this is the kind of tool that saves a real finance team hours every week, and it's resilient enough to actually ship."

---

## 12. Common Pitfalls to Avoid

- **Don't** let fallback reasoning read identically across invoices — if it does, your weighting logic needs more signal variety (check Section 7.2 against your actual data)
- **Don't** let the AI/fallback badge look apologetic or buggy — style it like a deliberate feature, not an error state
- **Don't** forget the timeout on the Claude call — an unbounded hang is worse than no AI at all
- **Don't** spend your last 30 minutes touching logic — reserve it for polish + rehearsal
- **Don't** forget to submit the **live published Replit link**, not the editor URL, before 4:00 PM sharp

---

## 13. Submission Checklist

- [ ] Live Replit link (published, not editor) works fresh/incognito
- [ ] App works with zero API key configured (test this explicitly)
- [ ] App works with a valid API key (test this explicitly too)
- [ ] The 4 hero invoices (2041, 2043, 2047, 2052) are reliable and memorized
- [ ] Fallback demo toggle works live
- [ ] One-line description ready: *"AI-powered collections dashboard that scores overdue invoices by risk and auto-drafts tone-escalated follow-up messages per customer — works fully offline with smart fallback if no AI key is available."*
- [ ] Team/builder name + track ("Finance & Business Ops") ready
- [ ] Demo rehearsed once, under 3 minutes, fallback beat included

Good luck — the fallback system is genuinely your strongest differentiator now. Make sure it's visible in the demo, not just working quietly in the background.
