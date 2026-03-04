
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LegalModal, Modal } from '../components/UI';
import { 
  ArrowLeft, Mail, Phone, Clock, 
  X, ArrowRight, ShieldCheck, Zap, Target, Sparkles, 
  BookOpen, BarChart3, Cloud, Image as ImageIcon, TrendingUp, 
  ChevronRight, ChevronLeft, Maximize2, MousePointer2, LayoutGrid,
  Trophy, Star, Crown, CheckCircle2, Building2, Users, Wallet, Calendar,
  FileCheck, Shield, MapPin, User, HardHat, Info, PieChart
} from 'lucide-react';
import { PLANS } from './Subscription';

const REASONS = [
  {
    id: 1,
    title: "Prehľad zákaziek",
    brandTitle: "Prehľad",
    brandHighlight: "zákaziek",
    desc: "Získajte okamžitý prehľad o ziskovosti zákaziek, o rozsahu a čase prác Vašich zamestnancov, spravujte príjmy a výdavky, alebo tvorte cenové ponuky a rozpočty na pár klikov.",
    color: "from-orange-400 to-orange-600",
    theme: "rgba(249, 115, 22, 0.03)",
    preview: "Projects",
    detailImg: "https://lordsbenison.sk/wp-content/uploads/2026/03/1.png"
  },
  {
    id: 2,
    title: "Elektronická dochádzka",
    brandTitle: "Elektronická",
    brandHighlight: "dochádzka",
    desc: "Zamestnanci si zapisujú dochádzku a rozsah prác priamo cez mobilnú aplikáciu MojaStavba, čo zaručí prehľad, EDIT a generovanie PDF dochádzky či prehľad v mzdových nákladoch.",
    color: "from-orange-400 to-orange-600",
    theme: "rgba(249, 115, 22, 0.03)",
    preview: "Attendance",
    detailImg: "https://lordsbenison.sk/wp-content/uploads/2026/03/2.png"
  },
  {
    id: 3,
    title: "Správa zamestnancov",
    brandTitle: "Správa",
    brandHighlight: "zamestnancov",
    desc: "Majte pod dohľadom hodinové sadzby, zálohy a výkony každého člena tímu. Získajte prehľad o výkonoch zamestnancov, alebo im priraďte rôzne právomoci v rámci konrkétnej zákazky.",
    color: "from-orange-400 to-orange-600",
    theme: "rgba(249, 115, 22, 0.03)",
    preview: "Team",
    detailImg: "https://lordsbenison.sk/wp-content/uploads/2026/03/3.png"
  },
  {
    id: 4,
    title: "Stavebný denník",
    brandTitle: "Stavebný",
    brandHighlight: "Denník",
    desc: "Vedenie elektronického stavebného denníka Vám ušetrí čas a zjednoduší prácu. Ponúka automatický import vykonaných prác z dochádzky, fotodokumentáciu a mnoho ďalšieho.",
    color: "from-orange-400 to-orange-600",
    theme: "rgba(249, 115, 22, 0.03)",
    preview: "Diary",
    detailImg: "https://lordsbenison.sk/wp-content/uploads/2026/03/4.png"
  },
  {
    id: 5,
    title: "Správa financií",
    brandTitle: "Komplexná",
    brandHighlight: "analytika",
    desc: "Sledujte príjmy a výdavky, nákupy materiálu, PHM či réžiu firmy v reálnom čase. Prehľadné štatistiky a grafy zabezpečia ucelený pohľad na zdravie firmy a financií.",
    color: "from-orange-400 to-orange-600",
    theme: "rgba(249, 115, 22, 0.03)",
    preview: "Finance",
    detailImg: "https://lordsbenison.sk/wp-content/uploads/2026/03/6.png"
  },
  {
    id: 6,
    title: "Inteligentný kalendár",
    brandTitle: "inteligentný",
    brandHighlight: "kalendár",
    desc: "Kalendár zabezpečí prehľad v úlohách naprieč stavbami. Plánujte prácu, prideľujte konkrétne úlohy zamestnancom a získajte úplný prehľad vo Vašom harmonograme.",
    color: "from-orange-400 to-orange-600",
    theme: "rgba(249, 115, 22, 0.03)",
    preview: "Calendar",
    detailImg: "https://lordsbenison.sk/wp-content/uploads/2026/03/5.png"
  },
  {
    id: 7,
    title: "A veľa iného...",
    brandTitle: "...a množstvo",
    brandHighlight: "iných funkcií",
    desc: "Od profesionálnych cenových ponúk, generovania výkazov...cez hĺbkovú analytiku až po správu vozového parku. MojaStavba je komplexný operačný systém, ktorý rastie spolu s vašou firmou.",
    color: "from-orange-400 to-orange-600",
    theme: "rgba(249, 115, 22, 0.03)",
    preview: "More",
    detailImg: "https://lordsbenison.sk/wp-content/uploads/2026/03/9.png"
  }
];

const PricingModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <Modal title="" onClose={onClose} maxWidth="max-w-6xl" hideHeader={true}>
      <div className="relative px-6 pt-2 pb-8 sm:px-10 sm:pt-4 sm:pb-10 space-y-6">
        <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-300 hover:text-slate-900 transition-all p-2 rounded-full hover:bg-slate-100 z-50 group">
          <X size={24} className="group-hover:rotate-90 transition-transform duration-300"/>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {PLANS.map((plan) => {
            let borderStyle = 'border-slate-100';
            let shadowStyle = 'hover:shadow-xl';
            let bgGradient = 'from-white to-white';

            if (plan.id === 'base') { 
                borderStyle = 'border-slate-200';
                shadowStyle = 'shadow-lg shadow-slate-100';
                bgGradient = 'from-slate-50/50 to-white';
            } else if (plan.id === 'standard') { 
                borderStyle = 'border-orange-200';
                shadowStyle = 'shadow-xl shadow-orange-50 ring-4 ring-orange-50';
                bgGradient = 'from-amber-50/30 to-white';
            } else if (plan.id === 'pro') { 
                borderStyle = 'border-slate-300';
                shadowStyle = 'shadow-xl shadow-blue-50 ring-4 ring-slate-50';
                bgGradient = 'from-slate-100/50 to-white';
            }

            return (
              <div key={plan.id} className={`relative flex flex-col bg-gradient-to-b ${bgGradient} rounded-[2.5rem] border-2 p-8 transition-all ${borderStyle} ${shadowStyle}`}>
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                    <Trophy size={10} fill="currentColor"/> Odporúčané
                  </div>
                )}
                <div className="mb-6">
                  <h4 className={`text-2xl font-black uppercase tracking-tighter flex items-center gap-2 ${plan.accent}`}>
                    {plan.name}
                    {plan.id === 'pro' && <span className="text-lg">💎</span>}
                  </h4>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{plan.desc}</p>
                </div>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">{plan.price}€</span>
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">/ bez DPH</span>
                </div>
                <div className="space-y-2.5 flex-1">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`mt-0.5 shrink-0 ${f.included ? 'text-green-600' : 'text-red-500'}`}>{f.included ? <CheckCircle2 size={16} /> : <X size={16} strokeWidth={3} />}</div>
                      <span className={`text-[11px] font-bold leading-tight ${f.included ? 'text-slate-700' : 'text-slate-900 opacity-60'}`}>{f.text}</span>
                    </div>
                  ))}
                </div>
                              </div>
            );
          })}
        </div>
        <div className="bg-blue-50 p-4 sm:p-5 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                <div className="bg-blue-600 text-white p-2 rounded-xl shrink-0"><Info size={18}/></div>
                <p className="text-xs text-blue-800 font-medium leading-relaxed">
                  Vyskúšajte MojaStavba teraz na 30 dní zadarmo a bez zadávania platobných údajov.
                </p>
            </div>
            <button onClick={() => window.location.href = '/'} className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-0 sm:gap-2 shrink-0 flex-col sm:flex-row leading-tight">
                <span>Vyskúšať zadarmo</span>
                <span>na 30 dní</span>
                <ArrowRight size={12} className="hidden sm:block"/>
            </button>
        </div>
      </div>
    </Modal>
  );
};

export const AboutApp = () => {
  const [showLegal, setShowLegal] = useState<'vop' | 'gdpr' | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  
  const timerRef = useRef<any>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % REASONS.length);
    }, 3000);
  }, []);

  useEffect(() => {
    if (!isPaused && !showLightbox && !showPricing) startTimer();
    else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPaused, showLightbox, showPricing, startTimer]);

  const active = REASONS[currentIdx];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIdx(p => (p - 1 + REASONS.length) % REASONS.length);
    startTimer();
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIdx(p => (p + 1) % REASONS.length);
    startTimer();
  };

  return (
    <div className="h-screen bg-white text-slate-900 font-sans selection:bg-orange-100 flex flex-col scroll-smooth transition-colors duration-[1500ms] overflow-x-hidden" style={{ backgroundColor: active.theme }}>
      
      {/* --- LIGHTBOX --- */}
      {showLightbox && (
          <div className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300" onClick={() => setShowLightbox(false)}>
              {/* Nice Close Button with Animation - Now Orange */}
              <button 
                onClick={() => setShowLightbox(false)} 
                className="absolute top-4 right-4 sm:top-6 sm:right-6 text-orange-500 hover:text-orange-400 transition-all hover:rotate-90 hover:scale-110 p-3 sm:p-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 z-[1020] shadow-xl"
              >
                <X size={24} className="sm:hidden"/>
                <X size={32} className="hidden sm:block"/>
              </button>
              
              {/* Lightbox Nav */}
              <button onClick={handlePrev} className="absolute left-1 sm:left-2 md:left-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 md:p-3 text-white bg-black/20 backdrop-blur-sm border border-white/10 rounded-full transition-all z-[1010] active:scale-90 hover:scale-110 hover:bg-black/40">
                <ChevronLeft size={24} className="sm:hidden"/>
                <ChevronLeft size={32} className="hidden sm:md:hidden"/>
                <ChevronLeft size={40} className="hidden md:block"/>
              </button>
              <button onClick={handleNext} className="absolute right-1 sm:right-2 md:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 md:p-3 text-white bg-black/20 backdrop-blur-sm border border-white/10 rounded-full transition-all z-[1010] active:scale-90 hover:scale-110 hover:bg-black/40">
                <ChevronRight size={24} className="sm:hidden"/>
                <ChevronRight size={32} className="hidden sm:md:hidden"/>
                <ChevronRight size={40} className="hidden md:block"/>
              </button>

              <div className="max-w-[98vw] sm:max-w-[95vw] w-full flex flex-col items-center gap-6 sm:gap-10 animate-in zoom-in-95 duration-500 px-4 sm:px-12" onClick={e => e.stopPropagation()}>
                  <div key={`lightbox-img-${active.id}`} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <img 
                      src={active.detailImg} 
                      className="rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] shadow-[0_0_80px_sm:0_0_120px_rgba(0,0,0,0.6)] border-2 sm:border-4 border-white/10 max-h-[70vh] sm:max-h-[85vh] object-contain" 
                      alt={active.title} 
                    />
                  </div>
                  {/* Indicators - Increased contrast */}
                  <div className="flex gap-2 sm:gap-3">
                      {REASONS.map((_, i) => (
                          <div key={i} className={`h-1 sm:h-1.5 rounded-full transition-all duration-500 ${i === currentIdx ? 'w-8 sm:w-12 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'w-2 sm:w-3 bg-white/50'}`} />
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* --- HEADER --- */}
      <header className="relative z-[100] shrink-0">
        <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 h-14 sm:h-16 md:h-20 flex items-center justify-between gap-2">
            <a href="/" className="flex items-center gap-1 sm:gap-1.5 md:gap-2.5 min-w-0 shrink group transition">
              <img 
                src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" 
                alt="Logo" 
                className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-9 lg:h-9 object-contain shrink-0 group-hover:scale-110 transition-transform duration-500" 
              />
              <span className="font-extrabold text-xs sm:text-sm md:text-base lg:text-xl tracking-tight text-slate-900 truncate">Moja<span className="text-orange-600">Stavba</span></span>
            </a>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
               <button onClick={() => setShowPricing(true)} className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-800 hover:text-orange-600 rounded-lg sm:rounded-xl border border-slate-200 hover:border-orange-200 bg-white shadow-sm transition-all whitespace-nowrap active:scale-95">Cenník</button>
               <button onClick={() => window.location.href = '/'} className="px-2 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-2 md:py-2.5 text-[9px] sm:text-[10px] md:text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg sm:rounded-xl shadow-lg shadow-orange-200 transition transform hover:-translate-y-0.5 active:scale-95 whitespace-nowrap flex items-center gap-1 sm:gap-2">
                 <ArrowLeft size={12} className="sm:hidden"/>
                 <ArrowLeft size={14} className="hidden sm:block"/>
                 <span className="hidden sm:inline">Späť na úvod</span>
                 <span className="sm:hidden">Späť</span>
               </button>
            </div>
          </div>
        </nav>
      </header>

      <main className="flex-1 flex flex-col overflow-y-auto no-scrollbar scroll-smooth">
        
        {/* --- HERO SHOWCASE --- */}
        <section className="min-h-[calc(100vh-80px)] flex items-center justify-center pt-12 sm:pt-16 pb-16 sm:pb-20 px-4 sm:px-6 relative overflow-hidden">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl aspect-square bg-gradient-to-br ${active.color} opacity-[0.04] blur-[150px] rounded-full transition-all duration-1500 pointer-events-none`}></div>

            {/* Layout Container */}
            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative">
                
                {/* LEFT: BRANDED TEXT & MECHANICAL NUMBER */}
                <div className="lg:col-span-4 relative z-10 flex flex-col justify-center order-1 lg:order-1">
                    
                    {/* Fixed Odometer - Dot at baseline */}
                    <div className="relative h-16 sm:h-20 md:h-24 lg:h-28 lg:h-32 mb-0 sm:mb-2 overflow-hidden flex items-start">
                        <div 
                          className="flex flex-col transition-transform duration-[1200ms] cubic-bezier(0.16, 1, 0.3, 1)"
                          style={{ transform: `translateY(-${currentIdx * (100 / REASONS.length)}%)`, height: `${REASONS.length * 100}%` }}
                        >
                            {REASONS.map((r, i) => (
                                <div key={i} className="flex items-baseline" style={{ height: `${100 / REASONS.length}%` }}>
                                    <span className="text-[40px] sm:text-[50px] md:text-[60px] lg:text-[80px] lg:text-[110px] font-black leading-none text-slate-900 opacity-60 select-none tracking-tighter pr-3 sm:pr-4 md:pr-6 lg:pr-8">
                                        {r.id}.
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div key={`content-${active.id}`} className="space-y-0 sm:space-y-1 md:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        {/* Decorative Line */}
                        <div className="w-24 sm:w-32 md:w-40 lg:w-48 h-1 bg-gradient-to-r from-orange-600 via-orange-600/40 to-transparent rounded-full -mt-4 sm:-mt-1 md:mt-0 mb-2 sm:mb-3 md:mb-4 lg:mb-6 shadow-lg shadow-orange-100/20"></div>

                        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-[0.95] uppercase">
                            {active.brandTitle} <br/>
                            <span className="text-orange-600">{active.brandHighlight}</span>
                        </h2>
                        <p className="text-xs sm:text-sm md:text-base text-slate-500 font-medium leading-relaxed max-w-xs sm:max-w-sm pt-1 sm:pt-2">
                            {active.desc}
                        </p>
                    </div>

                    <div className="flex gap-1 sm:gap-1.5 lg:gap-2 mt-4 sm:mt-6 lg:mt-8 lg:mt-12">
                        {REASONS.map((_, i) => (
                            <button 
                                key={i}
                                onClick={() => { setCurrentIdx(i); startTimer(); }}
                                className={`h-1 rounded-full transition-all duration-700 ${i === currentIdx ? 'w-6 sm:w-8 lg:w-10 lg:w-12 bg-slate-900' : 'w-1.5 sm:w-2 lg:w-2.5 lg:w-3 bg-slate-200 hover:bg-slate-300'}`}
                            />
                        ))}
                    </div>
                </div>

                {/* RIGHT: THE IMAGE (GLASSMORPHISM) - Posunutý doprava */}
                <div className="lg:col-span-8 flex items-center gap-1 sm:gap-2 md:gap-4 group order-2 lg:order-2 lg:translate-x-12 transition-all">
                    
                    <button onClick={handlePrev} className="hidden sm:flex p-1.5 sm:p-2 bg-white/40 backdrop-blur-xl border border-white/20 rounded-xl text-slate-400 hover:text-orange-600 transition-all hover:scale-105 active:scale-95 shadow-lg shrink-0">
                        <ChevronLeft size={16} className="sm:hidden" />
                        <ChevronLeft size={20} className="hidden sm:block" />
                    </button>

                    <div 
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                        onClick={() => setShowLightbox(true)}
                        key={`mockup-${active.id}`}
                        className="relative flex-1 cursor-pointer bg-white/20 backdrop-blur-md rounded-[2rem] sm:rounded-[2.5rem] p-1 sm:p-1.5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-white/30 animate-in zoom-in-95 fade-in duration-[1500ms] overflow-hidden aspect-[16/10] sm:aspect-[16/10]"
                    >
                        <div className="absolute inset-0 bg-orange-600/5 opacity-0 group-hover:opacity-100 transition-all z-30 flex items-center justify-center pointer-events-none">
                            <div className="bg-white/90 backdrop-blur-xl p-2 sm:p-3 md:p-4 rounded-full shadow-2xl scale-40 sm:scale-50 group-hover:scale-90 sm:group-hover:scale-100 transition-all duration-700 text-orange-600">
                                <Maximize2 size={16} className="sm:hidden" />
                                <Maximize2 size={20} className="hidden sm:block md:hidden" />
                                <Maximize2 size={24} className="hidden md:block" />
                            </div>
                        </div>

                        <div className="w-full h-full rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] bg-white overflow-hidden relative shadow-inner flex items-center justify-center">
                            {/* Synced Preview Image - Using object-contain to prevent side cropping */}
                            <img 
                                src={active.detailImg} 
                                loading="lazy"
                                className="w-full h-full object-contain animate-in fade-in duration-1000 group-hover:scale-[1.02] sm:group-hover:scale-[1.03] transition-transform duration-[2000ms]" 
                                alt={active.title}
                                onError={(e) => {
                                    // Fallback to placeholder if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f97316'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Arial' font-size='18' font-weight='bold'%3E${encodeURIComponent(active.preview)}%3C/text%3E%3C/svg%3E`;
                                }}
                            />
                        </div>
                    </div>

                    <button onClick={handleNext} className="hidden sm:flex p-1.5 sm:p-2 bg-white/40 backdrop-blur-xl border border-white/20 rounded-xl text-slate-400 hover:text-orange-600 transition-all hover:scale-105 active:scale-95 shadow-lg shrink-0">
                        <ChevronRight size={16} className="sm:hidden" />
                        <ChevronRight size={20} className="hidden sm:block" />
                    </button>
                </div>
            </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="bg-slate-900 text-white py-8 sm:py-12 md:py-16 px-4 sm:px-6 shrink-0">
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
                <div className="sm:col-span-1">
                    <div className="flex items-center gap-2 mb-4 sm:mb-6">
                      <img 
                        src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" 
                        loading="lazy"
                        alt="Logo" 
                        className="w-8 h-8 sm:w-10 sm:h-10 object-contain" 
                      />
                      <span className="font-black text-lg sm:text-xl tracking-tight text-white">Moja<span className="text-orange-500">Stavba</span></span>
                    </div>
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                      Moderný nástroj pre digitalizáciu stavebníctva. Zjednodušujeme procesy, šetríme váš čas a pomáhame vám rásť. Teraz si nás môžete vyskúšať na 30 dní zadarmo a bez zadávania platobných údajov.
                    </p>
                </div>

                <div>
                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-orange-500 mb-4 sm:mb-6">Dôležité informácie</h4>
                    <ul className="space-y-2 sm:space-y-3">
                        <li><button onClick={() => window.location.href = '/'} className="text-xs sm:text-sm text-slate-300 hover:text-orange-400 transition font-medium">O aplikácii</button></li>
                        <li><button onClick={() => setShowPricing(true)} className="text-xs sm:text-sm text-slate-300 hover:text-orange-400 transition font-medium">Cenník a predplatné</button></li>
                        <li><button onClick={() => setShowLegal('vop')} className="text-xs sm:text-sm text-slate-300 hover:text-orange-400 transition font-medium">Obchodné podmienky (VOP)</button></li>
                        <li><button onClick={() => setShowLegal('gdpr')} className="text-xs sm:text-sm text-slate-300 hover:text-orange-400 transition font-medium">Ochrana údajov (GDPR)</button></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-orange-500 mb-4 sm:mb-6">Technická podpora</h4>
                    <ul className="space-y-3 sm:space-y-4">
                        <li className="flex items-start gap-3">
                            <Mail size={16} className="text-slate-500 mt-0.5 sm:hidden"/>
                            <Mail size={18} className="text-slate-500 mt-0.5 hidden sm:block"/>
                            <div>
                                <div className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase">E-mail</div>
                                <a href="mailto:sluzby@lordsbenison.eu" className="text-xs sm:text-sm text-slate-300 hover:text-white transition">sluzby@lordsbenison.eu</a>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <Phone size={16} className="text-slate-500 mt-0.5 sm:hidden"/>
                            <Phone size={18} className="text-slate-500 mt-0.5 hidden sm:block"/>
                            <div>
                                <div className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase">Telefón</div>
                                <a href="tel:+421948225713" className="text-xs sm:text-sm text-slate-300 hover:text-white transition">+421 948 225 713</a>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <Clock size={16} className="text-slate-500 mt-0.5 sm:hidden"/>
                            <Clock size={18} className="text-slate-500 mt-0.5 hidden sm:block"/>
                            <div>
                                <div className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase">Pracovná doba</div>
                                <div className="text-xs sm:text-sm text-slate-300">Po - Pi (08:00 - 16:30)</div>
                            </div>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-orange-500 mb-4 sm:mb-6">Prevádzkovateľ</h4>
                    <address className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-400 not-italic">
                        <p className="font-bold text-white">LORD'S BENISON s.r.o.</p>
                        <p>M. Nandrássyho 654/10<br/>050 01 Revúca</p>
                        <div className="pt-2 text-[10px] sm:text-xs border-t border-slate-800 space-y-1">
                            <p>IČO: 52404901</p>
                            <p>DIČ: 2121022992</p>
                            <p>IČ DPH: SK2121022992</p>
                        </div>
                    </address>
                </div>
            </div>
            <div className="max-w-6xl mx-auto mt-8 sm:mt-12 md:mt-16 pt-6 sm:pt-8 border-t border-white/5 text-center flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                    © 2026 Vyvinuté spoločnosťou LORD'S BENISON s.r.o. | Všetky práva vyhradené
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                    Pozri aj naše weby <a href="https://www.lordsbenison.sk" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition-colors">www.lordsbenison.sk</a> a <a href="https://www.edugdpr.sk" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition-colors">www.edugdpr.sk</a>
                </div>
            </div>
        </footer>
      </main>

      {showLegal && <LegalModal type={showLegal} onClose={() => setShowLegal(null)} />}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </div>
  );
};
