import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
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
      <Toolbar>
        <Typography variant="h6" noWrap>
          Shop Manager
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {items.map((it) => (
          <ListItemButton
            key={it.path}
            selected={location.pathname === it.path}
            onClick={() => {
              navigate(it.path);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>{it.icon}</ListItemIcon>
            <ListItemText primary={it.label} />
          </ListItemButton>
        ))}
        <Divider sx={{ my: 1 }} />
        <ListItemButton
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen((v) => !v)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {items.find((i) => i.path === location.pathname)?.label ?? 'Shop Manager'}
          </Typography>
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
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
