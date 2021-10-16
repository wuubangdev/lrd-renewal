import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { draftOf } from "../src/lib/contracts";
import { recordFixture } from "./fixtures";
import { randomUUID } from "node:crypto";

async function login(page: Page) {
  await page.goto("/admin/content");
  await page.getByLabel("Email", { exact: true }).fill(process.env.LRD_ADMIN_EMAIL!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.LRD_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content$/);
}
async function mutate(
  request: APIRequestContext,
  path: string,
  data: unknown,
  version?: number,
  method = "POST",
) {
  const csrf = await (await request.get("/api/v1/auth/csrf")).json();
  const response = await request.fetch("/api/v1" + path, {
    method,
    data,
    headers: {
      [csrf.headerName]: csrf.token,
      "Idempotency-Key": randomUUID(),
      ...(version === undefined ? {} : { "If-Match": `"${version}"` }),
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}
async function withdraw(request: APIRequestContext, path: string) {
  const current = await (await request.get("/api/v1" + path)).json();
  if (current.live || current.status === "PUBLISHED" || current.status === "CHANGED")
    await mutate(request, path + "/withdraw", {}, current.version);
}

test("dirty editor protects sidebar, browser back, locale change and logout", async ({ page }) => {
  await login(page);
  const nav = page.getByRole("navigation", { name: "Điều hướng quản trị" });
  await nav.getByRole("link", { name: "Trang chủ", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/site\/home$/);
  const title = page.getByRole("textbox", { name: "Tiêu đề", exact: true }).first();
  const original = await title.inputValue();
  await title.fill(original + " QA chưa lưu");
  const dialogs: string[] = [];
  const cancel = async (dialog: import("@playwright/test").Dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  };
  page.on("dialog", cancel);
  await nav.getByRole("link", { name: "Bài viết", exact: true }).click();
  await expect(title).toHaveValue(original + " QA chưa lưu");
  await page.evaluate(() => history.back());
  await expect.poll(() => dialogs.length).toBe(2);
  await expect(page).toHaveURL(/\/admin\/site\/home$/);
  await expect(title).toHaveValue(original + " QA chưa lưu");
  await page.getByRole("combobox", { name: "Ngôn ngữ", exact: true }).selectOption("en");
  await expect(page.getByRole("combobox", { name: "Ngôn ngữ", exact: true })).toHaveValue("vi");
  expect(dialogs).toHaveLength(3);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  expect(dialogs).toHaveLength(4);
  expect((await page.request.get("/api/v1/auth/me")).status()).toBe(200);
  page.off("dialog", cancel);
  page.once("dialog", (dialog) => dialog.accept());
  await nav.getByRole("link", { name: "Bài viết", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content$/);
  await nav.getByRole("link", { name: "Trang chủ", exact: true }).click();
  await expect(title).toHaveValue(original);
  // A clean editor should navigate without confirmation or a synthetic back entry.
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/admin\/content$/);
});

test("article and account tables scroll locally without mobile page overflow", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/admin/content", "/admin/users"]) {
    await page.goto(path);
    await expect(page.locator(".admin-main h1")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
    const table = page.locator(".table-scroll").first();
    expect(await table.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    await table.evaluate((node) => {
      node.scrollLeft = 100;
    });
    expect(await table.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  }
});

for (const kind of ["research", "editorial"] as const) {
  test(`${kind}: withdrawal confirms and preserves invalid unsaved input`, async ({
    page,
    request,
  }) => {
    await login(page);
    let article: { id: string } | undefined;
    let item = await mutate(page.request, "/admin/" + kind, {
      kind: kind === "research" ? "PROJECT" : "EVENT",
      locale: "vi",
    });
    recordFixture(kind, item.id);
    const path = "/admin/" + kind + "/" + item.id;
    const slug = "qa-withdraw-" + item.id;
    try {
      let articleId: string | undefined;
      if (kind === "editorial") {
        let content = await mutate(page.request, "/admin/content", { locale: "vi" });
        article = content;
        recordFixture("article", content.id);
        content = await mutate(
          page.request,
          `/admin/content/${content.id}/draft`,
          {
            ...draftOf(content),
            title: "QA nội dung hội thảo",
            slug: "qa-event-" + content.id,
            summary: "Nội dung kiểm thử gỡ hội thảo",
            category: "SU_KIEN",
            document: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Nội dung hội thảo kiểm thử đủ dài để đăng công khai." },
                  ],
                },
              ],
            },
          },
          content.version,
          "PATCH",
        );
        await mutate(
          page.request,
          `/admin/content/${content.id}/publish`,
          { draftVersion: content.draftVersion },
          content.version,
        );
        articleId = content.id;
      }
      item = await mutate(
        page.request,
        path + "/draft",
        {
          ...item.draft,
          title: "QA gỡ công khai",
          summary: "Nội dung kiểm thử gỡ công khai khi nháp không hợp lệ.",
          slug,
          ...(articleId ? { articleId } : {}),
        },
        item.version,
        "PATCH",
      );
      item = await mutate(
        page.request,
        path + "/publish",
        { draftVersion: item.draftVersion },
        item.version,
      );
      const publicPath = `/api/v1/public/${kind}/${slug}?locale=vi&kind=${kind === "research" ? "PROJECT" : "EVENT"}`;
      expect((await request.get(publicPath)).status()).toBe(200);
      await page.goto(path);
      const input = page.getByLabel("Đường dẫn *", { exact: true });
      await input.fill("invalid slug!");
      const patches: string[] = [];
      page.on("request", (req) => {
        if (req.method() === "PATCH") patches.push(req.url());
      });
      const button = page.getByRole("button", {
        name: kind === "research" ? "Gỡ công khai" : "Gỡ hồ sơ",
        exact: true,
      });
      page.once("dialog", (dialog) => dialog.dismiss());
      await button.click();
      expect((await request.get(publicPath)).status()).toBe(200);
      page.once("dialog", (dialog) => dialog.accept());
      await button.click();
      await expect(page.getByRole("status")).toContainText("Đã gỡ");
      await expect(input).toHaveValue("invalid slug!");
      expect(patches).toEqual([]);
      expect((await request.get(publicPath)).status()).toBe(404);
    } finally {
      await withdraw(page.request, path);
      if (article) await withdraw(page.request, "/admin/content/" + article.id);
    }
  });
}

test("research English draft clears source key and links only after a successful save", async ({
  page,
}) => {
  await login(page);
  let source = await mutate(page.request, "/admin/research", { kind: "PROJECT", locale: "vi" });
  recordFixture("research", source.id);
  source = await mutate(
    page.request,
    `/admin/research/${source.id}/draft`,
    {
      ...source.draft,
      title: "Nghiên cứu kiểm thử bản dịch",
      slug: "qa-translation-" + source.id,
      sourceKey: "qa-source-" + source.id,
    },
    source.version,
    "PATCH",
  );
  await page.route("**/api/v1/admin/localization/english", async (route) => {
    const { source: draft } = route.request().postDataJSON();
    await route.fulfill({ json: { ...draft, title: "English research draft" } });
  });
  // Simulate a failed save after AI returns. A failed draft must not become the linked translation.
  await page.route(/\/api\/v1\/admin\/research\/[^/]+\/draft$/, async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    recordFixture("research", route.request().url().split("/").at(-2)!);
    await route.fulfill({ status: 422, json: { detail: "QA: không lưu được bản dịch" } });
  });
  await page.goto("/admin/research/" + source.id);
  await page.getByRole("button", { name: "Tạo bản Anh bằng AI", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "QA: không lưu được bản dịch" }),
  ).toBeVisible();
  expect(
    (await page.request.get(`/api/v1/admin/localization/links/RESEARCH/${source.id}`)).status(),
  ).toBe(204);
  await page.unroute(/\/api\/v1\/admin\/research\/[^/]+\/draft$/);
  await page.getByRole("button", { name: "Tạo bản Anh bằng AI", exact: true }).click();
  await expect(page).not.toHaveURL(new RegExp(source.id + "$"));
  const link = await (
    await page.request.get(`/api/v1/admin/localization/links/RESEARCH/${source.id}`)
  ).json();
  recordFixture("research", link.targetId);
  const target = await (await page.request.get("/api/v1/admin/research/" + link.targetId)).json();
  expect(target.locale).toBe("en");
  expect(target.draft.sourceKey).toBe("");
  expect(target.draft.title).toBe("English research draft");
  expect(target.live).toBeNull();
});
