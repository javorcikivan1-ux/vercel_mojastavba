import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button } from '../components/UI';
import { FileCheck, Calendar, User, Printer, Loader2, Clock, ChevronLeft, ChevronRight, Settings2, LayoutList, Calculator, Pencil, Eye, EyeOff, Briefcase } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { exportElementToPdf } from '../lib/pdfExport';

export const AttendanceScreen = ({ profile, organization }: any) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState(profile.role === 'admin' ? '' : profile.id);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [editableLogs, setEditableLogs] = useState<any[]>([]);

  const [exportOptions, setExportOptions] = useState({
      viewMode: 'summarized' as 'detailed' | 'summarized',
      showSites: true,
      showDescription: true,
      useTemplate: false,
      templateStart: '07:00',
      breakStart: '12:00',
      breakDuration: 30
  });

  const printRef = useRef<HTMLDivElement>(null);

  // Funkcia na výpočet hodín z textového reťazca "07:00 - 15:30"
  const parseTimeToHours = (timeStr: string): number | null => {
      if (!timeStr) return null;
      const regex = /(\d{1,2})[:.](\d{2})\s*[-–,]\s*(\d{1,2})[:.](\d{2})/;
      const match = timeStr.match(regex);
      if (!match) return null;

      const h1 = parseInt(match[1]);
      const m1 = parseInt(match[2]);
      const h2 = parseInt(match[3]);
      const m2 = parseInt(match[4]);

      const startMins = h1 * 60 + m1;
      let endMins = h2 * 60 + m2;
      
      if (endMins < startMins) endMins += 24 * 60; // Cez polnoc

      return parseFloat(((endMins - startMins) / 60).toFixed(1));
  };

  useEffect(() => {
    if (profile.role === 'admin') {
      const loadEmployees = async () => {
        const { data } = await supabase.from('profiles')
            .select('id, full_name, hourly_rate, cost_rate')
            .eq('organization_id', profile.organization_id)
            .order('full_name');
        if (data) setEmployees(data);
      };
      loadEmployees();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedEmpId) {
      loadLogs();
    } else {
        setLogs([]);
    }
  }, [selectedEmpId, currentDate]);

  const loadLogs = async () => {
    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startOfMonth = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endOfMonth = `${year}-${(month + 1).toString().padStart(2, '0')}-${lastDay}`;

    const { data } = await supabase.from('attendance_logs')
      .select('*, sites(name)')
      .eq('user_id', selectedEmpId)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date');
    if (data) setLogs(data);
    setLoading(false);
  };

  const addMinutes = (time: string, mins: number) => {
      const [h, m] = (time || "07:00").split(':').map(Number);
      const date = new Date();
      date.setHours(h, m + mins, 0);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Formátovanie času podľa šablóny (napr. 7:00 - 12:00, 12:30 - 16:00)
  const formatWithTemplate = (totalHours: number) => {
      const start = exportOptions.templateStart;
      const breakS = exportOptions.breakStart;
      const breakDur = exportOptions.breakDuration;
      const totalMins = Math.round(totalHours * 60);
      
      const [sh, sm] = start.split(':').map(Number);
      const [bh, bm] = breakS.split(':').map(Number);
      const minsBeforeBreak = (bh * 60 + bm) - (sh * 60 + sm);

      if (totalMins <= minsBeforeBreak) {
          return `${start} - ${addMinutes(start, totalMins)}`;
      } else {
          const endAfterBreak = addMinutes(breakS, breakDur + (totalMins - minsBeforeBreak));
          return `${start} - ${breakS}, ${addMinutes(breakS, breakDur)} - ${endAfterBreak}`;
      }
  };

  const processLogs = (sourceLogs: any[]) => {
      let processed: any[] = [];
      if (exportOptions.viewMode === 'summarized') {
          const groupMap: Record<string, any> = {};
          sourceLogs.forEach(l => {
              const siteId = l.site_id || 'none';
              // Zoskupujeme podľa dňa a stavby
              const groupKey = `${l.date}_${siteId}_${l.payment_type || 'hourly'}`;
              
              if (!groupMap[groupKey]) {
                  groupMap[groupKey] = { 
                      date: l.date,
                      totalHours: parseFloat(l.hours) || 0,
                      descriptions: l.description ? [l.description] : [], 
                      siteNames: l.sites?.name ? [l.sites.name] : [],
                      isFixed: l.payment_type === 'fixed',
                      start_time: l.start_time,
                      end_time: l.end_time
                  };
              } else {
                  groupMap[groupKey].totalHours += parseFloat(l.hours) || 0;
                  if (l.description && !groupMap[groupKey].descriptions.includes(l.description)) groupMap[groupKey].descriptions.push(l.description);
                  const sName = l.sites?.name;
                  if (sName && !groupMap[groupKey].siteNames.includes(sName)) groupMap[groupKey].siteNames.push(sName);
                  if (l.start_time && (!groupMap[groupKey].start_time || l.start_time < groupMap[groupKey].start_time)) groupMap[groupKey].start_time = l.start_time;
                  if (l.end_time && (!groupMap[groupKey].end_time || l.end_time > groupMap[groupKey].end_time)) groupMap[groupKey].end_time = l.end_time;
              }
          });

          processed = Object.values(groupMap).map(d => ({
              ...d,
              hours: d.totalHours.toFixed(1),
              description: d.descriptions.join(', '),
              siteName: d.siteNames.join(', '),
              displayTime: exportOptions.useTemplate 
                ? formatWithTemplate(d.totalHours) 
                : (d.start_time && d.end_time ? `${d.start_time} - ${d.end_time}` : '---')
          })).sort((a, b) => a.date.localeCompare(b.date));
      } else {
          processed = sourceLogs.map(l => ({
              ...l,
              hours: parseFloat(l.hours || 0).toFixed(1),
              siteName: l.sites?.name,
              isFixed: l.payment_type === 'fixed',
              displayTime: exportOptions.useTemplate 
                ? formatWithTemplate(parseFloat(l.hours || 0)) 
                : (l.start_time && l.end_time ? `${l.start_time} - ${l.end_time}` : '---')
          }));
      }
      setEditableLogs(processed);
  };

  useEffect(() => {
    if (logs.length > 0) {
        processLogs(logs);
    } else {
        setEditableLogs([]);
    }
  }, [logs, exportOptions]);

  const stats = useMemo(() => {
    return editableLogs.reduce((acc, log) => {
        const h = parseFloat(log.hours) || 0;
        if (log.isFixed) {
            acc.fixedHours += h;
            acc.fixedCount += 1;
        } else {
            acc.hourlyHours += h;
        }
        return acc;
    }, { hourlyHours: 0, fixedHours: 0, fixedCount: 0 });
  }, [editableLogs]);

  const handleRowChange = (index: number, field: string, value: any) => {
      const newLogs = [...editableLogs];
      newLogs[index] = { ...newLogs[index], [field]: value };

      if (field === 'displayTime') {
          const calculatedHours = parseTimeToHours(value);
          if (calculatedHours !== null) {
              newLogs[index].hours = calculatedHours.toFixed(1);
          }
      }
      setEditableLogs(newLogs);
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setExporting(true);

    try {
        const empName = employees.find(e => e.id === selectedEmpId)?.full_name || profile.full_name;
        const monthName = currentDate.toLocaleString('sk-SK', { month: 'long', year: 'numeric' });
        await exportElementToPdf(printRef.current, {
            filename: `Dochadzka_${empName.replace(' ', '_')}_${monthName.replace(' ', '_')}.pdf`,
            pageMarginMm: 8
        });
    } catch (e: any) {
        console.error('PDF Export Error:', e);
        window.alert('PDF export zlyhal. Skúste znova alebo použite desktop verziu.');
    } finally {
        setExporting(false);
    }
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const selectedEmployeeName = profile.role === 'admin' 
    ? (employees.find(e => e.id === selectedEmpId)?.full_name || 'Vyberte zamestnanca')
    : profile.full_name;
  const selectedEmployee = profile.role === 'admin'
    ? employees.find(e => e.id === selectedEmpId)
    : profile;
  const monthLabel = currentDate.toLocaleString('sk-SK', { month: 'long', year: 'numeric' });
  const visibleColumnCount = 3 + (exportOptions.showSites ? 1 : 0) + (exportOptions.showDescription ? 1 : 0);
  const totalLabelColSpan = Math.max(1, visibleColumnCount - 1);

  return (
    <div className="space-y-6 pb-4 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="app-section-title">
            <FileCheck className="text-orange-600" />
            Dochádzky
          </h2>
          <p className="app-section-subtitle">Správa a export mesačných výkazov</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button onClick={handleExportPDF} disabled={!selectedEmpId || editableLogs.length === 0 || exporting} fullWidth className="md:w-auto shadow-lg shadow-orange-100">
            {exporting ? <Loader2 className="animate-spin" size={18}/> : <Printer size={18} />} 
            Generovať PDF
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 items-start">
            <Card className="grid grid-cols-1 md:grid-cols-[minmax(260px,1fr)_240px] gap-4 items-end shadow-sm border-slate-200">
                {profile.role === 'admin' && (
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            <User size={16} className="text-orange-500"/>
                            Zamestnanec
                        </label>
                        <select value={selectedEmpId} onChange={(e: any) => setSelectedEmpId(e.target.value)} className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition cursor-pointer text-sm font-semibold text-slate-800">
                            <option value="">Vyberte zamestnanca</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                        </select>
                    </div>
                )}
                <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        <Calendar size={16} className="text-orange-500"/>
                        Obdobie
                    </label>
                    <div className="h-11 flex items-center justify-between p-1.5 bg-slate-50 rounded-xl border border-slate-200 shadow-inner min-w-0">
                        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition shadow-sm bg-white/60"><ChevronLeft size={17}/></button>
                        <div className="px-2 text-center font-bold text-slate-900 capitalize text-sm whitespace-nowrap">
                            {currentDate.toLocaleString('sk-SK', { month: 'long', year: 'numeric' })}
                        </div>
                        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition shadow-sm bg-white/60"><ChevronRight size={17}/></button>
                    </div>
                </div>
            </Card>

            <Card className="space-y-4 bg-slate-50/50 border-slate-200 shadow-none">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2 text-xs uppercase tracking-widest">
                    <Settings2 size={16} className="text-slate-400"/> Nastavenia Exportu
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(280px,1fr)] xl:grid-cols-[260px_minmax(300px,1fr)_260px] gap-3 items-start">
                    <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button onClick={() => setExportOptions({...exportOptions, viewMode: 'detailed'})} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${exportOptions.viewMode === 'detailed' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutList size={14}/> Podrobný</button>
                        <button onClick={() => setExportOptions({...exportOptions, viewMode: 'summarized'})} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${exportOptions.viewMode === 'summarized' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><Calculator size={14}/> Súhrnný</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                        <label className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-orange-200 transition group">
                            <input type="checkbox" checked={exportOptions.showSites} onChange={e => setExportOptions({...exportOptions, showSites: e.target.checked})} className="w-5 h-5 text-orange-600 rounded border-slate-300" />
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-2">{exportOptions.showSites ? <Eye size={14} className="text-green-500"/> : <EyeOff size={14} className="text-slate-300"/>} Zákazka</span>
                        </label>
                        <label className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-orange-200 transition group">
                            <input type="checkbox" checked={exportOptions.showDescription} onChange={e => setExportOptions({...exportOptions, showDescription: e.target.checked})} className="w-5 h-5 text-orange-600 rounded border-slate-300" />
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-2">{exportOptions.showDescription ? <Eye size={14} className="text-green-500"/> : <EyeOff size={14} className="text-slate-300"/>} Činnosť</span>
                        </label>
                    </div>

                    <div className="relative min-w-0">
                        <label className="h-11 flex items-center gap-2 px-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-orange-200 transition group">
                            <input type="checkbox" id="useTemplate" checked={exportOptions.useTemplate} onChange={e => setExportOptions({...exportOptions, useTemplate: e.target.checked})} className="w-5 h-5 text-orange-600 rounded border-slate-300" />
                            <label htmlFor="useTemplate" className="text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">Upraviť rozvrhnutie času</label>
                        </label>
                        
                        {exportOptions.useTemplate && (
                            <div className="absolute right-0 top-full z-40 mt-2 w-[320px] max-w-[calc(100vw-3rem)] grid grid-cols-1 gap-3 p-3 bg-white rounded-xl border border-orange-100 animate-in slide-in-from-top-2 shadow-xl">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Začiatok</label>
                                    <input type="time" value={exportOptions.templateStart} onChange={e => setExportOptions({...exportOptions, templateStart: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Prestávka Od</label>
                                    <input type="time" value={exportOptions.breakStart} onChange={e => setExportOptions({...exportOptions, breakStart: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Trvanie (min)</label>
                                    <select value={exportOptions.breakDuration} onChange={e => setExportOptions({...exportOptions, breakDuration: parseInt(e.target.value)})} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50">
                                        <option value={15}>15 min</option>
                                        <option value={30}>30 min</option>
                                        <option value={45}>45 min</option>
                                        <option value={60}>60 min</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>

        <Card className="p-0 overflow-hidden shadow-sm border-slate-200 flex flex-col min-h-[600px] bg-white">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/70 sticky top-0 z-20">
             <div className="flex items-center gap-3">
                 <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-blue-500 shadow-inner"><Pencil size={20}/></div>
                 <div>
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Editor Náhľadu PDF</h3>
                    <p className="text-xs text-slate-600 font-semibold">{selectedEmployeeName}</p>
                 </div>
             </div>
             
             <div className="flex flex-wrap sm:flex-nowrap justify-end gap-2 w-full sm:w-auto">
                <div className="min-w-[190px] h-14 bg-white border border-slate-200 px-3 rounded-xl flex flex-row-reverse items-center justify-end gap-3 shadow-sm transition-colors flex-1 sm:flex-none">
                    <div className="text-left flex-1 sm:flex-none">
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 block leading-none mb-1">Hodinový fond</span>
                        <span className="text-xl font-black text-slate-900 leading-none whitespace-nowrap">{stats.hourlyHours.toFixed(1)} <span className="text-xs font-semibold text-slate-500 uppercase">hod</span></span>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-orange-500 shrink-0">
                        <Clock size={17}/>
                    </div>
                </div>

                <div className="min-w-[190px] h-14 bg-orange-50 border border-orange-200 px-3 rounded-xl flex flex-row-reverse items-center justify-end gap-3 shadow-sm transition-colors flex-1 sm:flex-none">
                    <div className="text-left flex-1 sm:flex-none">
                        <span className="text-[10px] font-black uppercase tracking-wide text-orange-700 block leading-none mb-1">Úkolové práce</span>
                        <span className="text-xl font-black text-orange-700 leading-none whitespace-nowrap">{stats.fixedCount} <span className="text-xs font-semibold text-orange-600/70 uppercase">ks</span></span>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-orange-600 shrink-0">
                        <Briefcase size={17}/>
                    </div>
                </div>
             </div>
          </div>
          
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left border-separate border-spacing-0 min-w-[760px]">
              <thead className="bg-slate-100/80 text-slate-600 font-black border-y border-slate-200 uppercase text-[10px] tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-[110px]">Dátum</th>
                  {exportOptions.showSites && <th className="px-4 py-3 w-[210px]">Zákazka</th>}
                  <th className="px-4 py-3 text-center min-w-[230px]">Čas Od - Do</th>
                  {exportOptions.showDescription && <th className="px-4 py-3 min-w-[220px]">Činnosť / Popis</th>}
                  <th className="px-4 py-3 text-right w-[100px]">Hodiny</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" size={32} /></td></tr>
                ) : editableLogs.map((log, idx) => (
                  <tr key={`${log.id}-${idx}`} className="hover:bg-orange-50/60 transition-colors group">
                    <td className="px-4 py-3 align-middle">
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-1 whitespace-nowrap overflow-hidden">
                            {log.isFixed && <Briefcase size={12} className="text-orange-500 shrink-0"/>}
                            {formatDate(log.date)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">{new Date(log.date).toLocaleDateString('sk-SK', {weekday: 'short'})}</div>
                    </td>
                    {exportOptions.showSites && (
                        <td className="px-3 py-2 align-middle">
                            <textarea 
                              rows={1}
                              value={log.siteName || ''} 
                              onChange={(e) => handleRowChange(idx, 'siteName', e.target.value)}
                              className="w-full min-h-10 px-3 py-2 bg-slate-50/70 border border-transparent rounded-lg hover:border-slate-200 focus:border-orange-500 focus:bg-white outline-none font-semibold text-slate-800 text-sm transition resize-none custom-scrollbar"
                              placeholder="Z�kazka..."
                            />
                        </td>
                    )}
                    <td className="px-3 py-2 align-middle text-center">
                        <input 
                          type="text" 
                          value={log.displayTime} 
                          onChange={(e) => handleRowChange(idx, 'displayTime', e.target.value)}
                          className="w-full h-10 text-center px-3 bg-slate-50/70 border border-transparent rounded-lg hover:border-orange-200 focus:border-orange-500 focus:bg-white outline-none font-semibold text-slate-700 text-sm transition"
                          placeholder="07:00 - 15:30"
                        />
                    </td>
                    {exportOptions.showDescription && (
                        <td className="px-3 py-2 align-middle">
                            <textarea 
                              rows={1}
                              value={log.description || ''} 
                              onChange={(e) => handleRowChange(idx, 'description', e.target.value)}
                              className="w-full min-h-10 px-3 py-2 bg-slate-50/70 border border-transparent rounded-lg hover:border-slate-200 focus:border-orange-500 focus:bg-white outline-none italic text-sm text-slate-700 transition resize-none leading-relaxed custom-scrollbar"
                              placeholder="Popis činnosti..."
                            />
                        </td>
                    )}
                    <td className="px-3 py-2 align-middle text-right">
                        <input 
                          type="number" 
                          step="0.1"
                          value={log.hours} 
                          onChange={(e) => handleRowChange(idx, 'hours', e.target.value)}
                          className={`w-full h-10 text-right px-3 bg-slate-50 border border-transparent rounded-lg hover:border-slate-200 focus:border-orange-500 focus:bg-white outline-none font-black text-base transition ${log.isFixed ? 'text-orange-600' : 'text-slate-900'}`}
                        />
                    </td>
                  </tr>
                ))}
                {!loading && editableLogs.length === 0 && (
                  <tr><td colSpan={5} className="p-20 text-center">
                    <div className="max-w-xs mx-auto opacity-30 flex flex-col items-center">
                        <Clock size={40} className="mb-3 text-slate-300"/>
                        <p className="text-slate-400 font-semibold text-[10px] tracking-widest italic">V databáze nie sú žiadne záznamy pre tento mesiac.</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Skrytá sekcia pre PDF export */}
      <div className="fixed left-[-9999px]">
        <div ref={printRef} className="w-[190mm] bg-white p-0 text-slate-900 font-sans text-sm leading-normal relative box-border text-left flex flex-col min-h-[277mm]">
          <div className="px-10 pt-7 pb-3 flex justify-between items-start text-[10px] text-slate-500 border-b border-slate-100">
            <div>
              <div className="font-bold text-slate-950 text-sm leading-tight">{organization.name}</div>
              <div className="mt-1 space-y-0.5">
                {organization.ico && <div>IČO: {organization.ico}</div>}
                {organization.dic && <div>DIČ: {organization.dic}</div>}
                {organization.is_vat_payer && organization.ic_dph && <div>IČ DPH: {organization.ic_dph}</div>}
                {organization.business_address && <div>{organization.address_type === 'sidlo' ? 'Sídlo' : 'Miesto podnikania'}: {organization.business_address}</div>}
              </div>
            </div>
            <div className="text-right text-slate-400">
              <div>Vygenerované cez MojaStavba • {new Date().toLocaleDateString('sk-SK')}</div>
              <div>www.moja-stavba.sk</div>
            </div>
          </div>

          <div className="px-10 py-8 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-7 border-b border-slate-200 pb-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 mb-2">Podklad pre mzdy</div>
                <h1 className="text-[24px] font-bold text-slate-950 leading-tight tracking-normal">Mesačný výkaz dochádzky</h1>
                <div className="text-sm text-slate-500 mt-1 font-medium">Obdobie: {monthLabel}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1">Zamestnanec</div>
                <div className="text-lg font-bold text-slate-950 leading-tight">{selectedEmployeeName}</div>
                {selectedEmployee?.hourly_rate ? (
                  <div className="text-[10px] text-slate-500 mt-1">Hodinová sadzba: {Number(selectedEmployee.hourly_rate).toFixed(2)} € / hod</div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8 break-inside-avoid">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] mb-1">Hodiny k výplate</div>
                <div className="text-2xl font-bold text-slate-950 tabular-nums">{stats.hourlyHours.toFixed(1)} h</div>
              </div>
              <div className="bg-orange-50/70 p-4 rounded-xl border border-orange-100">
                <div className="text-[10px] font-bold text-orange-800/70 uppercase tracking-[0.14em] mb-1">Úkolové práce</div>
                <div className="text-2xl font-bold text-orange-800 tabular-nums">{stats.fixedCount} ks</div>
                <div className="text-[10px] text-orange-700/70 font-semibold">{stats.fixedHours.toFixed(1)} h evidenčne</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] mb-1">Počet riadkov</div>
                <div className="text-2xl font-bold text-slate-950 tabular-nums">{editableLogs.length}</div>
              </div>
            </div>

            <table className="w-full border-collapse mb-10 table-fixed text-xs rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                  <th className="border-b border-slate-200 p-2.5 text-left w-[30mm]">Dátum</th>
                  {exportOptions.showSites && <th className="border-b border-slate-200 p-2.5 text-left w-[32mm]">Zákazka</th>}
                  <th className="border-b border-slate-200 p-2.5 text-center w-[42mm]">Čas od - do</th>
                  {exportOptions.showDescription && <th className="border-b border-slate-200 p-2.5 text-left">Činnosť / popis</th>}
                  <th className="border-b border-slate-200 p-2.5 text-right w-[24mm]">Hodiny</th>
                </tr>
              </thead>
              <tbody>
                {editableLogs.map((log, idx) => (
                  <tr key={`${log.id}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                    <td className="border-b border-slate-100 p-2.5 align-top">
                        <div className="font-semibold text-slate-800 whitespace-nowrap tabular-nums">{formatDate(log.date)}</div>
                        <div className="text-[9px] text-slate-500 uppercase font-semibold">{new Date(log.date).toLocaleDateString('sk-SK', {weekday: 'short'})}</div>
                    </td>
                    {exportOptions.showSites && <td className="border-b border-slate-100 p-2.5 font-semibold text-slate-800 leading-tight align-top">{log.siteName || '-'}</td>}
                    <td className="border-b border-slate-100 p-2.5 text-center text-[10px] align-top tabular-nums text-slate-700">
                      <div className="whitespace-normal leading-tight">
                          {log.displayTime.split(',').map((part: string, i: number) => (
                            <div key={i} className={i > 0 ? "mt-1 border-t border-slate-100 pt-1" : ""}>
                              {part.trim()}
                            </div>
                          ))}
                      </div>
                    </td>
                    {exportOptions.showDescription && (
                      <td className="border-b border-slate-100 p-2.5 text-[10px] text-slate-600 leading-snug align-top overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {log.description || '-'}
                      </td>
                    )}
                    <td className={`border-b border-slate-100 p-2.5 text-right font-bold align-top tabular-nums ${log.isFixed ? 'bg-orange-50/40' : ''}`}>
                      <div className="flex flex-col items-end">
                        <span className={log.isFixed ? 'text-orange-800' : 'text-slate-950'}>{parseFloat(log.hours || 0).toFixed(1)} h</span>
                        {log.isFixed && <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-orange-700 mt-0.5 leading-none">Úkol</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td colSpan={totalLabelColSpan} className="border-t border-slate-200 p-3 text-right uppercase tracking-[0.12em] text-[10px] text-slate-600">Hodiny k výplate</td>
                  <td className="border-t border-slate-200 p-3 text-right text-base whitespace-nowrap tabular-nums">{stats.hourlyHours.toFixed(1)} h</td>
                </tr>
                {stats.fixedCount > 0 && (
                  <tr className="bg-orange-50 font-bold text-orange-800">
                      <td colSpan={totalLabelColSpan} className="border-t border-orange-100 p-2.5 text-right uppercase tracking-[0.12em] text-[10px]">Samostatné úkolové práce</td>
                      <td className="border-t border-orange-100 p-2.5 text-right text-sm whitespace-nowrap tabular-nums">{stats.fixedCount} ks / {stats.fixedHours.toFixed(1)} h</td>
                  </tr>
                )}
              </tfoot>
            </table>

            <div className="mt-auto pt-16 grid grid-cols-2 gap-16 pb-4 break-inside-avoid">
              <div className="text-center">
                <div className="h-16 border-b border-slate-300 mb-2"></div>
                <div className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.14em]">Podpis zamestnanca</div>
              </div>
              <div className="text-center relative">
                <div className="h-16 border-b border-slate-300 mb-2 flex items-center justify-center text-center">
                     {organization.stamp_url && (
                          <img 
                            src={organization.stamp_url} 
                            alt="Pečiatka" 
                            crossOrigin="anonymous" 
                            className="h-28 max-w-[70mm] object-contain absolute -top-14 left-1/2 -translate-x-1/2 opacity-95 pointer-events-none" 
                          />
                     )}
                </div>
                <div className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.14em]">Pečiatka a podpis zamestnávateľa</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
