"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function PublicMotion({ locale }: { locale: string }) {
  const pathname = usePathname();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const update = () => setShowTop(window.scrollY > 560);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);

  useEffect(() => {
    const main = document.getElementById("main");
    if (!main || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -36px 0px", threshold: 0.06 },
    );
    const watch = (element: Element) => {
      if (!(element instanceof HTMLElement) || element.classList.contains("is-visible")) return;
      // Content already in view stays readable when hydration finishes.
      if (element.getBoundingClientRect().top < window.innerHeight)
        element.classList.add("is-visible");
      else observer.observe(element);
    };
    main.querySelectorAll("[data-reveal]").forEach(watch);
    main.classList.add("motion-ready");
    const changes = new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches("[data-reveal]")) watch(node);
          node.querySelectorAll("[data-reveal]").forEach(watch);
        }
    });
    changes.observe(main, { childList: true, subtree: true });
    return () => {
      changes.disconnect();
      observer.disconnect();
      main.classList.remove("motion-ready");
    };
  }, [pathname]);

  return (
    <button
      type="button"
      className={"scroll-to-top" + (showTop ? " is-visible" : "")}
      aria-label={locale === "vi" ? "Về đầu trang" : "Back to top"}
      aria-hidden={!showTop}
      tabIndex={showTop ? 0 : -1}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
    >
      <ArrowUp size={21} aria-hidden="true" />
    </button>
  );
}
