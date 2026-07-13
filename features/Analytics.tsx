
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/UI';
import { formatMoney, formatDuration } from '../lib/utils';
import { 
    TrendingUp, Wallet, BarChart3, 
    Users, Clock, HardHat, Package, Loader2, 
    TrendingDown, Calendar, Target,
    LineChart, Activity, ChevronDown
} from 'lucide-react';

const LAST_ANALYTICS_SITE_KEY = 'mojastavba_last_analytics_site';

type ChartMode = 'monthly' | 'cumulative';
type GlobalPeriod = 'currentYear' | 'lastYear' | 'last12' | 'all';

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

const getChartPoint = (item: any, index: number, total: number, max: number, key: 'income' | 'cost') => {
    const x = total <= 1 ? 50 : (index / (total - 1)) * 100;
    const y = 92 - ((Number(item[key]) || 0) / max) * 78;
    return { x, y: Math.max(8, Math.min(92, y)), value: Number(item[key]) || 0, label: item.label };
};

const buildChartPath = (points: { x: number; y: number }[]) => {
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
};

const getGlobalPeriodRange = (period: GlobalPeriod) => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'all') {
        return { start: null as string | null, end: null as string | null, label: 'Celé obdobie' };
    }

    if (period === 'lastYear') {
        const year = now.getFullYear() - 1;
        return {
            start: `${year}-01-01`,
            end: `${year}-12-31`,
            label: `Rok ${year}`
        };
    }

    if (period === 'last12') {
        const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        return {
            start: getLocalDateString(start),
            end: getLocalDateString(end),
            label: 'Posledných 12 mesiacov'
        };
    }

    const year = now.getFullYear();
    return {
        start: `${year}-01-01`,
        end: getLocalDateString(end),
        label: `Rok ${year}`
    };
};

const formatMonthLabel = (date: Date, includeYear: boolean) => {
    return date.toLocaleDateString('sk-SK', includeYear ? { month: 'short', year: '2-digit' } : { month: 'short' });
};

export const AnalyticsScreen = ({ profile }: any) => {
  const [dataLoading, setDataLoading] = useState(true);
  const [viewType, setViewType] = useState<'global' | 'project'>('global');
  const [chartMode, setChartMode] = useState<ChartMode>('cumulative');
  const [globalPeriod, setGlobalPeriod] = useState<GlobalPeriod>('currentYear');
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [laborBreakdown, setLaborBreakdown] = useState<any[]>([]);
  const [organization, setOrganization] = useState<any>(null);

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
    }
  };

  useEffect(() => {
    if (viewType === 'global') {
        loadGlobalAnalytics();
    } else if (selectedSiteId) {
        localStorage.setItem(LAST_ANALYTICS_SITE_KEY, selectedSiteId);
        loadProjectAnalytics(selectedSiteId);
    }
  }, [viewType, selectedSiteId, chartMode, globalPeriod, organization]);

  const loadGlobalAnalytics = async () => {
      setDataLoading(true);
      const periodRange = getGlobalPeriodRange(globalPeriod);
      const applyDateRange = (query: any, column: string) => {
          if (periodRange.start) query = query.gte(column, periodRange.start);
          if (periodRange.end) query = query.lte(column, periodRange.end);
          return query;
      };
      
      const [transRes, logsRes, materialsRes, fuelRes] = await Promise.all([
          applyDateRange(supabase.from('transactions').select('*').eq('organization_id', profile.organization_id).not('site_id', 'is', null), 'date'),
          applyDateRange(supabase.from('attendance_logs').select('*, profiles(full_name, hourly_rate, cost_rate)').eq('organization_id', profile.organization_id).not('site_id', 'is', null), 'date'),
          applyDateRange(supabase.from('materials').select('*').eq('organization_id', profile.organization_id).not('site_id', 'is', null), 'purchase_date'),
          applyDateRange(supabase.from('fuel_logs').select('*').eq('organization_id', profile.organization_id).not('site_id', 'is', null), 'date')
      ]);

      const transactions: any[] = transRes.data || [];
      const logs: any[] = logsRes.data || [];
      const materials: any[] = materialsRes.data || [];
      const fuels: any[] = fuelRes.data || [];

      const income = transactions.filter(t => t.type === 'invoice' && t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const matCost = materials.reduce((s, m) => s + Number(m.total_price), 0);
      const fuelCost = fuels.reduce((s, f) => s + Number(f.amount), 0);
      
      const laborCost = logs.reduce((s, l: any) => {
          if (l.payment_type === 'fixed') {
              return s + Number(l.fixed_amount || 0);
          }
          return s + (Number(l.hours) * (l.cost_rate_snapshot || l.profiles?.cost_rate || l.hourly_rate_snapshot || l.profiles?.hourly_rate || 0));
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
      if (periodRange.start) {
          startOfHistory = new Date(periodRange.start);
      } else if (allDates.length > 0) {
          startOfHistory = new Date(allDates[0]);
      } else {
          startOfHistory = organization?.created_at ? new Date(organization.created_at) : new Date();
      }
      
      const months = [];
      const now = periodRange.end ? new Date(periodRange.end) : new Date();
      let current = new Date(startOfHistory.getFullYear(), startOfHistory.getMonth(), 1);
      const includeYearInLabel = (now.getFullYear() - startOfHistory.getFullYear()) > 0 || globalPeriod === 'all';

      if (allDates.length === 0) {
          months.push({ label: formatMonthLabel(now, includeYearInLabel), income: 0, cost: 0 });
      } else {
          let runningIncome = 0;
          let runningCost = 0;

          while (current <= now) {
              const monthKey = getLocalMonthString(current);
              
              const mInc = transactions.filter(t => t.date.substring(0, 7) === monthKey && t.type === 'invoice' && t.is_paid).reduce((s,t) => s + Number(t.amount), 0);
              const mExp = transactions.filter(t => t.date.substring(0, 7) === monthKey && t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0);
              const mMat = materials.filter(m => m.purchase_date && m.purchase_date.substring(0, 7) === monthKey).reduce((s,m) => s + Number(m.total_price), 0);
              const mFuel = fuels.filter(f => f.date && f.date.substring(0, 7) === monthKey).reduce((s,f) => s + Number(f.amount), 0);
              
              const mLabor = logs.filter(l => l.date.substring(0, 7) === monthKey).reduce((s, l: any) => {
                  if (l.payment_type === 'fixed') {
                      return s + Number(l.fixed_amount || 0);
                  }
                  return s + (Number(l.hours) * (l.cost_rate_snapshot || l.profiles?.cost_rate || l.hourly_rate_snapshot || l.profiles?.hourly_rate || 0));
              }, 0);

              const monthCost = mExp + mMat + mLabor + mFuel;
              runningIncome += mInc;
              runningCost += monthCost;

              months.push({
                  label: formatMonthLabel(current, includeYearInLabel),
                  income: chartMode === 'cumulative' ? runningIncome : mInc,
                  cost: chartMode === 'cumulative' ? runningCost : monthCost
              });
              current.setMonth(current.getMonth() + 1);
          }
      }

      setChartData(months);
      setAnalyticsData({
          income, totalCost, laborCost, matCost, otherCost: expenses + fuelCost,
          profit: income - totalCost,
          margin: income > 0 ? ((income - totalCost) / income) * 100 : 0,
          totalHours: logs.reduce((s, l) => s + Number(l.hours), 0),
          periodLabel: periodRange.label
      });

      const workerMap = logs.reduce((acc: any, log: any) => {
          const name = log.profiles?.full_name || 'Neznámy pracovník';
          if (!acc[name]) acc[name] = { hours: 0, cost: 0 };
          const rate = log.cost_rate_snapshot || log.profiles?.cost_rate || log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0;
          const entryCost = log.payment_type === 'fixed' ? Number(log.fixed_amount || 0) : (Number(log.hours) * rate);
          acc[name].hours += Number(log.hours);
          acc[name].cost += entryCost;
          return acc;
      }, {});

      setLaborBreakdown(Object.entries(workerMap).map(([name, data]: any) => ({ name, ...data })).sort((a, b) => b.hours - a.hours));
      setDataLoading(false);
  };

  const loadProjectAnalytics = async (siteId: string) => {
      setDataLoading(true);
      
      const [transRes, logsRes, materialsRes, fuelRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('site_id', siteId),
          supabase.from('attendance_logs').select('*, profiles(full_name, hourly_rate, cost_rate)').eq('site_id', siteId),
          supabase.from('materials').select('*').eq('site_id', siteId),
          supabase.from('fuel_logs').select('*').eq('site_id', siteId)
      ]);

      const transactions = transRes.data || [];
      const logs = logsRes.data || [];
      const materials = materialsRes.data || [];
      const fuels = fuelRes.data || [];
      const site = sites.find(s => s.id === siteId);

      const income = transactions.filter(t => t.type === 'invoice' && t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const matCost = materials.reduce((s, m) => s + Number(m.total_price), 0);
      const fuelCost = fuels.reduce((s, f) => s + Number(f.amount), 0);
      
      const laborCost = logs.reduce((s, l: any) => {
          if (l.payment_type === 'fixed') {
              return s + Number(l.fixed_amount || 0);
          }
          return s + (Number(l.hours) * (l.cost_rate_snapshot || l.profiles?.cost_rate || l.hourly_rate_snapshot || l.profiles?.hourly_rate || 0));
      }, 0);

      const totalCost = expenses + matCost + laborCost + fuelCost;

      const dataPoints: any[] = [];
      
      const sortedDates = [...transactions.map(t=>t.date), ...logs.map(l=>l.date), ...materials.map(m=>m.purchase_date), ...fuels.map(f=>f.date)].filter(Boolean).sort();
      const siteStartStr = sortedDates[0] || site?.created_at;
      const siteEndStr = sortedDates[sortedDates.length - 1] || siteStartStr;
            
      const startDate = siteStartStr ? new Date(siteStartStr) : new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = site?.status === 'completed' && siteEndStr ? new Date(siteEndStr) : new Date(Math.max(new Date(siteEndStr || new Date()).getTime(), Date.now()));
      endDate.setHours(23, 59, 59, 999);

      if (chartMode === 'cumulative') {
          let current = new Date(startDate);
          let runningIncome = 0;
          let runningCost = 0;

          while (current <= endDate) {
              const dayStr = getLocalDateString(current);
              const dayInc = transactions.filter(t => t.date === dayStr && t.type === 'invoice' && t.is_paid).reduce((s,t) => s + Number(t.amount), 0);
              const dayExp = transactions.filter(t => t.date === dayStr && t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0);
              const dayMat = materials.filter(m => m.purchase_date === dayStr).reduce((s,m) => s + Number(m.total_price), 0);
              const dayFuel = fuels.filter(f => f.date === dayStr).reduce((s,f) => s + Number(f.amount), 0);
              
              const dayLabor = logs.filter(l => l.date === dayStr).reduce((s, l: any) => {
                  if (l.payment_type === 'fixed') {
                      return s + Number(l.fixed_amount || 0);
                  }
                  return s + (Number(l.hours) * (l.cost_rate_snapshot || l.profiles?.cost_rate || l.hourly_rate_snapshot || l.profiles?.hourly_rate || 0));
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
              const mInc = transactions.filter(t => t.date.substring(0, 7) === monthKey && t.type === 'invoice' && t.is_paid).reduce((s,t) => s + Number(t.amount), 0);
              const mExp = transactions.filter(t => t.date.substring(0, 7) === monthKey && t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0);
              const mMat = materials.filter(m => m.purchase_date && m.purchase_date.substring(0, 7) === monthKey).reduce((s,m) => s + Number(m.total_price), 0);
              const mFuel = fuels.filter(f => f.date && f.date.substring(0, 7) === monthKey).reduce((s,f) => s + Number(f.amount), 0);
              
              const mLabor = logs.filter(l => l.date.substring(0, 7) === monthKey).reduce((s, l: any) => {
                  if (l.payment_type === 'fixed') {
                      return s + Number(l.fixed_amount || 0);
                  }
                  return s + (Number(l.hours) * (l.cost_rate_snapshot || l.profiles?.cost_rate || l.hourly_rate_snapshot || l.profiles?.hourly_rate || 0));
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
          const name = log.profiles?.full_name || 'Neznámy pracovník';
          if (!acc[name]) acc[name] = { hours: 0, cost: 0 };
          const rate = log.cost_rate_snapshot || log.profiles?.cost_rate || log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0;
          const entryCost = log.payment_type === 'fixed' ? Number(log.fixed_amount || 0) : (Number(log.hours) * rate);
          acc[name].hours += Number(log.hours);
          acc[name].cost += entryCost;
          return acc;
      }, {});

      setLaborBreakdown(Object.entries(workerMap).map(([name, data]: any) => ({ name, ...data })).sort((a, b) => b.hours - a.hours));
      setDataLoading(false);
  };

  const currentSite = useMemo(() => sites.find(s => s.id === selectedSiteId), [sites, selectedSiteId]);
  const chartMax = useMemo(() => Math.max(...chartData.map(x => Math.max(Number(x.income) || 0, Number(x.cost) || 0)), 100), [chartData]);
  const incomePoints = useMemo(() => chartData.map((item, index) => getChartPoint(item, index, chartData.length, chartMax, 'income')), [chartData, chartMax]);
  const costPoints = useMemo(() => chartData.map((item, index) => getChartPoint(item, index, chartData.length, chartMax, 'cost')), [chartData, chartMax]);
  const chartLabelStep = useMemo(() => Math.max(1, Math.ceil(chartData.length / 7)), [chartData.length]);

  return (
    <div className="space-y-5 pb-6 md:pb-2 max-w-7xl mx-auto px-1 md:px-0">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
         <div>
            <h2 className="app-section-title">
                <BarChart3 className="text-orange-600" />
                Analytika zákaziek
            </h2>
            <p className="app-section-subtitle">Finančná výkonnosť zákaziek (bez všeobecnej réžie)</p>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-[320px_288px] gap-3 w-full lg:w-auto">
             <div className="bg-white p-1.5 rounded-2xl flex border border-orange-100 shadow-sm w-full">
                 <button 
                    onClick={() => setViewType('global')}
                    className={`flex-1 h-9 px-4 rounded-xl text-xs font-semibold transition-colors ${viewType === 'global' ? 'bg-orange-600 text-white shadow-sm shadow-orange-100' : 'text-slate-700 hover:bg-orange-50 hover:text-orange-700'}`}
                 >
                     Všetky zákazky
                 </button>
                 <button 
                    onClick={() => setViewType('project')}
                    className={`flex-1 h-9 px-4 rounded-xl text-xs font-semibold transition-colors ${viewType === 'project' ? 'bg-orange-600 text-white shadow-sm shadow-orange-100' : 'text-slate-700 hover:bg-orange-50 hover:text-orange-700'}`}
                 >
                     Jedna zákazka
                 </button>
             </div>

             <div className="relative w-full min-h-11">
             {viewType === 'project' ? (
                 <>
                    <select
                        value={selectedSiteId}
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                        className="w-full h-11 appearance-none bg-white border border-slate-200 rounded-xl px-4 pr-10 text-sm font-semibold text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 shadow-sm transition"
                    >
                        {sites.map(site => (
                            <option key={site.id} value={site.id}>
                                {site.name}{site.status === 'completed' ? ' - ukončená' : ''}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 </>
             ) : (
                 <>
                    <select
                        value={globalPeriod}
                        onChange={(e) => setGlobalPeriod(e.target.value as GlobalPeriod)}
                        className="w-full h-11 appearance-none bg-white border border-slate-200 rounded-xl px-4 pr-10 text-sm font-semibold text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 shadow-sm transition"
                    >
                        <option value="currentYear">Tento rok</option>
                        <option value="lastYear">Minulý rok</option>
                        <option value="last12">12 mesiacov</option>
                        <option value="all">Celé obdobie</option>
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 </>
             )}
             </div>
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
                  <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                          <Card className="border-slate-200 p-5 flex flex-col justify-between shadow-sm bg-white">
                              <div>
                                <div className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-green-600"/> Čistý zisk
                                </div>
                                <div className={`text-2xl font-bold tracking-normal tabular-nums ${analyticsData.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {formatMoney(analyticsData.profit)}
                                </div>
                              </div>
                              <div className="mt-3">
                                  <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${analyticsData.profit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                       Marža {analyticsData.margin.toFixed(1)}%
                                  </span>
                              </div>
                          </Card>

                          <Card className="border-slate-200 p-5 flex flex-col justify-between shadow-sm bg-white">
                              <div>
                                <div className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2"><TrendingDown size={16} className="text-red-600"/> Priame náklady</div>
                                <div className="text-2xl font-bold text-slate-900 tracking-normal tabular-nums">{formatMoney(analyticsData.totalCost)}</div>
                              </div>
                              <div className="mt-3 text-xs font-medium text-slate-500">
                                  Bez všeobecnej réžie
                              </div>
                          </Card>

                          <Card className="border-slate-200 p-5 flex flex-col justify-between shadow-sm bg-white">
                              <div>
                                <div className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2"><Clock size={16} className="text-blue-600"/> Odpracované</div>
                                <div className="text-2xl font-bold text-slate-900 tracking-normal tabular-nums">{formatDuration(analyticsData.totalHours)}</div>
                              </div>
                              <div className="mt-3">
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full w-[72%] rounded-full"></div>
                                </div>
                              </div>
                          </Card>

                          <Card className="border-slate-200 p-5 flex flex-col justify-between shadow-sm bg-white">
                              <div>
                                <div className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2"><Wallet size={16} className="text-indigo-600"/> Mzdový náklad</div>
                                <div className="text-2xl font-bold text-slate-900 tracking-normal tabular-nums">{formatMoney(analyticsData.laborCost)}</div>
                              </div>
                              <div className="mt-3 text-xs text-slate-500 font-medium">
                                  {((analyticsData.laborCost / (analyticsData.totalCost || 1)) * 100).toFixed(0)}% z nákladov
                              </div>
                          </Card>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                          <Card className="lg:col-span-2 border-slate-200 p-5 md:p-6 shadow-sm bg-white">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                                  <div>
                                      <h3 className="font-semibold text-base text-slate-900 flex items-center gap-2">
                                         {chartMode === 'cumulative' ? <LineChart className="text-orange-500" size={16}/> : <BarChart3 className="text-orange-500" size={16}/>}
                                         {viewType === 'global' ? 'Výkonnosť všetkých zákaziek' : 'Analýza zákazky'}
                                      </h3>
                                      <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1">
                                          {chartMode === 'cumulative' ? 'Kumulatívny priebeh príjmov a nákladov' : 'Mesačné sumáre príjmov a nákladov'}
                                          {viewType === 'global' && analyticsData.periodLabel && (
                                              <span className="hidden sm:inline text-slate-300">•</span>
                                          )}
                                          {viewType === 'global' && analyticsData.periodLabel && (
                                              <span className="hidden sm:inline text-slate-500">{analyticsData.periodLabel}</span>
                                          )}
                                      </p>
                                  </div>
                                  
                                  <div className="flex items-center gap-3">
                                      <div className="bg-white p-1 rounded-xl flex border border-slate-200 shadow-sm">
                                          <button 
                                            onClick={() => setChartMode('cumulative')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${chartMode === 'cumulative' ? 'bg-orange-50 text-orange-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                          >Kumulatívny</button>
                                          <button 
                                            onClick={() => setChartMode('monthly')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${chartMode === 'monthly' ? 'bg-orange-50 text-orange-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                          >Mesačný</button>
                                      </div>
                                      <div className="hidden sm:flex gap-4">
                                          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-slate-800 rounded-sm"></div><span className="text-xs font-semibold text-slate-500">Príjmy</span></div>
                                          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-orange-400 rounded-sm"></div><span className="text-xs font-semibold text-slate-500">Náklady</span></div>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="h-64 md:h-72 px-1">
                                  {chartData.length === 0 ? (
                                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-semibold">Zatiaľ žiadne dáta k zákazkám.</div>
                                  ) : chartMode === 'cumulative' ? (
                                      <div className="relative h-full pb-8">
                                          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-[calc(100%-2rem)] w-full overflow-visible">
                                              {[18, 38, 58, 78, 92].map(line => (
                                                  <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="#e2e8f0" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
                                              ))}
                                              <path d={buildChartPath(incomePoints)} fill="none" stroke="#1e293b" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                                              <path d={buildChartPath(costPoints)} fill="none" stroke="#fb923c" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>

                                          {chartData.map((item, index) => {
                                              const incomePoint = incomePoints[index];
                                              const costPoint = costPoints[index];
                                              const showDot = chartData.length <= 18 || index === 0 || index === chartData.length - 1 || index % chartLabelStep === 0;
                                              return (
                                                  <div key={index} className="absolute top-0 bottom-8 group" style={{ left: `${incomePoint.x}%`, width: 1 }}>
                                                      {showDot && (
                                                          <>
                                                              <span className="absolute w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-white shadow-sm -translate-x-1/2 -translate-y-1/2" style={{ top: `${incomePoint.y}%` }}></span>
                                                              <span className="absolute w-2.5 h-2.5 rounded-full bg-orange-400 border-2 border-white shadow-sm -translate-x-1/2 -translate-y-1/2" style={{ top: `${costPoint.y}%` }}></span>
                                                          </>
                                                      )}
                                                      <div className="absolute left-1/2 top-2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition pointer-events-none z-20 bg-white border border-slate-200 rounded-xl shadow-xl px-3 py-2 min-w-[150px]">
                                                          <div className="text-xs font-bold text-slate-900 mb-1">{item.label}</div>
                                                          <div className="flex justify-between gap-4 text-xs"><span className="text-slate-500">Príjmy</span><span className="font-bold text-slate-900 tabular-nums">{formatMoney(item.income)}</span></div>
                                                          <div className="flex justify-between gap-4 text-xs"><span className="text-slate-500">Náklady</span><span className="font-bold text-orange-600 tabular-nums">{formatMoney(item.cost)}</span></div>
                                                      </div>
                                                  </div>
                                              );
                                          })}

                                          <div className="absolute left-0 right-0 bottom-0 h-6">
                                              {chartData.map((item, index) => {
                                                  if (index !== 0 && index !== chartData.length - 1 && index % chartLabelStep !== 0) return null;
                                                  const point = incomePoints[index];
                                                  return (
                                                      <span key={index} className="absolute -translate-x-1/2 text-[11px] font-semibold text-slate-500 whitespace-nowrap" style={{ left: `${point.x}%` }}>
                                                          {item.label}
                                                      </span>
                                                  );
                                              })}
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="h-full flex items-end justify-between gap-1.5 md:gap-3">
                                          {chartData.map((m, i) => (
                                              <div key={i} className="flex-1 flex flex-col justify-end gap-2 h-full group relative">
                                                  <div className="flex gap-0.5 md:gap-1 items-end justify-center h-full">
                                                      <div 
                                                          className="w-full max-w-[14px] md:max-w-[20px] bg-slate-800 rounded-t-sm transition-all duration-1000 group-hover:bg-slate-700 relative shadow-sm" 
                                                          style={{ height: `${Math.max(2, (m.income / chartMax) * 100)}%` }}
                                                      >
                                                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-20 pointer-events-none border border-slate-700">
                                                              {formatMoney(m.income)}
                                                          </div>
                                                      </div>
                                                      <div 
                                                          className="w-full max-w-[14px] md:max-w-[20px] bg-orange-400 rounded-t-sm transition-all duration-1000 group-hover:bg-orange-300 relative shadow-sm" 
                                                          style={{ height: `${Math.max(2, (m.cost / chartMax) * 100)}%` }}
                                                      >
                                                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[9px] px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-20 pointer-events-none border border-orange-400">
                                                              {formatMoney(m.cost)}
                                                          </div>
                                                      </div>
                                                  </div>
                                                  <div className="text-[10px] font-semibold text-slate-500 text-center mt-1 truncate w-full group-hover:text-orange-600 transition-colors">{m.label}</div>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          </Card>

                          <div className="space-y-5">
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

                      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm bg-white">
                        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/40">
                            <div>
                                <h3 className="font-semibold text-base text-slate-900 flex items-center gap-2">
                                    <HardHat className="text-indigo-600" size={18}/> Výkon pracovníkov
                                </h3>
                            </div>
                            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 shadow-sm flex items-center gap-2">
                                <Clock size={14} className="text-orange-500"/> Spolu {formatDuration(analyticsData.totalHours)}
                            </div>
                        </div>
                        <div className="md:hidden divide-y divide-slate-100">
                            {laborBreakdown.map((worker) => {
                                const percent = (worker.cost / (analyticsData.laborCost || 1)) * 100;
                                return (
                                    <div key={worker.name} className="p-4 bg-white odd:bg-orange-50/[0.26]">
                                        <div className="flex items-start gap-0">
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-slate-900 leading-snug">{worker.name}</div>
                                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-1.5">
                                                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Čas</div>
                                                        <div className="font-bold text-slate-900 tabular-nums mt-0.5">{formatDuration(worker.hours)}</div>
                                                    </div>
                                                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-1.5 text-right">
                                                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Náklad</div>
                                                        <div className="font-bold text-slate-900 tabular-nums mt-0.5">{formatMoney(worker.cost)}</div>
                                                    </div>
                                                </div>
                                                <div className="mt-3">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Podiel</span>
                                                        <span className="text-xs font-bold text-slate-700 tabular-nums">{percent.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                        <div className="bg-indigo-400 h-full" style={{ width: `${percent}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {laborBreakdown.length === 0 && (
                                <div className="p-10 text-center text-slate-400 font-semibold text-sm">Žiadne záznamy dochádzky priradené k zákazkám.</div>
                            )}
                        </div>
                        <div className="hidden md:block overflow-x-auto custom-scrollbar">
                            <table className="w-full text-sm text-left min-w-[500px]">
                                <thead className="bg-white text-slate-500 font-semibold text-xs border-b border-slate-100">
                                    <tr>
                                        <th className="p-5">Meno</th>
                                        <th className="p-5 text-center">Čas</th>
                                        <th className="p-5 text-right">Mzdový náklad</th>
                                        <th className="p-5 text-right">Podiel</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {laborBreakdown.map((worker, index) => (
                                        <tr key={worker.name} className={`transition-colors group ${index % 2 === 1 ? 'bg-orange-50/[0.24]' : 'bg-white'} hover:bg-orange-50/[0.34]`}>
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs border border-slate-200 shadow-inner group-hover:bg-white transition-colors">
                                                        {worker.name.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-800">{worker.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-center font-semibold text-slate-700 tabular-nums">{formatDuration(worker.hours)}</td>
                                            <td className="p-5 text-right font-bold text-slate-900 tabular-nums">{formatMoney(worker.cost)}</td>
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
                                        <tr><td colSpan={4} className="p-16 text-center text-slate-400 font-semibold text-sm">Žiadne záznamy dochádzky priradené k zákazkám.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                      </Card>
                  </div>
              ) : !dataLoading && (
                  <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200">
                      <BarChart3 className="text-slate-200 mb-4" size={48}/>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Vyberte projekt pre zobrazenie detailov</p>
                  </div>
              )}
          </div>
      </div>

    </div>
  );
};
