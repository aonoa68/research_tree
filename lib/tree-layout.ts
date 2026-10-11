import { allNodes, branches, researchTree, type Paper, type Project, type ResearchNode } from "./research";

export interface TreePoint {
  id: string; name: string; kind: "research" | "paper" | "project"; level: number;
  x: number; y: number; anchorX: number; anchorY: number;
  branchId?: string; paper?: Paper; project?: Project;
}
export interface TreeLink { source: string; target: string; level: number; trunkOffset?: number }
export const width = 1600;
export const height = 1180;

// Branch tips retain the botanical composition; only trunk departure order encodes time.
// Each dated publication/ presentation has equal weight, including nested topics.
export function meanPublicationYear(node: ResearchNode): number | null {
  const years = new Map<string, number>();
  function collect(current: ResearchNode) {
    current.papers?.forEach(paper => {
      if (/^\d{4}$/.test(paper.year)) years.set(paper.id, Number(paper.year));
    });
    current.children?.forEach(collect);
  }
  collect(node);
  return years.size ? [...years.values()].reduce((a, b) => a + b, 0) / years.size : null;
}
export function chronologicalBranches(nodes: ResearchNode[]): ResearchNode[] {
  // Stable tie order; undated branches follow dated branches without an invented year.
  return [...nodes].sort((a, b) => (meanPublicationYear(a) ?? Infinity) - (meanPublicationYear(b) ?? Infinity));
}
export const branchChronology = chronologicalBranches(branches).map((branch, index) => ({
  id: branch.id, meanYear: meanPublicationYear(branch), order: index + 1,
  trunkOffset: 25 + index * 40,
}));
export const trunkRise = Math.max(...branchChronology.map(branch => branch.trunkOffset));
export function branchDeparture(link: TreeLink, source: Pick<TreePoint, "x" | "y">) {
  return { x: source.x, y: source.y - (link.trunkOffset ?? 0) };
}
const boughs = [
  { x: 350, y: 790, tips: [[165, 595], [290, 380], [415, 170], [150, 810]] },
  { x: 1220, y: 880, tips: [[1230, 170], [1390, 335], [1440, 555], [1110, 460], [1240, 700], [1470, 835]] },
  { x: 510, y: 560, tips: [] },
  { x: 745, y: 510, tips: [] },
  { x: 1000, y: 645, tips: [] },
  { x: 800, y: 785, tips: [[600, 250], [825, 190], [1040, 240]] },
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
  positions.set(researchTree.id, { x: 800, y: 1090 });
  positions.set(researchTree.children![0].id, { x: 800, y: 960 });
  const points: TreePoint[] = [];
  const links: TreeLink[] = [];
  function visit(node: ResearchNode, branchId?: string) {
    const branch = node.level === 2 ? node.id : branchId;
    const position = positions.get(node.id)!;
    points.push({ id: node.id, name: node.name, kind: "research", level: node.level, ...position, anchorX: position.x, anchorY: position.y, branchId: branch });
    const items = [...(node.papers ?? []).map(paper => ({ paper, item: paper })), ...(node.projects ?? []).map(project => ({ project, item: project }))];
    items.forEach((entry, i, group) => {
      const offset = i - (group.length - 1) / 2;
      const x = position.x + offset * 52;
      const y = position.y - 84 - Math.max(0, 1.5 - Math.abs(offset)) * 21;
      const isPaper = "paper" in entry;
      points.push({ id: entry.item.id, name: isPaper ? entry.item.year : "", kind: isPaper ? "paper" : "project", level: 4, x, y, anchorX: x, anchorY: y, branchId: branch, ...(isPaper ? { paper: entry.paper } : { project: entry.project }) });
      links.push({ source: node.id, target: entry.item.id, level: 4 });
    });
    (node.children ?? []).forEach(child => {
      links.push({ source: node.id, target: child.id, level: child.level, ...(child.level === 2 ? { trunkOffset: branchChronology.find(branch => branch.id === child.id)!.trunkOffset } : {}) });
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
    const found = node.id === id || Boolean([...(node.papers ?? []), ...(node.projects ?? [])].some(entry => entry.id === id)) || Boolean(node.children?.some(visit));
    if (found) result.add(node.id);
    return found;
  }
  visit(researchTree);
  return result;
}
export const topicLookup = new Map(allNodes.map(node => [node.id, node]));
