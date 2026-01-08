
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Input, ConfirmModal, Select } from '../components/UI';
import { 
  Plus, ArrowUpRight, ArrowDownLeft, Trash2, Wallet, TrendingUp, 
  AlertCircle, Search, Filter, PieChart, BarChart3, CheckCircle2, 
  XCircle, ChevronLeft, ChevronRight, X, 
  Building2, Loader2, Fuel, Package, Users, LayoutList, RotateCcw, Eye, Info, Calendar, Check
} from 'lucide-react';
import { formatMoney, formatDate } from '../lib/utils';

type DateMode = 'year' | 'month' | 'custom' | 'all';
const PAGE_SIZE = 20;

const FULL_MONTH_NAMES_SK = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December'];

export const FinanceScreen = ({ profile }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  
  // Period Filtering
  const [dateMode, setDateMode] = useState<DateMode>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [customRange, setCustomRange] = useState({ 
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Specific table filters
  const [filterType, setFilterType] = useState<'all' | 'invoice' | 'expense'>('all');
  const [filterSiteId, setFilterSiteId] = useState('');
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [showSiteResults, setShowSiteResults] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Financial Stats
  const [stats, setStats] = useState({ 
    income: 0, 
    expense: 0, 
    profit: 0, 
    unpaidTotal: 0, 
    unpaidCount: 0,
    laborCost: 0,
    materialCost: 0,
    fuelCost: 0,
    otherCost: 0
  });
  const [categoriesSummary, setCategoriesSummary] = useState<any[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [newTrans, setNewTrans] = useState<any>({ type: 'expense', date: new Date().toISOString().split('T')[0], category: 'Réžia' });
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: string | null}>({ open: false, id: null });

  const getPeriodRange = useCallback(() => {
    let start, end;
    if (dateMode === 'year') {
        start = `${selectedYear}-01-01`;
        end = `${selectedYear}-12-31`;
    } else if (dateMode === 'month') {
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        start = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`;
        end = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    } else if (dateMode === 'custom') {
        start = customRange.from;
        end = customRange.to;
    } else {
        start = '2020-01-01';
        end = '2030-12-31';
    }
    return { start, end };
  }, [dateMode, selectedYear, selectedMonth, customRange]);

  const resetFilters = () => {
      setFilterType('all');
      setFilterSiteId('');
      setSiteSearchQuery('');
      setFilterCategory('');
      setSearchQuery('');
      setVisibleCount(PAGE_SIZE);
  };

  useEffect(() => {
    const loadSites = async () => {
      const { data } = await supabase.from('sites').select('id, name').eq('organization_id', profile.organization_id);
      if (data) setSites(data);
    };
    loadSites();
  }, [profile.organization_id]);

  const loadData = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); setVisibleCount(PAGE_SIZE); }

    const { start, end } = getPeriodRange();
    const orgId = profile.organization_id;

    const [transRes, logsRes, fuelRes, matsRes] = await Promise.all([
        supabase.from('transactions').select('*, sites(name)').eq('organization_id', orgId).gte('date', start).lte('date', end),
        supabase.from('attendance_logs').select('*, sites(name), profiles(full_name, hourly_rate)').eq('organization_id', orgId).gte('date', start).lte('date', end),
        supabase.from('fuel_logs').select('*, sites(name)').eq('organization_id', orgId).gte('date', start).lte('date', end),
        supabase.from('materials').select('*, sites(name)').eq('organization_id', orgId).gte('purchase_date', start).lte('purchase_date', end)
    ]);

    const transData = transRes.data || [];
    const logsData = logsRes.data || [];
    const fuelData = fuelRes.data || [];
    const matsData = matsRes.data || [];

    const wageGroups: Record<string, any> = {};
    logsData.forEach(l => {
        const userId = l.user_id;
        const key = userId;
        const amt = l.payment_type === 'fixed' ? Number(l.fixed_amount) : (Number(l.hours) * (l.hourly_rate_snapshot || l.profiles?.hourly_rate || 0));
        
        if (!wageGroups[key]) {
            wageGroups[key] = {
                id: `wage_${key}`,
                date: l.date,
                description: `Mzdy: ${l.profiles?.full_name}`,
                category: 'Mzdy',
                type: 'expense',
                amount: 0,
                is_paid: true,
                sites: null,
                site_id: null,
                itemType: 'wage'
            };
        }
        wageGroups[key].amount += amt;
        if (l.date > wageGroups[key].date) wageGroups[key].date = l.date;
    });

    const income = transData.filter(t => t.type === 'invoice').reduce((s, t) => s + Number(t.amount), 0);
    const otherCost = transData.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const fuelCost = fuelData.reduce((s, f) => s + Number(f.amount), 0);
    const materialCost = matsData.reduce((s, m) => s + Number(m.total_price), 0);
    const laborCost = Object.values(wageGroups).reduce((s, w) => s + Number(w.amount), 0);

    const totalExpense = otherCost + fuelCost + materialCost + laborCost;

    const { data: unpaidAll } = await supabase.from('transactions')
        .select('*, sites(name)')
        .eq('organization_id', orgId)
        .eq('type', 'invoice')
        .eq('is_paid', false);

    setStats({ 
        income, 
        expense: totalExpense, 
        profit: income - totalExpense, 
        unpaidTotal: (unpaidAll || []).reduce((s, t) => s + Number(t.amount), 0),
        unpaidCount: (unpaidAll || []).length,
        laborCost,
        materialCost,
        fuelCost,
        otherCost
    });
    setUnpaidInvoices(unpaidAll || []);

    const combined = [
        ...transData.map(t => ({ ...t, itemType: 'manual' })),
        ...Object.values(wageGroups),
        ...fuelData.map(f => ({ 
            id: f.id, date: f.date, description: `PHM: ${f.vehicle || ''} (${f.description || ''})`, 
            category: 'PHM', type: 'expense', amount: f.amount, is_paid: true, sites: f.sites, site_id: f.site_id, itemType: 'fuel' 
        })),
        ...matsData.map(m => ({
            id: m.id, date: m.purchase_date, description: `Materiál: ${m.name} (${m.quantity} ${m.unit})`,
            category: 'Materiál', type: 'expense', amount: m.total_price, is_paid: true, sites: m.sites, site_id: m.site_id, itemType: 'material'
        }))
    ];

    let filtered = combined;
    if (filterType !== 'all') filtered = filtered.filter(f => f.type === filterType);
    if (filterSiteId) filtered = filtered.filter(f => f.site_id === filterSiteId);
    if (filterCategory) filtered = filtered.filter(f => f.category === filterCategory);
    if (searchQuery) filtered = filtered.filter(f => (f.description || '').toLowerCase().includes(searchQuery.toLowerCase()));

    setTransactions(filtered.sort((a,b) => b.date.localeCompare(a.date)));
    
    const catMap: Record<string, number> = {};
    filtered.filter(t => t.type === 'expense').forEach(t => {
        catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
    });
    setCategoriesSummary(Object.entries(catMap)
        .map(([name, value]: any) => ({ name, value, percent: totalExpense > 0 ? (value / totalExpense) * 100 : 0 }))
        .sort((a, b) => b.value - a.value));

    setLoading(false);
  }, [profile.organization_id, dateMode, selectedYear, selectedMonth, customRange, filterType, filterSiteId, filterCategory, searchQuery]);

  useEffect(() => { loadData(true); }, [dateMode, selectedYear, selectedMonth, customRange, filterType, filterSiteId, filterCategory]);

  const togglePaidStatus = async (transaction: any) => {
      if (transaction.itemType !== 'manual') return;
      const { error } = await supabase.from('transactions').update({ is_paid: !transaction.is_paid }).eq('id', transaction.id);
      if (!error) loadData();
  };

  const filteredSites = sites.filter(s => s.name.toLowerCase().includes(siteSearchQuery.toLowerCase()));

  return (
    <div className="space-y-6 pb-24 min-h-screen animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Wallet className="text-orange-600" size={32} />
              Financie
           </h2>
           <p className="text-sm text-slate-500 mt-1 font-medium">Firemná analytika</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => {
                setNewTrans({ type: 'expense', date: new Date().toISOString().split('T')[0], category: 'Réžia' });
                setShowAddModal(true);
            }} className="shadow-lg shadow-orange-100 h-12">
                <Plus size={18}/> Pridať režijný výdavok
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-100 p-6 flex flex-col justify-between shadow-sm border-t-4 border-t-green-500">
          <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-xl"><ArrowUpRight size={20}/></div>
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Príjmy</div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{formatMoney(stats.income)}</div>
        </Card>

        <Card className="bg-white border-slate-100 p-6 flex flex-col justify-between shadow-sm border-t-4 border-t-red-500">
          <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl"><ArrowDownLeft size={20}/></div>
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Náklady</div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">{formatMoney(stats.expense)}</div>
        </Card>

        <Card className={`p-6 border flex flex-col justify-between shadow-sm transition-all duration-300 border-t-4 ${stats.profit >= 0 ? 'bg-green-50/20 border-green-500' : 'bg-red-50/20 border-red-500'}`}>
           <div className="flex justify-between items-start mb-4">
               <div className={`p-2.5 rounded-xl shadow-sm ${stats.profit >= 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}><TrendingUp size={20}/></div>
               <div className={`text-[10px] font-black uppercase tracking-widest ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Bilancia (Zisk/Strata)</div>
           </div>
           <div className={`text-3xl font-black tracking-tight ${stats.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
               {formatMoney(stats.profit)}
           </div>
        </Card>
      </div>

      {stats.unpaidCount > 0 && (
          <div className="bg-white border-2 border-red-100 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                  <div className="bg-red-50 p-3 rounded-xl text-red-600 ring-4 ring-red-50/50"><AlertCircle size={24}/></div>
                  <div>
                      <h4 className="font-black text-red-900 text-sm uppercase tracking-tight">Nezaplatené faktúry (Dlžníci)</h4>
                      <p className="text-xs text-red-700 font-medium">Celkovo dlhujú <span className="font-black underline">{formatMoney(stats.unpaidTotal)}</span>.</p>
                  </div>
              </div>
              <button onClick={() => setShowUnpaidModal(true)} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition shadow-lg shadow-red-200">Zobraziť</button>
          </div>
      )}

      {/* FILTER BAR - NO STICKY */}
      <Card className="bg-white border-slate-200 shadow-xl p-4">
          <div className="space-y-4">
              {/* Prvý riadok: Obdobie */}
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center shadow-inner">
                        <button onClick={() => setDateMode('month')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition ${dateMode === 'month' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>Mesiac</button>
                        <button onClick={() => setDateMode('year')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition ${dateMode === 'year' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>Rok</button>
                        <button onClick={() => setDateMode('all')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition ${dateMode === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>Všetko</button>
                    </div>

                    <div className="flex items-center gap-2 h-10 px-3 bg-slate-50 rounded-xl border border-slate-200 min-w-[180px] justify-center">
                        {dateMode === 'month' && (
                            <div className="flex items-center gap-2">
                                <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent font-black text-xs text-slate-700 outline-none cursor-pointer">
                                    {FULL_MONTH_NAMES_SK.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-transparent font-black text-xs text-slate-700 outline-none cursor-pointer border-l border-slate-300 pl-2">
                                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        )}
                        {dateMode === 'year' && (
                            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-transparent font-black text-xs text-slate-700 outline-none cursor-pointer">
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}
                        {dateMode === 'all' && <span className="text-[10px] font-black text-slate-400 uppercase">Všetky dáta</span>}
                    </div>
              </div>

              {/* Druhý riadok: Filtre tabuľky */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                      <input 
                        type="text" 
                        placeholder="Hľadať v popise..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20 transition h-11"
                      />
                  </div>

                  <div className="relative site-search-container">
                      <div className="relative">
                        <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Vyhľadať stavbu..." 
                            value={siteSearchQuery}
                            onFocus={() => setShowSiteResults(true)}
                            onChange={(e) => { setSiteSearchQuery(e.target.value); if(!e.target.value) setFilterSiteId(''); }}
                            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20 transition h-11"
                        />
                        {filterSiteId && (
                            <button onClick={() => {setFilterSiteId(''); setSiteSearchQuery('');}} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X size={14}/></button>
                        )}
                      </div>
                      
                      {showSiteResults && siteSearchQuery && !filterSiteId && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                              {filteredSites.map(s => (
                                  <button key={s.id} onClick={() => { setFilterSiteId(s.id); setSiteSearchQuery(s.name); setShowSiteResults(false); }} className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-50 font-bold text-xs">
                                      {s.name}
                                  </button>
                              ))}
                              {filteredSites.length === 0 && <div className="p-3 text-xs text-slate-400 italic">Nenašla sa žiadna stavba.</div>}
                          </div>
                      )}
                  </div>

                  <Select value={filterType} onChange={(e: any) => setFilterType(e.target.value)} className="mb-0 bg-slate-50 border-slate-200 h-11 text-xs font-bold">
                      <option value="all">Všetky typy</option>
                      <option value="invoice">Len Príjmy</option>
                      <option value="expense">Len Náklady</option>
                  </Select>

                  <Select value={filterCategory} onChange={(e: any) => setFilterCategory(e.target.value)} className="mb-0 bg-slate-50 border-slate-200 h-11 text-xs font-bold">
                      <option value="">Všetky kategórie</option>
                      {['Materiál', 'Mzdy', 'PHM', 'Réžia', 'Iné'].map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
              </div>

              <div className="flex justify-between items-center">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <LayoutList size={14} className="text-orange-500"/> Celkom nájdených {transactions.length} položiek
                  </div>
                  {(filterType !== 'all' || filterSiteId !== '' || filterCategory !== '' || searchQuery !== '') && (
                      <button onClick={resetFilters} className="text-[10px] font-black text-orange-600 hover:text-orange-700 uppercase tracking-widest flex items-center gap-1.5 transition-all">
                          <RotateCcw size={12}/> Resetovať filtre
                      </button>
                  )}
              </div>
          </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TABUĽKA DÁT */}
          <Card padding="p-0" className="lg:col-span-2 overflow-hidden border-slate-200 shadow-sm bg-white min-h-[400px] flex flex-col">
              <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-400 font-black border-b border-slate-100 uppercase text-[9px] tracking-widest sticky top-0 z-10">
                        <tr>
                            <th className="p-4 w-32">Dátum</th>
                            <th className="p-4">Položka / Doklad</th>
                            <th className="p-4 text-center">Stavba</th>
                            <th className="p-4 text-right">Suma s DPH</th>
                            <th className="p-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="p-24 text-center"><Loader2 className="animate-spin text-orange-600 mx-auto" size={40}/></td></tr>
                        ) : transactions.length === 0 ? (
                            <tr><td colSpan={5} className="p-24 text-center text-slate-400 italic font-medium uppercase text-[10px]">Neboli nájdené žiadne záznamy.</td></tr>
                        ) : (
                            transactions.slice(0, visibleCount).map(t => (
                                <tr key={t.id} onClick={() => setSelectedTransaction(t)} className={`hover:bg-slate-100 transition-colors group cursor-pointer ${t.category === 'Mzdy' ? 'bg-blue-50/10' : ''}`}>
                                    <td className="p-4"><div className="font-mono font-bold text-slate-400 text-xs">{formatDate(t.date)}</div></td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800 text-sm leading-tight group-hover:text-orange-600 transition-colors">{t.description || t.category}</div>
                                        <div className={`text-[9px] font-black uppercase tracking-widest mt-1 flex items-center gap-1 ${t.category === 'Mzdy' ? 'text-blue-500' : t.category === 'PHM' ? 'text-red-500' : 'text-slate-400'}`}>
                                            {t.category === 'Mzdy' && <Users size={10}/>}
                                            {t.category === 'PHM' && <Fuel size={10}/>}
                                            {t.category === 'Materiál' && <Package size={10}/>}
                                            {t.category}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="text-[10px] font-bold text-slate-600 truncate max-w-[120px] mx-auto bg-slate-50 py-1 px-2 rounded-lg border border-slate-100">
                                            {t.sites?.name || 'Všeobecné'}
                                        </div>
                                    </td>
                                    <td className={`p-4 text-right font-black text-base tracking-tighter ${t.type === 'invoice' ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.type === 'invoice' ? '+' : '-'}{formatMoney(t.amount)}
                                    </td>
                                    <td className="p-4 text-right">
                                        {t.itemType === 'manual' && (
                                            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: t.id }); }} className="text-slate-300 hover:text-red-500 p-2 rounded-lg transition opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
              </div>
              
              {!loading && transactions.length > visibleCount && (
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                      <Button variant="secondary" size="sm" onClick={() => setVisibleCount(v => v + PAGE_SIZE)} className="text-[10px] font-black uppercase tracking-widest">Načítať ďalších 20 položiek</Button>
                  </div>
              )}
          </Card>

          {/* BOČNÝ PANEL: SKLADBA NÁKLADOV */}
          <Card className="border-slate-200 p-6 shadow-sm bg-white flex flex-col h-fit">
              <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-[11px] uppercase tracking-widest"><PieChart size={18} className="text-orange-500"/> Skladba nákladov</h3>
              <div className="space-y-4">
                  {categoriesSummary.map((cat, i) => (
                      <div key={i} className="group">
                          <div className="flex justify-between text-[11px] mb-1.5 font-bold">
                              <span className="text-slate-600 flex items-center gap-2">
                                  {cat.name === 'Mzdy' && <Users size={12} className="text-blue-500"/>}
                                  {cat.name === 'Materiál' && <Package size={12} className="text-orange-500"/>}
                                  {cat.name === 'PHM' && <Fuel size={12} className="text-red-500"/>}
                                  {cat.name}
                              </span>
                              <span className="text-slate-900">{formatMoney(cat.value)}</span>
                          </div>
                          <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                              <div className="h-full rounded-full transition-all duration-1000 shadow-sm" style={{width: `${cat.percent}%`, backgroundColor: ['#3b82f6', '#f97316', '#ef4444', '#10b981', '#a855f7', '#6366f1'][i % 6]}}></div>
                          </div>
                      </div>
                  ))}
                  {categoriesSummary.length === 0 && <div className="text-center text-slate-300 font-bold uppercase text-[10px] italic py-12">Žiadne dáta.</div>}
              </div>
          </Card>
      </div>

      {/* MODAL: NEZAPLATENÉ FAKTÚRY (DLŽNÍCI) - BEAUTIFIED CARD DESIGN */}
      {showUnpaidModal && (
          <Modal title="Nezaplatené faktúry (Dlžníci)" onClose={() => setShowUnpaidModal(false)} maxWidth="max-w-2xl">
              <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-red-50/50 p-4 rounded-2xl border border-red-100">
                      <div className="flex items-center gap-3">
                          <div className="bg-red-500 text-white p-2.5 rounded-xl shadow-lg shadow-red-200">
                              <AlertCircle size={20} />
                          </div>
                          <div>
                              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Celkový dlh voči vám</p>
                              <p className="text-2xl font-black text-red-600 tracking-tight">{formatMoney(stats.unpaidTotal)}</p>
                          </div>
                      </div>
                      <div className="bg-white px-4 py-2 rounded-xl border border-red-100 text-center shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Počet dokladov</p>
                          <p className="text-lg font-black text-slate-800 leading-none">{unpaidInvoices.length}</p>
                      </div>
                  </div>
                  
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                      {unpaidInvoices.length === 0 ? (
                          <div className="py-16 text-center animate-in fade-in">
                              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
                                  <CheckCircle2 size={32}/>
                              </div>
                              <h4 className="font-bold text-slate-800">Skvelé! Všetko je uhradené.</h4>
                              <p className="text-xs text-slate-500 mt-1">Momentálne neevidujete žiadne nezaplatené faktúry.</p>
                          </div>
                      ) : (
                          unpaidInvoices.map(inv => (
                              <div key={inv.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:border-orange-300 transition-all group">
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                              <h4 className="font-black text-slate-800 truncate text-sm md:text-base">{inv.description || inv.category}</h4>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-y-1 gap-x-4">
                                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                  <Building2 size={12} className="text-blue-500"/> {inv.sites?.name || 'Všeobecná réžia'}
                                              </div>
                                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                  <Calendar size={12} className="text-orange-500"/> {formatDate(inv.date)}
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                                          <div className="font-black text-red-600 text-xl tracking-tight">{formatMoney(inv.amount)}</div>
                                          <button
                                              onClick={async () => {
                                                  const { error } = await supabase.from('transactions').update({ is_paid: true }).eq('id', inv.id);
                                                  if (!error) loadData(true);
                                              }}
                                              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-100 active:scale-95"
                                          >
                                              <Check size={14}/> Uhradiť
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
                  
                  <div className="pt-2">
                    <Button fullWidth onClick={() => setShowUnpaidModal(false)} variant="secondary" className="h-12 font-bold text-slate-400 border-none hover:text-slate-600">Zavrieť</Button>
                  </div>
              </div>
          </Modal>
      )}

      {/* DETAIL TRANSAKCIE MODAL */}
      {selectedTransaction && (
          <Modal title="Detail položky" onClose={() => setSelectedTransaction(null)} maxWidth="max-w-md">
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-start">
                      <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Dátum záznamu</div>
                          <div className="font-bold text-slate-900 flex items-center gap-2"><Calendar size={16} className="text-orange-500"/> {formatDate(selectedTransaction.date)}</div>
                      </div>
                      <div className="text-right">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Suma s DPH</div>
                          <div className={`text-2xl font-black tracking-tight ${selectedTransaction.type === 'invoice' ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedTransaction.type === 'invoice' ? '+' : '-'}{formatMoney(selectedTransaction.amount)}
                          </div>
                      </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-inner space-y-4">
                      <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Popis / Položka</div>
                          <div className="text-sm font-bold text-slate-800 leading-relaxed italic">"{selectedTransaction.description || selectedTransaction.category}"</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          <div>
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kategória</div>
                              <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                  {selectedTransaction.category}
                              </div>
                          </div>
                          <div>
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Priradená stavba</div>
                              <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                  <Building2 size={14} className="text-slate-400"/>
                                  {selectedTransaction.sites?.name || 'Všeobecná réžia'}
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                      <div className="bg-white p-2 rounded-xl text-blue-600 shadow-sm"><Info size={18}/></div>
                      <div>
                          <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Typ záznamu</div>
                          <div className="text-xs font-bold text-blue-800">
                              {selectedTransaction.itemType === 'manual' ? 'Ručne zapísaný výdavok (Réžia)' : 
                               selectedTransaction.itemType === 'wage' ? 'Automatický prepočet miezd z dochádzky' :
                               selectedTransaction.itemType === 'fuel' ? 'Automatický zápis z evidencie PHM' :
                               selectedTransaction.itemType === 'material' ? 'Automatický zápis z nákupu materiálu' : 'Systémový záznam'}
                          </div>
                      </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                      {selectedTransaction.itemType === 'manual' && (
                          <Button variant="danger" fullWidth onClick={() => { setSelectedTransaction(null); setConfirmDelete({ open: true, id: selectedTransaction.id }); }}>
                             <Trash2 size={16}/> Odstrániť záznam
                          </Button>
                      )}
                      <Button variant="secondary" fullWidth onClick={() => setSelectedTransaction(null)}>Zatvoriť detail</Button>
                  </div>
              </div>
          </Modal>
      )}

      {/* ADD TRANSACTION MODAL - SIMPLIFIED FOR REZIA */}
      {showAddModal && (
        <Modal title="Pridať režijný výdavok" onClose={() => setShowAddModal(false)}>
          <form onSubmit={async (e) => {
              e.preventDefault();
              // Vždy ukladáme ako réžiu a výdavok
              const { error } = await supabase.from('transactions').insert([{ 
                  ...newTrans, 
                  type: 'expense',
                  category: 'Réžia',
                  organization_id: profile.organization_id, 
                  is_paid: true
              }]);
              if (!error) { setShowAddModal(false); loadData(true); }
          }} className="space-y-6">
            
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-3">
                <Wallet className="text-orange-600" size={24}/>
                <div>
                    <h4 className="font-black text-orange-900 text-xs uppercase tracking-tight">Všeobecná firemná réžia</h4>
                    <p className="text-[10px] text-orange-700 font-medium">Tento zápis sa započíta do celkových nákladov firmy ako réžia.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Dátum výdavku" type="date" value={newTrans.date} onChange={(e: any) => setNewTrans({...newTrans, date: e.target.value})} required />
                <Input label="Suma s DPH (€)" type="number" step="0.01" value={newTrans.amount || ''} onChange={(e: any) => setNewTrans({...newTrans, amount: parseFloat(e.target.value) || 0})} required placeholder="0.00" />
            </div>
            
            <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detailný popis výdavku</label>
                <textarea 
                    className="w-full p-4 bg-white border border-slate-300 rounded-2xl outline-none focus:border-orange-500 min-h-[120px] text-sm font-medium text-slate-800 leading-relaxed shadow-inner transition-all focus:bg-slate-50/50" 
                    placeholder="Napr. Nákup spotrebného materiálu, oprava náradia, platba za internet..."
                    value={newTrans.description || ''}
                    onChange={(e) => setNewTrans({...newTrans, description: e.target.value})}
                    required
                />
            </div>

            <Select label="Voliteľné: Priradiť k stavbe" value={newTrans.site_id || ''} onChange={(e: any) => setNewTrans({...newTrans, site_id: e.target.value})}>
                <option value="">-- Bez priradenia (Všeobecná réžia) --</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            
            <Button type="submit" fullWidth size="lg" className="h-14 shadow-xl uppercase font-black text-sm tracking-widest shadow-orange-100">Uložiť režijný výdavok</Button>
          </form>
        </Modal>
      )}

      <ConfirmModal isOpen={confirmDelete.open} onClose={() => setConfirmDelete({ ...confirmDelete, open: false })} onConfirm={async () => { if(confirmDelete.id) { await supabase.from('transactions').delete().eq('id', confirmDelete.id); loadData(true); } }} title="Zmazať záznam?" message="Tento krok nie je možné vrátiť späť. Položka bude trvalo odstránená." />
    </div>
  );
};
