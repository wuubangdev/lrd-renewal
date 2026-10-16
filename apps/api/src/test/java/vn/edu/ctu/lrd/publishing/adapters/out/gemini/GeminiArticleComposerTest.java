package vn.edu.ctu.lrd.publishing.adapters.out.gemini;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.lrd.publishing.domain.DocumentNode;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class GeminiArticleComposerTest {
    @Test
    void sendsSourceAsStructuredPromptAndParsesJsonOutline() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var received = new AtomicReference<String>();
        server.createContext("/generate", exchange -> {
            received.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            assertEquals("test-key", exchange.getRequestHeaders().getFirst("x-goog-api-key"));
            var payload = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"{\\\"title\\\":\\\"Bài được biên tập\\\",\\\"summary\\\":\\\"Tóm tắt\\\",\\\"sections\\\":[{\\\"beforeIndex\\\":0,\\\"heading\\\":\\\"Mở đầu\\\"},{\\\"beforeIndex\\\":1,\\\"heading\\\":\\\"Nội dung\\\"}]}\"}]}}]}";
            exchange.sendResponseHeaders(200, payload.getBytes(StandardCharsets.UTF_8).length);
            try (var output = exchange.getResponseBody()) { output.write(payload.getBytes(StandardCharsets.UTF_8)); }
        });
        server.start();
        try {
            var source = new DocumentNode("doc", List.of(
                    paragraph("Thông tin tuyển sinh"), paragraph("Điều kiện xét tuyển")), null, null, null);
            var composer = new GeminiArticleComposer(new ObjectMapper(), HttpClient.newHttpClient(),
                    "test-key", "gemini-2.5-flash", URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/generate"));
            var plan = composer.compose("Bài nguồn", source);
            assertEquals("Bài được biên tập", plan.title());
            assertEquals(2, plan.sections().size());
            assertTrue(received.get().contains("responseFormat"));
            assertTrue(received.get().contains("Điều kiện xét tuyển"));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void reportsMissingKeyWithoutCallingProvider() {
        var composer = new GeminiArticleComposer(new ObjectMapper(), HttpClient.newHttpClient(),
                "", "gemini-2.5-flash", URI.create("http://127.0.0.1:1/generate"));
        assertFalse(composer.available());
        assertThrows(DomainException.class, () -> composer.compose("Bài", new DocumentNode("doc", List.of(paragraph("Thân bài")), null, null, null)));
    }

    private static DocumentNode paragraph(String text) {
        return new DocumentNode("paragraph", List.of(new DocumentNode("text", null, text, null, null)), null, null, null);
    }
}
