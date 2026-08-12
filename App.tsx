
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, UserProfile } from './lib/supabase';
import { Button, ConfirmModal, LegalModal, Modal } from './components/UI';
import { DashboardScreen } from './features/Dashboard';
import { ProjectsScreen } from './features/Projects';
import { CalendarScreen } from './features/Calendar';
import { TeamScreen } from './features/Team';
import { WorkerModeScreen } from './features/WorkerMode';
import { AnalyticsScreen } from './features/Analytics';
import { SettingsScreen } from './features/Settings';
import { SubscriptionScreen } from './features/Subscription';
import { DiaryScreen } from './features/Diary';
import { AttendanceScreen } from './features/Attendance';
import { AdvancesScreen } from './features/Advances';
import { FinanceScreen } from './features/Finance';
import { SupportWidget } from './components/SupportWidget';
import { AIAssistantWidget } from './components/AIAssistantWidget';
import { LandingScreen, LoginScreen } from './features/Auth';
import { SuperAdminScreen } from './features/SuperAdmin';
import { UpdatesScreen } from './features/Updates';
import { AboutApp } from './features/AboutApp';

import pkg from './package.json';

import { 
  BarChart3, Building2, Calendar, Wallet, Users, LogOut, 
  ChevronRight, ChevronLeft, Clock, CreditCard, Settings, LayoutGrid, BookOpen, FileCheck, Loader2, ShieldAlert, Banknote, TrendingUp, ChevronDown, PieChart, RefreshCw, ArrowUpCircle, WifiOff, Frown, Download, CheckCircle2, Lock, Star, Phone, Mail, AlertTriangle, X
} from 'lucide-react';

import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

declare const __APP_BUILD_ID__: string;

const SUPER_ADMIN_EMAIL = 'javorcik.ivan1@gmail.com';
const GITHUB_REPO_URL = "https://api.github.com/repos/javorcikivan1-ux/vercel_mojastavba/releases/latest";
const AppLoadingScreen = () => (
  <div className="h-[100dvh] bg-slate-50 flex items-center justify-center px-6">
    <div className="w-full max-w-sm text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-lg shadow-slate-200/70 ring-1 ring-slate-200">
        <img src="/pwa-icon-192.png" alt="MojaStavba" className="h-12 w-12 object-contain" />
      </div>
      <div className="flex items-center justify-center gap-3 text-slate-900">
        <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
        <span className="text-lg font-bold">Načítavam aplikáciu</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        Ak načítanie trvá dlhšie, skontrolujte prosím pripojenie na internet.
      </p>
    </div>
  </div>
);

const isStandalonePwa = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
};

const clearStoredSupabaseSession = () => {
  if (typeof window === 'undefined') return;

  const clearStorage = (storage: Storage) => {
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (!key) continue;
      if ((key.startsWith('sb-') && key.includes('-auth-token')) || key === 'supabase.auth.token') {
        storage.removeItem(key);
      }
    }
  };

  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage);
};

const APP_SCREENS = new Set([
  'superadmin',
  'dashboard',
  'projects',
  'attendance',
  'diary',
  'calendar',
  'team',
  'finance',
  'analytics',
  'advances',
  'settings',
  'subscription',
  'updates'
]);

const SCREEN_TO_SLUG: Record<string, string> = {
  superadmin: 'admin',
  dashboard: 'nastenka',
  projects: 'zakazky',
  attendance: 'dochadzky',
  diary: 'dennik-prace',
  calendar: 'kalendar',
  team: 'tim',
  finance: 'firemna-analytika',
  analytics: 'analyza-zakaziek',
  advances: 'zalohy',
  settings: 'nastavenia',
  subscription: 'predplatne',
  updates: 'aktualizacie'
};

const SLUG_TO_SCREEN = new Map(
  Object.entries(SCREEN_TO_SLUG).flatMap(([screen, slug]) => [
    [slug, screen],
    [screen, screen]
  ])
);
SLUG_TO_SCREEN.set('stavebny-dennik', 'diary');

const getAppRouteHash = (screen: string, siteId: string | null, diarySiteId: string | null = null) => {
  if (screen === 'projects' && siteId) {
    return `#/${SCREEN_TO_SLUG.projects}/zakazka/${encodeURIComponent(siteId)}`;
  }

  if (screen === 'diary' && diarySiteId) {
    return `#/${SCREEN_TO_SLUG.diary}/zakazka/${encodeURIComponent(diarySiteId)}`;
  }

  return `#/${SCREEN_TO_SLUG[screen] || SCREEN_TO_SLUG.dashboard}`;
};

const parseAppRouteHash = (hash: string) => {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const screen = SLUG_TO_SCREEN.get(parts[0]) || 'dashboard';
  const siteId = screen === 'projects' && (parts[1] === 'zakazka' || parts[1] === 'stavba' || parts[1] === 'site') && parts[2]
    ? decodeURIComponent(parts[2])
    : null;
  const diarySiteId = screen === 'diary' && (parts[1] === 'zakazka' || parts[1] === 'stavba' || parts[1] === 'site') && parts[2]
    ? decodeURIComponent(parts[2])
    : null;

  return { screen, siteId, diarySiteId };
};

const OfflineOverlay = () => (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <WifiOff size={48} className="animate-pulse" />
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md">
                    <Frown size={28} className="text-orange-600" />
                </div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">Sme offline... ☹️</h2>
            <p className="text-slate-500 mt-4 font-medium leading-relaxed">
                Stratili ste pripojenie k sieti. Pre fungovanie aplikácie MojaStavba musíte byť pripojený na internet.
            </p>
            <div className="mt-8 flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest italic animate-pulse">
                    <RefreshCw size={12} className="animate-spin" /> Čakám na signál...
                </div>
            </div>
        </div>
    </div>
);

const UnpaidLockScreen = ({ onLogout }: { onLogout: () => void }) => (
    <div className="fixed inset-0 z-[9999] bg-slate-100 flex items-center justify-center p-4 md:p-6">
        <div className="bg-white rounded-3xl shadow-[0_24px_70px_-28px_rgba(15,23,42,0.35)] p-6 md:p-10 max-w-xl md:max-w-3xl w-full text-center border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 via-red-500 to-orange-400"></div>
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100">
                <Lock size={30} />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-950 leading-tight mb-4">Prístup bol pozastavený</h2>
            <div className="space-y-3 text-slate-600 font-medium leading-relaxed max-w-md md:max-w-lg mx-auto">
                <p>Evidujeme neuhradenú faktúru za používanie systému <strong>MojaStavba</strong>.</p>
                <p>Po pripísaní platby vám prístup k projektom a dátam obnovíme.</p>
            </div>
            
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[0.9fr_1.15fr] gap-3 md:gap-4">
                <a href="tel:0948225713" className="flex items-center gap-3 p-4 md:p-5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl hover:border-orange-200 hover:bg-orange-50/60 transition-all">
                    <Phone size={18} className="text-orange-600 shrink-0" />
                    <div className="text-left">
                        <div className="text-xs font-semibold text-slate-500">Zavolať nám</div>
                        <div className="font-bold text-slate-950">0948 225 713</div>
                    </div>
                </a>
                <a href="mailto:sluzby@lordsbenison.eu" className="flex items-center gap-3 p-4 md:p-5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl hover:border-orange-200 hover:bg-orange-50/60 transition-all">
                    <Mail size={18} className="text-orange-600 shrink-0" />
                    <div className="text-left">
                        <div className="text-xs font-semibold text-slate-500">Napísať email</div>
                        <div className="font-bold text-slate-950 break-all md:break-normal md:whitespace-nowrap">sluzby@lordsbenison.eu</div>
                    </div>
                </a>
            </div>

            <button onClick={onLogout} className="mt-8 text-xs font-semibold text-slate-500 hover:text-red-600 transition flex items-center justify-center gap-2 mx-auto">
                <LogOut size={14}/> Odhlásiť sa z účtu
            </button>
        </div>
    </div>
);

const LegacyAppMigrationOverlay = ({ platform }: { platform: 'mobile' | 'desktop' }) => {
  const platformLabel = platform === 'mobile' ? 'mobilnú APK aplikáciu' : 'desktopovú EXE aplikáciu';

  const openWebsite = () => {
    window.open('https://www.moja-stavba.sk', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.7)]">
        <div className="p-6 sm:p-8">
          <div className="mb-5 grid gap-5 md:grid-cols-[1fr_0.92fr] md:items-start">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-50 ring-1 ring-orange-100">
                <img src="/pwa-icon-192.png" alt="MojaStavba" className="h-11 w-11 object-contain" />
              </div>
              <div>
                <div className="mb-2 inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
                  Táto verzia už nie je podporovaná
                </div>
                <h1 className="text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
                  Prejdite na novú aplikáciu MojaStavba
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                  Používate starú {platformLabel}. Nové funkcie a opravy sú odteraz dostupné v aplikácii
                  MojaStavba PWA priamo z webu.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 text-sm font-medium leading-relaxed text-slate-700">
              Dáta ostávajú vo vašom účte. Mení sa iba spôsob spúšťania aplikácie.
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              'Odinštalujte pôvodnú aplikáciu zo zariadenia.',
              'Otvorte stránku www.moja-stavba.sk v prehliadači.',
              'Kliknite na Stiahnuť aplikáciu MojaStavba a vyberte svoje zariadenie.',
              'Postupujte podľa návodu a prihláste sa rovnakým účtom ako doteraz.'
            ].map((step, index) => (
              <div key={step} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-orange-600 ring-1 ring-slate-200">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm font-semibold leading-relaxed text-slate-700">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <button
              type="button"
              onClick={openWebsite}
              className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700"
            >
              <Download size={18} />
              Otvoriť www.moja-stavba.sk
            </button>
            <p className="text-xs leading-relaxed text-slate-500">
              Ak ste prihlásení a nevidíte postup inštalácie, odhláste sa z účtu. Na úvodnej obrazovke sa zobrazí tlačidlo na inštaláciu aplikácie.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const App = () => {
  const initialRoute = parseAppRouteHash(window.location.hash);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [view, setView] = useState('loading');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [activeScreen, setActiveScreen] = useState(() => window.location.hash ? initialRoute.screen : localStorage.getItem('ms_active_screen') || 'dashboard'); 
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(() => window.location.hash ? initialRoute.siteId : localStorage.getItem('ms_selected_site_id'));
  const [selectedDiarySiteId, setSelectedDiarySiteId] = useState<string | null>(() => window.location.hash ? initialRoute.diarySiteId : null);
  
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); 
  const [initialSettingsTab, setInitialSettingsTab] = useState('general');
  const [navigationAction, setNavigationAction] = useState<any>(null);
  const [showLegalModal, setShowLegalModal] = useState<'vop' | 'gdpr' | null>(null);
  const [initialLoginView, setInitialLoginView] = useState('login');
  const [workerTab, setWorkerTab] = useState('dashboard');
  const isApplyingBrowserHistory = useRef(false);
  const lastAppRouteHash = useRef('');
  const mainContentRef = useRef<HTMLElement | null>(null);
  const profileRef = useRef<UserProfile | null>(null);
  const profileLoadRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);
  const isLoggingOutRef = useRef(false);
  
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'downloading' | 'applying' | 'installing'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showPwaUpdateNotice, setShowPwaUpdateNotice] = useState(false);
  const [forcedLegacyMigrationPreview, setForcedLegacyMigrationPreview] = useState<'mobile' | 'desktop' | null>(null);

  const [isFinanceOpen, setIsFinanceOpen] = useState(() => {
    const active = localStorage.getItem('ms_active_screen');
    return active === 'finance' || active === 'analytics' || active === 'advances';
  });

  const isNative = Capacitor.isNativePlatform();
  const isElectron = !isNative && navigator.userAgent.toLowerCase().includes('electron');
  const isPwa = !isNative && !isElectron && isStandalonePwa();

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!isPwa) return;
    const storageKey = 'ms_last_pwa_build_id';
    const noticeKey = 'ms_seen_pwa_update_notice_build_id';
    const previousBuild = localStorage.getItem(storageKey);
    const seenNoticeBuild = localStorage.getItem(noticeKey);

    if (view !== 'app') {
      if (view === 'landing' && !previousBuild) {
        localStorage.setItem(storageKey, __APP_BUILD_ID__);
      }
      return;
    }

    if (!previousBuild || previousBuild !== __APP_BUILD_ID__) {
      localStorage.setItem(storageKey, __APP_BUILD_ID__);
      if (seenNoticeBuild !== __APP_BUILD_ID__) {
        localStorage.setItem(noticeKey, __APP_BUILD_ID__);
        setShowPwaUpdateNotice(true);
      }
    }
  }, [isPwa, view]);

  useEffect(() => {
    if (!(import.meta as any).env?.DEV) return;
    (window as any).showPwaUpdateModal = () => setShowPwaUpdateNotice(true);
    (window as any).showLegacyMigrationModal = (platform: 'mobile' | 'desktop' = 'desktop') => {
      setForcedLegacyMigrationPreview(platform === 'mobile' ? 'mobile' : 'desktop');
    };
    (window as any).hideLegacyMigrationModal = () => setForcedLegacyMigrationPreview(null);
    return () => {
      delete (window as any).showPwaUpdateModal;
      delete (window as any).showLegacyMigrationModal;
      delete (window as any).hideLegacyMigrationModal;
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isNative && !isElectron) return; 

    const checkUpdates = async () => {
        try {
            let currentVersion = pkg.version;
            
            if (isNative) {
                const current = await CapacitorUpdater.current();
                if (current?.bundle?.version) {
                    currentVersion = current.bundle.version.trim();
                } else {
                    const info = await CapApp.getInfo();
                    if (info.version) currentVersion = info.version.trim();
                }
            } else if (isElectron) {
                currentVersion = pkg.version; 
            }

            const response = await fetch(`${GITHUB_REPO_URL}?t=${Date.now()}`);
            const data = await response.json();
            
            if (data && data.tag_name) {
                const latestVersion = data.tag_name.replace(/[vV]/g, '').trim();
                const cleanCurrent = currentVersion.replace(/[vV]/g, '').trim();
                
                if (latestVersion !== cleanCurrent && latestVersion !== "" && cleanCurrent !== "" && updateStatus === 'idle') {
                    if (activeScreen !== 'settings') {
                        setUpdateAvailable(latestVersion);
                    }
                } else {
                    setUpdateAvailable(null); 
                }
            }
        } catch (err) {
            console.error("Update check failed", err);
        }
    };

    // Nastavenie IPC listenerov pre Electron (pre zamestnanca)
    if (isElectron) {
        try {
            // @ts-ignore
            const { ipcRenderer } = window.require('electron');
            
            const handleStatus = (_: any, newStatus: string, info?: string) => {
                if (newStatus === 'available') {
                    setUpdateAvailable(info || '');
                } else if (newStatus === 'downloading') {
                    setUpdateStatus('downloading');
                } else if (newStatus === 'ready') {
                    setUpdateStatus('applying');
                    setDownloadProgress(100);
                } else if (newStatus === 'installing') {
                    setUpdateStatus('installing');
                } else if (newStatus === 'error') {
                    setUpdateStatus('idle');
                    setUpdateAvailable(null);
                }
            };

            const handleProgress = (_: any, percent: number) => {
                setDownloadProgress(Math.round(percent));
                setUpdateStatus('downloading');
            };

            ipcRenderer.on('update-status', handleStatus);
            ipcRenderer.on('download-progress', handleProgress);

            return () => {
                ipcRenderer.removeAllListeners('update-status');
                ipcRenderer.removeAllListeners('download-progress');
            };
        } catch (e) {
            console.error("Failed to setup Electron IPC", e);
        }
    }

    checkUpdates();
    const interval = setInterval(checkUpdates, 15 * 60 * 1000); 
    return () => clearInterval(interval);

  }, [activeScreen, updateStatus, isNative, isElectron]); 

  const handleUpdateClick = async () => {
      const isAndroid = Capacitor.getPlatform() === 'android';
      if (isAndroid && updateAvailable) {
          try {
              setUpdateStatus('downloading');
              setDownloadProgress(10);

              const downloadUrl = `https://github.com/javorcikivan1-ux/vercel_mojastavba/releases/download/v${updateAvailable}/MojaStavba.zip`;
              
              setDownloadProgress(30);
              const version = await CapacitorUpdater.download({
                  url: downloadUrl,
                  version: updateAvailable,
              });

              setDownloadProgress(80);
              setUpdateStatus('applying');
              
              await CapacitorUpdater.set(version);
          } catch (e: any) {
              console.error("OTA Update failed", e);
              setUpdateStatus('idle');
              setUpdateAvailable(null);
          }
      } else if (isElectron && updateAvailable) {
          // Electron update pre zamestnanca
          try {
              // @ts-ignore
              const { ipcRenderer } = window.require('electron');
              setUpdateStatus('downloading');
              ipcRenderer.send('start-download');
          } catch (e) {
              console.error("Electron update failed", e);
              setUpdateStatus('idle');
              setUpdateAvailable(null);
          }
      } else {
          setActiveScreen('settings'); 
          setInitialSettingsTab('updates'); 
          setUpdateAvailable(null);
      }
  };

  useEffect(() => {
    localStorage.setItem('ms_active_screen', activeScreen);
    if (['finance', 'analytics', 'advances'].includes(activeScreen)) {
        setIsFinanceOpen(true);
    }
    if (activeScreen !== 'projects' && selectedSiteId) {
        setSelectedSiteId(null);
    }
    if (activeScreen !== 'diary' && selectedDiarySiteId) {
        setSelectedDiarySiteId(null);
    }
  }, [activeScreen, selectedSiteId, selectedDiarySiteId]);

  useEffect(() => {
    if (activeScreen === 'projects' && selectedSiteId) {
      localStorage.setItem('ms_selected_site_id', selectedSiteId);
    } else {
      localStorage.removeItem('ms_selected_site_id');
    }
  }, [activeScreen, selectedSiteId]);

  useEffect(() => {
    if (view !== 'app' || !profile) return;

    const routeHash = getAppRouteHash(activeScreen, selectedSiteId, selectedDiarySiteId);

    if (!lastAppRouteHash.current) {
      lastAppRouteHash.current = routeHash;
      window.history.replaceState({ mojastavba: true }, '', routeHash);
      return;
    }

    if (isApplyingBrowserHistory.current) {
      lastAppRouteHash.current = routeHash;
      isApplyingBrowserHistory.current = false;
      return;
    }

    if (routeHash !== lastAppRouteHash.current) {
      lastAppRouteHash.current = routeHash;
      window.history.pushState({ mojastavba: true }, '', routeHash);
    }
  }, [activeScreen, selectedSiteId, selectedDiarySiteId, view, profile]);

  useEffect(() => {
    requestAnimationFrame(() => {
      mainContentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [activeScreen, selectedSiteId, selectedDiarySiteId]);

  useEffect(() => {
    if (view !== 'app' || !profile) return;

    const handlePopState = () => {
      const { screen, siteId, diarySiteId } = parseAppRouteHash(window.location.hash);
      isApplyingBrowserHistory.current = true;
      lastAppRouteHash.current = getAppRouteHash(screen, siteId, diarySiteId);
      setActiveScreen(screen);
      setSelectedSiteId(siteId);
      setSelectedDiarySiteId(diarySiteId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view, profile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlAction = params.get('action');
    const path = window.location.pathname;

    if (path === '/o-aplikacii') {
        setView('about');
        setLoading(false);
        return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
          fetchProfile(session.user.id);
      } else {
          if (urlAction === 'register-emp') {
              setInitialLoginView('register-emp');
              setView('login');
          } else {
              setView('landing');
          }
          setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isLoggingOutRef.current) {
          setSession(null);
          setProfile(null);
          setOrganization(null);
          setView('landing');
          setLoading(false);
          return;
      }

      setSession(session);
      if (session) {
          const isSilentFetch = !!profileRef.current; 
          fetchProfile(session.user.id, isSilentFetch);
      }
      else {
          if (window.location.pathname === '/o-aplikacii') return;
          setProfile(null);
          setOrganization(null);
          const p = new URLSearchParams(window.location.search);
          if (p.get('action') === 'register-emp') {
            setInitialLoginView('register-emp');
            setView('login');
          } else {
            setView('landing');
          }
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncEmployeeInviteCompletion = async (prof: UserProfile) => {
      if (prof.role !== 'employee' || !prof.organization_id || !prof.email) return;

      try {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (!accessToken) return;

          const pendingInviteToken = localStorage.getItem('ms_pending_invite_token') || '';
          const pendingInviteCompanyId = localStorage.getItem('ms_pending_invite_company_id') || '';
          const pendingInviteEmail = localStorage.getItem('ms_pending_invite_email') || '';
          const inviteToken = pendingInviteCompanyId === prof.organization_id && pendingInviteEmail === String(prof.email).trim().toLowerCase()
              ? pendingInviteToken
              : '';

          await fetch('/api/complete-invite', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                  companyId: prof.organization_id,
                  email: prof.email,
                  inviteToken
              })
          });

          if (inviteToken) {
              localStorage.removeItem('ms_pending_invite_token');
              localStorage.removeItem('ms_pending_invite_company_id');
              localStorage.removeItem('ms_pending_invite_email');
          }
      } catch (inviteError) {
          console.warn('Invite completion sync failed:', inviteError);
      }
  };

  const fetchProfile = async (userId: string, silent = false) => {
      if (!silent) setLoading(true);

      const existingLoad = profileLoadRef.current;
      if (existingLoad?.userId === userId) {
          try {
              await existingLoad.promise;
          } finally {
              if (!silent) setLoading(false);
          }
          return;
      }

      const loadPromise = (async () => {
          try {
              // Load the profile and its organization in one round trip. The
              // fallback keeps login working if the embedded relation is not
              // available in a particular Supabase schema cache yet.
              const joinedResult = await supabase
                  .from('profiles')
                  .select('*, organization:organizations(*)')
                  .eq('id', userId)
                  .single();

              let prof: any = null;
              let org: any = null;

              if (!joinedResult.error && joinedResult.data?.organization) {
                  const { organization: joinedOrganization, ...profileData } = joinedResult.data as any;
                  prof = profileData;
                  org = joinedOrganization;
              } else {
                  const profileResult = await supabase.from('profiles').select('*').eq('id', userId).single();
                  if (profileResult.error || !profileResult.data) throw profileResult.error || new Error('Profil nebol nájdený.');

                  prof = profileResult.data;
                  const organizationResult = await supabase.from('organizations').select('*').eq('id', prof.organization_id).single();
                  if (organizationResult.error || !organizationResult.data) throw organizationResult.error || new Error('Firma nebola nájdená.');
                  org = organizationResult.data;
              }

              if (isLoggingOutRef.current) return;

              profileRef.current = prof as UserProfile;
              setProfile(prof as UserProfile);
              setOrganization(org);
              setView('app');
              void syncEmployeeInviteCompletion(prof as UserProfile);
          } catch (e) {
              console.error("Fetch profile failed", e);
              if (!isLoggingOutRef.current) setView('landing');
          }
      })();

      profileLoadRef.current = { userId, promise: loadPromise };

      try {
          await loadPromise;
      } finally {
          if (profileLoadRef.current?.promise === loadPromise) profileLoadRef.current = null;
          if (!silent) setLoading(false);
      }
  };

  const handleLogout = async () => {
    isLoggingOutRef.current = true;
    setView('landing');
    setProfile(null);
    setOrganization(null);
    setSession(null);
    setShowLogoutConfirm(false);
    setUpdateAvailable(null);
    setShowPwaUpdateNotice(false);
    localStorage.removeItem('ms_active_screen');
    localStorage.removeItem('ms_selected_site_id');
    clearStoredSupabaseSession();

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      clearStoredSupabaseSession();
    }

    window.history.replaceState({}, '', window.location.pathname);
    setLoading(false);
    setInitialLoginView('login');
    setActiveScreen('dashboard');
    setSelectedSiteId(null);
    setSelectedDiarySiteId(null);
    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 500);
  };
  const handleNavigate = (screen: string, params?: any) => {
      if (screen === 'settings' && params?.tab) {
          setInitialSettingsTab(params.tab);
      }
      setNavigationAction(params?.action ? { screen, action: params.action, payload: params.payload || null, nonce: Date.now() } : null);
      setActiveScreen(screen);
      setSelectedSiteId(null);
      setSelectedDiarySiteId(null);
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
      setProfile(updatedProfile);
  };

  const isTrialExpired = () => {
      if (profile?.email === SUPER_ADMIN_EMAIL) return false;
      if (profile?.role === 'employee') return false;
      if(!organization) return false;
      if(organization.subscription_status === 'active') return false;
      const ends = new Date(organization.trial_ends_at);
      return ends < new Date();
  };

  const getDaysRemaining = () => {
      if (!organization) return 0;
      return Math.max(
          0,
          Math.ceil(
            (new Date(organization.trial_ends_at).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
      );
  };

  if (loading && !profile) {
      if (isPwa || isNative || isElectron) return <AppLoadingScreen />;
      return <div className="h-screen bg-white" />;
  }

  if (forcedLegacyMigrationPreview || isNative || isElectron) {
      return <LegacyAppMigrationOverlay platform={forcedLegacyMigrationPreview || (isNative ? 'mobile' : 'desktop')} />;
  }

  if (view === 'about') return (
    <AboutApp
      onStart={() => { setInitialLoginView('onboarding'); setView('login'); }}
      onLogin={() => { setInitialLoginView('login'); setView('login'); }}
      onBack={() => setView('landing')}
    />
  );

  if (view === 'landing') return (
    <>
      {!isOnline && <OfflineOverlay />}
      <LandingScreen 
        onStart={() => { setInitialLoginView('onboarding'); setView('login'); }} 
        onTryFree={() => { setInitialLoginView('onboarding'); setView('login'); }}
        onLogin={() => { setInitialLoginView('login'); setView('login'); }} 
        onWorker={() => { setInitialLoginView('register-emp'); setView('login'); }} 
        onSubscriptionClick={() => { 
            setInitialLoginView('login'); 
            setView('login'); 
        }}
      />
    </>
  );

  const inviteCompanyId = new URLSearchParams(window.location.search).get('companyId') || '';
  const effectiveInitialView = new URLSearchParams(window.location.search).get('action') === 'register-emp' ? 'register-emp' : initialLoginView;

  if (view === 'login') return (
      <>
        {!isOnline && <OfflineOverlay />}
        <LoginScreen 
          onLogin={() => {}} 
          initialView={effectiveInitialView}
          initialCompanyId={inviteCompanyId}
          onBackToLanding={() => setView('landing')}
        />
      </>
  );

  if (view === 'app' && profile && organization) {
      const isSuperAdmin = profile.email === SUPER_ADMIN_EMAIL;

      // LOCK LOGIC FOR DEBTORS
      if (organization.subscription_status === 'suspended_unpaid' && !isSuperAdmin) {
          return <UnpaidLockScreen onLogout={handleLogout} />;
      }

      // Gating Logic
      const currentPlan = organization.subscription_plan || 'base';
      const hasAnalytics = currentPlan !== 'base' || isSuperAdmin;
      const hasAI = currentPlan === 'pro' || isSuperAdmin;

      if (isTrialExpired() && activeScreen !== 'subscription') {
           return (
             <>
               {!isOnline && <OfflineOverlay />}
               <SubscriptionScreen profile={profile} organization={organization} isExpiredProp={true} onSuccess={() => window.location.reload()} onLogout={handleLogout} />
             </>
           );
      }

      if(profile.role === 'employee') {
           return (
               <>
                {!isOnline && <OfflineOverlay />}
                <WorkerModeScreen profile={profile} organization={organization} onLogout={handleLogout} onTabChange={setWorkerTab} />
                {workerTab === 'dashboard' && (
                    <>
                        <SupportWidget profile={profile} organization={organization} />
                        {hasAI && <AIAssistantWidget profile={profile} organization={organization} />}
                    </>
                )}
                
                {updateAvailable && (
                    <Modal title="Aktualizácia systému" onClose={updateStatus === 'idle' ? () => setUpdateAvailable(null) : undefined} maxWidth="max-w-sm">
                        <div className="text-center py-4">
                            {updateStatus === 'idle' ? (
                                <>
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm animate-bounce">
                                        <ArrowUpCircle size={32}/>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900">Dostupná verzia v{updateAvailable}</h3>
                                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                        Vydali sme novú aktualizáciu MojaStavba. Táto aktualizácia je kľúčová pre správne fungovanie systému.
                                    </p>
                                    <div className="mt-6 flex flex-col gap-2">
                                        <Button fullWidth onClick={handleUpdateClick}>
                                            Aktualizovať teraz
                                        </Button>
                                        <button onClick={() => setUpdateAvailable(null)} className="text-[10px] font-black uppercase text-slate-400 p-2">Pripomenúť neskôr</button>
                                    </div>
                                </>
                            ) : (updateStatus === 'applying' && downloadProgress === 100 && isElectron) ? (
                                <div className="space-y-6 py-4 animate-in fade-in">
                                    <CheckCircle2 className="mx-auto text-green-600 mb-4" size={48} />
                                    <div>
                                        <h3 className="font-black text-green-900">Aktualizácia pripravená!</h3>
                                        <p className="text-xs text-slate-400 uppercase font-bold mt-1">Pre dokončenie reštartujte aplikáciu</p>
                                    </div>
                                    <Button fullWidth onClick={() => {
                                        try {
                                            // @ts-ignore
                                            const { ipcRenderer } = window.require('electron');
                                            ipcRenderer.send('install-update');
                                        } catch (e) {
                                            console.error("Install failed", e);
                                        }
                                    }} className="bg-green-600 hover:bg-green-700">
                                        Inštalovať a reštartovať
                                    </Button>
                                </div>
                            ) : (downloadProgress === 100 && isElectron && updateStatus !== 'installing') ? (
                                <div className="space-y-6 py-4 animate-in fade-in">
                                    <CheckCircle2 className="mx-auto text-green-600 mb-4" size={48} />
                                    <div>
                                        <h3 className="font-black text-green-900">Aktualizácia pripravená!</h3>
                                        <p className="text-xs text-slate-400 uppercase font-bold mt-1">Pre dokončenie reštartujte aplikáciu</p>
                                    </div>
                                    <Button fullWidth onClick={() => {
                                        try {
                                            // @ts-ignore
                                            const { ipcRenderer } = window.require('electron');
                                            ipcRenderer.send('install-update');
                                        } catch (e) {
                                            console.error("Install failed", e);
                                        }
                                    }} className="bg-green-600 hover:bg-green-700">
                                        Inštalovať a reštartovať
                                    </Button>
                                </div>
                            ) : updateStatus === 'installing' ? (
                                <div className="space-y-6 py-4 animate-in fade-in">
                                    <Loader2 className="animate-spin text-green-600 mx-auto" size={48} />
                                    <div>
                                        <h3 className="font-black text-slate-900">Inštalujem aktualizáciu...</h3>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Aplikácia sa teraz reštartuje</p>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-green-600 h-full transition-all duration-500 animate-pulse"></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 py-4 animate-in fade-in">
                                    <Loader2 className="animate-spin text-orange-600 mx-auto" size={48} />
                                    <div>
                                        <h3 className="font-black text-slate-900">{updateStatus === 'downloading' ? 'Sťahujem aktualizáciu...' : 'Aplikujem zmeny...'}</h3>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">{isElectron && updateStatus === 'applying' ? 'Pre dokončenie kliknite na tlačidlo' : 'Aplikácia sa po dokončení sama reštartuje'}</p>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-orange-600 h-full transition-all duration-500" 
                                            style={{ width: `${downloadProgress}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{downloadProgress}%</div>
                                </div>
                            )}
                        </div>
                    </Modal>
                )}
               </>
           );
      }

      const AdminNavItem = ({ id, label, icon: Icon, color = "text-orange-600", isSubItem = false, disabled = false }: any) => {
        const [showLockedTooltip, setShowLockedTooltip] = useState(false);
        const timeoutRef = useRef<any>(null);

        const handleClick = (e: React.MouseEvent) => {
            if (disabled) {
                e.preventDefault();
                setShowLockedTooltip(true);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => setShowLockedTooltip(false), 3000);
            } else {
                setActiveScreen(id);
                setSelectedSiteId(null);
                setSelectedDiarySiteId(null);
            }
        };

        const handleMouseEnter = () => {
            if (disabled) setShowLockedTooltip(true);
        };

        const handleMouseLeave = () => {
            if (disabled) setShowLockedTooltip(false);
        };

        return (
            <div className="relative group">
                <button
                    onClick={handleClick}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    title={isSidebarCollapsed && !disabled ? label : ''}
                    className={`w-full min-h-[44px] flex items-center gap-3 rounded-xl transition-all font-bold relative shrink-0
                        ${activeScreen === id
                            ? (isSubItem ? 'bg-orange-100/50 text-orange-800' : 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100')
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }
                        ${isSidebarCollapsed ? 'justify-center px-0 py-3' : (isSubItem ? 'px-4 py-2 ml-2 w-[calc(100%-8px)]' : 'px-4 py-2.5')}
                        ${disabled ? 'cursor-help opacity-70' : ''}
                        md:shrink
                    `}
                >
                    <div className={`${activeScreen === id ? 'scale-110 transition-transform' : ''}`}>
                        <Icon
                            size={isSubItem ? 18 : 22}
                            className={`transition-colors shrink-0
                                ${activeScreen === id
                                    ? color
                                    : 'text-slate-400 group-hover:' + color
                                }`}
                        />
                    </div>
                    {!isSidebarCollapsed && <span className={`${isSubItem ? 'text-xs' : 'text-sm'}`}>{label}</span>}
                    {disabled && !isSidebarCollapsed && <Lock size={12} className="ml-auto text-slate-300" />}
                    <span className="md:hidden text-[10px] mt-1 font-medium truncate w-full text-center block">{label}</span>
                </button>

                {showLockedTooltip && (
                    <div className={`absolute z-[100] ${isSidebarCollapsed ? 'left-full ml-2' : 'left-4 top-full mt-1'} bg-slate-900 text-white p-3 rounded-xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 min-w-[180px] pointer-events-none`}>
                        <div className="flex items-center gap-2 mb-1.5">
                            <Star size={14} className="text-amber-400 fill-amber-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Premium funkcia</span>
                        </div>
                        <p className="text-[11px] font-bold leading-snug">
                            Táto sekcia je dostupná od balíka <span className="text-orange-400 uppercase">GOLD</span> a <span className="text-orange-400 uppercase">PLATINUM</span>.
                        </p>
                        <div className="absolute top-0 left-4 w-2 h-2 bg-slate-900 rotate-45 -translate-y-1 sm:block hidden"></div>
                    </div>
                )}
            </div>
        );
      };

      return (
        <div className="flex h-screen bg-slate-50 overflow-hidden pt-safe-top relative">
             {!isOnline && <OfflineOverlay />}
             <aside className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
                 <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5 transition-all`}>
                     <img 
                       src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" 
                       alt="Logo" 
                       className="w-11 h-11 object-contain shrink-0" 
                     />
                     {!isSidebarCollapsed && (
                          <div className="min-w-0 transition-opacity duration-300 flex flex-col gap-1">
                            <div className="brand-wordmark text-xl leading-none">
                              Moja<span className="brand-wordmark-accent">Stavba</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">
                              {organization.name}
                            </div>
                          </div>
                     )}
                 </div>

                 {organization.subscription_status !== 'active' && profile?.email !== SUPER_ADMIN_EMAIL && (
                    <div className="mx-4 mb-3 transition-all duration-300">
                        {isSidebarCollapsed ? (
                            <button
                                onClick={() => setActiveScreen('subscription')}
                                className="w-full flex justify-center bg-red-50 hover:bg-red-100 p-2 rounded-xl text-red-600 border border-red-100 transition"
                                title={`Skúšobná doba končí o ${getDaysRemaining()} dní`}
                            >
                                <span className="font-bold text-xs">{getDaysRemaining()}d</span>
                            </button>
                        ) : (
                            <div className="px-4 py-3 bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock size={16} className="text-orange-600"/>
                                    <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">
                                        Skúšobná verzia
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-slate-700">
                                    Ostáva <strong>{getDaysRemaining()} dní</strong>.
                                </div>
                                <button
                                    onClick={() => setActiveScreen('subscription')}
                                    className="mt-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-lg w-full transition shadow-sm"
                                >
                                    Aktivovať plnú verziu
                                </button>
                            </div>
                        )}
                    </div>
                 )}

                 <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto py-2 custom-scrollbar">
                    {isSuperAdmin && <AdminNavItem id="superadmin" label="ADMIN PANEL" icon={ShieldAlert} color="text-red-600" />}
                    <AdminNavItem id="dashboard" label="Nástenka" icon={LayoutGrid} />
                    <AdminNavItem id="projects" label="Zákazky" icon={Building2} />
                    <AdminNavItem id="attendance" label="Dochádzky" icon={FileCheck} />
                    <AdminNavItem id="diary" label="Denník práce" icon={BookOpen} />
                    <AdminNavItem id="calendar" label="Kalendár" icon={Calendar} />
                    <AdminNavItem id="team" label="Tím" icon={Users} />
                    
                    <div>
                        <button
                            onClick={() => setIsFinanceOpen(!isFinanceOpen)}
                            className={`w-full min-h-[44px] flex items-center gap-3 rounded-xl transition-all font-bold text-sm
                                ${['finance', 'analytics', 'advances'].includes(activeScreen)
                                    ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }
                                ${isSidebarCollapsed ? 'justify-center px-0 py-3' : 'px-4 py-2.5'}
                            `}
                            title={isSidebarCollapsed ? 'Financie' : ''}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Wallet size={22} className={['finance', 'analytics', 'advances'].includes(activeScreen) ? 'text-orange-600' : 'text-slate-400'} />
                                {!isSidebarCollapsed && <span>Financie</span>}
                            </div>
                            {!isSidebarCollapsed && (
                                <ChevronDown size={16} className={`ml-auto transition-transform duration-300 ${isFinanceOpen ? 'rotate-180' : ''}`} />
                            )}
                        </button>
                        
                        {(isFinanceOpen && !isSidebarCollapsed) && (
                            <div className="mt-1 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                                <AdminNavItem id="finance" label="Firemná analytika" icon={PieChart} isSubItem={true} disabled={!hasAnalytics} />
                                <AdminNavItem id="analytics" label="Analytika zákaziek" icon={BarChart3} isSubItem={true} disabled={!hasAnalytics} />
                                <AdminNavItem id="advances" label="Zálohy" icon={Banknote} isSubItem={true} />
                            </div>
                        )}
                    </div>

                    <div>
                        <AdminNavItem id="settings" label="Nastavenia" icon={Settings} />
                        <AdminNavItem id="updates" label="Aktualizácie" icon={RefreshCw} />
                        {!isSuperAdmin && profile?.role === 'admin' && <AdminNavItem id="subscription" label="Predplatné" icon={CreditCard} />}
                    </div>
                 </nav>

                 <div className="p-4 pb-4 border-t border-slate-100 bg-slate-50/50">
                    <div className={`flex items-center gap-3 mb-3 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-2 pt-2'}`}>
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 overflow-hidden shadow-sm shrink-0">
                            {organization?.logo_url ? (
                                <img src={organization.logo_url} alt="Logo" className="w-full h-full object-cover"/>
                            ) : (
                                profile.full_name?.charAt(0) || 'A'
                            )}
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="truncate flex-1">
                              <p className="text-sm font-bold text-slate-800 truncate">{profile.full_name}</p>
                              <p className="text-[10px] text-slate-500 truncate font-medium">{profile.email}</p>
                            </div>
                        )}
                    </div>

                    {!isSidebarCollapsed && (
                        <Button
                          variant="ghost"
                          fullWidth
                          onClick={() => setShowLogoutConfirm(true)}
                          className="text-slate-500 hover:text-red-500 hover:bg-red-50 justify-start px-2 h-9 text-xs"
                        >
                          <LogOut size={16} className="mr-2"/> Odhlásiť sa
                        </Button>
                    )}
                 </div>

                 <button 
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                    className="flex items-center justify-center p-2 text-slate-400 hover:text-slate-600 border-t border-slate-200 hover:bg-slate-50 transition"
                 >
                     {isSidebarCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
                 </button>
             </aside>

             <main ref={mainContentRef} className="flex-1 overflow-y-auto scroll-container relative flex flex-col w-full pb-20 md:pb-8 md:mb-0">
                 <div className="md:hidden bg-white border-b border-slate-200 p-3 px-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
                     <div className="font-bold text-slate-900 flex items-center gap-2">
                        <img 
                          src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" 
                          alt="Logo" 
                          className="w-7 h-7 object-contain" 
                        />
                        <span className="brand-wordmark text-lg">Moja<span className="brand-wordmark-accent">Stavba</span></span>
                     </div>

                     <div className="flex items-center gap-3">
                         {isSuperAdmin && (
                             <button onClick={() => setActiveScreen('superadmin')} className="text-red-600 p-1"><ShieldAlert size={20}/></button>
                         )}
                         {organization?.subscription_status !== 'active' && profile?.email !== SUPER_ADMIN_EMAIL && (
                             <button
                                 onClick={() => setActiveScreen('subscription')}
                                 className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 active:bg-slate-100 transition-colors"
                             >
                                 <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                 <span className="text-xs font-medium text-slate-600">
                                     Trial: <span className="text-slate-900 font-bold">{getDaysRemaining()} dní</span>
                                 </span>
                             </button>
                         )}
                         {activeScreen === 'dashboard' && (
                            <button onClick={() => setShowLogoutConfirm(true)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition">
                                <LogOut size={20}/>
                            </button>
                         )}
                     </div>
                 </div>
                 
                 <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-pb shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe-bottom">
                      <div className="flex overflow-x-auto no-scrollbar w-full">
                          {[
                              ...(isSuperAdmin ? [{ id: 'superadmin', label: 'ADMIN', icon: ShieldAlert }] : []),
                              { id: 'dashboard', label: 'Domov', icon: LayoutGrid },
                              { id: 'projects', label: 'Zákazky', icon: Building2 },
                              { id: 'attendance', label: 'Dochádzky', icon: FileCheck },
                              { id: 'diary', label: 'Denník práce', icon: BookOpen },
                              { id: 'finance', label: 'Financie', icon: PieChart, disabled: !hasAnalytics },
                              { id: 'analytics', label: 'Analytika', icon: BarChart3, disabled: !hasAnalytics },
                              { id: 'advances', label: 'Zálohy', icon: Banknote },
                              { id: 'calendar', label: 'Kalendár', icon: Calendar },
                              { id: 'team', label: 'Tím', icon: Users },
                              { id: 'updates', label: 'Aktualizácie', icon: RefreshCw },
                              { id: 'subscription', label: 'Predplatné', icon: CreditCard },
                              { id: 'settings', label: 'Nastavenia', icon: Settings },
                          ].map(item => (
                              <div key={item.id} className="relative">
                                  <button 
                                    onClick={() => {
                                        if (item.disabled) {
                                            handleNavigate(item.id);
                                        } else {
                                            setActiveScreen(item.id);
                                        }
                                    }} 
                                    className={`flex flex-col items-center justify-center min-w-[80px] flex-shrink-0 py-3 px-1 transition-colors ${activeScreen === item.id ? 'text-orange-600 bg-orange-50' : 'text-slate-400'}`}
                                  >
                                    <div className={activeScreen === item.id ? 'scale-110 transition-transform' : ''}>
                                        {item.disabled ? (
                                            <div className="relative">
                                                <item.icon size={24} className="opacity-40" />
                                                <Lock size={12} className="absolute -top-1 -right-1 text-orange-500" />
                                            </div>
                                        ) : <item.icon size={24}/>}
                                    </div>
                                    <span className="text-sm mt-1 font-medium truncate w-full text-center">{item.label}</span>
                                  </button>
                              </div>
                          ))}
                      </div>
                 </div>

                 <div className="p-4 md:p-8 max-w-7xl mx-auto w-full mb-3 md:mb-0">
                      {activeScreen === 'superadmin' && <SuperAdminScreen />}
                      {activeScreen === 'dashboard' && <DashboardScreen profile={profile} organization={organization} onNavigate={handleNavigate} />}
                      {activeScreen === 'projects' && <ProjectsScreen profile={profile} organization={organization} onSelect={setSelectedSiteId} selectedSiteId={selectedSiteId} initialAction={navigationAction?.screen === 'projects' ? navigationAction : null} onInitialActionHandled={() => setNavigationAction(null)} />}
                      {activeScreen === 'diary' && (
                        <DiaryScreen
                          profile={profile}
                          organization={organization}
                          selectedSiteId={selectedDiarySiteId}
                          onSelectedSiteChange={setSelectedDiarySiteId}
                        />
                      )}
                      {activeScreen === 'attendance' && <AttendanceScreen profile={profile} organization={organization} />}
                      {activeScreen === 'advances' && <AdvancesScreen profile={profile} />}
                      {activeScreen === 'finance' && (hasAnalytics ? <FinanceScreen profile={profile} /> : <UpgradeGate plan="GOLD" />)}
                      {activeScreen === 'analytics' && (hasAnalytics ? <AnalyticsScreen profile={profile} /> : <UpgradeGate plan="GOLD" />)}
                      {activeScreen === 'calendar' && <CalendarScreen profile={profile} onNavigate={handleNavigate} initialAction={navigationAction?.screen === 'calendar' ? navigationAction : null} onInitialActionHandled={() => setNavigationAction(null)} />}
                      {activeScreen === 'team' && <TeamScreen profile={profile} />}
                      {activeScreen === 'settings' && <SettingsScreen profile={profile} organization={organization} onUpdateOrg={setOrganization} onUpdateProfile={handleProfileUpdate} initialTab={initialSettingsTab} />}
                      {activeScreen === 'updates' && <UpdatesScreen />}
                      {activeScreen === 'subscription' && <SubscriptionScreen profile={profile} organization={organization} onSuccess={() => { fetchProfile(profile.id); setActiveScreen('dashboard'); }} onLogout={handleLogout} />}
                 </div>
                 
                 {activeScreen === 'dashboard' && (
                     <>
                        <SupportWidget profile={profile} organization={organization} />
                        {hasAI && <AIAssistantWidget profile={profile} organization={organization} />}
                    </>
                 )}
             </main>

             {updateAvailable && (
                <Modal title="Aktualizácia systému" onClose={updateStatus === 'idle' ? () => setUpdateAvailable(null) : undefined} maxWidth="max-w-sm">
                    <div className="text-center py-4">
                        {updateStatus === 'idle' ? (
                            <>
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm animate-bounce">
                                    <ArrowUpCircle size={32}/>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 text-center">Nová verzia v{updateAvailable}</h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed text-center">
                                    Váš systém MojaStavba horí nedočkavosťou na nové funkcie. Kliknite pre okamžitú aktualizáciu.
                                </p>
                                <div className="mt-6 flex flex-col gap-2">
                                    <Button fullWidth onClick={handleUpdateClick}>
                                        Aktualizovať teraz
                                    </Button>
                                    <button onClick={() => setUpdateAvailable(null)} className="text-[10px] font-black uppercase text-slate-400 p-2">Pripomenúť neskôr</button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6 py-4 animate-in fade-in">
                                <div className="flex justify-center relative">
                                    <Loader2 className="animate-spin text-orange-600" size={64} />
                                    <Download className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-400" size={24}/>
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-center">{updateStatus === 'downloading' ? 'Sťahujem nové prostredie...' : 'Aplikujem zmeny...'}</h3>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-1 text-center italic">Po dokončení sa appka sama reštartuje</p>
                                </div>
                                <div className="px-4">
                                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 shadow-inner p-0.5">
                                        <div 
                                            className="bg-orange-500 h-full transition-all duration-300 shadow-sm" 
                                            style={{ width: `${downloadProgress}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mt-2">{downloadProgress}%</div>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
             )}

             {showPwaUpdateNotice && (
                <Modal title="" onClose={() => setShowPwaUpdateNotice(false)} maxWidth="max-w-sm" hideHeader={true}>
                    <div className="relative p-6 text-center">
                        <button
                          onClick={() => setShowPwaUpdateNotice(false)}
                          className="absolute right-3 top-3 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        >
                          <X size={18} />
                        </button>
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-xl shadow-orange-100 ring-1 ring-orange-100">
                          <img src="/pwa-icon-192.png" alt="MojaStavba" className="h-10 w-10 object-contain" />
                        </div>
                        <h3 className="text-xl font-black tracking-tight text-slate-900">
                          Aplikácia bola automaticky aktualizovaná
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          Úprava vizuálnych prvkov pre mobilné zariadenia v sekcii Zákazky
                        </p>
                        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                          <ul className="space-y-3 text-sm font-medium leading-relaxed text-slate-700">
                            <li className="flex gap-2.5">
                              <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-orange-600" />
                              <span>Úprava vizuálnych prvkov pre mobilné zariadenia v sekcii Zákazky.</span>
                            </li>
                            <li className="flex gap-2.5">
                              <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-orange-600" />
                              <span>Optimalizácia rýchlosti prihlasovania do aplikácie pre zamestnancov.</span>
                            </li>
                          </ul>
                        </div>
                        <div className="mt-6">
                          <Button fullWidth onClick={() => setShowPwaUpdateNotice(false)}>
                            Rozumiem
                          </Button>
                        </div>
                    </div>
                </Modal>
             )}

             {showLegalModal && <LegalModal type={showLegalModal} onClose={() => setShowLegalModal(null)} />}
             
             <ConfirmModal 
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Odhlásiť sa?"
                message="Naozaj sa chcete odhlásiť z aplikácie?"
                confirmText="Odhlásiť"
                type="danger"
             />
        </div>
      );
  }

  return null;
};

const UpgradeGate = ({ plan }: { plan: string }) => (
    <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in duration-500">
        <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-orange-50">
            <Lock size={40} />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2">Funkcia je uzamknutá</h3>
        <p className="text-slate-500 text-center max-w-sm mb-8 font-medium">
            Pokročilá analytika a sledovanie nákupov sú dostupné od balíka <strong>{plan}</strong>.
        </p>
        <Button onClick={() => window.location.href = '?action=subscription'} className="px-10 h-14 uppercase tracking-widest font-black text-xs shadow-orange-200">
            Prejsť na výber balíka
        </Button>
    </div>
);
