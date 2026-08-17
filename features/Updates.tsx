
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
    date: '17. august 2026',
    version: 'v5.4.4',
    title: 'Mobilné rozhranie, rozhranie zamestnanca a notifikácie',
    items: [
      'Mobilné rozhranie bolo optimalizované pre plynulejšie a prirodzenejšie používanie na smartfónoch a tabletoch.',
      'Rozhranie zamestnanca pre desktop aj mobil dostalo čistejší a prehľadnejší dizajn, ktorý lepšie odzrkadľuje moderný štýl aplikácie.',
      'V nastaveniach pribudla možnosť zapnutia push notifikácií pre kalendár. Administrátor môže povoliť upozornenia a byť informovaný včas pred začiatkom naplánovanej úlohy.'
    ]
  },
  {
    date: '5. august 2026',
    version: 'v5.4.3',
    title: 'Poloha zákazky, automatické počasie a PHM bločky',
    items: [
      'V sekcii PHM pri zákazke je možné bloček na mobile priamo odfotiť fotoaparátom. Používateľ ho nemusí najprv fotiť mimo aplikácie a následne nahrávať zo zariadenia.',
      'Po odfotení alebo nahratí bločku sa zobrazí náhľad, aby bolo možné skontrolovať, či je doklad čitateľný ešte pred uložením.',
      'V denníku práce pribudlo automatické dopĺňanie počasia pre zákazky, ktoré majú priradenú a overenú adresu.',
      'Počasie sa dopĺňa trikrát denne - ráno, na obed a podvečer. V denníku tak môže byť zachytené, že sa počasie počas dňa zmenilo.',
      'Staršie dni pred spustením tejto funkcie si vedia počasie doplniť spätne po otvorení konkrétneho dňa, ak má zákazka overenú adresu.'
    ]
  },
  {
    date: '30. júl 2026',
    version: 'v5.4.2',
    title: 'Prehľadnejší návod na inštaláciu aplikácie',
    items: [
      'Inštalačné okno teraz rozlišuje Android, iPhone, Windows a Mac a pri každej platforme zobrazuje konkrétne kroky pre najbežnejšie prehliadače.',
      'Doplnené boli návody pre Chrome, Edge, Safari, Operu a Firefox vrátane informácie, čo robiť, ak sa inštalačné tlačidlo nezobrazí.',
      'Na mobiloch bol upravený vzhľad inštalačného okna, aby sa logá a texty neprekrývali a návod sa dal pohodlne čítať aj na menšom displeji.'
    ]
  },
  {
    date: '24. júl 2026',
    version: 'v5.4.1',
    title: 'Prechod z EXE a APK na PWA',
    items: [
      'Aplikácia prešla na inštaláciu formou PWA, teda priamo z webu bez samostatného EXE alebo APK súboru.',
      'Pre používateľov je tento spôsob jednoduchší: aplikáciu si pridajú z prehliadača a po spustení sa otvorí vo vlastnom okne podobne ako bežná aplikácia.',
      'Pre vývoj a údržbu je PWA praktickejšia cesta, pretože odpadá neustále riešenie rôznych povolení, licencií a schvaľovacích procesov pre obchody s aplikáciami.',
      'Ak bude v budúcnosti technicky vhodné alebo o to bude výrazný záujem, nebránime sa návratu ku klasickým inštalačným balíkom.'
    ]
  },
  {
    date: '13. júl 2026',
    version: 'v5.4.0',
    title: 'Cenové ponuky a opakovane používané položky',
    items: [
      'Predvolená sadzba DPH bola upravená na 23 %, pričom sadzbu je stále možné zmeniť pri konkrétnej položke.',
      'Pri tvorbe cenovej ponuky si môžete opakovane vyberať uložené názvy položiek. Pomáha to firmám, ktoré často používajú rovnaké práce alebo materiály.',
      'Uložené položky sú navrhnuté tak, aby zbytočne nezapĺňali databázu cenami. Ukladá sa hlavne názov položky, ktorý urýchľuje písanie ponúk.',
      'PDF cenová ponuka má čistejší súhrn cien: suma bez DPH, zľava, základ po zľave, DPH a výsledná suma s DPH sú zobrazené prehľadnejšie.'
    ]
  },
  {
    date: '10. júl 2026',
    version: 'v5.3.9',
    title: 'Kalendár a plánovanie práce',
    items: [
      'Úlohy naplánované na rovnaký čas sa v kalendári zobrazujú vedľa seba, takže sa už vizuálne neprekrývajú.',
      'Hotové úlohy sú odlíšené od rozpracovaných. Používateľ rýchlejšie vidí, čo je vybavené a čo ešte treba riešiť.'
    ]
  },
  {
    date: '7. júl 2026',
    version: 'v5.3.8',
    title: 'Dochádzka a denník práce',
    items: [
      'Mesačný výkaz dochádzky má upravený PDF export tak, aby bol vhodnejší pre účtovníctvo a spracovanie miezd.',
      'Denník práce bol zjednodušený ako interný prehľad vykonaných prác. Zbytočné stavy a podpisové prvky boli odstránené alebo upravené.',
      'Fotky nahrané k záznamom sa komprimujú, aby úložisko vydržalo aj pri väčšom počte firiem, zamestnancov a denných fotiek.'
    ]
  },
  {
    date: '1. júl 2026',
    version: 'v5.3.7',
    title: 'Vizuálne zjednotenie aplikácie',
    items: [
      'Zjednotili sa fonty, kontrast textov, veľkosti nadpisov a štítky naprieč aplikáciou.',
      'Viaceré sivé alebo príliš malé texty boli zosilnené tak, aby boli čitateľné aj na mobile a pri horších displejoch.',
      'Mobilné zobrazenie v zákazkách, financiách, analytike, tíme a predplatnom bolo upravené tak, aby karty nezaberali zbytočné prázdne miesto.'
    ]
  },
  {
    date: '26. jún 2026',
    version: 'v5.3.6',
    title: 'Správa tímu a pozvánky',
    items: [
      'Pribudlo odosielanie pozvánok zamestnancom e-mailom priamo z aplikácie.',
      'Pozvaní zamestnanci sa zobrazujú v tíme ako pozvaní alebo nezaregistrovaní, kým nedokončia registráciu.',
      'Pri opakovanom poslaní pozvánky sa systém správa stabilnejšie a zobrazuje počet odoslaní, aby bolo jasné, čo sa už riešilo.',
      'Štítky pri zamestnancoch boli vizuálne zmenšené, aby sa dlhšie stavy nelámali zbytočne na viac riadkov.'
    ]
  },
  {
    date: '12. jún 2026',
    version: 'v5.3.5',
    title: 'Spustenie predplatného',
    items: [
      'MojaStavba bola pripravená na oficiálne spustenie predaja formou mesačného predplatného.',
      'Boli vytvorené tri programy: Silver, Gold a Platinum, aby si firmy mohli vybrať rozsah podľa veľkosti a potrieb.',
      'Pribudol objednávkový proces priamo v aplikácii. Používateľ si vie vybrať balík, doplniť fakturačné údaje a odoslať objednávku.'
    ]
  },
  {
    date: '27. máj 2026',
    version: 'v5.3.4',
    title: 'Financie a analytika zákaziek',
    items: [
      'Prehľad zákazky zobrazuje príjmy, náklady, PHM, mzdy a priebežný výsledok na jednom mieste.',
      'Analytika zákaziek bola upravená tak, aby lepšie zvládala dlhšie obdobia a väčší počet záznamov.',
      'Mobilné tabuľky boli zjednodušené, aby boli čitateľné aj bez horizontálneho posúvania.'
    ]
  },
  {
    date: '9. máj 2026',
    version: 'v5.3.3',
    title: 'PDF exporty',
    items: [
      'PDF exporty boli upravené tak, aby sa obsah správne zalamoval na viac strán a nevznikal scroll vo vygenerovanom dokumente.',
      'Export zákazky, dochádzky, denníka práce a cenovej ponuky dostal jednotnejší a profesionálnejší vizuál.',
      'Do exportov sa používajú firemné údaje, logo, pečiatka a podpis z nastavení firmy.'
    ]
  },
  {
    date: '18. apríl 2026',
    version: 'v5.3.2',
    title: 'Mobilné rozhranie',
    items: [
      'Spodné mobilné menu bolo upravené pre rýchlejší prístup k hlavným častiam aplikácie vrátane predplatného a aktualizácií.',
      'Karty v zákazkách, tíme, financiách, analytike a zálohách boli optimalizované pre menšie displeje.',
      'Opravené boli miesta s príliš malým, málo kontrastným alebo zle zalomeným textom.',
      'Navigačné panely v zákazkách boli na mobile upravené tak, aby sa položky zmestili prirodzenejšie a nepôsobili odrezané.'
    ]
  },
  {
    date: '22. marec 2026',
    version: 'v5.3.1',
    title: 'Nástenka a rýchle akcie',
    items: [
      'Nástenka bola upravená tak, aby zobrazovala praktickejšie informácie pre dennú prácu firmy.',
      'Rýchle akcie boli zmenené na konkrétne pracovné kroky, napríklad nová zákazka, nová úloha alebo príprava podkladu pre cenovú ponuku.'
    ]
  },
  {
    date: '15. február 2026',
    version: 'v5.3.0',
    title: 'Základ pracovnej aplikácie',
    items: [
      'Aplikácia obsahuje správu zákaziek, dochádzku, denník práce, tím, kalendár, financie, analytiku a zálohy.',
      'Administrátor vie spravovať firmu, zamestnancov, sadzby, prístupy a základné firemné nastavenia.',
      'Zamestnanci môžu zapisovať prácu a pracovať s pridelenými zákazkami podľa oprávnení.',
      'Cieľom tejto verzie bolo postaviť jeden pracovný systém pre zákazky, ľudí, náklady a každodennú evidenciu práce.'
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
