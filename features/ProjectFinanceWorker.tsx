
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Modal, Input, Select, ConfirmModal, AlertModal } from '../components/UI';
import { 
  Plus, ArrowDownLeft, Trash2, Wallet, 
  Package, Fuel, LayoutList, Loader2, Calendar, 
  Euro, Search, Info, CheckCircle2, Pencil, ChevronLeft, Save
} from 'lucide-react';
import { formatMoney, formatDate } from '../lib/utils';
import { ProjectPHM } from './ProjectPHM';

interface ProjectFinanceWorkerProps {
    siteId: string;
    profile: any;
    organization: any;
}

const FINANCE_TRANSLATIONS: any = {
  sk: {
    expenses_tab: 'Výdavky', phm_tab: 'Doprava', total_expenses: 'Výdavky spolu',
    add_expense_btn: 'Pridať výdavok', is_material_q: 'Je to nákup materiálu?',
    material_name: 'Názov materiálu', quantity: 'Množstvo', unit: 'MJ',
    supplier: 'Dodávateľ', amount_vat: 'Suma s DPH', service_desc: 'Popis výdavku',
    date_label: 'Dátum', save_changes: 'Uložiť zmeny', success_title: 'Úspech',
    save_success: 'Záznam bol úspešne uložený.', error_title: 'Chyba',
    delete_confirm_title: 'Zmazať záznam?', delete_confirm_msg: 'Naozaj chcete odstrániť tento výdavok? Akcia je nevratná.',
    no_expenses: 'Zatiaľ žiadne záznamy výdavkov', material_label: 'Materiál',
    site_expense_label: 'Výdavok stavby', site_auto_assign: 'Náklad bude automaticky priradený k stavbe.',
    loading: 'Načítavam...', placeholder_mat: 'Napr. Cement, tehly...', placeholder_serv: 'Napr. Skládka, parkovné...',
    placeholder_supplier: 'Kde ste nakúpili?',
    confirm: 'Potvrdiť', cancel: 'Zrušiť', understand: 'Rozumiem'
  },
  en: {
    expenses_tab: 'Expenses', phm_tab: 'Transport', total_expenses: 'Total expenses',
    add_expense_btn: 'Add expense', is_material_q: 'Is this a material purchase?',
    material_name: 'Material name', quantity: 'Quantity', unit: 'Unit',
    supplier: 'Supplier', amount_vat: 'Amount with VAT', service_desc: 'Expense description',
    date_label: 'Date', save_changes: 'Save changes', success_title: 'Success',
    save_success: 'Entry has been successfully saved.', error_title: 'Error',
    delete_confirm_title: 'Delete record?', delete_confirm_msg: 'Are you sure you want to delete this expense? This action is irreversible.',
    no_expenses: 'No expense records yet', material_label: 'Material',
    site_expense_label: 'Site expense', site_auto_assign: 'Cost will be automatically assigned to the site.',
    loading: 'Loading...', placeholder_mat: 'e.g. Cement, bricks...', placeholder_serv: 'e.g. Landfill, parking...',
    placeholder_supplier: 'Where did you buy it?',
    confirm: 'Confirm', cancel: 'Cancel', understand: 'I understand'
  },
  de: {
    expenses_tab: 'Ausgaben', phm_tab: 'Transport', total_expenses: 'Gesamtausgaben',
    add_expense_btn: 'Ausgabe hinzufügen', is_material_q: 'Ist dies ein Materialeinkauf?',
    material_name: 'Materialname', quantity: 'Menge', unit: 'Einh.',
    supplier: 'Lieferant', amount_vat: 'Betrag inkl. MwSt.', service_desc: 'Beschreibung',
    date_label: 'Datum', save_changes: 'Änderungen speichern', success_title: 'Erfolg',
    save_success: 'Eintrag wurde erfolgreich gespeichert.', error_title: 'Fehler',
    delete_confirm_title: 'Eintrag löschen?', delete_confirm_msg: 'Möchten Sie diese Ausgabe wirklich löschen? Dies kann nicht rückgängig gemacht werden.',
    no_expenses: 'Noch keine Ausgaben erfasst', material_label: 'Material',
    site_expense_label: 'Baustellenausgabe', site_auto_assign: 'Die Kosten werden automatisch der Baustelle zugeordnet.',
    loading: 'Laden...', placeholder_mat: 'z.B. Zement, Ziegel...', placeholder_serv: 'z.B. Deponie, Parken...',
    placeholder_supplier: 'Wo haben Sie eingekauft?',
    confirm: 'Bestätigen', cancel: 'Abbrechen', understand: 'Verstanden'
  },
  hu: {
    expenses_tab: 'Kiadások', phm_tab: 'Szállítás', total_expenses: 'Összes kiadás',
    add_expense_btn: 'Kiadás hozzáadása', is_material_q: 'Ez anyagvásárlás?',
    material_name: 'Anyag megnevezése', quantity: 'Mennyiség', unit: 'Egység',
    supplier: 'Beszállító', amount_vat: 'Összeg ÁFÁ-val', service_desc: 'Leírás',
    date_label: 'Dátum', save_changes: 'Mentés', success_title: 'Siker',
    save_success: 'A bejegyzés sikeresen elmentve.', error_title: 'Hiba',
    delete_confirm_title: 'Törli a bejegyzést?', delete_confirm_msg: 'Biztosan törölni akarja ezt a kiadást? A művelet nem vonható vissza.',
    no_expenses: 'Még nincsenek kiadások', material_label: 'Anyag',
    site_expense_label: 'Helyszíni kiadás', site_auto_assign: 'A költség automatikusan a helyszínhez lesz rendelve.',
    loading: 'Betöltés...', placeholder_mat: 'pl. Cement, tégla...', placeholder_serv: 'pl. Lerakó, parkolás...',
    placeholder_supplier: 'Hol vásárolta?',
    confirm: 'Megerősítés', cancel: 'Mégse', understand: 'Értem'
  },
  pl: {
    expenses_tab: 'Wydatki', phm_tab: 'Transport', total_expenses: 'Wydatki razem',
    add_expense_btn: 'Dodaj wydatek', is_material_q: 'Czy to zakup materiału?',
    material_name: 'Nazwa materiału', quantity: 'Ilość', unit: 'Jedn.',
    supplier: 'Dostawca', amount_vat: 'Kwota z VAT', service_desc: 'Opis wydatku',
    date_label: 'Data', save_changes: 'Zapisz zmiany', success_title: 'Sukces',
    save_success: 'Wpis został pomyślnie zapisany.', error_title: 'Błąd',
    delete_confirm_title: 'Usunąć wpis?', delete_confirm_msg: 'Czy na pewno chcesz usunąć ten wydatek? Ta akcja jest nieodwracalna.',
    no_expenses: 'Brak wpisów wydatków', material_label: 'Materiał',
    site_expense_label: 'Wydatek budowy', site_auto_assign: 'Koszt zostanie automatycznie przypisany do budowy.',
    loading: 'Ładowanie...', placeholder_mat: 'np. Cement, cegły...', placeholder_serv: 'np. Wysypisko, parking...',
    placeholder_supplier: 'Gdzie kupiłeś?',
    confirm: 'Potwierdź', cancel: 'Anuluj', understand: 'Rozumiem'
  },
  ua: {
    expenses_tab: 'Витрати', phm_tab: 'Транспорт', total_expenses: 'Загальні витрати',
    add_expense_btn: 'Додати витрату', is_material_q: 'Це закупівля матеріалу?',
    material_name: 'Назва матеріалу', quantity: 'Кількість', unit: 'Од.',
    supplier: 'Постачальник', amount_vat: 'Сума з ПДВ', service_desc: 'Опис витрати',
    date_label: 'Дата', save_changes: 'Зберегти зміни', success_title: 'Успіх',
    save_success: 'Запис успішно збережено.', error_title: 'Помилка',
    delete_confirm_title: 'Видалити запис?', delete_confirm_msg: 'Ви впевнені, що хочете видалити цю витрату? Ця дія є незворотною.',
    no_expenses: 'Записів витрат поки немає', material_label: 'Матеріál',
    site_expense_label: 'Витрати об\'єкта', site_auto_assign: 'Витрати будуть автоматично прикріплені до об\'єкта.',
    loading: 'Завантаження...', placeholder_mat: 'напр. Цемент, цегла...', placeholder_serv: 'напр. Сміттєзвалище, паркування...',
    placeholder_supplier: 'Де ви це купили?',
    confirm: 'Підтвердити', cancel: 'Скасувати', understand: 'Розумію'
  }
};

export const ProjectFinanceWorker: React.FC<ProjectFinanceWorkerProps> = ({ siteId, profile, organization }) => {
    const [lang] = useState(() => {
        if (profile.role === 'admin') return 'sk';
        return localStorage.getItem('ms_worker_lang') || 'sk';
    });

    const t = (key: string) => {
        const currentLang = FINANCE_TRANSLATIONS[lang] ? lang : 'sk';
        return FINANCE_TRANSLATIONS[currentLang][key] || FINANCE_TRANSLATIONS['sk'][key] || key;
    };

    const [activeSubTab, setActiveSubTab] = useState<'expenses' | 'phm'>('expenses');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<any>({
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        material_name: '',
        id: '',
        is_material: false,
        quantity: 1,
        unit: 'ks',
        unit_price: '',
        supplier: ''
    });

    const [alert, setAlert] = useState({ open: false, title: '', message: '', type: 'success' });
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string, type: string }>({ open: false, id: '', type: '' });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [transRes, matsRes] = await Promise.all([
                supabase.from('transactions').select('*').eq('site_id', siteId).eq('type', 'expense').order('date', { ascending: false }),
                supabase.from('materials').select('*').eq('site_id', siteId).order('purchase_date', { ascending: false })
            ]);

            const combined = [
                ...(transRes.data || []).map(t => ({ ...t, itemType: 'manual', supplier: null })),
                ...(matsRes.data || []).map(m => ({
                    id: m.id,
                    date: m.purchase_date,
                    description: `${m.name} (${m.quantity} ${m.unit})`,
                    category: t('material_label'),
                    amount: m.total_price,
                    itemType: 'material',
                    supplier: m.supplier
                }))
            ].sort((a, b) => b.date.localeCompare(a.date));

            setItems(combined);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [siteId, lang]);

    const handleEdit = (item: any) => {
        if (item.itemType === 'material') {
            setForm({
                id: item.id,
                type: 'expense',
                date: item.purchase_date,
                amount: item.total_price.toString(),
                description: '',
                material_name: item.name,
                is_material: true,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.unit_price.toString(),
                supplier: item.supplier || ''
            });
        } else {
            setForm({
                id: item.id,
                type: 'expense',
                date: item.date,
                amount: item.amount.toString(),
                description: item.description,
                material_name: '',
                is_material: false,
                quantity: 1,
                unit: 'ks',
                unit_price: '',
                supplier: ''
            });
        }
        setShowModal(true);
    };

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const common = { site_id: siteId, organization_id: profile.organization_id };
            if (form.is_material) {
                const materialPayload = {
                    ...common,
                    name: form.material_name || 'Materiál',
                    quantity: parseFloat(form.quantity) || 0,
                    unit: form.unit,
                    unit_price: parseFloat(form.unit_price) || 0,
                    total_price: parseFloat(form.amount) || 0,
                    purchase_date: form.date,
                    supplier: form.supplier
                };
                
                if (form.id) {
                    const { error } = await supabase.from('materials').update(materialPayload).eq('id', form.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('materials').insert([materialPayload]);
                    if (error) throw error;
                }
            } else {
                const transPayload = {
                    ...common,
                    type: 'expense',
                    category: 'Výdavok stavby',
                    amount: parseFloat(form.amount) || 0,
                    date: form.date,
                    description: form.description,
                    is_paid: true
                };
                
                if (form.id) {
                    const { error } = await supabase.from('transactions').update(transPayload).eq('id', form.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('transactions').insert([transPayload]);
                    if (error) throw error;
                }
            }
            setShowModal(false);
            setAlert({ open: true, title: t('success_title'), message: t('save_success'), type: 'success' });
            loadData();
        } catch (err: any) {
            setAlert({ open: true, title: t('error_title'), message: err.message, type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            const table = confirmDelete.type === 'material' ? 'materials' : 'transactions';
            await supabase.from(table).delete().eq('id', confirmDelete.id);
            setConfirmDelete({ open: false, id: '', type: '' });
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const totalExpenses = items.reduce((sum, item) => sum + Number(item.amount), 0);

    return (
        <div className="space-y-5 animate-in fade-in max-w-2xl mx-auto px-1 sm:px-0">
            <div className="bg-slate-100 rounded-xl p-1 flex shadow-inner border border-slate-200">
                <button 
                    onClick={() => setActiveSubTab('expenses')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeSubTab === 'expenses' ? 'bg-white text-orange-600 shadow-sm border border-orange-50' : 'text-slate-400 hover:bg-white/40'}`}
                >
                    <Package size={14}/> {t('expenses_tab')}
                </button>
                <button 
                    onClick={() => setActiveSubTab('phm')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeSubTab === 'phm' ? 'bg-white text-orange-600 shadow-sm border border-orange-50' : 'text-slate-400 hover:bg-white/40'}`}
                >
                    <Fuel size={14}/> {t('phm_tab')}
                </button>
            </div>

            {activeSubTab === 'expenses' ? (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                        <div className="flex-1">
                            <div className="bg-orange-50 border border-orange-100 p-3 sm:p-4 rounded-2xl shadow-sm inline-block min-w-[180px] sm:min-w-[200px]">
                                <div className="text-[9px] sm:text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">{t('total_expenses')}</div>
                                <div className="text-xl sm:text-2xl font-black text-orange-600">{formatMoney(totalExpenses)}</div>
                            </div>
                        </div>
                        <Button onClick={() => {
                            setForm({
                                type: 'expense',
                                date: new Date().toISOString().split('T')[0],
                                amount: '',
                                description: '',
                                material_name: '',
                                id: '',
                                is_material: false,
                                quantity: 1,
                                unit: 'ks',
                                unit_price: '',
                                supplier: ''
                            });
                            setShowModal(true);
                        }} className="h-12 sm:h-auto shadow-orange-100 text-[10px]">
                            <Plus size={18}/> {t('add_expense_btn')}
                        </Button>
                    </div>

                    <div className="space-y-2.5">
                        {loading ? <div className="py-20 text-center"><Loader2 className="animate-spin text-orange-600 mx-auto" size={32}/></div> :
                         items.length === 0 ? <div className="py-20 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl bg-white italic font-bold text-[10px] uppercase tracking-widest">{t('no_expenses')}</div> :
                         items.map(item => (
                             <Card key={item.id} className="p-3 sm:p-4 hover:border-orange-300 transition group border-slate-200 shadow-sm bg-white">
                                 <div className="flex flex-col gap-2.5">
                                     <div className="font-bold text-slate-800 text-sm sm:text-base leading-tight break-words">
                                         {item.description}
                                     </div>
                                     {item.supplier && (
                                         <div className="text-[11px] text-slate-500 italic">
                                             {t('supplier')}: {item.supplier}
                                         </div>
                                     )}
                                     <div className="flex justify-between items-end gap-2">
                                         <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border shrink-0 shadow-inner bg-orange-50 text-orange-500 border-orange-100">
                                                {item.itemType === 'material' ? <Package size={18}/> : <ArrowDownLeft size={18}/>}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5 flex-wrap">
                                                <Calendar size={10} className="text-slate-300"/> {formatDate(item.date)}
                                                <span className="text-slate-200">|</span>
                                                <span className="truncate max-w-[100px]">{item.category}</span>
                                            </div>
                                         </div>
                                         <div className="flex items-center gap-3 shrink-0">
                                             <div className="font-black text-slate-900 text-base sm:text-lg whitespace-nowrap">
                                                 {formatMoney(item.amount)}
                                             </div>
                                             <button 
                                                onClick={() => handleEdit(item)}
                                                className="p-1.5 text-slate-300 hover:text-blue-500 transition active:scale-90"
                                             >
                                                 <Pencil size={16}/>
                                             </button>
                                             <button 
                                                onClick={() => setConfirmDelete({ open: true, id: item.id, type: item.itemType })}
                                                className="p-1.5 text-slate-300 hover:text-red-500 transition active:scale-90"
                                             >
                                                 <Trash2 size={16}/>
                                             </button>
                                         </div>
                                     </div>
                                 </div>
                             </Card>
                         ))}
                    </div>
                </div>
            ) : (
                <ProjectPHM siteId={siteId} profile={profile} organization={organization} />
            )}

            {showModal && (
                <Modal title={form.id ? 'Upraviť výdavok' : t('add_expense_btn')} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSave} className="space-y-5">
                        <div className="flex items-center gap-3 p-4 bg-orange-50/50 border border-orange-100 rounded-2xl mb-1">
                            <input 
                                type="checkbox" 
                                id="is_material_worker_final" 
                                checked={form.is_material} 
                                onChange={(e) => setForm({...form, is_material: e.target.checked, type: e.target.checked ? 'material' : 'expense'})} 
                                className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-slate-300" 
                            />
                            <label htmlFor="is_material_worker_final" className="text-[11px] sm:text-sm font-bold text-slate-700 flex items-center gap-2 cursor-pointer uppercase tracking-tight">
                                <Package size={16} className="text-orange-500"/> {t('is_material_q')}
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label={t('date_label')} 
                                type="date" 
                                value={form.date} 
                                onChange={(e:any) => setForm({...form, date: e.target.value})} 
                                required 
                                className="!text-xs sm:!text-sm !h-[42px] sm:h-auto"
                            />
                            <Input 
                                label={t('amount_vat')} 
                                type="number" 
                                step="0.01" 
                                value={form.amount} 
                                onChange={(e:any) => setForm({...form, amount: e.target.value})} 
                                required 
                                placeholder="0.00" 
                                className="!text-xs sm:!text-sm !h-[42px] sm:h-auto"
                            />
                        </div>

                        {form.is_material ? (
                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                <Input label={t('material_name')} value={form.material_name} onChange={(e:any) => setForm({...form, material_name: e.target.value})} required placeholder={t('placeholder_mat')} />
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <Input label={t('quantity')} type="number" step="0.1" value={form.quantity} onChange={(e:any) => setForm({...form, quantity: e.target.value})} required />
                                    </div>
                                    <Select label={t('unit')} value={form.unit} onChange={(e: any) => setForm({...form, unit: e.target.value})}>
                                        {['ks', 'm', 'm2', 'm3', 'kg', 't', 'bal', 'l'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </Select>
                                </div>
                                <Input label={t('supplier')} value={form.supplier} onChange={(e:any) => setForm({...form, supplier: e.target.value})} placeholder={t('placeholder_supplier')} />
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-[10px] font-bold text-orange-700 flex items-center gap-2">
                                    <Info size={14} className="text-orange-500"/> {t('site_auto_assign')}
                                </div>
                                <Input label={t('service_desc')} value={form.description} onChange={(e:any) => setForm({...form, description: e.target.value})} required placeholder={t('placeholder_serv')} />
                            </div>
                        )}

                        <div className="pt-2">
                            <Button type="submit" fullWidth size="lg" loading={actionLoading} className="h-12 shadow-xl shadow-orange-100">
                                {t('save_changes')}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            <ConfirmModal 
                isOpen={confirmDelete.open} 
                onClose={() => setConfirmDelete({ open: false, id: '', type: '' })} 
                onConfirm={handleDelete} 
                title={t('delete_confirm_title')} 
                message={t('delete_confirm_msg')} 
                confirmText={t('confirm')}
                cancelText={t('cancel')}
                type="danger"
            />

            <AlertModal 
                isOpen={alert.open} 
                onClose={() => setAlert({...alert, open: false})} 
                title={alert.title} 
                message={alert.message} 
                buttonText={t('understand')}
                type={alert.type as any} 
            />
        </div>
    );
};
