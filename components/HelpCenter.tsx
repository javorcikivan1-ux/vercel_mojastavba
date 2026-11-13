import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, BookOpen, HelpCircle, Search, X } from 'lucide-react';
import { HELP_ARTICLES, searchHelp, type HelpArticle, type HelpRole } from '../lib/help';

export const HelpCenter = ({ role, onClose, onContact }: { role: HelpRole; onClose: () => void; onContact: () => void }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [showAll, setShowAll] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const categories = useMemo(() => [...new Set(HELP_ARTICLES.filter(item => item.roles.includes(role)).map(item => item.category))], [role]);
  const results = useMemo(() => searchHelp(query, role, category), [query, role, category]);
  const related = useMemo(() => (article?.related || []).map(id => HELP_ARTICLES.find(item => item.id === id)).filter((item): item is HelpArticle => Boolean(item?.roles.includes(role))), [article, role]);
  const home = !article && !query.trim() && !category && !showAll;
  const featuredIds = role === 'admin'
    ? ['find-work-by-person', 'find-project-work', 'find-person-on-project', 'worker-restore', 'diary-import', 'work-documents']
    : ['worker-history', 'attendance-worker', 'worker-tasks', 'worker-delegated', 'find-missing-records', 'work-documents'];
  const featured = featuredIds.map(id => HELP_ARTICLES.find(item => item.id === id)).filter((item): item is HelpArticle => Boolean(item?.roles.includes(role)));

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    search.current?.focus();
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);

  useEffect(() => {
    body.current?.scrollTo(0, 0);
    if (article) heading.current?.focus();
  }, [article, query, category]);

  const keyboard = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    if (event.key !== 'Tab') return;
    const nodes = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]') || []).filter(node => node.getClientRects().length);
    const first = nodes[0]; const last = nodes[nodes.length - 1];
    if (event.shiftKey && (document.activeElement === first || !nodes.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  return createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-3 sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onKeyDown={keyboard} className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3"><HelpCircle size={22} className="text-orange-600" /><div><h2 id={`${id}-title`} className="text-lg font-bold text-slate-900">Nápoveda</h2><p className="mt-0.5 text-xs text-slate-500">Postupy pre {role === 'employee' ? 'zamestnanca' : 'administrátora'}</p></div></div>
        <button type="button" aria-label="Zavrieť nápovedu" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><X size={20} /></button>
      </header>
      <div className="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-7">
        <label htmlFor={`${id}-search`} className="mb-2 block text-sm font-semibold text-slate-800">Čo vás zaujíma?</label>
        <div className="relative"><Search size={18} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
          <input ref={search} id={`${id}-search`} type="search" autoComplete="off" maxLength={200} value={query} onChange={event => { setQuery(event.target.value); setCategory(''); setArticle(null); setShowAll(false); }} placeholder="Napr. kto kde pracoval…" className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
        </div>
        {!article && !home && <div aria-label="Témy návodov" className="mt-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
          {['', ...categories].map(value => <button type="button" key={value} aria-pressed={category === value} onClick={() => { setCategory(value); setShowAll(true); }} className={`min-h-9 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${category === value ? 'border-orange-200 bg-orange-50 text-orange-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{value || 'Všetky témy'}</button>)}
        </div>}
      </div>
      <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
        {article ? <article>
          <button type="button" onClick={() => { setArticle(null); search.current?.focus(); }} className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-orange-700"><ArrowLeft size={16} /> Späť na návody</button>
          <p className="mb-2 text-xs font-semibold text-orange-700">{article.category}</p>
          <h3 ref={heading} tabIndex={-1} className="text-xl font-bold leading-snug text-slate-900 outline-none">{article.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{article.summary}</p>
          <ol className="mt-6 space-y-5">{article.steps.map((step, index) => <li key={index} className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600" aria-hidden="true">{index + 1}</span><span className="text-sm leading-7 text-slate-700">{step}</span></li>)}</ol>
          {article.note && <p className="mt-6 border-l-2 border-orange-300 bg-orange-50/50 px-4 py-3 text-sm leading-relaxed text-slate-700">{article.note}</p>}
          {related.length > 0 && <nav aria-label="Súvisiace návody" className="mt-7 border-t border-slate-100 pt-5"><h4 className="mb-2 text-sm font-semibold text-slate-800">Súvisiace návody</h4><div className="space-y-1">{related.map(item => <button key={item.id} type="button" onClick={() => setArticle(item)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm font-medium text-orange-700 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><span>{item.title}</span><ArrowRight size={16} className="shrink-0" /></button>)}</div></nav>}
        </article> : home ? <div className="space-y-7">
          <section aria-labelledby={`${id}-featured`}>
            <h3 id={`${id}-featured`} className="mb-3 text-sm font-semibold text-slate-900">Čo potrebujete zistiť?</h3>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-3 sm:px-4">
              {featured.map(item => <button type="button" key={item.id} onClick={() => setArticle(item)} className="group flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium leading-relaxed text-slate-700 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"><span>{item.title}</span><ArrowRight size={16} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-600" /></button>)}
            </div>
          </section>
          <nav aria-label="Témy návodov">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">Podľa sekcie aplikácie</h3><button type="button" onClick={() => setShowAll(true)} className="min-h-9 text-xs font-semibold text-orange-700 hover:text-orange-800">Všetky návody <span aria-hidden="true">→</span></button></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{categories.map(value => <button type="button" key={value} aria-label={value} onClick={() => { setCategory(value); setShowAll(true); }} className="flex min-h-14 items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:border-orange-200 hover:bg-orange-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><span>{value}</span><span className="text-xs font-normal tabular-nums text-slate-400" aria-hidden="true">{HELP_ARTICLES.filter(item => item.roles.includes(role) && item.category === value).length}</span></button>)}</div>
          </nav>
        </div> : <>
          <p role="status" aria-live="polite" className="mb-3 text-xs text-slate-500">{query.trim() ? `Nájdené návody: ${results.length}` : category ? category : 'Vyberte návod alebo vyhľadajte svoju otázku.'}</p>
          {results.length ? <ul className="divide-y divide-slate-100">{results.map(item => <li key={item.id}><button type="button" onClick={() => setArticle(item)} className="group flex min-h-20 w-full items-center gap-3 rounded-lg py-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:px-2"><BookOpen size={18} className="shrink-0 text-slate-400 group-hover:text-orange-600" /><span className="min-w-0 flex-1"><span className="block text-xs text-slate-500">{item.category}</span><span className="mt-1 block text-sm font-semibold leading-relaxed text-slate-900">{item.title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.summary}</span></span><ArrowRight size={17} className="shrink-0 text-slate-400" /></button></li>)}</ul> : <div className="py-8 text-center"><Search size={28} className="mx-auto mb-3 text-slate-300" /><h3 className="font-semibold text-slate-800">Takýto návod sme nenašli</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">Skúste kratší výraz, napríklad „dochádzka“, „obed“ alebo „PDF“. Hľadať môžete aj bez diakritiky.</p><button type="button" onClick={() => { setQuery(''); setCategory(''); setShowAll(true); search.current?.focus(); }} className="mt-4 min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Zobraziť všetky návody</button></div>}
        </>}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3 sm:px-7"><span className="text-xs text-slate-500">Nenašli ste odpoveď?</span><button type="button" onClick={onContact} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-800">Kontaktujte nás <ArrowRight size={15} /></button></footer>
    </div>
  </div>, document.body);
};
