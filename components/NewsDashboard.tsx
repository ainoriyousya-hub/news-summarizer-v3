"use client";

import { useEffect, useMemo, useState } from "react";
import {
  APP_DESCRIPTION,
  APP_NAME,
  DASHBOARD_TABS,
  NEWS_CATEGORIES,
  TIME_ZONE,
} from "@/lib/config";
import { getJstDateString } from "@/lib/rss";
import {
  DashboardTabId,
  NewsApiResponse,
  NewsCategoryId,
  StoredCategory,
} from "@/lib/types";

type CollectResponse = {
  success: boolean;
  message: string;
};

type NewsDashboardProps = {
  isAdmin: boolean;
};

function formatCollectedAt(value: string | undefined): string {
  if (!value) {
    return "最終収集: 未収集";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "最終収集: 未収集";
  }

  return `最終収集: ${new Intl.DateTimeFormat("ja-JP", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)}`;
}

function formatPublishedAt(value: string | null): string {
  if (!value) {
    return "日時不明";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "日時不明";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function Spinner() {
  return (
    <div className="flex items-center gap-3 text-white/70">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-cyan-300" />
      <span>読み込み中です。</span>
    </div>
  );
}

function CategoryTabList({
  value,
  onChange,
}: {
  value: NewsCategoryId;
  onChange: (value: NewsCategoryId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {NEWS_CATEGORIES.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onChange(category.id)}
          className={`rounded-full px-4 py-2 text-sm transition ${
            value === category.id
              ? "bg-cyan-400 text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}

function DashboardTabList({
  value,
  onChange,
}: {
  value: DashboardTabId;
  onChange: (value: DashboardTabId) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {DASHBOARD_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-full px-4 py-2 text-sm transition ${
            value === tab.id
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function CategoryPanel({
  category,
  tab,
}: {
  category: StoredCategory;
  tab: DashboardTabId;
}) {
  if (tab === "daily") {
    return (
      <div className="bg-white/10 backdrop-blur rounded-2xl shadow-xl p-6">
        <ul className="space-y-3 text-white">
          {category.dailySummary.map((item, index) => (
            <li key={`${category.id}-daily-${index}`} className="flex gap-3">
              <span className="text-cyan-300">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (tab === "column") {
    return (
      <div className="bg-white/10 backdrop-blur rounded-2xl shadow-xl p-6 text-white leading-8">
        {category.column}
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {category.articles.map((article) => (
        <article
          key={article.id}
          className="bg-white/10 backdrop-blur rounded-2xl shadow-xl p-6"
        >
          <div className="mb-3 flex flex-wrap gap-2 text-xs text-white/70">
            <span className="rounded-full bg-white/10 px-3 py-1">{article.sourceName}</span>
            <span>{formatPublishedAt(article.publishedAt)}</span>
          </div>

          <h3 className="text-lg font-semibold text-white">{article.title}</h3>

          {tab === "headlines" ? (
            <a
              href={article.link}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex text-cyan-300 underline underline-offset-4"
            >
              元記事を開く
            </a>
          ) : null}

          {tab === "easy" ? (
            <p className="mt-4 text-white leading-7">{article.easySummary}</p>
          ) : null}

          {tab === "summary" ? (
            <ul className="mt-4 space-y-2 text-white">
              {article.summaryBullets.map((bullet, index) => (
                <li key={`${article.id}-bullet-${index}`} className="flex gap-3">
                  <span className="text-cyan-300">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {tab === "quotes" ? (
            <blockquote className="mt-4 border-l-4 border-cyan-300 pl-4 text-white leading-7">
              {article.quote}
            </blockquote>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function NewsDashboard({ isAdmin }: NewsDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(getJstDateString());
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<NewsCategoryId>("reuters-economy");
  const [selectedTabId, setSelectedTabId] = useState<DashboardTabId>("headlines");
  const [isLoading, setIsLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState<NewsApiResponse["data"]>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadNews() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(`/api/news?date=${selectedDate}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as NewsApiResponse & {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message ?? "ニュースの取得に失敗しました。");
        }

        if (!active) {
          return;
        }

        setData(payload.data);
      } catch (error) {
        if (!active) {
          return;
        }

        setData(null);
        setErrorMessage(
          error instanceof Error ? error.message : "ニュースの取得に失敗しました。",
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadNews();

    return () => {
      active = false;
    };
  }, [selectedDate, refreshKey]);

  const selectedCategory = useMemo(() => {
    return data?.categories.find((category) => category.id === selectedCategoryId) ?? null;
  }, [data, selectedCategoryId]);

  async function handleCollect() {
    setIsCollecting(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/collect", {
        method: "POST",
      });
      const payload = (await response.json()) as CollectResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "収集に失敗しました。");
      }

      setStatusMessage(payload.message);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "収集に失敗しました。",
      );
    } finally {
      setIsCollecting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="bg-white/10 backdrop-blur rounded-2xl shadow-xl p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-white/70 text-sm">毎朝更新されるニュースダッシュボード</p>
            <h1 className="mt-2 text-3xl font-bold text-white">{APP_NAME}</h1>
            <p className="mt-3 max-w-3xl text-white/70 leading-7">{APP_DESCRIPTION}</p>
            <p className="mt-3 text-sm text-white/70">
              {formatCollectedAt(data?.collectedAt)}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label className="mb-2 block text-sm text-white/70">表示日</label>
              <input
                type="date"
                value={selectedDate}
                max={getJstDateString()}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none"
              />
            </div>

            {isAdmin === true ? (
              <button
                type="button"
                onClick={handleCollect}
                disabled={isCollecting}
                className="bg-cyan-400 text-black rounded-2xl px-5 py-3 font-semibold shadow-xl"
              >
                今日のニュースを収集
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-4">
        {isLoading || isCollecting ? <Spinner /> : null}
        {statusMessage ? (
          <div className="bg-white/10 backdrop-blur rounded-2xl shadow-xl p-4 text-white">
            {statusMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="rounded-2xl bg-red-500/80 p-4 text-white">{errorMessage}</div>
        ) : null}
      </div>

      <section className="mt-6 bg-white/10 backdrop-blur rounded-2xl shadow-xl p-6">
        <CategoryTabList
          value={selectedCategoryId}
          onChange={setSelectedCategoryId}
        />
        <DashboardTabList value={selectedTabId} onChange={setSelectedTabId} />
      </section>

      <section className="mt-6 space-y-4">
        {!isLoading && !selectedCategory ? (
          <div className="bg-white/10 backdrop-blur rounded-2xl shadow-xl p-6 text-white/70">
            指定日のデータがありません。
          </div>
        ) : null}

        {!isLoading && selectedCategory ? (
          <>
            <div className="bg-white/10 backdrop-blur rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-white">{selectedCategory.label}</h2>
              <p className="mt-2 text-white/70">{selectedCategory.description}</p>
            </div>

            <CategoryPanel category={selectedCategory} tab={selectedTabId} />
          </>
        ) : null}
      </section>
    </main>
  );
}
