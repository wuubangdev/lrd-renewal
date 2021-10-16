import { requireUser } from "@/lib/server-api";
import { AdminShell } from "@/components/admin-shell";
export const metadata = { title: "Quản trị nội dung", robots: { index: false, follow: false } };
export default async function Workspace({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AdminShell user={user}>{children}</AdminShell>;
}
