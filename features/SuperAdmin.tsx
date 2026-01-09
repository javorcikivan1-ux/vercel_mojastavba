
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Badge } from '../components/UI';
import { 
  ShieldAlert, MessageSquare, Trash2, CheckCircle2, Building2, User, 
  Loader2, X, Mail, PhoneCall, ChevronDown, Database, HardDrive, 
  Users, Activity, RefreshCw, AlertTriangle, BarChart3, Info, ArrowUpRight, Server
} from 'lucide-react';
import { formatDate, formatMoney } from '../lib/utils';

const PAGE_SIZE = 20;

// Limity pre výpočet percent (Supabase Free Tier)
const LIMITS = {
    DB: 500, // MB
    STORAGE: 1000, // MB
};

export const SuperAdminScreen = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [filter, setFilter] = useState<'all' | 'delete' | 'support' | 'system'>('all');

    const [systemStats, setSystemStats] = useState({
        dbSize: 0, 
        storageSize: 0, 
        totalUsers: 0,
        totalOrganizations: 0
    });

    const loadRequests = async (reset = false) => {
        if (filter === 'system') {
            await loadSystemStats();
            return;
        }

        if (reset) {
            setLoading(true);
            setPage(0);
        } else {
            setLoadingMore(true);
        }

        const currentPage = reset ? 0 : page;
        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
            .from('support_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, to);

        if (filter === 'delete') {
            query = query.ilike('message', '%ZMAZANIE%');
        } else if (filter === 'support') {
            query = query.not('message', 'ilike', '%ZMAZANIE%');
        }
        
        const { data, error } = await query;
        
        if (error) console.error(error);
        if (data) {
            setRequests(prev => reset ? data : [...prev, ...data]);
            setHasMore(data.length === PAGE_SIZE);
        }
        setLoading(false);
        setLoadingMore(false);
    };

    const loadSystemStats = async () => {
        setLoading(true);
        try {
            // Odhad DB podľa riadkov
            const tables = ['attendance_logs', 'tasks', 'profiles', 'organizations', 'sites', 'advances', 'support_requests'];
            const counts = await Promise.all(tables.map(async (table) => {
                const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
                return count || 0;
            }));

            const totalRows = counts.reduce((acc, curr) => acc + curr, 0);
            const estimatedDbMb = (totalRows * 350) / (1024 * 1024);

            // Storage (fotky)
            const { data: avatarFiles } = await supabase.storage.from('diary-photos').list('photos/avatars');
            const avatarsSize = (avatarFiles || []).reduce((acc, file) => acc + (file.metadata?.size || 0), 0);
            
            const { count: orgCount } = await supabase.from('organizations').select('*', { count: 'exact', head: true });
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            setSystemStats({
                dbSize: estimatedDbMb,
                storageSize: avatarsSize / (1024 * 1024),
                totalUsers: userCount || 0,
                totalOrganizations: orgCount || 0
            });
        } catch (err) {
            console.error("Monitoring error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests(true);
    }, [filter]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        // Musíme použiť timeout alebo useEffect aby sme počkali na update setPage ak nepoužijeme funkcionálny update
    };

    // Sledovanie zmeny strany pre lazy loading
    useEffect(() => {
        if (page > 0 && filter !== 'system') {
            loadRequests(false);
        }
    }, [page]);

    const markAsResolved = async (id: string) => {
        try {
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
            await supabase.from('support_requests').update({ status: 'resolved' }).eq('id', id);
        } catch (err) {
            console.error(err);
        }
    };

    const deleteRequest = async (id: string) => {
        if(!confirm("Zmazať záznam?")) return;
        setRequests(prev => prev.filter(r => r.id !== id));
        await supabase.from('support_requests').delete().eq('id', id);
    };

    const getProgressColor = (val: number, limit: number) => {
        const pct = (val / limit) * 100;
        if (pct > 90) return 'bg-red-500';
        if (pct > 70) return 'bg-orange-500';
        return 'bg-blue-500';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <ShieldAlert className="text-red-600" size={32} />
                        SuperAdmin Panel
                    </h2>
                    <p className="text-slate-500 font-medium mt-1 text-sm uppercase tracking-widest">Prehľad požiadaviek a stavu systému MojaStavba</p>
                </div>
            </div>

            {/* Hlavná navigácia - 4 bunky */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <button 
                    onClick={() => setFilter('all')} 
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition whitespace-nowrap flex items-center gap-2 ${filter === 'all' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <MessageSquare size={14}/> Všetko
                </button>
                <button 
                    onClick={() => setFilter('delete')} 
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition whitespace-nowrap flex items-center gap-2 ${filter === 'delete' ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <Trash2 size={14}/> Zmazanie účtov
                </button>
                <button 
                    onClick={() => setFilter('support')} 
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition whitespace-nowrap flex items-center gap-2 ${filter === 'support' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <Mail size={14}/> Podpora
                </button>
                <button 
                    onClick={() => setFilter('system')} 
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition whitespace-nowrap flex items-center gap-2 ${filter === 'system' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <Server size={14}/> Infraštruktúra
                </button>
            </div>

            {loading && filter !== 'system' ? (
                <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-600" size={40}/></div>
            ) : filter === 'system' ? (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    {/* INFRA ŠTATISTIKY */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-8 border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">SQL Databáza</p>
                                    <h3 className="text-2xl font-black text-slate-800">{systemStats.dbSize.toFixed(1)} MB</h3>
                                </div>
                                <Database className="text-blue-100" size={40} />
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${getProgressColor(systemStats.dbSize, LIMITS.DB)}`}
                                        style={{ width: `${Math.min(100, (systemStats.dbSize / LIMITS.DB) * 100)}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                    <span>Využité: {((systemStats.dbSize / LIMITS.DB) * 100).toFixed(1)}%</span>
                                    <span>Limit: {LIMITS.DB} MB</span>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Úložisko fotiek</p>
                                    <h3 className="text-2xl font-black text-slate-800">{systemStats.storageSize.toFixed(1)} MB</h3>
                                </div>
                                <HardDrive className="text-emerald-100" size={40} />
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${getProgressColor(systemStats.storageSize, LIMITS.STORAGE)}`}
                                        style={{ width: `${Math.min(100, (systemStats.storageSize / LIMITS.STORAGE) * 100)}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                    <span>Využité: {((systemStats.storageSize / LIMITS.STORAGE) * 100).toFixed(1)}%</span>
                                    <span>Limit: 1 GB</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* JEMNEJŠIE KARTY PRE UŽÍVATEĽOV */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 transition hover:border-blue-200">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                <Users size={28}/>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registrovaní Užívatelia</p>
                                <p className="text-2xl font-black text-slate-800">{systemStats.totalUsers.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 transition hover:border-orange-200">
                            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                                <Building2 size={28}/>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktívne Firmy</p>
                                <p className="text-2xl font-black text-slate-800">{systemStats.totalOrganizations.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-4">
                         <button onClick={loadSystemStats} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-orange-600 transition">
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Prepočítať aktuálny stav
                         </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {requests.map(req => {
                        const isDelete = req.message.includes('ZMAZANIE');
                        return (
                            <Card key={req.id} className={`border-l-4 transition hover:shadow-md ${req.status === 'resolved' ? 'opacity-50 grayscale border-l-slate-300' : isDelete ? 'border-l-red-600 bg-red-50/10' : 'border-l-blue-600'}`}>
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isDelete ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {isDelete ? <Trash2 size={20}/> : <MessageSquare size={20}/>}
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{formatDate(req.created_at)}</div>
                                                <h3 className={`font-black text-lg ${isDelete ? 'text-red-700' : 'text-slate-800'}`}>
                                                    {isDelete ? 'ŽIADOSŤ O ZMAZANIE ÚČTU' : 'Nová správa z podpory'}
                                                </h3>
                                            </div>
                                            {req.status === 'resolved' && <Badge status="completed" />}
                                        </div>

                                        <div className="bg-white p-4 rounded-xl border border-slate-200 italic text-slate-700 leading-relaxed font-medium shadow-inner whitespace-pre-wrap">
                                            "{req.message}"
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Building2 size={16} className="text-slate-400"/>
                                                <span className="font-bold">Firma:</span> {req.org_name}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <User size={16} className="text-slate-400"/>
                                                <span className="font-bold">Odoslal:</span> {req.user_name}
                                            </div>
                                            <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                                <a href={`mailto:${req.user_email || req.user_id}`} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 hover:bg-blue-100 transition">
                                                    <Mail size={16}/>
                                                    <span className="text-[10px] font-black truncate">{req.user_email || 'Email nie je zadaný'}</span>
                                                </a>
                                                <a href={`tel:${req.user_phone}`} className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-xl border border-green-100 hover:bg-green-100 transition">
                                                    <PhoneCall size={16}/>
                                                    <span className="text-[10px] font-black">{req.user_phone || 'Telefón nie je zadaný'}</span>
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex md:flex-col gap-2 justify-end">
                                        {req.status !== 'resolved' && (
                                            <Button onClick={() => markAsResolved(req.id)} className="bg-green-600 text-white border-none hover:bg-green-700 shadow-green-100">
                                                <CheckCircle2 size={16}/> Vyriešené
                                            </Button>
                                        )}
                                        <Button variant="secondary" onClick={() => deleteRequest(req.id)} className="text-slate-400 hover:text-red-600">
                                            <X size={16}/> Odstrániť
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}

                    {hasMore && requests.length > 0 && (
                        <div className="pt-8 flex justify-center">
                            <Button variant="secondary" loading={loadingMore} onClick={handleLoadMore} className="min-w-[200px] border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest">
                                <ChevronDown size={18}/> Načítať ďalšie záznamy
                            </Button>
                        </div>
                    )}

                    {requests.length === 0 && !loading && (
                        <div className="text-center py-24 text-slate-300 font-bold uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-3xl">
                            Žiadne požiadavky
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
