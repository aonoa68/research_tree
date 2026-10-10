"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ResearchTree } from "./research-tree";
import { allNodes, branches, coverage, descendantPaperIds, filterPapers, papers, theory, type IndexedPaper } from "@/lib/research";
import { ancestorIds } from "@/lib/tree-layout";

function PaperMeta({ paper }: { paper: IndexedPaper }) {
  return <><span className="paper-journal">{paper.journal || "掲載誌の記載なし"}</span><span className="paper-meta">{paper.details}</span></>;
}

export function ResearchExplorer() {
  const [view, setView] = useState<"tree" | "list">("tree");
  const [query, setQuery] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [throughYear, setThroughYear] = useState(coverage.to);
  const [selectedId, setSelectedId] = useState(theory.id);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnToTree = useRef(false);
  useEffect(() => {
    if (view === "tree" && returnToTree.current) {
      returnToTree.current = false;
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [view]);
  const filtered = useMemo(() => filterPapers({ query, branchId, throughYear }), [query, branchId, throughYear]);
  const visibleIds = useMemo(() => {
    const ids = new Set<string>();
    filtered.forEach(paper => ancestorIds(paper.id).forEach(id => ids.add(id)));
    return ids;
  }, [filtered]);
  const selectedPaper = filtered.find(paper => paper.id === selectedId);
  const selectedResearch = allNodes.find(node => node.id === selectedId && visibleIds.has(node.id)) ?? theory;
  const descendants = new Set(descendantPaperIds(selectedResearch));
  const selectedPapers = filtered.filter(paper => descendants.has(paper.id));
  const hasFilters = Boolean(query || branchId !== "all" || throughYear < coverage.to);

  function resetFilters() { setQuery(""); setBranchId("all"); setThroughYear(coverage.to); setSelectedId(theory.id); }
  function chooseBranch(id: string) { setBranchId(id); setSelectedId(id === "all" ? theory.id : id); }
  function showInTree(id: string) { returnToTree.current = true; setSelectedId(id); setView("tree"); }

  return <section className="explorer-section wrap" id="explore" aria-labelledby="explorer-title">
    <div className="explorer-heading"><div><p className="eyebrow">01 / EXPLORE THE CONNECTIONS</p><h2 id="explorer-title" ref={headingRef} tabIndex={-1}>研究を辿る。</h2></div><div className="view-switch" role="group" aria-label="研究の表示方法"><button type="button" aria-pressed={view === "tree"} onClick={() => setView("tree")}><span aria-hidden="true">✳</span> 樹で見る</button><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}><span aria-hidden="true">☰</span> 一覧で読む</button></div></div>
    <div className="filters">
      <label className="search-field"><span className="sr-only">論文・テーマを検索</span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input type="search" placeholder="論文・テーマを検索" value={query} onChange={event => { setQuery(event.target.value); setSelectedId(theory.id); }}/></label>
      <label className="year-filter"><span>表示する年代 <output>{coverage.from}–{throughYear}</output></span><input aria-label="表示する年代の上限" type="range" min={coverage.from} max={coverage.to} step="1" value={throughYear} onChange={event => setThroughYear(Number(event.target.value))}/></label>
      <div className="result-count" role="status" aria-live="polite"><strong>{filtered.length}</strong> / {papers.length} 件{hasFilters && <button type="button" onClick={resetFilters}>条件をクリア</button>}</div>
    </div>
    <div className="branch-nav" role="group" aria-label="研究の枝で絞り込む"><button type="button" aria-pressed={branchId === "all"} onClick={() => chooseBranch("all")}>すべての枝</button>{branches.map((branch, index) => <button type="button" key={branch.id} aria-pressed={branchId === branch.id} onClick={() => chooseBranch(branch.id)}><span>{String(index + 1).padStart(2, "0")}</span>{branch.name}</button>)}</div>
    {view === "tree" ? <div className="tree-workspace">
      <div className="tree-frame"><div className="tree-caption"><span>THE LIVING ARCHIVE</span><span>{coverage.from} — {throughYear}</span></div><ResearchTree visibleIds={visibleIds} selectedId={selectedPaper?.id ?? selectedResearch.id} onSelect={setSelectedId}/><p className="tree-help">枝・葉を選ぶと詳細を表示。背景や節点をドラッグして移動できます。</p><div className="tree-legend"><span><i className="legend-branch"/>研究テーマ</span><span><i className="legend-paper"/>論文・発表</span><span>色の濃淡は発表年</span></div></div>
      <aside className="detail-panel" aria-label="選択した研究の詳細">
        {selectedPaper ? <><button type="button" className="back-button" onClick={() => setSelectedId(selectedPaper.topicId)}>← {selectedPaper.topicName}</button><p className="eyebrow">PUBLICATION / {selectedPaper.year}</p><h3 className="selected-paper-title">{selectedPaper.title}</h3><PaperMeta paper={selectedPaper}/><div className="paper-path"><span>研究のつながり</span><ol>{selectedPaper.path.map(item => <li key={item}>{item}</li>)}</ol></div><a className="scholar-link" href={`https://scholar.google.com/scholar?q=${encodeURIComponent(selectedPaper.title)}`} target="_blank" rel="noreferrer">このタイトルで文献を探す ↗</a></> : <><p className="eyebrow">SELECTED BRANCH</p><h3>{selectedResearch.name}</h3><p className="detail-description">{selectedResearch.description}</p><p className="detail-total">この枝の論文・発表 <strong>{selectedPapers.length}</strong></p><div className="detail-papers">{selectedPapers.map(paper => <button type="button" className="paper-preview" key={paper.id} onClick={() => setSelectedId(paper.id)}><span className="paper-year">{paper.year}</span><span>{paper.title}</span><span className="paper-arrow" aria-hidden="true">↗</span></button>)}{!selectedPapers.length && <p className="empty-message">条件に合う論文がありません。検索語や年代を変更してください。</p>}</div></>}
      </aside>
    </div> : <div className="paper-list"><div className="list-heading"><h3>論文・発表の一覧</h3><span>発表年の新しい順</span></div>{filtered.map(paper => <article className="publication-row" key={paper.id}><span className="publication-year">{paper.year}</span><div><p className="publication-topic">{paper.branchName}{paper.topicName !== paper.branchName ? ` / ${paper.topicName}` : ""}</p><h4>{paper.title}</h4><PaperMeta paper={paper}/></div><button type="button" aria-label={`${paper.title} を樹で見る`} onClick={() => showInTree(paper.id)}>樹で見る <span aria-hidden="true">↗</span></button></article>)}{!filtered.length && <div className="empty-list"><p>条件に合う論文がありません。</p><button type="button" onClick={resetFilters}>条件をクリアして、すべて表示</button></div>}</div>}
    <p className="explorer-footnote">テーマ間の関係を示す概念図です。枝の長さ・位置は定量的な距離を表しません。<span>掲載データ：{coverage.from}–{coverage.to}</span></p>
  </section>;
}
