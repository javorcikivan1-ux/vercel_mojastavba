
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { Button, AlertModal } from '../components/UI';
import { 
  ShieldCheck, 
  Zap, 
  LogOut, 
  ArrowLeft, 
  Loader2, 
  Activity,
  Check,
  ShieldAlert,
  ChevronRight,
  Monitor,
  Building2,
  Users,
  BookOpen,
  Euro,
  Lock,
  Sparkles,
  Globe,
  Info
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface SubscriptionProps {
  profile: UserProfile;
  organization: any;
  onSuccess: () => void;
  onLogout: () => void;
  onBack?: () => void;
  isExpiredProp?: boolean;
}

export const SubscriptionScreen: React.FC<SubscriptionProps> = ({ 
  profile, 
  organization: initialOrg, 
  onSuccess, 
  onLogout, 
  onBack, 
  isExpiredProp 
}) => {
  const [organization, setOrganization] = useState(initialOrg);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [alert, setAlert] = useState({ open: false, title: '', message: '', type: 'success' });
  const [justPaid, setJustPaid] = useState(false);
  const [attempts, setAttempts] = useState(0);
  
  const isNative = Capacitor.isNativePlatform();

  const checkDbStatus = useCallback(async (silent = false) => {
    if (!silent) setVerifying(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', initialOrg.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setOrganization(data);
        if (data.subscription_status === 'active') return true;
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      if (!silent) setVerifying(false);
    }
    return false;
  }, [initialOrg.id]);

  useEffect(() => {
    checkDbStatus();
  }, [checkDbStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setJustPaid(true);
      let count = 0;
      const interval = setInterval(async () => {
        count++;
        setAttempts(count);
        const isNowActive = await checkDbStatus(true);
        if (isNowActive) {
            clearInterval(interval);
            setTimeout(() => {
                window.history.replaceState({}, document.title, window.location.pathname);
                onSuccess();
            }, 1000);
        }
        if (count >= 40) clearInterval(interval);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [onSuccess, checkDbStatus]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: checkoutData, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: { 
          organizationId: organization.id,
          userEmail: profile.email,
          priceId: 'price_1SjKuxP9f8wnF9RHNWWUxaYg',
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      if (checkoutData?.url) window.location.href = checkoutData.url;
    } catch (err: any) {
      setAlert({ open: true, title: 'Chyba', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const isActivePro = organization.subscription_status === 'active';
  const isExpired = isExpiredProp || (!isActivePro && new Date(organization.trial_ends_at) < new Date());

  if (verifying && !organization.subscription_status) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-white">
              <div className="relative">
                  <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin"></div>
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-600" size={16}/>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 animate-in fade-in duration-700">
      
      <div className="flex justify-between items-center mb-6 px-2">
          <button 
            onClick={onBack || (() => window.location.reload())} 
            className={`text-slate-400 hover:text-slate-900 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 transition ${isExpired && !onBack ? 'invisible' : ''}`}
          >
            <ArrowLeft size={14}/> Späť
          </button>
          
          <button onClick={onLogout} className="text-orange-500 hover:text-orange-700 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 transition bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 shadow-sm active:scale-95">
            Odhlásiť sa <LogOut size={14}/>
          </button>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
          Moja<span className="text-orange-600">Stavba</span> <span className="text-orange-600 relative inline-block">PRO<span className="absolute -top-1 -right-4 w-2 h-2 bg-orange-500 rounded-full animate-ping"></span></span>
        </h1>
        <p className="text-slate-400 mt-2 font-bold text-sm uppercase tracking-[0.15em]">Profesionálne riešenie pre vašu firmu</p>
      </div>

      {isExpired && !isActivePro && !justPaid && (
          <div className="max-w-2xl mx-auto mb-10 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 shadow-sm">
              <div className="bg-red-500 text-white p-2 rounded-xl shadow-lg shadow-red-200"><ShieldAlert size={20}/></div>
              <div className="flex-1">
                  <p className="text-red-900 font-black text-xs uppercase tracking-tight">Skúšobná doba vypršala</p>
                  <p className="text-red-700 text-sm font-medium leading-tight">Pre pokračovanie v práci aktivujte PRO licenciu.</p>
              </div>
          </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              
              <div className="p-8 md:p-12 lg:p-16 bg-slate-50/50 flex flex-col items-center">
                  <div className="text-center mb-9">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Čo získate s MojaStavba PRO?</span>
                  </div>

                  <div className="space-y-10">
                      {[
                          { t: 'Neobmedzené projekty', d: 'Spravujte ľubovoľný počet zákaziek naraz, od malých prerábok až po veľké projekty.', icon: Building2, col: 'bg-blue-500' },
                          { t: 'Celý tím v jednotnej cene', d: 'U nás nepriplácate za nových ľudí. Jedna fixná cena pre celý tím s neobmedzeným počtom zamestnancov.', icon: Users, col: 'bg-orange-500' },
                          { t: 'Digitálny stavebný denník', d: 'Profesionálny online stavebný denník, Zápisy prác, fotky a PDF exporty priamo z mobilu v teréne.', icon: BookOpen, col: 'bg-emerald-500' },
                          { t: 'Komplexný finančný prehľad', d: 'Sledujte ziskovosť a náklady každej stavby v reálnom čase na pár klikov.', icon: Euro, col: 'bg-indigo-500' }
                      ].map((f, i) => (
                          <div key={i} className="flex gap-5 group">
                              <div className={`shrink-0 w-12 h-12 ${f.col} text-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/5 transition-all group-hover:scale-110 group-hover:-rotate-3`}>
                                  <f.icon size={22}/>
                              </div>
                              <div>
                                  <h4 className="font-black text-slate-800 text-base mb-1">{f.t}</h4>
                                  <p className="text-slate-500 text-xs leading-relaxed font-medium">{f.d}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center items-center text-center bg-white">
                  {isActivePro ? (
                      <div className="animate-in zoom-in">
                          <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-green-100 border border-green-200 mx-auto">
                             <ShieldCheck size={40}/>
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Licencia Aktívna</h3>
                          <p className="text-slate-500 mt-2 font-medium">Váš firemný účet je odomknutý.</p>
                          <Button onClick={onBack || (() => window.location.reload())} size="lg" className="mt-10 rounded-2xl px-12 h-14 uppercase tracking-widest font-black text-xs">
                              Vstúpiť do aplikácie
                          </Button>
                      </div>
                  ) : justPaid ? (
                      <div className="space-y-4">
                          <Loader2 className="animate-spin text-blue-500 mx-auto" size={48}/>
                          <h3 className="text-xl font-black text-slate-900">Overujem platbu</h3>
                          <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest">Pokus {attempts}/40</p>
                      </div>
                  ) : (
                      <div className="w-full max-w-sm mx-auto">
                          <div className="mb-12">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] block mb-6">Mesačné predplatné</span>
                              <div className="flex items-baseline justify-center gap-2">
                                  <span className="text-7xl font-black text-slate-900 tracking-tighter">15 €</span>
                                  <div className="text-left">
                                      <div className="text-slate-400 font-bold text-xl leading-none">/ mesiac</div>
                                      <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">vrátane DPH</div>
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-5 mb-12 text-left bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                             {[
                                'Appka v mobile každého zamestnanca',
                                'Intuitívne webové & mobilné rozhranie',
                                'Telefonická a e-mailová podpora'
                             ].map(item => (
                                 <div key={item} className="flex items-center gap-3 text-sm text-slate-600 font-bold">
                                     <div className="bg-green-500 text-white p-0.5 rounded-full shrink-0"><Check size={12}/></div> {item}
                                 </div>
                             ))}
                          </div>

                          {isNative ? (
                              <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-center group border border-blue-400">
                                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform">
                                      <Monitor size={120}/>
                                  </div>
                                  <div className="relative z-10">
                                      <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 text-white border border-white/20">
                                          <Monitor size={32}/>
                                      </div>
                                      <h3 className="text-white font-black text-lg mb-3 uppercase tracking-tight leading-tight">Predplatné nie je možné zakúpiť v aplikácii</h3>
                                      <p className="text-blue-100 text-xs leading-relaxed font-medium mb-8">
                                          MojaStavba PRO licenciu si môžete aktivovať jednoducho na našom webe.
                                      </p>
                                      
                                      <div className="bg-white p-5 rounded-2xl shadow-inner border border-blue-200">
                                          <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-1.5">Navštívte adresu v prehliadači</p>
                                          <p className="text-xl font-black text-slate-900 tracking-tight select-all">www.moja-stavba.sk</p>
                                      </div>

                                      <div className="mt-8 space-y-4 text-left border-t border-white/10 pt-6">
                                          <div className="flex gap-3 items-start">
                                              <div className="w-5 h-5 bg-white/10 rounded flex items-center justify-center shrink-0 mt-0.5"><Check size={12} className="text-white"/></div>
                                              <p className="text-[11px] text-blue-50 font-medium leading-snug">Prihláste sa pod vaším firemným účtom.</p>
                                          </div>
                                          <div className="flex gap-3 items-start">
                                              <div className="w-5 h-5 bg-white/10 rounded flex items-center justify-center shrink-0 mt-0.5"><Check size={12} className="text-white"/></div>
                                              <p className="text-[11px] text-blue-50 font-medium leading-snug">V sekcii <strong>Predplatné</strong> si nastavte mesačnú platbu.</p>
                                          </div>
                                          <div className="flex gap-3 items-start">
                                              <div className="w-5 h-5 bg-white/10 rounded flex items-center justify-center shrink-0 mt-0.5"><Check size={12} className="text-white"/></div>
                                              <p className="text-[11px] text-blue-50 font-medium leading-snug">Mobilná aplikácia sa vám okamžite sama odomkne.</p>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <Button 
                                  onClick={handleSubscribe} 
                                  loading={loading} 
                                  fullWidth 
                                  className="h-16 text-sm rounded-2xl shadow-2xl shadow-orange-200 border-none uppercase tracking-[0.2em] font-black group relative overflow-hidden active:scale-95 transition-transform"
                              >
                                  <span className="relative z-10 flex items-center justify-center gap-3">Aktivovať PRO <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/></span>
                                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500"></div>
                              </Button>
                          )}

                          <div className="mt-8 flex justify-center items-center gap-4 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
                               <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-6" />
                               <div className="w-px h-4 bg-slate-300"></div>
                               <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-1.5"><Lock size={12}/> Secure</span>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>

      <div className="mt-12 text-center">
        <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-6 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">E-mail: </span>
            <a href="mailto:sluzby@lordsbenison.eu" className="text-orange-600 font-semibold hover:underline">
              sluzby@lordsbenison.eu
            </a>
          </p>
          <span className="hidden sm:block text-slate-300">|</span>
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">Tel.: </span>
            <a href="tel:+421948225713" className="text-orange-600 font-semibold hover:underline">
              +421 948 225 713
            </a>
          </p>
        </div>
      </div>
      
      <AlertModal 
        isOpen={alert.open} 
        onClose={() => setAlert({ ...alert, open: false })} 
        title={alert.title} 
        message={alert.message} 
        type={alert.type as any} 
      />
    </div>
  );
};
