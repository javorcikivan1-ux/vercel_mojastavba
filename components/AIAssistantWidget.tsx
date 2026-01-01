
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Bot, X, Send, User, Loader2, Sparkles } from 'lucide-react';

// @ts-ignore - Inteligentný import čistého textu z Markdown súboru (Vite feature)
import FULL_MANUAL from './ai_assistant_training_manual.md?raw';

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

                --- AKTUÁLNY KONTEXT POUŽÍVATEĽA ---
                MENO: ${profile.full_name}
                ROLE: ${profile.role === 'admin' ? 'Administrátor (Majiteľ firmy)' : 'Zamestnanec (Pracovník)'}
                FIRMA: ${organization.name}
                SADZBA: ${profile.hourly_rate || 0} €/hod
                WAGE_VISIBLE: ${profile.show_wage_in_profile ? 'Áno' : 'Nie'}
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

            setMessages(prev => [...prev, { role: 'ai', text: response.text || "Prepáč, stratil som spojenie s manuálom OS. Skús to znova." }]);
        } catch (err) {
            console.error("AI Assistant Error:", err);
            setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Momentálne prepočítavam náročnejšie dáta kódovej základne, skús to o chvíľu.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 z-[125] pointer-events-none flex items-end justify-center mb-24 md:items-center md:mb-0">
            {isOpen && (
                <div className="absolute bottom-16 right-4 w-72 md:w-80 bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-100 overflow-hidden animate-in zoom-in-95 slide-in-from-right-4 duration-300 pointer-events-auto flex flex-col h-[500px]">
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
            )}
            
            {/* Trigger Button - ladí so SupportWidget */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed right-0 bottom-24 z-[110] h-12 w-10 flex items-center justify-start pl-2 rounded-l-xl bg-white border-y border-l border-slate-200 shadow-[-5px_0_15px_rgba(0,0,0,0.05)] transition-all duration-500 pointer-events-auto hover:w-12 group ${isOpen ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
                title="MojaStavba OS Expert"
            >
                <div className="relative">
                    <Bot size={20} className="text-orange-500 group-hover:scale-110 transition-transform" />
                    {!isOpen && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-600 rounded-full border border-white animate-pulse"></span>
                    )}
                </div>
            </button>
        </div>
    );
};
