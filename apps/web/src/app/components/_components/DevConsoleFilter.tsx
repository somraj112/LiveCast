"use client";
import { useEffect } from "react";

export default function DevConsoleFilter() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const origWarn = console.warn.bind(console);
    const origError = console.error.bind(console);

    const filterMsg = (msg: any) => {
      try {
        return typeof msg === "string" && msg.includes("Accessing element.ref was removed");
      } catch {
        return false;
      }
    };

    console.warn = (...args: any[]) => {
      if (args.some(filterMsg)) return;
      origWarn(...args);
    };

    console.error = (...args: any[]) => {
      if (args.some(filterMsg)) return;
      origError(...args);
    };

    return () => {
      console.warn = origWarn;
      console.error = origError;
    };
  }, []);

  return null;
}
