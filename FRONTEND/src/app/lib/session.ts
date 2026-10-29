const TOKEN_KEY = "ums_session_token";
const EXPIRES_AT_KEY = "ums_session_expires_at";
const EMAIL_KEY = "ums_session_email";

export function setSession(token: string, expiresAt: string, email?: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRES_AT_KEY, expiresAt);
  if (email) localStorage.setItem(EMAIL_KEY, email);
}

export function getSessionToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getSessionEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

/* ── Session expiry (US-010) ──────────────────────────── */
const EXPIRY_NOTICE_KEY = "ums_session_expired_notice";

export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please log in again to continue.";

/** Backend error codes meaning the stored token can no longer be used. */
const DEAD_SESSION_CODES = ["SESSION_EXPIRED", "SESSION_INVALIDATED", "SESSION_NOT_FOUND"];

export function isDeadSessionCode(code: string | undefined): boolean {
  return code !== undefined && DEAD_SESSION_CODES.includes(code);
}

export function isSessionExpired(now: number = Date.now()): boolean {
  const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);
  if (!expiresAt) return false;
  const ms = new Date(expiresAt).getTime();
  return !Number.isNaN(ms) && now >= ms;
}

export function msUntilSessionExpiry(now: number = Date.now()): number | null {
  const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime();
  return Number.isNaN(ms) ? null : Math.max(0, ms - now);
}

/** Drop all client session state and flag the login screen to show the notice. */
export function expireSession(): void {
  clearSession();
  sessionStorage.setItem(EXPIRY_NOTICE_KEY, "1");
}

export function hasSessionExpiredNotice(): boolean {
  return sessionStorage.getItem(EXPIRY_NOTICE_KEY) === "1";
}

export function clearSessionExpiredNotice(): void {
  sessionStorage.removeItem(EXPIRY_NOTICE_KEY);
}
