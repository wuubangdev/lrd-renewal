"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="standalone-message">
      <h1>Chưa thể tải nội dung</h1>
      <p>Kết nối đang gặp sự cố. Vui lòng thử lại sau ít phút.</p>
      <button className="button primary" onClick={reset}>
        Thử lại
      </button>
    </main>
  );
}
