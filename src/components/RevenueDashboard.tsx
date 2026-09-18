import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import { STORE_NAMES, DailyRevenue } from '@/lib/sheets';
import { cn } from '@/lib/utils';
import { Filter, Maximize2, Minimize2, X } from 'lucide-react';

interface RevenueDashboardProps {
  data: DailyRevenue[];
}

const COLORS = [
  '#3b82f6', '#f97316', '#10b981', '#f43f5e', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#64748b', '#eab308', '#14b8a6'
];

export function RevenueDashboard({ data }: RevenueDashboardProps) {
  // Default to current month of 2026 if available, else first month in data
  const currentMonthStart = new Date(2026, new Date().getMonth(), 1);
  const [dateRange, setDateRange] = useState({
    start: format(currentMonthStart, 'yyyy-MM-dd'),
    end: format(endOfMonth(currentMonthStart), 'yyyy-MM-dd')
  });
  const [selectedStores, setSelectedStores] = useState<string[]>(STORE_NAMES);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isFullScreenChart, setIsFullScreenChart] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = () => {
    setIsScrolling(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  };
  
  useEffect(() => {
    return () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  const toggleStore = (name: string) => {
    setSelectedStores(prev => 
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const toggleAllStores = () => {
    if (selectedStores.length === STORE_NAMES.length) {
      setSelectedStores([]);
    } else {
      setSelectedStores([...STORE_NAMES]);
    }
  };

  const filteredData = useMemo(() => {
    if (!data.length) return [];
    
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    
    return data.filter(item => {
      const date = parseISO(item.date);
      return isWithinInterval(date, { start, end });
    });
  }, [data, dateRange]);

  const setMonth = (monthIndex: number) => {
    const start = new Date(2026, monthIndex, 1);
    const end = endOfMonth(start);
    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  const totalRevenue = filteredData.reduce((sum, item) => {
    return sum + selectedStores.reduce((storeSum, name) => storeSum + (item[name] || 0), 0);
  }, 0);

  // Calculate store rankings for the selected period
  const storeRankings = useMemo(() => {
    if (!filteredData.length) return [];
    
    const totals: Record<string, number> = {};
    STORE_NAMES.forEach(name => totals[name] = 0);
    
    filteredData.forEach(item => {
      STORE_NAMES.forEach(name => {
        totals[name] += (item[name] || 0);
      });
    });
    
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({ name, total }));
  }, [filteredData]);

  const maxDailyRevenue = useMemo(() => {
    let max = 0;
    filteredData.forEach(item => {
      STORE_NAMES.forEach(name => {
        if (selectedStores.includes(name) && item[name] && item[name] > max) max = item[name];
      });
    });
    return max;
  }, [filteredData, selectedStores]);

  const yAxisTicks = useMemo(() => {
    const ticks = [];
    const step = 3000000; // 3 Juta
    const maxVal = maxDailyRevenue === 0 ? step : maxDailyRevenue * 1.1;
    for (let i = 0; i <= maxVal; i += step) {
      ticks.push(i);
    }
    if (ticks[ticks.length - 1] < maxVal) {
      ticks.push(ticks[ticks.length - 1] + step);
    }
    return ticks;
  }, [maxDailyRevenue]);

  const xAxisTicks = useMemo(() => {
    return filteredData
      .map(d => d.date)
      .filter(date => {
        const d = parseISO(date);
        return d.getDate() % 2 !== 0;
      });
  }, [filteredData]);

  const topStore = storeRankings[0];

  const formatYAxis = (val: number) => {
    if (val >= 1000000000) {
      return `${Math.round(val / 1000000000)} M`;
    }
    return `${Math.round(val / 1000000)} Jt`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="rounded-xl p-3 shadow-lg border text-xs min-w-[170px]"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(8px)',
            borderColor: 'rgba(226, 232, 240, 0.7)',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
          }}
        >
          <p className="font-bold text-slate-800 border-b border-slate-300/60 pb-1.5 mb-2">
            {label ? format(parseISO(label as string), 'EEEE, dd MMMM yyyy', { locale: id }) : ''}
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => {
              const storeColor = entry.color || entry.stroke || '#0f172a';
              return (
                <div key={`item-${index}`} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: storeColor }}
                    />
                    <span 
                      className="font-bold truncate"
                      style={{ color: storeColor }}
                    >
                      {entry.name}:
                    </span>
                  </div>
                  <span 
                    className="font-bold whitespace-nowrap"
                    style={{ color: storeColor }}
                  >
                    {formatCurrency(entry.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={filteredData}
        margin={{ top: 10, right: 10, left: -5, bottom: 0 }}
      >
        <defs>
          {STORE_NAMES.map((name, index) => (
            <linearGradient key={name} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.1}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis 
          dataKey="date" 
          stroke="#cbd5e1" 
          ticks={xAxisTicks}
          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
          tickFormatter={(val) => format(parseISO(val), 'MMM dd')}
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis 
          stroke="#cbd5e1" 
          domain={[0, yAxisTicks[yAxisTicks.length - 1] || 0]}
          ticks={yAxisTicks}
          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
          tickFormatter={formatYAxis}
          axisLine={false}
          tickLine={false}
          dx={-5}
          width={45}
        />
        <Tooltip content={<CustomTooltip />} />
        {STORE_NAMES.map((name, index) => {
          if (!selectedStores.includes(name)) return null;
          return (
            <Area
              key={name}
              type="monotone"
              dataKey={name}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={1.5}
              fill={`url(#color${index})`}
              activeDot={{ r: 4, strokeWidth: 0, fill: COLORS[index % COLORS.length] }}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );

  return (
    <>
      {isFullScreenChart && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 p-6 md:p-8 overflow-hidden">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-xl">Store Revenue Comparison</h3>
              <p className="text-sm text-slate-500">Full View</p>
            </div>
            <button 
              onClick={() => setIsFullScreenChart(false)} 
              className="rounded-lg bg-white border border-slate-200 p-2 text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {renderChart()}
          </div>
        </div>
      )}

    <div 
      className={cn("flex-1 overflow-auto p-8 custom-scrollbar", isScrolling ? "is-scrolling" : "")}
      onScroll={handleScroll}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800">Revenue Analytics</h1>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">FY 2026</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-transparent border-none text-xs font-medium text-slate-600 px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
              />
              <span className="text-slate-400 px-2 text-xs">-</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-transparent border-none text-xs font-medium text-slate-600 px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
              />
            </div>
            
            <select 
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm cursor-pointer"
              defaultValue={new Date().getMonth()}
            >
              {Array.from({length: 12}).map((_, i) => (
                <option key={i} value={i}>
                  {format(new Date(2026, i, 1), 'MMMM 2026')}
                </option>
              ))}
            </select>
            <button className="hidden sm:flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export Report
            </button>
          </div>
        </div>

        {/* Hero Metric */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 italic truncate" title={formatCurrency(totalRevenue)}>{formatCurrency(totalRevenue)}</p>
            <div className="mt-2 flex items-center text-xs text-emerald-600 font-bold">
              <span>Selected Date Range</span>
            </div>
          </div>
          
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Store Performance</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 truncate" title={formatCurrency(totalRevenue / (selectedStores.length || 1))}>{formatCurrency(totalRevenue / (selectedStores.length || 1))}</p>
            <p className="mt-2 text-xs text-slate-400 uppercase font-medium">Selected Range Average</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Store</p>
            <p className="mt-2 text-2xl font-bold text-blue-600 truncate" title={topStore ? topStore.name : 'N/A'}>{topStore ? topStore.name : 'N/A'}</p>
            <p className="mt-2 text-xs text-slate-400 font-medium truncate" title={topStore ? formatCurrency(topStore.total) : 'N/A'}>{topStore ? formatCurrency(topStore.total) : 'N/A'} (Range)</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operational Status</p>
            <div className="mt-3 flex items-center gap-2">
              <div className={cn("h-3 w-3 rounded-full", selectedStores.length > 0 ? "animate-pulse bg-emerald-500" : "bg-slate-300")}></div>
              <span className="text-lg font-bold text-slate-800">{selectedStores.length} / {STORE_NAMES.length} Active</span>
            </div>
            <p className="mt-1 text-xs text-slate-400 font-medium">Currently viewing on chart</p>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* Main Chart Area */}
          <div className="col-span-12 lg:col-span-8 flex h-[420px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Store Revenue Comparison</h3>
                <p className="text-xs text-slate-400">Aggregated from Q40:AC70 Spreadsheets</p>
              </div>
              <button 
                onClick={() => setIsFullScreenChart(true)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Full Screen View"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 w-full min-h-[300px]">
              {renderChart()}
            </div>
          </div>
          
          {/* Store List Table */}
          <div className="col-span-12 lg:col-span-4 flex h-[420px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Store Rankings</h3>
              <button 
                onClick={toggleAllStores}
                className="text-[10px] font-bold text-blue-600 uppercase hover:underline"
              >
                {selectedStores.length === STORE_NAMES.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div 
              className={cn("flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar", isScrolling ? "is-scrolling" : "")}
              onScroll={handleScroll}
            >
              {storeRankings.map((store, index) => {
                const isSelected = selectedStores.includes(store.name);
                const colorIndex = STORE_NAMES.indexOf(store.name);
                return (
                  <button 
                    key={store.name} 
                    onClick={() => toggleStore(store.name)}
                    className={cn(
                      "w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors",
                      isSelected ? (index === 0 ? "bg-slate-50 border-transparent" : "border-transparent hover:bg-slate-50") : "opacity-50 hover:opacity-100 hover:bg-slate-50 border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className={cn("w-3 h-3 rounded-sm flex-shrink-0 transition-colors", !isSelected && "border border-slate-300 bg-transparent")}
                        style={{ backgroundColor: isSelected ? COLORS[colorIndex % COLORS.length] : undefined }}
                      />
                      <span className="w-4 text-[10px] font-bold text-slate-400">{(index + 1).toString().padStart(2, '0')}</span>
                      <span className={cn("text-xs font-bold", index === 0 ? "text-slate-900" : "text-slate-700")}>{store.name}</span>
                    </div>
                    <span className={cn("text-xs font-mono font-semibold", index === 0 ? "text-slate-900" : "text-slate-500")}>
                      {(store.total / 1000000).toFixed(1)}M
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex justify-center border-t border-slate-100 pt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Click stores to toggle visibility</span>
            </div>
          </div>

        </div>
      </div>
    </div>
    </>
  );
}
