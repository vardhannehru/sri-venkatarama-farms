import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import type { CartItem, Product } from '../types';
import { mockProductsDb } from '../lib/mockDb';

const paymentMethods = ['Cash', 'UPI', 'Card', 'Mixed'] as const;

type PaymentMethod = (typeof paymentMethods)[number];

function money(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

export function BillingPage() {
  const [products] = useState<Product[]>(() => mockProductsDb.list());
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [received, setReceived] = useState(0);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return products
      .filter((p) => [p.name, p.sku, p.barcode].filter(Boolean).some((x) => String(x).toLowerCase().includes(s)))
      .slice(0, 8);
  }, [q, products]);

  const subtotal = useMemo(() => cart.reduce((a, x) => a + x.lineTotal, 0), [cart]);
  const total = Math.max(0, subtotal - discount);
  const balance = received - total;

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
      return [...prev, { productId: p.id, name: p.name, qty: 1, unitPrice: p.sellPrice, lineTotal: p.sellPrice }];
    });
    setQ('');
  }

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
      <Box sx={{ flex: 1, width: '100%' }}>
        <Typography variant="h6" fontWeight={800}>
          Billing / POS
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Type product name/SKU/barcode to add items.
        </Typography>

        <Card>
          <CardContent>
            <TextField
              label="Search product (or scan barcode)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              fullWidth
            />

            {matches.length ? (
              <Box sx={{ mt: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {matches.map((p) => (
                  <Box
                    key={p.id}
                    onClick={() => addToCart(p)}
                    sx={{
                      px: 1.5,
                      py: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography fontWeight={600}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.sku ?? '-'} • stock {p.stock}
                      </Typography>
                    </Box>
                    <Typography fontWeight={700}>₹ {money(p.sellPrice)}</Typography>
                  </Box>
                ))}
              </Box>
            ) : null}

            <Divider sx={{ my: 2 }} />

            <Typography fontWeight={700} gutterBottom>
              Cart
            </Typography>

            {cart.length === 0 ? (
              <Typography color="text.secondary">No items yet.</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {cart.map((it) => (
                  <Box
                    key={it.productId}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto auto',
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
              onClick={() => {
                // placeholder: later call POST /sales
                alert('Sale completed (demo). Next: wire backend + invoice print.');
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
