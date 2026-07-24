import { timingSafeEqual } from "crypto";

const developmentJwtSecret = "dev-secret-change-me-dev-secret-change-me";

export function safeTokenEquals(expected: string | undefined, supplied: string | undefined): boolean {
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export function validateSecurityEnvironment(environment: NodeJS.ProcessEnv = process.env): void {
  const appEnvironment = (environment.APP_ENV || "development").toLowerCase();
  const jwtSecret = environment.JWT_SECRET || "";
  const internalToken = environment.INTERNAL_TOKEN || "";
  const issuer = environment.JWT_ISSUER || "football-verse-core";
  const audience = environment.JWT_AUDIENCE || "football-verse-api";
  const corsOrigin = environment.CORS_ORIGIN || "http://localhost:3000";

  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }
  if (internalToken.length < 24) {
    throw new Error("INTERNAL_TOKEN must contain at least 24 characters");
  }
  if (!issuer.trim() || !audience.trim()) {
    throw new Error("JWT_ISSUER and JWT_AUDIENCE are required");
  }
  if (appEnvironment === "production") {
    if (jwtSecret === developmentJwtSecret) {
      throw new Error("Development JWT secret is forbidden in production");
    }
    if (!corsOrigin.startsWith("https://")) {
      throw new Error("Production CORS_ORIGIN must use HTTPS");
    }
  }
}
