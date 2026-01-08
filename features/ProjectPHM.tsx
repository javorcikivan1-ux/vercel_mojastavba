import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Modal, ConfirmModal } from '../components/UI';
import { Fuel, Plus, Trash2, Camera, Loader2, Calendar, X, ExternalLink, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { formatMoney, formatDate } from '../lib/utils';

interface ProjectPHMProps {
    siteId: string;
    profile: any;
    organization: any;
}

const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const scale = Math.min(1, MAX_WIDTH / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => blob ? resolve(blob) : reject(), 'image/jpeg', 0.7);
            };
        };
        reader.onerror = reject;
    });
};

export const ProjectPHM: React.FC<ProjectPHMProps> = ({ siteId, profile, organization }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState<any>({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        vehicle: '',
        description: '',
        receipt_url: ''
    });
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadData = async () => {
        setLoading(true);
        const { data } = await supabase.from('fuel_logs')
            .select('*')
            .eq('site_id', siteId)
            .order('date', { ascending: false });
        if (data) setLogs(data);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [siteId]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setUploading(true);
        try {
            const file = e.target.files[0];
            const blob = await compressImage(file);
            const path = `fuel-receipts/${profile.organization_id}/${Date.now()}.jpg`;
            const { error } = await supabase.storage.from('diary-photos').upload(path, blob);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('diary-photos').getPublicUrl(path);
            setForm({ ...form, receipt_url: publicUrl });
        } catch (err: any) {
            alert("Chyba pri nahrávaní: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form,
            site_id: siteId,
            organization_id: profile.organization_id,
            user_id: profile.id,
            amount: parseFloat(form.amount) || 0,
            liters: 0 // Litre už neevidujeme v UI, ukladáme nulu
        };
        const { error } = await supabase.from('fuel_logs').insert([payload]);
        if (!error) {
            setShowModal(false);
            setForm({ date: new Date().toISOString().split('T')[0], amount: '', vehicle: '', description: '', receipt_url: '' });
            loadData();
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        await supabase.from('fuel_logs').delete().eq('id', confirmDelete);
        setConfirmDelete(null);
        loadData();
    };

    const totalSpent = logs.reduce((sum, l) => sum + Number(l.amount), 0);

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header: Štatistika a tlačidlo */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                <div className="flex-1">
                    <div className="bg-orange-50 border border-orange-100 p-3 sm:p-4 rounded-2xl shadow-sm inline-block min-w-[200px]">
                        <div className="text-[9px] sm:text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">PHM Celkom</div>
                        <div className="text-xl sm:text-2xl font-black text-orange-600">{formatMoney(totalSpent)}</div>
                    </div>
                </div>
                <Button onClick={() => setShowModal(true)} className="h-12 sm:h-auto"><Plus size={18}/> <span className="sm:inline">Pridať tankovanie</span></Button>
            </div>

            {/* Zoznam záznamov */}
            <div className="grid grid-cols-1 gap-3">
                {loading ? <div className="py-20 text-center"><Loader2 className="animate-spin text-orange-600 mx-auto"/></div> : 
                 logs.length === 0 ? <div className="py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white">Žiadne záznamy PHM.</div> :
                 logs.map(log => (
                    <Card key={log.id} className="p-4 hover:border-orange-300 transition group border-slate-200 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                            {/* Ľavá strana: Vozidlo a info */}
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-orange-500 border border-slate-100 shrink-0 shadow-inner">
                                    <Fuel size={24}/>
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-slate-800 text-sm sm:text-base truncate">{log.vehicle || 'Nezadané vozidlo'}</div>
                                    <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                        <span className="flex items-center gap-1"><Calendar size={10} className="text-slate-300"/> {formatDate(log.date)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Pravá strana: Suma a tlačidlá */}
                            <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                                <div className="text-left sm:text-right">
                                    <div className="text-[9px] text-slate-300 font-black uppercase tracking-widest leading-none mb-1">Suma s DPH</div>
                                    <div className="font-black text-slate-900 text-lg leading-none">{formatMoney(log.amount)}</div>
                                </div>
                                <div className="flex gap-1">
                                    {log.receipt_url && (
                                        <button onClick={() => setPreviewImage(log.receipt_url)} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition border border-transparent hover:border-blue-100" title="Zobraziť bloček">
                                            <ImageIcon size={18}/>
                                        </button>
                                    )}
                                    <button onClick={() => setConfirmDelete(log.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-100">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                 ))
                }
            </div>

            {showModal && (
                <Modal title="Záznam tankovania PHM" onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Dátum" type="date" value={form.date} onChange={(e:any) => setForm({...form, date: e.target.value})} required />
                            <Input label="Suma s DPH (€)" type="number" step="0.01" value={form.amount} onChange={(e:any) => setForm({...form, amount: e.target.value})} required placeholder="0.00" />
                        </div>
                        <Input label="Vozidlo / Stroj (ŠPZ)" value={form.vehicle} onChange={(e:any) => setForm({...form, vehicle: e.target.value})} placeholder="Napr. BB-123AB" />
                        <Input label="Poznámka / Čerpačka" value={form.description} onChange={(e:any) => setForm({...form, description: e.target.value})} placeholder="Slovnaft, Shell..." />
                        
                        <div className="pt-2">
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-full h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${form.receipt_url ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' : 'border-slate-300 text-slate-400 hover:border-orange-400 hover:bg-orange-50'}`}
                            >
                                {uploading ? <Loader2 className="animate-spin text-orange-500" /> : form.receipt_url ? <CheckCircle2 size={32} className="text-green-500"/> : <Camera size={32}/>}
                                <span className="text-xs font-black uppercase mt-2">{uploading ? 'Nahrávam...' : form.receipt_url ? 'Bloček nahraný' : 'Odfotiť / Nahrať bloček'}</span>
                            </button>
                        </div>

                        <Button type="submit" fullWidth size="lg" className="mt-4 h-14 shadow-lg shadow-orange-100">Uložiť PHM</Button>
                    </form>
                </Modal>
            )}

            {previewImage && (
                <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-sm">
                    <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 text-white hover:text-orange-500 transition p-2 bg-white/10 rounded-full"><X size={24}/></button>
                    <img src={previewImage} className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain border-2 border-white/10" alt="Bloček" />
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 w-full px-6 justify-center">
                        <a href={previewImage} target="_blank" className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl transition active:scale-95">
                            <ExternalLink size={18}/> Otvoriť originál
                        </a>
                    </div>
                </div>
            )}

            <ConfirmModal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} title="Zmazať záznam PHM?" message="Tento náklad bude odstránený zo zákazky a bilancie." />
        </div>
    );
};
