import { useState } from 'react';
import { Download, FileText, Table, Building2, Users, CheckCircle, Clock, ListChecks } from 'lucide-react';
import { exportToPDF, exportToExcel, exportCustomerPDF, exportCustomerExcel } from '../utils/exportUtils';
import { Job, BulkPayment } from '../types';

interface ExportPanelProps {
  jobs: Job[];
  bulkPayments: BulkPayment[];
  firmaList: string[];
}

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

function formatCurrency(amount: number): string {
  return amount.toLocaleString('tr-TR') + ' ₺';
}

export default function ExportPanel({ jobs, bulkPayments, firmaList }: ExportPanelProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [selectedFirma, setSelectedFirma] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  // Müşteri bazlı export state
  const [customerFirma, setCustomerFirma] = useState<string>('');
  const [customerExporting, setCustomerExporting] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleExportPDF = () => {
    setExporting(true);
    try {
      exportToPDF(jobs, bulkPayments, period, year, period === 'monthly' ? month : undefined, selectedFirma || undefined);
    } catch (err) {
      console.error('PDF dışa aktarma hatası:', err);
    }
    setExporting(false);
  };

  const handleExportExcel = () => {
    setExporting(true);
    try {
      exportToExcel(jobs, bulkPayments, period, year, period === 'monthly' ? month : undefined, selectedFirma || undefined);
    } catch (err) {
      console.error('Excel dışa aktarma hatası:', err);
    }
    setExporting(false);
  };

  // Müşteri bazlı export handlers
  const handleCustomerExport = (format: 'pdf' | 'excel', statusFilter: 'all' | 'paid' | 'pending') => {
    if (!customerFirma) return;
    setCustomerExporting(true);
    try {
      if (format === 'pdf') {
        exportCustomerPDF(jobs, bulkPayments, customerFirma, statusFilter);
      } else {
        exportCustomerExcel(jobs, bulkPayments, customerFirma, statusFilter);
      }
    } catch (err) {
      console.error('Müşteri bazlı dışa aktarma hatası:', err);
    }
    setCustomerExporting(false);
  };

  // Period-based preview
  const getFilteredCount = () => {
    let filtered = jobs.filter(j => {
      const d = new Date(j.tarih);
      if (period === 'yearly') return d.getFullYear() === year;
      return d.getFullYear() === year && d.getMonth() === month;
    });
    if (selectedFirma) {
      filtered = filtered.filter(j => j.firma === selectedFirma);
    }
    const toplam = filtered.reduce((s, j) => s + j.tutar, 0);
    const odenen = filtered.filter(j => j.odendi).reduce((s, j) => s + j.tutar, 0);
    const bekleyen = filtered.filter(j => !j.odendi).reduce((s, j) => s + j.tutar, 0);
    return { count: filtered.length, toplam, odenen, bekleyen };
  };

  // Customer preview
  const getCustomerPreview = () => {
    if (!customerFirma) return { total: 0, paid: 0, pending: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 };
    const firmaJobs = jobs.filter(j => j.firma === customerFirma);
    const paidJobs = firmaJobs.filter(j => j.odendi);
    const pendingJobs = firmaJobs.filter(j => !j.odendi);
    return {
      total: firmaJobs.length,
      paid: paidJobs.length,
      pending: pendingJobs.length,
      totalAmount: firmaJobs.reduce((s, j) => s + j.tutar, 0),
      paidAmount: paidJobs.reduce((s, j) => s + j.tutar, 0),
      pendingAmount: pendingJobs.reduce((s, j) => s + j.tutar, 0),
    };
  };

  const preview = getFilteredCount();
  const customerPreview = getCustomerPreview();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-orange-100 p-2 rounded-lg">
          <Download className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dışa Aktar</h2>
          <p className="text-sm text-gray-500">Raporlarınızı PDF veya Excel olarak indirin</p>
        </div>
      </div>

      {/* ==================== DÖNEMSEL RAPOR ==================== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <ListChecks className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-bold text-gray-800">Dönemsel Rapor</h3>
        </div>
        <p className="text-xs text-gray-500 -mt-3">Aylık veya yıllık bazda tüm işleri dışa aktarın</p>

        {/* Period Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dönem Seçimi</label>
          <div className="flex gap-3">
            <button
              onClick={() => setPeriod('monthly')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition cursor-pointer ${
                period === 'monthly'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Aylık
            </button>
            <button
              onClick={() => setPeriod('yearly')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition cursor-pointer ${
                period === 'yearly'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Yıllık
            </button>
          </div>
        </div>

        {/* Year, Month, Firma Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yıl</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {period === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ay</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              >
                {MONTHS_TR.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                Müşteri (Opsiyonel)
              </span>
            </label>
            <select
              value={selectedFirma}
              onChange={(e) => setSelectedFirma(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="">Tüm Müşteriler</option>
              {firmaList.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview info */}
        <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-orange-600" />
            <p className="text-sm font-medium text-orange-800">Rapor Önizleme</p>
          </div>
          <p className="text-sm text-orange-700">
            {period === 'yearly' ? (
              <>
                <span className="font-bold">{year}</span> yılına ait
              </>
            ) : (
              <>
                <span className="font-bold">{MONTHS_TR[month]} {year}</span> dönemine ait
              </>
            )}
            {selectedFirma && <> <span className="font-bold">{selectedFirma}</span> müşterisinin</>}
            {' '}işler dışa aktarılacak.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div className="bg-white rounded-lg p-2.5 text-center">
              <p className="text-xs text-gray-500">İş Sayısı</p>
              <p className="font-bold text-gray-800">{preview.count}</p>
            </div>
            <div className="bg-white rounded-lg p-2.5 text-center">
              <p className="text-xs text-gray-500">Toplam</p>
              <p className="font-bold text-gray-800">{preview.toplam.toLocaleString('tr-TR')} ₺</p>
            </div>
            <div className="bg-white rounded-lg p-2.5 text-center">
              <p className="text-xs text-emerald-600">Ödenen</p>
              <p className="font-bold text-emerald-700">{preview.odenen.toLocaleString('tr-TR')} ₺</p>
            </div>
            <div className="bg-white rounded-lg p-2.5 text-center">
              <p className="text-xs text-red-600">Bekleyen</p>
              <p className="font-bold text-red-700">{preview.bekleyen.toLocaleString('tr-TR')} ₺</p>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleExportPDF}
            disabled={exporting || preview.count === 0}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl font-medium transition disabled:opacity-50 cursor-pointer shadow-md"
          >
            <FileText className="w-5 h-5" />
            PDF İndir
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting || preview.count === 0}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-xl font-medium transition disabled:opacity-50 cursor-pointer shadow-md"
          >
            <Table className="w-5 h-5" />
            Excel İndir
          </button>
        </div>
      </div>

      {/* ==================== MÜŞTERİ BAZLI RAPOR ==================== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-800">Müşteri Bazlı Rapor</h3>
        </div>
        <p className="text-xs text-gray-500 -mt-3">Belirli bir müşterinin tüm işlerini, ödenenlerini veya bekleyenlerini dışa aktarın</p>

        {/* Müşteri Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              Müşteri Seçin
            </span>
          </label>
          <select
            value={customerFirma}
            onChange={(e) => setCustomerFirma(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">-- Müşteri Seçin --</option>
            {firmaList.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Müşteri önizleme */}
        {customerFirma && (
          <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
            <p className="text-sm font-medium text-blue-800 mb-3">
              <span className="font-bold">{customerFirma}</span> müşterisi özeti
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Toplam İş</p>
                <p className="font-bold text-gray-800 text-lg">{customerPreview.total}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(customerPreview.totalAmount)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-xs text-emerald-600">Ödenen</p>
                <p className="font-bold text-emerald-700 text-lg">{customerPreview.paid}</p>
                <p className="text-xs text-emerald-600 mt-0.5">{formatCurrency(customerPreview.paidAmount)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-xs text-amber-600">Bekleyen</p>
                <p className="font-bold text-amber-700 text-lg">{customerPreview.pending}</p>
                <p className="text-xs text-amber-600 mt-0.5">{formatCurrency(customerPreview.pendingAmount)}</p>
              </div>
            </div>
          </div>
        )}

        {/* 3 Dışa Aktarma Seçeneği */}
        {customerFirma && (
          <div className="space-y-4">
            {/* 1. Tüm İşler */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-4 h-4 text-blue-600" />
                <h4 className="font-semibold text-gray-800">Tüm İşler</h4>
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{customerPreview.total} iş</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCustomerExport('pdf', 'all')}
                  disabled={customerExporting || customerPreview.total === 0}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={() => handleCustomerExport('excel', 'all')}
                  disabled={customerExporting || customerPreview.total === 0}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <Table className="w-4 h-4" />
                  Excel
                </button>
              </div>
            </div>

            {/* 2. Sadece Ödenenler */}
            <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/30">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <h4 className="font-semibold text-gray-800">Sadece Ödenen İşler</h4>
                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">{customerPreview.paid} iş</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCustomerExport('pdf', 'paid')}
                  disabled={customerExporting || customerPreview.paid === 0}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={() => handleCustomerExport('excel', 'paid')}
                  disabled={customerExporting || customerPreview.paid === 0}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <Table className="w-4 h-4" />
                  Excel
                </button>
              </div>
            </div>

            {/* 3. Ödeme Bekleyenler */}
            <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/30">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-600" />
                <h4 className="font-semibold text-gray-800">Ödeme Bekleyen İşler</h4>
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">{customerPreview.pending} iş</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCustomerExport('pdf', 'pending')}
                  disabled={customerExporting || customerPreview.pending === 0}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={() => handleCustomerExport('excel', 'pending')}
                  disabled={customerExporting || customerPreview.pending === 0}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <Table className="w-4 h-4" />
                  Excel
                </button>
              </div>
            </div>
          </div>
        )}

        {!customerFirma && (
          <div className="text-center py-6 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Rapor oluşturmak için yukarıdan bir müşteri seçin</p>
          </div>
        )}
      </div>
    </div>
  );
}
