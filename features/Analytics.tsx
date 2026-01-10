
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Modal, Button } from '../components/UI';
import { formatMoney, formatDuration } from '../lib/utils';
import { 
    TrendingUp, Wallet, BarChart3, 
    Users, Clock, HardHat, Package, Loader2, 
    Search, ArrowRight, Sparkles, TrendingDown, Calendar, Target,
    LineChart, Activity
} from 'lucide-react';

const LAST_ANALYTICS_SITE_KEY = 'mojastavba_last_analytics_site';

type ChartMode = 'monthly' | 'cumulative';

// Pomocná funkcia na bezpečné formátovanie dátumu bez posunu časového pásma
const getLocalDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getLocalMonthString = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
};

export const AnalyticsScreen = ({ profile }: any) => {
  const [dataLoading, setDataLoading] = useState(true);
  const [viewType, setViewType] = useState<'global' | 'project'>('global');
  const [chartMode, setChartMode] = useState<ChartMode>('cumulative');
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [searchSiteQuery, setSearchSiteQuery] = useState('');
  
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [laborBreakdown, setLaborBreakdown] = useState<any[]>([]);
  const [organization, setOrganization] = useState<any>(null);
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => {
    loadSitesAndOrg();
  }, [profile]);

  const loadSitesAndOrg = async () => {
    const [sitesRes, orgRes] = await Promise.all([
      supabase.from('sites')
        .select('id, name, budget, status, created_at')
        .eq('organization_id', profile.organization_id)
        .order('status', { ascending: true }),
      supabase.from('organizations')
        .select('created_at')
        .eq('id', profile.organization_id)
        .single()
    ]);
    
    if (orgRes.data) setOrganization(orgRes.data);

    if (sitesRes.data) {
      setSites(sitesRes.data);
      const savedId = localStorage.getItem(LAST_ANALYTICS_SITE_KEY);
      const exists = sitesRes.data.find(s => s.id === savedId);
      const defaultId = exists ? exists.id : (sitesRes.data[0]?.id || '');
      setSelectedSiteId(defaultId);
      setSearchSiteQuery(sitesRes.data.find(s => s.id === defaultId)?.name || '');
    }
  };

  useEffect(() => {
    if (viewType === 'global') {
        setChartMode('monthly');
        loadGlobalAnalytics();
    } else if (selectedSiteId) {
        localStorage.setItem(LAST_ANALYTICS_SITE_KEY, selectedSiteId);
        loadProjectAnalytics(selectedSiteId);
    }
  }, [viewType, selectedSiteId, chartMode, organization]);

  const loadGlobalAnalytics = async () => {
      setDataLoading(true);
      
      const [transRes, logsRes, materialsRes, fuelRes] = await Promise.all([
          // Načítame len transakcie so stavbou
          supabase.from('transactions').select('*').eq('organization_id', profile.organization_id).not('site_id', 'is', null),
          supabase.from('attendance_logs').select('*, profiles(hourly_rate)').eq('organization_id', profile.organization_id).not('site_id', 'is', null),
          supabase.from('materials').select('*').eq('organization_id', profile.organization_id).not('site_id', 'is', null),
          supabase.from('fuel_logs').select('*').eq('organization_id', profile.organization_id).not('site_id', 'is', null)
      ]);

      const transactions = transRes.data || [];
      const logs = logsRes.data || [];
      const materials = materialsRes.data || [];
      const fuels = fuelRes.data || [];

      const income = transactions.filter(t => t.type === 'invoice').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const matCost = materials.reduce((s, m) => s + Number(m.total_price), 0);
      const fuelCost = fuels.reduce((s, f) => s + Number(f.amount), 0);
      
      const laborCost = logs.reduce((s, l: any) => {
          if (l.payment_type === 'fixed') {
              return s + Number(l.fixed_amount || 0);
          }
          return s + (Number(l.hours) * (l.hourly_rate_snapshot || l.profiles?.hourly_rate || 0));
      }, 0);
      
      const totalCost = expenses + matCost + laborCost + fuelCost;

      // Zistenie štartu (najstarší záznam alebo vznik firmy)
      const allDates = [
          ...transactions.map(t => t.date),
          ...logs.map(l => l.date),
          ...materials.map(m => m.purchase_date),
          ...fuels.map(f => f.date)
      ].filter(Boolean).sort();

      let startOfHistory: Date;
      if (allDates.length > 0) {
          startOfHistory = new Date(allDates[0]);
      } else {
          startOfHistory = organization?.created_at ? new Date(organization.created_at) : new Date();
      }
      
      const months = [];
      const now = new Date();
      let current = new Date(startOfHistory.getFullYear(), startOfHistory.getMonth(), 1);

      if (allDates.length === 0) {
          months.push({ label: now.toLocaleDateString('sk-SK', { month: 'short' }), income: 0, cost: 0 });
      } else {
          while (current <= now) {
              const monthKey = getLocalMonthString(current);
              
              const mInc = transactions.filter(t => t.date.substring(0, 7) === monthKey && t.type === 'invoice').reduce((s,t) => s + Number(t.amount), 0);
              const mExp = transactions.filter(t => t.date.substring(0, 7) === monthKey && t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0);
              const mMat = materials.filter(m => m.purchase_date && m.purchase_date.substring(0, 7) === monthKey).reduce((s,m) => s + Number(m.total_price), 0);
              const mFuel = fuels.filter(f => f.date && f.date.substring(0, 7) === monthKey).reduce((s,f) => s + Number(f.amount), 0);
              
              const mLabor = logs.filter(l => l.date.substring(0, 7) === monthKey).reduce((s, l: any) => {
                  if (l.payment_type === 'fixed') {
                      return s + Number(l.fixed_amount || 0);
                  }
                  return s + (Number(l.hours) * (l.hourly_rate_snapshot || l.profiles?.hourly_rate || 0));
              }, 0);

              months.push({
                  label: current.toLocaleDateString('sk-SK', { month: 'short' }),
                  income: mInc,
                  cost: mExp + mMat + mLabor + mFuel
              });
              current.setMonth(current.getMonth() + 1);
          }
      }

      setChartData(months);
      setAnalyticsData({
          income, totalCost, laborCost, matCost, otherCost: expenses + fuelCost,
          profit: income - totalCost,
          margin: income > 0 ? ((income - totalCost) / income) * 100 : 0,
          totalHours: logs.reduce((s, l) => s + Number(l.hours), 0)
      });
      setDataLoading(false);
  };

  const loadProjectAnalytics = async (siteId: string) => {
      setDataLoading(true);
      
      const [transRes, logsRes, materialsRes, fuelRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('site_id', siteId),
          supabase.from('attendance_logs').select('*, profiles(full_name, hourly_rate)').eq('site_id', siteId),
          supabase.from('materials').select('*').eq('site_id', siteId),
          supabase.from('fuel_logs').select('*').eq('site_id', siteId)
      ]);

      const transactions = transRes.data || [];
      const logs = logsRes.data || [];
      const materials = materialsRes.data || [];
      const fuels = fuelRes.data || [];
      const site = sites.find(s => s.id === siteId);

      const income = transactions.filter(t => t.type === 'invoice').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const matCost = materials.reduce((s, m) => s + Number(m.total_price), 0);
      const fuelCost = fuels.reduce((s, f) => s + Number(f.amount), 0);
      
      const laborCost = logs.reduce((s, l: any) => {
          if (l.payment_type === 'fixed') {
              return s + Number(l.fixed_amount || 0);
          }
          return s + (Number(l.hours) * (l.hourly_rate_snapshot || l.profiles?.hourly_rate || 0));
      }, 0);

      const totalCost = expenses + matCost + laborCost + fuelCost;

      const dataPoints: any[] = [];
      
      const siteStartStr = [...transactions.map(t=>t.date), ...logs.map(l=>l.date), ...materials.map(m=>m.purchase_date), ...fuels.map(f=>f.date)].filter(Boolean).sort()[0] || site?.created_at;
            
      const startDate = siteStartStr ? new Date(siteStartStr) : new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      if (chartMode === 'cumulative') {
          let current = new Date(startDate);
          let runningIncome = 0;
          let runningCost = 0;

          while (current <= endDate) {
              const dayStr = getLocalDateString(current);
              const dayInc = transactions.filter(t => t.date === dayStr && t.type === 'invoice').reduce((s,t) => s + Number(t.amount), 0);
              const dayExp = transactions.filter(t => t.date === dayStr && t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0);
              const dayMat = materials.filter(m => m.purchase_date === dayStr).reduce((s,m) => s + Number(m.total_price), 0);
              const dayFuel = fuels.filter(f => f.date === dayStr).reduce((s,f) => s + Number(f.amount), 0);
              
              const dayLabor = logs.filter(l => l.date === dayStr).reduce((s, l: any) => {
                  if (l.payment_type === 'fixed') {
                      return s + Number(l.fixed_amount || 0);
                  }
                  return s + (Number(l.hours) * (l.hourly_rate_snapshot || l.profiles?.hourly_rate || 0));
              }, 0);

              runningIncome += dayInc;
              runningCost += (dayExp + dayMat + dayLabor + dayFuel);

              dataPoints.push({
                  label: current.getDate() + '.' + (current.getMonth() + 1) + '.',
                  income: runningIncome,
                  cost: runningCost,
                  isDaily: true
              });
              current.setDate(current.getDate() + 1);
          }
          
          const maxPoints = 25;
          if (dataPoints.length > maxPoints) {
              const step = Math.ceil(dataPoints.length / maxPoints);
              setChartData(dataPoints.filter((_, i) => i % step === 0 || i === dataPoints.length - 1));
          } else {
              setChartData(dataPoints);
          }
      } else {
          let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          while (current <= endDate) {
              const monthKey = getLocalMonthString(current);
              const mInc = transactions.filter(t => t.date.substring(0, 7) === monthKey && t.type === 'invoice').reduce((s,t) => s + Number(t.amount), 0);
              const mExp = transactions.filter(t => t.date.substring(0, 7) === monthKey && t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0);
              const mMat = materials.filter(m => m.purchase_date && m.purchase_date.substring(0, 7) === monthKey).reduce((s,m) => s + Number(m.total_price), 0);
              const mFuel = fuels.filter(f => f.date && f.date.substring(0, 7) === monthKey).reduce((s,f) => s + Number(f.amount), 0);
              
              const mLabor = logs.filter(l => l.date.substring(0, 7) === monthKey).reduce((s, l: any) => {
                  if (l.payment_type === 'fixed') {
                      return s + Number(l.fixed_amount || 0);
                  }
                  return s + (Number(l.hours) * (l.hourly_rate_snapshot || l.profiles?.hourly_rate || 0));
              }, 0);
              
              dataPoints.push({ 
                label: current.toLocaleDateString('sk-SK', { month: 'short' }), 
                income: mInc, 
                cost: mExp + mMat + mLabor + mFuel 
              });
              current.setMonth(current.getMonth() + 1);
          }
          setChartData(dataPoints);
      }

      setAnalyticsData({
          site, income, totalCost, laborCost, matCost, otherCost: expenses + fuelCost,
          profit: income - totalCost,
          margin: income > 0 ? ((income - totalCost) / income) * 100 : 0,
          totalHours: logs.reduce((s, l) => s + Number(l.hours), 0)
      });

      const workerMap = logs.reduce((acc: any, log: any) => {
          const name = log.profiles?.full_name || 'Neznámy';
          if (!acc[name]) acc[name] = { hours: 0, cost: 0 };
          const rate = log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0;
          const entryCost = log.payment_type === 'fixed' ? Number(log.fixed_amount || 0) : (Number(log.hours) * rate);
          acc[name].hours += Number(log.hours);
          acc[name].cost += entryCost;
          return acc;
      }, {});

      setLaborBreakdown(Object.entries(workerMap).map(([name, data]: any) => ({ name, ...data })).sort((a, b) => b.hours - a.hours));
      setDataLoading(false);
  };

  const currentSite = useMemo(() => sites.find(s => s.id === selectedSiteId), [sites, selectedSiteId]);

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-1 md:px-0">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
         <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <BarChart3 className="text-orange-600" size={28} />
                Analytika zákaziek
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Finančná výkonnosť projektov (bez všeobecnej réžie)</p>
         </div>

         <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
             <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner border border-slate-200 w-fit">
                 <button 
                    onClick={() => setViewType('global')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'global' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                     Všetky stavby
                 </button>
                 <button 
                    onClick={() => setViewType('project')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'project' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                     Jeden projekt
                 </button>
             </div>

             {viewType === 'project' && (
                 <div className="relative w-full sm:w-64">
                    <input 
                        type="text" 
                        placeholder="Hľadať projekt..."
                        value={searchSiteQuery}
                        onChange={(e) => setSearchSiteQuery(e.target.value)}
                        onFocus={() => { if(searchSiteQuery === currentSite?.name) setSearchSiteQuery(''); }}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-orange-500 shadow-sm pr-10 transition-all"
                    />
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"/>
                    
                    {searchSiteQuery !== (currentSite?.name || '') && searchSiteQuery.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto custom-scrollbar">
                            {sites.filter(s => s.name.toLowerCase().includes(searchSiteQuery.toLowerCase())).map(s => (
                                <button key={s.id} onClick={() => { setSelectedSiteId(s.id); setSearchSiteQuery(s.name); }} className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-50 flex items-center justify-between group transition">
                                    <div>
                                        <div className="font-bold text-slate-800 group-hover:text-orange-600 text-sm">{s.name}</div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{s.status === 'completed' ? 'Archív' : 'Aktívny'}</div>
                                    </div>
                                    <ArrowRight size={14} className="text-slate-200 group-hover:text-orange-500 transition"/>
                                </button>
                            ))}
                        </div>
                    )}
                 </div>
             )}
         </div>
      </div>

      <div className="relative">
          {dataLoading && (
              <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                  <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3">
                      <Loader2 className="animate-spin text-orange-50" size={20}/>
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Prepočítavam...</span>
                  </div>
              </div>
          )}

          <div className={`transition-all duration-300 ${dataLoading ? 'opacity-40 grayscale-[0.3]' : 'opacity-100'}`}>
              {analyticsData ? (
                  <div className="space-y-6">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <Card className="border-slate-100 p-4 flex flex-col justify-between shadow-sm">
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                    <TrendingUp size={10} className="text-green-500"/> Čistý zisk stavieb
                                </div>
                                <div className={`text-xl md:text-2xl font-black tracking-tight ${analyticsData.profit >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                                    {formatMoney(analyticsData.profit)}
                                </div>
                              </div>
                              <div className="mt-3">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${analyticsData.profit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                       MARŽA {analyticsData.margin.toFixed(1)}%
                                  </span>
                              </div>
                          </Card>

                          <Card className="border-slate-100 p-4 flex flex-col justify-between shadow-sm">
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><TrendingDown size={10} className="text-red-500"/> Priame náklady</div>
                                <div className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{formatMoney(analyticsData.totalCost)}</div>
                              </div>
                              <div className="mt-3 text-[9px] font-bold text-slate-400 uppercase">
                                  Bez všeobecnej réžie
                              </div>
                          </Card>

                          <Card className="border-slate-100 p-4 flex flex-col justify-between shadow-sm">
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Clock size={10} className="text-blue-500"/> Odpracované</div>
                                <div className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{analyticsData.totalHours.toFixed(1)} <span className="text-sm font-medium text-slate-300">h</span></div>
                              </div>
                              <div className="mt-3">
                                <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-orange-400 h-full w-[72%] rounded-full shadow-[0_0_8px_rgba(251,146,60,0.3)]"></div>
                                </div>
                              </div>
                          </Card>

                          <Card className="border-slate-100 p-4 flex flex-col justify-between shadow-sm">
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Wallet size={10} className="text-indigo-500"/> Mzdový náklad</div>
                                <div className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{formatMoney(analyticsData.laborCost)}</div>
                              </div>
                              <div className="mt-3 text-[9px] text-slate-400 font-bold">
                                  {((analyticsData.laborCost / (analyticsData.totalCost || 1)) * 100).toFixed(0)}% Z NÁKLADOV
                              </div>
                          </Card>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <Card className="lg:col-span-2 border-slate-100 p-5 md:p-6 shadow-sm">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                                  <div>
                                      <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                         {chartMode === 'cumulative' ? <LineChart className="text-orange-500" size={16}/> : <BarChart3 className="text-orange-500" size={16}/>}
                                         {viewType === 'global' ? 'Výkonnosť všetkých stavieb' : 'Analýza projektu'}
                                      </h3>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 flex items-center gap-1 tracking-tight">
                                          {chartMode === 'cumulative' ? 'Kumulatívny priebeh projektov' : 'Mesačné sumáre transakcií na stavbách'}
                                      </p>
                                  </div>
                                  
                                  <div className="flex items-center gap-3">
                                      <div className="bg-slate-50 p-1 rounded-lg flex border border-slate-200">
                                          <button 
                                            onClick={() => setChartMode('cumulative')}
                                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition ${chartMode === 'cumulative' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}
                                          >Kumulatívny</button>
                                          <button 
                                            onClick={() => setChartMode('monthly')}
                                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition ${chartMode === 'monthly' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}
                                          >Mesačný</button>
                                      </div>
                                      <div className="hidden sm:flex gap-4">
                                          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-slate-800 rounded-sm"></div><span className="text-[9px] font-bold text-slate-400 uppercase">Príjmy</span></div>
                                          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-orange-400 rounded-sm"></div><span className="text-[9px] font-bold text-slate-400 uppercase">Náklady</span></div>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="h-64 md:h-72 flex items-end justify-between gap-1.5 md:gap-3 px-1">
                                  {chartData.length === 0 ? (
                                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase italic">Zatiaľ žiadne projektové dáta.</div>
                                  ) : chartData.map((m, i) => {
                                      const max = Math.max(...chartData.map(x => Math.max(x.income, x.cost)), 100);
                                      return (
                                          <div key={i} className="flex-1 flex flex-col justify-end gap-2 h-full group relative">
                                              <div className="flex gap-0.5 md:gap-1 items-end justify-center h-full">
                                                  <div 
                                                      className={`w-full max-w-[14px] md:max-w-[20px] bg-slate-800 rounded-t-sm transition-all duration-1000 group-hover:bg-slate-700 relative shadow-sm ${chartMode === 'cumulative' ? 'opacity-80' : ''}`} 
                                                      style={{ height: `${Math.max(2, (m.income / max) * 100)}%` }}
                                                  >
                                                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-20 pointer-events-none border border-slate-700">
                                                          {formatMoney(m.income)}
                                                      </div>
                                                  </div>
                                                  <div 
                                                      className="w-full max-w-[14px] md:max-w-[20px] bg-orange-400 rounded-t-sm transition-all duration-1000 group-hover:bg-orange-300 relative shadow-sm" 
                                                      style={{ height: `${Math.max(2, (m.cost / max) * 100)}%` }}
                                                  >
                                                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[9px] px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-20 pointer-events-none border border-orange-400">
                                                          {formatMoney(m.cost)}
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className="text-[8px] md:text-[9px] font-black text-slate-400 text-center mt-1 uppercase tracking-tighter truncate w-full group-hover:text-orange-500 transition-colors">{m.label}</div>
                                          </div>
                                      )
                                  })}
                              </div>
                          </Card>

                          <div className="space-y-6">
                              {viewType === 'project' && analyticsData.site?.budget > 0 && (
                                  <Card className="border-slate-100 p-5 bg-white shadow-sm">
                                      <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Target size={12} className="text-orange-500"/> Stav k rozpočtu</h3>
                                      <div className="space-y-4">
                                          <div className="flex justify-between items-end">
                                              <div className="text-2xl font-black text-slate-800">{((analyticsData.totalCost / analyticsData.site.budget) * 100).toFixed(1)}%</div>
                                              <div className="text-right">
                                                  <div className="text-[9px] font-bold text-slate-400 uppercase">Rozpočet</div>
                                                  <div className="text-xs font-black text-slate-600">{formatMoney(analyticsData.site.budget)}</div>
                                              </div>
                                          </div>
                                          <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden border border-slate-100 p-0.5 shadow-inner">
                                              <div 
                                                className={`h-full rounded-full transition-all duration-[1500ms] ${analyticsData.totalCost > analyticsData.site.budget ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]' : 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.2)]'}`} 
                                                style={{ width: `${Math.min(100, (analyticsData.totalCost / analyticsData.site.budget) * 100)}%` }}
                                              ></div>
                                          </div>
                                          <p className="text-[10px] text-slate-400 font-medium italic leading-tight">
                                              {analyticsData.totalCost > analyticsData.site.budget ? 'Pozor: Náklady prekročili plán!' : 'Ostáva ' + formatMoney(analyticsData.site.budget - analyticsData.totalCost) + ' do limitu.'}
                                          </p>
                                      </div>
                                  </Card>
                              )}

                              <Card className="border-slate-100 p-5 shadow-sm bg-white">
                                  <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Activity size={12} className="text-indigo-500"/> Skladba projektových nákladov</h3>
                                  <div className="space-y-5">
                                      {[
                                          { label: 'Mzdy a Práca', val: analyticsData.laborCost, color: 'bg-indigo-500', icon: Users },
                                          { label: 'Materiál', val: analyticsData.matCost, color: 'bg-orange-500', icon: Package },
                                          { label: 'Ostatné (PHM, Réžia stavby)', val: analyticsData.otherCost, color: 'bg-slate-300', icon: Wallet }
                                      ].map(item => (
                                          <div key={item.label} className="group">
                                              <div className="flex justify-between items-end mb-1.5">
                                                  <div className="flex items-center gap-2">
                                                      <div className={`p-1 rounded-md ${item.color} text-white shadow-sm`}><item.icon size={10}/></div>
                                                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{item.label}</span>
                                                  </div>
                                                  <span className="text-[10px] font-black text-slate-400">{((item.val / (analyticsData.totalCost || 1)) * 100).toFixed(1)}%</span>
                                              </div>
                                              <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                                                  <div className={`${item.color} h-full transition-all duration-1000`} style={{ width: `${(item.val / (analyticsData.totalCost || 1)) * 100}%` }}></div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </Card>
                          </div>
                      </div>

                      <Card className="p-0 overflow-hidden border-slate-100 shadow-sm bg-white">
                        <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/20">
                            <div>
                                <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <HardHat className="text-indigo-500" size={18}/> Výkon Pracovníkov na projektoch
                                </h3>
                            </div>
                            <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 text-[10px] font-black uppercase text-slate-500 shadow-sm flex items-center gap-2">
                                <Clock size={12} className="text-orange-500"/> SPOLU {analyticsData.totalHours.toFixed(1)} h
                            </div>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-sm text-left min-w-[500px]">
                                <thead className="bg-white text-slate-400 font-bold text-[9px] uppercase border-b border-slate-50 tracking-[0.15em]">
                                    <tr>
                                        <th className="p-5">Meno</th>
                                        <th className="p-5 text-center">Čas</th>
                                        <th className="p-5 text-right">Mzdový náklad</th>
                                        <th className="p-5 text-right">Podiel</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {laborBreakdown.map((worker) => (
                                        <tr key={worker.name} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs border border-slate-200 shadow-inner group-hover:bg-white transition-colors">
                                                        {worker.name.charAt(0)}
                                                    </div>
                                                    <span className="font-extrabold text-slate-700">{worker.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-center font-mono font-bold text-slate-500 text-xs">{formatDuration(worker.hours)}</td>
                                            <td className="p-5 text-right font-black text-slate-800">{formatMoney(worker.cost)}</td>
                                            <td className="p-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-[10px] font-black text-slate-400">{((worker.cost / (analyticsData.laborCost || 1)) * 100).toFixed(0)}%</span>
                                                    <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                                                        <div className="bg-indigo-400 h-full" style={{ width: `${(worker.cost / (analyticsData.laborCost || 1)) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {laborBreakdown.length === 0 && (
                                        <tr><td colSpan={4} className="p-16 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px] italic">Žiadne záznamy prác priradené k stavbám.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                      </Card>

                      <div className="bg-white rounded-3xl p-6 md:p-10 text-slate-800 relative overflow-hidden border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 group">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-100 transition-colors duration-1000"></div>
                          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                              <div className="w-20 h-20 bg-orange-100 rounded-[2rem] flex items-center justify-center text-orange-600 shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                  <Sparkles size={40} className="fill-orange-600/10"/>
                              </div>
                              <div className="max-w-xl">
                                  <h3 className="text-2xl font-black mb-2 text-slate-800 tracking-tight">
                                      AI Analýza & Firemný Poradca
                                  </h3>
                                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                      Poraďte sa s AI o ziskovosti vašich projektov. Analyzujte mzdové náklady alebo optimalizujte nákup materiálu na projekte <span className="font-bold text-slate-800 underline decoration-orange-200 underline-offset-4">{analyticsData.site?.name || 'celej vašej firmy'}</span>.
                                  </p>
                              </div>
                          </div>
                          <button 
                            onClick={() => setShowAIModal(true)}
                            className="relative z-10 bg-slate-900 text-white px-10 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-orange-600 hover:-translate-y-1 transition-all active:scale-95 whitespace-nowrap w-full md:w-auto border-b-4 border-black/20"
                          >
                              Spustiť analýzu
                          </button>
                      </div>
                  </div>
              ) : !dataLoading && (
                  <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200">
                      <BarChart3 className="text-slate-200 mb-4" size={48}/>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Vyberte projekt pre zobrazenie detailov</p>
                  </div>
              )}
          </div>
      </div>

      {showAIModal && (
          <Modal title="AI Analýza v príprave" onClose={() => setShowAIModal(false)} maxWidth="max-w-md">
              <div className="text-center py-6 space-y-6">
                  <div className="text-6xl animate-bounce">😢</div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Pracujeme na tom!</h3>
                  <p className="text-slate-600 font-medium leading-relaxed px-2">
                      Pokročilá AI analýza projektov je momentálne vo vývoji. Usilovne pracujeme na tom, aby sme vám priniesli tie najlepšie prehľady.
                  </p>
                  <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 text-xs text-blue-800 font-bold leading-relaxed shadow-inner">
                      Zatiaľ môžete využiť nášho <span className="text-orange-600">AI poradcu na nástenke,<br></br></span>ktorý vás prevedie aplikáciou a odpovie na všetky vaše otázky.
                  </div>
                  <div className="pt-2">
                    <Button fullWidth onClick={() => setShowAIModal(false)} className="h-12 uppercase tracking-widest font-black text-[10px]">Rozumiem</Button>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};
