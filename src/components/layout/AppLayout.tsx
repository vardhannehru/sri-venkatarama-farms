import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Chip,
  CircularProgress,
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
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import GrassIcon from '@mui/icons-material/Grass';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BoltIcon from '@mui/icons-material/Bolt';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useEffect, useMemo, useState } from 'react';
import { getCurrentUser, logout } from '../../lib/auth';
import type { UserRole } from '../../types';
import { mockProductsDb } from '../../lib/mockDb';
import { salesApi } from '../../lib/salesApi';
import { purchasesApi } from '../../lib/purchasesApi';

const drawerWidth = 222;

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  section: 'main' | 'management';
  roles: UserRole[];
};

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  path: string;
  kind: 'page' | 'product' | 'sale' | 'purchase';
};

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Track sales, targets, and business health.' },
  '/invoices': { title: 'Sales History', subtitle: 'Review completed sales, payments, and billing records.' },
  '/purchases': { title: 'Purchases', subtitle: 'Add bird purchases to grow stock before sales.' },
  '/billing': { title: 'Billing', subtitle: 'Create fast sales and complete daily billing.' },
  '/products': { title: 'Products', subtitle: 'Manage inventory, pricing, and stock levels.' },
  '/mortality': { title: 'Mortality', subtitle: 'Record bird deaths and sick birds so daily counts stay accurate.' },
  '/customers': { title: 'Customers', subtitle: 'View and manage your customer records.' },
  '/feed': { title: 'Feed', subtitle: 'Enter feed stock, feed usage, and feed cost separately.' },
  '/labour': { title: 'Labour', subtitle: 'Record labour entries separately from the other farm costs.' },
  '/electricity': { title: 'Electricity', subtitle: 'Record electricity charges separately from feed and labour.' },
  '/larva': { title: 'Larva', subtitle: 'Record larva cost separately so it also appears in the daily report.' },
  '/report-dashboard': { title: 'Report Dashboard', subtitle: 'See imported Excel report data separately from live app activity.' },
  '/reports': { title: 'Daily Report', subtitle: 'Automatically calculated from purchases, sales, mortality, and feed expenses.' },
  '/settings': { title: 'Settings', subtitle: 'Adjust app configuration and preferences.' },
};

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const role = currentUser?.role ?? 'admin';

  const items: NavItem[] = useMemo(
    () => [
      { label: 'Dashboard', path: '/', icon: <DashboardIcon />, section: 'main', roles: ['admin', 'salesman'] },
      { label: 'Sales History', path: '/invoices', icon: <DescriptionIcon />, section: 'main', roles: ['admin', 'salesman'] },
      { label: 'Billing', path: '/billing', icon: <PointOfSaleIcon />, section: 'main', roles: ['admin', 'salesman'] },
      { label: 'Purchases', path: '/purchases', icon: <ShoppingBasketIcon />, section: 'main', roles: ['admin'] },
      { label: 'Products', path: '/products', icon: <Inventory2Icon />, section: 'main', roles: ['admin'] },
      { label: 'Mortality', path: '/mortality', icon: <WarningAmberIcon />, section: 'main', roles: ['admin'] },
      { label: 'Feed', path: '/feed', icon: <GrassIcon />, section: 'management', roles: ['admin', 'salesman'] },
      { label: 'Labour', path: '/labour', icon: <EngineeringIcon />, section: 'management', roles: ['admin', 'salesman'] },
      { label: 'Electricity', path: '/electricity', icon: <BoltIcon />, section: 'management', roles: ['admin', 'salesman'] },
      { label: 'Larva', path: '/larva', icon: <BugReportIcon />, section: 'management', roles: ['admin', 'salesman'] },
      { label: 'Customers', path: '/customers', icon: <PeopleIcon />, section: 'management', roles: ['admin'] },
      { label: 'Report Dashboard', path: '/report-dashboard', icon: <AutoGraphIcon />, section: 'management', roles: ['admin'] },
      { label: 'Daily Report', path: '/reports', icon: <AssessmentIcon />, section: 'management', roles: ['admin'] },
      { label: 'Settings', path: '/settings', icon: <SettingsIcon />, section: 'management', roles: ['admin'] },
    ],
    []
  );
  const visibleItems = useMemo(() => items.filter((item) => item.roles.includes(role)), [items, role]);

  const currentPage = pageMeta[location.pathname] ?? {
    title: 'Farm Suite',
    subtitle: 'Manage billing, stock, and reporting from one place.',
  };

  useEffect(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let active = true;
    setSearchLoading(true);

    const timer = window.setTimeout(() => {
      const pageResults: SearchResult[] = visibleItems
        .filter((item) => item.label.toLowerCase().includes(query))
        .map((item) => ({
          id: `page-${item.path}`,
          title: item.label,
          subtitle: 'Open page',
          path: item.path,
          kind: 'page',
        }));

      const requests: Promise<SearchResult[]>[] = [
        mockProductsDb
          .list()
          .then((products) =>
            products
              .filter((product) => `${product.name} ${product.category ?? ''}`.toLowerCase().includes(query))
              .slice(0, 4)
              .map((product) => ({
                id: `product-${product.id}`,
                title: product.name,
                subtitle: `${product.category ?? 'Product'} • Stock ${product.stock}`,
                path: '/products',
                kind: 'product' as const,
              }))
          )
          .catch(() => []),
        salesApi
          .list()
          .then((sales) =>
            sales
              .filter((sale) => {
                const haystack = [
                  sale.customerName ?? '',
                  sale.customerPhone ?? '',
                  sale.createdByUsername,
                  ...sale.items.map((item) => `${item.name} ${item.category ?? ''}`),
                ]
                  .join(' ')
                  .toLowerCase();
                return haystack.includes(query);
              })
              .slice(0, 4)
              .map((sale) => ({
                id: `sale-${sale.id}`,
                title: sale.customerName || sale.items.map((item) => item.name).join(', '),
                subtitle: `${sale.customerPhone ?? 'No phone'} • ₹${sale.total}`,
                path: '/invoices',
                kind: 'sale' as const,
              }))
          )
          .catch(() => []),
      ];

      if (role === 'admin') {
        requests.push(
          purchasesApi
            .list()
            .then((purchases) =>
              purchases
                .filter((purchase) => `${purchase.birdType} ${purchase.supplier ?? ''}`.toLowerCase().includes(query))
                .slice(0, 4)
                .map((purchase) => ({
                  id: `purchase-${purchase.id}`,
                  title: purchase.birdType,
                  subtitle: `${purchase.quantity} birds${purchase.supplier ? ` • ${purchase.supplier}` : ''}`,
                  path: '/purchases',
                  kind: 'purchase' as const,
                }))
            )
            .catch(() => [])
        );
      }

      Promise.all(requests).then((groups) => {
        if (!active) return;
        setSearchResults([...pageResults, ...groups.flat()].slice(0, 8));
        setSearchLoading(false);
      });
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchText, visibleItems, role]);

  function openSearchResult(path: string) {
    navigate(path);
    setSearchText('');
    setSearchResults([]);
    setSearchOpen(false);
  }

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
          color: selected ? t.palette.primary.main : t.palette.text.primary,
          border: `1px solid ${selected ? alpha(t.palette.primary.main, 0.18) : 'transparent'}`,
          background: selected
            ? `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.12)}, ${alpha('#ffffff', 0.96)})`
            : 'transparent',
          boxShadow: selected ? `0 12px 24px ${alpha(t.palette.primary.main, 0.12)}` : 'none',
          '& .MuiListItemIcon-root': {
            minWidth: 36,
            color: selected ? t.palette.primary.main : alpha(t.palette.text.primary, 0.62),
          },
          '& .MuiListItemText-primary': {
            fontSize: 14,
            fontWeight: selected ? 800 : 700,
            letterSpacing: -0.1,
          },
          '&:hover': {
            backgroundColor: selected ? undefined : alpha(t.palette.primary.main, 0.05),
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
                `radial-gradient(circle at 28% 28%, ${alpha(t.palette.primary.light, 0.4)}, transparent 42%),` +
                `linear-gradient(135deg, ${alpha('#ffffff', 0.98)}, ${alpha('#eef4ff', 1)})`,
              border: `1px solid ${alpha(t.palette.primary.light, 0.2)}`,
              boxShadow: `0 14px 28px ${alpha(t.palette.primary.main, 0.14)}`,
            })}
          >
            <AutoGraphIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap fontWeight={900} sx={{ letterSpacing: -0.35 }}>
              SV Integrated Farms
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
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
            color: 'text.secondary',
            fontWeight: 900,
            letterSpacing: 1.1,
            textTransform: 'uppercase',
          }}
        >
          Main
        </Typography>
        <List disablePadding>{visibleItems.filter((item) => item.section === 'main').map(renderNavItem)}</List>

        {visibleItems.some((item) => item.section === 'management') ? (
          <>
            <Divider sx={{ my: 1.25, borderColor: 'rgba(15,23,42,0.08)' }} />

            <Typography
              variant="caption"
              sx={{
                px: 1,
                mb: 1,
                display: 'block',
                color: 'text.secondary',
                fontWeight: 900,
                letterSpacing: 1.1,
                textTransform: 'uppercase',
              }}
            >
              Management
            </Typography>
            <List disablePadding>{visibleItems.filter((item) => item.section === 'management').map(renderNavItem)}</List>
          </>
        ) : null}
      </Box>

      <Box sx={{ p: 1.25, pt: 0 }}>
        <Box
          sx={{
            border: '1px solid rgba(15,23,42,0.08)',
            borderRadius: 3.2,
            p: 1,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.98))',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontWeight: 900 }}>
              {(currentUser?.username?.[0] ?? 'O').toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={800} noWrap>
                {currentUser?.username ?? 'Operator'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                {role === 'admin' ? 'Admin access' : 'Salesman access'}
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
                color: 'text.primary',
                '& .MuiListItemIcon-root': { minWidth: 34, color: 'text.secondary' },
                '&:hover': { backgroundColor: 'rgba(37,99,235,0.05)' },
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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={(t) => ({
          zIndex: (tt) => tt.zIndex.drawer + 1,
          background: alpha('#ffffff', 0.9),
          color: t.palette.text.primary,
          backdropFilter: 'blur(18px)',
          borderBottom: `1px solid ${alpha(t.palette.divider, 0.8)}`,
          boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
        })}
      >
        <Toolbar sx={{ minHeight: '72px !important', px: { xs: 1.25, sm: 2.2 }, gap: 1.2 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen((v) => !v)}
            sx={{
              display: { sm: 'none' },
              border: '1px solid rgba(15,23,42,0.08)',
              bgcolor: 'rgba(37,99,235,0.04)',
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
              position: 'relative',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.7,
              width: 320,
              borderRadius: 999,
              border: `1px solid ${alpha(t.palette.divider, 0.9)}`,
              background: `linear-gradient(180deg, ${alpha('#ffffff', 0.98)}, ${alpha('#f8fafc', 1)})`,
            })}
          >
            <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <InputBase
              placeholder="Search pages, products, sales"
              sx={{ color: 'inherit', fontSize: 14, width: '100%' }}
              value={searchText}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setSearchText(e.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults[0]) {
                  e.preventDefault();
                  openSearchResult(searchResults[0].path);
                }
                if (e.key === 'Escape') {
                  setSearchOpen(false);
                }
              }}
            />
            {searchLoading ? <CircularProgress size={16} /> : null}

            {searchOpen && searchText.trim() ? (
              <Box
                sx={(t) => ({
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  left: 0,
                  right: 0,
                  zIndex: t.zIndex.modal,
                  p: 1,
                  borderRadius: 3,
                  border: `1px solid ${alpha(t.palette.divider, 0.95)}`,
                  background: alpha('#ffffff', 0.98),
                  boxShadow: '0 18px 36px rgba(15,23,42,0.12)',
                  backdropFilter: 'blur(12px)',
                })}
              >
                {searchResults.length ? (
                  <Stack spacing={0.6}>
                    {searchResults.map((result) => (
                      <Box
                        key={result.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          openSearchResult(result.path);
                        }}
                        sx={(t) => ({
                          p: 1,
                          borderRadius: 2.2,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: alpha(t.palette.primary.main, 0.06),
                          },
                        })}
                      >
                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={800} noWrap>
                              {result.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {result.subtitle}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={result.kind}
                            sx={{ textTransform: 'capitalize', bgcolor: 'rgba(15,23,42,0.05)' }}
                          />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : !searchLoading ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                    No matching pages or records found.
                  </Typography>
                ) : null}
              </Box>
            ) : null}
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Settings">
              <IconButton
                size="small"
                sx={{
                  border: '1px solid rgba(15,23,42,0.08)',
                  bgcolor: 'rgba(37,99,235,0.04)',
                }}
              >
                <SettingsOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Notifications">
              <IconButton
                size="small"
                sx={{
                  border: '1px solid rgba(15,23,42,0.08)',
                  bgcolor: 'rgba(37,99,235,0.04)',
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
                boxShadow: '0 8px 20px rgba(37,99,235,0.2)',
              }}
            >
              {(currentUser?.username?.[0] ?? 'O').toUpperCase()}
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
              background: 'linear-gradient(180deg, #ffffff, #f8fbff)',
              borderRight: '1px solid rgba(15,23,42,0.08)',
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
              background: 'linear-gradient(180deg, #ffffff, #f8fbff)',
              borderRight: '1px solid rgba(15,23,42,0.08)',
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
