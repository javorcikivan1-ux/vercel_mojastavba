
import React, { useState, useEffect } from 'react';
import { supabase, UserProfile } from './lib/supabase';
import { Button, ConfirmModal, LegalModal } from './components/UI';
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
import { SupportWidget } from './components/SupportWidget';
import { LandingScreen, LoginScreen } from './features/Auth';

import { 
  BarChart3, Building2, Calendar, Wallet, Users, LogOut, 
  ChevronRight, ChevronLeft, Clock, CreditCard, Settings, LayoutGrid, BookOpen, FileCheck, Loader2
} from 'lucide-react';

export const App = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [view, setView] = useState('landing'); 
  const [activeScreen, setActiveScreen] = useState('dashboard'); 
  const [loading, setLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); 
  const [initialSettingsTab, setInitialSettingsTab] = useState('general');
  const [showLegalModal, setShowLegalModal] = useState<'vop' | 'gdpr' | null>(null);
  const [initialLoginView, setInitialLoginView] = useState('login');
  const [workerTab, setWorkerTab] = useState('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
          setProfile(null);
          setOrganization(null);
          setView('landing');
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
      setLoading(true);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if(prof) {
          setProfile(prof);
          const { data: org } = await supabase.from('organizations').select('*').eq('id', prof.organization_id).single();
          setOrganization(org);
          setView('app');
          // Always land on dashboard after fetch to satisfy "vzdy dat do nastenky"
          setActiveScreen('dashboard');
      }
      setLoading(false);
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setView('landing');
      setProfile(null);
      setOrganization(null);
      setShowLogoutConfirm(false);
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
      setProfile(updatedProfile);
  };

  const handleNavigate = (screen: string, params?: any) => {
      if (screen === 'settings' && params?.tab) {
          setInitialSettingsTab(params.tab);
      }
      setActiveScreen(screen);
      setSelectedSiteId(null);
  };

  const isTrialExpired = () => {
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

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-orange-600" size={40}/></div>;

  if (view === 'landing') return (
    <LandingScreen 
      onStart={() => { setInitialLoginView('onboarding'); setView('login'); }} 
      onTryFree={() => { setInitialLoginView('onboarding'); setView('login'); }}
      onLogin={() => { setInitialLoginView('login'); setView('login'); }} 
      onWorker={() => { setInitialLoginView('register-emp'); setView('login'); }} 
      onSubscriptionClick={() => { 
          // Even if they click subscription from landing, we still take them to login first
          // then landing them on dashboard is now the global behavior in fetchProfile
          setInitialLoginView('login'); 
          setView('login'); 
      }}
    />
  );

  const inviteCompanyId = new URLSearchParams(window.location.search).get('companyId') || '';
  const effectiveInitialView = new URLSearchParams(window.location.search).get('action') === 'register-emp' ? 'register-emp' : initialLoginView;

  if (view === 'login') return (
      <LoginScreen 
        onLogin={() => {}} 
        initialView={effectiveInitialView}
        initialCompanyId={inviteCompanyId}
        onBackToLanding={() => setView('landing')}
      />
  );

  if (view === 'app' && profile && organization) {
      if (isTrialExpired() && activeScreen !== 'subscription') {
           return <SubscriptionScreen profile={profile} organization={organization} isExpiredProp={true} onSuccess={() => window.location.reload()} onLogout={handleLogout} />;
      }

      if(profile.role === 'employee') {
           return (
               <>
                <WorkerModeScreen profile={profile} onLogout={handleLogout} onTabChange={setWorkerTab} />
                {workerTab === 'dashboard' && <SupportWidget profile={profile} organization={organization} />}
               </>
           );
      }

      const AdminNavItem = ({ id, label, icon: Icon }: any) => (
        <button
          onClick={() => { setActiveScreen(id); setSelectedSiteId(null); }}
          title={isSidebarCollapsed ? label : ''}
          className={`group w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium relative shrink-0
            ${activeScreen === id
              ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }
            ${isSidebarCollapsed ? 'justify-center px-0' : ''}
            md:shrink
          `}
        >
          <div className={`${activeScreen === id ? 'scale-110 transition-transform' : ''}`}>
              <Icon
                size={24}
                className={`transition-colors shrink-0
                  ${activeScreen === id
                    ? 'text-orange-600'
                    : 'text-slate-400 group-hover:text-orange-600'
                  }`}
              />
          </div>
          {!isSidebarCollapsed && <span className="md:inline hidden">{label}</span>}
          <span className="md:hidden text-[10px] mt-1 font-medium truncate w-full text-center block">{label}</span>
        </button>
      );

      return (
        <div className="flex h-screen bg-slate-50 overflow-hidden pt-safe-top relative">
             <aside className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
                 <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} transition-all`}>
                     <div className="flex items-center gap-2.5">
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
                               <div className="text-xs text-slate-500 font-medium truncate">
                                 {organization.name}
                               </div>
                             </div>
                         )}
                     </div>
                 </div>

                 {organization.subscription_status !== 'active' && (
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

                 <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2 custom-scrollbar">
                    <AdminNavItem id="dashboard" label="Nástenka" icon={LayoutGrid} />
                    <AdminNavItem id="projects" label="Zákazky " icon={Building2} />
                    <AdminNavItem id="attendance" label="Dochádzky" icon={FileCheck} />
                    <AdminNavItem id="diary" label="Stavebný Denník" icon={BookOpen} />
                    <AdminNavItem id="calendar" label="Kalendár" icon={Calendar} />
                    <AdminNavItem id="team" label="Tím" icon={Users} />
                    <AdminNavItem id="analytics" label="Analytika" icon={BarChart3} />
                    <AdminNavItem id="settings" label="Nastavenia" icon={Settings} />
                    <AdminNavItem id="subscription" label="Predplatné" icon={CreditCard} />
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
                              <p className="text-xs text-slate-500 truncate">{profile.email}</p>
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

             <main className="flex-1 overflow-y-auto scroll-container relative flex flex-col w-full pb-24 md:pb-0">
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
                         {organization?.subscription_status !== 'active' && (
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
                              { id: 'dashboard', label: 'Domov', icon: LayoutGrid },
                              { id: 'projects', label: 'Stavby', icon: Building2 },
                              { id: 'attendance', label: 'Dochádzky', icon: FileCheck },
                              { id: 'diary', label: 'Denník', icon: BookOpen },
                              { id: 'calendar', label: 'Kalendár', icon: Calendar },
                              { id: 'team', label: 'Tím', icon: Users },
                              { id: 'analytics', label: 'Analytika', icon: BarChart3 },
                              { id: 'subscription', label: 'Pro', icon: CreditCard },
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
                      {activeScreen === 'dashboard' && <DashboardScreen profile={profile} organization={organization} onNavigate={handleNavigate} />}
                      {activeScreen === 'projects' && <ProjectsScreen profile={profile} organization={organization} onSelect={setSelectedSiteId} selectedSiteId={selectedSiteId} />}
                      {activeScreen === 'diary' && <DiaryScreen profile={profile} />}
                      {activeScreen === 'attendance' && <AttendanceScreen profile={profile} organization={organization} />}
                      {activeScreen === 'calendar' && <CalendarScreen profile={profile} onNavigate={handleNavigate} />}
                      {activeScreen === 'team' && <TeamScreen profile={profile} />}
                      {activeScreen === 'analytics' && <AnalyticsScreen profile={profile} />}
                      {activeScreen === 'settings' && <SettingsScreen profile={profile} organization={organization} onUpdateOrg={setOrganization} onUpdateProfile={handleProfileUpdate} initialTab={initialSettingsTab} />}
                      {activeScreen === 'subscription' && <SubscriptionScreen profile={profile} organization={organization} onSuccess={() => { fetchProfile(profile.id); setActiveScreen('dashboard'); }} onLogout={handleLogout} />}
                 </div>
                 
                 {activeScreen === 'dashboard' && <SupportWidget profile={profile} organization={organization} />}
             </main>

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
