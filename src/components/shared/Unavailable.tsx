"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { cloneElement, type KeyboardEvent, type MouseEvent, type ReactElement } from "react";
import { useAppPortalContainer } from "./AppPortalContainer";

type ControlProps = {
  "aria-disabled"?: boolean;
  "data-unavailable"?: string;
  disabled?: boolean;
  tabIndex?: number;
  onClickCapture?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDownCapture?: (event: KeyboardEvent<HTMLElement>) => void;
};

export function Unavailable({ children }: { children: ReactElement<ControlProps> }) {
  const container = useAppPortalContainer();
  const control = cloneElement(children, {
    "aria-disabled": true,
    "data-unavailable": "",
    ...(children.type === "button" ? { disabled: false } : {}),
    tabIndex: 0,
    onClickCapture: event => {
      event.preventDefault();
      event.stopPropagation();
    },
    onKeyDownCapture: event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  });

  return <Tooltip.Provider delayDuration={150}><Tooltip.Root><Tooltip.Trigger asChild>{control}</Tooltip.Trigger><Tooltip.Portal container={container}><Tooltip.Content className="unavailable-tooltip" sideOffset={7}>No disponible en el simulador<Tooltip.Arrow className="unavailable-tooltip-arrow" /></Tooltip.Content></Tooltip.Portal></Tooltip.Root></Tooltip.Provider>;
}
