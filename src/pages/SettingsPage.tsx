import { Card, CardContent, Typography } from '@mui/material';

export function SettingsPage() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={800}>
          Settings
        </Typography>
        <Typography color="text.secondary">
          Coming next: shop profile, invoice settings, tax configuration, user management.
        </Typography>
      </CardContent>
    </Card>
  );
}
