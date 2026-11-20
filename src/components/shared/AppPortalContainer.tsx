"use client";

import { createContext, useContext, type ReactNode } from "react";

const PortalContainerContext = createContext<HTMLElement | null>(null);

export function AppPortalContainer({ container, children }: { container: HTMLElement | null; children: ReactNode }) {
  return <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>;
}

export function useAppPortalContainer() {
  return useContext(PortalContainerContext) ?? undefined;
}
