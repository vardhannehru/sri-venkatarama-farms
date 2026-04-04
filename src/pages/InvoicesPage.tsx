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
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MortalityRecord, Product, PurchaseRecord, SaleRecord } from '../types';
import { hasRole } from '../lib/auth';
import { salesApi } from '../lib/salesApi';
import { mockProductsDb } from '../lib/mockDb';
import { expensesApi } from '../lib/expensesApi';
import { purchasesApi } from '../lib/purchasesApi';
import { mortalitiesApi } from '../lib/mortalitiesApi';
import { getSaleEstimatedProfit } from '../lib/costing';

function money(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function rupees(n: number) {
  return `\u20B9 ${money(n)}`;
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

function MetricCard({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'profit' | 'due' | 'sales';
}) {
  const toneStyles =
    tone === 'profit'
      ? { value: '#166534', sub: '#166534', label: '#15803d', bg: 'rgba(22,163,74,0.10)' }
      : tone === 'due'
        ? { value: '#b45309', sub: '#9a3412', label: '#c2410c', bg: 'rgba(249,115,22,0.10)' }
        : tone === 'sales'
          ? { value: '#1d4ed8', sub: '#1e40af', label: '#2563eb', bg: 'rgba(37,99,235,0.08)' }
          : { value: 'inherit', sub: 'text.secondary', label: 'text.secondary', bg: 'rgba(15,23,42,0.04)' };

  return (
    <Card>
      <CardContent>
        <Typography
          variant="body2"
          sx={{
            color: toneStyles.label,
            display: 'inline-flex',
            px: 1,
            py: 0.35,
            borderRadius: 999,
            bgcolor: toneStyles.bg,
            fontWeight: 700,
          }}
        >
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={900} sx={{ mt: 1, color: toneStyles.value }}>
          {value}
        </Typography>
        {sub ? (
          <Typography variant="caption" color={toneStyles.sub} sx={{ fontWeight: tone === 'default' ? 400 : 600 }}>
            {sub}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

function createInvoiceHtml(sale: SaleRecord) {
  const rows = sale.items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.name}${item.category ? ` / ${item.category}` : ''}</td>
          <td>${item.qty}</td>
          <td>${rupees(item.unitPrice)}</td>
          <td>${rupees(item.lineTotal)}</td>
        </tr>
      `
    )
    .join('');

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Sale ${sale.id}</title>
      <style>
        body {
          margin: 0;
          padding: 24px;
          font-family: Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
        }
        .sheet {
          max-width: 860px;
          margin: 0 auto;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 28px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e2e8f0;
        }
        .brand h1 {
          margin: 0 0 8px;
          font-size: 28px;
        }
        .brand p,
        .meta p {
          margin: 4px 0;
          color: #475569;
        }
        .section-title {
          margin: 24px 0 12px;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #475569;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th,
        td {
          padding: 12px 10px;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
          font-size: 14px;
        }
        th {
          background: #f8fafc;
        }
        .summary {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .totals {
          min-width: 280px;
          border-radius: 16px;
          padding: 18px;
          background: #f8fafc;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
        }
        .grand {
          padding-top: 12px;
          margin-top: 12px;
          border-top: 1px solid #cbd5e1;
          font-size: 18px;
          font-weight: 700;
        }
        @media print {
          body {
            padding: 0;
          }
          .sheet {
            border: none;
            border-radius: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="header">
          <div class="brand">
            <h1>Sri Venkatarama Intigrated Farms</h1>
            <p>Kouju Pitta Sales Invoice</p>
          </div>
          <div class="meta">
            <p><strong>Date:</strong> ${fmtDate(sale.createdAt)}</p>
            <p><strong>Handled by:</strong> ${sale.createdByUsername}</p>
            <p><strong>Customer:</strong> ${sale.customerName || 'Walk-in customer'}</p>
            <p><strong>Phone:</strong> ${sale.customerPhone || '-'}</p>
            <p><strong>Payment:</strong> ${sale.paymentMethod}</p>
            <p><strong>Sale Ref:</strong> ${sale.id}</p>
          </div>
        </div>

        <div class="section-title">Items</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="summary">
          <div class="totals">
            <div class="row"><span>Subtotal</span><span>${rupees(sale.subtotal)}</span></div>
            <div class="row"><span>Discount</span><span>${rupees(sale.discount)}</span></div>
            <div class="row grand"><span>Total</span><span>${rupees(sale.total)}</span></div>
            <div class="row"><span>Received</span><span>${rupees(sale.received)}</span></div>
            <div class="row"><span>Balance</span><span>${rupees(Math.max(0, sale.balance))}</span></div>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

function toCsvCell(value: string | number) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function InvoicesPage() {
  const navigate = useNavigate();
  const canDeleteInvoices = hasRole('admin');
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [mortalities, setMortalities] = useState<MortalityRecord[]>([]);
  const [totalExpenseAmount, setTotalExpenseAmount] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    salesApi.list().then(setSales).catch(() => setSales([]));
    mockProductsDb.list().then(setProducts).catch(() => setProducts([]));
    purchasesApi.list().then(setPurchases).catch(() => setPurchases([]));
    mortalitiesApi.list().then(setMortalities).catch(() => setMortalities([]));
    expensesApi.list().then((rows) => setTotalExpenseAmount(rows.reduce((sum, row) => sum + row.amount, 0))).catch(() => setTotalExpenseAmount(0));
  }, []);

  const filteredSales = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((sale) =>
      [
        sale.createdByUsername,
        sale.customerName ?? '',
        sale.customerPhone ?? '',
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
  const totalEstimatedProfit = sales.reduce(
    (sum, sale) => sum + getSaleEstimatedProfit(sale, products, purchases, mortalities, totalExpenseAmount),
    0
  );

  const downloadInvoicePdf = (sale: SaleRecord) => {
    const printWindow = window.open('', '_blank', 'width=960,height=720');
    if (!printWindow) {
      window.alert('Allow pop-ups to open the sales PDF.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(createInvoiceHtml(sale));
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const exportSalesToExcel = () => {
    const rows = sales.flatMap((sale) =>
      sale.items.map((item) => [
        fmtDate(sale.createdAt),
        sale.createdByUsername,
        sale.customerName ?? '',
        sale.customerPhone ?? '',
        sale.paymentMethod,
        item.name,
        item.category ?? '',
        item.qty,
        item.unitPrice,
        item.lineTotal,
        sale.subtotal,
        sale.discount,
        sale.total,
        sale.received,
        Math.max(0, sale.balance),
      ])
    );

    const header = [
      'Date',
      'Handled By',
      'Customer Name',
      'Customer Phone',
      'Payment Method',
      'Product',
      'Category',
      'Quantity',
      'Unit Price',
      'Line Total',
      'Sale Subtotal',
      'Sale Discount',
      'Sale Total',
      'Received',
      'Balance',
    ];

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => toCsvCell(cell)).join(','))
      .join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
            Sales History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review completed sales, payment status, and billing history.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            sx={{ borderRadius: 10, fontWeight: 900 }}
            onClick={exportSalesToExcel}
            disabled={!sales.length}
          >
            Export Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ borderRadius: 10, fontWeight: 900 }}
            onClick={() => navigate('/billing')}
          >
            New sale
          </Button>
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <MetricCard label="Sales" value={`${sales.length}`} sub="Saved sale records" tone="sales" />
        <MetricCard label="Total sales" value={rupees(totalSales)} sub="Across all sales" tone="sales" />
        <MetricCard label="Pending due" value={rupees(totalDue)} sub="Amount not yet received" tone="due" />
        <MetricCard label="Estimated profit" value={rupees(totalEstimatedProfit)} sub="Based on current bird cost" tone="profit" />
        <MetricCard
          label="Latest sale"
          value={sales[0] ? rupees(sales[0].total) : rupees(0)}
          sub={sales[0] ? fmtDate(sales[0].createdAt) : 'No sales yet'}
          tone="sales"
        />
      </Box>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 1.6 }}>
          <TextField
            size="small"
            placeholder="Search sales history"
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
                  No sales yet
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
                const estimatedProfit = getSaleEstimatedProfit(sale, products, purchases, mortalities, totalExpenseAmount);

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
                      <Typography fontWeight={900}>
                        {sale.items.map((item) => `${item.name}${item.category ? ` / ${item.category}` : ''}`).join(', ')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {fmtDate(sale.createdAt)} by {sale.createdByUsername}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {sale.customerName || 'Walk-in customer'}
                        {sale.customerPhone ? ` · ${sale.customerPhone}` : ''}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {sale.items.map((item) => `${item.name}${item.category ? ` / ${item.category}` : ''} x${item.qty}`).join(', ')}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography fontWeight={800}>{rupees(sale.total)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Paid: {rupees(sale.received)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Profit: {rupees(estimatedProfit)}
                      </Typography>
                    </Box>

                    <Chip
                      label={due > 0 ? `Due ${rupees(due)}` : 'Paid'}
                      color={due > 0 ? 'warning' : 'success'}
                      size="small"
                    />
                    <Chip label={sale.paymentMethod} size="small" variant="outlined" />

                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {due > 0 ? (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DoneAllIcon />}
                          onClick={async () => {
                            const input = window.prompt('Enter amount received', String(due));
                            if (input == null) return;
                            const amount = Math.max(0, Number(input) || 0);
                            if (!amount) {
                              window.alert('Enter a valid amount.');
                              return;
                            }
                            const updated = await salesApi.receiveDue(sale.id, amount);
                            setSales((prev) => prev.map((item) => (item.id === sale.id ? updated : item)));
                          }}
                        >
                          Receive Due
                        </Button>
                      ) : null}
                      <IconButton color="primary" onClick={() => downloadInvoicePdf(sale)}>
                        <PictureAsPdfIcon fontSize="small" />
                      </IconButton>
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
                      ) : null}
                    </Stack>
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
