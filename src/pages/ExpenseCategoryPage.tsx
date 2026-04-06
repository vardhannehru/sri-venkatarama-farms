import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { ExpenseRecord } from '../types';
import { expensesApi } from '../lib/expensesApi';

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

type CategoryPageProps = {
  category: ExpenseRecord['category'];
  title: string;
  subtitle: string;
};

export function ExpenseCategoryPage({ category, title, subtitle }: CategoryPageProps) {
  const [rows, setRows] = useState<ExpenseRecord[]>([]);
  const [amount, setAmount] = useState('');
  const [openingFeedKg, setOpeningFeedKg] = useState('');
  const [feedRatePerKg, setFeedRatePerKg] = useState('');
  const [feedReceivedKg, setFeedReceivedKg] = useState('');
  const [feedUsedKg, setFeedUsedKg] = useState('');
  const [notes, setNotes] = useState('');

  const isFeed = category === 'Feed';

  useEffect(() => {
    expensesApi
      .list()
      .then((data) => setRows(data.filter((row) => row.category === category)))
      .catch(() => setRows([]));
  }, [category]);

  const amountValue = Math.max(0, Number(amount) || 0);
  const openingFeedKgValue = Math.max(0, Number(openingFeedKg) || 0);
  const feedRatePerKgValue = Math.max(0, Number(feedRatePerKg) || 0);
  const feedReceivedKgValue = Math.max(0, Number(feedReceivedKg) || 0);
  const feedUsedKgValue = Math.max(0, Number(feedUsedKg) || 0);
  const calculatedFeedAmount = Number((feedUsedKgValue * feedRatePerKgValue).toFixed(2));
  const autoFeedRate = feedUsedKgValue > 0 && amountValue > 0 ? Number((amountValue / feedUsedKgValue).toFixed(2)) : 0;
  const finalFeedAmount = amountValue > 0 ? amountValue : calculatedFeedAmount;
  const finalFeedRate =
    feedUsedKgValue > 0 && finalFeedAmount > 0 ? Number((finalFeedAmount / feedUsedKgValue).toFixed(2)) : feedRatePerKgValue;
  const hasFeedEntry =
    openingFeedKg !== '' || feedReceivedKgValue > 0 || feedUsedKgValue > 0 || feedRatePerKgValue > 0 || amountValue > 0;

  async function saveEntry() {
    const finalAmount = isFeed ? finalFeedAmount : amountValue;
    if (isFeed) {
      if (!hasFeedEntry) return;
    } else if (finalAmount <= 0) {
      return;
    }

    const saved = await expensesApi.create({
      category,
      amount: finalAmount,
      openingFeedKg: isFeed && openingFeedKg !== '' ? openingFeedKgValue : undefined,
      feedRatePerKg: isFeed ? finalFeedRate : undefined,
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
  }

  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows]);

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant="h5" fontWeight={900}>
          {title}
        </Typography>
        <Typography color="text.secondary">{subtitle}</Typography>
      </Box>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label={isFeed ? 'Total Feed Cost' : `${category} Amount`}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              helperText={
                isFeed ? 'Enter total feed cost directly. Rate per KG is worked out automatically.' : 'Enter the amount for this entry.'
              }
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
                  <Typography fontWeight={800}>Feed Stock</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use these only when you want to track opening stock and received feed.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Opening Feed Stock (KG)"
                    type="number"
                    value={openingFeedKg}
                    onChange={(e) => setOpeningFeedKg(e.target.value)}
                    fullWidth
                    helperText="Use this on the first day or to correct feed balance."
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
                  <Typography fontWeight={800}>Daily Feed Entry</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enter how much feed birds ate today and how much it cost.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Feed Used (KG)"
                    type="number"
                    value={feedUsedKg}
                    onChange={(e) => setFeedUsedKg(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Feed Rate Per KG (Optional)"
                    type="number"
                    value={feedRatePerKg}
                    onChange={(e) => setFeedRatePerKg(e.target.value)}
                    fullWidth
                    helperText={amountValue > 0 && feedUsedKgValue > 0 ? `Auto rate: ₹ ${money(autoFeedRate)}` : 'Leave empty if you enter total feed cost above.'}
                  />
                </Stack>
              </Box>
            </Box>
          ) : null}

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography fontWeight={800}>{`₹ ${money(totalAmount)}`} total {category.toLowerCase()} amount</Typography>
              {isFeed ? (
                <Typography variant="body2" color="text.secondary">
                  Feed amount: {`₹ ${money(finalFeedAmount)}`} {feedUsedKgValue > 0 && finalFeedRate > 0 ? `| Rate ₹ ${money(finalFeedRate)} / KG` : ''}
                </Typography>
              ) : null}
            </Box>
            <Button variant="contained" onClick={() => void saveEntry()}>
              {isFeed ? 'Save Feed' : `Save ${category}`}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 1.2 }}>
          <Typography fontWeight={800}>Recent {category.toLowerCase()} entries</Typography>
          {!rows.length ? (
            <Typography color="text.secondary">No {category.toLowerCase()} entries recorded yet.</Typography>
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
                        <Typography fontWeight={800}>{`₹ ${money(row.feedRatePerKg ?? 0)}`}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Amount</Typography>
                        <Typography fontWeight={800}>{`₹ ${money(row.amount)}`}</Typography>
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
                    <Typography fontWeight={800}>{`₹ ${money(row.amount)}`}</Typography>
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

export function FeedPage() {
  return (
    <ExpenseCategoryPage
      category="Feed"
      title="Feed"
      subtitle="Keep feed entry separate so salesmen can record quantity used and total cost quickly."
    />
  );
}

export function LabourPage() {
  return (
    <ExpenseCategoryPage
      category="Labour"
      title="Labour"
      subtitle="Record labour payments separately from feed and electricity."
    />
  );
}

export function ElectricityPage() {
  return (
    <ExpenseCategoryPage
      category="Electricity"
      title="Electricity"
      subtitle="Record electricity charges separately so they don’t get mixed with feed or labour."
    />
  );
}
