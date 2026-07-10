import jwt from "jsonwebtoken";

export interface GatewayJwtPayload {
  sub: string; // Email
  uid: number; // Database User ID
  roles?: string[];
}

export function verifySocketToken(token?: string): GatewayJwtPayload {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  if (!token) {
    throw new Error("Missing token");
  }

  const payload = jwt.verify(token, jwtSecret);
  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.uid !== "number" ||
    (payload.roles !== undefined &&
      (!Array.isArray(payload.roles) || payload.roles.some((role) => typeof role !== "string")))
  ) {
    throw new Error("Invalid token payload");
  }

  return { sub: payload.sub, uid: payload.uid, roles: payload.roles };
}

export function verifyHttpToken(authorization?: string): GatewayJwtPayload {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new Error("Missing bearer token");
  }
  return verifySocketToken(match[1]);
}
