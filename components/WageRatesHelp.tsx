import React, { useId, useState } from 'react';
import { HelpCircle } from 'lucide-react';

export const WageRatesHelp = () => {
  const [open, setOpen] = useState(false);
  const explanationId = useId();

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mzdové sadzby</span>
        <button type="button" onClick={() => setOpen(previous => !previous)}
          aria-label="Vysvetlenie mzdovej sadzby a celkovej ceny práce"
          aria-expanded={open} aria-controls={explanationId}
          className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
          <HelpCircle size={18} />
        </button>
      </div>
      {open && <div id={explanationId} className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-relaxed text-slate-600">
        <p><strong className="text-slate-800">Mzdová sadzba:</strong> hodinová mzda, ktorú zamestnanec vidí vo svojom profile, ak má zapnuté zobrazovanie mzdy.</p>
        <p><strong className="text-slate-800">Celková cena práce (CCP):</strong> úplný hodinový náklad firmy na zamestnanca. Používa sa pri výpočte nákladov a analytiky zákaziek a firmy.</p>
      </div>}
    </div>
  );
};
