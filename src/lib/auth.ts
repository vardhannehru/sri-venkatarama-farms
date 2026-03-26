const TOKEN_KEY = 'shopapp.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthed(): boolean {
  return Boolean(getToken());
}

export async function login(username: string, password: string): Promise<void> {
  // Demo-only: accept anything non-empty.
  if (!username.trim() || !password.trim()) {
    throw new Error('Enter username and password');
  }
  // In real app: call backend and store access token.
  localStorage.setItem(TOKEN_KEY, 'demo-token');
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}
