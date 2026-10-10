import { ResearchExplorer } from "@/components/research-explorer";
import { branches, coverage, papers, timeline } from "@/lib/research";

export default function Home() {
  return <>
    <a className="skip-link" href="#explore">研究系統樹へ移動</a>
    <header className="site-header wrap">
      <a className="wordmark" href="#top" aria-label="Research Tree トップ"><span className="brand-mark" aria-hidden="true">✳</span> RESEARCH TREE</a>
      <nav aria-label="メインナビゲーション"><a href="#explore">研究を辿る</a><a href="#timeline">歩み</a><a href="#about">この樹について <span aria-hidden="true">↗</span></a></nav>
    </header>
    <main id="top">
      <section className="intro wrap" aria-labelledby="intro-title">
        <div className="intro-copy"><p className="eyebrow"><span className="tiny-rule"/> AYAKA ONOHARA / RESEARCH ATLAS</p>
          <h1 id="intro-title">問いが、<br/>枝分かれする。</h1>
          <p className="intro-lead">言語の変化から、文化の広がりへ。<br/>一つひとつの研究をつなぐ、知識の樹。</p>
          <a className="intro-link" href="#explore">小野原彩香の研究系統樹をひらく <span aria-hidden="true">↓</span></a>
        </div>
        <div className="intro-aside"><span className="edition">FIELD NOTES<br/>OF A GROWING TREE</span>
          <p>根にある問い。<br/>枝を伸ばす方法。<br/>葉として残る研究。</p>
          <dl className="intro-stats"><div><dt>研究の枝</dt><dd>{String(branches.length).padStart(2, "0")}</dd></div><div><dt>論文・発表</dt><dd>{papers.length}</dd></div><div><dt>収録年</dt><dd className="year-span">{coverage.from}<span>— {coverage.to}</span></dd></div></dl>
        </div>
      </section>
      <ResearchExplorer/>
      <section className="timeline-section wrap" id="timeline" aria-labelledby="timeline-title">
        <div className="section-heading"><p className="eyebrow">02 / RESEARCH TRAJECTORY</p><h2 id="timeline-title">枝の先から、<br/>根を辿る。</h2><p>方言分布を捉える試みから、<br/>言語進化、空間分析、AIの教育応用へ。</p></div>
        <ol className="timeline">{timeline.map(item => <li key={item.year}><span className="timeline-year">{item.year}</span><div><h3>{item.title}</h3><p>{item.text}</p></div></li>)}</ol>
      </section>
      <section className="about-section wrap" id="about" aria-labelledby="about-title">
        <div><p className="eyebrow">03 / ABOUT THIS TREE</p><h2 id="about-title">研究のつながりを、<br/>一本の樹として。</h2></div>
        <div className="about-copy"><p>根は研究者、幹は文化進化理論、枝は研究テーマ、葉は論文・発表を表しています。枝を選び、研究の関係とその成果を辿ってください。</p>
          <p>この図は研究テーマを整理した概念図です。枝の長さや距離は、統計的に推定した系統関係や研究間の類似度を表すものではありません。</p>
          <details><summary>モチーフと収録内容について <span aria-hidden="true">＋</span></summary><p>クリムトの<a href="https://en.wikipedia.org/wiki/The_Tree_of_Life,_Stoclet_Frieze" target="_blank" rel="noreferrer">「生命の樹」</a>、<a href="https://tarabooks.com/shop/the-night-life-of-trees/" target="_blank" rel="noreferrer">『夜の木』</a>、『モチモチの木』に着想を得た、元サイトの樹のモチーフを引き継いでいます。</p><p>収録範囲は{coverage.from}–{coverage.to}年、元サイト掲載の論文・発表{papers.length}件です。最新業績の網羅を意味しません。研究年表のJournal of Language Evolutionの項目は、元サイトの論文データに合わせて2024年に統一しています。</p></details>
        </div>
      </section>
    </main>
    <footer className="site-footer wrap"><span>小野原彩香 <span className="footer-en">AYAKA ONOHARA</span></span><a href="https://github.com/aonoa68/research_tree" target="_blank" rel="noreferrer">研究系統樹のソース <span aria-hidden="true">↗</span></a><a href="#top">ページの先頭へ ↑</a></footer>
  </>;
}
