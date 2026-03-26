import { DashboardTabId, NewsCategoryConfig } from "@/lib/types";

export const APP_NAME = "ニュース要約アプリ v3";
export const APP_DESCRIPTION =
  "毎朝ニュースを自動収集し、AIが日本語で読みやすく整理するニュースダッシュボードです。";

export const AI_MODEL = "claude-haiku-4-5-20251001";
export const TIME_ZONE = "Asia/Tokyo";
export const RSS_TIMEOUT_MS = 10_000;
export const MAX_ITEMS_PER_SOURCE = 10;
export const MAX_ITEMS_PER_CATEGORY = 20;
export const MAX_ARTICLE_CONTENT_LENGTH = 2_000;

export const ECONOMY_EXCLUDE_KEYWORDS = [
  "スポーツ",
  "サッカー",
  "野球",
  "芸能",
  "エンタメ",
  "天気",
  "将棋",
  "訃報",
];

export const DASHBOARD_TABS: Array<{ id: DashboardTabId; label: string }> = [
  { id: "headlines", label: "見出し" },
  { id: "easy", label: "やさしく" },
  { id: "summary", label: "要約" },
  { id: "quotes", label: "引用" },
  { id: "daily", label: "まとめ" },
  { id: "column", label: "コラム" },
];

// ニュースソースの追加や差し替えはこの設定だけを見ればよいように集約する。
// 共同通信は公開 RSS が見当たらなかったため、47NEWS の公開ページを
// rss.ts 側の専用パーサーで読み取る構成にしている。
export const NEWS_CATEGORIES: NewsCategoryConfig[] = [
  {
    id: "reuters-economy",
    label: "ロイター経済",
    description: "英語の経済ニュースを日本語に翻訳して表示します。",
    sources: [
      {
        id: "cnbc-business",
        name: "CNBC Business",
        url: "https://www.cnbc.com/id/10001147/device/rss/rss.html",
        language: "en",
      },
      {
        id: "wsj-markets",
        name: "WSJ Markets",
        url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
        language: "en",
      },
      {
        id: "nyt-business",
        name: "NYT Business",
        url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
        language: "en",
      },
    ],
  },
  {
    id: "japan-economy",
    label: "日本各紙経済",
    description: "日本語の経済ニュースを中心に表示するカテゴリです。",
    filter: {
      excludeKeywords: ECONOMY_EXCLUDE_KEYWORDS,
    },
    sources: [
      {
        id: "yahoo-business",
        name: "Yahoo!ニュース経済",
        url: "https://news.yahoo.co.jp/rss/topics/business.xml",
        language: "ja",
      },
      {
        id: "toyokeizai",
        name: "東洋経済",
        url: "https://toyokeizai.net/list/feed/rss",
        language: "ja",
      },
      {
        id: "jiji-economy",
        name: "時事通信",
        url: "https://www.jiji.com/rss/ranking.rdf",
        language: "ja",
      },
      {
        id: "mainichi-economy",
        name: "毎日新聞",
        url: "https://mainichi.jp/rss/etc/mainichi-flash.rss",
        language: "ja",
      },
      {
        id: "kyodo-economy",
        name: "共同通信",
        url: "https://www.47news.jp/economics",
        language: "ja",
      },
    ],
  },
  {
    id: "japan-general",
    label: "日本各紙経済以外",
    description: "総合ニュースを広く確認できるカテゴリです。",
    sources: [
      {
        id: "asahi-general",
        name: "朝日新聞総合",
        url: "https://www.asahi.com/rss/asahi/newsheadlines.rdf",
        language: "ja",
      },
      {
        id: "nhk-general",
        name: "NHK総合",
        url: "https://www.nhk.or.jp/rss/news/cat0.xml",
        language: "ja",
      },
      {
        id: "yahoo-top-picks",
        name: "Yahoo!ニュース主要",
        url: "https://news.yahoo.co.jp/rss/topics/top-picks.xml",
        language: "ja",
      },
      {
        id: "mainichi-general",
        name: "毎日新聞",
        url: "https://mainichi.jp/rss/etc/mainichi-flash.rss",
        language: "ja",
      },
      {
        id: "jiji-general",
        name: "時事通信",
        url: "https://www.jiji.com/rss/ranking.rdf",
        language: "ja",
      },
      {
        id: "kyodo-general",
        name: "共同通信",
        url: "https://www.47news.jp/",
        language: "ja",
      },
    ],
  },
];
