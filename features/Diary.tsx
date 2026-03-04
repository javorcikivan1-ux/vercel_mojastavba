
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Select, AlertModal } from '../components/UI';
import { 
  BookOpen, Calendar, Cloud, Sun, CloudRain, Wind, Thermometer, Truck, 
  Users, Package, Save, FileDown, ArrowLeft, Plus, PenTool, ArrowRight, 
  Copy, Lock, Camera, CheckCircle2, AlertCircle, Loader2, X, RefreshCw, Unlock, Printer, Search, Building2, Info, ListChecks
} from 'lucide-react';
import { formatDate } from '../lib/utils';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const getLocalDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const compressImageToBlob = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1024;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Chyba pri kompresii.'));
                }, 'image/jpeg', 0.7); 
            };
        };
        reader.onerror = (err) => reject(err);
    });
};

const DIARY_TRANSLATIONS: any = {
  sk: {
    manage_diary: 'Stavebný Denník', back_to_overview: 'Späť',
    diary_section_weather: '1. Poveternostné podmienky', diary_section_weather_sub: 'Teplota a počasie počas dňa',
    weather_status: 'Stav počasia', temp_morning: 'Teplota Ráno', temp_noon: 'Teplota Obed',
    weather_sunny: 'Slnečno', weather_partly_cloudy: 'Polooblačno', weather_cloudy: 'Oblačno',
    weather_rainy: 'Dážď', weather_storm: 'Búrka', weather_windy: 'Vietor', weather_snow: 'Sneženie',
    diary_section_notes: '2. Popis vykonaných prác', diary_section_notes_sub: 'Detailný záznam postupu prác',
    diary_section_mechanisms: '3. Mechanizmy a Stroje', diary_section_mechanisms_sub: 'Nasadenie techniky na stavbe',
    diary_section_photos: '4. Fotodokumentácia', diary_section_photos_sub: 'Fotografie sú bezpečne uložené v cloude',
    diary_notes_placeholder: 'Sem zapíšte priebeh prác...', mechanisms_placeholder: 'Napr. Bager (8h), žeriav...',
    save_draft: 'Uložiť (Rozpracované)', sign_and_close: 'Uzavrieť a Podpísať', take_photo: 'Pridať foto',
    daily_summary: 'Denný Súhrn', workers_on_site: 'pracovníkov na zákazke', hours_unit: 'hodín',
    available_works: 'Dostupné práce', from_today_attendance: 'Z dnešnej dochádzky', material_purchases: 'Nákupy materiálu',
    from_today_costs: 'Z dnešných nákladov', no_purchases: 'Žiadne nákupy.', status_draft: 'Rozpracovaný',
    status_signed: 'Uzavretý', loading_record: 'Načítavam záznam...', copy_yesterday: 'Kopírovať včerajšok',
    import_from_attendance: 'Importovať z dochádzky', last_saved: 'Naposledy uložené', not_saved_yet: 'Zatiaľ neuložené',
    details: 'Podrobnosti', workers: 'Pracovníci', record: 'Záznam', click_to_edit: 'Kliknutím otvorte na úpravu',
    no_day_records: 'Žiadne záznamy pre tento deň.', no_records: 'Žiadne záznamy', unlock_for_edits: 'Odomknúť pre úpravy',
    diary_signed_msg: 'Denník bol uzavretý a podpísaný.', diary_unlocked_msg: 'Záznam bol odomknutý pre úpravy.',
    diary_saved: 'Denník bol uložený.', prev_day_copied: 'Dáta z predchádzajúceho dňa boli skopírované.',
    no_prev_day_record: 'Pre predchádzajúci deň sa nenašiel žiadny záznam.', search_site_placeholder: 'Hľadať a vybrať stavbu',
    export_pdf: 'Export PDF', generating: 'Generujem...', archive_label: 'Archív', active_label: 'Aktívna',
    total_materials: 'Súčet materiálov', stamp_signature: 'Pečiatka a podpis zhotoviteľa', morning_7: 'Teplota 7:00', noon_13: 'Teplota 13:00',
    days_short: ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'], site_label: 'Stavba', date_label: 'Dátum', generated_via: 'Vygenerované cez MojaStavba', unlock_for_edits_desc: 'Pre úpravy je potrebné záznam najskôr odomknúť.',
    confirm: 'Potvrdiť', cancel: 'Zrušiť', understand: 'Rozumiem'
  },
  en: {
    manage_diary: 'Site Diary', back_to_overview: 'Back',
    diary_section_weather: '1. Weather conditions', diary_section_weather_sub: 'Temperature and weather during the day',
    weather_status: 'Weather status', temp_morning: 'Morning Temp', temp_noon: 'Noon Temp',
    weather_sunny: 'Sunny', weather_partly_cloudy: 'Partly Cloudy', weather_cloudy: 'Cloudy',
    weather_rainy: 'Rainy', weather_storm: 'Stormy', weather_windy: 'Windy', weather_snow: 'Snowing',
    diary_section_notes: '2. Description of work', diary_section_notes_sub: 'Detailed record of work progress',
    diary_section_mechanisms: '3. Mechanisms & Machinery', diary_section_mechanisms_sub: 'Deployment of machinery on site',
    diary_section_photos: '4. Photo documentation', diary_section_photos_sub: 'Photos are securely stored in the cloud',
    diary_notes_placeholder: 'Describe work progress here...', mechanisms_placeholder: 'e.g. Excavator (8h), crane...',
    save_draft: 'Save (Draft)', sign_and_close: 'Close and Sign', take_photo: 'Add photo',
    daily_summary: 'Daily Summary', workers_on_site: 'workers on site', hours_unit: 'hours',
    available_works: 'Available works', from_today_attendance: 'From today\'s attendance', material_purchases: 'Material purchases',
    from_today_costs: 'From today\'s costs', no_purchases: 'No purchases.', status_draft: 'Draft',
    status_signed: 'Closed', loading_record: 'Loading record...', copy_yesterday: 'Copy yesterday',
    import_from_attendance: 'Import from attendance', last_saved: 'Last saved', not_saved_yet: 'Not saved yet',
    details: 'Details', workers: 'Workers', record: 'Record', click_to_edit: 'Click to edit',
    no_day_records: 'No records for this day.', no_records: 'No records', unlock_for_edits: 'Unlock for edits',
    diary_signed_msg: 'Diary has been closed and signed.', diary_unlocked_msg: 'Record unlocked for editing.',
    diary_saved: 'Diary has been saved.', prev_day_copied: 'Data from the previous day copied.',
    no_prev_day_record: 'No record found for the previous day.', search_site_placeholder: 'Search and select site',
    export_pdf: 'Export PDF', generating: 'Generating...', archive_label: 'Archive', active_label: 'Active',
    total_materials: 'Total materials', stamp_signature: 'Contractor stamp and signature', morning_7: 'Temp 7:00', noon_13: 'Temp 13:00',
    days_short: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], site_label: 'Site', date_label: 'Date', generated_via: 'Generated via MojaStavba', unlock_for_edits_desc: 'To make changes, the record must first be unlocked.',
    confirm: 'Confirm', cancel: 'Cancel', understand: 'I understand'

  },
  de: {
    manage_diary: 'Bautagebuch', back_to_overview: 'Zurück',
    diary_section_weather: '1. Wetterbedingungen', diary_section_weather_sub: 'Temperatur und Wetter während des Tages',
    weather_status: 'Wetterzustand', temp_morning: 'Temp. Morgen', temp_noon: 'Temp. Mittag',
    weather_sunny: 'Sonnig', weather_partly_cloudy: 'Teilweise bewölkt', weather_cloudy: 'Bewölkt',
    weather_rainy: 'Regnerisch', weather_storm: 'Stürmisch', weather_windy: 'Windig', weather_snow: 'Schneit',
    diary_section_notes: '2. Arbeitsbeschreibung', diary_section_notes_sub: 'Detaillierte Aufzeichnung des Arbeitsfortschritts',
    diary_section_mechanisms: '3. Mechanismen & Maschinen', diary_section_mechanisms_sub: 'Einsatz von Maschinen vor Ort',
    diary_section_photos: '4. Fotodokumentation', diary_section_photos_sub: 'Fotos werden sicher in der Cloud gespeichert',
    diary_notes_placeholder: 'Arbeitsfortschritt hier beschreiben...', mechanisms_placeholder: 'z.B. Bagger (8h), Kran...',
    save_draft: 'Speichern (Entwurf)', sign_and_close: 'Schließen und Unterschreiben', take_photo: 'Foto hinzufügen',
    daily_summary: 'Tägliche Zusammenfassung', workers_on_site: 'Mitarbeiter vor Ort', hours_unit: 'Stunden',
    available_works: 'Verfügbare Arbeiten', from_today_attendance: 'Aus der heutigen Anwesenheit', material_purchases: 'Materialeinkäufe',
    from_today_costs: 'Aus den heutigen Kosten', no_purchases: 'Keine Einkäufe.', status_draft: 'Entwurf',
    status_signed: 'Geschlossen', loading_record: 'Lade Datensatz...', copy_yesterday: 'Gestern kopieren',
    import_from_attendance: 'Aus Anwesenheit importieren', last_saved: 'Zuletzt gespeichert', not_saved_yet: 'Noch ne gespeichert',
    details: 'Details', workers: 'Mitarbeiter', record: 'Eintrag', click_to_edit: 'Zum Bearbeiten klicken',
    no_day_records: 'Keine Einträge für diesen Tag.', no_records: 'Keine Einträge', unlock_for_edits: 'Bearbeitung freischalten',
    diary_signed_msg: 'Tagebuch wurde geschlossen und unterschrieben.', diary_unlocked_msg: 'Datensatz zur Bearbeitung freigeschaltet.',
    diary_saved: 'Tagebuch wurde gespeichert.', prev_day_copied: 'Daten vom Vortag kopiert.',
    no_prev_day_record: 'Kein Eintrag für den Vortag gefunden.', search_site_placeholder: 'Standort suchen',
    export_pdf: 'PDF Export', generating: 'Generiere...', archive_label: 'Archiv', active_label: 'Aktiv',
    total_materials: 'Materialien gesamt', stamp_signature: 'Stempel und Unterschrift des Auftragnehmers', morning_7: 'Temp 7:00', noon_13: 'Temp 13:00',
    days_short: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], site_label: 'Baustelle', date_label: 'Datum', generated_via: 'Generiert über MojaStavba', unlock_for_edits_desc: 'Für Änderungen muss der Eintrag zuerst entsperrt werden.',
    confirm: 'Bestätigen', cancel: 'Abbrechen', understand: 'Verstanden'

  },
  hu: {
    manage_diary: 'Építési Napló', back_to_overview: 'Vissza',
    diary_section_weather: '1. Időjárási viszonyok', diary_section_weather_sub: 'Hőmérséklet és időjárás a nap folyamán',
    weather_status: 'Időjárás állapota', temp_morning: 'Reggeli hőm.', temp_noon: 'Déli hőm.',
    weather_sunny: 'Napos', weather_partly_cloudy: 'Részben felhős', weather_cloudy: 'Felhős',
    weather_rainy: 'Esős', weather_storm: 'Viharos', weather_windy: 'Szeles', weather_snow: 'Havazás',
    diary_section_notes: '2. Elvégzett munkák leírása', diary_section_notes_sub: 'A munkafolyamat részletes rögzítése',
    diary_section_mechanisms: '3. Gépek és berendezések', diary_section_mechanisms_sub: 'Gépek bevetése a helyszínen',
    diary_section_photos: '4. Fotódokumentáció', diary_section_photos_sub: 'A fotók biztonságosan a felhőben tárolódnak',
    diary_notes_placeholder: 'Írja le a munka menetét...', mechanisms_placeholder: 'pl. Kotrógép (8ó), daru...',
    save_draft: 'Mentés (Vázlat)', sign_and_close: 'Lezárás és Aláírás', take_photo: 'Fotó hozzáadása',
    daily_summary: 'Napi Összegzés', workers_on_site: 'munkás a helyszínen', hours_unit: 'óra',
    available_works: 'Elérhető munkák', from_today_attendance: 'A mai jelenlétből', material_purchases: 'Materialeinkäufe',
    from_today_costs: 'A mai költségekből', no_purchases: 'Nincs vásárlás.', status_draft: 'Vázlat',
    status_signed: 'Lezárt', loading_record: 'Bejegyzés betöltése...', copy_yesterday: 'Tegnapi másolása',
    import_from_attendance: 'Importálás jelenlétből', last_saved: 'Utoljára mentve', not_saved_yet: 'Még nincs mentve',
    details: 'Részletek', workers: 'Munkások', record: 'Bejegyzés', click_to_edit: 'Kattintson a szerkesztéshez',
    no_day_records: 'Nincsenek bejegyzések erre a napra.', no_records: 'Nincsenek adatok', unlock_for_edits: 'Szerkesztés feloldása',
    diary_signed_msg: 'A napló lezárva és aláírva.', diary_unlocked_msg: 'Bejegyzés feloldva szerkesztéshez.',
    diary_saved: 'A napló mentve lett.', prev_day_copied: 'A tegnapi adatok átmásolva.',
    no_prev_day_record: 'Nem található bejegyzés a tegnapi napra.', search_site_placeholder: 'Helyszín keresése',
    export_pdf: 'PDF Export', generating: 'Generálás...', archive_label: 'Archív', active_label: 'Aktív',
    total_materials: 'Anyagok összesen', stamp_signature: 'Vállalkozó bélyegzője és aláírása', morning_7: 'Hőm 7:00', noon_13: 'Hőm 13:00',
    days_short: ['Hé', 'Ke', 'Sze', 'Csü', 'Pé', 'Szo', 'Vas'], site_label: 'Építkezés', date_label: 'Dátum', generated_via: 'MojaStavba által generálva', unlock_for_edits_desc: 'A módosításhoz először fel kell oldani a bejegyzést.',
    confirm: 'Megerősítés', cancel: 'Mégse', understand: 'Értem'

  },
  pl: {
    manage_diary: 'Dziennik Budowy', back_to_overview: 'Wstecz',
    diary_section_weather: '1. Warunki pogodowe', diary_section_weather_sub: 'Temperatura i pogoda w ciągu dnia',
    weather_status: 'Status pogody', temp_morning: 'Temp. rano', temp_noon: 'Temp. w południe',
    weather_sunny: 'Słonecznie', weather_partly_cloudy: 'Częściowe zachmurzenie', weather_cloudy: 'Pochmurno',
    weather_rainy: 'Deszczowo', weather_storm: 'Burzowo', weather_windy: 'Wietrznie', weather_snow: 'Śnieg',
    diary_section_notes: '2. Opis wykonanych prac', diary_section_notes_sub: 'Szczegółowy zapis postępu prac',
    diary_section_mechanisms: '3. Mechanizmy i maszyny', diary_section_mechanisms_sub: 'Użycie sprzętu na budowie',
    diary_section_photos: '4. Dokumentacja fotograficzna', diary_section_photos_sub: 'Zdjęcia są bezpiecznie zapisane w chmurze',
    diary_notes_placeholder: 'Opisz postęp prac tutaj...', mechanisms_placeholder: 'np. Koparka (8h), dźwig...',
    save_draft: 'Zapisz (Szkic)', sign_and_close: 'Zamknij i podpisz', take_photo: 'Dodaj zdjęcie',
    daily_summary: 'Podsumowanie dnia', workers_on_site: 'pracowników na budowie', hours_unit: 'godzin',
    available_works: 'Dostępne prace', from_today_attendance: 'Z dzisiejszej obecności', material_purchases: 'Zakupy materiałów',
    from_today_costs: 'Z dzisiejszych kosztów', no_purchases: 'Brak zakupów.', status_draft: 'Szkic',
    status_signed: 'Zamknięty', loading_record: 'Ładowanie wpisu...', copy_yesterday: 'Kopiuj wczoraj',
    import_from_attendance: 'Importuj z obecności', last_saved: 'Ostatnio zapisano', not_saved_yet: 'Jeszcze nie zapisano',
    details: 'Szczegóły', workers: 'Pracownicy', record: 'Wpis', click_to_edit: 'Kliknij, aby edytować',
    no_day_records: 'Brak wpisów na ten dzień.', no_records: 'Brak wpisów', unlock_for_edits: 'Odblokuj edycję',
    diary_signed_msg: 'Dziennik został zamknięty i podpisany.', diary_unlocked_msg: 'Wpis odblokowany do edycji.',
    diary_saved: 'Dziennik został zapisany.', prev_day_copied: 'Dane z poprzedniego dnia skopiowane.',
    no_prev_day_record: 'Nie znaleziono wpisu z poprzedniego dnia.', search_site_placeholder: 'Szukaj budowy',
    export_pdf: 'Eksport PDF', generating: 'Generowanie...', archive_label: 'Archiwum', active_label: 'Aktywna',
    total_materials: 'Materiały razem', stamp_signature: 'Pieczątka i podpis wykonawcy', morning_7: 'Temp 7:00', noon_13: 'Temp 13:00',
    days_short: ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'], site_label: 'Budowa', date_label: 'Data', generated_via: 'Wygenerowano przez MojaStavba', unlock_for_edits_desc: 'Aby wprowadzić zmiany, należy najpierw odblokować wpis.',
    confirm: 'Potwierdź', cancel: 'Anuluj', understand: 'Rozumiem'

  },
  ua: {
    manage_diary: 'Будівельний Журнал', back_to_overview: 'Назад',
    diary_section_weather: '1. Погодні умови', diary_section_weather_sub: 'Температура та погода протягом дня',
    weather_status: 'Стан погоди', temp_morning: 'Темп. вранці', temp_noon: 'Темп. вдень',
    weather_sunny: 'Сонячно', weather_partly_cloudy: 'Мінлива хмарність', weather_cloudy: 'Хмарно',
    weather_rainy: 'Дощ', weather_storm: 'Гроза', weather_windy: 'Вітер', weather_snow: 'Сніг',
    diary_section_notes: '2. Опис виконаних робіт', diary_section_notes_sub: 'Детальний запис ходу робіт',
    diary_section_mechanisms: '3. Механізми та машини', diary_section_mechanisms_sub: 'Використання техніки на об\'єкті',
    diary_section_photos: '4. Фотофіксація', diary_section_photos_sub: 'Фотографії надійно зберігаються в хмарі',
    diary_notes_placeholder: 'Опишіть хід робіт тут...', mechanisms_placeholder: 'напр. Екскаватор (8г), кран...',
    save_draft: 'Зберегти (Чернетка)', sign_and_close: 'Закрити та підписати', take_photo: 'Додати фото',
    daily_summary: 'Підсумок дня', workers_on_site: 'працівників на об\'єкті', hours_unit: 'годин',
    available_works: 'Доступні роботи', from_today_attendance: 'З сьогоднішньої присутності', material_purchases: 'Закупівля матеріалів',
    from_today_costs: 'З сьогоднішніх витрат', no_purchases: 'Закупівель немає.', status_draft: 'Чернетка',
    status_signed: 'Закрито', loading_record: 'Завантаження запису...', copy_yesterday: 'Копіювати вчорашній день',
    import_from_attendance: 'Імпортувати з присутності', last_saved: 'Востаннє збережено', not_saved_yet: 'Ще не збережено',
    details: 'Деталі', workers: 'Працівники', record: 'Запис', click_to_edit: 'Натисніть для редагування',
    no_day_records: 'Записів за цей день немає.', no_records: 'Записів немає', unlock_for_edits: 'Розблокувати для редагування',
    diary_signed_msg: 'Журнал закрито та підписано.', diary_unlocked_msg: 'Запис розблоковано для редагування.',
    diary_saved: 'Журнал збережено.', prev_day_copied: 'Дані за попередній день скопійовано.',
    no_prev_day_record: 'Запису за попередній день не знайдено.', search_site_placeholder: 'Пошук об\'єкта',
    export_pdf: 'Експорт PDF', generating: 'Генерую...', archive_label: 'Архів', active_label: 'Активний',
    total_materials: 'Матеріали разом', stamp_signature: 'Печатка та підпис підрядника', morning_7: 'Темп 7:00', noon_13: 'Темп 13:00',
    days_short: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'], site_label: 'Об’єкт', date_label: 'Дата', generated_via: 'Згенеровано через MojaStavba', unlock_for_edits_desc: 'Щоб внести зміни, запис потрібно спочатку розблокувати.',
    confirm: 'Підтвердити', cancel: 'Скасувати', understand: 'Розумію'
  }
};

interface DiaryScreenProps {
    profile: any;
    organization: any;
    fixedSiteId?: string; 
    t?: (key: string) => string;
}

export const DiaryScreen = ({ profile, organization, fixedSiteId, t: tProp }: DiaryScreenProps) => {
  const [lang, setLang] = useState(() => {
    if (profile.role === 'admin') return 'sk';
    return localStorage.getItem('ms_worker_lang') || 'sk';
  });

  const t = tProp || ((key: string) => {
      const currentLang = DIARY_TRANSLATIONS[lang] ? lang : 'sk';
      return DIARY_TRANSLATIONS[currentLang][key] || DIARY_TRANSLATIONS['sk'][key] || key;
  });

  const getLocaleCode = () => {
    if (profile.role === 'admin') return 'sk-SK';
    switch(lang) {
      case 'en': return 'en-US';
      case 'de': return 'de-DE';
      case 'hu': return 'hu-HU';
      case 'pl': return 'pl-PL';
      case 'ua': return 'uk-UA';
      default: return 'sk-SK';
    }
  };

  const [sites, setSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(fixedSiteId || '');
  const [searchSiteQuery, setSearchSiteQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date()); 
  
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [diaryEntry, setDiaryEntry] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  
  const [dailyAttendance, setDailyAttendance] = useState<any[]>([]);
  const [dailyMaterials, setDailyMaterials] = useState<any[]>([]);
  
  const [monthStats, setMonthStats] = useState<Record<string, any>>({});
  
  const [previewDay, setPreviewDay] = useState<any>(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<any>(null);
  const touchStartPos = useRef<{x: number, y: number} | null>(null);

  const [fullExportData, setFullExportData] = useState<any[] | null>(null);
  const [exporting, setExporting] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState<{open: boolean, message: string, type: 'success' | 'error'}>({ open: false, message: '', type: 'success' });

  const printRef = useRef<HTMLDivElement>(null);
  const fullPrintRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSites = async () => {
        if (fixedSiteId) {
            const { data } = await supabase.from('sites').select('id, name, status').eq('id', fixedSiteId).single();
            if (data) {
                setSites([data]);
                setSelectedSiteId(data.id);
                setSearchSiteQuery(data.name);
            }
            return;
        }

        const { data } = await supabase.from('sites')
            .select('id, name, status')
            .eq('organization_id', profile.organization_id)
            .order('status', { ascending: true });
        
        if(data && data.length > 0) {
            const sorted = data.sort((a, b) => {
                if (a.status === 'active' && b.status !== 'active') return -1;
                if (a.status !== 'active' && b.status === 'active') return 1;
                return 0;
            });
            setSites(sorted);

            const lastSiteId = localStorage.getItem('ms_last_site_id');
            const exists = sorted.find(s => s.id === lastSiteId);
            
            if (lastSiteId && exists) {
                setSelectedSiteId(lastSiteId);
                setSearchSiteQuery(exists.name);
            } else {
                setSelectedSiteId(sorted[0].id);
                setSearchSiteQuery(sorted[0].name);
            }
        }
    };
    loadSites();
  }, [profile, fixedSiteId]);

  const handleSiteChange = (id: string, name: string) => {
      setSelectedSiteId(id);
      setSearchSiteQuery(name);
      localStorage.setItem('ms_last_site_id', id);
  };

  useEffect(() => {
      if (selectedSiteId && !selectedDay) {
          fetchMonthOverview();
      }
  }, [currentDate, selectedSiteId, selectedDay, lang]);

  const fetchMonthOverview = async () => {
      if(!selectedSiteId) return;
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const startStr = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endStr = new Date(year, month, 0).toISOString().split('T')[0];

      const [records, logs] = await Promise.all([
          supabase.from('diary_records').select('*').eq('site_id', selectedSiteId).gte('date', startStr).lte('date', endStr),
          supabase.from('attendance_logs').select('date, description, hours, profiles(full_name)').eq('site_id', selectedSiteId).gte('date', startStr).lte('date', endStr)
      ]);

      const stats: Record<string, any> = {};

      records.data?.forEach(r => {
          if(!stats[r.date]) stats[r.date] = { hasRecord: true, record: r, logs: [], totalHours: 0 };
          else {
              stats[r.date].hasRecord = true;
              stats[r.date].record = r;
          }
          stats[r.date].status = r.status;
      });

      logs.data?.forEach((l: any) => {
          if(!stats[l.date]) stats[l.date] = { hasRecord: false, logs: [], totalHours: 0 };
          stats[l.date].totalHours += Number(l.hours || 0);
          if(l.description) {
              stats[l.date].logs.push(`${l.profiles?.full_name}: ${l.description}`);
          } else {
              stats[l.date].logs.push(`${l.profiles?.full_name}: (${t('no_records')})`);
          }
      });

      setMonthStats(stats);
  };

  const fetchDayData = async (day: Date, siteId: string) => {
      const dateStr = getLocalDateString(day);
      const [record, attendance, materials] = await Promise.all([
          supabase.from('diary_records').select('*').eq('site_id', siteId).eq('date', dateStr).maybeSingle(),
          supabase.from('attendance_logs').select('*, profiles(full_name)').eq('site_id', siteId).eq('date', dateStr),
          supabase.from('materials').select('*').eq('site_id', siteId).eq('purchase_date', dateStr)
      ]);
      return { record: record.data, attendance: attendance.data, materials: materials.data };
  };

  const handleDaySelect = async (day: Date) => {
      if(!selectedSiteId) return;
      setSelectedDay(day);
      setPreviewDay(null); 
      setLoading(true);
      setDiaryEntry(null); 
      
      try {
          const { record, attendance, materials } = await fetchDayData(day, selectedSiteId);

          setDiaryEntry(record || { 
              weather: t('weather_sunny'), 
              temperature_morning: '', 
              temperature_noon: '', 
              mechanisms: '', 
              notes: '',
              status: 'draft',
              photos: []
          });
          setIsLocked(record?.status === 'signed');
          setDailyAttendance(attendance || []);
          setDailyMaterials(materials || []);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleLongPress = (day: Date, stats: any, x: number, y: number) => {
      setPreviewPos({ x, y: y - 10 }); 
      setPreviewDay({ date: day, stats });
  };

  const onTouchStart = (day: Date, stats: any, e: React.TouchEvent) => {
      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      longPressTimer.current = setTimeout(() => {
          handleLongPress(day, stats, touch.clientX, touch.clientY);
      }, 500);
  };

  const onTouchMove = (e: React.TouchEvent) => {
      if (!touchStartPos.current) return;
      const touch = e.touches[0];
      const dist = Math.sqrt(Math.pow(touch.clientX - touchStartPos.current.x, 2) + Math.pow(touch.clientY - touchStartPos.current.y, 2));
      if (dist > 10) { 
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }
  };

  const onTouchEnd = () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      touchStartPos.current = null;
  };

  const handleMouseEnter = (day: Date, stats: any, e: React.MouseEvent) => {
      if (window.innerWidth < 768) return;
      setPreviewPos({ x: e.clientX, y: e.clientY - 20 });
      setPreviewDay({ date: day, stats });
  };

  const importAttendanceToNotes = () => {
      if (!dailyAttendance.length) {
          setAlertState({ open: true, message: t('no_day_records'), type: 'error' });
          return;
      }
      
      let currentNotes = diaryEntry.notes || '';
      let addedCount = 0;

      const newLines = dailyAttendance
          .filter((l: any) => l.description && l.description.trim() !== '')
          .map((l: any) => `• ${l.profiles?.full_name}: ${l.description}`);

      newLines.forEach((line: string) => {
          if (!currentNotes.includes(line)) {
              currentNotes += (currentNotes ? "\n" : "") + line;
              addedCount++;
          }
      });

      if (addedCount > 0) {
          setDiaryEntry({ ...diaryEntry, notes: currentNotes });
          setAlertState({ open: true, message: t('diary_saved'), type: 'success' });
      } else {
          setAlertState({ open: true, message: t('no_records'), type: 'success' });
      }
  };

  const handleCopyPreviousDay = async () => {
      if (!selectedDay || !selectedSiteId) return;
      const prevDay = new Date(selectedDay);
      prevDay.setDate(prevDay.getDate() - 1);
      setLoading(true);
      const { record } = await fetchDayData(prevDay, selectedSiteId);
      if (record) {
          setDiaryEntry((prev: any) => ({
              ...prev,
              mechanisms: record.mechanisms,
              weather: record.weather,
              temperature_morning: record.temperature_morning,
              temperature_noon: record.temperature_noon
          }));
          setAlertState({ open: true, message: t('prev_day_copied'), type: 'success' });
      } else {
          setAlertState({ open: true, message: t('no_prev_day_record'), type: 'error' });
      }
      setLoading(false);
  };

  const handleSave = async (e?: React.FormEvent, status = 'draft') => {
      if(e) e.preventDefault();
      if(!selectedDay || !selectedSiteId || !diaryEntry) return;
      const dateStr = getLocalDateString(selectedDay);
      const payload = {
          ...diaryEntry,
          site_id: selectedSiteId,
          organization_id: profile.organization_id,
          date: dateStr,
          status
      };

      const { id, ...saveData } = payload; 
      try {
          if (diaryEntry.id) {
              await supabase.from('diary_records').update({ ...saveData, status }).eq('id', diaryEntry.id);
          } else {
              const { data } = await supabase.from('diary_records').insert([saveData]).select().single();
              if(data) setDiaryEntry(data);
          }
          if (status === 'signed') {
              setIsLocked(true);
              setAlertState({ open: true, message: t('diary_signed_msg'), type: 'success' });
          } else {
              setAlertState({ open: true, message: t('diary_saved'), type: 'success' });
          }
          fetchMonthOverview();
      } catch (err: any) {
          setAlertState({ open: true, message: err.message, type: 'error' });
      }
  };

  const handleUnlock = async () => {
      if (!diaryEntry?.id) return;
      setLoading(true);
      try {
          await supabase.from('diary_records').update({ status: 'draft' }).eq('id', diaryEntry.id);
          setDiaryEntry({ ...diaryEntry, status: 'draft' });
          setIsLocked(false);
          setAlertState({ open: true, message: t('diary_unlocked_msg'), type: 'success' });
          fetchMonthOverview();
      } catch (err: any) {
          setAlertState({ open: true, message: err.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setLoading(true);
          try {
              const blob = await compressImageToBlob(file);
              const fileExt = 'jpg';
              const fileName = `${selectedSiteId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
              const filePath = `photos/${fileName}`;

              const { error: uploadError } = await supabase.storage
                  .from('diary-photos')
                  .upload(filePath, blob, { contentType: 'image/jpeg' });

              if (uploadError) throw uploadError;

              const { data: { publicUrl } } = supabase.storage
                  .from('diary-photos')
                  .getPublicUrl(filePath);

              setDiaryEntry((prev: any) => ({
                  ...prev,
                  photos: [...(prev.photos || []), publicUrl]
              }));
              
          } catch (err: any) {
              console.error(err);
              setAlertState({ open: true, message: t('no_records') + ": " + err.message, type: 'error' });
          } finally {
              e.target.value = '';
              setLoading(false);
          }
      }
  };

  const removePhoto = (index: number) => {
      setDiaryEntry((prev: any) => ({
          ...prev,
          photos: (prev.photos || []).filter((_: any, i: number) => i !== index)
      }));
  };

  const handleExportPDF = async () => {
      if (!printRef.current) return;
      
      // Check if running on mobile device
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      try {
          const dateStr = selectedDay?.toLocaleDateString(getLocaleCode());
          const siteName = sites.find(s => s.id === selectedSiteId)?.name || 'Stavba';
          const opt = { 
              margin: [10, 10, 10, 10] as [number, number, number, number], 
              filename: `SD_${siteName}_${dateStr}.pdf`, 
              image: { type: 'jpeg' as const, quality: 0.98 }, 
              html2canvas: { scale: 2, useCORS: true, allowTaint: true }, 
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const } 
          };
          
          if (isMobile) {
              // For mobile: generate PDF and create download link
              const pdf = await html2pdf().set(opt).from(printRef.current).outputPdf('blob') as Blob;
              const url = URL.createObjectURL(pdf);
              const a = document.createElement('a');
              a.href = url;
              a.download = `SD_${siteName}_${dateStr}.pdf`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              setAlertState({ open: true, message: 'PDF bolo vygenerované. Skontrolujte priečinok "Downloads" v telefóne.', type: 'success' });
          } else {
              // For desktop: use direct save
              html2pdf().set(opt).from(printRef.current).save();
          }
      } catch (e: any) {
          console.error('PDF Export Error:', e);
          setAlertState({ open: true, message: 'PDF export zlyhal. Skúste znova alebo použite desktop verziu.', type: 'error' });
      }
  };

  const handleExportFullPDF = async () => {
      if (!selectedSiteId) return;
      setExporting(true);
      try {
          const [records, logs, materials] = await Promise.all([
              supabase.from('diary_records').select('*').eq('site_id', selectedSiteId).order('date', {ascending: true}),
              supabase.from('attendance_logs').select('*, profiles(full_name)').eq('site_id', selectedSiteId).order('date', {ascending: true}),
              supabase.from('materials').select('*').eq('site_id', selectedSiteId).order('purchase_date', {ascending: true})
          ]);

          const groupedData: any[] = [];
          const allDates = new Set([
              ...(records.data || []).map((r: any) => r.date),
              ...(logs.data || []).map((l: any) => l.date),
              ...(materials.data || []).map((m: any) => m.purchase_date)
          ]);

          const sortedDates = Array.from(allDates).sort();

          sortedDates.forEach(date => {
              groupedData.push({
                  date: date,
                  record: records.data?.find((r: any) => r.date === date),
                  logs: logs.data?.filter((l: any) => l.date === date),
                  materials: materials.data?.filter((m: any) => m.purchase_date === date)
              });
          });

          setFullExportData(groupedData);

          setTimeout(() => {
              if (!fullPrintRef.current) return;
              
              // Check if running on mobile device
              const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              const siteName = sites.find(s => s.id === selectedSiteId)?.name || 'Stavba';
              const opt = { 
                  margin: [10, 10, 10, 10] as [number, number, number, number], 
                  filename: `Kompletny_Dennik_${siteName}.pdf`, 
                  image: { type: 'jpeg' as const, quality: 0.98 }, 
                  html2canvas: { scale: 2, useCORS: true, allowTaint: true }, 
                  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
                  pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
              };
              
              if (isMobile) {
                  // For mobile: generate PDF and create download link
                  html2pdf().set(opt).from(fullPrintRef.current).outputPdf('blob').then((pdfBlob: Blob) => {
                      const url = URL.createObjectURL(pdfBlob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Kompletny_Dennik_${siteName}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      setExporting(false);
                      setFullExportData(null);
                      setAlertState({ open: true, message: 'PDF bolo vygenerované. Skontrolujte priečinok "Downloads" v telefóne.', type: 'success' });
                  }).catch((error: any) => {
                      console.error('PDF Export Error:', error);
                      setAlertState({ open: true, message: 'PDF export zlyhal. Skúste znova alebo použite desktop verziu.', type: 'error' });
                      setExporting(false);
                  });
              } else {
                  // For desktop: use direct save
                  html2pdf().set(opt).from(fullPrintRef.current).save().then(() => {
                      setExporting(false);
                      setFullExportData(null);
                  });
              }
          }, 1500);
      } catch (e: any) {
          console.error(e);
          setAlertState({ open: true, message: t('no_records'), type: 'error' });
          setExporting(false);
      }
  };

  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      return Array.from({length: days}, (_, i) => new Date(year, month, i + 1));
  };

  const SectionHeader = ({ icon: Icon, title, sub, action }: any) => (
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4 mt-2">
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Icon size={20}/></div>
            <div>
                <h3 className="font-bold text-slate-900 uppercase text-sm tracking-wider">{title}</h3>
                {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
            </div>
          </div>
          {action}
      </div>
  );

  const filteredSitesList = sites.filter(s => 
    s.name.toLowerCase().includes(searchSiteQuery.toLowerCase())
  );
  const currentSiteName = sites.find(s => s.id === selectedSiteId)?.name || t('site_label');

   const renderWeatherIcon = (weather?: string) => {
      switch (weather) {
          case 'Slnečno':
              return <Sun size={16} className="text-yellow-500" />;
          case 'Polooblačno':
              return <Cloud size={16} className="text-orange-400" />;
          case 'Oblačno':
              return <Cloud size={16} className="text-slate-400" />;
          case 'Dážď':
              return <CloudRain size={16} className="text-blue-500" />;
          case 'Búrka':
              return <CloudRain size={16} className="text-purple-500" />;
          case 'Vietor':
              return <Wind size={16} className="text-sky-500" />;
          case 'Sneženie':
              return <Cloud size={16} className="text-cyan-400" />;
          default:
              return <Cloud size={16} className="text-slate-400" />;
      }
  };

  return (
    <div className="space-y-6 relative">
      {!selectedDay && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in duration-300">
            <div>
               <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <BookOpen className="text-orange-600" size={32} />
                  {t('manage_diary')}
               </h2>
               <p className="text-sm text-slate-500 mt-1 font-medium">Elektronický stavebný denník</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-end">
                {!fixedSiteId && (
                    <div className="w-full sm:w-80 relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <Search size={12}/> {t('search_site_placeholder')}
                        </label>
                        <input 
                            type="text" 
                            placeholder={t('search_site_placeholder') + "..."}
                            value={searchSiteQuery}
                            onChange={(e) => setSearchSiteQuery(e.target.value)}
                            onFocus={() => { if(searchSiteQuery === currentSiteName) setSearchSiteQuery(''); }}
                            className="w-full p-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-orange-500 shadow-sm transition-all"
                        />
                        {searchSiteQuery !== currentSiteName && searchSiteQuery.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar">
                                {filteredSitesList.map(s => (
                                    <button 
                                        key={s.id} 
                                        onClick={() => handleSiteChange(s.id, s.name)}
                                        className="w-full text-left p-4 hover:bg-orange-50 border-b border-slate-50 flex items-center justify-between group transition"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-900 group-hover:text-orange-700">{s.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{s.status === 'completed' ? t('archive_label') : t('active_label')}</div>
                                        </div>
                                        <Building2 size={16} className="text-slate-200 group-hover:text-orange-300"/>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                {selectedSiteId && (
                    <Button onClick={handleExportFullPDF} disabled={exporting} className="whitespace-nowrap h-[46px] mt-auto">
                        {exporting ? <Loader2 className="animate-spin" size={18}/> : <Printer size={18}/>} 
                        {exporting ? t('generating') : t('export_pdf')}
                    </Button>
                )}
            </div>
          </div>
      )}

      {previewDay && (
          <div 
            className="fixed z-[100] w-64 md:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 animate-in zoom-in-95 duration-200 pointer-events-none backdrop-blur-sm bg-white/95"
            style={{ 
                left: `${Math.min(window.innerWidth - (window.innerWidth < 768 ? 270 : 340), Math.max(10, previewPos.x - 40))}px`, 
                top: `${Math.max(10, previewPos.y - 180)}px` 
            }}
          >
              <div className="flex justify-between items-start mb-3">
                  <h4 className="font-extrabold text-slate-900">{previewDay.date.toLocaleDateString(getLocaleCode(), { day: 'numeric', month: 'long' })}</h4>
                  <div className="flex gap-1">
                    {previewDay.stats?.status === 'signed' && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase">{t('status_signed')}</span>}
                    {previewDay.stats?.totalHours > 0 && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">{previewDay.stats.totalHours.toFixed(1)}h</span>}
                  </div>
              </div>
              
              <div className="space-y-3">
                {previewDay.stats?.record && (
    <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-100/50 p-2 rounded-lg border border-slate-200/50">
        <div className="flex items-center gap-2">
            {renderWeatherIcon(previewDay.stats.record.weather)}
        </div>

        <span className="font-bold text-slate-700">
            {previewDay.stats.record.temperature_noon || '-'}°C
        </span>
    </div>
)}

                
                {previewDay.stats?.logs?.length > 0 && (
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('workers')}</div>
                        <div className="text-xs text-slate-600 line-clamp-2 italic leading-relaxed">
                            {previewDay.stats.logs.join(', ')}
                        </div>
                    </div>
                )}

                {previewDay.stats?.record?.notes && (
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('record')}</div>
                        <div className="text-xs text-slate-700 line-clamp-3 bg-yellow-50/50 p-2 rounded border border-yellow-100/50 leading-relaxed font-mono">
                            {previewDay.stats.record.notes}
                        </div>
                    </div>
                )}

                {!previewDay.stats?.hasRecord && !previewDay.stats?.logs?.length && (
                    <div className="text-xs text-slate-400 italic text-center py-4">{t('no_day_records')}</div>
                )}
                
                <div className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-tighter mt-1 opacity-60">{t('click_to_edit')}</div>
              </div>
          </div>
      )}

      {selectedSiteId && selectedDay ? (
          (loading || !diaryEntry) ? (
              <div className="h-96 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in">
                  <Loader2 className="animate-spin text-orange-600 mb-4" size={40} />
                  <p className="text-slate-500 font-medium">{t('loading_record')}</p>
              </div>
          ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="sticky top-0 z-30 mb-6 bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
  
  {/* HORNÝ RIADOK – názov stavby + status */}
  <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0 flex-1">
          <Building2 size={14} className="text-slate-400 flex-shrink-0"/>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest truncate">
              {currentSiteName}
          </span>
      </div>

      {isLocked ? (
          <span className="text-green-700 flex items-center gap-1 bg-green-100 px-2 py-0.5 rounded-full border border-green-200 text-[9px] font-bold uppercase tracking-wider">
              <Lock size={10}/> {t('status_signed')}
          </span>
      ) : (
          <span className="text-orange-700 flex items-center gap-1 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200 text-[9px] font-bold uppercase tracking-wider">
              <PenTool size={10}/> {t('status_draft')}
          </span>
      )}
  </div>

  {/* HLAVNÝ RIADOK – späť / dátum / akcie */}
  <div className="p-3 md:p-4 flex flex-col sm:flex-row justify-between items-center gap-4">

      {/* ĽAVO */}
      <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          <button
              onClick={() => setSelectedDay(null)}
              className="text-slate-500 hover:text-slate-900 font-bold text-sm flex items-center gap-2 transition group whitespace-nowrap"
          >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform"/>
              <span className="hidden xs:inline">{t('back_to_overview')}</span>
          </button>

          {/* MOBILE – dátum */}
          <div className="sm:hidden text-center flex-1">
              <h2 className="text-sm font-extrabold text-slate-900">
                  {selectedDay.toLocaleDateString(getLocaleCode(), {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                  })}
              </h2>
          </div>
      </div>

      {/* DESKTOP – dátum */}
      <h2 className="hidden sm:block text-lg font-extrabold text-slate-900 text-center">
          {selectedDay.toLocaleDateString(getLocaleCode(), {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
          })}
      </h2>

      {/* PRAVO – akcie */}
      <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
          {!isLocked && (
              <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyPreviousDay}
                  className="flex-1 sm:flex-none"
              >
                  <Copy size={16}/>
                  <span className="hidden lg:inline ml-1">{t('copy_yesterday')}</span>
              </Button>
          )}

          <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPDF}
              className="flex-1 sm:flex-none"
          >
              <FileDown size={16}/>
              <span className="hidden lg:inline ml-1">PDF</span>
          </Button>
      </div>
  </div>
</div>


              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 space-y-6">
                      <Card className="border-t-4 border-t-orange-500 relative overflow-hidden shadow-md">
                          {isLocked && (
                              <div className="absolute inset-0 bg-slate-50/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in">
                                  <div className="bg-white p-6 rounded-2xl shadow-2xl font-bold flex flex-col items-center gap-4 text-center border border-slate-200 max-w-sm">
                                      <div className="bg-green-100 p-3 rounded-full text-green-600"><Lock size={32}/></div>
                                      <div>
                                          <h3 className="text-lg text-slate-900">{t('status_signed')}</h3>
                                          <p className="text-xs text-slate-500 font-medium mt-1">{t('unlock_for_edits_desc')}</p>
                                      </div>
                                      <Button variant="secondary" onClick={handleUnlock} size="sm" className="mt-2 w-full text-red-600 hover:bg-red-50 hover:border-red-200">
                                          <Unlock size={16}/> {t('unlock_for_edits')}
                                      </Button>
                                  </div>
                              </div>
                          )}
                          
                          <SectionHeader icon={Cloud} title={t('diary_section_weather')} sub={t('diary_section_weather_sub')} />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <Select label={t('weather_status')} value={diaryEntry.weather} onChange={(e: any) => setDiaryEntry({...diaryEntry, weather: e.target.value})}>
                                  <option value="Slnečno">{t('weather_sunny')} ☀️</option>
                                  <option value="Polooblačno">{t('weather_partly_cloudy')} ⛅</option>
                                  <option value="Oblačno">{t('weather_cloudy')} ☁️</option>
                                  <option value="Dážď">{t('weather_rainy')} 🌧️</option>
                                  <option value="Búrka">{t('weather_storm')} ⛈️</option>
                                  <option value="Vietor">{t('weather_windy')} 💨</option>
                                  <option value="Sneženie">{t('weather_snow')} ❄️</option>
                              </Select>
                              <Input label={t('temp_morning')} value={diaryEntry.temperature_morning} onChange={(e: any) => setDiaryEntry({...diaryEntry, temperature_morning: e.target.value})} placeholder="°C" />
                              <Input label={t('temp_noon')} value={diaryEntry.temperature_noon} onChange={(e: any) => setDiaryEntry({...diaryEntry, temperature_noon: e.target.value})} placeholder="°C" />
                          </div>

                          <SectionHeader 
                            icon={PenTool} 
                            title={t('diary_section_notes')} 
                            sub={t('diary_section_notes_sub')} 
                            action={
                                !isLocked && dailyAttendance.length > 0 && (
                                    <button onClick={importAttendanceToNotes} className="text-[10px] flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition font-bold" title={t('import_from_attendance')}>
                                        <RefreshCw size={12}/> {t('import_from_attendance')}
                                    </button>
                                )
                            }
                          />
                          <div className="mb-8 relative">
                              <textarea 
                                  className="w-full p-4 bg-yellow-50/30 border border-slate-300 rounded-xl outline-none focus:border-orange-500 min-h-[250px] text-sm font-medium text-slate-800 leading-relaxed resize-y font-mono" 
                                  placeholder={t('diary_notes_placeholder')}
                                  value={diaryEntry.notes || ''}
                                  onChange={(e) => setDiaryEntry({...diaryEntry, notes: e.target.value})}
                              />
                          </div>

                          <SectionHeader icon={Truck} title={t('diary_section_mechanisms')} sub={t('diary_section_mechanisms_sub')} />
                          <div className="mb-8">
                              <Input 
                                value={diaryEntry.mechanisms || ''} 
                                onChange={(e: any) => setDiaryEntry({...diaryEntry, mechanisms: e.target.value})} 
                                placeholder={t('mechanisms_placeholder')}
                              />
                          </div>

                          <SectionHeader icon={Camera} title={t('diary_section_photos')} sub={t('diary_section_photos_sub')} />
                          
                          <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="image/*" 
                              onChange={handleImageUpload} 
                          />

                          <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div 
                                onClick={() => !isLocked && !loading && fileInputRef.current?.click()}
                                className="aspect-square border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-orange-400 cursor-pointer transition active:scale-95"
                              >
                                  {loading ? <Loader2 size={24} className="animate-spin mb-2"/> : <Camera size={24} className="mb-2"/>}
                                  <span className="text-xs font-bold uppercase">{loading ? '...' : t('take_photo')}</span>
                              </div>

                              {diaryEntry.photos?.map((photo: string, index: number) => (
                                  <div key={index} className="aspect-square relative rounded-xl overflow-hidden border border-slate-200 group bg-slate-100 shadow-sm">
                                      <img src={photo} alt={`Foto ${index + 1}`} crossOrigin="anonymous" className="w-full h-full object-cover" loading="lazy" />
                                      {!isLocked && (
                                          <button 
                                            onClick={() => removePhoto(index)}
                                            className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition hover:bg-white hover:text-red-600 shadow-sm"
                                          >
                                              <X size={14} />
                                          </button>
                                      )}
                                  </div>
                              ))}
                          </div>

                          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100">
                              <div className="flex flex-col gap-3 w-full md:flex-row md:justify-end md:gap-3 order-1 md:order-2">
                                  <Button variant="secondary" onClick={(e: any) => handleSave(e, 'draft')} fullWidth className="md:w-auto justify-center">
                                      <Save size={18}/> {t('save_draft')}
                                  </Button>
                                  <Button variant="primary" onClick={(e: any) => handleSave(e, 'signed')} fullWidth className="md:w-auto bg-green-600 hover:bg-green-700 shadow-green-200 border-none text-white justify-center">
                                      <CheckCircle2 size={18}/> {t('sign_and_close')}
                                  </Button>
                              </div>
                              <div className="text-xs text-slate-400 text-center md:text-left order-2 md:order-1 w-full md:w-auto mt-2 md:mt-0">
                                  {diaryEntry.updated_at ? `${t('last_saved')}: ${new Date(diaryEntry.updated_at).toLocaleTimeString()}` : t('not_saved_yet')}
                              </div>
                          </div>
                      </Card>
                  </div>

                  <div className="space-y-6">
                      <div className="bg-gradient-to-br from-orange-50 to-white text-slate-800 p-5 rounded-2xl shadow-md border border-orange-100 relative overflow-hidden">
                          <div className="relative z-10">
                              <h4 className="font-bold text-xs uppercase tracking-wider mb-2 text-orange-600 opacity-80">{t('daily_summary')}</h4>
                              <div className="text-3xl font-extrabold flex items-baseline gap-2 text-slate-900">
                                  {dailyAttendance.reduce((a,b) => a + Number(b.hours), 0).toFixed(1)} <span className="text-lg font-medium opacity-60">{t('hours_unit')}</span>
                              </div>
                              <div className="mt-2 text-xs font-medium text-slate-500">{dailyAttendance.length} {t('workers_on_site')}</div>
                          </div>
                          <div className="absolute right-[-10px] bottom-[-10px] text-orange-500/10 transform rotate-12">
                              <Users size={100} />
                          </div>
                      </div>

                      <Card className="bg-white border-slate-200 shadow-sm p-4">
                          <SectionHeader icon={ListChecks} title={t('available_works')} sub={t('from_today_attendance')} />
                          {dailyAttendance.length === 0 ? <div className="text-sm text-slate-400 italic py-2 text-center">{t('no_records')}.</div> : (
                              <div className="space-y-3">
                                  {dailyAttendance.map(log => (
                                      <div key={log.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs shadow-sm hover:border-blue-200 transition group relative overflow-hidden">
                                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400"></div>
                                          <div className="flex justify-between items-start mb-1">
                                              <span className="font-black text-slate-800 uppercase tracking-tighter text-[9px]">{log.profiles?.full_name}</span>
                                              <span className="font-mono font-bold text-blue-600">{Number(log.hours).toFixed(1)}h</span>
                                          </div>
                                          <p className="text-slate-600 italic font-medium leading-relaxed">
                                              {log.description || `(${t('no_records')})`}
                                          </p>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </Card>

                      <Card className="bg-white border-slate-200 shadow-sm p-4">
                          <SectionHeader icon={Package} title={t('material_purchases')} sub={t('from_today_costs')} />
                          {dailyMaterials.length === 0 ? <div className="text-sm text-slate-400 italic py-2 text-center">{t('no_purchases')}</div> : (
                              <div className="space-y-2">
                                  {dailyMaterials.map(mat => (
                                      <div key={mat.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs hover:border-orange-200 transition">
                                          <div className="font-bold text-slate-800">{mat.name}</div>
                                          <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                                              <span className="font-bold text-orange-600">{mat.quantity} {mat.unit}</span>
                                              <span className="uppercase">{mat.supplier || '-'}</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </Card>
                  </div>
              </div>

              <div className="fixed left-[-9999px]">
                  <div ref={printRef} className="w-[190mm] bg-white p-8 text-slate-900 font-sans text-sm leading-normal relative box-border text-left flex flex-col min-h-[277mm]">
                      <div className="absolute top-4 right-4 text-[10px] text-slate-400">{t('generated_via')}</div>
                      <div className="border-b-2 border-black pb-4 mb-6">
                          <h1 className="text-2xl font-bold uppercase tracking-widest text-center mb-2">{t('manage_diary')}</h1>
                          <div className="flex justify-between items-end mt-4">
                              <div>
                                  <div className="font-bold text-lg">{currentSiteName}</div>
                                  <div className="text-xs uppercase tracking-wide text-slate-500">{t('site_label')}</div>
                              </div>
                              <div className="text-right">
                                  <div className="font-bold text-xl">{selectedDay.toLocaleDateString(getLocaleCode())}</div>
                                  <div className="text-xs uppercase tracking-wide text-slate-500">{t('date_label')}</div>
                              </div>
                          </div>
                      </div>
                      <div className="border border-black mb-6">
                          <div className="bg-slate-100 border-b border-black p-1 text-center font-bold uppercase text-xs">{t('diary_section_weather')}</div>
                          <div className="grid grid-cols-3 divide-x divide-black text-center p-2">
                              <div>
                                  <span className="block text-[10px] text-slate-500 uppercase">{t('weather_status')}</span>
                                  <span className="font-bold">{diaryEntry.weather || '-'}</span>
                              </div>
                              <div>
                                  <span className="block text-[10px] text-slate-500 uppercase">{t('morning_7')}</span>
                                  <span className="font-bold">{diaryEntry.temperature_morning || '-'} °C</span>
                              </div>
                              <div>
                                  <span className="block text-[10px] text-slate-500 uppercase">{t('noon_13')}</span>
                                  <span className="font-bold">{diaryEntry.temperature_noon || '-'} °C</span>
                              </div>
                          </div>
                      </div>
                      {[
                          { title: `1. ${t('workers')}`, content: dailyAttendance.length > 0 ? dailyAttendance.map(l => `${l.profiles?.full_name} (${Number(l.hours).toFixed(1)}h)`).join(', ') : t('no_records') },
                          { title: `2. ${t('diary_section_mechanisms')}`, content: diaryEntry.mechanisms || t('no_records') },
                          { title: `3. ${t('material_purchases')}`, content: dailyMaterials.length > 0 ? dailyMaterials.map(m => `${m.name} (${m.quantity} ${m.unit})`).join(', ') : t('no_purchases') },
                      ].map((sec, i) => (
                          <div key={i} className="mb-6">
                              <div className="font-bold uppercase text-xs border-b border-slate-300 mb-2 pb-1">{sec.title}</div>
                              <div className="text-justify leading-snug">{sec.content}</div>
                          </div>
                      ))}
                      <div className="mb-8 flex-1">
                          <div className="font-bold uppercase text-xs border-b border-black mb-2 pb-1">4. {t('diary_section_notes')}</div>
                          <div className="whitespace-pre-wrap text-justify min-h-[100px] text-sm leading-relaxed border-l-2 border-slate-100 pl-4">{diaryEntry.notes || t('no_records')}</div>
                      </div>

                      <div className="mt-auto pt-10 border-t border-slate-200 grid grid-cols-2 gap-10">
                          <div className="text-center">
                              <div className="h-16 border-b border-slate-300 mb-2"></div>
                              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('stamp_signature')}</div>
                          </div>
                          <div className="text-center relative">
                              <div className="h-16 border-b border-slate-300 mb-2 flex items-center justify-center">
                                  {organization.stamp_url && (
                                      <img 
                                          src={organization.stamp_url} 
                                          alt="Pečiatka" 
                                          crossOrigin="anonymous" 
                                          className="h-28 absolute -top-12 rotate-3 opacity-95 pointer-events-none" 
                                      />
                                  )}
                              </div>
                              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('stamp_signature')}</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          )
      ) : (
          <Card className="animate-in slide-in-from-bottom-2 duration-500 shadow-md">
              <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft size={18}/></button>
                      <h3 className="text-xl font-bold capitalize w-48 text-center text-slate-800">
                          {currentDate.toLocaleDateString(getLocaleCode(), { month: 'long', year: 'numeric' })}
                      </h3>
                      <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowRight size={18}/></button>
                  </div>
              </div>

              <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t('days_short').map((d: string) => <div key={d}>{d}</div>)}
              </div>
              
              <div className="grid grid-cols-7 gap-1 md:gap-2 p-1 md:p-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  {Array.from({length: (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7}).map((_, i) => (
                      <div key={`empty-${i}`} className="h-16 md:h-28 rounded-xl border border-transparent"></div>
                  ))}
                  
                  {getDaysInMonth(currentDate).map(day => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      const dateKey = getLocalDateString(day);
                      const stats = monthStats[dateKey];
                      const hasContent = stats?.hasRecord || (stats?.logs && stats.logs.length > 0);

                      return (
                          <button 
                              key={day.toISOString()}
                              onClick={() => handleDaySelect(day)}
                              onMouseEnter={(e) => handleMouseEnter(day, stats, e)}
                              onMouseLeave={() => setPreviewDay(null)}
                              onTouchStart={(e) => onTouchStart(day, stats, e)}
                              onTouchMove={onTouchMove}
                              onTouchEnd={onTouchEnd}
                              className={`h-16 md:h-28 rounded-xl border p-1 md:p-2 text-left relative transition-all hover:shadow-lg group flex flex-col justify-between shadow-sm overflow-hidden select-none ${
                                  isToday 
                                    ? 'border-orange-500 bg-white ring-2 ring-orange-100' 
                                    : hasContent
                                        ? 'border-blue-200 bg-white hover:border-blue-400' 
                                        : 'border-slate-200 bg-white hover:border-orange-300'
                              } bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] md:[background-size:16px_16px]`}
                          >
                              <div className="flex justify-between items-start w-full relative z-10">
                                <div className={`font-bold leading-none ${isToday ? 'text-orange-600 bg-orange-50 px-1 md:px-2 py-0.5 md:py-1 rounded-md text-xs sm:text-sm md:text-lg' : 'text-slate-700 text-xs sm:text-sm md:text-lg'}`}>
                                    {day.getDate()}
                                </div>
                                {hasContent && (
                                    <div className="flex gap-0.5 md:gap-1 bg-white/90 p-0.5 md:p-1 rounded-full shadow-sm border border-slate-100">
                                        {stats?.hasRecord && <div className={`w-1 h-1 md:w-2 md:h-2 rounded-full ${stats.status === 'signed' ? 'bg-green-500' : 'bg-orange-500'}`}></div>}
                                        {stats?.logs?.length > 0 && <div className="w-1 h-1 md:w-2 md:h-2 rounded-full bg-blue-500"></div>}
                                    </div>
                                )}
                              </div>
                              <div className="mt-auto w-full opacity-0 md:group-hover:opacity-100 transition-opacity flex justify-between items-end relative z-10">
                                  <div className="bg-slate-900/5 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase hidden md:block">{t('details')}</div>
                                  {stats?.totalHours > 0 && <span className="text-[9px] md:text-[10px] font-black text-blue-600 mb-0.5">{stats.totalHours.toFixed(1)}h</span>}
                              </div>
                          </button>
                      );
                  })}
              </div>
          </Card>
      )}

      {fullExportData && (
          <div className="fixed left-[-9999px]">
              <div ref={fullPrintRef} className="w-[190mm] bg-white p-8 text-slate-900 font-sans text-xs leading-normal box-border text-left">
                  <div className="text-right text-[10px] text-slate-400 mb-2">{t('generated_via')}</div>
                  <div className="border-b-2 border-black pb-4 mb-8">
                      <h1 className="text-2xl font-bold uppercase tracking-widest text-center mb-1">{t('manage_diary')}</h1>
                      <div className="text-center text-lg font-bold text-slate-700 uppercase">{currentSiteName}</div>
                  </div>

                  {fullExportData.map((day, idx) => (
                      <div key={idx} className="mb-12 border-b border-slate-200 pb-12 break-inside-avoid">
                          <div className="flex justify-between items-center mb-4 bg-slate-50 p-2 border-l-4 border-black">
                              <div className="text-lg font-bold">{formatDate(day.date)}</div>
                              <div className="text-[10px] uppercase font-bold text-slate-500">{t('record')}</div>
                          </div>

                          <div className="grid grid-cols-3 border border-black text-center mb-4 bg-slate-100/30">
                              <div className="p-2 border-r border-black">
                                  <div className="text-[8px] uppercase text-slate-500 font-bold text-center">{t('weather_status')}</div>
                                  <div className="font-bold text-xs text-center">{day.record?.weather || '-'}</div>
                              </div>
                              <div className="p-2 border-r border-black">
                                  <div className="text-[8px] uppercase text-slate-500 font-bold text-center">{t('morning_7')}</div>
                                  <div className="font-bold text-xs text-center">{day.record?.temperature_morning ? `${day.record.temperature_morning}°C` : '-'}</div>
                              </div>
                              <div className="p-2">
                                  <div className="text-[8px] uppercase text-slate-500 font-bold text-center">{t('noon_13')}</div>
                                  <div className="font-bold text-xs text-center">{day.record?.temperature_noon ? `${day.record.temperature_noon}°C` : '-'}</div>
                              </div>
                          </div>

                          <div className="space-y-4">
                              <div>
                                  <div className="font-bold uppercase text-[10px] border-b border-slate-300 mb-2 pb-1">1. {t('workers')}</div>
                                  <div className="text-xs leading-relaxed">
                                      {day.logs?.length > 0 
                                          ? day.logs.map((l: any, i: number) => `${l.profiles?.full_name} (${Number(l.hours).toFixed(1)}h)`).join(', ') 
                                          : t('no_records')}
                                  </div>
                              </div>

                              <div>
                                  <div className="font-bold uppercase text-[10px] border-b border-slate-300 mb-2 pb-1">2. {t('diary_section_mechanisms')}</div>
                                  <div className="text-xs">{day.record?.mechanisms || t('no_records')}</div>
                              </div>

                              <div>
                                  <div className="font-bold uppercase text-[10px] border-b border-slate-300 mb-2 pb-1">3. {t('material_purchases')}</div>
                                  <div className="text-xs">
                                      {day.materials?.length > 0 
                                          ? day.materials.map((m: any, i: number) => `${m.name} (${m.quantity} ${m.unit})`).join(', ') 
                                          : t('no_purchases')}
                                  </div>
                              </div>

                              <div>
                                  <div className="font-bold uppercase text-[10px] border-b border-black mb-2 pb-1">4. {t('diary_section_notes')}</div>
                                  <div className="text-xs whitespace-pre-wrap text-justify leading-relaxed bg-slate-50/50 p-2 rounded">
                                      {day.record?.notes || t('no_records')}
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
                  
                  <div className="mt-12 pt-8 border-t-2 border-black flex justify-between items-start">
                      <div className="text-[10px] text-slate-400">
                          {t('generated_via')}<br/>
                          {new Date().toLocaleString(getLocaleCode())}
                      </div>
                      <div className="text-center relative w-48">
                            <div className="h-12 border-b border-dotted border-black mb-1 flex items-center justify-center">
                                {organization.stamp_url && (
                                    <img src={organization.stamp_url} crossOrigin="anonymous" className="h-20 absolute -top-8 rotate-2 opacity-80" />
                                )}
                            </div>
                            <div className="text-[9px] uppercase font-bold">{t('stamp_signature')}</div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <AlertModal isOpen={alertState.open} onClose={() => setAlertState({...alertState, open: false})} title={alertState.type === 'error' ? '!' : '✓'} message={alertState.message} buttonText={t('understand')} type={alertState.type} />
    </div>
  );
};
