"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/browser-api";
import type { Asset } from "@/lib/contracts";

export function useMediaBrowser(initial?: Asset[]) {
  const [assets, setAssets] = useState(initial ?? []);
  const [query, setQuery] = useState(""),
    [activeQuery, setActiveQuery] = useState("");
  const [page, setPage] = useState(0),
    [hasMore, setHasMore] = useState(initial?.length === 60);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0);
  async function load(next = 0, q = activeQuery) {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const rows = await api<Asset[]>(
        "/admin/media?size=60&page=" + next + "&q=" + encodeURIComponent(q),
      );
      if (current !== generation.current) return;
      setAssets((old) =>
        next === 0 ? rows : [...old, ...rows.filter((a) => !old.some((b) => a.id === b.id))],
      );
      setPage(next);
      setActiveQuery(q);
      setHasMore(rows.length === 60);
    } catch (e) {
      if (current === generation.current) setError((e as Error).message);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!initial) void load(0, "");
    return () => {
      generation.current++;
    };
  }, []);
  return {
    assets,
    error,
    loading,
    query,
    setQuery,
    hasMore,
    search: () => load(0, query),
    more: () => load(page + 1),
    prepend: (a: Asset) => setAssets((old) => [a, ...old.filter((x) => x.id !== a.id)]),
  };
}
export function MediaSearch({ browser }: { browser: ReturnType<typeof useMediaBrowser> }) {
  return (
    <form
      className="media-search"
      onSubmit={(e) => {
        e.preventDefault();
        void browser.search();
      }}
    >
      <input
        aria-label="Tìm ảnh theo tên"
        placeholder="Tìm ảnh theo tên tệp…"
        maxLength={200}
        value={browser.query}
        onChange={(e) => browser.setQuery(e.target.value)}
      />
      <button type="submit" className="button" disabled={browser.loading}>
        Tìm ảnh
      </button>
    </form>
  );
}
export function MediaMore({ browser }: { browser: ReturnType<typeof useMediaBrowser> }) {
  return (
    <>
      {browser.error && (
        <p role="alert" className="alert error">
          {browser.error}
        </p>
      )}
      {browser.hasMore && (
        <div className="media-more">
          <button
            type="button"
            className="button"
            disabled={browser.loading}
            onClick={() => void browser.more()}
          >
            {browser.loading ? "Đang tải…" : "Xem thêm ảnh"}
          </button>
        </div>
      )}
    </>
  );
}
