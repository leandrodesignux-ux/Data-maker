"use client";
import { useEffect, useRef, useState } from "react";
import { hash32 } from "@/data/prng";
import type { ClHeatElement, ClMode } from "../clarity-data";

export interface HeatMarker { elementId: string; x: number; y: number; rank: number }
const palette: [number, number, number][] = [[61, 69, 255], [0, 190, 240], [0, 211, 123], [255, 218, 0], [255, 55, 0]];
function colorAt(value: number): [number, number, number] {
  const scaled = Math.min(.999, Math.max(0, value)) * (palette.length - 1), index = Math.floor(scaled), blend = scaled - index;
  return [0, 1, 2].map(channel => Math.round(palette[index][channel] * (1 - blend) + palette[index + 1][channel] * blend)) as [number, number, number];
}
export function HeatOverlay({ pageRef, elements, mode, reach, mean, hovered, onHover, onCanvas }: {
  pageRef: React.RefObject<HTMLDivElement | null>; elements: readonly ClHeatElement[]; mode: ClMode;
  reach: (depth: number) => number; mean: number; hovered: string; onHover: (id: string) => void; onCanvas: (canvas: HTMLCanvasElement | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null), [markers, setMarkers] = useState<HeatMarker[]>([]), [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const page = pageRef.current; if (!page) return;
    const observer = new ResizeObserver(() => setSize({ width: page.offsetWidth, height: page.offsetHeight }));
    observer.observe(page); const frame = requestAnimationFrame(() => setSize({ width: page.offsetWidth, height: page.offsetHeight }));
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [pageRef]);
  useEffect(() => {
    const page = pageRef.current, canvas = canvasRef.current; if (!page || !canvas || !size.width || !size.height) return;
    canvas.width = size.width; canvas.height = size.height; canvas.style.width = `${size.width}px`; canvas.style.height = `${size.height}px`;
    const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) return;
    context.clearRect(0, 0, size.width, size.height);
    if (mode === "scroll") {
      const band = 18;
      for (let y = 0; y < size.height; y += band) {
        const fraction = y / size.height, rate = reach(fraction * 100), [r, g, b] = colorAt(Math.min(1, Math.max(0, rate)));
        context.fillStyle = `rgba(${r},${g},${b},.28)`; context.fillRect(0, y, size.width, band);
      }
      requestAnimationFrame(() => setMarkers([])); onCanvas(canvas); return;
    }
    const layer = document.createElement("canvas"); layer.width = size.width; layer.height = size.height;
    const alpha = layer.getContext("2d", { willReadFrequently: true }); if (!alpha) return;
    const maxClicks = Math.max(1, elements[0]?.clicks ?? 1), points: HeatMarker[] = [];
    for (const [index, element] of elements.entries()) {
      const nodes = [...page.querySelectorAll<HTMLElement>(`[data-heat-id="${CSS.escape(element.elementId)}"]`)];
      if (!nodes.length) continue;
      for (const [nodeIndex, node] of nodes.entries()) {
        const rect = node.getBoundingClientRect(), parent = page.getBoundingClientRect();
        const factor = parent.width / Math.max(1, page.offsetWidth);
        const markerX = (rect.left - parent.left + rect.width / 2) / factor, markerY = (rect.top - parent.top + rect.height / 2) / factor;
        if (nodeIndex === 0 && index < 12) points.push({ elementId: element.elementId, x: markerX, y: markerY, rank: index + 1 });
        const left = (rect.left - parent.left) / factor, top = (rect.top - parent.top) / factor;
        const width = rect.width / factor, height = rect.height / factor;
        const radius = Math.max(14, Math.min(60, Math.min(width, height) * .35));
        const offsets = element.offsets.length ? element.offsets : [{ x: .5, y: .5 }];
        const average = offsets.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
        const x = left + width * Math.max(0, Math.min(1, average.x / offsets.length));
        const y = top + height * Math.max(0, Math.min(1, average.y / offsets.length));
        const intensity = Math.min(.92, .16 + .76 * Math.sqrt(element.clicks / maxClicks) / Math.sqrt(nodes.length));
        alpha.save();
        alpha.beginPath();
        alpha.rect(left, top, width, height);
        alpha.clip();
        for (const [dx, dy, scale] of [[0, 0, 1], [-radius * .45, radius * .15, .4], [radius * .38, -radius * .2, .34]] as const) {
          const radial = alpha.createRadialGradient(x + dx, y + dy, 2, x + dx, y + dy, radius * scale);
          radial.addColorStop(0, `rgba(0,0,0,${intensity * scale})`); radial.addColorStop(.43, `rgba(0,0,0,${intensity * scale * .5})`); radial.addColorStop(1, "rgba(0,0,0,0)");
          alpha.fillStyle = radial; alpha.fillRect(x + dx - radius, y + dy - radius, radius * 2, radius * 2);
        }
        const samples = Math.min(55, Math.max(7, Math.round(element.clicks / 9 / Math.sqrt(nodes.length))));
        for (let sample = 0; sample < samples; sample++) {
          const seed = hash32(`${element.elementId}:${nodeIndex}:${sample}`);
          const offset = offsets[sample % offsets.length];
          const sx = left + width * Math.max(.03, Math.min(.97, offset.x + ((seed % 997) / 997 - .5) * .16));
          const sy = top + height * Math.max(.03, Math.min(.97, offset.y + (((seed >>> 11) % 991) / 991 - .5) * .16));
          const dotRadius = Math.max(4, Math.min(radius * .45, 8 + seed % 13)), dot = alpha.createRadialGradient(sx, sy, 1, sx, sy, dotRadius);
          dot.addColorStop(0, "rgba(0,0,0,.24)"); dot.addColorStop(1, "rgba(0,0,0,0)");
          alpha.fillStyle = dot; alpha.fillRect(sx - dotRadius, sy - dotRadius, dotRadius * 2, dotRadius * 2);
        }
        alpha.restore();
      }
    }
    const pixels = alpha.getImageData(0, 0, size.width, size.height), output = context.createImageData(size.width, size.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const intensity = pixels.data[index + 3] / 255;
      if (intensity < .035) continue;
      const [r, g, b] = colorAt(Math.min(1, intensity * 1.35));
      output.data[index] = r; output.data[index + 1] = g; output.data[index + 2] = b; output.data[index + 3] = Math.round(Math.min(.86, intensity * 1.3) * 255);
    }
    context.putImageData(output, 0, 0); requestAnimationFrame(() => setMarkers(points)); onCanvas(canvas);
  }, [pageRef, elements, mode, reach, mean, size.width, size.height, onCanvas]);
  return <><canvas className="cl-heat-overlay" ref={canvasRef} aria-label={mode === "scroll" ? "Mapa de profundidad de desplazamiento" : "Mapa de calor de clics"}/>{mode === "scroll" ? <div className="cl-average-fold" style={{ top: `${mean}%` }}><span>Pliegue promedio · {Math.round(mean)} %</span></div> : markers.map(marker => <button key={marker.elementId} className={`cl-heat-marker ${hovered === marker.elementId ? "hovered" : ""}`} style={{ left: marker.x, top: marker.y }} title={marker.elementId} onMouseEnter={() => onHover(marker.elementId)} onMouseLeave={() => onHover("")}>{marker.rank}</button>)}</>;
}
