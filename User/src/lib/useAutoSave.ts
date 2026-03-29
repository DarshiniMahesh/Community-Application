import { useEffect, useRef } from "react";
import { api } from "./api";
import { toast } from "sonner";

export function useAutoSave(
  endpoint: string,
  buildPayload: () => object,
  deps: unknown[],
  enabled = true
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        await api.post(endpoint, buildPayload());
        toast.success("Auto-saved", { duration: 1500, id: "autosave" });
      } catch {
        // silent fail on auto-save
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}