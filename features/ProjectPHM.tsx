
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Modal, ConfirmModal } from '../components/UI';
import { Fuel, Plus, Trash2, Camera, Loader2, Calendar, X, ExternalLink, Image as ImageIcon, CheckCircle2, Pencil, Calculator, Save } from 'lucide-react';
import { formatMoney, formatDate } from '../lib/utils';

interface ProjectPHMProps {
    siteId: string;
    profile: any;
    organization: any;
    t?: (key: string) => string;
}

interface PHMFormState {
    id?: string;
    date: string;
    amount: string;
    km_count: string;
    km_rate: string;
    vehicle: string;
    description: string;
    receipt_url: string;
}

const PHM_TRANSLATIONS: any = {
  sk: {
    fuel_log: 'Tankovanie', km_log: 'Kilometre', date_label: 'Dátum', vehicle_plate: 'EČV',
    amount_vat: 'Suma s DPH', calculated_cost: 'Vypočítaný náklad', km_count: 'Počet km',
    km_rate: 'Sadzba za km', receipt_photo: 'Odfotiť bloček', save_changes: 'Uložiť zmeny',
    add_record: 'Pridať záznam', unassigned_vehicle: 'Nezaradené vozidlo',
    note_details: 'Poznámka / Detaily', total_phm_transport: 'Doprava a PHM Celkom',
    no_phm_records: 'Žiadne záznamy dopravy alebo PHM.', delete_confirm_title: 'Zmazať záznam?',
    delete_confirm_msg: 'Tento náklad bude odstránený zo zákazky a bilancie.',
    loading: 'Načítavam...', uploading: 'Nahrávam...', receipt_uploaded: 'Bloček nahraný',
    open_original: 'Otvoriť originál', placeholder_vehicle: 'Napr. BB-123AB',
    placeholder_note_fuel: 'Slovnaft, Shell...', placeholder_note_km: 'Cesta do stavebnín a späť...',
    km_unit: 'km', confirm: 'Potvrdiť', cancel: 'Zrušiť'
  },
  en: {
    fuel_log: 'Fueling', km_log: 'Mileage', date_label: 'Date', vehicle_plate: 'License Plate',
    amount_vat: 'Amount with VAT', calculated_cost: 'Calculated cost', km_count: 'KM count',
    km_rate: 'Rate per km', receipt_photo: 'Photo of receipt', save_changes: 'Save changes',
    add_record: 'Add record', unassigned_vehicle: 'Unassigned vehicle',
    note_details: 'Note / Details', total_phm_transport: 'Total Transport & Fuel',
    no_phm_records: 'No transport or fuel records.', delete_confirm_title: 'Delete record?',
    delete_confirm_msg: 'This cost will be removed from the project and balance.',
    loading: 'Loading...', uploading: 'Uploading...', receipt_uploaded: 'Receipt uploaded',
    open_original: 'Open original', placeholder_vehicle: 'e.g. BB-123AB',
    placeholder_note_fuel: 'Shell, OMV...', placeholder_note_km: 'Trip to hardware store...',
    km_unit: 'km', confirm: 'Confirm', cancel: 'Cancel'
  },
  de: {
    fuel_log: 'Tanken', km_log: 'Kilometer', date_label: 'Datum', vehicle_plate: 'Kennzeichen',
    amount_vat: 'Betrag inkl. MwSt.', calculated_cost: 'Berechnete Kosten', km_count: 'KM Anzahl',
    km_rate: 'Rate pro km', receipt_photo: 'Belegfoto', save_changes: 'Änderungen speichern',
    add_record: 'Eintrag hinzufügen', unassigned_vehicle: 'Nicht zugewiesenes Fahrzeug',
    note_details: 'Notiz / Details', total_phm_transport: 'Transport & Kraftstoff Gesamt',
    no_phm_records: 'Keine Transport- oder Kraftstoffaufzeichnungen.', delete_confirm_title: 'Eintrag löschen?',
    delete_confirm_msg: 'Diese Kosten werden aus dem Projekt und der Bilanz entfernt.',
    loading: 'Laden...', uploading: 'Hochladen...', receipt_uploaded: 'Beleg hochgeladen',
    open_original: 'Original öffnen', placeholder_vehicle: 'z.B. BB-123AB',
    placeholder_note_fuel: 'Tankstelle...', placeholder_note_km: 'Fahrt zum Baumarkt...',
    km_unit: 'km', confirm: 'Bestätigen', cancel: 'Abbrechen'
  },
  hu: {
    fuel_log: 'Tankolás', km_log: 'Kilométer', date_label: 'Dátum', vehicle_plate: 'Rendszám',
    amount_vat: 'Összeg ÁFÁ-val', calculated_cost: 'Számított költség', km_count: 'KM szám',
    km_rate: 'Km ráta', receipt_photo: 'Bizonylat fotó', save_changes: 'Mentés',
    add_record: 'Bejegyzés hozzáadása', unassigned_vehicle: 'Nem rendszámozott jármű',
    note_details: 'Megjegyzés / Részletek', total_phm_transport: 'Szállítás és üzemanyag összesen',
    no_phm_records: 'Nincsenek szállítási vagy üzemanyag adatok.', delete_confirm_title: 'Törli a bejegyzést?',
    delete_confirm_msg: 'Ez a költség törlésre kerül a projektből és az egyenlegből.',
    loading: 'Betöltés...', uploading: 'Feltöltés...', receipt_uploaded: 'Nyugta feltöltve',
    open_original: 'Eredeti megnyitása', placeholder_vehicle: 'pl. BB-123AB',
    placeholder_note_fuel: 'Benzinkút...', placeholder_note_km: 'Út az építőanyag-kereskedésbe...',
    km_unit: 'km', confirm: 'Megerősítés', cancel: 'Mégse'
  },
  pl: {
    fuel_log: 'Tankowanie', km_log: 'Kilometry', date_label: 'Data', vehicle_plate: 'Tablica rejestracyjna',
    amount_vat: 'Kwota z VAT', calculated_cost: 'Obliczony koszt', km_count: 'Liczba km',
    km_rate: 'Stawka za km', receipt_photo: 'Zdjęcie paragonu', save_changes: 'Zapisz zmiany',
    add_record: 'Dodaj wpis', unassigned_vehicle: 'Nieprzypisany pojazd',
    note_details: 'Uwagi / Szczegóły', total_phm_transport: 'Transport i paliwo razem',
    no_phm_records: 'Brak wpisów transportu lub paliwa.', delete_confirm_title: 'Usunąć wpis?',
    delete_confirm_msg: 'Ten koszt zostanie usunięty z projektu i bilansu.',
    loading: 'Ładowanie...', uploading: 'Przesyłanie...', receipt_uploaded: 'Paragon przesłany',
    open_original: 'Otwórz oryginał', placeholder_vehicle: 'np. BB-123AB',
    placeholder_note_fuel: 'Orlen, Shell...', placeholder_note_km: 'Dojazd do hurtowni...',
    km_unit: 'km', confirm: 'Potwierdź', cancel: 'Anuluj'
  },
  ua: {
    fuel_log: 'Заправка', km_log: 'Кілометри', date_label: 'Дата', vehicle_plate: 'Номерний знак',
    amount_vat: 'Сума з ПДВ', calculated_cost: 'Розрахункові витрати', km_count: 'Кількість км',
    km_rate: 'Ставка за км', receipt_photo: 'Фото чека', save_changes: 'Зберегти зміни',
    add_record: 'Додати запис', unassigned_vehicle: 'Незакріплене авто',
    note_details: 'Примітка / Деталі', total_phm_transport: 'Транспорт та пальне разом',
    no_phm_records: 'Записів транспорту або пального немає.', delete_confirm_title: 'Видалити запис?',
    delete_confirm_msg: 'Ці витрати будуть видалені з об’єкта та балансу.',
    loading: 'Завантаження...', uploading: 'Завантаження...', receipt_uploaded: 'Чек завантажено',
    open_original: 'Відкрити оригінал', placeholder_vehicle: 'напр. BB-123AB',
    placeholder_note_fuel: 'АЗС...', placeholder_note_km: 'Поїздка до будмагазину...',
    km_unit: 'км', confirm: 'Підтвердити', cancel: 'Скасувати'
  }
};

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

export const ProjectPHM: React.FC<ProjectPHMProps> = ({ siteId, profile, organization, t: tProp }) => {
    const [lang] = useState(() => {
        if (profile.role === 'admin') return 'sk';
        return localStorage.getItem('ms_worker_lang') || 'sk';
    });

    const t = tProp || ((key: string) => {
        const currentLang = PHM_TRANSLATIONS[lang] ? lang : 'sk';
        return PHM_TRANSLATIONS[currentLang][key] || PHM_TRANSLATIONS['sk'][key] || key;
    });

    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    
    const [logType, setLogType] = useState<'fuel' | 'km'>('fuel');
    const [form, setForm] = useState<PHMFormState>({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        km_count: '',
        km_rate: '0.50',
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

    // Automatický výpočet sumy pri zmene km alebo sadzby
    useEffect(() => {
        if (logType === 'km') {
            const total = (parseFloat(form.km_count) || 0) * (parseFloat(form.km_rate) || 0);
            setForm(prev => ({ ...prev, amount: total > 0 ? total.toFixed(2) : '' }));
        }
    }, [form.km_count, form.km_rate, logType]);

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
            setForm(prev => ({ ...prev, receipt_url: publicUrl }));
        } catch (err: any) {
            window.alert("Error: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (log: any) => {
        const isKm = log.description?.includes('[KM_LOG]');
        setLogType(isKm ? 'km' : 'fuel');
        
        setForm({
            id: log.id,
            date: log.date,
            amount: log.amount.toString(),
            km_count: isKm ? log.liters.toString() : '',
            km_rate: isKm ? (log.amount / (log.liters || 1)).toFixed(2) : '0.50',
            vehicle: log.vehicle || '',
            description: isKm ? log.description.replace('[KM_LOG]', '').trim() : log.description || '',
            receipt_url: log.receipt_url || ''
        });
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        
        let finalDescription = form.description;
        if (logType === 'km') {
            finalDescription = `[KM_LOG] ${form.description}`.trim();
        }

        const payload = {
            date: form.date,
            vehicle: form.vehicle || null,
            description: finalDescription,
            receipt_url: form.receipt_url, 
            site_id: siteId,
            organization_id: profile.organization_id,
            user_id: profile.id,
            amount: parseFloat(form.amount) || 0,
            liters: logType === 'km' ? (parseFloat(form.km_count) || 0) : 0 
        };

        try {
            let err;
            if (form.id) {
                const { error } = await supabase.from('fuel_logs').update(payload).eq('id', form.id);
                err = error;
            } else {
                const { error = null } = await supabase.from('fuel_logs').insert([payload]);
                err = error;
            }

            if (err) throw err;

            setShowModal(false);
            setForm({ date: new Date().toISOString().split('T')[0], amount: '', km_count: '', km_rate: '0.50', vehicle: '', description: '', receipt_url: '' });
            loadData();
        } catch (err: any) {
            window.alert("Error: " + err.message);
        } finally {
            setActionLoading(false);
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
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                <div className="flex-1">
                    <div className="bg-orange-50 border border-orange-100 p-3 sm:p-4 rounded-2xl shadow-sm inline-block min-w-[200px]">
                        <div className="text-[9px] sm:text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">
                            {t('total_phm_transport')}
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-orange-600">{formatMoney(totalSpent)}</div>
                    </div>
                </div>
                <Button onClick={() => { 
                    setLogType('fuel');
                    setForm({ date: new Date().toISOString().split('T')[0], amount: '', km_count: '', km_rate: '0.50', vehicle: '', description: '', receipt_url: '' }); 
                    setShowModal(true); 
                }} className="h-12 sm:h-auto shadow-orange-100"><Plus size={18}/> <span className="sm:inline">{t('add_record')}</span></Button>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {loading ? <div className="py-20 text-center"><Loader2 className="animate-spin text-orange-600 mx-auto" size={32}/></div> : 
                 logs.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white italic font-bold text-[10px] uppercase tracking-widest">
                        {t('no_phm_records')}
                    </div>
                ) :
                 logs.map(log => {
                    const isKm = log.description?.includes('[KM_LOG]');
                    const cleanDesc = isKm ? log.description.replace('[KM_LOG]', '').trim() : log.description;
                    
                    return (
                        <Card key={log.id} className="p-4 hover:border-orange-300 transition group border-slate-200 shadow-sm bg-white">
                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 shadow-inner ${isKm ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-orange-50 text-orange-500 border-orange-100'}`}>
                                        <Fuel size={24}/>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-800 text-sm sm:text-base truncate flex items-center gap-2">
                                            {log.vehicle || t('unassigned_vehicle')}
                                            {isKm && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">{t('km_log')}</span>}
                                        </div>
                                        <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                            <span className="flex items-center gap-1"><Calendar size={10} className="text-slate-300"/> {formatDate(log.date)}</span>
                                            {isKm && <span className="text-blue-500 font-black">{log.liters} {t('km_unit')} x {(log.amount / (log.liters || 1)).toFixed(2)}€</span>}
                                            {cleanDesc && <span className="text-slate-300 italic truncate max-w-[150px]">"{cleanDesc}"</span>}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                                    <div className="text-left sm:text-right">
                                        <div className="text-[9px] text-slate-300 font-black uppercase tracking-widest leading-none mb-1">{t('calculated_cost')}</div>
                                        <div className="font-black text-slate-900 text-lg leading-none">{formatMoney(log.amount)}</div>
                                    </div>
                                    <div className="flex gap-1">
                                        {log.receipt_url && (
                                            <button onClick={() => setPreviewImage(log.receipt_url)} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition border border-transparent hover:border-blue-100" title={t('open_original')}>
                                                <ImageIcon size={18}/>
                                            </button>
                                        )}
                                        <button onClick={() => handleEdit(log)} className="p-2.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition border border-transparent hover:border-blue-100">
                                            <Pencil size={18}/>
                                        </button>
                                        <button onClick={() => setConfirmDelete(log.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-blue-50 rounded-xl transition border border-transparent hover:border-red-100">
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                 })
                }
            </div>

            {showModal && (
                <Modal title={form.id ? t('save_changes') : t('add_record')} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSave} className="space-y-5">
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-2">
                            <button 
                                type="button" 
                                onClick={() => setLogType('fuel')} 
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${logType === 'fuel' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}
                            >
                                <Fuel size={14}/> {t('fuel_log')}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setLogType('km')} 
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${logType === 'km' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                            >
                                <Calculator size={14}/> {t('km_log')}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label={t('date_label')} 
                                type="date" 
                                value={form.date} 
                                onChange={(e:any) => setForm(prev => ({...prev, date: e.target.value}))} 
                                required 
                                className="!text-xs sm:!text-sm !h-[42px] sm:h-auto"
                            />
                            <Input 
                                label={t('vehicle_plate')} 
                                value={form.vehicle} 
                                onChange={(e:any) => setForm(prev => ({...prev, vehicle: e.target.value}))} 
                                placeholder={t('placeholder_vehicle')} 
                                className="!text-xs sm:!text-sm !h-[42px] sm:h-auto"
                            />
                        </div>

                        {logType === 'fuel' ? (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <Input 
                                    label={t('amount_vat')} 
                                    type="number" 
                                    step="0.01" 
                                    value={form.amount} 
                                    onChange={(e:any) => setForm(prev => ({...prev, amount: e.target.value}))} 
                                    required 
                                    placeholder="0.00" 
                                    className="!text-xs sm:!text-sm !h-[42px] sm:h-auto"
                                />
                                <div className="pt-2">
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    <button 
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`w-full h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${form.receipt_url ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' : 'border-slate-300 text-slate-400 hover:border-orange-400 hover:bg-orange-50'}`}
                                    >
                                        {uploading ? <Loader2 className="animate-spin text-orange-500" /> : form.receipt_url ? <CheckCircle2 size={32} className="text-green-500"/> : <Camera size={32}/>}
                                        <span className="text-xs font-black uppercase mt-2">{uploading ? t('uploading') : form.receipt_url ? t('receipt_uploaded') : t('receipt_photo')}</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-inner">
                                    <Input 
                                        label={t('km_count')} 
                                        type="number" 
                                        value={form.km_count} 
                                        onChange={(e:any) => setForm(prev => ({...prev, km_count: e.target.value}))} 
                                        required 
                                        placeholder="0" 
                                        className="!text-xs sm:!text-sm !h-[42px] sm:h-auto"
                                    />
                                    <Input 
                                        label={t('km_rate')} 
                                        type="number" 
                                        step="0.01" 
                                        value={form.km_rate} 
                                        onChange={(e:any) => setForm(prev => ({...prev, km_rate: e.target.value}))} 
                                        required 
                                        placeholder="0.50" 
                                        className="!text-xs sm:!text-sm !h-[42px] sm:h-auto"
                                    />
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-slate-100 rounded-xl text-slate-500"><Calculator size={18}/></div>
                                        <span className="text-xs font-black uppercase text-slate-400">{t('calculated_cost')}:</span>
                                    </div>
                                    <span className="text-xl font-black text-slate-900">{formatMoney(parseFloat(form.amount) || 0)}</span>
                                </div>
                                <div className="pt-2">
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    <button 
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`w-full h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${form.receipt_url ? 'border-green-500 bg-green-50 text-green-700 shadow-inner' : 'border-slate-300 text-slate-400 hover:border-blue-400 hover:bg-blue-50'}`}
                                    >
                                        {uploading ? <Loader2 className="animate-spin text-blue-500" /> : form.receipt_url ? <CheckCircle2 size={32} className="text-green-500"/> : <Camera size={32}/>}
                                        <span className="text-xs font-black uppercase mt-2">{uploading ? t('uploading') : form.receipt_url ? t('receipt_uploaded') : t('receipt_photo')}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        <Input label={t('note_details')} value={form.description} onChange={(e:any) => setForm(prev => ({...prev, description: e.target.value}))} placeholder={logType === 'fuel' ? t('placeholder_note_fuel') : t('placeholder_note_km')} />
                        
                        <div className="pt-2">
                            <Button 
                                type="submit" 
                                fullWidth 
                                size="lg" 
                                loading={actionLoading}
                                className="h-14 shadow-xl shadow-orange-100 font-bold"
                            >
                                {form.id ? <Save size={20} className="mr-2"/> : <Plus size={20} className="mr-2"/>}
                                {form.id ? t('save_changes') : t('add_record')}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {previewImage && (
                <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-sm">
                    <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 text-white hover:text-orange-500 transition p-2 bg-white/10 rounded-full"><X size={24}/></button>
                    <img src={previewImage} className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain border-2 border-white/10" alt="Receipt" />
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 w-full px-6 justify-center">
                        <a href={previewImage} target="_blank" className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl transition active:scale-95">
                            <ExternalLink size={18}/> {t('open_original')}
                        </a>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={!!confirmDelete} 
                onClose={() => setConfirmDelete(null)} 
                onConfirm={handleDelete} 
                title={t('delete_confirm_title')} 
                message={t('delete_confirm_msg')} 
                confirmText={t('confirm')}
                cancelText={t('cancel')}
            />
        </div>
    );
};
