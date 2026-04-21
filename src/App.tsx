/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, FormEvent } from 'react';
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
  AlertCircle,
  Instagram,
  Mail,
  Play,
  Quote,
  Video,
  Bell,
  Megaphone,
  Image as ImageIcon,
  Upload,
  Loader2
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
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, storage } from './lib/firebase';
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

interface Testimonial {
  id: string;
  name: string;
  role: string;
  videoUrl: string;
  thumbnailUrl: string;
  createdAt: any;
}

interface Announcement {
  id: string;
  content: string;
  type: 'Penting' | 'Berita' | 'Update';
  createdAt: any;
}

interface QuickInfo {
  id: string;
  title: string;
  content: string;
  createdAt: any;
}

// --- Components ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [view, setView] = useState<'home' | 'guide' | 'admin'>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
  const [isAddingScholarship, setIsAddingScholarship] = useState(false);
  const [isAddingTestimonial, setIsAddingTestimonial] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [quickInfos, setQuickInfos] = useState<QuickInfo[]>([]);
  const [isAddingQuickInfo, setIsAddingQuickInfo] = useState(false);
  const [editingQuickInfo, setEditingQuickInfo] = useState<QuickInfo | null>(null);

  const [dbError, setDbError] = useState<string | null>(null);

  // --- Auth & Data Fetching ---

  useEffect(() => {
    // Verify connection to the new database
    const testConnection = async () => {
      try {
        console.log("Testing connection to database:", db.app.options.projectId);
        // Using getDocFromServer to bypass local cache and force a real network request
        await getDocFromServer(doc(db, '_connection_test', 'check'));
        console.log("Database connection & permissions check passed (empty but allowed)");
        setDbError(null);
      } catch (error: any) {
        console.error("Database Connection/Permission Test Failed:", error);
        setDbError(error.message || "Gagal terhubung ke database baru.");
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Auto-promote specific user to admin for testing
        if (user.email === 'syahriarmuhrizal@gmail.com') {
          try {
            await setDoc(doc(db, 'admins', user.uid), { email: user.email });
          } catch (e) {
            console.warn("Bootstrap Admin Set Error (expected if not verified):", e);
          }
        }
        
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          setIsAdmin(adminDoc.exists());
        } catch (error) {
          console.error("Admin Check Error:", error);
          setIsAdmin(false);
        }
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
    }, (error) => {
      console.error("Scholarships Snapshot Error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Testimonial));
      setTestimonials(data);
    }, (error) => {
      console.error("Testimonials Snapshot Error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      setAnnouncements(data);
    }, (error) => {
      console.error("Announcements Snapshot Error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'quickInfos'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuickInfo));
      setQuickInfos(data);
    }, (error) => {
      console.error("QuickInfos Snapshot Error:", error);
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

  const handleAddTestimonial = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;
      const role = formData.get('role') as string;
      const videoUrl = formData.get('videoUrl') as string;
      const thumbnailFile = formData.get('thumbnailFile') as File;
      let thumbnailUrl = formData.get('thumbnailUrl') as string;

      if (thumbnailFile && thumbnailFile.name) {
        const storageRef = ref(storage, `testimonials/${Date.now()}_${thumbnailFile.name}`);
        const snapshot = await uploadBytes(storageRef, thumbnailFile);
        thumbnailUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, 'testimonials'), {
        name,
        role,
        videoUrl,
        thumbnailUrl: thumbnailUrl || `https://picsum.photos/seed/${Date.now()}/800/450`,
        createdAt: serverTimestamp(),
      });
      setIsAddingTestimonial(false);
    } catch (error) {
      console.error("Add Testimonial Error", error);
      alert("Gagal mengupload foto. Pastikan ukuran file tidak terlalu besar.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (window.confirm("Hapus testimoni ini?")) {
      await deleteDoc(doc(db, 'testimonials', id));
    }
  };

  const handleAddAnnouncement = async (data: Partial<Announcement>) => {
    try {
      await addDoc(collection(db, 'announcements'), {
        ...data,
        createdAt: serverTimestamp(),
      });
      setIsAddingAnnouncement(false);
    } catch (error) {
      console.error("Add Announcement Error", error);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (window.confirm("Hapus informasi ini?")) {
      await deleteDoc(doc(db, 'announcements', id));
    }
  };

  const handleAddQuickInfo = async (data: Partial<QuickInfo>) => {
    try {
      await addDoc(collection(db, 'quickInfos'), {
        ...data,
        createdAt: serverTimestamp(),
      });
      setIsAddingQuickInfo(false);
    } catch (error) {
      console.error("Add Quick Info Error", error);
    }
  };

  const handleUpdateQuickInfo = async (id: string, data: Partial<QuickInfo>) => {
    try {
      await updateDoc(doc(db, 'quickInfos', id), data);
      setEditingQuickInfo(null);
    } catch (error) {
      console.error("Update Quick Info Error", error);
    }
  };

  const handleDeleteQuickInfo = async (id: string) => {
    if (window.confirm("Hapus kartu informasi ini?")) {
      await deleteDoc(doc(db, 'quickInfos', id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-indigo-900 text-white border-b-4 border-amber-500 flex flex-col shadow-md">
        {dbError && (
          <div className="bg-red-600 text-white text-[10px] py-1.5 px-6 flex items-center justify-center gap-2 border-b border-indigo-800">
            <AlertCircle className="w-3 h-3" />
            Terdeteksi masalah koneksi: {dbError}. Silakan Log Out dan Log In kembali untuk menyegarkan sesi ke proyek baru.
          </div>
        )}
        <div className="px-6 py-4 flex justify-between items-center w-full">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('home')}>
          <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/20 shadow-inner transition-transform group-hover:scale-105">
            <img 
              src="/Lambang_Kabupaten_Polewali_Mandar.png" 
              alt="Lambang Kabupaten Polewali Mandar" 
              className="w-9 h-9 object-contain brightness-110"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight block leading-none">THE BEST PNS</span>
            <span className="text-[10px] text-indigo-200 font-medium uppercase tracking-wider">Portal Beasiswa PNS</span>
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
        </div></div>
      </nav>

      {/* Announcements Marquee */}
      {announcements.length > 0 && (
        <div className="bg-amber-500 text-slate-900 py-2 border-y border-amber-600">
           <div className="max-w-[1024px] mx-auto px-6 overflow-hidden flex items-center gap-4">
              <div className="flex items-center gap-2 bg-indigo-900 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0">
                <Bell className="w-3 h-3" /> Info Terbaru
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="animate-marquee whitespace-nowrap flex gap-12 py-1">
                   {/* Combined list for seamless loop */}
                   {[...announcements, ...announcements].map((a, idx) => (
                     <span key={`${a.id}-${idx}`} className="text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                       <span className={cn(
                          "px-1.5 py-0.5 rounded text-[8px] text-white shadow-sm",
                          a.type === 'Penting' ? "bg-rose-600" :
                          a.type === 'Berita' ? "bg-indigo-600" : "bg-slate-700"
                       )}>
                         {a.type}
                       </span>
                       {a.content}
                     </span>
                   ))}
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        "max-w-[1024px] mx-auto p-6 pb-20",
        view === 'home' ? "grid grid-cols-12 gap-6" : "space-y-12"
      )}>
        
        {view === 'home' && (
          <>
            {/* Hero Section / About */}
            <header className="col-span-12">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-2xl border-b-8 border-amber-500"
              >
                {/* Abstract Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full -ml-10 -mb-10 blur-2xl" />

                <div className="relative z-10 grid md:grid-cols-5 gap-8 items-center">
                  <div className="md:col-span-3 space-y-6">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full text-amber-400 text-[10px] font-black uppercase tracking-[3px] border border-amber-500/30">
                          Transformasi Digital BKPSDM
                        </div>
                        
                        {/* Logo Slogan Instansi with Glassmorphism and Integration */}
                        <div className="relative group">
                          {/* Subtle Glow */}
                          <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                          
                          <div className="relative bg-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/10 inline-block overflow-hidden transition-all hover:bg-white/15">
                            {/* Decorative light reflection */}
                            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
                            
                            <img 
                              src="/POLMAN LEBIH BAIK HITAM.png" 
                              alt="POLMAN Lebih Baik" 
                              className="h-16 md:h-20 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-transform group-hover:scale-105 duration-500"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      </div>

                      <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
                        THE BEST <span className="text-amber-500">PNS</span>
                      </h1>
                    </div>
                    
                    <p className="text-sm md:text-base text-indigo-100 leading-relaxed font-medium">
                      <strong className="text-amber-400">THE BEST PNS</strong> adalah transformasi layanan digital Bidang Pendidikan dan Pelatihan <span className="underline decoration-amber-500/50 underline-offset-4">BKPSDM Kab. Polewali Mandar</span> yang akan menghimpun informasi beasiswa Pegawai Negeri Sipil dari berbagai penyedia beasiswa yang tersedia dalam satu platform. 
                    </p>
                    
                    <p className="text-xs md:text-sm text-indigo-200 leading-relaxed">
                      Layanan ini bertujuan untuk memberikan kemudahan bagi Pegawai Negeri Sipil dalam mengakses informasi beasiswa dengan cepat, sederhana, dan terintegrasi guna mendukung dan memperkuat pengembangan kompetensi Pegawai Negeri Sipil sejalan dengan <strong className="text-white italic">Asta Cita Presiden dan Wakil Presiden menuju Indonesia Emas</strong>.
                    </p>
                  </div>
                  
                  <div className="md:col-span-2 flex justify-center md:justify-end">
                    <div className="relative">
                      <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20" />
                      <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <GraduationCap className="w-24 h-24 text-amber-500" strokeWidth={1.5} />
                        <div className="mt-4 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[2px]">SDM Unggul</p>
                          <p className="text-[10px] text-amber-400 font-medium">Indonesia Maju</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </header>

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
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:border-indigo-300 transition-all group"
                  >
                    <div className="h-24 bg-slate-100 overflow-hidden relative">
                       <img 
                         src={`https://picsum.photos/seed/${s.id}-thumb/400/200`} 
                         alt={s.name} 
                         className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 mix-blend-multiply" 
                         referrerPolicy="no-referrer"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
                    </div>
                    <div className="p-5">
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
                  {quickInfos.length > 0 ? (
                    quickInfos.map((info, idx) => (
                      <div key={info.id} className={cn(idx !== quickInfos.length - 1 && "border-b border-slate-100 pb-3")}>
                        <span className={cn(
                          "text-[9px] font-bold block uppercase mb-1",
                          idx === 0 ? "text-amber-600" : "text-slate-400"
                        )}>{info.title}</span>
                        <p className="text-[10px] leading-relaxed text-slate-600">{info.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center">
                       <p className="text-[9px] text-slate-400 uppercase italic">Belum ada informasi</p>
                    </div>
                  )}
                </div>
              </div>

               <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Hubungi Kami</h3>
                <div className="space-y-3 text-[11px]">
                  <a href="https://wa.me/6285122409650" target="_blank" className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" />
                    085122409650 (WhatsApp)
                  </a>
                  <a href="mailto:bidangdiklatpolman@gmail.com" className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    bidangdiklatpolman@gmail.com
                  </a>
                  <a href="https://instagram.com/diklatbkpsdm_polman" target="_blank" className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors">
                    <Instagram className="w-3.5 h-3.5 text-indigo-600" />
                    @diklatbkpsdm_polman
                  </a>
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

            {/* Testimonials Section - Full Width */}
            <section className="col-span-12 py-12">
              <div className="flex flex-col items-center text-center space-y-4 mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 rounded-full text-indigo-700 text-[9px] font-bold uppercase tracking-widest">
                  <Quote className="w-3 h-3" /> Testimoni Alumni
                </div>
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Sudah Banyak yang <span className="text-indigo-600">Terbantu</span></h2>
                <div className="h-1 w-20 bg-amber-500 rounded-full" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.map((t, idx) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-100 group relative"
                  >
                    <div className="aspect-video relative overflow-hidden bg-slate-900">
                      <img 
                        src={t.thumbnailUrl || `https://picsum.photos/seed/${t.id}/800/450`} 
                        alt={t.name}
                        className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                      
                      <button 
                        onClick={() => setActiveVideo(t.videoUrl)}
                        className="absolute inset-0 flex items-center justify-center group/btn"
                      >
                        <div className="w-14 h-14 bg-amber-500 text-slate-900 rounded-full flex items-center justify-center shadow-2xl transition-all group-hover/btn:scale-125 group-hover/btn:bg-white">
                          <Play className="w-6 h-6 fill-current" />
                        </div>
                      </button>
                    </div>

                    <div className="p-6">
                      <h4 className="font-bold text-slate-800 text-sm italic">"{t.role}"</h4>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-xs">
                          {t.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase tracking-wider">{t.name}</p>
                          <p className="text-[10px] text-slate-500">Penerima Beasiswa</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {testimonials.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-indigo-50/50 rounded-3xl border-2 border-dashed border-indigo-100">
                    <Video className="w-12 h-12 text-indigo-200 mx-auto mb-4" />
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Belum ada testimoni video</p>
                  </div>
                )}
              </div>
            </section>
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

            {/* Manage Testimonials Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-amber-500 pl-3 uppercase">Testimoni Video</h3>
                <button 
                  onClick={() => setIsAddingTestimonial(true)}
                  className="bg-slate-900 text-white px-6 py-2 rounded font-bold text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <Video className="w-4 h-4" /> Tambah Video
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {testimonials.map(t => (
                  <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative">
                       <img src={t.thumbnailUrl || `https://picsum.photos/seed/${t.id}/400/225`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                       <div className="absolute top-2 right-2 flex gap-1">
                          <button onClick={() => handleDeleteTestimonial(t.id)} className="p-1.5 bg-rose-500 text-white rounded hover:bg-rose-600">
                            <Trash2 className="w-3 h-3" />
                          </button>
                       </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 uppercase line-clamp-1">{t.name}</p>
                      <p className="text-[10px] text-slate-500 italic">{t.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manage Announcements Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-amber-500 pl-3 uppercase">Informasi Terbaru (Berita)</h3>
                <button 
                  onClick={() => setIsAddingAnnouncement(true)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Megaphone className="w-4 h-4" /> Tambah Berita
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
                      <th className="px-8 py-4">Konten</th>
                      <th className="px-8 py-4">Tipe</th>
                      <th className="px-8 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.map(a => (
                      <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="px-8 py-4 text-xs font-medium text-slate-700">{a.content}</td>
                        <td className="px-8 py-4">
                           <span className={cn(
                             "text-[8px] font-black uppercase px-2 py-0.5 rounded text-white",
                             a.type === 'Penting' ? "bg-rose-600" :
                             a.type === 'Berita' ? "bg-indigo-600" : "bg-slate-700"
                           )}>
                             {a.type}
                           </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button onClick={() => handleDeleteAnnouncement(a.id)} className="text-rose-600 hover:scale-110 transition-transform">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manage Quick Infos Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-indigo-900 border-l-4 border-amber-500 pl-3 uppercase">Konten Kartu Informasi (Informasi Baru)</h3>
                <button 
                  onClick={() => setIsAddingQuickInfo(true)}
                  className="bg-amber-500 text-slate-900 px-6 py-2 rounded font-bold text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Tambah Kartu
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-left">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
                      <th className="px-8 py-4">Judul</th>
                      <th className="px-8 py-4">Konten</th>
                      <th className="px-8 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quickInfos.map(info => (
                      <tr key={info.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="px-8 py-4 text-xs font-bold text-indigo-900 uppercase tracking-tight">{info.title}</td>
                        <td className="px-8 py-4 text-[10px] text-slate-600 leading-relaxed max-w-xs">{info.content}</td>
                        <td className="px-8 py-4 text-right space-x-1 whitespace-nowrap">
                          <button onClick={() => setEditingQuickInfo(info)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteQuickInfo(info.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                    {quickInfos.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-8 py-12 text-center text-[10px] text-slate-400 font-bold uppercase">Belum ada kartu informasi</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur-sm border-t border-slate-200 py-6 px-6 mt-16">
        <div className="max-w-[1024px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Column 1: Ownership */}
            <div className="order-2 md:order-1 flex items-center justify-center md:justify-start gap-4">
              <div className="p-2.5 bg-indigo-900 rounded-xl shadow-lg ring-4 ring-indigo-50">
                 <ShieldCheck className="w-4 h-4 text-amber-500" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[2px] leading-none mb-1">&copy; 2026</p>
                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-[2px] italic">Produk Aktualisasi LATSAR</p>
              </div>
            </div>

            {/* Column 2: Platform Identity */}
            <div className="order-1 md:order-2 text-center">
              <div className="relative inline-block group">
                 <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-indigo-600 rounded-lg blur opacity-10 group-hover:opacity-25 transition duration-1000"></div>
                 <div className="relative px-6 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                   <p className="text-[11px] font-black text-indigo-950 uppercase tracking-[4px]">Portal Beasiswa PNS Terintegrasi</p>
                 </div>
              </div>
            </div>

            {/* Column 3: Operational Unit */}
            <div className="order-3 flex items-center justify-center md:justify-end gap-3">
              <div className="text-center md:text-right">
                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-[1px]">Bidang Diklat BKPSDM</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-tight mt-0.5">
                  Pemerintah Kabupaten <br className="hidden md:block" /> Polewali Mandar
                </p>
              </div>
              <img 
                src="/Lambang_Kabupaten_Polewali_Mandar.png" 
                alt="Logo Pemkab Polewali Mandar" 
                className="w-10 h-auto grayscale hover:grayscale-0 transition-all duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
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
                  <img src={`https://picsum.photos/seed/${selectedScholarship.id}-detail/800/600`} className="w-full h-full object-cover mix-blend-multiply opacity-80" referrerPolicy="no-referrer" />
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

        {/* Video Player Modal */}
        {activeVideo && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-10">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
               onClick={() => setActiveVideo(null)} 
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl"
             >
                <button 
                  onClick={() => setActiveVideo(null)}
                  className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
                <iframe 
                  src={(() => {
                    const url = activeVideo;
                    if (url.includes('youtube.com') || url.includes('youtu.be')) {
                      const videoId = url.split('/').pop()?.split('?')[0].split('&')[0];
                      return `https://www.youtube.com/embed/${videoId}`;
                    }
                    if (url.includes('drive.google.com')) {
                      const driveMatch = url.match(/\/file\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
                      if (driveMatch && driveMatch[1]) {
                        return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
                      }
                    }
                    return url;
                  })()} 
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen 
                />
             </motion.div>
          </div>
        )}

        {/* Add Testimonial Modal */}
        {isAddingTestimonial && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-[#1A1A1A]/95" 
               onClick={() => setIsAddingTestimonial(false)} 
             />
              <motion.div 
               initial={{ y: 50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 50, opacity: 0 }}
               className="relative bg-white w-full max-w-md rounded-xl p-8 border-t-8 border-indigo-900"
               onClick={(e) => e.stopPropagation()}
             >
               <h2 className="text-xl font-bold uppercase tracking-tight text-indigo-900 mb-8">Tambah Testimoni Video</h2>
               <form onSubmit={handleAddTestimonial} className="space-y-4">
                 <input name="name" placeholder="Nama Alumni" required className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100" />
                 <input name="role" placeholder="Angkatan / Jabatan / Pesan Singkat" required className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100" />
                 <input name="videoUrl" placeholder="Link Video (YouTube/Direct)" required className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100" />
                 
                 <div className="space-y-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase ml-1">Foto Penerima Beasiswa</p>
                   <div className="flex gap-2">
                     <div className="relative flex-1">
                        <input 
                          type="file" 
                          name="thumbnailFile" 
                          accept="image/*"
                          id="photo-upload"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const label = document.getElementById('photo-label');
                              if (label) label.innerText = file.name;
                            }
                          }}
                        />
                        <label 
                          htmlFor="photo-upload" 
                          className="flex items-center gap-3 bg-slate-50 p-4 rounded text-xs border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <ImageIcon className="w-4 h-4 text-indigo-600" />
                          <span id="photo-label" className="text-slate-500 truncate">Pilih Foto (Upload)</span>
                        </label>
                     </div>
                     <div className="flex items-center px-4 text-[10px] font-bold text-slate-300 uppercase">Atau</div>
                     <input name="thumbnailUrl" placeholder="Link URL Foto" className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none flex-1 border border-slate-100" />
                   </div>
                 </div>

                 <button 
                   type="submit" 
                   disabled={uploading}
                   className={cn(
                     "w-full bg-indigo-900 text-white py-4 rounded font-bold text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2",
                     uploading ? "opacity-70 cursor-not-allowed" : "hover:bg-slate-800"
                   )}
                 >
                   {uploading ? (
                     <>
                       <Loader2 className="w-4 h-4 animate-spin" /> Sedang Mengunggah...
                     </>
                   ) : (
                     <>
                       <Upload className="w-4 h-4" /> Simpan Testimoni
                     </>
                   )}
                 </button>
               </form>
             </motion.div>
          </div>
        )}

        {/* Add Announcement Modal */}
        {isAddingAnnouncement && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-[#1A1A1A]/95" 
               onClick={() => setIsAddingAnnouncement(false)} 
             />
              <motion.div 
               initial={{ y: 50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 50, opacity: 0 }}
               className="relative bg-white w-full max-w-md rounded-xl p-8 border-t-8 border-indigo-900"
               onClick={(e) => e.stopPropagation()}
             >
               <h2 className="text-xl font-bold uppercase tracking-tight text-indigo-900 mb-8">Tambah Informasi Terbaru</h2>
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const formData = new FormData(e.currentTarget);
                 handleAddAnnouncement(Object.fromEntries(formData));
               }} className="space-y-4">
                 <textarea name="content" placeholder="Isi Berita / Pengumuman" required className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100" rows={3} />
                 <select name="type" className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-indigo-600 outline-none w-full border border-slate-100">
                    <option value="Update">Update (Sistem)</option>
                    <option value="Berita">Berita (Beasiswa)</option>
                    <option value="Penting">Penting (Mendesak)</option>
                 </select>
                 <button type="submit" className="w-full bg-indigo-900 text-white py-4 rounded font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">Terbitkan Berita</button>
               </form>
             </motion.div>
          </div>
        )}

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
        {/* Add/Edit Quick Info Modal */}
        {(isAddingQuickInfo || editingQuickInfo) && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-[#1A1A1A]/95" 
               onClick={() => { setIsAddingQuickInfo(false); setEditingQuickInfo(null); }} 
             />
              <motion.div 
               initial={{ y: 50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 50, opacity: 0 }}
               className="relative bg-white w-full max-w-md rounded-xl p-8 border-t-8 border-amber-500"
               onClick={(e) => e.stopPropagation()}
             >
               <h2 className="text-xl font-bold uppercase tracking-tight text-indigo-900 mb-8">{editingQuickInfo ? 'Edit Kartu Informasi' : 'Tambah Kartu Informasi'}</h2>
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const formData = new FormData(e.currentTarget);
                 const data = Object.fromEntries(formData);
                 if (editingQuickInfo) {
                   handleUpdateQuickInfo(editingQuickInfo.id, data as any);
                 } else {
                   handleAddQuickInfo(data as any);
                 }
               }} className="space-y-4">
                 <div className="space-y-1">
                   <p className="text-[9px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Judul Kartu</p>
                   <input defaultValue={editingQuickInfo?.title} name="title" placeholder="Contoh: BERLIAN PENDIDIKAN" required className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-none w-full border border-slate-100 font-bold uppercase" />
                 </div>
                 <div className="space-y-1">
                   <p className="text-[9px] font-bold text-slate-400 uppercase ml-1 tracking-widest">Isi Keterangan</p>
                   <textarea defaultValue={editingQuickInfo?.content} name="content" placeholder="Masukkan keterangan singkat di sini..." required className="bg-slate-50 p-4 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-none w-full border border-slate-100" rows={4} />
                 </div>
                 <button type="submit" className="w-full bg-indigo-900 text-white py-4 rounded font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                   {editingQuickInfo ? 'Simpan Perubahan' : 'Terbitkan Kartu'}
                 </button>
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
