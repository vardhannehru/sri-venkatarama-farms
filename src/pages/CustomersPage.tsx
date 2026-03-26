import { Card, CardContent, Typography } from '@mui/material';

export function CustomersPage() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={800}>
          Customers
        </Typography>
        <Typography color="text.secondary">
          Coming next: customer list, add/edit, and purchase history.
        </Typography>
      </CardContent>
    </Card>
  );
}
