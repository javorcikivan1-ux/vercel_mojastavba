
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Input, Badge, ConfirmModal, AlertModal, Select } from '../components/UI';
// Added AlertCircle to fix line 276 error
import { UserPlus, Mail, Coins, Phone, ArrowLeft, Calendar, Building2, Banknote, Trash2, Archive, CheckCircle2, Users, Pencil, RefreshCcw, Link, Copy, ChevronDown, ChevronRight, Clock, MapPin, Send, Zap, Info, Smartphone, Monitor, Wallet, Loader2, Filter, FileText, Search, Briefcase, Eye, EyeOff, Share2, ClipboardCheck, Hash, Calculator, Save, Shield, AlertCircle } from 'lucide-react';
import { formatMoney, formatDate, formatDuration } from '../lib/utils';
import { Capacitor } from '@capacitor/core';
import { PLANS } from './Subscription';

const TEAM_PAGE_SIZE = 15;

export const TeamScreen = ({ profile }: any) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  if (selectedEmpId) {
    return <EmployeeDetail empId={selectedEmpId} profile={profile} onBack={() => setSelectedEmpId(null)} />;
  }
  return <TeamList profile={profile} onSelect={setSelectedEmpId} />;
};

const TeamList = ({ profile, onSelect }: any) => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ 
    email: '', 
    fullName: '', 
    rate: 0, 
    costRate: 0,
    phone: '', 
    is_active: true, 
    job_title: 'zamestnanec',
    show_wage_in_profile: true 
  });
  
  const [confirm, setConfirm] = useState<{open: boolean, action: string, id: string, name?: string}>({ open: false, action: '', id: '' });
  const [alert, setAlert] = useState<{open: boolean, message: string, title?: string}>({ open: false, message: '' });
  const [linkCopied, setLinkCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  // Získame aktuálnu organizáciu pre limity
  const [org, setOrg] = useState<any>(null);

  useEffect(() => {
    const fetchOrg = async () => {
        const { data } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single();
        if(data) setOrg(data);
    };
    fetchOrg();
  }, [profile.organization_id]);

  useEffect(() => {
    const timer = setTimeout(() => {
        setPage(0);
        load(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showArchived]);

  useEffect(() => {
    if (page > 0) load(false);
  }, [page]);

  const load = async (reset = false) => {
    if (reset) {
        setLoading(true);
        setWorkers([]);
    } else {
        setLoadingMore(true);
    }

    try {
        let query = supabase.from('profiles')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .eq('is_active', !showArchived);

        if (searchQuery) {
            query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }

        const from = reset ? 0 : page * TEAM_PAGE_SIZE;
        const to = from + TEAM_PAGE_SIZE - 1;

        const { data: workerData, error } = await query
            .order('full_name', { ascending: true })
            .range(from, to);

        if (error) throw error;
        if (workerData) {
            setWorkers(prev => reset ? workerData : [...prev, ...workerData]);
            setHasMore(workerData.length === TEAM_PAGE_SIZE);
        }
    } catch (e: any) {
        console.error(e);
    } finally {
        setLoading(false);
        setLoadingMore(false);
    }
  };

  // Vypočítame koľko zamestnancov firma má
  const currentEmployeeCount = useMemo(() => {
      // Tu by bolo ideálne reálne query, ale pre UI check stačí momentálne workers ak sú načítaní
      // Avšak load() stránkuje, tak skúsime headcount bez stránkovania
      return workers.filter(w => w.role === 'employee' && w.is_active).length;
  }, [workers]);

  const activePlan = useMemo(() => {
      const planId = org?.subscription_plan || 'base';
      return PLANS.find(p => p.id === planId) || PLANS[0];
  }, [org]);

  const isLimitReached = org && currentEmployeeCount >= activePlan.limit;

  const handleEdit = (worker: any, e: any) => {
      e.stopPropagation();
      setEditingWorker(worker);
      
      const displayJobTitle = worker.role === 'admin' ? 'Administrátor' : (worker.job_title || 'zamestnanec');
      
      setFormData({ 
          email: worker.email, 
          fullName: worker.full_name, 
          rate: worker.hourly_rate || 0, 
          costRate: worker.cost_rate || worker.hourly_rate || 0,
          phone: worker.phone,
          is_active: worker.is_active,
          job_title: displayJobTitle,
          show_wage_in_profile: worker.show_wage_in_profile ?? true
      });
      setShowModal(true);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check limit only for new additions
    if (!editingWorker && isLimitReached) {
        setAlert({ 
            open: true, 
            title: 'Limit balíka dosiahnutý', 
            message: `Váš balík ${activePlan.name} povoľuje max. ${activePlan.limit} zamestnancov. Pre pridanie ďalších členov si prosím navýšte balík v sekcii Predplatné.` 
        });
        return;
    }

    try {
        let error;
        if (editingWorker) {
             const payload: any = {
                full_name: formData.fullName,
                email: formData.email,
                hourly_rate: formData.rate,
                cost_rate: formData.costRate,
                phone: formData.phone,
                is_active: formData.is_active,
                job_title: formData.job_title,
                show_wage_in_profile: formData.show_wage_in_profile
             };
             
             if (editingWorker.role === 'admin') {
                 payload.job_title = 'Administrátor';
             }

             const { error: err } = await supabase.from('profiles').update(payload).eq('id', editingWorker.id);
             error = err;
        } else {
            const newId = crypto.randomUUID();
            const { error: err } = await supabase.from('profiles').insert([{
              id: newId, 
              email: formData.email || `worker-${Date.now()}@local.app`, 
              full_name: formData.fullName, 
              role: 'employee', 
              organization_id: profile.organization_id, 
              hourly_rate: formData.rate, 
              cost_rate: formData.costRate || formData.rate,
              phone: formData.phone,
              is_active: true,
              job_title: formData.job_title || 'zamestnanec',
              show_wage_in_profile: formData.show_wage_in_profile
            }]);
            error = err;
        }

        if (error) throw error;
        
        setShowModal(false);
        setPage(0);
        load(true);
    } catch(err: any) {
        setAlert({ open: true, message: "Chyba: " + err.message });
    }
  };

  const handleConfirmAction = async () => {
      if (confirm.action === 'archive') {
          await supabase.from('profiles').update({ is_active: false }).eq('id', confirm.id);
      } else if (confirm.action === 'restore') {
          await supabase.from('profiles').update({ is_active: true }).eq('id', confirm.id);
      } else if (confirm.action === 'delete') {
          await supabase.from('profiles').delete().eq('id', confirm.id);
      }
      setConfirm({ ...confirm, open: false });
      setPage(0);
      load(true);
  };

  const toggleArchive = (worker: any, e: any) => {
      e.stopPropagation();
      setConfirm({ 
          open: true, 
          action: worker.is_active ? 'archive' : 'restore', 
          id: worker.id,
          name: worker.full_name
      });
  };

  const handleDelete = (id: string, e: any) => {
      e.stopPropagation();
      setConfirm({ open: true, action: 'delete', id });
  }

  const copyInviteLink = () => {
      const inviteUrl = `https://www.moja-stavba.sk/?action=register-emp&companyId=${profile.organization_id}`;
      navigator.clipboard.writeText(inviteUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
  };

  const copyCompanyId = () => {
      navigator.clipboard.writeText(profile.organization_id);
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
  };

  const handleLoadMore = () => {
      setPage(p => p + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="text-orange-600" size={32} />
              Tím a Zamestnanci
           </h2>
           <p className="text-sm text-slate-500 mt-1 font-medium">Správa pracovníkov a prehľad výkonov</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Button variant="secondary" onClick={() => setShowArchived(!showArchived)} fullWidth className="sm:w-auto justify-center order-2 sm:order-1">
                {showArchived ? 'Späť na aktívnych' : 'Zobraziť Archív'}
            </Button>
            <Button 
                onClick={() => setShowInviteModal(true)} 
                fullWidth 
                className={`sm:w-auto justify-center order-1 sm:order-2 shadow-lg ${isLimitReached ? 'grayscale opacity-50' : 'shadow-orange-100'}`}
            >
                <UserPlus size={18}/> Pozvať do tímu
            </Button>
        </div>
      </div>

      {isLimitReached && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="text-orange-600 shrink-0" size={24}/>
              <div className="flex-1">
                  <p className="text-sm font-black text-orange-900 uppercase">Limit zamestnancov dosiahnutý ({activePlan.limit}/{activePlan.limit})</p>
                  <p className="text-xs text-orange-700 font-medium">Pre pridanie ďalších pracovníkov musíte prejsť na vyšší balík alebo archivovať niekoho z tímu.</p>
              </div>
              <button 
                onClick={() => window.location.href = '?action=subscription'}
                className="px-4 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-200 whitespace-nowrap"
              >
                  Upgrade
              </button>
          </div>
      )}

      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Hľadať zamestnanca podľa mena..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 transition"
            />
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative min-h-[200px]">
        {loading && workers.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-orange-600" size={40}/></div>
        ) : (
            <>
                {workers.map(w => (
                  <Card key={w.id} onClick={() => onSelect(w.id)} className={`relative group hover:shadow-md transition cursor-pointer border border-slate-200 flex flex-col h-full ${!w.is_active ? 'opacity-70 bg-slate-50' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xl text-slate-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition border border-slate-200 shrink-0">
                        {w.full_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-orange-600 transition truncate pr-8">{w.full_name}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${w.is_active ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-200 text-slate-500 border border-slate-300'}`}>
                                {w.is_active ? (w.role === 'admin' ? 'Administrátor' : (w.job_title || 'zamestnanec')) : 'Archivovaný'}
                            </span>
                            {w.is_active && w.role !== 'admin' && (
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${w.show_wage_in_profile ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                    {w.show_wage_in_profile ? <Eye size={10} className="inline mr-1"/> : <EyeOff size={10} className="inline mr-1"/>}
                                    {w.show_wage_in_profile ? 'Mzda viditeľná' : 'Mzda skrytá'}
                                </span>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-3 text-sm text-slate-600 truncate">
                        <Mail size={16} className="text-slate-400 shrink-0"/> <span className="truncate">{w.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Phone size={16} className="text-slate-400 shrink-0"/> {w.phone || '-'}
                      </div>
                      <div className="flex items-start gap-3 text-sm text-slate-600">
                        <Coins size={16} className="text-orange-400 shrink-0 mt-0.5"/> 
                        <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-bold">{formatMoney(w.hourly_rate || 0)} <span className="text-[10px] font-medium opacity-60">/ hod</span></span>
                            {w.cost_rate > 0 && w.cost_rate !== w.hourly_rate && (
                                <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 mt-1 sm:mt-0" title="Celková cena práce">
                                    CCP: {formatMoney(w.cost_rate)}
                                </span>
                            )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="absolute top-4 right-4 flex gap-1">
                        <button onClick={(e) => handleEdit(w, e)} className="bg-white p-2 rounded-full text-blue-500 shadow-sm border border-slate-200 hover:border-blue-200 active:scale-90 transition sm:opacity-0 sm:group-hover:opacity-100" title="Upraviť">
                            <Pencil size={14}/>
                        </button>
                        <button onClick={(e) => toggleArchive(w, e)} className="bg-white p-2 rounded-full text-orange-500 shadow-sm border border-slate-200 hover:border-orange-200 active:scale-90 transition sm:opacity-0 sm:group-hover:opacity-100" title={w.is_active ? "Archivovať" : "Obnoviť"}>
                            {w.is_active ? <Archive size={14}/> : <RefreshCcw size={14}/>}
                        </button>
                        {!w.is_active && (
                            <button onClick={(e) => handleDelete(w.id, e)} className="bg-white p-2 rounded-full text-red-500 shadow-sm border border-slate-200 hover:border-red-200 active:scale-90 transition" title="Zmazať">
                                <Trash2 size={14}/>
                            </button>
                        )}
                    </div>
                  </Card>
                ))}
                {workers.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                        Nenašli sa žiadni zamestnanci.
                    </div>
                )}
            </>
        )}
      </div>

      {hasMore && !loading && (
          <div className="flex justify-center pt-8 pb-12">
              <Button variant="secondary" onClick={handleLoadMore} loading={loadingMore} className="bg-white min-w-[220px]">Načítať ďalších zamestnancov...</Button>
          </div>
      )}

      <ConfirmModal
        isOpen={confirm.open}
        onClose={() => setConfirm({ ...confirm, open: false })}
        onConfirm={handleConfirmAction}
        title={confirm.action === 'archive' ? 'Archivovať?' : confirm.action === 'delete' ? 'Zmazať?' : 'Obnoviť?'}
        message={confirm.action === 'archive' 
            ? `Naozaj chcete archivovať zamestnanca ${confirm.name}? Zmizne z výberu, ale dáta ostanú.`
            : confirm.action === 'delete' 
            ? "Naozaj natrvalo zmazať? Odporúčame radšej archiváciu." 
            : "Obnoviť zamestnanca do aktívneho stavu?"}
        type={confirm.action === 'delete' ? 'danger' : 'primary'}
      />
      
      <AlertModal
        isOpen={alert.open}
        onClose={() => setAlert({ ...alert, open: false })}
        title={alert.title || "Chyba"}
        message={alert.message}
        type={alert.title === 'Chyba' ? 'error' : 'success'}
      />

      {showModal && (
        <Modal title="Upraviť Zamestnanca" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Meno a Priezvisko" value={formData.fullName} onChange={(e: any) => setFormData({...formData, fullName: e.target.value})} required placeholder="Ján Novák" />
            
            <Input 
                label="Pracovná pozícia / Rola" 
                value={formData.job_title} 
                onChange={(e: any) => setFormData({...formData, job_title: e.target.value})} 
                placeholder="napr. murár, elektrikár, zamestnanec..." 
                disabled={editingWorker?.role === 'admin'}
                className={editingWorker?.role === 'admin' ? 'bg-slate-50 cursor-not-allowed font-bold text-slate-500' : ''}
            />

            <div className="grid grid-cols-2 gap-4">
                <Input label="Mzdová sadzba (€/h)" type="number" step="0.5" value={formData.rate} onChange={(e: any) => setFormData({...formData, rate: parseFloat(e.target.value)})} required />
                <Input label="Celková cena práce (€/h)" type="number" step="0.5" value={formData.costRate} onChange={(e: any) => setFormData({...formData, costRate: parseFloat(e.target.value)})} required />
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2">
                <Info size={16} className="text-blue-500 mt-0.5 shrink-0"/>
                <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                    <strong>Mzdová sadzba:</strong> to čo zamestnanec vidí vo svojom profile.<br/>
                    <strong>Celková cena práce:</strong> náklad pre firmu (vrátane odvodov), ktorý sa použije na výpočet zisku stavby.
                </p>
            </div>

            <Input label="Telefón" value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} placeholder="+421..." />
            <Input label="Email" type="email" value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} readOnly className="bg-slate-50" />
            
            <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="isActive" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500" />
                    <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Aktívny zamestnanec</label>
                </div>

                {editingWorker?.role !== 'admin' && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="showWage" 
                                checked={formData.show_wage_in_profile} 
                                onChange={(e) => setFormData({...formData, show_wage_in_profile: e.target.checked})} 
                                className="w-6 h-6 rounded text-blue-600 focus:ring-orange-500" 
                            />
                            <label htmlFor="showWage" className="text-sm font-black text-blue-900 flex items-center gap-2 cursor-pointer">
                                Zobrazovať mzdu v profile
                            </label>
                        </div>
                        <p className="text-[10px] text-blue-700 font-medium leading-relaxed ml-8">
                            Po zakliknutí sa bude zamestnancovi v profile zobrazovať jeho hodinová mzda a celkový mesačný zárobok.
                        </p>
                    </div>
                )}
            </div>

            <Button type="submit" fullWidth className="mt-4 shadow-md">Uložiť Zmeny</Button>
          </form>
        </Modal>
      )}

      {showInviteModal && (
          <Modal title="Pozvať členov do tímu" onClose={() => setShowInviteModal(false)} maxWidth="max-w-lg">
              <div className="space-y-6 md:space-y-8 py-2 px-1">
                  <div className="text-center space-y-3 px-2">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-2 shadow-xl shadow-orange-200">
                          <UserPlus size={32} className="md:w-10 md:h-10 drop-shadow-md"/>
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Pridávanie zamestnancov</h3>
                      <p className="text-xs md:text-sm text-slate-500 leading-relaxed font-medium">
                          Stačí skopírovať registračný odkaz a poslať ho vašim zamestnancom. Registrácia je rýchla a jednoduchá.
                      </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 px-1 md:px-2">
                      {/* MAGIC LINK SECTION */}
                      <div className="bg-white border-2 border-orange-50 rounded-3xl p-4 md:p-6 shadow-sm hover:border-orange-200 transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                              <Link size={80} className="text-orange-600"/>
                          </div>
                          
                          <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                    <Zap size={14} className="fill-orange-600"/> Registračný link pre tím
                                </span>
                                {linkCopied && (
                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase animate-in fade-in slide-in-from-right-2">
                                        Skopírované!
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 md:p-4 text-[10px] md:text-[11px] font-bold text-slate-600 truncate italic">
                                    https://www.moja-stavba.sk/?action=register-emp&companyId={profile.organization_id}
                                </div>
                                <button 
                                    onClick={copyInviteLink}
                                    className={`h-12 w-12 md:h-14 md:w-14 rounded-2xl flex items-center justify-center transition-all shrink-0 shadow-lg ${linkCopied ? 'bg-green-600 text-white scale-95 shadow-green-100' : 'bg-slate-900 text-white hover:bg-orange-600 shadow-slate-200 active:scale-95'}`}
                                >
                                    {linkCopied ? <ClipboardCheck size={20} className="md:w-6 md:h-6"/> : <Copy size={20} className="md:w-6 md:h-6"/>}
                                </button>
                            </div>
                          </div>
                      </div>

                      {/* COMPANY ID SECTION */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-4 md:p-6 shadow-sm hover:border-slate-300 transition-all group">
                          <div className="flex items-center justify-between mb-4">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <Hash size={14}/> ID vašej firmy
                              </span>
                              {idCopied && (
                                  <span className="text-green-600 text-[10px] font-black uppercase">ID Skopírované</span>
                              )}
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                              <div className="flex-1 font-black text-xl md:text-2xl text-slate-800 tracking-wider text-center sm:text-left truncate w-full">
                                  {profile.organization_id.substring(0, 8)}...
                              </div>
                              <button 
                                  onClick={copyCompanyId}
                                  className={`w-full sm:w-auto px-6 h-12 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${idCopied ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                              >
                                  {idCopied ? 'ID Skopírované' : 'Kopírovať ID'}
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="mx-1 md:mx-2 p-4 md:p-5 bg-blue-50 border border-blue-100 rounded-3xl flex flex-col sm:flex-row gap-3 md:gap-4 items-center sm:items-start text-center sm:text-left">
                      <div className="bg-blue-600 text-white p-2 rounded-xl shrink-0 shadow-lg shadow-blue-200">
                          <Info size={20}/>
                      </div>
                      <div className="space-y-1">
                          <h4 className="text-xs md:text-sm font-black text-blue-900 uppercase tracking-tight">Informácia</h4>
                          <p className="text-[10px] md:text-xs text-blue-700/80 leading-relaxed font-medium">
                              Tento registračný odkaz je <strong>univerzálny pre všetkých</strong> zamestnancov vašej firmy. Môžete ho zdieľať <strong>hromadne</strong>. Pri registrácii cez tento link sa im automaticky vyplní vaše ID firmy.
                          </p>
                      </div>
                  </div>

                  <div className="text-center pt-2">
                    <button 
                        onClick={() => setShowInviteModal(false)} 
                        className="px-8 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition tracking-[0.2em]"
                    >
                        Zavrieť okno
                    </button>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};

const EmployeeDetail = ({ empId, profile, onBack }: any) => {
    const [loading, setLoading] = useState(true);
    const [emp, setEmp] = useState<any>(null);
    const [allLogs, setAllLogs] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    
    const [filterSite, setFilterSite] = useState('');
    const [searchSiteQuery, setSearchSiteQuery] = useState('');
    const [showSiteDropdown, setShowSiteDropdown] = useState(false);
    const [filterMonth, setFilterMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    });

    const [showEditModal, setShowEditModal] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [alert, setAlert] = useState<{open: boolean, message: string}>({ open: false, message: '' });

    const loadData = async () => {
        setLoading(true);
        const [e, l, s] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', empId).single(),
            supabase.from('attendance_logs').select('*, sites(name)').eq('user_id', empId).order('date', {ascending: false}),
            supabase.from('sites').select('id, name').eq('organization_id', profile.organization_id)
        ]);

        if (e.data) {
            setEmp(e.data);
            setFormData({
                fullName: e.data.full_name,
                email: e.data.email,
                rate: e.data.hourly_rate || 0,
                costRate: e.data.cost_rate || e.data.hourly_rate || 0,
                phone: e.data.phone,
                is_active: e.data.is_active,
                job_title: e.data.role === 'admin' ? 'Administrátor' : (e.data.job_title || 'zamestnanec'),
                show_wage_in_profile: e.data.show_wage_in_profile ?? true
            });
        }
        if (l.data) setAllLogs(l.data);
        if (s.data) setSites(s.data);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [empId]);

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                full_name: formData.fullName,
                hourly_rate: formData.rate,
                cost_rate: formData.costRate,
                phone: formData.phone,
                is_active: formData.is_active,
                job_title: formData.job_title,
                show_wage_in_profile: formData.show_wage_in_profile
            };
            
            const { error } = await supabase.from('profiles').update(payload).eq('id', empId);
            if (error) throw error;
            
            setShowEditModal(false);
            loadData();
        } catch(err: any) {
            setAlert({ open: true, message: "Chyba pri ukladaní: " + err.message });
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('.site-search-container')) {
                setShowSiteDropdown(false);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowSiteDropdown(false);
            }
        };

        if (showSiteDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showSiteDropdown]);

    const filteredSitesList = sites.filter(s => 
        s.name.toLowerCase().includes(searchSiteQuery.toLowerCase())
    );

    const filteredLogs = allLogs.filter(log => {
        const matchesSite = filterSite === '' || log.site_id === filterSite;
        const logMonth = log.date.substring(0, 7); 
        const matchesMonth = filterMonth === '' || logMonth === filterMonth;
        return matchesSite && matchesMonth;
    });

    const stats = filteredLogs.reduce((acc, log) => {
        const hours = Number(log.hours);
        const entryCost = log.payment_type === 'fixed' 
            ? Number(log.fixed_amount || 0) 
            : hours * Number(log.hourly_rate_snapshot || emp?.hourly_rate || 0);
        
        const realExpense = log.payment_type === 'fixed'
            ? Number(log.fixed_amount || 0)
            : hours * Number(log.cost_rate_snapshot || log.hourly_rate_snapshot || emp?.cost_rate || emp?.hourly_rate || 0);

        acc.hours += hours;
        acc.earned += entryCost;
        acc.totalCost += realExpense;
        return acc;
    }, { hours: 0, earned: 0, totalCost: 0 });

    if(loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-orange-600" size={40}/></div>;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                 <button onClick={onBack} className="text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition">
                    <ArrowLeft size={16}/> Späť na tím
                 </button>
                 <button 
                    onClick={() => setShowEditModal(true)} 
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition shadow-sm active:scale-95"
                 >
                    <Pencil size={14}/> Upraviť profil
                 </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center font-bold text-3xl text-slate-400 border border-slate-200 shrink-0">
                    {emp.full_name?.charAt(0)}
                </div>
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-3xl font-black text-slate-900 leading-tight">{emp.full_name}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2 text-sm">
                         <span className="flex items-center gap-1 text-slate-500 font-medium"><Briefcase size={14}/> {emp.role === 'admin' ? 'Administrátor' : (emp.job_title || 'zamestnanec')}</span>
                         <span className="flex items-center gap-1 text-slate-500 font-medium"><Mail size={14}/> {emp.email}</span>
                         {emp.phone && <span className="flex items-center gap-1 text-slate-500 font-medium"><Phone size={14}/> {emp.phone}</span>}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 text-center min-w-[160px] shadow-sm">
                        <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Mzdová sadzba</div>
                        <div className="text-xl font-black text-slate-800">{formatMoney(emp.hourly_rate)} <span className="text-[10px] font-bold opacity-60">/ h</span></div>
                    </div>
                    <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-200 text-center min-w-[160px] shadow-sm">
                        <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Cena práce (CCP)</div>
                        <div className="text-xl font-black text-orange-600">{formatMoney(emp.cost_rate || emp.hourly_rate)} <span className="text-[10px] font-bold opacity-60">/ h</span></div>
                    </div>
                </div>
            </div>

            <Card className="bg-slate-50 border-slate-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="lg:col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Search size={12}/> Hľadať stavbu
                        </label>
                        <div className="relative group site-search-container">
                            <input 
                                type="text"
                                placeholder="Všetky stavby..."
                                value={searchSiteQuery}
                                onFocus={() => setShowSiteDropdown(true)}
                                onChange={(e) => setSearchSiteQuery(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-orange-500 transition shadow-sm"
                            />
                            {showSiteDropdown && searchSiteQuery && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                                    <button 
                                        onClick={() => { setFilterSite(''); setSearchSiteQuery(''); setShowSiteDropdown(false); }}
                                        className="w-full text-left p-3 text-sm hover:bg-slate-50 font-bold border-b border-slate-50"
                                    >
                                        Zrušiť filter stavby
                                    </button>
                                    {filteredSitesList.map(s => (
                                        <button 
                                            key={s.id}
                                            onClick={() => { setFilterSite(s.id); setSearchSiteQuery(s.name); setShowSiteDropdown(false); }}
                                            className={`w-full text-left p-3 text-sm hover:bg-orange-50 transition font-bold flex items-center gap-2 ${filterSite === s.id ? 'bg-orange-50 text-orange-600' : 'text-slate-700'}`}
                                        >
                                            <Building2 size={14} className="opacity-40"/> {s.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Calendar size={12}/> Mesiac
                        </label>
                        <input 
                            type="month"
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-orange-500 transition shadow-sm"
                        />
                    </div>
                    
                    <div className="lg:col-span-1">
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm h-[46px] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg"><Clock size={14}/></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HODINY</span>
                            </div>
                            <span className="font-black text-slate-800 text-lg">{formatDuration(stats.hours)}</span>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm h-[46px] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="bg-orange-50 text-orange-600 p-1.5 rounded-lg"><Calculator size={14}/></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NÁKLAD</span>
                            </div>
                            <span className="font-black text-orange-600 text-lg">{formatMoney(stats.totalCost)}</span>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="space-y-4">
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                    <FileText className="text-orange-500" size={22}/> 
                    Detailný výkaz prác zamestnanca
                </h3>
                <div className="grid grid-cols-1 gap-3">
                    {filteredLogs.map((log: any) => {
                        const isFixed = log.payment_type === 'fixed';
                        return (
                            <div key={log.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-orange-200 transition group">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-slate-50 text-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-100 flex items-center gap-2">
                                                <Calendar size={14} className="text-orange-500"/>
                                                {formatDate(log.date)}
                                            </div>
                                            <div className="text-slate-900 font-bold flex items-center gap-1.5">
                                                <Building2 size={16} className="text-blue-500"/>
                                                {log.sites?.name || 'Všeobecné'}
                                                {isFixed && <span className="ml-2 bg-orange-500 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1"><Briefcase size={8}/> Úkol</span>}
                                            </div>
                                        </div>
                                        <div className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100 italic">
                                            {log.description || <span className="text-slate-300">Bez popisu práce...</span>}
                                        </div>
                                    </div>
                                    <div className="flex md:flex-col justify-between items-end gap-2 shrink-0">
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Dĺžka práce</div>
                                            <div className="text-2xl font-black text-slate-900">{formatDuration(Number(log.hours))}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Náklad pre firmu</div>
                                            <div className="text-xl font-black text-orange-600">
                                                {isFixed ? formatMoney(log.fixed_amount) : formatMoney(Number(log.hours) * Number(log.cost_rate_snapshot || emp?.cost_rate || emp?.hourly_rate || 0))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {showEditModal && (
                <Modal title="Upraviť Zamestnanca" onClose={() => setShowEditModal(false)}>
                    <form onSubmit={handleSaveEdit} className="space-y-4">
                        <Input label="Meno a Priezvisko" value={formData.fullName} onChange={(e: any) => setFormData({...formData, fullName: e.target.value})} required placeholder="Ján Novák" />
                        
                        <Input 
                            label="Pracovná pozícia / Rola" 
                            value={formData.job_title} 
                            onChange={(e: any) => setFormData({...formData, job_title: e.target.value})} 
                            placeholder="napr. murár, elektrikár, zamestnanec..." 
                            disabled={emp?.role === 'admin'}
                            className={emp?.role === 'admin' ? 'bg-slate-50 cursor-not-allowed font-bold text-slate-500' : ''}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Mzdová sadzba (€/h)" type="number" step="0.5" value={formData.rate} onChange={(e: any) => setFormData({...formData, rate: parseFloat(e.target.value)})} required />
                            <Input label="Celková cena práce (€/h)" type="number" step="0.5" value={formData.costRate} onChange={(e: any) => setFormData({...formData, costRate: parseFloat(e.target.value)})} required />
                        </div>
                        
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2">
                            <Info size={16} className="text-blue-500 mt-0.5 shrink-0"/>
                            <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                                <strong>Mzdová sadzba:</strong> to čo zamestnanec vidí vo svojom profile.<br/>
                                <strong>Celková cena práce (CCP):</strong> náklad pre firmu (vrátane odvodov), ktorý sa použije na výpočet zisku stavby.
                            </p>
                        </div>

                        <Input label="Telefón" value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} placeholder="+421..." />
                        
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isActiveDetail" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500" />
                                <label htmlFor="isActiveDetail" className="text-sm font-bold text-slate-700">Aktívny zamestnanec</label>
                            </div>

                            {emp?.role !== 'admin' && (
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            id="showWageDetail" 
                                            checked={formData.show_wage_in_profile} 
                                            onChange={(e) => setFormData({...formData, show_wage_in_profile: e.target.checked})} 
                                            className="w-6 h-6 rounded text-blue-600 focus:ring-orange-500" 
                                        />
                                        <label htmlFor="showWageDetail" className="text-sm font-black text-blue-900 flex items-center gap-2 cursor-pointer">
                                            Zobrazovať mzdu v profile
                                        </label>
                                    </div>
                                    <p className="text-[10px] text-blue-700 font-medium leading-relaxed ml-8">
                                        Po zakliknutí sa bude zamestnancovi v profile zobrazovať jeho hodinová mzda a celkový mesačný zárobok.
                                    </p>
                                </div>
                            )}
                        </div>

                        <Button type="submit" fullWidth className="mt-4 shadow-md">Uložiť Zmeny</Button>
                    </form>
                </Modal>
            )}

            <AlertModal
                isOpen={alert.open}
                onClose={() => setAlert({ ...alert, open: false })}
                title="Chyba"
                message={alert.message}
                type="error"
            />
        </div>
    );
};
