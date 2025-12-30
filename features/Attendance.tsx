
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Select, AlertModal, CustomLogo } from '../components/UI';
import { FileCheck, Calendar, User, FileDown, Printer, Loader2, Clock, MapPin, ChevronLeft, ChevronRight, Settings2, LayoutList, Calculator, Coffee, Pencil, Eye, EyeOff } from 'lucide-react';
import { formatDate } from '../lib/utils';
// @ts-ignore
import html2pdf from 'html2pdf.js';

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

  // Pomocná funkcia na detekciu času a výpočet hodín z textu (napr. "07:00 - 15:30")
  const parseTimeToHours = (timeStr: string): number | null => {
      const regex = /(\d{1,2})[:.](\d{2})\s*[-–,]\s*(\d{1,2})[:.](\d{2})/;
      const match = timeStr.match(regex);
      if (!match) return null;

      const h1 = parseInt(match[1]);
      const m1 = parseInt(match[2]);
      const h2 = parseInt(match[3]);
      const m2 = parseInt(match[4]);

      const startMins = h1 * 60 + m1;
      let endMins = h2 * 60 + m2;
      
      // Ak je koniec skôr ako začiatok, predpokladáme prácu cez polnoc
      if (endMins < startMins) endMins += 24 * 60;

      return parseFloat(((endMins - startMins) / 60).toFixed(1));
  };

  useEffect(() => {
    if (profile.role === 'admin') {
      const loadEmployees = async () => {
        const { data } = await supabase.from('profiles').select('id, full_name').eq('organization_id', profile.organization_id).order('full_name');
        if (data) setEmployees(data);
      };
      loadEmployees();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedEmpId) {
      loadLogs();
    }
  }, [selectedEmpId, currentDate]);

  const loadLogs = async () => {
    setLoading(true);
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
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
      const [h, m] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m + mins, 0);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

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

  useEffect(() => {
      let processed: any[] = [];
      if (exportOptions.viewMode === 'summarized') {
          const dayMap: Record<string, any> = {};
          logs.forEach(l => {
              if (!dayMap[l.date]) {
                  dayMap[l.date] = { 
                      ...l, 
                      descriptions: l.description ? [l.description] : [], 
                      siteNames: l.sites?.name ? [l.sites.name] : [],
                      totalHours: Number(l.hours)
                  };
              } else {
                  dayMap[l.date].totalHours += Number(l.hours);
                  if (l.description) dayMap[l.date].descriptions.push(l.description);
                  if (l.sites?.name && !dayMap[l.date].siteNames.includes(l.sites.name)) dayMap[l.date].siteNames.push(l.sites.name);
              }
          });
          processed = Object.values(dayMap).map(d => ({
              ...d,
              hours: d.totalHours,
              description: d.descriptions.join(', '),
              siteName: d.siteNames.join(', '),
              displayTime: exportOptions.useTemplate ? formatWithTemplate(d.totalHours) : `${d.start_time || '07:00'} - ${d.end_time || '15:30'}`
          }));
      } else {
          processed = logs.map(l => ({
              ...l,
              hours: Number(l.hours),
              siteName: l.sites?.name,
              displayTime: exportOptions.useTemplate ? formatWithTemplate(Number(l.hours)) : `${l.start_time || '07:00'} - ${l.end_time || '15:30'}`
          }));
      }
      setEditableLogs(processed);
  }, [logs, exportOptions]);

  const totalExportHours = useMemo(() => {
    return editableLogs.reduce((sum, log) => sum + (parseFloat(log.hours) || 0), 0);
  }, [editableLogs]);

  const handleRowChange = (index: number, field: string, value: any) => {
      const newLogs = [...editableLogs];
      newLogs[index] = { ...newLogs[index], [field]: value };

      // Ak meníme čas Od-Do, skúsime automaticky vypočítať hodiny
      if (field === 'displayTime') {
          const calculatedHours = parseTimeToHours(value);
          if (calculatedHours !== null) {
              newLogs[index].hours = calculatedHours;
          }
      }

      setEditableLogs(newLogs);
  };

  const handleExportPDF = () => {
    if (!printRef.current) return;
    setExporting(true);
    const empName = employees.find(e => e.id === selectedEmpId)?.full_name || profile.full_name;
    const monthName = currentDate.toLocaleString('sk-SK', { month: 'long', year: 'numeric' });
    const opt = {
      margin: 10,
      filename: `Dochadzka_${empName.replace(' ', '_')}_${monthName.replace(' ', '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
          scale: 2, 
          useCORS: true, 
          allowTaint: true 
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(printRef.current).save().then(() => setExporting(false));
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const selectedEmployeeName = profile.role === 'admin' 
    ? (employees.find(e => e.id === selectedEmpId)?.full_name || 'Vyberte zamestnanca')
    : profile.full_name;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck className="text-orange-600" size={32} />
            Dochádzky
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Správa a export mesačných výkazov</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button onClick={handleExportPDF} disabled={!selectedEmpId || editableLogs.length === 0 || exporting} fullWidth className="md:w-auto shadow-lg shadow-orange-100">
            {exporting ? <Loader2 className="animate-spin" size={18}/> : <Printer size={18} />} 
            Generovať PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* SIDEBAR */}
        <div className="xl:col-span-1 space-y-6">
            <Card className="space-y-4 shadow-sm border-slate-200">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 text-xs uppercase tracking-widest"><Calendar size={16} className="text-orange-500"/> Obdobie</h3>
                {profile.role === 'admin' && (
                    <Select label="Zamestnanec" value={selectedEmpId} onChange={(e: any) => setSelectedEmpId(e.target.value)}>
                    <option value="">-- Vyberte --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </Select>
                )}
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                    <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg transition shadow-sm bg-white/50"><ChevronLeft size={18}/></button>
                    <div className="text-center">
                        <div className="font-bold text-slate-800 capitalize text-sm">{currentDate.toLocaleString('sk-SK', { month: 'long', year: 'numeric' })}</div>
                    </div>
                    <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg transition shadow-sm bg-white/50"><ChevronRight size={18}/></button>
                </div>
            </Card>

            <Card className="space-y-4 bg-slate-50/50 border-slate-200 shadow-none">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2 text-xs uppercase tracking-widest">
                    <Settings2 size={16} className="text-slate-400"/> Nastavenia Exportu
                </h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button onClick={() => setExportOptions({...exportOptions, viewMode: 'detailed'})} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${exportOptions.viewMode === 'detailed' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutList size={14}/> Podrobný</button>
                        <button onClick={() => setExportOptions({...exportOptions, viewMode: 'summarized'})} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${exportOptions.viewMode === 'summarized' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><Calculator size={14}/> Súhrnný</button>
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-orange-200 transition group">
                            <input type="checkbox" checked={exportOptions.showSites} onChange={e => setExportOptions({...exportOptions, showSites: e.target.checked})} className="w-5 h-5 text-orange-600 rounded border-slate-300" />
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-2">{exportOptions.showSites ? <Eye size={14} className="text-green-500"/> : <EyeOff size={14} className="text-slate-300"/>} Stavba</span>
                        </label>
                        <label className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-orange-200 transition group">
                            <input type="checkbox" checked={exportOptions.showDescription} onChange={e => setExportOptions({...exportOptions, showDescription: e.target.checked})} className="w-5 h-5 text-orange-600 rounded border-slate-300" />
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-2">{exportOptions.showDescription ? <Eye size={14} className="text-green-500"/> : <EyeOff size={14} className="text-slate-300"/>} Činnosť</span>
                        </label>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                        <label className="flex items-center gap-2 mb-3 cursor-pointer group">
                            <input type="checkbox" id="useTemplate" checked={exportOptions.useTemplate} onChange={e => setExportOptions({...exportOptions, useTemplate: e.target.checked})} className="w-5 h-5 text-orange-600 rounded border-slate-300" />
                            <label htmlFor="useTemplate" className="text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">Upraviť rozvrhnutie času</label>
                        </label>
                        
                        {exportOptions.useTemplate && (
                            <div className="space-y-3 p-3 bg-white rounded-xl border border-orange-100 animate-in slide-in-from-top-2 shadow-sm">
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

        {/* HLAVNÝ EDITOR NÁHĽADU */}
        <Card className="xl:col-span-3 p-0 overflow-hidden shadow-sm border-slate-200 flex flex-col min-h-[600px] bg-white">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white sticky top-0 z-20">
             <div className="flex items-center gap-3">
                 <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-blue-500 shadow-inner"><Pencil size={20}/></div>
                 <div>
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Editor Náhľadu PDF</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedEmployeeName}</p>
                 </div>
             </div>
             
             {/* Jemný vizuál súčtu */}
             <div className="bg-white border-2 border-slate-100 px-5 py-2 rounded-2xl flex items-center gap-3 shadow-sm group hover:border-orange-100 transition-colors">
                <div className="text-right">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300 block leading-none mb-1">Mesačný fond prác</span>
                    <span className="text-xl font-black text-slate-800">{totalExportHours.toFixed(1)} <span className="text-xs font-medium text-slate-400 uppercase">hod</span></span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-orange-500 shrink-0">
                    <Calculator size={20}/>
                </div>
             </div>
          </div>
          
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left min-w-[750px] border-collapse table-fixed">
              <thead className="bg-slate-50 text-slate-400 font-black border-y border-slate-100 uppercase text-[9px] tracking-[0.15em] sticky top-0 z-10">
                <tr>
                  <th className="p-4 w-[110px]">Dátum</th>
                  {exportOptions.showSites && <th className="p-4 w-[160px]">Stavba / Miesto</th>}
                  <th className="p-4 text-center w-[180px]">Čas Od - Do</th>
                  {exportOptions.showDescription && <th className="p-4 flex-grow">Činnosť / Popis</th>}
                  <th className="p-4 text-right w-[90px]">Hodiny</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {loading ? (
                  <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" size={32} /></td></tr>
                ) : editableLogs.map((log, idx) => (
                  <tr key={`${log.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 align-top">
                        <div className="font-bold text-slate-800 text-xs">{formatDate(log.date)}</div>
                        <div className="text-[8px] text-slate-400 font-black uppercase">{new Date(log.date).toLocaleDateString('sk-SK', {weekday: 'short'})}</div>
                    </td>
                    {exportOptions.showSites && (
                        <td className="p-3 align-top">
                            <textarea 
                              rows={1}
                              value={log.siteName || ''} 
                              onChange={(e) => handleRowChange(idx, 'siteName', e.target.value)}
                              className="w-full p-1.5 bg-transparent border border-transparent rounded hover:border-slate-200 focus:border-orange-500 focus:bg-white outline-none font-bold text-slate-700 text-[11px] transition resize-none custom-scrollbar"
                              placeholder="Miesto..."
                            />
                        </td>
                    )}
                    <td className="p-3 align-top text-center">
                        <div className="relative group/time">
                            <input 
                              type="text" 
                              value={log.displayTime} 
                              onChange={(e) => handleRowChange(idx, 'displayTime', e.target.value)}
                              className="w-full text-center p-1.5 bg-blue-50/20 border border-transparent rounded hover:border-blue-200 focus:border-blue-500 focus:bg-white outline-none font-mono font-bold text-blue-800 text-[10px] transition"
                              placeholder="07:00 - 15:30"
                            />
                        </div>
                    </td>
                    {exportOptions.showDescription && (
                        <td className="p-3 align-top">
                            <textarea 
                              rows={1}
                              value={log.description || ''} 
                              onChange={(e) => handleRowChange(idx, 'description', e.target.value)}
                              className="w-full p-1.5 bg-transparent border border-transparent rounded hover:border-slate-200 focus:border-orange-500 focus:bg-white outline-none italic text-xs text-slate-500 transition resize-none leading-relaxed custom-scrollbar"
                              placeholder="Popis činnosti..."
                            />
                        </td>
                    )}
                    <td className="p-3 align-top text-right">
                        <input 
                          type="number" 
                          step="0.1"
                          value={log.hours} 
                          onChange={(e) => handleRowChange(idx, 'hours', e.target.value)}
                          className="w-full text-right p-1.5 bg-slate-50 border border-transparent rounded hover:border-slate-200 focus:border-orange-500 focus:bg-white outline-none font-black text-slate-900 text-sm transition"
                        />
                    </td>
                  </tr>
                ))}
                {!loading && editableLogs.length === 0 && (
                  <tr><td colSpan={5} className="p-20 text-center">
                    <div className="max-w-xs mx-auto opacity-30 flex flex-col items-center">
                        <Clock size={40} className="mb-3 text-slate-300"/>
                        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic">V databáze nie sú žiadne záznamy.</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* SKRYTÁ ŠABLÓNA PRE PDF */}
      <div className="fixed left-[-9999px]">
        <div ref={printRef} className="w-[190mm] bg-white p-12 text-slate-900 font-sans text-sm leading-normal relative box-border">
          <div className="flex justify-between items-start mb-8 border-b-4 border-slate-900 pb-6">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Mesačný výkaz prác</h1>
              <div className="text-slate-500 mt-1 font-bold">Obdobie: {currentDate.toLocaleString('sk-SK', { month: 'long', year: 'numeric' })}</div>
            </div>
            <div className="text-right">
              <div className="font-black text-xl text-orange-600">{organization.name}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">vytvorené v MojaStavba.app</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-10">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pracovník / Zamestnanec</div>
              <div className="text-xl font-extrabold text-slate-800">{selectedEmployeeName}</div>
            </div>
            {/* Vylepšený jemný vizuál súčtu hodín v PDF */}
            <div className="bg-orange-50 p-5 rounded-2xl text-right border border-orange-100">
              <div className="text-[10px] font-black text-orange-800/50 uppercase tracking-widest mb-1">Súčet hodín celkom</div>
              <div className="text-4xl font-black text-orange-900">{totalExportHours.toFixed(1)} <span className="text-base font-medium opacity-50 uppercase">h</span></div>
            </div>
          </div>

          <table className="w-full border-collapse mb-12">
            <thead>
              <tr className="bg-slate-900 text-white text-[9px] font-bold uppercase tracking-widest">
                <th className="border border-slate-900 p-3 text-left w-[30mm]">Dátum</th>
                {exportOptions.showSites && <th className="border border-slate-900 p-3 text-left w-[40mm]">Miesto</th>}
                <th className="border border-slate-900 p-3 text-center w-[40mm]">Čas (Od - Do)</th>
                {exportOptions.showDescription && <th className="border border-slate-900 p-3 text-left">Činnosť</th>}
                <th className="border border-slate-900 p-3 text-right w-[25mm]">Hodiny</th>
              </tr>
            </thead>
            <tbody>
              {editableLogs.map((log, idx) => (
                <tr key={`${log.id}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-200 p-3">
                      <div className="font-bold text-xs">{formatDate(log.date)}</div>
                      <div className="text-[8px] text-slate-400 uppercase font-black">{new Date(log.date).toLocaleDateString('sk-SK', {weekday: 'short'})}</div>
                  </td>
                  {exportOptions.showSites && <td className="border border-slate-200 p-3 font-bold text-[11px] leading-tight">{log.siteName || '-'}</td>}
                  <td className="border border-slate-200 p-3 text-center font-mono text-[10px] whitespace-nowrap">{log.displayTime}</td>
                  {exportOptions.showDescription && <td className="border border-slate-200 p-3 text-[10px] italic text-slate-500 leading-tight">{log.description || '-'}</td>}
                  <td className="border border-slate-200 p-3 text-right font-black">{parseFloat(log.hours || 0).toFixed(1)} h</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black">
                <td colSpan={exportOptions.showSites && exportOptions.showDescription ? 4 : (exportOptions.showSites || exportOptions.showDescription ? 3 : 2)} className="border border-slate-200 p-4 text-right uppercase tracking-widest text-xs">MESAČNÝ SÚČET HODÍN CELKOM</td>
                <td className="border border-slate-200 p-4 text-right text-xl">{totalExportHours.toFixed(1)} h</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-20 grid grid-cols-2 gap-20">
            <div className="text-center">
              <div className="h-16 border-b-2 border-slate-200 mb-2"></div>
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Podpis Pracovníka</div>
            </div>
            <div className="text-center relative">
              <div className="h-16 border-b-2 border-slate-200 mb-2 flex items-center justify-center">
                   {organization.stamp_url ? (
                        <img 
                          src={organization.stamp_url} 
                          alt="Pečiatka" 
                          crossOrigin="anonymous" 
                          className="h-28 absolute -top-12 rotate-3 opacity-95" 
                        />
                   ) : (
                        <div className="opacity-10 pointer-events-none transform -rotate-12 absolute -top-8">
                             <CustomLogo className="w-16 h-16 text-slate-900"/>
                        </div>
                   )}
              </div>
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pečiatka a Podpis Firmy</div>
            </div>
          </div>
          <div className="mt-24 text-center text-[9px] text-slate-300 font-bold uppercase border-t pt-4 tracking-[0.2em]">
            Dokument vygenerovaný v systéme MojaStavba.app • {new Date().toLocaleDateString('sk-SK')}
          </div>
        </div>
      </div>
      <AlertModal isOpen={false} onClose={() => {}} title="" message="" />
    </div>
  );
};
