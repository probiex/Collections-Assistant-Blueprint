import { RiskResultRiskLevel, InvoiceStatus } from "@workspace/api-client-react";
import { cva, type VariantProps } from "class-variance-authority";

const riskBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      level: {
        [RiskResultRiskLevel.Low]: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
        [RiskResultRiskLevel.Medium]: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
        [RiskResultRiskLevel.High]: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
        [RiskResultRiskLevel.Critical]: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
      },
    },
    defaultVariants: {
      level: RiskResultRiskLevel.Low,
    },
  }
);

export function RiskBadge({ level }: { level: RiskResultRiskLevel }) {
  return (
    <div className={riskBadgeVariants({ level })} data-testid={`badge-risk-${level}`}>
      {level} Risk
    </div>
  );
}

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      status: {
        [InvoiceStatus.Overdue]: "bg-amber-100 text-amber-800",
        [InvoiceStatus.Reminder_Sent]: "bg-blue-100 text-blue-800",
        [InvoiceStatus.Escalated]: "bg-red-100 text-red-800",
      },
    },
    defaultVariants: {
      status: InvoiceStatus.Overdue,
    },
  }
);

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <div className={statusBadgeVariants({ status })} data-testid={`badge-status-${status.replace(/\s+/g, '-')}`}>
      {status}
    </div>
  );
}
