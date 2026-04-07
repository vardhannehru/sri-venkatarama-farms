import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { SaleRecord } from '../types';
import { salesApi } from '../lib/salesApi';

function money(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type CustomerSummary = {
  name: string;
  phone: string;
  salesCount: number;
  totalSales: number;
  totalDue: number;
  lastSaleAt: string;
};

export function CustomersPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    salesApi
      .list()
      .then((rows) => {
        setSales(rows);
        setError('');
      })
      .catch((err) => {
        setSales([]);
        setError(err instanceof Error ? err.message : 'Unable to load customers');
      });
  }, []);

  const customers = useMemo(() => {
    const grouped = new Map<string, CustomerSummary>();

    for (const sale of sales) {
      const name = sale.customerName?.trim() ?? '';
      const phone = sale.customerPhone?.trim() ?? '';
      if (!name || !phone) {
        continue;
      }
      const key = `${name.toLowerCase()}|${phone}`;
      const current = grouped.get(key) ?? {
        name,
        phone,
        salesCount: 0,
        totalSales: 0,
        totalDue: 0,
        lastSaleAt: sale.createdAt,
      };

      current.salesCount += 1;
      current.totalSales += Number(sale.total ?? 0);
      current.totalDue += Math.max(0, Number(sale.total ?? 0) - Number(sale.received ?? 0));
      if (new Date(sale.createdAt).getTime() > new Date(current.lastSaleAt).getTime()) {
        current.lastSaleAt = sale.createdAt;
      }
      grouped.set(key, current);
    }

    return [...grouped.values()].sort((a, b) => new Date(b.lastSaleAt).getTime() - new Date(a.lastSaleAt).getTime());
  }, [sales]);

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant="h5" fontWeight={900}>
          Customers
        </Typography>
        <Typography color="text.secondary">
          Every billing entry now saves customer details here automatically, so you can track repeat buyers and pending due.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent sx={{ display: 'grid', gap: 1.2 }}>
          {!customers.length ? (
            <Typography color="text.secondary">No customers saved yet. Create a sale in Billing and the customer will appear here automatically.</Typography>
          ) : (
            customers.map((customer) => (
              <Box
                key={`${customer.name}-${customer.phone}`}
                sx={{
                  p: 1.4,
                  borderRadius: 3,
                  border: '1px solid rgba(15,23,42,0.08)',
                  display: 'grid',
                  gap: 1,
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                  <Box>
                    <Typography fontWeight={900}>{customer.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {customer.phone}
                    </Typography>
                  </Box>
                  <Chip
                    label={customer.totalDue > 0 ? `Due ₹ ${money(customer.totalDue)}` : 'No due'}
                    color={customer.totalDue > 0 ? 'warning' : 'success'}
                    variant="outlined"
                  />
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Sales: <strong>{customer.salesCount}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Purchase: <strong>₹ {money(customer.totalSales)}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last Sale: <strong>{fmtDate(customer.lastSaleAt)}</strong>
                  </Typography>
                </Stack>
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
