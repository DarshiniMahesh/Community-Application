import { useEffect } from "react";

export function useProfileFocus() {
  useEffect(() => {
    const focusId = new URLSearchParams(window.location.search).get("focus");
    if (!focusId) return;

    let attempts = 0;
    const intervalId = window.setInterval(() => {
      const element = document.getElementById(focusId);
      attempts += 1;

      if (element) {
        window.clearInterval(intervalId);
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        const previousTransition = element.style.transition;
        const previousBoxShadow = element.style.boxShadow;
        element.style.transition = "box-shadow 0.3s ease";
        element.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.55)";
        window.setTimeout(() => {
          element.style.boxShadow = previousBoxShadow;
          window.setTimeout(() => { element.style.transition = previousTransition; }, 300);
        }, 2200);
      } else if (attempts >= 20) {
        window.clearInterval(intervalId);
      }
    }, 150);

    return () => window.clearInterval(intervalId);
  }, []);
}