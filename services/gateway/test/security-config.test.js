const assert = require("node:assert/strict");
const test = require("node:test");

const { safeTokenEquals, validateSecurityEnvironment } = require("../dist/security-config");

test("service credentials require an exact constant-time comparable value", () => {
  assert.equal(safeTokenEquals("internal-token-long-enough", "internal-token-long-enough"), true);
  assert.equal(safeTokenEquals("internal-token-long-enough", "internal-token-long-enougX"), false);
  assert.equal(safeTokenEquals("internal-token-long-enough", undefined), false);
});

test("production rejects development defaults and insecure origin", () => {
  assert.throws(() => validateSecurityEnvironment({
    APP_ENV: "production",
    JWT_SECRET: "dev-secret-change-me-dev-secret-change-me",
    INTERNAL_TOKEN: "production-internal-token-long-enough",
    CORS_ORIGIN: "http://example.test",
  }));
});

test("valid production security configuration passes", () => {
  assert.doesNotThrow(() => validateSecurityEnvironment({
    APP_ENV: "production",
    JWT_SECRET: "production-jwt-secret-with-at-least-32-characters",
    INTERNAL_TOKEN: "production-internal-token-long-enough",
    JWT_ISSUER: "football-verse-core",
    JWT_AUDIENCE: "football-verse-api",
    CORS_ORIGIN: "https://football.example.test",
  }));
});
