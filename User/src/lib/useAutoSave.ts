import { useEffect, useRef } from "react";
import { api } from "./api";
import { toast } from "sonner";

export function useAutoSave(
  endpoint: string,
  buildPayload: () => object,
  deps: unknown[],
  enabled = true
) {
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyRef   = useRef(false); // true only after first enabled=true lands
  const prevEnabledRef = useRef(false);

  useEffect(() => {
    // enabled just flipped true → data finished loading
    // mark NOT ready yet; the very next deps-effect run (from the load render)
    // should be skipped
    if (enabled && !prevEnabledRef.current) {
      readyRef.current = false;
    }
    // enabled flipped false → reset for next load
    if (!enabled) {
      readyRef.current = false;
    }
    prevEnabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // First run after load: mark ready and skip (this is the load render itself)
    if (!readyRef.current) {
      readyRef.current = true;
      return;
    }

    // From here on: genuine user change → save
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        await api.post(endpoint, buildPayload());
        toast.success("Auto-saved", { duration: 1500, id: "autosave" });
      } catch {
        // silent fail
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}