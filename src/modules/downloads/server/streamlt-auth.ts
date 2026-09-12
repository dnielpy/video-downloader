import { timingSafeEqual } from "node:crypto";

export type StreamltAuthStatus = "authorized" | "unauthorized" | "unconfigured";

export function getStreamltAuthStatus(authorizationHeader: string | null): StreamltAuthStatus {
  const expectedToken = process.env.STREAMLT_API_KEY?.trim();
  if (!expectedToken) return "unconfigured";

  const prefix = "Bearer ";
  if (!authorizationHeader?.startsWith(prefix)) return "unauthorized";

  const providedToken = authorizationHeader.slice(prefix.length);
  const expected = Buffer.from(expectedToken);
  const provided = Buffer.from(providedToken);

  return provided.length === expected.length && timingSafeEqual(provided, expected)
    ? "authorized"
    : "unauthorized";
}
