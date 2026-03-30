import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';

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
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundImage: `linear-gradient(180deg, ${alpha('#ffffff', 0.05)}, ${alpha('#ffffff', 0.02)})`,
        backdropFilter: 'blur(10px)',
      }}
    >
      <CardContent sx={{ position: 'relative', overflow: 'hidden', minHeight: 96 }}>
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
    </Card>
  );
}

export function InvoicesPage() {
  return (
    <Box sx={{ display: 'grid', gap: 2.2 }}>
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
            Track receivables, filter invoices, and manage payouts quickly.
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <MetricCard label="Overdue" value="₹ 0" sub="0 invoices" accent="#ef4444" />
        <MetricCard label="Due within next month" value="₹ 0" sub="0 invoices" accent="#f59e0b" />
        <MetricCard label="Avg time to get paid" value="0 days" sub="No invoice history yet" accent="#06b6d4" />
        <MetricCard label="Instant payout" value="₹ 0" sub="No receivables available" accent="#7c3aed" />
      </Box>

      <Card
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderColor: 'rgba(255,255,255,0.08)',
          backgroundImage: `linear-gradient(180deg, ${alpha('#ffffff', 0.05)}, ${alpha('#ffffff', 0.02)})`,
          backdropFilter: 'blur(10px)',
        }}
      >
        <CardContent sx={{ display: 'grid', gap: 1.6 }}>
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
            </Stack>
            <TextField
              size="small"
              placeholder="Search invoices"
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

          <Box
            sx={{
              minHeight: 340,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
            }}
          >
            <Box sx={{ maxWidth: 360 }}>
              <Typography variant="h6" fontWeight={900}>
                No invoices added yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                Your real invoices will appear here after you start creating them for customers.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
