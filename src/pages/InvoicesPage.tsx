import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SaleRecord } from '../types';
import { hasRole } from '../lib/auth';
import { salesApi } from '../lib/salesApi';

function money(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function fmtDate(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={900} sx={{ mt: 0.5 }}>
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

export function InvoicesPage() {
  const navigate = useNavigate();
  const canDeleteInvoices = hasRole('admin');
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    salesApi.list().then(setSales).catch(() => setSales([]));
  }, []);

  const filteredSales = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((sale) =>
      [
        sale.invoiceNumber,
        sale.createdByUsername,
        sale.paymentMethod,
        ...sale.items.map((item) => `${item.name} ${item.category ?? ''}`),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [query, sales]);

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalDue = sales.reduce((sum, sale) => sum + Math.max(0, sale.total - sale.received), 0);

  return (
    <Box sx={{ display: 'grid', gap: 2.2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={950} sx={{ letterSpacing: -0.8 }}>
            Invoices
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review saved bills, payment status, and invoice history.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ borderRadius: 10, fontWeight: 900 }} onClick={() => navigate('/billing')}>
          Create invoice
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <MetricCard label="Invoices" value={`${sales.length}`} sub="Saved bills" />
        <MetricCard label="Total sales" value={`₹ ${money(totalSales)}`} sub="Across all invoices" />
        <MetricCard label="Pending due" value={`₹ ${money(totalDue)}`} sub="Amount not yet received" />
        <MetricCard label="Latest sale" value={sales[0] ? `₹ ${money(sales[0].total)}` : '₹ 0'} sub={sales[0] ? fmtDate(sales[0].createdAt) : 'No invoices yet'} />
      </Box>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 1.6 }}>
          <TextField
            size="small"
            placeholder="Search invoices"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            sx={{ width: { xs: '100%', md: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {!filteredSales.length ? (
            <Box sx={{ minHeight: 280, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
              <Box sx={{ maxWidth: 360 }}>
                <ReceiptLongIcon sx={{ fontSize: 44, color: 'text.secondary' }} />
                <Typography variant="h6" fontWeight={900} sx={{ mt: 1 }}>
                  No invoices yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                  Complete a sale from Billing and it will appear here automatically.
                </Typography>
              </Box>
            </Box>
          ) : (
            <Stack spacing={1.2}>
              {filteredSales.map((sale) => {
                const due = Math.max(0, sale.total - sale.received);
                return (
                  <Box
                    key={sale.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      border: '1px solid rgba(15,23,42,0.08)',
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1.25fr 1fr auto auto auto' },
                      gap: 1.2,
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography fontWeight={900}>{sale.invoiceNumber}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {fmtDate(sale.createdAt)} by {sale.createdByUsername}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {sale.items.map((item) => `${item.name}${item.category ? ` / ${item.category}` : ''} x${item.qty}`).join(', ')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography fontWeight={800}>₹ {money(sale.total)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Paid: ₹ {money(sale.received)}
                      </Typography>
                    </Box>
                    <Chip label={due > 0 ? `Due ₹ ${money(due)}` : 'Paid'} color={due > 0 ? 'warning' : 'success'} size="small" />
                    <Chip label={sale.paymentMethod} size="small" variant="outlined" />
                    {canDeleteInvoices ? (
                      <IconButton
                        color="error"
                        onClick={async () => {
                          await salesApi.remove(sale.id);
                          setSales((prev) => prev.filter((item) => item.id !== sale.id));
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <Box />
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
