export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      body.code ?? body.title ?? "REQUEST_FAILED",
      response.status === 401
        ? "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại ở một tab mới; nội dung đang nhập vẫn được giữ tại đây."
        : (body.detail ?? body.message ?? "Không thể thực hiện thao tác. Vui lòng thử lại."),
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
