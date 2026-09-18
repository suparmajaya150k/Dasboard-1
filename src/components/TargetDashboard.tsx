import React, { useMemo, useState } from 'react';
import { STORE_NAMES, DailyRevenue, TargetData, MONTHS } from '@/lib/sheets';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Trophy, Target, TrendingUp, AlertCircle, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseISO } from 'date-fns';

interface TargetDashboardProps {
  revenueData: DailyRevenue[];
  targetData: TargetData | null;
}

export function TargetDashboard({ revenueData, targetData }: TargetDashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('All Year');

  const filteredRevenueAndTarget = useMemo(() => {
    const rev: Record<string, number> = {};
    STORE_NAMES.forEach(name => rev[name] = 0);
    let totalRev = 0;
    
    // Filter revenue data
    const monthIndex = MONTHS.indexOf(selectedMonth);
    const isAllYear = selectedMonth === 'All Year';
    
    const filteredRev = revenueData.filter(day => {
      if (isAllYear) return true;
      const date = parseISO(day.date);
      return date.getMonth() === monthIndex;
    });

    filteredRev.forEach(day => {
      STORE_NAMES.forEach(name => {
        const val = day[name] || 0;
        rev[name] += val;
      });
      totalRev += day.total || 0;
    });

    // Compute targets
    let totalTgt = 0;
    const tgt: Record<string, number> = {};
    
    if (targetData) {
      targetData.stores.forEach(store => {
        let storeTarget = 0;
        if (isAllYear) {
          storeTarget = store.yearlyTarget;
        } else if (monthIndex !== -1) {
          storeTarget = store.monthlyTargets[monthIndex] || 0;
        }
        tgt[store.storeName] = storeTarget;
        totalTgt += storeTarget;
      });
    }

    return { storesRev: rev, totalRev, storesTgt: tgt, totalTgt };
  }, [revenueData, targetData, selectedMonth]);

  const chartData = useMemo(() => {
    if (!targetData) return [];
    return targetData.stores.map(store => {
      const revenue = filteredRevenueAndTarget.storesRev[store.storeName] || 0;
      const target = filteredRevenueAndTarget.storesTgt[store.storeName] || 0;
      const percent = target > 0 ? (revenue / target) * 100 : 0;
      
      return {
        name: store.storeName,
        Revenue: revenue,
        Target: target,
        percent: percent,
      };
    });
  }, [targetData, filteredRevenueAndTarget]);

  const totalRevenue = filteredRevenueAndTarget.totalRev;
  const totalTarget = filteredRevenueAndTarget.totalTgt;
  const totalPercent = totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0;

  const topStore = useMemo(() => {
    let max = 0;
    let top: any = null;
    chartData.forEach(d => {
      if (d.Revenue > max) {
        max = d.Revenue;
        top = d;
      }
    });
    return top;
  }, [chartData]);

  const matrixData = useMemo(() => {
    const matrix: Record<string, { rev: number; tgt: number; percent: number; grade: 'A' | 'B' | 'C' | 'D' | null; status: 'graded' | 'future' | 'no-target' }[]> = {};
    if (!targetData) return matrix;
    
    const currentMonthIndex = new Date().getMonth(); // July = 6
    
    const monthlyRev: Record<string, number[]> = {};
    targetData.stores.forEach(store => {
      monthlyRev[store.storeName] = new Array(12).fill(0);
      matrix[store.storeName] = [];
    });
    
    revenueData.forEach(day => {
       const d = parseISO(day.date);
       const mIndex = d.getMonth();
       targetData.stores.forEach(store => {
         monthlyRev[store.storeName][mIndex] += (day[store.storeName] || 0);
       });
    });
    
    targetData.stores.forEach(store => {
      for (let i = 0; i < 12; i++) {
        const rev = monthlyRev[store.storeName][i] || 0;
        const tgt = store.monthlyTargets[i] || 0;
        const percent = tgt > 0 ? (rev / tgt) * 100 : 0;
        
        let status: 'graded' | 'future' | 'no-target';
        let grade: 'A' | 'B' | 'C' | 'D' | null = null;

        if (i >= currentMonthIndex) {
          status = 'future';
        } else if (tgt <= 0) {
          status = 'no-target';
        } else {
          status = 'graded';
          if (percent >= 96) {
            grade = 'A';
          } else if (percent >= 92) {
            grade = 'B';
          } else if (percent >= 88) {
            grade = 'C';
          } else {
            grade = 'D';
          }
        }
        
        matrix[store.storeName].push({ rev, tgt, percent, grade, status });
      }
    });
    
    return matrix;
  }, [revenueData, targetData]);

  if (!targetData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
        Target data is not available. Please make sure the 'Target Omset 2026' sheet exists.
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const formatYAxis = (val: number) => {
    if (val >= 1000000000) {
      return `${Math.round(val / 1000000000)}M`;
    }
    return `${Math.round(val / 1000000)}Jt`;
  };

  return (
    <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Omset vs Target 2026</h2>
            <p className="text-sm text-slate-500 mt-1">Comparing {selectedMonth === 'All Year' ? 'year-to-date' : selectedMonth} revenue against targets</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="All Year">All Year</option>
                {MONTHS.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Hero Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Target size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Target</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 truncate" title={formatCurrency(totalTarget)}>{formatCurrency(totalTarget)}</p>
            <p className="text-xs text-slate-400 font-medium mt-2">{selectedMonth}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <TrendingUp size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600 truncate" title={formatCurrency(totalRevenue)}>{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-slate-400 font-medium mt-2">{selectedMonth}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <Trophy size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Achievement</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-slate-900">{totalPercent.toFixed(1)}%</p>
            </div>
            <div className="w-full bg-slate-100 h-2 mt-3 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(totalPercent, 100)}%` }}></div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Trophy size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Contributor</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 truncate" title={topStore ? topStore.name : '-'}>{topStore ? topStore.name : '-'}</p>
            <p className="text-xs text-slate-400 font-medium mt-2 truncate" title={topStore ? formatCurrency(topStore.Revenue) : '-'}>{topStore ? formatCurrency(topStore.Revenue) : '-'}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Store Performance vs Target ({selectedMonth})</h3>
              <p className="text-xs text-slate-400">Values in Millions (Juta) / Billions (M)</p>
            </div>
          </div>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  tickFormatter={formatYAxis}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)', borderColor: 'rgba(226, 232, 240, 0.8)', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelStyle={{ color: '#1e293b', marginBottom: '8px', fontSize: '12px', fontWeight: 700 }}
                />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
                <Bar dataKey="Target" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">Detailed Progress ({selectedMonth})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 font-semibold">Store</th>
                  <th className="px-6 py-4 font-semibold">Revenue</th>
                  <th className="px-6 py-4 font-semibold">Target</th>
                  <th className="px-6 py-4 font-semibold">Achievement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chartData.map((store, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{store.name}</td>
                    <td className="px-6 py-4 text-emerald-600 font-medium">{formatCurrency(store.Revenue)}</td>
                    <td className="px-6 py-4 text-slate-600">{formatCurrency(store.Target)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "font-bold w-12",
                          store.percent >= 100 ? "text-emerald-600" : "text-blue-600"
                        )}>
                          {store.percent.toFixed(1)}%
                        </span>
                        <div className="flex-1 max-w-[100px] bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className={cn("h-full rounded-full", store.percent >= 100 ? "bg-emerald-500" : "bg-blue-500")}
                            style={{ width: `${Math.min(store.percent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm mt-8">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">2026 Monthly Achievement Matrix</h3>
            <div className="text-xs text-slate-500 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-emerald-500 inline-flex items-center justify-center text-[9px] font-bold text-white">A</span> ≥96.00% (Hijau)</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-amber-400 inline-flex items-center justify-center text-[9px] font-bold text-slate-900">B</span> 92.00% - 95.99% (Kuning)</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-slate-400 inline-flex items-center justify-center text-[9px] font-bold text-white">C</span> 88.00% - 91.99% (Abu-abu)</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-red-500 inline-flex items-center justify-center text-[9px] font-bold text-white">D</span> &lt;88.00% (Merah)</span>
            </div>
          </div>
          <div className="overflow-x-auto pb-6">
            <table className="w-full text-center text-sm text-slate-500">
              <thead className="bg-slate-50 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_#e2e8f0]">Store</th>
                  {MONTHS.map(m => <th key={m} className="px-2 py-3 font-semibold">{m}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {STORE_NAMES.map((store, storeIndex) => (
                   <tr key={store} className="hover:bg-slate-50/50 transition-colors">
                     <td className="px-4 py-3 font-medium text-slate-800 text-left sticky left-0 bg-white z-10 shadow-[1px_0_0_#e2e8f0]">{store}</td>
                     {(matrixData[store] || []).map((cell, i) => {
                        const monthName = MONTHS[i];
                        const titleText = `${store} (${monthName})\nTarget: ${cell.tgt > 0 ? formatCurrency(cell.tgt) : 'Kosong'}\nRealisasi: ${formatCurrency(cell.rev)}\nPencapaian: ${cell.tgt > 0 ? `${cell.percent.toFixed(1)}%` : '-'}`;

                        // Tooltip positioning
                        const isTopRow = storeIndex < 3;
                        const verticalPos = isTopRow ? "top-full mt-2" : "bottom-full mb-2";
                        
                        let horizontalPos = "left-1/2 -translate-x-1/2";
                        if (i < 2) horizontalPos = "left-0";
                        if (i > 9) horizontalPos = "right-0";

                        return (
                          <td key={i} className="px-2 py-3 relative group">
                            <div className="relative flex items-center justify-center cursor-pointer">
                              {cell.grade === 'A' && (
                                <div className="w-6 h-6 mx-auto rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                  A
                                </div>
                              )}
                              {cell.grade === 'B' && (
                                <div className="w-6 h-6 mx-auto rounded-full bg-amber-400 flex items-center justify-center text-[10px] font-bold text-slate-900 shadow-sm">
                                  B
                                </div>
                              )}
                              {cell.grade === 'C' && (
                                <div className="w-6 h-6 mx-auto rounded-full bg-slate-400 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                  C
                                </div>
                              )}
                              {cell.grade === 'D' && (
                                <div className="w-6 h-6 mx-auto rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                  D
                                </div>
                              )}
                              {cell.grade === null && (
                                <span className="text-slate-300 font-normal text-xs">-</span>
                              )}

                              {/* Hover Popover Tooltip */}
                              {cell.grade !== null && (
                                <div className={cn(
                                  "absolute hidden group-hover:flex flex-col gap-1 p-2.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-50 min-w-[160px] whitespace-nowrap pointer-events-none",
                                  verticalPos,
                                  horizontalPos
                                )}>
                                  <p className="font-bold border-b border-slate-700 pb-1 text-slate-200">{store} - {monthName}</p>
                                  <div className="flex justify-between gap-3 text-[11px] text-slate-300">
                                    <span>Target:</span>
                                    <span className="font-semibold text-white">{cell.tgt > 0 ? formatCurrency(cell.tgt) : 'Kosong'}</span>
                                  </div>
                                  <div className="flex justify-between gap-3 text-[11px] text-slate-300">
                                    <span>Realisasi:</span>
                                    <span className="font-semibold text-emerald-400">{formatCurrency(cell.rev)}</span>
                                  </div>
                                  <div className="flex justify-between gap-3 text-[11px] text-slate-300">
                                    <span>Persentase:</span>
                                    <span className={cn(
                                      "font-bold",
                                      cell.grade === 'A' ? "text-emerald-400" :
                                      cell.grade === 'B' ? "text-amber-300" :
                                      cell.grade === 'C' ? "text-slate-300" :
                                      cell.grade === 'D' ? "text-red-400" : "text-slate-400"
                                    )}>
                                      {cell.tgt > 0 ? `${cell.percent.toFixed(1)}%` : '-'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                     })}
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
