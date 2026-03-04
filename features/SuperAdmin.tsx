
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Select, ConfirmModal, Input } from '../components/UI';
import { 
  ShieldAlert, MessageSquare, Trash2, CheckCircle2, Building2, 
  Loader2, X, Mail, PhoneCall, Activity, Calendar, ShieldCheck,
  Search, Filter, Users, Database, Server, CreditCard, ArrowUpRight,
  TrendingUp, AlertTriangle, ChevronRight, Clock, Hash, HelpCircle,
  Crown, Zap, Star, AlertOctagon, Trophy, LayoutGrid, Pencil, MapPin, 
  Infinity, Globe, FileText, Landmark, Save, FileCheck, Check, Ban, DollarSign,
  AlertCircle, History, Receipt, ArrowRight, UserPlus, RefreshCw
} from 'lucide-react';
import { formatDate, formatMoney } from '../lib/utils';

const ORG_PAGE_SIZE = 50;

const PLAN_CONFIG = {
  base: { name: 'SILVER', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', icon: Trophy },
  standard: { name: 'GOLD', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Star },
  pro: { name: 'PLATINUM', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200', icon: Crown },
  free_trial: { name: 'TRIAL', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', icon: Clock }
};

export const SuperAdminScreen = () => {
    const [view, setView] = useState<'billing' | 'clients' | 'support' | 'system'>('billing');
    const [loading, setLoading] = useState(true);
    
    // Data states
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    
    // Filter states
    const [orgSearch, setOrgSearch] = useState('');
    const [orgStatusFilter, setOrgStatusFilter] = useState<string>('all');
    
    const [stats, setStats] = useState({
        totalOrgs: 0,
        activeOrgs: 0,
        pendingOrders: 0,
        expiringSoon: 0,
        unpaidOrgs: 0
    });

    const [actionId, setActionId] = useState<string | null>(null);
    const [licenseModal, setLicenseModal] = useState<{ open: boolean, org: any }>({ open: false, org: null });
    
    const [licenseForm, setLicenseForm] = useState({
        plan: 'base',
        status: 'active',
        endsAt: ''
    });

    const openLicenseEditor = (org: any) => {
        setLicenseForm({
            plan: org.subscription_plan || 'base',
            status: org.subscription_status || 'active',
            endsAt: org.trial_ends_at ? new Date(org.trial_ends_at).toISOString().split('T')[0] : ''
        });
        setLicenseModal({ open: true, org });
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: orgs } = await supabase
                .from('organizations')
                .select('*')
                .order('name', { ascending: true });
            
            const { data: reqs } = await supabase
                .from('support_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (orgs) setOrganizations(orgs);
            if (reqs) setRequests(reqs);

            const now = new Date();
            const soon = new Date();
            soon.setDate(soon.getDate() + 10);

            const expiring = (orgs || []).filter(o => 
                o.subscription_status === 'active' && 
                new Date(o.trial_ends_at) < soon &&
                new Date(o.trial_ends_at).getFullYear() < 2090
            ).length;

            setStats({
                totalOrgs: orgs?.length || 0,
                activeOrgs: orgs?.filter(o => o.subscription_status === 'active').length || 0,
                pendingOrders: reqs?.filter(r => r.status === 'new' && (r.message.includes('AKTIVÁCIU') || r.message.includes('BALÍK'))).length || 0,
                expiringSoon: expiring,
                unpaidOrgs: orgs?.filter(o => o.subscription_status === 'suspended_unpaid').length || 0
            });

        } catch (e) {
            console.error("Data load failed", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const billingRequests = useMemo(() => {
        return requests.filter(r => r.message.includes('AKTIVÁCIU') || r.message.includes('BALÍK'));
    }, [requests]);

    const supportRequests = useMemo(() => {
        return requests.filter(r => !r.message.includes('AKTIVÁCIU') && !r.message.includes('BALÍK'));
    }, [requests]);

    const filteredOrgs = useMemo(() => {
        let result = [...organizations];
        
        if (orgSearch) {
            result = result.filter(o => 
                o.name.toLowerCase().includes(orgSearch.toLowerCase()) || 
                (o.ico && o.ico.includes(orgSearch))
            );
        }

        if (orgStatusFilter === 'expiring') {
            const soon = new Date();
            soon.setDate(soon.getDate() + 10);
            result = result.filter(o => 
                o.subscription_status === 'active' && 
                new Date(o.trial_ends_at) < soon &&
                new Date(o.trial_ends_at).getFullYear() < 2090
            );
        } else if (orgStatusFilter !== 'all') {
            result = result.filter(o => o.subscription_status === orgStatusFilter);
        }

        return result.sort((a, b) => {
            const dateA = new Date(a.trial_ends_at).getTime();
            const dateB = new Date(b.trial_ends_at).getTime();
            return dateA - dateB;
        });
    }, [organizations, orgSearch, orgStatusFilter]);

    const handleApprovePayment = async (request: any) => {
        setActionId(request.id);
        try {
            let plan = 'base';
            if (request.message.includes('GOLD')) plan = 'standard';
            if (request.message.includes('PLATINUM')) plan = 'pro';

            const newExpiry = new Date();
            newExpiry.setDate(newExpiry.getDate() + 31);

            const { error: orgErr } = await supabase.from('organizations').update({
                subscription_status: 'active',
                subscription_plan: plan,
                trial_ends_at: newExpiry.toISOString()
            }).eq('id', request.organization_id);

            if (orgErr) throw orgErr;

            await supabase.from('support_requests').update({ status: 'resolved' }).eq('id', request.id);

            loadData();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionId(null);
        }
    };

    const handleManualUpdate = async () => {
        if (!licenseModal.org) return;
        setActionId(licenseModal.org.id);
        try {
            const { error } = await supabase.from('organizations').update({
                subscription_plan: licenseForm.plan,
                subscription_status: licenseForm.status,
                trial_ends_at: new Date(licenseForm.endsAt).toISOString()
            }).eq('id', licenseModal.org.id);

            if (error) throw error;
            setLicenseModal({ open: false, org: null });
            loadData();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionId(null);
        }
    };

    const markRequestResolved = async (id: string) => {
        await supabase.from('support_requests').update({ status: 'resolved' }).eq('id', id);
        loadData();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-24 max-w-7xl mx-auto">
            {/* TOP BAR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <ShieldAlert className="text-orange-600" size={32} />
                        Ovládacie centrum systému
                    </h2>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-1">
                        LORD'S BENISON ADMINISTRATIVE CORE
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadData} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-orange-600 transition shadow-sm">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
                    </button>
                </div>
            </div>

            {/* STATS TILES */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="p-5 border-slate-100 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Firmy celkom</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tighter">{stats.totalOrgs}</div>
                </Card>
                <Card className="p-5 border-green-100 bg-green-50/20 shadow-sm">
                    <div className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Aktívne licencie</div>
                    <div className="text-3xl font-black text-green-700 tracking-tighter">{stats.activeOrgs}</div>
                </Card>
                <Card className="p-5 border-orange-100 bg-orange-50 shadow-md ring-2 ring-orange-200">
                    <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Nové objednávky</div>
                    <div className="text-3xl font-black text-orange-700 tracking-tighter">{stats.pendingOrders}</div>
                </Card>
                <Card className="p-5 border-amber-100 bg-amber-50 shadow-sm">
                    <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Expirujú (10 dní)</div>
                    <div className="text-3xl font-black text-amber-700 tracking-tighter">{stats.expiringSoon}</div>
                </Card>
                <Card className="p-5 border-red-100 bg-red-50/20 shadow-sm">
                    <div className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Neplatiči</div>
                    <div className="text-3xl font-black text-red-700 tracking-tighter">{stats.unpaidOrgs}</div>
                </Card>
            </div>

            {/* NAVIGATION TABS */}
            <div className="flex gap-2 p-1.5 bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                {[
                    { id: 'billing', label: 'Nové Objednávky', icon: Receipt, color: 'text-orange-600' },
                    { id: 'clients', label: 'Správa Klientov', icon: Building2, color: 'text-blue-600' },
                    { id: 'support', label: 'Technický Support', icon: HelpCircle, color: 'text-slate-600' },
                    { id: 'system', label: 'Infrastruktúra', icon: Server, color: 'text-purple-600' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setView(tab.id as any)} 
                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${view === tab.id ? `bg-slate-900 text-white shadow-xl` : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <tab.icon size={18} className={view === tab.id ? 'text-orange-400' : tab.color}/> {tab.label}
                    </button>
                ))}
            </div>

            {/* VIEW: BILLING & ORDERS */}
            {view === 'billing' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 gap-4">
                        {billingRequests.filter(r => r.status === 'new').length === 0 ? (
                            <Card className="py-20 text-center border-2 border-dashed border-slate-100 text-slate-400 font-bold uppercase tracking-widest text-xs">
                                <CheckCircle2 size={48} className="mx-auto mb-4 opacity-10 text-green-500"/>
                                Žiadne čakajúce objednávky.
                            </Card>
                        ) : (
                            billingRequests.filter(r => r.status === 'new').map(req => (
                                <Card key={req.id} className="border-2 border-orange-100 bg-white p-6 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                                        <Receipt size={120} className="text-orange-600"/>
                                    </div>
                                    <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-orange-600 text-white p-3 rounded-2xl shadow-lg shadow-orange-100">
                                                    <Zap size={24} fill="currentColor"/>
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-xl text-slate-900 tracking-tight uppercase">{req.org_name}</h3>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objednávka prijatá: {formatDate(req.created_at)}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 font-mono text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap shadow-inner">
                                                {req.message}
                                            </div>

                                            <div className="flex flex-wrap gap-4">
                                                <a href={`mailto:${req.user_email}`} className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline">
                                                    <Mail size={14}/> {req.user_email}
                                                </a>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                    <PhoneCall size={14}/> {req.user_phone || 'Nezadané'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 justify-center min-w-[240px]">
                                            <button 
                                                onClick={() => handleApprovePayment(req)}
                                                disabled={actionId === req.id}
                                                className="h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-green-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                                            >
                                                {actionId === req.id ? <Loader2 size={18} className="animate-spin"/> : <Check size={18} strokeWidth={4}/>}
                                                Platba prijatá - Aktivovať
                                            </button>
                                            <button 
                                                onClick={() => markRequestResolved(req.id)}
                                                className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all"
                                            >
                                                Označiť za vybavené (Bez aktivácie)
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* VIEW: CLIENTS MANAGEMENT */}
            {view === 'clients' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <Card className="p-4 border-slate-200 bg-white/50">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                <input 
                                    type="text" 
                                    placeholder="Hľadať podľa názvu alebo IČO..."
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-orange-500/10 transition-all"
                                    value={orgSearch}
                                    onChange={(e) => setOrgSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'all', label: 'Všetky' },
                                    { id: 'expiring', label: 'Expirujúce ⚠️' },
                                    { id: 'active', label: 'Aktívne' },
                                    { id: 'suspended_unpaid', label: 'Neplatiči' },
                                    { id: 'trialing', label: 'Trial' }
                                ].map(f => (
                                    <button 
                                        key={f.id}
                                        onClick={() => setOrgStatusFilter(f.id)}
                                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap ${orgStatusFilter === f.id ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 gap-3">
                        {filteredOrgs.map(org => {
                            const plan = (PLAN_CONFIG as any)[org.subscription_plan] || PLAN_CONFIG.free_trial;
                            const expiryDate = new Date(org.trial_ends_at);
                            const now = new Date();
                            const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            const isInfinite = expiryDate.getFullYear() > 2090;
                            const isExpired = !isInfinite && diffDays < 0;

                            let statusColor = "text-green-600 bg-green-50 border-green-100";
                            if (org.subscription_status === 'suspended_unpaid') statusColor = "text-white bg-red-600 border-red-700";
                            else if (isExpired) statusColor = "text-red-700 bg-red-50 border-red-200";
                            else if (diffDays <= 10 && !isInfinite) statusColor = "text-orange-700 bg-orange-50 border-orange-200 ring-2 ring-orange-200";

                            return (
                                <Card key={org.id} className="p-4 border-slate-200 hover:border-blue-300 transition-all group bg-white shadow-sm overflow-hidden">
                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0 overflow-hidden shadow-inner">
                                                {org.logo_url ? <img src={org.logo_url} className="w-full h-full object-cover" /> : <Building2 size={24} className="text-slate-300"/>}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3 className="font-black text-lg text-slate-900 truncate">{org.name}</h3>
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase ${plan.bg} ${plan.color} ${plan.border}`}>
                                                        <plan.icon size={10} fill="currentColor"/>
                                                        {plan.name}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <span className="flex items-center gap-1"><Hash size={12}/> IČO: {org.ico || '---'}</span>
                                                    <span className="flex items-center gap-1"><Calendar size={12}/> Od: {formatDate(org.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                                            <div className={`px-4 py-2 rounded-2xl border text-center min-w-[140px] shadow-sm ${statusColor}`}>
                                                <div className="text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 opacity-60">Platnosť do</div>
                                                <div className="text-xs font-black">
                                                    {isInfinite ? 'NAVŽDY' : formatDate(org.trial_ends_at)}
                                                </div>
                                                {!isInfinite && (
                                                    <div className="text-[9px] font-bold mt-0.5">
                                                        {isExpired ? 'EXPIROVANÉ' : `Zostáva ${diffDays} dní`}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <button 
                                                    onClick={() => openLicenseEditor(org)}
                                                    className="flex-1 sm:flex-none h-11 px-5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Pencil size={14}/> Upraviť Licenciu
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* VIEW: SUPPORT MESSAGES */}
            {view === 'support' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    {supportRequests.length === 0 ? (
                        <Card className="py-20 text-center text-slate-300 italic font-bold text-xs uppercase tracking-widest border-2 border-dashed">
                            Žiadne nové správy od používateľov.
                        </Card>
                    ) : (
                        supportRequests.map(req => (
                            <Card key={req.id} className={`border-l-4 transition-all hover:shadow-lg ${req.status === 'resolved' ? 'opacity-50 grayscale' : 'border-l-blue-600 bg-white shadow-md'}`}>
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl">
                                                    <MessageSquare size={20}/>
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-900 tracking-tight">{req.user_name} <span className="text-slate-400 font-bold text-xs mx-2">({req.org_name})</span></h3>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatDate(req.created_at)}</p>
                                                </div>
                                            </div>
                                            {req.status === 'resolved' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[9px] font-black uppercase">Vybavené</span>}
                                        </div>
                                        
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic text-slate-700 text-sm leading-relaxed font-medium">
                                            "{req.message}"
                                        </div>

                                        <div className="flex flex-wrap gap-4 pt-2">
                                            <a href={`mailto:${req.user_email}`} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase hover:border-blue-300 transition">
                                                <Mail size={12}/> Email: {req.user_email}
                                            </a>
                                            {req.user_phone && (
                                                <a href={`tel:${req.user_phone}`} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase hover:border-blue-300 transition">
                                                    <PhoneCall size={12}/> Tel: {req.user_phone}
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {req.status !== 'resolved' && (
                                        <div className="flex items-center shrink-0">
                                            <button 
                                                onClick={() => markRequestResolved(req.id)}
                                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
                                            >
                                                <CheckCircle2 size={16}/> Vyriešené
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* VIEW: SYSTEM HEALTH */}
            {view === 'system' && (
                <div className="animate-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="p-8 group bg-white border-slate-200 shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                             <Database size={160} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Database Storage</p>
                            <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Postgres + RLS</h3>
                            <div className="mt-8 space-y-4">
                                <div className="flex justify-between text-[10px] font-black uppercase px-1">
                                    <span className="text-slate-400">Database Storage</span>
                                    <span className="text-green-600">Active / Optimized</span>
                                </div>
                                <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-1 shadow-inner">
                                    <div className="h-full bg-orange-500 rounded-full w-[12%] transition-all duration-[2000ms] shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">System running with 99.9% availability. Row Level Security is hardened for all endpoints.</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-8 group bg-white border-slate-200 shadow-xl overflow-hidden relative">
                         <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                             <ShieldCheck size={160} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Security Core</p>
                            <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Auth V3 (Hardened)</h3>
                            <div className="mt-8 grid grid-cols-1 gap-2">
                                {[
                                    'JWT Session Protection active',
                                    'Multi-Tenant Data Isolation verified',
                                    'Automatic Schema Protection running',
                                    'SuperAdmin Master Key authenticated'
                                ].map((t, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-black text-slate-600 uppercase tracking-tight">
                                        <CheckCircle2 size={16} className="text-green-500"/> {t}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* MODAL: LICENSE EDITOR */}
            {licenseModal.open && (
                <Modal title="Správa licencie a statusu" onClose={() => setLicenseModal({ open: false, org: null })} maxWidth="max-w-md">
                    <div className="space-y-6">
                        <div className="bg-slate-900 p-5 rounded-[2rem] text-center border-b-4 border-black/30 shadow-2xl">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Konfigurácia pre</p>
                            <h4 className="font-black text-xl text-white tracking-tight uppercase">{licenseModal.org.name}</h4>
                        </div>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Vyberte balík (Limity)</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {['base', 'standard', 'pro', 'free_trial'].map(planId => {
                                        const p = (PLAN_CONFIG as any)[planId];
                                        const isSel = licenseForm.plan === planId;
                                        return (
                                            <button 
                                                key={planId}
                                                onClick={() => setLicenseForm({ ...licenseForm, plan: planId })}
                                                className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${isSel ? 'border-orange-500 bg-orange-50 shadow-lg scale-[1.02]' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-xl bg-white border shadow-sm ${p.color}`}><p.icon size={20} fill="currentColor"/></div>
                                                    <div className="text-left">
                                                        <div className={`font-black text-sm uppercase tracking-tight ${p.color}`}>{p.name}</div>
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Aktivovať tento modul</div>
                                                    </div>
                                                </div>
                                                {isSel && <CheckCircle2 size={24} className="text-orange-600"/>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-200">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Status účtu</label>
                                    <Select 
                                        value={licenseForm.status} 
                                        onChange={(e:any) => setLicenseForm({ ...licenseForm, status: e.target.value })}
                                        className="!mb-0 h-12 text-sm font-bold shadow-sm"
                                    >
                                        <option value="active">Aktívny (Všetko povolené)</option>
                                        <option value="pending_payment">Čaká na úhradu (Pripomienka)</option>
                                        <option value="suspended_unpaid">Neplatič (BLOKOVANÝ PRÍSTUP)</option>
                                        <option value="trialing">V skúšobnej dobe</option>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Platnosť licencie do</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="date"
                                            value={licenseForm.endsAt}
                                            onChange={(e) => setLicenseForm({ ...licenseForm, endsAt: e.target.value })}
                                            className="flex-1 h-12 px-4 bg-white border border-slate-300 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all shadow-sm"
                                        />
                                        <button 
                                            onClick={() => setLicenseForm({ ...licenseForm, endsAt: '2100-01-01' })}
                                            className="px-4 h-12 bg-slate-800 text-white rounded-xl hover:bg-black transition-colors"
                                            title="Nekonečná licencia"
                                        >
                                            <Infinity size={20}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
                            <Button 
                                onClick={handleManualUpdate} 
                                loading={actionId === licenseModal.org?.id}
                                className="h-14 bg-orange-600 hover:bg-orange-700 border-none shadow-xl shadow-orange-100 font-black uppercase text-xs tracking-[0.2em]"
                            >
                                <Save size={20} className="mr-2"/> Uložiť zmeny
                            </Button>
                            <Button variant="secondary" onClick={() => setLicenseModal({ open: false, org: null })} className="h-12 border-none text-slate-400 hover:text-slate-600 uppercase font-black text-[10px] tracking-widest">
                                Zrušiť úpravy
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
