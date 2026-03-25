import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL } from "@/lib/config";
import { RawArticle, StoredArticle, StoredCategory } from "@/lib/types";

let client: Anthropic | null = null;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません。");
  }

  if (!client) {
    client = new Anthropic({ apiKey });
  }

  return client;
}

function extractText(content: Anthropic.Messages.Message["content"]): string {
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function extractJson(text: string): string {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");

  if (first === -1 || last === -1 || last <= first) {
    throw new Error("AI応答からJSONを取り出せませんでした。");
  }

  return text.slice(first, last + 1);
}

async function summarizeArticle(article: RawArticle, translateToJapanese: boolean) {
  const prompt = [
    "次の記事を日本語で要約してください。",
    translateToJapanese
      ? "英語記事なので、日本語タイトルに翻訳したうえで出力してください。"
      : "日本語記事として自然な表現で出力してください。",
    "JSONのみを返してください。",
    '{"title":"","easy":"","bullets":["","",""],"quote":""}',
    "",
    `タイトル: ${article.title}`,
    `本文: ${article.content || article.title}`,
  ].join("\n");

  const response = await getClient().messages.create({
    model: AI_MODEL,
    max_tokens: 700,
    temperature: 0.2,
    system:
      "あなたは日本語のニュース編集者です。正確で簡潔な日本語に整えてください。",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const parsed = JSON.parse(extractJson(extractText(response.content))) as {
    title?: string;
    easy?: string;
    bullets?: string[];
    quote?: string;
  };

  const stored: StoredArticle = {
    id: article.id,
    title: parsed.title?.trim() || article.title,
    originalTitle: article.title,
    link: article.link,
    publishedAt: article.publishedAt,
    sourceName: article.sourceName,
    sourceUrl: article.sourceUrl,
    language: article.language,
    easySummary: parsed.easy?.trim() || "要約を生成できませんでした。",
    summaryBullets:
      parsed.bullets?.filter(Boolean).slice(0, 3) ?? ["要約を生成できませんでした。"],
    quote: parsed.quote?.trim() || "引用を生成できませんでした。",
  };

  return stored;
}

async function summarizeCategoryOverview(
  categoryLabel: string,
  articles: StoredArticle[],
) {
  if (articles.length === 0) {
    return {
      dailySummary: ["当日の記事がありません。"],
      column: "当日の記事が集まると、ここにコラムが表示されます。",
    };
  }

  const prompt = [
    "以下の記事一覧をもとに、その日のまとめとコラムを日本語で作成してください。",
    "JSONのみを返してください。",
    '{"dailySummary":["","",""],"column":""}',
    "",
    `カテゴリ: ${categoryLabel}`,
    JSON.stringify(
      articles.map((article) => ({
        title: article.title,
        sourceName: article.sourceName,
        bullets: article.summaryBullets,
      })),
      null,
      2,
    ),
  ].join("\n");

  const response = await getClient().messages.create({
    model: AI_MODEL,
    max_tokens: 900,
    temperature: 0.3,
    system:
      "あなたは日本語のニュース解説者です。事実ベースで全体像を短く整理してください。",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const parsed = JSON.parse(extractJson(extractText(response.content))) as {
    dailySummary?: string[];
    column?: string;
  };

  return {
    dailySummary:
      parsed.dailySummary?.filter(Boolean).slice(0, 3) ?? ["まとめを生成できませんでした。"],
    column: parsed.column?.trim() || "コラムを生成できませんでした。",
  };
}

// カテゴリ1の英語記事はここで日本語化し、保存形式を統一します。
export async function summarizeCollectedCategory(
  category: {
    id: StoredCategory["id"];
    label: string;
    description: string;
  },
  rawArticles: RawArticle[],
): Promise<StoredCategory> {
  try {
    const translateToJapanese = category.id === "reuters-economy";
    const articles: StoredArticle[] = [];

    for (const article of rawArticles) {
      articles.push(await summarizeArticle(article, translateToJapanese));
    }

    const overview = await summarizeCategoryOverview(category.label, articles);

    return {
      id: category.id,
      label: category.label,
      description: category.description,
      articles,
      dailySummary: overview.dailySummary,
      column: overview.column,
    };
  } catch (error) {
    console.error("AI要約に失敗しました。", { category: category.label, error });

    return {
      id: category.id,
      label: category.label,
      description: category.description,
      articles: rawArticles.map((article) => ({
        id: article.id,
        title: article.title,
        originalTitle: article.title,
        link: article.link,
        publishedAt: article.publishedAt,
        sourceName: article.sourceName,
        sourceUrl: article.sourceUrl,
        language: article.language,
        easySummary: "要約に失敗しました。",
        summaryBullets: ["要約に失敗しました。"],
        quote: "引用を生成できませんでした。",
      })),
      dailySummary: ["まとめを生成できませんでした。"],
      column: "コラムを生成できませんでした。",
    };
  }
}
