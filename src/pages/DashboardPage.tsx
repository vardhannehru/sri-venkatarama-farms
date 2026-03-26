import { Box, Card, CardContent, Typography } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const salesData = [
  { day: 'Mon', sales: 12000 },
  { day: 'Tue', sales: 18000 },
  { day: 'Wed', sales: 9000 },
  { day: 'Thu', sales: 24000 },
  { day: 'Fri', sales: 21000 },
  { day: 'Sat', sales: 32000 },
  { day: 'Sun', sales: 15000 },
];

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <Typography color="text.secondary" variant="body2">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={800}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <KpiCard label="Today Sales" value="₹ 18,450" />
        <KpiCard label="Invoices" value="32" />
        <KpiCard label="Low Stock" value="7" />
        <KpiCard label="This Month" value="₹ 4,62,100" />
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Sales Trend (sample)
          </Typography>
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#1976d2" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
