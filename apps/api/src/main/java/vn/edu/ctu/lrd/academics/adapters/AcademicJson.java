package vn.edu.ctu.lrd.academics.adapters;

import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

import vn.edu.ctu.lrd.sharedkernel.DomainException;

@Component
public class AcademicJson {
    private final ObjectMapper json;

    public AcademicJson(ObjectMapper json) {
        this.json = json;
    }

    public String encode(Object value) {
        return json.writeValueAsString(value);
    }

    public <T> T decode(String source, Class<T> type) {
        try {
            T value = json.readValue(source, type);
            DomainException.require(
                    value != null, "INVALID_ACADEMIC_DATA", "Nội dung không được để trống.");
            return value;
        } catch (tools.jackson.core.JacksonException ex) {
            for (Throwable cause = ex; cause != null; cause = cause.getCause())
                if (cause instanceof DomainException domain) throw domain;
            throw new DomainException(
                    "INVALID_ACADEMIC_DATA",
                    "Dữ liệu đào tạo/tuyển sinh không hợp lệ. Kiểm tra các trường đã nhập.");
        }
    }
}
