package vn.edu.ctu.lrd.integrations.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.time.Instant;

public record GeminiSettings(String model, String apiKey, Instant updatedAt) {
    public static final String DEFAULT_MODEL = "gemini-2.5-flash";

    public static GeminiSettings empty() {
        return new GeminiSettings(DEFAULT_MODEL, "", null);
    }

    public GeminiSettings configure(String selectedModel, String replacementKey, Instant now) {
        require(selectedModel != null && selectedModel.matches("[a-zA-Z0-9._-]{1,80}"),
                "INVALID_GEMINI_SETTINGS", "Tên model Gemini không hợp lệ.");
        String key = replacementKey == null || replacementKey.isBlank() ? apiKey : replacementKey.strip();
        require(key.length() <= 512 && !key.chars().anyMatch(Character::isWhitespace),
                "INVALID_GEMINI_SETTINGS", "Khóa API Gemini không hợp lệ.");
        return new GeminiSettings(selectedModel, key, now);
    }

    public GeminiSettings removeKey(Instant now) {
        return new GeminiSettings(model, "", now);
    }

    public boolean configured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
