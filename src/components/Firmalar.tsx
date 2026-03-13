import { useState } from 'react';
import { Building2, ChevronRight, DollarSign, CheckCircle, Clock, ArrowLeft, CreditCard, FileText, Trash2, AlertTriangle, Pencil, X, Save, Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import { Job, FirmaSummary, BulkPayment } from '../types';

interface FirmalarProps {
  summaries: FirmaSummary[];
  jobs: Job[];
  bulkPayments: BulkPayment[];
  onTogglePaid: (id: string, currentStatus: boolean) => Promise<void>;
  onApplyBulkPayment: (firma: string, amount: number, aciklama?: string) => Promise<number>;
  onReverseBulkPayment: (paymentId: string) => Promise<void>;
  onUpdateBulkPayment: (paymentId: string, updates: { tutar?: number; tarih?: string; aciklama?: string }) => Promise<void>;
  onSetPaymentMode: (firma: string, mode: 'bireysel' | 'toplu') => Promise<void>;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('tr-TR') + ' ₺';
}

export default function Firmalar({ summaries, jobs, bulkPayments, onTogglePaid, onApplyBulkPayment, onReverseBulkPayment, onUpdateBulkPayment, onSetPaymentMode }: FirmalarProps) {
  const [selectedFirma, setSelectedFirma] = useState<string | null>(null);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkAciklama, setBulkAciklama] = useState('');
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [searchFirma, setSearchFirma] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [reverseProcessing, setReverseProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'bireysel' | 'toplu'>('bireysel');
  const [showModeConfirm, setShowModeConfirm] = useState(false);
  const [showOnlyBorclu, setShowOnlyBorclu] = useState(false);

  // Toplu ödeme düzenleme state
  const [editingPayment, setEditingPayment] = useState<BulkPayment | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({ tutar: 0, tarih: '', aciklama: '' });
  const [editPaymentSaving, setEditPaymentSaving] = useState(false);
  const [editPaymentSuccess, setEditPaymentSuccess] = useState(false);

  const selectedSummary = selectedFirma ? summaries.find(s => s.firma === selectedFirma) : null;
  // YENİDEN ESKİYE sıralı - TARİH'e göre (en yeni tarih en üstte)
  const selectedJobs = selectedFirma
    ? jobs.filter(j => j.firma === selectedFirma).sort((a, b) => {
        const dateA = new Date(a.tarih).getTime();
        const dateB = new Date(b.tarih).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return b.createdAt - a.createdAt;
      })
    : [];
  // Ödemeler de yeniden eskiye
  const selectedBulkPayments = selectedFirma
    ? bulkPayments.filter(p => p.firma.toLowerCase() === selectedFirma.toLowerCase()).sort((a, b) => b.createdAt - a.createdAt)
    : [];

  const bireyselFirmalar = summaries.filter(s => s.paymentMode === 'bireysel');
  const topluFirmalar = summaries.filter(s => s.paymentMode === 'toplu');

  const filteredBireysel = bireyselFirmalar.filter(s => {
    const matchesSearch = searchFirma === '' || s.firma.toLowerCase().includes(searchFirma.toLowerCase());
    const matchesBorclu = !showOnlyBorclu || s.kalanBorc > 0;
    return matchesSearch && matchesBorclu;
  });
  const filteredToplu = topluFirmalar.filter(s => {
    const matchesSearch = searchFirma === '' || s.firma.toLowerCase().includes(searchFirma.toLowerCase());
    const matchesBorclu = !showOnlyBorclu || s.kalanBorc > 0;
    return matchesSearch && matchesBorclu;
  });

  const bireyselBorcluCount = bireyselFirmalar.filter(s => s.kalanBorc > 0).length;
  const topluBorcluCount = topluFirmalar.filter(s => s.kalanBorc > 0).length;
  const currentBorcluCount = activeTab === 'bireysel' ? bireyselBorcluCount : topluBorcluCount;

  const handleBulkPayment = async () => {
    if (!selectedFirma || !bulkAmount || parseFloat(bulkAmount) <= 0) return;
    const amount = parseFloat(bulkAmount);
    setProcessing(true);
    try {
      await onApplyBulkPayment(selectedFirma, amount, bulkAciklama);
      setBulkResult(`✅ ${formatCurrency(amount)} ödeme kaydedildi!`);
      setBulkAmount('');
      setBulkAciklama('');
      setTimeout(() => setBulkResult(null), 5000);
    } catch (err) {
      console.error(err);
      setBulkResult('❌ Hata oluştu! Lütfen tekrar deneyin.');
    }
    setProcessing(false);
    setShowBulkForm(false);
  };

  const handleReverseBulkPayment = async (paymentId: string) => {
    setReverseProcessing(true);
    try {
      await onReverseBulkPayment(paymentId);
      setBulkResult('✅ Ödeme kaydı silindi.');
      setDeleteConfirm(null);
      setTimeout(() => setBulkResult(null), 5000);
    } catch (err) {
      console.error(err);
      setBulkResult('❌ Silme işlemi başarısız oldu!');
    }
    setReverseProcessing(false);
  };

  const handleModeSwitch = async () => {
    if (!selectedFirma || !selectedSummary) return;
    const newMode = selectedSummary.paymentMode === 'bireysel' ? 'toplu' : 'bireysel';
    await onSetPaymentMode(selectedFirma, newMode);
    setShowModeConfirm(false);
  };

  const openEditPayment = (payment: BulkPayment) => {
    setEditingPayment(payment);
    setEditPaymentForm({
      tutar: payment.tutar,
      tarih: payment.tarih,
      aciklama: payment.aciklama || '',
    });
    setEditPaymentSuccess(false);
  };

  const closeEditPayment = () => {
    setEditingPayment(null);
    setEditPaymentSuccess(false);
  };

  const saveEditPayment = async () => {
    if (!editingPayment) return;
    if (editPaymentForm.tutar <= 0 || !editPaymentForm.tarih) {
      alert('Tutar 0\'dan büyük olmalı ve tarih seçilmelidir.');
      return;
    }
    setEditPaymentSaving(true);
    try {
      await onUpdateBulkPayment(editingPayment.id, {
        tutar: editPaymentForm.tutar,
        tarih: editPaymentForm.tarih,
        aciklama: editPaymentForm.aciklama,
      });
      setEditPaymentSuccess(true);
      setBulkResult('✅ Ödeme kaydı güncellendi!');
      setTimeout(() => {
        closeEditPayment();
        setBulkResult(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Güncelleme sırasında bir hata oluştu.');
    }
    setEditPaymentSaving(false);
  };

  // =================== FİRMA DETAY SAYFASI ===================
  if (selectedFirma && selectedSummary) {
    const isToplu = selectedSummary.paymentMode === 'toplu';

    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedFirma(null); setShowBulkForm(false); setBulkResult(null); setDeleteConfirm(null); setShowModeConfirm(false); }}
          className="flex items-center gap-2 text-orange-600 hover:text-orange-800 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Müşterilere Dön
        </button>

        {/* Firma Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2.5 rounded-lg">
                <Building2 className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedFirma}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    isToplu
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {isToplu ? '📦 Toplu Ödeme Sistemi' : '👤 Bireysel Ödeme Sistemi'}
                  </span>
                </div>
              </div>
            </div>
            {/* Mod Değiştirme Butonu */}
            <button
              onClick={() => setShowModeConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              Mod Değiştir
            </button>
          </div>

          {/* Mod Değiştirme Onayı */}
          {showModeConfirm && (
            <div className="mb-5 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    Ödeme sistemini <strong>{isToplu ? 'Bireysel' : 'Toplu'}</strong> moduna geçirmek istediğinize emin misiniz?
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    {isToplu
                      ? 'Bireysel modda her işi tek tek "Ödendi" olarak işaretleyebilirsiniz. Toplu ödeme kayıtları silinmez ama borç hesabı değişir.'
                      : 'Toplu modda işler tek tek işaretlenmez. Toplam borçtan ödeme tutarları düşülür.'
                    }
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleModeSwitch}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      Evet, Değiştir
                    </button>
                    <button
                      onClick={() => setShowModeConfirm(false)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* İstatistik Kartları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
              <p className="text-xs text-orange-600 font-medium">Toplam İş</p>
              <p className="text-2xl font-bold text-orange-800">{selectedSummary.toplamIs}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <p className="text-xs text-slate-600 font-medium">Toplam Tutar</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(selectedSummary.toplamTutar)}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
              <p className="text-xs text-emerald-600 font-medium">Toplam Ödenen</p>
              <p className="text-lg font-bold text-emerald-800">
                {formatCurrency(
                  isToplu
                    ? selectedSummary.toplamBulkOdeme
                    : selectedSummary.bireyselOdenen
                )}
              </p>
            </div>
            <div className={`rounded-lg p-4 border ${
              selectedSummary.kalanBorc <= 0
                ? 'bg-emerald-50 border-emerald-100'
                : 'bg-red-50 border-red-100'
            }`}>
              <p className={`text-xs font-medium ${
                selectedSummary.kalanBorc <= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {selectedSummary.kalanBorc <= 0 ? 'Fazla Ödeme' : 'Kalan Borç'}
              </p>
              <p className={`text-lg font-bold ${
                selectedSummary.kalanBorc <= 0 ? 'text-emerald-800' : 'text-red-800'
              }`}>
                {formatCurrency(Math.abs(selectedSummary.kalanBorc))}
              </p>
            </div>
          </div>

          {/* Tahsilat Çubuğu */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500">Tahsilat Oranı</span>
              <span className="font-bold text-gray-700">
                {selectedSummary.toplamTutar > 0
                  ? Math.min(100, Math.round(((isToplu ? selectedSummary.toplamBulkOdeme : selectedSummary.bireyselOdenen) / selectedSummary.toplamTutar) * 100))
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-orange-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${selectedSummary.toplamTutar > 0 ? Math.min(100, Math.round(((isToplu ? selectedSummary.toplamBulkOdeme : selectedSummary.bireyselOdenen) / selectedSummary.toplamTutar) * 100)) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Mesaj */}
        {bulkResult && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
            bulkResult.startsWith('✅')
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-700'
              : 'bg-red-50 border border-red-300 text-red-700'
          }`}>
            {bulkResult}
          </div>
        )}

        {/* =================== TOPLU MOD =================== */}
        {isToplu && (
          <>
            {/* Ödeme Yap Formu */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              {!showBulkForm ? (
                <button
                  onClick={() => setShowBulkForm(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition cursor-pointer shadow-md shadow-blue-200"
                >
                  <CreditCard className="w-4 h-4" />
                  Ödeme Kaydet
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700">
                      <strong>Toplu Ödeme Sistemi:</strong> Girdiğiniz tutar toplam borçtan düşülür.
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Mevcut borç: <strong>{formatCurrency(Math.max(0, selectedSummary.kalanBorc))}</strong>
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Tutarı (₺)</label>
                      <input
                        type="number"
                        value={bulkAmount}
                        onChange={(e) => setBulkAmount(e.target.value)}
                        placeholder="Ödeme tutarını girin..."
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (İsteğe bağlı)</label>
                      <input
                        type="text"
                        value={bulkAciklama}
                        onChange={(e) => setBulkAciklama(e.target.value)}
                        placeholder="Ödeme açıklaması..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBulkPayment}
                      disabled={processing || !bulkAmount || parseFloat(bulkAmount) <= 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition disabled:opacity-50 cursor-pointer"
                    >
                      {processing ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
                    </button>
                    <button
                      onClick={() => { setShowBulkForm(false); setBulkAmount(''); setBulkAciklama(''); }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition cursor-pointer"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ödeme Geçmişi */}
            {selectedBulkPayments.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                  Ödeme Geçmişi
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                    {selectedBulkPayments.length} ödeme • Toplam: {formatCurrency(selectedSummary.toplamBulkOdeme)}
                  </span>
                </h3>
                <div className="space-y-2">
                  {selectedBulkPayments.map(p => {
                    const isConfirmingDelete = deleteConfirm === p.id;
                    return (
                      <div key={p.id} className="bg-blue-50 rounded-lg border border-blue-100 overflow-hidden">
                        <div className="p-3 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-blue-800">{formatCurrency(p.tutar)}</p>
                              <span className="text-xs text-blue-500">📅 {p.tarih}</span>
                            </div>
                            {p.aciklama && (
                              <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> {p.aciklama}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            <button
                              onClick={() => openEditPayment(p)}
                              className="p-2 hover:bg-blue-100 rounded-lg transition cursor-pointer text-blue-400 hover:text-blue-600"
                              title="Düzenle"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(isConfirmingDelete ? null : p.id)}
                              className="p-2 hover:bg-red-100 rounded-lg transition cursor-pointer text-red-400 hover:text-red-600"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {isConfirmingDelete && (
                          <div className="bg-red-50 border-t border-red-200 p-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-red-700">
                                  Bu ödeme kaydını silmek istediğinize emin misiniz?
                                </p>
                                <p className="text-xs text-red-600 mt-1">
                                  <strong>{formatCurrency(p.tutar)}</strong> tutarındaki ödeme silinecek ve borç artacak.
                                </p>
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => handleReverseBulkPayment(p.id)}
                                    disabled={reverseProcessing}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-50"
                                  >
                                    {reverseProcessing ? 'Siliniyor...' : 'Evet, Sil'}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                                  >
                                    Vazgeç
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* =================== İŞ LİSTESİ =================== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            İşler ({selectedJobs.length})
            <span className="text-xs text-gray-400 ml-2 font-normal">yeniden eskiye</span>
          </h3>
          {selectedJobs.length === 0 ? (
            <p className="text-center text-gray-400 py-6">Bu müşteriye ait iş kaydı yok</p>
          ) : (
            <div className="space-y-2">
              {selectedJobs.map(job => (
                <div
                  key={job.id}
                  className={`rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    isToplu
                      ? 'bg-gray-50 border border-gray-200'
                      : job.odendi
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm">
                        <span className="font-medium">{job.nereden}</span>
                        <span className="mx-2 text-orange-400">→</span>
                        <span className="font-medium">{job.nereye}</span>
                      </p>
                      {job.kdvDahil && (
                        <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">KDV</span>
                      )}
                      {/* Bireysel modda ödeme durumu etiketi */}
                      {!isToplu && job.odendi && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">✓ Ödendi</span>
                      )}
                    </div>
                    {job.aciklama && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {job.aciklama}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">📅 {job.tarih}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800">{formatCurrency(job.tutar)}</span>
                    {/* Sadece BİREYSEL modda Ödendi/Geri Al butonu göster */}
                    {!isToplu && (
                      <button
                        onClick={() => onTogglePaid(job.id, job.odendi)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                          job.odendi
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        {job.odendi ? (
                          <>
                            <Clock className="w-3 h-3" />
                            Geri Al
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Ödendi
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =================== TOPLU ÖDEME DÜZENLEME MODALI =================== */}
        {editingPayment && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={closeEditPayment}>
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Pencil className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Ödeme Düzenle</h3>
                    <p className="text-xs text-gray-500">Ödeme bilgilerini güncelleyin</p>
                  </div>
                </div>
                <button
                  onClick={closeEditPayment}
                  className="p-2 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {editPaymentSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-sm flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    Ödeme başarıyla güncellendi!
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Tutarı (₺) *</label>
                  <input
                    type="number"
                    value={editPaymentForm.tutar || ''}
                    onChange={(e) => setEditPaymentForm(prev => ({ ...prev, tutar: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
                  <input
                    type="date"
                    value={editPaymentForm.tarih}
                    onChange={(e) => setEditPaymentForm(prev => ({ ...prev, tarih: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                  <input
                    type="text"
                    value={editPaymentForm.aciklama}
                    onChange={(e) => setEditPaymentForm(prev => ({ ...prev, aciklama: e.target.value }))}
                    placeholder="Opsiyonel açıklama..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                <div className="bg-slate-50 rounded-lg p-3 text-xs text-gray-500 space-y-1 border border-slate-100">
                  <p><strong>Mevcut Tutar:</strong> {formatCurrency(editingPayment.tutar)}</p>
                  <p><strong>Mevcut Tarih:</strong> {editingPayment.tarih}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button
                  onClick={closeEditPayment}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  onClick={saveEditPayment}
                  disabled={editPaymentSaving || editPaymentSuccess}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {editPaymentSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : editPaymentSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Kaydedildi!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Kaydet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =================== FİRMA LİSTESİ ===================
  const renderFirmaCard = (s: FirmaSummary) => (
    <div
      key={s.firma}
      onClick={() => setSelectedFirma(s.firma)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-orange-200 transition group"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="font-bold text-gray-800 text-lg group-hover:text-orange-700 transition">{s.firma}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              s.paymentMode === 'toplu'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {s.paymentMode === 'toplu' ? 'TOPLU' : 'BİREYSEL'}
            </span>
            {s.kalanBorc > 0 && (
              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {formatCurrency(s.kalanBorc)} borç
              </span>
            )}
            {s.kalanBorc <= 0 && s.toplamIs > 0 && (
              <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
                ✓ Borç yok
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-gray-500">
              Toplam: <span className="font-medium text-gray-700">{s.toplamIs} iş</span>
            </span>
            <span className="text-gray-500">
              Tutar: <span className="font-medium text-gray-700">{formatCurrency(s.toplamTutar)}</span>
            </span>
            {s.kalanBorc > 0 && (
              <span className="text-red-600">
                Kalan: <span className="font-medium">{formatCurrency(s.kalanBorc)}</span>
              </span>
            )}
            {s.kalanBorc < 0 && (
              <span className="text-emerald-600">
                Fazla: <span className="font-medium">{formatCurrency(Math.abs(s.kalanBorc))}</span>
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="bg-orange-100 p-2 rounded-lg">
          <Building2 className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Müşteriler</h2>
          <p className="text-sm text-gray-500">{summaries.length} müşteri kayıtlı</p>
        </div>
      </div>

      {/* Tab Seçimi */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 flex gap-1">
        <button
          onClick={() => setActiveTab('bireysel')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
            activeTab === 'bireysel'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <ToggleLeft className="w-4 h-4" />
          Bireysel Ödeme
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            activeTab === 'bireysel' ? 'bg-white/20' : 'bg-gray-200'
          }`}>
            {bireyselFirmalar.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('toplu')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
            activeTab === 'toplu'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <ToggleRight className="w-4 h-4" />
          Toplu Ödeme
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            activeTab === 'toplu' ? 'bg-white/20' : 'bg-gray-200'
          }`}>
            {topluFirmalar.length}
          </span>
        </button>
      </div>

      {/* Arama ve Filtre */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchFirma}
            onChange={(e) => setSearchFirma(e.target.value)}
            placeholder="Müşteri ara..."
            className="w-full px-4 py-2.5 pl-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
          />
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <button
          onClick={() => setShowOnlyBorclu(!showOnlyBorclu)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer whitespace-nowrap border ${
            showOnlyBorclu
              ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-200'
              : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          {showOnlyBorclu ? `Borçlular (${currentBorcluCount})` : 'Borçluları Gör'}
        </button>
      </div>

      {/* Açıklama */}
      <div className={`rounded-lg p-3 text-sm border ${
        activeTab === 'bireysel'
          ? 'bg-purple-50 border-purple-200 text-purple-700'
          : 'bg-blue-50 border-blue-200 text-blue-700'
      }`}>
        {activeTab === 'bireysel' ? (
          <p>👤 <strong>Bireysel Ödeme:</strong> Her iş tek tek "Ödendi" olarak işaretlenir. Borç = ödenmemiş işlerin toplamı.</p>
        ) : (
          <p>📦 <strong>Toplu Ödeme:</strong> Toplam borçtan yapılan ödemeler düşülür. İşler tek tek işaretlenmez. Borç = toplam tutar - toplam ödeme.</p>
        )}
      </div>

      {/* Firma Listesi */}
      {activeTab === 'bireysel' ? (
        filteredBireysel.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Bireysel ödeme modunda müşteri bulunmuyor.</p>
            <p className="text-xs text-gray-400 mt-1">Yeni iş eklediğinizde müşteriler otomatik olarak bireysel modda oluşturulur.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBireysel.map(s => renderFirmaCard(s))}
          </div>
        )
      ) : (
        filteredToplu.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Toplu ödeme modunda müşteri bulunmuyor.</p>
            <p className="text-xs text-gray-400 mt-1">Müşteri detayından "Mod Değiştir" butonu ile toplu moda geçebilirsiniz.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredToplu.map(s => renderFirmaCard(s))}
          </div>
        )
      )}
    </div>
  );
}
