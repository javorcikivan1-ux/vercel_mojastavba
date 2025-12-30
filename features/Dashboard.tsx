
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { Button, Modal, Card } from '../components/UI';
import { Users, AlertCircle, Calendar, LayoutGrid, MapPin, User, Plus, BookOpen, CheckCircle2, Loader2, Clock, XCircle, ChevronRight, Search, Activity } from 'lucide-react';

const PRIORITY_FLAG = "#PRIORITY";

export const DashboardScreen = ({ profile, organization, onNavigate }: { profile: UserProfile, organization: any, onNavigate: (view: string) => void }) => {
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<{logged: any[], missing: any[]}>({ logged: [], missing: [] });
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!profile.organization_id) return;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    now.setHours(0, 0, 0, 0); 
    const todayStartIso = now.toISOString();

    const futureDate = new Date(now);
    futureDate.setDate(now.getDate() + 4); 
    futureDate.setHours(23, 59, 59, 999);
    const futureEndIso = futureDate.toISOString();

    const [overdue, upcoming, workers, logs] = await Promise.all([
      supabase.from('tasks').select('*, sites(name), profiles(full_name)').eq('organization_id', profile.organization_id).eq('status', 'todo').lt('start_date', todayStartIso).order('start_date'),
      supabase.from('tasks').select('*, sites(name), profiles(full_name)').eq('organization_id', profile.organization_id).eq('status', 'todo').gte('start_date', todayStartIso).lte('start_date', futureEndIso).order('start_date'),
      supabase.from('profiles').select('id, full_name').eq('organization_id', profile.organization_id).eq('is_active', true).eq('role', 'employee'),
      supabase.from('attendance_logs').select('*, sites(name)').eq('organization_id', profile.organization_id).eq('date', todayStr)
    ]);
    
    if(overdue.data) setOverdueTasks(overdue.data);
    if(upcoming.data) setUpcomingTasks(upcoming.data);
    
    if (workers.data) {
        const loggedMap = new Map();
        (logs.data || []).forEach(l => loggedMap.set(l.user_id, l));
        
        const logged = workers.data
            .filter(w => loggedMap.has(w.id))
            .map(w => ({ ...w, log: loggedMap.get(w.id) }));
        
        const missing = workers.data.filter(w => !loggedMap.has(w.id));
        setAttendanceStatus({ logged, missing });
    }

    setLoading(false);
  }, [profile.organization_id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleMarkAsDone = async (taskId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId);
      if (error) throw error;
      setSelectedTask(null);
      await fetchDashboardData();
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const isDateToday = (isoString: string) => {
    const d = new Date(isoString);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const formatTimeRange = (startIso: string, endIso: string) => {
      const start = new Date(startIso);
      const end = new Date(endIso);
      return `${start.toLocaleTimeString('sk-SK', {hour:'2-digit', minute:'2-digit'})} - ${end.toLocaleTimeString('sk-SK', {hour:'2-digit', minute:'2-digit'})}`;
  };

  const filteredLogged = attendanceStatus.logged.filter(w => w.full_name.toLowerCase().includes(attendanceSearch.toLowerCase()));
  const filteredMissing = attendanceStatus.missing.filter(w => w.full_name.toLowerCase().includes(attendanceSearch.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <LayoutGrid className="text-orange-600" size={28} />
              Nástenka
           </h2>
           <p className="text-xs text-slate-500 font-medium">Vitaj, {organization?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => onNavigate('projects')} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-orange-300 hover:shadow-md transition flex items-center gap-3 group text-left">
              <div className="bg-orange-50 text-orange-600 p-2 rounded-lg group-hover:scale-110 transition"><Plus size={18}/></div>
              <div><div className="text-xs font-bold text-slate-900">Nový Projekt</div><div className="text-[10px] text-slate-400">Vytvoriť zákazku</div></div>
          </button>
          <button onClick={() => onNavigate('calendar')} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition flex items-center gap-3 group text-left">
              <div className="bg-blue-50 text-blue-600 p-2 rounded-lg group-hover:scale-110 transition"><Calendar size={18}/></div>
              <div><div className="text-xs font-bold text-slate-900">Kalendár</div><div className="text-[10px] text-slate-400">Plán práce</div></div>
          </button>
          <button onClick={() => onNavigate('diary')} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-orange-300 hover:shadow-md transition flex items-center gap-3 group text-left">
              <div className="bg-orange-50 text-orange-600 p-2 rounded-lg group-hover:scale-110 transition"><BookOpen size={18}/></div>
              <div><div className="text-xs font-bold text-slate-900">Stavebný denník</div><div className="text-[10px] text-slate-400">Zápis dňa</div></div>
          </button>
          <button onClick={() => onNavigate('team')} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-purple-300 hover:shadow-md transition flex items-center gap-3 group text-left">
              <div className="bg-purple-50 text-purple-600 p-2 rounded-lg group-hover:scale-110 transition"><Users size={18}/></div>
              <div><div className="text-xs font-bold text-slate-900">Moji zamestnanci</div><div className="text-[10px] text-slate-400">Správa tímu</div></div>
          </button>
      </div>

      {/* COMPACT ATTENDANCE SUMMARY CARD */}
      <Card 
        onClick={() => setShowAttendanceModal(true)}
        className="bg-white border-slate-200 shadow-sm overflow-hidden p-4 cursor-pointer hover:border-orange-400 transition-all group"
      >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                  <div className="bg-orange-100 text-orange-600 p-3 rounded-2xl group-hover:scale-110 transition">
                      <Clock size={24}/>
                  </div>
                  <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">Status Dochádzky (Dnes)</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-2xl font-black text-slate-800">{attendanceStatus.logged.length} / {attendanceStatus.logged.length + attendanceStatus.missing.length}</span>
                          <span className="text-[10px] font-black uppercase text-slate-400">ZAPÍSANÝCH</span>
                      </div>
                  </div>
              </div>

              <div className="flex-1 w-full md:max-w-xs">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-1.5">
                      <span>Priebeh zápisov</span>
                      <span>{Math.round((attendanceStatus.logged.length / (attendanceStatus.logged.length + attendanceStatus.missing.length || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-orange-500 h-full transition-all duration-1000" 
                        style={{ width: `${(attendanceStatus.logged.length / (attendanceStatus.logged.length + attendanceStatus.missing.length || 1)) * 100}%` }}
                      ></div>
                  </div>
              </div>

              <div className="hidden md:flex items-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-widest">
                  Detail <ChevronRight size={16}/>
              </div>
          </div>
      </Card>

      {/* ATTENDANCE DETAIL MODAL */}
      {showAttendanceModal && (
          <Modal title="Detail dochádzky (Dnes)" onClose={() => setShowAttendanceModal(false)} maxWidth="max-w-2xl">
              <div className="space-y-6">
                  <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Hľadať zamestnanca..." 
                        value={attendanceSearch}
                        onChange={(e) => setAttendanceSearch(e.target.value)}
                        className="w-full p-3 pl-10 bg-slate-100 border-none rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500/20 transition"
                      />
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  </div>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                      {/* LOGGED SECTION */}
                      {filteredLogged.length > 0 && (
                          <div>
                              <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <CheckCircle2 size={14}/> Zapísaní zamestnanci ({filteredLogged.length})
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                  {filteredLogged.map(w => (
                                      <div key={w.id} className="bg-green-50/50 p-3 rounded-xl border border-green-100 flex justify-between items-center">
                                          <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-full bg-white border border-green-200 flex items-center justify-center font-black text-green-700 text-sm shadow-sm">{w.full_name?.charAt(0)}</div>
                                              <div>
                                                  <div className="font-bold text-slate-800 text-sm">{w.full_name}</div>
                                                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-bold">
                                                      <MapPin size={10} className="text-orange-500"/> {w.log?.sites?.name || 'Všeobecné'}
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <div className="text-sm font-black text-slate-800">{w.log?.hours} h</div>
                                              <div className="text-[9px] text-slate-400 font-bold uppercase">{w.log?.start_time} - {w.log?.end_time}</div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* MISSING SECTION */}
                      {filteredMissing.length > 0 && (
                          <div>
                              <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <AlertCircle size={14}/> Chýbajúci zápis ({filteredMissing.length})
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                  {filteredMissing.map(w => (
                                      <div key={w.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center opacity-70">
                                          <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center font-black text-slate-400 text-sm">{w.full_name?.charAt(0)}</div>
                                              <div className="font-bold text-slate-700 text-sm">{w.full_name}</div>
                                          </div>
                                          <div className="text-[10px] font-black text-red-400 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-lg">Ešte nezapísal</div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {filteredLogged.length === 0 && filteredMissing.length === 0 && (
                          <div className="text-center py-10 text-slate-400 font-bold uppercase text-xs italic">Nenašli sa žiadni zamestnanci.</div>
                      )}
                  </div>

                  <Button fullWidth onClick={() => setShowAttendanceModal(false)} variant="secondary">Zavrieť prehľad</Button>
              </div>
          </Modal>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-auto min-h-[220px] md:h-[450px]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-red-50/30">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600"/> V omeškaní
            </h3>
            {overdueTasks.length > 0 && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{overdueTasks.length}</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {overdueTasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-8 md:py-0">
                <div className="bg-green-50 p-3 rounded-full mb-2"><Calendar size={24} className="text-green-500"/></div>
                <span>Všetko vyriešené.</span>
              </div>
            ) : (
              overdueTasks.map(task => (
                  <div key={task.id} onClick={() => setSelectedTask(task)} className="p-3 bg-white border border-red-100 hover:border-red-300 rounded-lg shadow-sm transition cursor-pointer group relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                    <div className="pl-2">
                        <div className="flex justify-between items-start gap-2">
                            <span className="text-[10px] font-bold text-red-500 uppercase whitespace-nowrap">{new Date(task.start_date).toLocaleDateString('sk-SK')}</span>
                            {task.sites && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1 truncate max-w-[150px]"><MapPin size={8}/> {task.sites.name}</span>}
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 truncate mt-0.5 flex items-center gap-1.5">{task.title}</h4>
                        {task.profiles && <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><User size={10}/> {task.profiles.full_name}</div>}
                    </div>
                  </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-auto min-h-[220px] md:h-[450px]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-50/30">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Calendar size={16} className="text-blue-600"/> Plán (5 dní)
            </h3>
            {upcomingTasks.length > 0 && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{upcomingTasks.length}</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {upcomingTasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-8 md:py-0">
                <Calendar size={24} className="text-slate-300 mb-2"/>
                <span>Prázdny kalendár.</span>
              </div>
            ) : (
              upcomingTasks.map(task => {
                const isToday = isDateToday(task.start_date);
                return (
                  <div key={task.id} onClick={() => setSelectedTask(task)} className={`p-3 bg-white border rounded-lg shadow-sm transition cursor-pointer group relative overflow-hidden ${isToday ? 'border-orange-200 hover:border-orange-400' : 'border-slate-200 hover:border-blue-400'}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isToday ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                    <div className="pl-2">
                        <div className="flex justify-between items-start gap-2">
                            <span className={`text-[10px] font-bold uppercase whitespace-nowrap ${isToday ? 'text-orange-600' : 'text-blue-500'}`}>
                                {isToday ? 'Dnes' : new Date(task.start_date).toLocaleDateString('sk-SK', {weekday: 'short', day: 'numeric', month: 'numeric'})}
                            </span>
                            {task.sites && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1 truncate max-w-[150px]"><MapPin size={8}/> {task.sites.name}</span>}
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 truncate mt-0.5 flex items-center gap-1.5">{task.title}</h4>
                        {task.profiles && <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><User size={10}/> {task.profiles.full_name}</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedTask && (
          <Modal title="Detail úlohy" onClose={() => setSelectedTask(null)}>
              <div className="space-y-6">
                  <div>
                      <div className="text-xs uppercase font-bold text-slate-400 mb-1">Názov úlohy</div>
                      <h3 className="text-xl font-bold text-slate-900">{selectedTask.title}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="text-xs uppercase font-bold text-slate-400 mb-1 flex items-center gap-1"><Calendar size={12}/> Termín</div>
                          <div className="font-medium">{new Date(selectedTask.start_date).toLocaleDateString('sk-SK')} <br/><span className="text-sm text-slate-500">{formatTimeRange(selectedTask.start_date, selectedTask.end_date)}</span></div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="text-xs uppercase font-bold text-slate-400 mb-1 flex items-center gap-1"><MapPin size={12}/> Stavba</div>
                          <div className="font-medium">{selectedTask.sites?.name || 'Všeobecné'}</div>
                      </div>
                  </div>
                  <div>
                      <div className="text-xs uppercase font-bold text-slate-400 mb-1">Popis</div>
                      <p className="text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 italic whitespace-pre-wrap">{(selectedTask.description || "").replace(PRIORITY_FLAG, "").trim() || "Bez popisu."}</p>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><User size={16}/></div>
                      <div>
                          <div className="text-xs text-slate-400 font-bold uppercase">Priradený</div>
                          <div className="font-bold text-slate-800">{selectedTask.profiles?.full_name || 'Nikto'}</div>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                      <Button variant="primary" fullWidth className="bg-green-600 hover:bg-green-700 shadow-green-100" onClick={() => handleMarkAsDone(selectedTask.id)} loading={actionLoading}><CheckCircle2 size={18}/> Označiť ako vybavené</Button>
                      <Button variant="secondary" fullWidth onClick={() => onNavigate('calendar')}>Prejsť do Kalendára</Button>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};
