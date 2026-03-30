import { apiFetch } from './api';
import type { SessionUser, UserRole } from '../types';

const TOKEN_KEY = 'shopapp.token';
const USER_KEY = 'shopapp.user';

type LoginResponse = {
  token: string;
  user: SessionUser;
};

function readStoredUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser(): SessionUser | null {
  return readStoredUser();
}

export function setCurrentUser(user: SessionUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCurrentRole(): UserRole | null {
  return getCurrentUser()?.role ?? null;
}

export function hasRole(...roles: UserRole[]): boolean {
  const role = getCurrentRole();
  return role ? roles.includes(role) : false;
}

export function isAuthed(): boolean {
  return Boolean(getToken() && getCurrentUser());
}

export async function login(username: string, password: string): Promise<void> {
  if (!username.trim() || !password.trim()) {
    throw new Error('Enter username and password');
  }
  const result = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem(TOKEN_KEY, result.token);
  setCurrentUser(result.user);
}

export async function refreshCurrentUser(): Promise<SessionUser | null> {
  if (!getToken()) {
    localStorage.removeItem(USER_KEY);
    return null;
  }
  try {
    const user = await apiFetch<SessionUser>('/auth/me');
    setCurrentUser(user);
    return user;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function logout(): void {
  const token = getToken();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => {});
  }
}
