import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import {
  expireSession,
  getSessionToken,
  isSessionExpired,
  msUntilSessionExpiry,
} from "../lib/session";

// setTimeout overflows (fires immediately) above 2^31-1 ms.
const MAX_TIMEOUT_MS = 2147483647;

export function RequireAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = getSessionToken();

  // [US-010-AC1][US-010-AC2] When the timeout is reached while the page is
  // open, drop the session and send the user to the login screen.
  useEffect(() => {
    if (!token) return;
    const remaining = msUntilSessionExpiry();
    if (remaining === null) return;
    const timer = setTimeout(() => {
      expireSession();
      navigate("/login", { replace: true });
    }, Math.min(remaining, MAX_TIMEOUT_MS));
    return () => clearTimeout(timer);
  }, [token, navigate]);

  // [US-010-AC4] An expired session never grants dashboard access; the
  // credentials must be re-entered on the login screen.
  if (token && isSessionExpired()) {
    expireSession();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
