"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/browser-api";
import { categories, type ArticleCategory } from "@/lib/contracts";

const fallback = Object.entries(categories).map(([code, nameVi], index) => ({
  code,
  nameVi,
  nameEn: nameVi,
  sortOrder: (index + 1) * 10,
}));

export function useCategories() {
  const [items, setItems] = useState<ArticleCategory[]>(fallback);
  useEffect(() => {
    void api<ArticleCategory[]>("/public/categories")
      .then(setItems)
      .catch(() => undefined);
  }, []);
  return items;
}
