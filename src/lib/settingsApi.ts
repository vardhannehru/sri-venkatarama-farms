import { apiFetch } from './api';
import type { SessionUser } from '../types';

export type AuthSettingsUser = {
  id: string;
  username: string;
  role: SessionUser['role'];
};

export type AuthSettings = {
  users: AuthSettingsUser[];
};

export async function getAuthSettings(): Promise<AuthSettings> {
  return apiFetch<AuthSettings>('/settings/auth');
}

export async function updateAuthSettings(
  userId: string,
  username: string,
  password: string
): Promise<AuthSettingsUser> {
  return apiFetch<AuthSettingsUser>('/settings/auth', {
    method: 'PUT',
    body: JSON.stringify({ userId, username, password }),
  });
}
