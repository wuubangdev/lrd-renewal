package vn.edu.ctu.lrd.integrations.adapters.out.gemini;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class GeminiConnectionProbeTest {
    @Test
    void reportsSuccessfulConnectionAndInvalidKey() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var requestBody = new AtomicReference<String>();
        server.createContext("/test", exchange -> {
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            assertEquals("candidate-key", exchange.getRequestHeaders().getFirst("x-goog-api-key"));
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
        });
        server.createContext("/denied", exchange -> {
            exchange.sendResponseHeaders(403, -1);
            exchange.close();
        });
        server.start();
        try {
            var base = "http://127.0.0.1:" + server.getAddress().getPort();
            new GeminiConnectionProbe(new ObjectMapper(), HttpClient.newHttpClient(), URI.create(base + "/test"))
                    .test("candidate-key", "gemini-2.5-flash");
            assertTrue(requestBody.get().contains("OK"));
            assertThrows(DomainException.class, () ->
                    new GeminiConnectionProbe(new ObjectMapper(), HttpClient.newHttpClient(), URI.create(base + "/denied"))
                            .test("candidate-key", "gemini-2.5-flash"));
        } finally {
            server.stop(0);
        }
    }
}
