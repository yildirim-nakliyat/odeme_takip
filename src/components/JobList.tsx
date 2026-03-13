import { useState, useEffect, useRef } from 'react';
import { Trash2, CheckCircle, Clock, Search, Filter, Receipt, FileText, Pencil, X, Save } from 'lucide-react';
import { Job } from '../types';

interface JobListProps {
  jobs: Job[];
  onTogglePaid: (id: string, currentStatus: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Job>) => Promise<void>;
  firmaList: string[];
  neredenList: string[];
  nereyeList: string[];
  initialFilter?: 'all' | 'paid' | 'pending';
  topluFirmaNames: Set<string>; // Toplu ödeme modundaki firma adları (lowercase)
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('tr-TR') + ' ₺';
}

// Simple inline autocomplete for edit modal
function EditAutocomplete({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length > 0) {
      const f = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase());
      setFiltered(f.slice(0, 6));
    } else {
      setFiltered([]);
    }
  }, [value, suggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-36 overflow-y-auto">
          {filtered.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onChange(s); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 hover:text-orange-700 cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobList({ jobs, onTogglePaid, onDelete, onUpdate, firmaList, neredenList, nereyeList, initialFilter, topluFirmaNames }: JobListProps) {
  const [search, setSearch] = useState('');
  const [filterFirma, setFilterFirma] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>(initialFilter || 'all');
  const [filterKdv, setFilterKdv] = useState<'all' | 'kdv' | 'noKdv'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Edit state
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState({
    firma: '',
    nereden: '',
    nereye: '',
    tutar: 0,
    tarih: '',
    kdvDahil: false,
    aciklama: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  const openEdit = (job: Job) => {
    setEditingJob(job);
    setEditForm({
      firma: job.firma,
      nereden: job.nereden,
      nereye: job.nereye,
      tutar: job.tutar,
      tarih: job.tarih,
      kdvDahil: job.kdvDahil,
      aciklama: job.aciklama || '',
    });
    setEditSuccess(false);
  };

  const closeEdit = () => {
    setEditingJob(null);
    setEditSuccess(false);
  };

  const saveEdit = async () => {
    if (!editingJob) return;
    if (!editForm.firma.trim() || !editForm.nereden.trim() || !editForm.nereye.trim() || editForm.tutar <= 0 || !editForm.tarih) {
      alert('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    setEditSaving(true);
    try {
      await onUpdate(editingJob.id, {
        firma: editForm.firma.trim(),
        nereden: editForm.nereden.trim(),
        nereye: editForm.nereye.trim(),
        tutar: editForm.tutar,
        tarih: editForm.tarih,
        kdvDahil: editForm.kdvDahil,
        aciklama: editForm.aciklama.trim(),
      });
      setEditSuccess(true);
      setTimeout(() => {
        closeEdit();
      }, 800);
    } catch (err) {
      console.error(err);
      alert('Güncelleme sırasında bir hata oluştu.');
    } finally {
      setEditSaving(false);
    }
  };

  // Helper: Bu iş toplu ödeme modundaki bir firmaya mı ait?
  const isTopluFirma = (firma: string) => topluFirmaNames.has(firma.toLowerCase());

  // Filtrele ve TARİH'e göre yeniden eskiye sırala
  const filtered = jobs.filter(j => {
    const matchSearch = search === '' ||
      j.firma.toLowerCase().includes(search.toLowerCase()) ||
      j.nereden.toLowerCase().includes(search.toLowerCase()) ||
      j.nereye.toLowerCase().includes(search.toLowerCase()) ||
      j.aciklama?.toLowerCase().includes(search.toLowerCase());

    const matchFirma = filterFirma === '' || j.firma === filterFirma;

    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'paid' && j.odendi) ||
      (filterStatus === 'pending' && !j.odendi);

    const matchKdv = filterKdv === 'all' ||
      (filterKdv === 'kdv' && j.kdvDahil) ||
      (filterKdv === 'noKdv' && !j.kdvDahil);

    return matchSearch && matchFirma && matchStatus && matchKdv;
  }).sort((a, b) => {
    const dateA = new Date(a.tarih).getTime();
    const dateB = new Date(b.tarih).getTime();
    if (dateB !== dateA) return dateB - dateA;
    return b.createdAt - a.createdAt;
  });

  const filteredTotal = filtered.reduce((sum, j) => sum + j.tutar, 0);

  const handleDelete = async (id: string) => {
    if (confirmDelete === id) {
      await onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="bg-orange-100 p-2 rounded-lg">
          <Receipt className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">İş Listesi</h2>
          <p className="text-sm text-gray-500">Tüm nakliye işlerini görüntüleyin ve düzenleyin</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara (firma, güzergah, açıklama)..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
            />
          </div>
          <select
            value={filterFirma}
            onChange={(e) => setFilterFirma(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
          >
            <option value="">Tüm Firmalar</option>
            {firmaList.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="pending">Bekleyen</option>
            <option value="paid">Ödendi</option>
          </select>
          <select
            value={filterKdv}
            onChange={(e) => setFilterKdv(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
          >
            <option value="all">Tüm KDV</option>
            <option value="kdv">KDV Dahil</option>
            <option value="noKdv">KDV Hariç</option>
          </select>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
          {filtered.length} iş bulundu
        </span>
        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">
          Toplam: {formatCurrency(filteredTotal)}
        </span>
      </div>

      {/* Job Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
            <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Henüz iş kaydı bulunmuyor.</p>
          </div>
        ) : (
          filtered.map(job => {
            const jobIsToplu = isTopluFirma(job.firma);
            return (
              <div
                key={job.id}
                className={`bg-white rounded-xl shadow-sm border p-4 transition hover:shadow-md ${
                  jobIsToplu
                    ? 'border-blue-200 bg-blue-50/20'
                    : job.odendi
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : 'border-gray-100'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-gray-800">{job.firma}</span>
                      {jobIsToplu ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          📦 Toplu Ödeme
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          job.odendi
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {job.odendi ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {job.odendi ? 'Ödendi' : 'Bekliyor'}
                        </span>
                      )}
                      {!jobIsToplu && job.odendi && job.paidBy === 'manual' && (
                        <span className="bg-purple-100 text-purple-600 text-[10px] px-1.5 py-0.5 rounded font-medium">
                          Bireysel
                        </span>
                      )}
                      {job.kdvDahil && (
                        <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full font-medium">
                          KDV Dahil
                        </span>
                      )}
                      {!job.kdvDahil && (
                        <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium">
                          KDV Hariç
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{job.nereden}</span>
                      <span className="mx-2 text-orange-400">→</span>
                      <span className="font-medium">{job.nereye}</span>
                    </p>
                    {job.aciklama && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-gray-400" />
                        {job.aciklama}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span>📅 {job.tarih}</span>
                      {!jobIsToplu && job.odemeTarihi && <span>💰 Ödeme: {job.odemeTarihi}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-800 whitespace-nowrap">
                      {formatCurrency(job.tutar)}
                    </span>
                    {/* Düzenle butonu - her zaman göster */}
                    <button
                      onClick={() => openEdit(job)}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition cursor-pointer"
                      title="Düzenle"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {/* Ödendi/Geri Al butonu - SADECE BİREYSEL modda göster */}
                    {!jobIsToplu && (
                      <button
                        onClick={() => onTogglePaid(job.id, job.odendi)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                          job.odendi
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        {job.odendi ? 'Geri Al' : 'Ödendi'}
                      </button>
                    )}
                    {/* Sil butonu - her zaman göster */}
                    <button
                      onClick={() => handleDelete(job.id)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        confirmDelete === job.id
                          ? 'bg-red-500 text-white'
                          : 'bg-red-50 text-red-500 hover:bg-red-100'
                      }`}
                      title={confirmDelete === job.id ? 'Silmek için tekrar tıklayın' : 'Sil'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =================== DÜZENLEME MODALI =================== */}
      {editingJob && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={closeEdit}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Pencil className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">İş Düzenle</h3>
                  <p className="text-xs text-gray-500">Bilgileri güncelleyebilirsiniz</p>
                </div>
              </div>
              <button
                onClick={closeEdit}
                className="p-2 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Başarı mesajı */}
              {editSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-sm flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  İş başarıyla güncellendi!
                </div>
              )}

              {/* Firma */}
              <EditAutocomplete
                label="Firma Adı *"
                value={editForm.firma}
                onChange={(v) => setEditForm(prev => ({ ...prev, firma: v }))}
                suggestions={firmaList}
                placeholder="Firma adı"
              />

              {/* Nereden - Nereye */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EditAutocomplete
                  label="Nereden *"
                  value={editForm.nereden}
                  onChange={(v) => setEditForm(prev => ({ ...prev, nereden: v }))}
                  suggestions={neredenList}
                  placeholder="Kalkış noktası"
                />
                <EditAutocomplete
                  label="Nereye *"
                  value={editForm.nereye}
                  onChange={(v) => setEditForm(prev => ({ ...prev, nereye: v }))}
                  suggestions={nereyeList}
                  placeholder="Varış noktası"
                />
              </div>

              {/* Tutar ve Tarih */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (₺) *</label>
                  <input
                    type="number"
                    value={editForm.tutar || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tutar: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
                  <input
                    type="date"
                    value={editForm.tarih}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tarih: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* KDV Toggle */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">KDV Dahil</p>
                  <p className="text-xs text-gray-500">Fiyata KDV dahil mi?</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, kdvDahil: !prev.kdvDahil }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    editForm.kdvDahil ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editForm.kdvDahil ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Açıklama */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea
                  value={editForm.aciklama}
                  onChange={(e) => setEditForm(prev => ({ ...prev, aciklama: e.target.value }))}
                  placeholder="Opsiyonel not..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm resize-none"
                />
              </div>

              {/* Mevcut Durum Bilgisi */}
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-gray-500 space-y-1 border border-slate-100">
                {isTopluFirma(editingJob.firma) ? (
                  <p><strong>Ödeme Modu:</strong> 📦 Toplu Ödeme — Bu müşterinin ödemeleri toplu olarak takip edilir.</p>
                ) : (
                  <>
                    <p><strong>Durum:</strong> {editingJob.odendi ? '✅ Ödendi' : '⏳ Bekliyor'}
                      {editingJob.paidBy === 'manual' && ' (Bireysel)'}
                    </p>
                    {editingJob.odemeTarihi && <p><strong>Ödeme Tarihi:</strong> {editingJob.odemeTarihi}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">
                      * Ödeme durumunu değiştirmek için iş listesindeki "Ödendi/Geri Al" butonunu kullanın.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={closeEdit}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving || editSuccess}
                className="px-5 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {editSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Kaydediliyor...
                  </>
                ) : editSuccess ? (
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
