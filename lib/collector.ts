import { collectArticlesForDate, getJstDateString } from "@/lib/rss";
import { summarizeCollectedCategory } from "@/lib/summarize";
import { saveNewsData } from "@/lib/storage";
import { StoredNewsData } from "@/lib/types";

// 自動収集と手動収集の共通処理です。
export async function collectAndPersistNews(targetDate = getJstDateString()) {
  const collected = await collectArticlesForDate(targetDate);
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
