import source from "@/data/research-tree.json";

export interface Paper {
  id: string;
  title: string;
  journal: string;
  year: string;
  details: string;
}

export interface ResearchNode {
  id: string;
  name: string;
  description: string;
  level: number;
  children?: ResearchNode[];
  papers?: Paper[];
}

export interface IndexedPaper extends Paper {
  topicId: string;
  topicName: string;
  branchId: string;
  branchName: string;
  path: string[];
}

export const researchTree: ResearchNode = source;
export const theory = researchTree.children![0];
export const branches = theory.children!;

export function indexPapers(root: ResearchNode): IndexedPaper[] {
  const result: IndexedPaper[] = [];
  function visit(node: ResearchNode, path: string[], branch?: ResearchNode) {
    const currentBranch = node.level === 2 ? node : branch;
    const nextPath = [...path, node.name];
    for (const paper of node.papers ?? []) {
      result.push({ ...paper, topicId: node.id, topicName: node.name,
        branchId: currentBranch?.id ?? node.id, branchName: currentBranch?.name ?? node.name, path: nextPath });
    }
    node.children?.forEach(child => visit(child, nextPath, currentBranch));
  }
  visit(root, []);
  return result;
}

export const papers = indexPapers(researchTree);
export const years = [...new Set(papers.map(paper => Number(paper.year)))].sort((a, b) => a - b);
export const coverage = { from: years[0], to: years[years.length - 1] };

export const allNodes: ResearchNode[] = [];
(function visit(node: ResearchNode) { allNodes.push(node); node.children?.forEach(visit); })(researchTree);

export function descendantPaperIds(node: ResearchNode): string[] {
  return [...(node.papers ?? []).map(paper => paper.id), ...(node.children ?? []).flatMap(descendantPaperIds)];
}

export interface Filters { query: string; branchId: string; throughYear: number }

export function filterPapers(filters: Filters, input = papers): IndexedPaper[] {
  const query = filters.query.trim().normalize("NFKC").toLocaleLowerCase();
  return input.filter(paper => Number(paper.year) <= filters.throughYear
    && (filters.branchId === "all" || paper.branchId === filters.branchId)
    && (!query || [paper.title, paper.journal, paper.details, ...paper.path].join(" ").normalize("NFKC").toLocaleLowerCase().includes(query)))
    .sort((a, b) => Number(b.year) - Number(a.year) || a.id.localeCompare(b.id));
}

export const timeline = [
  { year: "2024", title: "言語進化と、AIの教育応用", text: "ピッチアクセントのベイジアン系統発生解析を刊行。対話型AIモデル・AI音声を活用した教育コンテンツへ。" },
  { year: "2022", title: "アクセントの機能を進化から考える", text: "進化的アプローチによるアクセント機能研究を開始。" },
  { year: "2018–2023", title: "集団構造と言語変化", text: "集団構造を考慮した言語変化プロセスの研究。" },
  { year: "2016–2019", title: "変化の要因と、系譜の評価", text: "言語変化要因と系譜を定量的に評価する研究。" },
  { year: "2013–2017", title: "数理モデルで言語の動態を捉える", text: "数理的アプローチによる言語動態研究。" },
  { year: "2010–2013", title: "方言分布から、文化の広がりへ", text: "方言分布・文化領域分析の基礎研究。" },
];
