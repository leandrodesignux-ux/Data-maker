"use client";

import { useEffect } from "react";
import { getClientDataset } from "@/data/client";

/** Prefetches the shared universe without changing this phase's UI. */
export function DataBootstrap() {
  useEffect(() => {
    void getClientDataset().then(dataset => {
      document.documentElement.dataset.simulatorSessions = String(dataset.sessions.length);
    });
  }, []);
  return null;
}
