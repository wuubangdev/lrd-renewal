"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { linkUrl, type HomeComposition } from "./contracts";

export function HeroSlider({
  home,
  urls,
  preview,
  locale,
}: {
  home: HomeComposition;
  urls: Record<string, string>;
  preview: boolean;
  locale: string;
}) {
  const slides = [
    { content: home.hero, imageId: home.heroImageId, imageAlt: home.heroImageAlt },
    ...(home.heroSlides ?? []),
  ];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [slides.length, paused, reducedMotion]);

  const index = Math.min(active, slides.length - 1);
  const slide = slides[index];
  const action = slide.content.action;
  const href = action ? linkUrl(action.link, urls) : null;
  const isVi = locale === "vi";
  const go = (direction: number) => setActive((current) => (current + direction + slides.length) % slides.length);

  return (
    <section
      className={`hero hero-slider${slides.length > 1 ? " has-slides" : ""}`}
      role={slides.length > 1 ? "region" : undefined}
      aria-roledescription={slides.length > 1 ? "carousel" : undefined}
      aria-label={isVi ? "Banner trang chủ" : "Homepage banner"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onKeyDown={(event) => {
        if (slides.length < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        if (event.target instanceof HTMLElement && event.target.closest("a")) return;
        event.preventDefault();
        go(event.key === "ArrowLeft" ? -1 : 1);
      }}
    >
      <div className="hero-slide" key={index}>
        <img
          className="hero-photo"
          src={slide.imageId ? `/api/v1/${preview ? "admin" : "public"}/media/${slide.imageId}` : "/images/campus.jpg"}
          alt={slide.imageAlt}
          fetchPriority={index === 0 ? "high" : undefined}
        />
        <div className="container hero-content">
          <p className="eyebrow">{slide.content.kicker}</p>
          <h1 className="preserve-lines">{slide.content.title}</h1>
          <p>{slide.content.body}</p>
          {href && action && (
            <Link className="button light" href={href} {...(action.link.kind === "EXTERNAL" ? { target: "_blank", rel: "noreferrer" } : {})}>
              {action.label}
              {action.link.kind === "EXTERNAL" ? <ArrowUpRight size={18} /> : <ArrowRight size={18} />}
            </Link>
          )}
        </div>
      </div>
      <div className="hero-caption"><span>ĐẠI HỌC CẦN THƠ</span><span>Land Resources Department</span></div>
      {slides.length > 1 && (
        <div className="hero-slider-controls container">
          <div className="hero-slider-progress" aria-label={isVi ? "Chọn slide" : "Choose slide"}>
            {slides.map((item, slideIndex) => (
              <button
                type="button"
                key={slideIndex}
                className={slideIndex === index ? "active" : ""}
                aria-label={`${isVi ? "Đến slide" : "Go to slide"} ${slideIndex + 1}: ${item.content.title.replace(/\s+/g, " ")}`}
                aria-current={slideIndex === index ? "true" : undefined}
                onClick={() => setActive(slideIndex)}
              ><span /></button>
            ))}
          </div>
          <span className="hero-slider-count" aria-live="polite">{String(index + 1).padStart(2, "0")} <span>/ {String(slides.length).padStart(2, "0")}</span></span>
          <div className="hero-slider-arrows">
            <button type="button" onClick={() => go(-1)} aria-label={isVi ? "Slide trước" : "Previous slide"}><ArrowLeft size={19} /></button>
            <button type="button" onClick={() => go(1)} aria-label={isVi ? "Slide tiếp theo" : "Next slide"}><ArrowRight size={19} /></button>
          </div>
        </div>
      )}
    </section>
  );
}
