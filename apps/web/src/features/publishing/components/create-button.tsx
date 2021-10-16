"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api } from "@/lib/browser-api";
import type { AdminContent } from "@/lib/contracts";
export function CreateButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const item = await api<AdminContent>("/admin/content", {
        method: "POST",
        body: JSON.stringify({ locale: "vi" }),
      });
      router.push("/admin/content/" + item.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa thể tạo bài.");
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="button primary" onClick={create} disabled={busy || !ready}>
        <Plus size={18} />
        {busy ? "Đang tạo…" : "Viết bài mới"}
      </button>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
    </div>
  );
}
