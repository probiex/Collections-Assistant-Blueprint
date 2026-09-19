import { useState, useCallback, useEffect } from "react";

export const WALKTHROUGH_VERSION = "1.0.0";
const STORAGE_KEY = "collections_copilot_onboarding";

interface OnboardingState {
  completed: boolean;
  version: string;
  stepIndex: number;
}

function safeRead(): OnboardingState | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return null;
  }
}

function safeWrite(state: OnboardingState): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function useOnboarding() {
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    const saved = safeRead();
    if (saved && saved.version === WALKTHROUGH_VERSION && saved.completed) {
      setHasCompleted(true);
      return;
    }
    // First run or version mismatch — auto-open after short delay
    const t = setTimeout(() => setWalkthroughOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  const open = useCallback((atStep = 0) => {
    setStepIndex(atStep);
    setWalkthroughOpen(true);
  }, []);

  const close = useCallback(() => {
    setWalkthroughOpen(false);
  }, []);

  const complete = useCallback(() => {
    const state: OnboardingState = {
      completed: true,
      version: WALKTHROUGH_VERSION,
      stepIndex: 0,
    };
    safeWrite(state);
    setHasCompleted(true);
    setWalkthroughOpen(false);
  }, []);

  const restart = useCallback(() => {
    const state: OnboardingState = {
      completed: false,
      version: WALKTHROUGH_VERSION,
      stepIndex: 0,
    };
    safeWrite(state);
    setHasCompleted(false);
    setStepIndex(0);
    setWalkthroughOpen(true);
  }, []);

  const goTo = useCallback((index: number) => {
    setStepIndex(index);
  }, []);

  const next = useCallback((total: number) => {
    setStepIndex((i) => Math.min(i + 1, total - 1));
  }, []);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  return {
    walkthroughOpen,
    stepIndex,
    hasCompleted,
    open,
    close,
    complete,
    restart,
    goTo,
    next,
    back,
  };
}
