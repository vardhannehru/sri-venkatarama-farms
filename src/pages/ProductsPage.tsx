import {
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
import { useMemo, useState } from 'react';
import type { Product } from '../types';
import { mockProductsDb } from '../lib/mockDb';

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}

type ProductDraft = Omit<Product, 'id'> & { id?: string };

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

  // reset when opening
  if (open && draft !== initial && initial.id && draft.id !== initial.id) {
    // noop; keep controlled by user after open
  }

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
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="SKU"
            value={draft.sku ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Barcode"
            value={draft.barcode ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, barcode: e.target.value }))}
            fullWidth
          />
        </Stack>
        <TextField
          label="Category"
          value={draft.category ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Cost Price"
            type="number"
            value={draft.costPrice ?? 0}
            onChange={(e) => setDraft((d) => ({ ...d, costPrice: Number(e.target.value) }))}
            fullWidth
          />
          <TextField
            label="Sell Price"
            type="number"
            value={draft.sellPrice ?? 0}
            onChange={(e) => setDraft((d) => ({ ...d, sellPrice: Number(e.target.value) }))}
            fullWidth
          />
        </Stack>
        <TextField
          label="Stock"
          type="number"
          value={draft.stock ?? 0}
          onChange={(e) => setDraft((d) => ({ ...d, stock: Number(e.target.value) }))}
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
              sku: draft.sku?.trim() || undefined,
              barcode: draft.barcode?.trim() || undefined,
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
  const [rows, setRows] = useState<Product[]>(() => mockProductsDb.list());
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((p) =>
      [p.name, p.sku, p.barcode, p.category].filter(Boolean).some((x) => String(x).toLowerCase().includes(s))
    );
  }, [q, rows]);

  const cols: GridColDef<Product>[] = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
    { field: 'sku', headerName: 'SKU', width: 140 },
    { field: 'barcode', headerName: 'Barcode', width: 160 },
    { field: 'category', headerName: 'Category', width: 160 },
    { field: 'stock', headerName: 'Stock', width: 110, type: 'number' },
    { field: 'sellPrice', headerName: 'Sell', width: 110, type: 'number' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
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
              mockProductsDb.remove(params.row.id);
              setRows(mockProductsDb.list());
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
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
            Add, edit, delete products and track stock.
          </Typography>
        </Box>
        <TextField
          size="small"
          label="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button
          variant="contained"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add Product
        </Button>
      </Stack>

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

      <ProductDialog
        open={open}
        initial={
          editing
            ? { ...editing }
            : { name: '', sku: '', barcode: '', category: '', costPrice: 0, sellPrice: 0, stock: 0 }
        }
        onClose={() => setOpen(false)}
        onSave={(p) => {
          mockProductsDb.upsert(p);
          setRows(mockProductsDb.list());
          setOpen(false);
        }}
      />
    </Box>
  );
}
