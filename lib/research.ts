import source from "@/data/research-tree.json";
import recent from "@/data/recent-research.json";

export interface Paper {
  id: string; title: string; journal: string; year: string; details: string;
  url?: string; publicationType?: string;
}
export interface Project {
  id: string; title: string; year: string; period: string; description: string;
  methods: string; status: "ongoing"; stage: string; url?: string;
}
export interface ResearchNode {
  id: string; name: string; description: string; level: number;
  children?: ResearchNode[]; papers?: Paper[]; projects?: Project[];
}
interface IndexedContext { topicId: string; topicName: string; branchId: string; branchName: string; path: string[] }
export interface IndexedPaper extends Paper, IndexedContext { kind: "paper" }
export interface IndexedProject extends Project, IndexedContext { kind: "project" }
export type IndexedEntry = IndexedPaper | IndexedProject;

// Keep the 2010–2024 source intact; recent additions are a separately documented layer.
export const researchTree: ResearchNode = JSON.parse(JSON.stringify(source));
function findNode(node: ResearchNode, id: string): ResearchNode | undefined {
  return node.id === id ? node : node.children?.map(child => findNode(child, id)).find(Boolean);
}
for (const patch of recent.patches) {
  const parent = findNode(researchTree, patch.parentId);
  if (!parent) throw new Error(`Unknown research parent: ${patch.parentId}`);
  if (patch.children) parent.children = [...(parent.children ?? []), ...patch.children as ResearchNode[]];
  if (patch.papers) parent.papers = [...(parent.papers ?? []), ...patch.papers];
  if (patch.projects) parent.projects = [...(parent.projects ?? []), ...patch.projects as Project[]];
}
export const updatedAt = recent.updatedAt;
export const theory = researchTree.children![0];
export const branches = theory.children!;

export function indexEntries(root: ResearchNode): IndexedEntry[] {
  const result: IndexedEntry[] = [];
  function visit(node: ResearchNode, path: string[], branch?: ResearchNode) {
    const currentBranch = node.level === 2 ? node : branch;
    const nextPath = [...path, node.name];
    const context = { topicId: node.id, topicName: node.name, branchId: currentBranch?.id ?? node.id, branchName: currentBranch?.name ?? node.name, path: nextPath };
    node.papers?.forEach(paper => result.push({ ...paper, ...context, kind: "paper" }));
    node.projects?.forEach(project => result.push({ ...project, ...context, kind: "project" }));
    node.children?.forEach(child => visit(child, nextPath, currentBranch));
  }
  visit(root, []);
  return result;
}
export function indexPapers(root: ResearchNode): IndexedPaper[] {
  return indexEntries(root).filter((entry): entry is IndexedPaper => entry.kind === "paper");
}
export const entries = indexEntries(researchTree);
export const papers = entries.filter((entry): entry is IndexedPaper => entry.kind === "paper");
export const projects = entries.filter((entry): entry is IndexedProject => entry.kind === "project");
export const years = [...new Set(entries.map(entry => Number(entry.year)))].sort((a, b) => a - b);
export const coverage = { from: years[0], to: years[years.length - 1] };
export const allNodes: ResearchNode[] = [];
(function visit(node: ResearchNode) { allNodes.push(node); node.children?.forEach(visit); })(researchTree);

export function descendantPaperIds(node: ResearchNode): string[] {
  return [...(node.papers ?? []).map(paper => paper.id), ...(node.children ?? []).flatMap(descendantPaperIds)];
}
export function descendantEntryIds(node: ResearchNode): string[] {
  return [...(node.papers ?? []), ...(node.projects ?? [])].map(entry => entry.id).concat((node.children ?? []).flatMap(descendantEntryIds));
}
export interface Filters { query: string; branchId: string; throughYear: number; fromYear?: number; kind?: "all" | "paper" | "project" }
export function filterEntries(filters: Filters, input: IndexedEntry[] = entries): IndexedEntry[] {
  const query = filters.query.trim().normalize("NFKC").toLocaleLowerCase();
  return input.filter(entry => Number(entry.year) <= filters.throughYear && Number(entry.year) >= (filters.fromYear ?? coverage.from)
    && (filters.branchId === "all" || entry.branchId === filters.branchId)
    && (!filters.kind || filters.kind === "all" || entry.kind === filters.kind)
    && (!query || [entry.title, ...entry.path, ...(entry.kind === "paper" ? [entry.journal, entry.details] : [entry.description, entry.methods, entry.stage])].join(" ").normalize("NFKC").toLocaleLowerCase().includes(query)))
    .sort((a, b) => Number(b.year) - Number(a.year) || a.id.localeCompare(b.id));
}
export function filterPapers(filters: Filters, input = papers): IndexedPaper[] {
  return filterEntries(filters, input) as IndexedPaper[];
}
export const timeline = [
  { year: "2026", title: "場所・感情から、景観と学習へ", text: "文化進化と感情を結ぶGANモデル、たたら製鉄と草原分布、生成AIを使う統計教育の成果を刊行。場所・音声・感情の研究やデジタルツイン開発も進める。" },
  { year: "2025", title: "感情地図と地理空間AI", text: "場所の記述・感情・空間的近接性を結ぶ研究を発表。LLMと地理空間CLIツールを結ぶ共同研究へ展開。" },
  { year: "2024", title: "言語進化と、AIの教育応用", text: "ピッチアクセントのベイジアン系統発生解析を刊行。対話型AIモデル・AI音声を活用した教育コンテンツへ。" },
  { year: "2022", title: "アクセントの機能を進化から考える", text: "進化的アプローチによるアクセント機能研究を開始。" },
  { year: "2018–2023", title: "集団構造と言語変化", text: "集団構造を考慮した言語変化プロセスの研究。" },
  { year: "2016–2019", title: "変化の要因と、系譜の評価", text: "言語変化要因と系譜を定量的に評価する研究。" },
  { year: "2013–2017", title: "数理モデルで言語の動態を捉える", text: "数理的アプローチによる言語動態研究。" },
  { year: "2010–2013", title: "方言分布から、文化の広がりへ", text: "方言分布・文化領域分析の基礎研究。" },
];
