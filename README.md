# 小野原彩香の研究系統樹

Next.js App Router / React / TypeScript による、研究テーマと論文・発表のインタラクティブなアトラスです。静的HTMLへ出力でき、GitHub Pagesで公開できます。

## 開発

Node.js 22以上を使用します。

```bash
npm ci
npm run dev
```

`http://localhost:3000` を開きます。

```bash
npm run typecheck
npm test
npm run build
```

`npm run build` はドメイン直下向けの静的ファイルを `out/` に出力します。GitHub Pages の `/research_tree/` で公開する場合は `npm run build:pages` を使用してください。`basePath` はビルド時に確定するので、公開先が変わるときは再ビルドが必要です。

## GitHub Pages

1. この移行ブランチを `main` にマージします。
2. GitHub リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定します。
3. **Actions → Build and deploy research tree** を実行します。以降は `main` へのpushで自動公開します。

公開先: https://aonoa68.github.io/research_tree/

プルリクエストでは型チェック、テスト、Pages用ビルドのみを実施し、本番公開しません。従来の `index.html` は移行元の参照とデータ照合のために保存しています。Next.js版の編集対象ではなく、新しいビルドにも含まれません。

## 構成とデータの更新

| ファイル | 内容 |
| --- | --- |
| `data/research-tree.json` | 研究階層と論文・発表の原データ |
| `lib/research.ts` | 型、検索、年代フィルター、研究年表 |
| `lib/tree-layout.ts` | 決定的な初期配置と枝の接続 |
| `components/research-tree.tsx` | React SVG、選択、ドラッグ、拡大縮小、D3力学配置 |
| `components/research-explorer.tsx` | 検索、枝の選択、年代、論文詳細、一覧表示 |
| `app/page.tsx` | サイトの構成 |
| `app/globals.css` | レスポンシブデザイン |

研究テーマの `children` に下位テーマ、`papers` に論文・発表を記載します。各項目の `id` は一意にしてください。現在の可視化は元データの階層（研究者 → 理論 → 主要領域 → 個別テーマ → 論文）を前提としており、階層や枝数を増やす場合は配置も確認してください。

## 操作とアクセシビリティ

- 枝・論文をクリック／タップ、またはTabで移動してEnter／Spaceで選択。
- 背景のドラッグで移動、節点のドラッグで配置調整。＋／−で拡大縮小。
- 「配置を動かす」で力学配置、「配置を固定」で停止。「配置を戻す」で初期状態。
- 検索、主要領域、年代の条件は組み合わせて利用可能。
- 「一覧で読む」で同じデータをテキストとして閲覧。ホバー操作に依存しません。
- 初期表示は静止。端末の `prefers-reduced-motion` に従って力学配置を停止します。
- 外部のフォント・D3 CDNに依存せず、依存ライブラリはビルドに含めます。

## 移行時のデータ範囲

元サイトの研究13項目と論文・発表19件（2010–2024年）を、書誌情報も含めて保持しています。未掲載の最新業績は追加していません。元の年表はJLE論文を2023年としていましたが、同サイトの論文データにある2024年へ統一しています。研究系統樹は概念図であり、枝長や距離は統計的な推定結果ではありません。

`npm test` で、移行元と研究データの一致、検索・年代条件、全節点の接続と配置を検証します。業績を追加する際は、移行時の完全一致テストをスナップショットとして分離するか、その検証範囲を適切に更新してください。
