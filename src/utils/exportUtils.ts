import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Job, BulkPayment } from '../types';

const MONTHS_TR = [
  'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
  'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'
];

const MONTHS_TR_DISPLAY = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

function formatCurrency(amount: number): string {
  return amount.toLocaleString('tr-TR') + ' TL';
}

function filterByPeriod(jobs: Job[], period: 'monthly' | 'yearly', year: number, month?: number): Job[] {
  return jobs.filter(j => {
    const date = new Date(j.tarih);
    if (period === 'yearly') {
      return date.getFullYear() === year;
    } else {
      return date.getFullYear() === year && date.getMonth() === (month ?? 0);
    }
  });
}

function filterBulkByPeriod(payments: BulkPayment[], period: 'monthly' | 'yearly', year: number, month?: number): BulkPayment[] {
  return payments.filter(p => {
    const date = new Date(p.tarih);
    if (period === 'yearly') return date.getFullYear() === year;
    return date.getFullYear() === year && date.getMonth() === (month ?? 0);
  });
}

// Transliterate Turkish characters for PDF
function tr(text: string): string {
  return text
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ı/g, 'i').replace(/İ/g, 'I');
}

export function exportToPDF(
  jobs: Job[],
  bulkPayments: BulkPayment[],
  period: 'monthly' | 'yearly',
  year: number,
  month?: number,
  firma?: string
) {
  let filteredJobs = filterByPeriod(jobs, period, year, month);
  let filteredBulk = filterBulkByPeriod(bulkPayments, period, year, month);
  
  if (firma) {
    filteredJobs = filteredJobs.filter(j => j.firma === firma);
    filteredBulk = filteredBulk.filter(p => p.firma === firma);
  }
  
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  const periodText = period === 'yearly' 
    ? `${year} Yili Raporu` 
    : `${MONTHS_TR[month ?? 0]} ${year} Raporu`;
  
  const firmaText = firma ? ` - ${tr(firma)}` : '';
  
  doc.setFontSize(18);
  doc.setTextColor(234, 88, 12);
  doc.text(`Yildirim Nakliyat${firmaText}`, 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(periodText, 14, 28);
  
  // Summary
  const toplamTutar = filteredJobs.reduce((sum, j) => sum + j.tutar, 0);
  const odenmis = filteredJobs.filter(j => j.odendi).reduce((sum, j) => sum + j.tutar, 0);
  const bekleyen = filteredJobs.filter(j => !j.odendi).reduce((sum, j) => sum + j.tutar, 0);
  const kdvliTutar = filteredJobs.filter(j => j.kdvDahil).reduce((sum, j) => sum + j.tutar, 0);
  const kdvsizTutar = filteredJobs.filter(j => !j.kdvDahil).reduce((sum, j) => sum + j.tutar, 0);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Toplam Is: ${filteredJobs.length}  |  Toplam Tutar: ${formatCurrency(toplamTutar)}  |  Odenmis: ${formatCurrency(odenmis)}  |  Bekleyen: ${formatCurrency(bekleyen)}`, 14, 36);
  doc.text(`KDV Dahil: ${formatCurrency(kdvliTutar)}  |  KDV Haric: ${formatCurrency(kdvsizTutar)}`, 14, 42);
  
  // Jobs table
  const tableData = filteredJobs.map((j, idx) => [
    idx + 1,
    tr(j.firma),
    tr(j.nereden),
    tr(j.nereye),
    formatCurrency(j.tutar),
    j.kdvDahil ? 'Dahil' : 'Haric',
    j.tarih,
    j.odendi ? 'Odendi' : 'Bekliyor',
    j.odendi ? (j.paidBy === 'bulk' ? 'Toplu' : 'Bireysel') : '-',
    tr(j.aciklama || '-'),
  ]);

  autoTable(doc, {
    startY: 47,
    head: [['#', 'Firma', 'Nereden', 'Nereye', 'Tutar', 'KDV', 'Tarih', 'Durum', 'Odeme Tipi', 'Aciklama']],
    body: tableData,
    styles: {
      fontSize: 6,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [234, 88, 12],
      textColor: [255, 255, 255],
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [255, 247, 237],
    },
    columnStyles: {
      0: { cellWidth: 7 },
      5: { halign: 'right' },
      6: { cellWidth: 12 },
    },
  });

  // Bulk payments
  if (filteredBulk.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(234, 88, 12);
    doc.text('Toplu Odemeler', 14, 20);

    const bulkData = filteredBulk.map((p, idx) => [
      idx + 1,
      tr(p.firma),
      formatCurrency(p.tutar),
      p.tarih,
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['#', 'Musteri', 'Tutar', 'Tarih']],
      body: bulkData,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255] },
    });
  }

  // Firma summary page (only if not firma-specific)
  if (!firma) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(234, 88, 12);
    doc.text('Musteri Bazli Ozet', 14, 20);

    const firmaMap = new Map<string, { toplam: number; odenen: number; bekleyen: number; isCount: number; kdvli: number }>();
    filteredJobs.forEach(j => {
      const existing = firmaMap.get(j.firma) || { toplam: 0, odenen: 0, bekleyen: 0, isCount: 0, kdvli: 0 };
      existing.toplam += j.tutar;
      existing.isCount += 1;
      if (j.odendi) existing.odenen += j.tutar;
      else existing.bekleyen += j.tutar;
      if (j.kdvDahil) existing.kdvli += j.tutar;
      firmaMap.set(j.firma, existing);
    });

    const firmaSummaryData = Array.from(firmaMap.entries()).map(([f, data], idx) => [
      idx + 1,
      tr(f),
      data.isCount,
      formatCurrency(data.toplam),
      formatCurrency(data.odenen),
      formatCurrency(data.bekleyen),
      formatCurrency(data.kdvli),
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['#', 'Musteri', 'Is Sayisi', 'Toplam', 'Odenen', 'Bekleyen', 'KDV Dahil']],
      body: firmaSummaryData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
    });
  }

  const firmaSlug = firma ? `_${tr(firma).replace(/\s+/g, '_')}` : '';
  const fileName = period === 'yearly' 
    ? `yildirim_nakliyat${firmaSlug}_${year}_rapor.pdf`
    : `yildirim_nakliyat${firmaSlug}_${MONTHS_TR[month ?? 0]}_${year}_rapor.pdf`;
  
  doc.save(fileName);
}

export function exportToExcel(
  jobs: Job[],
  bulkPayments: BulkPayment[],
  period: 'monthly' | 'yearly',
  year: number,
  month?: number,
  firma?: string
) {
  let filteredJobs = filterByPeriod(jobs, period, year, month);
  let filteredBulk = filterBulkByPeriod(bulkPayments, period, year, month);
  
  if (firma) {
    filteredJobs = filteredJobs.filter(j => j.firma === firma);
    filteredBulk = filteredBulk.filter(p => p.firma === firma);
  }
  
  const wb = XLSX.utils.book_new();

  // Jobs sheet
  const jobsData = filteredJobs.map((j, idx) => ({
    '#': idx + 1,
    'Firma': j.firma,
    'Nereden': j.nereden,
    'Nereye': j.nereye,
    'Tutar (TL)': j.tutar,
    'KDV': j.kdvDahil ? 'Dahil' : 'Hariç',
    'Tarih': j.tarih,
    'Durum': j.odendi ? 'Ödendi' : 'Bekliyor',
    'Ödeme Tipi': j.odendi ? (j.paidBy === 'bulk' ? 'Toplu' : 'Bireysel') : '-',
    'Ödeme Tarihi': j.odemeTarihi || '-',
    'Açıklama': j.aciklama || '-',
  }));

  const ws1 = XLSX.utils.json_to_sheet(jobsData);
  ws1['!cols'] = [
    { wch: 5 }, { wch: 20 }, { wch: 18 }, { wch: 18 },
    { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 25 }
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'İşler');

  // Summary sheet
  const toplamTutar = filteredJobs.reduce((sum, j) => sum + j.tutar, 0);
  const odenmis = filteredJobs.filter(j => j.odendi).reduce((sum, j) => sum + j.tutar, 0);
  const bekleyen = filteredJobs.filter(j => !j.odendi).reduce((sum, j) => sum + j.tutar, 0);
  const kdvliTutar = filteredJobs.filter(j => j.kdvDahil).reduce((sum, j) => sum + j.tutar, 0);
  const kdvsizTutar = filteredJobs.filter(j => !j.kdvDahil).reduce((sum, j) => sum + j.tutar, 0);

  const summaryData = [
    { 'Bilgi': 'Toplam İş', 'Değer': filteredJobs.length },
    { 'Bilgi': 'Toplam Tutar (TL)', 'Değer': toplamTutar },
    { 'Bilgi': 'Ödenen (TL)', 'Değer': odenmis },
    { 'Bilgi': 'Bekleyen (TL)', 'Değer': bekleyen },
    { 'Bilgi': 'KDV Dahil Tutar (TL)', 'Değer': kdvliTutar },
    { 'Bilgi': 'KDV Hariç Tutar (TL)', 'Değer': kdvsizTutar },
    { 'Bilgi': 'Tahsilat Oranı (%)', 'Değer': toplamTutar > 0 ? Math.round((odenmis / toplamTutar) * 100) : 0 },
  ];

  const ws2 = XLSX.utils.json_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Özet');

  // Bulk payments sheet
  if (filteredBulk.length > 0) {
    const bulkData = filteredBulk.map((p, idx) => ({
      '#': idx + 1,
      'Müşteri': p.firma,
      'Tutar (TL)': p.tutar,
      'Tarih': p.tarih,
    }));
    const ws3 = XLSX.utils.json_to_sheet(bulkData);
    ws3['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Toplu Ödemeler');
  }

  // Firma bazlı sheet (only if not firma-specific)
  if (!firma) {
    const firmaMap = new Map<string, { toplam: number; odenen: number; bekleyen: number; isCount: number; kdvli: number; kdvsiz: number }>();
    filteredJobs.forEach(j => {
      const existing = firmaMap.get(j.firma) || { toplam: 0, odenen: 0, bekleyen: 0, isCount: 0, kdvli: 0, kdvsiz: 0 };
      existing.toplam += j.tutar;
      existing.isCount += 1;
      if (j.odendi) existing.odenen += j.tutar;
      else existing.bekleyen += j.tutar;
      if (j.kdvDahil) existing.kdvli += j.tutar;
      else existing.kdvsiz += j.tutar;
      firmaMap.set(j.firma, existing);
    });

    const firmaData = Array.from(firmaMap.entries()).map(([f, data]) => ({
      'Müşteri': f,
      'Toplam İş': data.isCount,
      'Toplam Tutar (TL)': data.toplam,
      'Ödenen (TL)': data.odenen,
      'Bekleyen (TL)': data.bekleyen,
      'KDV Dahil (TL)': data.kdvli,
      'KDV Hariç (TL)': data.kdvsiz,
    }));

    if (firmaData.length > 0) {
      const ws4 = XLSX.utils.json_to_sheet(firmaData);
      ws4['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws4, 'Müşteri Bazlı');
    }
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  
  const firmaSlug = firma ? `_${firma.replace(/\s+/g, '_')}` : '';
  const fileName = period === 'yearly'
    ? `yildirim_nakliyat${firmaSlug}_${year}_rapor.xlsx`
    : `yildirim_nakliyat${firmaSlug}_${MONTHS_TR_DISPLAY[month ?? 0]}_${year}_rapor.xlsx`;
  
  saveAs(blob, fileName);
}

// ========== MÜŞTERI BAZLI DIŞA AKTARMA ==========

export function exportCustomerPDF(
  jobs: Job[],
  bulkPayments: BulkPayment[],
  firma: string,
  statusFilter: 'all' | 'paid' | 'pending'
) {
  let filteredJobs = jobs.filter(j => j.firma === firma);
  const filteredBulk = bulkPayments.filter(p => p.firma === firma);

  if (statusFilter === 'paid') {
    filteredJobs = filteredJobs.filter(j => j.odendi);
  } else if (statusFilter === 'pending') {
    filteredJobs = filteredJobs.filter(j => !j.odendi);
  }

  // Sort: newest first
  filteredJobs.sort((a, b) => b.tarih.localeCompare(a.tarih));

  const doc = new jsPDF('landscape', 'mm', 'a4');

  const statusText = statusFilter === 'all' ? 'Tum Isler' : statusFilter === 'paid' ? 'Odenen Isler' : 'Bekleyen Isler';

  doc.setFontSize(18);
  doc.setTextColor(234, 88, 12);
  doc.text(`Yildirim Nakliyat - ${tr(firma)}`, 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`${statusText} Raporu`, 14, 28);

  // Summary
  const toplamTutar = filteredJobs.reduce((sum, j) => sum + j.tutar, 0);
  const topluOdemeToplam = filteredBulk.reduce((sum, p) => sum + p.tutar, 0);
  const bireyselOdenen = filteredJobs.filter(j => j.odendi && j.paidBy === 'manual').reduce((sum, j) => sum + j.tutar, 0);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Toplam Is: ${filteredJobs.length}  |  Toplam Tutar: ${formatCurrency(toplamTutar)}`, 14, 36);
  
  if (statusFilter === 'all') {
    const allJobs = jobs.filter(j => j.firma === firma);
    const tumTutar = allJobs.reduce((sum, j) => sum + j.tutar, 0);
    const kalanBorc = tumTutar - bireyselOdenen - topluOdemeToplam;
    doc.text(`Bireysel Odenen: ${formatCurrency(bireyselOdenen)}  |  Toplu Odeme: ${formatCurrency(topluOdemeToplam)}  |  Kalan Borc: ${formatCurrency(Math.max(0, kalanBorc))}`, 14, 42);
  }

  const startY = statusFilter === 'all' ? 48 : 42;

  const tableData = filteredJobs.map((j, idx) => [
    idx + 1,
    tr(j.nereden),
    tr(j.nereye),
    formatCurrency(j.tutar),
    j.kdvDahil ? 'Dahil' : 'Haric',
    j.tarih,
    j.odendi ? 'Odendi' : 'Bekliyor',
    tr(j.aciklama || '-'),
  ]);

  autoTable(doc, {
    startY,
    head: [['#', 'Nereden', 'Nereye', 'Tutar', 'KDV', 'Tarih', 'Durum', 'Aciklama']],
    body: tableData,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontSize: 8 },
    alternateRowStyles: { fillColor: [255, 247, 237] },
    columnStyles: { 0: { cellWidth: 8 } },
  });

  // Toplu ödemeler (sadece "all" modunda göster)
  if (statusFilter === 'all' && filteredBulk.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(234, 88, 12);
    doc.text(`${tr(firma)} - Toplu Odemeler`, 14, 20);

    const bulkData = filteredBulk.map((p, idx) => [
      idx + 1,
      formatCurrency(p.tutar),
      p.tarih,
      tr(p.aciklama || '-'),
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['#', 'Tutar', 'Tarih', 'Aciklama']],
      body: bulkData,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255] },
    });
  }

  const statusSlug = statusFilter === 'all' ? 'tum_isler' : statusFilter === 'paid' ? 'odenen' : 'bekleyen';
  doc.save(`${tr(firma).replace(/\\s+/g, '_')}_${statusSlug}_rapor.pdf`);
}

export function exportCustomerExcel(
  jobs: Job[],
  bulkPayments: BulkPayment[],
  firma: string,
  statusFilter: 'all' | 'paid' | 'pending'
) {
  let filteredJobs = jobs.filter(j => j.firma === firma);
  const filteredBulk = bulkPayments.filter(p => p.firma === firma);

  if (statusFilter === 'paid') {
    filteredJobs = filteredJobs.filter(j => j.odendi);
  } else if (statusFilter === 'pending') {
    filteredJobs = filteredJobs.filter(j => !j.odendi);
  }

  filteredJobs.sort((a, b) => b.tarih.localeCompare(a.tarih));

  const wb = XLSX.utils.book_new();

  // İşler sheet
  const jobsData = filteredJobs.map((j, idx) => ({
    '#': idx + 1,
    'Nereden': j.nereden,
    'Nereye': j.nereye,
    'Tutar (TL)': j.tutar,
    'KDV': j.kdvDahil ? 'Dahil' : 'Hariç',
    'Tarih': j.tarih,
    'Durum': j.odendi ? 'Ödendi' : 'Bekliyor',
    'Açıklama': j.aciklama || '-',
  }));

  const ws1 = XLSX.utils.json_to_sheet(jobsData);
  ws1['!cols'] = [
    { wch: 5 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 25 }
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'İşler');

  // Özet sheet
  const allFirmaJobs = jobs.filter(j => j.firma === firma);
  const toplamTutar = filteredJobs.reduce((sum, j) => sum + j.tutar, 0);
  const tumTutar = allFirmaJobs.reduce((sum, j) => sum + j.tutar, 0);
  const bireyselOdenen = allFirmaJobs.filter(j => j.odendi && j.paidBy === 'manual').reduce((sum, j) => sum + j.tutar, 0);
  const topluOdeme = filteredBulk.reduce((sum, p) => sum + p.tutar, 0);
  const kalanBorc = Math.max(0, tumTutar - bireyselOdenen - topluOdeme);

  const statusLabel = statusFilter === 'all' ? 'Tüm İşler' : statusFilter === 'paid' ? 'Ödenen İşler' : 'Bekleyen İşler';

  const summaryData = [
    { 'Bilgi': 'Müşteri', 'Değer': firma },
    { 'Bilgi': 'Rapor Türü', 'Değer': statusLabel },
    { 'Bilgi': 'Gösterilen İş Sayısı', 'Değer': filteredJobs.length },
    { 'Bilgi': 'Gösterilen Tutar (TL)', 'Değer': toplamTutar },
    { 'Bilgi': '---', 'Değer': '---' },
    { 'Bilgi': 'Toplam İş Tutarı (TL)', 'Değer': tumTutar },
    { 'Bilgi': 'Bireysel Ödenen (TL)', 'Değer': bireyselOdenen },
    { 'Bilgi': 'Toplu Ödeme (TL)', 'Değer': topluOdeme },
    { 'Bilgi': 'Kalan Borç (TL)', 'Değer': kalanBorc },
  ];

  const ws2 = XLSX.utils.json_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Özet');

  // Toplu ödemeler (sadece "all" modunda)
  if (statusFilter === 'all' && filteredBulk.length > 0) {
    const bulkData = filteredBulk.map((p, idx) => ({
      '#': idx + 1,
      'Tutar (TL)': p.tutar,
      'Tarih': p.tarih,
      'Açıklama': p.aciklama || '-',
    }));
    const ws3 = XLSX.utils.json_to_sheet(bulkData);
    ws3['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Toplu Ödemeler');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });

  const statusSlug = statusFilter === 'all' ? 'tum_isler' : statusFilter === 'paid' ? 'odenen' : 'bekleyen';
  saveAs(blob, `${firma.replace(/\\s+/g, '_')}_${statusSlug}_rapor.xlsx`);
}
