"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { forceCollide, forceSimulation, forceX, forceY, type Simulation, type SimulationNodeDatum } from "d3-force";
import { ancestorIds, branchPath, createLayout, height, width, type TreePoint } from "@/lib/tree-layout";

type MovingPoint = TreePoint & SimulationNodeDatum;
interface Transform { x: number; y: number; scale: number }
interface DragState { pointerId: number; id?: string; startX: number; startY: number; x: number; y: number; moved: boolean }
const initialTransform: Transform = { x: 0, y: 0, scale: 1 };
const layout = createLayout();

export function ResearchTree({ visibleIds, selectedId, onSelect }: { visibleIds: Set<string>; selectedId: string; onSelect: (id: string) => void }) {
  const [points, setPoints] = useState<TreePoint[]>(() => layout.points.map(point => ({ ...point })));
  const [transform, setTransform] = useState(initialTransform);
  const [running, setRunning] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulation = useRef<Simulation<MovingPoint, undefined> | null>(null);
  const drag = useRef<DragState | null>(null);
  const ignoreClick = useRef(false);
  const pointById = useMemo(() => new Map(points.map(point => [point.id, point])), [points]);
  const ancestors = useMemo(() => ancestorIds(selectedId), [selectedId]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReducedMotion(media.matches); if (media.matches) setRunning(false); };
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!running || reducedMotion) return;
    const nodes: MovingPoint[] = points.map(point => ({ ...point, ...(point.level < 2 ? { fx: point.anchorX, fy: point.anchorY } : {}) }));
    const sim = forceSimulation(nodes)
      .force("x", forceX<MovingPoint>(point => point.anchorX).strength(0.06))
      .force("y", forceY<MovingPoint>(point => point.anchorY).strength(0.06))
      .force("collide", forceCollide<MovingPoint>(point => point.kind === "paper" ? 18 : 36))
      .alpha(0.6)
      .on("tick", () => setPoints(nodes.map(point => ({ ...point, x: Math.max(30, Math.min(width - 30, point.x)), y: Math.max(40, Math.min(height - 45, point.y)) }))))
      .on("end", () => setRunning(false));
    simulation.current = sim;
    return () => { sim.stop(); simulation.current = null; };
    // A run starts from the current displayed positions; ticks must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, reducedMotion]);

  function coordinates(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }

  function pointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    const target = event.target as Element;
    const id = target.closest("[data-node-id]")?.getAttribute("data-node-id") ?? undefined;
    const point = coordinates(event);
    const node = id ? pointById.get(id) : undefined;
    drag.current = { pointerId: event.pointerId, id, startX: point.x, startY: point.y, x: node?.x ?? transform.x, y: node?.y ?? transform.y, moved: false };
    ignoreClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (node) setRunning(false);
  }

  function pointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const pointer = coordinates(event);
    const dx = pointer.x - current.startX, dy = pointer.y - current.startY;
    if (Math.hypot(dx, dy) > 4) current.moved = true;
    if (!current.moved) return;
    if (current.id) setPoints(previous => previous.map(point => point.id === current.id ? { ...point, x: Math.max(25, Math.min(width - 25, current.x + dx / transform.scale)), y: Math.max(30, Math.min(height - 35, current.y + dy / transform.scale)) } : point));
    else setTransform(previous => ({ ...previous, x: current.x + dx, y: current.y + dy }));
  }

  function pointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    ignoreClick.current = current.moved;
    if (!current.moved && current.id && visibleIds.has(current.id)) onSelect(current.id);
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const zoom = useCallback((amount: number) => setTransform(previous => {
    const scale = Math.max(0.65, Math.min(2.8, previous.scale * amount));
    const ratio = scale / previous.scale;
    return { scale, x: width / 2 - (width / 2 - previous.x) * ratio, y: height / 2 - (height / 2 - previous.y) * ratio };
  }), []);

  function resetLayout() { setRunning(false); setPoints(layout.points.map(point => ({ ...point }))); setTransform(initialTransform); }

  return <>
    <svg className="research-tree" ref={svgRef} viewBox={`0 0 ${width} ${height}`} aria-labelledby="tree-title tree-description" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { drag.current = null; }}>
      <title id="tree-title">小野原彩香の研究系統樹</title><desc id="tree-description">下から研究者、文化進化理論、研究テーマ、論文・発表へと枝分かれします。各節点はEnterキーまたはスペースキーで選べます。同じ内容を「一覧で読む」でも確認できます。</desc>
      <defs><radialGradient id="tree-light"><stop stopColor="#b59c62" stopOpacity=".09"/><stop offset="1" stopColor="#b59c62" stopOpacity="0"/></radialGradient><linearGradient id="branch-gold" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#71603e"/><stop offset="1" stopColor="#cab680"/></linearGradient></defs>
      <g aria-hidden="true" className="tree-atmosphere"><ellipse cx="550" cy="330" rx="510" ry="330" fill="url(#tree-light)"/><circle cx="560" cy="360" r="258"/><circle cx="560" cy="360" r="325"/>{Array.from({ length: 62 }, (_, i) => <circle key={i} cx={40 + ((i * 173) % 1040)} cy={70 + ((i * 137) % 480)} r={i % 7 === 0 ? 1.7 : .7} className="dust"/>)}<path d="M450 672 Q560 655 670 672 M492 680 Q560 663 628 680" className="root-lines"/></g>
      <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
        <g fill="none" strokeLinecap="round" aria-hidden="true">{layout.links.map(link => {
          const source = pointById.get(link.source)!, target = pointById.get(link.target)!;
          const active = visibleIds.has(link.target), highlighted = ancestors.has(link.target) && ancestors.has(link.source);
          return <path key={`${link.source}-${link.target}`} d={branchPath(source, target)} stroke={highlighted ? "#f0d39a" : "url(#branch-gold)"} strokeWidth={link.level === 1 ? 7 : link.level === 2 ? 3.2 : link.level === 3 ? 1.6 : .85} opacity={active ? highlighted ? 1 : .6 : .1}/>;
        })}</g>
        {points.map(point => {
          const visible = visibleIds.has(point.id), selected = selectedId === point.id, isPaper = point.kind === "paper";
          const radius = isPaper ? 5 + (Number(point.paper!.year) - 2010) / 7 : point.level < 2 ? 12 : 8;
          const name = point.name;
          const labelLines = name.length > 8 && !isPaper ? [name.slice(0, Math.ceil(name.length / 2)), name.slice(Math.ceil(name.length / 2))] : [name];
          const accessibleName = isPaper ? `${point.paper!.year}年 ${point.paper!.title}` : `${point.name}の研究を表示`;
          return <g key={point.id} data-node-id={point.id} role="button" aria-label={accessibleName} aria-pressed={selected} aria-disabled={!visible} tabIndex={visible ? 0 : -1} className={`tree-node ${isPaper ? "is-paper" : "is-topic"}${selected ? " is-selected" : ""}`} transform={`translate(${point.x} ${point.y})`} opacity={visible ? 1 : .16} style={{ pointerEvents: visible ? "auto" : "none" }} onClick={event => { if (event.detail === 0 && !ignoreClick.current && visible) onSelect(point.id); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(point.id); } }}>
            <title>{accessibleName}</title><circle r="23" fill="transparent" stroke="none" className="hit-area"/><circle className="focus-ring" r="22" fill="none" stroke="#f0d39a"/>{selected && <circle r="20" fill="#d4b77d" fillOpacity=".12" stroke="#d4b77d" strokeOpacity=".5"/>}
            {isPaper ? <><path d="M0 -11 Q14 -7 0 11 Q-14 7 0 -11Z" fill={`hsl(${40 + (Number(point.paper!.year) - 2010) * 1.5} 38% ${53 + (Number(point.paper!.year) - 2010) * 1.5}%)`} transform="rotate(32)"/><path d="M-5 8 5-8" stroke="#172b28" strokeWidth=".7"/></> : <><circle r={radius + 4} fill="#192d29" stroke="#ad925d" strokeOpacity=".38"/><circle r={radius} fill={point.level < 2 ? "#b8a06b" : "#1d332e"} stroke="#d4ba82" strokeWidth="1.3"/>{point.level < 2 && <path d="M-4 0H4M0-4V4" stroke="#1d332e"/>}</>}
            <text textAnchor="middle" className="node-label" y={isPaper ? -22 : radius + 24}>{labelLines.map((line, index) => <tspan key={line} x="0" dy={index ? "1.4em" : 0}>{line}</tspan>)}</text>
          </g>;
        })}
      </g>
    </svg>
    <div className="tree-tools"><div className="zoom-tools" role="group" aria-label="樹の表示倍率"><button type="button" onClick={() => zoom(1 / 1.2)} disabled={transform.scale <= .65} aria-label="縮小">−</button><span>{Math.round(transform.scale * 100)}%</span><button type="button" onClick={() => zoom(1.2)} disabled={transform.scale >= 2.8} aria-label="拡大">＋</button><button type="button" onClick={() => setTransform(initialTransform)} aria-label="表示をリセット">↺</button></div><div className="motion-tools"><button type="button" disabled={reducedMotion} aria-pressed={running} onClick={() => setRunning(previous => !previous)}>{running ? "配置を固定" : "配置を動かす"}</button><button type="button" onClick={resetLayout}>配置を戻す</button></div></div>
    {reducedMotion && <p className="motion-note">端末の設定に合わせて、動きを停止しています。</p>}
  </>;
}
