import { Check, Minus } from "lucide-react";
import { requirePermission, serverApi } from "@/lib/server-api";
import { permissionLabels, type RoleView } from "@/features/identity/contracts";
export default async function RolesPage() {
  await requirePermission("identity:manage");
  const roles = await serverApi<RoleView[]>("/admin/roles", true);
  return (
    <>
      <div className="admin-topbar">
        <span>Hệ thống / Phân quyền</span>
      </div>
      <div className="admin-content">
        <p className="eyebrow">QUYỀN THEO TRÁCH NHIỆM</p>
        <h1>Vai trò & quyền hạn</h1>
        <p className="muted">
          Ba vai trò thống nhất cho hệ thống. Gán vai trò tại mục Tài khoản; quyền thay đổi có hiệu
          lực ngay và thu hồi phiên cũ.
        </p>
        <div className="table-panel permission-panel">
          <div className="table-scroll">
            <table className="content-table">
              <thead>
                <tr>
                  <th>Quyền truy cập</th>
                  {roles.map((r) => (
                    <th key={r.code}>{r.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(permissionLabels).map(([key, label]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    {roles.map((r) => (
                      <td key={r.code}>
                        {r.permissions.includes(key) ? (
                          <Check size={18} aria-label="Có quyền" />
                        ) : (
                          <Minus size={18} aria-label="Không có quyền" className="muted" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="field-hint">
          Quản trị viên cuối cùng đang hoạt động không thể bị khóa hoặc hạ quyền. Tài khoản chờ đặt
          mật khẩu chưa được tính là quản trị viên đã kích hoạt.
        </p>
      </div>
    </>
  );
}
