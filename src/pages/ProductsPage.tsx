import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import type { MortalityRecord, Product, PurchaseRecord } from '../types';
import { hasRole } from '../lib/auth';
import { mockProductsDb } from '../lib/mockDb';
import { expensesApi } from '../lib/expensesApi';
import { purchasesApi } from '../lib/purchasesApi';
import { mortalitiesApi } from '../lib/mortalitiesApi';
import { getCurrentProductCost } from '../lib/costing';

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}

type ProductDraft = Omit<Product, 'id'> & { id?: string };

function numberInputValue(value: number | undefined) {
  return value && value !== 0 ? String(value) : '';
}

function ProductDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: ProductDraft;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [draft, setDraft] = useState<ProductDraft>(initial);

  useEffect(() => {
    if (open) {
      setDraft(initial);
    }
  }, [initial, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial.id ? 'Edit Product' : 'Add Product'}</DialogTitle>
      <DialogContent sx={{ pt: 2, display: 'grid', gap: 2 }}>
        <TextField
          label="Name"
          value={draft.name ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          autoFocus
        />
        <TextField
          label="Category"
          value={draft.category ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
          fullWidth
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Cost Price"
            type="number"
            value={numberInputValue(draft.costPrice)}
            onChange={(e) =>
              setDraft((d) => ({ ...d, costPrice: e.target.value === '' ? 0 : Number(e.target.value) }))
            }
            fullWidth
          />
          <TextField
            label="Sell Price"
            type="number"
            value={numberInputValue(draft.sellPrice)}
            onChange={(e) =>
              setDraft((d) => ({ ...d, sellPrice: e.target.value === '' ? 0 : Number(e.target.value) }))
            }
            fullWidth
          />
        </Stack>
        <TextField
          label="Stock"
          type="number"
          value={numberInputValue(draft.stock)}
          onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value === '' ? 0 : Number(e.target.value) }))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            const name = (draft.name ?? '').trim();
            if (!name) return;
            onSave({
              id: draft.id ?? uid(),
              name,
              category: draft.category?.trim() || undefined,
              costPrice: Number(draft.costPrice ?? 0),
              sellPrice: Number(draft.sellPrice ?? 0),
              stock: Number(draft.stock ?? 0),
            });
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ProductsPage() {
  const canManageProducts = hasRole('admin');
  const [rows, setRows] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [mortalities, setMortalities] = useState<MortalityRecord[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [error, setError] = useState('');

  async function loadProducts() {
    try {
      const [list, expenseRows, purchaseRows, mortalityRows] = await Promise.all([
        mockProductsDb.list(),
        expensesApi.list().catch(() => []),
        purchasesApi.list().catch(() => []),
        mortalitiesApi.list().catch(() => []),
      ]);
      setRows(list);
      setTotalExpenses(expenseRows.reduce((sum, row) => sum + row.amount, 0));
      setPurchases(purchaseRows);
      setMortalities(mortalityRows);
      setError('');
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'Unable to load products');
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((p) =>
      [p.name, p.category].filter(Boolean).some((x) => String(x).toLowerCase().includes(s))
    );
  }, [q, rows]);

  const cols: GridColDef<Product>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'category', headerName: 'Category', width: 150 },
    { field: 'stock', headerName: 'Stock', width: 90, type: 'number' },
    { field: 'costPrice', headerName: 'Base Cost', width: 110, type: 'number' },
    {
      field: 'currentCost',
      headerName: 'Current Cost',
      width: 120,
      sortable: false,
      valueGetter: (_value, row) =>
        Number(getCurrentProductCost(row, rows, purchases, mortalities, totalExpenses).toFixed(2)),
    },
    { field: 'sellPrice', headerName: 'Sell', width: 100, type: 'number' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          {canManageProducts ? (
            <>
              <IconButton
                size="small"
                onClick={() => {
                  setEditing(params.row);
                  setOpen(true);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  mockProductsDb.remove(params.row.id).then(() => void loadProducts());
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          ) : null}
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800}>
            Products
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Base cost comes from purchase price. Current live-bird cost rises automatically as feed, labour, and electricity expenses increase.
          </Typography>
        </Box>
        <TextField size="small" label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        {canManageProducts ? (
          <Button
            variant="contained"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add Product
          </Button>
        ) : null}
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Box sx={{ height: 520 }}>
            <DataGrid
              rows={filtered}
              columns={cols}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            />
          </Box>
        </CardContent>
      </Card>

      {canManageProducts ? (
        <ProductDialog
          open={open}
          initial={
            editing
              ? { ...editing }
              : {
                  name: '',
                  category: '',
                  costPrice: 0,
                  sellPrice: 0,
                  stock: 0,
                }
          }
          onClose={() => setOpen(false)}
          onSave={async (p) => {
            await mockProductsDb.upsert(p);
            await loadProducts();
            setOpen(false);
          }}
        />
      ) : null}
    </Box>
  );
}
