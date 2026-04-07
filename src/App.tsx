import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './components/auth/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BillingPage } from './pages/BillingPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { ElectricityPage, FeedPage, LabourPage, LarvaPage } from './pages/ExpenseCategoryPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { MortalityPage } from './pages/MortalityPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReportDashboardPage } from './pages/ReportDashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { getCurrentRole } from './lib/auth';

function HomeRedirect() {
  const role = getCurrentRole();
  return <Navigate to={role === 'salesman' ? '/billing' : '/'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route
          index
          element={getCurrentRole() === 'salesman' ? <Navigate to="/billing" replace /> : <DashboardPage />}
        />
        <Route path="billing" element={<BillingPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route
          path="purchases"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <PurchasesPage />
            </RequireAuth>
          }
        />
        <Route
          path="products"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <ProductsPage />
            </RequireAuth>
          }
        />
        <Route
          path="mortality"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <MortalityPage />
            </RequireAuth>
          }
        />
        <Route
          path="customers"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <CustomersPage />
            </RequireAuth>
          }
        />
        <Route
          path="feed"
          element={
            <RequireAuth allowedRoles={['admin', 'salesman']}>
              <FeedPage />
            </RequireAuth>
          }
        />
        <Route
          path="labour"
          element={
            <RequireAuth allowedRoles={['admin', 'salesman']}>
              <LabourPage />
            </RequireAuth>
          }
        />
        <Route
          path="electricity"
          element={
            <RequireAuth allowedRoles={['admin', 'salesman']}>
              <ElectricityPage />
            </RequireAuth>
          }
        />
        <Route
          path="larva"
          element={
            <RequireAuth allowedRoles={['admin', 'salesman']}>
              <LarvaPage />
            </RequireAuth>
          }
        />
        <Route
          path="reports"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <ReportsPage />
            </RequireAuth>
          }
        />
        <Route
          path="report-dashboard"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <ReportDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="settings"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <SettingsPage />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
