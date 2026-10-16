package vn.edu.ctu.lrd.integrations.domain;

import org.junit.jupiter.api.Test;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class GeminiSettingsTest {
    @Test
    void canReplaceKeepOrRemoveKeyWithoutExposingItInStatus() {
        var now = Instant.parse("2026-10-15T00:00:00Z");
        var initial = GeminiSettings.empty().configure("gemini-2.5-flash", "test-secret", now);
        assertTrue(initial.configured());
        assertEquals("test-secret", initial.configure("gemini-2.5-flash-lite", "", now).apiKey());
        assertFalse(initial.removeKey(now).configured());
        assertThrows(DomainException.class, () -> initial.configure("https://bad-host", "", now));
    }
}
