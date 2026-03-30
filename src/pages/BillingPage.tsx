import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { CartItem, Product } from '../types';
import { mockProductsDb } from '../lib/mockDb';
import { dailyTargetDb } from '../lib/dailyTargetDb';

const paymentMethods = ['Cash', 'UPI', 'Card', 'Mixed'] as const;

type PaymentMethod = (typeof paymentMethods)[number];

function money(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

export function BillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [received, setReceived] = useState(0);
  const [dailyTarget, setDailyTarget] = useState(0);
  const [todaySoldBirds, setTodaySoldBirds] = useState(0);

  useEffect(() => {
    mockProductsDb.list().then(setProducts).catch(() => setProducts([]));
    dailyTargetDb.getTarget().then((target) => setDailyTarget(target.quantity)).catch(() => setDailyTarget(0));
    dailyTargetDb.getTodayQuantity().then(setTodaySoldBirds).catch(() => setTodaySoldBirds(0));
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))) as string[],
    [products]
  );

  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] ?? '');

  useEffect(() => {
    if (!selectedCategory && categories.length) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const visibleProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory]);

  const subtotal = useMemo(() => cart.reduce((a, x) => a + x.lineTotal, 0), [cart]);
  const total = Math.max(0, subtotal - discount);
  const balance = received - total;
  const remainingTarget = Math.max(0, dailyTarget - todaySoldBirds);

  function addToCart(p: Product) {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.productId === p.id);
      if (idx >= 0) {
        const next = [...prev];
        const it = next[idx];
        const qty = it.qty + 1;
        next[idx] = { ...it, qty, lineTotal: qty * it.unitPrice };
        return next;
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: `${p.name} - ${p.category ?? 'Item'}`,
          qty: 1,
          unitPrice: p.sellPrice,
          lineTotal: p.sellPrice,
        },
      ];
    });
  }

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
      <Box sx={{ flex: 1, width: '100%' }}>
        <Typography variant="h6" fontWeight={800}>
          Billing / POS
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Select a Kouju Pitta category and tap a box to add it to the bill.
        </Typography>
        {dailyTarget > 0 ? (
          <Typography variant="body2" sx={{ mb: 1.5, color: remainingTarget > 0 ? 'warning.light' : 'success.light' }}>
            {remainingTarget > 0
              ? `Daily target warning: ${remainingTarget} more quail birds needed to complete today's target.`
              : 'Daily target completed for today.'}
          </Typography>
        ) : null}

        <Card>
          <CardContent sx={{ display: 'grid', gap: 2 }}>
            {!products.length ? (
              <Box
                sx={{
                  minHeight: 220,
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                }}
              >
                <Box sx={{ maxWidth: 320 }}>
                  <Typography variant="h6" fontWeight={900}>
                    No products added yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                    Add your real inventory in Products first, then billing boxes will appear here.
                  </Typography>
                </Box>
              </Box>
            ) : (
              <>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Categories
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                      gap: 1.2,
                    }}
                  >
                    {categories.map((category) => (
                      <Box
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        sx={(theme) => ({
                          p: 1.5,
                          borderRadius: 3,
                          cursor: 'pointer',
                          border:
                            selectedCategory === category
                              ? `1px solid ${alpha(theme.palette.primary.main, 0.6)}`
                              : '1px solid rgba(15,23,42,0.08)',
                          background:
                            selectedCategory === category
                              ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.10)}, rgba(255,255,255,0.98))`
                              : 'rgba(255,255,255,0.98)',
                          boxShadow:
                            selectedCategory === category ? `0 14px 30px ${alpha(theme.palette.primary.main, 0.10)}` : 'none',
                          transition: 'all 160ms ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            borderColor: alpha(theme.palette.primary.main, 0.42),
                          },
                        })}
                      >
                        <Typography fontWeight={900}>{category}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Select to view items
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Divider />

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
                    <Typography variant="subtitle1" fontWeight={800}>
                      {selectedCategory || 'Items'}
                    </Typography>
                    <Chip
                      label={`${visibleProducts.length} item${visibleProducts.length === 1 ? '' : 's'}`}
                      size="small"
                      sx={{ bgcolor: 'rgba(15,23,42,0.05)' }}
                    />
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                      gap: 1.2,
                    }}
                  >
                    {visibleProducts.map((product) => (
                      <Box
                        key={product.id}
                        onClick={() => addToCart(product)}
                        sx={(theme) => ({
                          p: 1.6,
                          borderRadius: 3,
                          cursor: 'pointer',
                          border: '1px solid rgba(15,23,42,0.08)',
                          background:
                            'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,1))',
                          transition: 'all 160ms ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            borderColor: alpha(theme.palette.secondary.main, 0.45),
                            boxShadow: `0 16px 34px ${alpha(theme.palette.primary.main, 0.08)}`,
                          },
                        })}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                          <Box>
                            <Typography fontWeight={900}>{product.name}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                              {product.category}
                            </Typography>
                          </Box>
                          <Chip
                            label={`Stock ${product.stock}`}
                            size="small"
                            sx={{ bgcolor: 'rgba(34,197,94,0.12)', color: '#bbf7d0' }}
                          />
                        </Stack>
                        <Typography variant="h6" fontWeight={900} sx={{ mt: 1.4 }}>
                          ₹ {money(product.sellPrice)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tap to add to cart
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </>
            )}

            <Divider />

            <Typography fontWeight={700}>Cart</Typography>

            {cart.length === 0 ? (
              <Typography color="text.secondary">No items yet.</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {cart.map((it) => (
                  <Box
                    key={it.productId}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr auto auto auto' },
                      gap: 1,
                      alignItems: 'center',
                    }}
                  >
                    <Typography fontWeight={600}>{it.name}</Typography>
                    <TextField
                      size="small"
                      label="Qty"
                      type="number"
                      value={it.qty}
                      onChange={(e) => {
                        const qty = Math.max(1, Number(e.target.value));
                        setCart((prev) =>
                          prev.map((x) =>
                            x.productId === it.productId
                              ? { ...x, qty, lineTotal: qty * x.unitPrice }
                              : x
                          )
                        );
                      }}
                      sx={{ width: 90 }}
                    />
                    <Typography>₹ {money(it.unitPrice)}</Typography>
                    <Typography fontWeight={700}>₹ {money(it.lineTotal)}</Typography>
                  </Box>
                ))}
                <Button color="error" onClick={() => setCart([])}>
                  Clear cart
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ width: { xs: '100%', md: 380 }, position: { md: 'sticky' }, top: { md: 88 } }}>
        <Card>
          <CardContent sx={{ display: 'grid', gap: 1.5 }}>
            <Typography fontWeight={800}>Totals</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Subtotal</Typography>
              <Typography>₹ {money(subtotal)}</Typography>
            </Box>
            <TextField
              label="Discount"
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
            />
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography fontWeight={800}>Total</Typography>
              <Typography fontWeight={800}>₹ {money(total)}</Typography>
            </Box>

            <TextField
              select
              label="Payment method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              {paymentMethods.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Received amount"
              type="number"
              value={received}
              onChange={(e) => setReceived(Math.max(0, Number(e.target.value)))}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color={balance >= 0 ? 'success.main' : 'error.main'}>
                {balance >= 0 ? 'Change' : 'Due'}
              </Typography>
              <Typography color={balance >= 0 ? 'success.main' : 'error.main'} fontWeight={800}>
                ₹ {money(Math.abs(balance))}
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              disabled={cart.length === 0}
              onClick={async () => {
                const totalBirds = cart.reduce((sum, item) => sum + item.qty, 0);
                const updated = await dailyTargetDb.addSale(totalBirds);
                setTodaySoldBirds(updated);
                alert('Sale completed successfully. Daily target progress updated.');
                setCart([]);
                setDiscount(0);
                setReceived(0);
                setPaymentMethod('Cash');
              }}
            >
              Complete Sale
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
