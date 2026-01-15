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
  setDoc, deleteDoc, addDoc, query, updateDoc
} from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';

// ==========================================
// 1. KONFIGURASI FIREBASE & INITIAL DATA
// ==========================================

const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'sikopifasta-v4';

const INITIAL_DATA = [
  {
    id: 'v-available',
    nama: 'TOYOTA AVANZA VELOZ',
    kategori: 'Kendaraan Dinas',
    status: 'Tersedia',
    noPlat: 'KB 1234 XX',
    noRangka: 'MHF111222333444',
    noMesin: '2NR-VE123456',
    kilometer: '15420',
    tglOliMesin: '2025-12-01',
    tglOliMesinNext: '2026-06-01',
    tglPajak: '2026-05-10',
    spek: 'Warna Hitam, Transmisi Otomatis'
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
  }
];

const CATEGORIES = [
  { id: 'Kendaraan Dinas', icon: <Car size={40} />, color: 'bg-indigo-600', hover: 'hover:bg-indigo-700' },
  { id: 'Peralatan Elektronik', icon: <Laptop size={40} />, color: 'bg-emerald-600', hover: 'hover:bg-emerald-700' },
  { id: 'Barang Lain', icon: <Package size={40} />, color: 'bg-amber-600', hover: 'hover:bg-amber-700' }
];

const ELEKTRONIK_OPTIONS = [
  "Laptop/PC", "Kabel Gulung", "Televisi", "Kulkas", "Dispenser", 
  "Printer", "Keyboard", "Mouse", "Proyektor", "Microphone", 
  "Headphone", "Speaker", "Papan Interaktif Digital (PID)", "Kamera", "Drone"
];

const INITIAL_SETTINGS = {
  linkDbKendaraan: '',
  linkDbElektronik: '',
  linkDbBarangLain: '',
  linkDbUsers: ''
};

// ==========================================
// 2. KOMPONEN UTAMA
// ==========================================
export default function App() {
  const [view, setView] = useState('user_dashboard'); 
  const [data, setData] = useState([]); 
  const [users, setUsers] = useState(INITIAL_USERS);
  const [appSettings, setAppSettings] = useState(INITIAL_SETTINGS);
  const [currentUser, setCurrentUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // AUTHENTICATION LOGIC (RULE 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { 
        console.error("Auth initialization failed:", e); 
      } finally {
        setIsLoadingAuth(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  // REAL-TIME USERS SYNC (RULE 1)
  useEffect(() => {
    if (!firebaseUser) return;
    const usersCol = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsubscribe = onSnapshot(usersCol, (snapshot) => {
      const usersFromDb = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      
      // PERBAIKAN LOGIKA SYNC: 
      // Kita gabungkan data dari database. Jika ada data 'admin' di DB, ia akan menimpa data statis.
      // Ini penting agar 'linkedUid' milik admin di DB bisa terbaca untuk restore sesi.
      const combined = [...usersFromDb];
      INITIAL_USERS.forEach(iu => {
        if (!combined.find(u => u.username === iu.username)) {
          combined.push(iu);
        }
      });
      setUsers(combined);
    }, (err) => console.error("Firestore Users Error:", err));
    return () => unsubscribe();
  }, [firebaseUser]);

  // SESSION RESTORATION LOGIC
  useEffect(() => {
    // Jalankan pemulihan hanya jika data users sudah dimuat
    if (!firebaseUser || currentUser || isLoadingAuth || users.length === 0) return;

    const savedUser = users.find(u => u.linkedUid === firebaseUser.uid);
    if (savedUser) {
      setCurrentUser(savedUser);
      if (savedUser.role === 'admin') {
        setView('admin_panel');
      } else {
        setView('user_panel');
      }
      showNotification(`Sesi dipulihkan: ${savedUser.nama}`);
    }
  }, [firebaseUser, users, currentUser, isLoadingAuth]);

  // REAL-TIME ASSETS SYNC
  useEffect(() => {
    if (!firebaseUser) return;
    const assetsCol = collection(db, 'artifacts', appId, 'public', 'data', 'assets');
    const unsubscribe = onSnapshot(assetsCol, (snapshot) => {
      const assetsFromDb = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setData(assetsFromDb.length > 0 ? assetsFromDb : INITIAL_DATA);
    }, (err) => console.error("Firestore Assets Error:", err));
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
    const messageText = typeof msg === 'string' ? msg : (msg?.message || "Terjadi kesalahan sistem.");
    setNotification(messageText);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogout = async () => {
    if (currentUser && firebaseUser) {
      try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.username);
        await setDoc(userRef, { linkedUid: null }, { merge: true });
      } catch (e) { console.error("Logout update failed", e); }
    }
    
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

  const handleExportUsers = () => {
    if (typeof window.XLSX === 'undefined') return;
    try {
      const ws = window.XLSX.utils.json_to_sheet(users);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Database Pengguna");
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      window.XLSX.writeFile(wb, `Database-Pengguna-${dateStr}.xlsx`);
      showNotification(`Berhasil membackup database pengguna!`);
    } catch (err) { showNotification("Gagal backup data pengguna."); }
  };

  const handleImportUsersExcel = (e) => {
    const file = e.target.files[0];
    if (!file || typeof window.XLSX === 'undefined') return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = window.XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const importedData = window.XLSX.utils.sheet_to_json(ws);
        showNotification("Memproses pemulihan data pengguna...");
        for (const item of importedData) {
          if (item.username === 'admin') continue;
          const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', item.username);
          await setDoc(userRef, { ...item, nama: (item.nama || '').toUpperCase(), role: item.role || 'user', password: item.password || 'password123' }, { merge: true });
        }
        showNotification(`Restore data pengguna selesai!`);
        e.target.value = null;
      } catch (err) { showNotification("Gagal memproses file restore pengguna."); }
    };
    reader.readAsBinaryString(file);
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
        {isLoadingAuth ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-bold text-gray-400 animate-pulse uppercase tracking-widest text-xs">Menghubungkan ke Database...</p>
          </div>
        ) : (
          <>
            {view === 'user_dashboard' && <UserDashboard setView={setView} setSelectedCategory={setSelectedCategory} exportToExcel={() => exportToExcel()} />}
            {view === 'category_detail' && <CategoryDetail selectedCategory={selectedCategory} setView={setView} data={data} appSettings={appSettings} currentUser={currentUser} showNotification={showNotification} />}
            {view === 'login_portal' && <LoginPortal setView={setView} users={users} setCurrentUser={setCurrentUser} showNotification={showNotification} db={db} appId={appId} firebaseUser={firebaseUser} />}
            {view === 'registration_portal' && <RegistrationPortal setView={setView} users={users} setUsers={setUsers} showNotification={showNotification} db={db} appId={appId} />}
            {view === 'admin_panel' && currentUser?.role === 'admin' && (
              <AdminPanel 
                data={data} 
                users={users} 
                appSettings={appSettings} setAppSettings={setAppSettings}
                adminProfile={currentUser} setAdminProfile={setCurrentUser} 
                showNotification={showNotification} setView={setView} 
                exportCategoryExcel={exportToExcel}
                onExportUsers={handleExportUsers}
                onImportUsersExcel={handleImportUsersExcel} 
                db={db}
                appId={appId}
                firebaseUser={firebaseUser}
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
          </>
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
function StatusInfographic({ stats, currentFilter, onFilterChange }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard label="Total Unit" count={stats.total} icon={<Boxes size={20} />} color="bg-slate-600" isActive={currentFilter === 'Semua'} onClick={() => onFilterChange('Semua')} />
      <StatCard label="Tersedia" count={stats.available} icon={<CheckCircle2 size={20} />} color="bg-emerald-500" isActive={currentFilter === 'Tersedia'} onClick={() => onFilterChange('Tersedia')} />
      <StatCard label="Dipinjam" count={stats.borrowed} icon={<Clock size={20} />} color="bg-orange-500" isActive={currentFilter === 'Dipinjam'} onClick={() => onFilterChange('Dipinjam')} />
      <StatCard label="Rusak" count={stats.damaged} icon={<AlertCircle size={20} />} color="bg-red-500" isActive={currentFilter === 'Rusak'} onClick={() => onFilterChange('Rusak')} />
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

function UserProfileModal({ currentUser, setCurrentUser, onClose, showNotification, db, appId }) {
  const [formData, setFormData] = useState({ nama: currentUser.nama, nip: currentUser.nip || '', email: currentUser.email || '', whatsapp: currentUser.whatsapp || '', username: currentUser.username, password: currentUser.password, confirmPassword: currentUser.password });
  const [showPass, setShowPass] = useState(false);
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { showNotification("Konfirmasi kata sandi tidak cocok!"); return; }
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.username);
      const updatedData = { ...currentUser, nama: formData.nama.toUpperCase(), nip: formData.nip, email: formData.email, whatsapp: formData.whatsapp, password: formData.password };
      await setDoc(userRef, updatedData, { merge: true });
      setCurrentUser(updatedData);
      showNotification("Profil berhasil diperbarui!");
      onClose();
    } catch (err) { 
      showNotification(err); 
    }
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 max-h-[95vh] overflow-y-auto">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 text-left"><div className="flex items-center gap-3"><div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><User size={24} /></div><h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Pengaturan Profil</h3></div><button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X /></button></div>
        <form onSubmit={handleUpdate} className="p-8 space-y-5 text-left">
          <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label><input required value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value.toUpperCase()})} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold uppercase" /></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NIP</label><input required value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold" /></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label><input disabled value={formData.username} className="w-full px-5 py-4 bg-gray-200 border-none rounded-2xl font-bold text-gray-500 cursor-not-allowed" /></div></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label><input required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold" /></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label><input required value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold" /></div></div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t"><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sandi Baru</label><div className="relative"><input required type={showPass ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-5 pr-12 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold" /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-indigo-600">{showPass ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Konfirmasi Sandi</label><input required type={showPass ? "text" : "password"} value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold" /></div></div>
          <div className="flex gap-4 pt-6 border-t"><button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">Batal</button><button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black">Simpan</button></div>
        </form>
      </div>
    </div>
  );
}

function Header({ view, setView, currentUser, onLogout, setSelectedCategory, onOpenSettings }) {
  // PERBAIKAN: Tombol logout sekarang memanggil props onLogout (yang mengarah ke handleLogout di App)
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

function Footer() {
  return (
    <footer className="py-12 bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-6xl mx-auto px-4 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4 text-gray-300"><ShieldCheck size={16} /><span className="font-black tracking-[0.2em] text-[10px] uppercase italic">SIKOPIFASTA Enterprise v4.5</span></div>
        <p className="text-gray-400 text-sm font-bold text-center italic leading-relaxed">"Sistem Kontrol Pinjam Fasilitas dan Inventaris Terpadu" <br/>Dikembangkan untuk efisiensi operasional internal kantor.</p>
      </div>
    </footer>
  );
}

function Notification({ message }) {
  const msgStr = String(message || "");
  const isError = msgStr.toLowerCase().includes('gagal') || msgStr.toLowerCase().includes('error') || msgStr.toLowerCase().includes('periksa');
  
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-bottom-10">
      <div className={`backdrop-blur-md text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-white/10 min-w-[320px] ${isError ? 'bg-red-600/95' : 'bg-gray-900/95'}`}>
        {isError ? <AlertCircle className="text-white" /> : (msgStr.toLowerCase().includes('berhasil') || msgStr.toLowerCase().includes('selamat') ? <CheckCircle2 className="text-emerald-400" /> : <Info className="text-amber-400" />)}
        <span className="font-bold text-sm tracking-tight text-center">{msgStr}</span>
      </div>
    </div>
  );
}

function UserDashboard({ setView, setSelectedCategory, exportToExcel }) {
  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 tracking-tight uppercase">SIKOPIFASTA</h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg italic font-medium leading-relaxed">"Sistem Kontrol Pinjam Fasilitas dan Inventaris" <br/><span className="text-sm not-italic font-normal opacity-70">Kelola peminjaman sarana prasarana kantor lebih transparan.</span></p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); setView('category_detail'); }} className={`${cat.color} ${cat.hover} text-white p-10 rounded-[2.5rem] shadow-xl flex flex-col items-center gap-6 transition-all transform hover:-translate-y-2 active:scale-95 shadow-indigo-100`}>
            <div className="bg-white/20 p-6 rounded-3xl backdrop-blur-md">{cat.icon}</div>
            <div className="text-center"><span className="text-xl font-bold block mb-1 uppercase tracking-wide">{cat.id}</span><span className="text-xs text-white/70 uppercase tracking-[0.2em] font-black">Cek Ketersediaan</span></div>
            <div className="bg-white/10 w-full py-2.5 rounded-2xl"><ChevronRight size={24} className="mx-auto" /></div>
          </button>
        ))}
      </div>
      <div className="mt-16 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10"><h3 className="font-black text-gray-900 text-xl mb-2 flex items-center gap-2"><Download className="text-indigo-600" size={24} /> Database Fasilitas</h3><p className="text-gray-500 font-medium">Unduh data inventaris terbaru dalam format Excel (.xlsx) untuk laporan.</p></div>
        <button onClick={exportToExcel} className="relative z-10 w-full md:w-auto bg-gray-900 text-white px-8 py-4 rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:bg-gray-800 transition-all shadow-lg active:scale-95 uppercase text-sm tracking-widest"><Download size={20} /> Unduh Excel</button>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
      </div>
    </div>
  );
}

function CategoryDetail({ selectedCategory, setView, data, appSettings, currentUser, showNotification }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const categoryData = data.filter(item => item.kategori === selectedCategory);
  const stats = { total: categoryData.length, available: categoryData.filter(i => i.status === 'Tersedia').length, borrowed: categoryData.filter(i => i.status === 'Dipinjam').length, damaged: categoryData.filter(i => i.status === 'Rusak').length };
  const filteredItems = categoryData.filter(item => (item.nama || "").toLowerCase().includes(searchTerm.toLowerCase()) && (statusFilter === 'Semua' ? true : item.status === statusFilter));
  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto animate-in slide-in-from-bottom-4 duration-500 text-left">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setView('user_dashboard')} className="p-3 bg-white hover:bg-gray-50 rounded-2xl border border-gray-100 shadow-sm transition-all active:scale-90 text-gray-600"><ArrowLeft size={24} /></button>
        <div><h2 className="text-2xl font-black text-gray-900 mb-1 leading-none uppercase tracking-tight">{selectedCategory}</h2><p className="text-gray-500 text-sm font-medium">Temukan fasilitas yang Anda butuhkan.</p></div>
      </div>
      <StatusInfographic stats={stats} currentFilter={statusFilter} onFilterChange={setStatusFilter} />
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} /><input type="text" placeholder={`Cari di ${selectedCategory}...`} className="w-full pl-12 pr-6 py-4 rounded-3xl border border-gray-100 shadow-sm text-lg transition-all font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        <div className="relative min-w-[200px]"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><select className="w-full pl-12 pr-6 py-4 rounded-3xl border border-gray-100 shadow-sm text-lg transition-all font-bold appearance-none bg-white cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="Semua">Semua Status</option><option value="Tersedia">Tersedia</option><option value="Dipinjam">Dipinjam</option><option value="Rusak">Rusak</option></select></div>
      </div>
      {filteredItems.length === 0 ? <div className="p-12 text-center text-gray-400 font-bold italic">Tidak ada data ditemukan.</div> : (
        <div className="grid grid-cols-1 gap-4">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:border-indigo-200 transition-all">
              <div className="flex gap-5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">{item.kategori === 'Kendaraan Dinas' ? <Car size={28}/> : item.kategori === 'Peralatan Elektronik' ? <Laptop size={28}/> : <Package size={28}/>}</div>
                <div><h4 className="font-bold text-gray-900 text-lg group-hover:text-indigo-700 transition-colors leading-tight uppercase">{item.nama}</h4><p className="text-sm text-gray-500 font-medium mt-1">{item.kategori === 'Kendaraan Dinas' ? item.noPlat : (item.kategori === 'Peralatan Elektronik' || item.kategori === 'Barang Lain' ? `${item.merek || ''} - ${item.nup || ''}` : item.spek)}</p></div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-4 sm:pt-0">
                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${item.status === 'Tersedia' ? 'bg-green-50 text-green-700 border-green-100' : item.status === 'Dipinjam' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{item.status}</span>
                 <button onClick={() => { if (currentUser) { showNotification(`Peminjaman ${item.nama} sedang diproses untuk ${currentUser.nama}.`); } else { setView('login_portal'); } }} className="bg-indigo-600 text-white px-10 py-3 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100">Pinjam</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoginPortal({ setView, users, setCurrentUser, showNotification, db, appId, firebaseUser }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const foundUser = users.find(u => u.username === identifier || u.email === identifier || u.nip === identifier);
    
    if (!foundUser) { showNotification("Username, Email, atau NIP tidak ditemukan."); return; }
    if (foundUser.password !== password) { showNotification("Kata Sandi yang dimasukkan salah."); return; }
    
    // PERBAIKAN: Gunakan setDoc dengan merge true agar Admin Master statis juga bisa menyimpan linkedUid
    if (firebaseUser) {
      try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', foundUser.username);
        await setDoc(userRef, { ...foundUser, linkedUid: firebaseUser.uid }, { merge: true });
      } catch (e) { console.error("Session linking failed", e); }
    }

    setCurrentUser(foundUser);
    if (foundUser.role === 'admin') setView('admin_panel'); else setView('user_panel');
    showNotification(`Selamat datang kembali, ${foundUser.nama}!`);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4 bg-slate-50">
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl max-w-md w-full border border-white animate-in zoom-in-95">
        <div className="text-center mb-10"><div className="bg-indigo-600 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-white shadow-xl rotate-3"><ShieldCheck size={40} /></div><h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-2 uppercase text-center">Portal Masuk</h2><p className="text-gray-400 text-sm font-medium italic text-center leading-relaxed">Gunakan Username, Email, atau NIP Anda.</p></div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kredensial Pengguna</label><div className="relative mt-1"><UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} /><input type="text" className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold shadow-inner" placeholder="Username / Email / NIP" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required /></div></div>
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kata Sandi</label><div className="relative mt-1"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} /><input type="password" className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold shadow-inner" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required /></div></div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl active:scale-95 mt-4 shadow-indigo-100 uppercase tracking-widest">Masuk Sekarang</button>
        </form>
        <div className="mt-8 flex flex-col gap-4 border-t border-gray-50 pt-8 text-center"><button onClick={() => setView('registration_portal')} className="flex items-center justify-center gap-2 text-indigo-600 font-black text-sm uppercase tracking-widest hover:text-indigo-800 transition-colors"><UserPlus size={18} /> Daftar Pengguna Baru</button><button onClick={() => showNotification("Instruksi reset sandi dikirim ke Email/WhatsApp profil.")} className="flex items-center justify-center gap-2 text-gray-400 font-bold text-sm hover:text-red-500 transition-colors uppercase tracking-widest"><KeyRound size={16} /> Lupa Password?</button></div>
        <button onClick={() => setView('user_dashboard')} className="w-full mt-10 text-gray-300 font-black hover:text-indigo-400 text-xs uppercase tracking-[0.2em] transition-colors text-center">Kembali ke Beranda</button>
      </div>
    </div>
  );
}

function RegistrationPortal({ setView, users, setUsers, showNotification, db, appId }) {
  const [formData, setFormData] = useState({ nama: '', nip: '', username: '', email: '', whatsapp: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!/^\d+$/.test(formData.whatsapp) || !formData.whatsapp.startsWith('0')) { showNotification("WA harus angka dan diawali 0."); return; }
    if (!/^\d+$/.test(formData.nip)) { showNotification("NIP harus numerik (0 jika tdk ada)."); return; }
    if (formData.password.length < 8) { showNotification("Sandi minimal 8 karakter."); return; }
    if (formData.password !== formData.confirmPassword) { showNotification("Konfirmasi sandi tidak cocok."); return; }
    if (users.some(u => u.username === formData.username || u.email === formData.email || (formData.nip !== "0" && u.nip === formData.nip))) { showNotification("Data identitas sudah terdaftar."); return; }
    try {
      const newUser = { ...formData, nama: formData.nama.toUpperCase(), role: 'user', historyTerlambat: 0, historyRusak: 0, id: Date.now().toString(), foto: null };
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', newUser.username);
      await setDoc(userRef, newUser);
      showNotification("Selamat! Registrasi Berhasil. Silakan Login.");
      setView('login_portal');
    } catch (err) { 
      showNotification(err); 
    }
  };
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4 bg-slate-50">
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl max-w-xl w-full border border-white animate-in zoom-in-95 overflow-y-auto max-h-[95vh]">
        <div className="text-center mb-8"><div className="bg-emerald-500 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 text-white shadow-lg rotate-6"><UserPlus size={32} /></div><h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight text-center">Registrasi Akun</h2><p className="text-gray-400 text-sm font-medium italic text-center">Sistem Kedisiplinan Internal SIKOPIFASTA</p></div>
        <form className="space-y-4" onSubmit={handleRegister}>
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap (Wajib)</label><input required value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value.toUpperCase()})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none font-bold uppercase" placeholder="MASUKKAN NAMA LENGKAP" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-xs">NIP (0 jika tdk ada)</label><input required type="text" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none font-bold" placeholder="19XXXXXXXXXX" /></div><div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-xs">Username (Tanpa Spasi)</label><input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.replace(/\s/g, '').toLowerCase()})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none font-bold" placeholder="usernameanda" /></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-xs">Email Kantor/Pribadi</label><input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none font-bold" placeholder="nama@email.com" /></div><div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-xs">No. WhatsApp (Awalan 0)</label><input required type="text" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none font-bold" placeholder="08XXXXXXXXXX" /></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-xs">Password</label><div className="relative"><input required type={showPass ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none font-bold pr-12" /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors">{showPass ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div><div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-xs">Konfirmasi Password</label><input required type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none font-bold" /></div></div>
          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-[1.8rem] font-black text-lg hover:bg-emerald-700 transition-all shadow-xl mt-6 uppercase tracking-[0.2em] shadow-emerald-100">Daftar Sekarang</button>
        </form>
        <button onClick={() => setView('login_portal')} className="w-full mt-6 text-gray-400 font-bold hover:text-indigo-600 transition-colors text-xs uppercase tracking-widest text-center underline">Batal / Kembali ke Login</button>
      </div>
    </div>
  );
}

function AdminPanel({ data, users, appSettings, setAppSettings, adminProfile, setAdminProfile, showNotification, setView, exportCategoryExcel, onExportUsers, onImportUsersExcel, db, appId, firebaseUser }) {
  const [adminSubView, setAdminSubView] = useState('assets'); 
  const [activeAssetTab, setActiveAssetTab] = useState('Kendaraan Dinas'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false); 
  const [editingUser, setEditingUser] = useState(null);
  const fileInputRef = useRef(null);
  const userFileInputRef = useRef(null);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('Semua');
  const [userSearch, setUserSearch] = useState(''); 
  const [formData, setFormData] = useState({ nama: '', kategori: '', status: 'Tersedia', spek: '', noPlat: '', noRangka: '', noMesin: '', kilometer: '', tglOliMesin: '', tglOliMesinNext: '', tglOliPerseneling: '', tglOliPersenelingNext: '', tglPajak: '', deskripsiRusak: '', nup: '', merek: '', peminjam: '', usernamePeminjam: '', tglPinjam: '', tglKembali: '' });
  const [userFormData, setUserFormData] = useState({ nama: '', nip: '', email: '', whatsapp: '', username: '', password: '' });
  const [addUserFormData, setAddUserFormData] = useState({ nama: '', nip: '', email: '', whatsapp: '', username: '' });

  const openModal = (item = null) => { 
    if (item) { 
      setEditingItem(item); 
      setFormData({ ...item, status: item.status || 'Tersedia' }); 
    } else { 
      setEditingItem(null); 
      setFormData({ nama: activeAssetTab === 'Peralatan Elektronik' ? ELEKTRONIK_OPTIONS[0] : '', kategori: activeAssetTab, status: 'Tersedia', spek: '', noPlat: '', noRangka: '', noMesin: '', kilometer: '', tglOliMesin: '', tglOliMesinNext: '', tglOliPerseneling: '', tglOliPersenelingNext: '', tglPajak: '', deskripsiRusak: '', nup: '', merek: '', peminjam: '', usernamePeminjam: '', tglPinjam: '', tglKembali: '' }); 
    } 
    setIsModalOpen(true); 
  };

  const closeModal = () => { setIsModalOpen(false); setEditingItem(null); };
  const openDetailModal = (item) => { setSelectedDetailItem(item); setIsDetailModalOpen(true); };
  const closeDetailModal = () => { setIsDetailModalOpen(false); setSelectedDetailItem(null); };
  
  const handleAddOrEdit = async (e) => { 
    e.preventDefault(); 
    if (!firebaseUser) {
      showNotification("Gagal: Anda belum terautentikasi ke database.");
      return;
    }
    const id = editingItem ? editingItem.id : `asset-${Date.now()}`;
    const finalData = { ...formData, kategori: activeAssetTab, id: id }; 
    try {
      const assetRef = doc(db, 'artifacts', appId, 'public', 'data', 'assets', id);
      await setDoc(assetRef, finalData, { merge: true });
      showNotification(editingItem ? "Data fasilitas berhasil diperbarui!" : "Data fasilitas baru berhasil ditambahkan!");
      closeModal(); 
    } catch (err) {
      showNotification(err);
    }
  };

  const handleDeleteAsset = async (itemId) => {
    if (!firebaseUser) return;
    try {
      const assetRef = doc(db, 'artifacts', appId, 'public', 'data', 'assets', itemId);
      await deleteDoc(assetRef);
      showNotification("Data fasilitas berhasil dihapus.");
    } catch (err) {
      showNotification(err);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!firebaseUser) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.username));
      showNotification(`User ${u.nama} berhasil dihapus.`);
    } catch (err) { 
      showNotification(err); 
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 animate-in slide-in-from-bottom-2">
      <div className="flex flex-wrap bg-white p-2 rounded-3xl shadow-sm border border-gray-100 mb-8 w-full sm:w-max gap-1 text-left">
        <button onClick={() => setAdminSubView('assets')} className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${adminSubView === 'assets' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><LayoutGrid size={18} /> Inventaris</button>
        <button onClick={() => setAdminSubView('users')} className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${adminSubView === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Users size={18} /> Pengguna</button>
        <button onClick={() => setAdminSubView('profile')} className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${adminSubView === 'profile' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><UserCircle size={18} /> Profil</button>
        <button onClick={() => setAdminSubView('settings')} className={`flex-1 sm:flex-none flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${adminSubView === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Settings size={18} /> Sistem</button>
      </div>

      {adminSubView === 'assets' ? (
        <AdminAssetsSection activeAssetTab={activeAssetTab} setActiveAssetTab={setActiveAssetTab} data={data} openModal={openModal} openDetailModal={openDetailModal} showNotification={showNotification} adminSearch={adminSearch} setAdminSearch={setAdminSearch} adminStatusFilter={adminStatusFilter} setAdminStatusFilter={setAdminStatusFilter} exportCategoryExcel={exportCategoryExcel} onImportClick={() => fileInputRef.current?.click()} appSettings={appSettings} onDelete={handleDeleteAsset} />
      ) : adminSubView === 'users' ? (
        <AdminUsersSection users={users} data={data} userSearch={userSearch} setUserSearch={setUserSearch} onAddClick={() => setIsAddUserModalOpen(true)} onEdit={(u) => { setEditingUser(u); setUserFormData({nama: u.nama, nip: u.nip, email: u.email, whatsapp: u.whatsapp, username: u.username, password: u.password}); setIsUserModalOpen(true); }} onReset={(u) => { showNotification(`Password ${u.nama} direset ke password123`); }} onDelete={handleDeleteUser} onExportUsers={onExportUsers} onImportUsers={() => userFileInputRef.current?.click()} />
      ) : adminSubView === 'profile' ? (
        <AdminProfileSection adminProfile={adminProfile} setAdminProfile={setAdminProfile} showNotification={showNotification} />
      ) : (
        <AppSettingsSection appSettings={appSettings} setAppSettings={setAppSettings} showNotification={showNotification} />
      )}

      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={async (e) => { 
        const file = e.target.files[0]; 
        if (!file || typeof window.XLSX === 'undefined') return; 
        const reader = new FileReader(); 
        reader.onload = async (evt) => { 
          const wb = window.XLSX.read(evt.target.result, { type: 'binary' }); 
          const ws = wb.Sheets[wb.SheetNames[0]]; 
          const importedData = window.XLSX.utils.sheet_to_json(ws); 
          showNotification(`Mengunggah ${importedData.length} data ke database...`);
          try {
            for (let item of importedData) {
              const id = item.id || `imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'assets', id), { ...item, id, kategori: activeAssetTab }, { merge: true });
            }
            showNotification(`Impor data ke ${activeAssetTab} berhasil!`); 
          } catch (err) {
            showNotification(err);
          }
          e.target.value = null; 
        }; 
        reader.readAsBinaryString(file); 
      }} />
      <input type="file" ref={userFileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={onImportUsersExcel} />
      
      {isAddUserModalOpen && <AddUserModal onSubmit={async (e) => { 
          e.preventDefault(); 
          if (!firebaseUser) return;
          if (users.some(u => u.username === addUserFormData.username)) { showNotification("Username sudah digunakan!"); return; }
          try {
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', addUserFormData.username);
            await setDoc(userRef, { ...addUserFormData, role: 'user', password: 'password123', historyTerlambat: 0, historyRusak: 0 });
            setIsAddUserModalOpen(false); 
            showNotification(`Pengguna baru ${addUserFormData.nama} ditambahkan!`); 
          } catch (err) {
            showNotification(err);
          }
        }} users={users} onClose={() => setIsAddUserModalOpen(false)} formData={addUserFormData} setFormData={setAddUserFormData} />}
      {isUserModalOpen && <EditUserModal onClose={() => setIsUserModalOpen(false)} formData={userFormData} setFormData={setUserFormData} editingUser={editingUser} showNotification={showNotification} db={db} appId={appId} />}
      {isModalOpen && <AssetModal activeAssetTab={activeAssetTab} editingItem={editingItem} formData={formData} setFormData={setFormData} closeModal={closeModal} handleAddOrEdit={handleAddOrEdit} />}
      {isDetailModalOpen && <AssetDetailModal selectedDetailItem={selectedDetailItem} closeDetailModal={closeDetailModal} />}
    </div>
  );
}

// ============= SUB COMPONENT DEFINITIONS =============

function AdminAssetsSection({ activeAssetTab, setActiveAssetTab, data, openModal, openDetailModal, showNotification, adminSearch, setAdminSearch, adminStatusFilter, setAdminStatusFilter, exportCategoryExcel, onImportClick, appSettings, onDelete }) {
  const categoryData = data.filter(item => item.kategori === activeAssetTab);
  const stats = { total: categoryData.length, available: categoryData.filter(i => i.status === 'Tersedia').length, borrowed: categoryData.filter(i => i.status === 'Dipinjam').length, damaged: categoryData.filter(i => i.status === 'Rusak').length };
  
  const filteredAndSortedData = categoryData.filter(item => {
    const searchString = adminSearch.toLowerCase();
    const matchSearch = (item.nama || "").toLowerCase().includes(searchString) || (item.noPlat && item.noPlat.toLowerCase().includes(searchString)) || (item.nup && item.nup.toLowerCase().includes(searchString)) || (item.merek && item.merek.toLowerCase().includes(searchString)) || (item.peminjam && item.peminjam.toLowerCase().includes(searchString));
    const matchStatus = adminStatusFilter === 'Semua' ? true : item.status === adminStatusFilter;
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    if (a.status === 'Dipinjam' && b.status !== 'Dipinjam') return -1;
    if (a.status !== 'Dipinjam' && b.status === 'Dipinjam') return 1;
    if (a.tglKembali && b.tglKembali) return a.tglKembali.localeCompare(b.tglKembali);
    return 0;
  });

  const checkOverdue = (item) => {
    if (item.status !== 'Dipinjam' || !item.tglKembali) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const returnDate = new Date(item.tglKembali);
    return returnDate < today;
  };

  return (
    <div className="animate-in fade-in text-left">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div><h2 className="text-2xl font-black text-gray-900 mb-1 uppercase tracking-tight">Inventaris Kantor</h2><p className="text-gray-500 text-sm font-medium italic">Kategori: <span className="text-indigo-600 font-bold uppercase">{activeAssetTab}</span></p></div>
        <div className="flex flex-wrap gap-3"><button onClick={onImportClick} className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 border border-emerald-100 px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all text-xs uppercase tracking-widest"><Upload size={18} /> Unggah</button><button onClick={() => exportCategoryExcel(activeAssetTab)} className="flex-1 sm:flex-none bg-blue-50 text-blue-700 border border-blue-100 px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-all text-xs uppercase tracking-widest"><Download size={18} /> Unduh</button><button onClick={() => openModal()} className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl uppercase tracking-widest text-xs"><Plus size={20} /> Tambah</button></div>
      </div>
      <div className="flex flex-wrap gap-2 mb-6 p-1.5 bg-gray-100/50 rounded-2xl w-full sm:w-max">{CATEGORIES.map((cat) => (<button key={cat.id} onClick={() => { setActiveAssetTab(cat.id); setAdminSearch(''); setAdminStatusFilter('Semua'); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all uppercase tracking-wider ${activeAssetTab === cat.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}>{cat.id === 'Kendaraan Dinas' ? <Car size={16}/> : cat.id === 'Peralatan Elektronik' ? <Laptop size={16}/> : <Package size={16}/>}{cat.id}</button>))}</div>
      <StatusInfographic stats={stats} currentFilter={adminStatusFilter} onFilterChange={setAdminStatusFilter} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"><div className="md:col-span-2 relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder={`Cari nama, plat, NUP, atau peminjam...`} className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold shadow-sm" value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} /></div><div className="relative"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><select className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold shadow-sm appearance-none cursor-pointer" value={adminStatusFilter} onChange={(e) => setAdminStatusFilter(e.target.value)}><option value="Semua">Semua Status</option><option value="Tersedia">Tersedia</option><option value="Dipinjam">Dipinjam</option><option value="Rusak">Rusak</option></select></div></div>
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1200px]">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest w-64">Detail Barang</th>
                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest">Peminjam</th>
                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest">Tgl Pinjam</th>
                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest">Tgl Kembali</th>
                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAndSortedData.map(item => {
                const isOverdue = checkOverdue(item);
                return (
                  <tr key={item.id} className={`transition-colors ${isOverdue ? 'bg-red-50/70' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-5 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {item.kategori === 'Kendaraan Dinas' ? <Car size={20}/> : item.kategori === 'Peralatan Elektronik' ? <Laptop size={20}/> : <Package size={20}/>}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 uppercase">{item.nama}</div>
                        <div className="text-[10px] text-gray-400">{item.noPlat || item.nup}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-bold text-gray-800 uppercase text-xs">{item.peminjam || '-'}</td>
                    <td className="px-6 py-5 text-gray-500">{item.tglPinjam || '-'}</td>
                    <td className="px-6 py-5">
                       <span className={`font-bold ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>{item.tglKembali || '-'}</span>
                       {isOverdue && <span className="block text-[8px] font-black uppercase text-red-500 tracking-tighter mt-0.5">TERLAMBAT</span>}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${item.status === 'Tersedia' ? 'bg-green-50 text-green-700' : item.status === 'Dipinjam' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => openDetailModal(item)} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-lg"><FileText size={18}/></button>
                      <button onClick={() => openModal(item)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><Edit size={18}/></button>
                      <button onClick={() => onDelete(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
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

function AdminUsersSection({ users, data, userSearch, setUserSearch, onAddClick, onEdit, onReset, onDelete, onExportUsers, onImportUsers }) {
  const filteredUsers = users.filter(u => (u.nama || "").toLowerCase().includes(userSearch.toLowerCase()) || (u.username || "").toLowerCase().includes(userSearch.toLowerCase()) || (u.nip || "").includes(userSearch));
  
  return (
    <div className="animate-in fade-in text-left">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div><h2 className="text-2xl font-black text-gray-900 mb-1 uppercase tracking-tight">Manajemen Pengguna</h2><p className="text-gray-400 text-sm font-medium italic">Total: <span className="text-indigo-600 font-bold">{users.length} Pegawai</span></p></div>
        <div className="flex flex-wrap gap-3">
          <button onClick={onImportUsers} className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 border border-emerald-100 px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all text-xs uppercase tracking-widest"><Upload size={18} /> Restore</button>
          <button onClick={onExportUsers} className="flex-1 sm:flex-none bg-blue-50 text-blue-700 border border-blue-100 px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-all text-xs uppercase tracking-widest"><Database size={18} /> Backup</button>
          <button onClick={onAddClick} className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl uppercase tracking-widest text-xs"><UserPlus size={20} /> Tambah User</button>
        </div>
      </div>
      <div className="relative mb-6"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Cari berdasarkan nama, NIP, atau username..." className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold shadow-sm" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} /></div>
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1000px]">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest">Identitas Pegawai</th>
                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest">NIP / Username</th>
                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest">Kontak / Email</th>
                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 overflow-hidden shrink-0 border border-indigo-200">
                      {u.foto ? <img src={u.foto} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-indigo-400" />}
                    </div>
                    <div><div className="font-bold text-gray-900 uppercase">{u.nama}</div><div className="text-[10px] text-gray-400 font-bold italic">Tergabung: {u.role}</div></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-700">{u.nip}</div>
                    <div className="text-xs text-indigo-600 font-bold">@{u.username}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5"><Phone size={12}/> {u.whatsapp}</div>
                    <div className="flex items-center gap-1.5"><Mail size={12}/> {u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button onClick={() => onReset(u)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg" title="Reset Password"><RotateCcw size={18}/></button>
                    <button onClick={() => onEdit(u)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg" title="Edit Profil"><Edit size={18}/></button>
                    <button onClick={() => onDelete(u.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="Hapus User"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminProfileSection({ adminProfile, setAdminProfile, showNotification }) {
  const [formData, setFormData] = useState({ ...adminProfile });
  const handleUpdate = (e) => {
    e.preventDefault();
    setAdminProfile({...formData, nama: formData.nama.toUpperCase()});
    showNotification("Profil admin berhasil diperbarui!");
  };

  return (
    <div className="animate-in fade-in max-w-2xl mx-auto text-left">
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-8">
        <div className="flex flex-col items-center mb-8">
           <div className="relative group">
              <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-50 border-4 border-indigo-100 overflow-hidden shadow-inner">
                {formData.foto ? <img src={formData.foto} className="w-full h-full object-cover" /> : <UserCircle size={100} className="text-indigo-200 mt-2 mx-auto" />}
              </div>
              <button className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-lg border border-gray-100 text-indigo-600 hover:scale-110 transition-transform"><Camera size={18}/></button>
           </div>
           <h2 className="text-xl font-black mt-4 uppercase tracking-tight">{adminProfile.nama}</h2>
           <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mt-1 italic">Master Administrator</p>
        </div>
        <form onSubmit={handleUpdate} className="space-y-4">
           <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label><input value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none outline-none font-bold uppercase" /></div>
           <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NIP Pegawai</label><input value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none outline-none font-bold" /></div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label><input disabled value={formData.username} className="w-full px-5 py-3.5 bg-gray-100 rounded-2xl border-none outline-none font-bold text-gray-400 cursor-not-allowed" /></div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label><input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none outline-none font-bold" /></div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label><input value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none outline-none font-bold" /></div>
           </div>
           <div className="pt-4 border-t border-dashed">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Foto Profil (URL)</label>
              <input value={formData.foto || ''} onChange={e => setFormData({...formData, foto: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none outline-none font-bold text-xs" placeholder="https://..." />
           </div>
           <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all mt-4 flex items-center justify-center gap-2"><Save size={20}/> Simpan Perubahan</button>
        </form>
      </div>
    </div>
  );
}

function AppSettingsSection({ appSettings, setAppSettings, showNotification }) {
  const [formData, setFormData] = useState({ ...appSettings });
  const handleSave = (e) => {
    e.preventDefault();
    setAppSettings(formData);
    showNotification("Konfigurasi sistem berhasil disimpan!");
  };

  return (
    <div className="animate-in fade-in max-w-2xl mx-auto text-left">
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
        <div className="flex items-center gap-4 mb-8">
           <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600"><Globe size={24}/></div>
           <div><h2 className="text-xl font-black uppercase tracking-tight leading-none mb-1">Konfigurasi Sinkronisasi</h2><p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Tautkan Google Sheets ke Sistem</p></div>
        </div>
        <form onSubmit={handleSave} className="space-y-6">
           <div className="p-6 bg-slate-50 rounded-3xl space-y-4">
              <div><label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">DB Kendaraan Dinas (XLSX Link)</label><input value={formData.linkDbKendaraan} onChange={e => setFormData({...formData, linkDbKendaraan: e.target.value})} className="w-full px-5 py-3 bg-white rounded-xl border border-gray-100 outline-none font-bold text-xs mt-1" placeholder="https://docs.google.com/spreadsheets/d/..." /></div>
              <div><label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">DB Peralatan Elektronik</label><input value={formData.linkDbElektronik} onChange={e => setFormData({...formData, linkDbElektronik: e.target.value})} className="w-full px-5 py-3 bg-white rounded-xl border border-gray-100 outline-none font-bold text-xs mt-1" placeholder="https://docs.google.com/spreadsheets/d/..." /></div>
              <div><label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">DB Barang Lain</label><input value={formData.linkDbBarangLain} onChange={e => setFormData({...formData, linkDbBarangLain: e.target.value})} className="w-full px-5 py-3 bg-white rounded-xl border border-gray-100 outline-none font-bold text-xs mt-1" placeholder="https://docs.google.com/spreadsheets/d/..." /></div>
              <div><label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">DB Backup Pengguna</label><input value={formData.linkDbUsers} onChange={e => setFormData({...formData, linkDbUsers: e.target.value})} className="w-full px-5 py-3 bg-white rounded-xl border border-gray-100 outline-none font-bold text-xs mt-1" placeholder="https://docs.google.com/spreadsheets/d/..." /></div>
           </div>
           <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-4">
              <Info className="text-indigo-600 shrink-0" size={20}/>
              <p className="text-xs text-indigo-800 font-medium leading-relaxed">Pastikan tautan Google Sheets memiliki izin akses **"Anyone with the link"** sebagai **"Viewer"** agar sistem dapat mengekspor data secara otomatis.</p>
           </div>
           <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"><Save size={20}/> Terapkan Tautan</button>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ onClose, formData, setFormData, editingUser, showNotification, db, appId }) {
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', editingUser.username);
      await setDoc(userRef, { ...editingUser, ...formData, nama: formData.nama.toUpperCase() }, { merge: true });
      showNotification(`Data ${formData.nama} berhasil diperbarui!`);
      onClose();
    } catch (e) { 
      showNotification(e); 
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 text-left"><div className="flex items-center gap-3"><Edit className="text-indigo-600" /><h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Edit Data Pengguna</h3></div><button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X /></button></div>
        <form onSubmit={handleUpdate} className="p-8 space-y-4 text-left">
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label><input required value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value.toUpperCase()})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none font-bold uppercase" /></div>
          <div className="grid grid-cols-2 gap-4">
             <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NIP</label><input required value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none font-bold" /></div>
             <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label><input disabled value={formData.username} className="w-full px-5 py-4 bg-gray-100 border-none rounded-2xl outline-none font-bold text-gray-400 cursor-not-allowed" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label><input required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none font-bold" /></div>
             <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label><input required value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none font-bold" /></div>
          </div>
          <div className="flex gap-4 pt-6"><button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">Batal</button><button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold">Simpan</button></div>
        </form>
      </div>
    </div>
  );
}

function AddUserModal({ onSubmit, users, onClose, formData, setFormData }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 text-left"><div className="flex items-center gap-3"><UserPlus className="text-indigo-600" /><h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Tambah Pengguna Baru</h3></div><button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X /></button></div>
        <form onSubmit={onSubmit} className="p-8 space-y-4 text-left">
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label><input required value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value.toUpperCase()})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold uppercase" /></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NIP</label><input required value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none font-bold" /></div><div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label><input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none font-bold" /></div></div>
          <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label><input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl outline-none font-bold" /></div>
          <div className="flex gap-4 pt-6"><button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">Batal</button><button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold">Tambah</button></div>
        </form>
      </div>
    </div>
  );
}

function AssetModal({ activeAssetTab, editingItem, formData, setFormData, closeModal, handleAddOrEdit }) {
  const isVehicle = activeAssetTab === 'Kendaraan Dinas';
  const isElectronic = activeAssetTab === 'Peralatan Elektronik';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 text-left">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl text-white ${isVehicle ? 'bg-indigo-600' : isElectronic ? 'bg-emerald-600' : 'bg-amber-600'}`}>
              {isVehicle ? <Car size={24} /> : isElectronic ? <Laptop size={24} /> : <Package size={24} />}
            </div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{editingItem ? 'Edit' : 'Tambah'} {activeAssetTab}</h3>
          </div>
          <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"><X /></button>
        </div>
        <form onSubmit={handleAddOrEdit} className="p-8 space-y-6 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!isVehicle && (
              <div className="space-y-2"><label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Kode NUP</label><input required value={formData.nup || ''} onChange={e => setFormData({...formData, nup: e.target.value})} className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold" placeholder="LNN-XXXX" /></div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nama {isVehicle ? 'Kendaraan' : isElectronic ? 'Alat' : 'Barang'}</label>
              {isElectronic ? (
                <select value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full px-4 py-4 bg-gray-50 rounded-2xl outline-none font-bold">
                  <option value="">-- Pilih --</option>
                  {ELEKTRONIK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input required value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold" placeholder="Contoh: Toyota Avanza" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-4 bg-gray-50 rounded-2xl outline-none font-bold"><option value="Tersedia">Tersedia</option><option value="Dipinjam">Dipinjam</option><option value="Rusak">Rusak</option></select></div>
            {formData.status === 'Rusak' && (
              <div className="space-y-2 animate-in slide-in-from-top-2"><label className="text-xs font-black text-red-500 uppercase tracking-widest ml-1">Deskripsi Kerusakan</label><textarea required value={formData.deskripsiRusak || ''} onChange={e => setFormData({...formData, deskripsiRusak: e.target.value})} className="w-full px-5 py-3 bg-red-50 rounded-2xl outline-none font-bold border border-red-100 h-24" placeholder="Sebutkan detail kerusakan..." /></div>
            )}
          </div>

          {formData.status === 'Dipinjam' && (
            <div className="p-6 bg-orange-50 rounded-3xl space-y-4 border border-orange-100 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-2"><Clock className="text-orange-600" size={18}/><span className="text-xs font-black text-orange-900 uppercase tracking-widest">Informasi Peminjaman</span></div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Peminjam</label>
                <input required value={formData.peminjam || ''} onChange={e => setFormData({...formData, peminjam: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-white rounded-xl outline-none font-bold border border-orange-200" placeholder="MASUKKAN NAMA PEMINJAM" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tanggal Pinjam</label>
                  <input required type="date" value={formData.tglPinjam || ''} onChange={e => setFormData({...formData, tglPinjam: e.target.value})} className="w-full px-5 py-3 bg-white rounded-xl outline-none font-bold border border-orange-200" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tanggal Kembali</label>
                  <input required type="date" value={formData.tglKembali || ''} onChange={e => setFormData({...formData, tglKembali: e.target.value})} className="w-full px-5 py-3 bg-white rounded-xl outline-none font-bold border border-orange-200" />
                </div>
              </div>
            </div>
          )}

          {isVehicle && (
            <div className="space-y-6 pt-4 border-t border-dashed">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nomor Plat</label><input required value={formData.noPlat || ''} onChange={e => setFormData({...formData, noPlat: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none font-bold font-mono" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Rangka</label><input value={formData.noRangka || ''} onChange={e => setFormData({...formData, noRangka: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. Mesin</label><input value={formData.noMesin || ''} onChange={e => setFormData({...formData, noMesin: e.target.value})} className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" /></div>
              </div>
              <div className="p-6 bg-indigo-50/50 rounded-3xl space-y-4 border border-indigo-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Tanggal Ganti Oli Mesin</label><input type="date" value={formData.tglOliMesin || ''} onChange={e => setFormData({...formData, tglOliMesin: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold text-xs border border-indigo-100" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Tanggal Ganti Oli Mesin Berikutnya</label><input type="date" value={formData.tglOliMesinNext || ''} onChange={e => setFormData({...formData, tglOliMesinNext: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold text-xs border border-indigo-100" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Tanggal Ganti Oli Perseneling</label><input type="date" value={formData.tglOliPerseneling || ''} onChange={e => setFormData({...formData, tglOliPerseneling: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold text-xs border border-indigo-100" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Tanggal Ganti Oli Perseneling Berikutnya</label><input type="date" value={formData.tglOliPersenelingNext || ''} onChange={e => setFormData({...formData, tglOliPersenelingNext: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold text-xs border border-indigo-100" /></div>
                </div>
                <div className="space-y-2"><label className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Tanggal Bayar Pajak Berikutnya</label><input type="date" value={formData.tglPajak || ''} onChange={e => setFormData({...formData, tglPajak: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold text-xs border border-amber-100" /></div>
              </div>
            </div>
          )}

          {!isVehicle && (
            <div className="grid grid-cols-1 gap-6 pt-4 border-t border-dashed">
              <div className="space-y-2"><label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Merek</label><input required value={formData.merek || ''} onChange={e => setFormData({...formData, merek: e.target.value})} className="w-full px-5 py-3 bg-gray-50 rounded-2xl outline-none font-bold" placeholder="Contoh: Epson / MacBook" /></div>
              <div className="space-y-2"><label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Spesifikasi Detail</label><textarea value={formData.spek || ''} onChange={e => setFormData({...formData, spek: e.target.value})} className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold h-32" placeholder="Masukkan spesifikasi lengkap..." /></div>
            </div>
          )}

          <div className="flex gap-4 pt-6"><button type="button" onClick={closeModal} className="flex-1 py-4 rounded-2xl font-bold bg-gray-100 uppercase tracking-widest text-xs">Batal</button><button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Simpan Data</button></div>
        </form>
      </div>
    </div>
  );
}

function AssetDetailModal({ selectedDetailItem, closeDetailModal }) {
  if (!selectedDetailItem) return null;
  const isVehicle = selectedDetailItem.kategori === 'Kendaraan Dinas';
  const isElectronic = selectedDetailItem.kategori === 'Peralatan Elektronik';
  const themeColor = isVehicle ? 'bg-indigo-600' : isElectronic ? 'bg-emerald-600' : 'bg-amber-600';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className={`p-8 border-b border-gray-100 flex items-center justify-between ${themeColor} text-white`}>
          <div className="flex items-center gap-3 text-left">
            <div className="bg-white/20 p-2 rounded-xl">{isVehicle ? <Car size={24} /> : isElectronic ? <Laptop size={24} /> : <Package size={24} />}</div>
            <div><h3 className="text-xl font-black uppercase tracking-tight leading-none mb-1">Rincian Unit</h3><p className="text-white/80 text-[10px] uppercase">Informasi Detail Aset</p></div>
          </div>
          <button onClick={closeDetailModal} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X /></button>
        </div>
        <div className="p-8 overflow-y-auto space-y-8 text-left">
          <div className="p-6 bg-slate-50 rounded-3xl border border-gray-100">
            <h2 className="text-3xl font-black text-slate-900 uppercase leading-tight">{selectedDetailItem.nama}</h2>
            <div className="flex items-center gap-2 mt-2">
              <div className={`${themeColor} text-white px-4 py-1 rounded-lg font-mono font-bold`}>{selectedDetailItem.noPlat || selectedDetailItem.nup || '-'}</div>
              <span className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase bg-white border border-gray-200`}>{selectedDetailItem.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              <h4 className="font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2"><ClipboardList size={16} /> Identitas Fisik</h4>
              <div className="space-y-2">
                {isVehicle ? (
                  <>
                    <div className="flex justify-between"><span>No. Rangka:</span><span className="font-bold font-mono text-[10px]">{selectedDetailItem.noRangka || '-'}</span></div>
                    <div className="flex justify-between"><span>No. Mesin:</span><span className="font-bold font-mono text-[10px]">{selectedDetailItem.noMesin || '-'}</span></div>
                    <div className="flex justify-between"><span>Kilometer:</span><span className="font-bold text-indigo-600">{selectedDetailItem.kilometer || '0'} KM</span></div>
                    <div className="flex justify-between border-t pt-2 mt-2 text-[10px]"><span>Tgl Oli Mesin:</span><span className="font-bold">{selectedDetailItem.tglOliMesin || '-'}</span></div>
                    <div className="flex justify-between text-indigo-600 text-[10px]"><span>Oli Mesin Next:</span><span className="font-bold">{selectedDetailItem.tglOliMesinNext || '-'}</span></div>
                    <div className="flex justify-between border-t pt-2 text-[10px]"><span>Tgl Oli Perseneling:</span><span className="font-bold">{selectedDetailItem.tglOliPerseneling || '-'}</span></div>
                    <div className="flex justify-between text-indigo-600 text-[10px]"><span>Oli Perseneling Next:</span><span className="font-bold">{selectedDetailItem.tglOliPersenelingNext || '-'}</span></div>
                    <div className="flex justify-between border-t pt-2 text-amber-600 text-[10px]"><span>Bayar Pajak Next:</span><span className="font-bold">{selectedDetailItem.tglPajak || '-'}</span></div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between"><span>Kode NUP:</span><span className="font-bold">{selectedDetailItem.nup || '-'}</span></div>
                    <div className="flex justify-between"><span>Merek:</span><span className="font-bold uppercase">{selectedDetailItem.merek || '-'}</span></div>
                  </>
                )}
                <div className="flex justify-between"><span>Kategori:</span><span className="font-bold uppercase text-[10px]">{selectedDetailItem.kategori}</span></div>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <h4 className="font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2"><Wrench size={16} /> Spesifikasi</h4>
              <div className="p-3 bg-slate-50 rounded-xl italic text-xs leading-relaxed">{selectedDetailItem.spek || 'Tidak ada spesifikasi tambahan.'}</div>
            </div>
          </div>

          {selectedDetailItem.status === 'Dipinjam' && (
            <div className="bg-orange-50 p-5 rounded-3xl border border-orange-100 animate-in fade-in">
               <h4 className="text-sm font-black text-orange-700 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-orange-200 pb-2"><UserCheck size={18} /> Informasi Peminjam</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><p className="text-[10px] text-orange-400 font-black uppercase">Peminjam</p><p className="font-bold text-orange-900 uppercase">{selectedDetailItem.peminjam || '-'}</p></div>
                 <div className="flex gap-4">
                    <div><p className="text-[10px] text-orange-400 font-black uppercase">Tgl Pinjam</p><p className="font-bold text-orange-900">{selectedDetailItem.tglPinjam || '-'}</p></div>
                    <div><p className="text-[10px] text-orange-400 font-black uppercase">Tgl Kembali</p><p className="font-bold text-orange-900">{selectedDetailItem.tglKembali || '-'}</p></div>
                 </div>
               </div>
            </div>
          )}

          {selectedDetailItem.status === 'Rusak' && (
            <div className="bg-red-50 p-5 rounded-3xl border border-red-100 animate-in fade-in">
               <h4 className="text-sm font-black text-red-700 uppercase tracking-widest mb-2 flex items-center gap-2"><AlertCircle size={18} /> Detail Kerusakan</h4>
               <p className="text-red-900 font-medium italic text-xs leading-relaxed">"{selectedDetailItem.deskripsiRusak || 'Keterangan belum diisi.'}"</p>
            </div>
          )}
        </div>
        <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end"><button onClick={closeDetailModal} className={`${themeColor} text-white px-10 py-4 rounded-[1.8rem] font-black uppercase text-xs shadow-lg transition-all active:scale-95`}>Tutup Rincian</button></div>
      </div>
    </div>
  );
}
