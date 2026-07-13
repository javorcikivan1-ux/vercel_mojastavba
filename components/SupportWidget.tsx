
import React, { useState } from 'react';
import { supabase, UserProfile } from '../lib/supabase';
import { Button } from './UI';
import { Bug, MessageSquare, X, Send, CheckCircle2, Mail, PhoneCall } from 'lucide-react';

export const SupportWidget = ({ profile, organization }: { profile: UserProfile, organization: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [requestType, setRequestType] = useState<'support' | 'feedback'>('support');
    const [message, setMessage] = useState("");
    const [contactEmail, setContactEmail] = useState(profile.email || "");
    const [contactPhone, setContactPhone] = useState(profile.phone || "");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!message.trim() || !contactEmail.trim() || !contactPhone.trim()) {
            setError("Všetky polia sú povinné.");
            return;
        }
        setSending(true);
        setError(null);
        
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData.session?.access_token;

            if (!accessToken) {
                throw new Error("Chýba prihlásenie pre odoslanie emailu podpory.");
            }

            const mailResponse = await fetch('/api/support-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    message: message.trim(),
                    contactEmail: contactEmail.trim(),
                    contactPhone: contactPhone.trim(),
                    requestType,
                    userName: profile.full_name,
                    organizationName: organization.name,
                    organizationId: profile.organization_id
                })
            });

            const mailResult = await mailResponse.json().catch(() => ({}));
            if (!mailResponse.ok) {
                throw new Error(mailResult.error || "Požiadavka bola uložená, ale email podpory sa nepodarilo odoslať.");
            }

            setSent(true);
            setTimeout(() => { setSent(false); setMessage(""); setIsOpen(false); }, 3000);
        } catch (err: any) {
            console.error("Support error:", err);
            setError(err.message || "Nepodarilo sa odoslať správu.");
        } finally {
            setSending(false);
        }
    };

    const openPanel = (type: 'support' | 'feedback') => {
        setRequestType(type);
        setError(null);
        setSent(false);
        setIsOpen(true);
    };

    const isFeedback = requestType === 'feedback';

    return (
        <div className="fixed inset-y-0 right-0 z-[120] pointer-events-none flex items-end justify-center mb-40 md:items-center md:mb-0">
            {isOpen && (
                <>
                <div
                    className="fixed inset-0 z-0 bg-slate-950/35 backdrop-blur-[1px] md:hidden pointer-events-auto animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
                <div className="fixed left-4 right-4 bottom-24 z-10 max-h-[calc(100dvh-8rem)] md:absolute md:left-auto md:right-4 md:bottom-16 md:w-80 md:max-h-none bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-100 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 md:slide-in-from-right-4 duration-300 pointer-events-auto">
                    <div className="p-5 flex justify-between items-start border-b border-slate-50 bg-slate-50/50">
                        <div>
                            <h3 className="font-black text-sm text-slate-800 tracking-tight flex items-center gap-2">
                                {isFeedback ? (
                                    <Bug size={16} className="text-orange-500 fill-orange-50"/>
                                ) : (
                                    <MessageSquare size={16} className="text-orange-500 fill-orange-50"/>
                                )}
                                {isFeedback ? 'Podnet na zlepšenie' : 'Napíšte nám'}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">
                                {isFeedback ? 'Napíšte, čo by sme mali opraviť alebo doplniť.' : 'Ozveme sa späť do 24 h.'}
                            </p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-slate-600 transition p-1 hover:bg-white rounded-lg border border-transparent hover:border-slate-100"><X size={18}/></button>
                    </div>
                    
                    <div className="p-5 space-y-4 max-h-[calc(100dvh-14rem)] md:max-h-[70vh] overflow-y-auto custom-scrollbar">
                       <div className="relative py-1">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-orange-500"></div>
  </div>
  <div className="relative flex justify-center">
    <span className="bg-white px-3 text-[11px] font-bold text-orange-600">
      {isFeedback ? 'Váš podnet' : 'Správa'}
    </span>
  </div>
</div>

                        {sent ? (
                            <div className="py-4 text-center animate-in zoom-in">
                                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2"><CheckCircle2 size={20}/></div>
                                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Odoslané!</h4>
                                <p className="text-[10px] text-slate-400 mt-1">Odpovieme vám čoskoro.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSend} className="space-y-3">
                                {error && <div className="p-2 bg-red-50 text-red-600 text-[9px] rounded-lg border border-red-100 font-bold">{error}</div>}
                                
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"/>
                                        <input 
                                            type="email" 
                                            placeholder="Váš e-mail pre odpoveď" 
                                            className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-[11px] font-bold"
                                            value={contactEmail}
                                            onChange={(e) => setContactEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <PhoneCall size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"/>
                                        <input 
                                            type="text" 
                                            placeholder="Vaše tel. číslo" 
                                            className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-[11px] font-bold"
                                            value={contactPhone}
                                            onChange={(e) => setContactPhone(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <textarea 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-xs font-medium h-24 resize-none transition-all placeholder:text-slate-300 focus:bg-white"
                                    placeholder={isFeedback ? "Našli ste chybu, niečo vám chýba alebo máte nápad na zlepšenie?" : "Popíšte stručne váš problém alebo otázku..."}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                />
                                <Button type="submit" fullWidth loading={sending} className="h-10 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl shadow-lg shadow-orange-50">
                                    <Send size={14}/> {isFeedback ? 'Odoslať podnet' : 'Odoslať správu'}
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
                </>
            )}
            
            <button 
                onClick={() => isOpen && requestType === 'support' ? setIsOpen(false) : openPanel('support')}
                className={`fixed right-0 bottom-40 z-[110] h-10 w-8 md:h-12 md:w-10 flex items-center justify-start pl-1.5 md:pl-2 rounded-l-lg md:rounded-l-xl bg-white border-y border-l border-slate-200 shadow-[-5px_0_15px_rgba(0,0,0,0.05)] transition-all duration-500 pointer-events-auto hover:w-9 md:hover:w-12 group ${isOpen ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
                title="Technická podpora"
            >
                <div className="relative">
                    <MessageSquare size={18} className="text-orange-500 group-hover:scale-110 transition-transform md:w-5 md:h-5" />
                    {!isOpen && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 md:-top-1 md:-right-1 md:w-2 md:h-2 bg-orange-600 rounded-full border border-white animate-pulse"></span>
                    )}
                </div>
            </button>
            <button 
                onClick={() => isOpen && requestType === 'feedback' ? setIsOpen(false) : openPanel('feedback')}
                className={`fixed right-0 bottom-56 z-[110] h-10 w-8 md:h-12 md:w-10 flex items-center justify-start pl-1.5 md:pl-2 rounded-l-lg md:rounded-l-xl bg-white border-y border-l border-slate-200 shadow-[-5px_0_15px_rgba(0,0,0,0.05)] transition-all duration-500 pointer-events-auto hover:w-9 md:hover:w-12 group ${isOpen ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
                title="Poslať podnet na zlepšenie"
            >
                <div className="relative">
                    <Bug size={18} className="text-orange-500 group-hover:scale-110 transition-transform md:w-5 md:h-5" />
                    {!isOpen && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 md:-top-1 md:-right-1 md:w-2 md:h-2 bg-orange-600 rounded-full border border-white animate-pulse"></span>
                    )}
                </div>
            </button>
        </div>
    );
};
