import { Box, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type SaleRow = {
  id: string;
  invoiceNo: string;
  customer: string;
  amount: number;
  paid: boolean;
  at: string; // ISO
};

const salesTrend = [
  { day: 'Mon', sales: 12000 },
  { day: 'Tue', sales: 18000 },
  { day: 'Wed', sales: 9000 },
  { day: 'Thu', sales: 24000 },
  { day: 'Fri', sales: 21000 },
  { day: 'Sat', sales: 32000 },
  { day: 'Sun', sales: 15000 },
];

const topProducts = [
  { name: 'Sunflower Oil 1L', qty: 42 },
  { name: 'Soap 100g', qty: 37 },
  { name: 'Rice 25kg', qty: 18 },
  { name: 'Milk 500ml', qty: 15 },
  { name: 'Tea 250g', qty: 11 },
];

const monthlySales = [
  { month: 'Jan', sales: 310000 },
  { month: 'Feb', sales: 280000 },
  { month: 'Mar', sales: 345000 },
  { month: 'Apr', sales: 298000 },
  { month: 'May', sales: 372000 },
  { month: 'Jun', sales: 401000 },
];

const recentSales: SaleRow[] = [
  { id: 's1', invoiceNo: 'INV-00121', customer: 'Walk-in', amount: 1450, paid: true, at: new Date(Date.now() - 20 * 60_000).toISOString() },
  { id: 's2', invoiceNo: 'INV-00120', customer: 'Asha Stores', amount: 7311, paid: true, at: new Date(Date.now() - 65 * 60_000).toISOString() },
  { id: 's3', invoiceNo: 'INV-00119', customer: 'Metro Mart', amount: 27114, paid: false, at: new Date(Date.now() - 2.5 * 60 * 60_000).toISOString() },
  { id: 's4', invoiceNo: 'INV-00118', customer: 'BlueRock', amount: 53154, paid: true, at: new Date(Date.now() - 6.2 * 60 * 60_000).toISOString() },
];

function money(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent>
        <Typography color="text.secondary" variant="body2">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={950} sx={{ mt: 0.3 }}>
          {value}
        </Typography>
        {sub ? (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const todayTotal = recentSales.reduce((a, x) => a + x.amount, 0);

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <KpiCard label="Today Sales" value={`₹ ${money(todayTotal)}`} sub="(demo data)" />
        <KpiCard label="Recent Sales" value={`${recentSales.length}`} sub="Invoices today" />
        <KpiCard label="Low Stock" value="7" sub="Products" />
        <KpiCard label="This Month" value="₹ 4,62,100" sub="(demo)" />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '2fr 1fr' }, gap: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={900} gutterBottom>
              Sales by day (bar)
            </Typography>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" fontWeight={900}>
                Recent sales
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Date & time
              </Typography>
            </Stack>
            <Divider sx={{ mb: 1.2 }} />

            <Stack spacing={1.2}>
              {recentSales.map((s) => (
                <Box
                  key={s.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 1,
                    alignItems: 'center',
                    p: 1.1,
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <Box>
                    <Typography fontWeight={900} sx={{ lineHeight: 1.2 }}>
                      {s.invoiceNo}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {s.customer} • {fmtDateTime(s.at)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography fontWeight={950}>₹ {money(s.amount)}</Typography>
                    <Typography variant="caption" color={s.paid ? 'success.main' : 'warning.main'}>
                      {s.paid ? 'Paid' : 'Pending'}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={900} gutterBottom>
              Top products sold today (bar)
            </Typography>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={140} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="#22c55e" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={900} gutterBottom>
              Monthly sales (bar)
            </Typography>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
