import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { ApiError } from "@/lib/errors";
import type { SiteRender, HomeComposition, NavigationMenu } from "./contracts";
export const optionalPublicHome = cache(async (locale: string) => {
  try {
    return await serverApi<SiteRender<HomeComposition>>("/public/site/home?locale=" + locale);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
});
export async function publicHome(locale: string) {
  const home = await optionalPublicHome(locale);
  if (!home) notFound();
  return home;
}
export const publicMenu = cache(async (locale: string) => {
  try {
    return await serverApi<SiteRender<NavigationMenu>>("/public/site/menu?locale=" + locale);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404)
      return {
        locale,
        content: { items: [] },
        urls: {},
        news: [],
        education: {},
        admissions: [],
      } as SiteRender<NavigationMenu>;
    throw e;
  }
});
