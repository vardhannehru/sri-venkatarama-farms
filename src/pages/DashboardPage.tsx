import { alpha, Box, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import type { Product } from '../types';
import { hasRole } from '../lib/auth';
import { mockProductsDb } from '../lib/mockDb';
import { dailyTargetDb } from '../lib/dailyTargetDb';

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
      <Typography
        variant="caption"
        sx={{
          color: 'primary.light',
          letterSpacing: 1.6,
          textTransform: 'uppercase',
          fontWeight: 800,
        }}
      >
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
        transform: highlight ? 'translateY(-2px)' : 'none',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            highlight
              ? 'radial-gradient(circle at top right, rgba(37,99,235,0.12), transparent 34%), radial-gradient(circle at bottom left, rgba(22,163,74,0.08), transparent 36%)'
              : 'radial-gradient(circle at top right, rgba(37,99,235,0.05), transparent 38%), radial-gradient(circle at bottom left, rgba(22,163,74,0.04), transparent 35%)',
          pointerEvents: 'none',
        }}
      />
      <CardContent sx={{ position: 'relative' }}>
        <Chip
          label={label}
          size="small"
          sx={{
            mb: 1.5,
            bgcolor: highlight ? 'rgba(37,99,235,0.08)' : 'rgba(15,23,42,0.04)',
            color: highlight ? 'primary.main' : 'text.secondary',
            border: highlight ? '1px solid rgba(37,99,235,0.12)' : '1px solid rgba(15,23,42,0.06)',
          }}
        />
        <Typography variant="h4" fontWeight={950} sx={{ color: 'text.primary' }}>
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

function EmptyPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent
        sx={{
          minHeight: 260,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
        }}
      >
        <Box sx={{ maxWidth: 320 }}>
          <Typography variant="h6" fontWeight={900}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
            {body}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const canManageTarget = hasRole('admin');
  const [products, setProducts] = useState<Product[]>([]);
  const [dailyTarget, setDailyTarget] = useState<number>(0);
  const [todaySoldBirds, setTodaySoldBirds] = useState<number>(0);
  const [targetInput, setTargetInput] = useState<string>('');

  useEffect(() => {
    mockProductsDb.list().then(setProducts).catch(() => setProducts([]));
    dailyTargetDb
      .getTarget()
      .then((target) => {
        setDailyTarget(target.quantity);
        setTargetInput(target.quantity ? String(target.quantity) : '');
      })
      .catch(() => {
        setDailyTarget(0);
        setTargetInput('');
      });
    dailyTargetDb.getTodayQuantity().then(setTodaySoldBirds).catch(() => setTodaySoldBirds(0));
  }, []);

  const inventoryValue = products.reduce((sum, product) => sum + product.stock * product.sellPrice, 0);
  const hasProducts = products.length > 0;
  const targetRemaining = Math.max(dailyTarget - todaySoldBirds, 0);
  const targetPercent = dailyTarget > 0 ? Math.min((todaySoldBirds / dailyTarget) * 100, 100) : 0;
  const targetCompleted = dailyTarget > 0 && todaySoldBirds >= dailyTarget;

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
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <KpiCard label="Today Birds Sold" value={`${todaySoldBirds}`} sub="Birds billed today" highlight />
        <KpiCard
          label="Daily Bird Target"
          value={dailyTarget ? `${dailyTarget}` : 'Not set'}
          sub={dailyTarget ? `${targetPercent.toFixed(0)}% completed` : 'Add today target'}
        />
        <KpiCard
          label="Products"
          value={`${products.length}`}
          sub={products.length ? 'Active inventory items' : 'Add your first product'}
        />
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
            <Button
              variant="outlined"
              color="error"
              onClick={clearTarget}
              disabled={!canManageTarget || dailyTarget === 0}
            >
              Remove target
            </Button>
            {dailyTarget ? (
              <Chip
                label={targetCompleted ? 'Target completed' : `Remaining ${targetRemaining} birds`}
                color={targetCompleted ? 'success' : 'warning'}
                size="small"
              />
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
            <Box
              sx={{
                mt: 2,
                height: 12,
                borderRadius: 999,
                bgcolor: 'rgba(15,23,42,0.08)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${targetPercent}%`,
                  minWidth: todaySoldBirds > 0 ? 8 : 0,
                  height: '100%',
                  borderRadius: 999,
                  background: targetCompleted
                    ? 'linear-gradient(90deg, #22c55e, #86efac)'
                    : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                }}
              />
            </Box>
          ) : null}
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.8fr 1fr' }, gap: 2 }}>
        <EmptyPanel
          title="Sales chart will appear here"
          body="Start billing real sales and this dashboard can show daily revenue trends."
        />
        <EmptyPanel
          title="Recent sales will appear here"
          body="Your latest invoices and payment updates will show here once you begin selling."
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <EmptyPanel
          title="Top products will appear here"
          body="Add products and complete sales to see which categories move the fastest."
        />
        <EmptyPanel
          title="Monthly sales will appear here"
          body="Monthly performance cards will become active after your real billing data is added."
        />
      </Box>

      {!products.length ? (
        <Card
          sx={{
            border: '1px solid rgba(15,23,42,0.08)',
            background: `linear-gradient(180deg, ${alpha('#ffffff', 0.98)}, ${alpha('#f8fafc', 1)})`,
          }}
        >
          <CardContent>
            <SectionHeader
              eyebrow="Setup"
              title="Add your first products"
              caption="Go to Products and enter your real inventory to activate billing and dashboard totals."
            />
            <Divider sx={{ borderColor: 'rgba(15,23,42,0.08)' }} />
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
}
