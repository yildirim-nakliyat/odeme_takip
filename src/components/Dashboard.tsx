import { useState } from 'react';
import { 
  TrendingUp, TrendingDown, Truck, Building2, Clock, CheckCircle, 
  CalendarDays, BarChart3, Receipt, Percent, ArrowRight, X,
  Eye, Wallet, CreditCard, Info
} from 'lucide-react';
import { Job, FirmaSummary } from '../types';

interface DashboardProps {
  stats: {
    // 4 kare kart (SADECE BİREYSEL MOD)
    kartToplamIs: number;
    kartBekleyenIs: number;
    kartOdenmisIs: number;
    kartFirmaCount: number;
    // Genel (tüm modlar)
    toplamIs: number;
    bekleyenIs: number;
    odenmisIs: number;
    toplamTutar: number;
    odenmis: number;
    bekleyen: number;
    firmaCount: number;
    topluFirmaCount: number;
    buAyIs: number;
    buAyTutar: number;
    buAyOdenen: number;
    buAyBekleyen: number;
    sonIsler: Job[];
    topBorcluFirmalar: FirmaSummary[];
    kdvliIsler: number;
    kdvsizIsler: number;
    tahsilatOrani: number;
    toplamBulkOdeme: number;
    bireyselOdenen: number;
    gercekKalanBorc: number;
    toplamOdenen: number;
  };
  allJobs: Job[];
  bireyselFirmaNames: Set<string>;
  onNavigate?: (page: string) => void;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('tr-TR') + ' ₺';
}

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

type ModalFilter = 'all' | 'pending' | 'paid' | 'firmalar';

export default function Dashboard({ stats, allJobs, bireyselFirmaNames, onNavigate }: DashboardProps) {
  const now = new Date();
  const currentMonthName = MONTHS_TR[now.getMonth()];
  const [modalFilter, setModalFilter] = useState<ModalFilter | null>(null);

  // Sadece BİREYSEL modundaki firmaların işleri
  const bireyselJobs = allJobs.filter(j => bireyselFirmaNames.has(j.firma.toLowerCase()));

  const getModalTitle = () => {
    switch (modalFilter) {
      case 'all': return 'Tüm İşler (Bireysel Mod)';
      case 'pending': return 'Bekleyen İşler (Bireysel Mod)';
      case 'paid': return 'Ödenen İşler (Bireysel Mod)';
      case 'firmalar': return 'Bireysel Mod Firmaları';
      default: return '';
    }
  };

  const getModalJobs = (): Job[] => {
    switch (modalFilter) {
      case 'all': return bireyselJobs;
      case 'pending': return bireyselJobs.filter(j => !j.odendi);
      case 'paid': return bireyselJobs.filter(j => j.odendi);
      default: return [];
    }
  };

  const getModalFirmalar = (): { firma: string; count: number; bekleyen: number }[] => {
    if (modalFilter !== 'firmalar') return [];
    const firmaMap = new Map<string, { count: number; bekleyen: number }>();
    bireyselJobs.forEach(j => {
      const existing = firmaMap.get(j.firma) || { count: 0, bekleyen: 0 };
      existing.count += 1;
      if (!j.odendi) existing.bekleyen += j.tutar;
      firmaMap.set(j.firma, existing);
    });
    return Array.from(firmaMap.entries())
      .map(([firma, data]) => ({ firma, ...data }))
      .sort((a, b) => b.bekleyen - a.bekleyen);
  };

  return (
    <div className="space-y-6">
      {/* Modal */}
      {modalFilter && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-10 px-4" onClick={() => setModalFilter(null)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Eye className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{getModalTitle()}</h3>
                  <p className="text-xs text-gray-400">Toplu ödeme modundaki müşteriler bu listede yer almaz</p>
                </div>
              </div>
              <button 
                onClick={() => setModalFilter(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-5">
              {modalFilter === 'firmalar' ? (
                <div className="space-y-2">
                  {getModalFirmalar().length === 0 ? (
                    <p className="text-center text-gray-400 py-8">Bireysel modda firma bulunamadı</p>
                  ) : (
                    getModalFirmalar().map(f => (
                      <div key={f.firma} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div>
                          <p className="font-medium text-gray-800">{f.firma}</p>
                          <p className="text-xs text-gray-500">{f.count} iş</p>
                        </div>
                        <div className="text-right">
                          {f.bekleyen > 0 ? (
                            <span className="text-sm font-bold text-red-600">{formatCurrency(f.bekleyen)} bekliyor</span>
                          ) : (
                            <span className="text-sm font-medium text-emerald-600">Borç yok ✓</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {getModalJobs().length === 0 ? (
                    <p className="text-center text-gray-400 py-8">İş bulunamadı</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                          {getModalJobs().length} iş
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium">
                          Toplam: {formatCurrency(getModalJobs().reduce((s, j) => s + j.tutar, 0))}
                        </span>
                      </div>
                      {getModalJobs().map(job => (
                        <div 
                          key={job.id} 
                          className={`rounded-lg p-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            job.odendi ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-800 text-sm">{job.firma}</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                job.odendi ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {job.odendi ? '✓ Ödendi' : '⏳ Bekliyor'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {job.nereden} → {job.nereye}
                            </p>
                            <p className="text-[10px] text-gray-400">📅 {job.tarih}</p>
                          </div>
                          <span className="font-bold text-gray-800 text-sm whitespace-nowrap">
                            {formatCurrency(job.tutar)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Kontrol Paneli</h2>
          <p className="text-sm text-gray-500">Genel bakış ve istatistikler</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
          <p className="text-sm text-orange-700 font-medium">
            📅 {now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Main Stat Cards - SADECE BİREYSEL MOD */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-purple-500" />
          <p className="text-xs text-purple-600 font-medium">
            Bu kartlar sadece bireysel ödeme modundaki müşterileri gösterir
            {stats.topluFirmaCount > 0 && (
              <span className="text-gray-400 font-normal"> • {stats.topluFirmaCount} müşteri toplu ödeme modunda</span>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            onClick={() => setModalFilter('all')}
            className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-lg shadow-orange-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-3">
              <Truck className="w-8 h-8 opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Tıkla</span>
            </div>
            <p className="text-3xl font-bold">{stats.kartToplamIs}</p>
            <p className="text-orange-100 text-sm mt-1">Toplam İş</p>
          </div>

          <div 
            onClick={() => setModalFilter('firmalar')}
            className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-5 text-white shadow-lg shadow-slate-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-3">
              <Building2 className="w-8 h-8 opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Tıkla</span>
            </div>
            <p className="text-3xl font-bold">{stats.kartFirmaCount}</p>
            <p className="text-slate-300 text-sm mt-1">Bireysel Firma</p>
          </div>

          <div 
            onClick={() => setModalFilter('pending')}
            className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-lg shadow-amber-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-8 h-8 opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Tıkla</span>
            </div>
            <p className="text-3xl font-bold">{stats.kartBekleyenIs}</p>
            <p className="text-amber-100 text-sm mt-1">Bekleyen İş</p>
          </div>

          <div 
            onClick={() => setModalFilter('paid')}
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg shadow-emerald-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-8 h-8 opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Tıkla</span>
            </div>
            <p className="text-3xl font-bold">{stats.kartOdenmisIs}</p>
            <p className="text-emerald-100 text-sm mt-1">Ödenen İş</p>
          </div>
        </div>
      </div>

      {/* Financial Summary - TÜM MODLAR DAHİL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-100 p-2.5 rounded-lg">
              <Receipt className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-gray-500 text-sm font-medium">Toplam Tutar</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.toplamTutar)}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-400">KDV Dahil: {stats.kdvliIsler} iş</span>
            <span className="text-xs text-gray-300">|</span>
            <span className="text-xs text-gray-400">KDV Hariç: {stats.kdvsizIsler} iş</span>
          </div>
          <p className="text-[10px] text-gray-300 mt-1">Tüm müşteriler ({stats.toplamIs} iş)</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-emerald-100 p-2.5 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-gray-500 text-sm font-medium">Toplam Ödenen</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.toplamOdenen)}</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Toplu Ödeme:
              </span>
              <span className="font-medium text-gray-600">{formatCurrency(stats.toplamBulkOdeme)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Bireysel:
              </span>
              <span className="font-medium text-gray-600">{formatCurrency(stats.bireyselOdenen)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
              <div 
                className="bg-emerald-500 rounded-full h-2 transition-all duration-500"
                style={{ width: `${stats.tahsilatOrani}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">Tahsilat Oranı: %{stats.tahsilatOrani}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-lg ${stats.gercekKalanBorc <= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <TrendingDown className={`w-5 h-5 ${stats.gercekKalanBorc <= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
            <span className="text-gray-500 text-sm font-medium">
              {stats.gercekKalanBorc <= 0 ? 'Fazla Ödeme' : 'Kalan Borç'}
            </span>
          </div>
          {stats.gercekKalanBorc <= 0 ? (
            <>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(Math.abs(stats.gercekKalanBorc))}
              </p>
              <p className="text-xs text-emerald-500 mt-2">✅ Tüm borçlar karşılandı!</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.gercekKalanBorc)}</p>
              <div className="mt-2">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className="bg-red-500 rounded-full h-2 transition-all duration-500"
                    style={{ width: `${stats.toplamTutar > 0 ? Math.round((stats.gercekKalanBorc / stats.toplamTutar) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Toplam borcun %{stats.toplamTutar > 0 ? Math.round((stats.gercekKalanBorc / stats.toplamTutar) * 100) : 0}'i
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* This Month Stats + Top Debtors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* This Month */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-gray-800">{currentMonthName} {now.getFullYear()} Özeti</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-xs text-orange-600 font-medium mb-1">Bu Ay İş</p>
              <p className="text-2xl font-bold text-orange-700">{stats.buAyIs}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-600 font-medium mb-1">Bu Ay Tutar</p>
              <p className="text-lg font-bold text-slate-700">{formatCurrency(stats.buAyTutar)}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-xs text-emerald-600 font-medium mb-1">Bu Ay Ödenen</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(stats.buAyOdenen)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-xs text-red-600 font-medium mb-1">Bu Ay Bekleyen</p>
              <p className="text-lg font-bold text-red-700">{formatCurrency(stats.buAyBekleyen)}</p>
            </div>
          </div>
        </div>

        {/* Top Debtors - kalanBorc kullanıyor, tüm modlar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-gray-800">En Borçlu Müşteriler</h3>
            </div>
            {onNavigate && (
              <button 
                onClick={() => onNavigate('firmalar')}
                className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
              >
                Tümünü Gör <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          {stats.topBorcluFirmalar.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Borçlu müşteri bulunmuyor 🎉</p>
          ) : (
            <div className="space-y-3">
              {stats.topBorcluFirmalar.map((f, idx) => {
                const maxBorc = stats.topBorcluFirmalar[0]?.kalanBorc || 1;
                const pct = Math.round((f.kalanBorc / maxBorc) * 100);
                return (
                  <div key={f.firma} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 truncate">{f.firma}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            f.paymentMode === 'toplu' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                          }`}>
                            {f.paymentMode === 'toplu' ? 'TOPLU' : 'BİREYSEL'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-red-600 whitespace-nowrap ml-2">{formatCurrency(f.kalanBorc)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div 
                          className="bg-red-400 rounded-full h-1.5 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-gray-800">Son Eklenen İşler</h3>
          </div>
          {onNavigate && (
            <button 
              onClick={() => onNavigate('jobs')}
              className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              Tümünü Gör <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
        {stats.sonIsler.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Henüz iş kaydı yok</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-4">Firma</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-4">Güzergah</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-4">Tarih</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-2 pr-4">Tutar</th>
                  <th className="text-center text-xs font-medium text-gray-400 pb-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {stats.sonIsler.map(job => (
                  <tr key={job.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4">
                      <span className="text-sm font-medium text-gray-700">{job.firma}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-sm text-gray-500">{job.nereden} → {job.nereye}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs text-gray-400">{job.tarih}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className="text-sm font-bold text-gray-700">{formatCurrency(job.tutar)}</span>
                      {job.kdvDahil && <span className="ml-1 text-[10px] text-orange-500 font-medium">KDV</span>}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        job.odendi 
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {job.odendi ? '✓ Ödendi' : '⏳ Bekliyor'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tahsilat Rate Big Card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-5 h-5 text-orange-400" />
              <h3 className="font-bold text-lg">Genel Tahsilat Durumu</h3>
            </div>
            <p className="text-slate-300 text-sm">
              Toplam {formatCurrency(stats.toplamTutar)} tutarın {formatCurrency(stats.toplamOdenen)} kadarı tahsil edildi.
            </p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
              <span>Toplu: {formatCurrency(stats.toplamBulkOdeme)}</span>
              <span>Bireysel: {formatCurrency(stats.bireyselOdenen)}</span>
              {stats.gercekKalanBorc > 0 && (
                <span className="text-red-400">Kalan: {formatCurrency(stats.gercekKalanBorc)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#F97316"
                  strokeWidth="3"
                  strokeDasharray={`${stats.tahsilatOrani}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-orange-400">%{stats.tahsilatOrani}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
