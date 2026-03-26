import Parser from "rss-parser";
import {
  MAX_ARTICLE_CONTENT_LENGTH,
  MAX_ITEMS_PER_CATEGORY,
  MAX_ITEMS_PER_SOURCE,
  NEWS_CATEGORIES,
  RSS_TIMEOUT_MS,
  TIME_ZONE,
} from "@/lib/config";
import { NewsCategoryId, RawArticle } from "@/lib/types";

type ParserItem = {
  guid?: string;
  id?: string;
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  "content:encoded"?: string;
};

type FortySevenNewsEntry = {
  id?: string | number;
  title?: string;
  url?: string;
  body?: string;
  startDate?: string;
};

const parser = new Parser<Record<string, never>, ParserItem>();
const FORTY_SEVEN_NEWS_HOST = "https://www.47news.jp";

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function getJstDateString(value: string | Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isTargetDate(publishedAt: string | null, targetDate: string): boolean {
  if (!publishedAt) {
    return true;
  }

  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) {
    return true;
  }

  return getJstDateString(date) === targetDate;
}

function shouldExclude(categoryId: NewsCategoryId, text: string): boolean {
  const category = NEWS_CATEGORIES.find((item) => item.id === categoryId);
  const keywords = category?.filter?.excludeKeywords ?? [];

  return keywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()));
}

async function fetchDocument(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RSS_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "news-summarizer-v3/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function dedupe(articles: RawArticle[]): RawArticle[] {
  const seen = new Set<string>();

  return articles.filter((article) => {
    const key = `${article.link}::${article.title}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function toIsoStringFromJstLocal(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  // 47NEWS の startDate は JST のローカル日時なので、明示的に +09:00 を付ける。
  const normalized = value.replace(" ", "T");
  return `${normalized}+09:00`;
}

function isFortySevenNewsSource(url: string): boolean {
  return url.startsWith(FORTY_SEVEN_NEWS_HOST);
}

function extractFortySevenNewsEntries(value: unknown, results: FortySevenNewsEntry[] = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => extractFortySevenNewsEntries(item, results));
    return results;
  }

  if (!value || typeof value !== "object") {
    return results;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.title === "string" && typeof record.url === "string") {
    results.push({
      id:
        typeof record.id === "string" || typeof record.id === "number"
          ? record.id
          : undefined,
      title: record.title,
      url: record.url,
      body: typeof record.body === "string" ? record.body : undefined,
      startDate: typeof record.startDate === "string" ? record.startDate : undefined,
    });
  }

  Object.values(record).forEach((child) => extractFortySevenNewsEntries(child, results));
  return results;
}

async function fetchFortySevenNewsArticles(
  categoryId: NewsCategoryId,
  source: (typeof NEWS_CATEGORIES)[number]["sources"][number],
  targetDate: string,
): Promise<RawArticle[]> {
  try {
    const html = await fetchDocument(source.url);
    const match = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
    );

    if (!match) {
      throw new Error("47NEWS の構造化データが見つかりませんでした");
    }

    const nextData = JSON.parse(match[1]) as {
      props?: {
        pageProps?: unknown;
      };
    };

    const entries = extractFortySevenNewsEntries(nextData.props?.pageProps).slice(
      0,
      MAX_ITEMS_PER_SOURCE * 4,
    );

    const articles = entries
      .map((entry, index): RawArticle | null => {
        const title = entry.title?.trim();
        const relativeUrl = entry.url?.trim();

        if (!title || !relativeUrl) {
          return null;
        }

        const link = relativeUrl.startsWith("http")
          ? relativeUrl
          : `${FORTY_SEVEN_NEWS_HOST}${relativeUrl}`;
        const content = stripHtml(entry.body ?? title).slice(0, MAX_ARTICLE_CONTENT_LENGTH);
        const combined = `${title} ${content}`;

        if (shouldExclude(categoryId, combined)) {
          return null;
        }

        return {
          id: String(entry.id ?? `${source.id}-${index}-${link}`),
          title,
          link,
          publishedAt: toIsoStringFromJstLocal(entry.startDate),
          content,
          sourceName: source.name,
          sourceUrl: source.url,
          language: source.language,
        };
      })
      .filter((article): article is RawArticle => article !== null)
      .filter((article) => isTargetDate(article.publishedAt, targetDate));

    return dedupe(articles).slice(0, MAX_ITEMS_PER_SOURCE);
  } catch (error) {
    console.error("47NEWS の記事取得に失敗しました。", {
      sourceName: source.name,
      sourceUrl: source.url,
      error,
    });
    return [];
  }
}

async function fetchRssArticles(
  categoryId: NewsCategoryId,
  source: (typeof NEWS_CATEGORIES)[number]["sources"][number],
  targetDate: string,
): Promise<RawArticle[]> {
  try {
    const xml = await fetchDocument(source.url);
    const feed = await parser.parseString(xml);

    return (feed.items ?? [])
      .slice(0, MAX_ITEMS_PER_SOURCE)
      .map((item, index): RawArticle | null => {
        const title = item.title?.trim();
        const link = item.link?.trim();

        if (!title || !link) {
          return null;
        }

        const contentSource =
          item.contentSnippet ??
          item["content:encoded"] ??
          item.content ??
          item.summary ??
          title;

        const content = stripHtml(contentSource).slice(0, MAX_ARTICLE_CONTENT_LENGTH);
        const combined = `${title} ${content}`;

        if (shouldExclude(categoryId, combined)) {
          return null;
        }

        return {
          id: item.guid ?? item.id ?? `${source.id}-${index}-${link}`,
          title,
          link,
          publishedAt: item.isoDate ?? item.pubDate ?? null,
          content,
          sourceName: source.name,
          sourceUrl: source.url,
          language: source.language,
        };
      })
      .filter((article): article is RawArticle => article !== null)
      .filter((article) => isTargetDate(article.publishedAt, targetDate));
  } catch (error) {
    console.error("RSS フィードの取得に失敗しました。", {
      sourceName: source.name,
      sourceUrl: source.url,
      error,
    });
    return [];
  }
}

async function fetchFeedArticles(
  categoryId: NewsCategoryId,
  source: (typeof NEWS_CATEGORIES)[number]["sources"][number],
  targetDate: string,
): Promise<RawArticle[]> {
  if (isFortySevenNewsSource(source.url)) {
    return fetchFortySevenNewsArticles(categoryId, source, targetDate);
  }

  return fetchRssArticles(categoryId, source, targetDate);
}

// 指定日の記事をカテゴリ別に収集する。各カテゴリの件数上限は config.ts で管理する。
export async function collectArticlesForDate(targetDate: string) {
  return Promise.all(
    NEWS_CATEGORIES.map(async (category) => {
      const perSource = await Promise.all(
        category.sources.map((source) => fetchFeedArticles(category.id, source, targetDate)),
      );

      const articles = dedupe(perSource.flat())
        .sort((left, right) => {
          const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
          const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
          return rightTime - leftTime;
        })
        .slice(0, MAX_ITEMS_PER_CATEGORY);

      return {
        category,
        articles,
      };
    }),
  );
}
