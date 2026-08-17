import React from 'react';
import { Modal } from './UI';
import { ArrowRight, CheckCircle2, Crown, Info, Star, Trophy, X } from 'lucide-react';
import { PLANS } from '../features/Subscription';

type PricingModalProps = {
  onClose: () => void;
  onSelect?: () => void;
};

export const PricingModal = ({ onClose, onSelect }: PricingModalProps) => {
  return (
    <Modal title="" onClose={onClose} maxWidth="max-w-6xl" hideHeader={true}>
      <div className="relative space-y-4 px-6 pb-6 pt-2 sm:px-10 sm:pb-7 sm:pt-3">
        <button
          onClick={onClose}
          className="absolute right-2.5 top-2.5 z-50 rounded-full bg-white/90 p-1.5 text-slate-400 shadow-md shadow-slate-200/60 ring-1 ring-slate-200/80 backdrop-blur transition-all hover:bg-orange-50 hover:text-orange-600 hover:ring-orange-100 sm:right-3 sm:top-3 group"
        >
          <X size={21} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>

        <div className="grid grid-cols-1 gap-5 pt-1 md:grid-cols-3">
          {PLANS.map((plan) => {
            let borderStyle = 'border-slate-100';
            let shadowStyle = 'hover:shadow-xl';
            let bgGradient = 'from-white to-white';

            if (plan.id === 'base') {
              borderStyle = 'border-slate-200';
              shadowStyle = 'shadow-lg shadow-slate-100';
              bgGradient = 'from-slate-50/50 to-white';
            } else if (plan.id === 'standard') {
              borderStyle = 'border-orange-200';
              shadowStyle = 'shadow-xl shadow-orange-50 ring-4 ring-orange-50';
              bgGradient = 'from-amber-50/30 to-white';
            } else if (plan.id === 'pro') {
              borderStyle = 'border-slate-300';
              shadowStyle = 'shadow-xl shadow-blue-50 ring-4 ring-slate-50';
              bgGradient = 'from-slate-100/50 to-white';
            }

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col bg-gradient-to-b ${bgGradient} rounded-[2rem] border-2 p-6 sm:p-7 transition-all ${borderStyle} ${shadowStyle}`}
              >
                <div className="mb-4">
                  <h4 className={`text-2xl font-black uppercase tracking-tighter flex items-center gap-2 ${plan.accent}`}>
                    {plan.name}
                  </h4>
                  <p className="text-[9px] font-medium text-slate-500 uppercase tracking-[0.16em] mt-1">{plan.desc}</p>
                </div>

                <div className="mb-5 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">{plan.price}€</span>
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">/ bez DPH</span>
                </div>

                <div className="flex-1 space-y-2">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`mt-0.5 shrink-0 ${f.included ? 'text-green-600' : 'text-red-500'}`}>
                        {f.included ? <CheckCircle2 size={16} /> : <X size={16} strokeWidth={3} />}
                      </div>
                      <span className={`text-[11px] font-bold leading-tight ${f.included ? 'text-slate-700' : 'text-slate-900 opacity-60'}`}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>

                {plan.recommended && (
                  <img
                    src="/najoblubenejsie-peciatka.png"
                    alt="Najobľúbenejšie"
                    className="pointer-events-none absolute -bottom-8 -right-3 z-20 h-28 w-28 rotate-[-8deg] object-contain opacity-85 drop-shadow-[0_14px_20px_rgba(249,115,22,0.22)] sm:h-32 sm:w-32"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="relative !mt-14 flex flex-col gap-4 overflow-visible rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 via-amber-50/70 to-orange-50 px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <img
            src="/30dni.png"
            alt="30 dní zadarmo"
            className="absolute -top-9 left-3 h-24 w-24 object-contain drop-shadow-lg sm:-top-12 sm:left-5 sm:h-28 sm:w-28"
          />
          <div className="min-h-12 pl-24 sm:pl-28">
            <p className="leading-relaxed">
              <span className="block text-sm font-semibold text-slate-800">Vyskúšajte MojaStavba na 30 dní zadarmo</span>
              <span className="mt-0.5 block text-[11px] font-normal text-slate-500">Bez záväzkov a bez zadávania platobných údajov.</span>
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
              onSelect?.();
            }}
            className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-xl font-semibold text-[10px] uppercase tracking-[0.12em] hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-0 sm:gap-2 shrink-0 flex-col sm:flex-row leading-tight"
          >
            <span>Vyskúšať zadarmo</span>
            <span>na 30 dní</span>
            <ArrowRight size={12} className="hidden sm:block" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
