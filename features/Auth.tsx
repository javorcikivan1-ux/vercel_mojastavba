
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Card, Input, CustomLogo, AlertModal, LegalModal, Modal } from '../components/UI';
import { translateAuthError } from '../lib/utils';
import { 
  Building2, Smartphone, TrendingUp, Users, ArrowRight, ChevronRight, ChevronLeft,
  Monitor, Briefcase, CheckCircle2, AlertCircle, ArrowLeft, Download, X, HelpCircle, Info,
  FileCheck, BookOpen, LayoutGrid, Mail, Phone, Clock, Shield, MapPin, User, Eye, EyeOff, Zap, Crown, Menu, MoreVertical, Euro, ClipboardCheck, Calendar, Settings, ChevronDown, ListTodo, FileText, ZoomIn, ZoomOut
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PricingModal } from '../components/PricingModal';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const isStandalonePwa = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
};

const CookieNotice = () => {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('ms_cookie_info_seen') !== 'true';
  });
  const [showDetails, setShowDetails] = useState(false);

  const closeNotice = () => {
    window.localStorage.setItem('ms_cookie_info_seen', 'true');
    setIsOpen(false);
  };

  return (
    <>
      <div className="cookie-widget">
        {isOpen && (
          <aside className="cookie-notice" role="region" aria-label="Informácia o cookies">
            <p>
              Táto webová stránka nepoužíva cookies<br />ani sledovacie nástroje.{' '}
              <button type="button" className="cookie-more-button" onClick={() => setShowDetails(true)}>
                Dozvedieť sa viac
              </button>
            </p>
            <button type="button" onClick={closeNotice}>Rozumiem</button>
          </aside>
        )}
        <button
          type="button"
          className="cookie-widget-trigger"
          aria-label="Informácia o cookies"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(open => !open)}
        >
          <span aria-hidden="true">🍪</span>
        </button>
      </div>

      {showDetails && (
        <div className="cookie-details-backdrop" role="presentation" onMouseDown={() => setShowDetails(false)}>
          <section
            className="cookie-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-details-title"
            onMouseDown={event => event.stopPropagation()}
          >
            <button type="button" className="cookie-details-close" aria-label="Zavrieť" onClick={() => setShowDetails(false)}>
              <X size={18} aria-hidden="true" />
            </button>
            <div className="cookie-details-icon" aria-hidden="true">🍪</div>
            <h3 id="cookie-details-title">O cookies na našej stránke</h3>
            <p className="cookie-details-lead">Vaše súkromie je chránené</p>
            <p>Web www.moja-stavba.sk nepoužíva reklamné ani analytické cookies. To znamená:</p>
            <ul>
              <li><CheckCircle2 size={17} aria-hidden="true" /><span><strong>Žiadne reklamné cookies</strong> ani personalizované reklamy</span></li>
              <li><CheckCircle2 size={17} aria-hidden="true" /><span><strong>Žiadne analytické cookies</strong> tretích strán</span></li>
              <li><CheckCircle2 size={17} aria-hidden="true" /><span><strong>Žiadne sledovanie</strong> vášho správania na reklamné účely</span></li>
            </ul>
            <p className="cookie-details-note">Používa sa iba nevyhnutné lokálne úložisko pre bezpečné prihlásenie, nastavenia a fungovanie služby.</p>
            <button type="button" className="cookie-details-confirm" onClick={() => setShowDetails(false)}>Rozumiem</button>
          </section>
        </div>
      )}
    </>
  );
};

// Pomocná funkcia pre získanie bezpečnej návratovej URL
const getRedirectURL = () => {
  const origin = window.location.origin;
  if (origin.includes('moja-stavba.sk') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return origin;
  }
  return 'https://www.moja-stavba.sk';
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

        <div className="mb-6 flex items-center gap-3.5 pr-10">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
            <Download size={20} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-[-0.02em] text-slate-900 sm:text-xl">Nainštalujte si aplikáciu MojaStavba</h3>
            <p className="mt-0.5 text-sm font-medium text-slate-500">Vyberte platformu a pokračujte v inštalácii.</p>
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
export const LandingScreen = ({ onStart, onLogin, onWorker, onTryFree, onSubscriptionClick, onAbout }: { onStart: () => void, onLogin: () => void, onWorker: () => void, onTryFree: () => void, onSubscriptionClick: () => void, onAbout: () => void }) => {
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showLegal, setShowLegal] = useState<'vop' | 'gdpr' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(4);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [carouselCardsPerView, setCarouselCardsPerView] = useState(1);
  const [featureShowcaseIndex, setFeatureShowcaseIndex] = useState(0);
  const [showFeaturePreview, setShowFeaturePreview] = useState(false);
  const [featurePreviewSource, setFeaturePreviewSource] = useState<'main' | 'detail'>('main');
  const [featurePreviewZoom, setFeaturePreviewZoom] = useState(1);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(() => isStandalonePwa());

  // Detekcia mobilnej veľkosti
  useEffect(() => {
    const checkMobile = () => {
      setCarouselCardsPerView(window.innerWidth < 768 ? 1 : window.innerWidth < 1280 ? 3 : 4);
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
          category: "ZÁPIS HODÍN ZAMESTNANCOV",
          description: "Zamestnanci si zapisujú odpracované hodiny priamo z mobilu. Vy vidíte čas, zákazku, činnosť zamestnanca aj mzdové náklady bez papierových hárkov a prepisovania do Excelu.",
          icon: <FileCheck size={32} />,
          gradient: ["#ff6b35", "#ff8c42"]
        },
        {
          type: "wave",
          title: "DENNÝ ",
          subtitle: "PREHĽAD PRÁCE",
          category: "KTO, ČO, KDE A KEDY",
          description: "MojaStavba eviduje rozsah práce konkrétnych zamestnancov. Vďaka tomu viete kto, kde, kedy a čo robil. Prehľadná história slúži na absolútny prehľad o všetkých zákazkách",
          icon: <BookOpen size={32} />,
          gradient: ["#ff8c42", "#ffa947"]
        },
        {
          type: "wave",
          title: "FINANCIE",
          subtitle: "ZÁKAZIEK",
          category: "PRÍJMY, NÁKLADY A ZISK",
          description: "Sledujte príjmy, výdavky, materiál, mzdy čI PHM pri každej zákazke. Komplexná analytika firmy a zákaziek zabezpečí to, aby ste pri žiadnej zákazke „neskončili v strate“.",
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
          category: "ZAMESTNANCI V MOJASTAVBA",
          description: "Každý zamestnanec má vlastný účet a appku priamo vo svojom mobile. Ako administrátor im môžete prideliť rôzne role na konkrétnych zákazkách, ako vedenie denníka či zápis nákladov.",
          icon: <Users size={32} />,
          gradient: ["#ff8c42", "#ffa947"]
        },
        {
          type: "text",
          title: "KALENDÁR",
          subtitle: "A ÚLOHY",
          category: "PLÁNOVANIE A KALENDÁR",
          description: "Prehľadný kalendár s notifikáciami a možnosťou priraďovať úlohy konkrétnym zamestnancom zabezpečí maximálny prehľad vo Vašom plánovaní práce.",
          icon: <LayoutGrid size={32} />,
          gradient: ["#ffa947", "#ffc34d"]
        },

        {
          type: "text",
          title: "CENOVÉ",
          subtitle: "PONUKY",
          category: "OBCHOD A ROZPOČTY",
          description: "Vytvárajte profesionálne cenové ponuky rýchlo a jednoducho. Uložte si často používané položky a exportujte ponuky v PDF formáte pripravené priamo pre klientov.",
          icon: <Briefcase size={32} />,
          gradient: ["#ffa947", "#ffc34d"]
        },

        {
          type: "text",
          title: "DOSTUPNÁ V",
          subtitle: "(6) JAZYKOCH",
          category: "JAZYKOVÉ VARIANTY APPKY",
          description: "Zamestnanecké rozhranie aplikácie MojaStavba je teraz dostupné až v šiestich jazykoch: v slovenčine, angličtine, nemčine, maďarčine, poľštine a v ukrajinčine.",
          icon: <FileCheck size={32} />,
          gradient: ["#ffc34d", "#ffda77"]
        }
      ]
    }
  ];

  // Všetky karty v jednom poli pre jednoduchšie posúvanie
  const allCards = slides.flatMap(slide => slide.cards);

  const landingBenefits = [
    {
      image: '/benefit-zakazky.png',
      title: 'Prehľad o zákazkách',
      desc: 'Sledujte priebeh, náklady a ziskovosť každej zákazky.',
      mobileDesc: 'Sledujte priebeh,\nnáklady a ziskovosť\nkaždej zákazky.'
    },
    {
      image: '/benefit-ulohy.png',
      title: 'Úlohy a plánovanie',
      desc: 'Plánujte prácu, prideľujte úlohy a majte všetko pod kontrolou.',
      mobileDesc: 'Plánujte prácu,\nprideľujte úlohy a\nudržte si prehľad.'
    },
    {
      image: '/benefit-tim.png',
      title: 'Riadenie tímu',
      desc: 'Sledujte dochádzku a rozsah práce Vašich zamestnancov.',
      mobileDesc: 'Sledujte dochádzku\na rozsah práce Vašich\nzamestnancov.'
    },
    {
      image: '/benefit-pdf.png',
      title: 'PDF export dokumentov',
      desc: 'Výkazy práce, denník a dochádzka na pár klikov.',
      mobileDesc: 'Výkazy práce, denník\na dochádzka na pár\nklikov.'
    },
    {
      image: '/benefit-financie.png',
      title: 'Financie pod kontrolou',
      desc: 'Sledujte ziskovosť Vašich zákaziek v reálnom čase.',
      mobileDesc: 'Sledujte ziskovosť\nVašich zákaziek\nv reálnom čase.'
    },
    {
      image: '/benefit-mobil.png',
      title: 'Mobilná aplikácia',
      desc: 'Pracujte odkiaľkoľvek. Všetko dôležité máte vo vrecku.',
      mobileDesc: 'Pracujte odkiaľkoľvek.\nVšetko dôležité máte\nvo vrecku.'
    }
  ];

  const featureShowcase = [
    { title: 'Denník práce', heading: 'Denník', highlight: 'práce', description: 'Elektronický denník práce ponúka automatický import počasia a vykonaných prác z dochádzky, fotodokumentáciu a mnoho ďalšieho.', image: '/about-dennik-wide.png', detail: '/about-dennik-detail.png' },
    { title: 'Prehľad zákaziek', heading: 'Prehľad', highlight: 'zákaziek', description: 'Získajte okamžitý prehľad o ziskovosti zákaziek, rozsahu a čase prác Vašich zamestnancov, príjmoch, výdavkoch aj rozpočtoch.', image: '/about-zakazky-wide.png', detail: '/about-zakazky-detail.png' },
    { title: 'Elektronická dochádzka', heading: 'Elektronická', highlight: 'dochádzka', description: 'Zamestnanci si zapisujú dochádzku a rozsah prác priamo cez mobilnú aplikáciu, takže máte úplný prehľad o práci aj mzdových nákladoch.', image: '/about-dochadzka-wide.png', detail: '/about-dochadzka-detail.png' },
    { title: 'Správa financií', heading: 'Komplexná', highlight: 'analytika', description: 'Sledujte príjmy, výdavky, materiál, PHM aj réžiu firmy v reálnom čase. Prehľadné štatistiky ukážu zdravie firmy aj jednotlivých zákaziek.', image: '/about-financie-wide.png', detail: '/about-financie-detail.png' },
    { title: 'Správa zamestnancov', heading: 'Správa', highlight: 'zamestnancov', description: 'Každý zamestnanec má vlastný účet a aplikáciu. Prideľte mu roly na konkrétnych zákazkách a majte tím aj kompetencie pod kontrolou.', image: '/about-tim-wide.png', detail: '/about-tim-detail.png' }
  ];
  const activeFeatureShowcase = featureShowcase[featureShowcaseIndex];
  const showNextFeature = () => setFeatureShowcaseIndex(index => (index + 1) % featureShowcase.length);
  const showPreviousFeature = () => setFeatureShowcaseIndex(index => (index - 1 + featureShowcase.length) % featureShowcase.length);

  useEffect(() => {
    setFeaturePreviewZoom(1);
  }, [featureShowcaseIndex, showFeaturePreview]);
  
  // Pridanie klonovaných kariet na začiatok pre plynulý nekonečný cyklus
  const carouselOffset = 4;
  const carouselCards = [...allCards.slice(-carouselOffset), ...allCards, ...allCards.slice(0, carouselOffset)];

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
    ? "landing-shell min-h-screen bg-white text-slate-900 font-sans pt-safe-top overflow-y-auto scroll-container flex flex-col"
    : "landing-native-shell h-[100dvh] min-h-0 bg-white text-slate-900 font-sans pt-safe-top overflow-hidden flex flex-col";
  const heroSectionClass = isWebOnly
    ? "landing-hero-section relative flex-1 flex flex-col items-center justify-start overflow-hidden text-center"
    : "landing-hero-section flex-1 min-h-0 flex flex-col items-center justify-center px-6 py-8 bg-gradient-to-br from-orange-50/30 via-orange-25/20 to-amber-25/10 text-center";

  // Efekt pre animované prechody - LEN PRE WEB
  useEffect(() => {
    if (!isWebOnly) return;
    
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % textVariants.length);
    }, 6000); // Dlhšie - 6 sekúnd

    return () => clearInterval(interval);
  }, [isWebOnly, textVariants.length]);

  // 3D karusel handlers
  const nextCard = () => {
    setCurrentSlideIndex((prev) => {
      const next = prev + 1;
      if (next >= allCards.length + carouselOffset) {
        return carouselOffset; // Skočiť na prvú pôvodnú kartu
      }
      return next;
    });
  };

  const prevCard = () => {
    setCurrentSlideIndex((prev) => {
      const next = prev - 1;
      if (next < carouselOffset) {
        return allCards.length + carouselOffset - 1; // Skočiť na poslednú pôvodnú kartu
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

  const scrollToFeatures = () => {
    const targetId = window.innerWidth < 768 ? 'funkcie-mobile' : 'funkcie-desktop';
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToContact = () => {
    document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const menuBtnStyle = "inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-orange-700 rounded-full hover:bg-orange-50 transition-all whitespace-nowrap active:scale-95";
  const menuIconStyle = "text-slate-400 group-hover:text-orange-600 transition-colors";

  return (
    <div className={landingShellClass}>
      {isWebOnly && <CookieNotice />}
      <header className="relative z-[100]">
        <nav className="landing-header-nav sticky top-0 border-b border-slate-100 bg-white/95 backdrop-blur-md">
          <div className="landing-header-inner mx-auto flex items-center justify-between gap-2">
            <a href="/" className="flex items-center gap-1.5 md:gap-2.5 min-w-0 shrink hover:opacity-80 transition">
              <img
                src="/icon-only.png"
                alt="MojaStavba Logo"
                className="landing-header-logo object-contain shrink-0"
              />
              <span className="landing-header-wordmark brand-wordmark truncate">Moja<span className="brand-wordmark-accent">Stavba</span></span>
            </a>

            {/* DESKTOP NAVIGATION */}
            {isWebOnly && <div className="landing-header-menu absolute left-1/2 hidden -translate-x-1/2 items-center md:flex">
                 <button
                  onClick={onAbout}
                  className={`${menuBtnStyle} group`}
                 >
                   O aplikácii
                 </button>
                 <button onClick={scrollToFeatures} className={`${menuBtnStyle} group`}>Funkcie</button>
                 <button 
                  onClick={() => setShowPricingModal(true)} 
                  className={`${menuBtnStyle} group`}
                 >
                   Cenník
                 </button>
                 <button onClick={scrollToContact} className={`${menuBtnStyle} group`}>Kontakt</button>
            </div>}
            {isWebOnly ? <div className="hidden items-center gap-2 md:flex">
               <button 
                  onClick={onLogin} 
                  className={`${menuBtnStyle} group`}
               >
                  <User size={16} className={menuIconStyle}/>
                  Prihlásiť sa
               </button>
               <button
                  onClick={onTryFree}
                  className="landing-header-cta inline-flex items-center justify-center gap-2 font-bold leading-none text-white bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-100 transition transform hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
               >
                  Vyskúšať zadarmo
                  <ArrowRight size={16} strokeWidth={2.5} className="shrink-0"/>
               </button>
              </div> : <div className="hidden items-center gap-2 md:flex">
                <button onClick={onStart} className={`${menuBtnStyle} group`}><Building2 size={16} className={menuIconStyle}/>Registrácia firmy</button>
                <button onClick={onWorker} className={`${menuBtnStyle} group`}><Users size={16} className={menuIconStyle}/>Registrácia zamestnanca</button>
                <button onClick={onLogin} className={`${menuBtnStyle} group`}><User size={16} className={menuIconStyle}/>Prihlásiť sa</button>
              </div>}

            {/* MOBILE NAVIGATION AREA */}
            <div className="flex md:hidden items-center gap-2 shrink-0">
               <button 
                 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                 aria-label={isMobileMenuOpen ? 'Zavrieť menu' : 'Otvoriť menu'}
                 aria-expanded={isMobileMenuOpen}
                 className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95"
               >
                 {isMobileMenuOpen ? <X size={19} strokeWidth={2.4}/> : <MoreVertical size={20} strokeWidth={2.8}/>}
               </button>
            </div>
          </div>

          {/* MOBILE DROPDOWN MENU */}
          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-2xl animate-in slide-in-from-top-2 duration-200">
               <div className="p-4 space-y-2">
                 {isWebOnly && <button
                    onClick={() => { onAbout(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                 >
                   <span className="flex items-center gap-3"><Info size={18} className="text-orange-500"/>O aplikácii</span>
                   <ChevronRight size={18} className="text-slate-300"/>
                 </button>}
                 <button
                    onClick={() => { setIsMobileMenuOpen(false); onStart(); }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                 >
                   <span className="flex items-center gap-3"><Building2 size={18} className="text-orange-500"/>Registrácia firmy</span>
                   <ChevronRight size={18} className="text-slate-300"/>
                 </button>
                 <button
                    onClick={() => { setIsMobileMenuOpen(false); onWorker(); }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                 >
                   <span className="flex items-center gap-3"><Users size={18} className="text-orange-500"/>Registrácia zamestnanca</span>
                   <ChevronRight size={18} className="text-slate-300"/>
                 </button>
                 {isWebOnly && <button
                    onClick={() => { setIsMobileMenuOpen(false); requestAnimationFrame(scrollToFeatures); }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                 >
                   <span className="flex items-center gap-3"><Zap size={18} className="text-orange-500"/>Funkcie</span>
                   <ChevronRight size={18} className="text-slate-300"/>
                 </button>}
                 {isWebOnly && <button 
                    onClick={() => { setShowPricingModal(true); setIsMobileMenuOpen(false); }} 
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                 >
                   <span className="flex items-center gap-3"><Crown size={18} className="text-orange-500"/>Cenník</span>
                   <ChevronRight size={18} className="text-slate-300"/>
                 </button>}
                 {isWebOnly && <button 
                    onClick={() => { setIsMobileMenuOpen(false); requestAnimationFrame(scrollToContact); }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                 >
                   <span className="flex items-center gap-3"><Mail size={18} className="text-orange-500"/>Kontakt</span>
                   <ChevronRight size={18} className="text-slate-300"/>
                 </button>}
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

      <main className="min-h-0 flex-1 flex flex-col bg-white">
        <section className={heroSectionClass}>
          <div className="landing-desktop-shell relative z-10 hidden w-full md:block">
            <div className="landing-hero-grid">
              <div className="landing-hero-copy text-left">
                <h1 className="landing-hero-title font-extrabold text-slate-900">
                  Všetko, čo potrebuje<br/>
                  stavebná firma<br/>
                  <span className="text-orange-600">v jednej aplikácii</span>
                </h1>
                <p className="landing-hero-description text-slate-600">
                  <span className="block">{isWebOnly ? 'Kompletná správa zákaziek, dochádzky a financií v jednej aplikácii.' : 'Vyberte, ako chcete pokračovať.'}</span>
                  {isWebOnly && <strong className="block font-semibold text-slate-800">Vyskúšajte na 30 dní bez zadávania platobných údajov.</strong>}
                </p>
                <div className={isWebOnly ? "landing-hero-actions flex flex-nowrap items-center" : "landing-hero-actions grid max-w-sm grid-cols-1 gap-3"}>
                  {isWebOnly ? <>
                    <button onClick={onStart} className="landing-primary-action inline-flex shrink-0 items-center justify-center bg-orange-600 font-bold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-700">
                      Vyskúšať zadarmo na 30 dní
                    </button>
                    <button onClick={() => setShowDownloadModal(true)} className="landing-secondary-action inline-flex shrink-0 items-center justify-center border border-orange-300 bg-orange-50/30 font-semibold text-slate-700 shadow-sm shadow-orange-100/60 transition hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700">
                      <Download className="text-orange-600" aria-hidden="true"/> Stiahnuť aplikáciu
                    </button>
                  </> : <>
                    <button onClick={onStart} className="landing-primary-action inline-flex w-full items-center justify-center bg-orange-600 font-bold text-white shadow-lg shadow-orange-200">Registrácia firmy</button>
                    <button onClick={onWorker} className="landing-secondary-action inline-flex w-full items-center justify-center border border-slate-200 bg-white font-semibold text-slate-700 shadow-sm">Registrácia zamestnanca</button>
                    <button onClick={onLogin} className="landing-secondary-action inline-flex w-full items-center justify-center border border-slate-200 bg-white font-semibold text-slate-700 shadow-sm">Prihlásenie</button>
                  </>}
                </div>
                {isWebOnly && <div className="landing-trust-row flex flex-wrap font-medium text-slate-700">
                  <div className="landing-device-availability">
                    <Monitor className="landing-trust-platform-icon" aria-hidden="true"/>
                    <Smartphone className="landing-trust-platform-icon is-phone" aria-hidden="true"/>
                    <div className="landing-device-availability-copy">
                      <strong>Dostupné na všetkých zariadeniach</strong>
                      <small>Windows · macOS · Android · iOS</small>
                    </div>
                  </div>
                </div>}
                {isWebOnly && <img
                  src="/30dni.png"
                  alt=""
                  aria-hidden="true"
                  className="landing-hero-trial-visual"
                />}
              </div>

              <div className="landing-device-showcase relative" aria-label="Ukážka aplikácie MojaStavba na počítači a mobile">
                <div className="absolute -inset-8 -z-10 rounded-full bg-orange-100/45 blur-3xl" />
                <div className="landing-laptop-screen border-slate-800 bg-slate-800 shadow-2xl shadow-slate-400/30">
                  <div className="landing-laptop-display overflow-hidden bg-slate-50 text-left">
                    <div className="landing-app-shell">
                      <aside className="landing-app-sidebar">
                        <div className="landing-app-brand">
                          <img src="/icon-only.png" alt="" />
                          <strong>Moja<span>Stavba</span></strong>
                        </div>
                        <nav>
                          {[
                            [LayoutGrid, 'Nástenka'],
                            [Building2, 'Zákazky'],
                            [Clock, 'Dochádzka'],
                            [BookOpen, 'Denník práce'],
                            [Calendar, 'Kalendár'],
                            [Users, 'Tím'],
                            [Euro, 'Financie'],
                            [TrendingUp, 'Analytika'],
                            [Settings, 'Nastavenia']
                          ].map(([Icon, item]: any, i) => (
                            <div key={item} className={i === 0 ? 'is-active' : ''}>
                              <Icon aria-hidden="true"/><span>{item}</span>{item === 'Financie' && <ChevronDown className="landing-app-nav-chevron" aria-hidden="true"/>}
                            </div>
                          ))}
                        </nav>
                        <div className="landing-app-user"><span>MF</span><div><b>Moja firma</b><small>Administrátor</small></div></div>
                      </aside>

                      <div className="landing-app-workspace">
                        <main className="landing-app-dashboard">
                          <div className="landing-app-heading">
                            <div><h3>Nástenka</h3><p>Prehľad vašej stavebnej firmy</p></div>
                            <span>18. marec 2026</span>
                          </div>

                          <div className="landing-app-kpis">
                            {[
                              ['Aktívne zákazky', '18', '+2 tento mesiac', 'orange'],
                              ['Celkové výnosy', '128 560 €', '+8,4 %', 'blue'],
                              ['Priebežný zisk', '32 750 €', '+12,5 %', 'green'],
                              ['Úlohy na dnes', '24', '6 po termíne', 'red']
                            ].map(([label, value, note, tone]) => (
                              <article key={label} className={`tone-${tone}`}>
                                <div><span>{label}</span><i /></div><strong>{value}</strong><small>{note}</small>
                              </article>
                            ))}
                          </div>

                          <div className="landing-app-analytics">
                            <article className="landing-app-linechart">
                              <div className="landing-chart-title"><div><b>Výnosy a náklady</b><span>Vývoj za posledných 12 mesiacov</span></div><em>2026⌄</em></div>
                              <div className="landing-chart-legend"><span className="revenue">Výnosy</span><span className="costs">Náklady</span></div>
                              <svg viewBox="0 0 300 92" preserveAspectRatio="none" aria-hidden="true">
                                <defs><linearGradient id="landingRevenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fb923c" stopOpacity=".22"/><stop offset="1" stopColor="#fb923c" stopOpacity="0"/></linearGradient></defs>
                                <g className="grid"><path d="M0 18H300M0 40H300M0 62H300M0 84H300"/><path d="M30 0V92M85 0V92M140 0V92M195 0V92M250 0V92"/></g>
                                <path className="area" d="M0 78 C22 76 28 68 48 69 S77 58 97 60 S125 49 145 51 S173 34 193 39 S223 22 244 25 S273 10 300 12 L300 92 L0 92Z"/>
                                <path className="income" d="M0 78 C22 76 28 68 48 69 S77 58 97 60 S125 49 145 51 S173 34 193 39 S223 22 244 25 S273 10 300 12"/>
                                <path className="expense" d="M0 82 C27 79 35 76 55 77 S87 70 105 72 S132 63 153 65 S183 55 204 58 S235 45 256 49 S281 39 300 42"/>
                              </svg>
                              <div className="landing-chart-months"><span>Jan</span><span>Mar</span><span>Máj</span><span>Júl</span><span>Sep</span><span>Nov</span></div>
                            </article>

                            <article className="landing-app-donut-card">
                              <div className="landing-chart-title"><div><b>Náklady podľa kategórie</b><span>Tento mesiac</span></div><em>•••</em></div>
                              <div className="landing-donut-content">
                                <div className="landing-donut"><div><strong>128 560 €</strong><span>spolu</span></div></div>
                                <ul><li className="material">Materiál <b>46%</b></li><li className="wages">Mzdy <b>28%</b></li><li className="services">Služby <b>16%</b></li><li className="other">Ostatné <b>10%</b></li></ul>
                              </div>
                            </article>
                          </div>

                          <div className="landing-app-bottom">
                            <article>
                              <div className="landing-chart-title"><div><b>Aktuálne zákazky</b><span>Priebeh realizácie</span></div><em>Zobraziť všetky →</em></div>
                              <div className="landing-project-row"><span>Rodinný dom Kvetná</span><i><b style={{width:'72%'}} /></i><strong>72%</strong></div>
                              <div className="landing-project-row"><span>Bytový dom Pod Hájom</span><i><b style={{width:'48%'}} /></i><strong>48%</strong></div>
                              <div className="landing-project-row"><span>Rekonštrukcia kancelárií</span><i><b style={{width:'86%'}} /></i><strong>86%</strong></div>
                            </article>
                            <article>
                              <div className="landing-chart-title"><div><b>Najbližšie úlohy</b><span>Dnes</span></div><em>Kalendár →</em></div>
                              <div className="landing-task-row"><i className="urgent"/><span><b>Kontrola dodávky materiálu</b><small>08:30 · Kvetná</small></span><em>J. Novák</em></div>
                              <div className="landing-task-row"><i/><span><b>Odovzdanie výkazu práce</b><small>11:00 · Pod Hájom</small></span><em>P. Malík</em></div>
                              <div className="landing-task-row"><i className="done"/><span><b>Obhliadka stavby</b><small>14:30 · Centrum</small></span><em>M. Horváth</em></div>
                            </article>
                          </div>
                        </main>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="landing-phone absolute border-slate-900 bg-white shadow-2xl">
                  <span className="landing-phone-button landing-phone-button-left"/><span className="landing-phone-button landing-phone-button-right"/>
                  <div className="landing-phone-notch absolute left-1/2 top-0 -translate-x-1/2 bg-slate-900"/>
                  <div className="landing-mobile-app">
                    <div className="landing-mobile-status">
                      <span>9:00</span>
                      <div className="landing-mobile-status-icons" aria-hidden="true">
                        <i className="landing-mobile-signal"><b/><b/><b/></i>
                        <i className="landing-mobile-battery"/>
                      </div>
                    </div>
                    <header>
                      <div><img src="/icon-only.png" alt=""/><strong>Moja<span>Stavba</span></strong></div>
                    </header>
                    <main>
                      <section className="landing-mobile-shortcuts">
                        <h4>Pracovné skratky</h4>
                        <div><i><Building2 aria-hidden="true"/></i><b>Nová zákazka</b><span>›</span></div>
                        <div><i><ListTodo aria-hidden="true"/></i><b>Nová úloha</b><span>›</span></div>
                        <div><i><FileText aria-hidden="true"/></i><b>Cenová ponuka</b><span>›</span></div>
                      </section>
                      <section className="landing-mobile-attendance">
                        <div className="landing-mobile-alert-title"><i>↶</i><div><b>Spätný zápis dochádzky</b><span>Dnes boli dopísané hodiny za iné dni.</span></div></div>
                        <article><i>♙</i><div><b>Zamestnanec č. 1</b><span>Za deň 11. 8. 2026</span></div><em><small>ZAPÍSANÉ</small>06:47</em></article>
                        <article><i>♙</i><div><b>Zamestnanec č. 2</b><span>Za deň 12. 8. 2026</span></div><em><small>ZAPÍSANÉ</small>06:47</em></article>
                      </section>
                    </main>
                    <nav>
                      <div className="is-active"><LayoutGrid aria-hidden="true"/><span>Domov</span></div>
                      <div><Building2 aria-hidden="true"/><span>Zákazky</span></div>
                      <div><FileCheck aria-hidden="true"/><span>Dochádzky</span></div>
                      <div><BookOpen aria-hidden="true"/><span>Denník</span></div>
                    </nav>
                    <div className="landing-mobile-home-indicator"/>
                  </div>
                </div>
              </div>
            </div>

            {isWebOnly && <div id="funkcie-desktop" className="landing-benefits overflow-hidden scroll-mt-6">
              <h2 className="landing-benefits-title text-center font-bold text-slate-900">Prečo si firmy vyberajú <span>MojaStavba?</span></h2>
              <div className="landing-benefits-grid grid grid-cols-6">
                {landingBenefits.map(({ image, title, desc }: any, i) => (
                  <div key={title} className={`landing-benefit-item text-center ${i ? 'border-l border-slate-100' : ''}`}>
                    <img src={image} alt={title} className="landing-benefit-icon mx-auto object-contain transition-transform duration-200 hover:scale-110" loading="lazy" />
                    <h3 className="landing-benefit-heading font-bold text-slate-900">{title}</h3>
                    <p className="landing-benefit-copy text-slate-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>}
          </div>

          <div className={isWebOnly ? "relative z-10 mx-auto w-full max-w-md px-1 text-left md:hidden" : "relative z-10 mx-auto w-full max-w-sm -translate-y-[3vh] px-4 text-center md:hidden"}>
            <div className="absolute -right-10 top-12 -z-10 h-44 w-44 rounded-full bg-orange-100/70 blur-3xl" />
            <div className="absolute -left-12 bottom-10 -z-10 h-36 w-36 rounded-full bg-slate-100 blur-3xl" />

            <h1 className={isWebOnly ? "text-[2.65rem] font-black leading-[0.98] tracking-[-0.065em] text-slate-950" : "text-[2.25rem] font-black leading-[1.02] tracking-[-0.05em] text-slate-950 min-[480px]:text-[2.65rem]"}>
              Stavebná firma<br/>
              <span className="text-orange-600">v jednej aplikácii</span>
            </h1>

            <p className={isWebOnly ? "mt-5 max-w-sm text-[15px] font-medium leading-relaxed text-slate-600" : "mx-auto mt-5 text-sm font-medium leading-relaxed text-slate-500"}>
              {isWebOnly ? 'Kompletná správa zákaziek, dochádzky a financií v jednej aplikácii.' : 'Vyberte, ako chcete pokračovať.'}
              {isWebOnly && <span className="mt-1.5 block font-bold text-slate-900">Vyskúšajte na 30 dní bez zadávania platobných údajov.</span>}
            </p>

            <div className={isWebOnly ? "mt-7 grid grid-cols-1 gap-3" : "mx-auto mt-10 grid w-full max-w-[19rem] grid-cols-1 gap-3 min-[480px]:max-w-[21rem]"}>
              {isWebOnly ? <><button
                onClick={onStart}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-sm font-black text-white shadow-xl shadow-orange-200 transition active:scale-[0.98]"
              >
                Vyskúšať zadarmo na 30 dní
                <ArrowRight size={18} strokeWidth={2.6} />
              </button>
              <button
                onClick={() => setShowDownloadModal(true)}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-orange-300 bg-orange-50/30 px-5 py-4 text-sm font-bold text-slate-800 shadow-sm shadow-orange-100/60 transition hover:border-orange-400 hover:bg-orange-50 active:scale-[0.98]"
              >
                <Download size={18} className="text-orange-600" />
                Stiahnuť aplikáciu
              </button>
              </> : <>
                <button onClick={onStart} className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition active:scale-[0.98] min-[480px]:h-[52px]">Registrácia firmy</button>
                <button onClick={onWorker} className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition active:scale-[0.98] min-[480px]:h-[52px]">Registrácia zamestnanca</button>
                <button onClick={onLogin} className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition active:scale-[0.98] min-[480px]:h-[52px]">Prihlásenie</button>
              </>}
            </div>

            {isWebOnly && <div className="mx-auto mt-8 flex w-full max-w-sm items-center justify-center gap-6 sm:gap-8">
              <div className="shrink-0">
                <p className="whitespace-nowrap text-xs font-semibold tracking-tight text-slate-600 sm:text-sm">
                  Dostupné na všetkých zariadeniach
                </p>
                <div className="mt-3 flex items-center justify-center gap-6" aria-label="Android, Windows a Apple">
                  <PlatformLogo type="android" className="h-5 w-5" />
                  <PlatformLogo type="windows" className="h-5 w-5" />
                  <PlatformLogo type="apple" className="h-5 w-5" />
                </div>
              </div>
              <img
                src="/30dni.png"
                alt=""
                aria-hidden="true"
                className="h-24 w-24 shrink-0 object-contain drop-shadow-md sm:h-28 sm:w-28"
              />
            </div>}
          </div>
        </section>

        {isWebOnly && (
          <section id="funkcie-mobile" className="scroll-mt-20 border-t border-slate-200 bg-white px-5 pb-10 pt-7 md:hidden">
            <div className="mx-auto max-w-md">
              <h2 className="text-center text-2xl font-black tracking-tight text-slate-900">
                Prečo si firmy vyberajú <span className="text-orange-600">MojaStavba?</span>
              </h2>
              <div className="mx-auto mt-9 grid max-w-xs grid-cols-2 gap-x-2 gap-y-9">
                {landingBenefits.map(({ image, title, mobileDesc }: any) => (
                  <article key={title} className="text-center">
                    <img src={image} alt={title} className="mx-auto h-12 w-12 object-contain" loading="lazy" />
                    <h3 className="mt-3 text-sm font-bold leading-tight text-slate-900">
                      {title === 'PDF export dokumentov' ? 'PDF export' : title}
                    </h3>
                    <p className="mx-auto mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-500">{mobileDesc}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {isWebOnly && (
            <section className="border-y border-slate-200 bg-white px-4 pb-10 pt-6 animate-in fade-in duration-1000 sm:px-6 md:border-slate-100 md:pb-14">
                <div className="mx-auto w-full max-w-[1680px]">
                    {/* Responzívny karusel */}
                    <div className="relative px-0 md:px-16">
                        <div className="landing-carousel-track overflow-hidden touch-pan-y">
                            <div 
                                className="flex transition-all duration-300 ease-in-out"
                                style={{ transform: `translateX(-${currentSlideIndex * (100 / carouselCardsPerView)}%)` }}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            >
                                {carouselCards.map((card, cardIndex) => (
                                    <div key={`${cardIndex}-${card.title}`} className="flex-shrink-0 px-0.5 sm:px-2" style={{ width: `${100 / carouselCardsPerView}%` }}>
                                        <article 
                                            className="group relative bg-gradient-to-br from-orange-50/40 via-orange-25/20 to-white p-6 sm:p-8 rounded-2xl border border-orange-100/60 hover:border-orange-300/50 hover:shadow-lg hover:shadow-orange-100/30 transition-all duration-300 overflow-hidden"
                                        >
                                            {/* Hover efekt - oranžová vrstva */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/8 via-orange-300/5 to-amber-300/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        
                                            {/* Obsah karty */}
                                            <div className="relative z-10">
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

                        <button
                            onClick={prevCard}
                            aria-label="Predchádzajúca výhoda"
                            className="landing-carousel-side-control group absolute left-0 z-20 hidden -translate-y-1/2 md:block"
                        >
                            <span className="landing-carousel-nudge-left flex h-14 w-14 items-center justify-center rounded-full border border-orange-100 bg-white/95 text-orange-600 shadow-xl shadow-slate-300/40 backdrop-blur transition group-hover:border-orange-300 group-hover:bg-orange-50 group-hover:text-orange-700">
                                <ChevronLeft size={25} strokeWidth={2.1} />
                            </span>
                        </button>

                        <button
                            onClick={nextCard}
                            aria-label="Nasledujúca výhoda"
                            className="landing-carousel-side-control group absolute right-0 z-20 hidden -translate-y-1/2 md:block"
                        >
                            <span className="landing-carousel-nudge-right flex h-14 w-14 items-center justify-center rounded-full border border-orange-100 bg-white/95 text-orange-600 shadow-xl shadow-slate-300/40 backdrop-blur transition group-hover:border-orange-300 group-hover:bg-orange-50 group-hover:text-orange-700">
                                <ChevronRight size={25} strokeWidth={2.1} />
                            </span>
                        </button>

                        <div className="mt-6 flex flex-col items-center gap-3 md:mt-8">
                            <div className="flex flex-col items-center gap-2">
                                <p className="max-w-[17rem] text-center text-xs font-medium leading-relaxed text-slate-400 md:max-w-none md:text-sm md:tracking-wide md:text-slate-500">
                                    Posuňte do strany a preskúmajte všetky výhody aplikácie
                                </p>
                                <span className="h-px w-56 max-w-[75vw] bg-gradient-to-r from-transparent via-orange-200/80 to-transparent" aria-hidden="true" />
                            </div>

                            <div className="flex items-center justify-center gap-3">
                            <button 
                                onClick={prevCard}
                                aria-label="Predchádzajúca výhoda"
                                className="group flex h-9 w-9 items-center justify-center rounded-full text-orange-500 transition hover:bg-orange-50 hover:text-orange-700 active:scale-90"
                            >
                                <ChevronLeft size={19} className="transition-transform group-hover:-translate-x-1" />
                            </button>
                            <span className="h-4 w-px bg-slate-200" aria-hidden="true" />

                            {/* Šípka vpravo - grafická */}
                            <button 
                                onClick={nextCard}
                                aria-label="Nasledujúca výhoda"
                                className="group flex h-9 w-9 items-center justify-center rounded-full text-orange-500 transition hover:bg-orange-50 hover:text-orange-700 active:scale-90"
                            >
                                <ChevronRight size={19} className="transition-transform group-hover:translate-x-1" />
                            </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        )}

        {isWebOnly && (
          <section className="relative overflow-hidden border-t border-orange-100 bg-gradient-to-b from-orange-50/45 via-white to-white px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20 xl:px-16">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-[70vw] -translate-x-1/2 rounded-full bg-orange-100/35 blur-3xl" />

            <div className="relative mx-auto w-full max-w-[1380px]">
              <div className="grid items-start gap-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[270px_minmax(0,1fr)] xl:gap-12">
                <div>
                  <h3 className="text-3xl font-black leading-none tracking-tight text-slate-950 sm:text-4xl">
                    {activeFeatureShowcase.heading}<br/><span className="text-orange-600">{activeFeatureShowcase.highlight}</span>
                  </h3>
                  <p className="mt-6 text-sm font-medium leading-[1.75] text-slate-600">{activeFeatureShowcase.description}</p>

                  <div className="mt-7 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:hidden">
                    <button type="button" onClick={showPreviousFeature} aria-label="Predchádzajúca funkcia" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 active:scale-90"><ChevronLeft size={20}/></button>
                    <div className="min-w-0 text-center"><strong className="block truncate text-sm text-slate-900">{activeFeatureShowcase.title}</strong><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{featureShowcaseIndex + 1} / {featureShowcase.length}</span></div>
                    <button type="button" onClick={showNextFeature} aria-label="Nasledujúca funkcia" className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm active:scale-90"><ChevronRight size={20}/></button>
                  </div>

                  <div className="mt-8 hidden space-y-2 lg:block">
                    {featureShowcase.map((feature, index) => (
                      <button key={feature.title} type="button" onClick={() => setFeatureShowcaseIndex(index)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${index === featureShowcaseIndex ? 'border-orange-200 bg-orange-50 text-orange-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-orange-100 hover:bg-orange-50/40'}`}>
                        <span>{feature.title}</span><span className={index === featureShowcaseIndex ? 'text-orange-500' : 'text-slate-400'}>{String(index + 1).padStart(2, '0')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative min-w-0 pb-10 sm:pb-28 lg:pb-36 lg:pr-24">
                  <button type="button" onClick={showNextFeature} aria-label="Posunúť na ďalšiu funkciu" className="absolute right-2 top-10 z-30 hidden w-16 flex-col items-center gap-2 text-orange-600 lg:flex">
                    <span className="landing-carousel-nudge-right flex h-12 w-12 items-center justify-center rounded-full border border-orange-200 bg-white shadow-xl shadow-orange-100"><ChevronRight size={22}/></span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Posuň ďalej</span>
                  </button>
                  <button type="button" onClick={() => { if (window.innerWidth < 768) { setFeaturePreviewSource('main'); setShowFeaturePreview(true); } }} aria-label={`Zväčšiť náhľad: ${activeFeatureShowcase.title}`} className="relative z-10 block w-full overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-1.5 text-left shadow-[0_30px_80px_-35px_rgba(15,23,42,0.55)] md:pointer-events-none">
                    <div className="relative overflow-hidden rounded-[1.15rem] bg-white">
                      {featureShowcase.map((feature, index) => (
                        <img key={feature.image} src={feature.image} alt={index === featureShowcaseIndex ? feature.title : ''} aria-hidden={index !== featureShowcaseIndex} className={`${index === 0 ? 'relative' : 'absolute inset-0'} block w-full transition-opacity duration-300 ease-out ${index === featureShowcaseIndex ? 'z-10 opacity-100' : 'z-0 opacity-0'}`} />
                      ))}
                    </div>
                  </button>
                  <button type="button" onClick={() => { if (window.innerWidth < 768) { setFeaturePreviewSource('detail'); setShowFeaturePreview(true); } }} aria-label={`Zväčšiť detail: ${activeFeatureShowcase.title}`} className="absolute bottom-3 right-1 z-20 hidden w-[68%] origin-top-right scale-[0.94] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-1.5 text-left shadow-[0_30px_75px_-30px_rgba(15,23,42,0.58)] sm:block md:pointer-events-none lg:bottom-6 lg:right-6">
                    <div className="relative overflow-hidden rounded-[1.05rem] bg-white">
                      {featureShowcase.map((feature, index) => (
                        <img key={feature.detail} src={feature.detail} alt={index === featureShowcaseIndex ? `${feature.title} – detail` : ''} aria-hidden={index !== featureShowcaseIndex} className={`${index === 0 ? 'relative' : 'absolute inset-0'} block w-full transition-opacity duration-300 ease-out ${index === featureShowcaseIndex ? 'z-10 opacity-100' : 'z-0 opacity-0'}`} />
                      ))}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {showFeaturePreview && (
          <div className="fixed inset-0 z-[1000] flex h-[100dvh] items-center justify-center bg-slate-950/95 px-4 py-16 backdrop-blur-sm" onClick={() => setShowFeaturePreview(false)}>
            <button type="button" onClick={() => setShowFeaturePreview(false)} aria-label="Zavrieť náhľad" className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur">
              <X size={24}/>
            </button>

            <div className="flex h-full w-full max-w-6xl flex-col items-center gap-4" onClick={event => event.stopPropagation()}>
              <div className={`flex min-h-0 w-full flex-1 overflow-auto overscroll-contain rounded-xl ${featurePreviewZoom > 1 ? 'items-start' : 'items-center'}`}>
                <img
                  src={featurePreviewSource === 'main' ? activeFeatureShowcase.image : activeFeatureShowcase.detail}
                  alt={activeFeatureShowcase.title}
                  style={{ width: `${featurePreviewZoom * 100}%`, maxWidth: 'none' }}
                  className="mx-auto block rounded-xl border border-white/10 bg-white object-contain shadow-2xl touch-pan-x touch-pan-y"
                />
              </div>

              <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-black/35 p-1.5 text-white backdrop-blur">
                <button type="button" onClick={() => setFeaturePreviewZoom(value => Math.max(1, value - 0.5))} disabled={featurePreviewZoom <= 1} aria-label="Oddialiť obrázok" className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-30"><ZoomOut size={20}/></button>
                <span className="min-w-12 text-center text-xs font-bold">{Math.round(featurePreviewZoom * 100)} %</span>
                <button type="button" onClick={() => setFeaturePreviewZoom(value => Math.min(3, value + 0.5))} disabled={featurePreviewZoom >= 3} aria-label="Priblížiť obrázok" className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-30"><ZoomIn size={20}/></button>
              </div>
            </div>
          </div>
        )}
      </main>

      {isWebOnly && (
        <footer id="kontakt" className="bg-slate-900 text-white py-14 px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-12 items-start">
                <div className="md:col-span-1 space-y-5">
                    <div className="flex items-center gap-2 h-6">
                      <img src="/icon-only.png" alt="Logo" className="w-10 h-10 object-contain" />
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
                        <li><button onClick={onAbout} className="text-sm text-slate-200 hover:text-orange-300 transition font-medium">O aplikácii</button></li>
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
                    © 2026 Vytvorené spoločnosťou LORD'S BENISON s.r.o. | Všetky práva vyhradené
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

  const notifyRegistration = async (userId: string | undefined, notificationToken: string) => {
      if (!userId) return;
      try {
          const response = await fetch('/api/registration-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, notificationToken })
          });
          if (!response.ok) console.error('Registration notification failed:', response.status);
      } catch (notificationError) {
          // Internal notification must never prevent a successful signup.
          console.error('Registration notification failed:', notificationError);
      }
  };

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
        const notificationToken = crypto.randomUUID();
        const { data: auth, error: authError } = await supabase.auth.signUp({ 
          email, 
          password, 
          options: { 
            data: { 
                full_name: fullName, 
                company_name: companyName, 
                role: 'admin',
                nickname: useNickname ? nickname.trim() : null,
                registration_notification_token: notificationToken
            },
            emailRedirectTo: redirectURL 
          } 
        });
        if(authError) throw authError;
        await notifyRegistration(auth.user?.id, notificationToken);
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
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-start p-4 relative overflow-y-auto scroll-container">
      {showLegalModal && <LegalModal type={showLegalModal} onClose={() => setShowLegalModal(null)} />}
      <Card className="my-auto w-full max-w-md shrink-0 shadow-xl border-slate-200 animate-in zoom-in-95 relative overflow-hidden" padding={view === 'onboarding' ? 'p-0' : 'p-6'}>
        {view === 'onboarding' ? (
          <>
            <button onClick={onBackToLanding} aria-label="Späť na úvod" className="absolute left-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white/90 text-slate-600 shadow-sm backdrop-blur-sm transition hover:text-slate-900">
              <ArrowLeft size={17} />
            </button>
            <OnboardingCarousel onFinish={() => setView('selection')} />
          </>
        ) : (
            <>
                <button onClick={onBackToLanding} type="button" className="mb-4 inline-flex items-center gap-2 rounded-lg text-xs font-bold text-slate-500 transition hover:text-orange-600">
                  <ArrowLeft size={15} /> Späť na úvod
                </button>
                <div className="text-center">
                <div className="flex justify-center mb-1.5">
                    <img 
                      src="/icon-only.png" 
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
