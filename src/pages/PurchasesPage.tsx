import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { PurchaseRecord } from '../types';
import { purchasesApi } from '../lib/purchasesApi';

const birdTypes = ['Quail Bird Live', 'Natukodi'] as const;

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

export function PurchasesPage() {
  const [rows, setRows] = useState<PurchaseRecord[]>([]);
  const [birdType, setBirdType] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadPurchases() {
    try {
      const list = await purchasesApi.list();
      setRows(list);
      setError('');
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'Unable to load purchases');
    }
  }

  useEffect(() => {
    void loadPurchases();
  }, []);

  const birdTypeSuggestions = useMemo(
    () =>
      [...new Set([...birdTypes, ...rows.map((row) => row.birdType).filter(Boolean)])].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const quantityValue = Math.max(0, Number(quantity) || 0);
  const unitCostValue = Math.max(0, Number(unitCost) || 0);
  const sellPriceValue = Math.max(0, Number(sellPrice) || 0);
  const totalCost = useMemo(() => Math.max(0, quantityValue * unitCostValue), [quantityValue, unitCostValue]);

  async function savePurchase() {
    if (!birdType || quantityValue <= 0) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await purchasesApi.create({
        birdType,
        quantity: quantityValue,
        unitCost: unitCostValue,
        sellPrice: sellPriceValue,
        totalCost,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      await loadPurchases();
      setQuantity('');
      setUnitCost('');
      setSellPrice('');
      setSupplier('');
      setNotes('');
      setSuccess('Purchase saved. Stock, base cost, and selling price updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save purchase');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant="h5" fontWeight={900}>
          Purchases
        </Typography>
        <Typography color="text.secondary">
          Record bird purchases first. You can type a new item name here, and the app will create or update it automatically.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Box sx={{ width: '100%' }}>
              <TextField
                label="Item Name"
                value={birdType}
                onChange={(e) => setBirdType(e.target.value)}
                placeholder="Type a new bird or item name"
                fullWidth
                inputProps={{ list: 'purchase-item-suggestions' }}
              />
              <datalist id="purchase-item-suggestions">
                {birdTypeSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </Box>
            <TextField
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              fullWidth
            />
            <TextField
              label="Unit Cost"
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              fullWidth
            />
            <TextField
              label="Sale Price"
              type="number"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} fullWidth />
            <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Purchase cost can still change daily from feed and farm expenses. New item names saved here will also be created in Products automatically.
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={800}>{`\u20B9 ${money(totalCost)}`}</Typography>
            <Button variant="contained" onClick={() => void savePurchase()} disabled={loading}>
              Save Purchase
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 1.2 }}>
          <Typography fontWeight={800}>Recent purchases</Typography>
          {!rows.length ? (
            <Typography color="text.secondary">No purchases recorded yet.</Typography>
          ) : (
            rows.map((row) => (
              <Box
                key={row.id}
                sx={{
                  p: 1.3,
                  borderRadius: 3,
                  border: '1px solid rgba(15,23,42,0.08)',
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.7fr 0.7fr 0.7fr 0.8fr' },
                  gap: 1,
                }}
              >
                <Box>
                  <Typography fontWeight={800}>{row.birdType}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {fmtDate(row.createdAt)} {row.supplier ? `• ${row.supplier}` : ''}
                  </Typography>
                </Box>
                <Typography>{row.quantity} birds</Typography>
                <Typography>{`\u20B9 ${money(row.unitCost)} / bird`}</Typography>
                <Typography>{`\u20B9 ${money(row.sellPrice)} sale`}</Typography>
                <Typography fontWeight={800}>{`\u20B9 ${money(row.totalCost)}`}</Typography>
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
