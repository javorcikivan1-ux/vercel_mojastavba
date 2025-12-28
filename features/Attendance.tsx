
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Select, AlertModal, CustomLogo } from '../components/UI';
import { FileCheck, Calendar, User, FileDown, Printer, Loader2, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
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
  
  const printRef = useRef<HTMLDivElement>(null);

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

  const handleExportPDF = () => {
    if (!printRef.current) return;
    setExporting(true);
    const empName = employees.find(e => e.id === selectedEmpId)?.full_name || profile.full_name;
    const monthName = currentDate.toLocaleString('sk-SK', { month: 'long', year: 'numeric' });
    
    // Fix: Assert image.type to 'jpeg' and jsPDF.orientation to 'portrait' or 'landscape' literal types
    const opt = {
      margin: 10,
      filename: `Dochadzka_${empName.replace(' ', '_')}_${monthName.replace(' ', '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(printRef.current).save().then(() => setExporting(false));
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const totalHours = logs.reduce((sum, log) => sum + Number(log.hours), 0);
  const selectedEmployeeName = profile.role === 'admin' 
    ? (employees.find(e => e.id === selectedEmpId)?.full_name || 'Vyberte zamestnanca')
    : profile.full_name;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck className="text-orange-600" size={32} />
            Dochádzky
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Mesačné výkazy práce pre účtovníctvo</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button onClick={handleExportPDF} disabled={!selectedEmpId || logs.length === 0 || exporting} fullWidth className="md:w-auto">
            {exporting ? <Loader2 className="animate-spin" size={18}/> : <Printer size={18} />} 
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Calendar size={18} className="text-orange-500"/> Filter</h3>
          
          {profile.role === 'admin' && (
            <Select label="Zamestnanec" value={selectedEmpId} onChange={(e: any) => setSelectedEmpId(e.target.value)}>
              <option value="">-- Vyberte --</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
          )}

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg transition shadow-sm"><ChevronLeft size={20}/></button>
            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Obdobie</div>
              <div className="font-bold text-slate-800 capitalize">{currentDate.toLocaleString('sk-SK', { month: 'long', year: 'numeric' })}</div>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg transition shadow-sm"><ChevronRight size={20}/></button>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-center">
            <div className="text-xs font-bold text-orange-600 uppercase mb-1">Spolu odpracované</div>
            <div className="text-3xl font-black text-slate-900">{totalHours.toFixed(1)} <span className="text-sm font-medium opacity-50">hod</span></div>
          </div>
        </Card>

        <Card className="md:col-span-2 p-0 overflow-hidden min-h-[400px]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock size={18} className="text-blue-500"/> Zoznam zápisov</h3>
             <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-lg border border-slate-200">{logs.length} dní</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-slate-400 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Dátum</th>
                  <th className="p-4">Stavba</th>
                  <th className="p-4 text-center">Od - Do</th>
                  <th className="p-4 text-right">Hodiny</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={4} className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition group">
                    <td className="p-4 font-bold text-slate-700">{formatDate(log.date)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin size={12} className="text-slate-400"/>
                        {log.sites?.name || 'Všeobecné'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{log.description}</div>
                    </td>
                    <td className="p-4 text-center font-mono text-slate-500">
                      {log.start_time || '--:--'} - {log.end_time || '--:--'}
                    </td>
                    <td className="p-4 text-right font-black text-slate-900">{Number(log.hours).toFixed(1)} h</td>
                  </tr>
                ))}
                {!loading && logs.length === 0 && (
                  <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic">Žiadne záznamy pre toto obdobie.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* HIDDEN PRINT TEMPLATE */}
      <div className="fixed left-[-9999px]">
        <div ref={printRef} className="w-[190mm] bg-white p-12 text-slate-900 font-sans text-sm leading-normal">
          <div className="flex justify-between items-start mb-8 border-b-4 border-slate-900 pb-6">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Mesačná Dochádzka</h1>
              <div className="text-slate-500 mt-1 font-bold">Obdobie: {currentDate.toLocaleString('sk-SK', { month: 'long', year: 'numeric' })}</div>
            </div>
            <div className="text-right">
              <div className="font-black text-xl text-orange-600">{organization.name}</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">vytvorené cez MojaStavba</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-10">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Zamestnanec</div>
              <div className="text-lg font-bold text-slate-800">{selectedEmployeeName}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-right">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Celkový počet hodín</div>
              <div className="text-3xl font-black text-slate-900">{totalHours.toFixed(1)} <span className="text-sm font-medium opacity-50">hod</span></div>
            </div>
          </div>

          <table className="w-full border-collapse mb-12">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest">
                <th className="border border-slate-900 p-3 text-left">Deň / Dátum</th>
                <th className="border border-slate-900 p-3 text-left">Miesto Výkonu Práce (Stavba)</th>
                <th className="border border-slate-900 p-3 text-center">Čas (Od - Do)</th>
                <th className="border border-slate-900 p-3 text-right">Počet hodín</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr key={log.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-200 p-3 font-bold">{formatDate(log.date)}</td>
                  <td className="border border-slate-200 p-3">
                    <div className="font-bold">{log.sites?.name || 'Nezadané'}</div>
                    <div className="text-[10px] text-slate-500 italic leading-tight">{log.description}</div>
                  </td>
                  <td className="border border-slate-200 p-3 text-center font-mono">
                    {log.start_time || '07:00'} - {log.end_time || (7+Number(log.hours)) + ':00'}
                  </td>
                  <td className="border border-slate-200 p-3 text-right font-black">{Number(log.hours).toFixed(1)} h</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={4} className="border border-slate-200 p-10 text-center italic text-slate-400">Žiadne záznamy v databáze pre toto obdobie.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black">
                <td colSpan={3} className="border border-slate-200 p-4 text-right uppercase tracking-widest text-[10px]">Celkom k preplateniu</td>
                <td className="border border-slate-200 p-4 text-right text-lg">{totalHours.toFixed(1)} hodín</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-20 grid grid-cols-2 gap-20">
            <div className="text-center">
              <div className="h-16 border-b-2 border-slate-200 mb-2"></div>
              <div className="text-[10px] font-black uppercase text-slate-400">Podpis Zamestnanca</div>
            </div>
            <div className="text-center relative">
              <div className="h-16 border-b-2 border-slate-200 mb-2"></div>
              <div className="text-[10px] font-black uppercase text-slate-400">Pečiatka a Podpis Firmy</div>
              <div className="absolute top-[-30px] right-10 opacity-10 pointer-events-none transform -rotate-12">
                 <CustomLogo className="w-20 h-20 text-slate-900"/>
              </div>
            </div>
          </div>

          <div className="mt-24 text-center text-[9px] text-slate-300 font-medium border-t pt-4">
            Vygenerované digitálnym systémom MojaStavba.app dňa {new Date().toLocaleDateString('sk-SK')}
          </div>
        </div>
      </div>

      <AlertModal isOpen={false} onClose={() => {}} title="" message="" />
    </div>
  );
};
