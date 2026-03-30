import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import DescriptionIcon from '@mui/icons-material/Description';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import { useMemo, useState } from 'react';
import { logout } from '../../lib/auth';

const drawerWidth = 222;

type NavItem = { label: string; path: string; icon: React.ReactNode; section: 'main' | 'management' };

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Track sales, targets, expiry alerts, and business health.' },
  '/invoices': { title: 'Invoices', subtitle: 'Review billing records and customer invoices.' },
  '/billing': { title: 'Billing', subtitle: 'Create fast sales and complete daily billing.' },
  '/products': { title: 'Products', subtitle: 'Manage inventory, stock levels, and expiry dates.' },
  '/customers': { title: 'Customers', subtitle: 'View and manage your customer records.' },
  '/expenses': { title: 'Expenses', subtitle: 'Track outgoing costs and operating expenses.' },
  '/reports': { title: 'Reports', subtitle: 'Analyze performance with business reports.' },
  '/settings': { title: 'Settings', subtitle: 'Adjust app configuration and preferences.' },
};

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const items: NavItem[] = useMemo(
    () => [
      { label: 'Dashboard', path: '/', icon: <DashboardIcon />, section: 'main' },
      { label: 'Invoices', path: '/invoices', icon: <DescriptionIcon />, section: 'main' },
      { label: 'Billing', path: '/billing', icon: <PointOfSaleIcon />, section: 'main' },
      { label: 'Products', path: '/products', icon: <Inventory2Icon />, section: 'main' },
      { label: 'Customers', path: '/customers', icon: <PeopleIcon />, section: 'management' },
      { label: 'Expenses', path: '/expenses', icon: <ReceiptLongIcon />, section: 'management' },
      { label: 'Reports', path: '/reports', icon: <AssessmentIcon />, section: 'management' },
      { label: 'Settings', path: '/settings', icon: <SettingsIcon />, section: 'management' },
    ],
    []
  );

  const currentPage = pageMeta[location.pathname] ?? {
    title: 'Farm Suite',
    subtitle: 'Manage billing, stock, and reporting from one place.',
  };

  function renderNavItem(it: NavItem) {
    const selected = location.pathname === it.path;

    return (
      <ListItemButton
        key={it.path}
        selected={selected}
        onClick={() => {
          navigate(it.path);
          setMobileOpen(false);
        }}
        sx={(t) => ({
          minHeight: 44,
          borderRadius: 3,
          mb: 0.75,
          px: 1,
          color: selected ? '#fff' : 'rgba(255,255,255,0.74)',
          border: `1px solid ${selected ? alpha(t.palette.primary.light, 0.34) : 'transparent'}`,
          background: selected
            ? `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.30)}, ${alpha('#ffffff', 0.05)})`
            : 'transparent',
          boxShadow: selected ? `0 14px 30px ${alpha(t.palette.primary.dark, 0.22)}` : 'none',
          '& .MuiListItemIcon-root': {
            minWidth: 36,
            color: selected ? '#fff' : 'rgba(255,255,255,0.56)',
          },
          '& .MuiListItemText-primary': {
            fontSize: 14,
            fontWeight: selected ? 800 : 700,
            letterSpacing: -0.1,
          },
          '&:hover': {
            backgroundColor: selected ? undefined : 'rgba(255,255,255,0.05)',
          },
        })}
      >
        <ListItemIcon>{it.icon}</ListItemIcon>
        <ListItemText primary={it.label} />
      </ListItemButton>
    );
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 1.5, py: 1.25, minHeight: '72px !important' }}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={(t) => ({
              width: 42,
              height: 42,
              borderRadius: 3.2,
              display: 'grid',
              placeItems: 'center',
              background:
                `radial-gradient(circle at 28% 28%, ${alpha(t.palette.primary.light, 0.55)}, transparent 42%),` +
                `linear-gradient(135deg, ${alpha('#131a2a', 0.98)}, ${alpha('#0b0f19', 1)})`,
              border: `1px solid ${alpha(t.palette.primary.light, 0.18)}`,
              boxShadow: `0 14px 28px ${alpha('#000', 0.32)}`,
            })}
          >
            <AutoGraphIcon sx={{ fontSize: 20, color: 'primary.light' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap fontWeight={900} sx={{ letterSpacing: -0.35 }}>
              SV Integrated Farms
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'rgba(255,255,255,0.55)' }}>
              Farm business suite
            </Typography>
          </Box>
        </Stack>
      </Toolbar>

      <Box sx={{ px: 1.25, pb: 1.5, flex: 1, overflowY: 'auto' }}>
        <Typography
          variant="caption"
          sx={{
            px: 1,
            mb: 1,
            display: 'block',
            color: 'rgba(255,255,255,0.42)',
            fontWeight: 900,
            letterSpacing: 1.1,
            textTransform: 'uppercase',
          }}
        >
          Main
        </Typography>
        <List disablePadding>{items.filter((item) => item.section === 'main').map(renderNavItem)}</List>

        <Divider sx={{ my: 1.25, borderColor: 'rgba(255,255,255,0.08)' }} />

        <Typography
          variant="caption"
          sx={{
            px: 1,
            mb: 1,
            display: 'block',
            color: 'rgba(255,255,255,0.42)',
            fontWeight: 900,
            letterSpacing: 1.1,
            textTransform: 'uppercase',
          }}
        >
          Management
        </Typography>
        <List disablePadding>{items.filter((item) => item.section === 'management').map(renderNavItem)}</List>
      </Box>

      <Box sx={{ p: 1.25, pt: 0 }}>
        <Box
          sx={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 3.2,
            p: 1,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontWeight: 900 }}>O</Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={800} noWrap>
                Operator
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }} noWrap>
                Active session
              </Typography>
            </Box>
          </Stack>

          <List disablePadding>
            <ListItemButton
              onClick={() => {
                logout();
                navigate('/login');
              }}
              sx={{
                minHeight: 42,
                borderRadius: 2.6,
                px: 1,
                color: 'rgba(255,255,255,0.82)',
                '& .MuiListItemIcon-root': { minWidth: 34, color: 'rgba(255,255,255,0.62)' },
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{ fontWeight: 800, fontSize: 14 }}
              />
            </ListItemButton>
          </List>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#070b12' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={(t) => ({
          zIndex: (tt) => tt.zIndex.drawer + 1,
          background: alpha('#09101a', 0.78),
          color: t.palette.text.primary,
          backdropFilter: 'blur(18px)',
          borderBottom: `1px solid ${alpha(t.palette.divider, 0.55)}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        })}
      >
        <Toolbar sx={{ minHeight: '72px !important', px: { xs: 1.25, sm: 2.2 }, gap: 1.2 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen((v) => !v)}
            sx={{
              display: { sm: 'none' },
              border: '1px solid rgba(255,255,255,0.08)',
              bgcolor: 'rgba(255,255,255,0.03)',
            }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" noWrap fontWeight={900} sx={{ letterSpacing: -0.5, lineHeight: 1.1 }}>
              {currentPage.title}
            </Typography>
            <Typography variant="body2" noWrap sx={{ color: 'text.secondary', mt: 0.35 }}>
              {currentPage.subtitle}
            </Typography>
          </Box>

          <Box
            sx={(t) => ({
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.7,
              width: 320,
              borderRadius: 999,
              border: `1px solid ${alpha(t.palette.divider, 0.75)}`,
              background: `linear-gradient(180deg, ${alpha('#111827', 0.92)}, ${alpha('#0d1522', 0.92)})`,
            })}
          >
            <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <InputBase
              placeholder="Search products, invoices, customers"
              sx={{ color: 'inherit', fontSize: 14, width: '100%' }}
            />
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Settings">
              <IconButton
                size="small"
                sx={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  bgcolor: 'rgba(255,255,255,0.03)',
                }}
              >
                <SettingsOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Notifications">
              <IconButton
                size="small"
                sx={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  bgcolor: 'rgba(255,255,255,0.03)',
                }}
              >
                <Badge variant="dot" color="secondary">
                  <NotificationsNoneIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                fontWeight: 900,
                boxShadow: '0 8px 20px rgba(99,102,241,0.3)',
              }}
            >
              O
            </Avatar>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              background: 'linear-gradient(180deg, #0b0f19, #070a12)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              background: 'linear-gradient(180deg, #0b0f19, #070a12)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          px: { xs: 1.5, sm: 2.5, md: 3 },
          py: 2.5,
        }}
      >
        <Toolbar sx={{ minHeight: '72px !important' }} />
        <Outlet />
      </Box>
    </Box>
  );
}
