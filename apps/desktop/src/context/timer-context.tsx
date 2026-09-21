import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { api, onTimerChanged } from "../lib/api";
import type { TimerView } from "../types";

type TimerContextValue = {
  /** Latest view from Rust; null until the first load. */
  view: TimerView | null;
  /** True while a timer action is in flight. */
  busy: boolean;
  /** Epoch ms when `view` was received — drives the ticking display. */
  fetchedAt: number;
  /** Task selected for start/switch. Shared by Today + Tasks tabs. */
  focusId: string | null;
  setFocusId: (id: string | null) => void;

  refresh: () => Promise<void>;
  start: (taskId: string, taskTitle: string) => Promise<void>;
  takeBreak: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  switchTo: (taskId: string, taskTitle: string) => Promise<void>;
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<TimerView | null>(null);
  const [busy, setBusy] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());
  const [focusId, setFocusId] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const apply = useCallback((next: TimerView) => {
    if (!mounted.current) return;
    setView(next);
    setFetchedAt(Date.now());
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await api.getTimerState());
    } catch {
      // Rust only fails here on IO — keep the last known view.
    }
  }, [apply]);

  useEffect(() => {
    void refresh();
    const unlisten = onTimerChanged((next) => apply(next));
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [refresh, apply]);

  const run = useCallback(
    async (fn: () => Promise<TimerView>, action: string) => {
      setBusy(true);
      try {
        apply(await fn());
      } catch (err) {
        toast.error(`${action} failed`, {
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [apply],
  );

  const start = useCallback(
    (taskId: string, taskTitle: string) =>
      run(() => api.startTimer(taskId, taskTitle), "Start"),
    [run],
  );
  const takeBreak = useCallback(
    () => run(() => api.takeBreak(), "Break"),
    [run],
  );
  const resume = useCallback(
    () => run(() => api.resumeTimer(), "Resume"),
    [run],
  );
  const stop = useCallback(() => run(() => api.stopTimer(), "Stop"), [run]);
  const switchTo = useCallback(
    (taskId: string, taskTitle: string) =>
      run(() => api.switchTask(taskId, taskTitle), "Switch"),
    [run],
  );

  const value: TimerContextValue = {
    view,
    busy,
    fetchedAt,
    focusId,
    setFocusId,
    refresh,
    start,
    takeBreak,
    resume,
    stop,
    switchTo,
  };

  return (
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === null) {
    throw new Error("useTimer must be used within TimerProvider");
  }
  return context;
}
