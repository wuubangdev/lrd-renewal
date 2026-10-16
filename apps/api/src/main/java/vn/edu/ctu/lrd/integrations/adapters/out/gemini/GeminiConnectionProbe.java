package vn.edu.ctu.lrd.integrations.adapters.out.gemini;

import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.lrd.integrations.application.port.GeminiProbe;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class GeminiConnectionProbe implements GeminiProbe {
    private final HttpClient http;
    private final ObjectMapper json;
    private final URI endpoint;

    @Autowired
    public GeminiConnectionProbe(ObjectMapper json) {
        this(json, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build(), null);
    }

    GeminiConnectionProbe(ObjectMapper json, HttpClient http, URI endpoint) {
        this.json = json;
        this.http = http;
        this.endpoint = endpoint;
    }

    @Override
    public void test(String apiKey, String model) {
        var request = HttpRequest.newBuilder()
                .uri(endpoint == null ? URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent") : endpoint)
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of(
                        "contents", List.of(Map.of("parts", List.of(Map.of("text", "Trả lời một từ: OK")))),
                        "generationConfig", Map.of("maxOutputTokens", 24)))))
                .build();
        try {
            var response = http.send(request, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() == 401 || response.statusCode() == 403)
                throw new DomainException("AI_INVALID_KEY", "Khóa Gemini bị từ chối hoặc không có quyền dùng model này.");
            if (response.statusCode() == 429)
                throw new DomainException("AI_RATE_LIMIT", "Gemini đang hết hạn mức hoặc giới hạn lượt gọi.");
            if (response.statusCode() != 200)
                throw new DomainException("AI_UNAVAILABLE", "Không thể kết nối Gemini với model đã chọn.");
        } catch (DomainException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new DomainException("AI_UNAVAILABLE", "Kiểm tra kết nối Gemini bị gián đoạn.");
        } catch (Exception e) {
            throw new DomainException("AI_UNAVAILABLE", "Không thể kết nối Gemini. Vui lòng thử lại.");
        }
    }
}
