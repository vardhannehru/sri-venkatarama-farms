import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { ExpenseRecord } from '../types';
import { expensesApi } from '../lib/expensesApi';

function money(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function capitalizeStart(value: string) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  const [larvaEggGrams, setLarvaEggGrams] = useState('');
  const [larvaCost, setLarvaCost] = useState('');
  const [ethanolSyrup, setEthanolSyrup] = useState('');
  const [brokenRiceCake, setBrokenRiceCake] = useState('');
  const [larvaOthers, setLarvaOthers] = useState('');
  const [larvaLabour, setLarvaLabour] = useState('');
  const [quailFeedLarva, setQuailFeedLarva] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [birdType, setBirdType] = useState<'Quail Bird' | 'Naatu Koodi'>('Quail Bird');

  const isFeed = category === 'Feed';
  const isLarva = category === 'Larva';

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
  const larvaCostValue = Math.max(0, Number(larvaCost) || 0);
  const ethanolSyrupValue = Math.max(0, Number(ethanolSyrup) || 0);
  const brokenRiceCakeValue = Math.max(0, Number(brokenRiceCake) || 0);
  const larvaOthersValue = Math.max(0, Number(larvaOthers) || 0);
  const larvaLabourValue = Math.max(0, Number(larvaLabour) || 0);
  const quailFeedLarvaValue = Math.max(0, Number(quailFeedLarva) || 0);
  const calculatedFeedAmount = Number((feedUsedKgValue * feedRatePerKgValue).toFixed(2));
  const autoFeedRate = feedUsedKgValue > 0 && amountValue > 0 ? Number((amountValue / feedUsedKgValue).toFixed(2)) : 0;
  const finalFeedAmount = amountValue > 0 ? amountValue : calculatedFeedAmount;
  const finalFeedRate =
    feedUsedKgValue > 0 && finalFeedAmount > 0 ? Number((finalFeedAmount / feedUsedKgValue).toFixed(2)) : feedRatePerKgValue;
  const hasFeedEntry =
    openingFeedKg !== '' || feedReceivedKgValue > 0 || feedUsedKgValue > 0 || feedRatePerKgValue > 0 || amountValue > 0 || larvaCostValue > 0;
  const finalLarvaAmount =
    larvaCostValue +
    ethanolSyrupValue +
    brokenRiceCakeValue +
    larvaOthersValue +
    larvaLabourValue +
    quailFeedLarvaValue;
  const hasLarvaEntry =
    larvaEggGrams.trim() !== '' ||
    larvaCostValue > 0 ||
    ethanolSyrupValue > 0 ||
    brokenRiceCakeValue > 0 ||
    larvaOthersValue > 0 ||
    larvaLabourValue > 0 ||
    quailFeedLarvaValue > 0;

  async function saveEntry() {
    setError('');
    const finalAmount = isFeed ? finalFeedAmount : isLarva ? finalLarvaAmount : amountValue;
    if (isFeed) {
      if (!hasFeedEntry) {
        setError('Enter opening stock, received feed, used feed, or feed cost.');
        return;
      }
      if (!birdType) {
        setError('Select Quail Bird or Naatu Koodi for this feed entry.');
        return;
      }
    } else if (isLarva) {
      if (!hasLarvaEntry) {
        setError('Enter larva growing cost details.');
        return;
      }
      if (!birdType) {
        setError('Select Quail Bird or Naatu Koodi for this larva entry.');
        return;
      }
    } else if (finalAmount <= 0) {
      setError(`Enter a valid ${category.toLowerCase()} amount.`);
      return;
    }

    try {
      const saved = await expensesApi.create({
        category,
        birdType: isFeed || isLarva ? birdType : undefined,
        amount: finalAmount,
        openingFeedKg: isFeed && openingFeedKg !== '' ? openingFeedKgValue : undefined,
        feedRatePerKg: isFeed ? finalFeedRate : undefined,
        feedReceivedKg: isFeed ? feedReceivedKgValue : undefined,
        feedUsedKg: isFeed ? feedUsedKgValue : undefined,
        larvaEggGrams: isLarva ? larvaEggGrams.trim() || undefined : undefined,
        larvaCost: isFeed || isLarva ? larvaCostValue : undefined,
        ethanolSyrup: isLarva ? ethanolSyrupValue : undefined,
        brokenRiceCake: isLarva ? brokenRiceCakeValue : undefined,
        others: isLarva ? larvaOthersValue : undefined,
        labourCost: isLarva ? larvaLabourValue : undefined,
        quailFeedLarva: isLarva ? quailFeedLarvaValue : undefined,
        notes: notes.trim() || undefined,
      });

      setRows((prev) => [saved, ...prev]);
      setAmount('');
      setOpeningFeedKg('');
      setFeedRatePerKg('');
      setFeedReceivedKg('');
      setFeedUsedKg('');
      setLarvaCost('');
      setLarvaEggGrams('');
      setEthanolSyrup('');
      setBrokenRiceCake('');
      setLarvaOthers('');
      setLarvaLabour('');
      setQuailFeedLarva('');
      setNotes('');
      setBirdType('Quail Bird');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this entry.');
    }
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
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {isFeed || isLarva ? (
              <TextField
                select
                label="For"
                value={birdType}
                onChange={(e) => setBirdType(e.target.value as 'Quail Bird' | 'Naatu Koodi')}
                fullWidth
              >
                <MenuItem value="Quail Bird">Quail Bird</MenuItem>
                <MenuItem value="Naatu Koodi">Naatu Koodi</MenuItem>
              </TextField>
            ) : null}
            <TextField
              label={isFeed ? 'Total Feed Cost' : isLarva ? 'Larva Total (Auto)' : `${category} Amount`}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              disabled={isLarva}
              helperText={
                isFeed
                  ? 'Enter total feed cost directly. Rate per KG is worked out automatically.'
                  : isLarva
                    ? 'This total is calculated from the larva growing cost fields below.'
                    : 'Enter the amount for this entry.'
              }
            />
            <TextField label="Notes" value={notes} onChange={(e) => setNotes(capitalizeStart(e.target.value))} fullWidth />
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
                  <TextField
                    label="Larva Fed Cost"
                    type="number"
                    value={larvaCost}
                    onChange={(e) => setLarvaCost(e.target.value)}
                    fullWidth
                    helperText="Optional. Enter larva cost fed to this bird type today."
                  />
                </Stack>
              </Box>
            </Box>
          ) : null}

          {isLarva ? (
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
                <Typography fontWeight={800}>Larva Growing Cost</Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter larva-growing cost and the stage-wise feeding cost here. The app adds everything and pushes the total into the daily report.
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Larva Egg (Grams)" value={larvaEggGrams} onChange={(e) => setLarvaEggGrams(capitalizeStart(e.target.value))} fullWidth />
                <TextField label="Larva Cost" type="number" value={larvaCost} onChange={(e) => setLarvaCost(e.target.value)} fullWidth />
                <TextField label="Ethanol Syrup" type="number" value={ethanolSyrup} onChange={(e) => setEthanolSyrup(e.target.value)} fullWidth />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Broken Rice Cake" type="number" value={brokenRiceCake} onChange={(e) => setBrokenRiceCake(e.target.value)} fullWidth />
                <TextField label="Others" type="number" value={larvaOthers} onChange={(e) => setLarvaOthers(e.target.value)} fullWidth />
                <TextField label="Labour" type="number" value={larvaLabour} onChange={(e) => setLarvaLabour(e.target.value)} fullWidth />
                <TextField label="Quail Feed Larva" type="number" value={quailFeedLarva} onChange={(e) => setQuailFeedLarva(e.target.value)} fullWidth />
              </Stack>
            </Box>
          ) : null}

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography fontWeight={800}>{`₹ ${money(totalAmount)}`} total {category.toLowerCase()} amount</Typography>
              {isFeed ? (
                <Typography variant="body2" color="text.secondary">
                  Feed amount: {`₹ ${money(finalFeedAmount)}`} {feedUsedKgValue > 0 && finalFeedRate > 0 ? `| Rate ₹ ${money(finalFeedRate)} / KG` : ''}{larvaCostValue > 0 ? ` | Larva ₹ ${money(larvaCostValue)}` : ''}
                </Typography>
              ) : null}
              {isLarva ? (
                <Typography variant="body2" color="text.secondary">
                  Larva growing cost total: {`Rs ${money(finalLarvaAmount)}`}
                </Typography>
              ) : null}
            </Box>
            <Button variant="contained" onClick={() => void saveEntry()}>
              {isFeed ? 'Save Feed' : isLarva ? 'Save Larva Cost' : `Save ${category}`}
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
                          {row.birdType ? `${row.birdType} | ` : ''}{fmtDate(row.createdAt)}
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
                      <Box>
                        <Typography variant="body2" color="text.secondary">Larva</Typography>
                        <Typography fontWeight={800}>{`₹ ${money(row.larvaCost ?? 0)}`}</Typography>
                      </Box>
                    </Box>
                    {row.notes ? (
                      <Typography color="text.secondary" variant="body2">
                        {row.notes}
                      </Typography>
                    ) : null}
                  </>
                ) : row.category === 'Larva' ? (
                  <>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr' },
                        gap: 1,
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography fontWeight={800}>Larva</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {row.birdType ? `${row.birdType} | ` : ''}{fmtDate(row.createdAt)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Egg Gms</Typography>
                        <Typography fontWeight={800}>{row.larvaEggGrams || '-'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Larva</Typography>
                        <Typography fontWeight={800}>{`Rs ${money(row.larvaCost ?? 0)}`}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Syrup</Typography>
                        <Typography fontWeight={800}>{`Rs ${money(row.ethanolSyrup ?? 0)}`}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Rice Cake</Typography>
                        <Typography fontWeight={800}>{`Rs ${money(row.brokenRiceCake ?? 0)}`}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Others</Typography>
                        <Typography fontWeight={800}>{`Rs ${money(row.others ?? 0)}`}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Labour</Typography>
                        <Typography fontWeight={800}>{`Rs ${money(row.labourCost ?? 0)}`}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Total</Typography>
                        <Typography fontWeight={800}>{`Rs ${money(row.amount)}`}</Typography>
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
export function LarvaPage() {
  return (
    <ExpenseCategoryPage
      category="Larva"
      title="Larva"
      subtitle="Record daily larva cost separately so it shows clearly in the daily report."
    />
  );
}
