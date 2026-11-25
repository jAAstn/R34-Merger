/* global __RULE34_API_USER_ID__, __RULE34_API_KEY__ */

// Build-Time-Konfiguration. build.js ersetzt die beiden __RULE34_*-Marker durch
// Werte aus einer lokalen, nicht eingecheckten .env.local. Beim direkten
// Ausführen der Quellmodule in Tests bleiben sie leer.
const injectedUserId = typeof __RULE34_API_USER_ID__ === 'string' ? __RULE34_API_USER_ID__ : '';
const injectedApiKey = typeof __RULE34_API_KEY__ === 'string' ? __RULE34_API_KEY__ : '';

export const API_CONFIG = Object.freeze({
  origin: 'https://api.rule34.xxx',
  userId: injectedUserId.trim(),
  apiKey: injectedApiKey.trim(),
  timeoutMs: 15_000,
  maxAttempts: 4,
  maxBackoffMs: 30_000,
  retryBaseMs: 1_000,
  retryJitterMs: 500,
  // v4.35: 450 ms statt 1000 ms pro Request. Gemessen gegen rule34 (6 Seiten,
  // 50 Thumbnails je Seite): 1 s Abstand = 6,3 s, 0,35 s Abstand = 3,2 s – beide
  // vollständig HTTP 200 und ohne CAPTCHA. 450 ms bleibt bewusst über dem
  // gemessenen Minimum (Reserve für längere Läufe über 1696 Seiten).
  page: Object.freeze({
    concurrency: 2,
    minIntervalMs: 450,
    timeoutMs: 20_000,
  }),
  metadata: Object.freeze({
    concurrency: 1,
    minIntervalMs: 1_000,
    timeoutMs: 10_000,
    maxItemsPerScan: 5,
  }),
});

export function hasApiCredentials() {
  return Boolean(API_CONFIG.userId && API_CONFIG.apiKey);
}
