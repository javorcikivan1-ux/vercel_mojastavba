
import React from 'react';
import { Card } from '../components/UI';
import { MapPin, ShieldCheck, BookOpen, Package, Briefcase } from 'lucide-react';
import { SitePermission } from '../lib/permissions';

interface PrivilegedSitesProps {
  permissions: SitePermission[];
  onAction: (siteId: string, module: 'diary' | 'finance') => void;
  t: (key: string) => string;
}

export const PrivilegedSites: React.FC<PrivilegedSitesProps> = ({ permissions, onAction, t }) => {
  if (permissions.length === 0) {
    return (
      <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-100 text-center animate-in fade-in">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={40} className="text-slate-200" />
        </div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
          Nemáte priradené žiadne špeciálne poverenia.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-6 pb-4">
      <div className="grid grid-cols-1 gap-4">
        {permissions.map((p) => (
          <Card key={p.id} className="border-slate-200 hover:border-indigo-300 transition-all shadow-sm overflow-hidden bg-white group p-0">
            <div className="p-5 flex justify-between items-start">
              <div className="min-w-0">
                <h3 className="font-black text-[15px] leading-tight text-slate-900 line-clamp-2">
                  {p.sites?.name || 'Neznáma stavba'}
                </h3>
                <p className="hidden md:flex text-xs text-slate-400 font-bold items-center gap-1.5 mt-1">
                  <MapPin size={12} className="text-slate-300" />
                  {p.sites?.address || 'Bez adresy'}
                </p>
              </div>
              <div className="hidden md:flex bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                <Briefcase size={20} />
              </div>
            </div>

            <div className={`grid ${p.can_manage_diary && p.can_manage_finance ? 'grid-cols-2' : 'grid-cols-1'} divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/30`}>
              {p.can_manage_diary && (
                <button 
                  onClick={() => onAction(p.site_id, 'diary')}
                  className="flex flex-col items-center justify-center gap-2 py-5 transition-all active:scale-95 hover:bg-white text-slate-700"
                >
                  <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                      <BookOpen size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">{t('manage_diary')}</span>
                </button>
              )}

              {p.can_manage_finance && (
                <button 
                  onClick={() => onAction(p.site_id, 'finance')}
                  className="flex flex-col items-center justify-center gap-2 py-5 transition-all active:scale-95 hover:bg-white text-slate-700"
                >
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                      <Package size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">{t('add_expense')}</span>
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
