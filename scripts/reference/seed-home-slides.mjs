const base = process.env.SEED_BASE_URL ?? "http://localhost:8088";
const sourceSlides = [
  {
    slug: "sinh-vien-trao-doi-hoc-tap-tai-thai-lan-nam-2026",
    kicker: "TRẢI NGHIỆM QUỐC TẾ",
    title: "Học tập vượt khỏi\ngiảng đường.",
    body: "Sinh viên Tài nguyên Đất đai mở rộng góc nhìn qua những chương trình trao đổi và học tập quốc tế.",
    label: "Xem hoạt động trao đổi",
    alt: "Sinh viên Đại học Cần Thơ tham gia chương trình trao đổi tại Thái Lan",
  },
  {
    slug: "bo-mon-tham-gia-hoi-thao-quan-ly-dat-dai-toan-quoc-2026",
    kicker: "NGHIÊN CỨU & HỢP TÁC",
    title: "Kết nối tri thức.\nLan tỏa giá trị.",
    body: "Giảng viên Bộ môn tham gia hội thảo khoa học Quản lý đất đai toàn quốc, chia sẻ nghiên cứu cùng cộng đồng chuyên môn.",
    label: "Xem hoạt động nghiên cứu",
    alt: "Hội thảo khoa học Quản lý đất đai toàn quốc lần thứ IV năm 2026",
  },
];

if (!process.argv.includes("--apply")) {
  console.log("Hai slide mẫu từ bài viết đã công khai. Thêm --apply để đăng qua CMS API.");
  process.exit(0);
}
if (!process.env.LRD_ADMIN_EMAIL || !process.env.LRD_ADMIN_PASSWORD)
  throw new Error("Thiếu LRD_ADMIN_EMAIL hoặc LRD_ADMIN_PASSWORD.");

const cookies = new Map();
async function request(path, { method = "GET", body, version } = {}) {
  const headers = new Headers({ Origin: base });
  if (version !== undefined) headers.set("If-Match", `"${version}"`);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD"].includes(method)) {
    const csrf = await request("/auth/csrf");
    headers.set(csrf.headerName, csrf.token);
  }
  if (cookies.size) headers.set("Cookie", [...cookies].map(([key, value]) => `${key}=${value}`).join("; "));
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(60000),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0];
    const at = pair.indexOf("=");
    if (at > 0) cookies.set(pair.slice(0, at), pair.slice(at + 1));
  }
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${data?.detail ?? raw.slice(0, 200)}`);
  return data;
}

const articles = await request("/public/content?locale=vi&size=30");
const slides = sourceSlides.map((source) => {
  const article = articles.items.find((item) => item.slug === source.slug);
  if (!article?.coverId) throw new Error(`Bài nguồn chưa công khai hoặc thiếu ảnh: ${source.slug}`);
  return {
    content: {
      kicker: source.kicker,
      title: source.title,
      body: source.body,
      action: { label: source.label, link: { kind: "ARTICLE", target: article.id } },
    },
    imageId: article.coverId,
    imageAlt: source.alt,
  };
});
await request("/auth/login", {
  method: "POST",
  body: { email: process.env.LRD_ADMIN_EMAIL, password: process.env.LRD_ADMIN_PASSWORD },
});
const home = await request("/admin/site/home?locale=vi");
if (home.content.heroSlides?.length) {
  console.log("CMS đã có slide bổ sung; giữ nguyên nội dung hiện tại.");
  process.exit(0);
}
const saved = await request("/admin/site/home?locale=vi", {
  method: "PATCH",
  version: home.version,
  body: { ...home.content, heroSlides: slides },
});
await request("/admin/site/home/publish?locale=vi", {
  method: "POST",
  version: saved.version,
  body: { draftVersion: saved.draftVersion },
});
console.log("Đã đăng 3 slide trang chủ, gồm banner hiện có và 2 slide từ bài viết.");
