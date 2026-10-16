package vn.edu.ctu.lrd.integrations.api;

/** Internal server-side access. Credentials must never appear in API responses. */
public interface GeminiSettingsCatalog {
    record Credentials(String apiKey, String model) {}

    Credentials credentials();
}
