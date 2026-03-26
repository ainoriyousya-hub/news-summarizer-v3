import { collectArticlesForDate, getJstDateString } from "@/lib/rss";
import { summarizeCollectedCategory } from "@/lib/summarize";
import { saveNewsData } from "@/lib/storage";
import { RawArticle, StoredNewsData } from "@/lib/types";

function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim().toLowerCase();
}

function removeCrossCategoryDuplicates(
  collected: Awaited<ReturnType<typeof collectArticlesForDate>>,
) {
  const seenKeys = new Set<string>();

  return collected.map((entry) => {
    const filteredArticles = entry.articles.filter((article) => {
      // 総合カテゴリは後順位にし、先に採用された記事と同一タイトル・同一リンクを落とします。
      const keys = [
        `link:${article.link}`,
        `title:${normalizeTitle(article.title)}`,
      ];
      const duplicated = keys.some((key) => seenKeys.has(key));

      if (duplicated) {
        return false;
      }

      keys.forEach((key) => seenKeys.add(key));
      return true;
    });

    return {
      ...entry,
      articles: filteredArticles,
    };
  });
}

// 自動収集と手動収集の共通処理です。
export async function collectAndPersistNews(targetDate = getJstDateString()) {
  const collected = removeCrossCategoryDuplicates(
    await collectArticlesForDate(targetDate),
  );
  const categories = [];

  for (const entry of collected) {
    categories.push(await summarizeCollectedCategory(entry.category, entry.articles));
  }

  const payload: StoredNewsData = {
    date: targetDate,
    collectedAt: new Date().toISOString(),
    categories,
  };

  await saveNewsData(targetDate, payload);

  return {
    date: targetDate,
    categoryCount: categories.length,
    articleCount: categories.reduce(
      (total, category) => total + category.articles.length,
      0,
    ),
  };
}
