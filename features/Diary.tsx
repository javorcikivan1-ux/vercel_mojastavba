
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Select, AlertModal, CustomLogo } from '../components/UI';
import { 
  BookOpen, Calendar, Cloud, Sun, CloudRain, Wind, Thermometer, Truck, 
  Users, Package, Save, FileDown, ArrowLeft, Plus, PenTool, ArrowRight, 
  Copy, Lock, Camera, CheckCircle2, AlertCircle, Loader2, X, RefreshCw, Unlock, Printer, Search, Building2, Info, ListChecks
} from 'lucide-react';
import { formatDate } from '../lib/utils';
// @ts-ignore
import html2pdf from 'html2pdf.js';

/**
 * Bezpečné formátovanie dátumu na YYYY-MM-DD bez posunu časového pásma.
 */
const getLocalDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Optimalizovaná funkcia pre kompresiu obrazu.
 */
const compressImageToBlob = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1024;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Chyba pri kompresii.'));
                }, 'image/jpeg', 0.7); 
            };
        };
        reader.onerror = (err) => reject(err);
    });
};

export const DiaryScreen = ({ profile, organization }: any) => {
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [searchSiteQuery, setSearchSiteQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date()); 
  
  // Daily View State
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [diaryEntry, setDiaryEntry] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  
  // Data State
  const [dailyAttendance, setDailyAttendance] = useState<any[]>([]);
  const [dailyMaterials, setDailyMaterials] = useState<any[]>([]);
  
  // Monthly Overview Data
  const [monthStats, setMonthStats] = useState<Record<string, any>>({});
  
  // Preview State
  const [previewDay, setPreviewDay] = useState<any>(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<any>(null);
  const touchStartPos = useRef<{x: number, y: number} | null>(null);

  // Full Export State
  const [fullExportData, setFullExportData] = useState<any[] | null>(null);
  const [exporting, setExporting] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{open: boolean, message: string, type: 'success' | 'error'}>({ open: false, message: '', type: 'success' });

  // Refs
  const printRef = useRef<HTMLDivElement>(null);
  const fullPrintRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSites = async () => {
        const { data } = await supabase.from('sites')
            .select('id, name, status')
            .eq('organization_id', profile.organization_id)
            .order('status', { ascending: true });
        
        if(data && data.length > 0) {
            const sorted = data.sort((a, b) => {
                if (a.status === 'active' && b.status !== 'active') return -1;
                if (a.status !== 'active' && b.status === 'active') return 1;
                return 0;
            });
            setSites(sorted);

            const lastSiteId = localStorage.getItem('ms_last_site_id');
            const exists = sorted.find(s => s.id === lastSiteId);
            
            if (lastSiteId && exists) {
                setSelectedSiteId(lastSiteId);
                setSearchSiteQuery(exists.name);
            } else {
                setSelectedSiteId(sorted[0].id);
                setSearchSiteQuery(sorted[0].name);
            }
        }
    };
    loadSites();
  }, [profile]);

  const handleSiteChange = (id: string, name: string) => {
      setSelectedSiteId(id);
      setSearchSiteQuery(name);
      localStorage.setItem('ms_last_site_id', id);
  };

  useEffect(() => {
      if (selectedSiteId && !selectedDay) {
          fetchMonthOverview();
      }
  }, [currentDate, selectedSiteId, selectedDay]);

  const fetchMonthOverview = async () => {
      if(!selectedSiteId) return;
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const startStr = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endStr = new Date(year, month, 0).toISOString().split('T')[0];

      const [records, logs] = await Promise.all([
          supabase.from('diary_records').select('*').eq('site_id', selectedSiteId).gte('date', startStr).lte('date', endStr),
          supabase.from('attendance_logs').select('date, description, hours, profiles(full_name)').eq('site_id', selectedSiteId).gte('date', startStr).lte('date', endStr)
      ]);

      const stats: Record<string, any> = {};

      records.data?.forEach(r => {
          if(!stats[r.date]) stats[r.date] = { hasRecord: true, record: r, logs: [], totalHours: 0 };
          else {
              stats[r.date].hasRecord = true;
              stats[r.date].record = r;
          }
          stats[r.date].status = r.status;
      });

      logs.data?.forEach((l: any) => {
          if(!stats[l.date]) stats[l.date] = { hasRecord: false, logs: [], totalHours: 0 };
          stats[l.date].totalHours += Number(l.hours || 0);
          if(l.description) {
              stats[l.date].logs.push(`${l.profiles?.full_name}: ${l.description}`);
          } else {
              stats[l.date].logs.push(`${l.profiles?.full_name}: (Bez popisu)`);
          }
      });

      setMonthStats(stats);
  };

  const fetchDayData = async (day: Date, siteId: string) => {
      const dateStr = getLocalDateString(day);
      const [record, attendance, materials] = await Promise.all([
          supabase.from('diary_records').select('*').eq('site_id', siteId).eq('date', dateStr).maybeSingle(),
          supabase.from('attendance_logs').select('*, profiles(full_name)').eq('site_id', siteId).eq('date', dateStr),
          supabase.from('materials').select('*').eq('site_id', siteId).eq('purchase_date', dateStr)
      ]);
      return { record: record.data, attendance: attendance.data, materials: materials.data };
  };

  const handleDaySelect = async (day: Date) => {
      if(!selectedSiteId) return;
      setSelectedDay(day);
      setPreviewDay(null); 
      setLoading(true);
      setDiaryEntry(null); 
      
      try {
          const { record, attendance, materials } = await fetchDayData(day, selectedSiteId);

          // Čistý prístup: Ak záznam neexistuje, poznámky sú PRÁZDNE. 
          // Žiadne automatické sranie do DB.
          setDiaryEntry(record || { 
              weather: 'Slnečno', 
              temperature_morning: '', 
              temperature_noon: '', 
              mechanisms: '', 
              notes: '',
              status: 'draft',
              photos: []
          });
          setIsLocked(record?.status === 'signed');
          setDailyAttendance(attendance || []);
          setDailyMaterials(materials || []);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleLongPress = (day: Date, stats: any, x: number, y: number) => {
      setPreviewPos({ x, y: y - 10 }); 
      setPreviewDay({ date: day, stats });
  };

  const onTouchStart = (day: Date, stats: any, e: React.TouchEvent) => {
      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      longPressTimer.current = setTimeout(() => {
          handleLongPress(day, stats, touch.clientX, touch.clientY);
      }, 500);
  };

  const onTouchMove = (e: React.TouchEvent) => {
      if (!touchStartPos.current) return;
      const touch = e.touches[0];
      const dist = Math.sqrt(Math.pow(touch.clientX - touchStartPos.current.x, 2) + Math.pow(touch.clientY - touchStartPos.current.y, 2));
      if (dist > 10) { 
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }
  };

  const onTouchEnd = () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      touchStartPos.current = null;
  };

  const handleMouseEnter = (day: Date, stats: any, e: React.MouseEvent) => {
      if (window.innerWidth < 768) return;
      setPreviewPos({ x: e.clientX, y: e.clientY - 20 });
      setPreviewDay({ date: day, stats });
  };

  const importAttendanceToNotes = () => {
      if (!dailyAttendance.length) {
          setAlert({ open: true, message: 'Žiadne popisy v dochádzky pre tento deň.', type: 'error' });
          return;
      }
      
      let currentNotes = diaryEntry.notes || '';
      let addedCount = 0;

      const newLines = dailyAttendance
          .filter((l: any) => l.description && l.description.trim() !== '')
          .map((l: any) => `• ${l.profiles?.full_name}: ${l.description}`);

      newLines.forEach((line: string) => {
          // Ochrana duplicity: Vložíme len ak riadok v poznámkach presne v tejto forme ešte nie je
          if (!currentNotes.includes(line)) {
              currentNotes += (currentNotes ? "\n" : "") + line;
              addedCount++;
          }
      });

      if (addedCount > 0) {
          setDiaryEntry({ ...diaryEntry, notes: currentNotes });
          setAlert({ open: true, message: `Pridaných ${addedCount} nových záznamov prác.`, type: 'success' });
      } else {
          setAlert({ open: true, message: 'Všetky záznamy prác sú už v denníku zahrnuté.', type: 'success' });
      }
  };

  const handleCopyPreviousDay = async () => {
      if (!selectedDay || !selectedSiteId) return;
      const prevDay = new Date(selectedDay);
      prevDay.setDate(prevDay.getDate() - 1);
      setLoading(true);
      const { record } = await fetchDayData(prevDay, selectedSiteId);
      if (record) {
          setDiaryEntry((prev: any) => ({
              ...prev,
              mechanisms: record.mechanisms,
              weather: record.weather,
              temperature_morning: record.temperature_morning,
              temperature_noon: record.temperature_noon
          }));
          setAlert({ open: true, message: 'Dáta z predchádzajúceho dňa boli skopírované.', type: 'success' });
      } else {
          setAlert({ open: true, message: 'Pre predchádzajúci deň sa nenašiel žiadny záznam.', type: 'error' });
      }
      setLoading(false);
  };

  const handleSave = async (e?: React.FormEvent, status = 'draft') => {
      if(e) e.preventDefault();
      if(!selectedDay || !selectedSiteId || !diaryEntry) return;
      const dateStr = getLocalDateString(selectedDay);
      const payload = {
          site_id: selectedSiteId,
          organization_id: profile.organization_id,
          date: dateStr,
          ...diaryEntry,
          status
      };
      const { id, ...saveData } = payload; 
      try {
          if (diaryEntry.id) {
              await supabase.from('diary_records').update({ ...saveData, status }).eq('id', diaryEntry.id);
          } else {
              const { data } = await supabase.from('diary_records').insert([saveData]).select().single();
              if(data) setDiaryEntry(data);
          }
          if (status === 'signed') {
              setIsLocked(true);
              setAlert({ open: true, message: 'Denník bol uzavretý a podpísaný.', type: 'success' });
          } else {
              setAlert({ open: true, message: 'Denník bol uložený.', type: 'success' });
          }
          fetchMonthOverview();
      } catch (err: any) {
          setAlert({ open: true, message: err.message, type: 'error' });
      }
  };

  const handleUnlock = async () => {
      if (!diaryEntry?.id) return;
      setLoading(true);
      try {
          await supabase.from('diary_records').update({ status: 'draft' }).eq('id', diaryEntry.id);
          setDiaryEntry({ ...diaryEntry, status: 'draft' });
          setIsLocked(false);
          setAlert({ open: true, message: 'Záznam bol odomknutý pre úpravy.', type: 'success' });
          fetchMonthOverview();
      } catch (err: any) {
          setAlert({ open: true, message: err.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setLoading(true);
          try {
              const blob = await compressImageToBlob(file);
              const fileExt = 'jpg';
              const fileName = `${selectedSiteId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
              const filePath = `photos/${fileName}`;

              const { error: uploadError } = await supabase.storage
                  .from('diary-photos')
                  .upload(filePath, blob, { contentType: 'image/jpeg' });

              if (uploadError) throw uploadError;

              const { data: { publicUrl } } = supabase.storage
                  .from('diary-photos')
                  .getPublicUrl(filePath);

              setDiaryEntry((prev: any) => ({
                  ...prev,
                  photos: [...(prev.photos || []), publicUrl]
              }));
              
          } catch (err: any) {
              console.error(err);
              setAlert({ open: true, message: "Nepodarilo sa nahrať fotku: " + err.message, type: 'error' });
          } finally {
              e.target.value = '';
              setLoading(false);
          }
      }
  };

  const removePhoto = (index: number) => {
      setDiaryEntry((prev: any) => ({
          ...prev,
          photos: (prev.photos || []).filter((_: any, i: number) => i !== index)
      }));
  };

  const handleExportPDF = () => {
      if (!printRef.current) return;
      try {
          const dateStr = selectedDay?.toLocaleDateString('sk-SK');
          const siteName = sites.find(s => s.id === selectedSiteId)?.name || 'Stavba';
          const opt = { 
              margin: [10, 10, 10, 10] as [number, number, number, number], 
              filename: `SD_${siteName}_${dateStr}.pdf`, 
              image: { type: 'jpeg' as const, quality: 0.98 }, 
              html2canvas: { scale: 2, useCORS: true, allowTaint: true }, 
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const } 
          };
          html2pdf().set(opt).from(printRef.current).save();
      } catch (e: any) {
          console.error(e);
          setAlert({ open: true, message: "Nepodarilo sa vytvoriť PDF.", type: 'error' });
      }
  };

  const handleExportFullPDF = async () => {
      if (!selectedSiteId) return;
      setExporting(true);
      try {
          const [records, logs, materials] = await Promise.all([
              supabase.from('diary_records').select('*').eq('site_id', selectedSiteId).order('date', {ascending: true}),
              supabase.from('attendance_logs').select('*, profiles(full_name)').eq('site_id', selectedSiteId).order('date', {ascending: true}),
              supabase.from('materials').select('*').eq('site_id', selectedSiteId).order('purchase_date', {ascending: true})
          ]);

          const groupedData: any[] = [];
          const allDates = new Set([
              ...(records.data || []).map((r: any) => r.date),
              ...(logs.data || []).map((l: any) => l.date),
              ...(materials.data || []).map((m: any) => m.purchase_date)
          ]);

          const sortedDates = Array.from(allDates).sort();

          sortedDates.forEach(date => {
              groupedData.push({
                  date: date,
                  record: records.data?.find((r: any) => r.date === date),
                  logs: logs.data?.filter((l: any) => l.date === date),
                  materials: materials.data?.filter((m: any) => m.purchase_date === date)
              });
          });

          setFullExportData(groupedData);

          setTimeout(() => {
              if (!fullPrintRef.current) return;
              const siteName = sites.find(s => s.id === selectedSiteId)?.name || 'Stavba';
              const opt = { 
                  margin: [10, 10, 10, 10] as [number, number, number, number], 
                  filename: `Kompletny_Dennik_${siteName}.pdf`, 
                  image: { type: 'jpeg' as const, quality: 0.98 }, 
                  html2canvas: { scale: 2, useCORS: true, allowTaint: true }, 
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
                  pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
              };
              html2pdf().set(opt).from(fullPrintRef.current).save().then(() => {
                  setExporting(false);
                  setFullExportData(null);
              });
          }, 1500);
      } catch (e: any) {
          console.error(e);
          setAlert({ open: true, message: "Chyba pri exporte celého denníka.", type: 'error' });
          setExporting(false);
      }
  };

  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      return Array.from({length: days}, (_, i) => new Date(year, month, i + 1));
  };

  const SectionHeader = ({ icon: Icon, title, sub, action }: any) => (
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4 mt-2">
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Icon size={20}/></div>
            <div>
                <h3 className="font-bold text-slate-900 uppercase text-sm tracking-wider">{title}</h3>
                {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
            </div>
          </div>
          {action}
      </div>
  );

  const filteredSitesList = sites.filter(s => 
    s.name.toLowerCase().includes(searchSiteQuery.toLowerCase())
  );
  const currentSiteName = sites.find(s => s.id === selectedSiteId)?.name || 'Stavba';

  return (
    <div className="space-y-6 relative">
      {!selectedDay && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in duration-300">
            <div>
               <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <BookOpen className="text-orange-600" size={32} />
                  Stavebný Denník
               </h2>
               <p className="text-sm text-slate-500 mt-1 font-medium">Elektronický stavebný denník</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-end">
                <div className="w-full sm:w-80 relative">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <Search size={12}/> Hľadať a vybrať stavbu
                    </label>
                    <input 
                        type="text" 
                        placeholder="Vyhľadať projekt..."
                        value={searchSiteQuery}
                        onChange={(e) => setSearchSiteQuery(e.target.value)}
                        onFocus={() => { if(searchSiteQuery === currentSiteName) setSearchSiteQuery(''); }}
                        className="w-full p-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-orange-500 shadow-sm transition-all"
                    />
                    {searchSiteQuery !== currentSiteName && searchSiteQuery.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar">
                            {filteredSitesList.map(s => (
                                <button 
                                    key={s.id} 
                                    onClick={() => handleSiteChange(s.id, s.name)}
                                    className="w-full text-left p-4 hover:bg-orange-50 border-b border-slate-50 flex items-center justify-between group transition"
                                >
                                    <div>
                                        <div className="font-bold text-slate-900 group-hover:text-orange-700">{s.name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{s.status === 'completed' ? 'Archív' : 'Aktívna'}</div>
                                    </div>
                                    <Building2 size={16} className="text-slate-200 group-hover:text-orange-300"/>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                {selectedSiteId && (
                    <Button onClick={handleExportFullPDF} disabled={exporting} className="whitespace-nowrap h-[46px] mt-auto">
                        {exporting ? <Loader2 className="animate-spin" size={18}/> : <Printer size={18}/>} 
                        {exporting ? 'Generujem...' : 'Export PDF'}
                    </Button>
                )}
            </div>
          </div>
      )}

      {/* Floating Preview Popover */}
      {previewDay && (
          <div 
            className="fixed z-[100] w-64 md:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 animate-in zoom-in-95 duration-200 pointer-events-none backdrop-blur-sm bg-white/95"
            style={{ 
                left: `${Math.min(window.innerWidth - (window.innerWidth < 768 ? 270 : 340), Math.max(10, previewPos.x - 40))}px`, 
                top: `${Math.max(10, previewPos.y - 180)}px` 
            }}
          >
              <div className="flex justify-between items-start mb-3">
                  <h4 className="font-extrabold text-slate-900">{previewDay.date.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' })}</h4>
                  <div className="flex gap-1">
                    {previewDay.stats?.status === 'signed' && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase">Uzavreté</span>}
                    {previewDay.stats?.totalHours > 0 && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">{previewDay.stats.totalHours.toFixed(1)}h</span>}
                  </div>
              </div>
              
              <div className="space-y-3">
                {previewDay.stats?.record && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100/50 p-2 rounded-lg border border-slate-200/50">
                        <Cloud size={14} className="text-slate-400" />
                        <span>{previewDay.stats.record.weather || '-'}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                        <span>{previewDay.stats.record.temperature_noon || '-'}°C</span>
                    </div>
                )}
                
                {previewDay.stats?.logs?.length > 0 && (
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pracovníci</div>
                        <div className="text-xs text-slate-600 line-clamp-2 italic leading-relaxed">
                            {previewDay.stats.logs.join(', ')}
                        </div>
                    </div>
                )}

                {previewDay.stats?.record?.notes && (
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Záznam</div>
                        <div className="text-xs text-slate-700 line-clamp-3 bg-yellow-50/50 p-2 rounded border border-yellow-100/50 leading-relaxed font-mono">
                            {previewDay.stats.record.notes}
                        </div>
                    </div>
                )}

                {!previewDay.stats?.hasRecord && !previewDay.stats?.logs?.length && (
                    <div className="text-xs text-slate-400 italic text-center py-4">Žiadne záznamy pre tento deň.</div>
                )}
                
                <div className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-tighter mt-1 opacity-60">Kliknutím otvorte na úpravu</div>
              </div>
          </div>
      )}

      {!selectedSiteId ? (
          <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-sm">
              Vyberte stavba pre zobrazenie denníka cez vyhľadávacie pole vyššie.
          </div>
      ) : selectedDay ? (
          (loading || !diaryEntry) ? (
              <div className="h-96 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in">
                  <Loader2 className="animate-spin text-orange-600 mb-4" size={40} />
                  <p className="text-slate-500 font-medium">Načítavam záznam...</p>
              </div>
          ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 sticky top-0 z-20">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedDay(null)} className="text-slate-500 hover:text-slate-900 font-bold text-sm flex items-center gap-2 transition group">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform"/> Späť
                    </button>
                    <div className="hidden lg:flex items-center gap-2 text-slate-300">
                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">{currentSiteName}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                      <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
                          {selectedDay.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </h2>
                      <div className="flex items-center justify-center gap-2 text-[10px] font-bold mt-0.5">
                          {isLocked ? (
                              <span className="text-green-700 flex items-center gap-1 bg-green-100 px-2 py-0.5 rounded-full border border-green-200 uppercase tracking-wider"><Lock size={10}/> Uzavretý</span>
                          ) : (
                              <span className="text-orange-700 flex items-center gap-1 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200 uppercase tracking-wider"><PenTool size={10}/> Rozpracovaný</span>
                          )}
                      </div>
                  </div>
                  <div className="flex gap-2">
                      {!isLocked && (
                          <Button variant="secondary" size="sm" onClick={handleCopyPreviousDay} title="Kopírovať údaje z predchádzajúceho dňa">
                              <Copy size={16}/> <span className="hidden lg:inline">Kopírovať včerajšok</span>
                          </Button>
                      )}
                      <Button variant="secondary" size="sm" onClick={handleExportPDF}>
                          <FileDown size={16}/> <span className="hidden lg:inline">PDF</span>
                      </Button>
                  </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 space-y-6">
                      <Card className="border-t-4 border-t-orange-500 relative overflow-hidden shadow-md">
                          {isLocked && (
                              <div className="absolute inset-0 bg-slate-50/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in">
                                  <div className="bg-white p-6 rounded-2xl shadow-2xl font-bold flex flex-col items-center gap-4 text-center border border-slate-200 max-w-sm">
                                      <div className="bg-green-100 p-3 rounded-full text-green-600"><Lock size={32}/></div>
                                      <div>
                                          <h3 className="text-lg text-slate-900">Záznam je uzavretý</h3>
                                          <p className="text-xs text-slate-500 font-medium mt-1">Údaje sú podpísané a chránené proti zmenám.</p>
                                      </div>
                                      <Button variant="secondary" onClick={handleUnlock} size="sm" className="mt-2 w-full text-red-600 hover:bg-red-50 hover:border-red-200">
                                          <Unlock size={16}/> Odomknúť pre úpravy
                                      </Button>
                                  </div>
                              </div>
                          )}
                          
                          <SectionHeader icon={Cloud} title="1. Poveternostné podmienky" sub="Teplota a počasie počas dňa" />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <Select label="Stav počasia" value={diaryEntry.weather} onChange={(e: any) => setDiaryEntry({...diaryEntry, weather: e.target.value})}>
                                  <option value="Slnečno">Slnečno ☀️</option>
                                  <option value="Polooblačno">Polooblačno ⛅</option>
                                  <option value="Oblačno">Oblačno ☁️</option>
                                  <option value="Dážď">Dážď 🌧️</option>
                                  <option value="Búrka">Búrka ⛈️</option>
                                  <option value="Vietor">Vietor 💨</option>
                                  <option value="Sneženie">Sneženie ❄️</option>
                              </Select>
                              <Input label="Teplota Ráno (7:00)" value={diaryEntry.temperature_morning} onChange={(e: any) => setDiaryEntry({...diaryEntry, temperature_morning: e.target.value})} placeholder="°C" />
                              <Input label="Teplota Obed (13:00)" value={diaryEntry.temperature_noon} onChange={(e: any) => setDiaryEntry({...diaryEntry, temperature_noon: e.target.value})} placeholder="°C" />
                          </div>

                          <SectionHeader 
                            icon={PenTool} 
                            title="2. Popis vykonaných prác" 
                            sub="Detailný záznam postupu prác" 
                            action={
                                !isLocked && dailyAttendance.length > 0 && (
                                    <button onClick={importAttendanceToNotes} className="text-[10px] flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition font-bold" title="Doplní popisy z dochádzky do poznámky">
                                        <RefreshCw size={12}/> Importovať z dochádzky
                                    </button>
                                )
                            }
                          />
                          <div className="mb-8 relative">
                              <textarea 
                                  className="w-full p-4 bg-yellow-50/30 border border-slate-300 rounded-xl outline-none focus:border-orange-500 min-h-[250px] text-sm font-medium text-slate-800 leading-relaxed resize-y font-mono" 
                                  placeholder="• Začiatok výkopových prác...&#10;• Betonáž základových pásov..."
                                  value={diaryEntry.notes || ''}
                                  onChange={(e) => setDiaryEntry({...diaryEntry, notes: e.target.value})}
                              />
                          </div>

                          <SectionHeader icon={Truck} title="3. Mechanizmy a Stroje" sub="Nasadenie techniky na stavbe" />
                          <div className="mb-8">
                              <Input 
                                value={diaryEntry.mechanisms || ''} 
                                onChange={(e: any) => setDiaryEntry({...diaryEntry, mechanisms: e.target.value})} 
                                placeholder="Napr. Bager JCB (8h), Žeriav (4h)..." 
                              />
                          </div>

                          <SectionHeader icon={Camera} title="4. Fotodokumentácia" sub="Fotografie sú bezpečne uložené v cloude" />
                          
                          <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="image/*" 
                              onChange={handleImageUpload} 
                          />

                          <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div 
                                onClick={() => !isLocked && !loading && fileInputRef.current?.click()}
                                className="aspect-square border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-orange-400 cursor-pointer transition active:scale-95"
                              >
                                  {loading ? <Loader2 size={24} className="animate-spin mb-2"/> : <Camera size={24} className="mb-2"/>}
                                  <span className="text-xs font-bold uppercase">{loading ? 'Spracúvam...' : 'Pridať foto'}</span>
                              </div>

                              {diaryEntry.photos?.map((photo: string, index: number) => (
                                  <div key={index} className="aspect-square relative rounded-xl overflow-hidden border border-slate-200 group bg-slate-100 shadow-sm">
                                      <img src={photo} alt={`Foto ${index + 1}`} crossOrigin="anonymous" className="w-full h-full object-cover" loading="lazy" />
                                      {!isLocked && (
                                          <button 
                                            onClick={() => removePhoto(index)}
                                            className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition hover:bg-white hover:text-red-600 shadow-sm"
                                          >
                                              <X size={14} />
                                          </button>
                                      )}
                                  </div>
                              ))}
                          </div>

                          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100">
                              <div className="flex flex-col gap-3 w-full md:flex-row md:justify-end md:gap-3 order-1 md:order-2">
                                  <Button variant="secondary" onClick={(e: any) => handleSave(e, 'draft')} fullWidth className="md:w-auto justify-center">
                                      <Save size={18}/> Uložiť (Rozpracované)
                                  </Button>
                                  <Button variant="primary" onClick={(e: any) => handleSave(e, 'signed')} fullWidth className="md:w-auto bg-green-600 hover:bg-green-700 shadow-green-200 border-none text-white justify-center">
                                      <CheckCircle2 size={18}/> Uzavrieť a Podpísať
                                  </Button>
                              </div>
                              <div className="text-xs text-slate-400 text-center md:text-left order-2 md:order-1 w-full md:w-auto mt-2 md:mt-0">
                                  {diaryEntry.updated_at ? `Naposledy uložené: ${new Date(diaryEntry.updated_at).toLocaleTimeString()}` : 'Zatiaľ neuložené'}
                              </div>
                          </div>
                      </Card>
                  </div>

                  <div className="space-y-6">
                      <div className="bg-gradient-to-br from-orange-50 to-white text-slate-800 p-5 rounded-2xl shadow-md border border-orange-100 relative overflow-hidden">
                          <div className="relative z-10">
                              <h4 className="font-bold text-xs uppercase tracking-wider mb-2 text-orange-600 opacity-80">Denný Súhrn</h4>
                              <div className="text-3xl font-extrabold flex items-baseline gap-2 text-slate-900">
                                  {dailyAttendance.reduce((a,b) => a + Number(b.hours), 0).toFixed(1)} <span className="text-lg font-medium opacity-60">hodín</span>
                              </div>
                              <div className="mt-2 text-xs font-medium text-slate-500">{dailyAttendance.length} pracovníkov na stavbe</div>
                          </div>
                          <div className="absolute right-[-10px] bottom-[-10px] text-orange-500/10 transform rotate-12">
                              <Users size={100} />
                          </div>
                      </div>

                      <Card className="bg-white border-slate-200 shadow-sm p-4">
                          <SectionHeader icon={ListChecks} title="Dostupné práce" sub="Z dnešnej dochádzky" />
                          {dailyAttendance.length === 0 ? <div className="text-sm text-slate-400 italic py-2 text-center">Žiadne záznamy.</div> : (
                              <div className="space-y-3">
                                  {dailyAttendance.map(log => (
                                      <div key={log.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs shadow-sm hover:border-blue-200 transition group relative overflow-hidden">
                                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400"></div>
                                          <div className="flex justify-between items-start mb-1">
                                              <span className="font-black text-slate-800 uppercase tracking-tighter text-[9px]">{log.profiles?.full_name}</span>
                                              <span className="font-mono font-bold text-blue-600">{Number(log.hours).toFixed(1)}h</span>
                                          </div>
                                          <p className="text-slate-600 italic font-medium leading-relaxed">
                                              {log.description || '(Bez popisu práce)'}
                                          </p>
                                          {diaryEntry?.notes && diaryEntry.notes.includes(log.description) ? (
                                              <div className="mt-2 flex items-center gap-1 text-green-600 font-bold text-[8px] uppercase">
                                                  <CheckCircle2 size={10}/> Importované do denníka
                                              </div>
                                          ) : null}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </Card>

                      <Card className="bg-white border-slate-200 shadow-sm p-4">
                          <SectionHeader icon={Package} title="Nákupy materiálu" sub="Z dnešných nákladov" />
                          {dailyMaterials.length === 0 ? <div className="text-sm text-slate-400 italic py-2 text-center">Žiadne nákupy.</div> : (
                              <div className="space-y-2">
                                  {dailyMaterials.map(mat => (
                                      <div key={mat.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs hover:border-orange-200 transition">
                                          <div className="font-bold text-slate-800">{mat.name}</div>
                                          <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                                              <span className="font-bold text-orange-600">{mat.quantity} {mat.unit}</span>
                                              <span className="uppercase">{mat.supplier || '-'}</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </Card>
                  </div>
              </div>

              {/* HIDDEN PDF TEMPLATE */}
              <div className="fixed left-[-9999px]">
                  <div ref={printRef} className="w-[190mm] bg-white p-8 text-slate-900 font-sans text-sm leading-normal relative box-border text-left">
                      <div className="absolute top-4 right-4 text-[10px] text-slate-400">Digitálny Denník vygenerovaný cez MojaStavba</div>
                      <div className="border-b-2 border-black pb-4 mb-6">
                          <h1 className="text-2xl font-bold uppercase tracking-widest text-center mb-2">Stavebný Denník</h1>
                          <div className="flex justify-between items-end mt-4">
                              <div>
                                  <div className="font-bold text-lg">{currentSiteName}</div>
                                  <div className="text-xs uppercase tracking-wide text-slate-500">Objekt / Stavba</div>
                              </div>
                              <div className="text-right">
                                  <div className="font-bold text-xl">{selectedDay.toLocaleDateString('sk-SK')}</div>
                                  <div className="text-xs uppercase tracking-wide text-slate-500">Dátum</div>
                              </div>
                          </div>
                      </div>
                      <div className="border border-black mb-6">
                          <div className="bg-slate-100 border-b border-black p-1 text-center font-bold uppercase text-xs">Poveternostné podmienky</div>
                          <div className="grid grid-cols-3 divide-x divide-black text-center p-2">
                              <div>
                                  <span className="block text-[10px] text-slate-500 uppercase">Stav</span>
                                  <span className="font-bold">{diaryEntry.weather || '-'}</span>
                              </div>
                              <div>
                                  <span className="block text-[10px] text-slate-500 uppercase">Teplota 7:00</span>
                                  <span className="font-bold">{diaryEntry.temperature_morning || '-'} °C</span>
                              </div>
                              <div>
                                  <span className="block text-[10px] text-slate-500 uppercase">Teplota 13:00</span>
                                  <span className="font-bold">{diaryEntry.temperature_noon || '-'} °C</span>
                              </div>
                          </div>
                      </div>
                      {[
                          { title: '1. Pracovníci (Menovitý zoznam)', content: dailyAttendance.length > 0 ? dailyAttendance.map(l => `${l.profiles?.full_name} (${Number(l.hours).toFixed(1)}h)`).join(', ') : 'Bez záznamu' },
                          { title: '2. Mechanizmy a Doprava', content: diaryEntry.mechanisms || 'Bez nasadenia' },
                          { title: '3. Dodaný materiál a hmoty', content: dailyMaterials.length > 0 ? dailyMaterials.map(m => `${m.name} (${m.quantity} ${m.unit})`).join(', ') : 'Žiadne dodávky' },
                      ].map((sec, i) => (
                          <div key={i} className="mb-6">
                              <div className="font-bold uppercase text-xs border-b border-slate-300 mb-2">{sec.title}</div>
                              <div className="text-justify leading-snug">{sec.content}</div>
                          </div>
                      ))}
                      {diaryEntry.photos?.length > 0 && (
                          <div className="mb-6">
                              <div className="font-bold uppercase text-xs border-b border-black mb-2 pb-1">4. Fotodokumentácia</div>
                              <div className="grid grid-cols-3 gap-2">
                                  {diaryEntry.photos.slice(0, 6).map((p: string, i: number) => (
                                      <div key={i} className="aspect-video bg-slate-100 overflow-hidden border border-slate-300">
                                          <img src={p} crossOrigin="anonymous" className="w-full h-full object-cover" />
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                      <div className="mb-8 flex-1">
                          <div className="font-bold uppercase text-xs border-b border-black mb-2 pb-1">5. Popis prác a záznamy</div>
                          <div className="whitespace-pre-wrap text-justify min-h-[100px] text-sm leading-relaxed border-l-2 border-slate-100 pl-4">{diaryEntry.notes || 'Žiadny popis.'}</div>
                      </div>
                      <div className="mt-auto pt-10 border-t-2 border-black grid grid-cols-2 gap-20">
                          <div className="text-center">
                              <div className="h-12 border-b border-dotted border-black mb-2"></div>
                              <div className="text-xs uppercase font-bold">Stavbyvedúci (Meno, Podpis)</div>
                          </div>
                          <div className="text-center relative">
                                <div className="h-12 border-b border-dotted border-black mb-2 flex items-center justify-center">
                                    {organization.stamp_url ? (
                                        <img 
                                          src={organization.stamp_url} 
                                          alt="Pečiatka" 
                                          crossOrigin="anonymous" 
                                          className="h-24 absolute -top-10 rotate-3 opacity-90" 
                                        />
                                    ) : null}
                                </div>
                                <div className="text-xs uppercase font-bold">Pečiatka a Podpis Firmy</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          )
      ) : (
          <Card className="animate-in slide-in-from-bottom-2 duration-500 shadow-md">
              <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft size={18}/></button>
                      <h3 className="text-xl font-bold capitalize w-48 text-center text-slate-800">
                          {currentDate.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowRight size={18}/></button>
                  </div>
                  <div className="hidden sm:block">
                      <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-orange-100">
                          {currentSiteName}
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(d => <div key={d}>{d}</div>)}
              </div>
              
              <div className="grid grid-cols-7 gap-1 md:gap-2 p-1 md:p-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  {Array.from({length: (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7}).map((_, i) => (
                      <div key={`empty-${i}`} className="h-16 md:h-28 rounded-xl border border-transparent"></div>
                  ))}
                  
                  {getDaysInMonth(currentDate).map(day => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      const dateKey = getLocalDateString(day);
                      const stats = monthStats[dateKey];
                      const hasContent = stats?.hasRecord || (stats?.logs && stats.logs.length > 0);

                      return (
                          <button 
                              key={day.toISOString()}
                              onClick={() => handleDaySelect(day)}
                              onMouseEnter={(e) => handleMouseEnter(day, stats, e)}
                              onMouseLeave={() => setPreviewDay(null)}
                              onTouchStart={(e) => onTouchStart(day, stats, e)}
                              onTouchMove={onTouchMove}
                              onTouchEnd={onTouchEnd}
                              className={`h-16 md:h-28 rounded-xl border p-1 md:p-2 text-left relative transition-all hover:shadow-lg group flex flex-col justify-between shadow-sm overflow-hidden select-none ${
                                  isToday 
                                    ? 'border-orange-500 bg-white ring-2 ring-orange-100' 
                                    : hasContent
                                        ? 'border-blue-200 bg-white hover:border-blue-400' 
                                        : 'border-slate-200 bg-white hover:border-orange-300'
                              } bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] md:[background-size:16px_16px]`}
                          >
                              <div className="flex justify-between items-start w-full relative z-10">
                                <div className={`font-bold leading-none ${isToday ? 'text-orange-600 bg-orange-50 px-1 md:px-2 py-0.5 md:py-1 rounded-md text-xs sm:text-sm md:text-lg' : 'text-slate-700 text-xs sm:text-sm md:text-lg'}`}>
                                    {day.getDate()}
                                </div>
                                {hasContent && (
                                    <div className="flex gap-0.5 md:gap-1 bg-white/90 p-0.5 md:p-1 rounded-full shadow-sm border border-slate-100">
                                        {stats?.hasRecord && <div className={`w-1 h-1 md:w-2 md:h-2 rounded-full ${stats.status === 'signed' ? 'bg-green-500' : 'bg-orange-500'}`}></div>}
                                        {stats?.logs?.length > 0 && <div className="w-1 h-1 md:w-2 md:h-2 rounded-full bg-blue-500"></div>}
                                    </div>
                                )}
                              </div>
                              <div className="mt-auto w-full opacity-0 md:group-hover:opacity-100 transition-opacity flex justify-between items-end relative z-10">
                                  <div className="bg-slate-900/5 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase hidden md:block">Podrobnosti</div>
                                  {stats?.totalHours > 0 && <span className="text-[9px] md:text-[10px] font-black text-blue-600 mb-0.5">{stats.totalHours.toFixed(1)}h</span>}
                              </div>
                          </button>
                      );
                  })}
              </div>
          </Card>
      )}

      {fullExportData && (
          <div className="fixed left-[-9999px]">
              <div ref={fullPrintRef} className="w-[210mm] bg-white p-8 text-slate-900 font-sans text-xs leading-normal">
                  <div className="text-right text-[10px] text-slate-400 mb-2">MojaStavba.app - Kompletný Denník</div>
                  <div className="border-b-2 border-black pb-4 mb-6">
                      <h1 className="text-2xl font-bold uppercase tracking-widest text-center">Stavebný Denník</h1>
                      <div className="text-center text-lg mt-2 font-bold">{currentSiteName}</div>
                  </div>
                  <table className="w-full border-collapse border border-slate-300 text-left">
                      <thead className="bg-slate-100">
                          <tr>
                              <th className="border border-slate-300 p-2 w-[15%]">Dátum</th>
                              <th className="border border-slate-300 p-2 w-[25%]">Pracovníci</th>
                              <th className="border border-slate-300 p-2 w-[40%]">Popis prác</th>
                              <th className="border border-slate-300 p-2 w-[20%]">Materiál</th>
                          </tr>
                      </thead>
                      <tbody>
                          {fullExportData.map((day, idx) => (
                              <tr key={idx} className="break-inside-avoid">
                                  <td className="border border-slate-300 p-2 align-top">
                                      <div className="font-bold">{formatDate(day.date)}</div>
                                      {day.record?.weather && <div className="mt-1">Poč: {day.record.weather}</div>}
                                  </td>
                                  <td className="border border-slate-300 p-2 align-top">
                                      {day.logs?.map((l: any, i: number) => (
                                          <div key={i}>{l.profiles?.full_name} ({Number(l.hours).toFixed(1)}h)</div>
                                      ))}
                                  </td>
                                  <td className="border border-slate-300 p-2 align-top whitespace-pre-wrap">{day.record?.notes || '-'}</td>
                                  <td className="border border-slate-300 p-2 align-top">
                                      {day.materials?.map((m: any, i: number) => (
                                          <div key={i}>{m.name} ({m.quantity} {m.unit})</div>
                                      ))}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      <AlertModal isOpen={alert.open} onClose={() => setAlert({...alert, open: false})} title={alert.type === 'error' ? 'Chyba' : 'Úspech'} message={alert.message} type={alert.type} />
    </div>
  );
};
