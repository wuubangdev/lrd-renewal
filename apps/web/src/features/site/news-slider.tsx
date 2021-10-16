"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ArticleCategory, ContentSummary } from "@/lib/contracts";
import { NewsList } from "@/features/publishing/components/news-list";

type Position = { start: number; end: number; previous: boolean; next: boolean };

export function NewsSlider({
  items,
  locale,
  categoryOptions = [],
}: {
  items: ContentSummary[];
  locale: string;
  categoryOptions?: ArticleCategory[];
}) {
  const root = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({
    start: 0,
    end: Math.min(items.length, 1),
    previous: false,
    next: items.length > 1,
  });

  useEffect(() => {
    const track = root.current?.querySelector<HTMLElement>(".news-grid");
    if (!track || !items.length) return;
    const update = () => {
      const first = track.querySelector<HTMLElement>(".news-item");
      if (!first) return;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const step = first.getBoundingClientRect().width + gap;
      const start = Math.min(items.length - 1, Math.round(track.scrollLeft / step));
      const visible = Math.max(1, Math.floor((track.clientWidth + gap + 1) / step));
      const next = track.scrollLeft + track.clientWidth < track.scrollWidth - 2;
      const value = {
        start,
        end: Math.min(items.length, start + visible),
        previous: track.scrollLeft > 2,
        next,
      };
      setPosition((current) =>
        Object.keys(value).every(
          (key) => current[key as keyof Position] === value[key as keyof Position],
        )
          ? current
          : value,
      );
    };
    update();
    track.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(track);
    return () => {
      track.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, [items]);

  function move(direction: -1 | 1) {
    const track = root.current?.querySelector<HTMLElement>(".news-grid");
    const first = track?.querySelector<HTMLElement>(".news-item");
    if (!track || !first) return;
    const step =
      first.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0);
    track.scrollTo({
      left: track.scrollLeft + direction * step,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return (
    <div
      className="news-slider"
      ref={root}
      role="region"
      aria-roledescription="carousel"
      aria-label={locale === "vi" ? "Tin tức nổi bật" : "Featured news"}
      tabIndex={items.length > 1 ? 0 : undefined}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      {items.length > 1 && (
        <div className="news-slider-controls">
          <span aria-live="polite">
            {String(position.start + 1).padStart(2, "0")}
            {position.end > position.start + 1 ? "–" + String(position.end).padStart(2, "0") : ""}
            <span className="muted"> / {String(items.length).padStart(2, "0")}</span>
          </span>
          <div>
            <button
              type="button"
              className="icon-button"
              onClick={() => move(-1)}
              disabled={!position.previous}
              aria-label={locale === "vi" ? "Tin trước" : "Previous news"}
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => move(1)}
              disabled={!position.next}
              aria-label={locale === "vi" ? "Tin tiếp theo" : "Next news"}
            >
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      <NewsList items={items} eagerFirst categoryOptions={categoryOptions} locale={locale} />
    </div>
  );
}
