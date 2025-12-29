
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, AlertModal, LegalModal } from '../components/UI';
import { Lock, Save, Settings, Copy, CheckCircle2, Building2, KeyRound, Bell, Image as ImageIcon, Shield, Users, LogOut, Clock, RefreshCw, FileText, Tags, Trash2, Plus, Palette, Check, Camera, Loader2, FileSignature } from 'lucide-react';
import { UpdatesScreen } from './Updates';

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

/**
 * Optimalizovaná funkcia pre kompresiu loga na malú miniatúru (256x256).
 */
const compressLogo = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const SIZE = 256; // Miniatúra stačí pre avatar
                canvas.width = SIZE;
                canvas.height = SIZE;
                const ctx = canvas.getContext('2d');
                
                // Square crop (center)
                const minDim = Math.min(img.width, img.height);
                const sx = (img.width - minDim) / 2;
                const sy = (img.height - minDim) / 2;
                
                ctx?.drawImage(img, sx, sy, minDim, minDim, 0, 0, SIZE, SIZE);
                
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Chyba pri kompresii loga.'));
                }, 'image/jpeg', 0.85); 
            };
        };
        reader.onerror = (err) => reject(err);
    });
};

/**
 * Kompresia pečiatky (väčšie rozlíšenie pre kvalitu tlače).
 */
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
                }, 'image/png', 0.9); // PNG pre prípadnú priehľadnosť
            };
        };
        reader.onerror = (err) => reject(err);
    });
};

export const SettingsScreen = ({ profile, organization, onUpdateOrg, onUpdateProfile, initialTab = 'general' }: any) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [alert, setAlert] = useState({ open: false, title: '', message: '', type: 'success' });
  const [copied, setCopied] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState<'vop' | 'gdpr' | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  // Sync activeTab if initialTab prop changes
  useEffect(() => {
      setActiveTab(initialTab);
  }, [initialTab]);

  // --- GENERAL STATE ---
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [logoUrl, setLogoUrl] = useState(organization?.logo_url || '');
  const [stampUrl, setStampUrl] = useState(organization?.stamp_url || '');
  const [notifications, setNotifications] = useState({
      notify_tasks: profile.settings?.notify_tasks ?? true,
      notify_logs: profile.settings?.notify_logs ?? true
  });

  // --- CATEGORIES STATE ---
  const [taskCategories, setTaskCategories] = useState<any[]>(profile.settings?.task_categories || [
      { id: '1', label: 'Všeobecné', color: '#f1f5f9' },
      { id: '2', label: 'Stavba', color: '#ffedd5' },
      { id: '3', label: 'Administratíva', color: '#dbeafe' }
  ]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PASTEL_COLORS[0].hex);

  // --- SECURITY STATE ---
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Update local state if props change
  useEffect(() => {
      if(organization) {
          setOrgName(organization.name);
          setLogoUrl(organization.logo_url || '');
          setStampUrl(organization.stamp_url || '');
      }
  }, [organization]);

  // --- ACTIONS ---

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setUploading(true);
        try {
            const blob = await compressLogo(file);
            const fileName = `${profile.organization_id}/logo-${Date.now()}.jpg`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('diary-photos')
                .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('diary-photos')
                .getPublicUrl(filePath);

            setLogoUrl(publicUrl);
            await supabase.from('organizations').update({ logo_url: publicUrl }).eq('id', profile.organization_id);
            onUpdateOrg({ ...organization, logo_url: publicUrl });
            
        } catch (err: any) {
            setAlert({ open: true, title: 'Chyba', message: 'Nepodarilo sa nahrať logo: ' + err.message, type: 'error' });
        } finally {
            setUploading(false);
        }
    }
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setUploadingStamp(true);
          try {
              const blob = await compressStamp(file);
              const fileName = `${profile.organization_id}/stamp-${Date.now()}.png`;
              const filePath = `stamps/${fileName}`;

              const { error: uploadError } = await supabase.storage
                  .from('diary-photos')
                  .upload(filePath, blob, { contentType: 'image/png', upsert: true });

              if (uploadError) throw uploadError;

              const { data: { publicUrl } } = supabase.storage
                  .from('diary-photos')
                  .getPublicUrl(filePath);

              setStampUrl(publicUrl);
              await supabase.from('organizations').update({ stamp_url: publicUrl }).eq('id', profile.organization_id);
              onUpdateOrg({ ...organization, stamp_url: publicUrl });
              
              setAlert({ open: true, title: 'Úspech', message: 'Pečiatka a podpis boli nahraté.', type: 'success' });
          } catch (err: any) {
              setAlert({ open: true, title: 'Chyba', message: 'Nepodarilo sa nahrať pečiatku: ' + err.message, type: 'error' });
          } finally {
              setUploadingStamp(false);
          }
      }
  };

  const saveGeneralSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          // Update Organization
          const { error: orgError } = await supabase.from('organizations').update({
              name: orgName,
              logo_url: logoUrl,
              stamp_url: stampUrl
          }).eq('id', profile.organization_id);
          if (orgError) throw orgError;

          // Update Profile Settings (Notifications)
          const updatedSettings = { ...profile.settings, ...notifications };
          const { error: profError } = await supabase.from('profiles').update({
              settings: updatedSettings
          }).eq('id', profile.id);
          if (profError) throw profError;

          // Update Parent State
          onUpdateOrg({ ...organization, name: orgName, logo_url: logoUrl, stamp_url: stampUrl });
          if(onUpdateProfile) onUpdateProfile({ ...profile, settings: updatedSettings });
          
          setAlert({ open: true, title: 'Uložené', message: 'Nastavenia boli úspešne aktualizované.', type: 'success' });
      } catch (err: any) {
          setAlert({ open: true, title: 'Chyba', message: err.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const saveCategories = async () => {
      setLoading(true);
      try {
          const updatedSettings = { ...profile.settings, task_categories: taskCategories };
          
          const { error } = await supabase.from('profiles').update({
              settings: updatedSettings
          }).eq('id', profile.id);

          if (error) throw error;
          
          if (onUpdateProfile) {
              onUpdateProfile({ ...profile, settings: updatedSettings });
          }
          setAlert({ open: true, title: 'Uložené', message: 'Kategórie boli aktualizované.', type: 'success' });
      } catch (err: any) {
          setAlert({ open: true, title: 'Chyba', message: err.message, type: 'error' });
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
          setAlert({ open: true, title: 'Chyba', message: 'Heslá sa nezhodujú.', type: 'error' });
          return;
      }
      if (newPassword.length < 6) {
           setAlert({ open: true, title: 'Chyba', message: 'Heslo musí mať aspoň 6 znakov.', type: 'error' });
           return;
      }
      
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setLoading(false);
      
      if (error) {
          setAlert({ open: true, title: 'Chyba', message: error.message, type: 'error' });
      } else {
          setAlert({ open: true, title: 'Úspech', message: 'Vaše heslo bolo úspešne zmenené.', type: 'success' });
          setNewPassword('');
          setConfirmPassword('');
      }
  };

  const copyOrgId = () => {
      navigator.clipboard.writeText(profile.organization_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
          activeTab === id 
            ? 'border-orange-500 text-orange-600 bg-orange-50/50' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
      >
          <Icon size={18} className={activeTab === id ? 'text-orange-600' : 'text-slate-400'}/>
          {label}
      </button>
  );

  const isCustomColor = !PASTEL_COLORS.some(c => c.hex === newCatColor);

  return (
    <div className="space-y-6">
        {/* HEADER */}
        <div className="mb-2">
           <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="text-orange-600" size={32} />
              Nastavenia
           </h2>
           <p className="text-sm text-slate-500 mt-1 font-medium">Správa účtu a firemné predvoľby</p>
        </div>

        {/* TOP TABS */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20 -mx-4 px-4 md:mx-0 md:px-0 md:static">
             <div className="flex overflow-x-auto no-scrollbar pb-1px">
                <TabButton id="general" label="Všeobecné" icon={Building2} />
                <TabButton id="categories" label="Kategórie úloh" icon={Tags} />
                <TabButton id="security" label="Zabezpečenie" icon={Shield} />
                <TabButton id="team" label="Tím" icon={Users} />
                <TabButton id="updates" label="Aktualizácie" icon={RefreshCw} />
             </div>
        </div>

        <div className="flex flex-col gap-6">
            <div className="flex-1">
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Card>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 pb-8 border-b border-slate-100">
                                {/* Logo Section */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative group">
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-32 h-32 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer group-hover:scale-105 transition-transform"
                                        >
                                            {uploading ? (
                                                <Loader2 className="animate-spin text-orange-600" size={32}/>
                                            ) : logoUrl ? (
                                                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 size={48} className="text-slate-300" />
                                            )}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="text-white" size={24}/>
                                            </div>
                                        </div>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                        <div className="absolute -bottom-2 -right-2 bg-orange-600 text-white p-2 rounded-full shadow-lg border-2 border-white">
                                            <ImageIcon size={16}/>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-black text-slate-900">Logo Firmy</h3>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Avatar aplikácie</p>
                                    </div>
                                </div>

                                {/* Stamp Section */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative group">
                                        <div 
                                            onClick={() => stampInputRef.current?.click()}
                                            className="w-32 h-32 rounded-2xl border-4 border-white shadow-2xl overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer group-hover:scale-105 transition-transform"
                                        >
                                            {uploadingStamp ? (
                                                <Loader2 className="animate-spin text-orange-600" size={32}/>
                                            ) : stampUrl ? (
                                                <img src={stampUrl} alt="Stamp" className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <FileSignature size={48} className="text-slate-300" />
                                            )}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="text-white" size={24}/>
                                            </div>
                                        </div>
                                        <input type="file" ref={stampInputRef} className="hidden" accept="image/*" onChange={handleStampUpload} />
                                        <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white">
                                            <FileSignature size={16}/>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-black text-slate-900">Pečiatka a Podpis</h3>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Pre PDF exporty</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={saveGeneralSettings} className="space-y-6">
                                <Input 
                                    label="Názov Firmy" 
                                    value={orgName} 
                                    onChange={(e: any) => setOrgName(e.target.value)} 
                                    required 
                                    placeholder="Moja Firma s.r.o." 
                                />

                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Bell className="text-orange-600" size={20}/> Notifikácie</h4>
                                    
                                    <div className="space-y-3">
                                        <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg"><Clock size={18}/></div>
                                                <div>
                                                    <div className="font-bold text-slate-700 text-sm">Blížiace sa úlohy</div>
                                                    <div className="text-xs text-slate-500">Upozorniť 1 hodinu a 15 minút pred termínom.</div>
                                                </div>
                                            </div>
                                            <input type="checkbox" checked={notifications.notify_tasks} onChange={(e) => setNotifications({...notifications, notify_tasks: e.target.checked})} className="w-6 h-6 text-orange-600 rounded-lg focus:ring-orange-500 border-slate-300"/>
                                        </label>

                                        <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-green-50 text-green-600 p-2 rounded-lg"><CheckCircle2 size={18}/></div>
                                                <div>
                                                    <div className="font-bold text-slate-700 text-sm">Nové výkazy práce</div>
                                                    <div className="text-xs text-slate-500">Upozorniť, keď zamestnanec nahrá hodiny.</div>
                                                </div>
                                            </div>
                                            <input type="checkbox" checked={notifications.notify_logs} onChange={(e) => setNotifications({...notifications, notify_logs: e.target.checked})} className="w-6 h-6 text-orange-600 rounded-lg focus:ring-orange-500 border-slate-300"/>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button type="submit" loading={loading} fullWidth size="lg">Uložiť všetky nastavenia</Button>
                                </div>
                                
                                <div className="pt-6 mt-2 border-t border-slate-100">
                                     <div className="flex gap-4 justify-center">
                                        <button type="button" onClick={() => setShowLegalModal('vop')} className="text-xs text-slate-400 font-bold hover:text-orange-600 transition">Obchodné podmienky</button>
                                        <span className="text-slate-200">|</span>
                                        <button type="button" onClick={() => setShowLegalModal('gdpr')} className="text-xs text-slate-400 font-bold hover:text-orange-600 transition">Ochrana údajov (GDPR)</button>
                                     </div>
                                     <div className="text-center mt-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">ID Firmy: {profile.organization_id}</div>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Card>
                            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2"><Tags className="text-orange-600" size={20}/> Kategórie úloh</h3>
                            <p className="text-sm text-slate-500 mb-6">Vytvorte si vlastné typy úloh a priraďte im farby pre lepšiu prehľadnosť v kalendári.</p>
                            
                            <div className="space-y-3 mb-6">
                                {taskCategories.map(cat => (
                                    <div key={cat.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                        <div className="w-8 h-8 rounded-full shadow-inner border border-black/5" style={{ backgroundColor: cat.color }}></div>
                                        <div className="font-bold text-slate-700 flex-1">{cat.label}</div>
                                        <button onClick={() => removeCategory(cat.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                                {taskCategories.length === 0 && <div className="text-center text-slate-400 italic text-sm py-4">Zatiaľ žiadne kategórie.</div>}
                            </div>

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pridať novú kategóriu</label>
                                <div className="flex gap-3 flex-col md:flex-row">
                                    <input 
                                        value={newCatName}
                                        onChange={(e) => setNewCatName(e.target.value)}
                                        placeholder="Názov (napr. Omietky)"
                                        className="flex-1 p-3 border border-slate-300 rounded-xl outline-none focus:border-orange-500 transition"
                                    />
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 items-center px-1">
                                        {PASTEL_COLORS.map(c => (
                                            <button 
                                                key={c.hex}
                                                type="button"
                                                onClick={() => setNewCatColor(c.hex)}
                                                className={`w-10 h-10 rounded-full transition-all shrink-0 focus:outline-none flex items-center justify-center border-2 ${newCatColor === c.hex ? 'scale-110 shadow-lg border-white ring-2 ring-orange-200' : 'border-transparent hover:scale-105'}`}
                                                style={{ backgroundColor: c.hex }}
                                                title={c.label}
                                            >
                                                {newCatColor === c.hex && <Check size={16} className="text-slate-800" />}
                                            </button>
                                        ))}
                                        <label 
                                            className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all shrink-0 relative overflow-hidden border-2 ${isCustomColor ? 'scale-110 shadow-lg border-white ring-2 ring-orange-200' : 'border-slate-300 bg-white hover:border-slate-400'}`} 
                                            style={isCustomColor ? {backgroundColor: newCatColor} : {}}
                                            title="Vlastná farba"
                                        >
                                            <input 
                                                type="color" 
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer focus:outline-none" 
                                                value={newCatColor} 
                                                onChange={(e) => setNewCatColor(e.target.value)} 
                                            />
                                            {isCustomColor ? <Check size={16} className="text-slate-800" /> : <Plus size={20} className="text-slate-400"/>}
                                        </label>
                                    </div>
                                    <Button onClick={addCategory} disabled={!newCatName} className="h-12"><Plus size={18}/></Button>
                                </div>
                            </div>

                            <div className="mt-8 pt-4 border-t border-slate-100">
                                <Button fullWidth onClick={saveCategories} loading={loading} size="lg">Uložiť Kategórie</Button>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Card>
                            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2"><KeyRound className="text-orange-600" size={20}/> Zmena Hesla</h3>
                            <p className="text-sm text-slate-500 mb-6">Tu si môžete zmeniť svoje prihlasovacie heslo.</p>
                            
                            <form onSubmit={changePassword} className="space-y-4 max-w-md">
                                <Input label="Nové heslo" type="password" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} required placeholder="••••••••" />
                                <Input label="Potvrdiť nové heslo" type="password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
                                <div className="pt-2">
                                    <Button type="submit" loading={loading} variant="secondary">Aktualizovať Heslo</Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Card className="border-l-4 border-l-blue-500 bg-blue-50/30">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left">
                                <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shrink-0">
                                    <Users size={24}/>
                                </div>
                                <div className="flex-1 w-full">
                                    <h3 className="font-bold text-lg text-slate-900 mb-1">Pripojenie zamestnancov</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Aby sa vaši zamestnanci mohli zaregistrovať do vašej firmy, musia pri registrácii zadať toto <strong>ID Firmy</strong>.
                                    </p>
                                    <div className="flex items-center gap-2 bg-white border border-blue-200 p-2 rounded-xl shadow-sm w-full md:max-w-md mx-auto md:mx-0">
                                        <code className="flex-1 font-mono text-sm font-bold text-slate-700 px-2 truncate text-center md:text-left">
                                            {profile.organization_id}
                                        </code>
                                        <button 
                                            onClick={copyOrgId}
                                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition shrink-0 ${copied ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            {copied ? <CheckCircle2 size={16}/> : <Copy size={16}/>}
                                            {copied ? 'Hotovo' : 'Kopírovať'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'updates' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <UpdatesScreen />
                    </div>
                )}
            </div>
        </div>

        <AlertModal
            isOpen={alert.open}
            onClose={() => setAlert({ ...alert, open: false })}
            title={alert.title}
            message={alert.message}
            type={alert.type as any}
        />

        {showLegalModal && <LegalModal type={showLegalModal} onClose={() => setShowLegalModal(null)} />}
    </div>
  );
};
