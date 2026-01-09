
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

// Import verzie z package.json ako primárny fallback
import pkg from './package.json';

import { 
  BarChart3, Building2, Calendar, Wallet, Users, LogOut, 
  ChevronRight, ChevronLeft, Clock, CreditCard, Settings, LayoutGrid, BookOpen, FileCheck, Loader2, ShieldAlert, Banknote, TrendingUp, ChevronDown, PieChart, RefreshCw, Sparkles, ArrowUpCircle, WifiOff, Frown, Download
} from 'lucide-react';

import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const SUPER_ADMIN_EMAIL = 'javorcik.ivan1@gmail.com';
const GITHUB_REPO_URL = "https://api.github.com/repos/javorcikivan1-ux/vercel_mojastavba/releases/latest";

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

export const App = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [view, setView] = useState('loading');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [activeScreen, setActiveScreen] = useState(() => localStorage.getItem('ms_active_screen') || 'dashboard'); 
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(() => localStorage.getItem('ms_selected_site_id'));
  
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); 
  const [initialSettingsTab, setInitialSettingsTab] = useState('general');
  const [showLegalModal, setShowLegalModal] = useState<'vop' | 'gdpr' | null>(null);
  const [initialLoginView, setInitialLoginView] = useState('login');
  const [workerTab, setWorkerTab] = useState('dashboard');
  
  // Update state
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'downloading' | 'applying'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);

  const [isFinanceOpen, setIsFinanceOpen] = useState(() => {
    const active = localStorage.getItem('ms_active_screen');
    return active === 'finance' || active === 'analytics' || active === 'advances';
  });

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
    const isElectron = !Capacitor.isNativePlatform() && navigator.userAgent.toLowerCase().includes('electron');
    const isAndroid = Capacitor.getPlatform() === 'android';

    if (isElectron) {
      try {
        // @ts-ignore
        const { ipcRenderer } = window.require('electron');
        const handleUpdateStatus = (_: any, status: string, version?: string) => {
          if (status === 'available' && version && activeScreen !== 'settings') {
            setUpdateAvailable(version);
          }
        };
        ipcRenderer.on('update-status', handleUpdateStatus);
        return () => ipcRenderer.removeListener('update-status', handleUpdateStatus);
      } catch (e) { console.error("IPC update listener failed", e); }
    } 
    
    if (isAndroid) {
        const checkAndroidUpdate = async () => {
            try {
                let currentVersion = pkg.version;
                try {
                    const info = await CapApp.getInfo();
                    if (info.version && info.version !== "..." && info.version.trim() !== "") {
                        currentVersion = info.version.trim();
                    }
                } catch (e) {}
                
                const response = await fetch(`${GITHUB_REPO_URL}?t=${Date.now()}`);
                const data = await response.json();
                
                if (data && data.tag_name) {
                    const latestVersion = data.tag_name.replace(/[vV]/g, '').trim();
                    
                    if (latestVersion !== currentVersion && currentVersion !== "") {
                        if (activeScreen !== 'settings') {
                            setUpdateAvailable(latestVersion);
                        }
                    }
                }
            } catch (err) {
                console.error("Android version check failed", err);
            }
        };
        checkAndroidUpdate();
    }
  }, [activeScreen]); 

  const handleUpdateClick = async () => {
      const isAndroid = Capacitor.getPlatform() === 'android';
      if (isAndroid && updateAvailable) {
          try {
              setUpdateStatus('downloading');
              setDownloadProgress(10);

              // URL k ZIP súboru v GitHub Release
              const downloadUrl = `https://github.com/javorcikivan1-ux/vercel_mojastavba/releases/download/v${updateAvailable}/MojaStavba.zip`;
              
              setDownloadProgress(25);
              const version = await CapacitorUpdater.download({
                  url: downloadUrl,
                  version: updateAvailable,
              });

              setDownloadProgress(75);
              setUpdateStatus('applying');
              
              // Nastavenie novej verzie a automatický reštart
              await CapacitorUpdater.set(version);
              setDownloadProgress(100);
          } catch (e: any) {
              console.error("OTA Update failed", e);
              // Fallback ak zlyhá automatika - otvoríme web pre manuálny download APK
              const releasesUrl = "https://github.com/javorcikivan1-ux/instalacky_mojastavba/releases/latest";
              try {
                  await Browser.open({ url: releasesUrl });
              } catch (browserErr) {
                  window.open(releasesUrl, '_blank');
              }
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
  }, [activeScreen]);

  useEffect(() => {
    if (selectedSiteId) {
      localStorage.setItem('ms_selected_site_id', selectedSiteId);
    } else {
      localStorage.removeItem('ms_selected_site_id');
    }
  }, [selectedSiteId]);

  useEffect(() => {
    if (Capacitor.isNativePlatform() && profile && profile.role === 'admin') {
      const initBackListener = async () => {
        const handler = await CapApp.addListener('backButton', () => {
          if (selectedSiteId) {
            setSelectedSiteId(null);
          } else if (activeScreen !== 'dashboard') {
            setActiveScreen('dashboard');
          } else {
            CapApp.exitApp();
          }
        });
        return handler;
      };

      const listenerPromise = initBackListener();
      return () => {
        listenerPromise.then(h => h.remove());
      };
    }
  }, [selectedSiteId, activeScreen, profile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
          setView('landing');
          setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
          const isSilentFetch = !!profile; 
          fetchProfile(session.user.id, isSilentFetch);
      }
      else {
          setProfile(null);
          setOrganization(null);
          setView('landing');
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [profile?.id]);

  const fetchProfile = async (userId: string, silent = false) => {
      if (!silent) setLoading(true);
      
      try {
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single();
          if(prof) {
              setProfile(prof);
              const { data: org } = await supabase.from('organizations').select('*').eq('id', prof.organization_id).single();
              setOrganization(org);
              setView('app');
          } else {
              setView('landing');
          }
      } catch (e) {
          console.error("Fetch profile failed", e);
          setView('landing');
      } finally {
          if (!silent) setLoading(false);
      }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setView('landing');
      setProfile(null);
      setOrganization(null);
      setShowLogoutConfirm(false);
      localStorage.removeItem('ms_active_screen');
      localStorage.removeItem('ms_selected_site_id');
  };

  const handleNavigate = (screen: string, params?: any) => {
      if (screen === 'settings' && params?.tab) {
          setInitialSettingsTab(params.tab);
      }
      setActiveScreen(screen);
      setSelectedSiteId(null);
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

  if (loading && !profile) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-orange-600" size={40}/></div>;

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
                <WorkerModeScreen profile={profile} onLogout={handleLogout} onTabChange={setWorkerTab} />
                {workerTab === 'dashboard' && (
                    <>
                        <SupportWidget profile={profile} organization={organization} />
                        <AIAssistantWidget profile={profile} organization={organization} />
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
                                        Vydali sme novú aktualizáciu MojaStavba. Aktualizujte teraz pre najnovšie funkcie a opravy.
                                    </p>
                                    <div className="mt-6 flex flex-col gap-2">
                                        <Button fullWidth onClick={handleUpdateClick}>
                                            Aktualizovať teraz (OTA)
                                        </Button>
                                        <button onClick={() => setUpdateAvailable(null)} className="text-[10px] font-black uppercase text-slate-400 p-2">Pripomenúť neskôr</button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6 py-4 animate-in fade-in">
                                    <Loader2 className="animate-spin text-orange-600 mx-auto" size={48} />
                                    <div>
                                        <h3 className="font-black text-slate-900">{updateStatus === 'downloading' ? 'Sťahujem nové prostredie...' : 'Aplikujem zmeny...'}</h3>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Aplikácia sa po dokončení sama reštartuje</p>
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

      const AdminNavItem = ({ id, label, icon: Icon, color = "text-orange-600", isSubItem = false }: any) => (
        <button
          onClick={() => { setActiveScreen(id); setSelectedSiteId(null); }}
          title={isSidebarCollapsed ? label : ''}
          className={`group w-full flex items-center gap-3 rounded-xl transition-all font-bold relative shrink-0
            ${activeScreen === id
              ? (isSubItem ? 'bg-orange-100/50 text-orange-800' : 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100')
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }
            ${isSidebarCollapsed ? 'justify-center px-0 py-3' : (isSubItem ? 'px-4 py-2 ml-2 w-[calc(100%-8px)]' : 'px-4 py-2.5')}
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
          <span className="md:hidden text-[10px] mt-1 font-medium truncate w-full text-center block">{label}</span>
        </button>
      );

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
                         <div className="min-w-0 transition-opacity duration-300">
                           <div className="font-extrabold text-xl tracking-tight text-slate-800">
                             Moja<span className="text-orange-600">Stavba</span>
                           </div>
                           <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                             {organization.name}
                           </div>
                         </div>
                     )}
                 </div>

                 {organization.subscription_status !== 'active' && profile?.email !== SUPER_ADMIN_EMAIL && profile?.role !== 'admin' && (
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
                    <AdminNavItem id="diary" label="Stavebný Denník" icon={BookOpen} />
                    <AdminNavItem id="calendar" label="Kalendár" icon={Calendar} />
                    <AdminNavItem id="team" label="Tím" icon={Users} />
                    
                    <div className="pt-2">
                        <button
                            onClick={() => setIsFinanceOpen(!isFinanceOpen)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all font-bold text-sm
                                ${(['finance', 'analytics', 'advances'].includes(activeScreen) && !isFinanceOpen) ? 'bg-orange-50 text-orange-700' : 'text-slate-500 hover:bg-slate-50'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <Wallet size={22} className={['finance', 'analytics', 'advances'].includes(activeScreen) ? 'text-orange-600' : 'text-slate-400'} />
                                {!isSidebarCollapsed && <span>Financie</span>}
                            </div>
                            {!isSidebarCollapsed && (
                                <ChevronDown size={16} className={`transition-transform duration-300 ${isFinanceOpen ? 'rotate-180' : ''}`} />
                            )}
                        </button>
                        
                        {(isFinanceOpen && !isSidebarCollapsed) && (
                            <div className="mt-1 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                                <AdminNavItem id="finance" label="Firemná analytika" icon={PieChart} isSubItem={true} />
                                <AdminNavItem id="analytics" label="Analytika zákaziek" icon={BarChart3} isSubItem={true} />
                                <AdminNavItem id="advances" label="Zálohy" icon={Banknote} isSubItem={true} />
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <AdminNavItem id="settings" label="Nastavenia" icon={Settings} />
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

             <main className="flex-1 overflow-y-auto scroll-container relative flex flex-col w-full pb-24 md:mb-0">
                 <div className="md:hidden bg-white border-b border-slate-200 p-3 px-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
                     <div className="font-bold text-slate-900 flex items-center gap-2">
                        <img 
                          src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" 
                          alt="Logo" 
                          className="w-7 h-7 object-contain" 
                        />
                        <span className="text-lg tracking-tight">Moja<span className="text-orange-600">Stavba</span></span>
                     </div>

                     <div className="flex items-center gap-3">
                         {isSuperAdmin && (
                             <button onClick={() => setActiveScreen('superadmin')} className="text-red-600 p-1"><ShieldAlert size={20}/></button>
                         )}
                         {organization?.subscription_status !== 'active' && profile?.email !== SUPER_ADMIN_EMAIL && profile?.role !== 'admin' && (
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
                              { id: 'projects', label: 'Stavby', icon: Building2 },
                              { id: 'attendance', label: 'Dochádzky', icon: FileCheck },
                              { id: 'diary', label: 'Denník', icon: BookOpen },
                              { id: 'finance', label: 'Firemná analytika', icon: PieChart },
                              { id: 'analytics', label: 'Analytika zákaziek', icon: BarChart3 },
                              { id: 'advances', label: 'Zálohy', icon: Banknote },
                              { id: 'calendar', label: 'Kalendár', icon: Calendar },
                              { id: 'team', label: 'Tím', icon: Users },
                              { id: 'settings', label: 'Nastavenia', icon: Settings },
                          ].map(item => (
                              <button 
                                key={item.id}
                                onClick={() => setActiveScreen(item.id)} 
                                className={`flex flex-col items-center justify-center min-w-[80px] flex-shrink-0 py-3 px-1 transition-colors ${activeScreen === item.id ? 'text-orange-600 bg-orange-50' : 'text-slate-400'}`}
                              >
                                <div className={activeScreen === item.id ? 'scale-110 transition-transform' : ''}><item.icon size={24}/></div>
                                <span className="text-[10px] mt-1 font-medium truncate w-full text-center">{item.label}</span>
                              </button>
                          ))}
                      </div>
                 </div>

                 <div className="p-4 md:p-8 max-w-7xl mx-auto w-full mb-20 md:mb-0">
                      {activeScreen === 'superadmin' && <SuperAdminScreen />}
                      {activeScreen === 'dashboard' && <DashboardScreen profile={profile} organization={organization} onNavigate={handleNavigate} />}
                      {activeScreen === 'projects' && <ProjectsScreen profile={profile} organization={organization} onSelect={setSelectedSiteId} selectedSiteId={selectedSiteId} />}
                      {activeScreen === 'diary' && <DiaryScreen profile={profile} organization={organization} />}
                      {activeScreen === 'attendance' && <AttendanceScreen profile={profile} organization={organization} />}
                      {activeScreen === 'advances' && <AdvancesScreen profile={profile} />}
                      {activeScreen === 'finance' && <FinanceScreen profile={profile} />}
                      {activeScreen === 'calendar' && <CalendarScreen profile={profile} onNavigate={handleNavigate} />}
                      {activeScreen === 'team' && <TeamScreen profile={profile} />}
                      {activeScreen === 'analytics' && <AnalyticsScreen profile={profile} />}
                      {activeScreen === 'settings' && <SettingsScreen profile={profile} organization={organization} onUpdateOrg={setOrganization} onUpdateProfile={handleProfileUpdate} initialTab={initialSettingsTab} />}
                      {activeScreen === 'subscription' && <SubscriptionScreen profile={profile} organization={organization} onSuccess={() => { fetchProfile(profile.id); setActiveScreen('dashboard'); }} onLogout={handleLogout} />}
                 </div>
                 
                 {activeScreen === 'dashboard' && (
                     <>
                        <SupportWidget profile={profile} organization={organization} />
                        <AIAssistantWidget profile={profile} organization={organization} />
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
                                <h3 className="text-lg font-black text-slate-900">Dostupná verzia v{updateAvailable}</h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                    Vydali sme novú verziu aplikácie MojaStavba. Aktualizujte teraz pre najnovšie funkcie a opravy.
                                </p>
                                <div className="mt-6 flex flex-col gap-2">
                                    <Button fullWidth onClick={handleUpdateClick}>
                                        Aktualizovať teraz (OTA)
                                    </Button>
                                    <button onClick={() => setUpdateAvailable(null)} className="text-[10px] font-black uppercase text-slate-400 p-2">Pripomenúť neskôr</button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6 py-4 animate-in fade-in">
                                <Loader2 className="animate-spin text-orange-600 mx-auto" size={48} />
                                <div>
                                    <h3 className="font-black text-slate-900">{updateStatus === 'downloading' ? 'Sťahujem nové prostredie...' : 'Aplikujem zmeny...'}</h3>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Aplikácia sa po dokončení sama reštartuje</p>
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
