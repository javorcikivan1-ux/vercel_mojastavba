
import React, { useState, useEffect, useRef } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { Button, Card, Badge, Modal, Input, Select, ConfirmModal, AlertModal, CustomLogo } from '../components/UI';
import { MapPin, BarChart3, ClipboardList, Euro, Package, HardHat, Plus, FileDown, Trash2, ArrowLeft, Loader2, User, Clock, Calendar, Pencil, Building2, ChevronDown, Check, CheckCircle2, Archive, RefreshCcw, FolderOpen, AlertCircle, FileText, Send, X, Printer, Phone, Briefcase, Calculator, Percent, LayoutList, GripVertical, TrendingUp, TrendingDown, Search, Filter, Info, Activity, FileCheck, ShieldCheck } from 'lucide-react';
import { formatMoney, formatDate, formatDuration } from '../lib/utils';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const PAGE_SIZE = 12;
const PRIORITY_FLAG = "#PRIORITY";

const EmptyState = ({ message }: { message: string }) => (
    <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-sm w-full">
        <FolderOpen size={48} className="mx-auto mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest text-xs">{message}</p>
    </div>
);

const calculateSmartHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
    if (totalMinutes < 0) totalMinutes += 24 * 60; 
    return totalMinutes / 60;
};

export const ProjectsScreen = ({ profile, onSelect, selectedSiteId, organization }: { profile: UserProfile, onSelect: (id: string | null) => void, selectedSiteId: string | null, organization: any }) => {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const onBackInternal = () => {
    onSelect(null);
  };

  if (selectedSiteId) {
    return <ProjectDetail siteId={selectedSiteId} profile={profile} onBack={() => onBackInternal()} organization={organization} />;
  }

  if (selectedLeadId) {
      return <LeadDetail siteId={selectedLeadId} profile={profile} onBack={() => setSelectedLeadId(null)} organization={organization} onConvertToProject={() => { setSelectedLeadId(null); onSelect(null); }} />;
  }

  return <ProjectManager profile={profile} onSelect={onSelect} onSelectLead={setSelectedLeadId} organization={organization} />;
};

const ProjectManager = ({ profile, onSelect, onSelectLead, organization }: any) => {
  const [activeTab, setActiveTab] = useState<'leads' | 'active' | 'archive'>('active');
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', address: '', client_name: '', budget: 0, status: 'lead', lead_stage: 'new', notes: '' });
  
  const [alert, setAlert] = useState<{open: boolean, title: string, message: string, type: string}>({ open: false, title: '', message: '', type: 'success' });
  const [confirm, setConfirm] = useState<{open: boolean, action: string, id: string | null}>({ open: false, action: '', id: null });

  const handleTabChange = (newTab: 'leads' | 'active' | 'archive') => {
      setSites([]);
      setLoading(true);
      setPage(0);
      setActiveTab(newTab);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        load(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [activeTab, searchQuery]);

  useEffect(() => {
    if (page > 0) load(false);
  }, [page]);

  const load = async (reset = false) => {
    if (reset) {
        setLoading(true);
    } else {
        setLoadingMore(true);
    }

    try {
        let query = supabase.from('sites').select('*').eq('organization_id', profile.organization_id);

        if (activeTab === 'leads') {
            query = query.eq('status', 'lead');
        } else if (activeTab === 'active') {
            query = query.in('status', ['active', 'planning']);
        } else {
            query = query.in('status', ['completed', 'paused']);
        }

        if (searchQuery) {
            query = query.or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,client_name.ilike.%${searchQuery}%`);
        }

        const from = reset ? 0 : page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data: sitesData, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        if (sitesData) {
            const siteIds = sitesData.map(s => s.id);
            const { data: statsRes } = await supabase
                .from('v_site_financials')
                .select('*')
                .in('site_id', siteIds);

            const enriched = sitesData.map(site => {
                const s = statsRes?.find(st => st.site_id === site.id);
                const income = Number(s?.total_income || 0);
                const totalCost = Number(s?.total_direct_expenses || 0) + Number(s?.total_material_cost || 0) + Number(s?.total_labor_cost || 0);
                return {
                    ...site,
                    profit: income - totalCost,
                    income,
                    totalCost,
                    costPercent: site.budget > 0 ? (totalCost / site.budget) * 100 : 0
                };
            });

            setSites(prev => reset ? enriched : [...prev, ...enriched]);
            setHasMore(sitesData.length === PAGE_SIZE);
        }
    } catch (e: any) {
        console.error(e);
    } finally {
        setLoading(false);
        setLoadingMore(false);
    }
  };

  const handleCreateSite = (status: string = 'lead') => {
      setEditingSite(null);
      setFormData({ name: '', address: '', client_name: '', budget: 0, status: status, lead_stage: 'new', notes: '' });
      setShowModal(true);
  };

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const payload = { 
            ...formData, 
            budget: Number(formData.budget) || 0,
            organization_id: profile.organization_id 
        };
        
        let result;
        if(editingSite) {
            result = await supabase.from('sites').update(payload).eq('id', editingSite.id).select();
        } else {
            result = await supabase.from('sites').insert([payload]).select();
        }

        if(result.error) throw result.error;

        setShowModal(false);
        setPage(0);
        load(true);
        
        if (!editingSite && payload.status === 'lead' && result.data) {
             onSelectLead(result.data[0].id);
        }

    } catch (err: any) {
        setAlert({ open: true, title: 'Chyba', message: err.message, type: 'error' });
    }
  };

  const deleteSite = async () => {
      if(!confirm.id) return;
      await supabase.from('sites').delete().eq('id', confirm.id);
      setConfirm({ ...confirm, open: false });
      setPage(0);
      load(true);
  };

  const updateLeadStage = async (siteId: string, stage: string) => {
      await supabase.from('sites').update({ lead_stage: stage }).eq('id', siteId);
      setSites(prev => prev.map(s => s.id === siteId ? { ...s, lead_stage: stage } : s));
  };

  const getLeadNameColor = (stage: string) => {
      switch(stage) {
          case 'contacted': return 'text-yellow-600';
          case 'meeting': return 'text-purple-700';
          case 'pricing': return 'text-orange-600';
          default: return 'text-blue-700';
      }
  };

  const getStatusButtonClass = (isActive: boolean, stage: string) => {
      const base = "px-3 py-1.5 rounded-md transition text-xs font-bold border";
      const colors: any = {
          new: { active: "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200", inactive: "bg-white text-slate-500 border-transparent hover:bg-slate-50" },
          contacted: { active: "bg-yellow-50 text-yellow-700 border-yellow-200 ring-1 ring-yellow-200", inactive: "bg-white text-slate-500 border-transparent hover:bg-slate-50" },
          meeting: { active: "bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-200", inactive: "bg-white text-slate-500 border-transparent hover:bg-slate-50" },
          pricing: { active: "bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-200", inactive: "bg-white text-slate-500 border-transparent hover:bg-slate-50" }
      };
      const style = colors[stage] || colors['new'];
      return `${base} ${isActive ? style.active : style.inactive}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="text-orange-600" size={32} />
              Správa zákaziek
           </h2>
           <p className="text-sm text-slate-500 mt-1 font-medium">Správa zákaziek od dopytu po realizáciu</p>
        </div>
        <div>
            <Button onClick={() => handleCreateSite(activeTab === 'active' ? 'active' : 'lead')}><Plus size={18}/> Pridať {activeTab === 'active' ? 'Stavbu' : 'Dopyt'}</Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 shadow-inner border border-slate-200 overflow-x-auto w-full lg:w-auto">
            {[
                { id: 'active', label: 'Realizácia', icon: HardHat },
                { id: 'leads', label: 'Obchod', icon: Briefcase },
                { id: 'archive', label: 'Archív', icon: Archive },
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap flex-1 lg:flex-none justify-center ${
                        activeTab === tab.id 
                        ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                >
                    <tab.icon size={16} className={activeTab === tab.id ? "text-orange-600" : "text-slate-400"}/> 
                    {tab.label}
                </button>
            ))}
        </div>
        
        <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
                type="text" 
                placeholder="Hľadať v zozname..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-inner"
            />
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[400px] relative">
          {loading && sites.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-orange-600" size={40}/></div>
          ) : (
              <div className="space-y-8">
                {activeTab === 'leads' && (
                    <div className="space-y-4">
                        {sites.length === 0 ? <EmptyState message={searchQuery ? "Nenašli sa žiadne dopyty." : "Žiadne nové dopyty."} /> : (
                            <div className="grid grid-cols-1 gap-4">
                                {sites.map(lead => {
                                    const stage = lead.lead_stage || 'new';
                                    return (
                                        <div key={lead.id} onClick={() => onSelectLead(lead.id)} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col md:flex-row gap-4 items-start md:items-center group">
                                            <div className={`w-2 h-16 rounded-full self-stretch ${stage === 'new' ? 'bg-blue-500' : stage === 'contacted' ? 'bg-yellow-500' : stage === 'meeting' ? 'bg-purple-500' : 'bg-orange-500'}`}></div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className={`font-bold text-lg transition ${getLeadNameColor(stage)}`}>{lead.name}</h3>
                                                    <Badge status={stage} />
                                                </div>
                                                <div className="flex gap-4 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1"><User size={14}/> {lead.client_name || 'Neznámy'}</span>
                                                    <span className="flex items-center gap-1"><MapPin size={14}/> {lead.address || '-'}</span>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 p-1 rounded-lg flex text-xs font-medium border border-slate-100 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
                                                {[ { id: 'new', label: 'Nový' }, { id: 'contacted', label: 'Kontakt' }, { id: 'meeting', label: 'Obhliadka' }, { id: 'pricing', label: 'Ponuka' } ].map(s => (
                                                    <button key={s.id} onClick={() => updateLeadStage(lead.id, s.id)} className={getStatusButtonClass(stage === s.id, s.id)}>{s.label}</button>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => setConfirm({ open: true, action: 'delete', id: lead.id })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {(activeTab === 'active' || activeTab === 'archive') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sites.map(site => (
                            <Card key={site.id} onClick={() => onSelect(site.id)} className="cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition duration-300 relative overflow-hidden flex flex-col h-full border border-slate-200 bg-white">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-orange-600 transition truncate pr-2" title={site.name}>{site.name}</h3>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-0.5">
                                            <MapPin size={12} /> {site.address || 'Bez adresy'}
                                        </div>
                                    </div>
                                    <Badge status={site.status} />
                                </div>
                                <div className="space-y-3 mb-6 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-bold uppercase tracking-wider">Bilancia</span>
                                        <div className={`flex items-center gap-1 font-extrabold ${site.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatMoney(site.profit)}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[10px] font-bold">
                                            <span className="text-slate-400 uppercase">Náklady / Rozpočet</span>
                                            <span className="text-slate-700">{formatMoney(site.totalCost)} / {formatMoney(site.budget)}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-500 ${site.totalCost > site.budget ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, site.costPercent)}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center bg-white -mx-6 -mb-6 p-6">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg"><Euro size={16}/></div>
                                        <div className="font-bold text-slate-700 leading-none">{formatMoney(site.income)}</div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingSite(site); setFormData({name: site.name, address: site.address, client_name: site.client_name, budget: site.budget, status: site.status, lead_stage: 'new', notes: site.notes}); setShowModal(true); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-600 transition border border-transparent hover:border-slate-200"><Pencil size={16}/></button>
                                </div>
                            </Card>
                        ))}
                        {sites.length === 0 && <EmptyState message={searchQuery ? "Nenašli sa žiadne projekty." : "Zoznam je prázvny."} />}
                    </div>
                )}
                
                {hasMore && !loading && (
                    <div className="flex justify-center pt-8 pb-12">
                        <Button variant="secondary" onClick={() => setPage(p => p + 1)} loading={loadingMore} className="bg-white min-w-[220px]">Načítať ďalšie zákazky...</Button>
                    </div>
                )}
              </div>
          )}
      </div>

      {showModal && (
        <Modal title={editingSite ? "Upraviť" : (activeTab === 'leads' ? "Nový Dopyt" : "Nový Projekt")} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSaveSite}>
            <Input label="Názov" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} required autoFocus placeholder={activeTab === 'leads' ? "Napr. Rekonštrukcia bytu" : "Napr. Rodinný dom Záhorská"} />
            <Input label="Adresa" value={formData.address} onChange={(e: any) => setFormData({...formData, address: e.target.value})} placeholder="Ulica, Mesto" />
            <Input label="Klient (Meno)" value={formData.client_name} onChange={(e: any) => setFormData({...formData, client_name: e.target.value})} placeholder="Ján Novák" />
            
            {(editingSite || activeTab !== 'leads') && (
                <div className="grid grid-cols-2 gap-4">
                <Input label="Rozpočet (€)" type="number" value={formData.budget === 0 ? '' : formData.budget} onFocus={(e:any) => e.target.select()} onChange={(e: any) => setFormData({...formData, budget: parseFloat(e.target.value) || 0})} placeholder="0.00" />
                <Select label="Status" value={formData.status} onChange={(e: any) => setFormData({...formData, status: e.target.value})}>
                    <option value="lead">Dopyt (Lead)</option>
                    <option value="active">Aktívna Stavba</option>
                    <option value="planning">V príprave</option>
                    <option value="paused">Pozastavená</option>
                    <option value="completed">Dokončená</option>
                </Select>
                </div>
            )}
            
            <div className="mt-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Poznámky</label>
                <textarea className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-orange-500 h-24 text-sm font-medium" value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Detaily..."></textarea>
            </div>
            <Button type="submit" fullWidth className="mt-6 shadow-orange-200">{editingSite ? 'Uložiť Zmeny' : 'Vytvoriť'}</Button>
          </form>
        </Modal>
      )}

      <ConfirmModal isOpen={confirm.open} onClose={() => setConfirm({...confirm, open: false})} onConfirm={deleteSite} title="Naozaj zmazať?" message="Táto akcia je nevratná." type="danger" />
      <AlertModal isOpen={alert.open} onClose={() => setAlert({...alert, open: false})} title={alert.title} message={alert.message} type={alert.type} />
    </div>
  );
};

interface CalcRow {
    id: string;
    description: string;
    unit: string;
    qty: number;
    unit_cost: number;
    margin: number;
}

const IntegratedCalculator = () => {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');

    const handlePress = (val: string) => {
        if (val === 'C') {
            setDisplay('0');
            setEquation('');
        } else if (val === '=') {
            try {
                const res = eval(equation + display);
                setDisplay(String(Number(res).toFixed(2)).replace('.00', ''));
                setEquation('');
            } catch {
                setDisplay('Chyba');
            }
        } else if (['+', '-', '*', '/'].includes(val)) {
            setEquation(equation + display + val);
            setDisplay('0');
        } else {
            setDisplay(display === '0' ? val : display + val);
        }
    };

    const btnClass = "h-12 rounded-lg font-bold text-lg shadow-sm transition active:scale-[0.95] flex items-center justify-center";
    const numBtn = `${btnClass} bg-white hover:bg-slate-50 text-slate-800 border border-slate-200`;
    const opBtn = `${btnClass} bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200`;
    const eqBtn = `${btnClass} bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200`;

    return (
        <Card className="bg-slate-100 border-slate-200 w-full max-w-[280px]" padding="p-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Calculator size={12}/> Príručná kalkulačka</div>
            <div className="bg-white border border-slate-300 rounded-xl p-3 mb-4 text-right">
                <div className="text-xs text-slate-400 h-4 mb-1 truncate">{equation}</div>
                <div className="text-2xl font-mono font-bold text-slate-800 overflow-hidden">{display}</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
                <button onClick={() => handlePress('7')} className={numBtn}>7</button>
                <button onClick={() => handlePress('8')} className={numBtn}>8</button>
                <button onClick={() => handlePress('9')} className={numBtn}>9</button>
                <button onClick={() => handlePress('/')} className={opBtn}>÷</button>
                <button onClick={() => handlePress('4')} className={numBtn}>4</button>
                <button onClick={() => handlePress('5')} className={numBtn}>5</button>
                <button onClick={() => handlePress('6')} className={numBtn}>6</button>
                <button onClick={() => handlePress('*')} className={opBtn}>×</button>
                <button onClick={() => handlePress('1')} className={numBtn}>1</button>
                <button onClick={() => handlePress('2')} className={numBtn}>2</button>
                <button onClick={() => handlePress('3')} className={numBtn}>3</button>
                <button onClick={() => handlePress('-')} className={opBtn}>-</button>
                <button onClick={() => handlePress('C')} className={`${btnClass} bg-red-100 text-red-600 border border-red-200`}>C</button>
                <button onClick={() => handlePress('0')} className={numBtn}>0</button>
                <button onClick={() => handlePress('.')} className={numBtn}>.</button>
                <button onClick={() => handlePress('+')} className={opBtn}>+</button>
                <button onClick={() => handlePress('=')} className={`${eqBtn} col-span-4 mt-1`}>=</button>
            </div>
        </Card>
    );
};

const LeadDetail = ({ siteId, profile, onBack, organization, onConvertToProject }: any) => {
    const [lead, setLead] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'calculator' | 'quotes'>('info');
    const [quotes, setQuotes] = useState<any[]>([]);
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);
    
    const [calcRows, setCalcRows] = useState<CalcRow[]>([
        { id: '1', description: 'Materiál (Tehla/Betón)', unit: 'ks', qty: 0, unit_cost: 0, margin: 20 },
        { id: '2', description: 'Práca (Murári)', unit: 'hod', qty: 0, unit_cost: 15, margin: 30 }
    ]);

    const load = async () => {
        const { data: s } = await supabase.from('sites').select('*').eq('id', siteId).single();
        const { data: q } = await supabase.from('quotes').select('*, sites(name)').eq('site_id', siteId).order('created_at', { ascending: false });
        if(s) setLead(s);
        if(q) setQuotes(q);
    };

    useEffect(() => { load(); }, [siteId]);

    const handleUpdateNotes = async (e: any) => {
        await supabase.from('sites').update({ notes: e.target.value }).eq('id', siteId);
        setLead({ ...lead, notes: e.target.value });
    };

    const handleUpdateBudget = async (val: number) => {
        await supabase.from('sites').update({ budget: val }).eq('id', siteId);
        setLead({ ...lead, budget: val });
    };

    const addCalcRow = () => setCalcRows([...calcRows, { id: crypto.randomUUID(), description: '', unit: 'ks', qty: 0, unit_cost: 0, margin: 20 }]);
    const removeCalcRow = (id: string) => setCalcRows(calcRows.filter(r => r.id !== id));
    const updateRow = (id: string, field: keyof CalcRow, val: any) => {
        setCalcRows(calcRows.map(r => r.id === id ? { ...r, [field]: val } : r));
    };

    const totalCost = calcRows.reduce((acc, r) => acc + (r.qty * r.unit_cost), 0);
    const totalPrice = calcRows.reduce((acc, r) => {
        const cost = r.qty * r.unit_cost;
        const price = cost / ((100 - r.margin) / 100);
        return acc + (r.margin < 100 ? price : cost);
    }, 0);
    const totalProfit = totalPrice - totalCost;

    if(!lead) return <div className="p-8 text-center"><Loader2 className="animate-spin text-orange-600 mx-auto"/></div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <button onClick={onBack} className="text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition"><ArrowLeft size={14}/> Späť</button>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowConvertModal(true)}><CheckCircle2 size={16}/> Začať realizáciu</Button>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{lead.name}</h1>
                        <div className="flex gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><User size={14}/> {lead.client_name}</span>
                            <span className="flex items-center gap-1"><MapPin size={14}/> {lead.address}</span>
                        </div>
                    </div>
                    <Badge status={lead.lead_stage || 'new'} />
                </div>

                <div className="bg-slate-100 p-1 rounded-xl inline-flex gap-1 border border-slate-200 mt-4 mb-6 overflow-x-auto max-w-full">
                    {[
                        { id: 'info', label: 'Prehľad & Poznámky', icon: ClipboardList },
                        { id: 'calculator', label: 'Rozpočet & Kalkulácia', icon: Calculator },
                        { id: 'quotes', label: `Cenové ponuky (${quotes.length})`, icon: FileText }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-lg transition whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                        >
                            <tab.icon size={16}/> {tab.label}
                        </button>
                    ))}
                </div>

                <div>
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Poznámky k dopytu</label>
                                <textarea 
                                    className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 resize-none font-medium text-slate-700 leading-relaxed"
                                    placeholder="Sem si napíšte detaily, čo treba spraviť, odhady, telefonáty..."
                                    defaultValue={lead.notes || ''}
                                    onBlur={handleUpdateNotes}
                                ></textarea>
                            </div>
                            <div className="space-y-6">
                                <Card className="bg-blue-50/50 border-blue-100">
                                    <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2"><Briefcase size={18}/> Detaily</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-blue-700/60 uppercase tracking-wider mb-1">Odhadovaný rozpočet (€)</label>
                                            <input 
                                                type="number"
                                                className="w-full bg-white border border-blue-200 rounded-lg p-2 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-300 transition"
                                                defaultValue={lead.budget === 0 ? '' : lead.budget}
                                                onFocus={(e) => e.target.select()}
                                                onBlur={(e) => handleUpdateBudget(parseFloat(e.target.value) || 0)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex justify-between text-sm"><span className="text-slate-500">Vytvorené:</span> <span className="font-bold">{formatDate(lead.created_at)}</span></div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {activeTab === 'calculator' && (
                        <div className="flex flex-col xl:flex-row gap-8 animate-in fade-in">
                            <div className="flex-1 space-y-6">
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                    <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
                                        <div className="font-bold text-slate-700 text-sm flex items-center gap-2"><LayoutList size={16}/> Rozpočtový Hárok</div>
                                        <Button variant="secondary" size="sm" onClick={addCalcRow}><Plus size={14}/> Pridať položku</Button>
                                    </div>
                                    <div className="w-full overflow-x-auto">
                                      <table className="w-full text-sm text-left min-w-[700px]">
                                          <thead className="bg-white text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                                              <tr>
                                                  <th className="p-3 w-8">#</th>
                                                  <th className="p-3">Popis</th>
                                                  <th className="p-3 w-20 text-center">MJ</th>
                                                  <th className="p-3 w-24 text-right">Mn.</th>
                                                  <th className="p-3 w-28 text-right">Cena/MJ</th>
                                                  <th className="p-3 w-20 text-right">Marža %</th>
                                                  <th className="p-3 w-32 text-right">Predajná Cena</th>
                                                  <th className="p-3 w-10"></th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                              {calcRows.map((row, i) => {
                                                  const rowCost = row.qty * row.unit_cost;
                                                  const rowPrice = rowCost / ((100 - row.margin) / 100);
                                                  return (
                                                      <tr key={row.id} className="group hover:bg-slate-50 transition">
                                                          <td className="p-3 text-center text-slate-300 font-mono">{i+1}</td>
                                                          <td className="p-3"><input className="w-full bg-transparent outline-none font-bold text-slate-700 placeholder:text-slate-300" value={row.description} onChange={e => updateRow(row.id, 'description', e.target.value)} placeholder="Názov položky..." /></td>
                                                          <td className="p-3"><input className="w-full bg-transparent outline-none text-center text-slate-500" value={row.unit} onChange={e => updateRow(row.id, 'unit', e.target.value)} /></td>
                                                          <td className="p-3"><input type="number" className="w-full bg-transparent outline-none text-right font-mono" value={row.qty === 0 ? '' : row.qty} onFocus={e => e.target.select()} onChange={e => updateRow(row.id, 'qty', parseFloat(e.target.value)||0)} placeholder="0" /></td>
                                                          <td className="p-3"><input type="number" className="w-full bg-transparent outline-none text-right font-mono" value={row.unit_cost === 0 ? '' : row.unit_cost} onFocus={e => e.target.select()} onChange={e => updateRow(row.id, 'unit_cost', parseFloat(e.target.value)||0)} placeholder="0.00" /></td>
                                                          <td className="p-3"><input type="number" className="w-full bg-transparent outline-none text-right font-bold text-orange-600" value={row.margin === 0 ? '' : row.margin} onFocus={e => e.target.select()} onChange={e => updateRow(row.id, 'margin', parseFloat(e.target.value)||0)} placeholder="0" /></td>
                                                          <td className="p-3 text-right font-bold text-slate-900 bg-slate-50/50">{formatMoney(rowPrice)}</td>
                                                          <td className="p-3 text-center"><button onClick={() => removeCalcRow(row.id)} className="text-slate-300 hover:text-red-500 transition active:scale-90"><Trash2 size={16}/></button></td>
                                                      </tr>
                                                  );
                                              })}
                                          </tbody>
                                      </table>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                        <div className="text-xs uppercase font-bold text-slate-400 mb-1">Interné Náklady</div>
                                        <div className="text-xl font-bold text-slate-600">{formatMoney(totalCost)}</div>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-4 border border-green-200 shadow-sm">
                                        <div className="text-xs uppercase font-bold text-green-700 mb-1">Predpokladaný Zisk</div>
                                        <div className="text-xl font-bold text-green-700">+{formatMoney(totalProfit)}</div>
                                    </div>
                                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 shadow-sm ring-2 ring-orange-100">
                                        <div className="text-xs uppercase font-bold text-orange-600 mb-1 flex items-center gap-2"><Euro size={14}/> Cena bez DPH</div>
                                        <div className="text-xl font-extrabold text-slate-900 tracking-tight">{formatMoney(totalPrice)}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="xl:w-[280px] shrink-0 flex flex-col gap-6 items-center xl:items-start">
                                <IntegratedCalculator />
                                <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100 w-full shadow-sm">
                                    <strong>Tip:</strong> Ceny v tomto hárku sú len pre vašu internú kalkuláciu. Do oficiálnej cenovej ponuky sa neprenášajú automaticky.
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'quotes' && (
                        <div className="animate-in fade-in">
                            <div className="flex justify-end mb-4">
                                <Button size="sm" onClick={() => setShowQuoteModal(true)}><Plus size={16}/> Vytvoriť Cenovú Ponuku</Button>
                            </div>
                            <QuotesList quotes={quotes} sites={[lead]} onCreate={() => {}} profile={profile} organization={organization} refresh={load} />
                        </div>
                    )}
                </div>
            </div>

            {showQuoteModal && (
                <QuoteBuilder 
                    onClose={() => setShowQuoteModal(false)} 
                    sites={[lead]} 
                    profile={profile} 
                    organization={organization}
                    onSave={() => { setShowQuoteModal(false); load(); }} 
                    initialSiteId={lead.id}
                />
            )}

            <ConfirmModal
                isOpen={showConvertModal}
                onClose={() => setShowConvertModal(false)}
                onConfirm={() => {
                    supabase.from('sites').update({ status: 'active', lead_stage: null }).eq('id', siteId).then(() => onConvertToProject());
                }}
                title="Začať realizáciu?"
                message="Stavba bude presunutá do zoznamu Aktívnych stavieb. Uistite sa, že máte hotovú cenovú ponuku."
                confirmText="Začať Realizáciu"
                type="primary"
            />
        </div>
    );
};

const QuoteBuilder = ({ onClose, sites, profile, organization, onSave, initialSiteId }: any) => {
    const [header, setHeader] = useState({ client_name: '', client_address: '', site_id: initialSiteId || '', issue_date: new Date().toISOString().split('T')[0], valid_until: '', has_vat: false, vat_rate: 23 });
    const [items, setTableItems] = useState([{ description: '', quantity: 1, unit: 'ks', unit_price: 0 }]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if(header.site_id) {
            const s = sites.find((x:any) => x.id === header.site_id);
            if(s) setHeader(h => ({ ...h, client_name: s.client_name || '', client_address: s.address || '' }));
        }
    }, [header.site_id]);

    const addItem = () => setTableItems([...items, { description: '', quantity: 1, unit: 'ks', unit_price: 0 }]);
    const removeItem = (idx: number) => setTableItems(items.filter((_, i) => i !== idx));
    const updateItem = (idx: number, field: string, val: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[idx][field] = val;
        setTableItems(newItems);
    };

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const vatAmount = header.has_vat ? subtotal * (header.vat_rate / 100) : 0;
    const total = subtotal + vatAmount;

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: quote, error: qErr } = await supabase.from('quotes').insert([{
                organization_id: profile.organization_id,
                site_id: header.site_id || null,
                client_name: header.client_name,
                client_address: header.client_address,
                total_amount: total,
                issue_date: header.issue_date,
                valid_until: header.valid_until || null,
                quote_number: `CP-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}` 
            }]).select().single();

            if (qErr) throw qErr;

            const itemsPayload = items.map(i => ({
                quote_id: quote.id,
                description: i.description,
                quantity: i.quantity,
                unit: i.unit,
                unit_price: i.unit_price,
                total_price: i.quantity * i.unit_price
            }));

            const { error: iErr } = await supabase.from('quote_items').insert(itemsPayload);
            if (iErr) throw iErr;

            onSave();
        } catch (e: any) {
            alert("Chyba: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Tvorba Cenovej Ponuky" onClose={onClose} maxWidth="max-w-4xl">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-4">
                        <Select label="Projekt / Dopyt" value={header.site_id} onChange={(e: any) => setHeader({...header, site_id: e.target.value})}>
                            <option value="">-- Bez projektu --</option>
                            {sites.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                        <Input label="Klient" value={header.client_name} onChange={(e: any) => setHeader({...header, client_name: e.target.value})} placeholder="Firma / Meno" />
                        <Input label="Adresa Klienta" value={header.client_address} onChange={(e: any) => setHeader({...header, client_address: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                        <Input label="Dátum vystavenia" type="date" value={header.issue_date} onChange={(e: any) => setHeader({...header, issue_date: e.target.value})} />
                        <Input label="Platnosť do" type="date" value={header.valid_until} onChange={(e: any) => setHeader({...header, valid_until: e.target.value})} />
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <input type="checkbox" id="vat" className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" checked={header.has_vat} onChange={(e) => setHeader({...header, has_vat: e.target.checked})} />
                                <label htmlFor="vat" className="font-bold text-sm text-slate-700">Pripočítať DPH</label>
                            </div>
                            {header.has_vat && (
                                <div className="flex items-center gap-2 animate-in fade-in">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Sadzba %</label>
                                    <input type="number" className="w-20 p-1 border border-slate-300 rounded text-center font-bold" value={header.vat_rate} onChange={(e) => setHeader({...header, vat_rate: parseFloat(e.target.value) || 0})} />
                                </div>
                            )}
                        </div>
                        <div className="pt-2 text-right">
                            <div className="text-xs uppercase font-bold text-slate-400">Celková suma {header.has_vat && '(s DPH)'}</div>
                            <div className="text-3xl font-bold text-slate-900 tracking-tighter">{formatMoney(total)}</div>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex justify-between items-center px-1">
                        Položky rozpočtu
                        <Button size="sm" variant="secondary" onClick={addItem}><Plus size={14}/> Pridať riadok</Button>
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                        <div className="w-full overflow-x-auto">
                           <table className="w-full text-sm text-left min-w-[700px]">
                            <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-3 pl-4">Popis</th>
                                    <th className="p-3 w-24">Množstvo</th>
                                    <th className="p-3 w-24">Jedn.</th>
                                    <th className="p-3 w-32">Cena/Jedn.</th>
                                    <th className="p-3 w-32 text-right">Spolu</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item, i) => (
                                    <tr key={i} className="group hover:bg-slate-50 transition">
                                        <td className="p-2 pl-4"><input className="w-full bg-transparent outline-none font-medium text-slate-700" placeholder="Názov položky..." value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} /></td>
                                        <td className="p-2"><input type="number" className="w-full bg-transparent outline-none text-center font-mono" value={item.quantity === 0 ? '' : item.quantity} onFocus={e => e.target.select()} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} placeholder="0" /></td>
                                        <td className="p-2"><input className="w-full bg-transparent outline-none text-center text-slate-500" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} /></td>
                                        <td className="p-2"><input type="number" className="w-full bg-transparent outline-none font-mono" value={item.unit_price === 0 ? '' : item.unit_price} onFocus={e => e.target.select()} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="0.00" /></td>
                                        <td className="p-2 text-right font-bold text-slate-800">{formatMoney(item.quantity * item.unit_price)}</td>
                                        <td className="p-2 text-right"><button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 transition active:scale-90"><Trash2 size={16}/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                           </table>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button onClick={handleSave} loading={saving} size="lg" className="shadow-orange-200"><CheckCircle2 size={18}/> Vystaviť Cenovú Ponuku</Button>
                </div>
            </div>
        </Modal>
    );
};

const QuotesList = ({ quotes, sites, onCreate, profile, organization, refresh }: any) => {
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [items, setTableItems] = useState<any[]>([]);
    const printRef = useRef<HTMLDivElement>(null);

    const handleViewQuote = async (quote: any) => {
        const { data } = await supabase.from('quote_items').select('*').eq('quote_id', quote.id);
        setTableItems(data || []);
        setSelectedQuote(quote);
    };

    const quoteSubtotal: number = selectedQuote ? (items.reduce((s: number, i: any) => s + (Number(i.quantity) * Number(i.unit_price)), 0)) : 0;
    const totalStored: number = Number(selectedQuote?.total_amount || 0);
    const diff: number = Math.max(0, totalStored - quoteSubtotal);
    const hasVat: boolean = diff > 1; 
    const vatAmount: number = diff; 

    const generatePDF = async () => {
        if (!printRef.current) return;
        try {
            const opt = { 
                margin: 0, 
                filename: `CP_${selectedQuote?.quote_number}.pdf`, 
                image: { type: 'jpeg' as const, quality: 0.98 }, 
                html2canvas: { scale: 2, useCORS: true }, 
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const } 
            };
            html2pdf().set(opt).from(printRef.current).save();
        } catch (e) {
            console.error(e);
            alert("Chyba pri generovaní PDF.");
        }
    };

    const handleDelete = async () => {
        if(!selectedQuote) return;
        await supabase.from('quotes').delete().eq('id', selectedQuote.id);
        setSelectedQuote(null);
        refresh();
    };

    return (
        <div>
            {selectedQuote ? (
                <div className="animate-in fade-in slide-in-from-right-8">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setSelectedQuote(null)} className="text-slate-500 font-bold text-sm flex items-center gap-1 hover:text-slate-900 transition"><ArrowLeft size={16}/> Späť na zoznam</button>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 size={16}/> Zmazať</Button>
                            <Button onClick={generatePDF}><Printer size={16}/> Stiahnuť PDF</Button>
                        </div>
                    </div>
                    <div className="bg-slate-500/10 p-4 md:p-8 rounded-2xl overflow-auto flex justify-center">
                        <div 
                            ref={printRef} 
                            className="bg-white text-slate-900 relative shadow-2xl mx-auto"
                            style={{ width: '210mm', minHeight: '297mm', padding: '15mm 15mm' }} 
                        >
                            <div className="flex justify-between items-start mb-10 border-b-2 border-orange-500 pb-6">
                                <div>
                                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CENOVÁ PONUKA</h1>
                                    <div className="text-slate-500 mt-2 font-medium">č. {selectedQuote.quote_number}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-xl">{organization.name}</div>
                                    <div className="text-sm text-slate-500">Dodávateľ</div>
                                </div>
                            </div>
                            <div className="flex justify-between mb-10">
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Odberateľ</div>
                                    <div className="font-bold text-lg">{selectedQuote.client_name}</div>
                                    <div className="text-slate-600 whitespace-pre-wrap w-64 leading-relaxed">{selectedQuote.client_address}</div>
                                </div>
                                <div className="text-right">
                                    <div className="mb-4">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dátum vystavenia</div>
                                        <div className="font-medium">{formatDate(selectedQuote.issue_date)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Platnosť do</div>
                                        <div className="font-medium">{formatDate(selectedQuote.valid_until)}</div>
                                    </div>
                                </div>
                            </div>
                            <table className="w-full text-sm mb-10">
                                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-3 text-left">Položka</th>
                                        <th className="p-3 text-right">Množstvo</th>
                                        <th className="p-3 text-right">Jedn. Cena</th>
                                        <th className="p-3 text-right">Spolu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, i) => (
                                        <tr key={i}>
                                            <td className="p-3 font-medium text-slate-800">{item.description}</td>
                                            <td className="p-3 text-right text-slate-600">{item.quantity} {item.unit}</td>
                                            <td className="p-3 text-right text-slate-600">{formatMoney(item.unit_price)}</td>
                                            <td className="p-3 text-right font-bold text-slate-800">{formatMoney(item.total_price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="flex justify-end">
                                <div className="w-64 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex justify-between items-center mb-2 text-slate-500 text-sm">
                                        <span>Základ dane</span>
                                        <span>{formatMoney(quoteSubtotal)}</span>
                                    </div>
                                    {hasVat && (
                                        <div className="flex justify-between items-center mb-2 text-slate-500 text-sm">
                                            <span>DPH ({Math.round(vatAmount/quoteSubtotal*100)}%)</span>
                                            <span>{formatMoney(vatAmount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-xl font-extrabold text-slate-900 border-t border-slate-200 pt-2 mt-2">
                                        <span>SPOLU</span>
                                        <span>{formatMoney(totalStored)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute bottom-12 left-12 right-12 text-center text-slate-400 text-xs border-t border-slate-100 pt-4 leading-relaxed">
                                Ďakujeme za záujem o naše služby. Tešíme sa na spoluprácu.<br/>
                                Vygenerované aplikáciou MojaStavba
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quotes?.map((q: any) => (
                        <Card key={q.id} onClick={() => handleViewQuote(q)} className="cursor-pointer group hover:border-blue-300 hover:shadow-lg transition bg-white">
                            <div className="flex justify-between items-start mb-4">
                                <div className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{q.quote_number}</div>
                                <div className="text-xs text-slate-400">{formatDate(q.issue_date)}</div>
                            </div>
                            <div className="font-bold text-lg text-slate-900 mb-1">{q.client_name || 'Neznámy klient'}</div>
                            <div className="text-sm text-slate-500 mb-4 truncate">{q.sites?.name || 'Bez priradeného projektu'}</div>
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase">Suma k úhrade</span>
                                <span className="font-bold text-slate-900 text-lg tracking-tight">{formatMoney(Number(q.total_amount))}</span>
                            </div>
                        </Card>
                    ))}
                    {(!quotes || quotes.length === 0) && <EmptyState message="Žiadne cenové ponuky pre tento dopyt." />}
                </div>
            )}
        </div>
    );
};

const LaborSummary = ({ logs }: { logs: any[] }) => {
    const summary = logs.reduce((acc: any, log: any) => {
        const name = log.profiles?.full_name || 'Neznámy';
        if (!acc[name]) acc[name] = { hours: 0, cost: 0, count: 0 };
        acc[name].hours += Number(log.hours);
        const rate = log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0;
        acc[name].cost += (Number(log.hours) * rate);
        acc[name].count += 1;
        return acc;
    }, {});

    const totalHours = Object.values(summary).reduce<number>((acc, item: any) => acc + Number(item.hours), 0);
    const totalCost = Object.values(summary).reduce<number>((acc, item: any) => acc + Number(item.cost), 0);

    return (
        <div className="bg-orange-50/50 rounded-2xl border border-orange-100 overflow-hidden mb-6 shadow-sm">
            <div className="p-4 bg-orange-100/50 border-b border-orange-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                 <h3 className="font-bold text-orange-800 flex items-center gap-2 text-sm sm:text-base"><Euro size={18}/> Finančný súhrn prác</h3>
                 <span className="text-[10px] font-black uppercase text-orange-600 bg-white px-2.5 py-1.5 rounded-xl shadow-sm border border-orange-100 whitespace-nowrap tracking-widest">
                    {Object.keys(summary).length} pracovníkov
                 </span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left min-w-[450px]">
                    <thead className="bg-orange-50 text-orange-600 font-bold border-b border-orange-100 uppercase text-[10px] tracking-wider">
                        <tr><th className="p-4">Meno</th><th className="p-4 text-right">Hodiny</th><th className="p-4 text-right">Cena Práce</th><th className="p-4 text-right">Ø Sadzba</th></tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100/50">
                        {Object.entries(summary).map(([name, data]: any) => (
                            <tr key={name} className="hover:bg-orange-100/20 transition">
                                <td className="p-4 font-bold text-slate-700">{name}</td>
                                <td className="p-4 text-right font-mono text-slate-600">{formatDuration(Number(data.hours))}</td>
                                <td className="p-4 text-right font-black text-slate-900">{formatMoney(Number(data.cost))}</td>
                                <td className="p-4 text-right text-[10px] text-slate-500 font-bold">{data.hours > 0 ? formatMoney(data.cost / data.hours) : '-'} / h</td>
                            </tr>
                        ))}
                         <tr className="bg-orange-100/40 font-black text-orange-950 border-t-2 border-orange-200">
                            <td className="p-4 text-xs sm:text-sm">CELKOVÝ SÚČET</td>
                            <td className="p-4 text-right text-sm sm:text-lg">{formatDuration(totalHours)}</td>
                            <td className="p-4 text-right text-sm sm:text-xl">{formatMoney(totalCost)}</td>
                            <td className="p-4"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const LogDetailModal = ({ log, onClose }: { log: any, onClose: () => void }) => {
    if (!log) return null;
    return (
        <Modal title="Detail Práce" onClose={onClose} maxWidth="max-w-md">
            <div className="space-y-6">
                <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Popis práce</div>
                    <p className="text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed font-medium">
                        {log.description || "Bez popisu."}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="text-xs text-blue-700 font-bold uppercase mb-1">Pracovník</div>
                        <div className="font-bold text-slate-900">{log.profiles?.full_name || 'Neznámy'}</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                        <div className="text-xs text-orange-700 font-bold uppercase mb-1">Odpracované</div>
                        <div className="font-bold text-slate-900">{formatDuration(Number(log.hours))}</div>
                    </div>
                </div>
                <div className="flex justify-center pt-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Záznam vytvorený: {new Date(log.created_at).toLocaleString('sk-SK')}</div>
                </div>
                <Button fullWidth onClick={onClose} className="shadow-sm">Zavrieť</Button>
            </div>
        </Modal>
    );
};

const ProjectDetail = ({ siteId, profile, onBack, organization }: any) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [site, setSite] = useState<any>(null);
  const [data, setData] = useState<any>({ tasks: [], transactions: [], materials: [], logs: [] });
  const [employees, setEmployees] = useState<any[]>([]); 
  const [stats, setStats] = useState<any>({ paid: 0, totalCost: 0, profit: 0, laborHours: 0, materialCost: 0 });
  const [modals, setModals] = useState({ log: false, transaction: false, export: false }); 
  const [exportSettings, setExportSettings] = useState({ type: 'client' as 'client' | 'owner', includeFinancials: false });
  const [formState, setFormState] = useState<any>({});
  const [confirmAction, setConfirmAction] = useState<{open: boolean, table: string, id: string}>({ open: false, table: '', id: '' });
  const [alert, setAlert] = useState<{open: boolean, title: string, message: string, type?: string}>({ open: false, title: '', message: '' });
  const [statusModalOpen, setStatusModalOpen] = useState(false); 
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    const [s, t, tr, m, l, emps] = await Promise.all([
      supabase.from('sites').select('*').eq('id', siteId).single(),
      supabase.from('tasks').select('*').eq('site_id', siteId).order('start_date', {ascending: true}),
      supabase.from('transactions').select('*').eq('site_id', siteId).order('date', {ascending: false}),
      supabase.from('materials').select('*').eq('site_id', siteId).order('purchase_date', {ascending: false}),
      supabase.from('attendance_logs').select('*, profiles(full_name, hourly_rate)').eq('site_id', siteId).order('date', {ascending: false}), 
      supabase.from('profiles').select('*').eq('organization_id', profile.organization_id).eq('is_active', true) 
    ]);

    if(s.data) {
      const expenses = tr.data?.filter(x => x.type === 'expense').reduce((sum, x) => sum + Number(x.amount), 0) || 0;
      const paid = tr.data?.filter(x => x.type === 'invoice' && x.is_paid).reduce((sum, x) => sum + Number(x.amount), 0) || 0;
      const matCost = m.data?.reduce((sum, x) => sum + Number(x.total_price), 0) || 0;
      const laborCost = l.data?.reduce((sum, log: any) => {
        const hours = Number(log.hours) || 0;
        const rate = log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0;
        return sum + (hours * rate);
      }, 0) || 0;

      const totalCost = expenses + matCost + laborCost;

      setSite(s.data);
      setData({ tasks: t.data, transactions: tr.data, materials: m.data, logs: l.data });
      setEmployees(emps.data || []);
      setStats({ 
        paid, 
        totalCost, 
        profit: paid - totalCost,
        laborHours: l.data?.reduce((sum, x) => sum + Number(x.hours), 0) || 0,
        materialCost: matCost,
        laborCost: laborCost
      });
    }
  };

  useEffect(() => { loadData(); }, [siteId]);

  const changeStatus = async (newStatus: string) => {
      await supabase.from('sites').update({ status: newStatus }).eq('id', siteId);
      setStatusModalOpen(false);
      loadData();
  };

  const handleExportPDF = async () => {
    setExporting(true);
    setTimeout(async () => {
        if(!printRef.current) return;
        try {
            const modeName = exportSettings.type === 'client' ? 'Export_Klient' : 'Export_Majitel';
            const opt = { 
                margin: 10, 
                filename: `${modeName}_${site.name}.pdf`, 
                image: { type: 'jpeg' as const, quality: 0.98 }, 
                html2canvas: { scale: 2, useCORS: true }, 
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const } 
            };
            await html2pdf().set(opt).from(printRef.current).save();
            setModals({...modals, export: false});
        } catch(e) {
            setAlert({ open: true, title: 'Chyba', message: "Chyba pri generovaní PDF.", type: 'error' });
        } finally {
            setExporting(false);
        }
    }, 500);
  };

  const requestDelete = (table: string, id: string) => {
      setConfirmAction({ open: true, table, id });
  };

  const performDelete = async () => {
      await supabase.from(confirmAction.table).delete().eq('id', confirmAction.id);
      setConfirmAction({ ...confirmAction, open: false });
      loadData();
  };

  const togglePaid = async (transaction: any) => {
      const newVal = !transaction.is_paid;
      const { error } = await supabase.from('transactions').update({ is_paid: newVal }).eq('id', transaction.id);
      if(error) {
          setAlert({ open: true, title: 'Chyba', message: "Chyba pri aktualizácii: " + error.message, type: 'error' });
      } else {
          loadData();
      }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const common = { site_id: siteId, organization_id: profile.organization_id };
          if (formState.type === 'material') {
              const materialPayload = {
                  ...common,
                  name: formState.description || formState.category,
                  quantity: formState.quantity,
                  unit: formState.unit,
                  unit_price: formState.unit_price,
                  total_price: formState.amount, 
                  purchase_date: formState.date,
                  supplier: formState.supplier
              };
              const { error } = await supabase.from('materials').insert([materialPayload]);
              if(error) throw error;
          } else {
              const transPayload = {
                  ...common,
                  type: formState.type, 
                  category: formState.category,
                  amount: formState.amount,
                  date: formState.date,
                  description: formState.description,
                  is_paid: formState.is_paid
              };
              const { error } = await supabase.from('transactions').insert([transPayload]);
              if(error) throw error;
          }
          setModals({...modals, transaction: false});
          setFormState({});
          loadData();
      } catch (e: any) {
          setAlert({ open: true, title: 'Chyba', message: "Chyba: " + e.message, type: 'error' });
      }
  };

  const submitForm = async (table: string, payload: any, modalName: string) => {
    try {
        let error;
        if (payload.id) {
            const { id, ...updateData } = payload;
            const res = await supabase.from(table).update(updateData).eq('id', id);
            error = res.error;
        } else {
            const res = await supabase.from(table).insert([{ ...payload, site_id: siteId, organization_id: profile.organization_id }]);
            error = res.error;
        }
        
        if(error) throw error;
        // @ts-ignore
        setModals({...modals, [modalName]: false});
        setFormState({});
        loadData();
    } catch(e: any) {
        setAlert({ open: true, title: 'Chyba', message: "Chyba: " + e.message, type: 'error' });
    }
  };

  const handleEditLog = (log: any) => {
      setFormState({
          id: log.id,
          user_id: log.user_id,
          date: log.date,
          start_time: log.start_time,
          end_time: log.end_time,
          hours: log.hours,
          hourly_rate_snapshot: log.hourly_rate_snapshot,
          description: log.description
      });
      setModals({...modals, log: true});
  };

  if(!site) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-orange-600"/></div>;

  const financeItems = [
      ...data.transactions.map((t: any) => ({...t, itemType: 'transaction'})),
      ...data.materials.map((m: any) => ({
          ...m, 
          itemType: 'material', 
          date: m.purchase_date, 
          amount: m.total_price, 
          category: 'Materiál',
          description: `${m.name} (${m.quantity} ${m.unit})`,
          type: 'expense',
          is_paid: true 
      }))
  ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition"><ArrowLeft size={14}/> Späť</button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setModals({...modals, export: true})}><FileDown size={16}/> Stiahnuť PDF</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-start gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2 leading-tight">{site.name}</h1>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 font-medium"><MapPin size={14} className="text-orange-500"/> {site.address}</span>
            {site.client_name && <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 font-medium"><User size={14} className="text-blue-500"/> {site.client_name}</span>}
            <button onClick={() => setStatusModalOpen(true)} className="flex items-center gap-1 group hover:opacity-80 transition active:scale-95">
                <Badge status={site.status} />
                <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600"/>
            </button>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-slate-100 min-w-[220px] relative overflow-hidden group">
          <div className={`absolute left-0 top-0 bottom-0 w-2 ${stats.profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div className="pl-2">
              <div className="text-[10px] uppercase text-slate-400 font-black tracking-widest mb-1 flex items-center gap-2">
                <Activity size={12} className={stats.profit >= 0 ? 'text-green-500' : 'text-red-500'}/>
                Priebežný Zisk
              </div>
              <div className={`text-2xl font-black ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'} tracking-tighter`}>
                {formatMoney(stats.profit)}
              </div>
          </div>
          <div className={`absolute right-[-20px] bottom-[-20px] opacity-[0.03] group-hover:scale-110 transition-transform duration-700 ${stats.profit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
             <TrendingUp size={100} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
          {[
            { id: 'overview', label: 'Prehľad', icon: BarChart3 },
            { id: 'labor', label: 'Dochádzka', icon: HardHat },
            { id: 'finance', label: 'Financie', icon: Euro },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 text-[11px] font-black uppercase tracking-widest text-center rounded-2xl transition whitespace-nowrap flex items-center justify-center gap-2 ${
                activeTab === tab.id ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={16} className={activeTab === tab.id ? "text-orange-600" : "text-slate-400"} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-8 flex-1">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
              <Card className="bg-white border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-orange-500"/> Finančný Rozbor</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-100">
                    <span className="font-bold text-green-800 text-xs uppercase tracking-wider">Príjmy (Platby)</span>
                    <span className="font-black text-green-700 text-xl">+{formatMoney(stats.paid)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                    <span className="font-bold text-red-800 text-xs uppercase tracking-wider">Materiál & Iné</span>
                    <span className="font-black text-red-700 text-xl">-{formatMoney(stats.totalCost - stats.laborCost)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                    <span className="font-bold text-red-800 text-xs uppercase tracking-wider">Práca (Mzdy)</span>
                    <span className="font-black text-red-700 text-xl">-{formatMoney(stats.laborCost)}</span>
                  </div>
                  <div className="border-t-2 border-dashed border-slate-100 my-4 pt-6">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <span className="font-black text-slate-600 uppercase text-[10px] tracking-widest">Celkový profit</span>
                      <span className={`font-black text-3xl tracking-tighter ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(stats.profit)}</span>
                    </div>
                  </div>
                </div>
              </Card>
              <Card className="bg-white border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2"><Package size={20} className="text-orange-500"/> Rozpočet</h3>
                <div className="flex justify-between text-[11px] mb-3 text-slate-500 font-black uppercase tracking-widest">
                  <span>Aktuálne: {formatMoney(stats.totalCost)}</span>
                  <span>Limit: {formatMoney(site.budget)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden mb-8 border border-slate-200 shadow-inner p-1">
                  <div className={`${stats.totalCost > site.budget ? 'bg-red-500' : 'bg-orange-500'} h-full rounded-full transition-all duration-1000 shadow-sm`} style={{ width: `${Math.min(100, (stats.totalCost / site.budget) * 100)}%` }}></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-[10px] uppercase text-slate-400 font-black mb-1">Hodiny</div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">{formatDuration(stats.laborHours)}</div>
                  </div>
                  <div className="text-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-[10px] uppercase text-slate-400 font-black mb-1">Materiál</div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">{formatMoney(stats.materialCost)}</div>
                  </div>
                </div>
                <div className="mt-8 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                    <Info size={18} className="text-blue-500 shrink-0 mt-0.5"/>
                    <p className="text-xs text-blue-700 leading-relaxed font-medium">Profit je počítaný z reálne prijatých platieb (Uhradené) mínus všetky náklady na materiál a prácu (vrátane nevyplatených miezd).</p>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="animate-in fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="font-extrabold text-xl text-slate-900">História platieb a nákladov</h3>
                <Button onClick={() => { 
                    setFormState({ 
                        type: 'expense', 
                        date: new Date().toISOString().split('T')[0], 
                        is_material: false, 
                        is_paid: false, 
                        unit: 'ks', 
                        quantity: 1
                    }); 
                    setModals({...modals, transaction: true}); 
                }}><Plus size={18}/> Pridať pohyb</Button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[700px]">
                      <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest border-b border-slate-200">
                        <tr><th className="p-4">Dátum</th><th className="p-4">Položka</th><th className="p-4 text-right">Suma</th><th className="p-4 text-center">Stav</th><th className="p-4"></th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {financeItems.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50 transition">
                            <td className="p-4 font-mono text-slate-400 text-xs whitespace-nowrap">{formatDate(t.date)}</td>
                            <td className="p-4">
                                <div className="font-bold flex items-center gap-2 text-slate-700">
                                    {t.itemType === 'material' && <div className="p-1.5 bg-orange-100 text-orange-600 rounded-md"><Package size={14}/></div>}
                                    {t.itemType === 'transaction' && t.type === 'invoice' && <div className="p-1.5 bg-green-100 text-green-600 rounded-md"><Euro size={14}/></div>}
                                    {t.itemType === 'transaction' && t.type === 'expense' && <div className="p-1.5 bg-red-100 text-red-600 rounded-md"><Euro size={14}/></div>}
                                    <div>
                                        <span>{t.category}</span>
                                        <div className="text-[10px] text-slate-400 font-medium">{t.description}</div>
                                    </div>
                                </div>
                            </td>
                            <td className={`p-4 text-right font-black text-base tracking-tight ${t.type === 'invoice' ? 'text-green-600' : 'text-red-600'}`}>
                              {t.type === 'invoice' ? '+' : '-'}{formatMoney(t.amount)}
                            </td>
                            <td className="p-4 text-center">
                              {t.itemType === 'transaction' ? (
                                  <button 
                                    onClick={() => togglePaid(t)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border cursor-pointer hover:opacity-80 transition shadow-sm ${t.is_paid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                                  >
                                    {t.is_paid ? 'Uhradené' : 'Čaká'}
                                  </button>
                              ) : (
                                  <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border bg-slate-50 text-slate-500 border-slate-200 tracking-wider">Materiál</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                                <button onClick={() => requestDelete(t.itemType === 'material' ? 'materials' : 'transactions', t.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition active:scale-[0.90]"><Trash2 size={16}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
                {financeItems.length === 0 && <div className="p-12 text-center text-slate-400 italic">Zatiaľ neboli zaevidované žiadne finančné pohyby.</div>}
              </div>
            </div>
          )}

          {activeTab === 'labor' && (
            <div className="animate-in fade-in">
              <LaborSummary logs={data.logs} />
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-extrabold text-xl text-slate-900">Denník prác (História)</h3>
                <button 
                  onClick={() => { setFormState({ date: new Date().toISOString().split('T')[0], start_time: '07:00', end_time: '15:30' }); setModals({...modals, log: true}); }}
                  className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-900 transition font-bold text-sm shadow-sm"
                >
                  <Clock size={16}/> Zapísať dochádzku
                </button>
              </div>
              <div className="space-y-4">
                  {data.logs.map((l: any) => (
                      <div 
                        key={l.id} 
                        onClick={() => setSelectedLog(l)}
                        className="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center cursor-pointer hover:border-orange-300 hover:shadow-md transition active:scale-[0.98] group shadow-sm"
                      >
                          <div className="min-w-0 flex-1">
                              <div className="font-black text-slate-900 flex items-center gap-2 group-hover:text-orange-600 transition">
                                <User size={14} className="text-orange-500"/>
                                {l.profiles?.full_name || 'Neznámy'}
                              </div>
                              <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-2 font-medium">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black uppercase text-slate-500 tracking-tighter">{formatDate(l.date)}</span>
                                  {l.description && <span className="italic truncate max-w-[200px] text-slate-400">"{l.description}"</span>}
                              </div>
                              <div className="text-[10px] font-bold text-slate-400 font-mono mt-2 flex items-center gap-1.5">
                                <Clock size={12} className="text-slate-300"/>
                                {l.start_time || '--:--'} - {l.end_time || '--:--'} • Cena práce: <span className="text-slate-600 font-black">{formatMoney(Number(l.hours) * (l.hourly_rate_snapshot || l.profiles?.hourly_rate || 0))}</span>
                              </div>
                          </div>
                          <div className="text-right flex items-center gap-4 ml-6">
                              <div className="font-black text-slate-900 text-2xl tracking-tighter">{formatDuration(Number(l.hours))}</div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleEditLog(l); }} className="p-3 text-blue-500 hover:bg-blue-50 rounded-xl transition active:scale-[0.90]"><Pencil size={18}/></button>
                                <button onClick={(e) => { e.stopPropagation(); requestDelete('attendance_logs', l.id); }} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition active:scale-[0.90]"><Trash2 size={18}/></button>
                              </div>
                          </div>
                      </div>
                  ))}
                  {data.logs.length === 0 && <div className="text-center py-16 text-slate-400 italic bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">Zatiaľ žiadne záznamy v denníku prác pre tento projekt.</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={confirmAction.open} onClose={() => setConfirmAction({...confirmAction, open: false})} onConfirm={performDelete} title="Odstrániť položku?" message="Táto akcia je nevratná." type="danger" />
      <AlertModal isOpen={alert.open} onClose={() => setAlert({...alert, open: false})} title={alert.title} message={alert.message} type={alert.type as any} />
      
      {statusModalOpen && (
          <Modal title="Zmeniť Status" onClose={() => setStatusModalOpen(false)}>
              <div className="grid gap-3">
                  {[
                      { val: 'lead', label: 'Dopyt (Lead)', desc: 'Potenciálny zákazník v štádiu rokovania.' },
                      { val: 'active', label: 'Aktívna', desc: 'Stavba je spustená a prebiehajú práce.' },
                      { val: 'planning', label: 'V príprave', desc: 'Schválené, čaká sa na začatie.' },
                      { val: 'paused', label: 'Pozastavená', desc: 'Dočasne zastavené práce.' },
                      { val: 'completed', label: 'Dokončená', desc: 'Uzatvorený a odovzdaný projekt.' }
                  ].map(s => (
                      <button 
                        key={s.val} 
                        onClick={() => changeStatus(s.val)} 
                        className={`p-4 rounded-2xl border-2 flex items-center justify-between group transition text-left ${site.status === s.val ? 'border-slate-800 bg-slate-50 shadow-sm' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                          <div>
                              <span className={`text-sm font-black uppercase tracking-wider ${site.status === s.val ? 'text-slate-900' : 'text-slate-600'}`}>{s.label}</span>
                              <div className="text-xs text-slate-500 mt-1 font-medium">{s.desc}</div>
                          </div>
                          {site.status === s.val && <div className="bg-slate-900 text-white p-1 rounded-full"><Check size={16}/></div>}
                      </button>
                  ))}
              </div>
          </Modal>
      )}

      {modals.log && (
        <Modal title={formState.id ? "Upraviť záznam" : "Zapísať dochádzku"} onClose={() => { setModals({...modals, log: false}); setFormState({}); }}>
          <form onSubmit={(e) => { 
              e.preventDefault(); 
              const calculatedHours = calculateSmartHours(formState.start_time, formState.end_time);
              const payload = { ...formState, hours: calculatedHours }; 
              submitForm('attendance_logs', payload, 'log'); 
          }}>
            <Select 
                label="Pracovník" 
                value={formState.user_id || ''} 
                disabled={!!formState.id}
                onChange={(e: any) => {
                    const emp = employees.find(ep => ep.id === e.target.value);
                    setFormState({...formState, user_id: e.target.value, hourly_rate_snapshot: emp?.hourly_rate || 0});
                }} 
                required
            >
                <option value="">-- Vyberte pracovníka --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Dátum" type="date" value={formState.date || ''} onChange={(e: any) => setFormState({...formState, date: e.target.value})} required />
                <div className="grid grid-cols-2 gap-2">
                    <Input label="Čas od" type="time" value={formState.start_time || ''} onChange={(e: any) => setFormState({...formState, start_time: e.target.value})} required />
                    <Input label="Čas do" type="time" value={formState.end_time || ''} onChange={(e: any) => setFormState({...formState, end_time: e.target.value})} required />
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col justify-center shadow-inner">
                    <span className="text-[10px] font-black text-orange-400 uppercase block mb-1 tracking-widest">Trvanie prác</span>
                    <span className="text-2xl font-black text-slate-800 tracking-tight">{formatDuration(calculateSmartHours(formState.start_time, formState.end_time))}</span>
                </div>
                <Input 
                    label="Hodinová Sadzba (€/hod)" 
                    type="number" 
                    step="0.01" 
                    value={formState.hourly_rate_snapshot || 0} 
                    onFocus={(e:any) => e.target.select()}
                    onChange={(e: any) => setFormState({...formState, hourly_rate_snapshot: parseFloat(e.target.value) || 0})} 
                    required 
                />
            </div>

            <Input label="Popis činnosti" value={formState.description || ''} onChange={(e: any) => setFormState({...formState, description: e.target.value})} placeholder="Napr. Obkladanie kúpeľne, 2. poschodie" />
            
            <Button type="submit" fullWidth size="lg" className="mt-6 shadow-orange-200">{formState.id ? 'Uložiť zmeny' : 'Zapísať hodiny'}</Button>
          </form>
        </Modal>
      )}

      {modals.transaction && (
        <Modal title="Záznam o pohybe financií" onClose={() => setModals({...modals, transaction: false})}>
          <form onSubmit={handleSaveTransaction} className="space-y-5">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-2">
              <button type="button" onClick={() => setFormState({...formState, type: 'expense', is_material: false})} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition ${formState.type === 'expense' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}>Výdavok / Nákup</button>
              <button type="button" onClick={() => setFormState({...formState, type: 'invoice', is_material: false})} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition ${formState.type === 'invoice' ? 'bg-white shadow-sm text-green-600' : 'text-slate-500'}`}>Príjem / Platba</button>
            </div>
            
            {formState.type === 'expense' && (
                <div className="flex items-center gap-2 mb-2 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                    <input type="checkbox" id="is_material" checked={formState.is_material || false} onChange={(e) => setFormState({...formState, is_material: e.target.checked, type: 'material'})} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" />
                    <label htmlFor="is_material" className="text-sm font-black text-slate-800 flex items-center gap-2 cursor-pointer"><Package size={18}/> Je to nákup materiálu?</label>
                </div>
            )}

            {formState.is_material ? (
                <>
                    <Input label="Názov materiálu" value={formState.description || ''} onChange={(e: any) => setFormState({...formState, description: e.target.value, category: 'Materiál'})} required autoFocus placeholder="Napr. Cement 25kg, SDK Profily..." />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Množstvo" type="number" step="0.01" value={formState.quantity} onFocus={(e:any) => e.target.select()} onChange={(e: any) => setFormState({...formState, quantity: parseFloat(e.target.value), amount: (parseFloat(e.target.value) * (formState.unit_price || 0)) })} required />
                        <Select label="Jednotka" value={formState.unit} onChange={(e: any) => setFormState({...formState, unit: e.target.value})}>
                            {['ks', 'm', 'm2', 'm3', 'kg', 't', 'l', 'bal', 'paleta', 'hod'].map(u => <option key={u} value={u}>{u}</option>)}
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Cena za jednotku €" type="number" step="0.01" value={formState.unit_price || ''} onFocus={(e:any) => e.target.select()} onChange={(e: any) => setFormState({...formState, unit_price: parseFloat(e.target.value), amount: (parseFloat(e.target.value) * (formState.quantity || 0)) })} required />
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Spolu €</label>
                            <div className="p-3 bg-slate-100 rounded-xl text-slate-700 font-black text-lg border border-slate-200">{formatMoney(formState.amount)}</div>
                        </div>
                    </div>
                    <Input label="Dodávateľ" value={formState.supplier || ''} onChange={(e: any) => setFormState({...formState, supplier: e.target.value})} placeholder="Názov obchodu / dodávateľa" />
                </>
            ) : (
                <>
                    <Input label="Kategória / Hlavný popis" value={formState.category || ''} onChange={(e: any) => setFormState({...formState, category: e.target.value})} required autoFocus placeholder="Napr. Zálohová platba, Odvoz odpadu..." />
                    <Input label="Celková Suma €" type="number" step="0.01" value={formState.amount || ''} onFocus={(e:any) => e.target.select()} onChange={(e: any) => setFormState({...formState, amount: parseFloat(e.target.value)})} required />
                    <Input label="Detailná poznámka (Voliteľné)" value={formState.description || ''} onChange={(e: any) => setFormState({...formState, description: e.target.value})} />
                </>
            )}
            
            <Input label="Dátum transakcie" type="date" value={formState.date || ''} onChange={(e: any) => setFormState({...formState, date: e.target.value})} required />
            <Button type="submit" fullWidth className="mt-4 shadow-sm" size="lg">Uložiť záznam</Button>
          </form>
        </Modal>
      )}

      {modals.export && (
          <Modal title="Export do PDF" onClose={() => setModals({...modals, export: false})} maxWidth="max-w-md">
              <div className="space-y-6">
                  <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Vyberte typ exportu</label>
                      <div className="grid grid-cols-1 gap-2">
                          <button 
                            onClick={() => setExportSettings({...exportSettings, type: 'client'})}
                            className={`p-4 rounded-xl border-2 flex items-center justify-between text-left transition ${exportSettings.type === 'client' ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-200'}`}
                          >
                              <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-2"><User size={16} className="text-blue-500"/> Pre klienta</div>
                                  <div className="text-[10px] text-slate-500 font-medium">Prehľad prác a postupu (anonymný zoznam)</div>
                              </div>
                              {exportSettings.type === 'client' && <CheckCircle2 size={20} className="text-orange-500" />}
                          </button>
                          <button 
                            onClick={() => setExportSettings({...exportSettings, type: 'owner'})}
                            className={`p-4 rounded-xl border-2 flex items-center justify-between text-left transition ${exportSettings.type === 'owner' ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-200'}`}
                          >
                              <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-2"><ShieldCheck size={16} className="text-orange-600"/> Pre majiteľa</div>
                                  <div className="text-[10px] text-slate-500 font-medium">Kompletný výkaz vrátane mzdových nákladov</div>
                              </div>
                              {exportSettings.type === 'owner' && <CheckCircle2 size={20} className="text-orange-500" />}
                          </button>
                      </div>
                  </div>

                  {exportSettings.type === 'client' && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                          <label className="flex items-center gap-3 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                checked={exportSettings.includeFinancials} 
                                onChange={e => setExportSettings({...exportSettings, includeFinancials: e.target.checked})} 
                                className="w-5 h-5 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                              />
                              <div className="flex-1">
                                  <div className="text-sm font-bold text-slate-700">Zahrnúť finančné info</div>
                                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Náklady na materiál a celkový rozpočet</div>
                              </div>
                          </label>
                      </div>
                  )}

                  <div className="pt-4 flex flex-col gap-2">
                      <Button fullWidth size="lg" onClick={handleExportPDF} loading={exporting}>
                          <Printer size={18}/> Generovať PDF
                      </Button>
                      <Button variant="outline" fullWidth onClick={() => setModals({...modals, export: false})}>Zrušiť</Button>
                  </div>
              </div>
          </Modal>
      )}

      <div className="fixed left-[-9999px]">
          <div ref={printRef} className="w-[190mm] bg-white p-12 text-slate-900 font-sans text-sm leading-normal relative box-border text-left">
              <div className="absolute top-4 right-4 text-[10px] text-slate-400">Vygenerované cez MojaStavba • {new Date().toLocaleDateString('sk-SK')}</div>
              
              <div className="flex justify-between items-start mb-10 border-b-2 border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-widest text-slate-800">{exportSettings.type === 'client' ? 'Výkaz prác pre klienta' : 'Kompletný projektový výkaz'}</h1>
                    <div className="text-orange-600 mt-2 font-bold text-lg">{site.name}</div>
                    <div className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">{site.address}</div>
                </div>
                <div className="text-right">
                    <div className="font-black text-xl text-slate-800">{organization.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Zhotoviteľ</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-10">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Odberateľ / Klient</div>
                      <div className="text-xl font-extrabold text-slate-800">{site.client_name || 'Nezadaný'}</div>
                  </div>
                  {(exportSettings.type === 'owner' || exportSettings.includeFinancials) && (
                      <div className="bg-orange-50 p-5 rounded-2xl text-right border border-orange-100">
                        <div className="text-[10px] font-black text-orange-800/50 uppercase tracking-widest mb-1">Aktuálna bilancia</div>
                        <div className={`text-3xl font-black ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatMoney(stats.profit)}
                        </div>
                      </div>
                  )}
              </div>

              <div className="mb-10">
                  <div className="font-black uppercase text-xs border-b border-slate-200 mb-4 pb-2 flex items-center gap-2 text-slate-800">
                      <ClipboardList size={14} className="text-orange-600"/> Denník realizovaných prác
                  </div>
                  <table className="w-full text-xs border-collapse">
                      <thead>
                          <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider">
                              <th className="border border-slate-200 p-2 text-left w-[30mm]">Dátum</th>
                              <th className="border border-slate-200 p-2 text-left">Popis činnosti</th>
                              <th className="border border-slate-200 p-2 text-right w-[20mm]">Rozsah</th>
                          </tr>
                      </thead>
                      <tbody>
                          {data.logs.map((log: any, idx: number) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                  <td className="border border-slate-200 p-2 align-top font-bold text-slate-700">{formatDate(log.date)}</td>
                                  <td className="border border-slate-200 p-2 align-top italic text-slate-600">
                                      {log.description || '(Bez popisu prác)'}
                                  </td>
                                  <td className="border border-slate-200 p-2 align-top text-right font-bold text-slate-800">{formatDuration(Number(log.hours))}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {(exportSettings.type === 'owner' || exportSettings.includeFinancials) && (
                  <div className="mb-10">
                      <div className="font-black uppercase text-xs border-b border-slate-200 mb-4 pb-2 flex items-center gap-2 text-slate-800">
                          <Package size={14} className="text-orange-600"/> Súpis materiálu a nákupov
                      </div>
                      <table className="w-full text-xs border-collapse">
                          <thead>
                              <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider">
                                  <th className="border border-slate-200 p-2 text-left w-[30mm]">Dátum</th>
                                  <th className="border border-slate-200 p-2 text-left">Položka</th>
                                  <th className="border border-slate-200 p-2 text-right w-[20mm]">Množstvo</th>
                                  <th className="border border-slate-200 p-2 text-right w-[30mm]">Suma</th>
                              </tr>
                          </thead>
                          <tbody>
                              {data.materials.map((m: any, idx: number) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                      <td className="border border-slate-200 p-2 align-top">{formatDate(m.purchase_date)}</td>
                                      <td className="border border-slate-200 p-2 align-top font-medium">{m.name}</td>
                                      <td className="border border-slate-200 p-2 align-top text-right">{m.quantity} {m.unit}</td>
                                      <td className="border border-slate-200 p-2 align-top text-right font-bold">{formatMoney(m.total_price)}</td>
                                  </tr>
                              ))}
                          </tbody>
                          <tfoot>
                              <tr className="bg-slate-50 font-black text-slate-800">
                                  <td colSpan={3} className="border border-slate-200 p-2 text-right uppercase text-[9px]">Súčet materiálov</td>
                                  <td className="border border-slate-200 p-2 text-right">{formatMoney(stats.materialCost)}</td>
                              </tr>
                          </tfoot>
                      </table>
                  </div>
              )}

              {exportSettings.type === 'owner' && (
                  <div className="mb-10">
                      <div className="font-black uppercase text-xs border-b border-slate-200 mb-4 pb-2 flex items-center gap-2 text-slate-800">
                          <HardHat size={14} className="text-orange-600"/> Detail mzdových nákladov
                      </div>
                      <table className="w-full text-xs border-collapse">
                          <thead>
                              <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider">
                                  <th className="border border-slate-200 p-2 text-left">Pracovník</th>
                                  <th className="border border-slate-200 p-2 text-right">Hodiny</th>
                                  <th className="border border-slate-200 p-2 text-right">Mzda celkom</th>
                              </tr>
                          </thead>
                          <tbody>
                              {Object.entries(data.logs.reduce((acc: any, log: any) => {
                                  const name = log.profiles?.full_name || 'Neznámy';
                                  if (!acc[name]) acc[name] = { h: 0, c: 0 };
                                  acc[name].h += Number(log.hours);
                                  acc[name].c += Number(log.hours) * (log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0);
                                  return acc;
                              }, {})).map(([name, stats]: any, idx: number) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                      <td className="border border-slate-200 p-2 align-top font-bold text-slate-800">{name}</td>
                                      <td className="border border-slate-200 p-2 align-top text-right">{formatDuration(stats.h)}</td>
                                      <td className="border border-slate-200 p-2 align-top text-right font-black text-slate-900">{formatMoney(stats.c)}</td>
                                  </tr>
                              ))}
                          </tbody>
                          <tfoot>
                              <tr className="bg-slate-100 font-black text-slate-800">
                                  <td className="border border-slate-200 p-3 text-right uppercase text-[10px]">Celkové mzdy</td>
                                  <td className="border border-slate-200 p-3 text-right">{formatDuration(stats.laborHours)}</td>
                                  <td className="border border-slate-200 p-3 text-right">{formatMoney(stats.laborCost)}</td>
                              </tr>
                          </tfoot>
                      </table>
                  </div>
              )}

              {exportSettings.type === 'owner' && (
                   <div className="mb-10">
                      <div className="font-black uppercase text-xs border-b border-slate-200 mb-4 pb-2 flex items-center gap-2 text-slate-800">
                          <Euro size={14} className="text-orange-600"/> Prehľad platieb a výdavkov
                      </div>
                      <table className="w-full text-[10px] border-collapse">
                          <thead>
                              <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-wider">
                                  <th className="border border-slate-200 p-2 text-left w-[25mm]">Dátum</th>
                                  <th className="border border-slate-200 p-2 text-left">Kategória / Popis</th>
                                  <th className="border border-slate-200 p-2 text-right w-[30mm]">Suma</th>
                                  <th className="border border-slate-200 p-2 text-center w-[20mm]">Stav</th>
                              </tr>
                          </thead>
                          <tbody>
                              {data.transactions.map((t: any, idx: number) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                      <td className="border border-slate-200 p-2">{formatDate(t.date)}</td>
                                      <td className="border border-slate-200 p-2 font-medium">{t.category} <span className="text-slate-400 font-normal">({t.description})</span></td>
                                      <td className={`border border-slate-200 p-2 text-right font-black ${t.type === 'invoice' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'invoice' ? '+' : '-'}{formatMoney(t.amount)}</td>
                                      <td className="border border-slate-200 p-2 text-center text-[8px] uppercase font-bold">{t.is_paid ? 'Uhradené' : 'Čaká'}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}

              {(exportSettings.type === 'owner' || exportSettings.includeFinancials) && (
                  <div className="bg-slate-50 p-6 rounded-2xl mb-10 border border-slate-200">
                      <div className="text-[10px] font-black uppercase tracking-widest mb-4 border-b border-slate-200 pb-2 text-slate-400">Záverečná finančná rekapitulácia</div>
                      <div className="grid grid-cols-3 gap-8">
                          <div>
                              <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Príjmy projektu</div>
                              <div className="text-xl font-black text-green-600">{formatMoney(stats.paid)}</div>
                          </div>
                          <div>
                              <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Náklady spolu</div>
                              <div className="text-xl font-black text-red-600">-{formatMoney(stats.totalCost)}</div>
                          </div>
                          <div className="text-right">
                              <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Celková bilancia</div>
                              <div className={`text-2xl font-black ${stats.profit >= 0 ? 'text-slate-800' : 'text-red-700'}`}>{formatMoney(stats.profit)}</div>
                          </div>
                      </div>
                  </div>
              )}

              <div className="mt-20 grid grid-cols-2 gap-20">
                  <div className="text-center">
                      <div className="h-16 border-b-2 border-slate-100 mb-2"></div>
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Podpis Preberajúceho</div>
                  </div>
                  <div className="text-center relative">
                    <div className="h-16 border-b-2 border-slate-100 mb-2 flex items-center justify-center">
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

              <div className="mt-24 text-center text-[9px] text-slate-300 font-bold uppercase border-t border-slate-100 pt-4 tracking-[0.2em]">
                  Tento dokument má informatívny charakter
              </div>
          </div>
      </div>

      {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
};
