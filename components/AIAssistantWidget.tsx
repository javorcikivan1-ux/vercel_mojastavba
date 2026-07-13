
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Bot, X, Send, User, Loader2, Sparkles } from 'lucide-react';

// @ts-ignore - Inteligentný import čistého textu z Markdown súboru (Vite feature)
import FULL_MANUAL from './ai_assistant_training_manual.md?raw';

const CURRENT_APP_GUIDE = `
AKTUÁLNE FUNGOVANIE APLIKÁCIE:

Nástenka:
- Zobrazuje dnešný prehľad: úlohy po termíne, dnešný plán, stav dochádzky a počet aktívnych zákaziek.
- Pracovné skratky sú len doplnok.

Zákazky:
- Používaj termín zákazka, nie stavba ani projekt.
- Detail zákazky má záložky: Prehľad, Dochádzka, Sadzby tímu, Príjmy & výdavky, PHM, Prístupy.
- Prehľad ukazuje financie zákazky, dochádzku a náklady.
- Príjmy sú hlavne uhradené faktúry alebo platby.
- Náklady sú výdavky, materiál, PHM a mzdy z dochádzky.

Denník práce:
- Používaj názov Denník práce.
- Slúži ako pracovný prehľad zápisov k zákazke, nie ako právne podpisovaný úradný dokument.
- Vie importovať práce z dochádzky daného dňa.
- Fotky sa komprimujú, aby zbytočne nezaťažovali úložisko.

Tím:
- Zamestnancov vie admin pozvať emailom z aplikácie.
- Pozvánka odchádza z noreply@moja-stavba.sk.
- Zamestnanec sa registruje cez odkaz z pozvánky, nie cez ručné zadávanie ID firmy ako hlavný spôsob.
- Pozvánky môžu mať stav pozvaný / nezaregistrovaný, kým používateľ nedokončí registráciu.
- Admin nastavuje sadzby, rolu, viditeľnosť mzdy a zálohy.

Dochádzka:
- Dochádzka slúži na evidenciu odpracovaných hodín alebo fixnej úkolovej práce.
- Pri výkaze PDF sa dá nastaviť podrobný alebo súhrnný export a voliteľná prestávka.

Analytika:
- Firemná analytika pri všetkých zákazkách má filter obdobia: Tento rok, Minulý rok, 12 mesiacov, Celé obdobie.
- Jedna zákazka sa počíta od jej prvého reálneho záznamu.
- Kumulatívny graf ukazuje postupný vývoj príjmov a nákladov.

Nastavenia:
- Logo, pečiatka a podpis sa používajú v PDF exportoch.
- Logo alebo pečiatku je možné orezať pred uložením.

Technická podpora:
- Plávajúci widget technickej podpory posiela email na podporu.
- Neplní databázu support požiadavkami z widgetu.
`;

const cleanAssistantText = (value = '') => String(value)
    .replace(/\r/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const AIAssistantWidget = ({ profile, organization }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([
        { role: 'ai', text: 'Ahoj! Som tvoj MojaStavba AI asistent. S čím ti dnes pomôžem?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, loading, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const systemInstruction = `
                ${FULL_MANUAL}

                ${CURRENT_APP_GUIDE}

                --- AKTUÁLNY KONTEXT POUŽÍVATEĽA ---
                MENO: ${profile.full_name}
                ROLE: ${profile.role === 'admin' ? 'Administrátor (Majiteľ firmy)' : 'Zamestnanec (Pracovník)'}
                FIRMA: ${organization.name}
                SADZBA: ${profile.hourly_rate || 0} €/hod
                WAGE_VISIBLE: ${profile.show_wage_in_profile ? 'Áno' : 'Nie'}

                --- ŠTÝL ODPOVEDE ---
                Odpovedaj po slovensky, stručne a prakticky.
                Nepoužívaj markdown syntax: žiadne hviezdičky, žiadne mriežky, žiadne ###, žiadne tabuľky.
                Nepíš dlhé manuálové bloky. Radšej odpovedz v krátkych vetách alebo jednoduchom zozname.
                Ak si nie si istý aktuálnou funkciou, povedz to opatrne a odporuč kontaktovať technickú podporu.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: userMsg,
                config: { 
                    systemInstruction,
                    temperature: 0.1,
                    topP: 0.8
                }
            });

            setMessages(prev => [...prev, { role: 'ai', text: cleanAssistantText(response.text || "Prepáč, stratil som spojenie s manuálom OS. Skús to znova.") }]);
        } catch (err) {
            console.error("AI Assistant Error:", err);
            setMessages(prev => [...prev, { role: 'ai', text: 'Momentálne sa mi nepodarilo odpovedať. Skús to prosím o chvíľu.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 z-[125] pointer-events-none flex items-end justify-center mb-24 md:items-center md:mb-0">
            {isOpen && (
                <>
                <div
                    className="fixed inset-0 z-0 bg-slate-950/35 backdrop-blur-[1px] md:hidden pointer-events-auto animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
                <div className="fixed left-4 right-4 top-20 bottom-24 z-10 md:absolute md:left-auto md:right-4 md:top-auto md:bottom-16 md:w-80 bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-100 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 md:slide-in-from-right-4 duration-300 pointer-events-auto flex flex-col md:h-[500px]">
                    {/* Header - jemný dizajn ladiaci so SupportWidget */}
                    <div className="p-4 flex justify-between items-start border-b border-slate-50 bg-slate-50/50">
                        <div>
                            <h3 className="font-black text-sm text-slate-800 tracking-tight flex items-center gap-2">
                                <Bot size={16} className="text-orange-500" /> AI ASISTENT
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                AI sprievodca aplikácie
                            </p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-slate-600 transition p-1 hover:bg-white rounded-lg border border-transparent hover:border-slate-100">
                            <X size={18}/>
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] ${m.role === 'user' ? 'bg-orange-600 text-white rounded-2xl rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-2xl rounded-tl-none'} p-3 shadow-sm`}>
                                    <p className="text-xs font-medium leading-relaxed">{m.text}</p>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                                    <Loader2 size={12} className="animate-spin text-orange-500" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase italic">rozmýšľam...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Footer Input */}
                    <form onSubmit={handleSend} className="p-3 border-t border-slate-50 bg-white">
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Čo ťa zaujíma?" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 focus:bg-white transition"
                            />
                            <button 
                                type="submit" 
                                disabled={!input.trim() || loading}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition disabled:opacity-20"
                            >
                                <Send size={16}/>
                            </button>
                        </div>
                    </form>
                </div>
                </>
            )}
            
            {/* Trigger Button - ladí so SupportWidget */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed right-0 bottom-24 z-[110] h-10 w-8 md:h-12 md:w-10 flex items-center justify-start pl-1.5 md:pl-2 rounded-l-lg md:rounded-l-xl bg-white border-y border-l border-slate-200 shadow-[-5px_0_15px_rgba(0,0,0,0.05)] transition-all duration-500 pointer-events-auto hover:w-9 md:hover:w-12 group ${isOpen ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
                title="MojaStavba OS Expert"
            >
                <div className="relative">
                    <Bot size={18} className="text-orange-500 group-hover:scale-110 transition-transform md:w-5 md:h-5" />
                    {!isOpen && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 md:-top-1 md:-right-1 md:w-2 md:h-2 bg-orange-600 rounded-full border border-white animate-pulse"></span>
                    )}
                </div>
            </button>
        </div>
    );
};
