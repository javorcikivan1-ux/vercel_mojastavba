import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Card, Input, CustomLogo, AlertModal, LegalModal, Modal } from '../components/UI';
import { translateAuthError } from '../lib/utils';
import { 
  Building2, Smartphone, TrendingUp, Users, ArrowRight, ChevronRight, 
  Monitor, Briefcase, CheckCircle2, AlertCircle, ArrowLeft, Download, X, HelpCircle, Apple
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';

// --- DOWNLOAD MODAL COMPONENT ---
const DownloadModal = ({ onClose }: { onClose: () => void }) => {
  // Smeruje na tvoj NOVÝ GitHub repo určený čisto pre inštalačky
  const GITHUB_REPO = "https://github.com/javorcikivan1-ux/instalacky_mojastavba/releases/latest/download";

  return (
    <Modal title="Stiahnuť aplikáciu" onClose={onClose} maxWidth="max-w-4xl">
      <div className="space-y-6">
        <p className="text-sm text-slate-500 text-center mb-2">
          Vyberte si platformu. Natívna aplikácia poskytuje rýchlejší prístup k vašim stavbám a lepšiu stabilitu systému.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* WINDOWS */}
          <a 
            href={`${GITHUB_REPO}/MojaStavba.exe`}
            className="group p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-center flex flex-col items-center gap-4 shadow-sm"
          >
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Monitor size={28} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 uppercase tracking-tight text-xs">Windows</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Pre počítač</p>
            </div>
            <div className="mt-2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-lg flex items-center gap-1.5">
              <Download size={12}/> .EXE
            </div>
          </a>

          {/* ANDROID */}
          <a 
            href={`${GITHUB_REPO}/MojaStavba.apk`}
            className="group p-6 rounded-2xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all text-center flex flex-col items-center gap-4 shadow-sm"
          >
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Smartphone size={28} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 uppercase tracking-tight text-xs">Android</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Inštalačný balík</p>
            </div>
            <div className="mt-2 px-3 py-1.5 bg-orange-600 text-white text-[10px] font-black rounded-lg flex items-center gap-1.5">
              <Download size={12}/> .APK
            </div>
          </a>

          {/* iOS (Apple) */}
          <div className="group p-6 rounded-2xl border-2 border-slate-50 bg-slate-50/50 grayscale opacity-60 text-center flex flex-col items-center gap-4 cursor-not-allowed">
            <div className="w-14 h-14 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center">
              <Apple size={28} />
            </div>
            <div>
              <h3 className="font-black text-slate-400 uppercase tracking-tight text-xs">iPhone / iPad</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Pripravujeme</p>
            </div>
            <div className="mt-2 px-3 py-1.5 bg-slate-200 text-slate-400 text-[10px] font-black rounded-lg">
              Coming Soon
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
          <HelpCircle className="text-blue-400 shrink-0" size={18}/>
          <div className="text-[11px] text-blue-600 leading-relaxed font-medium">
            <strong>Inštalácia na Android:</strong> Po stiahnutí APK súboru povoľte prehliadaču inštaláciu z neznámych zdrojov v nastaveniach telefónu. Potom súbor otvorte.
          </div>
        </div>

        <Button fullWidth onClick={onClose} variant="secondary">Zavrieť</Button>
      </div>
    </Modal>
  );
};

// --- ONBOARDING CAROUSEL ---
export const OnboardingCarousel = ({ onFinish }: { onFinish: () => void }) => {
  const [slide, setSlide] = useState(0);
  
  const slides = [
    {
      title: "Kompletný prehľad",
      highlight: "zákaziek",
      icon: <Building2 size={44} className="text-orange-600"/>,
      dot: "bg-orange-500 shadow-orange-100",
      accent: "bg-orange-50/80",
      buttonColor: "from-orange-600 to-orange-500",
      glow: "bg-orange-400/20",
      textGradient: "from-orange-600 to-orange-400"
    },
    {
      title: "Elektronická",
      highlight: "dochádzka",
      icon: <Smartphone size={44} className="text-blue-600"/>,
      dot: "bg-blue-600 shadow-blue-100",
      accent: "bg-blue-50/80",
      buttonColor: "from-blue-600 to-blue-500",
      glow: "bg-blue-400/20",
      textGradient: "from-blue-600 to-blue-400"
    },
    {
      title: "Prehľad firemnej",
      highlight: "výkonnosti",
      icon: <TrendingUp size={44} className="text-emerald-600"/>,
      dot: "bg-emerald-600 shadow-emerald-100",
      accent: "bg-emerald-50/80",
      buttonColor: "from-emerald-600 to-emerald-500",
      glow: "bg-emerald-400/20",
      textGradient: "from-emerald-600 to-emerald-400"
    },
    {
      title: "Komplexná správa",
      highlight: "zamestnancov",
      icon: <Users size={44} className="text-purple-600"/>,
      dot: "bg-purple-600 shadow-purple-100",
      accent: "bg-purple-50/80",
      buttonColor: "from-purple-600 to-purple-500",
      glow: "bg-purple-400/20",
      textGradient: "from-purple-600 to-purple-400"
    }
  ];

  const nextSlide = () => {
    if (slide < slides.length - 1) setSlide(s => s + 1);
    else onFinish();
  };

  return (
    <div className="flex flex-col min-h-[540px] w-full overflow-hidden bg-white relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 opacity-[0.015]" style={{backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>
          <div className={`absolute top-[-5%] left-[-5%] w-[110%] h-[110%] rounded-full blur-[140px] transition-all duration-1000 opacity-20 ${slide === 0 ? 'bg-orange-200' : slide === 1 ? 'bg-blue-200' : slide === 2 ? 'bg-emerald-200' : 'bg-purple-200'}`}></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center py-12">
          <div className="absolute top-6 left-0 right-0 flex justify-center">
              <div className="flex gap-2">
                  {slides.map((_, i) => (
                      <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === slide ? `w-7 ${slides[slide].dot}` : 'w-1.5 bg-slate-100'}`} />
                  ))}
              </div>
          </div>

          <div className="absolute top-5 right-6">
              <button onClick={onFinish} className="text-slate-300 hover:text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] transition-all">Preskočiť</button>
          </div>

          <div className="mb-14 relative group">
              <div key={`icon-${slide}`} className={`w-36 h-36 rounded-[54px] transition-all duration-1000 flex items-center justify-center relative z-20 border border-white/80 shadow-2xl backdrop-blur-xl animate-in zoom-in-75 fade-in ${slides[slide].accent}`}>
                  {slides[slide].icon}
              </div>
              <div className={`absolute -inset-8 ${slides[slide].glow} rounded-full blur-3xl opacity-50 -z-10 animate-pulse duration-[3000ms]`}></div>
          </div>

          <div className="max-w-[300px]">
              <div key={`content-${slide}`} className="animate-in slide-in-from-bottom-4 fade-in duration-700">
                <h2 className="text-3xl md:text-4xl font-extralight text-slate-800 tracking-tight leading-[1.2]">
                    {slides[slide].title} <br/>
                    <span className={`font-black bg-gradient-to-r ${slides[slide].textGradient} bg-clip-text text-transparent`}>
                        {slides[slide].highlight}
                    </span>
                </h2>
              </div>
          </div>
      </div>

      <div className="relative z-10 px-10 pb-12">
          <div className="flex justify-center">
            <button 
                onClick={nextSlide} 
                className={`group relative w-full max-w-[280px] flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r ${slides[slide].buttonColor} text-white rounded-[22px] font-bold text-sm shadow-xl shadow-slate-200 active:scale-[0.92] transition-all duration-300 overflow-hidden tracking-[0.05em] border-b-4 border-black/20`}
            >
                <span className="relative z-10">
                  {slide === slides.length - 1 ? "Začať teraz" : "Ďalší krok"}
                </span>
                <ArrowRight size={18} className="relative z-10 transition-transform group-hover:translate-x-1.5" />
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
            </button>
          </div>
      </div>
    </div>
  );
};

// --- LANDING SCREEN ---
export const LandingScreen = ({ onStart, onLogin, onWorker, onTryFree, onSubscriptionClick }: { onStart: () => void, onLogin: () => void, onWorker: () => void, onTryFree: () => void, onSubscriptionClick: () => void }) => {
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pt-safe-top overflow-y-auto scroll-container flex flex-col">
      <nav className="border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur-md z-50 shrink-0">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between gap-2">
          {/* LOGO */}
          <div className="flex items-center gap-1.5 md:gap-2.5 min-w-0 shrink">
            <img 
              src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" 
              alt="Logo" 
              className="w-7 h-7 md:w-9 md:h-9 object-contain shrink-0" 
            />
            <span className="font-extrabold text-sm md:text-xl tracking-tight text-slate-900 truncate">Moja<span className="text-orange-600">Stavba</span></span>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
             <button 
                onClick={onTryFree} 
                className="px-3 md:px-5 py-2 md:py-2.5 text-[10px] md:text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg md:rounded-xl shadow-lg shadow-orange-200 transition transform hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
             >
                Vyskúšať zadarmo
             </button>
             <button 
                onClick={onLogin} 
                className="px-2 md:px-4 py-2 text-[10px] md:text-xs font-bold text-slate-500 hover:text-orange-600 rounded-lg md:rounded-xl border border-transparent md:border-slate-200 hover:border-orange-200 transition-all whitespace-nowrap"
             >
                Prihlásiť sa
             </button>
          </div>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-24 bg-gradient-to-b from-orange-50/50 to-white text-center">
        <div className="max-w-4xl mx-auto">
          {/* DOWNLOAD CALL TO ACTION BADGE (Replaces version placeholder) */}
          <button 
            onClick={() => setShowDownloadModal(true)}
            className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-full text-xs font-black text-orange-600 mb-8 shadow-sm hover:bg-orange-100 transition-all active:scale-95 group animate-in fade-in slide-in-from-top-4 duration-700"
          >
            <Download size={14} className="group-hover:animate-bounce"/>
            Stiahnuť aplikáciu
          </button>

          <h1 className="text-3xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
            Stavebný manažment<br/>
            <span className="text-orange-600">pre moderné firmy</span>
          </h1>
          <h2 className="text-base md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed px-2">
            Kompletná správa zákaziek, dochádzky či analytiky v jednej aplikácii.<br/>
            <span className="font-semibold text-slate-800">Vyskúšajte na 14 dní bez zadávania platobných údajov.</span>
          </h2>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4 md:px-0">
            <button onClick={onStart} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold shadow-xl shadow-orange-200 hover:bg-orange-700 transition">
              Vytvoriť Firemný Účet <ChevronRight size={20} />
            </button>
             <button onClick={onWorker} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white border border-slate-100 text-slate-700 rounded-2xl font-bold shadow-md hover:shadow-lg hover:border-orange-200 hover:text-orange-700 transition group">
              <CustomLogo className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition-colors" color="text-slate-400"/> Vytvoriť Zamestnanecký Účet
            </button>
          </div>

          <div className="mt-16 flex flex-col items-center opacity-40">
              <div className="flex gap-4 mb-2">
                  <Monitor size={20} className="text-slate-400"/>
                  <Smartphone size={20} className="text-slate-400"/>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Dostupné na Windows, Android a Web</span>
          </div>
        </div>
      </section>

      {showDownloadModal && <DownloadModal onClose={() => setShowDownloadModal(false)} />}
    </div>
  );
};

// --- LOGIN SCREEN ---
export const LoginScreen = ({ onLogin, initialView = 'login', initialCompanyId = '', onBackToLanding }: any) => {
  const [view, setView] = useState(initialView); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState(initialCompanyId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false); 
  const [rememberMe, setRememberMe] = useState(true); 
  const [showLegalModal, setShowLegalModal] = useState<'vop' | 'gdpr' | null>(null);
  
  const [alertInfo, setAlertInfo] = useState<{open: boolean, title: string, message: string, type?: 'success' | 'error'}>({ open: false, title: '', message: '' });

  useEffect(() => {
      if(initialView) setView(initialView);
      if(initialCompanyId) setCompanyId(initialCompanyId);
  }, [initialView, initialCompanyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (view !== 'login' && view !== 'forgot-password' && !agreedToTerms) {
        setError("Musíte súhlasiť s VOP a GDPR pred registráciou.");
        return;
    }

    setLoading(true);
    try {
      if(view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if(error) throw error;
      } 
      else if (view === 'forgot-password') {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/?action=reset-password`,
          });
          if (error) throw error;
          setAlertInfo({ 
              open: true, 
              title: "E-mail odoslaný", 
              message: "Ak daný e-mail v systéme existuje, poslali sme vám inštrukcie na obnovu hesla. Skontrolujte si schránku.",
              type: 'success'
          });
          setView('login');
      }
      else if (view === 'register-admin') {
        const { data: auth, error: authError } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    full_name: fullName,
                    company_name: companyName, 
                    role: 'admin'
                }
            }
        });
        
        if(authError) throw authError;
        
        if (auth.session) {
            onLogin();
        } else {
            setAlertInfo({ open: true, title: "Registrácia úspešná", message: "Na váš email sme poslali overovací odkaz. Po kliknutí sa budete môcť prihlásiť." });
            setView('login');
        }
      }
      else if (view === 'register-emp') {
          const cleanId = companyId.trim();
          const { data: org, error: orgCheckError } = await supabase.from('organizations').select('id, name').eq('id', cleanId).maybeSingle();
          
          if(orgCheckError || !org) throw new Error("Firma s týmto ID neexistuje. Skontrolujte, či ste správne skopírovali kód.");

          const { data: auth, error: authError } = await supabase.auth.signUp({ 
              email, 
              password,
              options: {
                  data: {
                      full_name: fullName,
                      company_id: cleanId, 
                      role: 'employee'
                  }
              }
          });
          
          if(authError) throw authError;

          if (auth.session) {
              onLogin();
          } else {
              setAlertInfo({ open: true, title: "Vitajte!", message: `Registrácia do firmy "${org.name}" prebehla úspešne! Skontrolujte si email pre overenie účtu.` });
              setView('login');
          }
      }
    } catch(e: any) {
      const msg = translateAuthError(e.message);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = () => {
    setView('login');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start md:justify-center p-4 relative pt-16 pb-12 overflow-y-auto scroll-container">
      {showLegalModal && <LegalModal type={showLegalModal} onClose={() => setShowLegalModal(null)} />}
      
      <div className="absolute top-4 left-4 z-50 pt-safe-top">
          <button 
            onClick={onBackToLanding} 
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-500 hover:text-slate-900 rounded-xl shadow-sm hover:shadow border border-slate-200/50 transition font-bold text-sm"
          >
              <ArrowLeft size={16} /> <span className="hidden sm:inline">Späť na úvod</span>
          </button>
      </div>

      <Card className="w-full max-w-md shadow-xl border-slate-200 animate-in zoom-in-95 relative overflow-hidden my-4" padding={view === 'onboarding' ? 'p-0' : 'p-6'}>
        
        {view === 'onboarding' ? (
            <OnboardingCarousel onFinish={() => setView('selection')} />
        ) : (
            <>
                <div className="text-center">
                <div className="flex justify-center -mb-10">
                    <img 
                      src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-2.png" 
                      alt="Logo" 
                      className="w-40 h-40 object-contain" 
                    />
                </div>
                <h1 className="text-2xl font-bold mb-1">
                    <span className="text-slate-900">Moja</span><span className="text-orange-600">Stavba</span>
                </h1>
                <p className="text-slate-500 text-sm mb-6">
                    {view === 'login' && 'Prihlásenie do systému'}
                    {view === 'forgot-password' && 'Obnova prístupového hesla'}
                    {view === 'selection' && 'Vyberte typ registrácie'}
                    {view === 'register-admin' && 'Nová firma'}
                    {view === 'register-emp' && 'Registrácia zamestnanca'}
                </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-3 animate-pulse">
                        <AlertCircle className="shrink-0 mt-0.5" size={16}/>
                        <div>{error}</div>
                    </div>
                )}

                {view === 'selection' ? (
                    <div className="space-y-4">
                        <button onClick={() => setView('register-admin')} className="w-full p-6 rounded-xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition group flex items-center gap-4 text-left relative overflow-hidden">
                            <div className="bg-white p-3 rounded-full border border-slate-200 group-hover:border-orange-200 text-slate-400 group-hover:text-orange-600 transition z-10">
                                <Building2 size={24}/>
                            </div>
                            <div className="z-10">
                                <div className="font-bold text-slate-800">Firemný Účet (Majiteľ)</div>
                                <div className="text-xs text-slate-500">Založiť novú firmu + 14 dní zadarmo</div>
                            </div>
                            <ChevronRight className="ml-auto text-slate-300 group-hover:text-orange-400 z-10"/>
                        </button>

                        <button onClick={() => { setCompanyId(''); setView('register-emp'); }} className="w-full p-6 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition group flex items-center gap-4 text-left">
                            <div className="bg-white p-3 rounded-full border border-slate-200 group-hover:border-blue-200 text-slate-400 group-hover:text-blue-600 transition">
                                <CustomLogo className="w-6 h-6" color="text-slate-400 group-hover:text-blue-600 transition-colors"/>
                            </div>
                            <div>
                                <div className="font-bold text-slate-800">Zamestnanecký Účet</div>
                                <div className="text-xs text-slate-500">Mám ID firmy a chcem sa pridať</div>
                            </div>
                            <ChevronRight className="ml-auto text-slate-300 group-hover:text-blue-400"/>
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                    
                    {view === 'register-admin' && (
                        <>
                        <Input label="Názov Firmy" value={companyName} onChange={(e: any) => setCompanyName(e.target.value)} required placeholder="Moja Stavebná s.r.o." />
                        <Input label="Vaše Meno (Majiteľ)" value={fullName} onChange={(e: any) => setFullName(e.target.value)} required placeholder="Ján Staviteľ" />
                        </>
                    )}

                    {view === 'register-emp' && (
                        <>
                        <div className="bg-blue-50 p-3 rounded-xl mb-4 border border-blue-100">
                            <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1"><Briefcase size={12}/> ID Firmy (Povinné)</label>
                            <input 
                                type="text" 
                                name="company_id_field_random"
                                autoComplete="off"
                                value={companyId} 
                                onChange={(e: any) => setCompanyId(e.target.value)} 
                                required 
                                placeholder="Vložte ID firmy" 
                                className="w-full bg-white border border-blue-200 rounded-lg p-2 font-mono text-sm"
                                readOnly={!!initialCompanyId} 
                            />
                            {!!initialCompanyId && <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1"><CheckCircle2 size={10}/> Automaticky načítané z pozvánky</p>}
                        </div>
                        <Input label="Vaše Meno" value={fullName} onChange={(e: any) => setFullName(e.target.value)} required placeholder="Ján Novák" />
                        </>
                    )}

                    <Input label="Email" type="email" name="new_email" autoComplete="new-password" value={email} onChange={(e: any) => setEmail(e.target.value)} required placeholder="meno@mail.sk" />
                    
                    {view !== 'forgot-password' && (
                        <Input label="Heslo" type="password" name="new_password" autoComplete="new-password" value={password} onChange={(e: any) => setPassword(e.target.value)} required placeholder="••••••••" />
                    )}
                    
                    {view === 'login' && (
                        <div className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="rememberMe" 
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-slate-300"
                                />
                                <label htmlFor="rememberMe" className="text-xs font-bold text-slate-500">Zapamätať si</label>
                            </div>
                            <button type="button" onClick={() => setView('forgot-password')} className="text-xs font-bold text-orange-600 hover:text-orange-700">Zabudli ste heslo?</button>
                        </div>
                    )}

                    {view !== 'login' && view !== 'forgot-password' && (
                        <div className="flex items-start gap-3 py-2">
                            <input 
                                type="checkbox" 
                                id="terms" 
                                className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-slate-300"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                            />
                            <label htmlFor="terms" className="text-xs text-slate-500 leading-tight">
                                Súhlasím so <button type="button" onClick={() => setShowLegalModal('vop')} className="text-orange-600 hover:underline font-bold">Všeobecnými podmienkami (VOP)</button> a beriem na vedomie spracovanie osobných údajov podľa <button type="button" onClick={() => setShowLegalModal('gdpr')} className="text-orange-600 hover:underline font-bold">GDPR</button>.
                            </label>
                        </div>
                    )}

                    <Button type="submit" fullWidth loading={loading} size="lg" disabled={(view !== 'login' && view !== 'forgot-password' && !agreedToTerms)}>
                        {view === 'login' ? 'Prihlásiť sa' : view === 'forgot-password' ? 'Odoslať inštrukcie' : 'Vytvoriť Účet'}
                    </Button>
                    </form>
                )}

                {view !== 'selection' && (
                    <div className="mt-6 flex flex-col gap-3 text-center text-sm">
                        {view === 'login' ? (
                            <button onClick={() => { setView('onboarding'); setError(null); }} className="text-slate-500 hover:text-slate-900 font-medium">
                                Nemáte účet? <span className="underline font-bold text-orange-600">Zaregistrujte sa</span>
                            </button>
                        ) : (
                            <button onClick={switchToLogin} className="text-slate-500 hover:text-slate-900 font-medium">
                                Máte už účet? <span className="underline font-bold text-orange-600">Prihláste sa</span>
                            </button>
                        )}
                    </div>
                )}
            </>
        )}
      </Card>

      <AlertModal 
        isOpen={alertInfo.open} 
        title={alertInfo.title} 
        message={alertInfo.message} 
        type={alertInfo.type}
        onClose={() => setAlertInfo({...alertInfo, open: false})}
      />
    </div>
  );
};