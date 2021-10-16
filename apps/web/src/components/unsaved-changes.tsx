"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef } from "react";

const message = "Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?";
const positionKey = "__lrdHistoryPosition";
type Guard = {
  register: (id: string, check: () => boolean) => () => void;
  confirmLeave: () => boolean;
};
const Context = createContext<Guard | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const checks = useRef(new Map<string, () => boolean>());
  const dirty = useCallback(() => [...checks.current.values()].some((check) => check()), []);
  const confirmLeave = useCallback(() => !dirty() || window.confirm(message), [dirty]);
  const register = useCallback((id: string, check: () => boolean) => {
    checks.current.set(id, check);
    return () => {
      checks.current.delete(id);
    };
  }, []);

  useEffect(() => {
    let confirmedUnload = false;
    let confirmedTraversal = false;
    let restoringHistory = false;
    let position = Number(history.state?.[positionKey]) || 0;
    const push = history.pushState;
    const replace = history.replaceState;
    // Preserve Next.js history metadata while tracking the distance needed to undo
    // a cancelled back/forward navigation. No synthetic history entries are added.
    replace.call(history, { ...history.state, [positionKey]: position }, "");
    const pushState: History["pushState"] = function (this: History, data, unused, url) {
      push.call(this, { ...data, [positionKey]: position + 1 }, unused, url);
      position += 1;
      confirmedUnload = false;
    };
    const replaceState: History["replaceState"] = function (this: History, data, unused, url) {
      replace.call(this, { ...data, [positionKey]: position }, unused, url);
    };
    history.pushState = pushState;
    history.replaceState = replaceState;
    // The Navigation API fires before traversal commits and before the router can
    // unmount an editor. Keep the popstate restoration below for older browsers.
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const navigate = (event: Event) => {
      const traversal = event as Event & {
        navigationType: string;
        destination: { url: string; sameDocument: boolean };
      };
      if (
        restoringHistory ||
        traversal.navigationType !== "traverse" ||
        !traversal.destination.sameDocument ||
        !event.cancelable
      )
        return;
      if (!confirmLeave()) event.preventDefault();
      else confirmedTraversal = true;
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty() && !confirmedUnload) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self"))
        return;
      const url = new URL(link.href, location.href);
      if (!["http:", "https:"].includes(url.protocol)) return;
      if (
        url.origin === location.origin &&
        url.pathname === location.pathname &&
        url.search === location.search
      )
        return;
      if (!confirmLeave()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      } else {
        confirmedUnload = true;
      }
    };
    const pop = (event: PopStateEvent) => {
      const approved = confirmedTraversal;
      confirmedTraversal = false;
      const target = event.state?.[positionKey];
      if (restoringHistory) {
        restoringHistory = false;
        event.stopImmediatePropagation();
        return;
      }
      if (typeof target !== "number" || target === position) return;
      if (!approved && !confirmLeave()) {
        event.stopImmediatePropagation();
        restoringHistory = true;
        history.go(position - target);
      } else {
        position = target;
        confirmedUnload = false;
      }
    };
    navigation?.addEventListener("navigate", navigate);
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", pop, true);
    return () => {
      navigation?.removeEventListener("navigate", navigate);
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", pop, true);
      if (history.pushState === pushState) history.pushState = push;
      if (history.replaceState === replaceState) history.replaceState = replace;
    };
  }, [dirty, confirmLeave]);

  return <Context.Provider value={{ register, confirmLeave }}>{children}</Context.Provider>;
}

export function useUnsavedChanges(dirty: boolean) {
  const guard = useContext(Context);
  const id = useId();
  const current = useRef(dirty);
  current.current = dirty;
  const register = guard?.register;
  useEffect(() => register?.(id, () => current.current), [id, register]);
}

export function useConfirmNavigation() {
  const guard = useContext(Context);
  return guard?.confirmLeave ?? (() => true);
}
