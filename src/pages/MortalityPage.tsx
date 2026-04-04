import { Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import type { MortalityRecord } from '../types';
import { mortalitiesApi } from '../lib/mortalitiesApi';

const birdTypes = ['Quail Bird Live', 'Naatu Koodi'] as const;

function fmtDate(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MortalityPage() {
  const [rows, setRows] = useState<MortalityRecord[]>([]);
  const [birdType, setBirdType] = useState<string>(birdTypes[0]);
  const [quantity, setQuantity] = useState('');
  const [sickQuantity, setSickQuantity] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    mortalitiesApi.list().then(setRows).catch(() => setRows([]));
  }, []);

  const quantityValue = Math.max(0, Number(quantity) || 0);
  const sickQuantityValue = Math.max(0, Number(sickQuantity) || 0);

  async function saveMortality() {
    if (!birdType || (quantityValue <= 0 && sickQuantityValue <= 0)) return;
    const saved = await mortalitiesApi.create({
      birdType,
      quantity: quantityValue,
      sickQuantity: sickQuantityValue || undefined,
      notes: notes.trim() || undefined,
    });
    setRows((prev) => [saved, ...prev]);
    setQuantity('');
    setSickQuantity('');
    setNotes('');
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant="h5" fontWeight={900}>
          Mortality
        </Typography>
        <Typography color="text.secondary">
          Record bird deaths and sick birds here. Death count reduces live stock automatically.
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField select label="Bird Type" value={birdType} onChange={(e) => setBirdType(e.target.value)} fullWidth>
              {birdTypes.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              fullWidth
            />
            <TextField
              label="Sick Birds"
              type="number"
              value={sickQuantity}
              onChange={(e) => setSickQuantity(e.target.value)}
              fullWidth
            />
            <TextField label="Notes / Reason" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />
          </Stack>
          <Stack direction="row" justifyContent="flex-end">
            <Button variant="contained" color="error" onClick={() => void saveMortality()}>
              Save Mortality
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 1.2 }}>
          <Typography fontWeight={800}>Mortality records</Typography>
          {!rows.length ? (
            <Typography color="text.secondary">No mortality records yet.</Typography>
          ) : (
            rows.map((row) => (
              <Box
                key={row.id}
                sx={{
                  p: 1.3,
                  borderRadius: 3,
                  border: '1px solid rgba(15,23,42,0.08)',
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.6fr 1fr' },
                  gap: 1,
                }}
              >
                <Box>
                  <Typography fontWeight={800}>{row.birdType}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {fmtDate(row.createdAt)}
                  </Typography>
                </Box>
                <Typography fontWeight={800}>{row.quantity} died{row.sickQuantity ? ` • ${row.sickQuantity} sick` : ''}</Typography>
                <Typography color="text.secondary">{row.notes || 'No notes'}</Typography>
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
