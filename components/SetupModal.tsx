
import React, { useState } from 'react';
import { Card, Button } from './UI';
import { Database, CheckCircle2, Copy, X } from 'lucide-react';
import { SETUP_SQL } from '../lib/database';

export const SetupModal = ({ onClose }: { onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(SETUP_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert("Kopírovanie zlyhalo, skopírujte text manuálne.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="text-orange-600" />
            Oprava Databázy (Verzia 7 - Verejné overenie firmy)
          </h2>
          <button onClick={onClose}><X className="text-slate-500" /></button>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg mb-4 text-sm text-orange-800 border border-orange-200">
          <strong>Inštrukcie:</strong>
          <ol className="list-decimal ml-4 mt-2 font-medium space-y-1">
            <li>Skopírujte SQL kód nižšie.</li>
            <li>Otvorte <a href="https://supabase.com/dashboard" target="_blank" className="underline hover:text-orange-600">Supabase SQL Editor</a>.</li>
            <li>Vložte kód a kliknite <strong>Run</strong>.</li>
            <li>Potom registrácia zamestnancov začne fungovať.</li>
          </ol>
        </div>
        <div className="relative flex-1 bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
          <button onClick={handleCopy} className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs flex items-center gap-2 transition">
            {copied ? <CheckCircle2 size={14}/> : <Copy size={14}/>} {copied ? "Hotovo" : "Kopírovať"}
          </button>
          <pre className="p-4 text-xs text-green-400 font-mono overflow-auto h-64 md:h-80 text-left custom-scrollbar">{SETUP_SQL}</pre>
        </div>
        <div className="mt-6 flex justify-end gap-3"><Button onClick={onClose}>Zavrieť</Button></div>
      </Card>
    </div>
  );
};
