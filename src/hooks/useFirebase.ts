import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { db } from '../firebase';
import { Job, BulkPayment, FirmaSummary, CustomerSettings } from '../types';

export function useFirebase() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [bulkPayments, setBulkPayments] = useState<BulkPayment[]>([]);
  const [customerSettings, setCustomerSettings] = useState<Record<string, CustomerSettings>>({});
  const [loading, setLoading] = useState(true);

  // Real-time listener for jobs - YENİDEN ESKİYE SIRALI
  useEffect(() => {
    const jobsRef = ref(db, 'jobs');
    const unsubscribe = onValue(jobsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const jobList: Job[] = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          firma: value.firma || '',
          nereden: value.nereden || '',
          nereye: value.nereye || '',
          tutar: value.tutar || 0,
          tarih: value.tarih || '',
          odendi: value.odendi || false,
          kdvDahil: value.kdvDahil ?? false,
          aciklama: value.aciklama || '',
          paidBy: value.paidBy || undefined,
          bulkPaymentId: value.bulkPaymentId || undefined,
          odemeTarihi: value.odemeTarihi || undefined,
          createdAt: value.createdAt || 0,
        }));
        // YENİDEN ESKİYE SIRALA - TARİH ALANINA GÖRE (en yeni tarih en üstte)
        jobList.sort((a, b) => {
          const dateA = new Date(a.tarih).getTime();
          const dateB = new Date(b.tarih).getTime();
          if (dateB !== dateA) return dateB - dateA;
          // Aynı tarihse createdAt'a göre sırala
          return b.createdAt - a.createdAt;
        });
        setJobs(jobList);
      } else {
        setJobs([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener for bulk payments - YENİDEN ESKİYE
  useEffect(() => {
    const paymentsRef = ref(db, 'bulkPayments');
    const unsubscribe = onValue(paymentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const paymentList: BulkPayment[] = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          firma: value.firma || '',
          tutar: value.tutar || 0,
          tarih: value.tarih || '',
          aciklama: value.aciklama || '',
          createdAt: value.createdAt || 0,
        }));
        paymentList.sort((a, b) => b.createdAt - a.createdAt);
        setBulkPayments(paymentList);
      } else {
        setBulkPayments([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener for customer settings
  useEffect(() => {
    const settingsRef = ref(db, 'customerSettings');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCustomerSettings(data);
      } else {
        setCustomerSettings({});
      }
    });
    return () => unsubscribe();
  }, []);

  // Müşteri ödeme modunu al (varsayılan: bireysel)
  const getPaymentMode = useCallback((firma: string): 'bireysel' | 'toplu' => {
    return customerSettings[firma]?.paymentMode || 'bireysel';
  }, [customerSettings]);

  // Müşteri ödeme modunu değiştir
  const setPaymentMode = useCallback(async (firma: string, mode: 'bireysel' | 'toplu') => {
    const settingRef = ref(db, `customerSettings/${firma}`);
    await update(settingRef, { paymentMode: mode });
  }, []);

  // İŞ EKLEME
  const addJob = useCallback(async (job: Omit<Job, 'id' | 'createdAt'>) => {
    const jobsRef = ref(db, 'jobs');
    await push(jobsRef, {
      firma: job.firma,
      nereden: job.nereden,
      nereye: job.nereye,
      tutar: job.tutar,
      tarih: job.tarih,
      odendi: false,
      kdvDahil: job.kdvDahil,
      aciklama: job.aciklama || '',
      paidBy: null,
      bulkPaymentId: null,
      odemeTarihi: null,
      createdAt: Date.now(),
    });
  }, []);

  // İŞ GÜNCELLEME & SİLME
  const updateJob = useCallback(async (id: string, updates: Partial<Job>) => {
    const jobRef = ref(db, `jobs/${id}`);
    await update(jobRef, updates);
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    const jobRef = ref(db, `jobs/${id}`);
    await remove(jobRef);
  }, []);

  // BİREYSEL ÖDEME TOGGLE (sadece bireysel modda kullanılır)
  const togglePaid = useCallback(async (id: string, currentStatus: boolean) => {
    const jobRef = ref(db, `jobs/${id}`);
    if (!currentStatus) {
      await update(jobRef, {
        odendi: true,
        paidBy: 'manual',
        bulkPaymentId: null,
        odemeTarihi: new Date().toISOString().split('T')[0],
      });
    } else {
      await update(jobRef, {
        odendi: false,
        paidBy: null,
        bulkPaymentId: null,
        odemeTarihi: null,
      });
    }
  }, []);

  // ============================================================
  // TOPLU ÖDEME - Sadece kayıt ekle (işleri işaretleme!)
  // Toplu modda borç = toplam iş tutarı - toplam ödeme tutarı
  // ============================================================
  const applyBulkPayment = useCallback(async (firma: string, amount: number, aciklama?: string): Promise<number> => {
    const paymentsRef = ref(db, 'bulkPayments');
    const today = new Date().toISOString().split('T')[0];
    await push(paymentsRef, {
      firma,
      tutar: amount,
      tarih: today,
      aciklama: aciklama || '',
      createdAt: Date.now(),
    });
    return 0;
  }, []);

  // TOPLU ÖDEME DÜZENLE
  const updateBulkPayment = useCallback(async (
    paymentId: string,
    updates: { tutar?: number; tarih?: string; aciklama?: string }
  ) => {
    const paymentRef = ref(db, `bulkPayments/${paymentId}`);
    const dbUpdates: Record<string, any> = {};
    if (updates.tutar !== undefined) dbUpdates.tutar = updates.tutar;
    if (updates.tarih !== undefined) dbUpdates.tarih = updates.tarih;
    if (updates.aciklama !== undefined) dbUpdates.aciklama = updates.aciklama;
    await update(paymentRef, dbUpdates);
  }, []);

  // TOPLU ÖDEME SİL
  const reverseBulkPayment = useCallback(async (paymentId: string) => {
    const paymentRef = ref(db, `bulkPayments/${paymentId}`);
    await remove(paymentRef);
  }, []);

  // YARDIMCI FONKSİYONLAR
  const firmaList = useCallback((): string[] => {
    const firmas = new Set<string>();
    jobs.forEach(j => { if (j.firma) firmas.add(j.firma); });
    return Array.from(firmas).sort();
  }, [jobs]);

  const locationList = useCallback((): { nereden: string[]; nereye: string[] } => {
    const neredenSet = new Set<string>();
    const nereyeSet = new Set<string>();
    jobs.forEach(j => {
      if (j.nereden) neredenSet.add(j.nereden);
      if (j.nereye) nereyeSet.add(j.nereye);
    });
    return {
      nereden: Array.from(neredenSet).sort(),
      nereye: Array.from(nereyeSet).sort(),
    };
  }, [jobs]);

  // ============================================================
  // FİRMA ÖZETİ - MODA GÖRE HESAPLAMA
  // ============================================================
  const getFirmaSummary = useCallback((firma: string): FirmaSummary => {
    const firmaLower = firma.toLowerCase();
    const firmaJobs = jobs.filter(j => j.firma.toLowerCase() === firmaLower);
    const firmaBulkPays = bulkPayments.filter(p => p.firma.toLowerCase() === firmaLower);
    const mode = getPaymentMode(firma);

    const toplamTutar = firmaJobs.reduce((sum, j) => sum + j.tutar, 0);
    const odenmisIsler = firmaJobs.filter(j => j.odendi);
    const bekleyenIsler = firmaJobs.filter(j => !j.odendi);

    // Bireysel ödenen (manual olarak işaretlenmiş)
    const bireyselOdenen = firmaJobs
      .filter(j => j.odendi && j.paidBy === 'manual')
      .reduce((sum, j) => sum + j.tutar, 0);

    // Toplam toplu ödeme
    const toplamBulkOdeme = firmaBulkPays.reduce((sum, p) => sum + p.tutar, 0);

    let kalanBorc: number;
    if (mode === 'toplu') {
      // TOPLU MOD: borç = toplam iş tutarı - toplam ödemeler
      kalanBorc = toplamTutar - toplamBulkOdeme;
    } else {
      // BİREYSEL MOD: borç = ödenmemiş işlerin toplamı
      kalanBorc = bekleyenIsler.reduce((sum, j) => sum + j.tutar, 0);
    }

    return {
      firma,
      paymentMode: mode,
      toplamIs: firmaJobs.length,
      bekleyenIs: bekleyenIsler.length,
      odenmisIs: odenmisIsler.length,
      toplamTutar,
      odenmis: odenmisIsler.reduce((sum, j) => sum + j.tutar, 0),
      bekleyen: bekleyenIsler.reduce((sum, j) => sum + j.tutar, 0),
      bireyselOdenen,
      toplamBulkOdeme,
      kalanBorc,
    };
  }, [jobs, bulkPayments, getPaymentMode]);

  const getAllFirmaSummaries = useCallback((): FirmaSummary[] => {
    return firmaList().map(firma => getFirmaSummary(firma));
  }, [firmaList, getFirmaSummary]);

  // DASHBOARD İSTATİSTİKLER
  const getDashboardStats = useCallback(() => {
    // Tüm firma özetleri
    const summaries = firmaList().map(f => getFirmaSummary(f));
    const bireyselSummaries = summaries.filter(s => s.paymentMode === 'bireysel');
    const topluSummaries = summaries.filter(s => s.paymentMode === 'toplu');

    // Bireysel modda olan firmaların isimleri
    const bireyselFirmaSet = new Set(bireyselSummaries.map(s => s.firma.toLowerCase()));

    // SADECE BİREYSEL MODDAKİ MÜŞTERİLERİN İŞLERİ (4 kare kart için)
    const bireyselJobs = jobs.filter(j => bireyselFirmaSet.has(j.firma.toLowerCase()));
    const kartToplamIs = bireyselJobs.length;
    const kartBekleyenIs = bireyselJobs.filter(j => !j.odendi).length;
    const kartOdenmisIs = bireyselJobs.filter(j => j.odendi).length;
    const kartFirmaCount = bireyselSummaries.length;

    // TÜM İŞLER (finansal özet ve diğer bölümler için)
    const toplamIs = jobs.length;
    const bekleyenIs = jobs.filter(j => !j.odendi).length;
    const odenmisIs = jobs.filter(j => j.odendi).length;
    const toplamTutar = jobs.reduce((sum, j) => sum + j.tutar, 0);
    const firmaCount = firmaList().length;

    // Gerçek borç hesabı (her iki mod dahil)
    const gercekKalanBorc = summaries.reduce((sum, s) => sum + Math.max(0, s.kalanBorc), 0);
    const toplamOdenen = toplamTutar - gercekKalanBorc;

    const toplamBulkOdeme = bulkPayments.reduce((sum, p) => sum + p.tutar, 0);
    const bireyselOdenen = jobs
      .filter(j => j.odendi && j.paidBy === 'manual')
      .reduce((sum, j) => sum + j.tutar, 0);

    const tahsilatOrani = toplamTutar > 0 ? Math.min(100, Math.round((toplamOdenen / toplamTutar) * 100)) : 0;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const thisMonthJobs = jobs.filter(j => {
      const d = new Date(j.tarih);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const buAyIs = thisMonthJobs.length;
    const buAyTutar = thisMonthJobs.reduce((s, j) => s + j.tutar, 0);
    const buAyOdenen = thisMonthJobs.filter(j => j.odendi).reduce((s, j) => s + j.tutar, 0);
    const buAyBekleyen = thisMonthJobs.filter(j => !j.odendi).reduce((s, j) => s + j.tutar, 0);

    // Son 5 iş (zaten yeniden eskiye sıralı)
    const sonIsler = jobs.slice(0, 5);

    const topBorcluFirmalar = [...summaries]
      .filter(f => f.kalanBorc > 0)
      .sort((a, b) => b.kalanBorc - a.kalanBorc)
      .slice(0, 5);

    const kdvliIsler = jobs.filter(j => j.kdvDahil).length;
    const kdvsizIsler = jobs.filter(j => !j.kdvDahil).length;

    const odenmis = jobs.filter(j => j.odendi).reduce((sum, j) => sum + j.tutar, 0);
    const bekleyen = jobs.filter(j => !j.odendi).reduce((sum, j) => sum + j.tutar, 0);

    // Toplu firma sayısı
    const topluFirmaCount = topluSummaries.length;

    return {
      // 4 kare kart (SADECE BİREYSEL)
      kartToplamIs,
      kartBekleyenIs,
      kartOdenmisIs,
      kartFirmaCount,
      // Genel (tüm modlar)
      toplamIs,
      bekleyenIs,
      odenmisIs,
      toplamTutar,
      odenmis,
      bekleyen,
      firmaCount,
      topluFirmaCount,
      buAyIs,
      buAyTutar,
      buAyOdenen,
      buAyBekleyen,
      sonIsler,
      topBorcluFirmalar,
      kdvliIsler,
      kdvsizIsler,
      tahsilatOrani,
      toplamBulkOdeme,
      bireyselOdenen,
      gercekKalanBorc,
      toplamOdenen,
    };
  }, [jobs, bulkPayments, firmaList, getFirmaSummary]);

  return {
    jobs,
    bulkPayments,
    customerSettings,
    loading,
    addJob,
    updateJob,
    deleteJob,
    togglePaid,
    applyBulkPayment,
    updateBulkPayment,
    reverseBulkPayment,
    getPaymentMode,
    setPaymentMode,
    firmaList,
    locationList,
    getFirmaSummary,
    getAllFirmaSummaries,
    getDashboardStats,
  };
}
