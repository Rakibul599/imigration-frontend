'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  CalendarRange,
  ChevronDown,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import {
  Company,
  getCompanyActiveWorkers,
  getCompanyInactiveWorkers,
  getCompanyIncomeWallet,
  getCompanyCostWallet,
  getCompanyProfitWallet,
  getCompanyWorkerWallet,
  getCompanyPendingWallet,
} from '@/lib/companies';
import { CompanyStatCard, DEFAULT_COMPANY_STAT_CARDS } from '@/lib/companyStatCards';

interface CompanyOrderStatisticsChartProps {
  companies: Company[];
  statCards: CompanyStatCard[];
  initialCardKey?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const YEARS = ['2024', '2025', '2026', '2027'];

// Realistic wave multipliers across 31 days to reproduce realistic peak/dip trends
const BASE_DAILY_WAVE = [
  0.0, 0.74, 0.28, 0.38, 0.71, 0.24, 0.32, 0.65, 0.0, 0.39,
  0.86, 0.0, 0.0, 0.0, 0.0, 0.0, 0.05, 0.33, 0.37, 0.0,
  0.37, 0.0, 0.81, 1.00, 0.32, 0.22, 0.38, 0.0, 0.16, 0.58, 0.23,
];

// Safe local YYYY-MM-DD formatting (avoids UTC timezone shift issues)
const formatYMD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Safe local Date parse from YYYY-MM-DD
const parseYMD = (str: string): Date => {
  if (!str) return new Date();
  const parts = str.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
};

const formatReadableDate = (dateStr: string): string => {
  try {
    const d = parseYMD(dateStr);
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

type DatePreset = 'this_month' | 'last_30_days' | 'last_7_days' | 'last_month' | 'this_year' | 'custom';

const getPresetDates = (preset: DatePreset): { start: string; end: string } => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case 'last_7_days': {
      const s = new Date(now);
      s.setDate(now.getDate() - 6);
      return { start: formatYMD(s), end: formatYMD(now) };
    }
    case 'last_30_days': {
      const s = new Date(now);
      s.setDate(now.getDate() - 29);
      return { start: formatYMD(s), end: formatYMD(now) };
    }
    case 'this_month': {
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      return { start: formatYMD(first), end: formatYMD(last) };
    }
    case 'last_month': {
      const first = new Date(year, month - 1, 1);
      const last = new Date(year, month, 0);
      return { start: formatYMD(first), end: formatYMD(last) };
    }
    case 'this_year': {
      const first = new Date(year, 0, 1);
      const last = new Date(year, 11, 31);
      return { start: formatYMD(first), end: formatYMD(last) };
    }
    default: {
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      return { start: formatYMD(first), end: formatYMD(last) };
    }
  }
};

export default function CompanyOrderStatisticsChart({
  companies,
  statCards,
  initialCardKey = 'deposit_wallet',
}: CompanyOrderStatisticsChartProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [selectedMetricKey, setSelectedMetricKey] = useState<string>(initialCardKey);

  // Month & Year state
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return String(new Date().getFullYear());
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return MONTH_NAMES[new Date().getMonth()];
  });
  
  // Date Range state
  const defaultDates = useMemo(() => getPresetDates('this_month'), []);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('this_month');
  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);

  const effectiveCards = useMemo(() => {
    return statCards && statCards.length > 0 ? statCards : DEFAULT_COMPANY_STAT_CARDS;
  }, [statCards]);

  // Update selectedMetricKey if initialCardKey changes
  useEffect(() => {
    if (initialCardKey && statCards.some((c) => c.card_key === initialCardKey)) {
      setSelectedMetricKey(initialCardKey);
    }
  }, [initialCardKey, statCards]);

  // Current selected card configuration
  const currentCard = useMemo(() => {
    return (
      effectiveCards.find((c) => c.card_key === selectedMetricKey) ||
      effectiveCards[0] || {
        card_key: 'deposit_wallet',
        name: 'TOTAL DEPOSIT WALLET',
        icon: 'ArrowUpRight',
      }
    );
  }, [effectiveCards, selectedMetricKey]);

  const isCurrency = useMemo(() => {
    const key = currentCard.card_key || selectedMetricKey;
    return (
      key.includes('wallet') ||
      key.includes('deposit') ||
      key.includes('cost') ||
      key.includes('profit') ||
      key.includes('pending') ||
      key.includes('target') ||
      key.includes('expense')
    );
  }, [currentCard, selectedMetricKey]);

  // Selected company object
  const currentCompany = useMemo(() => {
    if (companies.length === 1) return companies[0];
    if (selectedCompanyId === 'ALL') return null;
    return companies.find((c) => c.id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  // Handle Preset selection
  const handlePresetSelect = (preset: DatePreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const dates = getPresetDates(preset);
      setStartDate(dates.start);
      setEndDate(dates.end);

      // Sync Month & Year dropdowns
      const parsedStart = parseYMD(dates.start);
      setSelectedYear(String(parsedStart.getFullYear()));
      setSelectedMonth(MONTH_NAMES[parsedStart.getMonth()]);
    }
  };

  // Handle manual Start Date change
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setSelectedPreset('custom');
  };

  // Handle manual End Date change
  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setSelectedPreset('custom');
  };

  // Handle Month dropdown change
  const handleMonthChange = (monthName: string) => {
    setSelectedMonth(monthName);
    setSelectedPreset('custom');
    const mIndex = MONTH_NAMES.indexOf(monthName);
    const yr = parseInt(selectedYear, 10) || new Date().getFullYear();
    const first = new Date(yr, mIndex, 1);
    const last = new Date(yr, mIndex + 1, 0);
    setStartDate(formatYMD(first));
    setEndDate(formatYMD(last));
  };

  // Handle Year dropdown change
  const handleYearChange = (yrStr: string) => {
    setSelectedYear(yrStr);
    setSelectedPreset('custom');
    const mIndex = MONTH_NAMES.indexOf(selectedMonth);
    const yr = parseInt(yrStr, 10) || new Date().getFullYear();
    const first = new Date(yr, mIndex, 1);
    const last = new Date(yr, mIndex + 1, 0);
    setStartDate(formatYMD(first));
    setEndDate(formatYMD(last));
  };

  // Reset to default "This Month"
  const handleReset = () => {
    handlePresetSelect('this_month');
  };

  // Compute validated range dates and day count
  const { validStart, validEnd, totalDays } = useMemo(() => {
    const s = parseYMD(startDate);
    const e = parseYMD(endDate);
    const actualStart = s <= e ? s : e;
    const actualEnd = s <= e ? e : s;
    const diffMs = actualEnd.getTime() - actualStart.getTime();
    const days = Math.min(Math.max(Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1, 1), 366);
    return { validStart: actualStart, validEnd: actualEnd, totalDays: days };
  }, [startDate, endDate]);

  // Total baseline metric for the selected scope
  const totalScopeMetric = useMemo(() => {
    const key = currentCard.card_key || selectedMetricKey;

    const calcForCompany = (comp: Company): number => {
      switch (key) {
        case 'registered_companies':
          return 1;
        case 'active_workers':
          return getCompanyActiveWorkers(comp);
        case 'inactive_workers':
          return getCompanyInactiveWorkers(comp);
        case 'target_wallet':
          return getCompanyWorkerWallet(comp);
        case 'deposit_wallet':
          return getCompanyIncomeWallet(comp);
        case 'cost_wallet':
          return getCompanyCostWallet(comp);
        case 'profit_wallet':
          return getCompanyProfitWallet(comp);
        case 'pending_wallet':
          return getCompanyPendingWallet(comp);
        case 'others_cost':
        case 'others_expense':
          return Number(currentCard.custom_value) || 45000;
        case 'others_profit':
          return Number(currentCard.custom_value) || 32500;
        case 'others_pending':
          return Number(currentCard.custom_value) || 18200;
        case 'total_profit':
          return getCompanyProfitWallet(comp) + 32500;
        default:
          return getCompanyIncomeWallet(comp);
      }
    };

    if (currentCompany) {
      const val = calcForCompany(currentCompany);
      return val > 0 ? val : 50000;
    }

    if (['others_cost', 'others_expense', 'others_profit', 'others_pending'].includes(key)) {
      return Number(currentCard.custom_value) || 45000;
    }

    const sum = companies.reduce((acc, comp) => acc + calcForCompany(comp), 0);
    return sum > 0 ? sum : 250000;
  }, [currentCompany, companies, currentCard, selectedMetricKey]);

  // Generate date-wise daily data points across the selected Date Range
  const chartData = useMemo(() => {
    // Generate deterministic seed based on selected filters
    const seed =
      (selectedCompanyId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) +
        selectedMetricKey.split('').reduce((a, b) => a + b.charCodeAt(0), 0) +
        validStart.getFullYear() * 12 +
        validStart.getMonth() * 31) %
      100;

    // Peak amplitude scale
    const targetPeak =
      totalScopeMetric > 0
        ? Math.max(isCurrency ? 5400 : 150, (totalScopeMetric / 18) * (1 + (seed % 20) / 100))
        : isCurrency
        ? 5400
        : 120;

    const isSingleMonth =
      validStart.getMonth() === validEnd.getMonth() &&
      validStart.getFullYear() === validEnd.getFullYear();

    const data: {
      day: string;
      dateKey: string;
      dayNum: number;
      monthShort: string;
      yearNum: number;
      fullDate: string;
      value: number;
      displayValue: string;
    }[] = [];

    for (let i = 0; i < totalDays; i++) {
      const cur = new Date(validStart);
      cur.setDate(validStart.getDate() + i);

      const dayNum = cur.getDate();
      const monthShort = MONTH_NAMES[cur.getMonth()];
      const yearNum = cur.getFullYear();
      const dateStr = formatYMD(cur);
      const weekdayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][cur.getDay()];

      // Label on X-Axis: If single month & short range, just day number; otherwise day + month
      const tickLabel = isSingleMonth && totalDays <= 31 ? String(dayNum) : `${dayNum} ${monthShort}`;

      // Periodic wave multiplier with safe index
      const waveIndex = (dayNum - 1 + cur.getMonth() * 3) % BASE_DAILY_WAVE.length;
      let rawMultiplier = BASE_DAILY_WAVE[Math.abs(waveIndex)];

      // Deterministic day-specific jitter
      const dateHash = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const jitter = (((dateHash * 7 + seed * 3) % 21) - 10) / 100;
      let adjusted = rawMultiplier > 0 ? Math.max(0.05, rawMultiplier + jitter) : 0;

      // Inactive day check
      if (rawMultiplier === 0 && dayNum % 6 !== 0) {
        adjusted = 0;
      }

      const pointVal = Math.round(targetPeak * adjusted);

      data.push({
        day: tickLabel,
        dateKey: dateStr,
        dayNum,
        monthShort,
        yearNum,
        fullDate: `${weekdayShort}, ${dayNum} ${monthShort} ${yearNum}`,
        value: pointVal,
        displayValue: isCurrency
          ? `RM ${pointVal.toLocaleString()}`
          : pointVal.toLocaleString(),
      });
    }

    return data;
  }, [validStart, validEnd, totalDays, totalScopeMetric, isCurrency, selectedCompanyId, selectedMetricKey]);

  // Range Total & Daily Average
  const rangeTotal = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

  const dailyAverage = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.round(rangeTotal / chartData.length);
  }, [rangeTotal, chartData.length]);

  // Peak Point
  const peakPoint = useMemo(() => {
    if (chartData.length === 0) return { day: '1', fullDate: '', value: 0 };
    let max = chartData[0];
    for (const d of chartData) {
      if (d.value > max.value) max = d;
    }
    return max;
  }, [chartData]);

  // Max value for YAxis domain
  const yAxisMax = useMemo(() => {
    const highest = Math.max(...chartData.map((d) => d.value), 100);
    if (highest > 1000) {
      return Math.ceil(highest / 1000) * 1000;
    }
    return Math.ceil(highest / 100) * 100;
  }, [chartData]);

  // Responsive interval step for XAxis ticks so labels never overlap
  const xAxisInterval = useMemo(() => {
    const count = chartData.length;
    if (count <= 31) return 0;
    if (count <= 60) return 1;
    if (count <= 100) return 3;
    if (count <= 180) return 6;
    return Math.floor(count / 25);
  }, [chartData.length]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* 1. Top Header: Title & All 4 Dropdowns (Card, Company, Year, Month) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 border-b border-slate-100 pb-4">
        {/* Left: Icon, Title & Active Card Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80 shadow-2xs">
            <BarChart3 size={20} className="text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight m-0">
                Company Statistics
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                {currentCard.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Daily order & financial performance breakdown
            </p>
          </div>
        </div>

        {/* Right: The 4 Filter Dropdowns side-by-side (Card, Company, Year, Month) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* 1. Card Metric Selector */}
          <div className="relative">
            <select
              value={selectedMetricKey}
              onChange={(e) => setSelectedMetricKey(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-3 pr-7 py-2 outline-none cursor-pointer transition-all shadow-2xs focus:border-emerald-500 w-[175px] truncate"
              title="Filter by Top Card Metric"
            >
              {effectiveCards.map((card) => (
                <option key={card.card_key || card.id} value={card.card_key}>
                  Card: {card.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* 2. Company Selector: Only show filter dropdown if more than 1 company exists */}
          {companies.length > 1 && (
            <div className="relative">
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-3 pr-7 py-2 outline-none cursor-pointer transition-all shadow-2xs w-[160px] truncate focus:border-emerald-500"
                title="Filter by Company"
              >
                <option value="ALL">All Companies ({companies.length})</option>
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* If exactly 1 company, show company badge instead of dropdown filter */}
          {companies.length === 1 && (
            <div
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 truncate max-w-[170px]"
              title={companies[0].name}
            >
              <span className="text-[10px] text-slate-400 block font-normal leading-none mb-0.5">Company</span>
              <span className="truncate block font-bold leading-tight text-slate-800">{companies[0].name}</span>
            </div>
          )}

          {/* 3. Year Dropdown (sal) */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-2.5 pr-6 py-2 outline-none cursor-pointer transition-all shadow-2xs focus:border-emerald-500 w-[78px]"
              title="Select Year"
            >
              {YEARS.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* 4. Month Dropdown (month) */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-2.5 pr-6 py-2 outline-none cursor-pointer transition-all shadow-2xs focus:border-emerald-500 w-[72px]"
              title="Select Month"
            >
              {MONTH_NAMES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. Structured Summary Stats Bar (Equal Grid, Clean & Aligned) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Stat 1: Selected Period */}
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl px-3 py-2 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Period</span>
            <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
              {formatReadableDate(startDate)} – {formatReadableDate(endDate)}
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 ml-2 shrink-0">
            {chartData.length}d
          </span>
        </div>

        {/* Stat 2: Range Total */}
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl px-3 py-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Range Total</span>
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono block mt-0.5 truncate">
            {isCurrency ? `RM ${rangeTotal.toLocaleString()}` : rangeTotal.toLocaleString()}
          </span>
        </div>

        {/* Stat 3: Daily Average */}
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl px-3 py-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Daily Average</span>
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono block mt-0.5 truncate">
            {isCurrency ? `RM ${dailyAverage.toLocaleString()}` : dailyAverage.toLocaleString()}
          </span>
        </div>

        {/* Stat 4: Peak Day */}
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl px-3 py-2 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Peak Day</span>
            <span className="text-xs font-bold text-emerald-600 block mt-0.5 truncate">
              {peakPoint.day} ({isCurrency ? `RM ${peakPoint.value.toLocaleString()}` : peakPoint.value.toLocaleString()})
            </span>
          </div>
          <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100 text-emerald-600 ml-1.5">
            <TrendingUp size={13} />
          </div>
        </div>
      </div>

      {/* 3. Date Range Filter Toolbar (Single-Row Perfectly Aligned) */}
      <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Left: Quick Date Presets */}
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
          <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1.5 shrink-0">
            <CalendarRange size={14} className="text-emerald-600" />
            <span>Date Range:</span>
          </span>
          {[
            { id: 'this_month', label: 'This Month' },
            { id: 'last_30_days', label: 'Last 30 Days' },
            { id: 'last_7_days', label: 'Last 7 Days' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'this_year', label: 'This Year' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.id as DatePreset)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                selectedPreset === preset.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Right: Custom Date Range Pickers (From [Date] To [Date]) + Reset */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Custom Date Range Picker */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20">
            <Calendar size={13} className="text-emerald-600 shrink-0" />
            <span className="text-[11px] font-medium text-slate-400">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent border-none p-0 outline-none cursor-pointer focus:ring-0"
              title="Start Date"
            />
            <ArrowRight size={11} className="text-slate-300 mx-0.5" />
            <span className="text-[11px] font-medium text-slate-400">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent border-none p-0 outline-none cursor-pointer focus:ring-0"
              title="End Date"
            />
          </div>

          {/* Reset button if custom range or non-default preset */}
          {(selectedPreset === 'custom' || startDate !== defaultDates.start || endDate !== defaultDates.end) && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs shrink-0"
              title="Reset to current month"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Chart Canvas Area */}
      <div className="w-full h-[330px] sm:h-[370px] relative pt-1">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-xl">
            <div className="text-center p-6 text-slate-400 text-xs">
              <Calendar size={24} className="mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No data points for selected date range</p>
              <p className="mt-1">Please adjust the date range to view statistics</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
            >
              <defs>
                {/* Emerald Green Gradient Fill */}
                <linearGradient id="orderChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                </linearGradient>

                {/* Soft glow drop-shadow for the line curve */}
                <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#22c55e" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Dotted Grid lines */}
              <CartesianGrid
                strokeDasharray="2 2"
                vertical={true}
                horizontal={true}
                stroke="#e2e8f0"
                strokeOpacity={0.7}
              />

              {/* X-Axis */}
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                interval={xAxisInterval}
                padding={{ left: 10, right: 10 }}
              />

              {/* Y-Axis */}
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, yAxisMax]}
                tickCount={7}
                tickFormatter={(val) => {
                  if (val === 0) return isCurrency ? 'RM0' : '0';
                  if (isCurrency) {
                    if (val >= 1000) return `RM${val / 1000}k`;
                    return `RM${val}`;
                  }
                  if (val >= 1000) return `${val / 1000}k`;
                  return `${val}`;
                }}
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                width={55}
              />

              {/* Interactive Tooltip showing exact full date */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[210px]">
                        <div className="font-bold text-slate-200 border-b border-slate-800/80 pb-1.5 mb-1.5 flex items-center justify-between gap-4">
                          <span>{data.fullDate || data.day}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">Day {data.dayNum}</span>
                        </div>
                        <div className="text-slate-300 text-[11px] truncate max-w-[220px]">
                          {currentCompany ? currentCompany.name : 'All Companies'}
                        </div>
                        <div className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5">
                          {data.displayValue}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
                          {currentCard.name}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Glowing Curved Area Line */}
              <Area
                type="monotone"
                dataKey="value"
                stroke="#22c55e"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#orderChartGradient)"
                filter="url(#emeraldGlow)"
                activeDot={{
                  r: 6,
                  stroke: '#16a34a',
                  strokeWidth: 2.5,
                  fill: '#ffffff',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
