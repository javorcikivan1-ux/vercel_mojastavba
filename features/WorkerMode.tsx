import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Card, AlertModal, Badge, Input, Select, Modal } from '../components/UI';
// Added missing Check import from lucide-react
import { 
  HardHat, Building2, Calendar, Clock, CheckCircle2, Send, Loader2, 
  WifiOff, LayoutGrid, ListTodo, User, LogOut, 
  ChevronRight, MapPin, TrendingUp, Wallet, Phone, Lock, Info, Zap,
  Activity, ChevronLeft, Mail, Pencil, Save, Coins, AlertCircle, History, ArrowRight, Camera, KeyRound, Shield, Briefcase, Filter, Search,
  ChevronDown, Banknote, ChevronUp, ArrowUp, Check
} from 'lucide-react';
import { formatMoney, formatDate, formatDuration } from '../lib/utils';

import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const PRIORITY_FLAG = "#PRIORITY";
const HISTORY_PAGE_SIZE = 20;

const compressAvatar = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const SIZE = 256; 
                canvas.width = SIZE;
                canvas.height = SIZE;
                const ctx = canvas.getContext('2d');
                const minDim = Math.min(img.width, img.height);
                const sx = (img.width - minDim) / 2;
                const sy = (img.height - minDim) / 2;
                ctx?.drawImage(img, sx, sy, minDim, minDim, 0, 0, SIZE, SIZE);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Chyba pri kompresii fotky.'));
                }, 'image/jpeg', 0.85); 
            };
        };
        reader.onerror = (err) => reject(err);
    });
};

const getLocalDateISO = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

interface WorkerModeProps {
  profile: any;
  onLogout: () => void;
  onTabChange?: (tab: string) => void;
}

export const WorkerModeScreen: React.FC<WorkerModeProps> = ({ profile: initialProfile, onLogout, onTabChange }) => {
  const [profile, setProfile] = useState(initialProfile);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'log' | 'history' | 'profile' | 'advances'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [projects, setProjects] = useState<any[]>([]);
  
  // Tasks state
  const [todoTasks, setTodoTasks] = useState<any[]>([]);
  const [doneTasks, setDoneTasks] = useState<any[]>([]);
  const [donePage, setDonePage] = useState(0);
  const [hasMoreDone, setHasMoreDone] = useState(true);
  const [loadingMoreDone, setLoadingMoreDone] = useState(false);

  // History state
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySiteFilter, setHistorySiteFilter] = useState('');
  const [historyYearFilter, setHistoryYearFilter] = useState(new Date().getFullYear().toString());
  const [relevantSites, setRelevantSites] = useState<any[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Advances state
  const [myAdvances, setMyAdvances] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedForHistory, setSelectedForHistory] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loadingHistorySettle, setLoadingHistorySettle] = useState(false);

  const [stats, setStats] = useState({ monthHours: 0, monthEarned: 0, todayHours: 0, weeklyHistory: [] as any[] });
  const [lastLogs, setLastLogs] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);

  const mainScrollRef = useRef<HTMLDivElement>(null);

  const [logForm, setLogForm] = useState({
      site_id: '',
      date: getLocalDateISO(new Date()),
      start_time: '07:00',
      end_time: '15:30',
      hours: '8.5',
      description: '',
      payment_type: 'hourly' as 'hourly' | 'fixed',
      fixed_amount: ''
  });

  const [profileForm, setProfileForm] = useState({
      full_name: profile?.full_name || '',
      phone: profile?.phone || ''
  });

  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alert, setAlert] = useState<{open: boolean, message: string, title?: string, type?: 'success' | 'error'}>({ open: false, message: '' });

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Detect scroll to show/hide "Back to Top"
  useEffect(() => {
    const handleScroll = () => {
        if (mainScrollRef.current) {
            setShowScrollTop(mainScrollRef.current.scrollTop > 500);
        }
    };
    const el = mainScrollRef.current;
    el?.addEventListener('scroll', handleScroll);
    return () => el?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadAllData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    
    const now = new Date();
    const todayStr = getLocalDateISO(now);
    const startOfMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;

    const curr = new Date(now);
    const day = curr.getDay(); 
    const diffToMon = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diffToMon));
    monday.setHours(0,0,0,0);
    const weekStartStr = getLocalDateISO(monday);

    try {
        const [sitesRes, todoTasksRes, logsRes, profileRes, weekLogsRes, advancesRes] = await Promise.all([
            supabase.from('sites').select('id, name').eq('organization_id', profile.organization_id).eq('status', 'active'),
            supabase.from('tasks').select('*, sites(name)').eq('assigned_to', profile.id).eq('status', 'todo').order('start_date', { ascending: true }),
            supabase.from('attendance_logs').select('*, sites(name)').eq('user_id', profile.id).gte('date', startOfMonth).order('date', { ascending: false }),
            supabase.from('profiles').select('*').eq('id', profile.id).single(),
            supabase.from('attendance_logs').select('date, hours').eq('user_id', profile.id).gte('date', weekStartStr),
            supabase.from('advances').select('*').eq('user_id', profile.id).order('date', { ascending: false })
        ]);

        if (profileRes.data) {
            setProfile(profileRes.data);
            setProfileForm({
                full_name: profileRes.data.full_name || '',
                phone: profileRes.data.phone || ''
            });
        }
        if (sitesRes.data) setProjects(sitesRes.data);
        if (todoTasksRes.data) setTodoTasks(todoTasksRes.data);
        if (advancesRes.data) setMyAdvances(advancesRes.data);
        
        if (logsRes.data) {
            setLastLogs(logsRes.data.slice(0, 5));
            const totalH = logsRes.data.reduce((sum, l) => sum + Number(l.hours), 0);
            const todayH = weekLogsRes.data?.filter(l => l.date === todayStr).reduce((sum, l) => sum + Number(l.hours), 0) || 0;
            
            const earned = logsRes.data.reduce((sum, l) => {
                if (l.payment_type === 'fixed') {
                    return sum + Number(l.fixed_amount || 0);
                }
                const rate = l.hourly_rate_snapshot || profile.hourly_rate || 0;
                return sum + (Number(l.hours) * rate);
            }, 0);
            
            const weekDays = [];
            const tempDate = new Date(monday);
            for(let i = 0; i < 7; i++) {
                const dateStr = getLocalDateISO(tempDate);
                const dayLogs = (weekLogsRes.data || []).filter(l => l.date === dateStr);
                const dayHours = dayLogs.reduce((s, l) => s + Number(l.hours), 0);
                
                weekDays.push({
                    date: dateStr,
                    dayNum: tempDate.getDate(),
                    label: tempDate.toLocaleDateString('sk-SK', { weekday: 'short' }),
                    hours: dayHours,
                    isToday: dateStr === todayStr
                });
                tempDate.setDate(tempDate.getDate() + 1);
            }

            setStats({ monthHours: totalH, monthEarned: earned, todayHours: todayH, weeklyHistory: weekDays });
        }
    } catch (e) {
        console.error("Chyba pri načítaní dát:", e);
    } finally {
        setLoading(false);
    }
  }, [profile.id, profile.organization_id, profile.hourly_rate]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
      if (showHistory && doneTasks.length === 0) {
          loadDoneTasks(0);
      }
  }, [showHistory]);

  useEffect(() => {
      if (activeTab === 'history') {
          setHistoryPage(0);
          loadHistoryLogs(0, true);
      }
  }, [activeTab, historySiteFilter, historyYearFilter]);

  useEffect(() => {
    if (onTabChange) onTabChange(activeTab);
  }, [activeTab, onTabChange]);

  const loadDoneTasks = async (page = 0) => {
      if (!profile?.id) return;
      setLoadingMoreDone(true);
      const from = page * HISTORY_PAGE_SIZE;
      const to = from + HISTORY_PAGE_SIZE - 1;

      try {
          const { data, error } = await supabase
            .from('tasks')
            .select('*, sites(name)')
            .eq('assigned_to', profile.id)
            .eq('status', 'done')
            .order('start_date', { ascending: false })
            .range(from, to);

          if (error) throw error;
          if (data) {
              setDoneTasks(prev => page === 0 ? data : [...prev, ...data]);
              setHasMoreDone(data.length === HISTORY_PAGE_SIZE);
          }
      } catch (e) {
          console.error("Chyba pri načítaní histórie úloh:", e);
      } finally {
          setLoadingMoreDone(false);
      }
  };

  const loadHistoryLogs = async (page = 0, reset = false) => {
    if (!profile?.id) return;
    setLoadingHistory(true);
    const from = page * HISTORY_PAGE_SIZE;
    const to = from + HISTORY_PAGE_SIZE - 1;

    try {
        let query = supabase
            .from('attendance_logs')
            .select('*, sites(name)')
            .eq('user_id', profile.id)
            .order('date', { ascending: false })
            .range(from, to);
        
        if (historySiteFilter) {
            query = query.eq('site_id', historySiteFilter);
        }
        
        if (historyYearFilter) {
            query = query.gte('date', `${historyYearFilter}-01-01`).lte('date', `${historyYearFilter}-12-31`);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
            setHistoryLogs(prev => reset ? data : [...prev, ...data]);
            setHasMoreHistory(data.length === HISTORY_PAGE_SIZE);
            
            if (reset && data.length > 0) {
                // Auto-expand first month of the new view
                const firstMonth = new Date(data[0].date).toLocaleString('sk-SK', { month: 'long', year: 'numeric' });
                setExpandedMonths({ [firstMonth]: true });
            }
        }

        if (reset) {
            // Optimized query for relevant sites
            const { data: siteIdsData } = await supabase
                .from('attendance_logs')
                .select('site_id, sites(name)')
                .eq('user_id', profile.id)
                .limit(500); // Limit to recent 500 logs for site extraction to boost perf
            
            if (siteIdsData) {
                const uniqueSitesMap = new Map();
                siteIdsData.forEach((item: any) => {
                    if (item.site_id && !uniqueSitesMap.has(item.site_id)) {
                        uniqueSitesMap.set(item.site_id, item.sites?.name || 'Neznáma stavba');
                    }
                });
                const uniqueSites = Array.from(uniqueSitesMap.entries()).map(([id, name]) => ({ id, name }));
                setRelevantSites(uniqueSites);
            }
        }
    } catch (e) {
        console.error("Chyba pri načítaní histórie prác:", e);
    } finally {
        setLoadingHistory(false);
    }
  };

  const groupedHistory = useMemo(() => {
      const groups: Record<string, { logs: any[], totalHours: number, totalEarned: number }> = {};
      historyLogs.forEach(log => {
          const date = new Date(log.date);
          const monthKey = date.toLocaleString('sk-SK', { month: 'long', year: 'numeric' });
          if (!groups[monthKey]) groups[monthKey] = { logs: [], totalHours: 0, totalEarned: 0 };
          
          groups[monthKey].logs.push(log);
          groups[monthKey].totalHours += Number(log.hours || 0);
          
          if (log.payment_type === 'fixed') {
              groups[monthKey].totalEarned += Number(log.fixed_amount || 0);
          } else {
              groups[monthKey].totalEarned += Number(log.hours || 0) * (log.hourly_rate_snapshot || profile.hourly_rate || 0);
          }
      });
      return Object.entries(groups);
  }, [historyLogs, profile.hourly_rate]);

  // Generate years list (from 2024 to current + past years based on profile created_at)
  const availableYears = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const startYear = profile?.created_at ? new Date(profile.created_at).getFullYear() : 2024;
      const years = [];
      for(let y = currentYear; y >= Math.min(startYear, 2024); y--) {
          years.push(y.toString());
      }
      return years;
  }, [profile?.created_at]);

  const taskGroups = useMemo(() => {
      const today = getLocalDateISO(new Date());
      return {
          overdue: todoTasks.filter(t => t.start_date?.split('T')[0] < today),
          today: todoTasks.filter(t => t.start_date?.split('T')[0] === today),
          upcoming: todoTasks.filter(t => t.start_date?.split('T')[0] > today)
      };
  }, [todoTasks]);

  const readableDuration = useMemo(() => {
    if (logForm.start_time && logForm.end_time) {
        const [sH, sM] = logForm.start_time.split(':').map(Number);
        const [eH, eM] = logForm.end_time.split(':').map(Number);
        let totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
        if (totalMinutes < 0) totalMinutes += 24 * 60; 
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h}h ${m}m`;
    }
    return "0h 0m";
  }, [logForm.start_time, logForm.end_time]);

  const handleTaskDone = async (taskId: string) => {
      setActionLoading(true);
      await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId);
      setSelectedTask(null);
      await loadAllData();
      setActionLoading(false);
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    
    const cleanFixedAmount = logForm.payment_type === 'fixed' 
        ? parseFloat(String(logForm.fixed_amount).replace(/[^0-9.]/g, '')) || 0
        : 0;

    const [sH, sM] = logForm.start_time.split(':').map(Number);
    const [eH, eM] = logForm.end_time.split(':').map(Number);
    let totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const calculatedHours = totalMinutes / 60;

    const payload = {
        organization_id: profile.organization_id,
        user_id: profile.id, 
        site_id: logForm.site_id,
        date: logForm.date,
        start_time: logForm.start_time,
        end_time: logForm.end_time,
        hours: calculatedHours, 
        description: logForm.description,
        hourly_rate_snapshot: profile.hourly_rate || 0,
        payment_type: logForm.payment_type,
        fixed_amount: cleanFixedAmount
    };

    try {
        if(!logForm.site_id) throw new Error("Vyberte stavba.");
        if(logForm.payment_type === 'fixed' && cleanFixedAmount <= 0) throw new Error("Zadajte platnú sumu za úkol.");
        const { error } = await supabase.from('attendance_logs').insert([payload]);
        if(error) throw error;
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            setLogForm(prev => ({ ...prev, description: '', fixed_amount: '', payment_type: 'hourly' }));
            loadAllData();
            setActiveTab('dashboard');
        }, 1500);
    } catch (err: any) {
        setAlert({ open: true, message: err.message, type: 'error' });
    } finally {
        setActionLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setActionLoading(true);
      try {
          const { error } = await supabase.from('profiles').update({
              full_name: profileForm.full_name,
              phone: profileForm.phone
          }).eq('id', profile.id);

          if (error) throw error;
          
          setProfile({ ...profile, full_name: profileForm.full_name, phone: profileForm.phone });
          setAlert({ open: true, title: 'Uložené', message: 'Váš profil bol aktualizovaný.', type: 'success' });
      } catch (err: any) {
          setAlert({ open: true, message: err.message, type: 'error' });
      } finally {
          setActionLoading(false);
      }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordForm.new !== passwordForm.confirm) {
          setAlert({ open: true, message: "Heslá sa nezhodujú.", type: 'error' });
          return;
      }
      setActionLoading(true);
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
      if (error) {
          setAlert({ open: true, message: error.message, type: 'error' });
      } else {
          setAlert({ open: true, title: 'Úspech', message: 'Heslo bolo zmenené.', type: 'success' });
          setPasswordForm({ new: '', confirm: '' });
      }
      setActionLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setUploadingAvatar(true);
          try {
              const blob = await compressAvatar(file);
              const fileName = `avatars/${profile.id}-${Date.now()}.jpg`;
              const filePath = `photos/${fileName}`;
              const { error: uploadError } = await supabase.storage.from('diary-photos').upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
              if (uploadError) throw uploadError;
              const { data: { publicUrl } } = supabase.storage.from('diary-photos').getPublicUrl(filePath);
              
              await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
              setProfile({ ...profile, avatar_url: publicUrl });
              setAlert({ open: true, title: 'Úspech', message: 'Profilová fotka bola aktualizovaná.', type: 'success' });
          } catch (err: any) {
              setAlert({ open: true, message: 'Nepodarilo sa nahrať fotku: ' + err.message, type: 'error' });
          } finally {
              setUploadingAvatar(false);
          }
      }
  };

  const toggleMonth = (monthKey: string) => {
      setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const loadSettlementHistory = async (advanceId: string) => {
      setLoadingHistorySettle(true);
      try {
          const { data, error } = await supabase
              .from('advance_settlements')
              .select('*')
              .eq('advance_id', advanceId)
              .order('date', { ascending: false });
          if (error) throw error;
          setSettlements(data || []);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingHistorySettle(false);
      }
  };

  const openAdvanceHistory = (adv: any) => {
      setSelectedForHistory(adv);
      setSettlements([]);
      setShowHistoryModal(true);
      loadSettlementHistory(adv.id);
  };

  const NavItem = ({ id, label, icon: Icon, count, colorClass }: any) => (
    <button
      onClick={() => { setActiveTab(id); setSuccess(false); }}
      className={`group w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium relative
        ${activeTab === id
          ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }
        ${isSidebarCollapsed ? 'justify-center px-0' : ''}
      `}
    >
      <div className={`${activeTab === id ? 'scale-110 transition-transform' : ''}`}>
          <Icon size={24} className={activeTab === id ? colorClass : `text-slate-400 group-hover:${colorClass}`} />
      </div>
      {!isSidebarCollapsed && <span className="text-sm font-bold">{label}</span>}
      {count !== undefined && count > 0 && (
          <span className={`absolute ${isSidebarCollapsed ? 'top-1 right-1' : 'right-4'} bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white`}>
              {count}
          </span>
      )}
    </button>
  );

  // Fix: Changed props type to any to allow 'key' prop when used in lists and avoid TS errors
  const TaskItem = ({ task }: any) => {
      const todayStr = getLocalDateISO(new Date());
      const taskDateStr = task.start_date?.split('T')[0];
      const isToday = taskDateStr === todayStr;
      const isPast = taskDateStr < todayStr && task.status !== 'done';
      
      return (
          <div 
            onClick={() => setSelectedTask(task)} 
            className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-pointer hover:border-orange-300 transition-all active:scale-[0.98] ${isPast ? 'border-l-4 border-l-red-500' : isToday ? 'border-l-4 border-l-orange-500' : ''}`}
          >
              <div className="flex gap-3 items-center min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{task.title}</h4>
                        {task.description?.includes(PRIORITY_FLAG) && <AlertCircle size={12} className="text-red-500 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase truncate uppercase flex items-center gap-1.5 flex-wrap">
                          <span className="flex items-center gap-1 max-w-[120px] truncate"><Building2 size={10}/> {task.sites?.name}</span>
                          <span className="text-slate-200">|</span>
                          <span className="flex items-center gap-1"><Calendar size={10}/> {formatDate(task.start_date)}</span>
                      </div>
                  </div>
              </div>
              <div className="flex center gap-2 shrink-0 ml-2">
                  {task.status === 'done' ? (
                      <CheckCircle2 size={18} className="text-green-500" />
                  ) : (
                      <ChevronRight className="text-slate-300 group-hover:text-orange-500" size={16}/>
                  )}
              </div>
          </div>
      );
  };

  const showWage = profile.show_wage_in_profile ?? true;
  const unfinishedPastCount = taskGroups.overdue.length;
  
  // FIX: Celková suma zohľadňuje čiastočné splatenie
  const pendingAdvancesTotal = myAdvances.filter(a => a.status === 'pending').reduce((sum, a) => sum + (Number(a.amount) - Number(a.settled_amount || 0)), 0);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden pt-safe-top">
      
      <aside className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
          <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5`}>
              <img 
                src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" 
                alt="Logo" 
                className="w-11 h-11 object-contain shrink-0" 
              />
              {!isSidebarCollapsed && (
                  <div className="min-w-0">
                    <div className="font-extrabold text-xl tracking-tight text-slate-800">
                        Moja<span className="text-orange-600">Stavba</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Pracovný Režim</div>
                  </div>
              )}
          </div>

          <nav className="flex-1 px-3 space-y-1 mt-4">
              <NavItem id="dashboard" label="Domov" icon={LayoutGrid} colorClass="text-orange-600" />
              <NavItem id="tasks" label="Moje Úlohy" icon={ListTodo} count={todoTasks.length} colorClass="text-blue-500" />
              <NavItem id="log" label="Zápis Práce" icon={Zap} colorClass="text-emerald-500" />
              <NavItem id="advances" label="Moje Zálohy" icon={Banknote} colorClass="text-orange-500" />
              <NavItem id="history" label="Moja História" icon={History} colorClass="text-blue-600" />
              <NavItem id="profile" label="Môj Profil" icon={User} colorClass="text-purple-500" />
          </nav>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <div className={`flex items-center gap-3 mb-3 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-2 pt-2'}`}>
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 overflow-hidden shadow-sm shrink-0">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover"/>
                        ) : (
                            profile.full_name?.charAt(0) || 'U'
                        )}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="truncate flex-1">
                          <p className="text-sm font-bold text-slate-800 truncate">{profile.full_name}</p>
                          <p className="text-[10px] text-slate-500 truncate font-medium">{profile.email}</p>
                        </div>
                    )}
                </div>

              {!isSidebarCollapsed && (
                <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50">
                    <LogOut size={16}/> Odhlásiť sa
                </button>
              )}
          </div>

          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-3 text-slate-300 hover:text-slate-500 border-t border-slate-100 flex justify-center hover:bg-slate-50 transition">
              {isSidebarCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
          </button>
      </aside>

      <main ref={mainScrollRef} className="flex-1 overflow-y-auto relative flex flex-col w-full pb-24 md:pb-0 scroll-container">
          
          <div className="md:hidden bg-white border-b border-slate-200 p-4 px-6 flex justify-between items-center sticky top-0 z-30 shadow-sm">
               <div className="flex items-center gap-2">
                  <img src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" alt="Logo" className="w-8 h-8" />
                  <span className="font-extrabold text-lg tracking-tight">Moja<span className="text-orange-600">Stavba</span></span>
               </div>
               <button onClick={onLogout} className="text-slate-400 p-1"><LogOut size={20}/></button>
          </div>

          <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
              
              {activeTab === 'dashboard' && (
                  <div className="space-y-6 animate-in fade-in">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
                          <div>
                              <h1 className="text-2xl font-bold text-slate-900">Ahoj, {profile?.full_name?.split(' ')[0]}</h1>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {new Date().toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </p>
                          </div>
                          <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                              <Card padding="p-3" className="flex-1 md:w-32 bg-white border-slate-200 shadow-sm">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Tento mesiac</div>
                                  <div className="text-lg font-black text-slate-900">{formatDuration(stats.monthHours)}</div>
                              </Card>
                              {showWage && (
                                <Card padding="p-3" className="flex-1 md:w-32 bg-white border-slate-200 shadow-sm animate-in zoom-in">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Zárobok</div>
                                    <div className="text-lg font-black text-green-600">{formatMoney(stats.monthEarned)}</div>
                                </Card>
                              )}
                          </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 space-y-4">
                              
                              {unfinishedPastCount > 0 && (
                                  <div 
                                    onClick={() => setActiveTab('tasks')}
                                    className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between cursor-pointer group hover:bg-red-100 transition animate-in slide-in-from-top-2"
                                  >
                                      <div className="flex items-center gap-3">
                                          <div className="bg-red-500 text-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition"><AlertCircle size={18}/></div>
                                          <div>
                                              <p className="text-xs font-black text-red-700 uppercase tracking-tight">Pozor: Nevybavené úlohy</p>
                                              <p className="text-sm font-bold text-red-900">Máte {unfinishedPastCount} {unfinishedPastCount === 1 ? 'úlohu' : unfinishedPastCount < 5 ? 'úlohy' : 'úloh'} z minulosti.</p>
                                          </div>
                                      </div>
                                      <ArrowRight size={18} className="text-red-400 group-hover:translate-x-1 transition-transform"/>
                                  </div>
                              )}

                              {pendingAdvancesTotal > 0 && (
                                  <div 
                                    onClick={() => setActiveTab('advances')}
                                    className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between cursor-pointer group hover:bg-orange-100 transition animate-in zoom-in"
                                  >
                                      <div className="flex items-center gap-3">
                                          <div className="bg-orange-500 text-white p-2 rounded-lg shadow-sm"><Banknote size={18}/></div>
                                          <div>
                                              <p className="text-xs font-black text-orange-700 uppercase tracking-tight">Nevyrovnané zálohy</p>
                                              <p className="text-sm font-bold text-orange-900">Aktuálne k vráteniu zostáva <span className="font-black text-orange-600">{formatMoney(pendingAdvancesTotal)}</span>.</p>
                                          </div>
                                      </div>
                                      <ChevronRight size={18} className="text-orange-400"/>
                                  </div>
                              )}

                              <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                      <ListTodo size={16} className="text-orange-600"/> Dnešná Agenda
                                  </h3>
                                  <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">{taskGroups.today.length} úloh</span>
                              </div>
                              
                              <div className="space-y-2">
                                  {taskGroups.today.length === 0 ? (
                                      <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                                          <CheckCircle2 size={32} className="mx-auto text-green-300 mb-2"/>
                                          <p className="text-slate-400 text-[10px] font-bold uppercase">Na dnes nemáte žiadne úlohy.</p>
                                      </div>
                                  ) : (
                                      taskGroups.today.map(task => (
                                          <TaskItem key={task.id} task={task} />
                                      ))
                                  )}
                              </div>

                              <Card className="p-5 border-slate-200 mt-6 shadow-sm overflow-hidden">
                                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-2">
                                      <Activity size={14} className="text-orange-500"/> Týždenná aktivita (Po - Ne)
                                  </h3>
                                  <div className="flex items-end justify-between h-32 gap-2 md:gap-4 px-1">
                                      {stats.weeklyHistory.map((h) => {
                                          const maxH = Math.max(...stats.weeklyHistory.map(x => x.hours), 8);
                                          const height = (h.hours / maxH) * 100;
                                          return (
                                              <div key={h.date} className="flex-1 flex flex-col items-center gap-2 group">
                                                  <div className="relative w-full flex flex-col justify-end items-center h-full">
                                                      <div className={`absolute bottom-[calc(100%+4px)] text-[9px] md:text-[10px] font-black transition-all ${h.hours > 0 ? 'opacity-100 scale-100 text-slate-800' : 'opacity-40 scale-90 text-slate-300'}`}>
                                                          {h.hours > 0 ? `${h.hours.toFixed(1)}h` : '0h'}
                                                      </div>
                                                      <div 
                                                          className={`w-full max-w-[32px] rounded-t-xl transition-all duration-1000 min-h-[4px] relative ${
                                                              h.isToday 
                                                              ? 'bg-gradient-to-t from-orange-600 to-orange-400 shadow-lg shadow-orange-200' 
                                                              : h.hours > 0 ? 'bg-slate-200 group-hover:bg-orange-200' : 'bg-slate-50'
                                                          }`} 
                                                          style={{ height: `${Math.max(4, height)}%` }}
                                                      >
                                                      </div>
                                                  </div>
                                                  <div className="flex flex-col items-center">
                                                      <span className={`text-[10px] font-black uppercase tracking-tighter ${h.isToday ? 'text-orange-600' : 'text-slate-400'}`}>
                                                          {h.label}
                                                      </span>
                                                      <span className={`text-[8px] font-bold leading-none mt-1 ${h.isToday ? 'text-orange-400' : 'text-slate-300'}`}>
                                                          {h.dayNum}.
                                                      </span>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </Card>
                          </div>

                          <div className="space-y-4">
                               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-2">
                                  <Clock size={16} className="text-blue-500"/> Posledné záznamy
                               </h3>
                               <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar px-1">
                                   {lastLogs.map(log => (
                                       <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-sm mb-2 last:mb-0">
                                           <div className="font-bold text-slate-800 truncate">{log.sites?.name}</div>
                                           <div className="flex justify-between items-center mt-1">
                                               <span className="text-slate-400 font-bold uppercase text-[9px]">{formatDate(log.date)}</span>
                                               <span className="font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                  {log.payment_type === 'fixed' ? (showWage ? formatMoney(log.fixed_amount) : 'Úkol') : formatDuration(Number(log.hours))}
                                               </span>
                                           </div>
                                       </div>
                                   ))}
                                   {lastLogs.length === 0 && (
                                       <div className="text-center py-8 text-slate-300 text-[10px] font-bold uppercase border-2 border-dashed border-slate-100 rounded-xl">Žiadne záznamy</div>
                                   )}
                               </div>
                               <button 
                                  onClick={() => setActiveTab('log')}
                                  className="w-full flex items-center justify-center gap-2 h-10 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition"
                               >
                                   <Zap size={14} className="text-orange-500" /> Zapísať prácu
                               </button>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'advances' && (
                  <div className="animate-in slide-in-from-right-2 space-y-6">
                      <div className="text-center py-4">
                         <h2 className="text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
                            <Banknote className="text-orange-600" size={28} /> Moje Zálohy
                         </h2>
                         <p className="text-xs text-slate-400 font-bold uppercase mt-1">Prehľad čerpania a priebehu splácania</p>
                      </div>

                      <Card className="bg-white border-orange-100 shadow-sm p-6 text-center relative overflow-hidden">
                          <div className="relative z-10">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Zostáva k vráteniu (celkom)</p>
                              <p className="text-4xl font-black text-orange-600 tracking-tight">{formatMoney(pendingAdvancesTotal)}</p>
                          </div>
                          <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                              <Banknote size={100} />
                          </div>
                      </Card>

                      <div className="space-y-4">
                          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                              <History size={14} className="text-blue-500"/> Zoznam záloh a splátok
                          </h3>
                          
                          <div className="grid grid-cols-1 gap-3">
                              {myAdvances.length === 0 ? (
                                  <div className="py-20 text-center text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl font-bold uppercase text-[10px]">
                                      Zatiaľ ste nečerpali žiadne zálohy.
                                  </div>
                              ) : (
                                  myAdvances.map(adv => {
                                      const settled = Number(adv.settled_amount || 0);
                                      const total = Number(adv.amount);
                                      const remaining = total - settled;
                                      const percent = (settled / total) * 100;
                                      
                                      return (
                                          <div key={adv.id} onClick={() => openAdvanceHistory(adv)} className={`bg-white p-5 rounded-2xl border shadow-sm transition-all cursor-pointer hover:border-orange-300 ${adv.status === 'settled' ? 'opacity-60 border-slate-200' : 'border-orange-200'}`}>
                                              <div className="flex justify-between items-start mb-4">
                                                  <div>
                                                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                                                          <Calendar size={10}/> {formatDate(adv.date)}
                                                      </div>
                                                      <div className="font-black text-slate-900 text-lg">
                                                          {formatMoney(total)}
                                                      </div>
                                                  </div>
                                                  <div className="text-right">
                                                      {adv.status === 'settled' ? (
                                                          <span className="text-[9px] bg-green-100 text-green-700 px-2 py-1 rounded-lg font-black uppercase flex items-center gap-1"><Check size={10}/> Splatené</span>
                                                      ) : settled > 0 ? (
                                                          <div className="flex flex-col items-end">
                                                              <span className="text-[9px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg font-black uppercase mb-1">V splácaní</span>
                                                              <span className="text-[10px] font-black text-orange-600">Zostáva: {formatMoney(remaining)}</span>
                                                          </div>
                                                      ) : null}
                                                  </div>
                                              </div>

                                              {adv.status === 'pending' && (
                                                  <div className="space-y-2">
                                                      <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                                                          <span>Splatené {formatMoney(settled)}</span>
                                                          <span>{Math.round(percent)}%</span>
                                                      </div>
                                                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                                          <div 
                                                              className="h-full bg-orange-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                                                              style={{ width: `${percent}%` }}
                                                          ></div>
                                                      </div>
                                                  </div>
                                              )}

                                              {adv.description && (
                                                  <p className="text-[11px] text-slate-500 italic mt-3 bg-slate-50 p-2 rounded-xl border border-slate-100">"{adv.description}"</p>
                                              )}
                                              <p className="text-[9px] text-slate-300 font-bold uppercase mt-3 tracking-tighter">Kliknite pre zobrazenie histórie splátok</p>
                                          </div>
                                      );
                                  })
                              )}
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'tasks' && (
                  <div className="animate-in slide-in-from-right-2 space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <ListTodo className="text-orange-600" size={24}/> Moje Úlohy
                            </h2>
                            <p className="text-xs text-slate-400 font-bold uppercase mt-1">Harmonogram prác</p>
                        </div>
                        <button 
                            onClick={() => setShowHistory(!showHistory)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition shadow-sm border ${showHistory ? 'bg-slate-800 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                            <History size={14}/> {showHistory ? 'Skryť históriu' : 'Zobraziť históriu'}
                        </button>
                      </div>
                      
                      <div className="space-y-8">
                          {unfinishedPastCount > 0 && !showHistory && (
                              <div className="space-y-3">
                                  <h3 className="text-[11px] font-black text-red-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                      <AlertCircle size={14}/> Zmeškané úlohy ({taskGroups.overdue.length})
                                  </h3>
                                  <div className="flex flex-col gap-2">
                                      {taskGroups.overdue.map(t => <TaskItem key={t.id} task={t} />)}
                                  </div>
                              </div>
                          )}

                          {!showHistory && (
                            <div className="space-y-3">
                                <h3 className="text-[11px] font-black text-orange-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Clock size={14}/> Dnešná Agenda ({taskGroups.today.length})
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {taskGroups.today.length === 0 ? (
                                        <div className="p-8 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100 italic text-slate-300 text-xs font-bold uppercase">
                                            Na dnes žiadne nové úlohy.
                                        </div>
                                    ) : taskGroups.today.map(t => <TaskItem key={t.id} task={t} />)}
                                </div>
                            </div>
                          )}

                          {!showHistory && taskGroups.upcoming.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Calendar size={14}/> Nasledujúce dni ({taskGroups.upcoming.length})
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {taskGroups.upcoming.map(t => <TaskItem key={t.id} task={t} />)}
                                </div>
                            </div>
                          )}

                          {showHistory && (
                              <div className="space-y-3 animate-in slide-in-from-bottom-4">
                                  <h3 className="text-[11px] font-black text-green-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                      <History size={14}/> História splnených úloh
                                  </h3>
                                  <div className="flex flex-col gap-2">
                                      {doneTasks.map(t => <TaskItem key={t.id} task={t} />)}
                                      
                                      {doneTasks.length === 0 && !loadingMoreDone && (
                                          <div className="p-8 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100 italic text-slate-300 text-xs font-bold uppercase">
                                              Zatiaľ žiadne splnené úlohy.
                                          </div>
                                      )}

                                      {hasMoreDone && (
                                          <div className="pt-4 flex justify-center">
                                              <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                loading={loadingMoreDone} 
                                                onClick={() => {
                                                    const next = donePage + 1;
                                                    setDonePage(next);
                                                    loadDoneTasks(next);
                                                }}
                                              >
                                                  Načítať ďalšie splnené úlohy...
                                              </Button>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'history' && (
                  <div className="animate-in slide-in-from-bottom-2 space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <History className="text-blue-600" size={24}/> Moja História
                            </h2>
                            <p className="text-xs text-slate-400 font-bold uppercase mt-1">Archív všetkých vašich výkonov</p>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <div className="relative">
                                  <select 
                                    value={historyYearFilter} 
                                    onChange={e => setHistoryYearFilter(e.target.value)}
                                    className="w-full sm:w-28 pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition shadow-sm appearance-none"
                                  >
                                      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                  </select>
                                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14}/>
                              </div>

                              <div className="relative">
                                  <select 
                                    value={historySiteFilter} 
                                    onChange={e => setHistorySiteFilter(e.target.value)}
                                    className="w-full sm:w-56 pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition shadow-sm appearance-none"
                                  >
                                      <option value="">Všetky stavby</option>
                                      {relevantSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14}/>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-4 pb-12">
                          {groupedHistory.map(([month, data]) => {
                              const isExpanded = expandedMonths[month];
                              return (
                                  <div key={month} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                                      <button 
                                          onClick={() => toggleMonth(month)}
                                          className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isExpanded ? 'bg-slate-50 border-b border-slate-200' : 'hover:bg-slate-50'}`}
                                      >
                                          <div className="flex items-center gap-3">
                                              <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                  <Calendar size={18} />
                                              </div>
                                              <div>
                                                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{month}</h3>
                                                  <div className="flex items-center gap-3 mt-0.5">
                                                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                                          <Clock size={10}/> {formatDuration(data.totalHours)}
                                                      </span>
                                                      {showWage && (
                                                          <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                                                              <Wallet size={10}/> {formatMoney(data.totalEarned)}
                                                          </span>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                          {isExpanded ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                                      </button>
                                      
                                      {isExpanded && (
                                          <div className="divide-y divide-slate-100 animate-in slide-in-from-top-1">
                                              {data.logs.map(log => (
                                                  <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors group">
                                                      <div className="flex justify-between items-start gap-4">
                                                          <div className="min-w-0 flex-1">
                                                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                  <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                                                                      {new Date(log.date).getDate()}. {new Date(log.date).toLocaleString('sk-SK', { month: 'short' })}
                                                                  </span>
                                                                  <div className="font-bold text-slate-800 truncate text-xs">{log.sites?.name}</div>
                                                                  {log.payment_type === 'fixed' && (
                                                                      <span className="text-[8px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">Úkol</span>
                                                                  )}
                                                              </div>
                                                              <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-2">
                                                                  <Clock size={9}/> {log.start_time} - {log.end_time}
                                                              </div>
                                                              {log.description && (
                                                                  <p className="text-[11px] text-slate-500 mt-2 italic leading-tight line-clamp-2">
                                                                      {log.description}
                                                                  </p>
                                                              )}
                                                          </div>
                                                          <div className="text-right shrink-0">
                                                              <div className="text-sm font-black text-slate-900">{formatDuration(Number(log.hours))}</div>
                                                              {showWage && (
                                                                  <div className={`text-[10px] font-black ${log.payment_type === 'fixed' ? 'text-orange-600' : 'text-green-600'}`}>
                                                                      {log.payment_type === 'fixed' ? formatMoney(log.fixed_amount) : `+${formatMoney(Number(log.hours) * (log.hourly_rate_snapshot || profile.hourly_rate || 0))}`}
                                                                  </div>
                                                              )}
                                                          </div>
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              );
                          })}

                          {historyLogs.length === 0 && !loadingHistory && (
                              <div className="py-20 text-center">
                                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                                      <Search size={32} className="text-slate-400"/>
                                  </div>
                                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Pre rok {historyYearFilter} sa nenašli žiadne záznamy.</p>
                              </div>
                          )}

                          {hasMoreHistory && (
                              <div className="flex justify-center pt-6">
                                  <Button 
                                    variant="secondary" 
                                    loading={loadingHistory}
                                    onClick={() => {
                                        const next = historyPage + 1;
                                        setHistoryPage(next);
                                        loadHistoryLogs(next);
                                    }}
                                    className="bg-white border-slate-200 shadow-sm min-w-[200px] h-11 text-[10px] font-black uppercase tracking-widest"
                                  >
                                      Načítať ďalšie z {historyYearFilter}
                                  </Button>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'log' && (
                  <div className="animate-in zoom-in-95 max-w-xl mx-auto space-y-6">
                      <div className="text-center">
                        <h2 className="text-xl font-black text-slate-900 flex items-center justify-center gap-2">
                           <Zap className="text-orange-600" size={24} fill="currentColor"/> Zápis Výkonu
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase mt-1">Zaznamenajte dnešnú odpracovanú prácu</p>
                      </div>
                      
                      {success ? (
                          <div className="py-16 text-center animate-in zoom-in">
                              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-md">
                                  <CheckCircle2 size={32}/>
                              </div>
                              <h3 className="text-xl font-bold text-slate-800">Hotovo, odoslané!</h3>
                              <p className="text-xs text-slate-400 mt-1">Váš výkaz bol úspešne zaznamenaný.</p>
                          </div>
                      ) : (
                          <form onSubmit={handleLogSubmit} className="space-y-4">
                              <Card className="shadow-sm border-slate-200">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Kde ste dnes pracovali?</label>
                                  <div className="relative">
                                      <select 
                                          value={logForm.site_id} 
                                          onChange={e => setLogForm({...logForm, site_id: e.target.value})} 
                                          required 
                                          className="w-full p-4 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 appearance-none outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition shadow-inner"
                                      >
                                          <option value="">-- Vyberte stavba --</option>
                                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                      </select>
                                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                          <MapPin size={18}/>
                                      </div>
                                  </div>
                              </Card>

                              <Card className="shadow-sm border-slate-200">
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                      <Input label="Príchod" type="time" value={logForm.start_time} onChange={(e:any) => setLogForm({...logForm, start_time: e.target.value})} required className="text-center font-bold" />
                                      <Input label="Odchod" type="time" value={logForm.end_time} onChange={(e:any) => setLogForm({...logForm, end_time: e.target.value})} required className="text-center font-bold" />
                                  </div>
                                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between"><span className="text-xs font-bold text-slate-500">Čas strávený na stavbe:</span><span className="text-lg font-black text-slate-700">{readableDuration}</span></div>
                              </Card>

                              <Card className="shadow-sm border-slate-200">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Spôsob odmeňovania</label>
                                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                                      <button 
                                          type="button" 
                                          onClick={() => setLogForm({...logForm, payment_type: 'hourly'})} 
                                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${logForm.payment_type === 'hourly' ? 'bg-white shadow-sm text-orange-600 border border-orange-100' : 'text-slate-500 border border-transparent'}`}
                                      >
                                          <Clock size={14}/> Hodinovka
                                      </button>
                                      <button 
                                          type="button" 
                                          onClick={() => setLogForm({...logForm, payment_type: 'fixed'})} 
                                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${logForm.payment_type === 'fixed' ? 'bg-white shadow-sm text-orange-600 border border-orange-100' : 'text-slate-500 border border-transparent'}`}
                                      >
                                          <Briefcase size={14}/> Úkol (Fixná suma)
                                      </button>
                                  </div>
                                  
                                  {logForm.payment_type === 'fixed' ? (
                                      <div className="animate-in slide-in-from-top-2">
                                          {showWage ? (
                                              <Input 
                                                  label="Dohodnutá suma za prácu (€)" 
                                                  type="text" 
                                                  value={logForm.fixed_amount} 
                                                  onChange={(e:any) => setLogForm({...logForm, fixed_amount: e.target.value})} 
                                                  required 
                                                  placeholder="Napr. 500.00" 
                                              />
                                          ) : (
                                              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-xs font-bold text-orange-800 text-center">
                                                  Práca zapísaná ako úkol (fixná odmena).
                                              </div>
                                          )}
                                          <p className="text-[10px] text-slate-400 font-medium italic mt-1 leading-tight">Suma bude započítaná do nákladov stavby ako fixná položka. Hodiny budú taktiež zapísané do dochádzky k stavbe.</p>
                                      </div>
                                  ) : (
                                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700 font-medium flex items-start gap-2">
                                          <Info size={14} className="shrink-0 mt-0.5" />
                                          {showWage ? (
                                              <span>Suma bude vypočítaná automaticky podľa vašej hodinovej sadzby <strong>{formatMoney(profile.hourly_rate)}/h</strong>.</span>
                                          ) : (
                                              <span>Suma bude vypočítaná automaticky podľa vašej dohodnutej sadzby.</span>
                                          )}
                                      </div>
                                  )}
                              </Card>

                              <Card className="shadow-sm border-slate-200">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Popis vykonanej činnosti</label>
                                  <textarea 
                                    value={logForm.description} 
                                    onChange={e => setLogForm({...logForm, description: e.target.value})} 
                                    placeholder="Čo sa dnes na stavbe urobilo..." 
                                    className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition h-28 shadow-inner" 
                                    required
                                  ></textarea>
                              </Card>

                              <Button type="submit" fullWidth size="lg" loading={actionLoading} className="h-14 font-black shadow-lg shadow-orange-100 uppercase tracking-widest">
                                  <Send size={18} className="mr-2"/> Odoslať dnešný výkaz
                              </Button>
                          </form>
                      )}
                  </div>
              )}

              {activeTab === 'profile' && (
                  <div className="animate-in slide-in-from-right-2 max-w-xl mx-auto space-y-6">
                      <div className="text-center py-6">
                          <div className="relative inline-block group">
                            <div 
                                onClick={() => avatarInputRef.current?.click()}
                                className="w-24 h-24 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 font-bold text-3xl border-4 border-white shadow-lg overflow-hidden cursor-pointer group-hover:scale-105 transition-transform"
                            >
                                {uploadingAvatar ? <Loader2 className="animate-spin text-orange-600" size={32}/> : profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : profile?.full_name?.charAt(0)}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={24}/></div>
                            </div>
                            <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            <div className="absolute bottom-2 right-0 bg-orange-600 text-white p-1.5 rounded-full border-2 border-white shadow-md">
                                <Pencil size={12}/>
                            </div>
                          </div>
                          <h2 className="text-xl font-black text-slate-900">{profile?.full_name}</h2>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{profile?.job_title || 'Pracovník firmy'}</p>
                      </div>

                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                          <Card className="border-slate-200 shadow-sm">
                              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><User size={14} className="text-purple-500"/> Osobné údaje</h3>
                              <div className="space-y-2">
                                  <Input label="Moje celé meno" value={profileForm.full_name} onChange={(e:any) => setProfileForm({...profileForm, full_name: e.target.value})} required />
                                  <Input label="Telefónne číslo" value={profileForm.phone} onChange={(e:any) => setProfileForm({...profileForm, phone: e.target.value})} placeholder="+421..." />
                                  <div className="pt-2">
                                    <Button type="submit" fullWidth loading={actionLoading} variant="secondary" size="sm">
                                        <Save size={16}/> Uložiť zmeny
                                    </Button>
                                  </div>
                              </div>
                          </Card>
                      </form>

                      <form onSubmit={handlePasswordChange} className="space-y-4">
                          <Card className="border-slate-200 shadow-sm">
                              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Shield size={14} className="text-blue-500"/> Zabezpečenie účtu</h3>
                              <div className="space-y-3">
                                  <Input label="Nové heslo" type="password" value={passwordForm.new} onChange={(e:any) => setPasswordForm({...passwordForm, new: e.target.value})} placeholder="••••••••" required />
                                  <Input label="Potvrdiť heslo" type="password" value={passwordForm.confirm} onChange={(e:any) => setPasswordForm({...passwordForm, confirm: e.target.value})} placeholder="••••••••" required />
                                  <div className="pt-1">
                                    <Button type="submit" fullWidth loading={actionLoading} variant="outline" size="sm">
                                        <KeyRound size={16}/> Zmeniť moje heslo
                                    </Button>
                                  </div>
                              </div>
                          </Card>
                      </form>

                      {showWage && (
                        <Card className="bg-white border-slate-200 shadow-sm animate-in fade-in">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Coins size={14} className="text-orange-500"/> Mzdové informácie</h3>
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Hodinová Sadzba</span>
                                  <span className="font-black text-slate-800 text-xl">{formatMoney(profile?.hourly_rate || 0)} / h</span>
                                </div>
                                <Wallet size={24} className="text-orange-500 opacity-20"/>
                            </div>
                        </Card>
                      )}

                      <div className="pt-4 space-y-2">
                          <Button variant="danger" fullWidth onClick={onLogout} className="h-11 rounded-xl font-bold text-xs uppercase tracking-widest">
                              <LogOut size={16} className="mr-2"/> Odhlásiť sa
                          </Button>
                          <p className="text-center text-[10px] text-slate-300 font-bold uppercase">Aplikácia MojaStavba v3.2.1</p>
                      </div>
                  </div>
              )}
          </div>
      </main>

      {/* Floating Back to Top Button */}
      {showScrollTop && (
          <button 
            onClick={scrollToTop}
            className="fixed bottom-20 md:bottom-8 right-4 md:right-8 bg-slate-800 text-white p-3 rounded-full shadow-2xl z-[60] animate-in zoom-in slide-in-from-bottom-4 transition-all hover:bg-orange-600 active:scale-90"
          >
              <ArrowUp size={24} />
          </button>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-pb shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)]">
          <div className="flex w-full justify-around h-16 items-center">
              {[
                  { id: 'dashboard', icon: LayoutGrid, colorClass: 'text-orange-600' },
                  { id: 'tasks', icon: ListTodo, count: todoTasks.length, colorClass: 'text-blue-500' },
                  { id: 'log', icon: Zap, colorClass: 'text-emerald-500' },
                  { id: 'advances', icon: Banknote, colorClass: 'text-orange-500' },
                  { id: 'history', icon: History, colorClass: 'text-blue-600' },
                  { id: 'profile', icon: User, colorClass: 'text-purple-500' },
              ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); setSuccess(false); }}
                    className={`flex flex-col items-center justify-center flex-1 transition-all relative h-full ${activeTab === tab.id ? tab.colorClass + ' scale-110' : 'text-slate-300'}`}
                  >
                    <tab.icon size={22} className={activeTab === tab.id ? tab.colorClass : 'text-slate-300'} />
                    {tab.count !== undefined && tab.count > 0 && (
                        <span className="absolute top-2 right-1/4 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white">
                            {tab.count}
                        </span>
                    )}
                    {activeTab === tab.id && <div className={`absolute bottom-1 w-1 h-1 ${tab.colorClass.replace('text-', 'bg-')} rounded-full`}></div>}
                  </button>
              ))}
          </div>
      </nav>

      {/* MODAL: HISTÓRIA SPLÁCANIA ZÁLOHY (PRE ZAMESTNANCA) */}
      {showHistoryModal && (
          <Modal title="História splácania" onClose={() => setShowHistoryModal(false)}>
              <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Výška zálohy</p>
                          <h3 className="text-2xl font-black text-slate-900">{formatMoney(Number(selectedForHistory?.amount))}</h3>
                          <p className="text-xs text-slate-500 font-bold">{formatDate(selectedForHistory?.date)}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Môj aktuálny dlh</p>
                          <div className="text-2xl font-black text-orange-600">{formatMoney(Number(selectedForHistory?.amount) - Number(selectedForHistory?.settled_amount || 0))}</div>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><History size={14} className="text-blue-500"/> Zoznam zúčtovaných splátok</h4>
                      {loadingHistorySettle ? (
                          <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={24}/></div>
                      ) : settlements.length === 0 ? (
                          <div className="py-10 text-center text-slate-300 italic text-sm border-2 border-dashed border-slate-100 rounded-2xl">Zatiaľ žiadne splátky.</div>
                      ) : (
                          <div className="space-y-2">
                              {settlements.map(s => (
                                  <div key={s.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 transition hover:border-blue-200">
                                      <div className="flex items-center gap-3">
                                          <div className="bg-white p-2 rounded-lg border border-slate-200 text-blue-500 shadow-sm"><Calendar size={16}/></div>
                                          <div className="text-sm font-black text-slate-800">{formatDate(s.date)}</div>
                                      </div>
                                      <div className="text-lg font-black text-green-600">-{formatMoney(s.amount)}</div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <Button fullWidth onClick={() => setShowHistoryModal(false)} variant="secondary">Zatvoriť</Button>
              </div>
          </Modal>
      )}

      {selectedTask && (
          <Modal title="Detail Úlohy" onClose={() => setSelectedTask(null)} maxWidth="max-w-md">
              <div className="space-y-6">
                  <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Názov úlohy</div>
                      <h3 className="text-xl font-black text-slate-900 leading-tight">{selectedTask.title}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Termín</div>
                          <div className="text-xs font-bold text-slate-800">{formatDate(selectedTask.start_date)}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Stavba</div>
                          <div className="text-xs font-bold text-slate-800 truncate">{selectedTask.sites?.name || 'Všeobecné'}</div>
                      </div>
                  </div>

                  {selectedTask.description && (
                      <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pokyny k práci</div>
                          <p className="text-sm text-slate-700 bg-orange-50/50 p-4 rounded-xl border border-orange-100 italic leading-relaxed shadow-inner">
                              {selectedTask.description.replace(PRIORITY_FLAG, '').trim()}
                          </p>
                      </div>
                  )}

                  <div className="pt-4 flex flex-col gap-2">
                      {selectedTask.status !== 'done' && (
                          <Button fullWidth size="lg" loading={actionLoading} onClick={() => handleTaskDone(selectedTask.id)} className="h-14 font-black shadow-lg shadow-green-100 bg-green-600 hover:bg-green-700 border-none">
                              <CheckCircle2 size={20}/> OZNAČIŤ AKO SPLNENÉ
                          </Button>
                      )}
                      <Button variant="secondary" fullWidth onClick={() => setSelectedTask(null)}>Zatvoriť</Button>
                  </div>
              </div>
          </Modal>
      )}

      <AlertModal 
        isOpen={alert.open} 
        onClose={() => setAlert({ open: false, message: '' })} 
        title={alert.title || "Info"} 
        message={alert.message} 
        type={alert.type || 'error'} 
      />
    </div>
  );
};