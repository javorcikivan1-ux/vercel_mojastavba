
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Input, Badge, ConfirmModal, AlertModal, Select } from '../components/UI';
import { UserPlus, Mail, Coins, Phone, ArrowLeft, Calendar, Building2, Banknote, Trash2, Archive, CheckCircle2, Users, Pencil, RefreshCcw, Link, Copy, ChevronDown, ChevronRight, Clock, MapPin, Send, Zap, Info, Smartphone, Monitor, Wallet, Loader2, Filter, FileText, Search, Briefcase, Eye, EyeOff } from 'lucide-react';
import { formatMoney, formatDate, formatDuration } from '../lib/utils';

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
    phone: '', 
    is_active: true, 
    job_title: 'zamestnanec',
    show_wage_in_profile: true 
  });
  
  const [confirm, setConfirm] = useState<{open: boolean, action: string, id: string, name?: string}>({ open: false, action: '', id: '' });
  const [alert, setAlert] = useState<{open: boolean, message: string}>({ open: false, message: '' });
  const [copied, setCopied] = useState(false);

  // Debounced search / reset on tab toggle
  useEffect(() => {
    const timer = setTimeout(() => {
        setPage(0);
        load(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showArchived]);

  // Load more trigger
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
            query = query.ilike('full_name', `%${searchQuery}%`);
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

  const handleEdit = (worker: any, e: any) => {
      e.stopPropagation();
      setEditingWorker(worker);
      
      const displayJobTitle = worker.role === 'admin' ? 'Administrátor' : (worker.job_title || 'zamestnanec');
      
      setFormData({ 
          email: worker.email, 
          fullName: worker.full_name, 
          rate: worker.hourly_rate, 
          phone: worker.phone,
          is_active: worker.is_active,
          job_title: displayJobTitle,
          show_wage_in_profile: worker.show_wage_in_profile ?? true
      });
      setShowModal(true);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        let error;
        if (editingWorker) {
             const payload: any = {
                full_name: formData.fullName,
                email: formData.email,
                hourly_rate: formData.rate,
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

  const copyOrgId = () => {
      navigator.clipboard.writeText(profile.organization_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const sendInviteViaEmail = () => {
      const subject = encodeURIComponent("Pozvánka do tímu - MojaStavba");
      const body = encodeURIComponent(
          `Dobrý deň,\n\nPozývam vás do nášho firemného systému MojaStavba na správu prác a dochádzky.\n\nPostup pre registráciu:\n1. Stiahnite si aplikáciu pre váš systém (Android / Windows).\n2. Pri registrácii zvoľte "Zamestnanecký účet".\n3. Zadajte toto ID firmy: ${profile.organization_id}\n\nPo registrácii si budete môcť hneď zapisovať svoje odpracované hodiny.\n\nS pozdravom,\nAdministrátor`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
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
            <Button onClick={() => setShowInviteModal(true)} fullWidth className="sm:w-auto justify-center order-1 sm:order-2 shadow-lg shadow-orange-100">
                <UserPlus size={18}/> Pozvať zamestnancov
            </Button>
        </div>
      </div>

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
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Coins size={16} className="text-orange-400 shrink-0"/> 
                        <span className="font-bold">{formatMoney(w.hourly_rate || 0)} / hod</span>
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
        title="Chyba"
        message={alert.message}
        type="error"
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
                <Input label="Hodinová sadzba €" type="number" step="0.5" value={formData.rate} onChange={(e: any) => setFormData({...formData, rate: parseFloat(e.target.value)})} required />
                <Input label="Telefón" value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} placeholder="+421..." />
            </div>
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
                                className="w-6 h-6 rounded text-blue-600 focus:ring-blue-500" 
                            />
                            <label htmlFor="showWage" className="text-sm font-black text-blue-900 flex items-center gap-2 cursor-pointer">
                                Zobrazovať mzdu v profile
                            </label>
                        </div>
                        <p className="text-[10px] text-blue-700 font-medium leading-relaxed ml-8">
                            <Info size={10} className="inline mr-1 mb-0.5"/>
                            Po zakliknutí sa bude zamestnancovi v profile zobrazovať jeho hodinová mzda a celkový mesačný zárobok. V opačnom prípade uvidí iba počet odpracovaných hodín.
                        </p>
                    </div>
                )}
            </div>

            <Button type="submit" fullWidth className="mt-4 shadow-md">Uložiť Zmeny</Button>
          </form>
        </Modal>
      )}

      {showInviteModal && (
          <Modal title="Pozvať do tímu" onClose={() => setShowInviteModal(false)}>
              <div className="space-y-6">
                  <div className="text-center">
                      <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-100 shadow-sm">
                          <Users size={32} className="fill-orange-100"/>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">Ako pozvať ľudí?</h3>
                      <p className="text-xs text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                          Keďže aplikáciu používate ako nainštalovaný program, zamestnanci si ju musia najprv stiahnuť a pri registrácii zadať vaše <strong>ID firmy</strong>.
                      </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID vašej firmy</label>
                          {copied && <span className="text-[10px] font-bold text-green-600 flex items-center gap-1 animate-bounce">✓ Skopírované</span>}
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                          <div className="flex-1 font-mono text-sm font-bold text-slate-700 truncate text-center">
                              {profile.organization_id}
                          </div>
                          <button 
                              onClick={copyOrgId} 
                              className={`p-2 rounded-lg transition shrink-0 ${copied ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-orange-600 hover:text-white'}`}
                          >
                              <Copy size={18}/>
                          </button>
                      </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                        <Smartphone size={20} className="text-blue-500 shrink-0 mt-1"/>
                        <div>
                            <div className="text-xs font-bold text-slate-800">Mobilná aplikácia</div>
                            <p className="text-[10px] text-slate-400 mt-0.5">Pošlite im ID firmy cez WhatsApp a navigujte ich na stiahnutie.</p>
                        </div>
                    </div>
                    
                    <Button fullWidth onClick={sendInviteViaEmail} variant="secondary" className="bg-white border-slate-200 text-slate-700 h-12">
                        <Mail size={18} className="text-blue-500"/> Odoslať inštrukcie e-mailom
                    </Button>
                  </div>

                  <div className="pt-2">
                    <Button fullWidth onClick={() => setShowInviteModal(false)} variant="ghost" className="text-slate-400 hover:text-slate-600">Zatvoriť</Button>
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
    const [filterMonth, setFilterMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    });

    const loadData = async () => {
        setLoading(true);
        const [e, l, s] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', empId).single(),
            supabase.from('attendance_logs').select('*, sites(name)').eq('user_id', empId).order('date', {ascending: false}),
            supabase.from('sites').select('id, name').eq('organization_id', profile.organization_id)
        ]);

        if (e.data) setEmp(e.data);
        if (l.data) setAllLogs(l.data);
        if (s.data) setSites(s.data);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [empId]);

    const filteredSitesList = sites.filter(s => 
        s.name.toLowerCase().includes(searchSiteQuery.toLowerCase())
    );

    const filteredLogs = allLogs.filter(log => {
        const matchesSite = filterSite === '' || log.site_id === filterSite;
        const logMonth = log.date.substring(0, 7); 
        const matchesMonth = filterMonth === '' || logMonth === filterMonth;
        return matchesSite && matchesMonth;
    });

    // FIX: Prepracovaný výpočet sumáru s podporou úkolu
    const stats = filteredLogs.reduce((acc, log) => {
        const hours = Number(log.hours);
        // Ak je to úkol, pripočítame fixnú sumu, inak hodinovku
        const entryCost = log.payment_type === 'fixed' 
            ? Number(log.fixed_amount || 0) 
            : hours * Number(log.hourly_rate_snapshot || emp?.hourly_rate || 0);
        
        acc.hours += hours;
        acc.earned += entryCost;
        return acc;
    }, { hours: 0, earned: 0 });

    if(loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-orange-600" size={40}/></div>;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                 <button onClick={onBack} className="text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition">
                    <ArrowLeft size={16}/> Späť na tím
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
                <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 text-center min-w-[160px] shadow-sm">
                    <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Mzdová sadzba</div>
                    <div className="text-2xl font-black text-slate-800">{formatMoney(emp.hourly_rate)} <span className="text-xs font-bold opacity-60">/ h</span></div>
                </div>
            </div>

            <Card className="bg-slate-50 border-slate-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="lg:col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Search size={12}/> Hľadať stavbu
                        </label>
                        <div className="relative group">
                            <input 
                                type="text"
                                placeholder="Všetky stavby..."
                                value={searchSiteQuery}
                                onChange={(e) => setSearchSiteQuery(e.target.value)}
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-orange-500 transition shadow-sm"
                            />
                            {searchSiteQuery && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                                    <button 
                                        onClick={() => { setFilterSite(''); setSearchSiteQuery(''); }}
                                        className="w-full text-left p-3 text-sm hover:bg-slate-50 font-bold border-b border-slate-50"
                                    >
                                        Zrušiť filter stavby
                                    </button>
                                    {filteredSitesList.map(s => (
                                        <button 
                                            key={s.id}
                                            onClick={() => { setFilterSite(s.id); setSearchSiteQuery(s.name); }}
                                            className={`w-full text-left p-3 text-sm hover:bg-orange-50 transition font-bold flex items-center gap-2 ${filterSite === s.id ? 'bg-orange-50 text-orange-600' : 'text-slate-700'}`}
                                        >
                                            <Building2 size={14} className="opacity-40"/> {s.name}
                                        </button>
                                    ))}
                                    {filteredSitesList.length === 0 && <div className="p-3 text-xs text-slate-400 italic">Nenašla sa žiadna stavba.</div>}
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
                                <div className="bg-green-50 text-green-600 p-1.5 rounded-lg"><Wallet size={14}/></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ZÁROBOK</span>
                            </div>
                            <span className="font-black text-green-600 text-lg">{formatMoney(stats.earned)}</span>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="space-y-4">
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                    <FileText className="text-orange-500" size={22}/> 
                    Detailný výkaz prác
                    <span className="ml-2 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-bold">{filteredLogs.length} záznamov</span>
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
                                                {isFixed && <span className="ml-2 bg-orange-600 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1"><Briefcase size={8}/> Úkol</span>}
                                            </div>
                                        </div>
                                        <div className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100 italic">
                                            {log.description || <span className="text-slate-300">Bez popisu práce...</span>}
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><Clock size={12}/> {log.start_time || '--:--'} - {log.end_time || '--:--'}</span>
                                            {!isFixed && <span className="flex items-center gap-1"><Wallet size={12}/> {formatMoney(log.hourly_rate_snapshot || emp?.hourly_rate || 0)} / hod</span>}
                                        </div>
                                    </div>
                                    <div className="flex md:flex-col justify-between items-end gap-2 shrink-0">
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Dĺžka práce</div>
                                            <div className="text-2xl font-black text-slate-900">{formatDuration(Number(log.hours))}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Suma za deň</div>
                                            <div className={`text-xl font-black ${isFixed ? 'text-orange-600' : 'text-green-600'}`}>
                                                {isFixed ? formatMoney(log.fixed_amount) : formatMoney(Number(log.hours) * Number(log.hourly_rate_snapshot || emp?.hourly_rate || 0))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredLogs.length === 0 && (
                        <div className="py-20 text-center text-slate-400 italic bg-white rounded-2xl border-2 border-dashed border-slate-200">
                            Žiadne záznamy prác pre tento výber.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
