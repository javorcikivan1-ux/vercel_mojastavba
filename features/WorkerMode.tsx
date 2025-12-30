
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Card, AlertModal, Badge, Input, Select, Modal } from '../components/UI';
import { 
  HardHat, Building2, Calendar, Clock, CheckCircle2, Send, Loader2, 
  WifiOff, LayoutGrid, ListTodo, User, LogOut, 
  ChevronRight, MapPin, TrendingUp, Wallet, Phone, Lock, Info, Zap,
  Activity, ChevronLeft, Mail, Pencil, Save, Coins, AlertCircle, History, ArrowRight, Camera, KeyRound, Shield
} from 'lucide-react';
import { formatMoney, formatDate, formatDuration } from '../lib/utils';

import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const PRIORITY_FLAG = "#PRIORITY";
const HISTORY_PAGE_SIZE = 20;

// Pomocná funkcia pre kompresiu profilovej fotky
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

interface WorkerModeProps {
  profile: any;
  onLogout: () => void;
  onTabChange?: (tab: string) => void;
}

export const WorkerModeScreen: React.FC<WorkerModeProps> = ({ profile: initialProfile, onLogout, onTabChange }) => {
  const [profile, setProfile] = useState(initialProfile);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'log' | 'profile'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [projects, setProjects] = useState<any[]>([]);
  
  // Tasks state
  const [todoTasks, setTodoTasks] = useState<any[]>([]);
  const [doneTasks, setDoneTasks] = useState<any[]>([]);
  const [donePage, setDonePage] = useState(0);
  const [hasMoreDone, setHasMoreDone] = useState(true);
  const [loadingMoreDone, setLoadingMoreDone] = useState(false);

  const [stats, setStats] = useState({ monthHours: 0, monthEarned: 0, weeklyHistory: [] as any[] });
  const [lastLogs, setLastLogs] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);

  const [logForm, setLogForm] = useState({
      site_id: '',
      date: new Date().toISOString().split('T')[0],
      start_time: '07:00',
      end_time: '15:30',
      hours: '8.5',
      description: ''
  });

  const [profileForm, setProfileForm] = useState({
      full_name: profile?.full_name || '',
      phone: profile?.phone || ''
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alert, setAlert] = useState<{open: boolean, message: string, title?: string, type?: 'success' | 'error'}>({ open: false, message: '' });

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // NATIVE BACK BUTTON HANDLER
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const initBackListener = async () => {
        const handler = await CapApp.addListener('backButton', () => {
          if (selectedTask) {
            setSelectedTask(null);
          } else if (activeTab !== 'dashboard') {
            setActiveTab('dashboard');
            setSuccess(false);
          } else {
            CapApp.exitApp();
          }
        });
        return handler;
      };

      const listenerPromise = initBackListener();
      return () => {
        listenerPromise.then(h => h.remove());
      };
    }
  }, [activeTab, selectedTask]);

  const loadAllData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    try {
        const [sitesRes, todoTasksRes, logsRes, profileRes] = await Promise.all([
            supabase.from('sites').select('id, name').eq('organization_id', profile.organization_id).eq('status', 'active'),
            supabase.from('tasks').select('*, sites(name)').eq('assigned_to', profile.id).eq('status', 'todo').order('start_date', { ascending: true }),
            supabase.from('attendance_logs').select('*, sites(name)').eq('user_id', profile.id).gte('date', startOfMonth).order('date', { ascending: false }),
            supabase.from('profiles').select('*').eq('id', profile.id).single()
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
        
        // Reset Done tasks (history) to first page
        setDonePage(0);
        setDoneTasks([]);
        setHasMoreDone(true);

        if (logsRes.data) {
            setLastLogs(logsRes.data.slice(0, 5));
            const totalH = logsRes.data.reduce((sum, l) => sum + Number(l.hours), 0);
            const earned = logsRes.data.reduce((sum, l) => sum + (Number(l.hours) * (l.hourly_rate_snapshot || profile.hourly_rate || 0)), 0);
            
            const historyMap: Record<string, number> = {};
            for(let i=0; i<7; i++) {
                const d = new Date();
                d.setDate(now.getDate() - i);
                historyMap[d.toISOString().split('T')[0]] = 0;
            }
            logsRes.data.forEach(l => {
                if (historyMap[l.date] !== undefined) historyMap[l.date] += Number(l.hours);
            });
            const historyArr = Object.entries(historyMap).map(([date, hours]) => ({ date, hours })).reverse();

            setStats({ monthHours: totalH, monthEarned: earned, weeklyHistory: historyArr });
        }
    } catch (e) {
        console.error("Chyba pri načítaní dát:", e);
    } finally {
        setLoading(false);
    }
  }, [profile.id, profile.organization_id, profile.hourly_rate]);

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

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Load history only when tab is active
  useEffect(() => {
      if (showHistory && doneTasks.length === 0) {
          loadDoneTasks(0);
      }
  }, [showHistory]);

  useEffect(() => {
    if (onTabChange) onTabChange(activeTab);
  }, [activeTab, onTabChange]);

  const taskGroups = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
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
        hourly_rate_snapshot: profile.hourly_rate || 0
    };

    try {
        if(!logForm.site_id) throw new Error("Vyberte stavbu.");
        const { error } = await supabase.from('attendance_logs').insert([payload]);
        if(error) throw error;
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            setLogForm(prev => ({ ...prev, description: '' }));
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
              const { error: uploadError } = await supabase.storage.from('diary-photos').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
              if (uploadError) throw uploadError;
              const { data: { publicUrl } } = supabase.storage.from('diary-photos').getPublicUrl(fileName);
              
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

  const TaskItem = ({ task }: { task: any }) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const taskDateStr = task.start_date?.split('T')[0];
      const isToday = taskDateStr === todayStr;
      const isPast = taskDateStr < todayStr && task.status !== 'done';
      
      return (
          <div 
            onClick={() => setSelectedTask(task)} 
            className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-pointer hover:border-orange-300 transition-all active:scale-[0.98] ${isPast ? 'border-l-4 border-l-red-500' : isToday ? 'border-l-4 border-l-orange-500' : ''}`}
          >
              <div className="flex gap-3 items-center min-w-0">
                  <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{task.title}</h4>
                        {task.description?.includes(PRIORITY_FLAG) && <AlertCircle size={12} className="text-red-500 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold truncate uppercase flex items-center gap-1.5">
                          <Building2 size={10}/> {task.sites?.name}
                          <span className="text-slate-200">|</span>
                          <Calendar size={10}/> {formatDate(task.start_date)}
                      </div>
                  </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                  {task.status === 'done' ? (
                      <CheckCircle2 size={18} className="text-green-500" />
                  ) : (
                      <ChevronRight className="text-slate-300 group-hover:text-orange-500" size={16}/>
                  )}
              </div>
          </div>
      );
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-orange-600" size={32}/></div>;

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

  const showWage = profile.show_wage_in_profile ?? true;
  const unfinishedPastCount = taskGroups.overdue.length;

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
                    <LogOut size={16}/> "Odhlásiť sa"
                </button>
              )}
          </div>

          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-3 text-slate-300 hover:text-slate-500 border-t border-slate-100 flex justify-center hover:bg-slate-50 transition">
              {isSidebarCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
          </button>
      </aside>

      <main className="flex-1 overflow-y-auto relative flex flex-col w-full pb-24 md:pb-0 scroll-container">
          
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
                              
                              {/* OVERDUE ALERT */}
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

                              <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
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

                              <Card className="p-4 border-slate-200 mt-6">
                                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={14} className="text-blue-500"/> Týždenná aktivita</h3>
                                  <div className="flex items-end justify-between h-24 gap-2 px-2">
                                      {stats.weeklyHistory.map((h, i) => {
                                          const maxH = Math.max(...stats.weeklyHistory.map(x => x.hours), 8);
                                          const height = (h.hours / maxH) * 100;
                                          const isToday = i === 6;
                                          return (
                                              <div key={h.date} className="flex-1 flex flex-col items-center gap-1.5">
                                                  <div className={`w-full rounded-t-md transition-all duration-500 ${isToday ? 'bg-orange-500' : 'bg-slate-100'}`} style={{ height: `${height}%` }}></div>
                                                  <span className={`text-[9px] font-bold uppercase ${isToday ? 'text-orange-600' : 'text-slate-400'}`}>
                                                      {new Date(h.date).toLocaleDateString('sk-SK', { weekday: 'short' }).substring(0, 2)}
                                                  </span>
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
                               <div className="space-y-2">
                                   {lastLogs.map(log => (
                                       <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-sm">
                                           <div className="font-bold text-slate-800 truncate">{log.sites?.name}</div>
                                           <div className="flex justify-between items-center mt-1">
                                               <span className="text-slate-400 font-bold uppercase text-[9px]">{formatDate(log.date)}</span>
                                               <span className="font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{formatDuration(Number(log.hours))}</span>
                                           </div>
                                       </div>
                                   ))}
                               </div>
                               <Button variant="secondary" fullWidth onClick={() => setActiveTab('log')} className="h-10 text-[10px] font-black uppercase tracking-widest border-slate-200">
                                   <Zap size={14}/> Zapísať prácu
                               </Button>
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
                          {/* OVERDUE SECTION */}
                          {taskGroups.overdue.length > 0 && !showHistory && (
                              <div className="space-y-3">
                                  <h3 className="text-[11px] font-black text-red-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                      <AlertCircle size={14}/> Zmeškané úlohy ({taskGroups.overdue.length})
                                  </h3>
                                  <div className="flex flex-col gap-2">
                                      {taskGroups.overdue.map(t => <TaskItem key={t.id} task={t} />)}
                                  </div>
                              </div>
                          )}

                          {/* TODAY SECTION */}
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

                          {/* UPCOMING SECTION */}
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

                          {/* HISTORY SECTION (WITH PAGINATION) */}
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
                                  <select 
                                      value={logForm.site_id} 
                                      onChange={e => setLogForm({...logForm, site_id: e.target.value})} 
                                      required 
                                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 appearance-none outline-none focus:border-orange-500 transition"
                                  >
                                      <option value="">-- Vyberte stavbu --</option>
                                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                              </Card>

                              <Card className="shadow-sm border-slate-200">
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                      <Input label="Príchod" type="time" value={logForm.start_time} onChange={(e:any) => setLogForm({...logForm, start_time: e.target.value})} required className="text-center font-bold" />
                                      <Input label="Odchod" type="time" value={logForm.end_time} onChange={(e:any) => setLogForm({...logForm, end_time: e.target.value})} required className="text-center font-bold" />
                                  </div>
                                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-center justify-between">
                                      <span className="text-xs font-bold text-orange-700">Odpracované trvanie:</span>
                                      <span className="text-lg font-black text-orange-800">{readableDuration}</span>
                                  </div>
                              </Card>

                              <Card className="shadow-sm border-slate-200">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Stručný popis činnosti</label>
                                  <textarea 
                                    value={logForm.description} 
                                    onChange={e => setLogForm({...logForm, description: e.target.value})} 
                                    placeholder="Napr. Murovanie, betónovanie, armovanie..." 
                                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-orange-500 transition h-24" 
                                    required
                                  ></textarea>
                              </Card>

                              <Button type="submit" fullWidth size="lg" loading={actionLoading} className="h-14 font-black shadow-lg shadow-orange-100">
                                  <Send size={18} className="mr-2"/> ODOSLAŤ VÝKAZ
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
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="text-white" size={24}/>
                                </div>
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

                      {/* PASSWORD CHANGE FOR WORKER */}
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
                          <p className="text-center text-[10px] text-slate-300 font-bold uppercase">Aplikácia MojaStavba v3.1.7</p>
                      </div>
                  </div>
              )}
          </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-pb shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)]">
          <div className="flex w-full justify-around h-16 items-center">
              {[
                  { id: 'dashboard', icon: LayoutGrid, colorClass: 'text-orange-600' },
                  { id: 'tasks', icon: ListTodo, count: todoTasks.length, colorClass: 'text-blue-500' },
                  { id: 'log', icon: Zap, colorClass: 'text-emerald-500' },
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
                          <p className="text-sm text-slate-700 bg-orange-50/50 p-4 rounded-xl border border-orange-100 italic leading-relaxed">
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
