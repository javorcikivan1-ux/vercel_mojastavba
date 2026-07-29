
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { Button, AlertModal, Modal } from '../components/UI';
import { 
  Check, X, ShieldCheck, LogOut, Loader2, 
  ChevronRight, Star, CheckCircle2, 
  Clock, ArrowRight, ArrowLeft, CreditCard, Zap, FileText, User,
  LayoutGrid, Mail, Building2, MapPin, Hash, Globe, Trophy, Crown, Phone
} from 'lucide-react';

interface SubscriptionProps {
  profile: UserProfile;
  organization: any;
  onSuccess: () => void;
  onLogout: () => void;
  isExpiredProp?: boolean;
}

export const PLANS = [
  {
    id: 'base',
    name: 'SILVER',
    price: '24',
    limit: 5,
    siteLimit: 3,
    desc: 'Pre malé firmy a živnostníkov',
    color: 'slate',
    icon: Trophy,
    accent: 'text-slate-400',
    bg: 'bg-slate-50',
    features: [
      { text: '3 aktívne zákazky', included: true },
      { text: '5 Zamestnancov', included: true },
      { text: 'Dochádzka', included: true },
      { text: 'Denník práce', included: true },
      { text: 'Zálohy zamestnancov', included: true },
      { text: 'Správa zákaziek a tímu', included: true },
      { text: 'Analytika zákaziek', included: false },
      { text: 'Globálna analytika', included: false },
      { text: 'AI asistent', included: false },
    ],
  },
  {
    id: 'standard',
    name: 'GOLD',
    price: '29',
    limit: 20,
    siteLimit: 10,
    desc: 'Zlatý štandard pre rastúce firmy',
    color: 'amber',
    icon: Star,
    accent: 'text-amber-500',
    bg: 'bg-amber-50',
    recommended: true,
    features: [
      { text: '10 aktívnych zákaziek', included: true },
      { text: '20 Zamestnancov', included: true },
      { text: 'Dochádzka', included: true },
      { text: 'Denník práce', included: true },
      { text: 'Zálohy zamestnancov', included: true },
      { text: 'Správa zákaziek a tímu', included: true },
      { text: 'Analytika zákaziek', included: true },
      { text: 'Globálna analytika', included: true },
      { text: 'AI asistent', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'PLATINUM',
    price: '55',
    limit: 9999,
    siteLimit: 9999,
    desc: 'Maximálna kontrola a prehľad',
    color: 'cyan',
    icon: Crown,
    accent: 'text-cyan-600',
    bg: 'bg-cyan-50',
    features: [
      { text: 'Neobmedzené stavby', included: true },
      { text: 'Neobmedzený tím', included: true },
      { text: 'Dochádzka', included: true },
      { text: 'Denník práce', included: true },
      { text: 'Zálohy zamestnancov', included: true },
      { text: 'Správa zákaziek a tímu', included: true },
      { text: 'Analytika zákaziek', included: true },
      { text: 'Globálna analytika', included: true },
      { text: 'AI asistent', included: true },
    ],
  }
];

export const SubscriptionScreen: React.FC<SubscriptionProps> = ({ 
  profile, 
  organization: initialOrg, 
  onLogout 
}) => {
  const [organization, setOrganization] = useState(initialOrg);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [alertState, setAlertState] = useState({ open: false, title: '', message: '', type: 'success' });
  const [showSelection, setShowSelection] = useState(false);
  
  const [formData, setFormData] = useState({
    email: profile.email,
    phone: profile.phone || '',
    name: initialOrg.name || '',
    ico: initialOrg.ico || '',
    dic: initialOrg.dic || '',
    ic_dph: initialOrg.ic_dph || '',
    street: initialOrg.street || '',
    city: initialOrg.city || '',
    zip: initialOrg.zip || ''
  });

  const checkDbStatus = useCallback(async (silent = false) => {
    if (!silent) setVerifying(true);
    try {
      const { data, error } = await supabase.from('organizations').select('*').eq('id', initialOrg.id).single();
      if (error) throw error;
      if (data) {
        setOrganization(data);
        setFormData(prev => ({
          ...prev,
          email: profile.email || prev.email,
          phone: prev.phone,
          name: data.name || prev.name,
          ico: data.ico || prev.ico,
          dic: data.dic || prev.dic,
          ic_dph: data.ic_dph || prev.ic_dph,
          street: data.street || prev.street,
          city: data.city || prev.city,
          zip: data.zip || prev.zip,
        }));
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      if (!silent) setVerifying(false);
    }
  }, [initialOrg.id]);

  useEffect(() => { checkDbStatus(); }, [checkDbStatus]);

  const handleOrder = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      const net = parseFloat(selectedPlan.price);
      const vat = net * 0.23;
      const total = net + vat;

      const { error } = await supabase.from('organizations').update({ 
          subscription_status: 'pending_payment',
          subscription_plan: selectedPlan.id,
          name: formData.name,
          ico: formData.ico,
          dic: formData.dic,
          ic_dph: formData.ic_dph,
          street: formData.street,
          city: formData.city,
          zip: formData.zip
      }).eq('id', organization.id);
      
      if (error) throw error;

      if (formData.phone) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ phone: formData.phone })
          .eq('id', profile.id);

        if (profileError) throw profileError;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Chýba prihlásenie pre odoslanie emailu objednávky.');
      }

      const mailResponse = await fetch('/api/subscription-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          planName: selectedPlan.name,
          planId: selectedPlan.id,
          net,
          vat,
          total,
          companyName: formData.name,
          ico: formData.ico,
          dic: formData.dic,
          icDph: formData.ic_dph,
          street: formData.street,
          city: formData.city,
          zip: formData.zip,
          invoiceEmail: formData.email,
          phone: formData.phone,
          userName: profile.full_name,
          organizationId: organization.id
        })
      });

      const mailResult = await mailResponse.json().catch(() => ({}));
      if (!mailResponse.ok) {
        throw new Error(mailResult.error || 'Objednávka bola uložená, ale email notifikácia sa nepodarila odoslať.');
      }

      setAlertState({ 
        open: true, 
        title: 'Hotovo', 
        message: `Faktúru pre balík ${selectedPlan.name} pripravíme a odošleme na ${formData.email}. Fakturácia prebieha v mesačnom harmonograme so 7-dňovou splatnosťou.`, 
        type: 'success' 
      });
      checkDbStatus(true);
      setStep(1);
      setShowSelection(false);
    } catch (err: any) {
      setAlertState({ open: true, title: 'Chyba', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const currentPlanId = organization.subscription_plan || 'base';
  const isPending = organization.subscription_status === 'pending_payment';
  const isActive = organization.subscription_status === 'active';
  const activePlan = PLANS.find(plan => plan.id === currentPlanId);

  if (verifying) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-orange-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">Načítavam...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col pb-12 overflow-y-auto pt-safe-top scroll-container">
      
      {/* 1. HEADER */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-6 flex justify-end">
         <button onClick={onLogout} className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-all font-black text-[10px] uppercase tracking-widest bg-white border border-slate-100 px-4 py-2 rounded-xl shadow-sm active:scale-95">
           <LogOut size={14}/> Odhlásiť sa
         </button>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 mt-4 sm:mt-10">
        
        {/* 2. MINIMAL ACTIVE STATUS */}
        {!showSelection && step === 1 && (
            <div className="mb-12 flex justify-center animate-in fade-in zoom-in-95 duration-700">
                {isActive && activePlan ? (
                    <div className="w-full max-w-xl bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.04)] text-center">
                        <div className="mb-6 flex justify-center">
                             <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl ring-1 ring-slate-50
                                ${activePlan.color === 'amber' ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 
                                  activePlan.color === 'cyan' ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 text-white' : 
                                  'bg-gradient-to-br from-slate-400 to-slate-600 text-white'}`}>
                                <activePlan.icon size={36} fill="currentColor"/>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Váš Aktuálny program</div>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{activePlan.name}</h2>
                        </div>

                        <div className="mt-10 flex flex-col items-center gap-6">
                            <button 
                                onClick={() => setShowSelection(true)} 
                                className="h-11 px-8 bg-orange-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-orange-200 transition-all hover:bg-orange-700 active:scale-95 flex items-center gap-2"
                            >
                                <LayoutGrid size={16} /> Spravovať balík
                            </button>
                        </div>
                    </div>
                ) : isPending ? (
                    <div className="w-full max-w-xl bg-white border border-amber-100 rounded-[2.5rem] p-10 shadow-xl flex flex-col items-center text-center gap-8">
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 animate-pulse">
                            <Clock size={32}/>
                        </div>
                        <div>
                            <h3 className="text-slate-900 font-black text-xl uppercase tracking-tight mb-2">Čakáme na platbu</h3>
                            <p className="text-slate-600 text-sm font-medium max-w-md mx-auto leading-relaxed">Faktúru na balík <span className="font-black text-orange-600">{PLANS.find(p => p.id === organization.subscription_plan)?.name || 'vybraný'}</span> Vám doručíme na zadaný e-mail najneskôr do 24 hodín. Prístup do aplikácie aktivujeme okamžite po prijatí platby.</p>
                        </div>
                        <button onClick={() => setShowSelection(true)} className="text-[10px] font-black uppercase text-orange-600 hover:text-orange-700 tracking-widest flex items-center gap-2 border-b border-orange-100 hover:border-orange-500 pb-1 transition-all">
                           Zmeniť výber <ArrowRight size={14}/>
                        </button>
                    </div>
                ) : null}
            </div>
        )}

        {/* 3. STEP PROGRESS */}
        {(showSelection || (!isActive && !isPending) || step === 2) && (
            <div className="flex items-center justify-center mb-10 animate-in fade-in duration-700">
                <div className="flex items-center gap-4 bg-white px-5 py-2 rounded-2xl border border-slate-100 shadow-sm">
                    <div className={`flex items-center gap-2 ${step === 1 ? 'opacity-100' : 'opacity-30'}`}>
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-[9px] ${step === 1 ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'}`}>
                            {step > 1 ? <Check size={10} strokeWidth={4}/> : '1'}
                        </div>
                        <span className="font-black text-[10px] uppercase tracking-widest text-slate-900">Výber</span>
                    </div>
                    <div className="w-6 h-px bg-slate-200"></div>
                    <div className={`flex items-center gap-2 ${step === 2 ? 'opacity-100' : 'opacity-30'}`}>
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-[9px] ${step === 2 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
                        <span className="font-black text-[10px] uppercase tracking-widest text-slate-900">Detaily</span>
                    </div>
                </div>
            </div>
        )}

        {/* 4. PLAN SELECTION */}
        {step === 1 && (showSelection || (!isActive && !isPending)) && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-9 md:mb-11">
                    <h1 className="max-w-5xl mx-auto text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-3">
                        Všetky zákazky <span className="text-orange-600">v jednej aplikácii</span>
                    </h1>
                    <p className="text-slate-500 font-semibold text-xs uppercase tracking-[0.18em]">
                        Riešenie pre moderné firmy
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch mb-16">
                  {PLANS.map((plan, idx) => {
                    const isCurrent = currentPlanId === plan.id;
                    
                    return (
                      <div 
                        key={plan.id} 
                        style={{ animationDelay: `${idx * 100}ms` }}
                        className={`group relative flex flex-col bg-white rounded-3xl border transition-all duration-300 p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-6 fill-mode-both 
                          ${plan.recommended 
                            ? 'border-orange-200 shadow-2xl scale-[1.02] z-10 ring-4 ring-orange-50' 
                            : 'border-slate-100 hover:border-slate-200 shadow-sm'
                          }`}
                      >
                        {plan.recommended && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-[0.14em] shadow-lg flex items-center gap-2">
                            <Trophy size={10} fill="currentColor"/> Najobľúbenejšie
                          </div>
                        )}

                        <div className="mb-6 text-center lg:text-left">
                          <h3 className={`text-2xl md:text-3xl font-extrabold mb-1 tracking-tight uppercase ${plan.accent}`}>
                            {plan.name}
                          </h3>
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.14em]">{plan.desc}</p>
                        </div>

                        <div className="flex items-baseline gap-1 mb-7 pb-7 border-b border-slate-50">
                          <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{plan.price}€</span>
                          <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">/ bez DPH</span>
                        </div>

                        <div className="space-y-3.5 mb-10 flex-1">
                          {plan.features.map((f, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className={`mt-0.5 shrink-0 ${f.included ? 'text-green-600' : 'text-red-500'}`}>
                                {f.included ? <Check size={14} strokeWidth={4}/> : <X size={14} strokeWidth={4}/>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-bold ${f.included ? 'text-slate-700' : 'text-slate-600 line-through opacity-70'}`}>
                                  {f.text}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => { if (!isCurrent || !isActive) { setSelectedPlan(plan); setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}
                          className={`w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all active:scale-95 flex items-center justify-center gap-2
                            ${isCurrent && isActive ? 'bg-green-600 text-white cursor-default shadow-lg shadow-green-100 ring-4 ring-green-50' : 
                              'bg-orange-600 text-white hover:bg-orange-700 shadow-xl shadow-orange-100'}`}
                        >
                          {isCurrent && isActive ? <><CheckCircle2 size={16}/> Váš program</> : <>Vybrať tento balík <ArrowRight size={16}/></>}
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                {isActive && (
                    <div className="mb-20 text-center">
                        <button onClick={() => setShowSelection(false)} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-colors border-b border-transparent hover:border-slate-300 pb-1">
                           Zrušiť a vrátiť sa späť
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* 5. ENHANCED EDITABLE CHECKOUT STEP */}
        {step === 2 && selectedPlan && (
            <div className="max-w-6xl mx-auto animate-in zoom-in-95 duration-500 mb-20">
                <button onClick={() => setStep(1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest mb-8">
                    <ArrowLeft size={16}/> Späť k výberu
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* BILLING DATA */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.03)] p-8 sm:p-10">
                            <div className="flex items-center gap-3 mb-10">
                                <div className="w-10 h-10 bg-slate-50 text-slate-800 rounded-xl flex items-center justify-center border border-slate-100 shadow-inner">
                                    <Building2 size={20}/>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Fakturačné údaje</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">Fakturačný email</label>
                                    <div className="group flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                                        <Mail size={16} className="text-slate-400 group-focus-within:text-orange-600 shrink-0"/>
                                        <input 
                                            type="email" 
                                            value={formData.email} 
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900"
                                            placeholder="meno@firma.sk"
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">Telefón</label>
                                    <div className="group flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                                        <Phone size={16} className="text-slate-400 group-focus-within:text-orange-600 shrink-0"/>
                                        <input 
                                            type="tel" 
                                            value={formData.phone} 
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900"
                                            placeholder="+421..."
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">Firma / názov</label>
                                    <div className="group flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                                        <Building2 size={16} className="text-slate-400 group-focus-within:text-orange-600 shrink-0"/>
                                        <input 
                                            type="text" 
                                            value={formData.name} 
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">IČO</label>
                                    <div className="group flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                                        <Hash size={16} className="text-slate-400 group-focus-within:text-orange-600 shrink-0"/>
                                        <input 
                                            type="text" 
                                            value={formData.ico} 
                                            onChange={(e) => setFormData({...formData, ico: e.target.value})}
                                            className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">DIČ</label>
                                    <div className="group flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                                        <ShieldCheck size={16} className="text-slate-400 group-focus-within:text-orange-600 shrink-0"/>
                                        <input 
                                            type="text" 
                                            value={formData.dic} 
                                            onChange={(e) => setFormData({...formData, dic: e.target.value})}
                                            className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">IČ DPH</label>
                                    <div className="group flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                                        <ShieldCheck size={16} className="text-slate-400 group-focus-within:text-orange-600 shrink-0"/>
                                        <input 
                                            type="text" 
                                            value={formData.ic_dph} 
                                            onChange={(e) => setFormData({...formData, ic_dph: e.target.value})}
                                            className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900"
                                            placeholder="SK2121234567"
                                        />
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-400 ml-1">Vyplňte iba ak ste platiteľ DPH.</p>
                                </div>

                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">Sídlo (ulica a číslo)</label>
                                    <div className="group flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                                        <MapPin size={16} className="text-slate-400 group-focus-within:text-orange-600 shrink-0"/>
                                        <input 
                                            type="text" 
                                            value={formData.street} 
                                            onChange={(e) => setFormData({...formData, street: e.target.value})}
                                            className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900"
                                            placeholder="Hlavná 1"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">Mesto</label>
                                    <div className="group flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                                        <MapPin size={16} className="text-slate-400 group-focus-within:text-orange-600 shrink-0"/>
                                        <input 
                                            type="text" 
                                            value={formData.city} 
                                            onChange={(e) => setFormData({...formData, city: e.target.value})}
                                            className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900"
                                            placeholder="Mesto"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">PSČ</label>
                                    <div className="group flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                                        <Hash size={16} className="text-slate-400 group-focus-within:text-orange-600 shrink-0"/>
                                        <input 
                                            type="text" 
                                            value={formData.zip} 
                                            onChange={(e) => setFormData({...formData, zip: e.target.value})}
                                            className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900"
                                            placeholder="PSČ"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SUMMARY */}
                    <div className="lg:col-span-5">
                        <div className="bg-white rounded-[2rem] p-8 sm:p-10 border border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.03)] sticky top-6">
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-8 pb-4 border-b border-slate-100">Súhrn objednávky</h3>
                            
                            <div className="space-y-4 mb-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 mb-1">Zvolený program</p>
                                        <p className={`text-lg font-bold tracking-tight ${selectedPlan.accent}`}>{selectedPlan.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-semibold text-slate-500 mb-1">Jednotková cena</p>
                                        <p className="text-lg font-bold text-slate-900">{selectedPlan.price}€ / mesiac</p>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-slate-50">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-semibold">Cena bez DPH</span>
                                        <span className="font-bold text-slate-700">{selectedPlan.price}€</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-semibold">DPH (23%)</span>
                                        <span className="font-bold text-slate-700">{(parseFloat(selectedPlan.price) * 0.23).toFixed(2)}€</span>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-end pt-4 border-t-2 border-slate-100">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 mb-0.5">Celkovo k úhrade</p>
                                        <p className="text-5xl font-black text-orange-600 tracking-tighter">{(parseFloat(selectedPlan.price) * 1.23).toFixed(2)}€</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-400 mb-1 text-right">Platba<br/>bankovým prevodom</p>
                                </div>
                            </div>

                            <button 
                                onClick={handleOrder}
                                disabled={loading}
                                className="w-full h-14 bg-orange-600 text-white rounded-xl shadow-xl shadow-orange-100 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 hover:bg-orange-700"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18}/> : <><Zap size={16} fill="currentColor"/> Potvrdiť objednávku</>}
                            </button>
                            
                            <div className="mt-8 flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <FileText size={16} className="text-slate-400 shrink-0"/>
                                <div className="text-xs text-slate-600 font-medium leading-relaxed space-y-3">
                                    <p>
                                        Faktúru s platobnými údajmi pripravíme a odošleme na <span className="font-bold text-slate-900">{formData.email}</span>.
                                        Faktúra bude zasielaná v mesačnom harmonograme so 7-dňovou splatnosťou.
                                    </p>
                                    <div className="pt-3 border-t border-slate-200">
                                        <p className="font-bold text-slate-900 mb-1">Dodávateľ</p>
                                        <p>LORD&apos;S BENISON s.r.o.</p>
                                        <p>IČO: 52404901</p>
                                        <p>DIČ: 2121022992</p>
                                        <p>IČ DPH: SK2121022992</p>
                                        <p>Sídlo: M. Nandrássyho 654/10, 050 01 Revúca</p>
                                    </div>
                                    <p className="pt-3 border-t border-slate-200">
                                        V prípade potreby volajte na infolinku <a href="tel:0948225713" className="font-bold text-orange-600">0948 225 713</a>
                                        {' '}alebo napíšte na <a href="mailto:sluzby@lordsbenison.eu" className="font-bold text-orange-600">sluzby@lordsbenison.eu</a>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {step !== 2 && (
      <footer className="max-w-6xl mx-auto w-full px-4 sm:px-6 mt-auto pt-6 md:max-w-4xl md:pt-10 md:pb-4">
        <div className="bg-white/90 border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm md:bg-transparent md:border-0 md:rounded-none md:p-0 md:shadow-none">
          <div className="flex flex-col md:items-center gap-4 md:gap-2 md:text-center">
            <div className="space-y-2 min-w-0 md:space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 leading-tight md:text-[9px] md:tracking-[0.16em]">Prevádzkovateľ služby MojaStavba</p>
              <div className="md:flex md:items-center md:justify-center md:gap-2">
                <p className="text-sm font-bold text-slate-900 leading-snug md:text-xs">LORD&apos;S BENISON s.r.o.</p>
                <span className="hidden md:block text-slate-300">•</span>
                <p className="hidden md:block text-[11px] font-medium text-slate-500">M. Nandrássyho 654/10, 050 01 Revúca</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs text-slate-600 font-medium leading-relaxed md:flex md:flex-wrap md:justify-center md:gap-x-3 md:gap-y-0 md:text-[10px] md:text-slate-500">
                <span>IČO: 52404901</span>
                <span>DIČ: 2121022992</span>
                <span>IČ DPH: SK2121022992</span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed md:hidden">
                Sídlo: M. Nandrássyho 654/10, 050 01 Revúca
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end lg:text-right border-t border-slate-100 pt-3 md:border-t md:border-slate-100 md:pt-3 md:items-center md:text-center md:gap-2 md:w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs font-bold md:text-[11px] md:font-semibold">
                <a href="tel:0948225713" className="text-slate-800 hover:text-orange-600 transition">0948 225 713</a>
                <span className="hidden sm:inline text-slate-300">·</span>
                <a href="mailto:sluzby@lordsbenison.eu" className="text-slate-800 hover:text-orange-600 transition break-all sm:break-normal">sluzby@lordsbenison.eu</a>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] md:text-[9px] md:tracking-[0.14em]">
                <a href="/vseobecne-obchodne-podmienky.html" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-orange-600 transition">VOP</a>
                <span className="text-slate-200">/</span>
                <a href="/zasady-ochrany-osobnych-udajov-gdpr.html" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-orange-600 transition">GDPR</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      )}

      <AlertModal 
        isOpen={alertState.open} 
        onClose={() => setAlertState({ ...alertState, open: false })} 
        title={alertState.title} 
        message={alertState.message} 
        type={alertState.type as any} 
      />
    </div>
  );
};
