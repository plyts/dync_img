import { useEffect, useState } from "react";

export function useTypewriter(text: string, startDelayMs = 0, speedMs = 14): string {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    if (!text) return;
    let i = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setShown(text.slice(0, i));
        if (i >= text.length && interval) clearInterval(interval);
      }, speedMs);
    }, startDelayMs);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, startDelayMs, speedMs]);

  return shown;
}
