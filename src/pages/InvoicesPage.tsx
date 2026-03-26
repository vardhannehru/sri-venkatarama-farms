import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

type InvoiceStatus = 'Unpaid' | 'Overdue' | 'Paid' | 'Draft';

type Invoice = {
  id: string;
  invoiceNo: string;
  customer: string;
  status: InvoiceStatus;
  amount: number;
  dueInDays: number;
  project?: string;
};

const seedInvoices: Invoice[] = [
  { id: 'i1', invoiceNo: '427-012', customer: 'BlueRock', status: 'Unpaid', amount: 53154, dueInDays: 10, project: 'Concept Development' },
  { id: 'i2', invoiceNo: '424-112', customer: 'Nimbus Retail', status: 'Overdue', amount: 61223, dueInDays: -2, project: 'Brand Refresh' },
  { id: 'i3', invoiceNo: '427-020', customer: 'Asha Stores', status: 'Unpaid', amount: 7311, dueInDays: 17, project: 'Packaging' },
  { id: 'i4', invoiceNo: '425-001', customer: 'Metro Mart', status: 'Paid', amount: 27114, dueInDays: 0, project: 'Store Design' },
  { id: 'i5', invoiceNo: '404-002', customer: 'Walk-in', status: 'Draft', amount: 8077, dueInDays: 0, project: 'Misc' },
];

function money(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function statusChip(status: InvoiceStatus) {
  const common = { size: 'small' as const, sx: { borderRadius: 8 } };
  switch (status) {
    case 'Paid':
      return <Chip {...common} label="Paid" color="success" />;
    case 'Overdue':
      return <Chip {...common} label="Overdue" color="error" />;
    case 'Draft':
      return <Chip {...common} label="Draft" variant="outlined" />;
    default:
      return <Chip {...common} label="Unpaid" color="warning" />;
  }
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <Card
      variant="outlined"
      sx={(t) => ({
        borderRadius: 2,
        borderColor: alpha(t.palette.divider, 0.85),
        backgroundImage: `linear-gradient(180deg, ${alpha('#ffffff', 0.05)}, ${alpha('#ffffff', 0.02)})`,
        backdropFilter: 'blur(10px)',
      })}
    >
      {children}
    </Card>
  );
}

function MetricCard({
  label,
  value,
  sub,
  accent = '#7c3aed',
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <GlassCard>
      <CardContent
        sx={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: 96,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: -40,
            background: `radial-gradient(400px 160px at 30% 20%, ${alpha(accent, 0.22)}, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={950} sx={{ mt: 0.5, letterSpacing: -0.4 }}>
          {value}
        </Typography>
        {sub ? (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        ) : null}
      </CardContent>
    </GlassCard>
  );
}

export function InvoicesPage() {
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string>('i1');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return seedInvoices;
    return seedInvoices.filter((x) =>
      [x.invoiceNo, x.customer, x.status, x.project].filter(Boolean).some((v) => String(v).toLowerCase().includes(s))
    );
  }, [q]);

  const selected = useMemo(
    () => filtered.find((x) => x.id === selectedId) ?? filtered[0] ?? seedInvoices[0],
    [filtered, selectedId]
  );

  const unpaid = filtered.filter((x) => x.status === 'Unpaid' || x.status === 'Overdue');

  return (
    <Box sx={{ display: 'grid', gap: 2.2 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={950} sx={{ letterSpacing: -0.8 }}>
            Invoices
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track receivables, filter, and payout instantly (UI demo)
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" startIcon={<FilterListIcon />} sx={{ borderRadius: 10 }}>
            Filters
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} sx={{ borderRadius: 10, fontWeight: 900 }}>
            Create invoice
          </Button>
        </Stack>
      </Box>

      {/* KPI Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <MetricCard label="Overdue" value={`₹ ${money(31211)}`} sub="2 invoices" accent="#ef4444" />
        <MetricCard label="Due within next month" value={`₹ ${money(172560)}`} sub="12 invoices" accent="#f59e0b" />
        <MetricCard label="Avg time to get paid" value="12 days" sub="Last 90 days" accent="#06b6d4" />
        <MetricCard label="Instant payout" value={`₹ ${money(214390)}`} sub="Available now" accent="#7c3aed" />
      </Box>

      {/* Main area */}
      <GlassCard>
        <CardContent sx={{ display: 'grid', gap: 1.6 }}>
          {/* Filter chips + search */}
          <Box
            sx={{
              display: 'flex',
              gap: 1.2,
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', md: 'row' },
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Typography fontWeight={900}>Active</Typography>
              <Chip size="small" label="All customers" sx={{ borderRadius: 8 }} />
              <Chip size="small" label="All statuses" sx={{ borderRadius: 8 }} />
              <Chip size="small" label="Nov" sx={{ borderRadius: 8 }} />
              <Chip size="small" label="Dec" sx={{ borderRadius: 8 }} />
            </Stack>
            <TextField
              size="small"
              placeholder="Search invoices"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ width: { xs: '100%', md: 320 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch' }}>
            {/* Left list */}
            <Box sx={{ width: { xs: '100%', md: 340 } }}>
              <Typography fontWeight={950} sx={{ mb: 1 }}>
                Unpaid
              </Typography>
              <Stack spacing={1}>
                {unpaid.map((inv) => {
                  const active = inv.id === selected.id;
                  return (
                    <motion.div key={inv.id} whileHover={{ y: -2 }}>
                      <Card
                        variant="outlined"
                        onClick={() => setSelectedId(inv.id)}
                        sx={(t) => ({
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'border-color 140ms ease, background 140ms ease',
                          borderColor: active ? alpha(t.palette.primary.main, 0.55) : alpha(t.palette.divider, 0.9),
                          background: active
                            ? `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.06)}, ${alpha('#ffffff', 0.0)})`
                            : undefined,
                          '&:hover': { bgcolor: 'action.hover' },
                        })}
                      >
                        <CardContent sx={{ py: 1.6, '&:last-child': { pb: 1.6 } }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                            <Box>
                              <Typography fontWeight={900} sx={{ letterSpacing: -0.2 }}>
                                # {inv.invoiceNo}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {inv.customer} •{' '}
                                {inv.dueInDays < 0
                                  ? `${Math.abs(inv.dueInDays)} days overdue`
                                  : `due in ${inv.dueInDays} days`}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography fontWeight={950}>₹ {money(inv.amount)}</Typography>
                              {statusChip(inv.status)}
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </Stack>
            </Box>

            {/* Details */}
            <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }}>
              <Card
                sx={{
                  borderRadius: 2,
                  color: 'rgba(255,255,255,0.92)',
                  overflow: 'hidden',
                  border: `1px solid ${alpha('#ffffff', 0.08)}`,
                  background:
                    `radial-gradient(1100px 520px at 10% 0%, ${alpha('#22c55e', 0.22)}, transparent 60%),` +
                    `radial-gradient(900px 420px at 85% 10%, ${alpha('#8b5cf6', 0.25)}, transparent 55%),` +
                    `linear-gradient(180deg, ${alpha('#0b1020', 0.98)}, ${alpha('#070a12', 0.98)})`,
                  boxShadow: `0 22px 60px ${alpha('#000', 0.32)}`,
                }}
              >
                <CardContent sx={{ display: 'grid', gap: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                      <Typography variant="h6" fontWeight={950} sx={{ letterSpacing: -0.3 }}>
                        Invoice details
                      </Typography>
                      <Chip
                        size="small"
                        label={`# ${selected.invoiceNo}`}
                        sx={{ bgcolor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.92)', borderRadius: 8 }}
                      />
                      <Box>{statusChip(selected.status)}</Box>
                    </Stack>
                    <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      <MoreHorizIcon />
                    </IconButton>
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 1.5,
                    }}
                  >
                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                          Total due
                        </Typography>
                        <Typography variant="h5" fontWeight={950} sx={{ letterSpacing: -0.4 }}>
                          ₹ {money(selected.amount)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          {selected.project ?? '—'}
                        </Typography>
                      </CardContent>
                    </Card>

                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                          Company
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#1976d2' }}>
                            {selected.customer.slice(0, 1)}
                          </Avatar>
                          <Typography fontWeight={950}>{selected.customer}</Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          Connected
                        </Typography>
                      </CardContent>
                    </Card>

                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                          Customer
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Avatar sx={{ width: 28, height: 28 }}>M</Avatar>
                          <Box>
                            <Typography fontWeight={950}>Maria Jones</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                              CFO
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Pay with
                      </Typography>
                      <TextField
                        select
                        size="small"
                        value="Stripe"
                        sx={{
                          minWidth: 150,
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.16)' },
                          '& .MuiInputBase-input': { color: 'white' },
                          '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                        }}
                      >
                        <MenuItem value="Stripe">Stripe</MenuItem>
                        <MenuItem value="Razorpay">Razorpay</MenuItem>
                        <MenuItem value="Cash">Cash</MenuItem>
                      </TextField>
                      <Chip
                        icon={<CreditCardIcon />}
                        label="Visa"
                        sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.86)', borderRadius: 8 }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <AvatarGroup
                        max={4}
                        sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 12 } }}
                      >
                        <Avatar>J</Avatar>
                        <Avatar>A</Avatar>
                        <Avatar>S</Avatar>
                        <Avatar>N</Avatar>
                      </AvatarGroup>
                      <Button
                        variant="contained"
                        endIcon={<NorthEastIcon />}
                        sx={{
                          bgcolor: '#b7ff4a',
                          color: '#15240b',
                          fontWeight: 950,
                          borderRadius: 10,
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#a7f53d' },
                        }}
                      >
                        Pay out now
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </CardContent>
      </GlassCard>
    </Box>
  );
}
