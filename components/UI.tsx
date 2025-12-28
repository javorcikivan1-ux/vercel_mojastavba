
import React from 'react';
import { Loader2, X, AlertTriangle, CheckCircle2, HelpCircle, HardHat } from 'lucide-react';

// --- CUSTOM BRAND LOGO (Reverted to Original HardHat) ---
export const CustomLogo = ({ className = "w-6 h-6", color = "text-white" }: { className?: string, color?: string }) => (
  <HardHat className={`${className} ${color}`} />
);

export const Button = ({ children, onClick, variant = 'primary', className = '', fullWidth = false, disabled = false, loading = false, size = 'md', type = 'button' }: any) => {
  const baseStyle = "rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-sm active:scale-[0.98]";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };
  const variants = {
    primary: "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200 hover:shadow-orange-300 shadow-md border border-transparent",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 hover:border-red-200",
    outline: "border-2 border-orange-600 text-orange-600 hover:bg-orange-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-orange-600"
  };
  
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled || loading}
      className={`${baseStyle} ${sizes[size as keyof typeof sizes]} ${variants[variant as keyof typeof variants]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </button>
  );
};

export const Card = ({ children, className = '', padding = 'p-6', onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${padding} ${className}`}
  >
    {children}
  </div>
);

export const Badge = ({ status }: { status: string }) => {
  const styles: any = {
    active: "bg-green-100 text-green-700 border-green-200",
    planning: "bg-blue-100 text-blue-700 border-blue-200",
    paused: "bg-yellow-100 text-yellow-700 border-yellow-200",
    finished: "bg-slate-100 text-slate-700 border-slate-200",
    completed: "bg-slate-100 text-slate-700 border-slate-200",
    todo: "bg-slate-100 text-slate-600 border-slate-200",
    done: "bg-green-50 text-green-600 border-green-200 line-through decoration-green-500/50",
    // Lead stages
    new: "bg-blue-50 text-blue-600 border-blue-100",
    contacted: "bg-yellow-50 text-yellow-600 border-yellow-100",
    meeting: "bg-purple-50 text-purple-600 border-purple-100",
    pricing: "bg-orange-50 text-orange-600 border-orange-100"
  };
  const labels: any = {
    active: "Realizácia",
    planning: "Príprava",
    paused: "Pozastavené",
    finished: "Ukončené",
    completed: "Ukončené",
    todo: "Na pláne",
    done: "Hotovo",
    // Lead stages
    new: "Nový dopyt",
    contacted: "Kontaktovaný",
    meeting: "Obhliadka",
    pricing: "Cenenie"
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.todo}`}>
      {labels[status] || status}
    </span>
  );
};

export const Modal = ({ title, onClose, children, maxWidth = 'max-w-lg' }: any) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all animate-in fade-in duration-200">
    <div className={`bg-white w-full ${maxWidth} rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200`}>
      <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-bold text-lg text-slate-900">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition hover:bg-slate-100 p-2 rounded-full"><X size={20}/></button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  </div>
);

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, type = 'danger', confirmText = 'Potvrdiť' }: any) => {
  if (!isOpen) return null;
  
  return (
    <Modal title={title} onClose={onClose} maxWidth="max-w-md">
      <div className="text-center flex flex-col items-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
          {type === 'danger' ? <AlertTriangle size={32}/> : <HelpCircle size={32}/>}
        </div>
        <p className="text-slate-600 mb-8 leading-relaxed">{message}</p>
        <div className="grid grid-cols-2 gap-3 w-full">
          <Button variant="secondary" onClick={onClose}>Zrušiť</Button>
          <Button variant={type} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
};

export const AlertModal = ({ isOpen, onClose, title, message, type = 'success' }: any) => {
  if (!isOpen) return null;

  return (
    <Modal title={title} onClose={onClose} maxWidth="max-w-sm">
      <div className="text-center flex flex-col items-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${type === 'error' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
          {type === 'error' ? <AlertTriangle size={32}/> : <CheckCircle2 size={32}/>}
        </div>
        <p className="text-slate-600 mb-6 leading-relaxed">{message}</p>
        <Button fullWidth onClick={onClose}>Rozumiem</Button>
      </div>
    </Modal>
  );
};

export const Input = (props: any) => (
  <div className="mb-4">
    {props.label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{props.label}</label>}
    <input {...props} className={`w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition disabled:bg-slate-50 disabled:text-slate-500 ${props.className || ''}`} />
  </div>
);

export const Select = (props: any) => (
  <div className="mb-4">
    {props.label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{props.label}</label>}
    <select {...props} className={`w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition cursor-pointer ${props.className || ''}`}>
      {props.children}
    </select>
  </div>
);

// --- LEGAL MODAL (GDPR & VOP) ---
// TU UPRAVUJES TEXTY PRE VOP A GDPR
export const LegalModal = ({ type, onClose }: { type: 'vop' | 'gdpr', onClose: () => void }) => {
    const titles = { vop: 'Všeobecné obchodné podmienky', gdpr: 'Ochrana osobných údajov (GDPR)' };
    
    return (
        <Modal title={titles[type]} onClose={onClose} maxWidth="max-w-2xl">
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                {type === 'vop' ? (
                    <>
                        {/* ZDE MENIT TEXT VOP */}
                        <p><strong>1. Úvodné ustanovenia</strong><br/>Tieto VOP upravujú vzťahy medzi prevádzkovateľom aplikácie MojaStavba a užívateľom. Používaním aplikácie súhlasíte s týmito podmienkami v plnom rozsahu.</p>
                        <p><strong>2. Predmet služby</strong><br/>Poskytovanie softvérových nástrojov na správu stavebných zákaziek, evidenciu dochádzky a finančné plánovanie formou SaaS (Software as a Service).</p>
                        <p><strong>3. Platobné podmienky</strong><br/>Služba je spoplatnená podľa aktuálneho cenníka. Skúšobná doba trvá 14 dní a je bezplatná. Po uplynutí skúšobnej doby je užívateľ povinný uhradiť predplatné pre pokračovanie v službe.</p>
                        <p><strong>4. Zodpovednosť</strong><br/>Prevádzkovateľ nenesie zodpovednosť za stratu dát spôsobenú chybou na strane užívateľa alebo vyššou mocou. Aplikácia je poskytovaná "tak ako je".</p>
                        <div className="p-3 bg-slate-100 rounded border border-slate-200 mt-4 text-xs italic">
                            * Toto je ukážkový text. Pre reálnu prevádzku je odporúčané vložiť kompletný právny text od advokáta.
                        </div>
                    </>
                ) : (
                    <>
                        {/* ZDE MENIT TEXT GDPR */}
                        <p><strong>1. Prevádzkovateľ</strong><br/>Vaše osobné údaje spracúva spoločnosť MojaStavba s.r.o. v súlade s Nariadením EP a Rady (EÚ) 2016/679 (GDPR).</p>
                        <p><strong>2. Účel spracovania</strong><br/>Údaje (meno, email, telefón, mzdové údaje) spracúvame výhradne za účelom poskytovania funkčnosti aplikácie, fakturácie a plnenia zákonných povinností.</p>
                        <p><strong>3. Doba uchovávania</strong><br/>Osobné údaje sú uchovávané po dobu trvania zmluvného vzťahu a následne po dobu vyžadovanú platnou legislatívou (napr. účtovníctvo).</p>
                        <p><strong>4. Vaše práva</strong><br/>Máte právo na prístup k údajom, ich opravu, vymazanie (právo byť zabudnutý), obmedzenie spracúvania a prenosnosť údajov.</p>
                        <div className="p-3 bg-slate-100 rounded border border-slate-200 mt-4 text-xs italic">
                            * Toto je ukážkový text. GDPR dokumentácia musí byť vypracovaná na mieru podľa rozsahu spracúvaných údajov.
                        </div>
                    </>
                )}
                <div className="pt-4 flex justify-end">
                    <Button onClick={onClose}>Prečítal som a rozumiem</Button>
                </div>
            </div>
        </Modal>
    );
};
