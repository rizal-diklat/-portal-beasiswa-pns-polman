/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  User, 
  GraduationCap, 
  BookOpen, 
  Phone, 
  Download, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  CheckCircle2, 
  Calendar,
  LogOut,
  ChevronRight,
  ShieldCheck,
  FileText,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  Timestamp, 
  serverTimestamp,
  orderBy,
  where,
  getDocs,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from './lib/firebase';
import { cn } from './lib/utils';

// --- Types ---
interface Scholarship {
  id: string;
  name: string;
  provider: string;
  accessInfo: string;
  scheduleStatus: 'Buka' | 'Tutup' | 'Segera';
  callCenter: string;
  downloadLink: string;
  description: string;
  criteria: string[];
  deadline: any; // Timestamp
  createdAt: any;
}

// --- Components ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [view, setView] = useState<'home' | 'guide' | 'admin'>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
  const [isAddingScholarship, setIsAddingScholarship] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);

  // --- Auth & Data Fetching ---

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Auto-promote specific user to admin for testing
        if (user.email === 'syahriarmuhrizal@gmail.com') {
          await setDoc(doc(db, 'admins', user.uid), { email: user.email });
        }
        
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        setIsAdmin(adminDoc.exists());
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'scholarships'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        let status = d.scheduleStatus;
        if (d.deadline) {
          const deadlineDate = d.deadline.toDate();
          if (new Date() > deadlineDate) {
            status = 'Tutup';
          }
        }
        return { id: doc.id, ...d, scheduleStatus: status } as Scholarship;
      });
      setScholarships(data);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setIsAuthModalOpen(false);
    } catch (error) {
      console.error("Login Error", error);
    }
  };

  const logout = () => signOut(auth);

  // --- Search & Filters ---
  const filteredScholarships = useMemo(() => {
    return scholarships.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.criteria.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'All' || s.scheduleStatus === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [scholarships, searchTerm, filterStatus]);

  // --- CRUD Operations ---
  const handleAddScholarship = async (data: Partial<Scholarship>) => {
    try {
      await addDoc(collection(db, 'scholarships'), {
        ...data,
        createdAt: serverTimestamp(),
      });
      setIsAddingScholarship(false);
    } catch (error) {
      console.error("Add Error", error);
    }
  };

  const handleUpdateScholarship = async (id: string, data: Partial<Scholarship>) => {
    try {
      await updateDoc(doc(db, 'scholarships', id), data);
      setEditingScholarship(null);
    } catch (error) {
      console.error("Update Error", error);
    }
  };

  const handleDeleteScholarship = async (id: string) => {
    if (window.confirm("Hapus data beasiswa ini?")) {
      await deleteDoc(doc(db, 'scholarships', id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-indigo-900 text-white border-b-4 border-amber-500 px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
          <div className="bg-white p-2 rounded-lg">
            <GraduationCap className="text-indigo-900 w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight block leading-none">PORTAL BEASISWA PNS</span>
            <span className="text-[10px] text-indigo-200 font-medium uppercase tracking-wider">Peningkatan Kapasitas SDM Aparatur</span>
          </div>
        </div>
        
        <div className="hidden md:flex gap-6 items-center text-sm font-medium">
          <button onClick={() => setView('home')} className={cn("hover:text-amber-400 transition-colors pb-1", view === 'home' && "text-amber-400 border-b-2 border-amber-400")}>Beranda</button>
          <button onClick={() => setView('guide')} className={cn("hover:text-amber-400 transition-colors pb-1", view === 'guide' && "text-amber-400 border-b-2 border-amber-400")}>Prosedur Internal</button>
          {isAdmin && (
            <div className="h-6 w-px bg-indigo-700 mx-2"></div>
          )}
          {isAdmin && (
            <button 
              onClick={() => setView('admin')} 
              className={cn(
                "bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded font-bold text-slate-900 shadow-sm transition-colors text-xs flex items-center gap-2",
                view === 'admin' && "ring-2 ring-white/50"
              )}
            >
              <ShieldCheck className="w-4 h-4" /> PANEL ADMIN
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold uppercase">{user.displayName || 'PNS User'}</p>
                <p className="text-[10px] text-gray-500">{user.email}</p>
              </div>
              <button 
                onClick={logout}
                className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                title="Keluar"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={login}
              className="bg-[#1A1A1A] text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-amber-800 transition-all flex items-center gap-2"
            >
              <User className="w-4 h-4" /> Masuk
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className={cn(
        "max-w-[1024px] mx-auto p-6 pb-20",
        view === 'home' ? "grid grid-cols-12 gap-6" : "space-y-12"
      )}>
        
        {view === 'home' && (
          <>
            {/* Sidebar Left: Search & Filter */}
            <aside className="col-span-12 md:col-span-3 space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Search className="w-4 h-4" /> Cari Beasiswa
                </h3>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Nama Beasiswa..." 
                    className="w-full text-xs p-3 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Status</p>
                    <div className="flex flex-col gap-1">
                      {['All', 'Buka', 'Segera', 'Tutup'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setFilterStatus(status)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded text-xs transition-colors",
                            filterStatus === status 
                              ? "bg-indigo-600 text-white font-bold" 
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 flex flex-col items-center text-center">
                <div className="relative w-24 h-24 mb-4">
                  <GraduationCap className="w-full h-full text-indigo-800" strokeWidth={1} />
                </div>
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider leading-relaxed">PNS Profesional Melalui Pendidikan</h4>
                <p className="text-[10px] text-indigo-700 mt-2 italic">Ayo tingkatkan kompetensi untuk pengabdian yang lebih baik.</p>
              </div>
            </aside>

            {/* Center Content: Scholarship Grid */}
            <section className="col-span-12 md:col-span-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 border-l-4 border-indigo-600 pl-3 uppercase tracking-tight">Daftar Program</h2>
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">{filteredScholarships.length} Beasiswa</span>
              </div>

              <div className="grid gap-4">
                {filteredScholarships.map((s, idx) => (
                  <motion.div 
                    key={s.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-indigo-300 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-indigo-900 group-hover:text-indigo-600 transition-colors">{s.name}</h3>
                        <p className="text-[11px] text-slate-500 font-medium italic">Oleh: {s.provider}</p>
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-1 rounded uppercase",
                        s.scheduleStatus === 'Buka' ? "bg-green-500 text-white" :
                        s.scheduleStatus === 'Segera' ? "bg-indigo-400 text-white" :
                        "bg-slate-400 text-white"
                      )}>
                        {s.scheduleStatus}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.criteria.map(c => (
                        <span key={c} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">#{c}</span>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                       <button 
                         onClick={() => setSelectedScholarship(s)}
                         className="flex-1 bg-indigo-600 text-white py-2 rounded text-[11px] font-bold border border-indigo-700 hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                         Lihat Detail & Link
                       </button>
                    </div>
                  </motion.div>
                ))}

                {filteredScholarships.length === 0 && (
                  <div className="py-20 text-center bg-white rounded-xl border border-slate-200 border-dashed">
                     <Search className="text-slate-200 w-12 h-12 mx-auto mb-4" />
                     <h3 className="text-slate-400 font-bold uppercase text-xs tracking-widest">Tidak Ada Hasil</h3>
                  </div>
                )}
              </div>
            </section>

            {/* Sidebar Right: Stats & Info */}
            <aside className="col-span-12 md:col-span-3 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-indigo-600 p-3 text-white">
                  <h3 className="text-xs font-bold uppercase tracking-wider">Informasi Baru</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[9px] text-amber-600 font-bold block uppercase mb-1">Berlian Pendidikan</span>
                    <p className="text-[10px] leading-relaxed text-slate-600">Pastikan berkas digital Anda siap dalam format PDF maksimal 2MB.</p>
                  </div>
                  <div className="pb-1">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">Panduan Pengguna</span>
                    <p className="text-[10px] leading-relaxed text-slate-600">Pelajari tata cara pendaftaran pada menu Panduan di atas.</p>
                  </div>
                </div>
              </div>

               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Hubungi Kami</h3>
                <div className="space-y-3 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" />
                    (021) 1234-5678
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <X className="w-3.5 h-3.5 text-indigo-600" />
                    layanan@edupns.go.id
                  </div>
                </div>
              </div>

              {/* Quick Summary View */}
              <div className="bg-slate-900 p-5 rounded-xl text-white shadow-xl">
                <h3 className="text-[10px] font-bold text-amber-500 mb-4 tracking-widest uppercase">Portal Informasi</h3>
                <div className="space-y-4">
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <div className="text-2xl font-bold">{scholarships.length}</div>
                    <div className="text-[8px] text-slate-400 uppercase font-black">Program Aktif Terdaftar</div>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-relaxed italic">Portal ini memfasilitasi PNS untuk mendapatkan akses langsung ke portal resmi penyedia beasiswa.</p>
                </div>
              </div>
            </aside>
          </>
        )}

        {view === 'guide' && (
          <section className="py-12 max-w-4xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl font-bold tracking-tight uppercase text-indigo-900 border-b-2 border-amber-500 inline-block pb-1">Prosedur Pemanfaatan Portal</h2>
              <p className="text-slate-500 text-sm">Langkah-langkah strategis bagi PNS untuk mengakses beasiswa rekanan.</p>
            </div>

            <div className="grid gap-6">
              {[
                { title: 'Pencarian Informasi', icon: <Search/>, desc: 'Gunakan fitur filter dan pencarian untuk menemukan program beasiswa yang sesuai dengan kualifikasi dan kebutuhan jabatan Anda.' },
                { title: 'Pelajari Juknis Resmi', icon: <BookOpen/>, desc: 'Unduh brosur atau petunjuk teknis resmi dari penyedia jasa melalui tombol Download yang tersedia di tiap detail beasiswa.' },
                { title: 'Izin Instansi', icon: <ShieldCheck/>, desc: 'Sesuai regulasi kepegawaian, pastikan Anda telah berkonsultasi dan mendapatkan izin belajar/tugas belajar dari unit HRD atau PPK di instansi Anda.' },
                { title: 'Akses Portal Rekanan', icon: <ExternalLink/>, desc: 'Gunakan tombol "Kunjungi Situs Resmi" untuk diarahkan langsung ke platform pendaftaran milik penyedia beasiswa (LPDP, Kemendikbud, Beasiswa Luar Negeri, dll).' }
              ].map((step, i) => (
                <div key={i} className="flex gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-500 transition-all group">
                  <div className="bg-indigo-50 h-12 w-12 rounded-lg flex items-center justify-center text-indigo-700 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {step.icon}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold uppercase tracking-tight text-slate-800">{step.title}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 bg-slate-900 p-8 rounded-xl text-white text-center space-y-4 border-t-4 border-amber-500">
               <h3 className="text-lg font-bold uppercase tracking-widest text-amber-500">Catatan Penting</h3>
               <p className="text-slate-300 text-xs max-w-2xl mx-auto leading-relaxed">
                 Portal Beasiswa PNS (EduPNS) hanya berfungsi sebagai jembatan informasi (aggregator). Kami tidak mengelola proses pendaftaran, seleksi, maupun penentuan kelulusan peserta. Keamanan data pribadi saat melakukan pendaftaran di situs luar adalah tanggung jawab penyedia layanan masing-masing.
               </p>
            </div>
          </section>
        )}

        {view === 'admin' && isAdmin && (
          <section className="py-12 space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-800 border-l-4 border-amber-500 pl-4">Manajemen Data Beasiswa</h2>
              <button 
                onClick={() => setIsAddingScholarship(true)}
                className="bg-indigo-600 text-white px-8 py-3 rounded font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
              >
                <Plus className="w-4 h-4" /> Tambah Informasi
              </button>
            </div>

            {/* Manage Scholarships Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
                       <th className="px-8 py-6">Beasiswa</th>
                       <th className="px-8 py-6">Penyedia</th>
                       <th className="px-8 py-6">Deadline</th>
                       <th className="px-8 py-6">Status</th>
                       <th className="px-8 py-6 text-right">Aksi</th>
                     </tr>
                   </thead>
                   <tbody>
                     {scholarships.map(s => (
                       <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                         <td className="px-8 py-6 text-xs font-bold uppercase text-indigo-900">{s.name}</td>
                         <td className="px-8 py-6 text-[11px] text-slate-500 italic">{s.provider}</td>
                         <td className="px-8 py-6 text-[10px] font-mono text-slate-400">
                           {s.deadline ? s.deadline.toDate().toLocaleDateString('id-ID') : '-'}
                         </td>
                         <td className="px-8 py-6">
                            <span className={cn(
                              "text-[9px] font-black uppercase px-3 py-1 rounded",
                              s.scheduleStatus === 'Buka' ? "bg-green-500 text-white" :
                              s.scheduleStatus === 'Segera' ? "bg-indigo-400 text-white" :
                              "bg-slate-400 text-white"
                            )}>
                              {s.scheduleStatus}
                            </span>
                         </td>
                         <td className="px-8 py-6 text-right space-x-1">
                            <button onClick={() => setEditingScholarship(s)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteScholarship(s.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6">
        <div className="max-w-[1024px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
           <div>&copy; 2026 Portal Beasiswa PNS. Sistem Terintegrasi Nasional.</div>
           <div className="flex gap-6">
             <span className="flex items-center gap-2">Status: <strong className="text-green-600">Normal</strong></span>
             <span className="flex items-center gap-2">Internal: <strong className="text-indigo-600">EduPNS v1.0</strong></span>
           </div>
        </div>
      </footer>

      {/* --- Modals --- */}

      <AnimatePresence>
        {/* Detail Scholarship Modal */}
        {selectedScholarship && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
               onClick={() => setSelectedScholarship(null)} 
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-indigo-900"
             >
                <div className="relative h-48 sm:h-64 shrink-0 bg-slate-100">
                  <img src="https://picsum.photos/seed/detail/800/600" className="w-full h-full object-cover mix-blend-multiply opacity-80" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => setSelectedScholarship(null)}
                    className="absolute top-4 right-4 bg-indigo-900/60 hover:bg-indigo-950 text-white p-2 rounded transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-indigo-950 to-transparent text-white">
                    <h2 className="text-2xl font-bold uppercase tracking-tight">{selectedScholarship.name}</h2>
                    <p className="text-xs text-indigo-200 mt-1 font-medium tracking-wide">Penyedia: {selectedScholarship.provider}</p>
                  </div>
                </div>

                <div className="p-8 overflow-y-auto space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Status Program</p>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", selectedScholarship.scheduleStatus === 'Buka' ? "bg-green-500" : "bg-slate-400")}></div>
                        <p className="text-xs font-bold text-slate-700">{selectedScholarship.scheduleStatus}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Batas Waktu</p>
                      <p className="text-xs font-bold text-amber-600">{selectedScholarship.deadline ? selectedScholarship.deadline.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Tidak Ditentukan'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Call Center</p>
                      <p className="text-xs font-bold text-indigo-700 flex items-center gap-2"><Phone className="w-4 h-4 text-amber-500"/> {selectedScholarship.callCenter}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[2px] border-b border-slate-100 pb-2 text-slate-400">Informasi Lengkap</h4>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{selectedScholarship.description}</p>
                  </div>

                  <div className="bg-indigo-50 p-4 rounded border border-indigo-100 text-center">
                    <p className="text-[10px] font-bold text-indigo-900 uppercase">Penting: Portal ini hanya jembatan informasi. Segala bentuk pendaftaran dilakukan langsung melalui portal resmi penyedia di bawah ini.</p>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                    <a 
                      href={selectedScholarship.downloadLink} 
                      target="_blank" 
                      className="bg-slate-100 text-slate-600 px-6 py-3 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 shrink-0 border border-slate-200"
                    >
                      <Download className="w-4 h-4" /> Download Brosur/Juknis
                    </a>
                    <a 
                      href={selectedScholarship.accessInfo} 
                      target="_blank" 
                      className="bg-amber-500 text-slate-900 px-8 py-3 rounded text-[11px] font-bold uppercase tracking-widest hover:bg-amber-600 transition-all ml-auto shadow-lg shadow-amber-200 flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" /> Kunjungi Situs Resmi
                    </a>
                  </div>
                </div>
             </motion.div>
          </div>
        )}

        {/* Auth Modal */}
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/80 backdrop-blur-lg" 
               onClick={() => setIsAuthModalOpen(false)} 
             />
              <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="relative bg-white w-full max-w-sm rounded-xl p-10 text-center space-y-8 border-t-8 border-amber-500 shadow-2xl"
             >
                <div className="bg-indigo-900 w-20 h-20 rounded-xl flex items-center justify-center mx-auto text-white shadow-lg">
                   <User className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold uppercase tracking-tight text-indigo-900">Akses Portal PNS</h3>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-[1px]">Gunakan akun Google Workspace / Gmail Anda</p>
                </div>
                <button 
                  onClick={login}
                  className="w-full border border-slate-200 py-4 rounded flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all group"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" /> Sign In via Google
                </button>
             </motion.div>
          </div>
        )}

        {/* Add/Edit Scholarship Modal */}
        {(isAddingScholarship || editingScholarship) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-[#1A1A1A]/95" 
               onClick={() => { setIsAddingScholarship(false); setEditingScholarship(null); }} 
             />
              <motion.div 
               initial={{ y: 50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 50, opacity: 0 }}
               className="relative bg-white w-full max-w-2xl rounded-xl p-8 max-h-[90vh] overflow-y-auto border-t-8 border-indigo-900"
               onClick={(e) => e.stopPropagation()}
             >
               <h2 className="text-xl font-bold uppercase tracking-tight text-indigo-900 mb-8">{editingScholarship ? 'Update' : 'Publish New'} Program</h2>
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const formData = new FormData(e.currentTarget);
                 const rawData = Object.fromEntries(formData);
                 const finalData = {
                   ...rawData,
                   deadline: rawData.deadline ? Timestamp.fromDate(new Date(rawData.deadline as string)) : null,
                   criteria: (rawData.criteria as string).split(',').map(c => c.trim())
                 };
                 if (editingScholarship) {
                    handleUpdateScholarship(editingScholarship.id, finalData);
                 } else {
                    handleAddScholarship(finalData);
                 }
               }} className="space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <input defaultValue={editingScholarship?.name} name="name" placeholder="Nama Beasiswa" required className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100" />
                   <input defaultValue={editingScholarship?.provider} name="provider" placeholder="Penyedia" required className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100" />
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <select defaultValue={editingScholarship?.scheduleStatus || 'Buka'} name="scheduleStatus" className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100">
                     <option value="Buka">Buka (Tampilkan)</option>
                     <option value="Segera">Segera (Akan Datang)</option>
                     <option value="Tutup">Tutup (Sembunyikan/Manual)</option>
                   </select>
                   <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Batas Akhir Pendaftaran</p>
                    <input defaultValue={editingScholarship?.deadline ? editingScholarship.deadline.toDate().toISOString().split('T')[0] : ''} type="date" name="deadline" className="bg-slate-50 p-3 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100" />
                   </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <input defaultValue={editingScholarship?.callCenter} name="callCenter" placeholder="Call Center / Kontak" className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100" />
                   <input defaultValue={editingScholarship?.downloadLink} name="downloadLink" placeholder="Link Download Brosur/Juknis" className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100" />
                 </div>
                 <input defaultValue={editingScholarship?.accessInfo} name="accessInfo" placeholder="Link Pendaftaran Resmi (Portal Rekanan)" className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100" />
                 <input defaultValue={editingScholarship?.criteria.join(', ')} name="criteria" placeholder="Kriteria (Pisahkan dengan koma: S1, S2, Kedinasan)" className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100" />
                 <textarea defaultValue={editingScholarship?.description} name="description" placeholder="Deskripsi Lengkap & Persyaratan (Markdown supported)" rows={4} className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100" />
                 <button type="submit" className="w-full bg-indigo-900 text-white py-4 rounded font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">{editingScholarship ? 'Simpan Perubahan' : 'Terbitkan Informasi'}</button>
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
