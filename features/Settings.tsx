
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, AlertModal, LegalModal, ConfirmModal, Select, Modal } from '../components/UI';
import { 
  Lock, Save, Settings, Copy, CheckCircle2, Building2, KeyRound, 
  Bell, BellRing, Image as ImageIcon, Shield, Users, LogOut, Clock, 
  RefreshCw, FileText, Tags, Trash2, Plus, Palette, Check, 
  Camera, Loader2, FileSignature, AlertTriangle, MapPin, CreditCard,
} from 'lucide-react';
import { UpdatesScreen } from './Updates';
import { Capacitor } from '@capacitor/core';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationStatus,
  type PushNotificationStatus
} from '../lib/pushNotifications';

// Pastel palette for task categories
const PASTEL_COLORS = [
    { label: 'Modrá', hex: '#dbeafe' },      // blue-100
    { label: 'Zelená', hex: '#dcfce7' },     // green-100
    { label: 'Žltá', hex: '#fef9c3' },       // yellow-100
    { label: 'Oranžová', hex: '#ffedd5' },   // orange-100
    { label: 'Fialová', hex: '#f3e8ff' },    // purple-100
    { label: 'Červená', hex: '#fee2e2' },    // red-100
    { label: 'Sivá', hex: '#f1f5f9' },       // slate-100
    { label: 'Tyrkysová', hex: '#ccfbf1' },  // teal-100
];

const getCroppedImg = (
    imageSrc: string,
    pixelCrop: any,
    options: { mimeType?: string; outputWidth?: number; outputHeight?: number } = {}
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const mimeType = options.mimeType || 'image/jpeg';
            const targetWidth = options.outputWidth || 512;
            const targetHeight = options.outputHeight || Math.max(1, Math.round(targetWidth * (pixelCrop.height / pixelCrop.width)));
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Canvas context not found'));
                return;
            }

            if (mimeType === 'image/jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, targetWidth, targetHeight);
            }

            ctx.drawImage(
                image,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                targetWidth,
                targetHeight
            );

            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Chyba pri generovaní orezu.'));
            }, mimeType, 0.9);
        };
        image.onerror = reject;
    });
};

const compressStamp = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scale = Math.min(1, MAX_WIDTH / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Chyba pri kompresii pečiatky.'));
                }, 'image/png', 0.9);
            };
        };
        reader.onerror = (err) => reject(err);
    });
};

const CropPreview = ({ imageSrc, pixelCrop, className, mimeType = 'image/png' }: { imageSrc: string; pixelCrop: any; className?: string; mimeType?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewWidth = 900;
  const previewHeight = Math.max(1, Math.round(previewWidth * ((pixelCrop?.height || 420) / (pixelCrop?.width || 900))));

  useEffect(() => {
      if (!imageSrc || !pixelCrop || !canvasRef.current) return;
      const image = new Image();
      image.src = imageSrc;
      image.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (mimeType === 'image/jpeg') {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(
              image,
              pixelCrop.x,
              pixelCrop.y,
              pixelCrop.width,
              pixelCrop.height,
              0,
              0,
              canvas.width,
              canvas.height
          );
      };
  }, [imageSrc, pixelCrop, mimeType, previewHeight]);

  return <canvas ref={canvasRef} width={previewWidth} height={previewHeight} className={className} />;
};

type CropBox = { left: number; top: number; right: number; bottom: number };
type CropEdge = 'left' | 'right' | 'top' | 'bottom';

const clampCropValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const EdgeCropper = ({
    imageSrc,
    imageSize,
    cropBox,
    onCropBoxChange,
    onCropPixelsChange
}: {
    imageSrc: string;
    imageSize: { width: number; height: number } | null;
    cropBox: CropBox;
    onCropBoxChange: (box: CropBox) => void;
    onCropPixelsChange: (pixelCrop: any) => void;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [imageRect, setImageRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
    const MIN_SIZE = 5;

    const updateImageRect = useCallback(() => {
        const container = containerRef.current;
        const image = imageRef.current;
        if (!container || !image) return;
        const containerBox = container.getBoundingClientRect();
        const imageBox = image.getBoundingClientRect();
        setImageRect({
            left: imageBox.left - containerBox.left,
            top: imageBox.top - containerBox.top,
            width: imageBox.width,
            height: imageBox.height
        });
    }, []);

    useEffect(() => {
        updateImageRect();
        window.addEventListener('resize', updateImageRect);
        return () => window.removeEventListener('resize', updateImageRect);
    }, [updateImageRect, imageSrc]);

    useEffect(() => {
        if (!imageSize) return;
        onCropPixelsChange({
            x: Math.round((cropBox.left / 100) * imageSize.width),
            y: Math.round((cropBox.top / 100) * imageSize.height),
            width: Math.round(((cropBox.right - cropBox.left) / 100) * imageSize.width),
            height: Math.round(((cropBox.bottom - cropBox.top) / 100) * imageSize.height)
        });
    }, [cropBox, imageSize, onCropPixelsChange]);

    const startDrag = (edge: CropEdge) => (event: React.PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const rect = imageRect;
        const move = (moveEvent: PointerEvent) => {
            if (!rect.width || !rect.height) return;
            const xPct = clampCropValue(((moveEvent.clientX - (containerRef.current?.getBoundingClientRect().left || 0) - rect.left) / rect.width) * 100, 0, 100);
            const yPct = clampCropValue(((moveEvent.clientY - (containerRef.current?.getBoundingClientRect().top || 0) - rect.top) / rect.height) * 100, 0, 100);
            onCropBoxChange({
                left: edge === 'left' ? clampCropValue(xPct, 0, cropBox.right - MIN_SIZE) : cropBox.left,
                right: edge === 'right' ? clampCropValue(xPct, cropBox.left + MIN_SIZE, 100) : cropBox.right,
                top: edge === 'top' ? clampCropValue(yPct, 0, cropBox.bottom - MIN_SIZE) : cropBox.top,
                bottom: edge === 'bottom' ? clampCropValue(yPct, cropBox.top + MIN_SIZE, 100) : cropBox.bottom
            });
        };
        const stop = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', stop);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
    };

    const cropStyle = {
        left: imageRect.left + (cropBox.left / 100) * imageRect.width,
        top: imageRect.top + (cropBox.top / 100) * imageRect.height,
        width: ((cropBox.right - cropBox.left) / 100) * imageRect.width,
        height: ((cropBox.bottom - cropBox.top) / 100) * imageRect.height
    };

    const outside = {
        left: imageRect.left,
        top: imageRect.top,
        width: imageRect.width,
        height: imageRect.height
    };

    return (
        <div ref={containerRef} className="relative h-64 md:h-96 w-full bg-slate-50 rounded-2xl overflow-hidden border-4 border-slate-100 shadow-inner select-none">
            <img
                ref={imageRef}
                src={imageSrc}
                alt="Orezávaný obrázok"
                draggable={false}
                onLoad={updateImageRect}
                className="absolute inset-0 m-auto max-w-full max-h-full object-contain pointer-events-none"
            />
            <div className="absolute bg-slate-950/55 pointer-events-none" style={{ left: outside.left, top: outside.top, width: outside.width, height: cropStyle.top - outside.top }} />
            <div className="absolute bg-slate-950/55 pointer-events-none" style={{ left: outside.left, top: cropStyle.top + cropStyle.height, width: outside.width, height: outside.top + outside.height - (cropStyle.top + cropStyle.height) }} />
            <div className="absolute bg-slate-950/55 pointer-events-none" style={{ left: outside.left, top: cropStyle.top, width: cropStyle.left - outside.left, height: cropStyle.height }} />
            <div className="absolute bg-slate-950/55 pointer-events-none" style={{ left: cropStyle.left + cropStyle.width, top: cropStyle.top, width: outside.left + outside.width - (cropStyle.left + cropStyle.width), height: cropStyle.height }} />

            <div className="absolute border-2 border-orange-500 shadow-[0_0_0_1px_rgba(255,255,255,0.9)] pointer-events-none" style={cropStyle}>
                <div className="absolute left-1/3 top-0 h-full w-px bg-white/45" />
                <div className="absolute left-2/3 top-0 h-full w-px bg-white/45" />
                <div className="absolute left-0 top-1/3 h-px w-full bg-white/45" />
                <div className="absolute left-0 top-2/3 h-px w-full bg-white/45" />
            </div>
            <button type="button" aria-label="Orezať zľava" onPointerDown={startDrag('left')} className="absolute z-10 -translate-x-1/2 cursor-ew-resize rounded-full bg-orange-600 shadow-lg ring-4 ring-white/90 w-6 h-16" style={{ left: cropStyle.left, top: cropStyle.top + cropStyle.height / 2 - 32 }} />
            <button type="button" aria-label="Orezať sprava" onPointerDown={startDrag('right')} className="absolute z-10 -translate-x-1/2 cursor-ew-resize rounded-full bg-orange-600 shadow-lg ring-4 ring-white/90 w-6 h-16" style={{ left: cropStyle.left + cropStyle.width, top: cropStyle.top + cropStyle.height / 2 - 32 }} />
            <button type="button" aria-label="Orezať zhora" onPointerDown={startDrag('top')} className="absolute z-10 -translate-x-1/2 cursor-ns-resize rounded-full bg-orange-600 shadow-lg ring-4 ring-white/90 h-6 w-20" style={{ left: cropStyle.left + cropStyle.width / 2, top: cropStyle.top + 10 }} />
            <button type="button" aria-label="Orezať zdola" onPointerDown={startDrag('bottom')} className="absolute z-10 -translate-x-1/2 cursor-ns-resize rounded-full bg-orange-600 shadow-lg ring-4 ring-white/90 h-6 w-20" style={{ left: cropStyle.left + cropStyle.width / 2, top: cropStyle.top + cropStyle.height - 34 }} />
        </div>
    );
};

export const SettingsScreen = ({ profile, organization, onUpdateOrg, onUpdateProfile, initialTab = 'general' }: any) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  
  // Cropper states
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'logo' | 'stamp'>('logo');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [cropImageSize, setCropImageSize] = useState<{ width: number; height: number } | null>(null);
  const [cropBox, setCropBox] = useState<CropBox>({ left: 0, top: 0, right: 100, bottom: 100 });
  
  const [uploading, setUploading] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [alertState, setAlertState] = useState({ open: false, title: '', message: '', type: 'success' });
  const [copied, setCopied] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState<'vop' | 'gdpr' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  const isCapacitor = Capacitor.isNativePlatform();
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');
  const isApp = isCapacitor || isElectron;
  const isStandalonePwa = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  const isBrowserWebsite = !isApp && !isStandalonePwa;

  useEffect(() => {
      if (initialTab === 'updates' && !isApp) {
          setActiveTab('general');
      } else {
          setActiveTab(initialTab);
      }
  }, [initialTab, isApp]);

  const [orgData, setOrgData] = useState({
      name: organization?.name || '',
      logo_url: organization?.logo_url || '',
      stamp_url: organization?.stamp_url || '',
      ico: organization?.ico || '',
      dic: organization?.dic || '',
      ic_dph: organization?.ic_dph || '',
      is_vat_payer: organization?.is_vat_payer || false,
      address_type: organization?.address_type || 'sidlo',
      business_address: organization?.business_address || ''
  });

  const [notifications, setNotifications] = useState({
      notify_tasks: profile.settings?.notify_tasks ?? true
  });
  const [pushStatus, setPushStatus] = useState<PushNotificationStatus>('loading');
  const [notificationSaving, setNotificationSaving] = useState(false);

  const [taskCategories, setTaskCategories] = useState<any[]>(profile.settings?.task_categories || [
      { id: '1', label: 'Všeobecné', color: '#f1f5f9' },
      { id: '2', label: 'Stavba', color: '#ffedd5' },
      { id: '3', label: 'Administratíva', color: '#dbeafe' }
  ]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PASTEL_COLORS[0].hex);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
      if(organization) {
          setOrgData({
              name: organization.name,
              logo_url: organization.logo_url || '',
              stamp_url: organization.stamp_url || '',
              ico: organization.ico || '',
              dic: organization.dic || '',
              ic_dph: organization.ic_dph || '',
              is_vat_payer: organization.is_vat_payer || false,
              address_type: organization.address_type || 'sidlo',
              business_address: organization.business_address || ''
          });
      }
  }, [organization]);

  useEffect(() => {
      if (isApp || isBrowserWebsite) {
          setPushStatus('unsupported');
          return;
      }
      getPushNotificationStatus().then(setPushStatus).catch(() => setPushStatus('disabled'));
  }, [isApp, isBrowserWebsite]);

  const calendarNotificationsEnabled = notifications.notify_tasks && (isApp || pushStatus === 'enabled');

  const toggleCalendarNotifications = async () => {
      const enabled = !calendarNotificationsEnabled;
      let subscriptionCreated = false;
      setNotificationSaving(true);
      try {
          if (enabled && !isApp && pushStatus !== 'enabled') {
              await enablePushNotifications();
              subscriptionCreated = true;
          }

          const updatedSettings = { ...profile.settings, notify_tasks: enabled };
          const { error } = await supabase.from('profiles').update({ settings: updatedSettings }).eq('id', profile.id);
          if (error) throw error;

          if (!enabled && !isApp && pushStatus === 'enabled') {
              await disablePushNotifications();
          }

          setPushStatus(isApp ? 'unsupported' : enabled ? 'enabled' : 'disabled');
          setNotifications(prev => ({ ...prev, notify_tasks: enabled }));
          if (onUpdateProfile) onUpdateProfile({ ...profile, settings: updatedSettings });
          setAlertState({
              open: true,
              title: enabled ? 'Upozornenia zapnuté' : 'Upozornenia vypnuté',
              message: enabled
                  ? 'Upozornenia pre úlohy v kalendári sú aktívne.'
                  : 'Upozornenia pre úlohy v kalendári sú vypnuté.',
              type: 'success'
          });
      } catch (err: any) {
          if (subscriptionCreated) await disablePushNotifications().catch(() => undefined);
          const nextStatus = await getPushNotificationStatus().catch(() => 'disabled' as PushNotificationStatus);
          setPushStatus(nextStatus);
          setAlertState({ open: true, title: 'Upozornenia sa nepodarilo zmeniť', message: err.message, type: 'error' });
      } finally {
          setNotificationSaving(false);
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.readAsDataURL(e.target.files[0]);
          reader.onload = () => {
              const image = new Image();
              image.src = reader.result as string;
              image.onload = () => setCropImageSize({ width: image.naturalWidth, height: image.naturalHeight });
              setCropTarget('logo');
              setCropBox({ left: 0, top: 0, right: 100, bottom: 100 });
              setCroppedAreaPixels(null);
              setCroppingImage(reader.result as string);
          };
      }
  };

  const handleApplyCrop = async () => {
    if (!croppingImage || !croppedAreaPixels) return;
    const isStamp = cropTarget === 'stamp';
    if (isStamp) setUploadingStamp(true);
    else setUploading(true);
    try {
        const blob = await getCroppedImg(croppingImage, croppedAreaPixels, isStamp
            ? { mimeType: 'image/png', outputWidth: 900, outputHeight: 420 }
            : { mimeType: 'image/png', outputWidth: 900 }
        );
        const fileName = `${profile.organization_id}/${isStamp ? 'stamp' : 'logo'}-${Date.now()}.png`;
        const filePath = `${isStamp ? 'stamps' : 'logos'}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
            .from('diary-photos')
            .upload(filePath, blob, { contentType: 'image/png', upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('diary-photos')
            .getPublicUrl(filePath);

        const updateKey = isStamp ? 'stamp_url' : 'logo_url';
        setOrgData(prev => ({ ...prev, [updateKey]: publicUrl }));
        await supabase.from('organizations').update({ [updateKey]: publicUrl }).eq('id', profile.organization_id);
        onUpdateOrg({ ...organization, [updateKey]: publicUrl });
        
        setCroppingImage(null);
    } catch (err: any) {
        setAlertState({ open: true, title: 'Chyba', message: `Nepodarilo sa nahrať ${cropTarget === 'stamp' ? 'pečiatku' : 'logo'}: ` + err.message, type: 'error' });
    } finally {
        setUploading(false);
        setUploadingStamp(false);
    }
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.readAsDataURL(e.target.files[0]);
          reader.onload = () => {
              const image = new Image();
              image.src = reader.result as string;
              image.onload = () => setCropImageSize({ width: image.naturalWidth, height: image.naturalHeight });
              setCropTarget('stamp');
              setCropBox({ left: 0, top: 0, right: 100, bottom: 100 });
              setCroppedAreaPixels(null);
              setCroppingImage(reader.result as string);
          };
      }
  };

  const saveGeneralSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          const { error: orgError } = await supabase.from('organizations').update(orgData).eq('id', profile.organization_id);
          if (orgError) throw orgError;
          onUpdateOrg({ ...organization, ...orgData });
          setAlertState({ open: true, title: 'Uložené', message: 'Firemné údaje boli úspešne aktualizované.', type: 'success' });
      } catch (err: any) {
          setAlertState({ open: true, title: 'Chyba', message: err.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const saveCategories = async () => {
      setLoading(true);
      try {
          const updatedSettings = { ...profile.settings, task_categories: taskCategories };
          const { error } = await supabase.from('profiles').update({ settings: updatedSettings }).eq('id', profile.id);
          if (error) throw error;
          if (onUpdateProfile) onUpdateProfile({ ...profile, settings: updatedSettings });
          setAlertState({ open: true, title: 'Uložené', message: 'Kategórie boli aktualizované.', type: 'success' });
      } catch (err: any) {
          setAlertState({ open: true, title: 'Chyba', message: err.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const addCategory = () => {
      if (!newCatName.trim()) return;
      setTaskCategories([...taskCategories, { id: crypto.randomUUID(), label: newCatName, color: newCatColor }]);
      setNewCatName('');
  };

  const removeCategory = (id: string) => {
      setTaskCategories(taskCategories.filter(c => c.id !== id));
  };

  const changePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          setAlertState({ open: true, title: 'Chyba', message: 'Heslá sa nezhodujú.', type: 'error' });
          return;
      }
      if (newPassword.length < 6) {
           setAlertState({ open: true, title: 'Chyba', message: 'Heslo musí mať aspoň 6 znakov.', type: 'error' });
           return;
      }
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setLoading(false);
      if (error) {
          setAlertState({ open: true, title: 'Chyba', message: error.message, type: 'error' });
      } else {
          setAlertState({ open: true, title: 'Úspech', message: 'Vaše heslo bolo úspešne zmenené.', type: 'success' });
          setNewPassword('');
          setConfirmPassword('');
      }
  };

  const handleDeleteAccountRequest = async () => {
      setLoading(true);
      try {
          await supabase.from('support_requests').insert([{
              organization_id: profile.organization_id,
              user_id: profile.id,
              user_name: profile.full_name,
              org_name: organization.name,
              message: "ŽIADOSŤ O ZMAZANIE ÚČTU A VŠETKÝCH DÁT FIRMY. Používateľ potvrdil vymazanie v nastaveniach aplikácie."
          }]);
          setAlertState({ 
              open: true, 
              title: 'Žiadosť odoslaná', 
              message: 'Vaša žiadosť o zmazanie účtu bola prijatá. Budeme vás kontaktovať e-mailom pre potvrdenie totožnosti a následne dôjde k trvalému zmazaniu všetkých dát do 48 hodín.', 
              type: 'success' 
          });
      } catch (e: any) {
          setAlertState({ open: true, title: 'Chyba', message: e.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const copyOrgId = () => {
      navigator.clipboard.writeText(profile.organization_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${activeTab === id ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          <Icon size={18} className={activeTab === id ? 'text-orange-600' : 'text-slate-400'}/> {label}
      </button>
  );

  const isCustomColor = !PASTEL_COLORS.some(c => c.hex === newCatColor);
  return (
    <div className="space-y-6">
        <div className="mb-2">
           <h2 className="app-section-title"><Settings className="text-orange-600" /> Nastavenia</h2>
           <p className="app-section-subtitle">Správa účtu a firemné predvoľby</p>
        </div>

        <div className="bg-white border-b border-slate-200 sticky top-0 z-20 -mx-4 px-4 md:mx-0 md:px-0 md:static">
             <div className="flex overflow-x-auto no-scrollbar pb-1px">
                <TabButton id="general" label="Všeobecné" icon={Building2} />
                {profile?.role === 'admin' && <TabButton id="notifications" label="Notifikácie" icon={Bell} />}
                <TabButton id="categories" label="Kategórie úloh" icon={Tags} />
                <TabButton id="security" label="Zabezpečenie" icon={Shield} />
                <TabButton id="team" label="Tím" icon={Users} />
                {isApp && <TabButton id="updates" label="Aktualizácie" icon={RefreshCw} />}
             </div>
        </div>

        <div className="flex flex-col gap-6">
            <div className="flex-1">
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Card>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 pb-8 border-b border-slate-100">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative group">
                                        <div onClick={() => fileInputRef.current?.click()} tabIndex={-1} className="w-44 h-28 rounded-2xl border-4 border-white shadow-2xl overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer group-hover:scale-105 transition-transform select-none caret-transparent outline-none focus:outline-none">
                                            {uploading ? <Loader2 className="animate-spin text-orange-600" size={32}/> : orgData.logo_url ? <img src={orgData.logo_url} alt="Logo" draggable={false} className="w-full h-full object-contain p-3 pointer-events-none select-none" /> : <Building2 size={48} className="text-slate-300" />}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={24}/></div>
                                        </div>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                                        <div className="absolute -bottom-2 -right-2 bg-orange-600 text-white p-2 rounded-full shadow-lg border-2 border-white"><ImageIcon size={16}/></div>
                                    </div>
                                    <div className="text-center"><h3 className="font-black text-slate-900">Logo Firmy</h3></div>
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative group">
                                        <div onClick={() => stampInputRef.current?.click()} tabIndex={-1} className="w-44 h-28 rounded-2xl border-4 border-white shadow-2xl overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer group-hover:scale-105 transition-transform select-none caret-transparent outline-none focus:outline-none">
                                            {uploadingStamp ? <Loader2 className="animate-spin text-orange-600" size={32}/> : orgData.stamp_url ? <img src={orgData.stamp_url} alt="Stamp" draggable={false} className="w-full h-full object-contain p-2 pointer-events-none select-none" /> : <FileSignature size={48} className="text-slate-300" />}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={24}/></div>
                                        </div>
                                        <input type="file" ref={stampInputRef} className="hidden" accept="image/*" onChange={handleStampUpload} />
                                        <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white"><FileSignature size={16}/></div>
                                    </div>
                                    <div className="text-center"><h3 className="font-black text-slate-900">Pečiatka a Podpis</h3></div>
                                </div>
                            </div>

                            <form onSubmit={saveGeneralSettings} className="space-y-6">
                                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"><Building2 className="text-orange-600" size={20}/> Firemné údaje</h4>
                                <div className="grid grid-cols-1 gap-x-4 md:grid-cols-12">
                                    <div className="md:col-span-6">
                                        <Input label="Názov firmy" value={orgData.name} onChange={(e: any) => setOrgData({...orgData, name: e.target.value})} required placeholder="Moja Firma s.r.o." />
                                    </div>
                                    <div className="md:col-span-3">
                                        <Input label="IČO" value={orgData.ico} onChange={(e: any) => setOrgData({...orgData, ico: e.target.value})} placeholder="12345678" />
                                    </div>
                                    <div className="md:col-span-3">
                                        <Input label="DIČ" value={orgData.dic} onChange={(e: any) => setOrgData({...orgData, dic: e.target.value})} placeholder="2021234567" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-x-4 md:grid-cols-12">
                                    <div className="mb-4 md:col-span-4">
                                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">DPH</span>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={orgData.is_vat_payer}
                                            onClick={() => setOrgData({...orgData, is_vat_payer: !orgData.is_vat_payer})}
                                            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition focus:outline-none focus:ring-4 focus:ring-orange-500/10 ${orgData.is_vat_payer ? 'border-orange-200 bg-orange-50/70' : 'border-slate-300 bg-white'}`}
                                        >
                                            <span className={`text-sm font-bold ${orgData.is_vat_payer ? 'text-slate-800' : 'text-slate-600'}`}>
                                                {orgData.is_vat_payer ? 'Platiteľ DPH' : 'Neplatiteľ DPH'}
                                            </span>
                                            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${orgData.is_vat_payer ? 'bg-orange-600' : 'bg-slate-300'}`}>
                                                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${orgData.is_vat_payer ? 'translate-x-6' : 'translate-x-1'}`}/>
                                            </span>
                                        </button>
                                    </div>
                                    <div className="md:col-span-4">
                                        <Input label="IČ DPH" value={orgData.ic_dph} onChange={(e: any) => setOrgData({...orgData, ic_dph: e.target.value})} disabled={!orgData.is_vat_payer} placeholder={orgData.is_vat_payer ? 'SK2021234567' : 'Dostupné pre platiteľa DPH'} />
                                    </div>
                                    <div className="md:col-span-4">
                                        <Select label="Typ adresy" value={orgData.address_type} onChange={(e: any) => setOrgData({...orgData, address_type: e.target.value})}>
                                            <option value="sidlo">Sídlo firmy</option>
                                            <option value="miesto">Miesto podnikania</option>
                                        </Select>
                                    </div>
                                </div>

                                <Input label="Adresa" value={orgData.business_address} onChange={(e: any) => setOrgData({...orgData, business_address: e.target.value})} placeholder="Ulica 123, 900 00 Mesto" />

                                <div className="flex justify-end border-t border-slate-100 pt-5">
                                    <Button type="submit" loading={loading} size="md" className="w-full px-7 sm:w-auto sm:min-w-56">Uložiť firemné údaje</Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}

                {profile?.role === 'admin' && activeTab === 'notifications' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        {isBrowserWebsite ? (
                            <Card>
                                <p className="py-2 text-sm font-medium text-slate-600">Notifikácie sú dostupné len v aplikácii.</p>
                            </Card>
                        ) : (
                        <Card>
                            <div className="flex items-start gap-4 border-b border-slate-100 pb-5">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                                    <BellRing size={22}/>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Notifikácie kalendára</h3>
                                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                                        Upozornenia sa týkajú úloh v kalendári a zobrazia sa 1 hodinu pred začiatkom, 15 minút pred začiatkom a bezprostredne pri začiatku úlohy.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${calendarNotificationsEnabled ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-400'}`}>
                                        <Bell size={20}/>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-800">Zapnúť upozornenia pre kalendár</div>
                                        <div className={`mt-0.5 text-xs font-semibold ${calendarNotificationsEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {calendarNotificationsEnabled ? 'Zapnuté' : 'Vypnuté'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={calendarNotificationsEnabled}
                                    aria-label="Zapnúť upozornenia pre kalendár"
                                    onClick={toggleCalendarNotifications}
                                    disabled={notificationSaving}
                                    className={`relative h-8 w-14 shrink-0 rounded-full border-2 shadow-inner transition-all focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:opacity-60 ${calendarNotificationsEnabled ? 'border-orange-600 bg-orange-600' : 'border-slate-300 bg-slate-300'}`}
                                >
                                    <span className={`absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform ${calendarNotificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`}>
                                        {notificationSaving && <Loader2 className="animate-spin text-slate-400" size={13}/>} 
                                    </span>
                                </button>
                            </div>
                        </Card>
                        )}
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Card>
                            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2"><Tags className="text-orange-600" size={20}/> Kategórie úloh</h3>
                            <p className="text-sm text-slate-500 mb-6">Vytvorte si vlastné typy úloh a priraďte im farby pre lepšiu prehľadnosť v kalendári.</p>
                            <div className="space-y-3 mb-6">{taskCategories.map(cat => (<div key={cat.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm"><div className="w-8 h-8 rounded-full shadow-inner border border-black/5" style={{ backgroundColor: cat.color }}></div><div className="font-bold text-slate-700 flex-1">{cat.label}</div><button onClick={() => removeCategory(cat.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={16}/></button></div>))}{taskCategories.length === 0 && <div className="text-center text-slate-400 italic text-sm py-4">Zatiaľ žiadne kategórie.</div>}</div>
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200"><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pridať novú kategóriu</label><div className="flex gap-3 flex-col md:flex-row"><input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Názov (napr. Omietky)" className="flex-1 p-3 border border-slate-300 rounded-xl outline-none focus:border-orange-500 transition"/><div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 items-center px-1">{PASTEL_COLORS.map(c => (<button key={c.hex} type="button" onClick={() => setNewCatColor(c.hex)} className={`w-10 h-10 rounded-full transition-all shrink-0 focus:outline-none flex items-center justify-center border-2 ${newCatColor === c.hex ? 'scale-110 shadow-lg border-white ring-2 ring-orange-200' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c.hex }} title={c.label}>{newCatColor === c.hex && <Check size={16} className="text-slate-800" />}</button>))}<label className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all shrink-0 relative overflow-hidden border-2 ${isCustomColor ? 'scale-110 shadow-lg border-white ring-2 ring-orange-200' : 'border-slate-300 bg-white hover:border-slate-400'}`} style={isCustomColor ? {backgroundColor: newCatColor} : {}} title="Vlastná farba"><input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer focus:outline-none" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} />{isCustomColor ? <Check size={16} className="text-slate-800" /> : <Plus size={20} className="text-slate-400"/>}</label></div><Button onClick={addCategory} disabled={!newCatName} className="h-12"><Plus size={18}/></Button></div></div>
                            <div className="mt-8 pt-4 border-t border-slate-100"><Button fullWidth onClick={saveCategories} loading={loading} size="lg">Uložiť Kategórie</Button></div>
                        </Card>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Card>
                            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><KeyRound className="text-orange-600" size={20}/> Zmena Hesla</h3>
                            <p className="text-sm text-slate-500 mb-6">Tu si môžete zmeniť svoje prihlasovacie heslo.</p>
                            <form onSubmit={changePassword} className="space-y-4 max-w-md"><Input label="Nové heslo" type="password" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} required placeholder="••••••••" /><Input label="Potvrdiť nové heslo" type="password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} required placeholder="••••••••" /><div className="pt-2"><Button type="submit" loading={loading} variant="secondary">Aktualizovať Heslo</Button></div></form>
                        </Card>

                        <Card className="border border-red-100 bg-red-50/20">
                            <h3 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2"><Trash2 size={20}/> Zmazanie účtu</h3>
                            <p className="text-sm text-slate-600 mb-6">Ak si prajete zmazať váš účet a všetky súvisiace dáta firmy (zákazky, dochádzku, fotky), môžete o to požiadať tu. Tento proces je nevratný.</p>
                            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} className="bg-red-600 text-white hover:bg-red-700 border-none">Zmazať účet a všetky dáta</Button>
                        </Card>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Card className="border-l-4 border-l-blue-500 bg-blue-50/30">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left"><div className="bg-blue-100 p-3 rounded-xl text-blue-600 shrink-0"><Users size={24}/></div><div className="flex-1 w-full"><h3 className="font-bold text-lg text-slate-900 mb-1">Pripojenie zamestnancov</h3><p className="text-sm text-slate-600 mb-4">Aby sa vaši zamestnanci mohli zaregistrovať do vašej firmy, musia pri registrácii zadať toto <strong>ID Firmy</strong>.</p><div className="flex items-center gap-2 bg-white border border-blue-200 p-2 rounded-xl shadow-sm w-full md:max-w-md mx-auto md:mx-0"><code className="flex-1 font-mono text-sm font-bold text-slate-700 px-2 truncate text-center md:text-left">{profile.organization_id}</code><button onClick={copyOrgId} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition shrink-0 ${copied ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{copied ? <CheckCircle2 size={16}/> : <Copy size={16}/>}{copied ? 'Hotovo' : 'Kopírovať'}</button></div></div></div>
                        </Card>
                    </div>
                )}

                {activeTab === 'updates' && isApp && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <UpdatesScreen />
                    </div>
                )}
            </div>
        </div>

        {/* MODAL PRE OREZÁVANIE LOGA / PEČIATKY */}
        {croppingImage && (
            <Modal title={cropTarget === 'stamp' ? 'Orezanie pečiatky' : 'Orezanie loga'} onClose={() => setCroppingImage(null)} maxWidth="max-w-4xl">
                <div className="space-y-6">
                    <EdgeCropper
                        imageSrc={croppingImage}
                        imageSize={cropImageSize}
                        cropBox={cropBox}
                        onCropBoxChange={setCropBox}
                        onCropPixelsChange={setCroppedAreaPixels}
                    />

                    {cropTarget === 'logo' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-200 border-dashed">
                            <div className="text-center space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Náhľad v aplikácii</p>
                                <div className="flex justify-center">
                                    <div className="w-36 h-20 rounded-xl border-4 border-white shadow-xl overflow-hidden bg-white flex items-center justify-center">
                                        <CropPreview imageSrc={croppingImage} pixelCrop={croppedAreaPixels} mimeType="image/png" className="w-full h-full object-contain pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="text-center space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Náhľad v PDF (Dokument)</p>
                                <div className="flex justify-center">
                                    <div className="w-32 h-20 rounded-xl border-4 border-white shadow-xl overflow-hidden bg-white flex items-center justify-center">
                                        <CropPreview imageSrc={croppingImage} pixelCrop={croppedAreaPixels} mimeType="image/png" className="w-full h-full object-contain pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 border-dashed text-center space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Náhľad pečiatky v PDF</p>
                            <div className="flex justify-center">
                                <div className="w-full max-w-md aspect-[15/7] rounded-xl border-4 border-white shadow-xl overflow-hidden bg-white flex items-center justify-center">
                                    <CropPreview imageSrc={croppingImage} pixelCrop={croppedAreaPixels} className="w-full h-full object-contain pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setCroppingImage(null)} fullWidth>Zrušiť</Button>
                        <Button onClick={handleApplyCrop} loading={cropTarget === 'stamp' ? uploadingStamp : uploading} fullWidth className="bg-orange-600 shadow-orange-100">
                            <CheckCircle2 size={18}/> Použiť a uložiť
                        </Button>
                    </div>
                </div>
            </Modal>
        )}

        <AlertModal
            isOpen={alertState.open}
            onClose={() => setAlertState({ ...alertState, open: false })}
            title={alertState.title}
            message={alertState.message}
            type={alertState.type as any}
        />

        {showLegalModal && <LegalModal type={showLegalModal} onClose={() => setShowLegalModal(null)} />}
        
        <ConfirmModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteAccountRequest}
            title="Naozaj zmazať účet?"
            message="Táto akcia odošle požiadavku na trvalé zmazanie vašej firmy a všetkých zamestnancov. Proces je nevratný a všetky vaše dáta v cloude budú odstránené do 48 hodín."
            confirmText="Požiadať o zmazanie"
            type="danger"
        />
    </div>
  );
};
