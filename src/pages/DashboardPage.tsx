import { alpha, Box, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { Product } from '../types';
import { mockProductsDb } from '../lib/mockDb';

const DAILY_TARGET_KEY = 'shopapp.dailyTarget';

function money(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(date?: string) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(date);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
}

function readDailyTarget() {
  const raw = localStorage.getItem(DAILY_TARGET_KEY);
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
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
        background:
          highlight
            ? 'linear-gradient(145deg, rgba(76,29,149,0.95) 0%, rgba(30,41,59,0.98) 55%, rgba(11,15,25,1) 100%)'
            : 'linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(11,15,25,0.96) 100%)',
        border: highlight ? '1px solid rgba(167,139,250,0.5)' : undefined,
        boxShadow: highlight ? '0 24px 60px rgba(76,29,149,0.35)' : undefined,
        transform: highlight ? 'translateY(-2px)' : 'none',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            highlight
              ? 'radial-gradient(circle at top right, rgba(196,181,253,0.38), transparent 34%), radial-gradient(circle at bottom left, rgba(34,197,94,0.16), transparent 36%)'
              : 'radial-gradient(circle at top right, rgba(124,58,237,0.24), transparent 38%), radial-gradient(circle at bottom left, rgba(34,197,94,0.12), transparent 35%)',
          pointerEvents: 'none',
        }}
      />
      <CardContent sx={{ position: 'relative' }}>
        <Chip
          label={label}
          size="small"
          sx={{
            mb: 1.5,
            bgcolor: highlight ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
            color: highlight ? 'rgba(255,255,255,0.92)' : 'text.secondary',
            border: highlight ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(255,255,255,0.08)',
          }}
        />
        <Typography variant="h4" fontWeight={950} sx={{ color: highlight ? '#ffffff' : 'inherit' }}>
          {value}
        </Typography>
        {sub ? (
          <Typography
            variant="body2"
            color={highlight ? 'rgba(255,255,255,0.74)' : 'text.secondary'}
            sx={{ mt: 0.75 }}
          >
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
  const products = mockProductsDb.list();
  const [dailyTarget, setDailyTarget] = useState<number>(() => readDailyTarget());
  const [targetInput, setTargetInput] = useState<string>(() => String(readDailyTarget() || ''));

  useEffect(() => {
    localStorage.setItem(DAILY_TARGET_KEY, String(dailyTarget));
  }, [dailyTarget]);

  const expiringSoon = useMemo(
    () =>
      products
        .filter((product) => {
          const days = daysUntil(product.expiryDate);
          return days !== null && days <= 3;
        })
        .sort((a, b) => (daysUntil(a.expiryDate) ?? 999) - (daysUntil(b.expiryDate) ?? 999)),
    [products]
  );

  const todaySales = 0;
  const inventoryValue = products.reduce((sum, product) => sum + product.stock * product.sellPrice, 0);
  const targetRemaining = Math.max(dailyTarget - todaySales, 0);
  const targetPercent = dailyTarget > 0 ? Math.min((todaySales / dailyTarget) * 100, 100) : 0;
  const targetCompleted = dailyTarget > 0 && todaySales >= dailyTarget;

  function saveTarget() {
    const next = Math.max(0, Number(targetInput) || 0);
    setDailyTarget(next);
    setTargetInput(next ? String(next) : '');
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
        <KpiCard label="Today Sales" value={`₹ ${money(todaySales)}`} sub="No sales recorded yet" highlight />
        <KpiCard label="Daily Target" value={dailyTarget ? `₹ ${money(dailyTarget)}` : 'Not set'} sub={dailyTarget ? `${targetPercent.toFixed(0)}% completed` : 'Add today target'} />
        <KpiCard
          label="Expiry Alerts"
          value={`${expiringSoon.length}`}
          sub={expiringSoon.length ? 'Sell these items first' : 'No urgent expiry'}
        />
        <KpiCard label="Inventory Value" value={`₹ ${money(inventoryValue)}`} sub="Based on current sell price" />
      </Box>

      <Card
        sx={{
          border: targetCompleted
            ? '1px solid rgba(34,197,94,0.34)'
            : '1px solid rgba(245,158,11,0.34)',
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
                  ? 'Great work. Today sales have already reached the target.'
                  : `You still need ₹ ${money(targetRemaining)} to complete today target.`
                : 'Set a daily target amount so the dashboard can warn you when sales are behind.'
            }
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              label="Daily target amount"
              type="number"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              sx={{ width: { xs: '100%', md: 220 } }}
            />
            <Button variant="contained" onClick={saveTarget}>
              Save target
            </Button>
            {dailyTarget ? (
              <Chip
                label={targetCompleted ? 'Target completed' : `Remaining ₹ ${money(targetRemaining)}`}
                color={targetCompleted ? 'success' : 'warning'}
                size="small"
              />
            ) : null}
          </Stack>

          {dailyTarget ? (
            <Box
              sx={{
                mt: 2,
                height: 12,
                borderRadius: 999,
                bgcolor: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${targetPercent}%`,
                  minWidth: todaySales > 0 ? 8 : 0,
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

      {expiringSoon.length ? (
        <Card
          sx={{
            border: '1px solid rgba(245,158,11,0.34)',
            background:
              'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(255,255,255,0.03))',
          }}
        >
          <CardContent>
            <SectionHeader
              eyebrow="Expiry Warning"
              title="Sell these before they expire"
              caption="These items are closest to expiry and should move first."
            />
            <Stack spacing={1.2}>
              {expiringSoon.map((product: Product) => {
                const days = daysUntil(product.expiryDate);
                return (
                  <Box
                    key={product.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr auto auto' },
                      gap: 1,
                      alignItems: 'center',
                      p: 1.3,
                      borderRadius: 3,
                      border: '1px solid rgba(255,255,255,0.08)',
                      bgcolor: 'rgba(17,24,39,0.38)',
                    }}
                  >
                    <Box>
                      <Typography fontWeight={900}>
                        {product.name} - {product.category}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Expiry: {product.expiryDate ? fmtDate(product.expiryDate) : '-'}
                      </Typography>
                    </Box>
                    <Typography fontWeight={800}>Stock {product.stock}</Typography>
                    <Chip
                      label={days !== null && days >= 0 ? `${days} day${days === 1 ? '' : 's'} left` : 'Expired'}
                      color={days !== null && days >= 0 ? 'warning' : 'error'}
                      size="small"
                    />
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

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
            border: '1px solid rgba(255,255,255,0.08)',
            background: `linear-gradient(180deg, ${alpha('#ffffff', 0.04)}, ${alpha('#ffffff', 0.02)})`,
          }}
        >
          <CardContent>
            <SectionHeader
              eyebrow="Setup"
              title="Add your first products"
              caption="Go to Products and enter your real inventory to activate warnings, billing, and dashboard totals."
            />
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
}
