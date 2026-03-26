import { Card, CardContent, Typography } from '@mui/material';

export function ReportsPage() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={800}>
          Reports
        </Typography>
        <Typography color="text.secondary">
          Coming next: daily/weekly/monthly sales reports, top/least products, exports.
        </Typography>
      </CardContent>
    </Card>
  );
}
