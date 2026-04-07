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
import { salesApi } from '../lib/salesApi';

const paymentMethods = ['Cash', 'UPI', 'Card', 'Mixed'] as const;
type PaymentMethod = (typeof paymentMethods)[number];
const quickBillingTypes = ['Quail Bird', 'Naatu Koodi', 'Other'] as const;
type QuickBillingType = (typeof quickBillingTypes)[number];

function money(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function capitalizeStart(value: string) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function paymentGroupFor(method: PaymentMethod) {
  return method === 'Cash' ? 'Cash' : 'Bank';
}

export function BillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [savedSales, setSavedSales] = useState<Awaited<ReturnType<typeof salesApi.list>>>([]);
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [received, setReceived] = useState('');
  const [quickType, setQuickType] = useState<QuickBillingType>('Quail Bird');
  const [quickOtherName, setQuickOtherName] = useState('');
  const [quickQty, setQuickQty] = useState('1');
  const [quickPrice, setQuickPrice] = useState('');
  const [dailyTarget, setDailyTarget] = useState(0);
  const [todaySoldBirds, setTodaySoldBirds] = useState(0);

  useEffect(() => {
    mockProductsDb.list().then(setProducts).catch(() => setProducts([]));
    dailyTargetDb.getTarget().then((target) => setDailyTarget(target.quantity)).catch(() => setDailyTarget(0));
    dailyTargetDb.getTodayQuantity().then(setTodaySoldBirds).catch(() => setTodaySoldBirds(0));
    salesApi.list().then(setSavedSales).catch(() => setSavedSales([]));
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))) as string[],
    [products]
  );
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    if (!selectedCategory && categories.length) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const visibleProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory]);
  const productStockById = useMemo(
    () => new Map(products.map((product) => [product.id, Math.max(0, Number(product.stock ?? 0))])),
    [products]
  );

  const discountValue = Math.max(0, Number(discount) || 0);
  const receivedValue = Math.max(0, Number(received) || 0);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.lineTotal, 0), [cart]);
  const total = Math.max(0, subtotal - discountValue);
  const balance = receivedValue - total;
  const remainingTarget = Math.max(0, dailyTarget - todaySoldBirds);
  const hasStockIssue = cart.some((item) => item.qty > (productStockById.get(item.productId) ?? 0));
  const missingCustomerDetails = !customerName.trim() || !customerPhone.trim();
  const quickQtyValue = Math.max(1, Number(quickQty) || 1);
  const quickPriceValue = Math.max(0, Number(quickPrice) || 0);
  const customerByPhone = useMemo(() => {
    const map = new Map<string, string>();
    for (const sale of savedSales) {
      const phone = sale.customerPhone?.trim() ?? '';
      const name = sale.customerName?.trim() ?? '';
      if (phone && name) {
        map.set(phone, name);
      }
    }
    return map;
  }, [savedSales]);
  const matchedCustomerName = customerByPhone.get(customerPhone.trim()) ?? '';

  function addQuickItem() {
    const itemName = quickType === 'Other' ? quickOtherName.trim() : quickType;
    if (!itemName || quickPriceValue <= 0) {
      return;
    }
    const id = `custom-${Date.now()}`;
    setCart((prev) => [
      ...prev,
      {
        productId: id,
        name: `${itemName} - Manual`,
        qty: quickQtyValue,
        unitPrice: quickPriceValue,
        lineTotal: quickQtyValue * quickPriceValue,
      },
    ]);
    setQtyDrafts((drafts) => ({ ...drafts, [id]: String(quickQtyValue) }));
    setQuickQty('1');
    setQuickPrice('');
    setQuickOtherName('');
    setQuickType('Quail Bird');
  }

  function addToCart(product: Product) {
    if (product.stock <= 0) {
      return;
    }
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === product.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        const current = next[existingIndex];
        const maxStock = productStockById.get(product.id) ?? 0;
        if (current.qty >= maxStock) {
          return prev;
        }
        const qty = current.qty + 1;
        setQtyDrafts((drafts) => ({ ...drafts, [product.id]: String(qty) }));
        next[existingIndex] = { ...current, qty, lineTotal: qty * current.unitPrice };
        return next;
      }
      setQtyDrafts((drafts) => ({ ...drafts, [product.id]: '1' }));
      return [
        ...prev,
        {
          productId: product.id,
          name: `${product.name} - ${product.category ?? 'Item'}`,
          qty: 1,
          unitPrice: product.sellPrice,
          lineTotal: product.sellPrice,
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
          Select a farm sales category and tap a box to add it to the bill.
        </Typography>
        {dailyTarget > 0 ? (
          <Typography variant="body2" sx={{ mb: 1.5, color: remainingTarget > 0 ? 'warning.light' : 'success.light' }}>
            {remainingTarget > 0
              ? `Daily target warning: ${remainingTarget} more birds needed to complete today's target.`
              : 'Daily target completed for today.'}
          </Typography>
        ) : null}

        <Card>
          <CardContent sx={{ display: 'grid', gap: 2 }}>
            {!products.length ? (
              <Box sx={{ minHeight: 220, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <Box sx={{ maxWidth: 320 }}>
                  <Typography variant="h6" fontWeight={900}>
                    No products added yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                    Add your real farm inventory in Products first, then billing boxes will appear here.
                  </Typography>
                </Box>
              </Box>
            ) : (
              <>
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}
                  >
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
                              ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, rgba(255,255,255,0.98))`
                              : 'rgba(255,255,255,0.98)',
                          boxShadow:
                            selectedCategory === category
                              ? `0 14px 30px ${alpha(theme.palette.primary.main, 0.1)}`
                              : 'none',
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

                <Box
                  sx={{
                    p: 1.4,
                    borderRadius: 3,
                    border: '1px solid rgba(15,23,42,0.08)',
                    background: 'rgba(248,250,252,0.9)',
                    display: 'grid',
                    gap: 1.2,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>
                      Quick Billing Entry
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Select Quail Bird, Naatu Koodi, or Other. If you choose Other, type the item name manually.
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                    <TextField
                      select
                      label="Item Type"
                      value={quickType}
                      onChange={(e) => setQuickType(e.target.value as QuickBillingType)}
                      fullWidth
                    >
                      {quickBillingTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                    {quickType === 'Other' ? (
                      <TextField
                        label="Other Item Name"
                        value={quickOtherName}
                        onChange={(e) => setQuickOtherName(capitalizeStart(e.target.value))}
                        fullWidth
                      />
                    ) : null}
                    <TextField
                      label="Qty"
                      type="number"
                      value={quickQty}
                      onChange={(e) => setQuickQty(e.target.value)}
                      sx={{ minWidth: 100 }}
                    />
                    <TextField
                      label="Price"
                      type="number"
                      value={quickPrice}
                      onChange={(e) => setQuickPrice(e.target.value)}
                      sx={{ minWidth: 120 }}
                    />
                    <Button
                      variant="outlined"
                      onClick={addQuickItem}
                      disabled={(quickType === 'Other' && !quickOtherName.trim()) || quickPriceValue <= 0}
                    >
                      Add
                    </Button>
                  </Stack>
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
                          cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
                          border:
                            product.stock > 0
                              ? '1px solid rgba(15,23,42,0.08)'
                              : '1px solid rgba(239,68,68,0.18)',
                          background:
                            product.stock > 0
                              ? 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,1))'
                              : 'linear-gradient(180deg, rgba(254,242,242,0.98), rgba(255,255,255,1))',
                          opacity: product.stock > 0 ? 1 : 0.72,
                          transition: 'all 160ms ease',
                          '&:hover': {
                            transform: product.stock > 0 ? 'translateY(-2px)' : 'none',
                            borderColor:
                              product.stock > 0
                                ? alpha(theme.palette.secondary.main, 0.45)
                                : alpha(theme.palette.error.main, 0.35),
                            boxShadow:
                              product.stock > 0
                                ? `0 16px 34px ${alpha(theme.palette.primary.main, 0.08)}`
                                : 'none',
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
                            label={product.stock > 0 ? `Stock ${product.stock}` : 'Out of stock'}
                            size="small"
                            sx={{
                              bgcolor: product.stock > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                              color: product.stock > 0 ? 'success.dark' : 'error.main',
                            }}
                          />
                        </Stack>
                        <Typography variant="h6" fontWeight={900} sx={{ mt: 1.4 }}>
                          {`\u20B9 ${money(product.sellPrice)}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {product.stock > 0 ? 'Tap to add to cart' : 'Stock finished'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </>
            )}

            <Divider />

            <Typography fontWeight={700}>Cart</Typography>

            {!cart.length ? (
              <Typography color="text.secondary">No items yet.</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {cart.map((item) => (
                  <Box
                    key={item.productId}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr auto auto auto' },
                      gap: 1,
                      alignItems: 'center',
                    }}
                  >
                    <Typography fontWeight={600}>{item.name}</Typography>
                    <TextField
                      size="small"
                      label="Qty"
                      type="text"
                      inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                      value={qtyDrafts[item.productId] ?? String(item.qty)}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, '');
                        setQtyDrafts((drafts) => ({ ...drafts, [item.productId]: raw }));
                        if (raw === '') {
                          return;
                        }
                        const maxStock = productStockById.get(item.productId) ?? 0;
                        const qty = Math.min(Math.max(1, Number(raw)), maxStock);
                        setCart((prev) =>
                          prev.map((current) =>
                            current.productId === item.productId
                              ? { ...current, qty, lineTotal: qty * current.unitPrice }
                              : current
                          )
                        );
                      }}
                      onBlur={() => {
                        const maxStock = productStockById.get(item.productId) ?? 0;
                        const raw = qtyDrafts[item.productId] ?? String(item.qty);
                        const qty = Math.min(Math.max(1, Number(raw) || item.qty), maxStock || item.qty);
                        setCart((prev) =>
                          prev.map((current) =>
                            current.productId === item.productId
                              ? { ...current, qty, lineTotal: qty * current.unitPrice }
                              : current
                          )
                        );
                        setQtyDrafts((drafts) => ({ ...drafts, [item.productId]: String(qty) }));
                      }}
                      sx={{ width: 90 }}
                    />
                    <Typography>{`\u20B9 ${money(item.unitPrice)}`}</Typography>
                    <Typography fontWeight={700}>{`\u20B9 ${money(item.lineTotal)}`}</Typography>
                  </Box>
                ))}
                {hasStockIssue ? (
                  <Typography color="error.main" variant="body2">
                    One or more cart items are above available stock. Reduce quantity to continue.
                  </Typography>
                ) : null}
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
            <TextField
              label="Customer phone"
              value={customerPhone}
              onChange={(e) => {
                const nextPhone = e.target.value.replace(/[^\d+\s-]/g, '');
                setCustomerPhone(nextPhone);
                const matchedName = customerByPhone.get(nextPhone.trim());
                if (matchedName) {
                  setCustomerName(matchedName);
                }
              }}
              required
              error={!customerPhone.trim()}
              helperText={!customerPhone.trim() ? 'Customer phone is required for every sale.' : matchedCustomerName ? `Customer found: ${matchedCustomerName}` : ' '}
            />
            <TextField
              label="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(capitalizeStart(e.target.value))}
              required
              error={!customerName.trim()}
              helperText={!customerName.trim() ? 'Customer name is required for every sale.' : ' '}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary">Subtotal</Typography>
              <Typography>{`\u20B9 ${money(subtotal)}`}</Typography>
            </Box>
            <TextField
              label="Discount"
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography fontWeight={800}>Total</Typography>
              <Typography fontWeight={800}>{`\u20B9 ${money(total)}`}</Typography>
            </Box>

            <TextField
              select
              label="Payment method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              {paymentMethods.map((method) => (
                <MenuItem key={method} value={method}>
                  {method}
                </MenuItem>
              ))}
            </TextField>

            <Chip
              label={`Collection goes to ${paymentGroupFor(paymentMethod)}`}
              size="small"
              color={paymentGroupFor(paymentMethod) === 'Cash' ? 'warning' : 'primary'}
              variant="outlined"
            />

            <TextField
              label="Received amount"
              type="number"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color={balance >= 0 ? 'success.main' : 'error.main'}>
                {balance >= 0 ? 'Change' : 'Due'}
              </Typography>
              <Typography color={balance >= 0 ? 'success.main' : 'error.main'} fontWeight={800}>
                {`\u20B9 ${money(Math.abs(balance))}`}
              </Typography>
            </Box>

            {missingCustomerDetails ? (
              <Typography color="error.main" variant="body2">
                Enter customer name and phone before saving the sale.
              </Typography>
            ) : null}

            <Button
              variant="contained"
              size="large"
              disabled={!cart.length || hasStockIssue || missingCustomerDetails}
              onClick={async () => {
                const totalBirds = cart.reduce((sum, item) => sum + item.qty, 0);
                await salesApi.create({
                  customerName: customerName.trim() || undefined,
                  customerPhone: customerPhone.trim() || undefined,
                  paymentMethod,
                  subtotal,
                  discount: discountValue,
                  total,
                  received: receivedValue,
                  balance,
                  totalQuantity: totalBirds,
                  items: cart.map((item) => {
                    const [name, category] = item.name.split(' - ');
                    return {
                      productId: item.productId,
                      name: name ?? item.name,
                      category: category || undefined,
                      qty: item.qty,
                      unitPrice: item.unitPrice,
                      lineTotal: item.lineTotal,
                    };
                  }),
                });
                setProducts(await mockProductsDb.list());
                setTodaySoldBirds(await dailyTargetDb.getTodayQuantity());
                alert('Sale saved successfully.');
                setCart([]);
                setQtyDrafts({});
                setCustomerName('');
                setCustomerPhone('');
                setDiscount('');
                setReceived('');
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
