import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, X, BookOpen, CheckCheck } from "lucide-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { cn } from "@workspace/ref-design/lib/utils";
import { WALKTHROUGH_STEPS, CATEGORY_LABELS, type WalkthroughStep } from "./steps";

interface WalkthroughModalProps {
  open: boolean;
  stepIndex: number;
  onNext: () => void;
  onBack: () => void;
  onGoTo: (i: number) => void;
  onClose: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

const CATEGORY_ORDER: WalkthroughStep["category"][] = [
  "overview",
  "invoices",
  "reports",
  "settings",
];

export function WalkthroughModal({
  open,
  stepIndex,
  onNext,
  onBack,
  onGoTo,
  onClose,
  onSkip,
  onComplete,
}: WalkthroughModalProps) {
  const [, setLocation] = useLocation();
  const total = WALKTHROUGH_STEPS.length;
  const step = WALKTHROUGH_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;
  const panelRef = useRef<HTMLDivElement>(null);
  const prevRouteRef = useRef<string>("");

  // Navigate to the step's route when it changes
  useEffect(() => {
    if (open && step && step.route !== prevRouteRef.current) {
      prevRouteRef.current = step.route;
      setLocation(step.route);
    }
  }, [open, step, setLocation]);

  // Trap focus within the modal
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();
  }, [open, stepIndex]);

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        isLast ? onComplete() : onNext();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!isFirst) onBack();
      }
    },
    [onClose, onNext, onBack, onComplete, isFirst, isLast]
  );

  if (!open || !step) return null;

  const progress = ((stepIndex + 1) / total) * 100;

  // Group steps by category for the dot nav
  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    steps: WALKTHROUGH_STEPS.map((s, i) => ({ ...s, index: i })).filter(
      (s) => s.category === cat
    ),
  }));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel — bottom-anchored on mobile, centered card on desktop */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Collections Copilot walkthrough"
        aria-describedby="walkthrough-body"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        className={cn(
          // Mobile: slide up from bottom
          "fixed inset-x-0 bottom-0 z-50 flex flex-col bg-background border-t border-border shadow-2xl",
          "rounded-t-2xl max-h-[90dvh] overflow-hidden",
          // Desktop: centered floating card
          "md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
          "md:w-[560px] md:rounded-2xl md:border md:shadow-2xl",
          "animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300"
        )}
        data-testid="walkthrough-modal"
      >
        {/* Progress bar */}
        <div className="h-1 w-full bg-secondary overflow-hidden rounded-t-2xl">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={total}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Getting Started
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground tabular-nums">
              {stepIndex + 1} / {total}
            </span>
            <button
              onClick={onClose}
              aria-label="Close walkthrough"
              className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              data-testid="walkthrough-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2 min-h-0">
          <div className="mb-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              {CATEGORY_LABELS[step.category]}
            </span>
          </div>
          <h2 className="font-serif text-xl font-semibold text-foreground mb-3 leading-snug">
            {step.title}
          </h2>
          <p
            id="walkthrough-body"
            className="text-sm text-foreground leading-relaxed"
          >
            {step.body}
          </p>
          {step.detail && (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3">
              {step.detail}
            </p>
          )}
        </div>

        {/* Section dot-navigation */}
        <div className="px-5 pt-4 pb-2 border-t border-border/60 shrink-0">
          <div className="flex gap-4 justify-center flex-wrap">
            {groups.map(({ cat, label, steps: groupSteps }) => (
              <div key={cat} className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {label}
                </span>
                <div className="flex items-center gap-1">
                  {groupSteps.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onGoTo(s.index)}
                      aria-label={`Go to step: ${s.title}`}
                      className={cn(
                        "rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        s.index === stepIndex
                          ? "w-4 h-2 bg-primary"
                          : s.index < stepIndex
                          ? "w-2 h-2 bg-primary/40 hover:bg-primary/60"
                          : "w-2 h-2 bg-border hover:bg-border/80"
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-xs text-muted-foreground"
            data-testid="walkthrough-skip"
          >
            Skip tour
          </Button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="gap-1"
                aria-label="Previous step"
                data-testid="walkthrough-back"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            )}

            {isLast ? (
              <Button
                size="sm"
                onClick={onComplete}
                className="gap-1.5"
                data-testid="walkthrough-finish"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Get started
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onNext}
                className="gap-1"
                aria-label="Next step"
                data-testid="walkthrough-next"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
