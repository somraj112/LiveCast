export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: "VIEWER" | "CREATOR" | "MODERATOR";
  profileImage: string | null;
  bio: string | null;
  createdAt: string;
};

type SessionResponse = { user: AuthUser; accessToken: string };
type ErrorResponse = { success: false; error: { code: string; message: string } };

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
const accessTokenKey = "livecast_access_token";
let refreshPromise: Promise<SessionResponse> | null = null;

export class AuthApiError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "AuthApiError";
  }
}

function rememberAccessToken(token: string) {
  window.sessionStorage.setItem(accessTokenKey, token);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const payload = response.status === 204
    ? { success: true as const, data: undefined as T }
    : (await response.json()) as { success: true; data: T } | ErrorResponse;
  if (!response.ok || !payload.success) {
    const error = (payload as ErrorResponse).error;
    throw new AuthApiError(error?.code || "REQUEST_FAILED", error?.message || "The request failed.");
  }
  return payload.data;
}

export async function authenticatedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = window.sessionStorage.getItem(accessTokenKey);
  if (!token) token = (await refreshSession()).accessToken;

  const execute = (accessToken: string) => apiRequest<T>(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
  });

  try {
    return await execute(token);
  } catch (error) {
    if (!(error instanceof AuthApiError) || error.code !== "INVALID_TOKEN") throw error;
    token = (await refreshSession()).accessToken;
    return execute(token);
  }
}

export async function register(input: { username: string; email: string; password: string }) {
  const session = await apiRequest<SessionResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  rememberAccessToken(session.accessToken);
  return session.user;
}

export async function login(input: { email: string; password: string }) {
  const session = await apiRequest<SessionResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  rememberAccessToken(session.accessToken);
  return session.user;
}

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = apiRequest<SessionResponse>("/auth/refresh", { method: "POST" })
      .then((session) => {
        rememberAccessToken(session.accessToken);
        return session;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function getCurrentUser() {
  return (await authenticatedRequest<{ user: AuthUser }>("/auth/me")).user;
}

export async function logout() {
  await apiRequest<{ message: string }>("/auth/logout", { method: "POST" });
  window.sessionStorage.removeItem(accessTokenKey);
}
