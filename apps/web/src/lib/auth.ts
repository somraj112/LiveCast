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

export class AuthApiError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "AuthApiError";
  }
}

function rememberAccessToken(token: string) {
  window.sessionStorage.setItem(accessTokenKey, token);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const payload = (await response.json()) as { success: true; data: T } | ErrorResponse;
  if (!response.ok || !payload.success) {
    const error = (payload as ErrorResponse).error;
    throw new AuthApiError(error?.code || "REQUEST_FAILED", error?.message || "The request failed.");
  }
  return payload.data;
}

export async function register(input: { username: string; email: string; password: string }) {
  const session = await request<SessionResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  rememberAccessToken(session.accessToken);
  return session.user;
}

export async function login(input: { email: string; password: string }) {
  const session = await request<SessionResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  rememberAccessToken(session.accessToken);
  return session.user;
}

export async function refreshSession() {
  const session = await request<SessionResponse>("/auth/refresh", { method: "POST" });
  rememberAccessToken(session.accessToken);
  return session;
}

export async function getCurrentUser() {
  let token = window.sessionStorage.getItem(accessTokenKey);
  if (!token) token = (await refreshSession()).accessToken;

  try {
    return (await request<{ user: AuthUser }>("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })).user;
  } catch (error) {
    if (!(error instanceof AuthApiError) || error.code !== "INVALID_TOKEN") throw error;
    token = (await refreshSession()).accessToken;
    return (await request<{ user: AuthUser }>("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })).user;
  }
}

export async function logout() {
  await request<{ message: string }>("/auth/logout", { method: "POST" });
  window.sessionStorage.removeItem(accessTokenKey);
}
