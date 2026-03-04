
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Card, Input, CustomLogo, AlertModal, LegalModal, Modal } from '../components/UI';
import { translateAuthError } from '../lib/utils';
import { 
  Building2, Smartphone, TrendingUp, Users, ArrowRight, ChevronRight, ChevronLeft,
  Monitor, Briefcase, CheckCircle2, AlertCircle, ArrowLeft, Download, X, HelpCircle, Apple, ShieldCheck, Info,
  FileCheck, BookOpen, LayoutGrid, Mail, Phone, Clock, Shield, MapPin, User, Eye, EyeOff, Zap, Trophy, Star, Crown, Menu, MoreVertical
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PLANS } from './Subscription';

// Pomocná funkcia pre získanie bezpečnej návratovej URL
const getRedirectURL = () => {
  const origin = window.location.origin;
  if (origin.includes('moja-stavba.sk') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return origin;
  }
  return 'https://www.moja-stavba.sk';
};

// --- PRICING MODAL FOR LANDING PAGE ---
const PricingModal = ({ onClose, onSelect }: { onClose: () => void, onSelect: () => void }) => {
  return (
    <Modal title="" onClose={onClose} maxWidth="max-w-6xl" hideHeader={true}>
      <div className="relative px-6 pt-2 pb-8 sm:px-10 sm:pt-4 sm:pb-10 space-y-6">
        {/* CUSTOM CLOSE BUTTON INSIDE CONTENT */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-300 hover:text-slate-900 transition-all p-2 rounded-full hover:bg-slate-100 z-50 group"
        >
          <X size={24} className="group-hover:rotate-90 transition-transform duration-300"/>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {PLANS.map((plan) => {
            // Určenie špeciálnych štýlov pre Silver a Platinum
            let borderStyle = 'border-slate-100';
            let shadowStyle = 'hover:shadow-xl';
            let bgGradient = 'from-white to-white';

            if (plan.id === 'base') { // SILVER
                borderStyle = 'border-slate-200';
                shadowStyle = 'shadow-lg shadow-slate-100';
                bgGradient = 'from-slate-50/50 to-white';
            } else if (plan.id === 'standard') { // GOLD
                borderStyle = 'border-orange-200';
                shadowStyle = 'shadow-xl shadow-orange-50 ring-4 ring-orange-50';
                bgGradient = 'from-amber-50/30 to-white';
            } else if (plan.id === 'pro') { // PLATINUM
                borderStyle = 'border-slate-300';
                shadowStyle = 'shadow-xl shadow-blue-50 ring-4 ring-slate-50';
                bgGradient = 'from-slate-100/50 to-white';
            }

            return (
              <div 
                key={plan.id} 
                className={`relative flex flex-col bg-gradient-to-b ${bgGradient} rounded-[2.5rem] border-2 p-8 transition-all ${borderStyle} ${shadowStyle}`}
              >
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
                      <div className={`mt-0.5 shrink-0 ${f.included ? 'text-green-600' : 'text-red-500'}`}>
                        {f.included ? <CheckCircle2 size={16} /> : <X size={16} strokeWidth={3} />}
                      </div>
                      <span className={`text-[11px] font-bold leading-tight ${f.included ? 'text-slate-700' : 'text-slate-900 opacity-60'}`}>
                        {f.text}
                      </span>
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
            <button onClick={() => { onClose(); onSelect(); }} className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-0 sm:gap-2 shrink-0 flex-col sm:flex-row leading-tight">
                <span>Vyskúšať zadarmo</span>
                <span>na 30 dní</span>
                <ArrowRight size={12} className="hidden sm:block"/>
            </button>
        </div>
        
        <div className="text-center pb-2">
            <button onClick={onClose} className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-slate-900 transition-colors">Zavrieť cenník</button>
        </div>
      </div>
    </Modal>
  );
};

// --- DOWNLOAD MODAL COMPONENT ---
const DownloadModal = ({ onClose }: { onClose: () => void }) => {
  const GITHUB_REPO = "https://github.com/javorcikivan1-ux/instalacky_mojastavba/releases/latest/download";

  return (
    <Modal title="Stiahnutie aplikácie do Mobilu alebo PC" onClose={onClose} maxWidth="max-w-4xl">
      <div className="space-y-6">
        <p className="text-sm text-slate-500 text-center mb-2">
          Vyberte si platformu. Natívna aplikácia poskytuje rýchlejší prístup a lepšiu stabilitu systému.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <a 
            href={`${GITHUB_REPO}/MojaStavba.apk`}
            className="group p-6 rounded-2xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all text-center flex flex-col items-center gap-4 shadow-sm"
          >
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Smartphone size={28} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 uppercase tracking-tight text-xs">Android</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Pre mobil</p>
            </div>
            <div className="mt-2 px-3 py-1.5 bg-orange-600 text-white text-[10px] font-black rounded-lg flex items-center gap-1.5">
              <Download size={12}/> .APK
            </div>
          </a>

          <div className="group p-6 rounded-2xl border-2 border-slate-50 bg-slate-50/50 grayscale opacity-60 text-center flex flex-col items-center gap-4 cursor-not-allowed">
            <div className="w-14 h-14 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center">
              <Apple size={28} />
            </div>
            <div>
              <h3 className="font-black text-slate-400 uppercase tracking-tight text-xs">iPhone / iPad</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Pripravujeme</p>
            </div>
            <div className="mt-2 px-3 py-1.5 bg-slate-200 text-slate-400 text-[10px] font-black rounded-lg">
              Vo vývoji
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-black text-xs uppercase tracking-wider">
                <ShieldCheck size={18} className="text-blue-500"/> Bezpečnosť a dôveryhodnosť
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="text-[10px] font-black text-blue-600 uppercase mb-2 flex items-center gap-1">
                        <Monitor size={12}/> Inštalácia na Windows
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                        Pretože sme nová aplikácia, Windows môže zobraziť varovanie "SmartScreen". Kliknite na <strong>"Viac informácií"</strong> a následne <strong>"Spustiť aj tak"</strong>. Súbor je 100% bezpečný a skontrolovaný.
                    </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="text-[10px] font-black text-orange-600 uppercase mb-2 flex items-center gap-1">
                        <Smartphone size={12}/> Inštalácia na Android
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                        Po stiahnutí APK povoľte v nastaveniach vášho prehliadača <strong>"Inštalovať z neznámych zdrojov"</strong>. Po dokončení inštalácie môžete toto nastavenie opäť vypnúť.
                    </p>
                </div>
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
      accent: "bg-blue-50/80",
      buttonColor: "from-emerald-600 to-emerald-500",
      glow: "bg-emerald-400/20",
      textGradient: "from-emerald-600 to-emerald-400"
    },
    {
      title: "Komplexná správa",
      highlight: "zamestnancov",
      icon: <Users size={44} className="text-purple-600"/>,
      dot: "bg-purple-600 shadow-purple-100",
      accent: "bg-blue-50/80",
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
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showLegal, setShowLegal] = useState<'vop' | 'gdpr' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detekcia mobilnej veľkosti
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Text variants pre animáciu - LEN PRE WEB
  const textVariants = [
    "Komplexný systém pre",
    "stavebná firma v"
  ];

  const textVariantsOrange = [
    "stavebný manažment",
    "jednej aplikácii"
  ];

  // Features pre karusel - 3 karty na slide
  const slides = [
    {
      cards: [
        {
          type: "wave",
          title: "ELEKTRONICKÁ",
          subtitle: "DOCHÁDZKA",
          category: "MOBILNÁ APLIKÁCIA",
          description: "Vaši zamestnanci si zapisujú odpracované hodiny priamo na stavbe cez mobil. Žiadne papierové hárky ani prepisovanie do Excelu.",
          icon: <FileCheck size={32} />,
          gradient: ["#ff6b35", "#ff8c42"]
        },
        {
          type: "wave",
          title: "DIGITÁLNY",
          subtitle: "STAVEBNÝ DENNÍK",
          category: "DOKUMENTÁCIA",
          description: "Zaznamenávajte priebeh prác, počasie a fotodokumentáciu každý deň. Denník je bezpečne uložený v cloude a kedykoľvek exportovateľný.",
          icon: <BookOpen size={32} />,
          gradient: ["#ff8c42", "#ffa947"]
        },
        {
          type: "wave",
          title: "KONTROLA",
          subtitle: "NÁKLADOV A ZISKU",
          category: "FINANCIE",
          description: "Sledujte ziskovosť každej zákazky zvlášť. Majte okamžitý prehľad o tom, ktoré stavby vám reálne zarábajú.",
          icon: <TrendingUp size={32} />,
          gradient: ["#ffa947", "#ffc34d"]
        }
      ]
    },
    {
      cards: [
        {
          type: "text",
          title: "SPRÁVA",
          subtitle: "TÍMU A MZDY",
          category: "PERSONÁL",
          description: "Priraďte pracovníkom hodinovú sadzbu a sledujte ich výkon. MojaStavba pre vás prepočíta odpracované hodiny na mzdové náklady.",
          icon: <Users size={32} />,
          gradient: ["#ff8c42", "#ffa947"]
        },
        {
          type: "text",
          title: "HARMONOGRAM",
          subtitle: "A ÚLOHY",
          category: "PLÁNOVANIE",
          description: "Plánujte prácu dopredu pomocou integrovaného kalendára úloh. Priraďte zodpovednosť konkrétnym ľuďom.",
          icon: <LayoutGrid size={32} />,
          gradient: ["#ffa947", "#ffc34d"]
        },
        {
          type: "text",
          title: "MAXIMÁLNA",
          subtitle: "BEZPEČNOSŤ DÁT",
          category: "ZABEZPEČENIE",
          description: "Vaše dáta sú šifrované a bezpečne uložené na serveroch v EÚ. K citlivým finančným informáciám máte prístup len vy.",
          icon: <Shield size={32} />,
          gradient: ["#ffc34d", "#ffda77"]
        }
      ]
    }
  ];

  // Všetky karty v jednom poli pre jednoduchšie posúvanie
  const allCards = slides.flatMap(slide => slide.cards);
  
  // Pridanie klonovaných kariet na začiatok pre plynulý nekonečný cyklus
  const carouselCards = [...allCards.slice(-2), ...allCards, ...allCards.slice(0, 2)];

  // Synchronizácia modalu s reálnymi HTML názvami v URL
  useEffect(() => {
    const checkURL = () => {
      const path = window.location.pathname;
      if (path.includes('vseobecne-obchodne-podmienky.html')) setShowLegal('vop');
      else if (path.includes('zasady-ochrany-osobnych-udajov-gdpr.html')) setShowLegal('gdpr');
      else setShowLegal(null);
    };

    checkURL();
    window.addEventListener('popstate', checkURL);
    return () => window.removeEventListener('popstate', checkURL);
  }, []);

  const handleLegalClick = (type: 'vop' | 'gdpr') => {
    const fileName = type === 'vop' ? 'vseobecne-obchodne-podmienky.html' : 'zasady-ochrany-osobnych-udajov-gdpr.html';
    const newURL = `/${fileName}`;
    window.history.pushState({ path: newURL }, '', newURL);
    setShowLegal(type);
  };

  const handleCloseLegal = () => {
    window.history.pushState({ path: '/' }, '', '/');
    setShowLegal(null);
  };

  const isWebOnly = Capacitor.getPlatform() === 'web' && 
                   !navigator.userAgent.toLowerCase().includes('electron') &&
                   !(window as any).ipcRenderer;

  // Efekt pre animované prechody - LEN PRE WEB
  useEffect(() => {
    if (!isWebOnly) return;
    
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % textVariants.length);
    }, 6000); // Dlhšie - 6 sekúnd

    return () => clearInterval(interval);
  }, [isWebOnly]);

  // Efekt pre 3D karusel - LEN PRE WEB
  useEffect(() => {
    if (!isWebOnly) return;
    
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => {
        const next = prev + 1;
        // Ak presiahne pôvodné karty, skočiť späť na začiatok (s offsetom)
        if (next >= allCards.length + 2) {
          return 2; // Skočiť na prvú pôvodnú kartu
        }
        return next;
      });
    }, 6000); // Spomalené na 6 sekúnd

    return () => clearInterval(interval);
  }, [isWebOnly]);

  // 3D karusel handlers
  const goToCard = (index: number) => {
    // Zabezpečiť, že index je v rozsahu klonovaných kariet
    const validIndex = Math.max(2, Math.min(index, allCards.length + 1));
    setCurrentSlideIndex(validIndex);
  };

  const nextCard = () => {
    setCurrentSlideIndex((prev) => {
      const next = prev + 1;
      if (next >= allCards.length + 2) {
        return 2; // Skočiť na prvú pôvodnú kartu
      }
      return next;
    });
  };

  const prevCard = () => {
    setCurrentSlideIndex((prev) => {
      const next = prev - 1;
      if (next < 2) {
        return allCards.length + 1; // Skočiť na poslednú pôvodnú kartu
      }
      return next;
    });
  };

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextCard();
    } else if (isRightSwipe) {
      prevCard();
    }
  };

  const menuBtnStyle = "px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold text-slate-800 hover:text-orange-600 rounded-lg md:rounded-xl border border-slate-200 hover:border-orange-200 bg-white shadow-sm transition-all whitespace-nowrap active:scale-95";

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pt-safe-top overflow-y-auto scroll-container flex flex-col">
      <header className="relative z-[100]">
        <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0">
          <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between gap-2">
            <a href="/" className="flex items-center gap-1.5 md:gap-2.5 min-w-0 shrink hover:opacity-80 transition">
              <img 
                src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" 
                alt="MojaStavba Logo" 
                className="w-7 h-7 md:w-9 md:h-9 object-contain shrink-0" 
              />
              <span className="font-extrabold text-sm md:text-xl tracking-tight text-slate-900 truncate">Moja<span className="text-orange-600">Stavba</span></span>
            </a>

            {/* DESKTOP NAVIGATION */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
               {isWebOnly && (
                 <button 
                  onClick={() => window.open('/o-aplikacii', '_blank')}
                  className={menuBtnStyle}
                 >
                   O aplikácii
                 </button>
               )}
               {isWebOnly && (
                 <button 
                  onClick={() => setShowPricingModal(true)} 
                  className={menuBtnStyle}
                 >
                   Cenník
                 </button>
               )}
               <button 
                  onClick={onLogin} 
                  className={menuBtnStyle}
               >
                  Prihlásiť sa
               </button>
               <button 
                  onClick={onTryFree} 
                  className="px-3 md:px-5 py-2 md:py-2.5 text-[10px] md:text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg md:rounded-xl shadow-lg shadow-orange-200 transition transform hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
               >
                  Vyskúšať zadarmo
               </button>
            </div>

            {/* MOBILE NAVIGATION AREA */}
            <div className="flex md:hidden items-center gap-2 shrink-0">
               <button 
                  onClick={onTryFree} 
                  className="px-3 py-2 text-[10px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-md shadow-orange-100 active:scale-95 whitespace-nowrap"
               >
                  Vyskúšať zadarmo
               </button>
               <button 
                 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                 className="p-2 text-slate-500 hover:text-orange-600 hover:bg-slate-50 rounded-lg transition-colors"
               >
                 {isMobileMenuOpen ? <X size={24}/> : <MoreVertical size={24}/>}
               </button>
            </div>
          </div>

          {/* MOBILE DROPDOWN MENU */}
          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-2xl animate-in slide-in-from-top-2 duration-200">
               <div className="p-4 space-y-2">
                 <button 
                    onClick={() => { window.open('/o-aplikacii', '_blank'); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 font-bold text-slate-700"
                 >
                   <span>O aplikácii</span>
                   <ChevronRight size={18} className="text-slate-300"/>
                 </button>
                 <button 
                    onClick={() => { setShowPricingModal(true); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 font-bold text-slate-700"
                 >
                   <span>Cenník</span>
                   <ChevronRight size={18} className="text-slate-300"/>
                 </button>
                 <button 
                    onClick={() => { onLogin(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 font-bold text-slate-700"
                 >
                   <span>Prihlásiť sa</span>
                   <ChevronRight size={18} className="text-slate-300"/>
                 </button>
               </div>
            </div>
          )}
        </nav>
      </header>

      <main className="flex-1 flex flex-col bg-white">
        <section className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-12 md:pt-24 md:pb-20 bg-gradient-to-b from-orange-50/50 to-white text-center min-h-[calc(100vh-80px)]">
          <div className="max-w-4xl mx-auto">
            {/* TLAČIDLO SŤAHOVANIA - ZOBRAZENÉ LEN NA WEBE */}
            {isWebOnly && (
              <div className="mb-8 animate-in fade-in duration-700">
                <button 
                  onClick={() => setShowDownloadModal(true)}
                  className="group inline-flex items-center gap-2.5 bg-white border-2 border-orange-200 hover:border-orange-400 text-orange-600 hover:text-orange-700 px-6 py-3 rounded-2xl font-black text-sm shadow-sm hover:shadow-md transition-all duration-300 active:scale-95"
                >
                  <Download size={16} className="group-hover:translate-y-0.5 transition-transform duration-200"/>
                  <span>Stiahnuť aplikáciu MojaStavba</span>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200"/>
                </button>
              </div>
            )}

            {/* HLAVNÝ SEO NADPIS H1 - dôležitý pre vyhľadávače */}
            <h1 className="text-3xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
                {isWebOnly ? (
                  <div className="relative">
                    <div className={`transition-all duration-1000 ease-in-out ${
                      currentTextIndex === 0 
                        ? 'opacity-100 transform scale-100 rotate-0 translate-y-0' 
                        : 'opacity-0 transform scale-50 rotate-12 translate-y-4'
                    }`}>
                      <span className="block">Komplexný systém pre</span>
                      <span className="text-orange-600 block">stavebný manažment</span>
                    </div>
                    <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                      currentTextIndex === 1 
                        ? 'opacity-100 transform scale-100 rotate-0 translate-y-0' 
                        : 'opacity-0 transform scale-50 -rotate-12 translate-y-4'
                    }`}>
                      <span className="block">Vaša stavebná firma v</span>
                      <span className="text-orange-600 block">jednej aplikácii</span>
                    </div>
                  </div>
                ) : (
                  <>Stavebný manažment<br/><span className="text-orange-600">pre moderné firmy</span></>
                )}
            </h1>

            <p className="text-base md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed px-2">
              Kompletná správa zákaziek, dochádzky a analytiky v jednej aplikácii.<br/>
              <span className="font-semibold text-slate-800">Vyskúšajte na 30 dní bez zadávania platobných údajov.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4 md:px-0">
              <button onClick={onStart} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold shadow-xl shadow-orange-200 hover:bg-orange-700 transition">
                Vytvoriť firemný účet <ChevronRight size={20} />
              </button>
               <button onClick={onWorker} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white border border-slate-100 text-slate-700 rounded-2xl font-bold shadow-md hover:shadow-lg hover:border-orange-200 hover:text-orange-700 transition group">
                <CustomLogo className="w-5 h-5 text-slate-400 group-hover:text-orange-600 transition-colors" color="text-slate-400"/> Registrácia zamestnanca
              </button>
            </div>

            <div className="mt-16 flex flex-col items-center opacity-40">
                <div className="flex gap-4 mb-2">
                    <Monitor size={20} className="text-slate-400"/>
                    <Smartphone size={20} className="text-slate-400"/>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Dostupné na všetkých zariadeniach</span>
            </div>
          </div>
        </section>

        {isWebOnly && (
            <section className="pt-6 pb-24 px-6 bg-white border-y border-slate-100 animate-in fade-in duration-1000">
                <div className="max-w-6xl mx-auto">
                    {/* Responzívny karusel */}
                    <div className="relative">
                        <div className="overflow-hidden">
                            <div 
                                className="flex transition-all duration-300 ease-in-out"
                                style={{ transform: `translateX(-${currentSlideIndex * (isMobile ? 100 : 33.333)}%)` }}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            >
                                {carouselCards.map((card, cardIndex) => (
                                    <div key={`${cardIndex}-${card.title}`} className={`${isMobile ? 'w-full' : 'w-1/3'} flex-shrink-0 px-2`}>
                                        <article 
                                            className="group relative bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl border border-orange-100 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-300 overflow-hidden"
                                        >
                                            {/* Hover efekt - oranžová vrstva */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-orange-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        
                                            {/* Obsah karty */}
                                            <div className="relative z-10">
                                                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                                                    {card.icon}
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-900 mb-1 leading-tight">{card.title}</h3>
                                                <h4 className="text-lg font-bold text-orange-600 mb-2 leading-tight">{card.subtitle}</h4>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-8 h-px bg-orange-400"></div>
                                                    <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">{card.category}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    {card.description}
                                                </p>
                                            </div>
                                        
                                            {/* Dekoratívne prvky */}
                                            <div className="absolute top-4 right-4 w-20 h-20 bg-orange-100/20 rounded-full blur-2xl"></div>
                                            <div className="absolute bottom-4 left-4 w-16 h-16 bg-orange-100/10 rounded-full blur-xl"></div>
                                        </article>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Indikátory a šípky - všetko v jednom riadku */}
                        <div className="flex justify-center items-center gap-6 mt-8">
                            {/* Šípka vľavo - grafická */}
                            <button 
                                onClick={prevCard}
                                className="group relative w-10 h-10 flex items-center justify-center transition-all duration-200 hover:scale-110"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-orange-600 group-hover:text-orange-700 transition-colors">
                                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            
                            {/* Indikátory - len pre pôvodné karty */}
                            <div className="flex justify-center gap-2">
                                {allCards.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToCard(index + 2)} // Offset pre klonované karty
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                            currentSlideIndex - 2 === index 
                                                ? 'bg-orange-600 w-8' 
                                                : 'bg-slate-300 hover:bg-slate-400'
                                        }`}
                                    />
                                ))}
                            </div>
                            
                            {/* Šípka vpravo - grafická */}
                            <button 
                                onClick={nextCard}
                                className="group relative w-10 h-10 flex items-center justify-center transition-all duration-200 hover:scale-110"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-orange-600 group-hover:text-orange-700 transition-colors">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        )}
      </main>

      {isWebOnly && (
        <footer className="bg-slate-900 text-white py-16 px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="md:col-span-1">
                    <div className="flex items-center gap-2 mb-6">
                      <img src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" alt="Logo" className="w-10 h-10 object-contain" />
                      <span className="font-black text-xl tracking-tight text-white">Moja<span className="text-orange-500">Stavba</span></span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Moderný nástroj pre digitalizáciu stavebníctva. Zjednodušujeme procesy, šetríme váš čas a pomáhame vám rásť. Teraz si nás môžete vyskúšať na 30 dní zadarmo a bez zadávania platobných údajov.
                    </p>
                </div>

                <div>
                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-orange-500 mb-6">Dôležité informácie</h4>
                    <ul className="space-y-3">
                        <li><button onClick={() => window.open('/o-aplikacii', '_blank')} className="text-sm text-slate-300 hover:text-orange-400 transition font-medium">O aplikácii</button></li>
                        <li><button onClick={() => setShowPricingModal(true)} className="text-sm text-slate-300 hover:text-orange-400 transition font-medium">Cenník a predplatné</button></li>
                        <li>
                          <a 
                            href="/vseobecne-obchodne-podmienky.html" 
                            onClick={(e) => { e.preventDefault(); handleLegalClick('vop'); }}
                            className="text-sm text-slate-300 hover:text-orange-400 transition font-medium"
                          >
                            Obchodné podmienky (VOP)
                          </a>
                        </li>
                        <li>
                          <a 
                            href="/zasady-ochrany-osobnych-udajov-gdpr.html" 
                            onClick={(e) => { e.preventDefault(); handleLegalClick('gdpr'); }}
                            className="text-sm text-slate-300 hover:text-orange-400 transition font-medium"
                          >
                            Ochrana údajov (GDPR)
                          </a>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-orange-500 mb-6">Technická podpora</h4>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <Mail size={18} className="text-slate-500 mt-0.5"/>
                            <div>
                                <div className="text-[10px] font-black text-slate-600 uppercase">E-mail</div>
                                <a href="mailto:sluzby@lordsbenison.eu" className="text-sm text-slate-300 hover:text-white transition">sluzby@lordsbenison.eu</a>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <Phone size={18} className="text-slate-500 mt-0.5"/>
                            <div>
                                <div className="text-[10px] font-black text-slate-600 uppercase">Telefón</div>
                                <a href="tel:+421948225713" className="text-sm text-slate-300 hover:text-white transition">+421 948 225 713</a>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <Clock size={18} className="text-slate-500 mt-0.5"/>
                            <div>
                                <div className="text-[10px] font-black text-slate-600 uppercase">Pracovná doba</div>
                                <div className="text-sm text-slate-300">Po - Pi (08:00 - 16:30)</div>
                            </div>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-orange-500 mb-6">Prevádzkovateľ</h4>
                    <address className="space-y-3 text-sm text-slate-400 not-italic">
                        <p className="font-bold text-white">LORD'S BENISON s.r.o.</p>
                        <p className="flex items-start">
                          <span>M. Nandrássyho 654/10<br/>050 01 Revúca</span>
                        </p>
                        <div className="pt-2 text-xs border-t border-slate-800 space-y-1">
                            <p>IČO: 52404901</p>
                            <p>DIČ: 2121022992</p>
                            <p>IČ DPH: SK2121022992</p>
                        </div>
                    </address>
                </div>
            </div>
            <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                    © 2026 Vyvinuté spoločnosťou LORD'S BENISON s.r.o. | Všetky práva vyhradené
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                    Pozri aj naše weby <a href="https://www.lordsbenison.sk" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition-colors">www.lordsbenison.sk</a> a <a href="https://www.edugdpr.sk" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition-colors">www.edugdpr.sk</a>
                </div>
            </div>
        </footer>
      )}

      {showDownloadModal && <DownloadModal onClose={() => setShowDownloadModal(false)} />}
      {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} onSelect={() => { setShowPricingModal(false); onStart(); }} />}
      {showLegal && <LegalModal type={showLegal} onClose={handleCloseLegal} />}
    </div>
  );
};

// --- LOGIN SCREEN ---
export const LoginScreen = ({ onLogin, initialView = 'login', initialCompanyId = '', onBackToLanding }: any) => {
  const [view, setView] = useState(initialView); 
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [useNickname, setUseNickname] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false); 
  const [rememberMe, setRememberMe] = useState(true); 
  const [showLegalModal, setShowLegalModal] = useState<'vop' | 'gdpr' | null>(null);
  const [alertInfo, setAlertInfo] = useState<{open: boolean, title: string, message: string, type?: 'success' | 'error'}>({ open: false, title: '', message: '' });

  // AUTOMATICKÉ NAČÍTANIE Z URL (MAGIC LINK)
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const urlCompanyId = params.get('companyId');
      const urlAction = params.get('action');

      // Vždy skontrolovať URL bez ohľadu na initialView
      if (urlAction === 'register-emp') {
          setView('register-emp');
          if (urlCompanyId) setCompanyId(urlCompanyId);
      } else {
          setView(initialView);
          if (initialCompanyId) setCompanyId(initialCompanyId);
      }
  }, [initialView, initialCompanyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validácie pre registráciu
    if (view !== 'login' && view !== 'forgot-password') {
        if (!agreedToTerms) {
            setError("Musíte súhlasiť so Všeobecnými podmienkami (VOP) a Ochranou údajov (GDPR) pred registráciou.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Zadané heslá sa nezhodujú.");
            return;
        }
        if (password.length < 6) {
            setError("Heslo musí mať aspoň 6 znakov.");
            return;
        }
    }

    setLoading(true);
    const redirectURL = getRedirectURL();
    
    try {
      if(view === 'login') {
        let loginEmail = email.trim();
        
        // Ak neobsahuje @, považujeme to za Nickname a skúsime nájsť prislúchajúci email
        if (!loginEmail.includes('@')) {
            const { data: foundProfile, error: nicknameError } = await supabase
                .from('profiles')
                .select('email')
                .eq('nickname', loginEmail)
                .maybeSingle();
            
            if (nicknameError || !foundProfile) {
                throw new Error("Nesprávna prezývka alebo e-mail.");
            }
            loginEmail = foundProfile.email;
        }

        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if(error) throw error;
      } 
      else if (view === 'forgot-password') {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${redirectURL}/?action=reset-password`,
          });
          if (error) throw error;
          setAlertInfo({ open: true, title: "E-mail odoslaný", message: "Poslali sme vám inštrukcie na obnovu hesla, skontrolujte si e-mailovú schránku prosím.", type: 'success' });
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
                role: 'admin',
                nickname: useNickname ? nickname.trim() : null
            },
            emailRedirectTo: redirectURL 
          } 
        });
        if(authError) throw authError;
        if (auth.session) onLogin();
        else { setAlertInfo({ open: true, title: "Registrácia úspešná", message: "Na vašu e-mailovú adresu bol odoslaný overovací odkaz. Po jeho potvrdení sa budete môcť prihlásiť do systému." }); setView('login'); }
      }
      else if (view === 'register-emp') {
          const cleanId = companyId.trim();
          const { data: org, error: orgCheckError = null } = await supabase.from('organizations').select('id, name').eq('id', cleanId).maybeSingle();
          if(orgCheckError || !org) throw new Error("Firma s týmto ID neexistuje. Skontrolujte, či ste správne skopírovali kód.");
          
          const { data: auth, error: authError } = await supabase.auth.signUp({ 
            email, 
            password, 
            options: { 
              data: { 
                  full_name: fullName, 
                  company_id: cleanId, 
                  role: 'employee',
                  nickname: useNickname ? nickname.trim() : null
              },
              emailRedirectTo: redirectURL 
            } 
          });
          if(authError) throw authError;
          if (auth.session) onLogin();
          else { setAlertInfo({ open: true, title: "Vitajte!", message: `Registrácia do firmy "${org.name}" prebehla úspešne! Skontrolujte si email pre overenie účtu.` }); setView('login'); }
      }
    } catch(e: any) { setError(translateAuthError(e.message)); } finally { setLoading(false); }
  };

  const switchToLogin = () => { setView('login'); setError(null); };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start md:justify-center p-4 relative pt-16 pb-12 overflow-y-auto scroll-container">
      {showLegalModal && <LegalModal type={showLegalModal} onClose={() => setShowLegalModal(null)} />}
      <div className="absolute top-4 left-4 z-50 pt-safe-top"><button onClick={onBackToLanding} className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-500 hover:text-slate-900 rounded-xl shadow-sm hover:shadow border border-slate-200/50 transition font-bold text-sm"><ArrowLeft size={16} /> <span className="hidden sm:inline">Späť na úvod</span></button></div>
      <Card className="w-full max-w-md shadow-xl border-slate-200 animate-in zoom-in-95 relative overflow-hidden my-4" padding={view === 'onboarding' ? 'p-0' : 'p-6'}>
        {view === 'onboarding' ? ( <OnboardingCarousel onFinish={() => setView('selection')} /> ) : (
            <>
                <div className="text-center">
                <div className="flex justify-center -mb-10">
                    <img 
                      src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-2.png" 
                      alt="Logo MojaStavba" 
                      className="w-40 h-40 object-contain" 
                    />
                </div>
                <h2 className="text-2xl font-bold mb-1">
                    <span className="text-slate-900">Moja</span><span className="text-orange-600">Stavba</span>
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                    {view === 'login' && 'Prihlásenie do systému'}
                    {view === 'forgot-password' && 'Obnova prístupového hesla'}
                    {view === 'selection' && 'Vyberte typ registrácie'}
                    {view === 'register-admin' && 'Nová registrácia'}
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
                                <div className="text-xs text-slate-500">Založiť novú firmu + 30 dní zadarmo</div>
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
                        <Input label="Názov organizácie" value={companyName} onChange={(e: any) => setCompanyName(e.target.value)} required placeholder="Moja Stavebná s.r.o." />
                        <Input label="Meno a priezvisko" value={fullName} onChange={(e: any) => setFullName(e.target.value)} required placeholder="Ján Staviteľ" />
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
                                readOnly={!!new URLSearchParams(window.location.search).get('companyId')} 
                            />
                            {!!new URLSearchParams(window.location.search).get('companyId') && <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1"><CheckCircle2 size={10}/> Automaticky načítané z pozvánky</p>}
                        </div>
                        <Input label="Vaše Meno" value={fullName} onChange={(e: any) => setFullName(e.target.value)} required placeholder="Ján Novák" />
                        </>
                    )}

                    {view !== 'forgot-password' && (
                        <div className="space-y-4">
                            <Input 
                                label={view === 'login' ? "Email" : "Email"} 
                                type="text" 
                                name="identifier" 
                                value={email} 
                                onChange={(e: any) => setEmail(e.target.value)} 
                                required 
                                placeholder={view === 'login' ? "meno@mail.sk alebo prezývka" : "meno@mail.sk"} 
                            />

                            {view.startsWith('register') && (
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-white transition group">
                                        <input 
                                            type="checkbox" 
                                            checked={useNickname}
                                            onChange={(e: any) => setUseNickname(e.target.checked)}
                                            className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                                        />
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-slate-700">Chcem sa prihlasovať prezývkou</div>
                                        </div>
                                    </label>
                                    
                                    {useNickname && (
                                        <div className="animate-in slide-in-from-top-2 duration-300">
                                            <Input 
                                                label="Zvoľte si prezývku (Nickname)" 
                                                value={nickname} 
                                                onChange={(e: any) => setNickname(e.target.value)} 
                                                required 
                                                placeholder="Môj_nickname" 
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'forgot-password' && (
                         <Input label="Váš e-mail" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required placeholder="meno@mail.sk" />
                    )}
                    
                    {view !== 'forgot-password' && (
                        <div className="space-y-4">
                            <div className="relative">
                                <Input 
                                    label="Heslo" 
                                    type={showPassword ? "text" : "password"} 
                                    name="new_password" 
                                    autoComplete="new-password" 
                                    value={password} 
                                    onChange={(e: any) => setPassword(e.target.value)} 
                                    required 
                                    placeholder="••••••••" 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 transition"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {view.startsWith('register') && (
                                <Input 
                                    label="Potvrdenie hesla" 
                                    type={showPassword ? "text" : "password"} 
                                    name="confirm_password" 
                                    autoComplete="off" 
                                    value={confirmPassword} 
                                    onChange={(e: any) => setConfirmPassword(e.target.value)} 
                                    required 
                                    placeholder="••••••••" 
                                />
                            )}
                        </div>
                    )}
                    
                    {view === 'login' && (
                        <div className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="rememberMe" 
                                    checked={rememberMe}
                                    onChange={(e: any) => setRememberMe(e.target.checked)}
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
                                onChange={(e: any) => setAgreedToTerms(e.target.checked)}
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
                            <button className="text-slate-500 hover:text-slate-900 font-medium" onClick={switchToLogin}>
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
