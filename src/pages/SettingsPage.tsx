import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { getCurrentUser, setCurrentUser } from '../lib/auth';
import { getAuthSettings, updateAuthSettings, type AuthSettingsUser } from '../lib/settingsApi';

type DraftState = Record<string, { username: string; password: string; confirmPassword: string }>;

export function SettingsPage() {
  const [users, setUsers] = useState<AuthSettingsUser[]>([]);
  const [drafts, setDrafts] = useState<DraftState>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    getAuthSettings()
      .then((settings) => {
        setUsers(settings.users);
        setDrafts(
          settings.users.reduce<DraftState>((acc, user) => {
            acc[user.id] = { username: user.username, password: '', confirmPassword: '' };
            return acc;
          }, {})
        );
      })
      .catch((err: Error) => {
        setError(err.message || 'Could not load login settings');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleSave(user: AuthSettingsUser) {
    const draft = drafts[user.id] ?? { username: user.username, password: '', confirmPassword: '' };
    setError(null);
    setSuccess(null);

    if (!draft.username.trim() || !draft.password.trim()) {
      setError('Username and password are required');
      return;
    }

    if (draft.password !== draft.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSavingId(user.id);
    try {
      const updated = await updateAuthSettings(user.id, draft.username.trim(), draft.password.trim());
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      const currentUser = getCurrentUser();
      if (currentUser?.id === updated.id) {
        setCurrentUser(updated);
      }
      setDrafts((prev) => ({
        ...prev,
        [user.id]: {
          username: updated.username,
          password: '',
          confirmPassword: '',
        },
      }));
      setSuccess(`${updated.role === 'admin' ? 'Admin' : 'Salesman'} login updated successfully`);
    } catch (err: any) {
      setError(err?.message ?? 'Could not update login settings');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={800}>
            Settings
          </Typography>
          <Typography color="text.secondary">
            Manage separate login credentials for admin and salesman access.
          </Typography>
        </CardContent>
      </Card>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {users.map((user) => {
        const draft = drafts[user.id] ?? { username: user.username, password: '', confirmPassword: '' };
        const isSaving = savingId === user.id;

        return (
          <Card key={user.id}>
            <CardContent sx={{ display: 'grid', gap: 2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  {user.role === 'admin' ? 'Admin Login' : 'Salesman Login'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.role === 'admin'
                    ? 'Full access for products, settings, reports, and target setup.'
                    : 'Limited access for billing, sales history, and dashboard progress.'}
                </Typography>
              </Box>

              <TextField
                label="Username"
                value={draft.username}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [user.id]: {
                      ...draft,
                      username: e.target.value,
                    },
                  }))
                }
                disabled={loading || isSaving}
              />
              <TextField
                label="New Password"
                type="password"
                value={draft.password}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [user.id]: {
                      ...draft,
                      password: e.target.value,
                    },
                  }))
                }
                disabled={loading || isSaving}
              />
              <TextField
                label="Confirm Password"
                type="password"
                value={draft.confirmPassword}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [user.id]: {
                      ...draft,
                      confirmPassword: e.target.value,
                    },
                  }))
                }
                disabled={loading || isSaving}
              />

              <Stack direction="row" justifyContent="flex-end">
                <Button variant="contained" onClick={() => handleSave(user)} disabled={loading || isSaving}>
                  {isSaving ? 'Saving...' : 'Save Login'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
