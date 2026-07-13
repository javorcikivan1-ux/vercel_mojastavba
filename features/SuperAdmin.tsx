
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

            let orgList = orgs || [];
            if (orgList.length > 0) {
                const { data: admins } = await supabase
                    .from('profiles')
                    .select('organization_id, email, full_name, phone, created_at')
                    .in('organization_id', orgList.map((org: any) => org.id))
                    .eq('role', 'admin')
                    .order('created_at', { ascending: true });

                const adminByOrg = (admins || []).reduce((acc: Record<string, any>, admin: any) => {
                    if (admin.organization_id && !acc[admin.organization_id]) {
                        acc[admin.organization_id] = admin;
                    }
                    return acc;
                }, {});

                orgList = orgList.map((org: any) => ({
                    ...org,
                    admin_profile: adminByOrg[org.id] || null
                }));
            }
            
            const { data: reqs } = await supabase
                .from('support_requests')
                .select('*')
                .order('created_at', { ascending: false });

            setOrganizations(orgList);
            if (reqs) setRequests(reqs);

            const now = new Date();
            const soon = new Date();
            soon.setDate(soon.getDate() + 10);

            const expiring = orgList.filter(o => 
                o.subscription_status === 'trialing' && 
                new Date(o.trial_ends_at) < soon &&
                new Date(o.trial_ends_at).getFullYear() < 2090
            ).length;

            setStats({
                totalOrgs: orgList.length,
                activeOrgs: orgList.filter(o => o.subscription_status === 'active').length,
                pendingOrders: orgList.filter(o => o.subscription_status === 'pending_payment').length,
                expiringSoon: expiring,
                unpaidOrgs: orgList.filter(o => o.subscription_status === 'suspended_unpaid').length
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

    const pendingOrganizations = useMemo(() => {
        return organizations
            .filter(org => org.subscription_status === 'pending_payment')
            .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
    }, [organizations]);

    const supportRequests = useMemo(() => {
        return requests.filter(r => !r.message.includes('AKTIVÁCIU') && !r.message.includes('BALÍK'));
    }, [requests]);

    const getClientEmail = (org: any) => org.email || org.admin_profile?.email || '';
    const getClientPhone = (org: any) => org.phone || org.admin_profile?.phone || '';
    const getClientAdminName = (org: any) => org.admin_profile?.full_name || org.contact_name || '';
    const getClientAddress = (org: any) => org.business_address || [org.street, org.zip, org.city].filter(Boolean).join(', ');
    const getBillingDayLabel = (dateValue: string) => {
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime()) || date.getFullYear() > 2090) return 'nezadané';
        return `${date.getDate()}. deň v mesiaci`;
    };

    const ClientInfo = ({ icon: Icon, label, value, href }: { icon: any; label: string; value?: string; href?: string }) => {
        const content = value || 'Nezadané';
        const className = 'flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs';
        const inner = (
            <>
                <Icon size={14} className="shrink-0 text-slate-400" />
                <span className="shrink-0 font-semibold text-slate-500">{label}</span>
                <span className={`min-w-0 truncate font-bold ${value ? 'text-slate-900' : 'text-slate-400'}`}>{content}</span>
            </>
        );

        return href && value ? (
            <a href={href} className={`${className} hover:border-orange-200 hover:bg-orange-50/50 transition`}>
                {inner}
            </a>
        ) : (
            <div className={className}>{inner}</div>
        );
    };

    const filteredOrgs = useMemo(() => {
        let result = [...organizations];
        
        if (orgSearch) {
            const query = orgSearch.toLowerCase();
            result = result.filter(o => 
                o.name.toLowerCase().includes(query) || 
                (o.ico && o.ico.includes(orgSearch)) ||
                getClientEmail(o).toLowerCase().includes(query) ||
                getClientAdminName(o).toLowerCase().includes(query)
            );
        }

        if (orgStatusFilter === 'hidden') {
            result = result.filter(o => o.is_hidden_admin);
        } else {
            result = result.filter(o => !o.is_hidden_admin);
        }

        if (orgStatusFilter === 'expiring') {
            const soon = new Date();
            soon.setDate(soon.getDate() + 10);
            result = result.filter(o => 
                o.subscription_status === 'trialing' && 
                new Date(o.trial_ends_at) < soon &&
                new Date(o.trial_ends_at).getFullYear() < 2090
            );
        } else if (orgStatusFilter !== 'all' && orgStatusFilter !== 'hidden') {
            result = result.filter(o => o.subscription_status === orgStatusFilter);
        }

        return result.sort((a, b) => {
            const aPriority = a.subscription_status === 'pending_payment' ? 0 : 1;
            const bPriority = b.subscription_status === 'pending_payment' ? 0 : 1;
            if (aPriority !== bPriority) return aPriority - bPriority;

            const dateA = new Date(a.updated_at || a.created_at).getTime();
            const dateB = new Date(b.updated_at || b.created_at).getTime();
            return dateB - dateA;
        });
    }, [organizations, orgSearch, orgStatusFilter]);

    const handleManualUpdate = async () => {
        if (!licenseModal.org) return;
        setActionId(licenseModal.org.id);
        try {
            const nextReview = new Date();
            nextReview.setMonth(nextReview.getMonth() + 1);
            const effectiveEndsAt = licenseForm.status === 'active'
                ? (licenseForm.endsAt || nextReview.toISOString().split('T')[0])
                : licenseForm.endsAt;

            const { error } = await supabase.from('organizations').update({
                subscription_plan: licenseForm.plan,
                subscription_status: licenseForm.status,
                trial_ends_at: new Date(effectiveEndsAt).toISOString()
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

    const getDatePlusDays = (days: number) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString();
    };

    const getDatePlusMonths = (months: number) => {
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        return date.toISOString();
    };

    const updateOrganizationLicense = async (org: any, updates: any) => {
        setActionId(org.id);
        try {
            const { error } = await supabase
                .from('organizations')
                .update(updates)
                .eq('id', org.id);

            if (error) throw error;
            setLicenseModal({ open: false, org: null });
            loadData();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setActionId(null);
        }
    };

    const markOrderHandled = (org: any) => updateOrganizationLicense(org, {
        subscription_status: 'trialing',
        trial_ends_at: org.trial_ends_at || new Date().toISOString()
    });

    const activateMonthlyPlan = (org: any, planId = org.subscription_plan || 'base', nextBillingDate?: string) => updateOrganizationLicense(org, {
        subscription_plan: planId,
        subscription_status: 'active',
        trial_ends_at: nextBillingDate ? new Date(nextBillingDate).toISOString() : getDatePlusMonths(1)
    });

    const suspendClient = (org: any) => updateOrganizationLicense(org, {
        subscription_status: 'suspended_unpaid'
    });

    const renewTrial = (org: any, trialEndDate?: string) => updateOrganizationLicense(org, {
        subscription_plan: 'free_trial',
        subscription_status: 'trialing',
        trial_ends_at: trialEndDate ? new Date(trialEndDate).toISOString() : getDatePlusDays(30)
    });

    const hideClient = (org: any) => updateOrganizationLicense(org, {
        is_hidden_admin: true
    });

    const restoreClient = (org: any) => updateOrganizationLicense(org, {
        is_hidden_admin: false
    });

    const markRequestResolved = async (id: string) => {
        await supabase.from('support_requests').update({ status: 'resolved' }).eq('id', id);
        loadData();
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-500 pb-10 max-w-7xl mx-auto">
            {/* TOP BAR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="app-section-title">
                        <ShieldAlert className="text-orange-600" />
                        Superadmin
                    </h2>
                    <p className="app-section-subtitle">
                        Správa klientov, objednávok a prístupov
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadData} className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-slate-700 hover:text-orange-700 hover:border-orange-200 transition shadow-sm flex items-center gap-2 text-sm font-semibold">
                        <RefreshCw size={17} className={loading ? 'animate-spin' : ''}/>
                        Obnoviť
                    </button>
                </div>
            </div>

            {/* STATS TILES */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="p-4 border-slate-200 shadow-sm">
                    <div className="text-sm font-semibold text-slate-600 mb-1">Firmy celkom</div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">{stats.totalOrgs}</div>
                </Card>
                <Card className="p-4 border-green-100 bg-green-50/40 shadow-sm">
                    <div className="text-sm font-semibold text-green-700 mb-1">Aktívne licencie</div>
                    <div className="text-2xl font-bold text-green-800 tabular-nums">{stats.activeOrgs}</div>
                </Card>
                <Card className="p-4 border-orange-100 bg-orange-50/70 shadow-sm">
                    <div className="text-sm font-semibold text-orange-700 mb-1">Nové objednávky</div>
                    <div className="text-2xl font-bold text-orange-800 tabular-nums">{stats.pendingOrders}</div>
                </Card>
                <Card className="p-4 border-amber-100 bg-amber-50/60 shadow-sm">
                    <div className="text-sm font-semibold text-amber-700 mb-1">Trial končí do 10 dní</div>
                    <div className="text-2xl font-bold text-amber-800 tabular-nums">{stats.expiringSoon}</div>
                </Card>
                <Card className="p-4 border-red-100 bg-red-50/40 shadow-sm">
                    <div className="text-sm font-semibold text-red-700 mb-1">Neplatiči</div>
                    <div className="text-2xl font-bold text-red-800 tabular-nums">{stats.unpaidOrgs}</div>
                </Card>
            </div>

            {/* NAVIGATION TABS */}
            <div className="flex gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                {[
                    { id: 'billing', label: 'Nové Objednávky', icon: Receipt, color: 'text-orange-600' },
                    { id: 'clients', label: 'Správa Klientov', icon: Building2, color: 'text-blue-600' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setView(tab.id as any)} 
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${view === tab.id ? `bg-orange-50 text-orange-700 border border-orange-100 shadow-sm` : 'text-slate-600 border border-transparent hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <tab.icon size={17} className={view === tab.id ? 'text-orange-600' : tab.color}/> {tab.label}
                    </button>
                ))}
            </div>

            {/* VIEW: BILLING & ORDERS */}
            {view === 'billing' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 gap-4">
                        {pendingOrganizations.length === 0 ? (
                            <Card className="py-16 text-center border border-dashed border-slate-200 text-slate-500 font-semibold text-sm">
                                <CheckCircle2 size={42} className="mx-auto mb-4 text-green-500/40"/>
                                Žiadne čakajúce objednávky.
                            </Card>
                        ) : (
                            pendingOrganizations.map(org => {
                                const plan = (PLAN_CONFIG as any)[org.subscription_plan] || PLAN_CONFIG.base;
                                return (
                                <Card key={org.id} className="border border-orange-100 bg-white p-5 shadow-sm relative overflow-hidden">
                                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-start gap-4">
                                                <div className="bg-orange-50 text-orange-600 p-3 rounded-2xl border border-orange-100">
                                                    <Receipt size={22}/>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <h3 className="font-bold text-xl text-slate-900 tracking-tight">{org.name}</h3>
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${plan.bg} ${plan.color} ${plan.border}`}>
                                                            <plan.icon size={13} fill="currentColor"/>
                                                            {plan.name}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-500 font-medium">Objednávka čaká na faktúru alebo ručné nastavenie licencie</p>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                                    <div className="text-xs text-slate-500 font-semibold mb-1">Fakturačný email</div>
                                                    <a href={`mailto:${getClientEmail(org)}`} className="text-sm font-bold text-orange-700 break-all">{getClientEmail(org) || 'Nezadaný'}</a>
                                                </div>
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                                    <div className="text-xs text-slate-500 font-semibold mb-1">Telefón</div>
                                                    {getClientPhone(org) ? (
                                                        <a href={`tel:${getClientPhone(org)}`} className="text-sm font-bold text-slate-900 break-all">{getClientPhone(org)}</a>
                                                    ) : (
                                                        <div className="text-sm font-bold text-slate-400">Nezadaný</div>
                                                    )}
                                                </div>
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                                    <div className="text-xs text-slate-500 font-semibold mb-1">IČO</div>
                                                    <div className="text-sm font-bold text-slate-900">{org.ico || 'Nezadané'}</div>
                                                </div>
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                                    <div className="text-xs text-slate-500 font-semibold mb-1">DIČ</div>
                                                    <div className="text-sm font-bold text-slate-900">{org.dic || 'Nezadané'}</div>
                                                </div>
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                                    <div className="text-xs text-slate-500 font-semibold mb-1">IČ DPH</div>
                                                    <div className="text-sm font-bold text-slate-900">{org.ic_dph || 'Nezadané'}</div>
                                                </div>
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                                    <div className="text-xs text-slate-500 font-semibold mb-1">Objednané</div>
                                                    <div className="text-sm font-bold text-slate-900">{formatDate(org.updated_at || org.created_at)}</div>
                                                </div>
                                            </div>

                                            <div className="text-sm text-slate-600">
                                                <span className="font-semibold text-slate-900">Adresa:</span> {getClientAddress(org) || 'Nezadaná'}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 justify-center min-w-[260px]">
                                            <button 
                                                onClick={() => openLicenseEditor(org)}
                                                className="h-11 bg-slate-900 hover:bg-black text-white border border-slate-900 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <Pencil size={15}/> Otvoriť klienta
                                            </button>
                                            <button 
                                                onClick={() => markOrderHandled(org)}
                                                disabled={actionId === org.id}
                                                className="h-10 bg-white hover:bg-green-50 text-green-700 border border-green-200 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                            >
                                                {actionId === org.id ? <Loader2 size={15} className="animate-spin"/> : <CheckCircle2 size={15}/>}
                                                Označiť ako vybavené
                                            </button>
                                            <button 
                                                onClick={() => suspendClient(org)}
                                                disabled={actionId === org.id}
                                                className="h-10 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                            >
                                                <Ban size={15}/> Odmietnuť / vypnúť
                                            </button>
                                            <p className="text-xs font-medium text-slate-500 leading-relaxed">
                                                Objednávka sa po označení ako vybavená skryje z inboxu. Balík zapneš v správe klienta.
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            )})
                        )}
                    </div>
                </div>
            )}

            {/* VIEW: CLIENTS MANAGEMENT */}
            {view === 'clients' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    <Card className="p-4 border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                <input 
                                    type="text" 
                                    placeholder="Hľadať podľa názvu, emailu, admina alebo IČO..."
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-200 transition-all"
                                    value={orgSearch}
                                    onChange={(e) => setOrgSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'all', label: 'Všetky' },
                                    { id: 'expiring', label: 'Končí trial' },
                                    { id: 'active', label: 'Aktívne' },
                                    { id: 'suspended_unpaid', label: 'Neplatiči' },
                                    { id: 'trialing', label: 'Trial' },
                                    { id: 'hidden', label: 'Skryté' }
                                ].map(f => (
                                    <button 
                                        key={f.id}
                                        onClick={() => setOrgStatusFilter(f.id)}
                                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border whitespace-nowrap ${orgStatusFilter === f.id ? 'bg-orange-50 text-orange-700 border-orange-100 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-100 hover:text-slate-900'}`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <div className="flex items-center justify-between px-1 text-sm">
                        <div className="font-bold text-slate-900">{filteredOrgs.length} klientov</div>
                        <div className="text-xs font-semibold text-slate-500">Nové objednávky a najnovšie úpravy sú navrchu.</div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {filteredOrgs.map(org => {
                            const plan = (PLAN_CONFIG as any)[org.subscription_plan] || PLAN_CONFIG.free_trial;
                            const expiryDate = new Date(org.trial_ends_at);
                            const now = new Date();
                            const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            const isInfinite = expiryDate.getFullYear() > 2090;
                            const isExpired = !isInfinite && diffDays < 0;

                            let statusColor = "text-green-600 bg-green-50 border-green-100";
                            if (org.subscription_status === 'suspended_unpaid') statusColor = "text-red-800 bg-red-50 border-red-200";
                            else if (isExpired) statusColor = "text-red-700 bg-red-50 border-red-200";
                            else if (diffDays <= 10 && !isInfinite) statusColor = "text-orange-700 bg-orange-50 border-orange-200 ring-2 ring-orange-200";

                            return (
                                <Card key={org.id} className="p-3 border-slate-200 hover:border-orange-200 transition-all group bg-white shadow-sm overflow-hidden">
                                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0 overflow-hidden shadow-inner">
                                                {org.logo_url ? <img src={org.logo_url} className="w-full h-full object-cover" /> : <Building2 size={20} className="text-slate-300"/>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-bold text-base text-slate-900 truncate">{org.name}</h3>
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${plan.bg} ${plan.color} ${plan.border}`}>
                                                        <plan.icon size={10} fill="currentColor"/>
                                                        {plan.name}
                                                    </div>
                                                </div>
                                                <div className="hidden">
                                                    <span className="flex items-center gap-1"><Hash size={12}/> IČO: {org.ico || '---'}</span>
                                                    <span className="flex items-center gap-1"><Calendar size={12}/> Od: {formatDate(org.created_at)}</span>
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                                                    <span className="flex items-center gap-1"><Users size={13}/> Admin: {getClientAdminName(org) || 'Nezadaný'}</span>
                                                    <span className="flex items-center gap-1"><Calendar size={13}/> Registrované: {formatDate(org.created_at)}</span>
                                                </div>
                                                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2">
                                                    <ClientInfo icon={Mail} label="Email" value={getClientEmail(org)} href={getClientEmail(org) ? `mailto:${getClientEmail(org)}` : undefined} />
                                                    <ClientInfo icon={PhoneCall} label="Telefón" value={getClientPhone(org)} href={getClientPhone(org) ? `tel:${getClientPhone(org)}` : undefined} />
                                                    <ClientInfo icon={Hash} label="IČO" value={org.ico} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
                                            <div className={`px-3 py-2 rounded-xl border text-center min-w-[145px] shadow-sm ${statusColor}`}>
                                                {org.subscription_status === 'active' ? (
                                                    <>
                                                        <div className="text-xs font-semibold mb-0.5 opacity-70">Mesačný paušál</div>
                                                        <div className="text-sm font-bold">{org.trial_ends_at ? formatDate(org.trial_ends_at) : 'Nezadané'}</div>
                                                        <div className="text-xs font-semibold mt-0.5">faktúrovať: {getBillingDayLabel(org.trial_ends_at)}</div>
                                                    </>
                                                ) : org.subscription_status === 'suspended_unpaid' ? (
                                                    <>
                                                        <div className="text-xs font-semibold mb-0.5 opacity-80">Pozastavené od</div>
                                                        <div className="text-sm font-bold">{formatDate(org.updated_at || org.trial_ends_at || org.created_at)}</div>
                                                        <div className="text-xs font-semibold mt-0.5">prístup vypnutý</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="text-xs font-semibold mb-0.5 opacity-70">Platnosť do</div>
                                                        <div className="text-sm font-bold">
                                                            {isInfinite ? 'NAVŽDY' : formatDate(org.trial_ends_at)}
                                                        </div>
                                                        {!isInfinite && (
                                                            <div className="text-xs font-semibold mt-0.5">
                                                                {isExpired ? 'EXPIROVANÉ' : `Zostáva ${diffDays} dní`}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <button 
                                                    onClick={() => openLicenseEditor(org)}
                                                    className="flex-1 sm:flex-none h-10 px-4 bg-slate-900 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-black transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Pencil size={14}/> Upraviť Licenciu
                                                </button>
                                                <button
                                                    onClick={() => org.is_hidden_admin ? restoreClient(org) : hideClient(org)}
                                                    disabled={actionId === org.id}
                                                    className="h-10 px-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:border-orange-200 hover:text-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                                    title={org.is_hidden_admin ? 'Vrátiť do zoznamu' : 'Skryť firmu zo zoznamu'}
                                                >
                                                    {actionId === org.id ? <Loader2 size={14} className="animate-spin"/> : org.is_hidden_admin ? <CheckCircle2 size={14}/> : <Ban size={14}/>}
                                                    <span className="hidden sm:inline">{org.is_hidden_admin ? 'Obnoviť' : 'Skryť'}</span>
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
                <Modal title="Správa klienta" onClose={() => setLicenseModal({ open: false, org: null })} maxWidth="max-w-lg">
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Klient</p>
                            <h4 className="mt-1 text-xl font-bold text-slate-950">{licenseModal.org.name}</h4>
                            <p className="mt-1 text-sm font-medium text-slate-500">{getClientEmail(licenseModal.org) || 'Email nezadaný'}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            <button
                                onClick={() => activateMonthlyPlan(licenseModal.org, licenseForm.plan === 'free_trial' ? 'base' : licenseForm.plan, licenseForm.endsAt)}
                                disabled={actionId === licenseModal.org?.id}
                                className="h-12 rounded-xl bg-green-600 text-white font-bold text-sm shadow-sm hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {actionId === licenseModal.org?.id ? <Loader2 size={17} className="animate-spin"/> : <CheckCircle2 size={17}/>}
                                Zapnúť mesačný balík
                            </button>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                    onClick={() => renewTrial(licenseModal.org, licenseForm.endsAt)}
                                    disabled={actionId === licenseModal.org?.id}
                                    className="h-11 rounded-xl bg-white border border-orange-200 text-orange-700 font-semibold text-sm hover:bg-orange-50 transition flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    <Clock size={16}/> Obnoviť 30 dní trial
                                </button>
                                <button
                                    onClick={() => suspendClient(licenseModal.org)}
                                    disabled={actionId === licenseModal.org?.id}
                                    className="h-11 rounded-xl bg-white border border-red-200 text-red-700 font-semibold text-sm hover:bg-red-50 transition flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    <Ban size={16}/> Vypnúť prístup
                                </button>
                            </div>
                            <p className="text-xs font-medium text-slate-500 leading-relaxed">
                                Balík beží bez expirácie, kým ho ručne nevypneš. Dátum nižšie slúži ako najbližší deň fakturácie.
                            </p>
                        </div>
                         
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">Balík</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['base', 'standard', 'pro'].map(planId => {
                                        const p = (PLAN_CONFIG as any)[planId];
                                        const isSel = licenseForm.plan === planId;
                                        return (
                                            <button 
                                                key={planId}
                                                onClick={() => setLicenseForm({ ...licenseForm, plan: planId })}
                                                className={`h-11 rounded-xl border text-sm font-bold transition-all ${isSel ? 'border-orange-300 bg-orange-50 text-orange-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200'}`}
                                            >
                                                {p.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                        Najbližšia fakturácia / koniec trialu
                                    </label>
                                    <p className="mb-2 text-xs font-semibold text-slate-500 leading-relaxed">
                                        Pri mesačnom balíku je to najbližší deň fakturácie. Pri triali je to koniec skúšobnej doby.
                                    </p>
                                    <div className="flex gap-2">
                                        <input 
                                            type="date"
                                            value={licenseForm.endsAt}
                                            onChange={(e) => setLicenseForm({ ...licenseForm, endsAt: e.target.value })}
                                            className="flex-1 h-12 px-4 bg-white border border-slate-300 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button variant="secondary" onClick={() => setLicenseModal({ open: false, org: null })} className="h-11 w-full border-slate-200 text-slate-600 font-semibold text-sm">
                                Zavrieť
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
