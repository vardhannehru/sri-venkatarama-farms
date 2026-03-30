import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './components/auth/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BillingPage } from './pages/BillingPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

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
        <Route index element={<DashboardPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route
          path="products"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <ProductsPage />
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
          path="expenses"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <ExpensesPage />
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
          path="settings"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <SettingsPage />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
