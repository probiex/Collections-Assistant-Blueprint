/**
 * CoachMark — a small anchored tooltip that points at a real DOM element.
 *
 * Placement logic:
 *  - Desktop (md+): always rendered to the right of the sidebar item.
 *  - Mobile: rendered below or above the item, whichever fits best.
 *  - Recalculates on resize, scroll, and when targetId changes.
 *  - Falls back to a safe centered position if the target is not found.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  X,
  CheckCheck,
} from "lucide-react";
import { Button } from "@workspace/ref-design/components/ui/button";
import { cn } from "@workspace/ref-design/lib/utils";

/** Pixel gap between the target element edge and the coach-mark box */
const GAP = 10;
/** Caret size in pixels */
const CARET = 8;
/** Minimum distance the box must stay from each viewport edge */
const MARGIN = 12;
/** Box width on desktop (px) */
const BOX_W = 288;
/** Box width on mobile (px) — constrained to viewport */
const BOX_W_MOBILE = 260;

interface Rect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface Position {
  top: number;
  left: number;
  /** Which side the caret is on (pointing FROM box TOWARD target) */
  caretSide: "left" | "right" | "top" | "bottom";
  caretOffset: number; // offset along the caret axis (px from start)
}

function getTargetRect(testId: string): Rect | null {
  const el = document.querySelector(`[data-testid="${testId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    top: r.top,
    left: r.left,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  };
}

function computePosition(rect: Rect, isMobile: boolean): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const boxW = isMobile ? Math.min(BOX_W_MOBILE, vw - MARGIN * 2) : BOX_W;

  if (!isMobile) {
    // Desktop: place to the RIGHT of the sidebar item
    const left = rect.right + GAP + CARET;
    // Vertically center on the item
    let top = rect.top + rect.height / 2 - 60; // 60 ≈ ~half estimated box height
    top = Math.max(MARGIN, Math.min(top, vh - MARGIN - 150));
    // Caret offset: where on the LEFT edge of the box does the caret sit?
    const caretOffset = Math.max(
      12,
      Math.min(rect.top + rect.height / 2 - top, 150 - 12)
    );
    return { top, left, caretSide: "left", caretOffset };
  }

  // Mobile: try below first, then above
  const spaceBelow = vh - rect.bottom - GAP - CARET;
  const spaceAbove = rect.top - GAP - CARET;
  const boxH = 160; // rough estimate

  if (spaceBelow >= boxH || spaceBelow >= spaceAbove) {
    // Place BELOW the target
    const top = rect.bottom + GAP + CARET;
    const centerX = rect.left + rect.width / 2;
    let left = centerX - boxW / 2;
    left = Math.max(MARGIN, Math.min(left, vw - boxW - MARGIN));
    const caretOffset = Math.max(12, Math.min(centerX - left, boxW - 12));
    return { top, left, caretSide: "top", caretOffset };
  } else {
    // Place ABOVE the target
    const top = rect.top - GAP - CARET - boxH;
    const centerX = rect.left + rect.width / 2;
    let left = centerX - boxW / 2;
    left = Math.max(MARGIN, Math.min(left, vw - boxW - MARGIN));
    const caretOffset = Math.max(12, Math.min(centerX - left, boxW - 12));
    return {
      top: Math.max(MARGIN, top),
      left,
      caretSide: "bottom",
      caretOffset,
    };
  }
}

/** Spotlight ring around the target element */
function Spotlight({ rect }: { rect: Rect }) {
  const pad = 4;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 10,
        boxShadow: "0 0 0 4px hsl(var(--primary) / 0.35), 0 0 0 9999px hsl(var(--background) / 0.55)",
        pointerEvents: "none",
        zIndex: 9998,
        transition: "top 200ms, left 200ms, width 200ms, height 200ms",
      }}
    />
  );
}

/** The SVG caret/arrow that bridges target to box */
function Caret({
  side,
  offset,
}: {
  side: "left" | "right" | "top" | "bottom";
  offset: number;
}) {
  const s = CARET;

  if (side === "left") {
    // Caret on left edge of box pointing left toward sidebar
    return (
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          left: -s,
          top: offset - s,
          width: s,
          height: s * 2,
          overflow: "visible",
          pointerEvents: "none",
        }}
        viewBox={`0 0 ${s} ${s * 2}`}
      >
        <polygon
          points={`${s},0 0,${s} ${s},${s * 2}`}
          fill="hsl(var(--popover))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* cover the border on the box edge */}
        <polygon
          points={`${s},1 ${s},${s * 2 - 1}`}
          fill="hsl(var(--popover))"
          stroke="hsl(var(--popover))"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (side === "right") {
    return (
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          right: -s,
          top: offset - s,
          width: s,
          height: s * 2,
          overflow: "visible",
          pointerEvents: "none",
        }}
        viewBox={`0 0 ${s} ${s * 2}`}
      >
        <polygon
          points={`0,0 ${s},${s} 0,${s * 2}`}
          fill="hsl(var(--popover))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <polygon
          points={`0,1 0,${s * 2 - 1}`}
          fill="hsl(var(--popover))"
          stroke="hsl(var(--popover))"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (side === "top") {
    // Caret on top edge pointing up toward target above
    return (
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -s,
          left: offset - s,
          width: s * 2,
          height: s,
          overflow: "visible",
          pointerEvents: "none",
        }}
        viewBox={`0 0 ${s * 2} ${s}`}
      >
        <polygon
          points={`0,${s} ${s},0 ${s * 2},${s}`}
          fill="hsl(var(--popover))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <polygon
          points={`1,${s} ${s * 2 - 1},${s}`}
          fill="hsl(var(--popover))"
          stroke="hsl(var(--popover))"
          strokeWidth="2"
        />
      </svg>
    );
  }

  // bottom
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: -s,
        left: offset - s,
        width: s * 2,
        height: s,
        overflow: "visible",
        pointerEvents: "none",
      }}
      viewBox={`0 0 ${s * 2} ${s}`}
    >
      <polygon
        points={`0,0 ${s},${s} ${s * 2},0`}
        fill="hsl(var(--popover))"
        stroke="hsl(var(--border))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <polygon
        points={`1,0 ${s * 2 - 1},0`}
        fill="hsl(var(--popover))"
        stroke="hsl(var(--popover))"
        strokeWidth="2"
      />
    </svg>
  );
}

interface CoachMarkProps {
  open: boolean;
  stepIndex: number;
  total: number;
  targetTestId: string;
  title: string;
  body: string;
  isFirst: boolean;
  isLast: boolean;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  onSkip: () => void;
  onComplete: () => void;
  /** Fallback content when the target cannot be found */
  fallback?: ReactNode;
}

export function CoachMark({
  open,
  stepIndex,
  total,
  targetTestId,
  title,
  body,
  isFirst,
  isLast,
  onNext,
  onBack,
  onClose,
  onSkip,
  onComplete,
}: CoachMarkProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    const rect = getTargetRect(targetTestId);
    setTargetRect(rect);
    if (rect) {
      setPosition(computePosition(rect, mobile));
    } else {
      // Fallback: center of screen
      setPosition({
        top: window.innerHeight / 2 - 90,
        left: window.innerWidth / 2 - (mobile ? BOX_W_MOBILE : BOX_W) / 2,
        caretSide: "left",
        caretOffset: 0,
      });
    }
  }, [targetTestId]);

  // Re-measure whenever step changes or open toggles
  useEffect(() => {
    if (!open) return;
    // Slight delay so route change + DOM updates settle
    const t = setTimeout(measure, 120);
    return () => clearTimeout(t);
  }, [open, targetTestId, measure]);

  // Re-measure on resize and scroll
  useEffect(() => {
    if (!open) return;
    function onUpdate() {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    }
    window.addEventListener("resize", onUpdate, { passive: true });
    window.addEventListener("scroll", onUpdate, { passive: true, capture: true });
    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [open, measure]);

  // Keyboard handler
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        isLast ? onComplete() : onNext();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!isFirst) onBack();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, isFirst, isLast, onClose, onNext, onBack, onComplete]);

  // Focus the box when it appears
  useEffect(() => {
    if (open && boxRef.current) {
      boxRef.current.focus({ preventScroll: true });
    }
  }, [open, stepIndex]);

  if (!open || !position) return null;

  const progress = ((stepIndex + 1) / total) * 100;
  const boxW = isMobile ? Math.min(BOX_W_MOBILE, window.innerWidth - MARGIN * 2) : BOX_W;
  const showCaret = targetRect !== null;

  const boxStyle: React.CSSProperties = {
    position: "fixed",
    top: position.top,
    left: position.left,
    width: boxW,
    zIndex: 9999,
    transition: "top 200ms ease, left 200ms ease",
  };

  const mark = (
    <>
      {/* Spotlight */}
      {targetRect && <Spotlight rect={targetRect} />}

      {/* Dim overlay — click to close */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[9997]"
        style={{ background: "transparent" }}
        onClick={onClose}
      />

      {/* Coach-mark box */}
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Tour step ${stepIndex + 1} of ${total}: ${title}`}
        tabIndex={-1}
        style={boxStyle}
        className={cn(
          "z-[9999] bg-popover text-popover-foreground border border-border rounded-xl shadow-xl",
          "flex flex-col gap-0 overflow-visible outline-none",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
        data-testid="coach-mark"
      >
        {/* Caret */}
        {showCaret && (
          <Caret
            side={position.caretSide}
            offset={position.caretOffset}
          />
        )}

        {/* Progress bar */}
        <div className="h-1 bg-secondary rounded-t-xl overflow-hidden">
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
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Step {stepIndex + 1} of {total}
          </span>
          <button
            onClick={onClose}
            aria-label="Close tour"
            className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            data-testid="walkthrough-close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pt-2 pb-3">
          <h2 className="font-serif font-semibold text-sm text-foreground mb-1 leading-snug">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {body}
          </p>
        </div>

        {/* Step dots */}
        <div className="px-4 pb-2 flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-full transition-all duration-200",
                i === stepIndex
                  ? "w-3.5 h-1.5 bg-primary"
                  : i < stepIndex
                  ? "w-1.5 h-1.5 bg-primary/40"
                  : "w-1.5 h-1.5 bg-border"
              )}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 pb-3 pt-0 border-t border-border/60 mt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-xs text-muted-foreground h-7 px-2"
            data-testid="walkthrough-skip"
          >
            Skip tour
          </Button>

          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="gap-0.5 h-7 px-2 text-xs"
                aria-label="Previous step"
                data-testid="walkthrough-back"
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </Button>
            )}

            {isLast ? (
              <Button
                size="sm"
                onClick={onComplete}
                className="gap-1 h-7 px-3 text-xs"
                data-testid="walkthrough-finish"
              >
                <CheckCheck className="w-3 h-3" />
                Finish
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onNext}
                className="gap-0.5 h-7 px-2 text-xs"
                aria-label="Next step"
                data-testid="walkthrough-next"
              >
                Next
                <ChevronRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(mark, document.body);
}
