
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { loadAdvanceTotals } from '../lib/advances';
import { Card, Button, Modal, Input, Select, Badge, ConfirmModal } from '../components/UI';
import { 
    Banknote, Plus, History, CheckCircle2, User, 
    Calendar, Trash2, Search, Filter, Loader2, 
    TrendingUp, Wallet, ArrowRight, X, Pencil,
    AlertCircle, Clock, Info, Check, Calculator, ChevronRight
} from 'lucide-react';
import { formatMoney, formatDate } from '../lib/utils';

const ADVANCES_PAGE_SIZE = 15;

export const AdvancesScreen = ({ profile }: any) => {
    const [advances, setAdvances] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const settlementLock = useRef(false);
    const saveLock = useRef(false);
    const [settling, setSettling] = useState(false);
    const [stats, setStats] = useState({ totalUnsettled: 0, countUnsettled: 0 });
    const [statsError, setStatsError] = useState('');
    const [statsLoading, setStatsLoading] = useState(true);
    
    // Pagination & Filter State
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('pending');
    const [userFilter, setUserFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [editingAdvance, setEditingAdvance] = useState<any>(null);
    const [selectedForSettle, setSelectedForSettle] = useState<any>(null);
    const [selectedForHistory, setSelectedForHistory] = useState<any>(null);
    const [settlements, setSettlements] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    
    const [formData, setFormData] = useState({
        user_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });

    const [settleForm, setSettleForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0]
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

    const loadSettlementHistory = async (advanceId: string) => {
        setLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('advance_settlements')
                .select('*')
                .eq('advance_id', advanceId)
                .order('date', { ascending: false });
            if (error) throw error;
            setSettlements(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingHistory(false);
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

    useEffect(() => {
        let cancelled = false;
        const loadTotals = async () => {
            setStatsLoading(true);
            setStatsError('');
            try {
                const totals = await loadAdvanceTotals(profile.organization_id, userFilter);
                if (!cancelled) setStats(totals);
            } catch {
                if (!cancelled) setStatsError('Súhrn záloh sa nepodarilo načítať.');
            } finally {
                if (!cancelled) setStatsLoading(false);
            }
        };
        loadTotals();
        return () => { cancelled = true; };
    }, [profile.organization_id, userFilter, advances]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saveLock.current) return;
        const amount = Number(formData.amount);
        const alreadySettled = Number(editingAdvance?.settled_amount || 0);
        if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) < Math.round(alreadySettled * 100)) {
            alert('Suma zálohy musí byť kladná a nesmie byť nižšia ako už zúčtované splátky.');
            return;
        }
        saveLock.current = true;
        setLoading(true);
        try {
            const payload = {
                ...formData,
                amount,
                organization_id: profile.organization_id,
                status: Math.round(alreadySettled * 100) === Math.round(amount * 100) ? 'settled' : 'pending',
                settled_at: Math.round(alreadySettled * 100) === Math.round(amount * 100) ? (editingAdvance?.settled_at || new Date().toISOString()) : null
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
            saveLock.current = false;
            setLoading(false);
        }
    };

    const handleSettleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedForSettle || settlementLock.current) return;
        
        const amountToSettle = parseFloat(settleForm.amount);
        if (!Number.isFinite(amountToSettle) || amountToSettle <= 0) return;
        if (Math.round(amountToSettle * 100) > Math.round((Number(selectedForSettle.amount) - Number(selectedForSettle.settled_amount || 0)) * 100)) {
            alert('Splátka nemôže byť vyššia ako zostávajúci zostatok zálohy.');
            return;
        }
        settlementLock.current = true;
        setSettling(true);

        setLoading(true);
        try {
            const { error } = await supabase.rpc('settle_employee_advance', {
                p_advance_id: selectedForSettle.id,
                p_amount: amountToSettle,
                p_date: settleForm.date
            });
            if (error) {
                if (error.code === 'PGRST202' || error.code === '42883') {
                    throw new Error('Najskôr je potrebné spustiť SQL aktualizáciu pre bezpečné zúčtovanie záloh.');
                }
                throw error;
            }
            setShowSettleModal(false);
            setSelectedForSettle(null);
            setSettleForm({ amount: '', date: new Date().toISOString().split('T')[0] });
            loadAdvances(true);
        } catch (err: any) {
            alert(err.message);
        } finally {
            settlementLock.current = false;
            setSettling(false);
            setLoading(false);
        }
    };

    const deleteAdvance = async (id: string) => {
        await supabase.from('advances').delete().eq('id', id);
        setConfirm({ open: false, action: '', id: null });
        loadAdvances(true);
    };

    const openHistory = (adv: any) => {
        setSelectedForHistory(adv);
        setSettlements([]);
        setShowHistoryModal(true);
        loadSettlementHistory(adv.id);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-4 md:pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="app-section-title">
                        <Banknote className="text-orange-600" />
                        Zálohy zamestnancov
                    </h2>
                    <p className="app-section-subtitle">Evidencia splátok a zostatkov záloh</p>
                </div>
                <Button size="sm" className="!shadow-none" onClick={() => { setEditingAdvance(null); setFormData({ user_id: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' }); setShowModal(true); }}>
                    <Plus size={18}/> Vyplatiť Zálohu
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-orange-100 shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={64} className="text-orange-600"/></div>
                    <div className="relative z-10">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Celkom k vráteniu</div>
                        <div className="text-2xl font-bold text-orange-600">{statsLoading ? '…' : statsError ? '—' : formatMoney(stats.totalUnsettled)}</div>
                        <div className="text-xs font-bold text-slate-400 mt-1">{statsLoading ? 'Načítavam súhrn…' : statsError || (stats.countUnsettled + ' aktívnych záloh')}</div>
                    </div>
                </Card>
                
                <Card className="md:col-span-2 flex flex-col md:flex-row gap-4 bg-white border-slate-200">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><User size={12}/> Zamestnanec</label>
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
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Filter size={12}/> Stav</label>
                        <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                            <button onClick={() => setStatusFilter('pending')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${statusFilter === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Čakajúce</button>
                            <button onClick={() => setStatusFilter('settled')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${statusFilter === 'settled' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>Splatené</button>
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
                    <div className="grid grid-cols-1 gap-4">
                        {advances.map(adv => {
                            const settled = Number(adv.settled_amount || 0);
                            const total = Number(adv.amount);
                            const remaining = total - settled;
                            const percent = (settled / total) * 100;

                            return (
                                <Card key={adv.id} onClick={() => openHistory(adv)} className="p-4 sm:p-5 !shadow-none hover:border-slate-300 transition-colors group border-slate-200 cursor-pointer overflow-hidden bg-white">
                                    <div className="flex flex-col gap-3">
                                        {/* HEADER RAD: IKONA + ZÁKLADNÉ INFO */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shrink-0">
                                                    <Banknote className="size-5"/>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-bold text-slate-900 text-lg sm:text-xl tracking-tight">{formatMoney(total)}</span>
                                                        {adv.status === 'settled' ? (
                                                            <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-md font-medium flex items-center gap-1 border border-green-100"><CheckCircle2 size={10}/> Splatené</span>
                                                        ) : settled > 0 ? (
                                                            <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium flex items-center gap-1 border border-amber-100"><Clock size={10}/> Čiastočne splatené</span>
                                                        ) : null}
                                                    </div>
                                                    <div className="text-xs font-medium text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                        <span className="flex items-center gap-1.5"><User size={14} className="text-slate-300"/> {adv.profiles?.full_name}</span>
                                                        <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-300"/> {formatDate(adv.date)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button 
                                                    onClick={() => { setEditingAdvance(adv); setFormData({ user_id: adv.user_id, amount: adv.amount.toString(), date: adv.date, description: adv.description || '' }); setShowModal(true); }}
                                                    className="p-2 sm:p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition active:scale-90"
                                                >
                                                    <Pencil size={20}/>
                                                </button>
                                                <button 
                                                    onClick={() => setConfirm({ open: true, action: 'delete', id: adv.id })}
                                                    className="p-2 sm:p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition active:scale-90"
                                                >
                                                    <Trash2 size={20}/>
                                                </button>
                                            </div>
                                        </div>

                                        {/* PROGRESS SECTION: TERAZ NA CELÚ ŠÍRKU KARTY */}
                                        {adv.status === 'pending' && (
                                            <div className="w-full bg-slate-50/70 p-3 sm:p-4 rounded-xl border border-slate-100">
                                                <div className="flex justify-between items-end mb-3">
                                                    <span className="text-xs font-medium text-slate-500">Priebeh splácania ({Math.round(percent)}%)</span>
                                                    <div className="text-right">
                                                        <span className="text-[11px] block text-slate-500 font-medium mb-0.5">Zostatok k vráteniu</span>
                                                        <span className="text-sm sm:text-base text-orange-600 font-bold">{formatMoney(remaining)}</span>
                                                    </div>
                                                </div>
                                                <div className="w-full h-2 bg-slate-200/70 rounded-full overflow-hidden flex">
                                                    <div 
                                                        className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                                                        style={{ width: `${percent}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ACTION BUTTON & DESCRIPTION */}
                                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1">
                                            {adv.description ? (
                                                <p className="text-[11px] sm:text-sm text-slate-500 italic bg-slate-50/50 p-3 rounded-xl border border-slate-100 border-dashed w-full sm:w-auto flex-1">
                                                    "{adv.description}"
                                                </p>
                                            ) : <div className="hidden sm:block flex-1"></div>}
                                            
                                            {adv.status === 'pending' && (
                                                <div className="w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                                                    <Button size="sm" onClick={() => { setSelectedForSettle(adv); setSettleForm({ amount: '', date: new Date().toISOString().split('T')[0] }); setShowSettleModal(true); }} className="w-full sm:w-auto !shadow-none !font-semibold !tracking-normal">
                                                        <Calculator size={15}/> Zúčtovať splátku
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {hasMore && !loading && (
                    <div className="flex justify-center pt-6">
                        <Button variant="secondary" onClick={() => loadAdvances()} loading={loadingMore} className="bg-white border-slate-200">
                            Načítať staršie zálohy...
                        </Button>
                    </div>
                )}
            </div>

            {/* MODAL: NOVÁ ZÁLOHA */}
            {showModal && (
                <Modal title={editingAdvance ? "Upraviť zálohu" : "Nová záloha"} onClose={() => setShowModal(false)}>
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

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <Input 
                                label="Celková Suma (€)" 
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
                                className="!px-0.5 !text-[13px] sm:!px-3 sm:!text-sm tracking-tighter"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Poznámka / Dôvod</label>
                            <textarea 
                                value={formData.description} 
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-orange-500 h-24 text-sm font-medium"
                                placeholder="Napr. Súkromné účely, nákup náradia a pod..."
                            />
                        </div>

                        <div className="p-3 sm:p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                            <Info size={18} className="text-blue-500 mt-0.5 shrink-0"/>
                            <p className="text-xs sm:text-sm text-blue-700 font-medium leading-relaxed">
                                Záloha bude evidovaná ako otvorená. Môžete ju splácať postupne zadávaním čiastočných splátok.
                            </p>
                        </div>

                        <Button type="submit" loading={settling} disabled={settling} fullWidth size="lg" className="mt-6 shadow-orange-100 h-12 font-bold tracking-wide">
                            {editingAdvance ? 'Uložiť zmeny' : 'Uložiť zálohu'}
                        </Button>
                    </form>
                </Modal>
            )}

            {/* MODAL: ZÚČTOVAŤ SPLÁTKU */}
            {showSettleModal && (
                <Modal title="Zúčtovať splátku zálohy" onClose={() => { if (!settlementLock.current) setShowSettleModal(false); }}>
                    <form onSubmit={handleSettleSubmit} className="space-y-6">
                        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-inner text-center">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Aktuálny stav u zamestnanca</div>
                            <div className="font-black text-slate-600 mb-1">{selectedForSettle?.profiles?.full_name}</div>
                            <div className="text-2xl sm:text-3xl font-black text-orange-600 tracking-tighter">{formatMoney(Number(selectedForSettle?.amount) - Number(selectedForSettle?.settled_amount || 0))} k vráteniu</div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <Input 
                                    label="Dátum zúčtovania" 
                                    type="date" 
                                    value={settleForm.date} 
                                    onChange={(e: any) => setSettleForm({...settleForm, date: e.target.value})} 
                                    required 
                                    className="!px-0.5 !text-[13px] sm:!px-3 sm:!text-sm tracking-tighter"
                                />
                                <Input 
                                    label="Suma splátky (€)" 
                                    type="number" 
                                    step="0.01" 
                                    value={settleForm.amount} 
                                    onChange={(e: any) => setSettleForm({...settleForm, amount: e.target.value})} 
                                    required 
                                    autoFocus
                                    placeholder="0.00"
                                    className="font-bold text-sm"
                                />
                            </div>
                            
                            <div className="flex justify-end">
                                <button 
                                    type="button"
                                    onClick={() => setSettleForm({...settleForm, amount: (Number(selectedForSettle?.amount) - Number(selectedForSettle?.settled_amount || 0)).toString()})}
                                    className="px-4 py-2 bg-white border-2 border-orange-200 rounded-xl text-xs font-black uppercase text-orange-600 hover:bg-orange-50 hover:border-orange-500 transition-all shadow-sm active:scale-95"
                                >
                                    Vložiť celý zostatok
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <Button type="submit" loading={settling} disabled={settling} fullWidth size="lg" className="h-12 font-bold tracking-wide shadow-xl shadow-green-100 bg-green-600 hover:bg-green-700 border-none">
                                <Check size={20}/> Potvrdiť a odpočítať
                            </Button>
                            <Button variant="secondary" disabled={settling} fullWidth onClick={() => setShowSettleModal(false)} className="h-11 sm:h-12 font-bold text-slate-400 border-none hover:text-slate-600">
                                Zrušiť
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL: HISTÓRIA SPLÁTOK */}
            {showHistoryModal && (
                <Modal title="História splácania zálohy" onClose={() => setShowHistoryModal(false)}>
                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                            <div className="flex-1 min-w-0 pr-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pôvodná záloha</p>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 truncate">{formatMoney(Number(selectedForHistory?.amount))}</h3>
                                <p className="text-xs sm:text-sm text-slate-500 font-bold truncate">{formatDate(selectedForHistory?.date)} • {selectedForHistory?.profiles?.full_name}</p>
                            </div>
                            <div className="text-right ml-auto">
                                <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">Zostatok</p>
                                <div className="text-xl sm:text-2xl font-black text-orange-600">{formatMoney(Number(selectedForHistory?.amount) - Number(selectedForHistory?.settled_amount || 0))}</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <History size={14} className="text-blue-500"/> Zoznam zúčtovaných splátok
                            </h4>
                            
                            {loadingHistory ? (
                                <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={24}/></div>
                            ) : settlements.length === 0 ? (
                                <div className="py-10 text-center text-slate-300 italic text-sm border-2 border-dashed border-slate-100 rounded-2xl">Zatiaľ neboli zaevidované žiadne splátky.</div>
                            ) : (
                                <div className="space-y-2">
                                    {settlements.map(s => (
                                        <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white p-2 rounded-lg border border-slate-200 text-blue-500 shadow-sm shrink-0"><Calendar size={14}/></div>
                                                <div className="min-w-0">
                                                    <div className="text-xs sm:text-sm font-black text-slate-800">{formatDate(s.date)}</div>
                                                    <div className="text-[8px] font-bold text-slate-400 uppercase truncate">Dňa {new Date(s.created_at).toLocaleDateString('sk-SK')}</div>
                                                </div>
                                            </div>
                                            <div className="text-sm sm:text-base font-black text-green-600 shrink-0 ml-4">-{formatMoney(s.amount)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Button fullWidth onClick={() => setShowHistoryModal(false)} variant="secondary" className="h-11 sm:h-12 font-bold">Zavrieť</Button>
                    </div>
                </Modal>
            )}

            <ConfirmModal 
                isOpen={confirm.open}
                onClose={() => setConfirm({ open: false, action: '', id: null })}
                onConfirm={() => confirm.id && deleteAdvance(confirm.id)}
                title="Zmazať záznam o zálohe?"
                message="Tento krok nie je možné vrátiť späť. Záznam bude natrvalo odstránený z histórie."
            />
        </div>
    );
};
