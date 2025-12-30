
import React from 'react';
import { Loader2, X, AlertTriangle, CheckCircle2, HelpCircle, HardHat } from 'lucide-react';

// --- CUSTOM BRAND LOGO ---
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
export const LegalModal = ({ type, onClose }: { type: 'vop' | 'gdpr', onClose: () => void }) => {
    const titles = { vop: 'Všeobecné obchodné podmienky', gdpr: 'Ochrana osobných údajov (GDPR)' };
    
    return (
        <Modal title={titles[type]} onClose={onClose} maxWidth="max-w-4xl">
            <div className="space-y-6 text-sm text-slate-600 leading-relaxed pb-10">
                {type === 'vop' ? (
                    <>
                        <div className="border-b border-slate-100 pb-4">
                            <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-1">Poskytovateľ</h4>
                            <p className="font-bold">LORD'S BENISON s.r.o.</p>
                            <p>Sídlo: M. Nandrássyho 654/10, 050 01 Revúca</p>
                            <p>IČO: 52404901 | DIČ: 2121022992 | IČ DPH: SK2121022992</p>
                            <p>Zápis: Obchodný register Okresného súdu Banská Bystrica, Oddiel Sro, Vložka č. 36729/S</p>
                        </div>
                        
                        <div className="space-y-4">
                            <p><strong>1. Úvodné ustanovenia a definície</strong><br/>Tieto VOP upravujú vzťahy medzi spoločnosťou LORD'S BENISON s.r.o. (Poskytovateľ) a užívateľom (zákazníkom) pri poskytovaní softvérovej služby MojaStavba. Služba je poskytovaná formou SaaS (Software as a Service) cez webové rozhranie a mobilnú aplikáciu.</p>
                            
                            <p><strong>2. Uzatvorenie zmluvy a registrácia</strong><br/>Zmluva vzniká registráciou firemného účtu. Užívateľ je povinný uviesť pravdivé údaje. Firemný účet (Admin) má právo prizývať zamestnancov (Užívateľov), za ktorých činnosť v systéme nesie plnú zodpovednosť.</p>
                            
                            <p><strong>3. Platobné podmienky a predplatné</strong><br/>Služba ponúka 14-dňovú skúšobnú lehotu. Po jej uplynutí je služba spoplatnená sumou 15 € s DPH / mesiac za jeden firemný účet (neobmedzený počet zamestnancov). Platba prebieha cez bránu Stripe. Predplatné je bez viazanosti, vypovedateľné kedykoľvek v nastaveniach.</p>
                            
                            <p><strong>4. Práva a povinnosti užívateľa</strong><br/>Užívateľ sa zaväzuje nezneužívať systém, nezasahovať do jeho bezpečnosti a využívať ho v súlade s platnou legislatívou SR. Užívateľ zodpovedá za legálnosť a správnosť dát vložených do stavebného denníka a evidencie dochádzky.</p>
                            
                            <p><strong>5. Zodpovednosť za vady a dostupnosť</strong><br/>Poskytovateľ garantuje 99% dostupnosť služby. Nenese zodpovednosť za nepriame škody, stratu zisku alebo dát spôsobenú výpadkom internetu na strane užívateľa alebo nesprávnym používaním aplikácie. Služba je poskytovaná "tak, ako je".</p>
                            
                            <p><strong>6. Ochrana duševného vlastníctva</strong><br/>Všetok softvérový kód, dizajn a značka MojaStavba sú majetkom Poskytovateľa. Užívateľ získava nevýhradnú licenciu na používanie systému počas trvania predplatného.</p>
                            
                            <p><strong>7. Záverečné ustanovenia</strong><br/>Tieto podmienky sa riadia Obchodným zákonníkom SR a zákonom č. 108/2024 Z. z. o ochrane spotrebiteľa. Prípadné spory budú riešené prednostne zmierom, následne súdom v SR.</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="border-b border-slate-100 pb-4">
                            <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-1">Prevádzkovateľ</h4>
                            <p className="font-bold">LORD'S BENISON s.r.o.</p>
                            <p>IČO: 52404901 | E-mail: sluzby@lordsbenison.eu</p>
                        </div>

                        <div className="space-y-4">
                            <p><strong>1. Rozsah a účel spracúvania</strong><br/>Spracúvame len nevyhnutné osobné údaje: meno, e-mail, telefónne číslo, mzdu (hodinovú sadzbu) a lokalizačné údaje (miesto stavby) za účelom plnenia zmluvy (prevádzka aplikácie), vedenia účtovníctva a ochrany majetku firmy.</p>
                            
                            <p><strong>2. Právny základ</strong><br/>Spracúvanie prebieha na základe plnenia zmluvy (čl. 6 ods. 1 písm. b GDPR) a oprávneného záujmu prevádzkovateľa (čl. 6 ods. 1 písm. f GDPR) pri monitorovaní pracovného výkonu a bezpečnosti práce.</p>
                            
                            <p><strong>3. Príjemcovia údajov</strong><br/>Vaše dáta sú uložené v šifrovanej podobe na serveroch Supabase (Región EÚ). Platobné údaje sú spracúvané výhradne spoločnosťou Stripe, Inc. Údaje neposkytujeme tretím stranám na marketingové účely.</p>
                            
                            <p><strong>4. Doba uchovávania</strong><br/>Osobné údaje uchovávame počas trvania účtu. Po požiadaní o zmazanie účtu sú dáta vymazané, s výnimkou údajov potrebných pre účtovníctvo, ktoré uchovávame 10 rokov podľa zákona č. 431/2002 Z. z.</p>
                            
                            <p><strong>5. Bezpečnosť a práva dotknutých osôb</strong><br/>Aplikácia využíva SSL šifrovanie a moderné bezpečnostné protokoly. Máte právo na prístup k údajom, opravu, vymazanie (právo na zabudnutie) a podanie sťažnosti na Úrad na ochranu osobných údajov SR.</p>
                            
                            <p><strong>6. Používanie cookies</strong><br/>Aplikácia používa len funkčné cookies potrebné pre autentifikáciu (prihlásenie) a stabilitu systému. Nepoužívame sledovacie ani reklamné cookies tretích strán.</p>
                        </div>
                    </>
                )}
                <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verzia 1.0.2 | Máj 2025</p>
                    <Button onClick={onClose} className="shadow-orange-100">Rozumiem</Button>
                </div>
            </div>
        </Modal>
    );
};
