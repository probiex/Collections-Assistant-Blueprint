export type Segment = "Enterprise" | "SMB" | "Startup";
export type Status = "Overdue" | "Reminder Sent" | "Escalated";

export type SeedInvoice = {
  invoice_id: string;
  customer_name: string;
  customer_segment: Segment;
  contact_person: string;
  invoice_amount: number;
  invoice_date: string;
  due_date: string;
  payment_terms: string;
  payment_history: string;
  reminders_sent: number;
  last_reminder_date: string | null;
  relationship_years: number;
  annual_volume: number;
  status: Status;
  notes: string;
};

const invoice = (
  invoice_id: string,
  customer_name: string,
  customer_segment: Segment,
  contact_person: string,
  invoice_amount: number,
  invoice_date: string,
  due_date: string,
  payment_terms: string,
  payment_history: string,
  reminders_sent: number,
  last_reminder_date: string | null,
  relationship_years: number,
  annual_volume: number,
  status: Status,
  notes: string,
): SeedInvoice => ({
  invoice_id, customer_name, customer_segment, contact_person, invoice_amount,
  invoice_date, due_date, payment_terms, payment_history, reminders_sent,
  last_reminder_date, relationship_years, annual_volume, status, notes,
});

export const REFERENCE_DATE = "2026-09-19";

export const seedInvoices: SeedInvoice[] = [
  invoice("INV-2041", "Meridian Textiles Pvt Ltd", "Enterprise", "Rohan Kapoor", 245000, "2026-07-05", "2026-08-04", "Net 30", "always on time", 1, "2026-09-10", 3, 1200000, "Reminder Sent", "First late payment in 3-year relationship"),
  invoice("INV-2042", "Bluepeak Analytics", "Startup", "Sneha Iyer", 18500, "2026-08-20", "2026-09-05", "Net 15", "chronic late payer", 2, "2026-09-15", 1, 90000, "Escalated", "Late on 4 of last 5 invoices"),
  invoice("INV-2043", "Kaveri Foods & Beverages", "SMB", "Anand Menon", 62000, "2026-06-01", "2026-07-01", "Net 30", "chronic late payer", 3, "2026-09-08", 2, 340000, "Escalated", "90+ days overdue, no response to last 2 reminders"),
  invoice("INV-2044", "NovaCart Retail Solutions", "SMB", "Priya Deshmukh", 9200, "2026-09-08", "2026-09-14", "Net 7", "always on time", 0, null, 0.5, 42000, "Overdue", "New customer, likely just an oversight"),
  invoice("INV-2045", "Suryodaya Constructions", "Enterprise", "Vikram Rathore", 480000, "2026-06-15", "2026-07-15", "Net 30", "occasionally late", 2, "2026-09-01", 5, 2800000, "Escalated", "Largest account, historically pays within 45-60 days"),
  invoice("INV-2046", "Whistlewind Media", "Startup", "Arjun Bhatt", 27500, "2026-08-28", "2026-09-11", "Net 14", "first time late", 1, "2026-09-16", 1.5, 150000, "Reminder Sent", "Previously reliable, missed this one"),
  invoice("INV-2047", "Ganges Pharma Distributors", "Enterprise", "Dr. Neha Suresh", 156000, "2026-05-20", "2026-06-19", "Net 30", "chronic late payer", 4, "2026-09-12", 4, 980000, "Escalated", "90+ days, high value, high relationship equity — sensitive case"),
  invoice("INV-2048", "Orbit Learning Pvt Ltd", "SMB", "Kavita Nair", 14200, "2026-09-10", "2026-09-17", "Net 7", "always on time", 0, null, 2, 68000, "Overdue", "2 days overdue, likely just processing"),
  invoice("INV-2049", "Zenith Logistics", "Enterprise", "Manoj Pillai", 310000, "2026-07-01", "2026-07-31", "Net 30", "occasionally late", 2, "2026-09-05", 2, 1500000, "Reminder Sent", "Mid-range risk, consistent pattern of ~20 days late"),
  invoice("INV-2050", "Coral Bay Hospitality", "SMB", "Farah Shaikh", 41000, "2026-08-01", "2026-08-31", "Net 30", "chronic late payer", 2, "2026-09-14", 1, 210000, "Reminder Sent", "Seasonal cash flow issues, known pattern"),
  invoice("INV-2051", "Ashoka Steel Traders", "Enterprise", "Deepak Chawla", 720000, "2026-05-10", "2026-06-09", "Net 30", "chronic late payer", 3, "2026-09-10", 6, 4200000, "Escalated", "Highest value invoice on ledger, 100+ days overdue"),
  invoice("INV-2052", "Fernhill Design Studio", "Startup", "Aisha Rahman", 6800, "2026-09-05", "2026-09-12", "Net 7", "always on time", 0, null, 0.8, 30000, "Overdue", "Small amount, brand new relationship, no history of issues"),
  invoice("INV-2053", "Trident Auto Components", "Enterprise", "Ramesh Iyengar", 198000, "2026-07-20", "2026-08-19", "Net 30", "occasionally late", 1, "2026-09-11", 3, 950000, "Reminder Sent", "Usually pays within a week of reminder"),
  invoice("INV-2054", "Lumen Solar Energy", "SMB", "Divya Krishnan", 87000, "2026-06-25", "2026-07-25", "Net 30", "chronic late payer", 3, "2026-09-13", 1.5, 310000, "Escalated", "55+ days, repeated broken payment promises"),
  invoice("INV-2055", "Harborline Freight", "Enterprise", "Sunil Vora", 132000, "2026-08-15", "2026-09-14", "Net 30", "always on time", 0, null, 4, 780000, "Overdue", "1 day overdue, near-perfect history"),
  invoice("INV-2056", "Pixel & Palette Studio", "Startup", "Ritu Bansal", 22000, "2026-08-01", "2026-08-15", "Net 14", "chronic late payer", 2, "2026-09-09", 0.7, 88000, "Escalated", "Short relationship, already showing pattern"),
  invoice("INV-2057", "Windrose Apparel Exports", "SMB", "Karan Malhotra", 54500, "2026-08-10", "2026-08-24", "Net 14", "first time late", 1, "2026-09-14", 2.5, 260000, "Reminder Sent", "Reliable customer, cited a client payment delay of their own"),
  invoice("INV-2058", "Everstone Realty Advisors", "Enterprise", "Nikhil Oberoi", 410000, "2026-06-05", "2026-07-05", "Net 30", "occasionally late", 3, "2026-09-07", 3.5, 1900000, "Escalated", "75+ days overdue, went quiet after 2nd reminder"),
];