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
    kilometer: '15420',
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

// ==========================================
// 2. KOMPONEN UTAMA (APP)
// ==========================================
export default function App() {
  const [view, setView] = useState('user_dashboard'); 
  const [data, setData] = useState([]); 
  const [users, setUsers] = useState(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [selectedLoanItem, setSelectedLoanItem] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // AUTHENTICATION LOGIC (Persistence)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Auth failed:", e); }
      finally { setIsLoadingAuth(false); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  // REAL-TIME USERS SYNC
  useEffect(() => {
    if (!firebaseUser) return;
    const usersCol = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsubscribe = onSnapshot(usersCol, (snapshot) => {
      const usersFromDb = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      const combined = [...usersFromDb];
      INITIAL_USERS.forEach(iu => {
        if (!combined.find(u => u.username === iu.username)) combined.push(iu);
      });
      setUsers(combined);
    }, (err) => console.error("Sync Users Error:", err));
    return () => unsubscribe();
  }, [firebaseUser]);

  // SESSION RESTORATION (Auto Login on Refresh)
  useEffect(() => {
    if (!firebaseUser || currentUser || isLoadingAuth || users.length === 0) return;
    const savedUser = users.find(u => u.linkedUid === firebaseUser.uid);
    if (savedUser) {
      setCurrentUser(savedUser);
      if (savedUser.role === 'admin') setView('admin_panel');
      else setView('user_panel');
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
    }, (err) => console.error("Sync Assets Error:", err));
    return () => unsubscribe();
  }, [firebaseUser]);

  const showNotification = (msg) => {
    const messageText = typeof msg === 'string' ? msg : (msg?.message || "Sistem diperbarui.");
    setNotification(messageText);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogout = async () => {
    if (currentUser && firebaseUser) {
      try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.username);
        await setDoc(userRef, { linkedUid: null }, { merge: true });
      } catch (e) { console.error(e); }
    }
    setCurrentUser(null);
    setView('user_dashboard');
    showNotification("Berhasil keluar sistem.");
  };

  const handleLoanSubmit = async (loanDetails) => {
    if (!firebaseUser || !selectedLoanItem) return;
    try {
      const assetRef = doc(db, 'artifacts', appId, 'public', 'data', 'assets', selectedLoanItem.id);
      await setDoc(assetRef, {
        ...selectedLoanItem,
        status: 'Dipinjam',
        peminjam: currentUser.nama,
        usernamePeminjam: currentUser.username,
        tglPinjam: loanDetails.tglPinjam,
        tglKembali: loanDetails.tglKembali
      }, { merge: true });
      setIsLoanModalOpen(false);
      showNotification(`Berhasil meminjam ${selectedLoanItem.nama}!`);
    } catch (err) {
      showNotification("Gagal memproses peminjaman.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans flex flex-col">
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
            {view === 'user_dashboard' && <UserDashboard setView={setView} setSelectedCategory={setSelectedCategory} />}
            {view === 'category_detail' && <CategoryDetail selectedCategory={selectedCategory} setView={setView} data={data} currentUser={currentUser} onLoanClick={(item) => { setSelectedLoanItem(item); setIsLoanModalOpen(true); }} />}
            {view === 'login_portal' && <LoginPortal setView={setView} users={users} setCurrentUser={setCurrentUser} showNotification={showNotification} db={db} appId={appId} firebaseUser={firebaseUser} />}
            {view === 'registration_portal' && <RegistrationPortal setView={setView} users={users} showNotification={showNotification} db={db} appId={appId} />}
            {view === 'admin_panel' && currentUser?.role === 'admin' && (
              <AdminPanel data={data} users={users} adminProfile={currentUser} setAdminProfile={setCurrentUser} showNotification={showNotification} setView={setView} db={db} appId={appId} firebaseUser={firebaseUser} />
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

      {isLoanModalOpen && selectedLoanItem && (
        <LoanModal item={selectedLoanItem} user={currentUser} onClose={() => setIsLoanModalOpen(false)} onSubmit={handleLoanSubmit} />
      )}

      {isProfileModalOpen && (
        <UserProfileModal currentUser={currentUser} setCurrentUser={setCurrentUser} onClose={() => setIsProfileModalOpen(false)} showNotification={showNotification} db={db} appId={appId} />
      )}

      {notification && <Notification message={notification} />}
      <Footer />
    </div>
  );
}

// ==========================================
// 3. SUB-KOMPONEN UI
// ==========================================

function LoanModal({ item, user, onClose, onSubmit }) {
  const today = new Date().toISOString().split('T')[0];
  const [loanDetails, setLoanDetails] = useState({ tglPinjam: today, tglKembali: today });
  const isVehicle = item.kategori === 'Kendaraan Dinas';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden text-left animate-in zoom-in-95">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-xl text-orange-600"><Clock size={24} /></div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Formulir Pinjam</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(loanDetails); }} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Peminjam</label>
            <input disabled value={user?.nama || ''} className="w-full px-5 py-4 bg-gray-100 border-none rounded-2xl font-bold text-gray-500 cursor-not-allowed uppercase" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tanggal Pinjam</label>
              <input type="date" required value={loanDetails.tglPinjam} onChange={e => setLoanDetails({...loanDetails, tglPinjam: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tanggal Kembali</label>
              <input type="date" required value={loanDetails.tglKembali} onChange={e => setLoanDetails({...loanDetails, tglKembali: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold" />
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-dashed">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fasilitas / Barang</label>
            <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100">
               <p className="font-black text-indigo-600 uppercase text-lg">{item.nama}</p>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.noPlat || item.nup || 'Tanpa Kode ID'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rincian Deskripsi</label>
            <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100 text-xs italic text-gray-600 leading-relaxed">
               {isVehicle && <p className="mb-2 font-bold text-orange-600">Kilometer Odometer Saat Ini: {item.kilometer} KM</p>}
               {item.spek || 'Tidak ada rincian spesifikasi.'}
            </div>
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Konfirmasi Pinjam</button>
        </form>
      </div>
    </div>
  );
}

function CategoryDetail({ selectedCategory, setView, data, currentUser, onLoanClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const categoryData = data.filter(item => item.kategori === selectedCategory);
  const filteredItems = categoryData.filter(item => (item.nama || "").toLowerCase().includes(searchTerm.toLowerCase()) && (statusFilter === 'Semua' ? true : item.status === statusFilter));
  
  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto animate-in text-left">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setView('user_dashboard')} className="p-3 bg-white hover:bg-gray-50 rounded-2xl border border-gray-100 shadow-sm text-gray-600 transition-all active:scale-90"><ArrowLeft size={24} /></button>
        <div><h2 className="text-2xl font-black text-gray-900 mb-1 leading-none uppercase tracking-tight">{selectedCategory}</h2><p className="text-gray-500 text-sm font-medium">Temukan sarana prasarana yang tersedia.</p></div>
      </div>
      <StatusInfographic stats={{ total: categoryData.length, available: categoryData.filter(i => i.status === 'Tersedia').length, borrowed: categoryData.filter(i => i.status === 'Dipinjam').length, damaged: categoryData.filter(i => i.status === 'Rusak').length }} currentFilter={statusFilter} onFilterChange={setStatusFilter} />
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} /><input type="text" placeholder={`Cari di ${selectedCategory}...`} className="w-full pl-12 pr-6 py-4 rounded-3xl border border-gray-100 shadow-sm text-lg transition-all font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        <div className="relative min-w-[200px]"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><select className="w-full pl-12 pr-6 py-4 rounded-3xl border border-gray-100 shadow-sm text-lg transition-all font-bold appearance-none bg-white cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="Semua">Semua Status</option><option value="Tersedia">Tersedia</option><option value="Dipinjam">Dipinjam</option><option value="Rusak">Rusak</option></select></div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:border-indigo-200 transition-all">
            <div className="flex gap-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">{item.kategori === 'Kendaraan Dinas' ? <Car size={28}/> : item.kategori === 'Peralatan Elektronik' ? <Laptop size={28}/> : <Package size={28}/>}</div>
              <div><h4 className="font-bold text-gray-900 text-lg group-hover:text-indigo-700 transition-colors uppercase leading-tight">{item.nama}</h4><p className="text-sm text-gray-500 font-medium mt-1">{item.noPlat || item.nup || item.spek}</p></div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-4 sm:pt-0">
               <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${item.status === 'Tersedia' ? 'bg-green-50 text-green-700 border-green-100' : item.status === 'Dipinjam' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{item.status}</span>
               <button onClick={() => { 
                 if (currentUser) {
                    if (item.status !== 'Tersedia') return; 
                    onLoanClick(item); 
                 } else { 
                    setView('login_portal'); 
                 } 
               }} className={`px-10 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${item.status === 'Tersedia' ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                 Pinjam
               </button>
            </div>
          </div>
        ))}
      </div>
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
    if (foundUser.password !== password) { showNotification("Kata Sandi salah."); return; }
    if (firebaseUser) {
      try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', foundUser.username);
        await setDoc(userRef, { ...foundUser, linkedUid: firebaseUser.uid }, { merge: true });
      } catch (e) { console.error(e); }
    }
    setCurrentUser(foundUser);
    if (foundUser.role === 'admin') setView('admin_panel'); else setView('user_panel');
    showNotification(`Selamat datang kembali, ${foundUser.nama}!`);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4 bg-slate-50">
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl max-w-md w-full border border-white animate-in">
        <h2 className="text-3xl font-black text-gray-900 mb-6 uppercase text-center tracking-tight">Portal Masuk</h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <input type="text" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" placeholder="Username / Email / NIP" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          <input type="password" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none font-bold" placeholder="Kata Sandi" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 shadow-xl transition-all active:scale-95 uppercase tracking-widest">Masuk Sekarang</button>
        </form>
        <button onClick={() => setView('user_dashboard')} className="w-full mt-10 text-gray-300 font-black hover:text-indigo-400 text-xs uppercase tracking-widest text-center">Kembali ke Beranda</button>
      </div>
    </div>
  );
}

function AdminPanel({ data, users, adminProfile, setAdminProfile, showNotification, setView, db, appId, firebaseUser }) {
  const [adminSubView, setAdminSubView] = useState('assets'); 
  const [activeAssetTab, setActiveAssetTab] = useState('Kendaraan Dinas'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false); 
  const [userSearch, setUserSearch] = useState(''); 
  const [formData, setFormData] = useState({ nama: '', kategori: '', status: 'Tersedia', spek: '', noPlat: '', noRangka: '', noMesin: '', kilometer: '', tglOliMesin: '', tglOliMesinNext: '', tglOliPerseneling: '', tglOliPersenelingNext: '', tglPajak: '', deskripsiRusak: '', nup: '', merek: '', peminjam: '', usernamePeminjam: '', tglPinjam: '', tglKembali: '' });
  const [addUserFormData, setAddUserFormData] = useState({ nama: '', nip: '', email: '', whatsapp: '', username: '' });

  const handleAddOrEdit = async (e) => { 
    e.preventDefault(); 
    const id = editingItem ? editingItem.id : `asset-${Date.now()}`;
    const finalData = { ...formData, kategori: activeAssetTab, id }; 
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'assets', id), finalData, { merge: true });
      showNotification("Data fasilitas diperbarui!");
      setIsModalOpen(false); 
    } catch (err) { showNotification(err); }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 animate-in text-left">
      <div className="flex flex-wrap bg-white p-2 rounded-3xl shadow-sm border border-gray-100 mb-8 w-full sm:w-max gap-1">
        <button onClick={() => setAdminSubView('assets')} className={`flex-1 sm:flex-none px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${adminSubView === 'assets' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}><LayoutGrid size={18} className="inline mr-2"/>Inventaris</button>
        <button onClick={() => setAdminSubView('users')} className={`flex-1 sm:flex-none px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${adminSubView === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}><Users size={18} className="inline mr-2"/>Pengguna</button>
        <button onClick={() => setAdminSubView('profile')} className={`flex-1 sm:flex-none px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${adminSubView === 'profile' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}><UserCircle size={18} className="inline mr-2"/>Profil</button>
      </div>

      {adminSubView === 'assets' ? (
        <AdminAssetsSection activeAssetTab={activeAssetTab} setActiveAssetTab={setActiveAssetTab} data={data} openModal={(item) => { setEditingItem(item); setFormData(item || { nama: '', kategori: activeAssetTab, status: 'Tersedia' }); setIsModalOpen(true); }} openDetailModal={(item) => { setSelectedDetailItem(item); setIsDetailModalOpen(true); }} onDelete={async (id) => { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'assets', id)); }} />
      ) : adminSubView === 'users' ? (
        <AdminUsersSection users={users} userSearch={userSearch} setUserSearch={setUserSearch} onAddClick={() => setIsAddUserModalOpen(true)} onDelete={async (uId) => { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uId)); }} />
      ) : (
        <AdminProfileSection adminProfile={adminProfile} setAdminProfile={setAdminProfile} showNotification={showNotification} />
      )}

      {isModalOpen && <AssetModal activeAssetTab={activeAssetTab} editingItem={editingItem} formData={formData} setFormData={setFormData} closeModal={() => setIsModalOpen(false)} handleAddOrEdit={handleAddOrEdit} />}
      {isDetailModalOpen && <AssetDetailModal selectedDetailItem={selectedDetailItem} closeDetailModal={() => setIsDetailModalOpen(false)} />}
    </div>
  );
}

function AdminAssetsSection({ activeAssetTab, setActiveAssetTab, data, openModal, openDetailModal, onDelete }) {
  const filtered = data.filter(i => i.kategori === activeAssetTab);
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 overflow-x-auto shadow-sm animate-in">
      <div className="flex flex-wrap gap-2 mb-6">{CATEGORIES.map(c => <button key={c.id} onClick={() => setActiveAssetTab(c.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeAssetTab === c.id ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{c.id}</button>)}</div>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-50 text-gray-400 uppercase text-[10px] font-black tracking-widest"><th className="px-4 py-4 text-left">Fasilitas</th><th className="px-4 py-4 text-center">Status</th><th className="px-4 py-4 text-right">Aksi</th></tr></thead>
        <tbody className="divide-y divide-gray-50">{filtered.map(i => (
          <tr key={i.id} className="hover:bg-slate-50 transition-colors"><td className="px-4 py-4 font-bold text-gray-700 uppercase">{i.nama}</td><td className="px-4 py-4 text-center"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${i.status === 'Tersedia' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>{i.status}</span></td><td className="px-4 py-4 text-right flex justify-end gap-2"><button onClick={() => openDetailModal(i)} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-lg"><FileText size={16}/></button><button onClick={() => openModal(i)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg"><Edit size={16}/></button><button onClick={() => onDelete(i.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function AdminUsersSection({ users, userSearch, setUserSearch, onAddClick, onDelete }) {
  const filtered = users.filter(u => (u.nama || "").toLowerCase().includes(userSearch.toLowerCase()));
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 animate-in shadow-sm">
       <div className="flex justify-between items-center mb-6">
          <h3 className="font-black uppercase tracking-tight">Manajemen User</h3>
          <button onClick={onAddClick} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase"><UserPlus size={16} className="inline mr-2"/>Tambah</button>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(u => (
            <div key={u.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
              <div><p className="font-bold uppercase text-xs">{u.nama}</p><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{u.role}</p></div>
              <button onClick={() => onDelete(u.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16}/></button>
            </div>
          ))}
       </div>
    </div>
  );
}

function AdminProfileSection({ adminProfile }) {
  return (
    <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 text-left shadow-sm animate-in">
       <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-3xl bg-indigo-100 flex items-center justify-center text-indigo-600"><UserCircle size={60}/></div>
          <div><h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{adminProfile?.nama}</h3><p className="text-indigo-600 text-xs font-black uppercase tracking-[0.2em] italic">Master Administrator</p></div>
       </div>
       <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">NIP Pegawai</label><p className="font-bold">{adminProfile?.nip || '-'}</p></div>
          <div className="p-4 bg-slate-50 rounded-2xl"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Email Terdaftar</label><p className="font-bold">{adminProfile?.email || '-'}</p></div>
       </div>
    </div>
  );
}

function AssetModal({ activeAssetTab, editingItem, formData, setFormData, closeModal, handleAddOrEdit }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden text-left">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-xl font-black uppercase tracking-tight">{editingItem ? 'Edit' : 'Tambah'} {activeAssetTab}</h3>
          <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl"><X /></button>
        </div>
        <form onSubmit={handleAddOrEdit} className="p-8 space-y-4">
           <input required value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value.toUpperCase()})} className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold uppercase outline-none" placeholder="Nama Unit" />
           <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold outline-none"><option value="Tersedia">Tersedia</option><option value="Dipinjam">Dipinjam</option><option value="Rusak">Rusak</option></select>
           {activeAssetTab === 'Kendaraan Dinas' && <input value={formData.kilometer} onChange={e => setFormData({...formData, kilometer: e.target.value})} className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold outline-none" placeholder="Odometer (KM)" />}
           <textarea value={formData.spek} onChange={e => setFormData({...formData, spek: e.target.value})} className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold outline-none h-24" placeholder="Keterangan / Spesifikasi" />
           <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase">Simpan Data</button>
        </form>
      </div>
    </div>
  );
}

function AssetDetailModal({ selectedDetailItem, closeDetailModal }) {
  const isVehicle = selectedDetailItem.kategori === 'Kendaraan Dinas';
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden text-left">
        <div className="p-8 border-b bg-indigo-600 text-white flex justify-between items-center">
          <h3 className="font-black uppercase tracking-widest">Detail Fasilitas</h3>
          <button onClick={closeDetailModal} className="p-2 hover:bg-white/10 rounded-xl"><X /></button>
        </div>
        <div className="p-8 space-y-6">
          <h2 className="text-3xl font-black uppercase text-gray-900 leading-tight">{selectedDetailItem.nama}</h2>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-slate-50 rounded-2xl"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Status</label><span className="font-bold text-indigo-600 uppercase">{selectedDetailItem.status}</span></div>
             {isVehicle && <div className="p-4 bg-slate-50 rounded-2xl"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Odometer</label><span className="font-bold">{selectedDetailItem.kilometer} KM</span></div>}
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Spesifikasi</label><p className="text-sm italic text-gray-600 leading-relaxed">"{selectedDetailItem.spek || 'Tidak ada info.'}"</p></div>
          <button onClick={closeDetailModal} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase">Tutup</button>
        </div>
      </div>
    </div>
  );
}

function RegistrationPortal({ setView, users, showNotification, db, appId }) { return <div className="p-20 text-center text-gray-400 font-bold uppercase italic tracking-widest animate-pulse">Halaman Registrasi...</div>; }

function Header({ view, setView, currentUser, onLogout, setSelectedCategory, onOpenSettings }) {
  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer text-indigo-700 transition-transform active:scale-95" onClick={() => { setView('user_dashboard'); setSelectedCategory(null); }}>
          <div className="bg-indigo-100 p-2 rounded-lg"><Home size={22} /></div>
          <span className="font-extrabold text-xl tracking-tight uppercase">SIKOPIFASTA</span>
        </div>
        {currentUser ? (
          <div className="flex items-center gap-2">
             <div className="hidden sm:flex flex-col items-end mr-1 text-right leading-none"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{currentUser.role}</span><span className="text-xs font-bold text-gray-900">{currentUser.nama}</span></div>
             <div className="w-10 h-10 rounded-full border-2 border-indigo-100 bg-indigo-50 flex items-center justify-center text-indigo-600 overflow-hidden shadow-inner shrink-0">{currentUser.foto ? <img src={currentUser.foto} alt="P" className="w-full h-full object-cover" /> : <UserCircle size={24} />}</div>
             <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Settings size={20} /></button>
             <button onClick={onLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><LogOut size={20} /></button>
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
        <p className="text-gray-400 text-sm font-bold text-center italic">Dikembangkan untuk efisiensi operasional internal BPMP Kalbar.</p>
      </div>
    </footer>
  );
}
