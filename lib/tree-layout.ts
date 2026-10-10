import { allNodes, branches, researchTree, type Paper, type ResearchNode } from "./research";

export interface TreePoint {
  id: string; name: string; kind: "research" | "paper"; level: number;
  x: number; y: number; anchorX: number; anchorY: number;
  branchId?: string; paper?: Paper;
}
export interface TreeLink { source: string; target: string; level: number }
export const width = 1120;
export const height = 860;

// Deliberate, asymmetric boughs; the coordinates carry no statistical meaning.
const boughs = [
  { x: 290, y: 525, tips: [[130, 365], [225, 235], [360, 145]] },
  { x: 810, y: 515, tips: [[800, 155], [925, 270], [1010, 405]] },
  { x: 440, y: 335, tips: [] },
  { x: 585, y: 215, tips: [] },
  { x: 700, y: 375, tips: [] },
];

export function createLayout(): { points: TreePoint[]; links: TreeLink[] } {
  const positions = new Map<string, { x: number; y: number }>();
  branches.forEach((branch, i) => {
    const bough = boughs[i % boughs.length];
    positions.set(branch.id, { x: bough.x, y: bough.y });
    branch.children?.forEach((child, j) => {
      const tip = bough.tips[j];
      positions.set(child.id, { x: tip?.[0] ?? bough.x + j * 70, y: tip?.[1] ?? bough.y - 120 });
    });
  });
  positions.set(researchTree.id, { x: 560, y: 770 });
  positions.set(researchTree.children![0].id, { x: 560, y: 642 });
  const points: TreePoint[] = [];
  const links: TreeLink[] = [];
  function visit(node: ResearchNode, branchId?: string) {
    const branch = node.level === 2 ? node.id : branchId;
    const position = positions.get(node.id)!;
    points.push({ id: node.id, name: node.name, kind: "research", level: node.level, ...position, anchorX: position.x, anchorY: position.y, branchId: branch });
    (node.papers ?? []).forEach((paper, i, group) => {
      const offset = (i - (group.length - 1) / 2);
      const x = position.x + offset * 61;
      const y = position.y - 72 - (1 - Math.abs(offset)) * 24;
      points.push({ id: paper.id, name: paper.year, kind: "paper", level: 4, x, y, anchorX: x, anchorY: y, branchId: branch, paper });
      links.push({ source: node.id, target: paper.id, level: 4 });
    });
    (node.children ?? []).forEach(child => {
      links.push({ source: node.id, target: child.id, level: child.level });
      visit(child, branch);
    });
  }
  visit(researchTree);
  return { points, links };
}

export function branchPath(source: Pick<TreePoint, "x" | "y">, target: Pick<TreePoint, "x" | "y">) {
  const rise = (source.y - target.y) * .56;
  const lean = (target.x - source.x) * .12;
  return `M ${source.x} ${source.y} C ${source.x + lean} ${source.y - rise}, ${target.x - lean} ${target.y + rise * .25}, ${target.x} ${target.y}`;
}

// Curls are botanical ornament only. Data relationships use branchPath above.
export function tendrilPath(source: Pick<TreePoint, "x" | "y">, target: Pick<TreePoint, "x" | "y">, side: number) {
  const x = source.x + (target.x - source.x) * .48;
  const y = source.y + (target.y - source.y) * .51;
  const r = Math.min(48, Math.max(23, Math.hypot(target.x - source.x, target.y - source.y) * .17));
  return `M ${x} ${y} C ${x + r * side} ${y - r * 1.8}, ${x + r * 2.6 * side} ${y - r * .9}, ${x + r * 2.1 * side} ${y + r * .2} C ${x + r * 1.7 * side} ${y + r * 1.05}, ${x + r * .55 * side} ${y + r * .42}, ${x + r * 1.05 * side} ${y - r * .13} C ${x + r * 1.35 * side} ${y - r * .46}, ${x + r * 1.72 * side} ${y - r * .06}, ${x + r * 1.42 * side} ${y + r * .13}`;
}

export function ancestorIds(id: string): Set<string> {
  const result = new Set<string>([id]);
  function visit(node: ResearchNode): boolean {
    const found = node.id === id || Boolean(node.papers?.some(paper => paper.id === id)) || Boolean(node.children?.some(visit));
    if (found) result.add(node.id);
    return found;
  }
  visit(researchTree);
  return result;
}
export const topicLookup = new Map(allNodes.map(node => [node.id, node]));
