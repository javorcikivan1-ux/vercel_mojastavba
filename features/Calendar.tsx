import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Card, Modal, Input, Select, ConfirmModal } from '../components/UI';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, CalendarDays, AlertCircle, Settings, Check } from 'lucide-react';

// Configuration for calendar hours
const START_HOUR = 5; // Start at 5:00 AM
const DAY_HOURS = 18; // Show 18 hours (5:00 - 23:00)

const PRIORITY_FLAG = "#PRIORITY";

export const CalendarScreen = ({ profile, onNavigate }: any) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState<any>({});
  
  // Custom Categories from Profile Settings
  const categories = profile.settings?.task_categories || [
      { id: '1', label: 'Všeobecné', color: '#f1f5f9' },
      { id: '2', label: 'Stavba', color: '#ffedd5' },
      { id: '3', label: 'Administratíva', color: '#dbeafe' }
  ];

  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: string | null}>({ open: false, id: null });

  const weekStart = new Date(currentDate);
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  weekStart.setDate(diff);
  weekStart.setHours(0,0,0,0);

  const weekDays = Array.from({length: 7}, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const loadData = async () => {
    const startStr = weekStart.toISOString();
    const endStr = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [t, s, u] = await Promise.all([
      supabase.from('tasks').select('*, sites(name), profiles(full_name)').eq('organization_id', profile.organization_id).gte('start_date', startStr).lt('start_date', endStr),
      supabase.from('sites').select('id, name').eq('organization_id', profile.organization_id).eq('status', 'active'),
      supabase.from('profiles').select('id, full_name').eq('organization_id', profile.organization_id)
    ]);

    if(t.data) setTasks(t.data);
    if(s.data) setSites(s.data);
    if(u.data) setUsers(u.data);
  };

  useEffect(() => { loadData(); }, [currentDate, profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find color from selected category or use default
    const selectedCat = categories.find((c: any) => c.id === newTask.categoryId) || categories[0];
    const finalColor = selectedCat?.color || '#f1f5f9';

    // Handle Priority Logic (Inject/Remove flag from description ONLY FOR DB)
    let finalDesc = (newTask.description || '').replace(PRIORITY_FLAG, '').trim();
    if (newTask.isPriority) {
        finalDesc = PRIORITY_FLAG + ' ' + finalDesc;
    }

    const payload = {
      title: newTask.title,
      description: finalDesc,
      site_id: newTask.site_id,
      assigned_to: newTask.assigned_to,
      organization_id: profile.organization_id,
      color: finalColor,
      status: newTask.status || 'todo',
      start_date: new Date(newTask.start_date).toISOString(),
      end_date: new Date(newTask.end_date).toISOString()
    };

    if(newTask.id) {
       const { error } = await supabase.from('tasks').update(payload).eq('id', newTask.id);
       if (error) console.error("Error updating task:", error);
    } else {
       const { error } = await supabase.from('tasks').insert([payload]);
       if (error) console.error("Error inserting task:", error);
    }
    
    setShowModal(false);
    loadData();
  };

  const performDelete = async () => {
    if(confirmDelete.id) {
      await supabase.from('tasks').delete().eq('id', confirmDelete.id);
      setConfirmDelete({ open: false, id: null });
      setShowModal(false); // Also close the edit modal if it was open
      loadData();
    }
  };

  const handleDeleteClick = () => {
      // Don't close edit modal yet, just open confirm
      setConfirmDelete({ open: true, id: newTask.id });
  };

  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const toLocalIso = (date: Date) => {
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const onDrop = async (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if(!task) return;

    const oldStart = new Date(task.start_date);
    const duration = new Date(task.end_date).getTime() - oldStart.getTime();
    
    const newStart = new Date(day);
    newStart.setHours(hour, oldStart.getMinutes());
    const newEnd = new Date(newStart.getTime() + duration);

    // Optimistic update
    const updatedTask = { ...task, start_date: newStart.toISOString(), end_date: newEnd.toISOString() };
    setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    
    await supabase.from('tasks').update({ 
        start_date: updatedTask.start_date, 
        end_date: updatedTask.end_date 
    }).eq('id', taskId);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* MAPRESTAV HEADER STYLE */}
      <div className="shrink-0 space-y-4 md:space-y-0 md:flex md:justify-between md:items-center">
        <div>
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarIcon className="text-orange-600" />
              Kalendár
           </h2>
           <p className="text-sm text-slate-500 mt-1 font-medium">Plánovanie úloh a harmonogram</p>
        </div>
        
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {/* NEW TASK BUTTON (Stacked on mobile) */}
            <Button onClick={() => { 
                const now = new Date();
                const end = new Date(now.getTime() + 3600000);
                setNewTask({ start_date: toLocalIso(now), end_date: toLocalIso(end), categoryId: categories[0]?.id }); 
                setShowModal(true); 
            }} className="whitespace-nowrap w-full md:w-auto justify-center md:order-2">
                <Plus size={18}/> Nová Úloha
            </Button>

            <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto justify-between md:justify-start md:order-1">
                <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition shrink-0"><ChevronLeft size={20}/></button>
                
                <div className="text-center px-2 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Aktuálny týždeň</span>
                    <span className="text-sm font-extrabold text-slate-800 leading-none whitespace-nowrap flex items-center justify-center gap-1">
                        <CalendarDays size={14} className="text-orange-500"/>
                        {weekDays[0].getDate()}.{weekDays[0].getMonth()+1}. - {weekDays[6].getDate()}.{weekDays[6].getMonth()+1}.
                    </span>
                </div>

                <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition shrink-0"><ChevronRight size={20}/></button>
            </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-auto relative flex flex-col">
        <div className="min-w-[900px] flex-1 relative">
          <div className="grid grid-cols-[60px_1fr] border-b border-slate-200 sticky top-0 bg-white z-20">
            <div className="p-3 text-center flex items-center justify-center">
               <span className="text-[10px] font-black text-slate-300 uppercase">Čas</span>
            </div>
            <div className="grid grid-cols-7 divide-x divide-slate-100">
              {weekDays.map(d => {
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={d.toString()} className={`p-3 text-center group ${isToday ? 'bg-orange-50/50' : ''}`}>
                    <div className={`text-[10px] font-bold uppercase mb-1 tracking-wider ${isToday ? 'text-orange-600' : 'text-slate-400'}`}>{d.toLocaleDateString('sk-SK', {weekday: 'short'})}</div>
                    <div className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-lg font-extrabold ${isToday ? 'bg-orange-600 text-white shadow-md shadow-orange-200' : 'text-slate-700'} transition-all group-hover:scale-110`}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-[60px_1fr]">
            <div className="border-r border-slate-200 bg-white">
              {Array.from({length: DAY_HOURS}, (_, i) => i + START_HOUR).map(h => (
                <div key={h} className="h-16 border-b border-slate-100 relative group">
                   <span className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-white px-1 text-[10px] text-slate-400 group-hover:text-orange-500 font-mono">
                    {h}:00
                   </span>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 divide-x divide-slate-100 relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
              {weekDays.map(day => (
                <div key={day.toString()} className="relative h-full">
                  {Array.from({length: DAY_HOURS}, (_, i) => i + START_HOUR).map(h => (
                    <div 
                      key={h} 
                      className="h-16 border-b border-slate-100/50 hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => {
                        const d = new Date(day);
                        d.setHours(h, 0, 0, 0); // Reset minutes/seconds to 0
                        const end = new Date(d.getTime() + 3600000);
                        setNewTask({ start_date: toLocalIso(d), end_date: toLocalIso(end), categoryId: categories[0]?.id });
                        setShowModal(true);
                      }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => onDrop(e, day, h)}
                    />
                  ))}
                </div>
              ))}

              {tasks.map(task => {
                const start = new Date(task.start_date);
                const end = new Date(task.end_date);
                const dayIndex = (start.getDay() + 6) % 7; 
                const startHour = start.getHours() + (start.getMinutes()/60);
                const top = (startHour - START_HOUR) * 64; 
                const durationHrs = (end.getTime() - start.getTime()) / 3600000;
                const height = durationHrs * 64;
                
                const isPriority = task.description?.includes(PRIORITY_FLAG);
                const cleanDesc = (task.description || '').replace(PRIORITY_FLAG, '').trim();

                if (top < 0) return null; 

                return (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={e => onDragStart(e, task.id)}
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        const cat = categories.find((c: any) => c.color === task.color);
                        
                        setNewTask({
                            ...task,
                            description: cleanDesc,
                            isPriority: isPriority,
                            categoryId: cat?.id || categories[0]?.id,
                            start_date: toLocalIso(new Date(task.start_date)),
                            end_date: toLocalIso(new Date(task.end_date))
                        }); 
                        setShowModal(true); 
                    }}
                    className="absolute m-0.5 rounded-lg px-2 py-1 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:scale-[1.02] transition z-10 border-l-4 border-black/5 select-none flex flex-col group"
                    style={{
                      top: `${top}px`,
                      left: `calc(${dayIndex * 100}% / 7)`,
                      width: `calc(100% / 7 - 4px)`,
                      height: `${Math.max(30, height)}px`,
                      backgroundColor: task.color || '#f1f5f9'
                    }}
                  >
                    <div className="flex justify-between items-start gap-1">
                         <div className="font-bold truncate w-full leading-tight text-slate-800 text-xs flex items-center gap-1">
                            {isPriority && <AlertCircle size={12} className="text-red-600 shrink-0" strokeWidth={3}/>}
                            {task.title}
                         </div>
                    </div>
                    {cleanDesc && (
                        <div className="truncate w-full opacity-70 text-[9px] font-medium leading-tight mt-0.5 text-slate-600">{cleanDesc}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <Modal title={newTask.id ? "Upraviť Úlohu" : "Nová Úloha"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Názov úlohy" value={newTask.title || ''} onChange={(e: any) => setNewTask({...newTask, title: e.target.value})} required autoFocus />
            
            <div className="mt-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Poznámka</label>
                <textarea 
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-orange-500 h-24 text-sm font-medium"
                    value={newTask.description || ''} 
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})} 
                    placeholder="Čo sa má spraviť? (viac riadkov)..."
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Začiatok" type="datetime-local" value={newTask.start_date} onChange={(e: any) => setNewTask({...newTask, start_date: e.target.value})} required />
              <Input label="Koniec" type="datetime-local" value={newTask.end_date} onChange={(e: any) => setNewTask({...newTask, end_date: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Projekt" value={newTask.site_id || ''} onChange={(e: any) => setNewTask({...newTask, site_id: e.target.value})}>
                <option value="">-- Všeobecné --</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Select label="Priradiť" value={newTask.assigned_to || ''} onChange={(e: any) => setNewTask({...newTask, assigned_to: e.target.value})}>
                <option value="">-- Nikto --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </Select>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Kategória (Typ úlohy)</label>
                 <button 
                    type="button" 
                    onClick={() => { setShowModal(false); if(onNavigate) onNavigate('settings', { tab: 'categories' }); }}
                    className="text-[10px] font-bold text-orange-600 flex items-center gap-1 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-200 rounded"
                 >
                    <Settings size={12}/> Spravovať kategórie
                 </button>
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {categories.map((cat: any) => (
                      <button 
                        key={cat.id} 
                        type="button"
                        onClick={() => setNewTask({...newTask, categoryId: cat.id})} 
                        className={`flex items-center gap-3 p-3 rounded-xl border transition text-left focus:outline-none ${newTask.categoryId === cat.id ? 'bg-slate-50 border-slate-400 shadow-sm scale-[1.01]' : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                          <div className={`w-5 h-5 rounded-full border border-black/10 shrink-0 flex items-center justify-center transition`} style={{backgroundColor: cat.color}}>
                              {newTask.categoryId === cat.id && <Check size={12} className="text-slate-800" />}
                          </div>
                          <span className={`text-sm font-bold truncate transition ${newTask.categoryId === cat.id ? 'text-slate-900' : 'text-slate-600'}`}>{cat.label}</span>
                      </button>
                  ))}
              </div>
            </div>

            <div className="pt-2">
                 <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 cursor-pointer transition group">
                     <input 
                        type="checkbox" 
                        checked={newTask.isPriority || false} 
                        onChange={(e) => setNewTask({...newTask, isPriority: e.target.checked})}
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-slate-300" 
                     />
                     <div className="flex-1">
                         <div className="font-bold text-slate-700 group-hover:text-red-700 text-sm flex items-center gap-2">
                             <AlertCircle size={16} className="text-red-500" strokeWidth={3}/> Označiť ako prioritu
                         </div>
                     </div>
                 </label>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-2">
              {newTask.id ? <Button type="button" variant="danger" onClick={handleDeleteClick}><Trash2 size={16}/> Zmazať</Button> : <div></div>}
              <Button type="submit">Uložiť Úlohu</Button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ ...confirmDelete, open: false })}
        onConfirm={performDelete}
        title="Zmazať úlohu?"
        message="Naozaj chcete odstrániť túto úlohu z kalendára?"
        type="danger"
      />
    </div>
  );
};