import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { CostingReportRecord, DailyReportRecord, LarvaCostingRecord } from '../types';
import { costingReportsApi } from '../lib/costingReportsApi';
import { dailyReportsApi } from '../lib/dailyReportsApi';
import { larvaCostingApi } from '../lib/larvaCostingApi';
import { reportSeedApi } from '../lib/reportSeedApi';

const importedSales = [
  { reportDate: '2026-04-03', quailBirdsSold: 17, birdSellPrice: 50, eggsSold: 0, eggSellPrice: 4 },
  { reportDate: '2026-04-04', quailBirdsSold: 4, birdSellPrice: 50, eggsSold: 15, eggSellPrice: 4 },
] as const;

function money(n: number, digits = 2) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

function monthLabel(reportDate: string) {
  const value = new Date(reportDate);
  if (Number.isNaN(value.getTime())) return reportDate;
  return value.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function shortDate(reportDate: string) {
  const value = new Date(reportDate);
  if (Number.isNaN(value.getTime())) return reportDate;
  return value.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
      <CardContent>
        <Typography
          variant="body2"
          sx={{
            color: '#2563eb',
            display: 'inline-flex',
            px: 1,
            py: 0.35,
            borderRadius: 999,
            bgcolor: 'rgba(37,99,235,0.08)',
            fontWeight: 700,
          }}
        >
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={900} sx={{ mt: 1, color: '#0f172a' }}>
          {value}
        </Typography>
        {sub ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
            {sub}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ReportDashboardPage() {
  const [dailyReports, setDailyReports] = useState<DailyReportRecord[]>([]);
  const [costingReports, setCostingReports] = useState<CostingReportRecord[]>([]);
  const [larvaCostingReports, setLarvaCostingReports] = useState<LarvaCostingRecord[]>([]);

  useEffect(() => {
    Promise.all([
      dailyReportsApi.list().catch(() => []),
      costingReportsApi.list().catch(() => []),
      larvaCostingApi.list().catch(() => []),
    ]).then(async ([dailyRows, costingRows, larvaRows]) => {
      const seed = await reportSeedApi.get();
      setDailyReports(dailyRows.length ? dailyRows : seed.dailyReports);
      setCostingReports(costingRows.length ? costingRows : seed.costingReports);
      setLarvaCostingReports(larvaRows.length ? larvaRows : seed.larvaCostingReports);
    });
  }, []);

  const latestDaily = useMemo(
    () => [...dailyReports].sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate))).at(-1),
    [dailyReports]
  );
  const latestCosting = useMemo(
    () => [...costingReports].sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate))).at(-1),
    [costingReports]
  );
  const latestImportedSale = useMemo(
    () => [...importedSales].sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate))).at(-1),
    []
  );

  const latestProfitSnapshot = useMemo(() => {
    if (!latestImportedSale) return null;
    const matchingCost = [...costingReports]
      .sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate)))
      .filter((row) => String(row.reportDate) <= String(latestImportedSale.reportDate))
      .at(-1);
    const singleBirdCost =
      Number(matchingCost?.finalPerBirdCost ?? 0) ||
      (matchingCost && matchingCost.birdCount > 0 ? matchingCost.totalCostInDay / matchingCost.birdCount : 0);

    return {
      reportDate: latestImportedSale.reportDate,
      costDate: matchingCost?.reportDate,
      birdSellPrice: latestImportedSale.birdSellPrice,
      birdCount: latestImportedSale.quailBirdsSold,
      eggCount: latestImportedSale.eggsSold,
      singleBirdCost,
      singleBirdProfit: latestImportedSale.birdSellPrice - singleBirdCost,
      totalSales:
        latestImportedSale.quailBirdsSold * latestImportedSale.birdSellPrice +
        latestImportedSale.eggsSold * latestImportedSale.eggSellPrice,
    };
  }, [latestImportedSale, costingReports]);

  const monthlySummary = useMemo(() => {
    const map = new Map<
      string,
      {
        month: string;
        birds: number;
        feedCost: number;
        larvaCost: number;
        totalCost: number;
      }
    >();

    for (const row of dailyReports) {
      const key = String(row.reportDate).slice(0, 7);
      const current = map.get(key) ?? { month: key, birds: 0, feedCost: 0, larvaCost: 0, totalCost: 0 };
      current.birds = row.closingBirds;
      current.feedCost += row.totalFeedCost;
      map.set(key, current);
    }

    for (const row of costingReports) {
      const key = String(row.reportDate).slice(0, 7);
      const current = map.get(key) ?? { month: key, birds: 0, feedCost: 0, larvaCost: 0, totalCost: 0 };
      current.totalCost += row.totalCostInDay + row.totalCost;
      current.larvaCost += Number(row.larva ?? 0);
      map.set(key, current);
    }

    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [dailyReports, costingReports]);

  const historicalBirds = useMemo(
    () =>
      [...dailyReports]
        .sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate)))
        .slice(-12),
    [dailyReports]
  );
  const maxBirds = historicalBirds.reduce((max, row) => Math.max(max, row.closingBirds), 1);

  return (
    <Box sx={{ display: 'grid', gap: 2.2 }}>
      <Box>
        <Typography variant="h5" fontWeight={900}>
          Report Dashboard
        </Typography>
        <Typography color="text.secondary">
          This page shows only the imported Excel report data from daily, quail costing, and larva costing sheets.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)', xl: 'repeat(7, 1fr)' }, gap: 2 }}>
        <KpiCard
          label="Latest Closing Birds"
          value={`${latestDaily?.closingBirds ?? 0}`}
          sub={latestDaily ? `As of ${shortDate(latestDaily.reportDate)}` : 'No imported daily report yet'}
        />
        <KpiCard
          label="Latest Feed Cost"
          value={`₹ ${money(latestDaily?.totalFeedCost ?? 0)}`}
          sub={latestDaily ? `Per bird feed cost ₹ ${money(latestDaily.perBirdFeedCost, 4)}` : 'No imported daily report yet'}
        />
        <KpiCard
          label="Latest Cost in Day"
          value={`₹ ${money(latestCosting?.totalCostInDay ?? 0)}`}
          sub={latestCosting ? `${shortDate(latestCosting.reportDate)} quail costing` : 'No imported costing report yet'}
        />
        <KpiCard
          label="Single Bird Sale Price"
          value={`₹ ${money(latestProfitSnapshot?.birdSellPrice ?? 0)}`}
          sub={latestProfitSnapshot ? `Imported sale on ${shortDate(latestProfitSnapshot.reportDate)}` : 'No imported sale data yet'}
        />
        <KpiCard
          label="Single Bird Cost"
          value={`₹ ${money(latestProfitSnapshot?.singleBirdCost ?? 0)}`}
          sub={
            latestProfitSnapshot?.costDate
              ? `Using costing from ${shortDate(latestProfitSnapshot.costDate)}`
              : 'No matching costing report yet'
          }
        />
        <KpiCard
          label="Single Bird Profit"
          value={`₹ ${money(latestProfitSnapshot?.singleBirdProfit ?? 0)}`}
          sub={
            latestProfitSnapshot
              ? `${latestProfitSnapshot.birdCount} birds sold and ${latestProfitSnapshot.eggCount} eggs sold`
              : 'Profit will show after imported sale data is available'
          }
        />
        <KpiCard
          label="Larva Entries"
          value={`${larvaCostingReports.length}`}
          sub={larvaCostingReports.length ? 'Imported larva costing rows' : 'No larva costing imported yet'}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.15fr 0.95fr' }, gap: 2 }}>
        <Card sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
          <CardContent>
            <Typography fontWeight={900} sx={{ mb: 0.5 }}>
              Historical birds bar graph
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Imported daily report data only.
            </Typography>
            {!historicalBirds.length ? (
              <Typography color="text.secondary">No imported daily report data yet.</Typography>
            ) : (
              <Stack spacing={1.2}>
                {historicalBirds.map((row) => (
                  <Box key={row.id}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }} spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={800}>{shortDate(row.reportDate)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {row.closingBirds} closing birds
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">{`₹ ${money(row.totalFeedCost)}`}</Typography>
                    </Stack>
                    <Box sx={{ height: 12, borderRadius: 999, bgcolor: 'rgba(15,23,42,0.08)', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${(row.closingBirds / maxBirds) * 100}%`,
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, #16a34a, #86efac)',
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
          <CardContent>
            <Typography fontWeight={900} sx={{ mb: 0.5 }}>
              Month totals
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Imported report totals grouped month-wise.
            </Typography>
            {!monthlySummary.length ? (
              <Typography color="text.secondary">No imported report summary yet.</Typography>
            ) : (
              <Stack spacing={1.1}>
                {monthlySummary.map((row) => (
                  <Box
                    key={row.month}
                    sx={{
                      p: 1.2,
                      borderRadius: 3,
                      border: '1px solid rgba(15,23,42,0.08)',
                      background: 'rgba(255,255,255,0.98)',
                    }}
                  >
                    <Typography fontWeight={800}>{monthLabel(`${row.month}-01`)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Birds: {row.birds}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Feed Cost: ₹ {money(row.feedCost)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Larva: ₹ {money(row.larvaCost)}
                    </Typography>
                    <Typography variant="body2" fontWeight={800} sx={{ mt: 0.4 }}>
                      Total Cost: ₹ {money(row.totalCost)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
