
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Card, Input, CustomLogo, AlertModal, LegalModal, Modal } from '../components/UI';
import { translateAuthError } from '../lib/utils';
import { 
  Building2, Smartphone, TrendingUp, Users, ArrowRight, ChevronRight, ChevronLeft,
  Monitor, Briefcase, CheckCircle2, AlertCircle, ArrowLeft, Download, X, HelpCircle, Info,
  FileCheck, BookOpen, LayoutGrid, Mail, Phone, Clock, Shield, MapPin, User, Eye, EyeOff, Zap, Trophy, Star, Crown, Menu, MoreVertical, Pause, Play
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PLANS } from './Subscription';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const isStandalonePwa = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
};

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

// --- PWA INSTALL MODAL COMPONENT ---
const BrowserLogo = ({ type }: { type: 'edge' | 'chrome' | 'safari' | 'opera' | 'firefox' }) => {
  return (
    <img
      src={`/brand-icons/${type}.png`}
      alt=""
      aria-hidden="true"
      className="h-11 w-11 shrink-0 object-contain drop-shadow-sm"
    />
  );
};

const PlatformLogo = ({ type, className = 'h-9 w-9' }: { type: 'android' | 'apple' | 'windows'; className?: string }) => (
  <img
    src={`/brand-icons/${type}.png`}
    alt=""
    aria-hidden="true"
    className={`${className} shrink-0 object-contain`}
  />
);

const StepList = ({ steps }: { steps: string[] }) => (
  <ol className="space-y-2.5">
    {steps.map((step, index) => (
      <li key={step} className="flex gap-3 text-sm font-semibold leading-relaxed text-slate-700">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[11px] font-black text-orange-700 ring-1 ring-orange-100">
          {index + 1}
        </span>
        <span>{step}</span>
      </li>
    ))}
  </ol>
);

const DownloadModal = ({ 
  onClose, 
  installPrompt,
  isInstalled,
  onPromptUsed
}: { 
  onClose: () => void;
  installPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  onPromptUsed: () => void;
}) => {
  const [installing, setInstalling] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'iphone' | 'mac' | 'windows' | null>(null);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const canInstall = !!installPrompt && !isInstalled;

  const handleNativeInstall = async () => {
    if (!installPrompt) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      onPromptUsed();
      onClose();
    } finally {
      setInstalling(false);
    }
  };

  const platforms = [
    { id: 'android' as const, label: 'Android', sublabel: 'Mobilné zariadenie', icon: <Smartphone size={26} />, platformIcon: <PlatformLogo type="android" className="h-6 w-6 sm:h-8 sm:w-8" />, logoClass: '', iconClass: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200' },
    { id: 'iphone' as const, label: 'iPhone', sublabel: 'Mobilné zariadenie', icon: <Smartphone size={26} />, platformIcon: <PlatformLogo type="apple" className="h-6 w-6 sm:h-8 sm:w-8" />, logoClass: '', iconClass: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200' },
    { id: 'windows' as const, label: 'Windows', sublabel: 'Počítač', icon: <Monitor size={26} />, platformIcon: <PlatformLogo type="windows" className="h-6 w-6 sm:h-8 sm:w-8" />, logoClass: '', iconClass: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200' },
    { id: 'mac' as const, label: 'Mac', sublabel: 'Počítač', icon: <Monitor size={26} />, platformIcon: <PlatformLogo type="apple" className="h-6 w-6 sm:h-8 sm:w-8" />, logoClass: '', iconClass: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200' }
  ];

  const selectedPlatformData = platforms.find(platform => platform.id === selectedPlatform);
  const browserInstallHint = canInstall
    ? 'Kliknite alebo ťuknite na tlačidlo Spustiť inštaláciu. Ak sa zobrazí okno prehliadača, potvrďte inštaláciu. Ak sa nič nestane alebo sa tlačidlo nezobrazuje, nejde o chybu. Niektoré zariadenia a prehliadače vyžadujú ručné pridanie aplikácie.'
    : 'Ak sa inštalačné tlačidlo nezobrazuje, nejde o chybu. Niektoré zariadenia a prehliadače vyžadujú ručné pridanie aplikácie podľa návodu nižšie.';

  const installDetails: Record<'android' | 'iphone' | 'mac' | 'windows', {
    title: string;
    note: string;
    quick?: string;
    browsers: Array<{ name: string; logo: 'edge' | 'chrome' | 'safari' | 'opera' | 'firefox'; steps: string[] }>;
    manage?: string[];
  }> = {
    android: {
      title: 'Inštalácia na Android',
      note: 'Na Androide funguje MojaStavba ako aplikácia bez APK súboru. Najspoľahlivejšie je použiť Chrome alebo Edge.',
      quick: browserInstallHint,
      browsers: [
        {
          name: 'Google Chrome',
          logo: 'chrome',
          steps: [
            'Otvorte www.moja-stavba.sk v prehliadači Chrome.',
            'Ťuknite na tri bodky napravo od adresného riadka.',
            'Vyberte Inštalovať a vytvoriť odkaz a následne Inštalovať.',
            'V niektorých verziách sa položka môže volať Inštalovať aplikáciu alebo Pridať na plochu.',
            'Potvrďte inštaláciu. Ikona MojaStavba sa zobrazí na domovskej obrazovke alebo v zozname aplikácií.'
          ]
        },
        {
          name: 'Microsoft Edge',
          logo: 'edge',
          steps: [
            'Otvorte www.moja-stavba.sk v prehliadači Microsoft Edge.',
            'Ťuknite na menu s tromi bodkami.',
            'Vyberte Pridať do telefónu, Pridať na plochu alebo Nainštalovať aplikáciu.',
            'Názov položky sa môže líšiť podľa verzie Edge.',
            'Potvrďte pridanie aplikácie. Ak sa možnosť nezobrazuje, skúste stránku otvoriť v Google Chrome.'
          ]
        },
        {
          name: 'Opera',
          logo: 'opera',
          steps: [
            'Otvorte www.moja-stavba.sk v Opere.',
            'Ťuknite na menu napravo od adresného riadka.',
            'Vyberte Pridať do.',
            'Vyberte pridanie na domovskú obrazovku a potvrďte ho.',
            'Podľa verzie Opery môže vzniknúť samostatná aplikácia alebo iba odkaz na stránku. Pre plnohodnotnú inštaláciu odporúčame Chrome alebo Edge.'
          ]
        },
        {
          name: 'Mozilla Firefox',
          logo: 'firefox',
          steps: [
            'Otvorte www.moja-stavba.sk vo Firefoxe.',
            'Ťuknite na menu s tromi bodkami.',
            'Vyberte Inštalovať.',
            'Potvrďte pridanie aplikácie na domovskú obrazovku.',
            'Ak Firefox vytvorí iba odkaz alebo možnosť inštalácie nezobrazí, použite Google Chrome alebo Microsoft Edge.'
          ]
        }
      ],
      manage: []
    },
    iphone: {
      title: 'Inštalácia na iPhone',
      note: 'iPhone neumožňuje otvoriť systémové okno inštalácie jedným klikom. Apple vyžaduje ručné pridanie cez Safari.',
      quick: 'Na iPhone je nutné aplikáciu nainštalovať ručne. Použite prosím návod nižšie.',
      browsers: [
        {
          name: 'Safari',
          logo: 'safari',
          steps: [
            'Otvorte www.moja-stavba.sk v Safari.',
            'Ťuknite na ikonu Zdieľať - štvorec so šípkou smerujúcou nahor.',
            'V niektorých zobrazeniach Safari je potrebné najprv ťuknúť na Viac a potom na Zdieľať.',
            'Posuňte ponuku nižšie a vyberte Pridať na plochu.',
            'Ak sa zobrazí možnosť Otvoriť ako webovú aplikáciu, zapnite ju.',
            'Skontrolujte názov MojaStavba a ťuknite na Pridať.',
            'Ak možnosť Pridať na plochu nevidíte, posuňte ponuku nadol, zvoľte Upraviť akcie a pridajte túto položku medzi dostupné akcie.'
          ]
        },
        {
          name: 'Google Chrome',
          logo: 'chrome',
          steps: [
            'Otvorte www.moja-stavba.sk v Chrome.',
            'Ťuknite na ikonu Zdieľať napravo od adresného riadka.',
            'Vyberte Pridať na plochu.',
            'Skontrolujte názov MojaStavba a potvrďte tlačidlom Pridať.'
          ]
        },
        {
          name: 'Mozilla Firefox',
          logo: 'firefox',
          steps: [
            'Otvorte www.moja-stavba.sk vo Firefoxe.',
            'Ťuknite na ikonu Zdieľať v adresnom riadku.',
            'Vyberte Pridať na plochu.',
            'Skontrolujte názov MojaStavba a potvrďte tlačidlom Pridať.'
          ]
        },
        {
          name: 'Microsoft Edge / Opera',
          logo: 'edge',
          steps: [
            'Otvorte www.moja-stavba.sk.',
            'Otvorte ponuku Zdieľať.',
            'Ak sa zobrazí možnosť Pridať na plochu, vyberte ju a potvrďte pridanie.',
            'Ak možnosť nevidíte, otvorte stránku v Safari a použite postup pre Safari.'
          ]
        }
      ],
      manage: []
    },
    windows: {
      title: 'Inštalácia na Windows',
      note: 'Na Windows odporúčame Edge alebo Chrome. Po inštalácii sa MojaStavba otvorí vo vlastnom okne ako desktop aplikácia.',
      quick: browserInstallHint,
      browsers: [
        {
          name: 'Microsoft Edge',
          logo: 'edge',
          steps: [
            'Otvorte www.moja-stavba.sk v Microsoft Edge.',
            'Ak sa v adresnom riadku zobrazí ikona inštalácie aplikácie, kliknite na ňu.',
            'Ak ikonu nevidíte, kliknite na tri bodky vpravo hore.',
            'Vyberte Ďalšie nástroje a potom Aplikácie.',
            'Kliknite na Nainštalovať túto lokalitu ako aplikáciu.',
            'Skontrolujte názov MojaStavba a potvrďte inštaláciu.'
          ]
        },
        {
          name: 'Google Chrome',
          logo: 'chrome',
          steps: [
            'Otvorte www.moja-stavba.sk v Google Chrome.',
            'Ak sa napravo v adresnom riadku zobrazí ikona inštalácie, kliknite na ňu.',
            'Ak ikonu nevidíte, kliknite na tri bodky vpravo hore.',
            'Vyberte Prenášať, uložiť a zdieľať. V anglickej verzii Cast, save and share.',
            'Vyberte Nainštalovať stránku ako aplikáciu alebo Install page as app.',
            'Potvrďte inštaláciu.'
          ]
        },
        {
          name: 'Opera',
          logo: 'opera',
          steps: [
            'Otvorte www.moja-stavba.sk v Opere.',
            'Skontrolujte pravú časť adresného riadka a menu prehliadača.',
            'Ak sa zobrazí ikona alebo možnosť inštalácie aplikácie, kliknite na ňu a inštaláciu potvrďte.',
            'Ak sa možnosť nezobrazuje, otvorte stránku v Microsoft Edge alebo Google Chrome.',
            'Ponuka inštalácie v Opere sa môže líšiť podľa verzie prehliadača.'
          ]
        },
        {
          name: 'Mozilla Firefox',
          logo: 'firefox',
          steps: [
            'Otvorte www.moja-stavba.sk vo Firefoxe.',
            'V adresnom riadku vyhľadajte ikonu webovej aplikácie.',
            'Kliknite na ikonu.',
            'Firefox vytvorí samostatnú webovú aplikáciu a pridá ju na panel úloh a do ponuky Štart.',
            'Ak sa ikona nezobrazuje, skontrolujte aktualizáciu Firefoxu a nepoužívajte súkromné prehliadanie. Ak možnosť stále nevidíte, použite Microsoft Edge alebo Google Chrome.'
          ]
        }
      ],
      manage: []
    },
    mac: {
      title: 'Inštalácia na Mac',
      note: 'Na Macu odporúčame Safari alebo Chrome. Aplikácia sa po pridaní otvorí samostatne, podobne ako bežná aplikácia.',
      quick: browserInstallHint,
      browsers: [
        {
          name: 'Safari',
          logo: 'safari',
          steps: [
            'Táto možnosť je dostupná v systéme macOS Sonoma 14 alebo novšom.',
            'Otvorte www.moja-stavba.sk v Safari.',
            'V hornej systémovej lište kliknite na Súbor a vyberte Pridať do Docku.',
            'Prípadne kliknite na ikonu Zdieľať v Safari a vyberte Pridať do Docku.',
            'Skontrolujte názov MojaStavba a kliknite na Pridať.',
            'Ak možnosť Pridať do Docku nevidíte, použite Google Chrome alebo Microsoft Edge.'
          ]
        },
        {
          name: 'Google Chrome',
          logo: 'chrome',
          steps: [
            'Otvorte www.moja-stavba.sk v Google Chrome.',
            'Ak sa v adresnom riadku zobrazí ikona inštalácie, kliknite na ňu.',
            'Ak ikonu nevidíte, kliknite na tri bodky vpravo hore.',
            'Vyberte Cast, save and share.',
            'Vyberte Install page as app.',
            'Potvrďte inštaláciu.'
          ]
        },
        {
          name: 'Microsoft Edge',
          logo: 'edge',
          steps: [
            'Otvorte www.moja-stavba.sk v Microsoft Edge.',
            'Kliknite na tri bodky vpravo hore.',
            'Vyberte Ďalšie nástroje a potom Aplikácie.',
            'Kliknite na Nainštalovať túto lokalitu ako aplikáciu.',
            'Potvrďte inštaláciu.'
          ]
        },
        {
          name: 'Opera',
          logo: 'opera',
          steps: [
            'Otvorte www.moja-stavba.sk v Opere.',
            'Pozrite menu prehliadača alebo adresný riadok.',
            'Ak je dostupná možnosť inštalácie aplikácie, potvrďte ju.',
            'Ak sa nezobrazuje, použite Safari alebo Chrome.'
          ]
        },
        {
          name: 'Mozilla Firefox',
          logo: 'firefox',
          steps: [
            'Firefox na Macu momentálne neponúka vytvorenie samostatnej webovej aplikácie.',
            'Otvorte stránku v Safari, Google Chrome alebo Microsoft Edge a použite príslušný postup vyššie.'
          ]
        }
      ],
      manage: []
    }
  };

  return (
    <Modal title="" onClose={onClose} maxWidth="max-w-4xl" hideHeader={true}>
      <div className="relative max-h-[88vh] overflow-y-auto p-5 sm:p-8">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex items-center gap-3 pr-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-100">
            <Download size={22} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Stiahnite si aplikáciu MojaStavba</h3>
          </div>
        </div>

        {isInstalled && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={24} />
              <div>
                <div className="font-black text-emerald-900">Aplikácia je už pravdepodobne nainštalovaná</div>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-emerald-800">
                  Ak ju chcete nainštalovať nanovo, najprv ju odstráňte zo zariadenia alebo zo zoznamu aplikácií v prehliadači.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(platform.id)}
              disabled={installing}
              className={`group rounded-2xl border p-3 text-left transition active:scale-[0.98] disabled:opacity-60 sm:p-4 ${
                selectedPlatform === platform.id
                  ? 'border-orange-300 bg-white shadow-sm ring-4 ring-orange-50'
                  : 'border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/60'
              }`}
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200 transition group-hover:bg-white sm:h-12 sm:w-12 sm:rounded-2xl">
                  {platform.platformIcon}
                </div>
                <div>
                  <div className="font-black text-slate-900">{platform.label}</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    {platform.sublabel}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {selectedPlatform && selectedPlatformData && (
          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className={selectedPlatformData.logoClass}>{selectedPlatformData.platformIcon}</div>
                  <h4 className="text-lg font-black text-slate-950">{installDetails[selectedPlatform].title}</h4>
                </div>
              </div>

              {selectedPlatform !== 'iphone' && canInstall && (
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  disabled={installing}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-100 transition hover:bg-orange-700 disabled:opacity-60"
                >
                  <Download size={17} />
                  {installing ? 'Otváram...' : 'Spustiť inštaláciu'}
                </button>
              )}
            </div>

            {installDetails[selectedPlatform].quick && (
              <div className="mb-4 space-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-slate-600 shadow-sm">
                {selectedPlatform === 'iphone' ? (
                  <p>{installDetails[selectedPlatform].quick}</p>
                ) : (
                  <>
                    <p>
                      Kliknite alebo ťuknite na tlačidlo <strong className="font-black text-slate-900">Spustiť inštaláciu</strong>.
                    </p>
                    <p>
                      Ak sa zobrazí okno prehliadača, potvrďte inštaláciu. Ak sa nič nestane alebo sa tlačidlo nezobrazuje, nejde o chybu. Niektoré zariadenia a prehliadače vyžadujú ručné pridanie aplikácie.
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-600">
              {selectedPlatform === 'iphone'
                ? 'Nainštalujte si aplikáciu ručne podľa návodu nižšie.'
                : 'Nejde Vám inštalácia alebo sa nezobrazuje vyššie inštalačné tlačidlo? Nainštalujte si aplikáciu ručne.'}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {installDetails[selectedPlatform].browsers.map(browser => (
                <div key={`${selectedPlatform}-${browser.name}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-3 border-b border-slate-100 pb-3">
                    <BrowserLogo type={browser.logo} />
                    <div>
                      <div className="text-sm font-black text-slate-900">{browser.name}</div>
                    </div>
                  </div>
                  <StepList steps={browser.steps} />
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-600">
              {selectedPlatform === 'iphone'
                ? 'Ak sa zobrazí možnosť Pridať na plochu alebo potvrdenie názvu aplikácie, potvrďte ju. Ikona MojaStavba sa potom zobrazí priamo na ploche iPhonu alebo iPadu.'
                : 'Ak sa vás systém pri inštalácii opýta, či chcete vytvoriť odkaz na pracovnej ploche alebo domovskej obrazovke, povoľte ho. Ikona aplikácie sa potom zobrazí priamo medzi aplikáciami.'}
            </div>

            {!!installDetails[selectedPlatform].manage?.length && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-900">
                  <HelpCircle size={17} className="text-orange-600" />
                  Keď aplikácia už existuje alebo inštalácia nejde
                </div>
                <ul className="space-y-1.5 text-sm font-semibold leading-relaxed text-slate-600">
                  {installDetails[selectedPlatform].manage?.map(item => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isIOS && selectedPlatform !== 'iphone' && (
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold leading-relaxed text-blue-800">
                Ste na iPhone/iPade. Najistejšie je použiť postup pre iPhone cez Safari.
              </div>
            )}
          </div>
        )}

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
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(() => isStandalonePwa());

  // Detekcia mobilnej veľkosti
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setIsPwaInstalled(isStandalonePwa());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
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
          category: "ZÁPIS HODÍN",
          description: "Zamestnanci si zapisujú odpracované hodiny priamo z mobilu. Vy vidíte čas, zákazku, činnosť aj mzdové náklady bez papierových hárkov a prepisovania do Excelu.",
          icon: <FileCheck size={32} />,
          gradient: ["#ff6b35", "#ff8c42"]
        },
        {
          type: "wave",
          title: "PREHĽAD",
          subtitle: "PRÁC",
          category: "AUTOMATIZOVANÉ PODKLADY",
          description: "Denný prehľad prác na zákazke viete použiť ako interný podklad pre stavebný denník, históriu realizácie alebo export pre ďalšie spracovanie.",
          icon: <BookOpen size={32} />,
          gradient: ["#ff8c42", "#ffa947"]
        },
        {
          type: "wave",
          title: "FINANCIE",
          subtitle: "ZÁKAZIEK",
          category: "PRÍJMY, NÁKLADY A ZISK",
          description: "Sledujte príjmy, výdavky, materiál, mzdy a PHM pri každej zákazke. Rýchlo vidíte priebežný zisk, nákladové položky aj to, kde vám unikajú peniaze.",
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
          subtitle: "TÍMU",
          category: "PERSONÁL",
          description: "Pozvite zamestnancov do firmy, nastavte im roly, sadzby a viditeľnosť miezd. Každý pracuje len s tým, čo potrebuje, a vy máte tím pod kontrolou.",
          icon: <Users size={32} />,
          gradient: ["#ff8c42", "#ffa947"]
        },
        {
          type: "text",
          title: "KALENDÁR",
          subtitle: "A ÚLOHY",
          category: "PLÁNOVANIE A KALENDÁR",
          description: "Plánujte práce dopredu, priraďujte úlohy zamestnancom a sledujte, čo je hotové. Kalendár pomáha udržať zákazky, termíny aj ľudí v jednom prehľade.",
          icon: <LayoutGrid size={32} />,
          gradient: ["#ffa947", "#ffc34d"]
        },

        {
          type: "text",
          title: "CENOVÉ",
          subtitle: "PONUKY",
          category: "OBCHOD A ROZPOČTY",
          description: "Vytvárajte profesionálne cenové ponuky s položkami, zľavou, DPH a pečiatkou firmy. Opakované texty položiek si viete ukladať a používať znova.",
          icon: <Briefcase size={32} />,
          gradient: ["#ffa947", "#ffc34d"]
        },

        {
          type: "text",
          title: "PDF",
          subtitle: "VÝSTUPY",
          category: "PODKLADY PRE FIRMU",
          description: "Exportujte cenové ponuky, výkazy dochádzky, prehľady prác a projektové podklady v jednotnom firemnom dizajne s logom, pečiatkou a podpisom.",
          icon: <FileCheck size={32} />,
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
                   !(window as any).ipcRenderer &&
                   !isPwaInstalled;
  const landingShellClass = isWebOnly
    ? "min-h-screen bg-white text-slate-900 font-sans pt-safe-top overflow-y-auto scroll-container flex flex-col"
    : "h-[100dvh] min-h-0 bg-white text-slate-900 font-sans pt-safe-top overflow-y-auto scroll-container flex flex-col";
  const heroSectionClass = isWebOnly
    ? "flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-12 md:pt-24 md:pb-20 bg-gradient-to-br from-orange-50/30 via-orange-25/20 to-amber-25/10 text-center min-h-[calc(100dvh-80px)]"
    : "flex-1 min-h-0 flex flex-col items-center justify-center px-6 pt-10 pb-10 md:pt-12 md:pb-12 bg-gradient-to-br from-orange-50/30 via-orange-25/20 to-amber-25/10 text-center";

  // Efekt pre animované prechody - LEN PRE WEB
  useEffect(() => {
    if (!isWebOnly || isCarouselPaused) return;
    
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % textVariants.length);
    }, 6000); // Dlhšie - 6 sekúnd

    return () => clearInterval(interval);
  }, [isWebOnly, isCarouselPaused]);

  // Efekt pre 3D karusel - LEN PRE WEB
  useEffect(() => {
    if (!isWebOnly || isCarouselPaused) return;
    
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
  }, [isWebOnly, isCarouselPaused, allCards.length]);

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

  const menuBtnStyle = "inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-orange-700 rounded-full hover:bg-orange-50 transition-all whitespace-nowrap active:scale-95";
  const menuIconStyle = "text-slate-400 group-hover:text-orange-600 transition-colors";

  return (
    <div className={landingShellClass}>
      <header className="relative z-[100]">
        <nav className="border-y border-slate-200 bg-white/95 backdrop-blur-md sticky top-0">
          <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between gap-2">
            <a href="/" className="flex items-center gap-1.5 md:gap-2.5 min-w-0 shrink hover:opacity-80 transition">
              <img 
                src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" 
                alt="MojaStavba Logo" 
                className="w-7 h-7 md:w-9 md:h-9 object-contain shrink-0" 
              />
              <span className="brand-wordmark text-sm md:text-xl truncate">Moja<span className="brand-wordmark-accent">Stavba</span></span>
            </a>

            {/* DESKTOP NAVIGATION */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                 <button 
                  onClick={() => window.open('/o-aplikacii', '_blank')}
                  className={`${menuBtnStyle} group`}
                 >
                   O aplikácii
                 </button>
                 <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
                 <button 
                  onClick={() => setShowPricingModal(true)} 
                  className={`${menuBtnStyle} group`}
                 >
                   Cenník
                 </button>
              </div>
              <div className="flex items-center gap-2">
               <button 
                  onClick={onTryFree} 
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold leading-none text-white bg-orange-600 hover:bg-orange-700 rounded-full shadow-lg shadow-orange-100 transition transform hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
               >
                  <ArrowRight size={16} strokeWidth={2.5} className="shrink-0"/>
                  Vyskúšať zadarmo
               </button>
               <button 
                  onClick={onLogin} 
                  className={`${menuBtnStyle} group`}
               >
                  <User size={16} className={menuIconStyle}/>
                  Prihlásiť sa
               </button>
              </div>
            </div>

            {/* MOBILE NAVIGATION AREA */}
            <div className="flex md:hidden items-center gap-2 shrink-0">
               <button 
                  onClick={onTryFree} 
                  className="inline-flex items-center justify-center px-3 py-2 text-[10px] font-bold leading-none text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-md shadow-orange-100 active:scale-95 whitespace-nowrap"
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
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                 >
                   <span className="flex items-center gap-3"><Info size={18} className="text-orange-500"/>O aplikácii</span>
                   <ChevronRight size={18} className="text-slate-300"/>
                 </button>
                 <button 
                    onClick={() => { setShowPricingModal(true); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                 >
                   <span className="flex items-center gap-3"><Crown size={18} className="text-orange-500"/>Cenník</span>
                   <ChevronRight size={18} className="text-slate-300"/>
                 </button>
                 <button 
                    onClick={() => { onLogin(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                 >
                   <span className="flex items-center gap-3"><User size={18} className="text-orange-500"/>Prihlásiť sa</span>
                   <ChevronRight size={18} className="text-slate-300"/>
                 </button>
               </div>
            </div>
          )}
        </nav>
      </header>

      <main className="flex-1 flex flex-col bg-white">
        <section className={heroSectionClass}>
          <div className="max-w-6xl mx-auto">
            {/* TLAČIDLO SŤAHOVANIA - ZOBRAZENÉ LEN NA WEBE */}
            {isWebOnly && (
              <div className="mb-8 animate-in fade-in duration-700">
                <button 
                  onClick={() => setShowDownloadModal(true)}
                  className="group inline-flex items-center gap-2.5 bg-white border-2 border-orange-200 hover:border-orange-400 text-orange-600 hover:text-orange-700 px-4 py-3 sm:px-6 rounded-2xl font-black text-sm shadow-sm hover:shadow-md transition-all duration-300 active:scale-95"
                >
                  <Download size={16} className="hidden sm:block group-hover:translate-y-0.5 transition-transform duration-200"/>
                  <span>Nainštalovať aplikáciu MojaStavba</span>
                  <ArrowRight size={14} className="hidden sm:block opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200"/>
                </button>
              </div>
            )}

            {/* HLAVNÝ SEO NADPIS H1 - dôležitý pre vyhľadávače */}
            <h1 className="text-3xl md:text-6xl xl:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-[1.08]">
                {isWebOnly ? (
                  <div className="relative min-h-[6.5rem] md:min-h-[8.25rem] xl:min-h-[10rem] flex items-center justify-center">
                    <div className={`transition-all duration-1000 ease-in-out ${
                      currentTextIndex === 0 
                        ? 'opacity-100 transform scale-100 rotate-0 translate-y-0' 
                        : 'opacity-0 transform scale-50 rotate-12 translate-y-4'
                    }`}>
                      <span className="block">Stavebný manažment</span>
                      <span className="text-orange-600 block">pre moderné firmy</span>
                    </div>
                    <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                      currentTextIndex === 1 
                        ? 'opacity-100 transform scale-100 rotate-0 translate-y-0' 
                        : 'opacity-0 transform scale-50 -rotate-12 translate-y-4'
                    } flex flex-col items-center justify-center`}>
                      <span className="block md:whitespace-nowrap">Vaša stavebná firma v</span>
                      <span className="text-orange-600 block">jednej aplikácii</span>
                    </div>
                  </div>
                ) : (
                  <>Stavebný manažment<br/><span className="text-orange-600">pre moderné firmy</span></>
                )}
            </h1>

            <p className="text-base md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed px-2">
              Kompletná správa zákaziek, dochádzky a financií v jednej aplikácii.<br/>
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
                                            className="group relative bg-gradient-to-br from-orange-50/40 via-orange-25/20 to-white p-8 rounded-2xl border border-orange-100/60 hover:border-orange-300/50 hover:shadow-lg hover:shadow-orange-100/30 transition-all duration-300 overflow-hidden"
                                        >
                                            {/* Hover efekt - oranžová vrstva */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/8 via-orange-300/5 to-amber-300/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        
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

                            <button
                                onClick={() => setIsCarouselPaused((paused) => !paused)}
                                className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition hover:border-orange-200 hover:bg-orange-100 active:scale-95"
                                aria-label={isCarouselPaused ? 'Spustiť automatické posúvanie' : 'Pozastaviť automatické posúvanie'}
                            >
                                {isCarouselPaused ? <Play size={14} /> : <Pause size={14} />}
                                <span>{isCarouselPaused ? 'Pustiť' : 'Pauza'}</span>
                            </button>
                            
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
        <footer className="bg-slate-900 text-white py-14 px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-12 items-start">
                <div className="md:col-span-1 space-y-5">
                    <div className="flex items-center gap-2 h-6">
                      <img src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" alt="Logo" className="w-10 h-10 object-contain" />
                      <span className="brand-wordmark brand-wordmark-light text-xl">Moja<span className="brand-wordmark-accent">Stavba</span></span>
                    </div>
                    <div className="space-y-3 text-sm leading-relaxed max-w-xs pt-1.5">
                      <p className="text-slate-300">
                        Moderný nástroj pre zefektívnenie podnikania. Zjednodušujeme procesy, šetríme čas a pomáhame vám rásť.
                      </p>
                      <p className="font-semibold text-orange-100">
                        Teraz si nás môžete vyskúšať na 30 dní zadarmo a bez zadávania platobných údajov.
                      </p>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-orange-500 mb-6 h-6 flex items-center">Dôležité informácie</h4>
                    <ul className="space-y-3">
                        <li><button onClick={() => window.open('/o-aplikacii', '_blank')} className="text-sm text-slate-200 hover:text-orange-300 transition font-medium">O aplikácii</button></li>
                        <li><button onClick={() => setShowPricingModal(true)} className="text-sm text-slate-200 hover:text-orange-300 transition font-medium">Cenník a predplatné</button></li>
                        <li>
                          <a 
                            href="/vseobecne-obchodne-podmienky.html" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-slate-200 hover:text-orange-300 transition font-medium"
                          >
                            Obchodné podmienky (VOP)
                          </a>
                        </li>
                        <li>
                          <a 
                            href="/zasady-ochrany-osobnych-udajov-gdpr.html" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-slate-200 hover:text-orange-300 transition font-medium"
                          >
                            Ochrana údajov (GDPR)
                          </a>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-orange-500 mb-6 h-6 flex items-center">Technická podpora</h4>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <Mail size={18} className="text-slate-400 mt-0.5"/>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">E-mail</div>
                                <a href="mailto:sluzby@lordsbenison.eu" className="text-sm text-slate-200 hover:text-white transition">sluzby@lordsbenison.eu</a>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <Phone size={18} className="text-slate-400 mt-0.5"/>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Telefón</div>
                                <a href="tel:+421948225713" className="text-sm text-slate-200 hover:text-white transition">+421 948 225 713</a>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <Clock size={18} className="text-slate-400 mt-0.5"/>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pracovná doba</div>
                                <div className="text-sm text-slate-200">Po - Pi (08:00 - 16:30)</div>
                            </div>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-orange-500 mb-6 h-6 flex items-center">Prevádzkovateľ</h4>
                    <address className="space-y-3 text-sm text-slate-300 not-italic">
                        <p className="font-bold text-white">LORD'S BENISON s.r.o.</p>
                        <p className="flex items-start">
                          <span>M. Nandrássyho 654/10<br/>050 01 Revúca</span>
                        </p>
                        <div className="pt-2 text-xs border-t border-slate-700/70 space-y-1 text-slate-400">
                            <p>IČO: 52404901</p>
                            <p>DIČ: 2121022992</p>
                            <p>IČ DPH: SK2121022992</p>
                        </div>
                    </address>
                </div>
            </div>
            <div className="max-w-6xl mx-auto mt-14 pt-7 border-t border-slate-700/70 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                <div className="text-sm font-medium text-slate-400">
                    © 2026 Vyvinuté spoločnosťou LORD'S BENISON s.r.o. | Všetky práva vyhradené
                </div>
                <div className="text-sm font-medium text-slate-400">
                    Pozri aj naše weby <a href="https://www.lordsbenison.sk" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition-colors">www.lordsbenison.sk</a> & <a href="https://www.edugdpr.sk" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition-colors">www.edugdpr.sk</a>
                </div>
            </div>
        </footer>
      )}

      {showDownloadModal && (
        <DownloadModal 
          onClose={() => setShowDownloadModal(false)} 
          installPrompt={installPrompt}
          isInstalled={isPwaInstalled}
          onPromptUsed={() => setInstallPrompt(null)}
        />
      )}
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
  const [inviteToken, setInviteToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false); 
  const [rememberMe, setRememberMe] = useState(true); 
  const [showLegalModal, setShowLegalModal] = useState<'vop' | 'gdpr' | null>(null);
  const [alertInfo, setAlertInfo] = useState<{open: boolean, title: string, message: string, type?: 'success' | 'error'}>({ open: false, title: '', message: '' });
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [resendingVerification, setResendingVerification] = useState(false);

  // AUTOMATICKÉ NAČÍTANIE Z URL (MAGIC LINK)
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const urlCompanyId = params.get('companyId');
      const urlAction = params.get('action');
      const urlEmail = params.get('email');
      const urlInviteToken = params.get('inviteToken');

      // Vždy skontrolovať URL bez ohľadu na initialView
      if (urlAction === 'register-emp') {
          setView('register-emp');
          if (urlCompanyId) setCompanyId(urlCompanyId);
          if (urlEmail) setEmail(urlEmail);
          if (urlInviteToken) {
              setInviteToken(urlInviteToken);
              localStorage.setItem('ms_pending_invite_token', urlInviteToken);
              if (urlCompanyId) localStorage.setItem('ms_pending_invite_company_id', urlCompanyId);
              if (urlEmail) localStorage.setItem('ms_pending_invite_email', urlEmail.trim().toLowerCase());
          }
      } else {
          setView(initialView);
          if (initialCompanyId) setCompanyId(initialCompanyId);
      }
  }, [initialView, initialCompanyId]);

  const markInviteCompleted = async (companyIdValue: string, emailValue: string) => {
      try {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (!accessToken) return;
          await fetch('/api/complete-invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({ companyId: companyIdValue, email: emailValue, inviteToken })
          });
      } catch (inviteError) {
          console.warn('Invite completion sync failed:', inviteError);
      }
  };

  const showVerificationNotice = (emailValue: string) => {
      const normalizedEmail = emailValue.trim().toLowerCase();
      setPendingVerificationEmail(normalizedEmail);
      setAlertInfo({
          open: true,
          title: "Registrácia prijatá",
          message: `Na adresu ${normalizedEmail} bol odoslaný overovací email. Ak ho nevidíte, skontrolujte spam alebo použite tlačidlo na opätovné odoslanie v prihlasovacom okne.`,
          type: 'success'
      });
      setView('login');
  };

  const resendVerificationEmail = async () => {
      const targetEmail = (pendingVerificationEmail || email).trim().toLowerCase();
      if (!targetEmail) {
          setError('Zadajte email, na ktorý máme poslať overovací odkaz.');
          return;
      }

      setResendingVerification(true);
      setError(null);
      try {
          const { error: resendError } = await supabase.auth.resend({
              type: 'signup',
              email: targetEmail,
              options: { emailRedirectTo: getRedirectURL() }
          });
          if (resendError) throw resendError;
          setPendingVerificationEmail(targetEmail);
          setAlertInfo({
              open: true,
              title: 'Overovací email odoslaný',
              message: `Poslali sme nový overovací email na ${targetEmail}. Ak ho nevidíte v doručenej pošte, skontrolujte spam alebo hromadnú poštu.`,
              type: 'success'
          });
      } catch (resendError: any) {
          setError(translateAuthError(resendError.message || 'Overovací email sa nepodarilo odoslať.'));
      } finally {
          setResendingVerification(false);
      }
  };

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
        else { showVerificationNotice(email); }
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
          await markInviteCompleted(cleanId, email.trim().toLowerCase());
          if (auth.session) onLogin();
          else { showVerificationNotice(email); }
      }
    } catch(e: any) {
      if (String(e.message || '').includes('Email not confirmed')) {
          setPendingVerificationEmail(email.trim().toLowerCase());
      }
      setError(translateAuthError(e.message));
    } finally { setLoading(false); }
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
                <div className="flex justify-center mb-1.5">
                    <img 
                      src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" 
                      alt="Logo MojaStavba" 
                      className="w-14 h-14 object-contain" 
                    />
                </div>
                <h2 className="brand-wordmark text-2xl mb-2">
                    Moja<span className="brand-wordmark-accent">Stavba</span>
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

                {view === 'login' && pendingVerificationEmail && (
                    <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-left">
                        <div className="flex items-start gap-3">
                            <Mail className="mt-0.5 shrink-0 text-orange-600" size={18}/>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-orange-950">Čaká sa na potvrdenie emailu</p>
                                <p className="mt-1 text-xs font-medium leading-relaxed text-orange-800">
                                    Ak email neprišiel na <strong>{pendingVerificationEmail}</strong>, môžete si poslať nový overovací odkaz.
                                </p>
                                <button
                                    type="button"
                                    onClick={resendVerificationEmail}
                                    disabled={resendingVerification}
                                    className="mt-3 inline-flex items-center justify-center rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {resendingVerification ? 'Odosielam...' : 'Poslať overovací email znova'}
                                </button>
                            </div>
                        </div>
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
                        <label htmlFor="terms" className={`flex items-start gap-3 rounded-2xl border p-4 transition cursor-pointer ${agreedToTerms ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'}`}>
                            <input 
                                type="checkbox" 
                                id="terms" 
                                className="sr-only"
                                checked={agreedToTerms}
                                onChange={(e: any) => setAgreedToTerms(e.target.checked)}
                            />
                            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${agreedToTerms ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                                <CheckCircle2 size={16} strokeWidth={3}/>
                            </span>
                            <span className="min-w-0 flex-1 text-[13px] font-medium leading-relaxed text-slate-700">
                                Súhlasím s podmienkami používania a potvrdzujem, že som sa oboznámil/a so spracúvaním osobných údajov.
                                <span className="mt-2 block text-xs font-semibold leading-snug text-slate-500">
                                    Dokumenty:
                                    <a href="/zasady-ochrany-osobnych-udajov-gdpr.html" target="_blank" rel="noopener noreferrer" className="ml-1 text-orange-600 hover:underline">zásady spracúvania osobných údajov</a>
                                    <span className="mx-1 text-slate-300">•</span>
                                    <a href="/vseobecne-obchodne-podmienky.html" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">podmienky používania</a>
                                </span>
                            </span>
                        </label>
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
