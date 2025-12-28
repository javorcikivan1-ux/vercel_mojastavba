
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Card, AlertModal, Badge, Input, Select } from '../components/UI';
// Add missing 'Coins' icon to lucide-react imports.
import { 
  HardHat, Building2, Calendar, Clock, CheckCircle2, Send, Loader2, 
  WifiOff, LayoutGrid, ListTodo, User, LogOut, 
  ChevronRight, MapPin, TrendingUp, Wallet, Phone, Lock, Info, Zap,
  Activity, ChevronLeft, Mail, Pencil, Save, Coins
} from 'lucide-react';
import { formatMoney, formatDate, formatDuration } from '../lib/utils';

const OFFLINE_STORAGE_KEY = 'mojastavba_offline_logs';
const PRIORITY_FLAG = "#PRIORITY";

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
  
  // Data
  const [projects, setProjects] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [stats, setStats] = useState({ monthHours: 0, monthEarned: 0, weeklyHistory: [] as any[] });
  const [lastLogs, setLastLogs] = useState<any[]>([]);

  // Form States
  const [logForm, setLogForm] = useState({
      site_id: '',
      date: new Date().toISOString().split('T')[0],
      start_time: '07:00',
      end_time: '15:30',
      hours: '8.5',
      description: ''
  });

  const [profileForm, setProfileForm] = useState({
      full_name: profile.full_name || '',
      phone: profile.phone || ''
  });

  // UI State
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [alert, setAlert] = useState<{open: boolean, message: string, title?: string}>({ open: false, message: '' });

  const loadAllData = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    try {
        const [sitesRes, tasksRes, logsRes] = await Promise.all([
            supabase.from('sites').select('id, name').eq('organization_id', profile.organization_id).eq('status', 'active'),
            supabase.from('tasks').select('*, sites(name)').eq('assigned_to', profile.id).eq('status', 'todo').order('start_date', { ascending: true }),
            supabase.from('attendance_logs').select('*, sites(name)').eq('user_id', profile.id).gte('date', startOfMonth).order('date', { ascending: false })
        ]);

        if(sitesRes.data) setProjects(sitesRes.data);
        if(tasksRes.data) setMyTasks(tasksRes.data);
        if(logsRes.data) {
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
  }, [profile]);

  useEffect(() => {
    loadAllData();
    const queue = JSON.parse(localStorage.getItem(OFFLINE_STORAGE_KEY) || '[]');
    setOfflineCount(queue.length);
  }, [loadAllData]);

  useEffect(() => {
    if (onTabChange) onTabChange(activeTab);
  }, [activeTab, onTabChange]);

  const readableDuration = useMemo(() => {
    if (logForm.start_time && logForm.end_time) {
        const [sH, sM] = logForm.start_time.split(':').map(Number);
        const [eH, eM] = logForm.end_time.split(':').map(Number);
        let totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
        if (totalMinutes < 0) totalMinutes += 24 * 60; 
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const exactDecimal = totalMinutes / 60;
        if (parseFloat(logForm.hours) !== parseFloat(exactDecimal.toFixed(2))) {
            setLogForm(prev => ({ ...prev, hours: exactDecimal.toFixed(2) }));
        }
        return `${h}h ${m}m`;
    }
    return "0h 0m";
  }, [logForm.start_time, logForm.end_time]);

  const handleTaskDone = async (taskId: string) => {
      setActionLoading(true);
      await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId);
      await loadAllData();
      setActionLoading(false);
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const payload = {
        organization_id: profile.organization_id,
        user_id: profile.id, 
        site_id: logForm.site_id,
        date: logForm.date,
        start_time: logForm.start_time,
        end_time: logForm.end_time,
        hours: parseFloat(logForm.hours),
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
        setAlert({ open: true, message: err.message });
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
          setAlert({ open: true, title: 'Uložené', message: 'Váš profil bol aktualizovaný.' });
      } catch (err: any) {
          setAlert({ open: true, message: err.message });
      } finally {
          setActionLoading(false);
      }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-orange-600" size={32}/></div>;

  const NavItem = ({ id, label, icon: Icon, count }: any) => (
    <button
      onClick={() => { setActiveTab(id); setSuccess(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold relative
        ${activeTab === id
          ? 'bg-orange-600 text-white shadow-lg shadow-orange-100'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }
        ${isSidebarCollapsed ? 'justify-center px-0' : ''}
      `}
    >
      <Icon size={20} className={activeTab === id ? 'text-white' : 'text-slate-400'} />
      {!isSidebarCollapsed && <span className="text-sm">{label}</span>}
      {count !== undefined && count > 0 && (
          <span className={`absolute ${isSidebarCollapsed ? 'top-1 right-1' : 'right-4'} bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white`}>
              {count}
          </span>
      )}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden pt-safe-top">
      
      {/* SIDEBAR (DESKTOP) */}
      <aside className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <div className="p-6 flex items-center gap-3">
              <div className="bg-orange-600 p-2 rounded-xl shrink-0">
                  <HardHat className="text-white" size={20}/>
              </div>
              {!isSidebarCollapsed && <span className="font-black text-lg tracking-tight uppercase">Moja<span className="text-orange-600">Stavba</span></span>}
          </div>

          <nav className="flex-1 px-3 space-y-1 mt-4">
              <NavItem id="dashboard" label="Domov" icon={LayoutGrid} />
              <NavItem id="tasks" label="Moje Úlohy" icon={ListTodo} count={myTasks.length} />
              <NavItem id="log" label="Zápis Práce" icon={Zap} />
              <NavItem id="profile" label="Môj Profil" icon={User} />
          </nav>

          <div className="p-4 border-t border-slate-100">
              <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors">
                  <LogOut size={16}/> {!isSidebarCollapsed && "Odhlásiť sa"}
              </button>
          </div>

          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-3 text-slate-300 hover:text-slate-500 border-t border-slate-100 flex justify-center">
              {isSidebarCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
          </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto relative flex flex-col w-full pb-24 md:pb-0 scroll-container">
          
          {/* MOBILE TOP BAR */}
          <div className="md:hidden bg-white border-b border-slate-200 p-4 px-6 flex justify-between items-center sticky top-0 z-30 shadow-sm">
               <div className="flex items-center gap-2">
                  <div className="bg-orange-600 p-1.5 rounded-lg text-white"><HardHat size={18}/></div>
                  <span className="font-black text-base uppercase">Moja<span className="text-orange-600">Stavba</span></span>
               </div>
               <button onClick={onLogout} className="text-slate-400 p-1"><LogOut size={20}/></button>
          </div>

          <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
              
              {activeTab === 'dashboard' && (
                  <div className="space-y-6 animate-in fade-in">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
                          <div>
                              <h1 className="text-2xl font-bold text-slate-900">Ahoj, {profile.full_name.split(' ')[0]}</h1>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {new Date().toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </p>
                          </div>
                          <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                              <Card padding="p-3" className="flex-1 md:w-32 bg-white border-slate-200 shadow-sm">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Tento mesiac</div>
                                  <div className="text-lg font-black text-slate-900">{formatDuration(stats.monthHours)}</div>
                              </Card>
                              <Card padding="p-3" className="flex-1 md:w-32 bg-white border-slate-200 shadow-sm">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Zárobok</div>
                                  <div className="text-lg font-black text-green-600">{formatMoney(stats.monthEarned)}</div>
                              </Card>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 space-y-4">
                              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                  <ListTodo size={16} className="text-orange-600"/> Dnešná Agenda
                              </h3>
                              
                              <div className="space-y-2">
                                  {myTasks.length === 0 ? (
                                      <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-200 text-center">
                                          <CheckCircle2 size={32} className="mx-auto text-green-300 mb-2"/>
                                          <p className="text-slate-400 text-xs font-bold">Na dnes žiadne priradené úlohy.</p>
                                      </div>
                                  ) : (
                                      myTasks.map(task => (
                                          <div key={task.id} onClick={() => setActiveTab('tasks')} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-pointer hover:border-orange-300 transition-all active:scale-[0.99]">
                                              <div className="flex gap-3 items-center min-w-0">
                                                  <div className="w-1.5 h-8 rounded-full bg-orange-500"></div>
                                                  <div className="min-w-0">
                                                      <h4 className="font-bold text-slate-800 text-sm truncate">{task.title}</h4>
                                                      <div className="text-[10px] text-slate-400 font-bold truncate uppercase">{task.sites?.name}</div>
                                                  </div>
                                              </div>
                                              <ChevronRight className="text-slate-300 group-hover:text-orange-500" size={16}/>
                                          </div>
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
                                                  <div className={`w-full rounded-t-md transition-all duration-500 ${isToday ? 'bg-orange-500' : 'bg-slate-100'}`} style={{ height: `${Math.max(10, height)}%` }}></div>
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
                  <div className="animate-in slide-in-from-right-2 space-y-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                           <ListTodo className="text-orange-600" size={24}/> Moje Úlohy
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase mt-1">Čo treba dnes urobiť</p>
                      </div>
                      
                      {myTasks.length === 0 ? (
                          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                              <CheckCircle2 size={40} className="mx-auto text-green-100 mb-3"/>
                              <h3 className="font-bold text-slate-400">Všetky úlohy sú splnené!</h3>
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {myTasks.map(task => (
                                <Card key={task.id} className="border-l-4 border-l-orange-500 shadow-sm flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                            <Calendar size={10}/> {new Date(task.start_date).toLocaleDateString('sk-SK')}
                                        </div>
                                        {task.description?.includes(PRIORITY_FLAG) && <Badge status="pricing" />}
                                    </div>
                                    <h3 className="font-bold text-base text-slate-900 mb-3">{task.title}</h3>
                                    <div className="text-[10px] font-bold text-slate-500 mb-4 bg-slate-50 px-2 py-1 rounded w-fit flex items-center gap-1 uppercase">
                                        <MapPin size={10} className="text-orange-500"/> {task.sites?.name || 'Všeobecné'}
                                    </div>
                                    {task.description && (
                                        <div className="text-xs text-slate-600 mb-6 italic bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                            {task.description.replace(PRIORITY_FLAG, '').trim()}
                                        </div>
                                    )}
                                    <Button fullWidth onClick={() => handleTaskDone(task.id)} loading={actionLoading} size="sm">
                                        <CheckCircle2 size={16}/> Splnené
                                    </Button>
                                </Card>
                            ))}
                          </div>
                      )}
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
                          <div className="w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 font-bold text-3xl border-4 border-white shadow-lg">
                              {profile.full_name?.charAt(0)}
                          </div>
                          <h2 className="text-xl font-black text-slate-900">{profile.full_name}</h2>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Pracovník firmy</p>
                      </div>

                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                          <Card className="border-slate-200 shadow-sm">
                              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><User size={14}/> Upraviť moje údaje</h3>
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

                      <Card className="bg-white border-slate-200 shadow-sm">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Coins size={14}/> Mzdové informácie</h3>
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Hodinová Sadzba</span>
                                <span className="font-black text-slate-800 text-xl">{formatMoney(profile.hourly_rate)} / h</span>
                              </div>
                              <Wallet size={24} className="text-orange-500 opacity-20"/>
                          </div>
                      </Card>

                      <div className="pt-4 space-y-2">
                          <Button variant="danger" fullWidth onClick={onLogout} className="h-11 rounded-xl font-bold text-xs uppercase tracking-widest">
                              <LogOut size={16} className="mr-2"/> Odhlásiť sa
                          </Button>
                          <p className="text-center text-[10px] text-slate-300 font-bold uppercase">Aplikácia MojaStavba v3.1.3</p>
                      </div>
                  </div>
              )}
          </div>
      </main>

      {/* MOBILE NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-pb shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)]">
          <div className="flex w-full justify-around h-16 items-center">
              {[
                  { id: 'dashboard', icon: LayoutGrid },
                  { id: 'tasks', icon: ListTodo, count: myTasks.length },
                  { id: 'log', icon: Zap },
                  { id: 'profile', icon: User },
              ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); setSuccess(false); }}
                    className={`flex flex-col items-center justify-center flex-1 transition-all relative h-full ${activeTab === tab.id ? 'text-orange-600 scale-110' : 'text-slate-300'}`}
                  >
                    <tab.icon size={22} className={activeTab === tab.id ? 'text-orange-600' : 'text-slate-300'} />
                    {tab.count !== undefined && tab.count > 0 && (
                        <span className="absolute top-2 right-1/4 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white">
                            {tab.count}
                        </span>
                    )}
                    {activeTab === tab.id && <div className="absolute bottom-1 w-1 h-1 bg-orange-600 rounded-full"></div>}
                  </button>
              ))}
          </div>
      </nav>

      <AlertModal isOpen={alert.open} onClose={() => setAlert({ open: false, message: '' })} title={alert.title || "Chyba"} message={alert.message} type={alert.title === 'Uložené' ? 'success' : 'error'} />
    </div>
  );
};
