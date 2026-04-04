import { Alert, Snackbar, alpha, Box, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { CostingReportRecord, DailyReportRecord, ExpenseRecord, MortalityRecord, Product, PurchaseRecord, SaleRecord } from '../types';
import { hasRole } from '../lib/auth';
import { costingReportsApi } from '../lib/costingReportsApi';
import { mockProductsDb } from '../lib/mockDb';
import { dailyTargetDb } from '../lib/dailyTargetDb';
import { dailyReportsApi } from '../lib/dailyReportsApi';
import { salesApi } from '../lib/salesApi';
import { purchasesApi } from '../lib/purchasesApi';
import { mortalitiesApi } from '../lib/mortalitiesApi';
import { expensesApi } from '../lib/expensesApi';
import { getCurrentLiveBirdCost, getCurrentProductCost, getExpenseCostPerBird, getProfitPerBird, getSaleEstimatedProfit } from '../lib/costing';

function money(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function paymentGroupFor(paymentMethod: string, paymentGroup?: string) {
  if (paymentGroup === 'Cash' || paymentGroup === 'Bank') {
    return paymentGroup;
  }
  return paymentMethod === 'Cash' ? 'Cash' : 'Bank';
}

function SectionHeader({
  eyebrow,
  title,
  caption,
}: {
  eyebrow: string;
  title: string;
  caption?: string;
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="caption"
        sx={{ color: 'primary.light', letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: 800 }}
      >
        {eyebrow}
      </Typography>
      <Typography variant="h6" fontWeight={900} sx={{ mt: 0.4 }}>
        {title}
      </Typography>
      {caption ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {caption}
        </Typography>
      ) : null}
    </Box>
  );
}

function KpiCard({
  label,
  value,
  sub,
  highlight = false,
  warning = false,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  warning?: boolean;
  tone?: 'default' | 'profit' | 'danger' | 'cash' | 'bank' | 'inventory' | 'sales';
}) {
  const toneStyles =
    tone === 'profit'
      ? {
          chipBg: 'rgba(22,163,74,0.10)',
          chipColor: '#15803d',
          valueColor: '#166534',
          subColor: '#166534',
        }
      : tone === 'danger'
        ? {
            chipBg: 'rgba(220,38,38,0.10)',
            chipColor: '#b91c1c',
            valueColor: '#991b1b',
            subColor: '#991b1b',
          }
        : tone === 'cash'
          ? {
              chipBg: 'rgba(5,150,105,0.10)',
              chipColor: '#047857',
              valueColor: '#065f46',
              subColor: '#065f46',
            }
          : tone === 'bank'
            ? {
                chipBg: 'rgba(79,70,229,0.10)',
                chipColor: '#4338ca',
                valueColor: '#3730a3',
                subColor: '#3730a3',
              }
            : tone === 'inventory'
              ? {
                  chipBg: 'rgba(71,85,105,0.08)',
                  chipColor: '#334155',
                  valueColor: '#0f172a',
                  subColor: '#475569',
                }
              : tone === 'sales'
                ? {
                    chipBg: 'rgba(37,99,235,0.08)',
                    chipColor: '#2563eb',
                    valueColor: '#1d4ed8',
                    subColor: '#1e40af',
                  }
                : {
                    chipBg: 'rgba(15,23,42,0.04)',
                    chipColor: 'text.secondary',
                    valueColor: 'inherit',
                    subColor: 'text.secondary',
                  };

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: 156,
        background: warning ? '#fffaf5' : 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,251,253,1))',
        border: warning
          ? '2px solid rgba(234,88,12,0.28)'
          : highlight
            ? '1px solid rgba(37,99,235,0.18)'
            : '1px solid rgba(15,23,42,0.06)',
        boxShadow: warning
          ? '0 20px 42px rgba(234,88,12,0.14)'
          : highlight
            ? '0 18px 36px rgba(37,99,235,0.10)'
            : '0 12px 28px rgba(15,23,42,0.05)',
        animation: warning ? 'duePulse 2.2s ease-in-out infinite' : 'none',
        '@keyframes duePulse': {
          '0%': { boxShadow: '0 20px 42px rgba(234,88,12,0.10)' },
          '50%': { boxShadow: '0 22px 52px rgba(234,88,12,0.22)' },
          '100%': { boxShadow: '0 20px 42px rgba(234,88,12,0.10)' },
        },
      }}
    >
      <CardContent>
        <Chip
          label={label}
          size="small"
          sx={{
            mb: 1.5,
            bgcolor: warning
              ? 'rgba(234,88,12,0.12)'
              : highlight
                ? 'rgba(37,99,235,0.08)'
                : toneStyles.chipBg,
            color: warning ? '#c2410c' : highlight ? 'primary.main' : toneStyles.chipColor,
            fontWeight: warning ? 800 : 500,
          }}
        />
        <Typography
          variant={warning ? 'h3' : 'h4'}
          fontWeight={950}
          sx={{ color: warning ? '#c2410c' : highlight ? 'primary.dark' : toneStyles.valueColor }}
        >
          {value}
        </Typography>
        {sub ? (
          <Typography
            variant="body2"
            color={warning ? '#9a3412' : toneStyles.subColor}
            sx={{ mt: 0.75, fontWeight: warning ? 700 : tone === 'default' ? 400 : 600 }}
          >
            {sub}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

function fmtDate(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DashboardPage() {
  const canManageTarget = hasRole('admin');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [mortalities, setMortalities] = useState<MortalityRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReportRecord[]>([]);
  const [costingReports, setCostingReports] = useState<CostingReportRecord[]>([]);
  const [dailyTarget, setDailyTarget] = useState<number>(0);
  const [todaySoldBirds, setTodaySoldBirds] = useState<number>(0);
  const [targetInput, setTargetInput] = useState<string>('');
  const [showDuePopup, setShowDuePopup] = useState(false);

  async function loadDashboard() {
    const [productRows, target, todayQuantity, saleRows, purchaseRows, mortalityRows, expenseRows, dailyReportRows, costingReportRows] =
      await Promise.all([
        mockProductsDb.list().catch(() => []),
        dailyTargetDb.getTarget().catch(() => ({ quantity: 0 })),
        dailyTargetDb.getTodayQuantity().catch(() => 0),
        salesApi.list().catch(() => []),
        purchasesApi.list().catch(() => []),
        mortalitiesApi.list().catch(() => []),
        expensesApi.list().catch(() => []),
        dailyReportsApi.list().catch(() => []),
        costingReportsApi.list().catch(() => []),
      ]);

    setProducts(productRows);
    setDailyTarget(target.quantity);
    setTargetInput(target.quantity ? String(target.quantity) : '');
    setTodaySoldBirds(todayQuantity);
    setSales(saleRows);
    setPurchases(purchaseRows);
    setMortalities(mortalityRows);
    setExpenses(expenseRows);
    setDailyReports(dailyReportRows);
    setCostingReports(costingReportRows);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const latestDailyReport = useMemo(
    () => [...dailyReports].sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate))).at(-1),
    [dailyReports]
  );
  const latestCostingReport = useMemo(
    () => [...costingReports].sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate))).at(-1),
    [costingReports]
  );
  const totalCostingSpent = useMemo(
    () => costingReports.reduce((sum, row) => sum + row.totalCost + row.totalCostInDay, 0),
    [costingReports]
  );
  const reportBasedCurrentBirdCost =
    latestDailyReport && latestDailyReport.closingBirds > 0
      ? totalCostingSpent / latestDailyReport.closingBirds
      : 0;
  const reportBasedDailyCostPerBird =
    latestCostingReport && latestCostingReport.birdCount > 0 ? latestCostingReport.totalCostInDay / latestCostingReport.birdCount : 0;

  const inventoryStock = products.length
    ? products.reduce((sum, product) => sum + product.stock, 0)
    : Number(latestDailyReport?.closingBirds ?? 0);
  const inventoryValue = products.length
    ? products.reduce((sum, product) => sum + product.stock * product.sellPrice, 0)
    : inventoryStock * reportBasedCurrentBirdCost;
  const totalAmountSold = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalDueAmount = sales.reduce((sum, sale) => sum + Math.max(0, sale.total - sale.received), 0);
  const totalPurchasedBirds = purchases.length
    ? purchases.reduce((sum, row) => sum + row.quantity, 0)
    : Number(dailyReports[0]?.openingBirds ?? 0);
  const totalMortalityBirds = mortalities.length
    ? mortalities.reduce((sum, row) => sum + row.quantity, 0)
    : dailyReports.reduce((sum, row) => sum + row.mortality, 0);
  const totalExpenseAmount = expenses.length
    ? expenses.reduce((sum, row) => sum + row.amount, 0)
    : costingReports.reduce((sum, row) => sum + row.totalCostInDay, 0);
  const expenseCostPerBird = products.length
    ? getExpenseCostPerBird(products, purchases, mortalities, totalExpenseAmount)
    : reportBasedDailyCostPerBird;
  const currentLiveBirdCost = products.length
    ? getCurrentLiveBirdCost(products, purchases, mortalities, totalExpenseAmount)
    : reportBasedCurrentBirdCost;
  const totalCashCollection = sales
    .filter((sale) => paymentGroupFor(sale.paymentMethod, sale.paymentGroup) === 'Cash')
    .reduce((sum, sale) => sum + sale.total, 0);
  const totalBankCollection = sales
    .filter((sale) => paymentGroupFor(sale.paymentMethod, sale.paymentGroup) === 'Bank')
    .reduce((sum, sale) => sum + sale.total, 0);
  const estimatedProfit = sales.reduce(
    (sum, sale) => sum + getSaleEstimatedProfit(sale, products, purchases, mortalities, totalExpenseAmount),
    0
  );

  const inventoryDetails = useMemo(
    () =>
      products.length
        ? [...products]
            .map((product) => ({
              ...product,
              currentCost: getCurrentProductCost(product, products, purchases, mortalities, totalExpenseAmount),
              profitPerBird: getProfitPerBird(product, products, purchases, mortalities, totalExpenseAmount),
              stockValue: product.stock * product.sellPrice,
            }))
            .sort((a, b) => b.stockValue - a.stockValue)
        : latestDailyReport
          ? [
              {
                id: latestDailyReport.id,
                name: 'Quail Bird Live',
                category: 'Live Bird',
                costPrice: latestCostingReport?.perBirdCost ?? 0,
                sellPrice: 0,
                stock: latestDailyReport.closingBirds,
                currentCost: reportBasedCurrentBirdCost,
                profitPerBird: 0,
                stockValue: latestDailyReport.closingBirds * reportBasedCurrentBirdCost,
              },
            ]
          : [],
    [products, purchases, mortalities, totalExpenseAmount, latestDailyReport, latestCostingReport, reportBasedCurrentBirdCost]
  );
  const primaryLiveBird = useMemo(
    () =>
      inventoryDetails
        .filter((product) => product.category === 'Live Bird')
        .sort((a, b) => b.stock - a.stock)[0],
    [inventoryDetails]
  );

  const hasProducts = products.length > 0;
  const targetRemaining = Math.max(dailyTarget - todaySoldBirds, 0);
  const targetPercent = dailyTarget > 0 ? Math.min((todaySoldBirds / dailyTarget) * 100, 100) : 0;
  const targetCompleted = dailyTarget > 0 && todaySoldBirds >= dailyTarget;
  const recentSales = sales.slice(0, 5);

  const topProducts = useMemo(() => {
    const totals = new Map<string, { label: string; qty: number; amount: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const label = item.category ? `${item.name} / ${item.category}` : item.name;
        const current = totals.get(label) ?? { label, qty: 0, amount: 0 };
        current.qty += item.qty;
        current.amount += item.lineTotal;
        totals.set(label, current);
      }
    }
    return [...totals.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [sales]);
  const topProductAmounts = topProducts.slice(0, 3);
  const maxTopAmount = topProducts[0]?.amount ?? 1;

  useEffect(() => {
    setShowDuePopup(totalDueAmount > 0);
  }, [totalDueAmount]);

  function saveTarget() {
    if (!hasProducts) return;
    const next = Math.max(0, Number(targetInput) || 0);
    setDailyTarget(next);
    void dailyTargetDb.setTarget(next);
    setTargetInput(next ? String(next) : '');
  }

  function clearTarget() {
    setDailyTarget(0);
    setTargetInput('');
    void dailyTargetDb.setTarget(0);
  }

  return (
    <Box sx={{ display: 'grid', gap: 2.25 }}>
      <Snackbar open={showDuePopup} onClose={() => setShowDuePopup(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert
          onClose={() => setShowDuePopup(false)}
          severity="warning"
          variant="filled"
          sx={{
            width: '100%',
            minWidth: { xs: 320, sm: 460 },
            alignItems: 'flex-start',
            boxShadow: '0 18px 40px rgba(180,83,9,0.28)',
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography variant="body2" fontWeight={800} sx={{ opacity: 0.92 }}>
            Due amount pending
          </Typography>
          <Typography variant="h4" fontWeight={950} sx={{ lineHeight: 1.1, my: 0.4 }}>
            {`\u20B9 ${money(totalDueAmount)}`}
          </Typography>
          <Typography variant="body2">Please follow up with customers.</Typography>
        </Alert>
      </Snackbar>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <KpiCard label="Today Birds Sold" value={`${todaySoldBirds}`} sub="Birds billed today" highlight />
        <KpiCard
          label="Purchased Birds"
          value={`${totalPurchasedBirds}`}
          sub={products.length || purchases.length ? 'Birds entered from purchases' : 'Opening birds from imported report'}
          tone="inventory"
        />
        <KpiCard label="Bird Deaths" value={`${totalMortalityBirds}`} sub="Recorded mortality count" tone="danger" />
        <KpiCard
          label="Daily Bird Target"
          value={dailyTarget ? `${dailyTarget}` : 'Not set'}
          sub={dailyTarget ? `${targetPercent.toFixed(0)}% completed` : 'Add today target'}
        />
        <KpiCard label="Sales" value={`${sales.length}`} sub={sales.length ? 'Saved sale records' : 'No sales yet'} tone="sales" />
        <KpiCard label="Total Amount Sold" value={`\u20B9 ${money(totalAmountSold)}`} sub="Across all completed sales" tone="sales" />
        <KpiCard
          label="Current Bird Cost"
          value={`\u20B9 ${money(currentLiveBirdCost)}`}
          sub={products.length ? 'Purchase cost plus feed and farm expenses' : 'Derived from imported March costing report'}
          tone="inventory"
        />
        <KpiCard
          label="Single Bird Profit"
          value={`\u20B9 ${money(primaryLiveBird?.profitPerBird ?? 0)}`}
          sub={products.length ? (primaryLiveBird ? `${primaryLiveBird.name} after current cost` : 'Add a live bird product first') : 'Selling price not available in imported report'}
          tone={(primaryLiveBird?.profitPerBird ?? 0) >= 0 ? 'profit' : 'danger'}
        />
        <KpiCard
          label="Estimated Profit"
          value={`\u20B9 ${money(estimatedProfit)}`}
          sub="Sales minus current estimated bird cost"
          tone={estimatedProfit >= 0 ? 'profit' : 'danger'}
        />
        <KpiCard
          label="Due Amount"
          value={`\u20B9 ${money(totalDueAmount)}`}
          sub={totalDueAmount > 0 ? 'Pending amount to collect. Follow up with customers.' : 'No pending due'}
          warning={totalDueAmount > 0}
        />
        <KpiCard label="Cash Collection" value={`\u20B9 ${money(totalCashCollection)}`} sub="Cash payment total" tone="cash" />
        <KpiCard label="Bank Collection" value={`\u20B9 ${money(totalBankCollection)}`} sub="UPI and card total" tone="bank" />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' },
          gap: 2,
          alignItems: 'stretch',
        }}
      >
        <KpiCard
          label="Inventory"
          value={`\u20B9 ${money(inventoryValue)}`}
          sub={
            products.length
              ? `${inventoryStock} total stock units in hand`
              : `${inventoryStock} live birds in hand from latest imported report`
          }
          tone="inventory"
        />
        <Card
          sx={{
            border: '1px solid rgba(15,23,42,0.08)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,1))',
          }}
        >
          <CardContent>
            <SectionHeader
              eyebrow="Sales Amount"
              title="Product-wise amount sold"
              caption={
                products.length || sales.length
                  ? `Feed, labour, and electricity are adding \u20B9 ${money(expenseCostPerBird)} cost per live bird right now.`
                  : `Imported costing report shows \u20B9 ${money(expenseCostPerBird)} daily cost per live bird on ${latestCostingReport?.reportDate ?? 'the latest day'}.`
              }
            />
            {!topProductAmounts.length ? (
              <Typography color="text.secondary">Product-wise sales amount will appear after billing starts.</Typography>
            ) : (
              <Stack spacing={1}>
                {topProductAmounts.map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      p: 1.2,
                      borderRadius: 2.5,
                      border: '1px solid rgba(15,23,42,0.08)',
                      background: 'rgba(255,255,255,0.98)',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={800}>{item.label}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.qty} sold
                        </Typography>
                      </Box>
                      <Typography fontWeight={900}>{`\u20B9 ${money(item.amount)}`}</Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>

      <Card
        sx={{
          border: targetCompleted ? '1px solid rgba(34,197,94,0.34)' : '1px solid rgba(245,158,11,0.34)',
          background: targetCompleted
            ? 'linear-gradient(135deg, rgba(34,197,94,0.16), rgba(255,255,255,0.03))'
            : 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(255,255,255,0.03))',
        }}
      >
        <CardContent>
          <SectionHeader
            eyebrow="Daily Target"
            title={targetCompleted ? 'Daily target completed' : 'Complete today target'}
            caption={
              dailyTarget
                ? targetCompleted
                  ? 'Great work. Today bird sales have already reached the target.'
                  : `You still need ${targetRemaining} more birds to complete today target.`
                : 'Set a daily target in bird count so the dashboard can warn you when sales are behind.'
            }
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              label="Daily target birds"
              type="number"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              disabled={!canManageTarget || !hasProducts}
              sx={{ width: { xs: '100%', md: 220 } }}
              helperText={!hasProducts ? 'Add products first to set a target.' : ' '}
            />
            <Button variant="contained" onClick={saveTarget} disabled={!canManageTarget || !hasProducts}>
              Save target
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={clearTarget}
              disabled={!canManageTarget || dailyTarget === 0}
            >
              Remove target
            </Button>
            {dailyTarget ? (
              <Chip
                label={targetCompleted ? 'Target completed' : `Remaining ${targetRemaining} birds`}
                color={targetCompleted ? 'success' : 'warning'}
                size="small"
              />
            ) : null}
          </Stack>
          {!canManageTarget ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
              Only admin can change the daily bird target. Salesman can view progress here.
            </Typography>
          ) : !hasProducts ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
              Add at least one product before setting a daily target.
            </Typography>
          ) : null}

          {dailyTarget ? (
            <Box sx={{ mt: 2, height: 12, borderRadius: 999, bgcolor: 'rgba(15,23,42,0.08)', overflow: 'hidden' }}>
              <Box
                sx={{
                  width: `${targetPercent}%`,
                  minWidth: todaySoldBirds > 0 ? 8 : 0,
                  height: '100%',
                  borderRadius: 999,
                  background: targetCompleted
                    ? 'linear-gradient(90deg, #22c55e, #86efac)'
                    : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                }}
              />
            </Box>
          ) : null}
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.25fr 0.95fr' }, gap: 2 }}>
        <Card
          sx={{
            border: '1px solid rgba(15,23,42,0.08)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,1))',
          }}
        >
          <CardContent>
            <SectionHeader
              eyebrow="Inventory Details"
              title="Current stock register"
              caption={
                products.length
                  ? `Base purchase cost plus total farm expenses of \u20B9 ${money(totalExpenseAmount)} are used to show current live-bird cost.`
                  : `Imported March report is being used here. Total costing considered: \u20B9 ${money(totalCostingSpent)}.`
              }
            />
            {!inventoryDetails.length ? (
              <Typography color="text.secondary">
                Add products in Products and the inventory register will appear here.
              </Typography>
            ) : (
              <Stack spacing={1.1}>
                {inventoryDetails.map((product) => (
                  <Box
                    key={product.id}
                    sx={{
                      p: 1.3,
                      borderRadius: 3,
                      border: '1px solid rgba(15,23,42,0.08)',
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1.3fr 0.6fr 0.7fr 0.8fr' },
                      gap: 1,
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.96)',
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={900}>
                        {product.name}
                        {product.category ? ` / ${product.category}` : ''}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Base cost: {`\u20B9 ${money(product.costPrice)}`}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Stock
                      </Typography>
                      <Typography fontWeight={900}>{product.stock}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Current cost
                      </Typography>
                      <Typography fontWeight={900}>{`\u20B9 ${money(product.currentCost)}`}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Profit / bird
                      </Typography>
                      <Typography fontWeight={900}>{`\u20B9 ${money(product.profitPerBird)}`}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Sell
                      </Typography>
                      <Typography fontWeight={900}>{`\u20B9 ${money(product.sellPrice)}`}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Value
                      </Typography>
                      <Typography fontWeight={900}>{`\u20B9 ${money(product.stockValue)}`}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionHeader
              eyebrow="Recent Sales"
              title="Latest sales"
              caption="These are the most recent completed sales from billing."
            />
            {!recentSales.length ? (
              <Typography color="text.secondary">Complete your first sale and it will appear here.</Typography>
            ) : (
              <Stack spacing={1.2}>
                {recentSales.map((sale) => (
                  <Box
                    key={sale.id}
                    sx={{
                      p: 1.25,
                      border: '1px solid rgba(15,23,42,0.08)',
                      borderRadius: 3,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr auto auto' },
                      gap: 1,
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography fontWeight={900}>
                        {sale.items.map((item) => `${item.name}${item.category ? ` / ${item.category}` : ''}`).join(', ')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {fmtDate(sale.createdAt)} by {sale.createdByUsername}
                      </Typography>
                    </Box>
                    <Typography fontWeight={800}>{`\u20B9 ${money(sale.total)}`}</Typography>
                    <Chip
                      label={`${sale.paymentMethod} / ${paymentGroupFor(sale.paymentMethod, sale.paymentGroup)}`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionHeader
              eyebrow="Top Products"
              title="Product sales breakdown"
              caption="See how much amount each product has sold for."
            />
            {!topProducts.length ? (
              <Typography color="text.secondary">Sales graphs will appear after billing starts.</Typography>
            ) : (
              <Stack spacing={1.3}>
                {topProducts.map((item) => (
                  <Box key={item.label}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.7 }} spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={800}>{item.label}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.qty} sold
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {`\u20B9 ${money(item.amount)}`}
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 10, borderRadius: 999, bgcolor: 'rgba(15,23,42,0.08)', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${(item.amount / maxTopAmount) * 100}%`,
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>

      {!products.length ? (
        <Card
          sx={{
            border: '1px solid rgba(15,23,42,0.08)',
            background: `linear-gradient(180deg, ${alpha('#ffffff', 0.98)}, ${alpha('#f8fafc', 1)})`,
          }}
        >
          <CardContent>
            <SectionHeader
              eyebrow="Setup"
              title="Add your first products"
              caption="Go to Products and enter your real farm inventory to activate purchases, billing, mortality, and dashboard analytics."
            />
            <Divider sx={{ borderColor: 'rgba(15,23,42,0.08)' }} />
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
}
