import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ExcelIcon from '@mui/icons-material/GridOn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import type { CostingReportRecord, DailyReportRecord, ExpenseRecord, MortalityRecord, PurchaseRecord, SaleRecord } from '../types';
import { costingReportsApi } from '../lib/costingReportsApi';
import { dailyReportsApi } from '../lib/dailyReportsApi';
import { expensesApi } from '../lib/expensesApi';
import { mortalitiesApi } from '../lib/mortalitiesApi';
import { purchasesApi } from '../lib/purchasesApi';
import { salesApi } from '../lib/salesApi';

function money(n: number, digits = 2) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

function dateKey(value: string) {
  return String(value).slice(0, 10);
}

function fmtDate(date: string) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return date;
  return value.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isBirdSaleItem(item: SaleRecord['items'][number]) {
  const label = `${item.name} ${item.category ?? ''}`.toLowerCase();
  if (label.includes('egg')) {
    return false;
  }
  return label.includes('bird') || label.includes('koodi') || label.includes('kodi') || label.includes('meat') || label.includes('live');
}

function buildDailyReports(
  purchases: PurchaseRecord[],
  mortalities: MortalityRecord[],
  sales: SaleRecord[],
  expenses: ExpenseRecord[]
): DailyReportRecord[] {
  const allDates = new Set<string>();

  for (const row of purchases) allDates.add(dateKey(row.createdAt));
  for (const row of mortalities) allDates.add(dateKey(row.createdAt));
  for (const row of sales) allDates.add(dateKey(row.createdAt));
  for (const row of expenses) allDates.add(dateKey(row.createdAt));

  const sortedDates = [...allDates].sort();
  let previousClosingBirds = 0;
  let previousClosingFeedKg = 0;

  return sortedDates.map((reportDate) => {
    const purchasedBirds = purchases
      .filter((row) => dateKey(row.createdAt) === reportDate)
      .reduce((sum, row) => sum + row.quantity, 0);

    const mortality = mortalities
      .filter((row) => dateKey(row.createdAt) === reportDate)
      .reduce((sum, row) => sum + row.quantity, 0);

    const sick = mortalities
      .filter((row) => dateKey(row.createdAt) === reportDate)
      .reduce((sum, row) => sum + Number(row.sickQuantity ?? 0), 0);

    const liveBirdSales = sales
      .filter((row) => dateKey(row.createdAt) === reportDate)
      .flatMap((row) => row.items)
      .filter(isBirdSaleItem)
      .reduce((sum, item) => sum + item.qty, 0);

    const feedExpenses = expenses.filter((row) => row.category === 'Feed' && dateKey(row.createdAt) === reportDate);
    const totalFeedCost = feedExpenses.reduce((sum, row) => sum + row.amount, 0);
    const receivedFeedKg = feedExpenses.reduce((sum, row) => sum + Number(row.feedReceivedKg ?? 0), 0);
    const usedFeedKg = feedExpenses.reduce((sum, row) => sum + Number(row.feedUsedKg ?? 0), 0);
    const manualOpeningFeedKg = feedExpenses.find((row) => row.openingFeedKg !== undefined && row.openingFeedKg !== null);

    const openingBirds = previousClosingBirds;
    const closingBirds = Math.max(0, openingBirds + purchasedBirds - mortality - liveBirdSales);

    const openingFeedKg = manualOpeningFeedKg ? Number(manualOpeningFeedKg.openingFeedKg ?? 0) : previousClosingFeedKg;
    const closingFeedKg = Math.max(0, openingFeedKg + receivedFeedKg - usedFeedKg);
    const perBirdKg = closingBirds > 0 ? usedFeedKg / closingBirds : 0;
    const perBirdFeedCost = closingBirds > 0 ? totalFeedCost / closingBirds : 0;

    previousClosingBirds = closingBirds;
    previousClosingFeedKg = closingFeedKg;

    return {
      id: reportDate,
      reportDate,
      openingBirds,
      mortality,
      sick,
      closingBirds,
      openingFeedKg,
      usedFeedKg,
      receivedFeedKg,
      closingFeedKg,
      perBirdKg,
      perBirdFeedCost,
      totalFeedCost,
    };
  });
}

function monthLabel(reportDate: string) {
  const value = new Date(reportDate);
  if (Number.isNaN(value.getTime())) return reportDate;
  return value.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function toCsvCell(value: string | number) {
  const safe = String(value ?? '');
  return `"${safe.replaceAll('"', '""')}"`;
}

function excelDate(reportDate: string) {
  const [year, month, day] = String(reportDate).split('-').map(Number);
  if (!year || !month || !day) return reportDate;
  return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
}

export function ReportsPage() {
  const [costingReports, setCostingReports] = useState<CostingReportRecord[]>([]);
  const [storedReports, setStoredReports] = useState<DailyReportRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [mortalities, setMortalities] = useState<MortalityRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);

  useEffect(() => {
    Promise.all([
      costingReportsApi.list().catch(() => []),
      dailyReportsApi.list().catch(() => []),
      purchasesApi.list().catch(() => []),
      mortalitiesApi.list().catch(() => []),
      salesApi.list().catch(() => []),
      expensesApi.list().catch(() => []),
    ]).then(([costingReportRows, dailyReportRows, purchaseRows, mortalityRows, saleRows, expenseRows]) => {
      setCostingReports(costingReportRows);
      setStoredReports(dailyReportRows);
      setPurchases(purchaseRows);
      setMortalities(mortalityRows);
      setSales(saleRows);
      setExpenses(expenseRows);
    });
  }, []);

  const rows = useMemo(() => {
    const computedRows = buildDailyReports(purchases, mortalities, sales, expenses);
    const merged = new Map<string, DailyReportRecord>();

    for (const row of computedRows) {
      merged.set(row.reportDate, row);
    }

    for (const row of storedReports) {
      merged.set(row.reportDate, row);
    }

    return [...merged.values()].sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate)));
  }, [storedReports, purchases, mortalities, sales, expenses]);

  const monthlyRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        month: string;
        openingBirds: number;
        mortality: number;
        sick: number;
        closingBirds: number;
        openingFeedKg: number;
        usedFeedKg: number;
        receivedFeedKg: number;
        closingFeedKg: number;
        totalFeedCost: number;
        totalCostInMonth: number;
      }
    >();

    const sortedDaily = [...rows].sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate)));
    for (const row of sortedDaily) {
      const monthKey = String(row.reportDate).slice(0, 7);
      const current = grouped.get(monthKey);
      if (!current) {
        grouped.set(monthKey, {
          month: monthKey,
          openingBirds: row.openingBirds,
          mortality: row.mortality,
          sick: row.sick,
          closingBirds: row.closingBirds,
          openingFeedKg: row.openingFeedKg,
          usedFeedKg: row.usedFeedKg,
          receivedFeedKg: row.receivedFeedKg,
          closingFeedKg: row.closingFeedKg,
          totalFeedCost: row.totalFeedCost,
          totalCostInMonth: 0,
        });
      } else {
        current.mortality += row.mortality;
        current.sick += row.sick;
        current.usedFeedKg += row.usedFeedKg;
        current.receivedFeedKg += row.receivedFeedKg;
        current.totalFeedCost += row.totalFeedCost;
        current.closingBirds = row.closingBirds;
        current.closingFeedKg = row.closingFeedKg;
      }
    }

    for (const row of costingReports) {
      const monthKey = String(row.reportDate).slice(0, 7);
      const current = grouped.get(monthKey);
      if (current) {
        current.totalCostInMonth += row.totalCostInDay + row.totalCost;
      }
    }

    return [...grouped.values()].map((row) => ({
      ...row,
      averagePerBirdKg: row.closingBirds > 0 ? row.usedFeedKg / row.closingBirds : 0,
      averagePerBirdFeedCost: row.closingBirds > 0 ? row.totalFeedCost / row.closingBirds : 0,
    }));
  }, [rows, costingReports]);

  const dailyRowsByMonth = useMemo(() => {
    const grouped = new Map<string, DailyReportRecord[]>();
    for (const row of rows) {
      const key = String(row.reportDate).slice(0, 7);
      const current = grouped.get(key) ?? [];
      current.push(row);
      grouped.set(key, current);
    }
    return [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, monthRows]) => ({
        month,
        label: monthLabel(`${month}-01`),
        rows: monthRows.sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate))),
      }));
  }, [rows]);

  const costingRowsByMonth = useMemo(() => {
    const grouped = new Map<string, CostingReportRecord[]>();
    for (const row of costingReports) {
      const key = String(row.reportDate).slice(0, 7);
      const current = grouped.get(key) ?? [];
      current.push(row);
      grouped.set(key, current);
    }
    return [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, monthRows]) => ({
        month,
        label: monthLabel(`${month}-01`),
        rows: monthRows.sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate))),
      }));
  }, [costingReports]);

  const exportDailyReportToExcel = () => {
    const header = [
      'Date',
      'Opening Birds',
      'Mortality',
      'Sick',
      'C - Birds',
      'Feed OB in KGS',
      'Used in KGS',
      'Received in KGS',
      'Closing Feed in KGS',
      'Per Bird in KGS',
      'Per Bird Feed Cost',
      'Total Feed Cost',
    ];

    const csvRows = rows.map((row) => [
      fmtDate(row.reportDate),
      row.openingBirds,
      row.mortality,
      row.sick,
      row.closingBirds,
      row.openingFeedKg,
      row.usedFeedKg,
      row.receivedFeedKg,
      row.closingFeedKg,
      row.perBirdKg,
      row.perBirdFeedCost,
      row.totalFeedCost,
    ]);

    const csv = [header, ...csvRows]
      .map((row) => row.map((cell) => toCsvCell(cell)).join(','))
      .join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCostingStyledExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('TOTAL QUAIL COSTING');

    sheet.columns = [
      { width: 14 },
      { width: 10 },
      { width: 10 },
      { width: 12 },
      { width: 10 },
      { width: 11 },
      { width: 11 },
      { width: 12 },
      { width: 12 },
      { width: 10 },
      { width: 12 },
      { width: 14 },
      { width: 10 },
    ];

    sheet.mergeCells('A1:M1');
    sheet.getCell('A1').value = 'SVR INTEGRATED FARMING';
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('A1').font = { bold: true, size: 16 };
    sheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF34FF17' },
    };
    sheet.getCell('A1').border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    sheet.mergeCells('A2:M2');
    sheet.getCell('A2').value = 'TOTAL QUAIL COSTING';
    sheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('A2').font = { bold: true, size: 14 };
    sheet.getCell('A2').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' },
    };
    sheet.getCell('A2').border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    const headerRow = sheet.getRow(4);
    headerRow.values = [
      'DATE',
      'NO OF BIRDS',
      'PER BIRD COST',
      'TOTAL COST',
      'FEED IN PER KG',
      'PER BIRD FEED IN GRMS',
      'TOTAL FEED IN KGS',
      'TOTAL COST FEED',
      'OTHER EXPENSES',
      'GAS',
      'DAILY LABOUR',
      'TOTAL COST IN DAY',
      'PER BIRD COST',
    ];

    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5E5' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 42;

    const currencyCols = [3, 4, 5, 8, 9, 10, 11, 12, 13];

    costingReports.forEach((row, index) => {
      const sheetRow = sheet.getRow(5 + index);
      const finalPerBirdCost = row.birdCount > 0 ? row.totalCostInDay / row.birdCount : 0;
      sheetRow.values = [
        excelDate(row.reportDate),
        row.birdCount,
        row.perBirdCost,
        row.totalCost,
        row.feedPerKg,
        row.perBirdFeedGrams,
        row.totalFeedKg,
        row.totalFeedCost,
        row.otherExpenses,
        row.gas,
        row.dailyLabour,
        row.totalCostInDay,
        finalPerBirdCost,
      ];

      sheetRow.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        if (currencyCols.includes(colNumber)) {
          cell.numFmt = '"₹"#,##0.00';
        }
      });

      sheetRow.getCell(12).font = { color: { argb: 'FFFF0000' } };
      sheetRow.getCell(13).font = { color: { argb: 'FF000000' } };
    });

    const totalRowNumber = 5 + costingReports.length + 2;
    const totalRow = sheet.getRow(totalRowNumber);
    const totalFeedKg = costingReports.reduce((sum, row) => sum + row.totalFeedKg, 0);
    const totalFeedCost = costingReports.reduce((sum, row) => sum + row.totalFeedCost, 0);
    const totalOtherExpenses = costingReports.reduce((sum, row) => sum + row.otherExpenses, 0);
    const totalGas = costingReports.reduce((sum, row) => sum + row.gas, 0);
    const totalDailyLabour = costingReports.reduce((sum, row) => sum + row.dailyLabour, 0);
    const totalCostInDay = costingReports.reduce((sum, row) => sum + row.totalCostInDay, 0);
    const totalBirdsForCost = costingReports.reduce((sum, row) => sum + row.birdCount, 0);
    const totalPerBirdCost = totalBirdsForCost > 0 ? totalCostInDay / totalBirdsForCost : 0;

    totalRow.getCell(2).value = 'TOTAL :';
    totalRow.getCell(7).value = totalFeedKg;
    totalRow.getCell(8).value = totalFeedCost;
    totalRow.getCell(9).value = totalOtherExpenses;
    totalRow.getCell(10).value = totalGas;
    totalRow.getCell(11).value = totalDailyLabour;
    totalRow.getCell(12).value = totalCostInDay;
    totalRow.getCell(13).value = totalPerBirdCost;

    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: 'FFFF0000' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (currencyCols.includes(colNumber)) {
        cell.numFmt = '"₹"#,##0.00';
      }
    });
    totalRow.getCell(13).font = { bold: true, color: { argb: 'FF000000' } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'QUAIL-COSTING-REPORT-MARCH-2026.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
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
          <Typography variant="h5" fontWeight={900}>
            Quail & Feed Daily Report
          </Typography>
          <Typography color="text.secondary">
            This report shows saved daily rows and also fills automatically from purchases, bird sales, mortality, and feed entries recorded during daily work.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          sx={{ borderRadius: 10, fontWeight: 900 }}
          onClick={exportDailyReportToExcel}
          disabled={!rows.length}
        >
          Export Excel
        </Button>
      </Box>

      <Alert severity="info">
        Salesmen and admins do not need to fill this report manually. Saved sheet rows stay here, and live bird counts come from purchases, sales, mortality, and feed entries.
      </Alert>

      <Accordion defaultExpanded sx={{ borderRadius: '16px !important', overflow: 'hidden' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack spacing={0.35}>
            <Typography fontWeight={800}>Daily report register</Typography>
            <Typography variant="body2" color="text.secondary">
              Open only when you want to see the daily bird and feed report.
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          {!dailyRowsByMonth.length ? (
            <Typography color="text.secondary">No daily activity yet. Start entering purchases, sales, mortality, and feed expenses.</Typography>
          ) : (
            <Stack spacing={1.2}>
              {dailyRowsByMonth.map((monthGroup) => (
                <Accordion key={monthGroup.month} sx={{ borderRadius: '14px !important', overflow: 'hidden', boxShadow: 'none', border: '1px solid rgba(15,23,42,0.08)' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack spacing={0.25}>
                      <Typography fontWeight={800}>{monthGroup.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {monthGroup.rows.length} daily entries
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ overflowX: 'auto' }}>
                      <Box sx={{ minWidth: 1350 }}>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1.1fr 1fr 0.8fr 0.7fr 0.9fr 1fr 1fr 1fr 1fr 0.9fr 1fr 1fr',
                            gap: 1,
                            p: 1.2,
                            borderRadius: 3,
                            bgcolor: '#34ff17',
                            color: '#0f172a',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                          }}
                        >
                          <Box>Date</Box>
                          <Box>Opening Birds</Box>
                          <Box>Mortality</Box>
                          <Box>Sick</Box>
                          <Box>C - Birds</Box>
                          <Box>Feed - OB in KGS</Box>
                          <Box>Used in KGS</Box>
                          <Box>Received in KGS</Box>
                          <Box>Closing Feed in KGS</Box>
                          <Box>Per Bird in KGS</Box>
                          <Box>Per Bird Feed Cost</Box>
                          <Box>Total Feed Cost</Box>
                        </Box>

                        <Stack spacing={1} sx={{ mt: 1 }}>
                          {monthGroup.rows.map((row) => (
                            <Box
                              key={row.id}
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: '1.1fr 1fr 0.8fr 0.7fr 0.9fr 1fr 1fr 1fr 1fr 0.9fr 1fr 1fr',
                                gap: 1,
                                p: 1.2,
                                borderRadius: 3,
                                border: '1px solid rgba(15,23,42,0.08)',
                                alignItems: 'center',
                                background: 'rgba(255,255,255,0.98)',
                              }}
                            >
                              <Box>{fmtDate(row.reportDate)}</Box>
                              <Box>{row.openingBirds}</Box>
                              <Box>{row.mortality}</Box>
                              <Box>{row.sick}</Box>
                              <Box>{row.closingBirds}</Box>
                              <Box>{money(row.openingFeedKg, 2)}</Box>
                              <Box>{money(row.usedFeedKg, 2)}</Box>
                              <Box>{money(row.receivedFeedKg, 2)}</Box>
                              <Box>{money(row.closingFeedKg, 2)}</Box>
                              <Box>{money(row.perBirdKg, 4)}</Box>
                              <Box>{money(row.perBirdFeedCost, 4)}</Box>
                              <Box>{money(row.totalFeedCost, 2)}</Box>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ borderRadius: '16px !important', overflow: 'hidden' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack spacing={0.35} sx={{ width: '100%' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} alignItems={{ sm: 'center' }}>
              <Typography fontWeight={800}>Total quail costing</Typography>
              <Button
                variant="outlined"
                startIcon={<ExcelIcon />}
                sx={{ borderRadius: 10, fontWeight: 900 }}
                onClick={(event) => {
                  event.stopPropagation();
                  void exportCostingStyledExcel();
                }}
                disabled={!costingReports.length}
              >
                Export Styled Excel
              </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Open only when you want to see the costing report.
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          {!costingRowsByMonth.length ? (
            <Typography color="text.secondary">No costing report rows yet.</Typography>
          ) : (
            <Stack spacing={1.2}>
              {costingRowsByMonth.map((monthGroup) => (
                <Accordion key={monthGroup.month} sx={{ borderRadius: '14px !important', overflow: 'hidden', boxShadow: 'none', border: '1px solid rgba(15,23,42,0.08)' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack spacing={0.25}>
                      <Typography fontWeight={800}>{monthGroup.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {monthGroup.rows.length} costing entries
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ overflowX: 'auto' }}>
                      <Box sx={{ minWidth: 1500 }}>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1.05fr 0.95fr 0.95fr 1fr 0.95fr 1.05fr 0.95fr 1fr 0.95fr 0.8fr 0.9fr 1.05fr',
                            gap: 1,
                            p: 1.2,
                            borderRadius: 3,
                            bgcolor: '#34ff17',
                            color: '#0f172a',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                          }}
                        >
                          <Box>Date</Box>
                          <Box>No of Birds</Box>
                          <Box>Per Bird Cost</Box>
                          <Box>Total Cost</Box>
                          <Box>Feed in Per KG</Box>
                          <Box>Per Bird Feed in GRMS</Box>
                          <Box>Total Feed in KGS</Box>
                          <Box>Total Cost Feed</Box>
                          <Box>Other Expenses</Box>
                          <Box>Gas</Box>
                          <Box>Daily Labour</Box>
                          <Box>Total Cost in Day</Box>
                        </Box>

                        <Stack spacing={1} sx={{ mt: 1 }}>
                          {monthGroup.rows.map((row) => (
                            <Box
                              key={row.id}
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: '1.05fr 0.95fr 0.95fr 1fr 0.95fr 1.05fr 0.95fr 1fr 0.95fr 0.8fr 0.9fr 1.05fr',
                                gap: 1,
                                p: 1.2,
                                borderRadius: 3,
                                border: '1px solid rgba(15,23,42,0.08)',
                                alignItems: 'center',
                                background: 'rgba(255,255,255,0.98)',
                              }}
                            >
                              <Box>{fmtDate(row.reportDate)}</Box>
                              <Box>{row.birdCount}</Box>
                              <Box>{money(row.perBirdCost, 2)}</Box>
                              <Box>{money(row.totalCost, 2)}</Box>
                              <Box>{money(row.feedPerKg, 2)}</Box>
                              <Box>{money(row.perBirdFeedGrams, 2)}</Box>
                              <Box>{money(row.totalFeedKg, 2)}</Box>
                              <Box>{money(row.totalFeedCost, 2)}</Box>
                              <Box>{money(row.otherExpenses, 2)}</Box>
                              <Box>{money(row.gas, 2)}</Box>
                              <Box>{money(row.dailyLabour, 2)}</Box>
                              <Box>{money(row.totalCostInDay, 2)}</Box>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ borderRadius: '16px !important', overflow: 'hidden' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack spacing={0.35}>
            <Typography fontWeight={800}>Monthly report</Typography>
            <Typography variant="body2" color="text.secondary">
              Open only when you want to see the month summary.
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          {!monthlyRows.length ? (
            <Typography color="text.secondary">No monthly report data yet.</Typography>
          ) : (
            <Stack spacing={1.2}>
              {monthlyRows.map((row) => (
                <Accordion key={row.month} sx={{ borderRadius: '14px !important', overflow: 'hidden', boxShadow: 'none', border: '1px solid rgba(15,23,42,0.08)' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack spacing={0.25}>
                      <Typography fontWeight={800}>{monthLabel(`${row.month}-01`)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Click to open {monthLabel(`${row.month}-01`)} summary
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ overflowX: 'auto' }}>
                      <Box sx={{ minWidth: 1450 }}>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1.1fr 0.9fr 0.8fr 0.7fr 0.9fr 0.95fr 0.95fr 0.95fr 0.95fr 1fr 1fr 1fr 1.1fr',
                            gap: 1,
                            p: 1.2,
                            borderRadius: 3,
                            bgcolor: '#34ff17',
                            color: '#0f172a',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                          }}
                        >
                          <Box>Month</Box>
                          <Box>Opening Birds</Box>
                          <Box>Mortality</Box>
                          <Box>Sick</Box>
                          <Box>C - Birds</Box>
                          <Box>Feed OB in KGS</Box>
                          <Box>Used in KGS</Box>
                          <Box>Received in KGS</Box>
                          <Box>Closing Feed</Box>
                          <Box>Avg Per Bird KG</Box>
                          <Box>Avg Per Bird Feed Cost</Box>
                          <Box>Total Feed Cost</Box>
                          <Box>Total Cost in Month</Box>
                        </Box>

                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1.1fr 0.9fr 0.8fr 0.7fr 0.9fr 0.95fr 0.95fr 0.95fr 0.95fr 1fr 1fr 1fr 1.1fr',
                            gap: 1,
                            p: 1.2,
                            borderRadius: 3,
                            border: '1px solid rgba(15,23,42,0.08)',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.98)',
                            mt: 1,
                          }}
                        >
                          <Box>{monthLabel(`${row.month}-01`)}</Box>
                          <Box>{row.openingBirds}</Box>
                          <Box>{row.mortality}</Box>
                          <Box>{row.sick}</Box>
                          <Box>{row.closingBirds}</Box>
                          <Box>{money(row.openingFeedKg, 2)}</Box>
                          <Box>{money(row.usedFeedKg, 2)}</Box>
                          <Box>{money(row.receivedFeedKg, 2)}</Box>
                          <Box>{money(row.closingFeedKg, 2)}</Box>
                          <Box>{money(row.averagePerBirdKg, 4)}</Box>
                          <Box>{money(row.averagePerBirdFeedCost, 4)}</Box>
                          <Box>{money(row.totalFeedCost, 2)}</Box>
                          <Box>{money(row.totalCostInMonth, 2)}</Box>
                        </Box>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
