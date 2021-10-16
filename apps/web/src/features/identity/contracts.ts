export type Role = "ADMIN" | "EDITOR" | "AUTHOR";
export const roleLabels: Record<Role, string> = {
  ADMIN: "Quản trị viên",
  EDITOR: "Biên tập viên",
  AUTHOR: "Tác giả",
};
export const permissionLabels: Record<string, string> = {
  "academics:manage": "Quản lý chương trình đào tạo và tuyển sinh",
  "content:create": "Tạo bài viết",
  "content:update:own": "Sửa bài của mình",
  "content:publish:own": "Đăng/gỡ bài của mình",
  "content:update:any": "Sửa mọi bài viết",
  "content:publish:any": "Đăng/gỡ mọi bài viết",
  "media:upload": "Upload và dùng ảnh của mình",
  "media:manage": "Quản lý toàn bộ thư viện ảnh",
  "identity:manage": "Quản lý tài khoản và phân quyền",
  "site:manage": "Quản trị trang chủ, menu",
  "audit:read": "Đọc nhật ký hệ thống",
  "integrations:manage": "Cấu hình và kiểm tra kết nối tích hợp",
};
export type Account = {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  passwordSet: boolean;
  version: number;
  createdAt: string;
  permissions: string[];
};
export type ResetLink = { token: string; expiresAt: string };
export type RoleView = { code: Role; name: string; permissions: string[] };
