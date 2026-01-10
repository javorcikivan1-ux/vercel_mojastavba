
import React from 'react';
import { Loader2, X, AlertTriangle, CheckCircle2, HelpCircle, HardHat, Lock } from 'lucide-react';

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
            <div className="legal-container text-slate-700">
                <style>{`
                    .legal-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; }
                    .legal-container h1 { color: #ea580c; border-bottom: 2px solid #fed7aa; padding-bottom: 10px; font-size: 1.8rem; font-weight: 800; margin-bottom: 20px; }
                    .legal-container h2 { color: #1e293b; margin-top: 35px; font-size: 1.3rem; border-left: 4px solid #ea580c; padding-left: 15px; font-weight: 700; margin-bottom: 15px; }
                    .legal-container p, .legal-container li { margin-bottom: 15px; font-size: 0.95rem; }
                    .legal-container ul { padding-left: 20px; list-style-type: disc; }
                    .legal-footer-text { margin-top: 50px; text-align: center; font-size: 0.8rem; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
                `}</style>
                
                {type === 'vop' ? (
                    <>
                        <h1>Všeobecné obchodné podmienky</h1>
                        <p>Posledná aktualizácia: 1. mája 2025</p>

                        <h2>1. Identifikácia poskytovateľa</h2>
                        <p>Prevádzkovateľom a poskytovateľom služby MojaStavba je:<br/>
                        <strong>LORD'S BENISON s.r.o.</strong><br/>
                        Sídlo: M. Nandrássyho 654/10, 050 01 Revúca<br/>
                        IČO: 52404901<br/>
                        DIČ: 2121022992<br/>
                        IČ DPH: SK2121022992<br/>
                        Zapísaná v Obchodnom registri Okresného súdu Banská Bystrica, Oddiel Sro, Vložka č. 36729/S.</p>

                        <h2>2. Definícia služby</h2>
                        <p>MojaStavba je softvérová aplikácia poskytovaná ako služba (SaaS) určená na digitalizáciu stavebnej administratívy, najmä stavebného denníka, evidencie dochádzky a sledovania projektových nákladov.</p>

                        <h2>3. Registrácia a ochrana prístupu</h2>
                        <p>Používanie služby vyžaduje vytvorenie firemného účtu. Užívateľ (Majiteľ firmy) je povinný chrániť svoje prístupové heslo a zodpovedá za činnosť všetkých zamestnancov, ktorých do systému prizve cez unikátne ID firmy.</p>

                        <h2>4. Platobné podmienky</h2>
                        <ul>
                            <li><strong>Trial:</strong> Nový užívateľ má právo na 30-dňovú bezplatnú verziu.</li>
                            <li><strong>Cena:</strong> Aktuálna cena predplatného je 15 € mesačne (vrátane DPH) za firemný účet.</li>
                            <li><strong>Fakturácia:</strong> Platba prebieha vopred na nasledujúce 30-dňové obdobie cez platobnú bránu Stripe.</li>
                            <li><strong>Zrušenie:</strong> Predplatné je možné kedykoľvek zrušiť. Služba ostane aktívna do konca predplateného obdobia.</li>
                        </ul>

                        <h2>5. Práva a povinnosti</h2>
                        <p>Poskytovateľ garantuje dostupnosť systému 99 % času s výnimkou plánovanej údržby. Užívateľ sa zaväzuje systém nepoužívať na nelegálne účely alebo na prenos škodlivého kódu.</p>

                        <h2>6. Zodpovednosť</h2>
                        <p>Služba je poskytovaná "tak, ako stojí a leží" (as is). Poskytovateľ nezodpovedá za správnosť údajov zapísaných užívateľom (napr. v stavebnom denníku) ani za prípadné sankcie zo strany štátnych orgánov spôsobené nesprávnym vedením evidencie.</p>

                        <h2>7. Riešenie sporov</h2>
                        <p>Prípadné spory budú riešené prednostne dohodou. Právne vzťahy sa riadia Obchodným zákonníkom SR. Spotrebiteľ má právo na alternatívne riešenie sporov cez Slovenskú obchodnú inšpekciu (SOI).</p>
                    </>
                ) : (
                    <>
                        <h1>Ochrana osobných údajov (GDPR)</h1>
                        <p>Posledná aktualizácia: 1. mája 2025</p>
                        
                        <h2>1. Prevádzkovateľ údajov</h2>
                        <p>Prevádzkovateľom aplikácie MojaStavba a správcom vašich osobných údajov je spoločnosť:<br/>
                        <strong>LORD'S BENISON s.r.o.</strong><br/>
                        Sídlo: M. Nandrássyho 654/10, 050 01 Revúca<br/>
                        IČO: 52404901<br/>
                        E-mail: sluzby@lordsbenison.eu</p>

                        <h2>2. Účel a právny základ spracúvania</h2>
                        <p>Vaše osobné údaje spracúvame na základe nasledovných právnych titulov:</p>
                        <ul>
                            <li><strong>Plnenie zmluvy:</strong> Poskytovanie funkcií aplikácie (dochádzka, denník, správa projektov).</li>
                            <li><strong>Zákonná povinnosť:</strong> Fakturácia a vedenie účtovníctva.</li>
                            <li><strong>Oprávnený záujem:</strong> Zabezpečenie bezpečnosti systému a ochrana pred zneužitím.</li>
                        </ul>

                        <h2>3. Kategórie spracúvaných údajov</h2>
                        <p>V systéme uchovávame len nevyhnutné údaje:</p>
                        <ul>
                            <li><strong>Identifikačné údaje:</strong> Meno a priezvisko.</li>
                            <li><strong>Kontaktné údaje:</strong> E-mailová adresa a telefónne číslo.</li>
                            <li><strong>Firemné údaje:</strong> Názov firmy, IČO, DIČ (ak sú zadané).</li>
                            <li><strong>Pracovné údaje:</strong> Hodinová sadzba, časové záznamy o práci na projektoch, fotografie zo stavieb.</li>
                        </ul>

                        <h2>4. Sprostredkovatelia a prenos údajov</h2>
                        <p>Vaše údaje neprenášame do tretích krajín mimo EÚ/EHP bez adekvátnej ochrany. Využívame nasledujúcich overených partnerov:</p>
                        <ul>
                            <li><strong>Supabase, Inc.:</strong> Cloudová databáza a úložisko (servery v EÚ).</li>
                            <li><strong>Stripe, Inc.:</strong> Spracovanie platieb a predplatného.</li>
                        </ul>

                        <h2>5. Doba uchovávania údajov</h2>
                        <p>Osobné údaje sú uchovávané po dobu trvania vášho predplatného alebo do momentu požiadania o zmazanie účtu. Po ukončení vzťahu uchovávame len údaje vyžadované zákonom o účtovníctve po dobu 10 rokov.</p>

                        <h2>6. Vaše práva ako dotknutej osoby</h2>
                        <p>V zmysle nariadenia GDPR máte právo:</p>
                        <ul>
                            <li>Požadovať prístup k vašim údajom.</li>
                            <li>Na opravu nesprávnych údajov.</li>
                            <li>Na vymazanie údajov (právo byť zabudnutý).</li>
                            <li>Na prenosnosť údajov k inému prevádzkovateľovi.</li>
                            <li>Podať sťažnosť na dozorný orgán (Úrad na ochranu osobných údajov SR).</li>
                        </ul>
                    </>
                )}

                <div className="legal-footer-text">
                    &copy; 2025 LORD'S BENISON s.r.o. | Vyvinuté pre MojaStavba.app
                </div>
            </div>
        </Modal>
    );
};
