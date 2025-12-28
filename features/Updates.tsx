import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/UI';
import {
  RefreshCw,
  Package,
  CheckCircle2,
  AlertTriangle,
  ArrowUpCircle,
  Smartphone
} from 'lucide-react';

import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

type Status =
  | 'idle'
  | 'checking'
  | 'available'
  | 'no-update'
  | 'downloading'
  | 'ready'
  | 'error';

export const UpdatesScreen = () => {
  const [appVersion, setAppVersion] = useState<string>('1.0.0');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const isCapacitor = Capacitor.isNativePlatform();
  const isElectron = !isCapacitor && navigator.userAgent.toLowerCase().includes('electron');

  // =============================
  // INIT
  // =============================
  useEffect(() => {
    if (isElectron) {
      try {
        // @ts-ignore
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.on('app-version', (_: any, version: string) => {
          setAppVersion(version);
        });
        ipcRenderer.send('app-version');
      } catch (e) {
        console.error(e);
      }
    }

    if (isCapacitor) {
      setAppVersion('Mobile');
    }
  }, [isElectron, isCapacitor]);

  // =============================
  // CHECK FOR UPDATES
  // =============================
  const checkForUpdates = async () => {
    // ---------- ELECTRON ----------
    if (isElectron) {
      setStatus('checking');
      try {
        // @ts-ignore
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('check-for-update');
      } catch (e) {
        setStatus('error');
        setErrorMsg('Electron update error');
      }
      return;
    }

    // ---------- CAPACITOR (CAPGO) ----------
    if (isCapacitor) {
      try {
        setStatus('checking');
        setErrorMsg('');

        // Capgo si update stiahne SÁM na pozadí
        const result = await CapacitorUpdater.notifyAppReady();

        if (result) {
          setStatus('ready');
        } else {
          setStatus('no-update');
        }
      } catch (e: any) {
        setStatus('error');
        setErrorMsg(e?.message || 'Chyba pri aktualizácii');
      }
      return;
    }

    // ---------- WEB ----------
    window.location.reload();
  };

  // =============================
  // INSTALL UPDATE
  // =============================
  const installUpdate = async () => {
    if (isElectron) {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('install-update');
      return;
    }

    if (isCapacitor) {
      await CapacitorUpdater.reload();
    }
  };

  // =============================
  // UI
  // =============================
  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold flex items-center gap-2">
          <RefreshCw className="text-orange-600" />
          Aktualizácie
        </h2>
        <p className="text-sm text-slate-500">Správa verzií aplikácie</p>
      </div>

      <Card className="text-center py-10">
        <div className="mb-6">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {isCapacitor ? <Smartphone size={40} /> : <Package size={40} />}
          </div>

          <div className="text-xs uppercase text-slate-400 font-bold">
            Aktuálna verzia
          </div>

          <div className="text-3xl font-extrabold mt-1">
            {isElectron ? `v${appVersion}` : isCapacitor ? 'Mobilná App' : 'Web'}
          </div>
        </div>

        <div className="max-w-xs mx-auto space-y-4">
          {(status === 'idle' || status === 'no-update') && (
            <>
              {status === 'no-update' && (
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> Máte najnovšiu verziu
                </div>
              )}
              <Button onClick={checkForUpdates} fullWidth>
                Skontrolovať aktualizácie
              </Button>
            </>
          )}

          {status === 'checking' && (
            <div className="text-slate-500 text-sm animate-pulse">
              Kontrolujem aktualizácie…
            </div>
          )}

          {status === 'ready' && (
            <div className="bg-green-50 border p-6 rounded-xl">
              <ArrowUpCircle className="mx-auto text-green-600 mb-2" size={32} />
              <div className="font-bold text-green-800 mb-4">
                Aktualizácia pripravená
              </div>
              <Button onClick={installUpdate} fullWidth>
                Reštartovať aplikáciu
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border p-4 rounded-xl">
              <div className="flex items-center gap-2 text-red-700 font-bold mb-2 justify-center">
                <AlertTriangle size={18} /> Chyba
              </div>
              <p className="text-xs text-red-600 mb-4">{errorMsg}</p>
              <Button onClick={checkForUpdates} size="sm">
                Skúsiť znova
              </Button>
            </div>
          )}
        </div>

        <div className="mt-10 pt-6 border-t text-xs text-slate-400">
          {isElectron
            ? 'Desktop App (Electron)'
            : isCapacitor
            ? 'Mobile App (Capacitor + OTA)'
            : 'Web'}
        </div>
      </Card>
    </div>
  );
};
