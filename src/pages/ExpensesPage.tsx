import { Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import type { ExpenseRecord } from '../types';
import { expensesApi } from '../lib/expensesApi';

const expenseCategories: ExpenseRecord['category'][] = ['Feed', 'Labour', 'Electricity'];

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

export function ExpensesPage() {
  const [rows, setRows] = useState<ExpenseRecord[]>([]);
  const [category, setCategory] = useState<ExpenseRecord['category']>('Feed');
  const [amount, setAmount] = useState('');
  const [openingFeedKg, setOpeningFeedKg] = useState('');
  const [feedRatePerKg, setFeedRatePerKg] = useState('');
  const [feedReceivedKg, setFeedReceivedKg] = useState('');
  const [feedUsedKg, setFeedUsedKg] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    expensesApi.list().then(setRows).catch(() => setRows([]));
  }, []);

  const amountValue = Math.max(0, Number(amount) || 0);
  const openingFeedKgValue = Math.max(0, Number(openingFeedKg) || 0);
  const feedRatePerKgValue = Math.max(0, Number(feedRatePerKg) || 0);
  const feedReceivedKgValue = Math.max(0, Number(feedReceivedKg) || 0);
  const feedUsedKgValue = Math.max(0, Number(feedUsedKg) || 0);
  const isFeed = category === 'Feed';
  const calculatedFeedAmount = Number((feedUsedKgValue * feedRatePerKgValue).toFixed(2));
  const hasFeedEntry =
    openingFeedKg !== '' || feedReceivedKgValue > 0 || feedUsedKgValue > 0 || feedRatePerKgValue > 0;

  async function saveExpense() {
    const finalAmount = isFeed ? calculatedFeedAmount : amountValue;
    if (isFeed) {
      if (!hasFeedEntry) return;
    } else if (finalAmount <= 0) {
      return;
    }
    const saved = await expensesApi.create({
      category,
      amount: finalAmount,
      openingFeedKg: isFeed && openingFeedKg !== '' ? openingFeedKgValue : undefined,
      feedRatePerKg: isFeed ? feedRatePerKgValue : undefined,
      feedReceivedKg: isFeed ? feedReceivedKgValue : undefined,
      feedUsedKg: isFeed ? feedUsedKgValue : undefined,
      notes: notes.trim() || undefined,
    });
    setRows((prev) => [saved, ...prev]);
    setAmount('');
    setOpeningFeedKg('');
    setFeedRatePerKg('');
    setFeedReceivedKg('');
    setFeedUsedKg('');
    setNotes('');
    setCategory('Feed');
  }

  const totalExpenses = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant="h5" fontWeight={900}>
          Farm Expenses
        </Typography>
        <Typography color="text.secondary">
          Record feed, labour, and electricity so the farm costs are tracked properly.
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              label="Expense Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseRecord['category'])}
              fullWidth
            >
              {expenseCategories.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              disabled={isFeed}
              helperText={isFeed ? 'Calculated automatically from feed used x rate per KG.' : ' '}
            />
            <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />
          </Stack>

          {isFeed ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' },
                gap: 2,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  border: '1px solid rgba(15,23,42,0.08)',
                  background: 'rgba(255,255,255,0.96)',
                  display: 'grid',
                  gap: 1.2,
                }}
              >
                <Box>
                  <Typography fontWeight={800}>Feed Entry</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enter feed stock brought forward and any feed received today.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Opening Feed Stock (KG)"
                    type="number"
                    value={openingFeedKg}
                    onChange={(e) => setOpeningFeedKg(e.target.value)}
                    fullWidth
                    helperText="Use this on the first day or whenever you need to correct feed balance."
                  />
                  <TextField
                    label="Feed Received (KG)"
                    type="number"
                    value={feedReceivedKg}
                    onChange={(e) => setFeedReceivedKg(e.target.value)}
                    fullWidth
                  />
                </Stack>
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  border: '1px solid rgba(15,23,42,0.08)',
                  background: 'rgba(255,255,255,0.96)',
                  display: 'grid',
                  gap: 1.2,
                }}
              >
                <Box>
                  <Typography fontWeight={800}>Feed Usage</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enter how much feed birds used today. Feed cost is calculated automatically.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Feed Rate Per KG"
                    type="number"
                    value={feedRatePerKg}
                    onChange={(e) => setFeedRatePerKg(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Feed Used (KG)"
                    type="number"
                    value={feedUsedKg}
                    onChange={(e) => setFeedUsedKg(e.target.value)}
                    fullWidth
                  />
                </Stack>
              </Box>
            </Box>
          ) : null}

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography fontWeight={800}>{`\u20B9 ${money(totalExpenses)}`} total expenses</Typography>
              {isFeed ? (
                <Typography variant="body2" color="text.secondary">
                  Feed cost auto-calculated: {`\u20B9 ${money(calculatedFeedAmount)}`}
                </Typography>
              ) : null}
            </Box>
            <Button variant="contained" onClick={() => void saveExpense()}>
              Save Expense
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 1.2 }}>
          <Typography fontWeight={800}>Recent expenses</Typography>
          {!rows.length ? (
            <Typography color="text.secondary">No expenses recorded yet.</Typography>
          ) : (
            rows.map((row) => (
              <Box
                key={row.id}
                sx={{
                  p: 1.3,
                  borderRadius: 3,
                  border: '1px solid rgba(15,23,42,0.08)',
                  display: 'grid',
                  gap: 1.1,
                }}
              >
                {row.category === 'Feed' ? (
                  <>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.75fr 0.75fr 0.75fr 0.75fr 0.8fr' },
                        gap: 1,
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography fontWeight={800}>Feed</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {fmtDate(row.createdAt)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Opening</Typography>
                        <Typography fontWeight={800}>{row.openingFeedKg ?? 0} KG</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Received</Typography>
                        <Typography fontWeight={800}>{row.feedReceivedKg ?? 0} KG</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Used</Typography>
                        <Typography fontWeight={800}>{row.feedUsedKg ?? 0} KG</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Rate</Typography>
                        <Typography fontWeight={800}>{`\u20B9 ${money(row.feedRatePerKg ?? 0)}`}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Amount</Typography>
                        <Typography fontWeight={800}>{`\u20B9 ${money(row.amount)}`}</Typography>
                      </Box>
                    </Box>
                    {row.notes ? (
                      <Typography color="text.secondary" variant="body2">
                        {row.notes}
                      </Typography>
                    ) : null}
                  </>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr 0.8fr 1fr' },
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography fontWeight={800}>{row.category}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {fmtDate(row.createdAt)}
                      </Typography>
                    </Box>
                    <Typography fontWeight={800}>{`\u20B9 ${money(row.amount)}`}</Typography>
                    <Typography color="text.secondary">{row.notes || 'No notes'}</Typography>
                  </Box>
                )}
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
