import { useState, useEffect, useSyncExternalStore, useCallback } from "react";
import { subscribe, store, simNow, isClockFrozen } from "../mocks/store";

// Subscribe to mock store changes — re-renders component when store mutates
export function useQueueStore(selector) {
  const snap = useSyncExternalStore(
    subscribe,
    () => selector(store),
    () => selector(store)
  );
  return snap;
}

// Force re-render on store change (for when selector isn't stable)
export function useStoreRefresh() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);
}

// Get current sim time, updates every second
export function useSimClock() {
  const [now, setNow] = useState(simNow());
  const [frozen, setFrozen] = useState(isClockFrozen());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(simNow());
      setFrozen(isClockFrozen());
    }, 1000);
    const unsub = subscribe(() => {
      setNow(simNow());
      setFrozen(isClockFrozen());
    });
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  return { now, frozen };
}

// Auth context (simple role-based, no real auth)
import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// Toast system
const toastListeners = new Set();
let toasts = [];
let toastId = 0;

export function addToast(message, type = "success") {
  const id = ++toastId;
  toasts = [...toasts, { id, message, type }];
  toastListeners.forEach((fn) => fn(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    toastListeners.forEach((fn) => fn(toasts));
  }, 3500);
}

export function useToasts() {
  const [list, setList] = useState(toasts);
  useEffect(() => {
    toastListeners.add(setList);
    return () => toastListeners.delete(setList);
  }, []);
  return list;
}
