package vn.edu.ctu.lrd.site.adapters;

import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

import vn.edu.ctu.lrd.sharedkernel.DomainException;
import vn.edu.ctu.lrd.site.domain.*;

@Component
public class SiteJson {
    private final ObjectMapper json;

    public SiteJson(ObjectMapper json) {
        this.json = json;
    }

    public SiteContent decode(String source, SiteDocument.Kind kind) {
        try {
            return kind == SiteDocument.Kind.HOME
                    ? json.readValue(source, HomeComposition.class)
                    : json.readValue(source, NavigationMenu.class);
        } catch (tools.jackson.core.JacksonException ex) {
            for (Throwable cause = ex; cause != null; cause = cause.getCause())
                if (cause instanceof DomainException domain) throw domain;
            throw new DomainException(
                    "INVALID_SITE",
                    "Cấu trúc nội dung không hợp lệ. Vui lòng kiểm tra các trường.");
        }
    }

    public String encode(SiteContent content) {
        return json.writeValueAsString(content);
    }
}
