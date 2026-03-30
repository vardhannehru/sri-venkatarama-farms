import { alpha, Box, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { Product, SaleRecord } from '../types';
import { hasRole } from '../lib/auth';
import { mockProductsDb } from '../lib/mockDb';
import { dailyTargetDb } from '../lib/dailyTargetDb';
import { salesApi } from '../lib/salesApi';

function money(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function SectionHeader({
  eyebrow,
  title,
  caption,
}: {
  eyebrow: string;
  title: string;
  caption?: string;
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ color: 'primary.light', letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: 800 }}>
        {eyebrow}
      </Typography>
      <Typography variant="h6" fontWeight={900} sx={{ mt: 0.4 }}>
        {title}
      </Typography>
      {caption ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {caption}
        </Typography>
      ) : null}
    </Box>
  );
}

function KpiCard({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,251,253,1))',
        border: highlight ? '1px solid rgba(37,99,235,0.18)' : '1px solid rgba(15,23,42,0.06)',
        boxShadow: highlight ? '0 18px 36px rgba(37,99,235,0.10)' : '0 12px 28px rgba(15,23,42,0.05)',
      }}
    >
      <CardContent>
        <Chip
          label={label}
          size="small"
          sx={{
            mb: 1.5,
            bgcolor: highlight ? 'rgba(37,99,235,0.08)' : 'rgba(15,23,42,0.04)',
            color: highlight ? 'primary.main' : 'text.secondary',
          }}
        />
        <Typography variant="h4" fontWeight={950}>
          {value}
        </Typography>
        {sub ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {sub}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

function fmtDate(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DashboardPage() {
  const canManageTarget = hasRole('admin');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [dailyTarget, setDailyTarget] = useState<number>(0);
  const [todaySoldBirds, setTodaySoldBirds] = useState<number>(0);
  const [targetInput, setTargetInput] = useState<string>('');

  async function loadDashboard() {
    const [productRows, target, todayQuantity, saleRows] = await Promise.all([
      mockProductsDb.list().catch(() => []),
      dailyTargetDb.getTarget().catch(() => ({ quantity: 0 })),
      dailyTargetDb.getTodayQuantity().catch(() => 0),
      salesApi.list().catch(() => []),
    ]);
    setProducts(productRows);
    setDailyTarget(target.quantity);
    setTargetInput(target.quantity ? String(target.quantity) : '');
    setTodaySoldBirds(todayQuantity);
    setSales(saleRows);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const inventoryValue = products.reduce((sum, product) => sum + product.stock * product.sellPrice, 0);
  const hasProducts = products.length > 0;
  const targetRemaining = Math.max(dailyTarget - todaySoldBirds, 0);
  const targetPercent = dailyTarget > 0 ? Math.min((todaySoldBirds / dailyTarget) * 100, 100) : 0;
  const targetCompleted = dailyTarget > 0 && todaySoldBirds >= dailyTarget;
  const recentSales = sales.slice(0, 5);
  const topProducts = useMemo(() => {
    const totals = new Map<string, { label: string; qty: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const label = item.category ? `${item.name} / ${item.category}` : item.name;
        const current = totals.get(label) ?? { label, qty: 0 };
        current.qty += item.qty;
        totals.set(label, current);
      }
    }
    return [...totals.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [sales]);
  const maxTopQty = topProducts[0]?.qty ?? 1;

  function saveTarget() {
    if (!hasProducts) return;
    const next = Math.max(0, Number(targetInput) || 0);
    setDailyTarget(next);
    void dailyTargetDb.setTarget(next);
    setTargetInput(next ? String(next) : '');
  }

  function clearTarget() {
    setDailyTarget(0);
    setTargetInput('');
    void dailyTargetDb.setTarget(0);
  }

  return (
    <Box sx={{ display: 'grid', gap: 2.25 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <KpiCard label="Today Birds Sold" value={`${todaySoldBirds}`} sub="Birds billed today" highlight />
        <KpiCard label="Daily Bird Target" value={dailyTarget ? `${dailyTarget}` : 'Not set'} sub={dailyTarget ? `${targetPercent.toFixed(0)}% completed` : 'Add today target'} />
        <KpiCard label="Invoices" value={`${sales.length}`} sub={sales.length ? 'Saved sale records' : 'No invoices yet'} />
        <KpiCard label="Inventory Value" value={`₹ ${money(inventoryValue)}`} sub="Based on current sell price" />
      </Box>

      <Card
        sx={{
          border: targetCompleted ? '1px solid rgba(34,197,94,0.34)' : '1px solid rgba(245,158,11,0.34)',
          background: targetCompleted
            ? 'linear-gradient(135deg, rgba(34,197,94,0.16), rgba(255,255,255,0.03))'
            : 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(255,255,255,0.03))',
        }}
      >
        <CardContent>
          <SectionHeader
            eyebrow="Daily Target"
            title={targetCompleted ? 'Daily target completed' : 'Complete today target'}
            caption={
              dailyTarget
                ? targetCompleted
                  ? 'Great work. Today bird sales have already reached the target.'
                  : `You still need ${targetRemaining} more quail birds to complete today target.`
                : 'Set a daily target in bird count so the dashboard can warn you when sales are behind.'
            }
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              label="Daily target birds"
              type="number"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              disabled={!canManageTarget || !hasProducts}
              sx={{ width: { xs: '100%', md: 220 } }}
              helperText={!hasProducts ? 'Add products first to set a target.' : ' '}
            />
            <Button variant="contained" onClick={saveTarget} disabled={!canManageTarget || !hasProducts}>
              Save target
            </Button>
            <Button variant="outlined" color="error" onClick={clearTarget} disabled={!canManageTarget || dailyTarget === 0}>
              Remove target
            </Button>
            {dailyTarget ? (
              <Chip label={targetCompleted ? 'Target completed' : `Remaining ${targetRemaining} birds`} color={targetCompleted ? 'success' : 'warning'} size="small" />
            ) : null}
          </Stack>
          {!canManageTarget ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
              Only admin can change the daily bird target. Salesman can view progress here.
            </Typography>
          ) : !hasProducts ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
              Add at least one product before setting a daily target.
            </Typography>
          ) : null}

          {dailyTarget ? (
            <Box sx={{ mt: 2, height: 12, borderRadius: 999, bgcolor: 'rgba(15,23,42,0.08)', overflow: 'hidden' }}>
              <Box
                sx={{
                  width: `${targetPercent}%`,
                  minWidth: todaySoldBirds > 0 ? 8 : 0,
                  height: '100%',
                  borderRadius: 999,
                  background: targetCompleted ? 'linear-gradient(90deg, #22c55e, #86efac)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                }}
              />
            </Box>
          ) : null}
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.3fr 1fr' }, gap: 2 }}>
        <Card>
          <CardContent>
            <SectionHeader eyebrow="Recent Sales" title="Latest invoices" caption="These are the most recent completed sales from billing." />
            {!recentSales.length ? (
              <Typography color="text.secondary">Complete your first sale and it will appear here.</Typography>
            ) : (
              <Stack spacing={1.2}>
                {recentSales.map((sale) => (
                  <Box
                    key={sale.id}
                    sx={{
                      p: 1.25,
                      border: '1px solid rgba(15,23,42,0.08)',
                      borderRadius: 3,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr auto auto' },
                      gap: 1,
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography fontWeight={900}>{sale.invoiceNumber}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {fmtDate(sale.createdAt)} by {sale.createdByUsername}
                      </Typography>
                    </Box>
                    <Typography fontWeight={800}>₹ {money(sale.total)}</Typography>
                    <Chip label={sale.paymentMethod} size="small" variant="outlined" />
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionHeader eyebrow="Top Products" title="Best sellers" caption="Top moving products based on billed quantity." />
            {!topProducts.length ? (
              <Typography color="text.secondary">Sales graphs will appear after billing starts.</Typography>
            ) : (
              <Stack spacing={1.4}>
                {topProducts.map((item) => (
                  <Box key={item.label}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.7 }}>
                      <Typography fontWeight={800}>{item.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.qty} sold
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 12, borderRadius: 999, bgcolor: 'rgba(15,23,42,0.08)', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${(item.qty / maxTopQty) * 100}%`,
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>

      {!products.length ? (
        <Card
          sx={{
            border: '1px solid rgba(15,23,42,0.08)',
            background: `linear-gradient(180deg, ${alpha('#ffffff', 0.98)}, ${alpha('#f8fafc', 1)})`,
          }}
        >
          <CardContent>
            <SectionHeader eyebrow="Setup" title="Add your first products" caption="Go to Products and enter your real inventory to activate billing, invoices, and dashboard analytics." />
            <Divider sx={{ borderColor: 'rgba(15,23,42,0.08)' }} />
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
}
