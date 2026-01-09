
import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/UI';
import {
  RefreshCw,
  Package,
  CheckCircle2,
  AlertTriangle,
  ArrowUpCircle,
  Smartphone,
  Download,
  Loader2
} from 'lucide-react';

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import pkg from '../package.json';

type Status =
  | 'idle'
  | 'checking'
  | 'available'
  | 'no-update'
  | 'downloading'
  | 'ready'
  | 'error';

export const UpdatesScreen = () => {
  const [appVersion, setAppVersion] = useState<string>(pkg.version);
  const [status, setStatus] = useState<Status>('idle');
  const [newVersion, setNewVersion] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const isCapacitor = Capacitor.isNativePlatform();
  const isElectron = !isCapacitor && navigator.userAgent.toLowerCase().includes('electron');

  useEffect(() => {
    if (isElectron) {
      try {
        // @ts-ignore
        const { ipcRenderer } = window.require('electron');

        // Získanie verzie z Electron procesu
        ipcRenderer.send('app-version');
        ipcRenderer.on('app-version', (_: any, version: string) => setAppVersion(version));

        const handleStatus = (_: any, newStatus: Status, info?: string) => {
          setStatus(newStatus);
          if (newStatus === 'available' && info) setNewVersion(info);
          if (newStatus === 'error' && info) setErrorMsg(info);
        };

        const handleProgress = (_: any, percent: number) => {
          setStatus('downloading');
          setProgress(Math.round(percent));
        };

        ipcRenderer.on('update-status', handleStatus);
        ipcRenderer.on('download-progress', handleProgress);

        return () => {
          ipcRenderer.removeListener('app-version', () => {});
          ipcRenderer.removeListener('update-status', handleStatus);
          ipcRenderer.removeListener('download-progress', handleProgress);
        };
      } catch (e) {
        setStatus('error');
        setErrorMsg("Nepodarilo sa spojiť s procesom Windows.");
      }
    } else if (isCapacitor) {
        // Pre mobil skúsime zistiť verziu z natívneho API
        CapApp.getInfo().then(info => {
            if (info.version && info.version !== "...") {
                setAppVersion(info.version);
            }
        });
    }
  }, [isElectron, isCapacitor]);

  const checkForUpdates = () => {
    if (isElectron) {
      setStatus('checking');
      setErrorMsg('');
      try {
          // @ts-ignore
          const { ipcRenderer } = window.require('electron');
          ipcRenderer.send('check-for-update');
          setTimeout(() => {
              setStatus(prev => prev === 'checking' ? 'idle' : prev);
          }, 10000);
      } catch (e) {
          setStatus('error');
          setErrorMsg("Chyba komunikácie.");
      }
    } else if (isCapacitor) {
        // Pre mobil len jednoduchý reload, kontrola prebieha v App.tsx cez pop-up
        window.location.reload();
    } else {
        window.location.reload();
    }
  };

  const startDownload = () => {
      if (isElectron) {
          // @ts-ignore
          const { ipcRenderer } = window.require('electron');
          ipcRenderer.send('start-download');
      }
  };

  const installAndRestart = () => {
      if (isElectron) {
          // @ts-ignore
          const { ipcRenderer } = window.require('electron');
          ipcRenderer.send('install-update');
      }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold flex items-center gap-2">
          <RefreshCw className="text-orange-600" size={32} />
          Aktualizácie
        </h2>
        <p className="text-sm text-slate-500">Správa verzií aplikácie MojaStavba</p>
      </div>

      <Card className="text-center py-10 shadow-xl border-slate-200">
        <div className="mb-10">
          <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
            <Package size={48} className="text-slate-300" />
          </div>

          <div className="text-[10px] uppercase text-slate-400 font-black tracking-[0.2em]">
            Aktuálne nainštalovaná verzia
          </div>

          <div className="text-4xl font-black mt-2 text-slate-900 tracking-tight">
            v{appVersion}
          </div>
        </div>

        <div className="max-w-sm mx-auto space-y-4">
          {(status === 'idle' || status === 'no-update') && (
            <>
              {status === 'no-update' && (
                <div className="bg-green-50 text-green-700 p-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border border-green-100 animate-in zoom-in">
                  <CheckCircle2 size={20} /> Máte najnovšiu verziu
                </div>
              )}
              <Button onClick={checkForUpdates} fullWidth size="lg" className="h-14 uppercase tracking-widest font-black text-xs shadow-orange-100">
                {isCapacitor ? 'Obnoviť aplikáciu' : 'Skontrolovať aktualizácie'}
              </Button>
            </>
          )}

          {status === 'checking' && (
            <div className="flex flex-col items-center py-4 space-y-4">
              <Loader2 className="animate-spin text-orange-500" size={32} />
              <div className="text-slate-500 font-black text-xs uppercase tracking-widest animate-pulse">
                Vyhľadávam novú verziu na serveri...
              </div>
            </div>
          )}

          {status === 'available' && (
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl animate-in fade-in slide-in-from-top-4">
              <ArrowUpCircle className="mx-auto text-blue-600 mb-3" size={40} />
              <div className="font-black text-blue-900 text-lg">Dostupná verzia v{newVersion}</div>
              <p className="text-xs text-blue-600 font-bold mb-6 mt-1 uppercase tracking-tight">Bola vydaná dôležitá aktualizácia systému.</p>
              <Button onClick={startDownload} fullWidth className="bg-blue-600 hover:bg-blue-700 shadow-blue-100 border-none">
                <Download size={18} /> Stiahnuť a aktualizovať
              </Button>
            </div>
          )}

          {status === 'downloading' && (
            <div className="space-y-4 py-4">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    <span>Sťahujem súbory...</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200 p-1 shadow-inner">
                    <div className="bg-orange-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
          )}

          {status === 'ready' && (
            <div className="bg-green-50 border border-green-200 p-8 rounded-[2rem] shadow-lg animate-in zoom-in">
              <CheckCircle2 className="mx-auto text-green-600 mb-4" size={48} />
              <div className="font-black text-green-900 text-xl tracking-tight mb-2">
                Aktualizácia je pripravená!
              </div>
              <p className="text-sm text-green-700 font-medium mb-8">
                Pre dokončenie inštalácie je potrebné reštartovať aplikáciu.
              </p>
              <Button onClick={installAndRestart} fullWidth size="lg" className="h-16 bg-green-600 hover:bg-green-700 shadow-green-100 border-none font-black uppercase tracking-widest">
                Inštalovať a reštartovať
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-red-100 p-6 rounded-3xl">
              <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
              <div className="text-red-700 font-black text-xs uppercase tracking-widest mb-3">Chyba pri aktualizácii</div>
              <p className="text-[10px] text-red-600 font-medium mb-6 leading-relaxed bg-white/50 p-3 rounded-xl border border-red-100">{errorMsg}</p>
              <Button onClick={checkForUpdates} size="sm" variant="secondary" fullWidth className="text-[10px] uppercase font-black tracking-widest h-10">
                Skúsiť znova
              </Button>
            </div>
          )}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-50 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
          Platforma: {isElectron ? 'Desktop (Windows)' : isCapacitor ? 'Mobil (Android)' : 'Web'}
        </div>
      </Card>
    </div>
  );
};
