export type NewsCategoryId =
  | "reuters-economy"
  | "japan-economy"
  | "japan-general";

export type DashboardTabId =
  | "headlines"
  | "easy"
  | "summary"
  | "quotes"
  | "daily"
  | "column";

export type FeedLanguage = "ja" | "en";

export type FeedSource = {
  id: string;
  name: string;
  url: string;
  language: FeedLanguage;
};

export type CategoryFilter = {
  excludeKeywords: string[];
};

export type NewsCategoryConfig = {
  id: NewsCategoryId;
  label: string;
  description: string;
  sources: FeedSource[];
  filter?: CategoryFilter;
};

export type RawArticle = {
  id: string;
  title: string;
  link: string;
  publishedAt: string | null;
  content: string;
  sourceName: string;
  sourceUrl: string;
  language: FeedLanguage;
};

export type StoredArticle = {
  id: string;
  title: string;
  originalTitle: string;
  link: string;
  publishedAt: string | null;
  sourceName: string;
  sourceUrl: string;
  language: FeedLanguage;
  easySummary: string;
  summaryBullets: string[];
  quote: string;
};

export type StoredCategory = {
  id: NewsCategoryId;
  label: string;
  description: string;
  articles: StoredArticle[];
  dailySummary: string[];
  column: string;
};

export type StoredNewsData = {
  date: string;
  collectedAt: string;
  categories: StoredCategory[];
};

export type NewsApiResponse = {
  data: StoredNewsData | null;
};
