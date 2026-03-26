import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
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
import { useMemo, useState } from 'react';
import { logout } from '../../lib/auth';

const drawerWidth = 260;

type NavItem = { label: string; path: string; icon: React.ReactNode };

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const items: NavItem[] = useMemo(
    () => [
      { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
      { label: 'Invoices', path: '/invoices', icon: <DescriptionIcon /> },
      { label: 'Billing', path: '/billing', icon: <PointOfSaleIcon /> },
      { label: 'Products', path: '/products', icon: <Inventory2Icon /> },
      { label: 'Customers', path: '/customers', icon: <PeopleIcon /> },
      { label: 'Expenses', path: '/expenses', icon: <ReceiptLongIcon /> },
      { label: 'Reports', path: '/reports', icon: <AssessmentIcon /> },
      { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
    ],
    []
  );

  const drawer = (
    <Box>
      <Toolbar sx={{ gap: 1.2, py: 0.8 }}>
        <Box
          sx={(t) => ({
            width: 40,
            height: 40,
            borderRadius: 12,
            background:
              `radial-gradient(18px 18px at 30% 25%, ${alpha(t.palette.primary.main, 0.55)}, transparent 60%),` +
              `linear-gradient(135deg, ${alpha('#111827', 0.85)}, ${alpha('#0b0f19', 0.85)})`,
            border: `1px solid ${alpha(t.palette.divider, 0.9)}`,
            boxShadow: `0 10px 26px ${alpha('#000', 0.35)}`,
          })}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap fontWeight={950} sx={{ letterSpacing: -0.4 }}>
            Shop Manager
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>
            Business suite
          </Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.10)' }} />

      <Box sx={{ px: 1.2, py: 1 }}>
        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 800, letterSpacing: 0.8, px: 1.2, mb: 1, display: 'block' }}
        >
          MAIN
        </Typography>

        <List disablePadding>
          {items.slice(0, 4).map((it) => (
            <ListItemButton
              key={it.path}
              selected={location.pathname === it.path}
              onClick={() => {
                navigate(it.path);
                setMobileOpen(false);
              }}
              sx={(t) => ({
                borderRadius: 12,
                mb: 0.6,
                color: 'rgba(255,255,255,0.84)',
                '& .MuiListItemIcon-root': { color: 'rgba(255,255,255,0.70)' },
                '&.Mui-selected': {
                  background: `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.18)}, ${alpha(t.palette.primary.main, 0.08)})`,
                  border: `1px solid ${alpha(t.palette.primary.main, 0.30)}`,
                },
                '&.Mui-selected:hover': {
                  background: `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.22)}, ${alpha(t.palette.primary.main, 0.10)})`,
                },
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
              })}
            >
              <ListItemIcon sx={{ minWidth: 42 }}>{it.icon}</ListItemIcon>
              <ListItemText primary={it.label} primaryTypographyProps={{ fontWeight: 800 }} />
            </ListItemButton>
          ))}
        </List>

        <Divider sx={{ my: 1.2, borderColor: 'rgba(255,255,255,0.08)' }} />

        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 800, letterSpacing: 0.8, px: 1.2, mb: 1, display: 'block' }}
        >
          MANAGEMENT
        </Typography>

        <List disablePadding>
          {items.slice(4).map((it) => (
            <ListItemButton
              key={it.path}
              selected={location.pathname === it.path}
              onClick={() => {
                navigate(it.path);
                setMobileOpen(false);
              }}
              sx={(t) => ({
                borderRadius: 12,
                mb: 0.6,
                color: 'rgba(255,255,255,0.84)',
                '& .MuiListItemIcon-root': { color: 'rgba(255,255,255,0.70)' },
                '&.Mui-selected': {
                  background: `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.18)}, ${alpha(t.palette.primary.main, 0.08)})`,
                  border: `1px solid ${alpha(t.palette.primary.main, 0.30)}`,
                },
                '&.Mui-selected:hover': {
                  background: `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.22)}, ${alpha(t.palette.primary.main, 0.10)})`,
                },
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
              })}
            >
              <ListItemIcon sx={{ minWidth: 42 }}>{it.icon}</ListItemIcon>
              <ListItemText primary={it.label} primaryTypographyProps={{ fontWeight: 800 }} />
            </ListItemButton>
          ))}
        </List>

        <Divider sx={{ my: 1.2, borderColor: 'rgba(255,255,255,0.08)' }} />

        <List disablePadding>
          <ListItemButton
            onClick={() => {
              logout();
              navigate('/login');
            }}
            sx={{
              borderRadius: 12,
              color: 'rgba(255,255,255,0.84)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
              '& .MuiListItemIcon-root': { color: 'rgba(255,255,255,0.70)' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 42 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 800 }} />
          </ListItemButton>
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={(t) => ({
          zIndex: (tt) => tt.zIndex.drawer + 1,
          background: alpha('#0b0f19', 0.78),
          color: t.palette.text.primary,
          backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${alpha(t.palette.divider, 0.7)}`,
        })}
      >
        <Toolbar sx={{ gap: 1.2 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen((v) => !v)}
            sx={{ display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box
            component="form"
            onSubmit={(e) => e.preventDefault()}
            sx={(t) => ({
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.2,
              py: 0.35,
              borderRadius: 14,
              border: `1px solid ${alpha(t.palette.divider, 0.8)}`,
              backgroundColor: alpha('#101828', 0.85),
              maxWidth: 560,
            })}
          >
            <SearchIcon fontSize="small" />
            <Box
              component="input"
              placeholder="Search products, invoices, customers…"
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'inherit',
                width: '100%',
                fontSize: 14,
              }}
            />
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton size="small">
              <SettingsOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <Badge variant="dot" color="secondary">
                <NotificationsNoneIcon fontSize="small" />
              </Badge>
            </IconButton>
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontWeight: 900 }}>O</Avatar>
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
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              background: 'linear-gradient(180deg, #0b0f19, #070a12)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
