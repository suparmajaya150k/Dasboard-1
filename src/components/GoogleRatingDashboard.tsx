import React, { useState, useMemo, useEffect } from 'react';
import { GoogleReview } from '@/lib/reviews';
import { STORE_NAMES } from '@/lib/sheets';
import { cn } from '@/lib/utils';
import { 
  Star, 
  Search, 
  Filter, 
  Calendar, 
  Store, 
  RefreshCw, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon,
  ChevronDown,
  X,
  ExternalLink,
  ThumbsUp,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface GoogleRatingDashboardProps {
  reviews: GoogleReview[];
  isLoading: boolean;
  onRefresh: () => void;
  error?: string | null;
  isSampleData?: boolean;
  permissionError?: string | null;
}

function parseReviewDate(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const s = dateStr.trim();
  // YYYY-MM-DD or YYYY-MM-DD HH:mm
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d.getTime();
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  const fallback = Date.parse(s);
  return isNaN(fallback) ? 0 : fallback;
}

export function GoogleRatingDashboard({
  reviews,
  isLoading,
  onRefresh,
  error,
  isSampleData = false,
  permissionError
}: GoogleRatingDashboardProps) {
  // Filter states
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [datePeriod, setDatePeriod] = useState<string>('ALL'); // ALL, 7d, 30d, 90d, 2026, CUSTOM
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<string>('ALL'); // ALL, 5, 4, 3, 2, 1
  const [replyStatus, setReplyStatus] = useState<string>('ALL'); // ALL, REPLIED, UNREPLIED
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('NEWEST'); // NEWEST, OLDEST, RATING_HIGH, RATING_LOW

  // Lightbox modal state
  const [activePhoto, setActivePhoto] = useState<{ urls: string[]; index: number } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  // Reset page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStore, datePeriod, customStartDate, customEndDate, selectedRating, replyStatus, searchQuery, sortBy]);

  // Filter logic
  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    // Store filter (strict normalized uppercase comparison)
    if (selectedStore !== 'ALL') {
      const targetStore = selectedStore.trim().toUpperCase();
      result = result.filter(r => (r.storeName || '').trim().toUpperCase() === targetStore);
    }

    // Rating filter
    if (selectedRating !== 'ALL') {
      const targetRating = parseInt(selectedRating, 10);
      result = result.filter(r => Math.round(r.rating) === targetRating);
    }

    // Reply status filter
    if (replyStatus === 'REPLIED') {
      result = result.filter(r => r.ownerReply && r.ownerReply.trim().length > 0);
    } else if (replyStatus === 'UNREPLIED') {
      result = result.filter(r => !r.ownerReply || r.ownerReply.trim().length === 0);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => 
        r.reviewerName.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.storeName.toLowerCase().includes(q) ||
        (r.ownerReply && r.ownerReply.toLowerCase().includes(q))
      );
    }

    // Date range filter
    const now = new Date();
    if (datePeriod === '7d') {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(r => {
        if (!r.reviewDate) return true;
        const d = parseReviewDate(r.reviewDate);
        return d === 0 || d >= cutoff.getTime();
      });
    } else if (datePeriod === '30d') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter(r => {
        if (!r.reviewDate) return true;
        const d = parseReviewDate(r.reviewDate);
        return d === 0 || d >= cutoff.getTime();
      });
    } else if (datePeriod === '90d') {
      const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      result = result.filter(r => {
        if (!r.reviewDate) return true;
        const d = parseReviewDate(r.reviewDate);
        return d === 0 || d >= cutoff.getTime();
      });
    } else if (datePeriod === '2026') {
      result = result.filter(r => r.reviewDate && r.reviewDate.includes('2026'));
    } else if (datePeriod === 'CUSTOM' && (customStartDate || customEndDate)) {
      result = result.filter(r => {
        if (!r.reviewDate) return true;
        const dStr = r.reviewDate.slice(0, 10);
        if (customStartDate && dStr < customStartDate) return false;
        if (customEndDate && dStr > customEndDate) return false;
        return true;
      });
    }

    // Sort logic with parsed date timestamp and fallback tie-breaker
    result.sort((a, b) => {
      const timeA = parseReviewDate(a.reviewDate);
      const timeB = parseReviewDate(b.reviewDate);

      if (sortBy === 'NEWEST') {
        if (timeB !== timeA) return timeB - timeA;
        return b.id.localeCompare(a.id);
      } else if (sortBy === 'OLDEST') {
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      } else if (sortBy === 'RATING_HIGH') {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return timeB - timeA;
      } else if (sortBy === 'RATING_LOW') {
        if (a.rating !== b.rating) return a.rating - b.rating;
        return timeB - timeA;
      }
      return 0;
    });

    return result;
  }, [reviews, selectedStore, datePeriod, customStartDate, customEndDate, selectedRating, replyStatus, searchQuery, sortBy]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredReviews.length / PAGE_SIZE) || 1;
  }, [filteredReviews.length]);

  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReviews.slice(start, start + PAGE_SIZE);
  }, [filteredReviews, currentPage]);

  // Overall statistics calculation
  const stats = useMemo(() => {
    const total = filteredReviews.length;
    if (total === 0) {
      return {
        avgRating: 0,
        totalReviews: 0,
        fiveStarPercent: 0,
        responseRate: 0,
        repliedCount: 0,
        ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    let sum = 0;
    let replied = 0;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    filteredReviews.forEach(r => {
      sum += r.rating;
      if (r.ownerReply && r.ownerReply.trim().length > 0) {
        replied++;
      }
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating))) as 1|2|3|4|5;
      counts[rounded] = (counts[rounded] || 0) + 1;
    });

    const avg = sum / total;
    const fiveStar = ((counts[5] + counts[4]) / total) * 100;
    const responseRate = (replied / total) * 100;

    return {
      avgRating: avg,
      totalReviews: total,
      fiveStarPercent: fiveStar,
      responseRate: responseRate,
      repliedCount: replied,
      ratingCounts: counts
    };
  }, [filteredReviews]);

  // Store performance summary
  const storePerformance = useMemo(() => {
    return STORE_NAMES.map(store => {
      const targetStore = store.trim().toUpperCase();
      const storeRevs = reviews.filter(r => (r.storeName || '').trim().toUpperCase() === targetStore);
      const count = storeRevs.length;
      if (count === 0) {
        return { storeName: store, avg: 0, count: 0, responseRate: 0, fiveStarCount: 0 };
      }
      const sum = storeRevs.reduce((acc, curr) => acc + curr.rating, 0);
      const replied = storeRevs.filter(r => r.ownerReply && r.ownerReply.trim().length > 0).length;
      const fiveStar = storeRevs.filter(r => Math.round(r.rating) === 5).length;
      return {
        storeName: store,
        avg: sum / count,
        count,
        responseRate: (replied / count) * 100,
        fiveStarCount: fiveStar
      };
    });
  }, [reviews]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={cn(
              star <= Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "text-slate-300 fill-slate-200"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-600">
              <Star className="fill-amber-500" size={24} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Rating & Review Google Maps</h1>
                {isSampleData && (
                  <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
                    Data Contoh (Demo Mode)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Data ulasan dan penilaian dari 11 cabang Optik 150k
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
            <span>{isLoading ? 'Memuat Data...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {permissionError && (
        <div className="p-5 bg-amber-50/90 border border-amber-300 rounded-2xl text-amber-900 text-xs space-y-3 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <span>Mengapa Data Google Review Masih Kosong / Menggunakan Data Contoh?</span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            Spreadsheet Google Review (ID: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px] text-amber-900">11lM15p9qGdLpC3EbHDDxNF6RjVx380YhZjdkMWOQFl0</code>) saat ini belum dibuka akses pembacaan publik oleh pemilik Google Drive, atau akun Google di aplikasi belum terhubung.
          </p>
          <div className="bg-white p-4 rounded-xl border border-amber-200 text-slate-700 text-xs space-y-2">
            <p className="font-semibold text-slate-900">Langkah Mudah Membuka Akses Spreadsheet (Cukup 1x Saja):</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 font-medium">
              <li>
                Buka link Google Spreadsheet ini: {' '}
                <a 
                  href="https://docs.google.com/spreadsheets/d/11lM15p9qGdLpC3EbHDDxNF6RjVx380YhZjdkMWOQFl0/edit" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 underline font-semibold inline-flex items-center gap-1 hover:text-blue-800"
                >
                  Spreadsheet Google Review <ExternalLink size={12} />
                </a>
              </li>
              <li>Klik tombol hijau <strong>Bagikan (Share)</strong> di kanan atas halaman spreadsheet.</li>
              <li>Di bagian <strong>Akses umum (General access)</strong>, ubah dari <em>Dibatasi (Restricted)</em> menjadi <strong>"Siapa saja yang memiliki link" (Anyone with the link)</strong>.</li>
              <li>Pastikan perannya diset ke <strong>Pelihat (Viewer)</strong>, lalu klik <strong>Selesai (Done)</strong>.</li>
              <li>Kembali ke halaman ini dan klik tombol <strong>Refresh Data</strong> di kanan atas!</li>
            </ol>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs">
          <AlertCircle size={18} className="shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Filter size={16} className="text-blue-600" />
            <span>Filter Data Ulasan</span>
          </div>
          <button
            onClick={() => {
              setSelectedStore('ALL');
              setDatePeriod('ALL');
              setCustomStartDate('');
              setCustomEndDate('');
              setSelectedRating('ALL');
              setReplyStatus('ALL');
              setSearchQuery('');
              setSortBy('NEWEST');
            }}
            className="text-[11px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Reset All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Store Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Cabang Store
            </label>
            <div className="relative">
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="ALL">Semua Cabang (11 Store)</option>
                {STORE_NAMES.map(store => (
                  <option key={store} value={store}>{store}</option>
                ))}
              </select>
              <Store size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Date Period Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Periode Ulasan
            </label>
            <div className="relative">
              <select
                value={datePeriod}
                onChange={(e) => setDatePeriod(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="ALL">Semua Waktu</option>
                <option value="7d">7 Hari Terakhir</option>
                <option value="30d">1 Bulan Terakhir (30 Hari)</option>
                <option value="90d">3 Bulan Terakhir</option>
                <option value="2026">Tahun 2026</option>
                <option value="CUSTOM">Tanggal Custom</option>
              </select>
              <Calendar size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Rating Bintang Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Rating Bintang
            </label>
            <div className="relative">
              <select
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="ALL">Semua Rating (1-5★)</option>
                <option value="5">Bintang 5 (★★★★★)</option>
                <option value="4">Bintang 4 (★★★★)</option>
                <option value="3">Bintang 3 (★★★)</option>
                <option value="2">Bintang 2 (★★)</option>
                <option value="1">Bintang 1 (★)</option>
              </select>
              <Star size={14} className="absolute left-2.5 top-2.5 text-amber-500 fill-amber-500 pointer-events-none" />
              <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Status Balasan Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Balasan Owner
            </label>
            <div className="relative">
              <select
                value={replyStatus}
                onChange={(e) => setReplyStatus(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="REPLIED">Sudah Dibalas</option>
                <option value="UNREPLIED">Belum Dibalas</option>
              </select>
              <MessageSquare size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Sort By Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Urutkan Data
            </label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="NEWEST">Terbaru Pertama</option>
                <option value="OLDEST">Terlama Pertama</option>
                <option value="RATING_HIGH">Rating Tertinggi (5★)</option>
                <option value="RATING_LOW">Rating Terendah (1★)</option>
              </select>
              <Filter size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Cari Ulasan
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama / komentar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Custom Date Inputs if CUSTOM selected */}
        {datePeriod === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Rentang Tanggal:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
              />
              <span className="text-slate-400">s/d</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Rata-Rata Rating */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rata-Rata Rating</p>
            <span className="p-1.5 bg-amber-50 rounded-lg text-amber-500">
              <Star className="fill-amber-400" size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '0.0'}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 5.0</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {renderStars(stats.avgRating)}
            <span className="text-[11px] text-slate-500">({stats.totalReviews} Ulasan)</span>
          </div>
        </div>

        {/* Card 2: Total Ulasan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Ulasan</p>
            <span className="p-1.5 bg-blue-50 rounded-lg text-blue-500">
              <MessageSquare size={16} />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalReviews}</p>
          <p className="mt-2 text-[11px] text-slate-500">
            {selectedStore === 'ALL' ? 'Dari 11 cabang store' : `Cabang ${selectedStore}`}
          </p>
        </div>

        {/* Card 3: Respon Owner */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tingkat Balasan Owner</p>
            <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 tracking-tight">
              {stats.responseRate.toFixed(0)}%
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {stats.repliedCount} dari {stats.totalReviews} ulasan sudah dibalas
          </p>
        </div>

        {/* Card 4: Kepuasan Pelanggan (Bintang 5 & 4) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kepuasan (Bintang 4-5)</p>
            <span className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
              <ThumbsUp size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600 tracking-tight">
              {stats.fiveStarPercent.toFixed(0)}%
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {(stats.ratingCounts[5] || 0) + (stats.ratingCounts[4] || 0)} ulasan positif
          </p>
        </div>
      </div>

      {/* Cabang Store Matrix Overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Store size={16} className="text-blue-600" />
              <span>Rating Per Cabang Store</span>
            </h2>
            {selectedStore !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 animate-fade-in">
                <span>Cabang: {selectedStore}</span>
                <button
                  onClick={() => setSelectedStore('ALL')}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  title="Unselect / Reset store filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedStore !== 'ALL' ? (
              <button
                onClick={() => setSelectedStore('ALL')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200"
              >
                <X size={13} />
                <span>Tampilkan Semua Cabang (Reset)</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Klik kotak cabang untuk pilih / unselect</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Card 0: Reset to ALL */}
          <button
            onClick={() => setSelectedStore('ALL')}
            className={cn(
              "p-3 rounded-xl border text-left transition-all duration-200 ease-in-out relative overflow-hidden group cursor-pointer active:scale-95",
              selectedStore === 'ALL'
                ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-400 -translate-y-0.5"
                : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-sm hover:-translate-y-0.5"
            )}
          >
            <div className="flex items-center justify-between">
              <p className={cn(
                "text-xs font-bold truncate",
                selectedStore === 'ALL' ? "text-white" : "text-slate-800"
              )}>
                SEMUA STORE
              </p>
              {selectedStore === 'ALL' && (
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              )}
            </div>
            
            <div className="flex items-center gap-1.5 mt-1.5">
              <Star size={12} className={cn("fill-amber-400", selectedStore === 'ALL' ? "text-amber-300" : "text-amber-400")} />
              <span className={cn(
                "text-sm font-black",
                selectedStore === 'ALL' ? "text-white" : "text-slate-900"
              )}>
                {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '0.0'}
              </span>
              <span className={cn(
                "text-[10px] ml-auto font-medium",
                selectedStore === 'ALL' ? "text-slate-300" : "text-slate-500"
              )}>
                ({reviews.length})
              </span>
            </div>

            <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
              <div
                className={cn("h-full rounded-full", selectedStore === 'ALL' ? "bg-emerald-400" : "bg-emerald-500")}
                style={{ width: '100%' }}
              />
            </div>
          </button>

          {storePerformance.map((sp) => {
            const isSelected = selectedStore.trim().toUpperCase() === sp.storeName.trim().toUpperCase();
            return (
              <button
                key={sp.storeName}
                onClick={() => setSelectedStore(isSelected ? 'ALL' : sp.storeName)}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all duration-200 ease-in-out relative overflow-hidden group cursor-pointer active:scale-95",
                  isSelected
                    ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-600 shadow-md ring-2 ring-blue-400 -translate-y-0.5"
                    : "bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-white hover:shadow-sm hover:-translate-y-0.5"
                )}
                title={isSelected ? `Klik untuk unselect ${sp.storeName}` : `Pilih ${sp.storeName}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <p className={cn(
                    "text-xs font-bold truncate",
                    isSelected ? "text-white" : "text-slate-800"
                  )}>
                    {sp.storeName}
                  </p>
                  {isSelected && (
                    <CheckCircle2 size={13} className="text-amber-300 shrink-0 animate-scale-in" />
                  )}
                </div>
                
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Star size={12} className={cn("fill-amber-400", isSelected ? "text-amber-300" : "text-amber-400")} />
                  <span className={cn(
                    "text-sm font-black",
                    isSelected ? "text-white" : "text-slate-900"
                  )}>
                    {sp.avg > 0 ? sp.avg.toFixed(1) : '0.0'}
                  </span>
                  <span className={cn(
                    "text-[10px] ml-auto font-medium",
                    isSelected ? "text-blue-100" : "text-slate-500"
                  )}>
                    ({sp.count})
                  </span>
                </div>

                {/* Progress bar for 5-star ratio */}
                <div className="w-full bg-slate-200/60 h-1 rounded-full mt-2 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", isSelected ? "bg-amber-300" : "bg-emerald-500")}
                    style={{ width: `${sp.count > 0 ? (sp.fiveStarCount / sp.count) * 100 : 0}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reviews Feed Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Feed Top Controls */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Daftar Ulasan Google Maps ({filteredReviews.length})
            </h3>
            <p className="text-xs text-slate-500">
              {filteredReviews.length > 0
                ? `Menampilkan ${((currentPage - 1) * PAGE_SIZE) + 1} - ${Math.min(currentPage * PAGE_SIZE, filteredReviews.length)} dari total ${filteredReviews.length} ulasan`
                : 'Menampilkan 0 ulasan'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="NEWEST">Terbaru</option>
              <option value="OLDEST">Terlama</option>
              <option value="RATING_HIGH">Rating Tertinggi (5★)</option>
              <option value="RATING_LOW">Rating Terendah (1★)</option>
            </select>
          </div>
        </div>

        {/* Loading / Empty / Content state */}
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="animate-spin text-blue-600 mx-auto" size={32} />
            <p className="text-sm font-medium text-slate-600">Mengambil data ulasan dari Google Maps...</p>
            <p className="text-xs text-slate-400">Harap tunggu sebentar, sedang membaca data dari 11 cabang store</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <MessageSquare size={40} className="text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada ulasan yang cocok</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Coba ubah atau reset filter cabang, periode waktu, atau rating bintang di atas.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {paginatedReviews.map((rev) => (
                <div key={rev.id} className="p-6 hover:bg-slate-50/50 transition-colors space-y-3">
                  {/* Reviewer Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0 uppercase">
                        {rev.reviewerName ? rev.reviewerName.slice(0, 2) : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm capitalize">{rev.reviewerName}</h4>
                          {rev.reviewerTotalReviews > 1 && (
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-600 rounded-full flex items-center gap-1">
                              <UserCheck size={10} />
                              {rev.reviewerTotalReviews} ulasan
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {renderStars(rev.rating)}
                          <span className="text-xs font-bold text-slate-700">{rev.rating.toFixed(1)}</span>
                          <span className="text-[11px] text-slate-400">•</span>
                          <span className="text-[11px] text-slate-500">{rev.reviewDate || 'Baru saja'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Store Badge */}
                    <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0">
                      <Store size={12} />
                      {rev.storeName}
                    </span>
                  </div>

                  {/* Review Content */}
                  {rev.content ? (
                    <p className="text-xs text-slate-700 leading-relaxed pl-1 whitespace-pre-line">
                      "{rev.content}"
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic pl-1">
                      (Pengguna memberikan nilai tanpa komentar tertulis)
                    </p>
                  )}

                  {/* Review Photos */}
                  {rev.photos && rev.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {rev.photos.map((photoUrl, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => setActivePhoto({ urls: rev.photos, index: pIdx })}
                          className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:ring-2 hover:ring-blue-500 transition-all shrink-0"
                        >
                          <img
                            src={photoUrl}
                            alt={`Review foto ${pIdx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <ImageIcon size={16} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Owner Reply Box */}
                  {rev.ownerReply && rev.ownerReply.trim().length > 0 ? (
                    <div className="mt-3 p-4 bg-slate-50 border-l-4 border-blue-600 rounded-r-2xl space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <CheckCircle2 size={14} className="text-blue-600" />
                        <span>Balasan dari Optik 150k</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {rev.ownerReply}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-amber-600/80 flex items-center gap-1.5 font-medium">
                      <AlertCircle size={12} />
                      <span>Belum ada balasan owner di Google Maps</span>
                    </div>
                  )}

                  {/* Footer timestamp */}
                  {rev.fetchedDate && (
                    <div className="pt-1 text-[10px] text-slate-400">
                      Data diambil pada: {rev.fetchedDate}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  Halaman {currentPage} dari {totalPages}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium flex items-center gap-1"
                  >
                    <ChevronLeft size={14} />
                    <span>Sebelumnya</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;

                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span className="text-xs text-slate-400 px-1">...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                              "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                              currentPage === page
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                            )}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium flex items-center gap-1"
                  >
                    <span>Selanjutnya</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Photo Lightbox Modal */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={() => setActivePhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <X size={24} />
          </button>

          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center">
            <img
              src={activePhoto.urls[activePhoto.index]}
              alt="Review Photo Full"
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
            {activePhoto.urls.length > 1 && (
              <div className="flex items-center gap-2 mt-4">
                {activePhoto.urls.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhoto({ ...activePhoto, index: idx })}
                    className={cn(
                      "w-3 h-3 rounded-full transition-all",
                      idx === activePhoto.index ? "bg-white scale-125" : "bg-white/40"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
