"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // A rejected registration (insecure context, bad MIME, disabled SW) would
      // otherwise surface as an unhandled promise rejection in the console.
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
