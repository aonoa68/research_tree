import { ResearchExplorer } from "@/components/research-explorer";
import { coverage, papers, timeline } from "@/lib/research";

export default function Home() {
  return <>
    <a className="skip-link" href="#explore">研究系統樹へ移動</a>
    <header className="site-header" id="top">
      <a className="wordmark" href="#top"><svg viewBox="0 0 32 40" aria-hidden="true"><path d="M16 36V14M16 26C4 26 2 16 8 13C13 10 17 17 11 18M16 20C29 20 29 8 24 7C19 6 18 12 23 12M16 14C7 12 10 2 16 3C22 4 20 9 17 8M16 32 8 37M16 32 24 37"/></svg><span>小野原彩香<small>AYAKA ONOHARA</small></span></a>
      <nav aria-label="メインナビゲーション"><a href="#explore">研究の樹</a><a href="#about">この樹について</a></nav>
    </header>
    <main>
      <ResearchExplorer/>
      <section className="about-section content-width" id="about" aria-labelledby="about-title">
        <div className="section-title"><span className="eyebrow">ABOUT THE TREE</span><h2 id="about-title">ひとつの根から、<br/>いくつもの問いへ。</h2></div>
        <div className="about-copy"><p>言語は、どのように変わるのか。<br/>文化は、どのように伝わるのか。</p><p>文化進化理論を幹に、言語進化、空間分析、文化の多様性へ。研究テーマのつながりと、一つひとつの論文・発表を、一本の樹に重ねています。</p><dl className="tree-key"><div><dt>根</dt><dd>研究者</dd></div><div><dt>幹</dt><dd>文化進化理論</dd></div><div><dt>枝</dt><dd>研究テーマ</dd></div><div><dt>葉</dt><dd>論文・発表</dd></div></dl><details><summary>着想と収録データ</summary><p>クリムトの「生命の樹」、『夜の木』、『モチモチの木』に着想を得た、元サイトの樹のモチーフを引き継いでいます。</p><p>収録範囲は{coverage.from}–{coverage.to}年、元サイト掲載の論文・発表{papers.length}件です。枝の長さや距離は、統計的な系統関係を示しません。</p></details></div>
      </section>
      <section className="timeline-section content-width" id="timeline" aria-labelledby="timeline-title"><div className="section-title"><span className="eyebrow">RESEARCH TRAJECTORY</span><h2 id="timeline-title">研究の歩み</h2></div><ol className="timeline">{timeline.map(item => <li key={item.year}><span className="timeline-year">{item.year}</span><div><h3>{item.title}</h3><p>{item.text}</p></div></li>)}</ol></section>
    </main>
    <footer className="site-footer content-width"><span>小野原彩香の研究系統樹</span><a href="https://github.com/aonoa68/research_tree" target="_blank" rel="noreferrer">GitHub ↗</a><a href="#top">先頭へ ↑</a></footer>
  </>;
}
