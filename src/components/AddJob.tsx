import { useState, FormEvent } from 'react';
import { Plus, Save, FileText } from 'lucide-react';
import AutocompleteInput from './AutocompleteInput';
import { Job } from '../types';

interface AddJobProps {
  onAdd: (job: Omit<Job, 'id' | 'createdAt'>) => Promise<void>;
  firmaList: string[];
  neredenList: string[];
  nereyeList: string[];
}

export default function AddJob({ onAdd, firmaList, neredenList, nereyeList }: AddJobProps) {
  const today = new Date().toISOString().split('T')[0];
  const [firma, setFirma] = useState('');
  const [nereden, setNereden] = useState('');
  const [nereye, setNereye] = useState('');
  const [tutar, setTutar] = useState('');
  const [tarih, setTarih] = useState(today);
  const [kdvDahil, setKdvDahil] = useState(false);
  const [aciklama, setAciklama] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firma.trim() || !nereden.trim() || !nereye.trim() || !tutar) return;
    
    setSaving(true);
    try {
      await onAdd({
        firma: firma.trim(),
        nereden: nereden.trim(),
        nereye: nereye.trim(),
        tutar: parseFloat(tutar),
        tarih,
        odendi: false,
        kdvDahil,
        aciklama: aciklama.trim() || undefined,
      });
      
      setFirma('');
      setNereden('');
      setNereye('');
      setTutar('');
      setTarih(new Date().toISOString().split('T')[0]);
      setKdvDahil(false);
      setAciklama('');
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('İş eklenirken hata:', err);
      alert('İş eklenirken bir hata oluştu!');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-orange-100 p-2 rounded-lg">
          <Plus className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Yeni İş Ekle</h2>
          <p className="text-sm text-gray-500">Yeni nakliye işi kaydı oluşturun</p>
        </div>
      </div>

      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-[fadeIn_0.3s]">
          <CheckIcon />
          İş başarıyla kaydedildi! ✅
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Firma Adı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Firma Adı <span className="text-red-500">*</span>
            </label>
            <AutocompleteInput
              value={firma}
              onChange={setFirma}
              suggestions={firmaList}
              placeholder="Firma adı girin..."
              required
            />
          </div>

          {/* Tutar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tutar (₺) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={tutar}
              onChange={(e) => setTutar(e.target.value)}
              placeholder="Ödeme tutarını girin..."
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
            />
          </div>

          {/* KDV */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              KDV Durumu
            </label>
            <div 
              className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 cursor-pointer select-none"
              onClick={() => setKdvDahil(!kdvDahil)}
            >
              <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${kdvDahil ? 'bg-orange-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${kdvDahil ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {kdvDahil ? 'KDV Dahil' : 'KDV Hariç'}
              </span>
              {kdvDahil && (
                <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  KDV ✓
                </span>
              )}
            </div>
          </div>

          {/* Tarih */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tarih
            </label>
            <input
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
            />
          </div>

          {/* Nereden */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nereden <span className="text-red-500">*</span>
            </label>
            <AutocompleteInput
              value={nereden}
              onChange={setNereden}
              suggestions={neredenList}
              placeholder="Kalkış noktası..."
              required
            />
          </div>

          {/* Nereye */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nereye <span className="text-red-500">*</span>
            </label>
            <AutocompleteInput
              value={nereye}
              onChange={setNereye}
              suggestions={nereyeList}
              placeholder="Varış noktası..."
              required
            />
          </div>

          {/* Açıklama - tam genişlik */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Açıklama <span className="text-gray-400 text-xs font-normal">(opsiyonel)</span>
              </span>
            </label>
            <input
              type="text"
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder="Not veya açıklama ekleyin..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || !firma.trim() || !nereden.trim() || !nereye.trim() || !tutar}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-orange-200 hover:shadow-orange-300"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Kaydediliyor...' : 'İşi Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}
