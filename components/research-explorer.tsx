"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ResearchTree } from "./research-tree";
import { allNodes, branches, coverage, descendantPaperIds, filterPapers, papers, type IndexedPaper } from "@/lib/research";
import { ancestorIds } from "@/lib/tree-layout";

function PaperMeta({ paper }: { paper: IndexedPaper }) {
  return <><span className="paper-journal">{paper.journal || "掲載誌の記載なし"}</span><span className="paper-meta">{paper.details}</span></>;
}

export function ResearchExplorer() {
  const [view, setView] = useState<"tree" | "list">("tree");
  const [query, setQuery] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [throughYear, setThroughYear] = useState(coverage.to);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const filtered = useMemo(() => filterPapers({ query, branchId, throughYear }), [query, branchId, throughYear]);
  const visibleIds = useMemo(() => {
    const ids = new Set<string>();
    filtered.forEach(paper => ancestorIds(paper.id).forEach(id => ids.add(id)));
    return ids;
  }, [filtered]);
  const selectedPaper = papers.find(paper => paper.id === selectedId);
  const selectedResearch = allNodes.find(node => node.id === selectedId);
  const descendants = new Set(selectedResearch ? descendantPaperIds(selectedResearch) : []);
  const selectedPapers = filtered.filter(paper => descendants.has(paper.id));
  const hasFilters = Boolean(query || branchId !== "all" || throughYear < coverage.to);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedId && view === "tree") {
      if (!dialog.open) dialog.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = previous; };
    }
    if (dialog.open) dialog.close();
  }, [selectedId, view]);

  function resetFilters() { setQuery(""); setBranchId("all"); setThroughYear(coverage.to); }
  function showInTree(id: string) { setView("tree"); setSelectedId(id); headingRef.current?.scrollIntoView({ block: "start", behavior: "instant" }); }

  return <section className="explorer-section" id="explore" aria-labelledby="explorer-title">
    <div className="explorer-heading">
      <div className="atlas-title"><p className="eyebrow">THE TREE OF RESEARCH</p><h1 id="explorer-title" ref={headingRef} tabIndex={-1}>研究の樹</h1><p className="atlas-subtitle">言語学、文化進化、空間分析。</p></div>
      <div className="explorer-actions"><span className="archive-years">{coverage.from} — {coverage.to}</span><div className="view-switch" role="group" aria-label="研究の表示方法"><button type="button" aria-pressed={view === "tree"} onClick={() => setView("tree")}>系統樹</button><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>論文一覧 <span>{papers.length}</span></button></div><button type="button" className="filter-toggle" aria-expanded={filtersOpen} aria-controls="research-filters" onClick={() => setFiltersOpen(!filtersOpen)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 6H18M2 14H18"/><circle cx="7" cy="6" r="2"/><circle cx="13" cy="14" r="2"/></svg><span>絞り込み</span>{hasFilters && <i aria-label="条件を適用中"/>}</button></div>
    </div>
    <div className="filters" id="research-filters" hidden={!filtersOpen}>
      <label className="search-field"><span>論文・テーマ</span><input type="search" placeholder="キーワードで探す" value={query} onChange={event => setQuery(event.target.value)}/></label>
      <label className="year-filter"><span>収録年代 <output>{coverage.from}–{throughYear}</output></span><input aria-label="表示する年代の上限" type="range" min={coverage.from} max={coverage.to} step="1" value={throughYear} onChange={event => setThroughYear(Number(event.target.value))}/></label>
      <div className="result-count" role="status" aria-live="polite">{filtered.length} / {papers.length} 件{hasFilters && <button type="button" onClick={resetFilters}>条件をクリア</button>}</div>
    </div>
    {view === "tree" ? <div className="tree-stage"><ResearchTree visibleIds={visibleIds} selectedId={selectedId ?? ""} onSelect={setSelectedId}/><div className="stage-note"><span className="note-line"/><p>枝に研究テーマを、葉に論文を。<br/>気になるところから、辿ってください。</p></div>{!filtered.length && <div className="tree-empty"><p>条件に合う論文がありません。</p><button type="button" onClick={resetFilters}>すべて表示する</button></div>}</div> : <div className="paper-list content-width"><div className="list-heading"><p>論文・発表 <span>{filtered.length}件</span></p><span>発表年の新しい順</span></div>{filtered.map(paper => <article className="publication-row" key={paper.id}><span className="publication-year">{paper.year}</span><div><p className="publication-topic">{paper.branchName}{paper.topicName !== paper.branchName ? ` / ${paper.topicName}` : ""}</p><h2>{paper.title}</h2><PaperMeta paper={paper}/></div><button type="button" aria-label={`${paper.title} を樹で見る`} onClick={() => showInTree(paper.id)}>樹で見る ↗</button></article>)}{!filtered.length && <div className="empty-list"><p>条件に合う論文がありません。</p><button type="button" onClick={resetFilters}>条件をクリアして、すべて表示</button></div>}</div>}
    <div className="branch-nav" role="group" aria-label="研究領域で絞り込む"><button type="button" aria-pressed={branchId === "all"} onClick={() => setBranchId("all")}>すべての枝</button>{branches.map((branch, index) => <button type="button" key={branch.id} aria-pressed={branchId === branch.id} onClick={() => setBranchId(branch.id)}><span>{String(index + 1).padStart(2, "0")}</span>{branch.name}</button>)}</div>
    <p className="explorer-footnote"><span>研究テーマと業績のつながりを表す概念図</span><span aria-live="polite">{hasFilters ? `${filtered.length} / ` : ""}{papers.length}件の論文・発表 · {coverage.from}–{throughYear}</span></p>
    <dialog ref={dialogRef} className="detail-dialog" aria-labelledby="detail-title" onCancel={() => setSelectedId(null)} onClose={() => setSelectedId(null)} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setSelectedId(null); } }}>
      <div className="detail-panel"><button type="button" className="close-detail" aria-label="詳細を閉じる" onClick={() => setSelectedId(null)}>閉じる <span aria-hidden="true">×</span></button>
        {selectedPaper ? <><button type="button" className="back-button" onClick={() => setSelectedId(selectedPaper.topicId)}>← {selectedPaper.topicName}</button><p className="eyebrow">PUBLICATION / {selectedPaper.year}</p><h2 id="detail-title" className="selected-paper-title">{selectedPaper.title}</h2><PaperMeta paper={selectedPaper}/><div className="paper-path"><span>この論文につながる枝</span><ol>{selectedPaper.path.map(item => <li key={item}>{item}</li>)}</ol></div><a className="scholar-link" href={`https://scholar.google.com/scholar?q=${encodeURIComponent(selectedPaper.title)}`} target="_blank" rel="noreferrer">このタイトルで文献を探す ↗</a></> : selectedResearch ? <><p className="eyebrow">RESEARCH THEME</p><h2 id="detail-title">{selectedResearch.name}</h2><p className="detail-description">{selectedResearch.description}</p><p className="detail-total">この枝の論文・発表 <span>{selectedPapers.length}</span></p><div className="detail-papers">{selectedPapers.map(paper => <button type="button" className="paper-preview" key={paper.id} onClick={() => setSelectedId(paper.id)}><span className="paper-year">{paper.year}</span><span>{paper.title}</span><span aria-hidden="true">↗</span></button>)}{!selectedPapers.length && <p className="empty-message">現在の条件に合う論文はありません。</p>}</div></> : <h2 id="detail-title">研究の詳細</h2>}
      </div>
    </dialog>
  </section>;
}
