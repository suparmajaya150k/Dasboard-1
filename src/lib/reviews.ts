import { STORE_NAMES } from './sheets';

export const REVIEWS_SPREADSHEET_ID = '11lM15p9qGdLpC3EbHDDxNF6RjVx380YhZjdkMWOQFl0';

export interface GoogleReview {
  id: string;
  reviewerName: string;
  reviewerTotalReviews: number;
  rating: number;
  content: string;
  photos: string[];
  reviewDate: string;
  ownerReply: string;
  fetchedDate: string;
  storeName: string;
}

export interface FetchReviewsResult {
  reviews: GoogleReview[];
  isSampleData: boolean;
  permissionError?: string;
}

function parseGVizCell(cell: any): string {
  if (!cell) return '';
  if (cell.v !== undefined && cell.v !== null) {
    if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
      const m = cell.v.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+)(?:,(\d+))?)?\)/);
      if (m) {
        const Y = m[1];
        const M = String(parseInt(m[2], 10) + 1).padStart(2, '0');
        const D = String(m[3]).padStart(2, '0');
        const h = m[4] ? String(m[4]).padStart(2, '0') : '00';
        const min = m[5] ? String(m[5]).padStart(2, '0') : '00';
        return `${Y}-${M}-${D} ${h}:${min}`;
      }
    }
    if (typeof cell.v !== 'string' && cell.f !== undefined && cell.f !== null) {
      return String(cell.f);
    }
    return String(cell.v);
  }
  if (cell.f !== undefined && cell.f !== null) return String(cell.f);
  return '';
}

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (!inQuotes) {
        if (currentVal === '') {
          inQuotes = true;
        } else {
          currentVal += '"';
        }
      } else {
        if (nextChar === '"') {
          currentVal += '"';
          i++; // skip escaped quote
        } else if (nextChar === ',' || nextChar === '\r' || nextChar === '\n' || i === text.length - 1) {
          inQuotes = false;
        } else {
          currentVal += '"';
        }
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentVal.trim());
      currentVal = '';
      if (row.some(cell => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(cell => cell.length > 0)) {
      lines.push(row);
    }
  }
  return lines;
}

function cleanCell(str: string | undefined): string {
  if (!str) return '';
  let cleaned = str.trim();
  while (cleaned.length >= 2 && cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  cleaned = cleaned.replace(/""/g, '"');
  // If cell is "-" or contains only hyphens/dashes/spaces, treat as empty
  if (/^[\-\u2010-\u2015\u2212\s]+$/.test(cleaned)) {
    return '';
  }
  return cleaned;
}

// Rich sample fallback reviews matching user format across all 11 stores
export const SAMPLE_REVIEWS: GoogleReview[] = [
  // DR MANSYUR
  {
    id: 'rev_drmansyur_1',
    reviewerName: 'Kurnia Cahyati',
    reviewerTotalReviews: 2,
    rating: 5,
    content: 'Kacamatanya lengkap, pelayanannya ramah. Harganya juga ramah di kantong.',
    photos: [
      'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&auto=format&fit=crop&q=80'
    ],
    reviewDate: '2026-07-19 15:31',
    ownerReply: 'Terima kasih sudah berkunjung, kak Kurnia Cahyati. Cek mata & service bisa dilakukan kapan saja, gratis seumur hidup. Kalau ada kendala, WA aja: 0811-6597-722. Salam bahagia, sehat dan sejahtera selalu.',
    fetchedDate: '2026-07-30',
    storeName: 'DR MANSYUR'
  },
  {
    id: 'rev_drmansyur_2',
    reviewerName: 'Andi Wijaya',
    reviewerTotalReviews: 4,
    rating: 5,
    content: 'Pemeriksaan mata teliti sekali pakai komputer automatik. Lensa progresifnya nyaman.',
    photos: [],
    reviewDate: '2026-07-28 09:15',
    ownerReply: 'Terima kasih banyak Kak Andi atas ulasannya! Salam sehat selalu dari Optik 150k Dr Mansyur.',
    fetchedDate: '2026-07-30',
    storeName: 'DR MANSYUR'
  },

  // KARYA DAME
  {
    id: 'rev_karyadame_1',
    reviewerName: 'Budi Santoso',
    reviewerTotalReviews: 5,
    rating: 5,
    content: 'Pelayanan cepat dan ramah, hasil periksa mata sangat akurat. Banyak pilihan frame kacamata kekinian.',
    photos: ['https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=500&auto=format&fit=crop&q=80'],
    reviewDate: '2026-07-25 10:15',
    ownerReply: 'Terima kasih Kak Budi Santoso atas ulasan positifnya! Kami selalu berkomitmen memberikan pelayanan terbaik untuk kesehatan mata Anda.',
    fetchedDate: '2026-07-30',
    storeName: 'KARYA DAME'
  },
  {
    id: 'rev_karyadame_2',
    reviewerName: 'Melati Suci',
    reviewerTotalReviews: 1,
    rating: 4,
    content: 'Kacamata sudah selesai dalam 20 menit, hasil rapi dan ringan dipakai.',
    photos: [],
    reviewDate: '2026-07-20 14:00',
    ownerReply: 'Terima kasih Kak Melati! Kami senang dapat melayani kebutuhan kacamata Anda dengan cepat.',
    fetchedDate: '2026-07-30',
    storeName: 'KARYA DAME'
  },

  // HALAT
  {
    id: 'rev_halat_1',
    reviewerName: 'Siti Aminah',
    reviewerTotalReviews: 1,
    rating: 5,
    content: 'Tempatnya bersih, ber-AC dingin, petugas sabar menjelaskan pilihan lensa anti radiasi.',
    photos: [],
    reviewDate: '2026-07-22 14:20',
    ownerReply: 'Terima kasih Kak Siti Aminah! Senang bisa memberikan pengalaman terbaik saat periksa mata di Optik 150k Halat.',
    fetchedDate: '2026-07-30',
    storeName: 'HALAT'
  },
  {
    id: 'rev_halat_2',
    reviewerName: 'Reza Rahardian',
    reviewerTotalReviews: 3,
    rating: 5,
    content: 'Pilihan frame 150rb worth it banget. Stafnya sangat membantu.',
    photos: [],
    reviewDate: '2026-07-16 11:30',
    ownerReply: 'Terima kasih Kak Reza! Salam sehat dari Optik 150k Halat.',
    fetchedDate: '2026-07-30',
    storeName: 'HALAT'
  },

  // RINGROAD
  {
    id: 'rev_ringroad_1',
    reviewerName: 'Rian Hidayat',
    reviewerTotalReviews: 3,
    rating: 4,
    content: 'Frame variatif dan bagus-bagus. Proses pengerjaan lensa sekitar 30 menit. Mantap!',
    photos: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&auto=format&fit=crop&q=80'],
    reviewDate: '2026-07-28 11:00',
    ownerReply: 'Terima kasih Kak Rian! Kepuasan dan kecepatan layanan adalah prioritas kami di cabang Ringroad.',
    fetchedDate: '2026-07-30',
    storeName: 'RINGROAD'
  },

  // JOHOR
  {
    id: 'rev_johor_1',
    reviewerName: 'Dewi Lestari',
    reviewerTotalReviews: 4,
    rating: 5,
    content: 'Harga terjangkau mulai 150k sudah dapat frame + lensa. Pilihan terbaik di daerah Johor!',
    photos: [],
    reviewDate: '2026-07-18 16:45',
    ownerReply: 'Terima kasih banyak Kak Dewi! Jangan ragu datang kembali untuk mampir cek mata gratis ya Kak.',
    fetchedDate: '2026-07-30',
    storeName: 'JOHOR'
  },

  // MARELAN
  {
    id: 'rev_marelan_1',
    reviewerName: 'Ahmad Fauzi',
    reviewerTotalReviews: 8,
    rating: 5,
    content: 'Stafnya ramah dan komunikatif sekali. Sangat direkomendasikan untuk belanja kacamata keluarga.',
    photos: ['https://images.unsplash.com/photo-1508296695146-257a814070b4?w=500&auto=format&fit=crop&q=80'],
    reviewDate: '2026-07-26 09:30',
    ownerReply: 'Terima kasih banyak Kak Ahmad Fauzi atas ulasan bintang 5 nya!',
    fetchedDate: '2026-07-30',
    storeName: 'MARELAN'
  },

  // PANCING (Multi-reviews)
  {
    id: 'rev_pancing_1',
    reviewerName: 'Linda Putri',
    reviewerTotalReviews: 2,
    rating: 5,
    content: 'Kacamata nyaman dipakai, garansi jelas. Lokasi strategis dekat kampus Medan Pancing. Masnya ramah banget!',
    photos: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&auto=format&fit=crop&q=80'],
    reviewDate: '2026-07-27 13:10',
    ownerReply: 'Terima kasih Kak Linda Putri! Kebanggaan bagi kami di cabang Pancing bisa melayani Kakak.',
    fetchedDate: '2026-07-30',
    storeName: 'PANCING'
  },
  {
    id: 'rev_pancing_2',
    reviewerName: 'Dicky Kurniawan',
    reviewerTotalReviews: 6,
    rating: 5,
    content: 'Tempat rekomendasi buat beli kacamata murah tapi berkualitas. Frame 150rb udah komplit lensa minus.',
    photos: [],
    reviewDate: '2026-07-24 16:20',
    ownerReply: 'Terima kasih Kak Dicky! Ditunggu kedatangannya kembali di Optik 150k Pancing.',
    fetchedDate: '2026-07-30',
    storeName: 'PANCING'
  },
  {
    id: 'rev_pancing_3',
    reviewerName: 'Rina Marlina',
    reviewerTotalReviews: 3,
    rating: 4,
    content: 'Pelayanan mantap, cepat & faskes mata komplit. Banyak promo diskon lensa photocromic.',
    photos: [],
    reviewDate: '2026-07-15 11:05',
    ownerReply: 'Terima kasih Kak Rina! Semoga kacamata barunya nyaman dipadupadankan harian.',
    fetchedDate: '2026-07-30',
    storeName: 'PANCING'
  },

  // KAPTEN MUSLIM
  {
    id: 'rev_kapten_muslim_1',
    reviewerName: 'Hendra Gunawan',
    reviewerTotalReviews: 6,
    rating: 5,
    content: 'Pemeriksaan mata komprehensif, teknisinya profesional. Sangat puas belanja di sini.',
    photos: ['https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=500&auto=format&fit=crop&q=80'],
    reviewDate: '2026-07-24 17:05',
    ownerReply: 'Terima kasih Kak Hendra! Semoga kacamatanya bermanfaat dan nyaman digunakan sehari-hari.',
    fetchedDate: '2026-07-30',
    storeName: 'KAPTEN MUSLIM'
  },

  // BINJAI
  {
    id: 'rev_binjai_1',
    reviewerName: 'Nurmala Sari',
    reviewerTotalReviews: 1,
    rating: 5,
    content: 'Bagus banget optic 150k Binjai, pelayanannya mas2 nya ramah banget dan cepat.',
    photos: [],
    reviewDate: '2026-07-27 12:40',
    ownerReply: 'Terima kasih Kak Nurmala! Ditunggu kedatangannya kembali.',
    fetchedDate: '2026-07-30',
    storeName: 'BINJAI'
  },

  // SIANTAR
  {
    id: 'rev_siantar_1',
    reviewerName: 'Ferry Pratama',
    reviewerTotalReviews: 3,
    rating: 5,
    content: 'Pelayanan oke, tempat nyaman. Sangat puas dengan kacamata barunya.',
    photos: [],
    reviewDate: '2026-07-15 11:20',
    ownerReply: 'Terima kasih Kak Ferry atas dukungan dan ulasan positifnya!',
    fetchedDate: '2026-07-30',
    storeName: 'SIANTAR'
  },

  // RANTAU PRAPAT
  {
    id: 'rev_rantau_prapat_1',
    reviewerName: 'Maya Utami',
    reviewerTotalReviews: 4,
    rating: 5,
    content: 'Koleksi frame banyak dan kekinian. Pelayanan ramah bintang lima!',
    photos: [],
    reviewDate: '2026-07-21 15:50',
    ownerReply: 'Terima kasih Kak Maya Utami! Salam hangat dari tim Optik 150k Rantau Prapat.',
    fetchedDate: '2026-07-30',
    storeName: 'RANTAU PRAPAT'
  }
];

export async function fetchGoogleReviews(accessToken?: string): Promise<FetchReviewsResult> {
  const allReviews: GoogleReview[] = [];

  // Helper to match store name against standard STORE_NAMES
  const matchCanonicalStoreName = (rawName: string): string => {
    if (!rawName) return '';
    const norm = rawName.trim().toUpperCase();
    const found = STORE_NAMES.find(s => s.trim().toUpperCase() === norm);
    return found || norm;
  };

  // Method 1: Try via Google Sheets API if accessToken is provided
  if (accessToken) {
    try {
      const ranges = STORE_NAMES.map(store => `'${store}'!A2:I`);
      const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${REVIEWS_SPREADSHEET_ID}/values:batchGet`);
      ranges.forEach(range => url.searchParams.append('ranges', range));

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        data.valueRanges?.forEach((sheetData: any, index: number) => {
          let storeName = STORE_NAMES[index];
          if (sheetData.range) {
            let rawName = sheetData.range.split('!')[0];
            if (rawName.startsWith("'") && rawName.endsWith("'")) rawName = rawName.slice(1, -1);
            storeName = matchCanonicalStoreName(rawName);
          }

          const rows = sheetData.values || [];
          rows.forEach((row: any[], rIdx: number) => {
            if (!row || row.length === 0) return;
            
            let reviewerName = cleanCell(row[1]);
            const lowerName = reviewerName.toLowerCase();
            if (lowerName === 'nama reviewer' || lowerName === 'reviewer') return; // Skip header
            if (!reviewerName) reviewerName = 'Pengguna Google';

            const reviewId = cleanCell(row[0]) || `rev_${storeName}_${rIdx}`;
            const totalReviews = parseInt(cleanCell(row[2]), 10) || 1;
            const rating = parseFloat(cleanCell(row[3])) || 5;
            const content = cleanCell(row[4]);
            
            const rawPhotos = cleanCell(row[5]);
            const photos = rawPhotos
              .split(/[\n,]+/)
              .map(u => u.trim())
              .filter(u => u.startsWith('http://') || u.startsWith('https://'));

            const reviewDate = cleanCell(row[6]);
            const ownerReply = cleanCell(row[7]);
            const fetchedDate = cleanCell(row[8]);

            allReviews.push({
              id: reviewId,
              reviewerName,
              reviewerTotalReviews: totalReviews,
              rating,
              content,
              photos,
              reviewDate,
              ownerReply,
              fetchedDate,
              storeName: matchCanonicalStoreName(storeName)
            });
          });
        });

        if (allReviews.length > 0) {
          return { reviews: allReviews, isSampleData: false };
        }
      }
    } catch (e) {
      console.warn('API fetch for reviews failed, trying public endpoints:', e);
    }
  }

  // Method 2: Fetch via public GViz JSON endpoint (or CSV fallback) for each store sheet
  try {
    const fetchPromises = STORE_NAMES.map(async (store) => {
      const canonicalStore = matchCanonicalStoreName(store);
      // Candidates to handle possible trailing spaces or casing in Google Sheet tab names
      const candidateTabNames = [
        canonicalStore,
        `${canonicalStore} `,
        ` ${canonicalStore}`,
        canonicalStore.toLowerCase()
      ];

      let bestStoreReviews: GoogleReview[] = [];

      for (const tabName of candidateTabNames) {
        // Try GViz JSON first (most reliable for multiline, quotes, and special characters)
        const jsonUrl = `https://docs.google.com/spreadsheets/d/${REVIEWS_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
        try {
          const res = await fetch(jsonUrl);
          if (res.ok) {
            const text = await res.text();
            if (!text.trim().startsWith('<!DOCTYPE html>') && !text.trim().startsWith('<html') && !text.includes('accounts.google.com/ServiceLogin')) {
              const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?/);
              if (jsonMatch) {
                const data = JSON.parse(jsonMatch[1]);
                if (data && data.table && Array.isArray(data.table.rows)) {
                  const storeReviews: GoogleReview[] = [];
                  data.table.rows.forEach((r: any, i: number) => {
                    if (!r || !r.c || !Array.isArray(r.c)) return;
                    let reviewerName = cleanCell(parseGVizCell(r.c[1]));
                    const lowerName = reviewerName.toLowerCase();
                    if (lowerName === 'nama reviewer' || lowerName === 'reviewer') return;
                    if (!reviewerName) reviewerName = 'Pengguna Google';

                    const reviewId = cleanCell(parseGVizCell(r.c[0])) || `rev_${canonicalStore}_${i}`;
                    const totalReviews = parseInt(cleanCell(parseGVizCell(r.c[2])), 10) || 1;
                    const rating = parseFloat(cleanCell(parseGVizCell(r.c[3]))) || 5;
                    const content = cleanCell(parseGVizCell(r.c[4]));

                    const rawPhotos = cleanCell(parseGVizCell(r.c[5]));
                    const photos = rawPhotos
                      .split(/[\n,]+/)
                      .map(u => u.trim())
                      .filter(u => u.startsWith('http://') || u.startsWith('https://'));

                    const reviewDate = cleanCell(parseGVizCell(r.c[6]));
                    const ownerReply = cleanCell(parseGVizCell(r.c[7]));
                    const fetchedDate = cleanCell(parseGVizCell(r.c[8]));

                    storeReviews.push({
                      id: reviewId,
                      reviewerName,
                      reviewerTotalReviews: totalReviews,
                      rating,
                      content,
                      photos,
                      reviewDate,
                      ownerReply,
                      fetchedDate,
                      storeName: canonicalStore
                    });
                  });

                  if (storeReviews.length > bestStoreReviews.length) {
                    bestStoreReviews = storeReviews;
                  }
                }
              }
            }
          }
        } catch (jsonErr) {
          // fall back to CSV below
        }

        // CSV Fallback
        const csvUrl = `https://docs.google.com/spreadsheets/d/${REVIEWS_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
        try {
          const res = await fetch(csvUrl);
          if (res.ok) {
            const text = await res.text();
            if (!text.trim().startsWith('<!DOCTYPE html>') && !text.trim().startsWith('<html') && !text.includes('accounts.google.com/ServiceLogin')) {
              const rows = parseCSV(text);
              if (rows.length >= 2) {
                const storeReviews: GoogleReview[] = [];
                for (let i = 1; i < rows.length; i++) {
                  const row = rows[i];
                  if (!row || row.length < 2) continue;

                  let reviewerName = cleanCell(row[1]);
                  const lowerName = reviewerName.toLowerCase();
                  if (lowerName === 'nama reviewer' || lowerName === 'reviewer') continue; // Header row
                  if (!reviewerName) reviewerName = 'Pengguna Google';

                  const reviewId = cleanCell(row[0]) || `rev_${canonicalStore}_${i}`;
                  const totalReviews = parseInt(cleanCell(row[2]), 10) || 1;
                  const rating = parseFloat(cleanCell(row[3])) || 5;
                  const content = cleanCell(row[4]);
                  
                  const rawPhotos = cleanCell(row[5]);
                  const photos = rawPhotos
                    .split(/[\n,]+/)
                    .map(u => u.trim())
                    .filter(u => u.startsWith('http://') || u.startsWith('https://'));

                  const reviewDate = cleanCell(row[6]);
                  const ownerReply = cleanCell(row[7]);
                  const fetchedDate = cleanCell(row[8]);

                  storeReviews.push({
                    id: reviewId,
                    reviewerName,
                    reviewerTotalReviews: totalReviews,
                    rating,
                    content,
                    photos,
                    reviewDate,
                    ownerReply,
                    fetchedDate,
                    storeName: canonicalStore
                  });
                }

                if (storeReviews.length > bestStoreReviews.length) {
                  bestStoreReviews = storeReviews;
                }
              }
            }
          }
        } catch (err) {
          // try next candidate tab name
        }
      }
      return bestStoreReviews;
    });

    const results = await Promise.all(fetchPromises);
    results.forEach(list => allReviews.push(...list));

    if (allReviews.length > 0) {
      return { reviews: allReviews, isSampleData: false };
    }
  } catch (err) {
    console.warn('Public CSV fetch failed:', err);
  }

  // If no data returned due to Google Sheet access restrictions, return sample reviews and permission notice
  return {
    reviews: SAMPLE_REVIEWS,
    isSampleData: true,
    permissionError: 'Akses Spreadsheet Google belum dibuka Publik (Dibatasi/Restricted). Silakan ubah izin berbagi spreadsheet ke "Siapa saja yang memiliki link" atau Login dengan Google di aplikasi.'
  };
}
