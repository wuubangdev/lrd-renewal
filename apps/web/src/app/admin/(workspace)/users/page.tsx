import { requirePermission, serverApi } from "@/lib/server-api";
import type { PageResult } from "@/lib/contracts";
import type { Account } from "@/features/identity/contracts";
import { Accounts } from "@/features/identity/accounts";
export default async function UsersPage() {
  const user = await requirePermission("identity:manage");
  const result = await serverApi<PageResult<Account>>("/admin/users?size=20", true);
  return <Accounts initial={result} currentId={user.id} />;
}
