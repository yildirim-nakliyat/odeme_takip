export interface Job {
  id: string;
  firma: string;
  nereden: string;
  nereye: string;
  tutar: number;
  tarih: string;
  odendi: boolean;
  kdvDahil: boolean;
  aciklama?: string;
  paidBy?: 'manual' | 'bulk';
  bulkPaymentId?: string;
  odemeTarihi?: string;
  createdAt: number;
}

export interface BulkPayment {
  id: string;
  firma: string;
  tutar: number;
  tarih: string;
  aciklama?: string;
  createdAt: number;
}

// Müşteri ödeme modu ayarı
export interface CustomerSettings {
  paymentMode: 'bireysel' | 'toplu';
}

export interface FirmaSummary {
  firma: string;
  paymentMode: 'bireysel' | 'toplu';
  toplamIs: number;
  bekleyenIs: number;
  odenmisIs: number;
  toplamTutar: number;
  odenmis: number;
  bekleyen: number;
  // Bireysel mod için
  bireyselOdenen: number;
  // Toplu mod için
  toplamBulkOdeme: number;
  kalanBorc: number;
}
