
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Input, Select, Badge, ConfirmModal } from '../components/UI';
import { 
    Banknote, Plus, History, CheckCircle2, User, 
    Calendar, Trash2, Search, Filter, Loader2, 
    TrendingUp, Wallet, ArrowRight, X, Pencil,
    AlertCircle, Clock, Info
} from 'lucide-react';
import { formatMoney, formatDate } from '../lib/utils';

const ADVANCES_PAGE_SIZE = 15;

export const AdvancesScreen = ({ profile }: any) => {
    const [advances, setAdvances] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    
    // Pagination & Filter State
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('pending');
    const [userFilter, setUserFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingAdvance, setEditingAdvance] = useState<any>(null);
    const [formData, setFormData] = useState({
        user_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });
    
    const [confirm, setConfirm] = useState<{open: boolean, action: string, id: string | null}>({ open: false, action: '', id: null });

    const loadWorkers = useCallback(async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('organization_id', profile.organization_id)
            .eq('is_active', true)
            .order('full_name');
        if (data) setWorkers(data);
    }, [profile.organization_id]);

    const loadAdvances = async (reset = false) => {
        if (reset) {
            setLoading(true);
            setPage(0);
        } else {
            setLoadingMore(true);
        }

        try {
            const from = reset ? 0 : (page + 1) * ADVANCES_PAGE_SIZE;
            const to = from + ADVANCES_PAGE_SIZE - 1;

            let query = supabase
                .from('advances')
                .select('*, profiles(full_name)')
                .eq('organization_id', profile.organization_id);

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }
            if (userFilter) {
                query = query.eq('user_id', userFilter);
            }
            if (searchQuery) {
                query = query.ilike('description', `%${searchQuery}%`);
            }

            const { data, error } = await query
                .order('date', { ascending: false })
                .range(from, to);

            if (error) throw error;
            
            if (data) {
                setAdvances(prev => reset ? data : [...prev, ...data]);
                setHasMore(data.length === ADVANCES_PAGE_SIZE);
                if (!reset) setPage(p => p + 1);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        loadWorkers();
    }, [loadWorkers]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadAdvances(true);
        }, 300);
        return () => clearTimeout(timer);
    }, [statusFilter, userFilter, searchQuery]);

    const stats = useMemo(() => {
        // Pre presné štatistiky by sme ideálne mali samostatný dopyt, 
        // ale pre UX stačí zosumarizovať aktuálne načítané alebo urobiť quick fetch
        return {
            totalUnsettled: advances.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.amount), 0),
            countUnsettled: advances.filter(a => a.status === 'pending').length
        };
    }, [advances]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                organization_id: profile.organization_id,
                status: 'pending'
            };

            let res;
            if (editingAdvance) {
                res = await supabase.from('advances').update(payload).eq('id', editingAdvance.id);
            } else {
                res = await supabase.from('advances').insert([payload]);
            }

            if (res.error) throw res.error;
            
            setShowModal(false);
            setEditingAdvance(null);
            loadAdvances(true);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const settleAdvance = async (id: string) => {
        await supabase.from('advances').update({ 
            status: 'settled', 
            settled_at: new Date().toISOString() 
        }).eq('id', id);
        loadAdvances(true);
    };

    const deleteAdvance = async (id: string) => {
        await supabase.from('advances').delete().eq('id', id);
        setConfirm({ open: false, action: '', id: null });
        loadAdvances(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <Banknote className="text-orange-600" size={32} />
                        Zálohy zamestnancov
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Evidencia a vyúčtovanie záloh</p>
                </div>
                <Button onClick={() => { setEditingAdvance(null); setFormData({ user_id: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' }); setShowModal(true); }}>
                    <Plus size={18}/> Vyplatiť Zálohu
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-orange-100 shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={64} className="text-orange-600"/></div>
                    <div className="relative z-10">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Celkom Čakajúce</div>
                        <div className="text-3xl font-black text-orange-600">{formatMoney(stats.totalUnsettled)}</div>
                        <div className="text-xs font-bold text-slate-400 mt-1">{stats.countUnsettled} nevyrovnaných záloh</div>
                    </div>
                </Card>
                
                <Card className="md:col-span-2 flex flex-col md:flex-row gap-4 bg-white border-slate-200">
                    <div className="flex-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><User size={12}/> Zamestnanec</label>
                        <select 
                            value={userFilter} 
                            onChange={(e) => setUserFilter(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/10"
                        >
                            <option value="">Všetci zamestnanci</option>
                            {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Filter size={12}/> Stav</label>
                        <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                            <button onClick={() => setStatusFilter('pending')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${statusFilter === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Čakajúce</button>
                            <button onClick={() => setStatusFilter('settled')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${statusFilter === 'settled' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>História</button>
                            <button onClick={() => setStatusFilter('all')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${statusFilter === 'all' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Všetko</button>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-600" size={40}/></div>
                ) : advances.length === 0 ? (
                    <Card className="py-20 text-center text-slate-400 border-2 border-dashed">
                        <Banknote size={48} className="mx-auto mb-4 opacity-10"/>
                        <p className="font-bold uppercase text-xs tracking-widest">Nenašli sa žiadne zálohy.</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {advances.map(adv => (
                            <Card key={adv.id} className="p-4 hover:shadow-md transition group border-slate-200">
                                <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shadow-sm shrink-0">
                                            <Banknote size={24}/>
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900 text-lg leading-tight flex items-center gap-2">
                                                {formatMoney(adv.amount)}
                                                {adv.status === 'settled' ? (
                                                    <span className="text-[8px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 border border-green-200"><CheckCircle2 size={10}/> Vyrovnané</span>
                                                ) : (
                                                    <span className="text-[8px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 border border-yellow-200"><Clock size={10}/> Čaká na zúčtovanie</span>
                                                )}
                                            </div>
                                            <div className="text-xs font-bold text-slate-400 flex items-center gap-3 mt-1.5">
                                                <span className="flex items-center gap-1"><User size={12}/> {adv.profiles?.full_name}</span>
                                                <span className="flex items-center gap-1"><Calendar size={12}/> {formatDate(adv.date)}</span>
                                            </div>
                                            {adv.description && (
                                                <p className="text-xs text-slate-500 italic mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">"{adv.description}"</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full md:w-auto self-end md:self-center">
                                        {adv.status === 'pending' && (
                                            <Button size="sm" onClick={() => settleAdvance(adv.id)} className="bg-green-600 text-white border-none hover:bg-green-700 flex-1 md:flex-none">
                                                <CheckCircle2 size={16}/> Dorovnať
                                            </Button>
                                        )}
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => { setEditingAdvance(adv); setFormData({ user_id: adv.user_id, amount: adv.amount.toString(), date: adv.date, description: adv.description || '' }); setShowModal(true); }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                                            >
                                                <Pencil size={18}/>
                                            </button>
                                            <button 
                                                onClick={() => setConfirm({ open: true, action: 'delete', id: adv.id })}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                                            >
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {hasMore && !loading && (
                    <div className="flex justify-center pt-4">
                        <Button variant="secondary" onClick={() => loadAdvances()} loading={loadingMore} className="bg-white border-slate-200">
                            Načítať staršie zálohy...
                        </Button>
                    </div>
                )}
            </div>

            {showModal && (
                <Modal title={editingAdvance ? "Upraviť Zálohu" : "Nová Záloha"} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSave} className="space-y-4">
                        <Select 
                            label="Zamestnanec" 
                            value={formData.user_id} 
                            onChange={(e: any) => setFormData({...formData, user_id: e.target.value})} 
                            required
                        >
                            <option value="">-- Vyberte zamestnanca --</option>
                            {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                        </Select>

                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label="Suma (€)" 
                                type="number" 
                                step="0.01" 
                                value={formData.amount} 
                                onChange={(e: any) => setFormData({...formData, amount: e.target.value})} 
                                required 
                                placeholder="0.00"
                            />
                            <Input 
                                label="Dátum vyplatenia" 
                                type="date" 
                                value={formData.date} 
                                onChange={(e: any) => setFormData({...formData, date: e.target.value})} 
                                required 
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Poznámka / Dôvod</label>
                            <textarea 
                                value={formData.description} 
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-orange-500 h-24 text-sm font-medium"
                                placeholder="Napr. Súkromné účely, nákup náradia a pod..."
                            />
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                            <Info size={18} className="text-blue-500 mt-0.5 shrink-0"/>
                            <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                                Záloha bude evidovaná ako čakajúca. Pri mesačnom vyúčtovaní mzdy ju môžete "Dorovnať", čím sa suma odpočíta z nákladu na zamestnanca.
                            </p>
                        </div>

                        <Button type="submit" fullWidth size="lg" className="mt-6 shadow-orange-100">
                            {editingAdvance ? 'Uložiť Zmeny' : 'Uložiť Zálohu'}
                        </Button>
                    </form>
                </Modal>
            )}

            <ConfirmModal 
                isOpen={confirm.open}
                onClose={() => setConfirm({ open: false, action: '', id: null })}
                onConfirm={() => confirm.id && deleteAdvance(confirm.id)}
                title="Zmazať záznam o zálohe?"
                message="Tento krok nie je možné vrátiť späť. Záznam bude natrvalo odstránený."
            />
        </div>
    );
};
