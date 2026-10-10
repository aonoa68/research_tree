import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小野原彩香の研究系統樹 | Research Tree",
  description: "言語学、文化進化、場所と感情、GIS・空間分析。小野原彩香の研究テーマ・論文・進行中研究のつながりを、一本の樹から辿る研究アトラス。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
