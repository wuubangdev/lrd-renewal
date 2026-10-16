import { requirePermission, serverApi } from "@/lib/server-api";
import { GeminiSettings } from "@/features/integrations/gemini-settings";
import type { GeminiSettingsView } from "@/features/integrations/gemini-settings";

export default async function IntegrationsPage() {
  await requirePermission("integrations:manage");
  const settings = await serverApi<GeminiSettingsView>("/admin/integrations/gemini", true);
  return <GeminiSettings initial={settings} />;
}
