
import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/UI';
import {
  RefreshCw,
  Package,
  CheckCircle2,
  AlertTriangle,
  ArrowUpCircle,
  Download,
  Loader2
} from 'lucide-react';

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import pkg from '../package.json';

const GITHUB_REPO_URL = "https://api.github.com/repos/javorcikivan1-ux/vercel_mojastavba/releases/latest";

const pwaUpdates = [
  {
    date: '24. júl 2026',
    version: 'v5.3.5',
    title: 'Jednoduchšia inštalácia aplikácie',
    items: [
      'Na webe pribudlo tlačidlo na inštaláciu aplikácie pre Android, iPhone, Windows a Mac.',
      'Nainštalovaná webová aplikácia sa otvorí v samostatnom okne bez adresného riadku.',
      'Úvodná obrazovka v nainštalovanej aplikácii je jednoduchšia a nezobrazuje marketingový obsah webu.'
    ]
  },
  {
    date: '13. júl 2026',
    version: 'v5.3.4',
    title: 'Cenové ponuky',
    items: [
      'Predvolená sadzba DPH bola upravená na 23 % s možnosťou zmeny pri položkách.',
      'Pri tvorbe ponuky sa dajú opakovane používať uložené názvy položiek.',
      'PDF cenová ponuka má prehľadnejší súhrn cien, zľavy, DPH a finálnej sumy.'
    ]
  },
  {
    date: '10. júl 2026',
    version: 'v5.3.0',
    title: 'Kalendár',
    items: [
      'Úlohy v rovnakom čase sa zobrazujú vedľa seba.',
      'Hotové úlohy sú v kalendári vizuálne odlíšené.'
    ]
  },
  {
    date: '7. júl 2026',
    version: 'v5.2.8',
    title: 'Dochádzka a denník práce',
    items: [
      'Mesačný výkaz dochádzky má upravený PDF export pre jednoduchšie spracovanie miezd.',
      'Denník práce má čistejší výstup a lepšie rozloženie podpisovej časti.',
      'Fotky nahrané k záznamom sa komprimujú, aby zbytočne nezapĺňali úložisko.'
    ]
  },
  {
    date: '1. júl 2026',
    version: 'v5.2.0',
    title: 'Vizuálne zjednotenie aplikácie',
    items: [
      'Zjednotené fonty, kontrast textov a veľkosti nadpisov naprieč aplikáciou.',
      'Mobilné zobrazenie v sekciách zákazky, financie, analytika a predplatné bolo upravené pre lepšiu čitateľnosť.'
    ]
  },
  {
    date: 'jún 2026',
    version: 'v5.1',
    title: 'Správa tímu a pozvánky',
    items: [
      'Pribudlo odosielanie pozvánok zamestnancom e-mailom.',
      'Pozvaní zamestnanci sa zobrazujú v tíme ako nezaregistrovaní, kým nedokončia registráciu.'
    ]
  }
];

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
  const isWebChangelog = !isCapacitor && !isElectron;

  if (isWebChangelog) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-1 sm:px-4">
        <div className="mb-7">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <RefreshCw className="text-orange-600" size={32} />
            Čo je nové
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Tu nájdete zoznam posledných aktualizácií a najdôležitejších zmien v aplikácii.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {pwaUpdates.map((update, index) => (
            <div
              key={`${update.date}-${update.title}`}
              className={`px-5 py-5 ${index !== pwaUpdates.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <h3 className="text-base font-black tracking-tight text-slate-900">{update.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                    <span>{update.date}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>{update.version}</span>
                  </div>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {update.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  useEffect(() => {
    const initVersion = async () => {
      if (isElectron) {
        try {
          // @ts-ignore
          const { ipcRenderer } = window.require('electron');
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
        } catch (e) {
          setStatus('error');
          setErrorMsg("Nepodarilo sa spojiť s procesom Windows.");
        }
      } else if (isCapacitor) {
        try {
          // KRITICKÁ ZMENA: Najprv skúsime zistiť verziu aktuálneho OTA bundlu
          const current = await CapacitorUpdater.current();
          if (current?.bundle?.version) {
            setAppVersion(current.bundle.version.trim());
          } else {
            // Ak nie je OTA bundle, skúsime natívnu verziu
            const info = await CapApp.getInfo();
            if (info.version) setAppVersion(info.version.trim());
          }
        } catch (err) {
          setAppVersion(pkg.version);
        }
      }
    };

    initVersion();

    return () => {
      if (isElectron) {
        try {
          // @ts-ignore
          const { ipcRenderer } = window.require('electron');
          ipcRenderer.removeAllListeners('app-version');
          ipcRenderer.removeAllListeners('update-status');
          ipcRenderer.removeAllListeners('download-progress');
        } catch (e) {}
      }
    };
  }, [isElectron, isCapacitor]);

  const checkForUpdates = async () => {
    setStatus('checking');
    setErrorMsg('');

    if (isElectron) {
      try {
          // @ts-ignore
          const { ipcRenderer } = window.require('electron');
          ipcRenderer.send('check-for-update');
          setTimeout(() => {
              setStatus(prev => prev === 'checking' ? 'idle' : prev);
          }, 10000);
      } catch (e) {
          setStatus('error');
          setErrorMsg("Chyba komunikácie s Windows procesom.");
      }
    } else if (isCapacitor) {
        try {
            const response = await fetch(`${GITHUB_REPO_URL}?t=${Date.now()}`);
            const data = await response.json();
            
            if (data && data.tag_name) {
                const latestVersion = data.tag_name.replace(/[vV]/g, '').trim();
                const currentVersion = appVersion.replace(/[vV]/g, '').trim();

                if (latestVersion !== currentVersion && latestVersion !== "" && currentVersion !== "") {
                    setNewVersion(latestVersion);
                    setStatus('available');
                } else {
                    setStatus('no-update');
                    setTimeout(() => setStatus('idle'), 5000);
                }
            } else {
                throw new Error("Nepodarilo sa získať dáta z GitHubu.");
            }
        } catch (err: any) {
            setStatus('error');
            setErrorMsg("Nepodarilo sa skontrolovať server. Skontrolujte pripojenie.");
        }
    } else {
        window.location.reload();
    }
  };

  const startDownload = () => {
      if (isElectron) {
          // @ts-ignore
          const { ipcRenderer } = window.require('electron');
          ipcRenderer.send('start-download');
      } else if (isCapacitor) {
          window.location.reload();
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
                Skontrolovať aktualizácie
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
              <p className="text-xs text-blue-600 font-bold mb-6 mt-1 uppercase tracking-tight">Bola vydaná nová aktualizácia systému.</p>
              
              {isCapacitor ? (
                  <div className="text-xs text-blue-800 bg-white/50 p-4 rounded-xl border border-blue-100 mb-6 font-medium leading-relaxed">
                      Pre stiahnutie tejto aktualizácie stačí reštartovať aplikáciu. Systém si nový balík stiahne automaticky pri štarte.
                  </div>
              ) : null}

              <Button onClick={isCapacitor ? () => window.location.reload() : startDownload} fullWidth className="bg-blue-600 hover:bg-blue-700 shadow-blue-100 border-none">
                {isCapacitor ? <RefreshCw size={18}/> : <Download size={18} />} 
                {isCapacitor ? 'Reštartovať a aktualizovať' : 'Stiahnuť a aktualizovať'}
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
