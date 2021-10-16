package vn.edu.ctu.lrd.platform.web;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ProblemDetail;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.util.Map;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler({
        org.springframework.http.converter.HttpMessageNotReadableException.class,
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class
    })
    public ProblemDetail invalidRequest(Exception e, HttpServletRequest request) {
        return problem(400, "INVALID_REQUEST", "Dữ liệu gửi lên không đúng định dạng.", request);
    }

    @ExceptionHandler(DomainException.class)
    public ProblemDetail domain(DomainException e, HttpServletRequest request) {
        int status =
                switch (e.code()) {
                    case "NOT_FOUND" -> 404;
                    case "FORBIDDEN" -> 403;
                    case "UNAUTHORIZED" -> 401;
                    case "STALE_VERSION" -> 412;
                    case "PRECONDITION_REQUIRED" -> 428;
                    case "SLUG_CONFLICT", "IDEMPOTENCY_CONFLICT", "ACCOUNT_CONFLICT",
                            "DUPLICATE_CATEGORY", "CATEGORY_IN_USE", "TRANSLATION_EXISTS" -> 409;
                    case "RATE_LIMITED" -> 429;
                    default -> 422;
                };
        return problem(status, e.code(), e.getMessage(), request);
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ProblemDetail stale(Exception e, HttpServletRequest request) {
        return problem(
                412,
                "STALE_VERSION",
                "Bài viết đã được cập nhật ở nơi khác. Nội dung bạn đang nhập được giữ lại.",
                request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail conflict(Exception e, HttpServletRequest request) {
        return problem(
                409,
                "DATA_CONFLICT",
                "Dữ liệu bị trùng hoặc đang được sử dụng. Hãy kiểm tra đường dẫn và mã định danh.",
                request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validation(MethodArgumentNotValidException e, HttpServletRequest request) {
        var p = problem(422, "VALIDATION_ERROR", "Vui lòng kiểm tra thông tin đã nhập.", request);
        p.setProperty(
                "fieldErrors",
                e.getBindingResult().getFieldErrors().stream()
                        .map(
                                f ->
                                        Map.of(
                                                "field",
                                                f.getField(),
                                                "message",
                                                f.getDefaultMessage() == null
                                                        ? "Không hợp lệ"
                                                        : f.getDefaultMessage()))
                        .toList());
        return p;
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ProblemDetail upload(Exception e, HttpServletRequest request) {
        return problem(413, "FILE_TOO_LARGE", "Tệp vượt quá giới hạn tải lên.", request);
    }

    private ProblemDetail problem(
            int status, String code, String detail, HttpServletRequest request) {
        var p =
                ProblemDetail.forStatusAndDetail(
                        org.springframework.http.HttpStatusCode.valueOf(status), detail);
        p.setTitle(code);
        p.setProperty("code", code);
        p.setProperty("path", request.getRequestURI());
        return p;
    }
}
