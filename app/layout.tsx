import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ニュース要約アプリ v3",
  description: "毎朝ニュースを自動収集・AI要約して表示するWebアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
