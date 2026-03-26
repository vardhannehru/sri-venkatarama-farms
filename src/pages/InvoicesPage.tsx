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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CreditCardIcon from '@mui/icons-material/CreditCard';

type InvoiceStatus = 'Unpaid' | 'Overdue' | 'Paid' | 'Draft';

type Invoice = {
  id: string;
  invoiceNo: string;
  customer: string;
  status: InvoiceStatus;
  amount: number;
  dueInDays: number;
};

const invoices: Invoice[] = [
  { id: 'i1', invoiceNo: '427-012', customer: 'BlueRock', status: 'Unpaid', amount: 53154, dueInDays: 10 },
  { id: 'i2', invoiceNo: '424-112', customer: 'Nimbus Retail', status: 'Overdue', amount: 61223, dueInDays: -2 },
  { id: 'i3', invoiceNo: '427-020', customer: 'Asha Stores', status: 'Unpaid', amount: 7311, dueInDays: 17 },
  { id: 'i4', invoiceNo: '425-001', customer: 'Metro Mart', status: 'Paid', amount: 27114, dueInDays: 0 },
  { id: 'i5', invoiceNo: '404-002', customer: 'Walk-in', status: 'Draft', amount: 8077, dueInDays: 0 },
];

function money(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function statusChip(status: InvoiceStatus) {
  switch (status) {
    case 'Paid':
      return <Chip size="small" label="Paid" color="success" />;
    case 'Overdue':
      return <Chip size="small" label="Overdue" color="error" />;
    case 'Draft':
      return <Chip size="small" label="Draft" variant="outlined" />;
    default:
      return <Chip size="small" label="Unpaid" color="warning" />;
  }
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={900} sx={{ mt: 0.5 }}>
          {value}
        </Typography>
        {sub ? (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function InvoicesPage() {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight={900}>
            Invoices
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overview + filters + invoice list (UI demo)
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>Create an invoice</Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <SummaryCard label="Overdue" value={`₹ ${money(31211)}`} sub="2 invoices" />
        <SummaryCard label="Due within next month" value={`₹ ${money(172560)}`} sub="12 invoices" />
        <SummaryCard label="Average time to get paid" value="12 days" sub="Last 90 days" />
        <SummaryCard label="Available for instant payout" value={`₹ ${money(214390)}`} sub="Stripe / payouts" />
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent sx={{ display: 'grid', gap: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography fontWeight={900}>Active filters</Typography>
              <Chip size="small" label="All customers" />
              <Chip size="small" label="All statuses" />
              <Chip size="small" label="Nov 2023" />
              <Chip size="small" label="Dec 2023" />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton size="small">
                <FilterListIcon fontSize="small" />
              </IconButton>
              <TextField
                size="small"
                placeholder="Search invoices"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch' }}>
            {/* Left list */}
            <Box sx={{ width: { xs: '100%', md: 320 } }}>
              <Typography fontWeight={900} sx={{ mb: 1 }}>
                Unpaid invoices
              </Typography>
              <Stack spacing={1}>
                {invoices
                  .filter((x) => x.status === 'Unpaid' || x.status === 'Overdue')
                  .map((inv) => (
                    <Card
                      key={inv.id}
                      variant="outlined"
                      sx={{
                        borderRadius: 3,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography fontWeight={800}># {inv.invoiceNo}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {inv.customer} • {inv.dueInDays < 0 ? `${Math.abs(inv.dueInDays)} days overdue` : `in ${inv.dueInDays} days`}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography fontWeight={900}>₹ {money(inv.amount)}</Typography>
                            {statusChip(inv.status)}
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
              </Stack>
            </Box>

            {/* Main detail panel */}
            <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }}>
              <Card
                sx={{
                  borderRadius: 4,
                  bgcolor: '#0f1b2d',
                  color: 'rgba(255,255,255,0.92)',
                  overflow: 'hidden',
                }}
              >
                <CardContent sx={{ display: 'grid', gap: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6" fontWeight={900}>
                        Invoice details
                      </Typography>
                      <Chip size="small" label="# 427-012" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'white' }} />
                      <Chip size="small" label="Unpaid" sx={{ bgcolor: 'rgba(255,193,7,0.18)', color: '#ffca28' }} />
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
                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          Total due
                        </Typography>
                        <Typography variant="h5" fontWeight={900}>
                          ₹ {money(53154)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          Concept Development
                        </Typography>
                      </CardContent>
                    </Card>

                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          Company
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#1976d2' }}>B</Avatar>
                          <Typography fontWeight={900}>BlueRock</Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          CRM integration
                        </Typography>
                      </CardContent>
                    </Card>

                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          Customer
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Avatar sx={{ width: 28, height: 28 }}>M</Avatar>
                          <Box>
                            <Typography fontWeight={900}>Maria Jones</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                              CFO • BLUEROCK
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
                          minWidth: 140,
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.18)' },
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
                        sx={{ bgcolor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)' }}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 26, height: 26, fontSize: 12 } }}>
                        <Avatar>J</Avatar>
                        <Avatar>A</Avatar>
                        <Avatar>S</Avatar>
                        <Avatar>N</Avatar>
                      </AvatarGroup>
                      <Button
                        variant="contained"
                        sx={{
                          bgcolor: '#b7ff4a',
                          color: '#15240b',
                          fontWeight: 900,
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
      </Card>
    </Box>
  );
}
