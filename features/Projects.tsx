
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase, UserProfile } from '../lib/supabase';
import { Button, Card, Badge, Modal, Input, Select, ConfirmModal, AlertModal, CustomLogo } from '../components/UI';
// Added BookOpen to lucide-react imports to fix line 162 error
import { MapPin, BarChart3, ClipboardList, Euro, Package, HardHat, Plus, FileDown, Trash2, ArrowLeft, Loader2, User, Clock, Calendar, Pencil, Building2, ChevronDown, Check, CheckCircle2, Archive, RefreshCcw, FolderOpen, AlertCircle, FileText, Send, X, Printer, Phone, Briefcase, Calculator, Percent, LayoutList, GripVertical, TrendingUp, TrendingDown, Search, Filter, Info, Activity, FileCheck, ShieldCheck, ListPlus, Fuel, Users, Settings2, Save, Shield, BookOpen, Star } from 'lucide-react';
import { formatMoney, formatDate, formatDuration } from '../lib/utils';
import { exportElementToPdf } from '../lib/pdfExport';
import { ProjectPHM } from './ProjectPHM';
import { PLANS } from './Subscription';
import { searchProjectLocations, type LocationResult } from '../lib/weather';

// Type declaration for window object
declare global {
    interface Window {
        quoteItemsFromCalc?: Array<{
            description: string;
            quantity: number;
            unit: string;
            unit_price: number;
            vat_rate: number;
        }>;
    }
}

const PAGE_SIZE = 12;
const DEFAULT_VAT_RATE = 23;
const UNIT_OPTIONS = ['ks', 'm', 'm2', 'm3', 'kg', 't', 'l', 'bal', 'paleta', 'hod', 'súbor', 'km'];

const SK_REGIONS = [
    'Banskobystrický kraj',
    'Bratislavský kraj',
    'Košický kraj',
    'Nitriansky kraj',
    'Prešovský kraj',
    'Trenčiansky kraj',
    'Trnavský kraj',
    'Žilinský kraj'
];

const SK_DISTRICTS_BY_REGION: Record<string, string[]> = {
    'Banskobystrický kraj': ['Banská Bystrica', 'Banská Štiavnica', 'Brezno', 'Detva', 'Krupina', 'Lučenec', 'Poltár', 'Revúca', 'Rimavská Sobota', 'Veľký Krtíš', 'Zvolen', 'Žarnovica', 'Žiar nad Hronom'],
    'Bratislavský kraj': ['Bratislava I', 'Bratislava II', 'Bratislava III', 'Bratislava IV', 'Bratislava V', 'Malacky', 'Pezinok', 'Senec'],
    'Košický kraj': ['Gelnica', 'Košice I', 'Košice II', 'Košice III', 'Košice IV', 'Košice-okolie', 'Michalovce', 'Rožňava', 'Sobrance', 'Spišská Nová Ves', 'Trebišov'],
    'Nitriansky kraj': ['Komárno', 'Levice', 'Nitra', 'Nové Zámky', 'Šaľa', 'Topoľčany', 'Zlaté Moravce'],
    'Prešovský kraj': ['Bardejov', 'Humenné', 'Kežmarok', 'Levoča', 'Medzilaborce', 'Poprad', 'Prešov', 'Sabinov', 'Snina', 'Stará Ľubovňa', 'Stropkov', 'Svidník', 'Vranov nad Topľou'],
    'Trenčiansky kraj': ['Bánovce nad Bebravou', 'Ilava', 'Myjava', 'Nové Mesto nad Váhom', 'Partizánske', 'Považská Bystrica', 'Prievidza', 'Púchov', 'Trenčín'],
    'Trnavský kraj': ['Dunajská Streda', 'Galanta', 'Hlohovec', 'Piešťany', 'Senica', 'Skalica', 'Trnava'],
    'Žilinský kraj': ['Bytča', 'Čadca', 'Dolný Kubín', 'Kysucké Nové Mesto', 'Liptovský Mikuláš', 'Martin', 'Námestovo', 'Ružomberok', 'Turčianske Teplice', 'Tvrdošín', 'Žilina']
};

const SK_REGION_ABBREVIATIONS: Record<string, string> = {
    'Bratislavský kraj': 'BSK',
    'Trnavský kraj': 'TTSK',
    'Trenčiansky kraj': 'TSK',
    'Nitriansky kraj': 'NSK',
    'Žilinský kraj': 'ŽSK',
    'Banskobystrický kraj': 'BBSK',
    'Prešovský kraj': 'PSK',
    'Košický kraj': 'KSK'
};

const composeProjectAddress = (parts: { street?: string; city?: string; district?: string; region?: string; country?: string }) =>
    [
        parts.street,
        parts.city,
        parts.district ? `okr. ${parts.district}` : '',
        parts.region ? (SK_REGION_ABBREVIATIONS[parts.region] || parts.region) : '',
        parts.country === 'Slovenská republika' ? 'SR' : parts.country
    ]
        .map(part => part?.trim())
        .filter(Boolean)
        .join(', ');

const roundFin = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

const normalizeQuoteLibraryKey = (description: string) =>
    description.trim().toLowerCase().replace(/\s+/g, ' ');

const parseQuoteMeta = (notes?: string) => {
    const fallback = { has_vat: true, vat_rate: DEFAULT_VAT_RATE, discount_type: 'none', discount_value: 0 };
    if (!notes) return fallback;
    try {
        const parsed = JSON.parse(notes);
        if (parsed && parsed.type === 'QUOTE_META') {
            return {
                has_vat: parsed.has_vat ?? fallback.has_vat,
                vat_rate: parsed.vat_rate ?? fallback.vat_rate,
                discount_type: parsed.discount_type || fallback.discount_type,
                discount_value: Number(parsed.discount_value || 0)
            };
        }
    } catch (e) {
        // Older quotes stored plain markers like VAT_PER_ITEM.
    }
    return {
        ...fallback,
        has_vat: notes.includes('VAT_PER_ITEM') ? true : fallback.has_vat
    };
};

const buildQuoteMeta = (header: any) => JSON.stringify({
    type: 'QUOTE_META',
    has_vat: !!header.has_vat,
    vat_rate: Number(header.vat_rate || DEFAULT_VAT_RATE),
    discount_type: header.discount_type || 'none',
    discount_value: Number(header.discount_value || 0)
});

const EmptyState = ({ message }: { message: string }) => (
    <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-sm w-full">
        <FolderOpen size={48} className="mx-auto mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest text-xs">{message}</p>
    </div>
);

const parseNotesData = (rawNotes: string = '') => {
    let breakdown: any[] = [];
    let cleanNotes = rawNotes || '';
    let hasVat = false;
    let vatRate = DEFAULT_VAT_RATE;
    let isIndividualVat = false;

    const startTag = '[JSON_BREAKDOWN:';
    const startIndex = cleanNotes.indexOf(startTag);
    
    if (startIndex !== -1) {
        const lastIndex = cleanNotes.lastIndexOf(']');
        if (lastIndex > startIndex) {
            const jsonString = cleanNotes.substring(startIndex + startTag.length, lastIndex);
            try {
                const parsed = JSON.parse(jsonString);
                if (Array.isArray(parsed)) {
                    breakdown = parsed;
                } else {
                    breakdown = parsed.items || [];
                    hasVat = parsed.hasVat || false;
                    vatRate = parsed.vatRate ?? DEFAULT_VAT_RATE;
                    isIndividualVat = parsed.isIndividualVat || false;
                }
                const before = cleanNotes.substring(0, startIndex);
                const after = cleanNotes.substring(lastIndex + 1);
                cleanNotes = (before + after).trim();
            } catch (e) {
                console.error("Chyba pri parsovaní rozpisu rozpočtu", e);
            }
        }
    }
    
    return { breakdown, cleanNotes, hasVat, vatRate, isIndividualVat };
};

// --- NOVÁ TABUĽKA PRE POVERENIA ---
const ProjectPermissionsManager = ({ siteId, organizationId }: { siteId: string, organizationId: string }) => {
    const [workers, setWorkers] = useState<any[]>([]);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmUser, setConfirmUser] = useState<any>(null);
    const [confirmField, setConfirmField] = useState<'can_manage_diary' | 'can_manage_finance'>('can_manage_diary');
    const [isGranting, setIsGranting] = useState<boolean>(true);

    const load = async () => {
        setLoading(true);
        const [wRes, pRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('organization_id', organizationId).eq('is_active', true).eq('role', 'employee'),
            supabase.from('site_permissions').select('*').eq('site_id', siteId)
        ]);
        if (wRes.data) setWorkers(wRes.data);
        if (pRes.data) setPermissions(pRes.data);
        setLoading(false);
    };

    useEffect(() => { load(); }, [siteId]);

    const togglePermission = async (userId: string, field: 'can_manage_diary' | 'can_manage_finance') => {
        setSavingId(userId + '_' + field);
        const existing = permissions.find(p => p.user_id === userId);
        
        try {
            if (existing) {
                const newVal = !existing[field];
                // Ak sú obe false, záznam zmažeme, inak update
                if (!newVal && !existing[field === 'can_manage_diary' ? 'can_manage_finance' : 'can_manage_diary']) {
                    await supabase.from('site_permissions').delete().eq('id', existing.id);
                    setPermissions(permissions.filter(p => p.id !== existing.id));
                } else {
                    await supabase.from('site_permissions').update({ [field]: newVal }).eq('id', existing.id);
                    setPermissions(permissions.map(p => p.id === existing.id ? { ...p, [field]: newVal } : p));
                }
            } else {
                const { data, error } = await supabase.from('site_permissions').insert([{
                    user_id: userId,
                    site_id: siteId,
                    organization_id: organizationId,
                    [field]: true,
                    [field === 'can_manage_diary' ? 'can_manage_finance' : 'can_manage_diary']: false
                }]).select().single();
                if (data) setPermissions([...permissions, data]);
            }
        } finally {
            setSavingId(null);
        }
    };

    if (loading) return <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-orange-600"/></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
                <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-sm shrink-0">
                    <Shield size={20}/>
                </div>
                <div className="min-w-0">
                    <h3 className="text-base font-bold text-blue-950">Prístup k zákazke</h3>
                    <p className="text-sm text-blue-800/85 font-medium leading-relaxed mt-1">
                        Vyberte zamestnancov, ktorí môžu spravovať túto zákazku, zapisovať denník práce a evidovať náklady alebo PHM.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {workers.map(w => {
                    const p = permissions.find(x => x.user_id === w.id);
                    return (
                        <Card key={w.id} className="p-4 border-slate-200 hover:border-orange-200 transition bg-white shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 border border-slate-200">
                                        {w.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{w.full_name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{w.job_title || 'zamestnanec'}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { setConfirmUser(w); setConfirmField('can_manage_diary'); setIsGranting(!p?.can_manage_diary); setShowConfirmModal(true); }}
                                        disabled={savingId === w.id + '_can_manage_diary'}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${p?.can_manage_diary ? 'bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-100' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                    >
                                        {savingId === w.id + '_can_manage_diary' ? <Loader2 size={14} className="animate-spin"/> : <BookOpen size={14}/>}
                                        Vedenie denníka
                                    </button>
                                    <button 
                                        onClick={() => { setConfirmUser(w); setConfirmField('can_manage_finance'); setIsGranting(!p?.can_manage_finance); setShowConfirmModal(true); }}
                                        disabled={savingId === w.id + '_can_manage_finance'}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${p?.can_manage_finance ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-100' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                    >
                                        {savingId === w.id + '_can_manage_finance' ? <Loader2 size={14} className="animate-spin"/> : <Package size={14}/>}
                                        Správa nákupov
                                    </button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
                {workers.length === 0 && <div className="text-center py-10 text-slate-300 font-bold uppercase text-[10px]">Žiadni aktívni zamestnanci na priradenie.</div>}
            </div>

            {showConfirmModal && confirmUser && confirmField && (
                <ConfirmModal 
                    isOpen={showConfirmModal}
                    title="Potvrdenie právomocí"
                    message={
                        (() => {
                            const permissionName = confirmField === 'can_manage_diary' ? 'Vedenie denníka' : 'Správa nákupov';
                            let msg = isGranting 
                                ? `Naozaj chcete pridať zamestnancovi ${confirmUser.full_name} právomoc ${permissionName}?`
                                : `Naozaj chcete odobrať zamestnancovi ${confirmUser.full_name} právomoc ${permissionName}?`;
                            if (isGranting) {
                                msg += '\n\nTáto právomoc sa týka iba tejto konkrétnej zákazky.';
                                if (confirmField === 'can_manage_finance') {
                                    msg += '\n\n⚠️ Oprávnený zamestnanec môže zaznamenávať iba výdavky, nie príjmy..';
                                }
                            }
                            return msg;
                        })()
                    }
                    onConfirm={() => togglePermission(confirmUser.id, confirmField)}
                    onClose={() => setShowConfirmModal(false)}
                />
            )}
        </div>
    );
};

export const ProjectsScreen = ({ profile, onSelect, selectedSiteId, organization, initialAction, onInitialActionHandled }: { profile: UserProfile, onSelect: (id: string | null) => void, selectedSiteId: string | null, organization: any, initialAction?: any, onInitialActionHandled?: () => void }) => {
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

  return <ProjectManager profile={profile} onSelect={onSelect} onSelectLead={setSelectedLeadId} organization={organization} initialAction={initialAction} onInitialActionHandled={onInitialActionHandled} />;
};

const ProjectManager = ({ profile, onSelect, onSelectLead, organization, initialAction, onInitialActionHandled }: any) => {
  const [activeTab, setActiveTab] = useState<'leads' | 'active' | 'archive'>('active');
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ name: '', address: '', client_name: '', budget: 0, status: activeTab === 'leads' ? 'lead' : 'active', lead_stage: 'new', notes: '', hasVat: false, vatRate: DEFAULT_VAT_RATE, isIndividualVat: false, latitude: null, longitude: null, location_label: '' });
  const [budgetBreakdown, setBudgetBreakdown] = useState<{id: string, label: string, amount: number, vatRate?: number}[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationHelp, setShowLocationHelp] = useState(false);
  const [activeLocationField, setActiveLocationField] = useState<'city'>('city');
  const [addressParts, setAddressParts] = useState({ country: 'Slovenská republika', region: '', district: '', city: '', street: '' });
  
  const [alertState, setAlertState] = useState<{open: boolean, title: string, message: string, type: string}>({ open: false, title: '', message: '', type: 'success' });
  const [confirm, setConfirm] = useState<{open: boolean, action: string, id: string | null}>({ open: false, action: '', id: null });

  const openCreateSiteModal = (tab: 'leads' | 'active') => {
      setActiveTab(tab);
      setEditingSite(null);
      setFormData({ name: '', address: '', client_name: '', budget: 0, status: tab === 'leads' ? 'lead' : 'active', lead_stage: 'new', notes: '', hasVat: false, vatRate: DEFAULT_VAT_RATE, isIndividualVat: false, latitude: null, longitude: null, location_label: '' });
      setLocationResults([]);
      setActiveLocationField('city');
      setAddressParts({ country: 'Slovenská republika', region: '', district: '', city: '', street: '' });
      setBudgetBreakdown([]);
      setShowBreakdown(false);
      setShowModal(true);
  };

  // --- LOGIKA LIMITOV STAVIEB ---
  const [org, setOrg] = useState<any>(organization);

  useEffect(() => {
    const fetchOrg = async () => {
        const { data } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single();
        if(data) setOrg(data);
    };
    if (!org) fetchOrg();
  }, [profile.organization_id]);

  const activePlan = useMemo(() => {
    const planId = org?.subscription_plan || 'base';
    return PLANS.find(p => p.id === planId) || PLANS[0];
  }, [org]);

  // Počítame len tie, ktoré sú status: 'active', 'planning', 'paused'
  // (Leady a archív sa do limitu nerátajú)
  const currentActiveSitesCount = useMemo(() => {
      // V realite by sme tu chceli headcount z DB, ale pre UI check nám stačia načítané weby
      // Ak by sme mali veľa stavieb, robili by sme separátny COUNT(*)
      return sites.filter(s => ['active', 'planning', 'paused'].includes(s.status)).length;
  }, [sites]);

  const isSiteLimitReached = org && currentActiveSitesCount >= activePlan.siteLimit;

  const handleTabChange = (newTab: 'leads' | 'active' | 'archive') => {
      if (newTab === activeTab && sites.length > 0) return; 
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

  useEffect(() => {
    if (!initialAction?.action) return;

    if (initialAction.action === 'new-project') {
      openCreateSiteModal('active');
      onInitialActionHandled?.();
    }

    if (initialAction.action === 'new-lead') {
      openCreateSiteModal('leads');
      onInitialActionHandled?.();
    }
  }, [initialAction]);

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
                const income = roundFin(Number(s?.total_income || 0));
                const totalCost = roundFin(
                    Number(s?.total_direct_expenses || 0) + 
                    Number(s?.total_material_cost || 0) + 
                    Number(s?.total_labor_cost || 0) +
                    Number(s?.total_fuel_cost || 0)
                );
                return {
                    ...site,
                    profit: roundFin(income - totalCost),
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

  const handleEditSite = (site: any) => {
      setEditingSite(site);
      const { breakdown, cleanNotes, hasVat, vatRate, isIndividualVat } = parseNotesData(site.notes);

      setFormData({
          name: site.name,
          address: site.address,
          client_name: site.client_name,
          budget: site.budget,
          status: site.status,
          lead_stage: site.lead_stage || 'new',
          notes: cleanNotes,
          hasVat: hasVat,
          vatRate: vatRate,
          isIndividualVat: isIndividualVat,
          latitude: site.latitude ?? null,
          longitude: site.longitude ?? null,
          location_label: site.location_label || ''
      });
      setLocationResults([]);
      setActiveLocationField('city');
      setAddressParts({ country: 'Slovenská republika', region: '', district: '', city: site.location_label || '', street: site.address || '' });
      setBudgetBreakdown(breakdown);
      setShowBreakdown(breakdown.length > 0);
      setShowModal(true);
  };

  const updateAddressPart = (field: keyof typeof addressParts, value: string) => {
    const next = {
        ...addressParts,
        [field]: value,
        ...(field === 'region' ? { district: '', city: '' } : {}),
        ...(field === 'district' ? { city: '' } : {})
    };
    setAddressParts(next);
    setFormData((prev: any) => ({
        ...prev,
        address: composeProjectAddress(next),
        ...(field === 'region' || field === 'district' || field === 'city' || field === 'street'
            ? { latitude: null, longitude: null, location_label: '' }
            : {})
    }));
  };

  const runLocationSearch = async (query: string, showAlerts = true) => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
        if (showAlerts) {
            setAlertState({ open: true, title: 'Poloha zákazky', message: 'Zadajte aspoň 2 znaky adresy.', type: 'error' });
        }
        return;
    }
    setLocationLoading(true);
    try {
        const results = await searchProjectLocations(cleanQuery, 'city', {
            district: addressParts.district || undefined
        });
        setLocationResults(results);
        if (showAlerts && results.length === 0) {
            setAlertState({ open: true, title: 'Poloha zákazky', message: 'Nenašla sa žiadna obec alebo časť obce. Skúste doplniť okres alebo názov obce.', type: 'error' });
        }
    } catch (err: any) {
        if (showAlerts) {
            setAlertState({ open: true, title: 'Poloha zákazky', message: err.message || 'Poloha sa nepodarila vyhľadať.', type: 'error' });
        }
    } finally {
        setLocationLoading(false);
    }
  };

  const handleLocationSelect = (location: LocationResult) => {
    const cityName = location.admin3 || location.name || addressParts.city;
    const nextParts = {
        ...addressParts,
        city: cityName,
        district: addressParts.district || location.admin2 || '',
        region: addressParts.region || location.admin1 || '',
        country: location.country || addressParts.country || 'Slovenská republika'
    };
    const nextAddress = composeProjectAddress(nextParts);
    setAddressParts(nextParts);
    setFormData({
        ...formData,
        latitude: location.latitude,
        longitude: location.longitude,
        location_label: cityName,
        address: nextAddress
    });
    setLocationResults([]);
  };

  useEffect(() => {
    if (!showModal) return;
    const searchQuery = addressParts.city.trim();
    if (searchQuery.length < 2) {
        setLocationResults([]);
        return;
    }

    const timer = window.setTimeout(() => {
        runLocationSearch(searchQuery, false);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [addressParts.city, addressParts.district, addressParts.region, showModal]);

  const renderLocationDropdown = (field: 'city') => {
    if (activeLocationField !== field || locationResults.length === 0) return null;

    return (
        <div className="absolute left-0 right-0 top-[74px] z-[10000] max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
            Vyberte obec / mesto
          </div>
          {locationResults.map(location => (
            <button
              type="button"
              key={location.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleLocationSelect(location)}
              className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-b-0 hover:bg-orange-50"
            >
              <span className="block min-w-0 truncate text-base font-bold text-slate-900">{location.name}</span>
            </button>
          ))}
        </div>
    );
  };

  const calculateTotalWithVat = (items: any[], hasVat: boolean, isIndividual: boolean, globalRate: number) => {
    if (!hasVat) return roundFin(items.reduce((acc, i) => acc + (Math.max(0, Number(i.amount)) || 0), 0));
    
    if (isIndividual) {
        const total = items.reduce((acc, i) => {
            const sub = Math.max(0, Number(i.amount)) || 0;
            const rate = i.vatRate ?? globalRate;
            return acc + roundFin(sub * (1 + (rate / 100)));
        }, 0);
        return roundFin(total);
    } else {
        const subtotal = items.reduce((acc, i) => acc + (Math.max(0, Number(i.amount)) || 0), 0);
        const vatAmount = roundFin(subtotal * (globalRate / 100));
        return roundFin(subtotal + vatAmount);
    }
  };

  const addBudgetLine = () => {
    const newList = [...budgetBreakdown, { id: crypto.randomUUID(), label: '', amount: 0, vatRate: formData.vatRate }];
    setBudgetBreakdown(newList);
    setFormData({ ...formData, budget: calculateTotalWithVat(newList, formData.hasVat, formData.isIndividualVat, formData.vatRate) });
  };

  const removeBudgetLine = (id: string) => {
    const newList = budgetBreakdown.filter(i => i.id !== id);
    setBudgetBreakdown(newList);
    setFormData({ ...formData, budget: calculateTotalWithVat(newList, formData.hasVat, formData.isIndividualVat, formData.vatRate) });
  };

  const updateBudgetLine = (id: string, field: 'label' | 'amount' | 'vatRate', value: any) => {
    let finalValue = value;
    if (field === 'amount' || field === 'vatRate') finalValue = Math.max(0, parseFloat(value) || 0);
    const newList = budgetBreakdown.map(i => i.id === id ? { ...i, [field]: finalValue } : i);
    setBudgetBreakdown(newList);
    setFormData({ ...formData, budget: calculateTotalWithVat(newList, formData.hasVat, formData.isIndividualVat, formData.vatRate) });
  };

  const toggleVat = (enabled: boolean) => {
    setFormData({ ...formData, hasVat: enabled, budget: calculateTotalWithVat(budgetBreakdown, enabled, formData.isIndividualVat, formData.vatRate) });
  };

  const toggleIndividualVat = (enabled: boolean) => {
    const newList = budgetBreakdown.map(item => ({...item, vatRate: item.vatRate ?? formData.vatRate}));
    setBudgetBreakdown(newList);
    setFormData({ ...formData, isIndividualVat: enabled, budget: calculateTotalWithVat(newList, formData.hasVat, enabled, formData.vatRate) });
  };

  const updateVatRate = (rate: number) => {
    const cleanRate = Math.max(0, rate);
    setFormData({ ...formData, vatRate: cleanRate, budget: calculateTotalWithVat(budgetBreakdown, formData.hasVat, formData.isIndividualVat, cleanRate) });
  };

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check limit only for new additions
    if (!editingSite && formData.status !== 'lead' && isSiteLimitReached) {
        setAlertState({ 
            open: true, 
            title: 'Limit balíka dosiahnutý', 
            message: `Váš balík ${activePlan.name} povoľuje max. ${activePlan.siteLimit} aktívnych stavieb. Pre pridanie ďalších dopytov prejdite na vyšší balík alebo archivujte dokončené stavby.`,
            type: 'error'
        });
        return;
    }

    try {
        let rawNotes = formData.notes || '';
        const { cleanNotes } = parseNotesData(rawNotes);
        let finalNotes = cleanNotes;
        
        if (budgetBreakdown.length > 0) {
            const dataToStore = {
                items: budgetBreakdown,
                hasVat: formData.hasVat,
                vatRate: formData.vatRate,
                isIndividualVat: formData.isIndividualVat
            };
            finalNotes += `\n\n[JSON_BREAKDOWN:${JSON.stringify(dataToStore)}]`;
        }

        const payload = { 
            ...formData, 
            notes: finalNotes,
            budget: roundFin(Math.max(0, Number(formData.budget)) || 0),
            organization_id: profile.organization_id 
        };
        
        delete payload.hasVat;
        delete payload.vatRate;
        delete payload.isIndividualVat;

        let result;
        if(editingSite) {
            result = await supabase.from('sites').update(payload).eq('id', editingSite.id).select();
        } else {
            result = await supabase.from('sites').insert([payload]).select();
        }

        if (result.error && /latitude|longitude|location_label|schema cache/i.test(result.error.message || '')) {
            if (payload.latitude != null || payload.longitude != null || payload.location_label) {
                throw new Error('Poloha sa neuložila, pretože databáza ešte nemá načítané nové polia pre adresu. Skúste stránku obnoviť a zákazku uložiť znova.');
            }
            const fallbackPayload = { ...payload };
            delete fallbackPayload.latitude;
            delete fallbackPayload.longitude;
            delete fallbackPayload.location_label;
            if(editingSite) {
                result = await supabase.from('sites').update(fallbackPayload).eq('id', editingSite.id).select();
            } else {
                result = await supabase.from('sites').insert([fallbackPayload]).select();
            }
        }

        if(result.error) throw result.error;

        setShowModal(false);
        setPage(0);
        load(true);
        
        if (!editingSite && payload.status === 'lead' && result.data) {
             onSelectLead(result.data[0].id);
        }

    } catch (err: any) {
        setAlertState({ open: true, title: 'Chyba', message: err.message, type: 'error' });
    }
  };

  const deleteSite = async () => {
      if(!confirm.id) return;
      const { error } = await supabase.from('sites').delete().eq('id', confirm.id);
      if (error) {
          setAlertState({ 
              open: true, 
              title: 'Chyba pri mazaní', 
              message: "Nepodarilo sa vymazať stavbu.", 
              type: 'error' 
          });
      } else {
          setConfirm({ ...confirm, open: false });
          setPage(0);
          load(true);
      }
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
           <h2 className="app-section-title">
              <Building2 className="text-orange-600" />
              Správa zákaziek
           </h2>
           <p className="app-section-subtitle">Správa zákaziek od dopytu po realizáciu</p>
        </div>
        {activeTab !== 'archive' && (
            <div className="flex gap-2 w-full md:w-auto">
                <Button 
                    fullWidth 
                    className={isSiteLimitReached && activeTab === 'active' ? 'grayscale opacity-50' : ''}
                    onClick={() => openCreateSiteModal(activeTab === 'leads' ? 'leads' : 'active')}
                >
                    <Plus size={18}/> Pridať {activeTab === 'active' ? 'zákazku' : 'dopyt'}
                </Button>
            </div>
        )}
      </div>

      {isSiteLimitReached && (activeTab === 'active') && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="text-orange-600 shrink-0" size={24}/>
              <div className="flex-1">
                  <p className="text-sm font-black text-orange-900 uppercase">Limit aktívnych stavieb dosiahnutý ({activePlan.siteLimit}/{activePlan.siteLimit})</p>
                  <p className="text-xs text-orange-700 font-medium">Pre pridanie ďalších stavieb musíte prejsť na vyšší balík alebo archivovať hotové projekty.</p>
              </div>
              <button 
                onClick={() => window.location.href = '?action=subscription'}
                className="px-4 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-200 whitespace-nowrap"
              >
                  Upgrade
              </button>
          </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-2 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex gap-1 overflow-hidden w-full lg:w-auto lg:gap-1.5 lg:overflow-x-auto">
            {[
                { id: 'active', label: 'Realizácia', icon: HardHat },
                { id: 'leads', label: 'Obchod', icon: Briefcase },
                { id: 'archive', label: 'Archív', icon: Archive },
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as any)}
                    className={`min-h-[42px] flex-1 lg:flex-none min-w-0 lg:min-w-max py-2.5 px-2.5 sm:px-3 lg:px-4 text-[13px] sm:text-sm font-semibold text-center rounded-2xl transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 lg:gap-2 ${
                        activeTab === tab.id 
                        ? 'bg-orange-50 text-orange-700 border border-orange-100 shadow-sm' 
                        : 'text-slate-700 border border-transparent hover:bg-slate-50 hover:text-slate-950'
                    }`}
                >
                    <tab.icon size={15} className="text-orange-600 shrink-0 lg:w-4 lg:h-4"/> 
                    <span className="truncate">{tab.label}</span>
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
                                            <div className={`hidden md:block w-2 h-16 rounded-full self-stretch ${stage === 'new' ? 'bg-blue-500' : stage === 'contacted' ? 'bg-yellow-500' : stage === 'meeting' ? 'bg-purple-500' : 'bg-orange-500'}`}></div>
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
                                                <button onClick={() => handleEditSite(lead)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={18}/></button>
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
                                    <div className="flex gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); setConfirm({ open: true, action: 'delete', id: site.id }); }} className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-600 transition border border-transparent hover:border-red-100"><Trash2 size={16}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleEditSite(site); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-600 transition border border-transparent hover:border-slate-200"><Pencil size={16}/></button>
                                    </div>
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
            <Input label="Adresa" value={formData.address} readOnly disabled placeholder="Adresa sa doplní po vyplnení polí nižšie" className="bg-slate-100 text-slate-600 cursor-not-allowed" />
            <div className="mb-4 rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
              <div className="min-w-0">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-orange-700 uppercase tracking-wider">
                        <MapPin size={16} />
                        Priradiť adresu
                      </label>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">Najprv nájdite a potvrďte polohu zákazky.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLocationHelp(true)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600 shadow-sm hover:bg-orange-50"
                      title="Na čo slúži poloha?"
                    >
                      <Info size={17} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select label="Krajina" value={addressParts.country} onChange={(e: any) => updateAddressPart('country', e.target.value)}>
                      <option value="Slovenská republika">Slovenská republika</option>
                    </Select>
                    <Select label="Kraj" value={addressParts.region} onChange={(e: any) => updateAddressPart('region', e.target.value)}>
                      <option value="">Vyberte kraj</option>
                      {SK_REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
                    </Select>
                    <Select label="Okres" value={addressParts.district} onChange={(e: any) => updateAddressPart('district', e.target.value)} disabled={!addressParts.region}>
                      <option value="">{addressParts.region ? 'Vyberte okres' : 'Najprv vyberte kraj'}</option>
                      {(SK_DISTRICTS_BY_REGION[addressParts.region] || []).map(district => <option key={district} value={district}>{district}</option>)}
                    </Select>
                    <div className="relative mb-4">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Obec / mesto</label>
                      <input
                        value={addressParts.city}
                        onFocus={() => setActiveLocationField('city')}
                        onChange={(e) => updateAddressPart('city', e.target.value)}
                        placeholder="Napr. Re..."
                        className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
                      />
                      {locationLoading && activeLocationField === 'city' && (
                        <Loader2 size={16} className="absolute right-3 top-[39px] animate-spin text-orange-500" />
                      )}
                      {renderLocationDropdown('city')}
                    </div>
                    <div className="relative sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ulica a číslo</label>
                      <input
                        value={addressParts.street}
                        onChange={(e) => updateAddressPart('street', e.target.value)}
                        placeholder="Napr. M. Nandrássyho 654/10"
                        className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
                      />
                      <p className="mt-1.5 text-xs font-medium text-slate-500">Ulicu a súpisné číslo je nutné dopísať ručne.</p>
                    </div>
                  </div>

                  {formData.latitude && formData.longitude && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                      <CheckCircle2 size={14} />
                      <span className="truncate">{formData.location_label || 'Poloha potvrdená'}</span>
                      <span className="text-slate-400">({Number(formData.latitude).toFixed(5)}, {Number(formData.longitude).toFixed(5)})</span>
                    </div>
                  )}
                  <p className="mt-2 text-xs font-medium text-slate-500">Adresa bude použitá na automatické dopĺňanie počasia v denníku prác.</p>
              </div>
            </div>
            <Input label="Klient (Meno)" value={formData.client_name} onChange={(e: any) => setFormData({...formData, client_name: e.target.value})} placeholder="Ján Novák" />
            
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Input label="Rozpočet (€)" type="number" value={formData.budget === 0 ? '' : formData.budget} onFocus={(e:any) => e.target.select()} onChange={(e: any) => setFormData({...formData, budget: roundFin(Math.max(0, parseFloat(e.target.value) || 0))})} placeholder="0.00" disabled={showBreakdown} />
                  {showBreakdown && <div className="absolute inset-0 bg-slate-50/10 cursor-not-allowed rounded-xl z-10" title="Suma sa počíta z rozpisu"></div>}
                </div>
                <Select label="Status" value={formData.status} onChange={(e: any) => setFormData({...formData, status: e.target.value})}>
                    <option value="lead">Dopyt (Lead)</option>
                    <option value="active">Aktívna</option>
                    <option value="planning">V príprave</option>
                    <option value="paused">Pozastavená</option>
                    <option value="completed">Dokončená</option>
                </Select>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-hidden">
                <button 
                    type="button" 
                    onClick={() => setShowBreakdown(!showBreakdown)} 
                    className="flex items-center justify-between w-full text-xs font-black uppercase tracking-widest text-slate-500 hover:text-orange-600 transition"
                >
                    <span className="flex items-center gap-2"><ListPlus size={16}/> Rozpísať položky rozpočtu</span>
                    <ChevronDown size={16} className={`transition-transform duration-300 ${showBreakdown ? 'rotate-180' : ''}`} />
                </button>

                {showBreakdown && (
                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col gap-2 p-3 bg-white border border-slate-200 rounded-xl mb-2 shadow-sm">
                             <div className="flex flex-col sm:flex-row gap-4 items-center">
                                <label className="flex items-center gap-2 cursor-pointer group flex-1">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                                        checked={formData.hasVat}
                                        onChange={(e) => toggleVat(e.target.checked)}
                                    />
                                    <span className="text-sm font-bold text-slate-700">Som platiteľ DPH</span>
                                </label>
                                {formData.hasVat && !formData.isIndividualVat && (
                                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Sadzba:</span>
                                        <input 
                                            type="number" 
                                            className="w-16 p-1 text-center font-bold text-slate-800 border-b-2 border-orange-200 focus:border-orange-500 outline-none" 
                                            value={formData.vatRate} 
                                            onChange={(e) => updateVatRate(Math.max(0, parseFloat(e.target.value) || 0))}
                                        />
                                        <span className="text-sm font-bold text-slate-500">%</span>
                                    </div>
                                )}
                             </div>
                             
                             {formData.hasVat && (
                                <div className="pt-2 mt-2 border-t border-slate-50 flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="isIndividualVat"
                                        className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                                        checked={formData.isIndividualVat}
                                        onChange={(e) => toggleIndividualVat(e.target.checked)}
                                    />
                                    <label htmlFor="isIndividualVat" className="text-sm font-bold text-slate-700 cursor-pointer">Priradiť individuálne sadzby DPH</label>
                                </div>
                             )}
                        </div>

                        <div className="w-full overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left text-xs min-w-[350px]">
                                <thead className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="pb-2">Názov položky</th>
                                        <th className="pb-2 w-24 text-right">Suma (€)</th>
                                        {formData.isIndividualVat && <th className="pb-2 w-20 text-center">DPH %</th>}
                                        <th className="pb-2 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {budgetBreakdown.map((line) => (
                                        <tr key={line.id} className="group">
                                            <td className="py-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Položka (napr. Okná)" 
                                                    className="w-full text-sm p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-bold shadow-sm" 
                                                    value={line.label}
                                                    onChange={(e) => updateBudgetLine(line.id, 'label', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 pl-2">
                                                <input 
                                                    type="number" 
                                                    placeholder="0" 
                                                    className="w-full text-sm p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-mono text-right shadow-sm" 
                                                    value={line.amount === 0 ? '' : line.amount}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => updateBudgetLine(line.id, 'amount', e.target.value)}
                                                />
                                            </td>
                                            {formData.isIndividualVat && (
                                                <td className="py-2 pl-2">
                                                    <input 
                                                        type="number" 
                                                        className="w-full text-sm p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-orange-500 font-mono text-center shadow-sm text-slate-800" 
                                                        value={line.vatRate ?? formData.vatRate}
                                                        onChange={(e) => updateBudgetLine(line.id, 'vatRate', e.target.value)}
                                                    />
                                                </td>
                                            )}
                                            <td className="py-2 text-right">
                                                <button type="button" onClick={() => removeBudgetLine(line.id)} className="p-2 text-slate-300 hover:text-red-500 transition active:scale-90"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button 
                            type="button" 
                            onClick={addBudgetLine}
                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:border-orange-300 hover:text-orange-500 transition bg-white/50 shadow-inner"
                        >
                            + Pridať položku do rozpočtu
                        </button>
                        <div className="pt-2 border-t border-slate-200 space-y-1 px-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Súčet položiek (Základ):</span>
                                <span className="font-bold text-slate-600">{formatMoney(budgetBreakdown.reduce((acc, i) => acc + (Math.max(0, Number(i.amount)) || 0), 0))}</span>
                            </div>
                            {formData.hasVat && (
                                <div className="flex justify-between items-center text-slate-400">
                                    <span className="text-[10px] font-black uppercase tracking-widest">DPH SPOLU:</span>
                                    <span className="font-bold">+{formatMoney(formData.budget - budgetBreakdown.reduce((acc, i) => acc + (Math.max(0, Number(i.amount)) || 0), 0))}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center border-t border-slate-100 pt-1 mt-1">
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">CELKOVÝ ROZPOČET:</span>
                                <span className="font-black text-orange-600 text-lg">{formatMoney(formData.budget)}</span>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            </div>
            
            <div className="mt-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Poznámky</label>
                <textarea className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-orange-500 h-24 text-sm font-medium" value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Detaily, čo si potrebujete zapamätať..."></textarea>
            </div>
            <Button type="submit" fullWidth className="mt-6 shadow-orange-200" size="lg">{editingSite ? 'Uložiť Zmeny' : 'Vytvoriť Zákazku'}</Button>
          </form>
        </Modal>
      )}

      {showLocationHelp && (
        <Modal title="Prečo priradiť adresu?" onClose={() => setShowLocationHelp(false)} maxWidth="max-w-md">
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm">
                <MapPin size={22} />
              </div>
              <div>
                <h4 className="font-black text-slate-950">Poloha pomáha denníku práce</h4>
                <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                  Keď má zákazka vybranú obec alebo časť obce, aplikácia vie do denníka práce automaticky doplniť počasie a teplotu pre konkrétny deň.
                </p>
              </div>
            </div>
            <p className="text-sm font-medium leading-relaxed text-slate-600">
              Ulicu a číslo dopíšte ručne. Pre počasie sa použije poloha vybranej obce, takže presné súpisné číslo nie je potrebné overovať cez externý register.
            </p>
            <Button fullWidth onClick={() => setShowLocationHelp(false)}>Rozumiem</Button>
          </div>
        </Modal>
      )}

      <ConfirmModal isOpen={confirm.open} onClose={() => setConfirm({...confirm, open: false})} onConfirm={deleteSite} title="Naozaj zmazať?" message="Všetky údaje spojené s touto zákazkou (transakcie, materiály, dochádzka) budú natrvalo odstránené." type="danger" />
      <AlertModal isOpen={alertState.open} onClose={() => setAlertState({...alertState, open: false})} title={alertState.title} message={alertState.message} type={alertState.type} />
    </div>
  );
};

const WorkerRatesManager = ({ siteId, organizationId }: { siteId: string, organizationId: string }) => {
    const [workers, setWorkers] = useState<any[]>([]);
    const [rates, setRates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        const [wRes, rRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('organization_id', organizationId).eq('is_active', true).eq('role', 'employee'),
            supabase.from('site_worker_rates').select('*').eq('site_id', siteId)
        ]);
        if (wRes.data) setWorkers(wRes.data);
        if (rRes.data) setRates(rRes.data);
        setLoading(false);
    };

    useEffect(() => { load(); }, [siteId]);

    const handleRateChange = (userId: string, field: string, val: string) => {
        const numVal = parseFloat(val) || 0;
        const existing = rates.find(r => r.user_id === userId);
        if (existing) {
            setRates(rates.map(r => r.user_id === userId ? { ...r, [field]: numVal } : r));
        } else {
            setRates([...rates, { site_id: siteId, user_id: userId, [field]: numVal, organization_id: organizationId }]);
        }
    };

    const saveRate = async (userId: string) => {
        setSavingId(userId);
        const rateObj = rates.find(r => r.user_id === userId);
        if (!rateObj) return;

        try {
            if (rateObj.id) {
                await supabase.from('site_worker_rates').update({
                    hourly_rate: rateObj.hourly_rate,
                    cost_rate: rateObj.cost_rate
                }).eq('id', rateObj.id);
            } else {
                const { data } = await supabase.from('site_worker_rates').insert([rateObj]).select().single();
                if (data) setRates(rates.map(r => r.user_id === userId ? data : r));
            }
        } finally {
            setSavingId(null);
        }
    };

    if (loading) return <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-orange-600"/></div>;

    return (
        <div className="space-y-4 animate-in fade-in">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3 mb-4">
                <Info size={18} className="text-blue-500 mt-0.5 shrink-0"/>
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                    Tu môžete nastaviť <strong>špecifické sadzby</strong> zamestnancov pre tento projekt. Ak políčko necháte prázdne (0), systém použije ich základnú sadzbu z profilu.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {workers.map(w => {
                    const r = rates.find(x => x.user_id === w.id);
                    const hRate = r?.hourly_rate || 0;
                    const cRate = r?.cost_rate || 0;

                    return (
                        <Card key={w.id} className="p-4 border-slate-200 hover:border-orange-200 transition shadow-sm bg-white">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 border border-slate-200">
                                        {w.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{w.full_name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">Základ: {formatMoney(w.hourly_rate)} / {formatMoney(w.cost_rate)}</div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap items-end gap-3 w-full md:w-auto">
                                    <div className="flex-1 md:w-32">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Hodinovka (€/h)</label>
                                        <input 
                                            type="number" 
                                            step="0.5"
                                            value={hRate === 0 ? '' : hRate} 
                                            onChange={e => handleRateChange(w.id, 'hourly_rate', e.target.value)}
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:border-orange-500 outline-none"
                                            placeholder={w.hourly_rate.toString()}
                                        />
                                    </div>
                                    <div className="flex-1 md:w-32">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cena práce (€/h)</label>
                                        <input 
                                            type="number" 
                                            step="0.5"
                                            value={cRate === 0 ? '' : cRate} 
                                            onChange={e => handleRateChange(w.id, 'cost_rate', e.target.value)}
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:border-orange-500 outline-none"
                                            placeholder={w.cost_rate.toString()}
                                        />
                                    </div>
                                    <button 
                                        
                                        onClick={() => saveRate(w.id)}
                                        disabled={savingId === w.id}
                                        className="h-9 w-9 flex items-center justify-center bg-slate-900 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                                    >
                                        {savingId === w.id ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                                    </button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
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
                const fullEquation = (equation + display).replace(/[^0-9+\-*/.]/g, '');
                const calculate = new Function(`return ${fullEquation}`);
                const res = calculate();
                setDisplay(String(roundFin(Number(res))));
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
        <Card className="bg-slate-100 border-slate-200 w-full" padding="p-4">
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
        { id: '1', description: 'Položka č.1', unit: 'ks', qty: 1, unit_cost: 0, margin: 20 },
        { id: '2', description: 'Práca', unit: 'hod', qty: 1, unit_cost: 0, margin: 30 }
    ]);

    const load = async () => {
        const { data: s } = await supabase.from('sites').select('*').eq('id', siteId).single();
        const { data: q } = await supabase.from('quotes').select('*, sites(name)').eq('site_id', siteId).order('created_at', { ascending: false });
        if(s) setLead(s);
        if(q) setQuotes(q);
    };

    useEffect(() => { load(); }, [siteId]);

    const handleUpdateNotes = async (e: any) => {
        const { breakdown, hasVat, vatRate, isIndividualVat } = parseNotesData(lead.notes);
        let finalNotes = e.target.value; 
        
        if (breakdown.length > 0) {
            const dataToStore = { items: breakdown, hasVat, vatRate, isIndividualVat };
            finalNotes += `\n\n[JSON_BREAKDOWN:${JSON.stringify(dataToStore)}]`;
        }
        await supabase.from('sites').update({ notes: finalNotes }).eq('id', siteId);
        setLead({ ...lead, notes: finalNotes });
    };

    const handleUpdateBudget = async (val: number) => {
        const cleanVal = roundFin(Math.max(0, val));
        await supabase.from('sites').update({ budget: cleanVal }).eq('id', siteId);
        setLead({ ...lead, budget: cleanVal });
    };

    const addCalcRow = () => setCalcRows([...calcRows, { id: crypto.randomUUID(), description: '', unit: 'ks', qty: 0, unit_cost: 0, margin: 20 }]);
    const removeCalcRow = (id: string) => setCalcRows(calcRows.filter(r => r.id !== id));
    const updateRow = (id: string, field: keyof CalcRow, val: any) => {
        let finalVal = val;
        if (['qty', 'unit_cost', 'margin'].includes(field)) finalVal = Math.max(0, parseFloat(val) || 0);
        setCalcRows(calcRows.map(r => r.id === id ? { ...r, [field]: finalVal } : r));
    };

    const totalCost = roundFin(calcRows.reduce((acc, r) => acc + (r.qty * r.unit_cost), 0));
    const totalPrice = roundFin(calcRows.reduce((acc, r) => {
        const cost = r.qty * r.unit_cost;
        const price = cost / ((100 - r.margin) / 100);
        return acc + (r.margin < 100 ? price : cost);
    }, 0));
    const totalProfit = roundFin(totalPrice - totalCost);

    if(!lead) return <div className="p-8 text-center"><Loader2 className="animate-spin text-orange-600 mx-auto"/></div>;

    const { cleanNotes, breakdown: budgetItems } = parseNotesData(lead.notes);

    return (
        <div className="space-y-6 pb-4 md:pb-20">
            <div className="flex justify-between items-center">
                <button onClick={onBack} className="h-10 px-3 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-white border border-transparent hover:border-slate-200 font-semibold text-sm flex items-center gap-2 transition group">
                    <ArrowLeft size={17} className="group-hover:-translate-x-0.5 transition-transform"/> Späť
                </button>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowConvertModal(true)}><CheckCircle2 size={16}/> Začať realizáciu</Button>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{lead.name}</h1>
                        <div className="flex flex-col md:flex-row md:gap-4 gap-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><User size={14}/> {lead.client_name}</span>
                            <span className="flex items-center gap-1"><MapPin size={14}/> {lead.address}</span>
                        </div>
                    </div>
                    <Badge status={lead.lead_stage || 'new'} />
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4 mb-6">
                    <div className="bg-slate-100 p-1 rounded-xl inline-flex gap-1 border border-slate-200 overflow-x-auto max-w-full w-full md:w-auto">
                        {[
                            { id: 'info', label: 'Prehľad & Poznámky', icon: ClipboardList },
                            { id: 'calculator', label: 'Rozpočet & Kalkulácia', icon: Calculator },
                            { id: 'quotes', label: `Cenové ponuky (${quotes.length})`, icon: FileText }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-lg transition whitespace-nowrap flex-1 md:flex-none justify-center ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            >
                                <tab.icon size={16}/> {tab.label}
                            </button>
                        ))}
                    </div>
                    
                    {activeTab === 'calculator' && (
                        <Button 
                            fullWidth
                            size="sm" 
                            className="bg-orange-600 hover:bg-orange-700 shadow-orange-200 md:w-auto" 
                            onClick={() => {
                                setShowQuoteModal(true);
                                const quoteItems = calcRows.filter(row => row.description && row.qty > 0).map(row => {
                                    const cost = row.qty * row.unit_cost;
                                    const price = row.margin < 100 ? cost / ((100 - row.margin) / 100) : cost;
                                    return {
                                        description: row.description,
                                        quantity: row.qty,
                                        unit: row.unit,
                                        unit_price: roundFin(price),
                                        vat_rate: DEFAULT_VAT_RATE
                                    };
                                });
                                window.quoteItemsFromCalc = quoteItems;
                            }}
                        >
                            <Send size={16}/> Preniesť do Cenovej Ponuky
                        </Button>
                    )}
                    {activeTab === 'quotes' && (
                        <Button 
                            fullWidth
                            size="sm" 
                            className="md:w-auto" 
                            onClick={() => setShowQuoteModal(true)}
                        >
                            <Plus size={16}/> Vytvoriť Cenovú Ponuku
                        </Button>
                    )}
                </div>

                <div>
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Poznámky k dopytu</label>
                                    <textarea 
                                        className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 resize-none font-medium text-slate-700 leading-relaxed"
                                        placeholder="Sem si napíšte detaily, čo treba spraviť, odhady, telefonáty..."
                                        value={cleanNotes}
                                        onChange={(e) => {
                                            setLead({...lead, notes: e.target.value});
                                        }}
                                        onBlur={handleUpdateNotes}
                                    ></textarea>
                                </div>
                                {budgetItems.length > 0 && (
                                    <div className="p-4 bg-orange-50/30 rounded-2xl border border-orange-100">
                                        <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-widest mb-3 flex items-center gap-2">
                                            <ListPlus size={14}/> Položkový Rozpočet v poznámkach
                                        </h4>
                                        <div className="space-y-1.5">
                                            {budgetItems.map((item: any) => (
                                                <div key={item.id} className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600 font-bold">{item.label}</span>
                                                    <span className="text-slate-900 font-black">{formatMoney(item.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
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
                                                onBlur={(e) => handleUpdateBudget(Math.max(0, parseFloat(e.target.value) || 0))}
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
                        <div className="animate-in fade-in space-y-6">
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
                                    <div className="font-bold text-slate-700 text-sm flex items-center gap-2"><LayoutList size={16}/> Rozpočtový Hárok</div>
                                    <Button variant="secondary" size="sm" onClick={addCalcRow}><Plus size={14}/> Pridať položku</Button>
                                </div>
                                <div className="w-full overflow-x-auto lg:overflow-visible custom-scrollbar">
                                  <table className="w-full text-sm text-left min-w-[800px] lg:min-w-0">
                                      <thead className="bg-white text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                                          <tr>
                                              <th className="p-3 w-8">#</th>
                                              <th className="p-3 min-w-[200px]">Popis</th>
                                              <th className="p-3 w-24 text-center px-6">MJ</th>
                                              <th className="p-3 w-20 text-right px-6">Mn.</th>
                                              <th className="p-3 w-24 text-right px-6">Cena</th>
                                              <th className="p-3 w-28 text-right px-6">Marža %</th>
                                              <th className="p-3 w-32 text-right px-6">Predajná Cena</th>
                                              <th className="p-3 w-10"></th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                              {calcRows.map((row, i) => {
                                                  const rowCost = roundFin(row.qty * row.unit_cost);
                                                  const rowPrice = roundFin(rowCost / ((100 - row.margin) / 100));
                                                  return (
                                                      <tr key={row.id} className="group hover:bg-slate-50 transition">
                                                          <td className="p-3 text-center text-slate-300 font-mono">{i+1}</td>
                                                          <td className="p-3"><input list="quote-desc-suggestions" className="w-full bg-transparent outline-none font-bold text-slate-700 placeholder:text-slate-300 min-h-[40px]" value={row.description} onChange={e => updateRow(row.id, 'description', e.target.value)} placeholder="Názov položky..." /></td>
                                                          <td className="p-3 text-center px-6">
                                                              <select className="w-full bg-transparent outline-none text-center text-slate-500" value={row.unit} onChange={e => updateRow(row.id, 'unit', e.target.value)}>
                                                                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                                              </select>
                                                          </td>
                                                          <td className="p-3 text-right px-6"><input type="number" min="0" className="w-full bg-transparent outline-none text-right font-mono" value={row.qty === 0 ? '' : row.qty} onFocus={e => e.target.select()} onChange={e => updateRow(row.id, 'qty', Math.max(0, parseFloat(e.target.value) || 0))} placeholder="0" /></td>
                                                          <td className="p-3 text-right px-6"><input type="number" min="0" className="w-full bg-transparent outline-none text-right font-mono" value={row.unit_cost === 0 ? '' : row.unit_cost} onFocus={e => e.target.select()} onChange={e => updateRow(row.id, 'unit_cost', Math.max(0, parseFloat(e.target.value) || 0))} placeholder="0.00" /></td>
                                                          <td className="p-3 text-right px-6"><input type="number" min="0" className="w-full bg-transparent outline-none text-right font-bold text-orange-600" value={row.margin === 0 ? '' : row.margin} onFocus={e => e.target.select()} onChange={e => updateRow(row.id, 'margin', Math.max(0, parseFloat(e.target.value) || 0))} placeholder="0" /></td>
                                                          <td className="p-3 text-right px-6 font-bold text-slate-900 bg-slate-50/50">{formatMoney(rowPrice)}</td>
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

                                <div className="flex flex-col lg:flex-row gap-6 items-start">
                                    <div className="w-full lg:max-w-[320px]">
                                        <IntegratedCalculator />
                                    </div>
                                </div>
                        </div>
                    )}

                    {activeTab === 'quotes' && (
                        <div className="animate-in fade-in">
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
                message="Zákazka bude presunutá do realizácie. Uistite sa, že máte hotovú cenovú ponuku."
                confirmText="Začať Realizáciu"
                type="primary"
            />
        </div>
    );
};

const QuoteBuilder = ({ onClose, sites, profile, organization, onSave, initialSiteId, initialQuote, initialItems = [] }: any) => {
    const initialMeta = parseQuoteMeta(initialQuote?.notes);
    const [header, setHeader] = useState({ 
        client_name: initialQuote?.client_name || '',
        client_address: initialQuote?.client_address || '',
        site_id: initialQuote?.site_id || initialSiteId || '',
        issue_date: initialQuote?.issue_date || new Date().toISOString().split('T')[0],
        valid_until: initialQuote?.valid_until || '',
        has_vat: initialMeta.has_vat,
        vat_rate: initialMeta.vat_rate,
        discount_type: initialMeta.discount_type,
        discount_value: initialMeta.discount_value
    });
    const [items, setTableItems] = useState(
        initialItems.length
            ? initialItems.map((i: any) => ({
                description: i.description || '',
                quantity: Number(i.quantity || 1),
                unit: i.unit || 'ks',
                unit_price: Number(i.unit_price || 0),
                vat_rate: Number(i.vat_rate ?? initialMeta.vat_rate)
            }))
            : [{ description: '', quantity: 1, unit: 'ks', unit_price: 0, vat_rate: initialMeta.vat_rate }]
    );
    const [saving, setSaving] = useState(false);
    const [savedItems, setSavedItems] = useState<any[]>([]);
    const [focusedDescriptionIndex, setFocusedDescriptionIndex] = useState<number | null>(null);
    const [descriptionMenuRect, setDescriptionMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);
    const descriptionMenuRef = useRef<HTMLDivElement | null>(null);
    const descriptionMenuInteractionRef = useRef(false);
    const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
    const [editingSuggestionText, setEditingSuggestionText] = useState('');
    const [hasImportedFromCalc, setHasImportedFromCalc] = useState(false);

    useEffect(() => {
        if (window.quoteItemsFromCalc && window.quoteItemsFromCalc.length > 0) {
            setTableItems(window.quoteItemsFromCalc);
            setHasImportedFromCalc(true);
            delete window.quoteItemsFromCalc;
        }
    }, []);

    const loadSavedItems = async () => {
        const { data, error } = await supabase
            .from('quote_item_library')
            .select('id, description')
            .eq('organization_id', profile.organization_id)
            .order('updated_at', { ascending: false })
            .limit(300);

        if (error) {
            return;
        }

        setSavedItems(data || []);
    };

    useEffect(() => {
        loadSavedItems();
    }, [profile.organization_id]);

    useEffect(() => {
        if (focusedDescriptionIndex === null) return;
        const closeMenu = (event?: Event) => {
            if (event?.target instanceof Node && descriptionMenuRef.current?.contains(event.target)) return;
            if (event?.target instanceof Element && event.target.closest('[data-quote-description-input="true"]')) return;
            closeDescriptionMenu();
        };
        window.addEventListener('scroll', closeMenu, true);
        window.addEventListener('resize', closeMenu);
        document.addEventListener('pointerdown', closeMenu, true);
        return () => {
            window.removeEventListener('scroll', closeMenu, true);
            window.removeEventListener('resize', closeMenu);
            document.removeEventListener('pointerdown', closeMenu, true);
        };
    }, [focusedDescriptionIndex]);

    useEffect(() => {
        if(header.site_id) {
            const s = sites.find((x:any) => x.id === header.site_id);
            if(s) setHeader(h => ({ ...h, client_name: s.client_name || '', client_address: s.address || '' }));
        }
    }, [header.site_id]);

    const addItem = () => setTableItems([...items, { description: '', quantity: 1, unit: 'ks', unit_price: 0, vat_rate: header.vat_rate }]);
    const removeItem = (idx: number) => setTableItems(items.filter((_: any, i: number) => i !== idx));
    const openDescriptionMenu = (idx: number, element: HTMLInputElement) => {
        const rect = element.getBoundingClientRect();
        setFocusedDescriptionIndex(idx);
        setDescriptionMenuRect({
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX,
            width: rect.width
        });
    };
    const closeDescriptionMenu = () => {
        descriptionMenuInteractionRef.current = false;
        setFocusedDescriptionIndex(null);
        setDescriptionMenuRect(null);
        setEditingSuggestionId(null);
        setEditingSuggestionText('');
    };
    const updateItem = (idx: number, field: string, val: any) => {
        const newItems = [...items];
        let finalVal = val;
        if (['quantity', 'unit_price', 'vat_rate'].includes(field)) finalVal = Math.max(0, parseFloat(val) || 0);
        // @ts-ignore
        newItems[idx][field] = finalVal;
        setTableItems(newItems);
    };
    const updateDefaultVatRate = (value: any) => {
        const cleanRate = Math.max(0, parseFloat(value) || 0);
        setHeader({ ...header, vat_rate: cleanRate });
    };
    const applyDefaultVatToItems = () => {
        setTableItems(items.map((item: any) => ({ ...item, vat_rate: header.vat_rate })));
    };

    const subtotal = roundFin(items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0));
    const discountAmount = roundFin(
        header.discount_type === 'percent'
            ? Math.min(subtotal, subtotal * (Math.max(0, Number(header.discount_value || 0)) / 100))
            : header.discount_type === 'fixed'
                ? Math.min(subtotal, Math.max(0, Number(header.discount_value || 0)))
                : 0
    );
    const subtotalAfterDiscount = roundFin(Math.max(0, subtotal - discountAmount));
    const totalVat = roundFin(items.reduce((sum: number, item: any) => {
        const itemSubtotal = item.quantity * item.unit_price;
        const share = subtotal > 0 ? itemSubtotal / subtotal : 0;
        const discountedItemSubtotal = roundFin(itemSubtotal - (discountAmount * share));
        return sum + (header.has_vat ? roundFin(discountedItemSubtotal * (item.vat_rate / 100)) : 0);
    }, 0));
    const total = roundFin(subtotalAfterDiscount + totalVat);
    const getDescriptionOptions = (value: string) => {
        const query = String(value || '').trim().toLowerCase();
        const savedOptions = savedItems
            .map((item: any) => ({
                id: item.id,
                description: String(item.description || '').trim(),
                saved: true
            }))
            .filter(option => option.description);

        return savedOptions
            .filter(option => !query || option.description.toLowerCase().includes(query))
            .slice(0, 10);
    };
    const updateSavedSuggestion = async (id: string) => {
        const description = editingSuggestionText.trim();
        if (!description) return;
        const { error } = await supabase
            .from('quote_item_library')
            .update({
                description,
                normalized_key: normalizeQuoteLibraryKey(description),
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            window.alert('Názov položky sa nepodarilo upraviť: ' + error.message);
            return;
        }

        setEditingSuggestionId(null);
        setEditingSuggestionText('');
        await loadSavedItems();
    };
    const deleteSavedSuggestion = async (id: string) => {
        const { error } = await supabase.from('quote_item_library').delete().eq('id', id);
        if (error) {
            window.alert('Názov položky sa nepodarilo vymazať: ' + error.message);
            return;
        }
        setSavedItems(savedItems.filter((item: any) => item.id !== id));
    };
    const saveQuoteItemNames = async () => {
        const uniqueNames: string[] = Array.from(new Set<string>(
            items
                .map((item: any) => String(item.description || '').trim())
                .filter(Boolean)
        )).slice(0, 300);

        if (uniqueNames.length === 0) return;

        const now = new Date().toISOString();
        const payload = uniqueNames.map(description => ({
            organization_id: profile.organization_id,
            normalized_key: normalizeQuoteLibraryKey(description),
            description,
            updated_at: now
        }));

        const { error } = await supabase
            .from('quote_item_library')
            .upsert(payload, { onConflict: 'organization_id,normalized_key' });

        if (!error) await loadSavedItems();
        else console.warn('Quote item library save skipped:', error.message);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const quotePayload = {
                organization_id: profile.organization_id,
                site_id: header.site_id || null,
                client_name: header.client_name,
                client_address: header.client_address,
                total_amount: total,
                issue_date: header.issue_date,
                valid_until: header.valid_until || null,
                quote_number: initialQuote?.quote_number || `CP-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
                notes: buildQuoteMeta(header)
            };

            let quote = initialQuote;
            let qErr = null;
            if (initialQuote?.id) {
                const result = await supabase.from('quotes').update(quotePayload).eq('id', initialQuote.id).select().single();
                quote = result.data;
                qErr = result.error;
                if (!qErr) {
                    const { error: delErr } = await supabase.from('quote_items').delete().eq('quote_id', initialQuote.id);
                    if (delErr) throw delErr;
                }
            } else {
                const result = await supabase.from('quotes').insert([quotePayload]).select().single();
                quote = result.data;
                qErr = result.error;
            }

            if (qErr) throw qErr;

            const itemsPayload = items.map((i: any) => {
                const itemSubtotal = roundFin(i.quantity * i.unit_price);
                const share = subtotal > 0 ? itemSubtotal / subtotal : 0;
                const itemDiscount = roundFin(discountAmount * share);
                const discountedItemSubtotal = roundFin(itemSubtotal - itemDiscount);
                const itemVat = header.has_vat ? roundFin(discountedItemSubtotal * (i.vat_rate / 100)) : 0;
                return {
                    quote_id: quote.id,
                    description: i.description,
                    quantity: i.quantity,
                    unit: i.unit,
                    unit_price: i.unit_price,
                    total_price: roundFin(discountedItemSubtotal + itemVat),
                    vat_rate: header.has_vat ? i.vat_rate : 0
                };
            });

            const { error: iErr } = await supabase.from('quote_items').insert(itemsPayload);
            if (iErr) throw iErr;

            await saveQuoteItemNames();
            onSave();
        } catch (e: any) {
            window.alert("Chyba: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Tvorba Cenovej Ponuky" onClose={onClose} maxWidth="max-w-6xl">
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
                        <div className="grid grid-cols-2 gap-2">
                            <Input label="Dátum vystavenia" type="date" value={header.issue_date} onChange={(e: any) => setHeader({...header, issue_date: e.target.value})} />
                            <Input label="Platnosť do" type="date" value={header.valid_until} onChange={(e: any) => setHeader({...header, valid_until: e.target.value})} />
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="vat" className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" checked={header.has_vat} onChange={(e) => setHeader({...header, has_vat: e.target.checked})} />
                                <label htmlFor="vat" className="font-bold text-sm text-slate-700">Započítať DPH</label>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] uppercase font-black text-slate-400">Celková suma {header.has_vat ? 's DPH' : 'bez DPH'}</div>
                                <div className="text-2xl font-black text-orange-600 tracking-tighter">{formatMoney(total)}</div>
                            </div>
                        </div>
                        {header.has_vat && (
                            <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Predvolená DPH</span>
                                    <div className="relative w-20">
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-7 text-sm font-bold text-slate-900 outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10"
                                            value={header.vat_rate}
                                            onFocus={e => e.target.select()}
                                            onChange={e => updateDefaultVatRate(e.target.value)}
                                        />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">%</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={applyDefaultVatToItems}
                                    className="h-9 px-3 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 text-[11px] font-black uppercase tracking-wide hover:bg-orange-100 transition whitespace-nowrap"
                                >
                                    Použiť
                                </button>
                            </div>
                        )}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Zľava</label>
                                    <select
                                        className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10"
                                        value={header.discount_type}
                                        onChange={(e) => setHeader({ ...header, discount_type: e.target.value })}
                                    >
                                        <option value="none">Bez zľavy</option>
                                        <option value="percent">Percentuálna (%)</option>
                                        <option value="fixed">Pevná suma (€)</option>
                                    </select>
                                </div>
                                {header.discount_type !== 'none' && (
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hodnota</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900 outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10"
                                            value={header.discount_value}
                                            onFocus={e => e.target.select()}
                                            onChange={e => setHeader({ ...header, discount_value: Math.max(0, parseFloat(e.target.value) || 0) })}
                                        />
                                    </div>
                                )}
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm">
                                    <span className="font-semibold text-red-700">Zľava v sume</span>
                                    <span className="font-black tabular-nums text-red-700">-{formatMoney(discountAmount)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex justify-between items-center px-1 uppercase text-xs tracking-widest">
                        Položky rozpočtu
                        <Button size="sm" variant="secondary" onClick={addItem}><Plus size={14}/> Pridať riadok</Button>
                    </h4>
                    {hasImportedFromCalc && (
                        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                            <CheckCircle2 size={16} className="text-green-600"/>
                            Položky boli automaticky prenesené z kalkulácie
                        </div>
                    )}
                    <div className="border border-slate-200 rounded-xl overflow-visible shadow-sm bg-white">
                        <div className="w-full overflow-x-auto overflow-y-visible custom-scrollbar">
                           <table className="w-full text-sm text-left min-w-[980px]">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
                                <tr>
                                    <th className="p-3 pl-4 min-w-[270px] uppercase tracking-wide">Popis</th>
                                    <th className="p-3 w-16 text-center uppercase tracking-wide">Mn.</th>
                                    <th className="p-3 w-24 text-center uppercase tracking-wide">Jedn.</th>
                                    <th className="p-3 w-28 text-right whitespace-nowrap uppercase tracking-wide">Cena</th>
                                    {header.has_vat && <th className="p-3 w-24 text-center whitespace-nowrap uppercase tracking-wide">DPH</th>}
                                    {header.has_vat && <th className="p-3 w-28 text-right whitespace-nowrap uppercase tracking-wide">DPH suma</th>}
                                    <th className="p-3 w-32 text-right whitespace-nowrap uppercase tracking-wide">Celkom</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item: any, i: number) => {
                                    const itemSub = roundFin(Number(item.quantity) * Number(item.unit_price));
                                    const itemVat = header.has_vat ? roundFin(itemSub * (item.vat_rate / 100)) : 0;
                                    const itemTotal = roundFin(itemSub + itemVat);
                                    return (
                                        <tr key={i} className="group hover:bg-slate-50 transition">
                                            <td className="p-2 pl-4">
                                                <div className="relative">
                                                    <input
                                                        data-quote-description-input="true"
                                                        className="w-full bg-transparent outline-none font-bold text-slate-700 min-h-[40px]"
                                                        placeholder="Názov položky..."
                                                        value={item.description}
                                                        onFocus={e => openDescriptionMenu(i, e.currentTarget)}
                                                        onClick={e => openDescriptionMenu(i, e.currentTarget)}
                                                        onBlur={() => window.setTimeout(() => {
                                                            if (descriptionMenuInteractionRef.current) {
                                                                descriptionMenuInteractionRef.current = false;
                                                                return;
                                                            }
                                                            closeDescriptionMenu();
                                                        }, 120)}
                                                        onChange={e => {
                                                            updateItem(i, 'description', e.target.value);
                                                            openDescriptionMenu(i, e.currentTarget);
                                                        }}
                                                    />
                                                    {focusedDescriptionIndex === i && descriptionMenuRect && getDescriptionOptions(item.description).length > 0 && createPortal(
                                                        <div
                                                            ref={descriptionMenuRef}
                                                            onMouseDownCapture={() => {
                                                                descriptionMenuInteractionRef.current = true;
                                                            }}
                                                            className="fixed z-[99999] max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 custom-scrollbar"
                                                            style={{
                                                                top: descriptionMenuRect.top,
                                                                left: descriptionMenuRect.left,
                                                                width: descriptionMenuRect.width
                                                            }}
                                                        >
                                                            {getDescriptionOptions(item.description).map(option => (
                                                                <div key={option.id} className="group flex items-center gap-2 border-b border-slate-100 last:border-b-0 hover:bg-orange-50 transition">
                                                                    {editingSuggestionId === option.id ? (
                                                                        <input
                                                                            autoFocus
                                                                            value={editingSuggestionText}
                                                                            onChange={event => setEditingSuggestionText(event.target.value)}
                                                                            onMouseDown={event => event.stopPropagation()}
                                                                            onKeyDown={event => {
                                                                                if (event.key === 'Enter') updateSavedSuggestion(option.id);
                                                                                if (event.key === 'Escape') {
                                                                                    setEditingSuggestionId(null);
                                                                                    setEditingSuggestionText('');
                                                                                }
                                                                            }}
                                                                            className="min-w-0 flex-1 px-3 py-2.5 text-sm font-semibold text-slate-800 bg-white outline-none"
                                                                        />
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onMouseDown={(event) => {
                                                                                event.preventDefault();
                                                                                updateItem(i, 'description', option.description);
                                                                                closeDescriptionMenu();
                                                                            }}
                                                                            className="min-w-0 flex-1 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 group-hover:text-orange-700 transition truncate"
                                                                        >
                                                                            {option.description}
                                                                        </button>
                                                                    )}
                                                                    {option.saved && (
                                                                        <div className="flex items-center gap-1 pr-2">
                                                                            {editingSuggestionId === option.id ? (
                                                                                <button
                                                                                    type="button"
                                                                                    title="Uložiť názov"
                                                                                    onMouseDown={(event) => {
                                                                                        event.preventDefault();
                                                                                        updateSavedSuggestion(option.id);
                                                                                    }}
                                                                                    className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition"
                                                                                >
                                                                                    <Check size={14}/>
                                                                                </button>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    title="Upraviť názov"
                                                                                    onMouseDown={(event) => {
                                                                                        event.preventDefault();
                                                                                        setEditingSuggestionId(option.id);
                                                                                        setEditingSuggestionText(option.description);
                                                                                    }}
                                                                                    className="p-1.5 rounded-lg text-slate-300 hover:text-orange-600 hover:bg-white transition"
                                                                                >
                                                                                    <Pencil size={14}/>
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                type="button"
                                                                                title="Vymazať názov"
                                                                                onMouseDown={(event) => {
                                                                                    event.preventDefault();
                                                                                    deleteSavedSuggestion(option.id);
                                                                                }}
                                                                                className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-white transition"
                                                                            >
                                                                                <Trash2 size={14}/>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>,
                                                        document.body
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-2"><input type="number" min="0" className="w-full bg-transparent outline-none text-center font-semibold tabular-nums text-slate-800" value={item.quantity === 0 ? '' : item.quantity} onFocus={e => e.target.select()} onChange={e => updateItem(i, 'quantity', Math.max(0, parseFloat(e.target.value) || 0))} placeholder="0" /></td>
                                            <td className="p-2">
                                                <select className="w-full bg-transparent outline-none text-center text-slate-500 font-medium" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                                                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2"><input type="number" min="0" className="w-full bg-transparent outline-none text-right font-semibold tabular-nums text-slate-800" value={item.unit_price === 0 ? '' : item.unit_price} onFocus={e => e.target.select()} onChange={e => updateItem(i, 'unit_price', Math.max(0, parseFloat(e.target.value) || 0))} placeholder="0.00" /></td>
                                            {header.has_vat && (
                                                <td className="p-2">
                                                    <div className="relative">
                                                        <input type="number" min="0" className="w-full h-9 rounded-lg bg-orange-50/60 border border-orange-100 outline-none text-center pr-6 font-bold tabular-nums text-orange-700 focus:border-orange-300 focus:bg-white" value={item.vat_rate} onFocus={e => e.target.select()} onChange={e => updateItem(i, 'vat_rate', Math.max(0, parseFloat(e.target.value) || 0))} />
                                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-orange-400">%</span>
                                                    </div>
                                                </td>
                                            )}
                                            {header.has_vat && (
                                                <td className="p-2 text-right text-slate-500 font-semibold tabular-nums">{formatMoney(itemVat)}</td>
                                            )}
                                            <td className="p-2 text-right font-black text-slate-900 bg-slate-50/30 tabular-nums">{formatMoney(itemTotal)}</td>
                                            <td className="p-2 text-right"><button type="button" onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 transition active:scale-90"><Trash2 size={16}/></button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                           </table>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end pt-5 border-t border-slate-100">
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-4">
                            <div>
                                <div className="text-sm font-bold text-slate-900">Súhrn cenovej ponuky</div>
                                <div className="text-xs font-medium text-slate-500">Prepočet ceny bez DPH, zľavy, DPH a finálnej ceny.</div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-[10px] font-black uppercase tracking-wide text-orange-600">Celkom s DPH</div>
                                <div className="text-2xl font-black tabular-nums text-slate-950">{formatMoney(total)}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 text-sm">
                            <div className="bg-white px-4 py-3">
                                <div className="text-xs font-semibold text-slate-500">Bez DPH</div>
                                <div className="mt-1 font-black tabular-nums text-slate-900">{formatMoney(subtotal)}</div>
                            </div>
                            <div className="bg-white px-4 py-3">
                                <div className="text-xs font-semibold text-slate-500">Zľava</div>
                                <div className={`mt-1 font-black tabular-nums ${discountAmount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                    {discountAmount > 0 ? `-${formatMoney(discountAmount)}` : formatMoney(0)}
                                </div>
                            </div>
                            <div className="bg-white px-4 py-3">
                                <div className="text-xs font-semibold text-slate-500">Po zľave bez DPH</div>
                                <div className="mt-1 font-black tabular-nums text-slate-900">{formatMoney(subtotalAfterDiscount)}</div>
                            </div>
                            <div className="bg-white px-4 py-3">
                                <div className="text-xs font-semibold text-slate-500">DPH spolu</div>
                                <div className="mt-1 font-black tabular-nums text-orange-600">{header.has_vat ? `+${formatMoney(totalVat)}` : formatMoney(0)}</div>
                            </div>
                        </div>
                    </div>
                    <Button onClick={handleSave} loading={saving} size="lg" className="shadow-orange-200 lg:min-w-[260px]"><CheckCircle2 size={18}/> {initialQuote?.id ? 'Uložiť Cenovú Ponuku' : 'Vystaviť Cenovú Ponuku'}</Button>
                </div>
            </div>
        </Modal>
    );
};

const QuotesList = ({ quotes, sites, onCreate, profile, organization, refresh }: any) => {
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [items, setTableItems] = useState<any[]>([]);
    const [editingQuote, setEditingQuote] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const handleViewQuote = async (quote: any) => {
        const { data } = await supabase.from('quote_items').select('*').eq('quote_id', quote.id);
        setTableItems(data || []);
        setSelectedQuote(quote);
    };

    const quoteSubtotal = roundFin(items.reduce((s: number, i: any) => {
        const sub = roundFin(Number(i.quantity) * Number(i.unit_price));
        return s + sub;
    }, 0));
    
    const quoteMeta = parseQuoteMeta(selectedQuote?.notes);
    const quoteDiscountAmount = roundFin(
        quoteMeta.discount_type === 'percent'
            ? Math.min(quoteSubtotal, quoteSubtotal * (Math.max(0, Number(quoteMeta.discount_value || 0)) / 100))
            : quoteMeta.discount_type === 'fixed'
                ? Math.min(quoteSubtotal, Math.max(0, Number(quoteMeta.discount_value || 0)))
                : 0
    );
    const quoteSubtotalAfterDiscount = roundFin(Math.max(0, quoteSubtotal - quoteDiscountAmount));
    const quoteVatTotal = roundFin(items.reduce((s: number, i: any) => {
        const sub = roundFin(Number(i.quantity) * Number(i.unit_price));
        const share = quoteSubtotal > 0 ? sub / quoteSubtotal : 0;
        const discountedSub = roundFin(sub - (quoteDiscountAmount * share));
        return s + roundFin(discountedSub * ((i.vat_rate || 0) / 100));
    }, 0));

    const totalStored = roundFin(Number(selectedQuote?.total_amount || 0));
    const quoteGrandTotal = totalStored > 0 ? totalStored : roundFin(quoteSubtotalAfterDiscount + quoteVatTotal);

    const generatePDF = async () => {
        if (!printRef.current) return;

        try {
            await exportElementToPdf(printRef.current, {
                filename: `CP_${selectedQuote?.quote_number}.pdf`,
                title: `MojaStavba - Cenová ponuka č. ${selectedQuote?.quote_number}`,
                pageMarginMm: 0
            });
        } catch (e) {
            console.error(e);
            window.alert("Chyba pri generovaní PDF. Skúste znova alebo použite desktop verziu.");
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
                        <button onClick={() => setSelectedQuote(null)} className="h-10 px-3 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-white border border-transparent hover:border-slate-200 font-semibold text-sm flex items-center gap-2 transition group"><ArrowLeft size={17} className="group-hover:-translate-x-0.5 transition-transform"/> Späť na zoznam</button>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setEditingQuote(selectedQuote)}><Pencil size={16}/> Upraviť</Button>
                            <Button variant="secondary" onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 size={16}/> Zmazať</Button>
                            <Button onClick={generatePDF}><Printer size={16}/> Stiahnuť PDF</Button>
                        </div>
                    </div>
                    <div className="bg-slate-500/10 p-4 md:p-8 rounded-2xl overflow-auto flex justify-center custom-scrollbar">
                        <div 
                            ref={printRef} 
                            className="bg-white text-slate-900 relative shadow-2xl mx-auto flex flex-col"
                            style={{ width: '210mm', minHeight: '297mm', padding: '15mm 15mm' }} 
                        >
                            <div className="flex justify-between items-start mb-10 border-b-2 border-orange-50 pb-6">
                                <div className="flex items-center gap-4">
                                    {organization.logo_url && <img src={organization.logo_url} crossOrigin="anonymous" className="h-20 w-28 object-contain" alt="Logo" />}
                                    <div>
                                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cenová ponuka</h1>
                                        <div className="text-slate-500 mt-2 font-semibold tracking-wide text-[10px]">č. {selectedQuote.quote_number}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-xl text-slate-800">{organization.name}</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Zhotoviteľ</div>
                                    <div className="text-[10px] text-slate-400 space-y-0.5">
                                        {organization.ico && <div>IČO: {organization.ico}</div>}
                                        {organization.dic && <div>DIČ: {organization.dic}</div>}
                                        {organization.is_vat_payer && organization.ic_dph && <div>IČ DPH: {organization.ic_dph}</div>}
                                        {organization.business_address && <div>{organization.address_type === 'sidlo' ? 'Sídlo' : 'Miesto podnikania'}: {organization.business_address}</div>}
                                    </div>
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
                            <table className="w-full text-[11px] mb-10 border-collapse table-fixed">
                                <thead className="bg-slate-100 text-slate-600 font-bold text-[9.5px]">
                                    <tr>
                                        <th className="p-3 text-left w-[48%]">Položka</th>
                                        <th className="p-3 text-center w-[12%] whitespace-nowrap">Mn.</th>
                                        <th className="p-3 text-right w-[16%] whitespace-nowrap">Cena bez DPH</th>
                                        {quoteVatTotal > 0 && <th className="p-3 text-center w-[10%] whitespace-nowrap">DPH</th>}
                                        <th className="p-3 text-right w-[14%] whitespace-nowrap">Celkom</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, i) => {
                                        const itemSub = roundFin(Number(item.quantity) * Number(item.unit_price));
                                        const itemVat = roundFin(itemSub * ((item.vat_rate || 0) / 100));
                                        return (
                                            <tr key={i}>
                                                <td className="p-3 font-medium text-slate-800 break-words leading-relaxed">{item.description}</td>
                                                <td className="p-3 text-center text-slate-600 whitespace-nowrap">{item.quantity} {item.unit}</td>
                                                <td className="p-3 text-right text-slate-600 whitespace-nowrap tabular-nums">{formatMoney(item.unit_price)}</td>
                                                {quoteVatTotal > 0 && <td className="p-3 text-center text-slate-500 font-bold whitespace-nowrap tabular-nums">{item.vat_rate}%</td>}
                                                <td className="p-3 text-right font-bold text-slate-800 whitespace-nowrap tabular-nums">{formatMoney(itemSub + itemVat)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="flex justify-end mb-12">
                                <div className="w-[92mm] rounded-2xl border border-orange-100 bg-orange-50/40 p-5">
                                    <div className="space-y-2.5 text-[12px] text-slate-600">
                                        <div className="flex justify-between gap-6">
                                            <span>Základ bez DPH</span>
                                            <span className="font-semibold tabular-nums text-slate-800">{formatMoney(quoteSubtotal)}</span>
                                        </div>
                                        {quoteDiscountAmount > 0 && (
                                            <>
                                                <div className="flex justify-between gap-6 text-red-700">
                                                    <span>Zľava {quoteMeta.discount_type === 'percent' ? `(${quoteMeta.discount_value}%)` : ''}</span>
                                                    <span className="font-semibold tabular-nums">-{formatMoney(quoteDiscountAmount)}</span>
                                                </div>
                                                <div className="flex justify-between gap-6">
                                                    <span>Po zľave bez DPH</span>
                                                    <span className="font-semibold tabular-nums text-slate-800">{formatMoney(quoteSubtotalAfterDiscount)}</span>
                                                </div>
                                            </>
                                        )}
                                        {quoteVatTotal > 0 && (
                                            <div className="flex justify-between gap-6">
                                                <span>DPH spolu</span>
                                                <span className="font-semibold tabular-nums text-slate-800">{formatMoney(quoteVatTotal)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 rounded-xl border border-orange-100 bg-white px-4 py-3 flex justify-between items-center gap-6">
                                        <div>
                                            <div className="text-[14px] leading-tight font-extrabold text-slate-900">Spolu k úhrade</div>
                                            <div className="mt-0.5 text-[10px] font-semibold text-slate-500">{quoteVatTotal > 0 ? 'vrátane DPH' : 'bez DPH'}</div>
                                        </div>
                                        <span className="text-[24px] leading-none font-black tabular-nums text-slate-950 whitespace-nowrap">{formatMoney(quoteGrandTotal)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-10">
                                <div className="grid grid-cols-2 gap-16 items-end">
                                    <div className="text-center">
                                        <div className="h-20 flex items-end">
                                            <div className="w-full border-b border-slate-300"></div>
                                        </div>
                                        <div className="mt-3 text-[10px] font-semibold text-slate-500 tracking-wide">Prevzal</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="h-20 flex items-end justify-center">
                                            {organization.stamp_url && (
                                                <img
                                                    src={organization.stamp_url}
                                                    crossOrigin="anonymous"
                                                    className="max-h-16 max-w-[58mm] object-contain opacity-95 pointer-events-none"
                                                    alt="Pečiatka"
                                                />
                                            )}
                                        </div>
                                        <div className="border-b border-slate-300"></div>
                                        <div className="mt-3 text-[10px] font-semibold text-slate-500 tracking-wide">Pečiatka a podpis zhotoviteľa</div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center text-slate-300 text-[8px] border-t border-slate-100 pt-3 mt-6 font-medium tracking-wide">
                                Vygenerované aplikáciou MojaStavba
                            </div>
                        </div>
                    </div>
                    {editingQuote && (
                        <QuoteBuilder
                            onClose={() => setEditingQuote(null)}
                            sites={sites}
                            profile={profile}
                            organization={organization}
                            initialQuote={editingQuote}
                            initialItems={items}
                            onSave={() => {
                                setEditingQuote(null);
                                setSelectedQuote(null);
                                refresh();
                            }}
                        />
                    )}
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
        acc[name].hours += Number(log.hours || 0);
        const rate = log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0;
        const entryCost = log.payment_type === 'fixed' ? Number(log.fixed_amount || 0) : (Number(log.hours || 0) * rate);
        acc[name].cost = roundFin(acc[name].cost + entryCost);
        acc[name].count += 1;
        return acc;
    }, {});

    const totalHours = Object.values(summary).reduce<number>((acc, item: any) => acc + Number(item.hours), 0);
    const totalCost = roundFin(Object.values(summary).reduce<number>((acc, item: any) => acc + Number(item.cost), 0));

    return (
        <div className="bg-orange-50/40 rounded-2xl border border-orange-100 overflow-hidden mb-6 shadow-sm">
            <div className="p-4 bg-orange-50 border-b border-orange-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                 <h3 className="font-bold text-orange-900 flex items-center gap-2 text-sm sm:text-base"><Euro size={18}/> Finančný súhrn prác</h3>
                 <span className="text-xs font-semibold text-orange-700 bg-white px-2.5 py-1 rounded-lg shadow-sm border border-orange-100 whitespace-nowrap">
                    {Object.keys(summary).length} pracovníkov
                 </span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left min-w-[450px]">
                    <thead className="bg-orange-50 text-orange-700 font-bold border-b border-orange-100 uppercase text-xs">
                        <tr><th className="p-4">Meno</th><th className="p-4 text-right">Odpracovaný čas</th><th className="p-4 text-right">Náklady na prácu</th><th className="p-4 text-right">Podiel</th></tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100/50">
                        {Object.entries(summary).map(([name, data]: any) => (
                            <tr key={name} className="hover:bg-orange-100/20 transition">
                                <td className="p-4 font-semibold text-slate-800">{name}</td>
                                <td className="p-4 text-right font-semibold text-slate-700 tabular-nums">{formatDuration(Number(data.hours))}</td>
                                <td className="p-4 text-right font-bold text-slate-900 tabular-nums">{formatMoney(Number(data.cost))}</td>
                                <td className="p-4 text-right text-sm text-slate-600 font-semibold tabular-nums">{((data.cost / (totalCost || 1)) * 100).toFixed(0)} %</td>
                            </tr>
                        ))}
                         <tr className="bg-orange-100/50 font-bold text-orange-950 border-t border-orange-200">
                            <td className="p-4 text-sm">Celkový súčet</td>
                            <td className="p-4 text-right text-base tabular-nums">{formatDuration(totalHours)}</td>
                            <td className="p-4 text-right text-base tabular-nums">{formatMoney(totalCost)}</td>
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
    const cost = log.payment_type === 'fixed' ? Number(log.fixed_amount || 0) : roundFin(Number(log.hours) * (log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0));
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
                        <div className="text-xs text-orange-700 font-bold uppercase mb-1">Druh odmeny</div>
                        <div className="font-bold text-slate-900">{log.payment_type === 'fixed' ? 'Úkol' : 'Hodiny'}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="text-xs text-slate-500 font-bold uppercase mb-1">Čas na stavbe</div>
                        <div className="font-bold text-slate-900">{formatDuration(Number(log.hours))}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                        <div className="text-xs text-green-700 font-bold uppercase mb-1">Cena práce</div>
                        <div className="font-black text-green-800">{formatMoney(cost)}</div>
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
  const [data, setData] = useState<any>({ tasks: [], transactions: [], materials: [], logs: [], fuel: [] });
  const [employees, setEmployees] = useState<any[]>([]); 
  const [stats, setStats] = useState<any>({ paid: 0, totalCost: 0, profit: 0, laborHours: 0, materialCost: 0, laborCost: 0, fuelCost: 0 });
  const [modals, setModals] = useState({ log: false, transaction: false, export: false }); 
  const [exportSettings, setExportSettings] = useState({ type: 'client' as 'client' | 'owner', includeFinancials: false });
  const [formState, setFormState] = useState<any>({});
  const [confirmAction, setConfirmAction] = useState<{open: boolean, table: string, id: string}>({ open: false, table: '', id: '' });
  const [alertState, setAlertState] = useState<{open: boolean, title: string, message: string, type?: string}>({ open: false, title: '', message: '' });
  const [statusModalOpen, setStatusModalOpen] = useState(false); 
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    const [s, t, tr, m, l, emps, f] = await Promise.all([
      supabase.from('sites').select('*').eq('id', siteId).single(),
      supabase.from('tasks').select('*').eq('site_id', siteId).order('start_date', {ascending: true}),
      supabase.from('transactions').select('*').eq('site_id', siteId).order('date', {ascending: false}),
      supabase.from('materials').select('*').eq('site_id', siteId).order('purchase_date', {ascending: false}),
      supabase.from('attendance_logs').select('*, profiles(full_name, hourly_rate)').eq('site_id', siteId).order('date', {ascending: false}), 
      supabase.from('profiles').select('*').eq('organization_id', profile.organization_id).eq('is_active', true),
      supabase.from('fuel_logs').select('*').eq('site_id', siteId).order('date', {ascending: false})
    ]);

    if(s.data) {
      const expenses = roundFin(tr.data?.filter(x => x.type === 'expense').reduce((sum, x) => sum + Number(x.amount), 0) || 0);
      const paid = roundFin(tr.data?.filter(x => x.type === 'invoice' && x.is_paid).reduce((sum, x) => sum + Number(x.amount), 0) || 0);
      const matCost = roundFin(m.data?.reduce((sum, x) => sum + Number(x.total_price), 0) || 0);
      const fuelCost = roundFin(
        f.data?.reduce((sum, x) => sum + Number(x.amount), 0) ?? 0
      );
      
      const laborCost = roundFin(l.data?.reduce((sum, log: any) => {
        if (log.payment_type === 'fixed') {
            return sum + Number(log.fixed_amount || 0);
        }
        const hours = Number(log.hours) || 0;
        const rate = log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0;
        return sum + (hours * rate);
      }, 0) || 0);

      const totalCost = roundFin(expenses + matCost + laborCost + fuelCost);

      setSite(s.data);
      setData({ tasks: t.data, transactions: tr.data, materials: m.data, logs: l.data, fuel: f.data });
      setEmployees(emps.data || []);
      setStats({ 
        paid, 
        totalCost, 
        profit: roundFin(paid - totalCost),
        laborHours: l.data?.reduce((sum, x:any) => sum + Number(x.hours || 0), 0) || 0,
        materialCost: matCost,
        laborCost: laborCost,
        fuelCost: fuelCost
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
    try {
        await new Promise(resolve => setTimeout(resolve, 250));
        if(!printRef.current) return;

        const modeName = exportSettings.type === 'client' ? 'Export_Klient' : 'Export_Majitel';
        await exportElementToPdf(printRef.current, {
            filename: `${modeName}_${site.name}.pdf`,
            pageMarginMm: 10
        });
        setModals({...modals, export: false});
    } catch(e) {
        console.error('PDF Export Error:', e);
        setAlertState({ open: true, title: 'Chyba', message: "PDF export zlyhal. Skúste znova alebo použite desktop verziu.", type: 'error' });
    } finally {
        setExporting(false);
    }
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
          setAlertState({ open: true, title: 'Chyba', message: "Chyba pri aktualizácii: " + error.message, type: 'error' });
      } else {
          loadData();
      }
  };

  const handleEditFinance = (item: any) => {
      if (item.itemType === 'material') {
          setFormState({
              id: item.id,
              type: 'material',
              is_material: true,
              description: item.name,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              amount: item.total_price,
              date: item.purchase_date,
              supplier: item.supplier
          });
      } else {
          setFormState({
              id: item.id,
              type: item.type,
              is_material: false,
              category: item.category,
              amount: item.amount,
              date: item.date,
              description: item.description,
              is_paid: item.is_paid
          });
      }
      setModals({...modals, transaction: true});
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const common = { site_id: siteId, organization_id: profile.organization_id };
          if (formState.type === 'material') {
              const materialPayload = {
                  ...common,
                  name: formState.description || 'Materiál',
                  quantity: Math.max(0, formState.quantity),
                  unit: formState.unit,
                  unit_price: roundFin(Math.max(0, formState.unit_price)),
                  total_price: roundFin(Math.max(0, formState.amount)), 
                  purchase_date: formState.date,
                  supplier: formState.supplier
              };
              
              let err;
              if (formState.id) {
                  const { error } = await supabase.from('materials').update(materialPayload).eq('id', formState.id);
                  err = error;
              } else {
                  const { error = null } = await supabase.from('materials').insert([materialPayload]);
                  err = error;
              }
              if(err) throw err;
          } else {
              const transPayload = {
                  ...common,
                  type: formState.type, 
                  category: formState.category,
                  amount: roundFin(Math.max(0, formState.amount)),
                  date: formState.date,
                  description: formState.description,
                  is_paid: formState.is_paid
              };
              
              let err;
              if (formState.id) {
                  const { error } = await supabase.from('transactions').update(transPayload).eq('id', formState.id);
                  err = error;
              } else {
                  const { error = null } = await supabase.from('transactions').insert([transPayload]);
                  err = error;
              }
              if(err) throw err;
          }
          setModals({...modals, transaction: false});
          setFormState({});
          loadData();
      } catch (e: any) {
          setAlertState({ open: true, title: 'Chyba', message: "Chyba: " + e.message, type: 'error' });
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
        setAlertState({ open: true, title: 'Chyba', message: "Chyba: " + e.message, type: 'error' });
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
          description: log.description,
          payment_type: log.payment_type || 'hourly',
          fixed_amount: log.fixed_amount || 0
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

  const { breakdown: budgetItems, cleanNotes, hasVat, vatRate } = parseNotesData(site.notes);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="h-10 px-3 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-white border border-transparent hover:border-slate-200 font-semibold text-sm flex items-center gap-2 transition group">
            <ArrowLeft size={17} className="group-hover:-translate-x-0.5 transition-transform"/> Späť
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setModals({...modals, export: true})} className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-950 hover:border-slate-300 shadow-sm font-semibold text-sm flex items-center gap-2 transition">
            <FileDown size={16}/> Stiahnuť PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between xl:items-center gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 text-sm flex-wrap mb-3">
            <button onClick={() => setStatusModalOpen(true)} className="inline-flex items-center gap-1 rounded-full hover:bg-slate-50 transition active:scale-95">
                <Badge status={site.status} />
                <ChevronDown size={14} className="text-slate-500 group-hover:text-slate-700"/>
            </button>
            {site.client_name && <span className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 font-medium"><User size={14} className="text-slate-400"/> {site.client_name}</span>}
          </div>
          <h1 className="text-2xl md:text-[1.75rem] font-bold text-slate-950 mb-3 leading-tight tracking-normal truncate" title={site.name}>{site.name}</h1>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            {site.address && <span className="flex items-center gap-1.5 text-slate-600 font-medium min-w-0"><MapPin size={15} className="text-orange-500 shrink-0"/> <span className="truncate">{site.address}</span></span>}
          </div>
        </div>
        
        <div className={`w-full xl:w-auto xl:min-w-[260px] p-4 rounded-2xl shadow-sm border relative overflow-hidden group ${stats.profit >= 0 ? 'bg-green-50/70 border-green-100' : 'bg-red-50/70 border-red-100'}`}>
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stats.profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div className="pl-2 pr-12 relative z-10">
              <div className={`text-xs font-semibold mb-1 flex items-center gap-2 ${stats.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                <Activity size={12} className={stats.profit >= 0 ? 'text-green-500' : 'text-red-500'}/>
                Priebežný zisk
              </div>
              <div className={`text-2xl md:text-[1.7rem] font-bold ${stats.profit >= 0 ? 'text-green-700' : 'text-red-700'} tabular-nums leading-tight`}>
                {formatMoney(stats.profit)}
              </div>
          </div>
          <div className={`absolute right-4 top-4 h-10 w-10 rounded-xl flex items-center justify-center ${stats.profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
             <TrendingUp size={20} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
        <div className="border-b border-slate-100 bg-white px-2 py-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Prehľad', icon: BarChart3 },
            { id: 'labor', label: 'Dochádzka', icon: HardHat },
            { id: 'rates', label: 'Sadzby tímu', icon: Settings2 },
            { id: 'finance', label: 'Príjmy & výdavky', icon: Euro },
            { id: 'phm', label: 'PHM', icon: Fuel },
            { id: 'permissions', label: 'Prístupy', icon: Shield },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[42px] flex-1 min-w-max py-2.5 px-4 text-sm font-semibold text-center rounded-2xl transition-colors whitespace-nowrap flex items-center justify-center gap-2 ${
                activeTab === tab.id ? 'bg-orange-50 text-orange-700 border border-orange-100 shadow-sm' : 'text-slate-700 border border-transparent hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <tab.icon size={16} className="text-orange-600 shrink-0" /> <span>{tab.label}</span>
            </button>
          ))}
          </div>
        </div>

        <div className="p-4 md:p-8 flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-orange-500"/> Finančný rozbor</h3>
                    <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-100">
                        <span className="font-semibold text-green-800 text-sm">Príjmy (platby)</span>
                        <span className="font-bold text-green-700 text-lg tabular-nums">+{formatMoney(stats.paid)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                        <span className="font-semibold text-red-800 text-sm">Materiál a iné</span>
                        <span className="font-bold text-red-700 text-lg tabular-nums">-{formatMoney(roundFin(stats.totalCost - stats.laborCost - stats.fuelCost))}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                        <span className="font-semibold text-red-800 text-sm">Práca (mzdy)</span>
                        <span className="font-bold text-red-700 text-lg tabular-nums">-{formatMoney(stats.laborCost)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                        <span className="font-semibold text-red-800 text-sm">Pohonné hmoty</span>
                        <span className="font-bold text-red-700 text-lg tabular-nums">-{formatMoney(stats.fuelCost)}</span>
                    </div>
                    <div className="border-t border-dashed border-slate-200 my-4 pt-5">
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <span className="font-semibold text-slate-700 text-sm">Celkový profit</span>
                        <span className={`font-bold text-2xl tabular-nums ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(stats.profit)}</span>
                        </div>
                    </div>
                    </div>
                </Card>
                
                <Card className="bg-white border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2"><Package size={20} className="text-orange-500"/> Rozpočet</h3>
                    <div className="flex justify-between text-sm mb-3 text-slate-600 font-semibold">
                    <span>Aktuálne: <strong className="text-slate-900 tabular-nums">{formatMoney(stats.totalCost)}</strong></span>
                    <span>Limit: <strong className="text-slate-900 tabular-nums">{formatMoney(site.budget)}</strong></span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden mb-8 border border-slate-200 shadow-inner p-1">
                    <div className={`${stats.totalCost > site.budget ? 'bg-red-500' : 'bg-orange-500'} h-full rounded-full transition-all duration-1000 shadow-sm`} style={{ width: `${Math.min(100, (stats.totalCost / site.budget) * 100)}%` }}></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-xs text-slate-500 font-semibold mb-1">Hodiny</div>
                        <div className="text-xl font-bold text-slate-900 tabular-nums">{formatDuration(stats.laborHours)}</div>
                    </div>
                    <div className="text-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-xs text-slate-500 font-semibold mb-1">Materiál</div>
                        <div className="text-xl font-bold text-slate-900 tabular-nums">{formatMoney(stats.materialCost)}</div>
                    </div>
                    </div>
                </Card>
              </div>

              {budgetItems.length > 0 && (
                <Card className="bg-white border-slate-200 shadow-sm overflow-hidden" padding="p-0">
                    <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                        <ListPlus size={20} className="text-orange-500"/>
                        <h3 className="font-bold text-lg text-slate-900">Položkový rozpis rozpočtu</h3>
                    </div>
                    <div className="p-6 space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase px-2 mb-2">
                            <span>Názov položky</span>
                            <span>Suma (€)</span>
                        </div>
                        {budgetItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2 rounded-lg transition group">
                                <span className="text-sm font-semibold text-slate-700 group-hover:text-orange-600">{item.label}</span>
                                <span className="font-bold text-slate-900 text-sm tabular-nums">{formatMoney(item.amount)}</span>
                            </div>
                        ))}
                        <div className="mt-6 pt-6 border-t-2 border-dashed border-slate-200 flex flex-col items-end gap-1.5">
                            {hasVat && (
                                <>
                                    <div className="flex gap-4 text-xs font-semibold text-slate-500">
                                        <span>Základ bez DPH:</span>
                                        <span>{formatMoney(roundFin(budgetItems.reduce((acc, i) => acc + Number(i.amount), 0)))}</span>
                                    </div>
                                    <div className="flex gap-4 text-xs font-semibold text-slate-500">
                                        <span>DPH:</span>
                                        <span>{formatMoney(roundFin(site.budget - budgetItems.reduce((acc, i) => acc + Number(i.amount), 0)))}</span>
                                    </div>
                                </>
                            )}
                            <div className="flex gap-6 text-sm font-bold text-slate-900 mt-2 bg-slate-100 px-6 py-3 rounded-2xl border border-slate-200 shadow-inner">
                                <span className="text-slate-600">Celkový rozpočet {hasVat ? 's DPH' : ''}:</span>
                                <span className="text-xl text-orange-600 tabular-nums">{formatMoney(site.budget)}</span>
                            </div>
                        </div>
                    </div>
                </Card>
              )}

              {cleanNotes && (
                <Card className="bg-white border-slate-200 shadow-sm" padding="p-6">
                    <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <FileText size={20} className="text-orange-500"/> Poznámky k projektu
                    </h3>
                    <p className="text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-wrap italic">
                        {cleanNotes}
                    </p>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="animate-in fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="font-extrabold text-xl text-slate-900">História príjmov a nákladov</h3>
                <Button fullWidth={window.innerWidth < 640} onClick={() => { 
                    setFormState({ 
                        type: 'expense', 
                        date: new Date().toISOString().split('T')[0], 
                        is_material: false, 
                        is_paid: true, 
                        unit: 'ks', 
                        quantity: 1
                    }); 
                    setModals({...modals, transaction: true}); 
                }}><Plus size={18}/> Pridať pohyb</Button>
              </div>
               <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="w-full overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left min-w-[700px]">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs border-b border-slate-200">
                        <tr><th className="p-4">Dátum</th><th className="p-4">Položka</th><th className="p-4 text-right">Suma</th><th className="p-4 text-center">Stav</th><th className="p-4"></th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {financeItems.map((t: any) => (
                          <tr key={t.id} onClick={() => handleEditFinance(t)} className="hover:bg-slate-50 transition group cursor-pointer">
                            <td className="p-4 font-medium text-slate-500 text-sm whitespace-nowrap tabular-nums">{formatDate(t.date)}</td>
                            <td className="p-4">
                                <div className="font-semibold flex items-center gap-3 text-slate-800">
                                    {t.itemType === 'material' && <div className="p-2 bg-orange-50 text-orange-600 rounded-lg border border-orange-100"><Package size={15}/></div>}
                                    {t.itemType === 'transaction' && t.type === 'invoice' && <div className="p-2 bg-green-50 text-green-600 rounded-lg border border-green-100"><Euro size={15}/></div>}
                                    {t.itemType === 'transaction' && t.type === 'expense' && <div className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100"><Euro size={15}/></div>}
                                    <div className="min-w-0">
                                        <span className="block truncate max-w-[360px]">{t.itemType === 'material' ? t.description : t.category}</span>
                                        <div className="text-xs text-slate-500 font-medium truncate max-w-[360px]">{t.itemType === 'material' ? t.category : t.description}</div>
                                    </div>
                                </div>
                            </td>
                            <td className={`p-4 text-right font-bold text-base tabular-nums ${t.type === 'invoice' ? 'text-green-600' : 'text-red-600'}`}>
                              {t.type === 'invoice' ? '+' : '-'}{formatMoney(t.amount)}
                            </td>
                            <td className="p-4 text-center">
                              {t.itemType === 'transaction' ? (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); togglePaid(t); }}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer hover:opacity-80 transition shadow-sm ${t.is_paid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                                  >
                                    {t.is_paid ? 'Uhradené' : 'Čaká'}
                                  </button>
                              ) : (
                                  <span className="px-3 py-1 rounded-lg text-xs font-semibold border bg-slate-50 text-slate-600 border-slate-200">Materiál</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex gap-1 justify-end">
                                    <button onClick={(e) => { e.stopPropagation(); handleEditFinance(t); }} className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition"><Pencil size={16}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); requestDelete(t.itemType === 'material' ? 'materials' : 'transactions', t.id); }} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition"><Trash2 size={16}/></button>
                                </div>
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="font-extrabold text-xl text-slate-900">Denník prác (História)</h3>
                <button 
                  onClick={() => { setFormState({ date: new Date().toISOString().split('T')[0], start_time: '07:00', end_time: '15:30', payment_type: 'hourly', fixed_amount: 0 }); setModals({...modals, log: true}); }}
                  className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl hover:bg-orange-700 transition font-bold text-sm shadow-sm shadow-orange-100 w-full sm:w-auto justify-center"
                >
                  <Clock size={16}/> Zapísať dochádzku
                </button>
              </div>
              <div className="space-y-4">
                  {data.logs.map((l: any) => {
                      const cost = l.payment_type === 'fixed' ? Number(l.fixed_amount || 0) : roundFin(Number(l.hours || 0) * (l.hourly_rate_snapshot || l.profiles?.hourly_rate || 0));
                      return (
                      <div 
                        key={l.id} 
                        onClick={() => setSelectedLog(l)}
                        className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 cursor-pointer hover:border-orange-300 hover:shadow-md transition active:scale-[0.98] group shadow-sm"
                      >
                          <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900 flex items-center gap-2 group-hover:text-orange-600 transition">
                                <User size={14} className="text-orange-500"/>
                                {l.profiles?.full_name || 'Neznámy'}
                                {l.payment_type === 'fixed' && <span className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded-md font-semibold">Úkol</span>}
                              </div>
                              <div className="text-sm text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 font-medium">
                                  <span className="bg-slate-100 px-2 py-1 rounded-md text-xs font-semibold text-slate-600 whitespace-nowrap">{formatDate(l.date)}</span>
                                  {l.description && <span className="italic truncate max-w-[260px] text-slate-500">"{l.description}"</span>}
                              </div>
                              <div className="text-sm font-semibold text-slate-500 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
                                <Clock size={14} className="text-slate-400"/>
                                <span>{l.start_time || '--:--'} - {l.end_time || '--:--'}</span>
                                <span className="text-slate-300">•</span>
                                <span>{formatDuration(Number(l.hours || 0))}</span>
                                <span className="text-slate-300">•</span>
                                <span>Cena práce: <strong className="text-slate-700 font-bold">{formatMoney(cost)}</strong></span>
                              </div>
                          </div>
                          <div className="text-right flex items-center justify-between sm:justify-end gap-4 sm:ml-6">
                              <div className="font-bold text-slate-900 text-xl tabular-nums whitespace-nowrap">
                                {l.payment_type === 'fixed' ? <Briefcase className="text-orange-300" size={24}/> : formatDuration(Number(l.hours || 0))}
                              </div>
                              <div className="flex gap-1 opacity-100">
                                <button onClick={(e) => { e.stopPropagation(); handleEditLog(l); }} className="p-3 text-blue-500 hover:bg-blue-50 rounded-xl transition active:scale-90"><Pencil size={18}/></button>
                                <button onClick={(e) => { e.stopPropagation(); requestDelete('attendance_logs', l.id); }} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition active:scale-90"><Trash2 size={18}/></button>
                              </div>
                          </div>
                      </div>
                      );
                  })}
                  {data.logs.length === 0 && <div className="text-center py-16 text-slate-400 italic bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">Zatiaľ žiadne záznamy v denníku prác pre tento projekt.</div>}
              </div>
            </div>
          )}

          {activeTab === 'rates' && (
              <WorkerRatesManager siteId={siteId} organizationId={profile.organization_id} />
          )}

          {activeTab === 'phm' && (
              <ProjectPHM siteId={siteId} profile={profile} organization={organization} />
          )}

          {activeTab === 'permissions' && (
              <ProjectPermissionsManager siteId={siteId} organizationId={profile.organization_id} />
          )}
        </div>
      </div>

      <ConfirmModal isOpen={confirmAction.open} onClose={() => setConfirmAction({...confirmAction, open: false})} onConfirm={performDelete} title="Odstrániť položku?" message="Táto akcia je nevratná." type="danger" />
      <AlertModal isOpen={alertState.open} onClose={() => setAlertState({...alertState, open: false})} title={alertState.title} message={alertState.message} type={alertState.type as any} />
      
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
              const [sH, sM] = (formState.start_time || "00:00").split(':').map(Number);
              const [eH, eM] = (formState.end_time || "00:00").split(':').map(Number);
              let totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
              if (totalMinutes < 0) totalMinutes += 24 * 60;
              const calculatedHours = totalMinutes / 60;
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

            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mb-6 border border-slate-200">
                <button type="button" onClick={() => setFormState({...formState, payment_type: 'hourly'})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${formState.payment_type === 'hourly' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}><Clock size={14}/> Hodinovka</button>
                <button type="button" onClick={() => setFormState({...formState, payment_type: 'fixed'})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${formState.payment_type === 'fixed' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}><Briefcase size={14}/> Úkol (fixná)</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Dátum" type="date" value={formState.date || ''} onChange={(e: any) => setFormState({...formState, date: e.target.value})} required />
                
                <div className="grid grid-cols-2 gap-2">
                    <Input label="Čas od" type="time" value={formState.start_time || ''} onChange={(e: any) => setFormState({...formState, start_time: e.target.value})} required />
                    <Input label="Čas do" type="time" value={formState.end_time || ''} onChange={(e: any) => setFormState({...formState, end_time: e.target.value})} required />
                </div>
            </div>
            
            {formState.payment_type === 'fixed' && (
                <Input label="Fixná suma za úkol (€)" type="number" step="0.01" value={formState.fixed_amount || ''} onChange={(e: any) => setFormState({...formState, fixed_amount: roundFin(parseFloat(e.target.value) || 0)})} required placeholder="0.00" />
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col justify-center shadow-inner">
                    <span className="text-[10px] font-black text-orange-400 uppercase block mb-1 tracking-widest">Trvanie prác</span>
                    <span className="text-2xl font-black text-slate-800 tracking-tight">
                        {(() => {
                            const [sH, sM] = (formState.start_time || "00:00").split(':').map(Number);
                            const [eH, eM] = (formState.end_time || "00:00").split(':').map(Number);
                            let tm = (eH * 60 + eM) - (sH * 60 + sM);
                            if (tm < 0) tm += 24 * 60;
                            return formatDuration(tm / 60);
                        })()}
                    </span>
                </div>
                {formState.payment_type === 'hourly' && (
                    <Input 
                        label="Hodinová Sadzba (€/hod)" 
                        type="number" 
                        step="0.01" 
                        value={formState.hourly_rate_snapshot || 0} 
                        onFocus={(e:any) => e.target.select()}
                        onChange={(e: any) => setFormState({...formState, hourly_rate_snapshot: roundFin(Math.max(0, parseFloat(e.target.value) || 0))})} 
                        required 
                    />
                )}
            </div>

            <Input label="Popis činnosti" value={formState.description || ''} onChange={(e: any) => setFormState({...formState, description: e.target.value})} placeholder="Napr. Obkladanie kúpeľne, 2. poschodie" />
            
            <Button type="submit" fullWidth size="lg" className="mt-6 shadow-orange-200">{formState.id ? 'Uložiť zmeny' : 'Zapísať hodiny'}</Button>
          </form>
        </Modal>
      )}

      {modals.transaction && (
        <Modal title={formState.id ? "Upraviť záznam" : "Záznam o pohybe financií"} onClose={() => setModals({...modals, transaction: false})}>
          <form onSubmit={handleSaveTransaction} className="space-y-5">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-2">
              <button type="button" onClick={() => setFormState({...formState, type: 'expense', is_material: false, category: formState.category || '', description: formState.description || ''})} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition ${formState.type === 'expense' || formState.type === 'material' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}>Výdavok / Nákup</button>
              <button type="button" onClick={() => setFormState({...formState, type: 'invoice', is_material: false})} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition ${formState.type === 'invoice' ? 'bg-white shadow-sm text-green-600' : 'text-slate-500'}`}>Príjem / Platba</button>
            </div>
            
            {(formState.type === 'expense' || formState.type === 'material') && (
                <div className="flex items-center gap-2 mb-2 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                    <input type="checkbox" id="is_material" checked={formState.is_material || formState.type === 'material'} onChange={(e) => setFormState({...formState, is_material: e.target.checked, type: e.target.checked ? 'material' : 'expense', description: e.target.checked ? (formState.description || '') : formState.description, category: e.target.checked ? 'Materiál' : formState.category})} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" />
                    <label htmlFor="is_material" className="text-sm font-black text-slate-800 flex items-center gap-2 cursor-pointer"><Package size={18}/> Je to nákup materiálu?</label>
                </div>
            )}

            {formState.is_material || formState.type === 'material' ? (
                <>
                    <Input label="Názov materiálu" value={formState.description || ''} onChange={(e: any) => setFormState({...formState, description: e.target.value, category: 'Materiál'})} required autoFocus placeholder="Napr. Cement 25kg, SDK Profily..." />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Množstvo" type="number" step="0.01" value={formState.quantity} onFocus={(e:any) => e.target.select()} onChange={(e: any) => {
                            const qty = Math.max(0, parseFloat(e.target.value));
                            setFormState({...formState, quantity: qty, amount: roundFin(qty * (formState.unit_price || 0)) });
                        }} required />
                        <Select label="Jednotka" value={formState.unit} onChange={(e: any) => setFormState({...formState, unit: e.target.value})}>
                            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Cena za jednotku €" type="number" step="0.01" value={formState.unit_price || ''} onFocus={(e:any) => e.target.select()} onChange={(e: any) => {
                            const up = Math.max(0, parseFloat(e.target.value));
                            setFormState({...formState, unit_price: up, amount: roundFin(up * (formState.quantity || 0)) });
                        }} required />
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
                    <Input label="Celková Suma €" type="number" step="0.01" value={formState.amount || ''} onFocus={(e:any) => e.target.select()} onChange={(e: any) => setFormState({...formState, amount: roundFin(Math.max(0, parseFloat(e.target.value)))})} required />
                    <Input label="Detailná poznámka (Voliteľné)" value={formState.description || ''} onChange={(e: any) => setFormState({...formState, description: e.target.value})} />
                    
                    <div className="flex items-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-4">
                        <input 
                            type="checkbox" 
                            id="form_is_paid_proj" 
                            checked={formState.is_paid} 
                            onChange={(e) => setFormState({...formState, is_paid: e.target.checked})} 
                            className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" 
                        />
                        <label htmlFor="form_is_paid_proj" className="text-sm font-bold text-slate-800 flex items-center gap-2 cursor-pointer">Uhradené</label>
                    </div>
                </>
            )}
            
            <Input label="Dátum transakcie" type="date" value={formState.date || ''} onChange={(e: any) => setFormState({...formState, date: e.target.value})} required />
            <Button type="submit" fullWidth className="mt-4 shadow-sm" size="lg">{formState.id ? 'Uložiť zmeny' : 'Uložiť záznam'}</Button>
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
          <div ref={printRef} className="w-[190mm] bg-white p-0 text-slate-900 font-sans text-sm leading-normal relative box-border text-left flex flex-col min-h-[277mm]">
              <div className="px-10 pt-7 pb-3 flex justify-end text-[10px] text-slate-400 border-b border-slate-100">
                  <div className="text-right">
                      <div>Vygenerované cez MojaStavba • {new Date().toLocaleDateString('sk-SK')}</div>
                      <div>www.moja-stavba.sk</div>
                  </div>
              </div>
              <div className="px-10 py-8 flex-1 flex flex-col">
              
              <div className="flex justify-between items-start mb-8 border-b border-slate-200 pb-6">
                <div className="max-w-[110mm]">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 mb-2">{exportSettings.type === 'client' ? 'Klientsky výkaz' : 'Interný projektový výkaz'}</div>
                    <h1 className="text-[24px] font-bold tracking-normal text-slate-950 leading-tight">{exportSettings.type === 'client' ? 'Výkaz prác' : 'Projektový výkaz'}</h1>
                    <div className="text-orange-600 mt-2 font-semibold text-base">{site.name}</div>
                    {site.address && <div className="text-xs text-slate-500 mt-1 font-medium">{site.address}</div>}
                </div>
                <div className="text-right max-w-[62mm]">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] mb-1">Zhotoviteľ</div>
                    <div className="font-bold text-base text-slate-950 leading-tight">{organization.name}</div>
                    <div className="text-[10px] text-slate-500 mt-3 space-y-1 leading-snug">
                        {organization.ico && <div>IČO: {organization.ico}</div>}
                        {organization.dic && <div>DIČ: {organization.dic}</div>}
                        {organization.is_vat_payer && organization.ic_dph && <div>IČ DPH: {organization.ic_dph}</div>}
                        {organization.business_address && <div>{organization.address_type === 'sidlo' ? 'Sídlo' : 'Miesto podnikania'}: {organization.business_address}</div>}
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 mb-8">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] mb-1">Odberateľ / klient</div>
                      <div className="text-lg font-bold text-slate-950">{site.client_name || 'Nezadaný'}</div>
                  </div>
                  {(exportSettings.type === 'owner' || exportSettings.includeFinancials) && (
                      <div className="bg-orange-50/70 p-4 rounded-xl text-right border border-orange-100">
                        <div className="text-[10px] font-bold text-orange-800/70 uppercase tracking-[0.14em] mb-1">Aktuálna bilancia</div>
                        <div className={`text-2xl font-bold tabular-nums ${stats.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {formatMoney(stats.profit)}
                        </div>
                      </div>
                  )}
              </div>

              <div className="mb-10">
                  <div className="font-bold text-sm border-b border-slate-200 mb-3 pb-2 flex items-center gap-2 text-slate-900">
                      <ClipboardList size={14} className="text-orange-600"/> Denník realizovaných prác
                  </div>
                  <table className="w-full text-xs border-collapse rounded-xl overflow-hidden">
                      <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                              <th className="border-b border-slate-200 p-2.5 text-left w-[30mm]">Dátum</th>
                              <th className="border-b border-slate-200 p-2.5 text-left">Popis činnosti</th>
                              <th className="border-b border-slate-200 p-2.5 text-right w-[22mm]">Rozsah</th>
                          </tr>
                      </thead>
                      <tbody>
                          {data.logs.map((log: any, idx: number) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                  <td className="border-b border-slate-100 p-2.5 align-top font-semibold text-slate-700 tabular-nums">{formatDate(log.date)}</td>
                                  <td className="border-b border-slate-100 p-2.5 align-top text-slate-600">
                                      {log.payment_type === 'fixed' && <span className="text-[9px] bg-orange-50 text-orange-700 border border-orange-100 px-1.5 py-0.5 rounded font-semibold mr-2 uppercase">Úkol</span>}
                                      {log.description || '(Bez popisu prác)'}
                                  </td>
                                  <td className="border-b border-slate-100 p-2.5 align-top text-right font-semibold text-slate-900 tabular-nums">{formatDuration(Number(log.hours || 0))}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {(exportSettings.type === 'owner' || exportSettings.includeFinancials) && (
                  <div className="mb-10">
                      <div className="font-bold text-sm border-b border-slate-200 mb-3 pb-2 flex items-center gap-2 text-slate-900">
                          <Package size={14} className="text-orange-600"/> Súpis materiálu a nákupov
                      </div>
                      <table className="w-full text-xs border-collapse rounded-xl overflow-hidden">
                          <thead>
                              <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                                  <th className="border-b border-slate-200 p-2.5 text-left w-[30mm]">Dátum</th>
                                  <th className="border-b border-slate-200 p-2.5 text-left">Položka</th>
                                  <th className="border-b border-slate-200 p-2.5 text-right w-[22mm]">Množstvo</th>
                                  <th className="border-b border-slate-200 p-2.5 text-right w-[30mm]">Suma</th>
                              </tr>
                          </thead>
                          <tbody>
                              {data.materials.map((m: any, idx: number) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                      <td className="border-b border-slate-100 p-2.5 align-top text-slate-600 tabular-nums">{formatDate(m.purchase_date)}</td>
                                      <td className="border-b border-slate-100 p-2.5 align-top font-semibold text-slate-800">{m.name}</td>
                                      <td className="border-b border-slate-100 p-2.5 align-top text-right text-slate-600">{m.quantity} {m.unit}</td>
                                      <td className="border-b border-slate-100 p-2.5 align-top text-right font-semibold text-slate-900 tabular-nums">{formatMoney(m.total_price)}</td>
                                  </tr>
                              ))}
                          </tbody>
                          <tfoot>
                              <tr className="bg-slate-50 font-bold text-slate-900">
                                  <td colSpan={3} className="border-t border-slate-200 p-2.5 text-right text-[10px] uppercase tracking-[0.12em] text-slate-600">Súčet materiálov</td>
                                  <td className="border-t border-slate-200 p-2.5 text-right tabular-nums">{formatMoney(stats.materialCost)}</td>
                              </tr>
                          </tfoot>
                      </table>
                  </div>
              )}

              {exportSettings.type === 'owner' && (
                  <div className="mb-10">
                      <div className="font-bold text-sm border-b border-slate-200 mb-3 pb-2 flex items-center gap-2 text-slate-900">
                          <HardHat size={14} className="text-orange-600"/> Detail mzdových nákladov
                      </div>
                      <table className="w-full text-xs border-collapse rounded-xl overflow-hidden">
                          <thead>
                              <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                                  <th className="border-b border-slate-200 p-2.5 text-left">Pracovník</th>
                                  <th className="border-b border-slate-200 p-2.5 text-right">Hodiny</th>
                                  <th className="border-b border-slate-200 p-2.5 text-right">Mzda celkom</th>
                              </tr>
                          </thead>
                          <tbody>
                              {Object.entries(data.logs.reduce((acc: any, log: any) => {
                                  const name = log.profiles?.full_name || 'Neznámy';
                                  if (!acc[name]) acc[name] = { h: 0, c: 0 };
                                  acc[name].h += Number(log.hours || 0);
                                  
                                  const entryCost = log.payment_type === 'fixed' ? Number(log.fixed_amount || 0) : roundFin(Number(log.hours || 0) * (log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0));
                                  acc[name].c = roundFin(acc[name].c + entryCost);
                                  
                                  return acc;
                              }, {})).map(([name, stats]: any, idx: number) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                      <td className="border-b border-slate-100 p-2.5 align-top font-semibold text-slate-800">{name}</td>
                                      <td className="border-b border-slate-100 p-2.5 align-top text-right text-slate-600 tabular-nums">{formatDuration(stats.h)}</td>
                                      <td className="border-b border-slate-100 p-2.5 align-top text-right font-semibold text-slate-900 tabular-nums">{formatMoney(stats.c)}</td>
                                  </tr>
                              ))}
                          </tbody>
                          <tfoot>
                              <tr className="bg-slate-50 font-bold text-slate-900">
                                  <td className="border-t border-slate-200 p-2.5 text-right text-[10px] uppercase tracking-[0.12em] text-slate-600">Celkové mzdy</td>
                                  <td className="border-t border-slate-200 p-2.5 text-right tabular-nums">{formatDuration(stats.laborHours)}</td>
                                  <td className="border-t border-slate-200 p-2.5 text-right tabular-nums">{formatMoney(stats.laborCost)}</td>
                              </tr>
                          </tfoot>
                      </table>
                  </div>
              )}

              <div className="mt-auto pt-16 grid grid-cols-2 gap-16 pb-4 break-inside-avoid">
                  <div className="text-center">
                      <div className="border-b border-slate-300 mb-2 h-16"></div>
                      <div className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.14em]">Podpis preberajúceho</div>
                  </div>
                  <div className="text-center relative">
                    <div className="h-16 border-b border-slate-300 mb-2 flex items-center justify-center">
                        {organization.stamp_url && (
                            <img 
                                src={organization.stamp_url} 
                                alt="Pečiatka" 
                                crossOrigin="anonymous" 
                                className="h-28 max-w-[70mm] object-contain absolute -top-14 left-1/2 -translate-x-1/2 opacity-95 pointer-events-none" 
                            />
                        )}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.14em]">Pečiatka a podpis zhotoviteľa</div>
                  </div>
              </div>
              </div>
          </div>
      </div>

      {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
};
