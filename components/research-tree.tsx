"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { forceCollide, forceSimulation, forceX, forceY, type Simulation, type SimulationNodeDatum } from "d3-force";
import { ancestorIds, branchPath, tendrilPath, createLayout, height, width, type TreePoint } from "@/lib/tree-layout";

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
      <title id="tree-title">小野原彩香の研究系統樹</title><desc id="tree-description">根の研究者から、文化進化理論、5つの研究領域、論文・発表へと枝分かれします。枝と葉を選ぶと詳細が開きます。Tabで移動してEnterまたはSpaceでも選択できます。「論文一覧」では同じ内容を文章で読めます。</desc>
      <defs>
        <linearGradient id="branch-gold" gradientUnits="userSpaceOnUse" x1="560" y1="830" x2="460" y2="40"><stop stopColor="#6c5030"/><stop offset=".3" stopColor="#b28d52"/><stop offset=".7" stopColor="#d9b776"/><stop offset="1" stopColor="#ae884b"/></linearGradient>
        <linearGradient id="leaf-gold" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#946a38"/><stop offset=".5" stopColor="#e3c686"/><stop offset="1" stopColor="#bb9554"/></linearGradient>
        <radialGradient id="tree-light"><stop stopColor="#a58143" stopOpacity=".08"/><stop offset="1" stopColor="#a58143" stopOpacity="0"/></radialGradient>
      </defs>
      <g aria-hidden="true" className="tree-atmosphere"><ellipse cx="560" cy="420" rx="470" ry="430" fill="url(#tree-light)"/>{Array.from({ length: 86 }, (_, i) => <circle key={i} cx={45 + ((i * 173) % 1030)} cy={32 + ((i * 137) % 770)} r={i % 9 === 0 ? 1.25 : .55} fill="#c8aa75" opacity={i % 9 === 0 ? .36 : .2}/>)}</g>
      <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
        <g aria-hidden="true" fill="none" stroke="url(#branch-gold)" strokeLinecap="round" className="root-ornament">{[-1, 1].flatMap(side => [0, 1, 2, 3, 4].map(i => <path key={`${side}-${i}`} d={`M560 757 C${560 + side * (14 + i * 4)} 801, ${560 + side * (48 + i * 19)} ${799 + i * 7}, ${560 + side * (68 + i * 24)} ${812 + i * 7}`} strokeWidth={2.5 - i * .35}/>))}</g>
        <g fill="none" strokeLinecap="round" aria-hidden="true">{layout.links.map((link, index) => {
          const source = pointById.get(link.source)!, target = pointById.get(link.target)!;
          const active = visibleIds.has(link.target), highlighted = ancestors.has(link.target) && ancestors.has(link.source);
          const side = target.x < source.x ? -1 : 1;
          return <g key={`${link.source}-${link.target}`} opacity={active ? selectedId && !highlighted ? .48 : 1 : .08}>
            <path d={branchPath(source, target)} stroke={highlighted ? "#e7c88c" : "url(#branch-gold)"} strokeWidth={link.level === 1 ? 19 : link.level === 2 ? 8.5 : link.level === 3 ? 3.8 : 1.25}/>
            {link.level < 4 && <><path d={branchPath(source, target)} stroke="#f6d797" strokeWidth=".65" opacity=".5"/>
              <path d={tendrilPath(source, target, side)} stroke="url(#branch-gold)" strokeWidth={link.level < 3 ? 2.8 : 1.5}/>
              {link.level === 2 && <path d={tendrilPath({x: source.x * .32 + target.x * .68, y: source.y * .32 + target.y * .68}, target, -side)} stroke="url(#branch-gold)" strokeWidth="1.1"/>}</>}
            {link.level === 4 && index % 2 === 0 && <path d={tendrilPath(source, target, side)} stroke="url(#branch-gold)" strokeWidth=".8" opacity=".7"/>}
          </g>;
        })}</g>
        {points.map(point => {
          const visible = visibleIds.has(point.id), selected = selectedId === point.id, isPaper = point.kind === "paper";
          const accessibleName = isPaper ? `${point.paper!.year}年 ${point.paper!.title}` : `${point.name}の研究を表示`;
          return <g key={point.id} data-node-id={point.id} role="button" aria-label={accessibleName} aria-pressed={selected} aria-disabled={!visible} tabIndex={visible ? 0 : -1} className={`tree-node ${isPaper ? "is-paper" : "is-topic"} level-${point.level}${selected ? " is-selected" : ""}`} transform={`translate(${point.x} ${point.y})`} opacity={visible ? 1 : .12} style={{ pointerEvents: visible ? "auto" : "none" }} onClick={event => { if (event.detail === 0 && visible) onSelect(point.id); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(point.id); } }}>
            <title>{accessibleName}</title><circle r="27" fill="transparent" stroke="none" className="hit-area"/><circle className="focus-ring" r="24" fill="#d4b77d" fillOpacity=".08" stroke="#e0bf7b"/>
            {isPaper ? <g className="leaf-mark" transform={`rotate(${point.x < 560 ? -32 : 32})`}><path d="M0 -18 C17 -11 17 5 0 18 C-17 5 -17 -11 0 -18Z" fill="url(#leaf-gold)"/><path d="M0 14V-14M0 6 6 0M0 0 -6-6" stroke="#624f30" strokeWidth=".8" fill="none"/></g> : <><circle r={point.level < 2 ? 8 : 6} fill="#171d1b" stroke="#dfbc79" strokeWidth="1.5"/><circle r="2" fill="#d4b77d"/></>}
            <text textAnchor="middle" className="node-label" y={isPaper ? -28 : point.level === 0 ? 41 : 32}>{point.name}</text>
            {!isPaper && point.level === 2 && <text textAnchor="middle" className="branch-number" y="-17">{String(Number(point.id.split("-").at(-1))).padStart(2, "0")}</text>}
          </g>;
        })}
      </g>
    </svg>
    <div className="tree-tools"><div className="zoom-tools" role="group" aria-label="樹の表示倍率"><button type="button" onClick={() => zoom(1 / 1.2)} disabled={transform.scale <= .65} aria-label="縮小">−</button><button type="button" onClick={() => zoom(1.2)} disabled={transform.scale >= 2.8} aria-label="拡大">＋</button><button type="button" onClick={resetLayout} aria-label="樹の配置と倍率を戻す" title="全体を表示">↺</button></div><details className="motion-tools"><summary>動き</summary><button type="button" disabled={reducedMotion} aria-pressed={running} onClick={() => setRunning(previous => !previous)}>{reducedMotion ? "端末の設定で停止中" : running ? "配置を固定" : "配置を動かす"}</button></details></div>
  </>;
}
