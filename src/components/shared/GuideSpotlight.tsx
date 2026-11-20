"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CaseDefinition } from "@/cases/schema";
import type { CaseObservation } from "@/cases/engine/detectors";
import { selectGuideStep } from "@/cases/engine/guide";
import "./guide.css";

type Evidence = { objectiveId: string; target: string; text: string };
type Box = { left: number; top: number; width: number; height: number };
type Props = {
  definition: CaseDefinition;
  observation: CaseObservation;
  completed: readonly string[];
  enabled: boolean;
  request: { id: string; nonce: number } | null;
  evidence: Evidence | null;
  onAcknowledge: (id: string) => void;
  onNextEvidence: () => void;
  onGeometry: (target: DOMRect | null, bubble: Box | null) => void;
};

function visible(target: string) {
  const node = document.querySelector<HTMLElement>(target);
  if (!node) return false;
  const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}
function fieldValue(target: string) {
  const node = document.querySelector(target);
  return node instanceof HTMLInputElement || node instanceof HTMLSelectElement ? node.value : undefined;
}
function intersects(a: Box, b: Box) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}
function placeBubble(rect: DOMRect, preference: string, dock: DOMRect | null): Box {
  const width = Math.min(310, window.innerWidth - 24), height = 132, gap = 14;
  const options = [preference, ...["bottom", "top", "right", "left"].filter(value => value !== preference)];
  const clamp = (value: number, max: number) => Math.max(12, Math.min(max - 12, value));
  const candidates = options.map(side => {
    const left = side === "left" ? rect.left - width - gap : side === "right" ? rect.right + gap : rect.left + (rect.width - width) / 2;
    const top = side === "top" ? rect.top - height - gap : side === "bottom" ? rect.bottom + gap : rect.top + (rect.height - height) / 2;
    return { left, top, width, height };
  });
  const fits = (box: Box) => box.left >= 12 && box.top >= 12 && box.left + width <= window.innerWidth - 12 && box.top + height <= window.innerHeight - 12 && (!dock || !intersects(box, dock));
  const chosen = candidates.find(fits) ?? candidates.find(box => box.left >= 12 && box.top >= 12 && box.left + width <= window.innerWidth - 12 && box.top + height <= window.innerHeight - 12) ?? candidates[0];
  return { left: clamp(chosen.left, window.innerWidth), top: clamp(chosen.top, window.innerHeight), width, height };
}

export function GuideSpotlight({ definition, observation, completed, enabled, request, evidence, onAcknowledge, onNextEvidence, onGeometry }: Props) {
  const [mounted, setMounted] = useState(false), [revision, setRevision] = useState(0), [hiddenKey, setHiddenKey] = useState("");
  const [geometry, setGeometry] = useState<{ target: Box | null; bubble: Box; missing: boolean } | null>(null);
  const scrolled = useRef("");
  useEffect(() => { const frame = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(frame); }, []);

  useEffect(() => {
    if (!mounted) return;
    let frame = 0;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; setRevision(value => value + 1); }); };
    const observer = new MutationObserver(records => {
      if (records.some(record => !(record.target as Element).closest?.("[data-guide-portal]"))) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    document.addEventListener("input", schedule, true);
    document.addEventListener("change", schedule, true);
    return () => { observer.disconnect(); window.removeEventListener("scroll", schedule, true); window.removeEventListener("resize", schedule); document.removeEventListener("input", schedule, true); document.removeEventListener("change", schedule, true); if (frame) cancelAnimationFrame(frame); };
  }, [mounted]);

  const selection = useMemo(() => {
    void revision;
    return mounted ? selectGuideStep(definition, completed, observation, visible, fieldValue, request?.id) : null;
  }, [mounted, definition, completed, observation, request?.id, revision]);
  const objectiveIndex = evidence ? definition.objectives.findIndex(item => item.id === evidence.objectiveId) : selection?.objectiveIndex ?? -1;
  const target = evidence?.target ?? selection?.step.target;
  const key = evidence ? `evidence-${evidence.objectiveId}` : selection ? `${selection.objective.id}-${request?.nonce ?? 0}` : "";
  const scrollKey = `${key}-${selection?.stepIndex ?? 0}`;
  const show = mounted && !!target && (!!evidence || enabled || !!request) && hiddenKey !== key;

  useEffect(() => {
    if (!show || !target) return;
    const node = document.querySelector(target);
    if (!node) return;
    const resize = new ResizeObserver(() => setRevision(value => value + 1));
    resize.observe(node);
    return () => resize.disconnect();
  }, [show, target]);

  useEffect(() => {
    if (!show || evidence) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setHiddenKey(key); };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [show, key, evidence]);

  useLayoutEffect(() => {
    if (!show || !target) { onGeometry(null, null); return; }
    let frame = 0;
    const node = document.querySelector<HTMLElement>(target);
    if (node && visible(target)) {
      const initial = node.getBoundingClientRect();
      if (scrolled.current !== scrollKey && (initial.bottom < 0 || initial.top > window.innerHeight || initial.right < 0 || initial.left > window.innerWidth)) {
        scrolled.current = scrollKey;
        node.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      }
      const rect = node.getBoundingClientRect();
      const dock = document.querySelector<HTMLElement>(".case-dock")?.getBoundingClientRect() ?? null;
      const bubble = placeBubble(rect, evidence ? "top" : selection?.step.placement ?? "bottom", dock);
      const padded = { left: Math.max(0, rect.left - 6), top: Math.max(0, rect.top - 6), width: rect.width + 12, height: rect.height + 12 };
      frame = requestAnimationFrame(() => setGeometry(old => JSON.stringify(old) === JSON.stringify({ target: padded, bubble, missing: false }) ? old : { target: padded, bubble, missing: false }));
      onGeometry(rect, bubble);
      return () => cancelAnimationFrame(frame);
    }
    const dock = document.querySelector<HTMLElement>(".case-dock")?.getBoundingClientRect();
    const bubble = { left: Math.max(12, (dock?.left ?? window.innerWidth - 330) - 320), top: Math.max(12, dock?.top ?? 120), width: 310, height: 132 };
    frame = requestAnimationFrame(() => setGeometry(old => JSON.stringify(old) === JSON.stringify({ target: null, bubble, missing: true }) ? old : { target: null, bubble, missing: true }));
    onGeometry(null, bubble);
    return () => cancelAnimationFrame(frame);
  }, [show, target, key, scrollKey, revision, evidence, selection?.step.placement, onGeometry]);

  if (!show || !geometry) return null;
  const text = evidence?.text ?? selection?.step.text ?? "Abre el control indicado para continuar.";
  return createPortal(<div data-guide-portal>
    {geometry.target ? <><div className="guide-cutout" style={geometry.target}/><div className="guide-ring" style={geometry.target}/></> : <div className="guide-veil"/>}
    <div className="guide-bubble" role="status" style={geometry.bubble} data-missing={geometry.missing}>
      <div className="guide-bubble-kicker">{evidence ? "Evidencia" : `Paso ${objectiveIndex + 1} de ${definition.objectives.length}`}</div>
      <p>{geometry.missing ? `Abre la vista o el panel necesario. ${text}` : text}</p>
      <div className="guide-bubble-actions"><button onClick={() => setHiddenKey(key)}>Ocultar guía</button>{evidence ? <button className="guide-primary" onClick={onNextEvidence}>Siguiente</button> : selection?.objective.kind === "acknowledge" && <button className="guide-primary" onClick={() => onAcknowledge(selection.objective.id)}>Entendido</button>}</div>
    </div>
  </div>, document.body);
}
