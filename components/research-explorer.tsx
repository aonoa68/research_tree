"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ResearchTree } from "./research-tree";
import { allNodes, branches, coverage, descendantEntryIds, entries, filterEntries, papers, projects, updatedAt, type IndexedEntry, type Filters } from "@/lib/research";
import { ancestorIds } from "@/lib/tree-layout";

function EntryMeta({ entry }: { entry: IndexedEntry }) {
  return entry.kind === "paper" ? <>
    {entry.publicationType && <span className="entry-status">{entry.publicationType} · 掲載・発表済み</span>}
    <span className="paper-journal">{entry.journal || "掲載誌の記載なし"}</span><span className="paper-meta">{entry.details}</span>
  </> : <>
    <span className="entry-status is-ongoing">進行中 · {entry.stage}</span>
    <p className="project-description">{entry.description}</p>
    <dl className="project-methods"><dt>方法・取り組み</dt><dd>{entry.methods}</dd><dt>期間・確認時点</dt><dd>{entry.period} · {updatedAt}確認</dd></dl>
  </>;
}

export function ResearchExplorer() {
  const [view, setView] = useState<"tree" | "list">("tree");
  const [query, setQuery] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [throughYear, setThroughYear] = useState(coverage.to);
  const [recentOnly, setRecentOnly] = useState(false);
  const [kind, setKind] = useState<NonNullable<Filters["kind"]>>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const filtered = useMemo(() => filterEntries({ query, branchId, throughYear, fromYear: recentOnly ? 2025 : coverage.from, kind }), [query, branchId, throughYear, recentOnly, kind]);
  const visibleIds = useMemo(() => {
    const ids = new Set<string>();
    filtered.forEach(entry => ancestorIds(entry.id).forEach(id => ids.add(id)));
    return ids;
  }, [filtered]);
  const selectedEntry = entries.find(entry => entry.id === selectedId);
  const selectedResearch = allNodes.find(node => node.id === selectedId);
  const descendants = new Set(selectedResearch ? descendantEntryIds(selectedResearch) : []);
  const selectedEntries = filtered.filter(entry => descendants.has(entry.id));
  const filteredPapers = filtered.filter(entry => entry.kind === "paper");
  const filteredProjects = filtered.filter(entry => entry.kind === "project");
  const hasFilters = Boolean(query || branchId !== "all" || throughYear < coverage.to || recentOnly || kind !== "all");

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

  function resetFilters() { setQuery(""); setBranchId("all"); setThroughYear(coverage.to); setRecentOnly(false); setKind("all"); }
  function showInTree(id: string) { setView("tree"); setSelectedId(id); headingRef.current?.scrollIntoView({ block: "start", behavior: "instant" }); }

  return <section className="explorer-section" id="explore" aria-labelledby="explorer-title">
    <div className="explorer-heading">
      <div className="atlas-title"><p className="eyebrow">THE TREE OF RESEARCH</p><h1 id="explorer-title" ref={headingRef} tabIndex={-1}>研究の樹</h1><p className="atlas-subtitle">言語、場所、感情、文化の変化。</p></div>
      <div className="explorer-actions"><div className="archive-years"><span>{coverage.from} — {coverage.to}</span><button type="button" className="recent-toggle" aria-pressed={recentOnly} onClick={() => { setRecentOnly(!recentOnly); setThroughYear(coverage.to); }}>2025年以降</button></div><div className="view-switch" role="group" aria-label="研究の表示方法"><button type="button" aria-pressed={view === "tree"} onClick={() => setView("tree")}>系統樹</button><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>論文・研究一覧</button></div><button type="button" className="filter-toggle" aria-expanded={filtersOpen} aria-controls="research-filters" onClick={() => setFiltersOpen(!filtersOpen)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 6H18M2 14H18"/><circle cx="7" cy="6" r="2"/><circle cx="13" cy="14" r="2"/></svg><span>絞り込み</span>{hasFilters && <i aria-label="条件を適用中"/>}</button></div>
    </div>
    <div className="filters" id="research-filters" hidden={!filtersOpen}>
      <label className="search-field"><span>論文・研究テーマ</span><input type="search" placeholder="キーワードで探す" value={query} onChange={event => setQuery(event.target.value)}/></label>
      <label className="kind-filter"><span>種別</span><select value={kind} onChange={event => setKind(event.target.value as NonNullable<Filters["kind"]>)}><option value="all">すべて</option><option value="paper">論文・発表</option><option value="project">進行中研究</option></select></label>
      <label className="year-filter"><span>表示年代 <output>{recentOnly ? 2025 : coverage.from}–{throughYear}</output></span><input aria-label="表示する年代の上限" type="range" min={recentOnly ? 2025 : coverage.from} max={coverage.to} step="1" value={throughYear} onChange={event => setThroughYear(Number(event.target.value))}/></label>
      <div className="result-count" role="status" aria-live="polite">論文・発表 {filteredPapers.length}件<br/>進行中 {filteredProjects.length}件{hasFilters && <button type="button" onClick={resetFilters}>条件をクリア</button>}</div>
      <p className="filter-note">論文・発表は刊行・発表年、進行中研究は情報を確認した年で絞り込みます。</p>
    </div>
    {view === "tree" ? <div className="tree-stage"><ResearchTree visibleIds={visibleIds} selectedId={selectedId ?? ""} onSelect={setSelectedId}/><div className="stage-note"><span className="note-line"/><p><span className="legend-leaf">◆</span> 金色の葉：論文・発表<br/><span className="legend-bud">◇</span> 輪郭の芽：進行中研究<br/>幹の下→上：平均発表年の古い順<br/>論文・発表を集計／分岐間隔は年数を表しません</p></div>{!filtered.length && <div className="tree-empty"><p>条件に合う項目がありません。</p><button type="button" onClick={resetFilters}>すべて表示する</button></div>}</div> : <div className="paper-list content-width"><div className="list-heading"><p>論文・発表 {filteredPapers.length}件 ／ 進行中研究 {filteredProjects.length}件</p><span>年の新しい順</span></div>{filtered.map(entry => <article className="publication-row" key={entry.id}><span className="publication-year">{entry.year}{entry.kind === "project" && <small>確認年</small>}</span><div><p className="publication-topic">{entry.branchName}{entry.topicName !== entry.branchName ? ` / ${entry.topicName}` : ""}</p><h2>{entry.title}</h2><EntryMeta entry={entry}/>{entry.url && <a className="source-link" href={entry.url} target="_blank" rel="noreferrer">{entry.kind === "paper" ? "原典・発表情報" : "関連情報"} ↗</a>}</div><button type="button" aria-label={`${entry.title} を樹で見る`} onClick={() => showInTree(entry.id)}>樹で見る ↗</button></article>)}{!filtered.length && <div className="empty-list"><p>条件に合う項目がありません。</p><button type="button" onClick={resetFilters}>条件をクリアして、すべて表示</button></div>}</div>}
    <div className="branch-nav" role="group" aria-label="研究領域で絞り込む"><button type="button" aria-pressed={branchId === "all"} onClick={() => setBranchId("all")}>すべての枝</button>{branches.map((branch, index) => <button type="button" key={branch.id} aria-pressed={branchId === branch.id} onClick={() => setBranchId(branch.id)}><span>{String(index + 1).padStart(2, "0")}</span>{branch.name}</button>)}</div>
    <p className="explorer-footnote"><span>研究のつながりを表す概念図 · 更新 {updatedAt}</span><span aria-live="polite">論文・発表 {hasFilters ? `${filteredPapers.length} / ` : ""}{papers.length}件 ／ 進行中研究 {hasFilters ? `${filteredProjects.length} / ` : ""}{projects.length}件</span></p>
    <dialog ref={dialogRef} className="detail-dialog" aria-labelledby="detail-title" onCancel={() => setSelectedId(null)} onClose={() => setSelectedId(null)} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setSelectedId(null); } }}>
      <div className="detail-panel"><button type="button" className="close-detail" aria-label="詳細を閉じる" onClick={() => setSelectedId(null)}>閉じる <span aria-hidden="true">×</span></button>
        {selectedEntry ? <><button type="button" className="back-button" onClick={() => setSelectedId(selectedEntry.topicId)}>← {selectedEntry.topicName}</button><p className="eyebrow">{selectedEntry.kind === "paper" ? "PUBLICATION" : "WORK IN PROGRESS"} / {selectedEntry.year}</p><h2 id="detail-title" className="selected-paper-title">{selectedEntry.title}</h2><EntryMeta entry={selectedEntry}/><div className="paper-path"><span>この研究につながる枝</span><ol>{selectedEntry.path.map(item => <li key={item}>{item}</li>)}</ol></div>{selectedEntry.url ? <a className="scholar-link" href={selectedEntry.url} target="_blank" rel="noreferrer">{selectedEntry.kind === "paper" ? "原典・発表情報を見る" : "研究の関連情報を見る"} ↗</a> : selectedEntry.kind === "paper" && <a className="scholar-link" href={`https://scholar.google.com/scholar?q=${encodeURIComponent(selectedEntry.title)}`} target="_blank" rel="noreferrer">このタイトルで文献を探す ↗</a>}</> : selectedResearch ? <><p className="eyebrow">RESEARCH THEME</p><h2 id="detail-title">{selectedResearch.name}</h2><p className="detail-description">{selectedResearch.description}</p><p className="detail-total">この枝の成果・進行中研究 <span>{selectedEntries.length}</span></p><div className="detail-papers">{selectedEntries.map(entry => <button type="button" className="paper-preview" key={entry.id} onClick={() => setSelectedId(entry.id)}><span className="paper-year">{entry.kind === "paper" ? entry.year : "進行中"}</span><span>{entry.title}</span><span aria-hidden="true">↗</span></button>)}{!selectedEntries.length && <p className="empty-message">現在の条件に合う項目はありません。</p>}</div></> : <h2 id="detail-title">研究の詳細</h2>}
      </div>
    </dialog>
  </section>;
}
