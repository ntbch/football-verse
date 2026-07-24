import { NextFunction, Request, Response } from "express";

import { verifyHttpToken } from "./auth";

const untrustedIdentityHeaders = [
  "x-user-id",
  "x-user-role",
  "x-user-roles",
  "x-authenticated-user",
  "x-internal-token",
];

export function authenticateGameRequest(req: Request, res: Response, next: NextFunction): void {
  const internalToken = process.env.INTERNAL_TOKEN;
  if (!internalToken) {
    res.status(500).json({ success: false, message: "Game gateway is not configured" });
    return;
  }

  try {
    const payload = verifyHttpToken(req.headers.authorization);
    for (const header of untrustedIdentityHeaders) {
      delete req.headers[header];
    }
    req.headers["x-user-id"] = payload.uid.toString();
    req.headers["x-internal-token"] = internalToken;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
}
