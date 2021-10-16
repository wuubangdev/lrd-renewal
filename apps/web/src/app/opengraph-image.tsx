import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 76,
          color: "#ffffff",
          background: "linear-gradient(135deg, #0c3458 0%, #0b5f73 58%, #238f8c 100%)",
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 3 }}>ĐẠI HỌC CẦN THƠ</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ width: 110, height: 7, backgroundColor: "#eab96d", borderRadius: 8 }} />
          <div style={{ fontSize: 66, lineHeight: 1.08, fontWeight: 800 }}>
            Bộ môn Tài nguyên Đất đai
          </div>
          <div style={{ fontSize: 26, opacity: 0.88 }}>Đào tạo · Nghiên cứu · Kết nối tri thức</div>
        </div>
      </div>
    ),
    size,
  );
}
