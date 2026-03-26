import { Card, CardContent, Typography } from '@mui/material';

export function ExpensesPage() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={800}>
          Expenses
        </Typography>
        <Typography color="text.secondary">Coming next: add expenses and monthly summary.</Typography>
      </CardContent>
    </Card>
  );
}
