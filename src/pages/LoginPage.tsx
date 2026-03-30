import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { login } from '../lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from ?? '/';

  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Sri Venkatarama Intigrated Farms
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        Login to continue to your farm dashboard
      </Typography>
      <Alert severity="info" sx={{ mt: 2 }}>
        Admin: `owner / password` | Salesman: `salesman / password`
      </Alert>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}

          <Box
            component="form"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              try {
                await login(username, password);
                navigate(from, { replace: true });
              } catch (err: any) {
                setError(err?.message ?? 'Login failed');
              } finally {
                setLoading(false);
              }
            }}
            sx={{ display: 'grid', gap: 2 }}
          >
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Signing in…' : 'Login'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
