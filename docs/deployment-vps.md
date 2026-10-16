# Triển khai VPS `lrd.levubang.site`

Ứng dụng chạy tại `/home/admin/lrd-renewal` trên VPS. Nginx của host phục vụ HTTPS và chuyển tiếp về ingress Docker tại `127.0.0.1:8088`. `api` và `web` chỉ có cổng trong mạng Compose; PostgreSQL và MinIO chỉ bind vào loopback của host. Trình duyệt dùng các endpoint `/api/v1` cùng origin để đăng nhập, quản lý CMS và tải ảnh; không có cổng backend riêng mở ra Internet.

## Cập nhật ứng dụng

```sh
cd /home/admin/lrd-renewal
git pull --ff-only
docker compose --env-file .env -f infra/compose/compose.yml --profile app build api web
docker compose --env-file .env -f infra/compose/compose.yml --profile app up -d --no-build
docker compose --env-file .env -f infra/compose/compose.yml --profile app ps
```

Giữ `.env` ngoài Git và đặt quyền đọc `600`. Các giá trị production quan trọng: `SITE_URL=https://lrd.levubang.site`, `LRD_COOKIE_SECURE=true`, `SESSION_COOKIE=__Host-lrd-session`, `LRD_ALLOWED_ORIGINS=https://lrd.levubang.site`. Không đổi khóa mã hóa hoặc khóa phiên khi chưa lập kế hoạch chuyển đổi.

## Kiểm tra

```sh
curl -I https://lrd.levubang.site/vi
curl -I https://lrd.levubang.site/en
docker exec lrd-ingress-1 wget -qO- http://api:8080/actuator/health
```

Kiểm tra đăng nhập ở `/admin/login`, mở danh sách bài viết và một ảnh public. Chứng chỉ Let's Encrypt nằm ở `/etc/letsencrypt/live/lrd.levubang.site`; `certbot.timer` và deploy hook reload Nginx đã được bật trên VPS.

## Dữ liệu

Compose dùng named volumes `lrd_postgres-data` và `lrd_media-data`; không dùng `down -v` khi cập nhật. Bản sao PostgreSQL và kho ảnh từ lần triển khai đầu được giữ trong `/home/admin/lrd-backups` với quyền riêng tư. Cần sao lưu hai volume cùng nhau trước khi thay đổi schema hoặc di chuyển VPS.
