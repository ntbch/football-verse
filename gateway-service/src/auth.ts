import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET;

export interface GatewayJwtPayload {
  sub: string; // Email
  uid: number; // Database User ID
  roles?: string[];
}

export function verifySocketToken(token?: string): GatewayJwtPayload {
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  if (!token) {
    throw new Error("Missing token");
  }

  return jwt.verify(token, jwtSecret) as GatewayJwtPayload;
}
