import { allNodes, branches, researchTree, type Paper, type ResearchNode } from "./research";

export interface TreePoint {
  id: string; name: string; kind: "research" | "paper"; level: number;
  x: number; y: number; anchorX: number; anchorY: number;
  branchId?: string; paper?: Paper;
}
export interface TreeLink { source: string; target: string; level: number }
export const width = 1120;
export const height = 700;

export function createLayout(): { points: TreePoint[]; links: TreeLink[] } {
  const leafTopics = branches.flatMap(branch => branch.children ?? [branch]);
  const positions = new Map<string, { x: number; y: number }>();
  leafTopics.forEach((node, i) => {
    const x = 96 + i * 116;
    const edge = Math.abs(x - 560) / 464;
    positions.set(node.id, { x, y: 250 + edge * 90 });
  });
  branches.forEach(branch => {
    if (!branch.children) return;
    const children = branch.children.map(node => positions.get(node.id)!);
    positions.set(branch.id, { x: children.reduce((sum, node) => sum + node.x, 0) / children.length, y: 445 });
  });
  positions.set(researchTree.id, { x: 560, y: 647 });
  positions.set(researchTree.children![0].id, { x: 560, y: 547 });
  const points: TreePoint[] = [];
  const links: TreeLink[] = [];
  function visit(node: ResearchNode, branchId?: string) {
    const branch = node.level === 2 ? node.id : branchId;
    const position = positions.get(node.id)!;
    points.push({ id: node.id, name: node.name, kind: "research", level: node.level, ...position, anchorX: position.x, anchorY: position.y, branchId: branch });
    (node.papers ?? []).forEach((paper, i, group) => {
      const x = position.x + (i - (group.length - 1) / 2) * 40;
      const y = position.y - 86 - (i % 2) * 32;
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
  const rise = (source.y - target.y) * 0.56;
  return `M ${source.x} ${source.y} C ${source.x} ${source.y - rise}, ${target.x} ${target.y + rise * 0.35}, ${target.x} ${target.y}`;
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
