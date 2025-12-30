
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Badge } from '../components/UI';
import { ShieldAlert, MessageSquare, Trash2, CheckCircle2, Building2, User, Loader2, X, Mail, PhoneCall, ChevronDown } from 'lucide-react';
import { formatDate } from '../lib/utils';

const PAGE_SIZE = 20;

export const SuperAdminScreen = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [filter, setFilter] = useState<'all' | 'delete' | 'support'>('all');

    const loadRequests = async (reset = false) => {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        const from = reset ? 0 : page * PAGE_SIZE;
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

    useEffect(() => {
        setPage(0);
        loadRequests(true);
    }, [filter]);

    useEffect(() => {
        if (page > 0) loadRequests(false);
    }, [page]);

    const markAsResolved = async (id: string) => {
        try {
            // Optimistická aktualizácia v UI pre okamžitú odozvu
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
            
            const { error } = await supabase
                .from('support_requests')
                .update({ status: 'resolved' })
                .eq('id', id);
            
            if (error) throw error;
        } catch (err) {
            alert("Chyba pri aktualizácii statusu.");
            // Ak zlyhá, vrátime pôvodný stav (v tomto zjednodušenom prípade reloadom)
            loadRequests(true);
        }
    };

    const deleteRequest = async (id: string) => {
        if(!confirm("Naozaj zmazať tento záznam z histórie?")) return;
        setRequests(prev => prev.filter(r => r.id !== id));
        await supabase.from('support_requests').delete().eq('id', id);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div>
                <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                    <ShieldAlert className="text-red-600" size={32} />
                    Centrálny Management
                </h2>
                <p className="text-slate-500 font-medium mt-1 text-sm uppercase tracking-widest">Prehľad systémových požiadaviek od klientov</p>
            </div>

            <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit overflow-x-auto no-scrollbar max-w-full">
                <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition whitespace-nowrap ${filter === 'all' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Všetko</button>
                <button onClick={() => setFilter('delete')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition whitespace-nowrap ${filter === 'delete' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:bg-red-50'}`}>Zmazanie účtov</button>
                <button onClick={() => setFilter('support')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition whitespace-nowrap ${filter === 'support' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-blue-50'}`}>Technická podpora</button>
            </div>

            {loading ? (
                <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-600" size={40}/></div>
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
                                                    {isDelete ? 'ŽIADOSŤ O ZMAZANIE ÚČTU' : 'Nová správa z centra podpory'}
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
                                            
                                            {/* KONTAKTNÉ ÚDAJE PRE IVANA */}
                                            <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                                <a href={`mailto:${req.user_email || req.user_id}`} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 hover:bg-blue-100 transition">
                                                    <Mail size={16}/>
                                                    <span className="text-xs font-black truncate">{req.user_email || 'Email nie je zadaný'}</span>
                                                </a>
                                                <a href={`tel:${req.user_phone}`} className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-xl border border-green-100 hover:bg-green-100 transition">
                                                    <PhoneCall size={16}/>
                                                    <span className="text-xs font-black">{req.user_phone || 'Telefón nie je zadaný'}</span>
                                                </a>
                                            </div>

                                            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 break-all bg-slate-50 p-2 rounded col-span-full">
                                                ID Firmy: {req.organization_id}
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
                                            <X size={16}/> Odstrániť záznam
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}

                    {hasMore && (
                        <div className="pt-6 flex justify-center">
                            <Button variant="secondary" loading={loadingMore} onClick={() => setPage(p => p + 1)}>
                                <ChevronDown size={18}/> Načítať ďalšie požiadavky
                            </Button>
                        </div>
                    )}

                    {requests.length === 0 && !loading && (
                        <div className="py-20 text-center text-slate-400 italic bg-white rounded-3xl border-2 border-dashed">
                            Žiadne nové požiadavky v tejto kategórii.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
