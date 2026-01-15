import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, LogIn, Car, Laptop, Package, Download, ArrowLeft,
  ChevronRight, Search, Info, CheckCircle2, AlertCircle,
  Plus, Edit, Trash2, User, Settings, LogOut, Camera,
  Save, X, ShieldCheck, LayoutGrid, ListFilter, Calendar,
  Gauge, ClipboardList, FileText, Wrench, Hash, Tag, Cpu, 
  UserCircle, Filter, Boxes, Lock, Mail, Phone, Upload, Clock,
  UserPlus, KeyRound, Eye, EyeOff, UserCheck, Star, RotateCcw, Users, Database, Globe
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, onSnapshot, doc, 
  setDoc, deleteDoc, addDoc, query 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';

// ==========================================
// 1. KONFIGURASI FIREBASE & INITIAL DATA
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyA_6C6bG3I3MmRdPtkmOk0JeOgIkFbHXyk",
  authDomain: "sikopifasta-database.firebaseapp.com",
  projectId: "sikopifasta-database",
  storageBucket: "sikopifasta-database.firebasestorage.app",
  messagingSenderId: "637428904100",
  appId: "1:637428904100:web:f7a00bd6426f3862567631",
  measurementId: "G-BYYMCR49V8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// FIX: appId dibersihkan agar path Firestore (odd segments) tetap valid
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'sikopifasta-v4';
const appId = rawAppId.replace(/[^a-zA-Z0-9]/g, '_');

const INITIAL_DATA = [
  {
    id: 'v-available-1',
    nama: 'TOYOTA AVANZA VELOZ',
    kategori: 'Kendaraan Dinas',
    status: 'Tersedia',
    noPlat: 'KB 1234 XX',
    noRangka: 'MHF111222333444',
    noMesin: '2NR-VE123456',
    kilometer: '15420',
    tglOliMesin: '2025-12-01',
    tglOliMesinNext: '2026-06-01',
    tglOliPerseneling: '2025-10-15',
    tglOliPersenelingNext: '2026-10-15',
    tglPajak: '2026-05-10',
    spek: 'Warna Hitam, Transmisi Otomatis'
  },
  {
    id: 'v-overdue-1',
    nama: 'HONDA CR-V GEN 6',
    kategori: 'Kendaraan Dinas',
    status: 'Dipinjam',
    peminjam: 'IR. H. AHMAD SUBAGJO',
    tglPinjam: '2026-01-01',
    tglKembali: '2026-01-10', 
    noPlat: 'KB 9999 AA',
    kilometer: '5200',
    spek: 'Warna Putih Mutiara'
  },
  {
    id: 'e-borrowed-1',
    nama: 'LAPTOP DESAIN',
    merek: 'MacBook Pro M3 Max',
    nup: 'LNN-2025-001',
    kategori: 'Peralatan Elektronik',
    status: 'Dipinjam',
    peminjam: 'SITI NURHALIZA',
    tglPinjam: '2026-01-14',
    tglKembali: '2026-02-14',
    spek: 'RAM 64GB, 1TB SSD, Space Black'
  }
];

const INITIAL_USERS = [
  {
    id: 'admin-master', 
    nama: 'ADMIN UTAMA', 
    nip: '198801012010011001', 
    email: 'admin@sikopifasta.go.id', 
    whatsapp: '081234567890', 
    username: 'admin',
    password: 'password123', 
    role: 'admin', 
    historyTerlambat: 0, 
    historyRusak: 0,
    foto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'
  },
  {
    id: 'user-sample', 
    nama: 'BUDI SANTOSO', 
    nip: '199505052020011002', 
    email: 'budi@sikopifasta.go.id', 
    whatsapp: '085211223344', 
    username: 'budi',
    password: 'password123', 
    role: 'user', 
    historyTerlambat: 0, 
    historyRusak: 0,
    foto: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&h=400&fit=crop'
  }
];

const CATEGORIES = [
  { id: 'Kendaraan Dinas', icon: Car, color: 'bg-indigo-600', hover: 'hover:bg-indigo-700' },
  { id: 'Peralatan Elektronik', icon: Laptop, color: 'bg-emerald-600', hover: 'hover:bg-emerald-700' },
  { id: 'Barang Lain', icon: Package, color: 'bg-amber-600', hover: 'hover:bg-amber-700' }
];

const ELEKTRONIK_OPTIONS = [
  "Laptop/PC", "Kabel Gulung", "Televisi", "Kulkas", "Dispenser", 
  "Printer", "Keyboard", "Mouse", "Proyektor", "Microphone", 
  "Headphone", "Speaker", "Papan Interaktif Digital (PID)", "Kamera", "Drone"
];

// ==========================================
// 2. KOMPONEN UTAMA
// ==========================================
export default function App() {
  const [view, setView] = useState('user_dashboard'); 
  const [data, setData] = useState(INITIAL_DATA);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [appSettings, setAppSettings] = useState({ linkDbKendaraan: '', linkDbElektronik: '', linkDbBarangLain: '', linkDbUsers: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Auth init failed", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const usersCol = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsubscribe = onSnapshot(usersCol, (snapshot) => {
      const usersFromDb = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setUsers([...INITIAL_USERS, ...usersFromDb.filter(u => u.username !== 'admin' && u.username !== 'budi')]);
    }, (err) => console.error("Firestore Users Error:", err));
    return () => unsubscribe();
  }, [firebaseUser]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      const existingScript = document.querySelector(`script[src="${script.src}"]`);
      if (existingScript) document.body.removeChild(existingScript);
    };
  }, []);

  const showNotification = (msg) => {
    const messageText = typeof msg === 'string' ? msg : (msg?.message || "Terdapat kendala pada sistem.");
    setNotification(messageText);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('user_dashboard');
    showNotification("Berhasil keluar sistem.");
  };

  const exportToExcel = (category = null) => {
    if (typeof window.XLSX === 'undefined') return;
    try {
      const dataToExport = category ? data.filter(item => item.kategori === category) : data;
      const ws = window.XLSX.utils.json_to_sheet(dataToExport);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Inventaris");
      const dateStr = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
      const filename = category ? `${category.replace(/\s+/g, '_')}_${dateStr}.xlsx` : `Database_Full_SIKOPIFASTA_${dateStr}.xlsx`;
      window.XLSX.writeFile(wb, filename);
    } catch (err) { showNotification("Gagal mengekspor data."); }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          body { font-family: 'Plus Jakarta Sans', sans-serif; overflow-x: hidden; }
          .animate-in { animation: fadeIn 0.4s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      
      <Header view={view} setView={setView} currentUser={currentUser} onLogout={handleLogout} setSelectedCategory={setSelectedCategory} onOpenSettings={() => setIsProfileModalOpen(true)} />
      
      <main className="pb-20 flex-grow">
        {view === 'user_dashboard' && <UserDashboard setView={setView} setSelectedCategory={setSelectedCategory} exportToExcel={() => exportToExcel()} />}
        {view === 'category_detail' && <CategoryDetail selectedCategory={selectedCategory} setView={setView} data={data} currentUser={currentUser} showNotification={showNotification} />}
        {view === 'login_portal' && <LoginPortal setView={setView} users={users} setCurrentUser={setCurrentUser} showNotification={showNotification} />}
        {view === 'registration_portal' && <RegistrationPortal setView={setView} users={users} setUsers={setUsers} showNotification={showNotification} />}
        {view === 'admin_panel' && currentUser?.role === 'admin' && (
          <AdminPanel 
            data={data} setData={setData} 
            users={users} setUsers={setUsers} 
            appSettings={appSettings} setAppSettings={setAppSettings}
            adminProfile={currentUser} setAdminProfile={setCurrentUser} 
            showNotification={showNotification} setView={setView} 
            exportCategoryExcel={exportToExcel}
            db={db} appId={appId}
          />
        )}
        {view === 'user_panel' && currentUser?.role === 'user' && (
          <div className="max-w-6xl mx-auto p-8 text-center mt-20 animate-in">
             <UserCircle size={80} className="mx-auto text-indigo-600 mb-4" />
             <h2 className="text-3xl font-black uppercase tracking-tight">Selamat Datang, {currentUser.nama}</h2>
             <p className="text-gray-500 mt-2 font-medium italic uppercase tracking-widest text-xs">Akun Pegawai Kantor Terverifikasi</p>
             <button onClick={() => setView('user_dashboard')} className="mt-8 bg-indigo-600 text-white px-10 py-4 rounded-[2rem] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all active:scale-95 shadow-indigo-100">Jelajahi Fasilitas</button>
          </div>
        )}
      </main>

      {isProfileModalOpen && (
        <UserProfileModal 
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser} 
          onClose={() => setIsProfileModalOpen(false)} 
          showNotification={showNotification}
          db={db}
          appId={appId}
        />
      )}

      {notification && <Notification message={notification} />}
      <Footer />
    </div>
  );
}

// ==========================================
// 3. SUB-KOMPONEN GLOBAL & REUSABLE
// ==========================================

function Header({ view, setView, currentUser, onLogout, setSelectedCategory, onOpenSettings }) {
  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer text-indigo-700 transition-transform active:scale-95" onClick={() => { setView('user_dashboard'); setSelectedCategory(null); }}>
          <div className="bg-indigo-100 p-2 rounded-lg"><Home size={22} /></div>
          <span className="font-extrabold text-xl tracking-tight uppercase">SIKOPIFASTA</span>
        </div>
        {currentUser ? (
          <div className="flex items-center gap-2 sm:gap-3">
             <div className="hidden sm:flex flex-col items-end mr-1 text-right"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{currentUser.role === 'admin' ? 'Administrator' : 'Pegawai'}</span><span className="text-xs font-bold text-gray-900 leading-none">{currentUser.nama}</span></div>
             <div className="w-10 h-10 rounded-full border-2 border-indigo-100 bg-indigo-50 flex items-center justify-center text-indigo-600 overflow-hidden shadow-inner shrink-0">{currentUser.foto ? <img src={currentUser.foto} alt="P" className="w-full h-full object-cover" /> : <UserCircle size={24} />}</div>
             <button onClick={onOpenSettings} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Pengaturan Profil"><Settings size={20} /></button>
             <button onClick={onLogout} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Keluar"><LogOut size={20} /></button>
          </div>
        ) : (
          <button onClick={() => setView('login_portal')} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95 shadow-indigo-100"><LogIn size={18} /><span className="text-sm">Login</span></button>
        )}
      </div>
    </nav>
  );
}

function UserDashboard({ setView, setSelectedCategory, exportToExcel }) {
  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 tracking-tight uppercase leading-none">SIKOPIFASTA</h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg italic font-medium leading-relaxed">"Sistem Kontrol Pinjam Fasilitas dan Inventaris Kantor"</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); setView('category_detail'); }} className={`${cat.color} ${cat.hover} text-white p-10 rounded-[2.5rem] shadow-xl flex flex-col items-center gap-6 transition-all transform hover:-translate-y-2 active:scale-95 shadow-indigo-100`}>
            <div className="bg-white/20 p-6 rounded-3xl backdrop-blur-md">
               <cat.icon size={40} />
            </div>
            <div className="text-center"><span className="text-xl font-bold block mb-1 uppercase tracking-wide">{cat.id}</span><span className="text-[10px] text-white/70 uppercase tracking-widest font-black">Cek Ketersediaan</span></div>
            <div className="bg-white/10 w-full py-2.5 rounded-2xl"><ChevronRight size={24} className="mx-auto" /></div>
          </button>
        ))}
      </div>
      <div className="mt-16 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 text-left"><h3 className="font-black text-gray-900 text-xl mb-2 flex items-center gap-2"><Download className="text-indigo-600" size={24} /> Database Fasilitas</h3><p className="text-gray-500 font-medium">Unduh data inventaris terbaru dalam format Excel (.xlsx)</p></div>
        <button onClick={exportToExcel} className="relative z-10 w-full md:w-auto bg-gray-900 text-white px-8 py-4 rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:bg-gray-800 transition-all shadow-lg active:scale-95 uppercase text-sm tracking-widest"><Download size={20} /> Unduh Excel</button>
      </div>
    </div>
  );
}

function CategoryDetail({ selectedCategory, setView, data, currentUser, showNotification }) {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = data.filter(item => 
    item.kategori === selectedCategory && 
    (item.nama || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // FIX: Logika pengalihan ke login portal jika belum masuk
  const handlePinjamClick = (item) => {
    if (!currentUser) {
      showNotification("Silakan masuk terlebih dahulu untuk melakukan peminjaman.");
      setView('login_portal');
    } else {
      showNotification(`Permintaan peminjaman ${item.nama} sedang diproses.`);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto animate-in text-left">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setView('user_dashboard')} className="p-3 bg-white hover:bg-gray-50 rounded-2xl border border-gray-100 shadow-sm transition-all active:scale-90 text-gray-600"><ArrowLeft size={24} /></button>
        <div><h2 className="text-2xl font-black text-gray-900 leading-none uppercase tracking-tight">{selectedCategory}</h2><p className="text-gray-500 text-sm font-medium">Temukan fasilitas yang Anda butuhkan.</p></div>
      </div>
      <div className="relative mb-8"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder={`Cari di ${selectedCategory}...`} className="w-full pl-12 pr-6 py-4 rounded-[2rem] border border-gray-100 shadow-sm text-lg font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
      <div className="grid grid-cols-1 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:border-indigo-200 transition-all">
            <div className="flex gap-5 text-left">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                {item.kategori === 'Kendaraan Dinas' ? <Car size={28}/> : item.kategori === 'Peralatan Elektronik' ? <Laptop size={28}/> : <Package size={28}/>}
              </div>
              <div><h4 className="font-bold text-gray-900 text-lg group-hover:text-indigo-700 transition-colors uppercase leading-tight">{item.nama}</h4><p className="text-sm text-gray-500 font-medium mt-1">{item.noPlat || item.nup || item.id}</p></div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-4 sm:pt-0">
               <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${item.status === 'Tersedia' ? 'bg-green-50 text-green-700 border-green-100' : item.status === 'Dipinjam' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{item.status}</span>
               <button onClick={() => handlePinjamClick(item)} className="bg-indigo-600 text-white px-10 py-3 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100">Pinjam</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center p-20 text-gray-400 font-bold italic">Tidak ada data ditemukan.</div>}
      </div>
    </div>
  );
}

function LoginPortal({ setView, users, setCurrentUser, showNotification }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    const foundUser = users.find(u => u.username === identifier || u.email === identifier || u.nip === identifier);
    if (!foundUser) { showNotification("Username, Email, atau NIP tidak ditemukan."); return; }
    if (foundUser.password !== password) { showNotification("Kata Sandi yang dimasukkan salah."); return; }
    setCurrentUser(foundUser);
    if (foundUser.role === 'admin') setView('admin_panel'); else setView('user_panel');
    showNotification(`Selamat datang kembali, ${foundUser.nama}!`);
  };
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4 bg-slate-50">
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl max-w-md w-full border border-white animate-in zoom-in-95 text-left">
        <div className="text-center mb-10"><div className="bg-indigo-600 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-white shadow-xl rotate-3"><ShieldCheck size={40} /></div><h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-2 uppercase text-center">Portal Masuk</h2><p className="text-gray-400 text-sm font-medium italic text-center leading-relaxed">Gunakan Username, Email, atau NIP Anda.</p></div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kredensial Pengguna</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold shadow-inner" placeholder="Username / Email / NIP" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required /></div>
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kata Sandi</label><input type="password" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold shadow-inner" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl active:scale-95 mt-4 shadow-indigo-100 uppercase tracking-widest">Masuk Sekarang</button>
        </form>
        <button onClick={() => setView('registration_portal')} className="w-full mt-8 text-indigo-600 font-black text-xs uppercase tracking-widest underline text-center">Daftar Akun Baru</button>
      </div>
    </div>
  );
}

function RegistrationPortal({ setView, users, setUsers, showNotification }) {
  const [formData, setFormData] = useState({ nama: '', nip: '', username: '', email: '', whatsapp: '', password: '', confirmPassword: '' });
  const handleRegister = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { showNotification("Konfirmasi sandi tidak cocok."); return; }
    showNotification("Selamat! Registrasi Berhasil.");
    setView('login_portal');
  };
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4 bg-slate-50">
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl max-w-xl w-full border border-white animate-in zoom-in-95 overflow-y-auto max-h-[95vh] text-left">
        <h2 className="text-3xl font-black text-center mb-8 uppercase">Registrasi Akun</h2>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleRegister}>
          <div className="md:col-span-2"><input placeholder="NAMA LENGKAP" required className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl outline-none font-bold uppercase" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value.toUpperCase()})} /></div>
          <div><input placeholder="USERNAME" required className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl outline-none font-bold" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})} /></div>
          <div><input placeholder="NIP" required className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl outline-none font-bold" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} /></div>
          <button className="md:col-span-2 w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase mt-4 shadow-lg active:scale-95">Daftar Sekarang</button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 4. ADMIN PANEL & SUB-SECTIONS
// ==========================================

function AdminPanel({ data, setData, users, setUsers, appSettings, setAppSettings, adminProfile, setAdminProfile, showNotification, setView, exportCategoryExcel, db, appId }) {
  const [adminSubView, setAdminSubView] = useState('assets'); 
  const [activeAssetTab, setActiveAssetTab] = useState('Kendaraan Dinas'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('Semua');
  const [userSearch, setUserSearch] = useState(''); 
  const [formData, setFormData] = useState({ nama: '', kategori: '', status: 'Tersedia', spek: '', noPlat: '', noRangka: '', noMesin: '', kilometer: '', tglOliMesin: '', tglOliMesinNext: '', tglOliPerseneling: '', tglOliPersenelingNext: '', tglPajak: '', deskripsiRusak: '', nup: '', merek: '', peminjam: '', usernamePeminjam: '', tglPinjam: '', tglKembali: '' });

  const openModal = (item = null) => { 
    if (item) { 
      setEditingItem(item); 
      setFormData({ ...item, status: item.status || 'Tersedia' }); 
    } else { 
      setEditingItem(null); 
      setFormData({ nama: '', kategori: activeAssetTab, status: 'Tersedia', spek: '', noPlat: '', noRangka: '', noMesin: '', kilometer: '', tglOliMesin: '', tglOliMesinNext: '', tglOliPerseneling: '', tglOliPersenelingNext: '', tglPajak: '', deskripsiRusak: '', nup: '', merek: '', peminjam: '', usernamePeminjam: '', tglPinjam: '', tglKembali: '' }); 
    } 
    setIsModalOpen(true); 
  };

  const handleAddOrEditAsset = (e) => { 
    e.preventDefault(); 
    const finalData = { ...formData, kategori: activeAssetTab, id: editingItem ? editingItem.id : `asset-${Date.now()}` }; 
    if (editingItem) setData(data.map(i => i.id === editingItem.id ? finalData : i)); 
    else setData([...data, finalData]); 
    setIsModalOpen(false); 
    showNotification("Data inventaris berhasil diperbarui."); 
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 animate-in slide-in-from-bottom-2 text-left">
      <div className="flex flex-wrap bg-white p-2 rounded-[2rem] shadow-sm border border-gray-100 mb-8 w-full sm:w-max gap-1">
        <button onClick={() => setAdminSubView('assets')} className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${adminSubView === 'assets' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><LayoutGrid size={18} /> Inventaris</button>
        <button onClick={() => setAdminSubView('users')} className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${adminSubView === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Users size={18} /> Pengguna</button>
        <button onClick={() => setAdminSubView('profile')} className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${adminSubView === 'profile' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><UserCircle size={18} /> Profil</button>
        <button onClick={() => setAdminSubView('settings')} className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${adminSubView === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Settings size={18} /> Sistem</button>
      </div>

      {adminSubView === 'assets' ? (
        <AdminAssetsSection activeAssetTab={activeAssetTab} setActiveAssetTab={setActiveAssetTab} data={data} setData={setData} openModal={openModal} openDetailModal={(i) => { setSelectedDetailItem(i); setIsDetailModalOpen(true); }} adminSearch={adminSearch} setAdminSearch={setAdminSearch} adminStatusFilter={adminStatusFilter} setAdminStatusFilter={setAdminStatusFilter} exportCategoryExcel={exportCategoryExcel} />
      ) : adminSubView === 'users' ? (
        <AdminUsersSection users={users} userSearch={userSearch} setUserSearch={setUserSearch} />
      ) : adminSubView === 'profile' ? (
        <AdminProfileSection adminProfile={adminProfile} setAdminProfile={setAdminProfile} showNotification={showNotification} />
      ) : (
        <AppSettingsSection appSettings={appSettings} setAppSettings={setAppSettings} showNotification={showNotification} />
      )}

      {isModalOpen && <AssetModal activeAssetTab={activeAssetTab} editingItem={editingItem} formData={formData} setFormData={setFormData} closeModal={() => setIsModalOpen(false)} handleSave={handleAddOrEditAsset} />}
      {isDetailModalOpen && <AssetDetailModal item={selectedDetailItem} onClose={() => setIsDetailModalOpen(false)} />}
    </div>
  );
}

function AdminAssetsSection({ activeAssetTab, setActiveAssetTab, data, setData, openModal, openDetailModal, adminSearch, setAdminSearch, adminStatusFilter, setAdminStatusFilter, exportCategoryExcel }) {
  const categoryData = data.filter(item => item.kategori === activeAssetTab);
  const stats = { total: categoryData.length, available: categoryData.filter(i => i.status === 'Tersedia').length, borrowed: categoryData.filter(i => i.status === 'Dipinjam').length, damaged: categoryData.filter(i => i.status === 'Rusak').length };
  
  const filteredData = categoryData.filter(item => {
    const s = adminSearch.toLowerCase();
    const matchSearch = (item.nama || "").toLowerCase().includes(s) || (item.noPlat && item.noPlat.toLowerCase().includes(s)) || (item.nup && item.nup.toLowerCase().includes(s));
    const matchStatus = adminStatusFilter === 'Semua' ? true : item.status === adminStatusFilter;
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    if (a.status === 'Dipinjam' && b.status !== 'Dipinjam') return -1;
    if (a.status !== 'Dipinjam' && b.status === 'Dipinjam') return 1;
    if (a.tglKembali && b.tglKembali) return a.tglKembali.localeCompare(b.tglKembali);
    return 0;
  });

  const isOverdue = (item) => {
    if (item.status !== 'Dipinjam' || !item.tglKembali) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    return new Date(item.tglKembali) < today;
  };

  return (
    <div className="animate-in fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 text-left">
        <div><h2 className="text-2xl font-black text-gray-900 mb-1 uppercase tracking-tight">Inventaris Kantor</h2><p className="text-gray-500 text-sm font-medium italic uppercase">Kategori: <span className="text-indigo-600 font-bold">{activeAssetTab}</span></p></div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => exportCategoryExcel(activeAssetTab)} className="bg-blue-50 text-blue-700 border border-blue-100 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-100 text-xs uppercase tracking-widest transition-all"><Download size={18} /> Unduh</button>
          <button onClick={() => openModal()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl uppercase tracking-widest text-xs transition-all"><Plus size={20} /> Tambah</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-6 p-1.5 bg-gray-100/50 rounded-2xl w-full sm:w-max">{CATEGORIES.map((cat) => (<button key={cat.id} onClick={() => setActiveAssetTab(cat.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all uppercase tracking-wider ${activeAssetTab === cat.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{cat.id}</button>))}</div>
      <StatusInfographic stats={stats} currentFilter={adminStatusFilter} onFilterChange={setAdminStatusFilter} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"><div className="md:col-span-2 relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Cari nama, plat, atau NUP..." className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold shadow-sm" value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} /></div><div className="relative"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><select className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none font-bold shadow-sm appearance-none cursor-pointer" value={adminStatusFilter} onChange={(e) => setAdminStatusFilter(e.target.value)}><option value="Semua">Semua Status</option><option value="Tersedia">Tersedia</option><option value="Dipinjam">Dipinjam</option><option value="Rusak">Rusak</option></select></div></div>
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1000px]">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr><th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest">Detail Barang</th><th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest">Peminjam</th><th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest">Tgl Pinjam</th><th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest">Tgl Kembali</th><th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-center">Status</th><th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-left">
              {filteredData.map(item => {
                const overdue = isOverdue(item);
                return (
                  <tr key={item.id} className={`transition-colors ${overdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-5 flex items-center gap-4 text-left">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${overdue ? 'bg-red-100 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {item.kategori === 'Kendaraan Dinas' ? <Car size={20}/> : item.kategori === 'Peralatan Elektronik' ? <Laptop size={20}/> : <Package size={20}/>}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 uppercase leading-none mb-1">{item.nama}</div>
                        <div className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">{item.noPlat || item.nup || item.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-bold text-gray-800 uppercase text-xs">{item.peminjam || '-'}</td>
                    <td className="px-6 py-5 text-gray-500 font-medium">{item.tglPinjam || '-'}</td>
                    <td className="px-6 py-5">
                       <span className={`font-bold ${overdue ? 'text-red-600' : 'text-gray-700'}`}>{item.tglKembali || '-'}</span>
                       {overdue && <span className="block text-[8px] font-black text-red-500 uppercase mt-0.5 tracking-tighter">TERLAMBAT</span>}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${item.status === 'Tersedia' ? 'bg-green-50 text-green-700 border-green-200' : item.status === 'Dipinjam' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{item.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2 text-left">
                      <button onClick={() => openDetailModal(item)} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-colors"><FileText size={18}/></button>
                      <button onClick={() => openModal(item)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><Edit size={18}/></button>
                      <button onClick={() => setData(prev => prev.filter(i => i.id !== item.id))} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminUsersSection({ users, userSearch, setUserSearch }) {
  const filtered = users.filter(u => (u.nama || "").toLowerCase().includes(userSearch.toLowerCase()) || (u.nip || "").includes(userSearch));
  return (
    <div className="animate-in fade-in bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-left">
      <div className="flex justify-between items-center mb-8"><div><h2 className="text-2xl font-black uppercase tracking-tight">Manajemen Pengguna</h2><p className="text-gray-400 text-sm font-medium italic uppercase">Total: {users.length} Pegawai</p></div><button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 flex items-center gap-2 transition-all"><UserPlus size={18}/> Tambah User</button></div>
      <div className="relative mb-6"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Cari nama atau NIP..." className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl outline-none font-bold shadow-inner" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(u => (
          <div key={u.id} className="p-6 bg-slate-50/50 rounded-3xl flex justify-between items-center border border-gray-100 hover:border-indigo-200 transition-colors shadow-sm">
            <div className="flex items-center gap-4 text-left"><div className="w-12 h-12 rounded-full border-2 border-indigo-50 bg-white overflow-hidden flex items-center justify-center shrink-0">{u.foto ? <img src={u.foto} className="w-full h-full object-cover" /> : <User size={24} className="text-indigo-400" />}</div><div><p className="font-bold text-gray-900 uppercase leading-none mb-1">{u.nama}</p><p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">@{u.username} • {u.role}</p></div></div>
            <div className="flex gap-2 text-left"><button className="p-2 bg-white rounded-xl shadow-sm text-slate-400"><Edit size={18}/></button><button className="p-2 bg-white rounded-xl shadow-sm text-red-400"><Trash2 size={18}/></button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminProfileSection({ adminProfile, setAdminProfile, showNotification }) {
  const [temp, setTemp] = useState({...adminProfile});
  return (
    <div className="animate-in fade-in max-w-xl mx-auto bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-left">
      <div className="flex flex-col items-center mb-8 text-center"><div className="w-28 h-28 rounded-[2.5rem] bg-indigo-50 border-4 border-indigo-100 overflow-hidden flex items-center justify-center mb-4 shadow-inner text-center">{temp.foto ? <img src={temp.foto} className="w-full h-full object-cover" /> : <UserCircle size={64} className="text-indigo-200 text-center"/>}</div><h2 className="text-xl font-black uppercase mt-2">{adminProfile.nama}</h2><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic">Administrator Utama</p></div>
      <form onSubmit={(e) => { e.preventDefault(); setAdminProfile(temp); showNotification("Profil diperbarui!"); }} className="space-y-4 text-left">
        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nama Lengkap</label><input className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl outline-none font-bold uppercase border-none" value={temp.nama} onChange={e => setTemp({...temp, nama: e.target.value.toUpperCase()})} /></div>
        <div className="grid grid-cols-2 gap-4 text-left"><div><label className="text-[10px] font-black text-gray-400 uppercase ml-1">NIP</label><input className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl outline-none font-bold border-none" value={temp.nip} onChange={e => setTemp({...temp, nip: e.target.value})} /></div><div><label className="text-[10px] font-black text-gray-400 uppercase ml-1">WhatsApp</label><input className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl outline-none font-bold border-none" value={temp.whatsapp} onChange={e => setTemp({...temp, whatsapp: e.target.value})} /></div></div>
        <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"><Save size={20}/> Simpan Profil</button>
      </form>
    </div>
  );
}

function AppSettingsSection({ appSettings, setAppSettings, showNotification }) {
  const [temp, setTemp] = useState({...appSettings});
  return (
    <div className="animate-in fade-in max-w-2xl mx-auto bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-left">
      <h2 className="text-xl font-black mb-6 uppercase flex items-center gap-3"><Globe className="text-indigo-600"/> Sinkronisasi Sistem</h2>
      <form onSubmit={(e) => { e.preventDefault(); setAppSettings(temp); showNotification("Tautan DB berhasil disimpan!"); }} className="space-y-6 text-left">
        <div className="p-6 bg-slate-50 rounded-[2rem] space-y-4 border border-gray-100 shadow-inner text-left">
          <div><label className="text-[10px] font-black text-indigo-600 uppercase ml-1 block mb-1">DB Kendaraan (XLSX Link)</label><input className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-xl outline-none font-bold text-xs" value={temp.linkDbKendaraan} onChange={e => setTemp({...temp, linkDbKendaraan: e.target.value})} placeholder="https://docs.google.com/..." /></div>
          <div><label className="text-[10px] font-black text-emerald-600 uppercase ml-1 block mb-1">DB Elektronik</label><input className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-xl outline-none font-bold text-xs" value={temp.linkDbElektronik} onChange={e => setTemp({...temp, linkDbElektronik: e.target.value})} placeholder="https://docs.google.com/..." /></div>
        </div>
        <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"><Save size={20}/> Terapkan Tautan</button>
      </form>
    </div>
  );
}

function AssetModal({ activeAssetTab, editingItem, formData, setFormData, closeModal, handleSave }) {
  const isVehicle = activeAssetTab === 'Kendaraan Dinas';
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in zoom-in-95 text-left">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-8 border-b flex justify-between items-center sticky top-0 bg-white z-10 text-left">
          <div className="flex items-center gap-3"><div className={`p-2 rounded-xl text-white ${isVehicle ? 'bg-indigo-600' : 'bg-emerald-600'}`}>{isVehicle ? <Car size={24}/> : <Laptop size={24}/>}</div><h3 className="text-xl font-black uppercase">{editingItem ? 'Edit' : 'Tambah'} {activeAssetTab}</h3></div>
          <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X /></button>
        </div>
        <form onSubmit={handleSave} className="p-8 space-y-6 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nama Unit</label><input required placeholder="MASUKKAN NAMA" className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl font-bold uppercase border-none" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value.toUpperCase()})} /></div>
            <div><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Status</label><select className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl font-bold border-none cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="Tersedia">Tersedia</option><option value="Dipinjam">Dipinjam</option><option value="Rusak">Rusak</option></select></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div><label className="text-[10px] font-black text-gray-400 uppercase ml-1">{isVehicle ? 'No. Plat' : 'Kode NUP'}</label><input required placeholder="IDENTITAS" className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl font-bold uppercase border-none" value={isVehicle ? (formData.noPlat || '') : (formData.nup || '')} onChange={e => setFormData(isVehicle ? {...formData, noPlat: e.target.value.toUpperCase()} : {...formData, nup: e.target.value.toUpperCase()})} /></div>
            <div><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Merek</label><input required placeholder="MEREK" className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl font-bold uppercase border-none" value={formData.merek || ''} onChange={e => setFormData({...formData, merek: e.target.value.toUpperCase()})} /></div>
          </div>

          {isVehicle && (
            <div className="p-6 bg-indigo-50 rounded-[2rem] space-y-4 border border-indigo-100 shadow-inner animate-in slide-in-from-top-2 text-left">
              <div className="flex items-center gap-2 mb-2 text-left"><Gauge className="text-indigo-600" size={18}/><span className="text-xs font-black text-indigo-900 uppercase">Detail Teknis Kendaraan</span></div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Kilometer Saat Ini</label><input placeholder="Contoh: 15400" className="w-full px-5 py-3.5 bg-white rounded-xl font-bold border-none" value={formData.kilometer || ''} onChange={e => setFormData({...formData, kilometer: e.target.value})} /></div>
                 <div><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tanggal Pajak</label><input type="date" className="w-full px-5 py-3.5 bg-white rounded-xl font-bold border-none" value={formData.tglPajak || ''} onChange={e => setFormData({...formData, tglPajak: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-indigo-100 text-left">
                 <div><label className="text-[10px] font-black text-indigo-500 uppercase ml-1">Ganti Oli Mesin Terakhir</label><input type="date" className="w-full px-4 py-2.5 bg-white rounded-xl font-bold text-xs" value={formData.tglOliMesin || ''} onChange={e => setFormData({...formData, tglOliMesin: e.target.value})} /></div>
                 <div><label className="text-[10px] font-black text-red-500 uppercase ml-1">Ganti Oli Mesin Berikutnya</label><input type="date" className="w-full px-4 py-2.5 bg-white rounded-xl font-bold text-xs" value={formData.tglOliMesinNext || ''} onChange={e => setFormData({...formData, tglOliMesinNext: e.target.value})} /></div>
              </div>
            </div>
          )}

          {formData.status === 'Dipinjam' && (
            <div className="p-6 bg-orange-50 rounded-[2rem] space-y-4 border border-orange-100 animate-in slide-in-from-top-2 text-left">
              <div><label className="text-[10px] font-black text-orange-900 uppercase ml-1">Nama Peminjam</label><input required placeholder="NAMA LENGKAP" className="w-full px-5 py-3.5 bg-white rounded-2xl font-bold uppercase border-none" value={formData.peminjam || ''} onChange={e => setFormData({...formData, peminjam: e.target.value.toUpperCase()})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Mulai Pinjam</label><input type="date" required className="w-full px-5 py-3.5 bg-white rounded-2xl font-bold border-none" value={formData.tglPinjam || ''} onChange={e => setFormData({...formData, tglPinjam: e.target.value})} /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Jatuh Tempo</label><input type="date" required className="w-full px-5 py-3.5 bg-white rounded-2xl font-bold border-none" value={formData.tglKembali || ''} onChange={e => setFormData({...formData, tglKembali: e.target.value})} /></div>
              </div>
            </div>
          )}

          <div className="space-y-2 text-left"><label className="text-[10px] font-black text-gray-400 uppercase ml-1">Spesifikasi Detail</label><textarea className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl font-bold border-none h-24" placeholder="Keterangan tambahan..." value={formData.spek || ''} onChange={e => setFormData({...formData, spek: e.target.value})} /></div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase shadow-xl hover:bg-indigo-700 transition-all active:scale-95 text-left">Simpan Data</button>
        </form>
      </div>
    </div>
  );
}

function AssetDetailModal({ item, onClose }) {
  if (!item) return null;
  const isVehicle = item.kategori === 'Kendaraan Dinas';
  const isElectronic = item.kategori === 'Peralatan Elektronik';
  const themeColor = isVehicle ? 'bg-indigo-600' : isElectronic ? 'bg-emerald-600' : 'bg-amber-600';
  const overdue = item.status === 'Dipinjam' && item.tglKembali && new Date(item.tglKembali) < new Date();
  
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in text-left">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] text-left">
        <div className={`p-8 ${themeColor} text-white flex justify-between items-center text-left`}>
          <div className="text-left"><h3 className="text-xl font-black uppercase leading-none tracking-tight text-left">Rincian Unit</h3><p className="text-white/60 text-[10px] uppercase mt-1 tracking-widest text-left">Informasi Lengkap Aset Kantor</p></div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X /></button>
        </div>
        <div className="p-8 overflow-y-auto space-y-6 text-left">
          <div className="bg-slate-50 p-6 rounded-[2rem] border border-gray-100 shadow-inner text-left">
            <h2 className="text-2xl font-black text-gray-900 uppercase leading-tight text-left">{item.nama}</h2>
            <div className="flex flex-wrap gap-2 mt-4 text-left">
              <span className="bg-white px-4 py-1.5 rounded-xl font-mono font-bold border border-gray-200 text-xs text-gray-600 uppercase shadow-sm">{item.noPlat || item.nup || 'No Identity'}</span>
              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${item.status === 'Tersedia' ? 'bg-green-100 text-green-700 border-green-200' : item.status === 'Dipinjam' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{item.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-left">
            <div className="space-y-4 text-left">
              <h4 className="font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-2 text-left"><ClipboardList size={16}/> Identitas Fisik</h4>
              <div className="space-y-2 text-left">
                 <div className="flex justify-between"><span>Merek:</span><span className="font-bold uppercase">{item.merek || '-'}</span></div>
                 {isVehicle && (
                   <>
                    <div className="flex justify-between"><span>Kilometer:</span><span className="font-bold text-indigo-600">{item.kilometer || '0'} KM</span></div>
                    <div className="flex justify-between"><span>No. Mesin:</span><span className="font-bold font-mono text-[10px]">{item.noMesin || '-'}</span></div>
                    <div className="flex justify-between"><span>Tgl Pajak:</span><span className="font-bold text-amber-600">{item.tglPajak || '-'}</span></div>
                   </>
                 )}
                 <div className="flex justify-between"><span>Kategori:</span><span className="font-bold uppercase text-[10px]">{item.kategori}</span></div>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <h4 className="font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-2 text-left"><Wrench size={16}/> Pemeliharaan</h4>
              {isVehicle ? (
                <div className="space-y-2 text-[10px] text-left">
                   <div className="p-2 bg-indigo-50 rounded-lg"><p className="font-black text-indigo-700 uppercase">OLI MESIN</p><p className="font-bold">Terakhir: {item.tglOliMesin || '-'}</p><p className="font-black text-red-500">Berikutnya: {item.tglOliMesinNext || '-'}</p></div>
                   <div className="p-2 bg-emerald-50 rounded-lg"><p className="font-black text-emerald-700 uppercase">OLI PERSENELING</p><p className="font-bold">Terakhir: {item.tglOliPerseneling || '-'}</p><p className="font-black text-red-500">Berikutnya: {item.tglOliPersenelingNext || '-'}</p></div>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl italic text-gray-600 text-left">{item.spek || 'Tidak ada spesifikasi tambahan.'}</div>
              )}
            </div>
          </div>

          {item.status === 'Dipinjam' && (
            <div className={`p-6 rounded-[2rem] border ${overdue ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'} text-left`}>
              <h4 className={`text-sm font-black uppercase mb-4 flex items-center gap-2 ${overdue ? 'text-red-700' : 'text-orange-700'} text-left`}><UserCheck size={18} /> Informasi Peminjam</h4>
              <div className="space-y-4 text-left">
                <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Nama Peminjam</p><p className={`font-black uppercase text-xl ${overdue ? 'text-red-900' : 'text-orange-900'}`}>{item.peminjam || '-'}</p></div>
                <div className="flex gap-8 text-left">
                   <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Pinjam Sejak</p><p className="font-bold text-gray-900">{item.tglPinjam || '-'}</p></div>
                   <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Jatuh Tempo</p><p className={`font-bold ${overdue ? 'text-red-600' : 'text-gray-900'}`}>{item.tglKembali || '-'}</p></div>
                </div>
                {overdue && <div className="flex items-center gap-2 text-[10px] font-black text-red-600 bg-white/60 p-3 rounded-2xl animate-pulse border border-red-200 uppercase tracking-widest text-left"><AlertCircle size={14}/> Melewati Batas Pengembalian</div>}
              </div>
            </div>
          )}
        </div>
        <div className="p-8 border-t bg-gray-50 flex justify-end text-left"><button onClick={onClose} className="px-10 py-4 bg-white border border-gray-200 rounded-[1.5rem] font-black uppercase text-xs hover:bg-gray-100 shadow-sm transition-all active:scale-95 tracking-widest text-gray-600">Tutup Rincian</button></div>
      </div>
    </div>
  );
}

function StatCard({ label, count, icon, color, isActive, onClick }) {
  return (
    <div onClick={onClick} className={`cursor-pointer p-5 rounded-3xl border-2 transition-all transform active:scale-95 ${isActive ? `border-white ${color} text-white shadow-lg` : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20' : 'bg-slate-50 text-slate-400'}`}>{icon}</div>
        <span className={`text-2xl font-black ${isActive ? 'text-white' : 'text-slate-900'}`}>{count}</span>
      </div>
      <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white/80' : 'text-slate-400'}`}>{label}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="py-12 bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-6xl mx-auto px-4 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4 text-gray-300"><ShieldCheck size={16} /><span className="font-black tracking-[0.2em] text-[10px] uppercase italic">SIKOPIFASTA Enterprise v4.5</span></div>
        <p className="text-gray-400 text-[10px] font-black text-center italic uppercase tracking-widest leading-relaxed opacity-60">"Sistem Kontrol Pinjam Fasilitas dan Inventaris Kantor Terpadu"<br/>Dirancang untuk Ketertiban Administrasi Internal</p>
      </div>
    </footer>
  );
}
