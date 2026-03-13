import { useState } from 'react';
import { useFirebase } from './hooks/useFirebase';
import Dashboard from './components/Dashboard';
import AddJob from './components/AddJob';
import JobList from './components/JobList';
import Firmalar from './components/Firmalar';
import ExportPanel from './components/ExportPanel';
import {
  LayoutDashboard,
  Plus,
  List,
  Building2,
  Download,
  Menu,
  Loader2,
  X,
} from 'lucide-react';

type Page = 'dashboard' | 'add' | 'jobs' | 'firmalar' | 'export';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const firebase = useFirebase();

  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Kontrol Paneli', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'add', label: 'İş Ekle', icon: <Plus className="w-5 h-5" /> },
    { id: 'jobs', label: 'İş Listesi', icon: <List className="w-5 h-5" /> },
    { id: 'firmalar', label: 'Müşteriler', icon: <Building2 className="w-5 h-5" /> },
    { id: 'export', label: 'Dışa Aktar', icon: <Download className="w-5 h-5" /> },
  ];

  const handleNavigate = (p: Page | string) => {
    setPage(p as Page);
    setSidebarOpen(false);
  };

  if (firebase.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const locations = firebase.locationList();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1E293B] transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-orange-600 flex items-center justify-center p-1">
              <img
                src="https://i.imgur.com/boSwZJa.png"
                alt="Logo"
                className="w-full h-full object-contain brightness-0 invert"
              />
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight">Yıldırım</h1>
              <p className="text-xs text-orange-400 font-medium">Nakliyat</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 mt-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition cursor-pointer ${
                page === item.id
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-700">
          <div className="bg-slate-700/50 rounded-xl p-3">
            <p className="text-xs text-orange-400 font-medium">Ödeme Takip Sistemi</p>
            <p className="text-xs text-slate-400 mt-0.5">v3.1</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-gray-600" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600" />
            )}
          </button>
          
          <div className="hidden lg:block">
            <h2 className="text-sm font-medium text-gray-800">
              {navItems.find(n => n.id === page)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">Yıldırım Nakliyat</p>
              <p className="text-xs text-gray-400">Ödeme Takip Sistemi</p>
            </div>
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-orange-600 flex items-center justify-center p-1 shadow-md shadow-orange-200">
              <img
                src="https://i.imgur.com/boSwZJa.png"
                alt="Logo"
                className="w-full h-full object-contain brightness-0 invert"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {(() => {
            const summaries = firebase.getAllFirmaSummaries();
            const topluFirmaNames = new Set(
              summaries
                .filter(s => s.paymentMode === 'toplu')
                .map(s => s.firma.toLowerCase())
            );
            const bireyselFirmaNames = new Set(
              summaries
                .filter(s => s.paymentMode === 'bireysel')
                .map(s => s.firma.toLowerCase())
            );
            return (
              <>
                {page === 'dashboard' && (
                  <Dashboard 
                    stats={firebase.getDashboardStats()} 
                    allJobs={firebase.jobs}
                    bireyselFirmaNames={bireyselFirmaNames}
                    onNavigate={handleNavigate}
                  />
                )}
                {page === 'add' && (
                  <AddJob
                    onAdd={firebase.addJob}
                    firmaList={firebase.firmaList()}
                    neredenList={[...new Set([...locations.nereden, ...locations.nereye])]}
                    nereyeList={[...new Set([...locations.nereye, ...locations.nereden])]}
                  />
                )}
                {page === 'jobs' && (
                  <JobList
                    jobs={firebase.jobs}
                    onTogglePaid={firebase.togglePaid}
                    onDelete={firebase.deleteJob}
                    onUpdate={firebase.updateJob}
                    firmaList={firebase.firmaList()}
                    neredenList={[...new Set([...locations.nereden, ...locations.nereye])]}
                    nereyeList={[...new Set([...locations.nereye, ...locations.nereden])]}
                    topluFirmaNames={topluFirmaNames}
                  />
                )}
                {page === 'firmalar' && (
                  <Firmalar
                    summaries={firebase.getAllFirmaSummaries()}
                    jobs={firebase.jobs}
                    bulkPayments={firebase.bulkPayments}
                    onTogglePaid={firebase.togglePaid}
                    onApplyBulkPayment={firebase.applyBulkPayment}
                    onReverseBulkPayment={firebase.reverseBulkPayment}
                    onUpdateBulkPayment={firebase.updateBulkPayment}
                    onSetPaymentMode={firebase.setPaymentMode}
                  />
                )}
                {page === 'export' && (
                  <ExportPanel
                    jobs={firebase.jobs}
                    bulkPayments={firebase.bulkPayments}
                    firmaList={firebase.firmaList()}
                  />
                )}
              </>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
