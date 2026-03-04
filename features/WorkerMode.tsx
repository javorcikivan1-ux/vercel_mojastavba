
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, AlertModal, Badge, Input, Select, Modal, ConfirmModal } from '../components/UI';
import { 
  HardHat, Building2, Calendar, Clock, CheckCircle2, Send, Loader2, 
  WifiOff, LayoutGrid, ListTodo, User, LogOut, 
  ChevronRight, MapPin, TrendingUp, Wallet, Phone, Lock, Info, Zap,
  Activity, ChevronLeft, Mail, Pencil, Save, Coins, AlertCircle, History, ArrowRight, Camera, KeyRound, Shield, Briefcase, Filter, Search,
  ChevronDown, Banknote, ChevronUp, ArrowUp, Check, Globe, ShieldCheck, BookOpen, Package, ClipboardCheck, Hash, RefreshCw, ArrowUpCircle, AlertTriangle
} from 'lucide-react';
import { formatMoney, formatDate, formatDuration } from '../lib/utils';

import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { PrivilegedSites } from './PrivilegedSites';
import { DiaryScreen } from './Diary';
import { ProjectFinanceWorker } from './ProjectFinanceWorker';
import { SitePermission } from '../lib/permissions';

// Import pre aktualizácie
import pkg from '../package.json';

const PRIORITY_FLAG = "#PRIORITY";
const HISTORY_PAGE_SIZE = 20;

const isCapacitor = Capacitor.isNativePlatform();
const isElectron = !isCapacitor && navigator.userAgent.toLowerCase().includes('electron');
const isApp = isCapacitor || isElectron;

// --- KOMPLETNÁ LOKALIZÁCIA PRE VŠETKY JAZYKY ---
const TRANSLATIONS: any = {
  sk: {
    nav_home: 'Domov', nav_tasks: 'Moje Úlohy', nav_log: 'Zápis Práce', nav_advances: 'Moje Zálohy', nav_history: 'Moja História', nav_profile: 'Môj Profil', nav_updates: 'Aktualizácie',
    logout: 'Odhlásiť sa', logout_confirm_title: 'Odhlásiť sa?', logout_confirm_msg: 'Naozaj sa chcete odhlásiť z aplikácie?',
    greeting: 'Ahoj', this_month: 'Tento mesiac', earnings: 'Zárobok', overdue_tasks: 'Nevybavené úlohy!',
    pending_advances: 'Nevyrovnané zálohy', total_to_return: 'Zostáva k vráteniu', today_agenda: 'Dnešná Agenda', weekly_activity: 'Týždenná aktivita',
    last_logs: 'Posledné záznamy', write_log: 'Zapísať prácu', site_select: 'Kde ste dnes pracovali?', arrival: 'Príchod', departure: 'Odchod',
    duration_on_site: 'Čas strávený na stavbe:', payment_type: 'Spôsob odmeňovania', hourly: 'Hodinovka', fixed: 'Úkol (Fixná suma)',
    fixed_amount_label: 'Dohodnutá suma za prácu (€)', work_desc_label: 'Popis vykonanej činnosti', send_log: 'Odoslať dnešný výkaz',
    personal_info: 'Osobné údaje', personal_info_name: 'Moje celé meno', personal_info_phone: 'Telefónne číslo',
    security: 'Zabezpečenie účtu', wage_info: 'Mzdové informácie', language: 'Jazyk aplikácie',
    save_changes: 'Uložiť zmeny', new_password: 'Nové heslo', confirm_password: 'Potvrdiť heslo', change_password: 'Zmeniť heslo',
    advance_height: 'Výška zálohy', current_debt: 'Môj aktuálny dlh', settlement_history: 'Zoznam zúčtovaných splátok',
    no_tasks: 'Na dnes žiadne úlohy.', no_advances: 'Zatiaľ žiadne zálohy.', no_logs: 'Žiadne záznamy.', close: 'Zatvoriť',
    success_msg: 'Hotovo, odoslané!', success_desc: 'Váš výkaz bol úspešne zaznamenaný.',
    task_detail: 'Detail Úlohy', mark_done: 'OZNAČIŤ AKO SPLNENÉ', splatene: 'Splatené',
    date_label: 'Dátum práce', retro_warning: 'Upozornenie: Zapisujete prácu spätne za iný deň. Admin bude o tomto informovaný.',
    task_title: 'Názov úlohy', term: 'Termín', site_label: 'Stavba', work_instructions: 'Pokyny k práci', in_repayment: 'V splácaní',
    available_work: 'Dostupné práce', insert_full_balance: 'Vložiť celý zostatok', to_return: 'k vráteniu',
    settlement_date: 'Dátum zúčtovania', installment_amount: 'Suma splátky (€)', confirm_deduct: 'Potvrdiť a odpočítať', cancel: 'Zrušiť',
    privileged_sites: 'Moje poverené stavby', back_to_overview: 'Späť na prehľad', manage_diary: 'Viesť denník', add_expense: 'Pridať nákup',
    site_management: 'Správa stavby',
    expenses_tab: 'Výdavky', phm_tab: 'Doprava', total_expenses: 'Výdavky spolu', add_expense_btn: 'Pridať výdavok',
    administrator: 'Administrátor', worker_role: 'Zamestnanec', wage_visible: 'Mzda viditeľná', wage_hidden: 'Mzda skrytá',
    edit_profile: 'Upraviť profil', back_to_team: 'Späť na tím', all_sites: 'Všetky stavby',
    reset_filter: 'Zrušiť filter stavby', hours_abbr: 'hod', cost_abbr: 'náklad', firm_expense: 'Náklad pre firmu',
    work_duration: 'Dĺžka práce', profile_updated: 'Váš profil bol aktualizovaný', password_mismatch: 'Heslá sa nezhodujú.',
    password_changed: 'Vaše heslo bolo úspešne zmenené.', avatar_success: 'Profilová fotka bola aktualizovaná.',
    avatar_error: 'Nepodarilo sa nahrať fotku.', invite_members: 'Pozvať členov do tímu', magic_link_label: 'Registračný link pre tím',
    company_id_label: 'ID vašej firmy', copied_label: 'Skopírované!', copy_btn: 'Kopírovať',
    invite_info_text: 'Tento registračný odkaz je univerzálny pre všetkých zamestnancov vašej firmy.',
    loading: 'Načítavam...', saving: 'Ukladám...', logged_in_as: 'Prihlásený ako', search_site_placeholder: 'Hľadať stavbu...', unlock_for_edits_desc: 'Pre úpravy je potrebné záznam najskôr odomknúť.',
    current_day: 'Dnes', understand: 'Rozumiem', confirm: 'Potvrdiť'
  },
  en: {
    nav_home: 'Home', nav_tasks: 'My Tasks', nav_log: 'Work Log', nav_advances: 'My Advances', nav_history: 'My History', nav_profile: 'My Profile', nav_updates: 'Updates',
    logout: 'Logout', logout_confirm_title: 'Logout?', logout_confirm_msg: 'Are you sure you want to logout?',
    greeting: 'Hi', this_month: 'This month', earnings: 'Earnings', overdue_tasks: 'Pending tasks!',
    pending_advances: 'Unsettled advances', total_to_return: 'Total to return', today_agenda: 'Today\'s Agenda', weekly_activity: 'Weekly activity',
    last_logs: 'Recent entries', write_log: 'Log work', site_select: 'Where did you work today?', arrival: 'Arrival', departure: 'Departure',
    duration_on_site: 'Time on site:', payment_type: 'Payment type', hourly: 'Hourly rate', fixed: 'Fixed rate',
    fixed_amount_label: 'Agreed fixed price (€)', work_desc_label: 'Description of work', send_log: 'Send today\'s report',
    personal_info: 'Personal info', personal_info_name: 'Full Name', personal_info_phone: 'Phone Number',
    security: 'Account security', wage_info: 'Wage information', language: 'App language',
    save_changes: 'Save changes', new_password: 'New password', confirm_password: 'Confirm password', change_password: 'Change password',
    advance_height: 'Advance amount', current_debt: 'My current debt', settlement_history: 'Repayment history',
    no_tasks: 'No tasks for today.', no_advances: 'No advances yet.', no_logs: 'No records.', close: 'Close',
    success_msg: 'Done, sent!', success_desc: 'Your report has been successfully recorded.',
    task_detail: 'Task Detail', mark_done: 'MARK AS DONE', splatene: 'Settled',
    date_label: 'Work date', retro_warning: 'Warning: Back-dated entry.',
    task_title: 'Task name', term: 'Deadline', site_label: 'Site', work_instructions: 'Work instructions', in_repayment: 'In repayment',
    available_work: 'Available work', insert_full_balance: 'Insert full balance', to_return: 'to return',
    settlement_date: 'Settlement date', installment_amount: 'Installment amount (€)', confirm_deduct: 'Confirm and deduct', cancel: 'Cancel',
    privileged_sites: 'My privileged sites', back_to_overview: 'Back to overview', manage_diary: 'Manage diary', add_expense: 'Add purchase',
    site_management: 'Site management',
    expenses_tab: 'Expenses', phm_tab: 'Transport', total_expenses: 'Total expenses', add_expense_btn: 'Add expense',
    administrator: 'Administrator', worker_role: 'Employee', wage_visible: 'Wage visible', wage_hidden: 'Wage hidden',
    edit_profile: 'Edit profile', back_to_team: 'Back to team', all_sites: 'All sites',
    reset_filter: 'Reset site filter', hours_abbr: 'h', cost_abbr: 'cost', firm_expense: 'Cost for company',
    work_duration: 'Work duration', profile_updated: 'Your profile has been updated', password_mismatch: 'Passwords do not match.',
    password_changed: 'Your password has been successfully changed.', avatar_success: 'Profile picture updated.',
    avatar_error: 'Failed to upload photo.', invite_members: 'Invite members to team', magic_link_label: 'Registration link for team',
    company_id_label: 'Your company ID', copied_label: 'Copied!', copy_btn: 'Copy',
    invite_info_text: 'This registration link is universal for all employees of your company.',
    loading: 'Loading...', saving: 'Saving...', logged_in_as: 'Logged in as', search_site_placeholder: 'Search site...',
    current_day: 'Today', understand: 'I understand', confirm: 'Confirm'
  },
  de: {
    nav_home: 'Startseite', nav_tasks: 'Meine Aufgaben', nav_log: 'Arbeitsprotokoll', nav_advances: 'Meine Vorschüsse', nav_history: 'Verlauf', nav_profile: 'Mein Profil', nav_updates: 'Aktualisierungen',
    logout: 'Abmelden', logout_confirm_title: 'Abmelden?', logout_confirm_msg: 'Möchten Sie sich wirklich abmelden?',
    greeting: 'Hallo', this_month: 'Diesen Monat', earnings: 'Verdienst', overdue_tasks: 'Ausstehende Aufgaben!',
    pending_advances: 'Offene Vorschüsse', total_to_return: 'Restbetrag', today_agenda: 'Heutige Agenda', weekly_activity: 'Wöchentliche Aktivität',
    last_logs: 'Letzte Einträge', write_log: 'Arbeit protokollieren', site_select: 'Wo haben Sie heute gearbeitet?', arrival: 'Ankunft', departure: 'Abreise',
    duration_on_site: 'Zeit vor Ort:', payment_type: 'Vergütungsart', hourly: 'Stundensatz', fixed: 'Pauschalbetrag',
    fixed_amount_label: 'Vereinbarte Summe (€)', work_desc_label: 'Arbeitsbeschreibung', send_log: 'Bericht senden',
    personal_info: 'Persönliche Info', personal_info_name: 'Vollständiger Name', personal_info_phone: 'Telefonnummer',
    security: 'Kontosicherheit', wage_info: 'Lohninformationen', language: 'App-Sprache',
    save_changes: 'Änderungen speichern', new_password: 'Neues Passwort', confirm_password: 'Bestätigen', change_password: 'Passwort ändern',
    advance_height: 'Vorschusshöhe', current_debt: 'Aktuelle Schulden', settlement_history: 'Rückzahlungsverlauf',
    no_tasks: 'Keine Aufgaben für heute.', no_advances: 'Noch keine Vorschüsse.', no_logs: 'Keine Einträge.', close: 'Schließen',
    success_msg: 'Erledigt, gesendet!', success_desc: 'Ihr Bericht wurde erfolgreich aufgezeichnet.',
    task_detail: 'Aufgabendetail', mark_done: 'ALS ERLEDIGT MARKIERN', splatene: 'Erledigt',
    date_label: 'Arbeitsdatum', retro_warning: 'Warnung: Nachträglicher Eintrag.',
    task_title: 'Aufgabenname', term: 'Frist', site_label: 'Baustelle', work_instructions: 'Anweisungen', in_repayment: 'In Rückzahlung',
    available_work: 'Verfügbare Arbeit', insert_full_balance: 'Gesamtbetrag', to_return: 'zurückgeben',
    settlement_date: 'Abrechnungsdatum', installment_amount: 'Ratenbetrag (€)', confirm_deduct: 'Bestätigen', cancel: 'Abbrechen',
    privileged_sites: 'Meine privilegierten Standorte', back_to_overview: 'Zurück zur Übersicht', manage_diary: 'Tagebuch führen', add_expense: 'Einkauf hinzufügen',
    site_management: 'Standortverwaltung',
    expenses_tab: 'Ausgaben', phm_tab: 'Transport', total_expenses: 'Gesamtausgaben', add_expense_btn: 'Ausgabe hinzufügen',
    administrator: 'Administrator', worker_role: 'Mitarbeiter', wage_visible: 'Lohn sichtbar', wage_hidden: 'Lohn ausgeblendet',
    edit_profile: 'Profil bearbeiten', back_to_team: 'Zurück zum Team', all_sites: 'Alle Standorte',
    reset_filter: 'Standortfilter zurücksetzen', hours_abbr: 'Std', cost_abbr: 'Kosten', firm_expense: 'Kosten für Firma',
    work_duration: 'Arbeitsdauer', profile_updated: 'Ihr Profil wurde aktualisiert', password_mismatch: 'Passwörter stimmen nicht überein.',
    password_changed: 'Ihr Passwort wurde erfolgreich geändert.', avatar_success: 'Profilbild aktualisiert.',
    avatar_error: 'Foto konnte nicht hochgeladen werden.', invite_members: 'Mitglieder ins Team einladen', magic_link_label: 'Registrierungslink für Team',
    company_id_label: 'Ihre Firmen-ID', copied_label: 'Kopiert!', copy_btn: 'Kopieren',
    invite_info_text: 'Dieser Registrierungslink ist universell für alle Mitarbeiter Ihres Unternehmens.',
    loading: 'Laden...', saving: 'Speichern...', logged_in_as: 'Angemeldet als', search_site_placeholder: 'Standort suchen...',
    current_day: 'Heute', understand: 'Verstanden', confirm: 'Bestätigen'
  },
  hu: {
    nav_home: 'Kezdőlap', nav_tasks: 'Feladataim', nav_log: 'Munka rögzítése', nav_advances: 'Előlegeim', nav_history: 'Előzmények', nav_profile: 'Profilom', nav_updates: 'Frissítések',
    logout: 'Kijelentkezés', logout_confirm_title: 'Kijelentkezés?', logout_confirm_msg: 'Biztosan ki akar jelentkezni?',
    greeting: 'Szia', this_month: 'Ebben a hónapban', earnings: 'Kereset', overdue_tasks: 'Függő feladatok!',
    pending_advances: 'Nyeretlen előlegek', total_to_return: 'Visszafizetendő', today_agenda: 'Mai feladatok', weekly_activity: 'Heti aktivitás',
    last_logs: 'Legutóbbi bejegyzések', write_log: 'Munka naplózása', site_select: 'Hol dolgozott ma?', arrival: 'Érkezés', departure: 'Távozás',
    duration_on_site: 'Helyszínen töltött idô:', payment_type: 'Fizetési mód', hourly: 'Órabér', fixed: 'Fix összeg',
    fixed_amount_label: 'Megállapodott összeg (€)', work_desc_label: 'Munka leírása', send_log: 'Jelentés küldése',
    personal_info: 'Személyes adatok', personal_info_name: 'Teljes név', personal_info_phone: 'Telefonszám',
    security: 'Fiók biztonsága', wage_info: 'Bérinformóciók', language: 'Alkalmazás nyelve',
    save_changes: 'Mentés', new_password: 'Új jelszó', confirm_password: 'Megerősítés', change_password: 'Jelszó módosítása',
    advance_height: 'Előleg összege', current_debt: 'Jelenlegi tartozás', settlement_history: 'Törlesztési előzmények',
    no_tasks: 'Nincs mára feladat.', no_advances: 'Még nincs előleg.', no_logs: 'Nincsenek adatok.', close: 'Bezárás',
    success_msg: 'Kész, elküldve!', success_desc: 'A jelentés sikeresen rögzítve.',
    task_detail: 'Feladat részletei', mark_done: 'KÉSZNEK JELÖLÉS', splatene: 'Rendezett',
    date_label: 'Munka dátuma', retro_warning: 'Vigyázat: Visszamenőleges rögzítés.',
    task_title: 'Feladat neve', term: 'Határidő', site_label: 'Építkezés', work_instructions: 'Utasítások', in_repayment: 'Törlesztés alatt',
    available_work: 'Elérhető munka', insert_full_balance: 'Teljes egyenleg', to_return: 'visszaadni',
    settlement_date: 'Elszámolás dátuma', installment_amount: 'Törlesztés (€)', confirm_deduct: 'Megerősítés', cancel: 'Mégse',
    privileged_sites: 'Saját kiemelt helyszíneim', back_to_overview: 'Vissza az áttekintéshez', manage_diary: 'Napló vezetése', add_expense: 'Vásárlás hozzáadása',
    site_management: 'Helyszín kezelése',
    expenses_tab: 'Kiadások', phm_tab: 'Szállítás', total_expenses: 'Összes kiadás', add_expense_btn: 'Kiadás hozzáadása',
    administrator: 'Adminisztrátor', worker_role: 'Alkalmazott', wage_visible: 'Bér látható', wage_hidden: 'Bér rejtett',
    edit_profile: 'Profil szerkesztése', back_to_team: 'Vissza a csapathoz', all_sites: 'Összes helyszín',
    reset_filter: 'Szűrő törlése', hours_abbr: 'óra', cost_abbr: 'költség', firm_expense: 'Költség a cégnek',
    work_duration: 'Munkaidő', profile_updated: 'Profilja frissítve lett', password_mismatch: 'A jelszavak nem egyeznek.',
    password_changed: 'Jelszava sikeresen megváltozott.', avatar_success: 'Profilkép frissítve.',
    avatar_error: 'Hiba a fotó feltöltésekor.', invite_members: 'Tagok meghívása', magic_link_label: 'Regisztrációs link a csapathoz',
    company_id_label: 'Cége azonosítója', copied_label: 'Másolva!', copy_btn: 'Másolás',
    invite_info_text: 'Ez a regisztrációs link univerzális cége összes alkalmazottja számára.',
    loading: 'Betöltés...', saving: 'Munkaidő...', logged_in_as: 'Bejelentkezve mint', search_site_placeholder: 'Helyszín keresése...',
    current_day: 'Ma', understand: 'Értem', confirm: 'Megerősítés'
  },
  pl: {
    nav_home: 'Start', nav_tasks: 'Moje zadania', nav_log: 'Zapis pracy', nav_advances: 'Moje zaliczki', nav_history: 'Historia', nav_profile: 'Mój Profil', nav_updates: 'Aktualizacje',
    logout: 'Wyloguj', logout_confirm_title: 'Wylogować?', logout_confirm_msg: 'Czy na pewno chcesz się wylogować?',
    greeting: 'Cześć', this_month: 'W tym miesiącu', earnings: 'Zarobki', overdue_tasks: 'Zaległe zadania!',
    pending_advances: 'Nierozliczone zaliczki', total_to_return: 'Do zwrotu', today_agenda: 'Dzisiejszy plan', weekly_activity: 'Aktywność tygodniowa',
    last_logs: 'Ostatnie wpisy', write_log: 'Zapisz pracę', site_select: 'Gdzie dzisiaj pracowałeś?', arrival: 'Przyjazd', departure: 'Wyjazd',
    duration_on_site: 'Czas na budowie:', payment_type: 'Rodzaj płatności', hourly: 'Stawka godzinowa', fixed: 'Ryczałt',
    fixed_amount_label: 'Ustalona kwota (€)', work_desc_label: 'Opis pracy', send_log: 'Wyślij raport',
    personal_info: 'Dane osobowe', personal_info_name: 'Imię i nazwisko', personal_info_phone: 'Numer telefonu',
    security: 'Bezpieczeństwo konta', wage_info: 'Informacje o płacy', language: 'Język aplikacji',
    save_changes: 'Zapisz zmiany', new_password: 'Nowe hasło', confirm_password: 'Potwierdź', change_password: 'Zmień hasło',
    advance_height: 'Kwota zaliczki', current_debt: 'Aktualny dług', settlement_history: 'Historia spłat',
    no_tasks: 'Brak zadań na dziś.', no_advances: 'Brak zaliczek.', no_logs: 'Brak wpisów.', close: 'Zamknij',
    success_msg: 'Gotowe, wysłano!', success_desc: 'Twój raport został pomyślnie zapisany.',
    task_detail: 'Szczegóły zadania', mark_done: 'OZNACZ JAKO WYKONANE', splatene: 'Spłacone',
    date_label: 'Data pracy', retro_warning: 'Uwaga: Zapis wsteczny.',
    task_title: 'Nazwa zadania', term: 'Termin', site_label: 'Budowa', work_instructions: 'Instrukcje', in_repayment: 'W spłacie',
    available_work: 'Dostępna praca', insert_full_balance: 'Pełna kwota', to_return: 'do zwrotu',
    settlement_date: 'Data rozliczenia', installment_amount: 'Kwota spłaty (€)', confirm_deduct: 'Potwierdź', cancel: 'Anuluj',
    privileged_sites: 'Moje uprzywilejowane budowy', back_to_overview: 'Powrót do przeglądu', manage_diary: 'Prowadź dziennik', add_expense: 'Dodaj zakup',
    site_management: 'Zarządzanie budową',
    expenses_tab: 'Wydatki', phm_tab: 'Transport', total_expenses: 'Wydatki razem', add_expense_btn: 'Dodaj wydatek',
    administrator: 'Administrator', worker_role: 'Pracownik', wage_visible: 'Płaca widoczna', wage_hidden: 'Płaca ukryta',
    edit_profile: 'Edytuj profil', back_to_team: 'Powrót do zespołu', all_sites: 'Wszystkie budowy',
    reset_filter: 'Resetuj filtr budowy', hours_abbr: 'godz', cost_abbr: 'koszt', firm_expense: 'Koszt dla firmy',
    work_duration: 'Czas trwania', profile_updated: 'Twój profil został zaktualizowany', password_mismatch: 'Hasła nie pasują do siebie.',
    password_changed: 'Twoje hasło zostało pomyślnie zmienione.', avatar_success: 'Zdjęcie profilowe zaktualizowane.',
    avatar_error: 'Nie udało się przesłać zdjęcia.', invite_members: 'Zaproś członków do zespołu', magic_link_label: 'Link rejestracyjny dla zespołu',
    company_id_label: 'ID Twojego zespołu', copied_label: 'Skopiowano!', copy_btn: 'Kopiuj',
    invite_info_text: 'Ten link rejestracyjny jest uniwersalny dla wszystkich pracowników Twojej firmy.',
    loading: 'Ładowanie...', saving: 'Zapisywanie...', logged_in_as: 'Zalogowany jako', search_site_placeholder: 'Szukaj budowy...',
    current_day: 'Dzisiaj', understand: 'Rozumiem', confirm: 'Potwierdź'
  },
  ua: {
    nav_home: 'Головна', nav_tasks: 'Мої завдання', nav_log: 'Запис роботи', nav_advances: 'Мої аванси', nav_history: 'Історія', nav_profile: 'Мій Профіль', nav_updates: 'Оновлення',
    logout: 'Вийти', logout_confirm_title: 'Вийти?', logout_confirm_msg: 'Ви впевнені, що хочете вийти?',
    greeting: 'Привіт', this_month: 'Цього місяця', earnings: 'Заробіток', overdue_tasks: 'Прострочені завдання!',
    pending_advances: 'Нерозраховані аванси', total_to_return: 'До повернення', today_agenda: 'Сьогоднішній план', weekly_activity: 'Тижнева активність',
    last_logs: 'Останні записи', write_log: 'Записати роботу', site_select: 'Де ви сьогодні працювали?', arrival: 'Прибуття', departure: 'Від’їзд',
    duration_on_site: 'Час на об’єкті:', payment_type: 'Тип оплати', hourly: 'Погодинна', fixed: 'Фіксована сума',
    fixed_amount_label: 'Узгоджена сума (€)', work_desc_label: 'Опис виконаної роботи', send_log: 'Надіслати звіт',
    personal_info: 'Особисті дані', personal_info_name: 'Повне ім’я', personal_info_phone: 'Номер телефону',
    security: 'Безпека акаунта', wage_info: 'Інформація про зарплату', language: 'Мова додатка',
    save_changes: 'Зберегти зміни', new_password: 'Новий паrol', confirm_password: 'Підтвердити', change_password: 'Змінити пароль',
    advance_height: 'Сума авансу', current_debt: 'Поточний борг', settlement_history: 'Історія виплат',
    no_tasks: 'На сьогодні завдань немає.', no_advances: 'Авансів поки немає.', no_logs: 'Записів немає.', close: 'Закрити',
    success_msg: 'Готово, надіслано!', success_desc: 'Ваш звіт успішно записано.',
    task_detail: 'Деталі завдання', mark_done: 'ПОЗНАЧИТИ ЯК ВИКОНАНЕ', splatene: 'Виплачено',
    date_label: 'Дата роботи', retro_warning: 'Попередження: Запис заднім числом.',
    task_title: 'Назва завдання', term: 'Термін', site_label: 'Об’єкт', work_instructions: 'Інструкції', in_repayment: 'У процесі виплати',
    available_work: 'Доступна робота', insert_full_balance: 'Вставити весь залишок', to_return: 'до повернення',
    settlement_date: 'Дата розрахунку', installment_amount: 'Сума внеску (€)', confirm_deduct: 'Підтвердити', cancel: 'Скасувати',
    privileged_sites: 'Мої привілейовані об\'єкти', back_to_overview: 'Назад до огляdu', manage_diary: 'Вести щоденник', add_expense: 'Додати покупку',
    site_management: 'Управління об\'єктом',
    expenses_tab: 'Витрати', phm_tab: 'Транспорт', total_expenses: 'Загальні витрати', add_expense_btn: 'Додати витрату',
    administrator: 'Адміністратор', worker_role: 'Працівник', wage_visible: 'Зарплата видима', wage_hidden: 'Зарплата прихована',
    edit_profile: 'Редагувати профіль', back_to_team: 'Назад до команди', all_sites: 'Усі об\'єкти',
    reset_filter: 'Скинути фільтр об\'єkta', hours_abbr: 'год', cost_abbr: 'вартість', firm_expense: 'Вартість для компанії',
    work_duration: 'Тривалість роботи', profile_updated: 'Ваш профіль оновлено', password_mismatch: 'Паролі не співпадають.',
    password_changed: 'Ваш пароль успішно змінено.', avatar_success: 'Фото профілю оновлено.',
    avatar_error: 'Не вдалося завантажити фото.', invite_members: 'Запросити членів до команди', magic_link_label: 'Посилання для реєстрації команди',
    company_id_label: 'ID вашої компанії', copied_label: 'Скопійовано!', copy_btn: 'Копіювати',
    invite_info_text: 'Це посилання для реєстрації є універсальним для всіх працівників вашої компанії.',
    loading: 'Завантаження...', saving: 'Збереження...', logged_in_as: 'Увійшов як', search_site_placeholder: 'Пошук об\'єкта...',
    current_day: 'Сьогодні', understand: 'Зрозуміло', confirm: 'Підтвердити'
  }
};

const compressAvatar = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const SIZE = 256; 
                canvas.width = SIZE;
                canvas.height = SIZE;
                const ctx = canvas.getContext('2d');
                const minDim = Math.min(img.width, img.height);
                const sx = (img.width - minDim) / 2;
                const sy = (img.height - minDim) / 2;
                ctx?.drawImage(img, sx, sy, minDim, minDim, 0, 0, SIZE, SIZE);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Chyba pri kompresii fotky.'));
                }, 'image/jpeg', 0.85); 
            };
        };
        reader.onerror = (err) => reject(err);
    });
};

const getLocalDateISO = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
};

interface WorkerModeProps {
  profile: any;
  onLogout: () => void;
  onTabChange?: (tab: string) => void;
}

export const WorkerModeScreen: React.FC<WorkerModeProps> = ({ profile: initialProfile, onLogout, onTabChange }) => {
  const [profile, setProfile] = useState(initialProfile);
  const [organization, setOrganization] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'log' | 'history' | 'profile' | 'advances' | 'updates'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Site Privileges State
  const [sitePermissions, setSitePermissions] = useState<SitePermission[]>([]);
  const [activePrivilege, setActivePrivilege] = useState<{ siteId: string, module: 'diary' | 'finance' } | null>(null);

  // Language State - Default to SK if user is admin
  const [lang, setLang] = useState(() => {
    if (initialProfile.role === 'admin') return 'sk';
    return localStorage.getItem('ms_worker_lang') || 'sk';
  });
  
  const t = (key: string) => {
    const currentLang = TRANSLATIONS[lang] ? lang : 'sk';
    return TRANSLATIONS[currentLang][key] || TRANSLATIONS['sk'][key] || key;
  };
  
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

  const changeLanguage = (newLang: string) => {
    setLang(newLang);
    localStorage.setItem('ms_worker_lang', newLang);
  };
  
  const [projects, setProjects] = useState<any[]>([]);
  
  // Tasks state
  const [todoTasks, setTodoTasks] = useState<any[]>([]);
  const [doneTasks, setDoneTasks] = useState<any[]>([]);
  const [donePage, setDonePage] = useState(0);
  const [hasMoreDone, setHasMoreDone] = useState(true);
  const [loadingMoreDone, setLoadingMoreDone] = useState(false);

  // History state
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySiteFilter, setHistorySiteFilter] = useState('');
  const [historyYearFilter, setHistoryYearFilter] = useState(new Date().getFullYear().toString());
  const [historyMonthFilter, setHistoryMonthFilter] = useState('');
  const [relevantSites, setRelevantSites] = useState<any[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Advances state
  const [myAdvances, setMyAdvances] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedForHistory, setSelectedForHistory] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loadingHistorySettle, setLoadingHistorySettle] = useState(false);

  const [stats, setStats] = useState({ monthHours: 0, monthEarned: 0, todayHours: 0, weeklyHistory: [] as any[] });
  const [lastLogs, setLastLogs] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const mainScrollRef = useRef<HTMLDivElement>(null);

  const [logForm, setLogForm] = useState({
      site_id: '',
      date: getLocalDateISO(new Date()),
      start_time: '07:00',
      end_time: '15:30',
      hours: '8.5',
      description: '',
      payment_type: 'hourly' as 'hourly' | 'fixed',
      fixed_amount: ''
  });

  const [profileForm, setProfileForm] = useState({
      full_name: profile?.full_name || '',
      phone: profile?.phone || ''
  });

  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // State pre aktualizácie
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'no-update' | 'error'>('idle');
  const [currentVersion, setCurrentVersion] = useState(pkg.version);
  const [newVersion, setNewVersion] = useState('');
  const [updateError, setUpdateError] = useState('');
  
  const [alertState, setAlertState] = useState<{open: boolean, message: string, title?: string, type?: 'success' | 'error'}>({ open: false, message: '' });

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
        if (mainScrollRef.current) {
            setShowScrollTop(mainScrollRef.current.scrollTop > 500);
        }
    };
    const el = mainScrollRef.current;
    el?.addEventListener('scroll', handleScroll);
    return () => el?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadAllData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    
    const now = new Date();
    const todayStr = getLocalDateISO(now);
    const startOfMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;

    const curr = new Date(now);
    const day = curr.getDay(); 
    const diffToMon = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diffToMon));
    monday.setHours(0,0,0,0);
    const weekStartStr = getLocalDateISO(monday);

    try {
        const [sitesRes, todoTasksRes, logsRes, profileRes, weekLogsRes, advancesRes, permsRes, orgRes] = await Promise.all([
            supabase.from('sites').select('id, name').eq('organization_id', profile.organization_id).eq('status', 'active'),
            supabase.from('tasks').select('*, sites(name)').eq('assigned_to', profile.id).eq('status', 'todo').order('start_date', { ascending: true }),
            supabase.from('attendance_logs').select('*, sites(name)').eq('user_id', profile.id).gte('date', startOfMonth).order('date', { ascending: false }),
            supabase.from('profiles').select('*').eq('id', profile.id).single(),
            supabase.from('attendance_logs').select('date, hours').eq('user_id', profile.id).gte('date', weekStartStr),
            supabase.from('advances').select('*').eq('user_id', profile.id).order('date', { ascending: false }),
            supabase.from('site_permissions').select('*, sites(name, address)').eq('user_id', profile.id),
            supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
        ]);

        if (profileRes.data) {
            setProfile(profileRes.data);
            setProfileForm({
                full_name: profileRes.data.full_name || '',
                phone: profileRes.data.phone || ''
            });
        }
        if (orgRes.data) setOrganization(orgRes.data);
        if (sitesRes.data) setProjects(sitesRes.data);
        if (todoTasksRes.data) setTodoTasks(todoTasksRes.data);
        if (advancesRes.data) setMyAdvances(advancesRes.data);
        if (permsRes.data) setSitePermissions(permsRes.data);
        
        if (logsRes.data) {
            setLastLogs(logsRes.data.slice(0, 5));
            const totalH = logsRes.data.reduce((sum, l) => sum + Number(l.hours), 0);
            const todayH = weekLogsRes.data?.filter(l => l.date === todayStr).reduce((sum, l) => sum + Number(l.hours), 0) || 0;
            
            const earned = logsRes.data.reduce((sum, l) => {
                if (l.payment_type === 'fixed') {
                    return sum + Number(l.fixed_amount || 0);
                }
                const rate = l.hourly_rate_snapshot || profile.hourly_rate || 0;
                return sum + (Number(l.hours) * rate);
            }, 0);
            
            const weekDays = [];
            const tempDate = new Date(monday);
            for(let i = 0; i < 7; i++) {
                const dateStr = getLocalDateISO(tempDate);
                const dayLogs = (weekLogsRes.data || []).filter(l => l.date === dateStr);
                const dayHours = dayLogs.reduce((s, l) => s + Number(l.hours), 0);
                
                weekDays.push({
                    date: dateStr,
                    dayNum: tempDate.getDate(),
                    label: tempDate.toLocaleDateString(getLocaleCode(), { weekday: 'short' }),
                    hours: dayHours,
                    isToday: dateStr === todayStr
                });
                tempDate.setDate(tempDate.getDate() + 1);
            }

            setStats({ monthHours: totalH, monthEarned: earned, todayHours: todayH, weeklyHistory: weekDays });
        }
    } catch (e) {
        console.error("Chyba pri načítaní dát:", e);
    } finally {
        setLoading(false);
    }
  }, [profile.id, profile.organization_id, profile.hourly_rate, lang]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
      if (showHistory && doneTasks.length === 0) {
          loadDoneTasks(0);
      }
  }, [showHistory]);

  useEffect(() => {
      if (activeTab === 'history') {
          setHistoryPage(0);
          loadHistoryLogs(0, true);
      }
  }, [activeTab, historySiteFilter, historyYearFilter, historyMonthFilter]);

  useEffect(() => {
    if (onTabChange) onTabChange(activeTab);
  }, [activeTab, onTabChange]);

  const loadDoneTasks = async (page = 0) => {
      if (!profile?.id) return;
      setLoadingMoreDone(true);
      const from = page * HISTORY_PAGE_SIZE;
      const to = from + HISTORY_PAGE_SIZE - 1;

      try {
          const { data, error } = await supabase
            .from('tasks')
            .select('*, sites(name)')
            .eq('assigned_to', profile.id)
            .eq('status', 'done')
            .order('start_date', { ascending: false })
            .range(from, to);

          if (error) throw error;
          if (data) {
              setDoneTasks(prev => page === 0 ? data : [...prev, ...data]);
              setHasMoreDone(data.length === HISTORY_PAGE_SIZE);
          }
      } catch (e) {
          console.error("Chyba pri načítaní histórie úloh:", e);
      } finally {
          setLoadingMoreDone(false);
      }
  };

  const loadHistoryLogs = async (page = 0, reset = false) => {
    if (!profile?.id) return;
    setLoadingHistory(true);
    const from = page * HISTORY_PAGE_SIZE;
    const to = from + HISTORY_PAGE_SIZE - 1;

    try {
        let query = supabase
            .from('attendance_logs')
            .select('*, sites(name)')
            .eq('user_id', profile.id)
            .order('date', { ascending: false })
            .range(from, to);
        
        if (historySiteFilter) {
            query = query.eq('site_id', historySiteFilter);
        }
        
        if (historyYearFilter) {
            if (historyMonthFilter) {
                // Filter by specific month
                query = query.gte('date', `${historyYearFilter}-${historyMonthFilter}-01`).lte('date', `${historyYearFilter}-${historyMonthFilter}-31`);
            } else {
                // Filter by whole year
                query = query.gte('date', `${historyYearFilter}-01-01`).lte('date', `${historyYearFilter}-12-31`);
            }
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
            setHistoryLogs(prev => reset ? data : [...prev, ...data]);
            setHasMoreHistory(data.length === HISTORY_PAGE_SIZE);
            
            if (reset && data.length > 0) {
                const firstMonth = new Date(data[0].date).toLocaleString(getLocaleCode(), { month: 'long', year: 'numeric' });
                setExpandedMonths({ [firstMonth]: true });
            }
        }

        if (reset) {
            const { data: siteIdsData } = await supabase
                .from('attendance_logs')
                .select('site_id, sites(name)')
                .eq('user_id', profile.id)
                .limit(500); 
            
            if (siteIdsData) {
                const uniqueSitesMap = new Map();
                siteIdsData.forEach((item: any) => {
                    if (item.site_id && !uniqueSitesMap.has(item.site_id)) {
                        uniqueSitesMap.set(item.site_id, item.sites?.name || 'Neznáma stavba');
                    }
                });
                const uniqueSites = Array.from(uniqueSitesMap.entries()).map(([id, name]) => ({ id, name }));
                setRelevantSites(uniqueSites);
            }
        }
    } catch (e) {
        console.error("Chyba pri načítaní histórie prác:", e);
    } finally {
        setLoadingHistory(false);
    }
  };

  const groupedHistory = useMemo(() => {
      const groups: Record<string, { logs: any[], totalHours: number, totalEarned: number }> = {};
      historyLogs.forEach(log => {
          const date = new Date(log.date);
          const monthKey = date.toLocaleString(getLocaleCode(), { month: 'long', year: 'numeric' });
          if (!groups[monthKey]) groups[monthKey] = { logs: [], totalHours: 0, totalEarned: 0 };
          
          groups[monthKey].logs.push(log);
          groups[monthKey].totalHours += Number(log.hours || 0);
          
          if (log.payment_type === 'fixed') {
              groups[monthKey].totalEarned += Number(log.fixed_amount || 0);
          } else {
              groups[monthKey].totalEarned += Number(log.hours || 0) * (log.hourly_rate_snapshot || profile.hourly_rate || 0);
          }
      });
      return Object.entries(groups);
  }, [historyLogs, profile.hourly_rate, lang]);

  const availableYears = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const startYear = profile?.created_at ? new Date(profile.created_at).getFullYear() : 2024;
      const years = [];
      for(let y = currentYear; y >= Math.min(startYear, 2024); y--) {
          years.push(y.toString());
      }
      return years;
  }, [profile?.created_at]);

  const availableMonths = useMemo(() => {
      const months = [
          { value: '01', label: 'Január' },
          { value: '02', label: 'Február' },
          { value: '03', label: 'Marec' },
          { value: '04', label: 'Apríl' },
          { value: '05', label: 'Máj' },
          { value: '06', label: 'Jún' },
          { value: '07', label: 'Júl' },
          { value: '08', label: 'August' },
          { value: '09', label: 'September' },
          { value: '10', label: 'Október' },
          { value: '11', label: 'November' },
          { value: '12', label: 'December' }
      ];
      
      if (!historyYearFilter) return months;
      
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      if (parseInt(historyYearFilter) === currentYear) {
          return months.filter(m => parseInt(m.value) <= currentMonth);
      }
      
      return months;
  }, [historyYearFilter]);

  const taskGroups = useMemo(() => {
      const today = getLocalDateISO(new Date());
      return {
          overdue: todoTasks.filter(t => t.start_date?.split('T')[0] < today),
          today: todoTasks.filter(t => t.start_date?.split('T')[0] === today),
          upcoming: todoTasks.filter(t => t.start_date?.split('T')[0] > today)
      };
  }, [todoTasks]);

  const readableDuration = useMemo(() => {
    if (logForm.start_time && logForm.end_time) {
        const [sH, sM] = logForm.start_time.split(':').map(Number);
        const [eH, eM] = logForm.end_time.split(':').map(Number);
        let totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
        if (totalMinutes < 0) totalMinutes += 24 * 60; 
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h}${t('hours_abbr')} ${m}m`;
    }
    return `0${t('hours_abbr')} 0m`;
  }, [logForm.start_time, logForm.end_time, lang]);

  const handleTaskDone = async (taskId: string) => {
      setActionLoading(true);
      await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId);
      setSelectedTask(null);
      await loadAllData();
      setActionLoading(false);
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading) return; 
    
    setActionLoading(true);
    
    const cleanFixedAmount = logForm.payment_type === 'fixed' 
        ? parseFloat(String(logForm.fixed_amount).replace(/[^0-9.]/g, '')) || 0
        : 0;

    const [sH, sM] = logForm.start_time.split(':').map(Number);
    const [eH, eM] = logForm.end_time.split(':').map(Number);
    let totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const calculatedHours = totalMinutes / 60;

    try {
        if(!logForm.site_id) throw new Error(t('site_select'));
        if(logForm.payment_type === 'fixed' && cleanFixedAmount <= 0) throw new Error(t('fixed_amount_label'));

        const { data: override } = await supabase
            .from('site_worker_rates')
            .select('hourly_rate, cost_rate')
            .eq('site_id', logForm.site_id)
            .eq('user_id', profile.id)
            .maybeSingle();

        const hRate = override?.hourly_rate || profile.hourly_rate || 0;
        const cRate = override?.cost_rate || profile.cost_rate || profile.hourly_rate || 0;

        const payload = {
            organization_id: profile.organization_id,
            user_id: profile.id, 
            site_id: logForm.site_id,
            date: logForm.date,
            start_time: logForm.start_time,
            end_time: logForm.end_time,
            hours: calculatedHours, 
            description: logForm.description,
            hourly_rate_snapshot: hRate,
            cost_rate_snapshot: cRate,
            payment_type: logForm.payment_type,
            fixed_amount: cleanFixedAmount
        };

        const { error } = await supabase.from('attendance_logs').insert([payload]);
        if(error) throw error;
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            setLogForm(prev => ({ ...prev, description: '', fixed_amount: '', payment_type: 'hourly', date: getLocalDateISO(new Date()) }));
            loadAllData();
            setActiveTab('dashboard');
        }, 1500);
    } catch (err: any) {
        setAlertState({ open: true, message: err.message, type: 'error' });
    } finally {
        setActionLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setActionLoading(true);
      try {
          const { error } = await supabase.from('profiles').update({
              full_name: profileForm.full_name,
              phone: profileForm.phone
          }).eq('id', profile.id);

          if (error) throw error;
          
          setProfile({ ...profile, full_name: profileForm.full_name, phone: profileForm.phone });
          setAlertState({ open: true, title: t('success_msg'), message: t('profile_updated'), type: 'success' });
      } catch (err: any) {
          setAlertState({ open: true, message: err.message, type: 'error' });
      } finally {
          setActionLoading(false);
      }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordForm.new !== passwordForm.confirm) {
          setAlertState({ open: true, message: t('password_mismatch'), type: 'error' });
          return;
      }
      setActionLoading(true);
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
      if (error) {
          setAlertState({ open: true, message: error.message, type: 'error' });
      } else {
          setAlertState({ open: true, title: t('success_msg'), message: t('password_changed'), type: 'success' });
          setPasswordForm({ new: '', confirm: '' });
      }
      setActionLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setUploadingAvatar(true);
          try {
              const blob = await compressAvatar(file);
              const fileName = `avatars/${profile.id}-${Date.now()}.jpg`;
              const filePath = `photos/${fileName}`;
              const { error: uploadError } = await supabase.storage.from('diary-photos').upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
              if (uploadError) throw uploadError;
              const { data: { publicUrl } } = supabase.storage.from('diary-photos').getPublicUrl(filePath);
              
              await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
              setProfile({ ...profile, avatar_url: publicUrl });
              setAlertState({ open: true, title: t('success_msg'), message: t('avatar_success'), type: 'success' });
          } catch (err: any) {
              setAlertState({ open: true, message: t('avatar_error') + ': ' + err.message, type: 'error' });
          } finally {
              setUploadingAvatar(false);
          }
      }
  };

  const toggleMonth = (monthKey: string) => {
      setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const loadSettlementHistory = async (advanceId: string) => {
      setLoadingHistorySettle(true);
      try {
          const { data, error } = await supabase
              .from('advance_settlements')
              .select('*')
              .eq('advance_id', advanceId)
              .order('date', { ascending: false });
          if (error) throw error;
          setSettlements(data || []);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingHistorySettle(false);
      }
  };

  const openAdvanceHistory = (adv: any) => {
      setSelectedForHistory(adv);
      setSettlements([]);
      setShowHistoryModal(true);
      loadSettlementHistory(adv.id);
  };

  const NavItem = ({ id, label, icon: Icon, count, colorClass }: any) => (
    <button
      onClick={() => { setActiveTab(id); setSuccess(false); setActivePrivilege(null); }}
      className={`group w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium relative
        ${activeTab === id
          ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }
        ${isSidebarCollapsed ? 'justify-center px-0' : ''}
      `}
    >
      <div className={`${activeTab === id ? 'scale-110 transition-transform' : ''}`}>
          <Icon size={24} className={activeTab === id ? colorClass : `text-slate-400 group-hover:${colorClass}`} />
      </div>
      {!isSidebarCollapsed && <span className="text-sm font-bold">{label}</span>}
      {count !== undefined && count > 0 && (
          <span className={`absolute ${isSidebarCollapsed ? 'top-1 right-1' : 'right-4'} bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white`}>
              {count}
          </span>
      )}
    </button>
  );

  const TaskItem = ({ task }: any) => {
      const todayStr = getLocalDateISO(new Date());
      const taskDateStr = task.start_date?.split('T')[0];
      const isToday = taskDateStr === todayStr;
      const isPast = taskDateStr < todayStr && task.status !== 'done';
      
      return (
          <div 
            onClick={() => setSelectedTask(task)} 
            className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-pointer hover:border-orange-300 transition-all active:scale-[0.98] ${isPast ? 'border-l-4 border-l-red-500' : isToday ? 'border-l-4 border-l-orange-500' : ''}`}
          >
              <div className="flex gap-3 items-center min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{task.title}</h4>
                        {task.description?.includes(PRIORITY_FLAG) && <AlertCircle size={12} className="text-red-500 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase truncate flex items-center gap-1.5 flex-wrap">
                          <span className="flex items-center gap-1 max-w-[120px] truncate"><Building2 size={10}/> {task.sites?.name}</span>
                          <span className="text-slate-200">|</span>
                          <span className="flex items-center gap-1"><Calendar size={10}/> {formatDate(task.start_date)}</span>
                      </div>
                  </div>
              </div>
              <div className="flex center gap-2 shrink-0 ml-2">
                  {task.status === 'done' ? (
                      <CheckCircle2 size={18} className="text-green-50" />
                  ) : (
                      <ChevronRight className="text-slate-300 group-hover:text-orange-500" size={16}/>
                  )}
              </div>
          </div>
      );
  };

  const showWage = profile.show_wage_in_profile ?? true;
  const unfinishedPastCount = taskGroups.overdue.length;
  const pendingAdvancesTotal = myAdvances.filter(a => a.status === 'pending').reduce((sum, a) => sum + (Number(a.amount) - Number(a.settled_amount || 0)), 0);

  const isRetroactiveEntry = logForm.date !== getLocalDateISO(new Date());

  const handlePrivilegeAction = (siteId: string, module: 'diary' | 'finance') => {
    setActivePrivilege({ siteId, module });
  };

  // Funkcia pre kontrolu aktualizácií
  const checkForUpdates = async () => {
    setUpdateStatus('checking');
    setUpdateError('');

    try {
      const GITHUB_REPO_URL = "https://api.github.com/repos/javorcikivan1-ux/vercel_mojastavba/releases/latest";
      const response = await fetch(`${GITHUB_REPO_URL}?t=${Date.now()}`);
      const data = await response.json();
      
      if (data && data.tag_name) {
        const latestVersion = data.tag_name.replace(/[vV]/g, '').trim();
        const currentVer = currentVersion.replace(/[vV]/g, '').trim();

        if (latestVersion !== currentVer && latestVersion !== "" && currentVer !== "") {
          setNewVersion(latestVersion);
          setUpdateStatus('available');
        } else {
          setUpdateStatus('no-update');
          setTimeout(() => setUpdateStatus('idle'), 3000);
        }
      } else {
        throw new Error("Nepodarilo sa získať dáta z GitHubu.");
      }
    } catch (err: any) {
      setUpdateStatus('error');
      setUpdateError("Nepodarilo sa skontrolovať server. Skontrolujte pripojenie.");
    }
  };

 const renderDashboardContent = () => {
  if (activePrivilege) {
    const activeSite = sitePermissions.find(
      p => p.site_id === activePrivilege.siteId
    )?.sites;

    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">

        {/* ================= MOBILE – SAMOSTATNÝ BAR SPÄŤ ================= */}
        <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
          <button
            onClick={() => setActivePrivilege(null)}
            className="flex items-center gap-2 text-slate-600 font-black text-xs uppercase tracking-widest"
          >
            <ChevronLeft size={18} /> {t('back_to_overview')}
          </button>
        </div>

        {/* ================= DESKTOP – HLAVIČKA STAVBY + SPÄŤ ================= */}
        <div className="hidden md:flex bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-20 items-center justify-between">
          
          {/* SPÄŤ – DESKTOP */}
          <button
            onClick={() => setActivePrivilege(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-orange-600 font-black text-xs uppercase tracking-widest transition"
          >
            <ChevronLeft size={18} /> {t('back_to_overview')}
          </button>

          {/* NÁZOV STAVBY */}
          <div className="text-right">
            <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
              {t('site_management')}
            </div>
            <div className="font-bold text-slate-800 text-sm">
              {activeSite?.name || t('site_label')}
            </div>
          </div>
        </div>

        {/* ================= OBSAH ================= */}
        {activePrivilege.module === 'diary' ? (
          <DiaryScreen
            profile={profile}
            organization={organization}
            fixedSiteId={activePrivilege.siteId}
          />
        ) : (
          <ProjectFinanceWorker
            siteId={activePrivilege.siteId}
            profile={profile}
            organization={organization}
          />
        )}
      </div>
    );
  }


    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('greeting')}, {profile?.full_name?.split(' ')[0]}</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {new Date().toLocaleDateString(getLocaleCode(), { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                    <Card padding="p-3" className="flex-1 md:w-32 bg-white border-slate-200 shadow-sm">
                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">{t('this_month')}</div>
                        <div className="text-lg font-black text-slate-900">{formatDuration(stats.monthHours)}</div>
                    </Card>
                    {showWage && (
                      <Card padding="p-3" className="flex-1 md:w-32 bg-white border-slate-200 shadow-sm animate-in zoom-in">
                          <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">{t('earnings')}</div>
                          <div className="text-lg font-black text-green-600">{formatMoney(stats.monthEarned)}</div>
                      </Card>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    
                    {unfinishedPastCount > 0 && (
                        <div 
                          onClick={() => setActiveTab('tasks')}
                          className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between cursor-pointer group hover:bg-red-100 transition animate-in slide-in-from-top-2"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-red-500 text-white p-2 rounded-lg shadow-sm group-hover:scale-110 transition"><AlertCircle size={18}/></div>
                                <div>
                                    <p className="text-xs font-black text-red-700 uppercase tracking-tight">{t('overdue_tasks')}</p>
                                    <p className="text-sm font-bold text-red-900">{t('nav_tasks')}: {unfinishedPastCount}</p>
                                </div>
                            </div>
                            <ArrowRight size={18} className="text-red-400 group-hover:translate-x-1 transition-transform"/>
                        </div>
                    )}

                    {pendingAdvancesTotal > 0 && (
                        <div 
                          onClick={() => setActiveTab('advances')}
                          className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between cursor-pointer group hover:bg-orange-100 transition animate-in zoom-in"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-500 text-white p-2 rounded-lg shadow-sm"><Banknote size={18}/></div>
                                <div>
                                    <p className="text-xs font-black text-orange-700 uppercase tracking-tight">{t('pending_advances')}</p>
                                    <p className="text-sm font-bold text-orange-900">{t('total_to_return')} <span className="font-black text-orange-600">{formatMoney(pendingAdvancesTotal)}</span>.</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-orange-400"/>
                        </div>
                    )}

                    {/* POVERENÉ STAVBY */}
                    {sitePermissions.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                <ShieldCheck size={16} className="text-indigo-500"/> {t('privileged_sites')}
                            </h3>
                            <PrivilegedSites 
                                permissions={sitePermissions} 
                                onAction={handlePrivilegeAction} 
                                t={t}
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                            <ListTodo size={16} className="text-orange-600"/> {t('today_agenda')}
                        </h3>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">{taskGroups.today.length}</span>
                    </div>
                    
                    <div className="space-y-2">
                        {taskGroups.today.length === 0 ? (
                            <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                                <CheckCircle2 size={32} className="mx-auto text-green-300 mb-2"/>
                                <p className="text-slate-400 text-[10px] font-bold uppercase">{t('no_tasks')}</p>
                            </div>
                        ) : (
                            taskGroups.today.map(task => (
                                <TaskItem key={task.id} task={task} />
                            ))
                        )}
                    </div>

                    <Card className="p-5 border-slate-200 mt-6 shadow-sm overflow-hidden">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-2">
                            <Activity size={14} className="text-orange-500"/> {t('weekly_activity')}
                        </h3>
                        <div className="flex items-end justify-between h-32 gap-2 md:gap-4 px-1">
                            {stats.weeklyHistory.map((h) => {
                                const maxH = Math.max(...stats.weeklyHistory.map(x => x.hours), 8);
                                const height = (h.hours / maxH) * 100;
                                return (
                                    <div key={h.date} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div className="relative w-full flex flex-col justify-end items-center h-full">
                                            <div className={`absolute bottom-[calc(100%+4px)] text-[9px] md:text-[10px] font-black transition-all ${h.hours > 0 ? 'opacity-100 scale-100 text-slate-800' : 'opacity-40 scale-90 text-slate-300'}`}>
                                                {h.hours > 0 ? `${h.hours.toFixed(1)}${t('hours_abbr')}` : `0${t('hours_abbr')}`}
                                            </div>
                                            <div 
                                                className={`w-full max-w-[32px] rounded-t-xl transition-all duration-1000 min-h-[4px] relative ${
                                                    h.isToday 
                                                    ? 'bg-gradient-to-t from-orange-600 to-orange-400 shadow-lg shadow-orange-200' 
                                                    : h.hours > 0 ? 'bg-slate-200 group-hover:bg-orange-200' : 'bg-slate-50'
                                                }`} 
                                                style={{ height: `${Math.max(4, height)}%` }}
                                            >
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className={`text-[10px] font-black uppercase tracking-tighter ${h.isToday ? 'text-orange-600' : 'text-slate-400'}`}>
                                                {h.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                <div className="space-y-4">
                     <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-2">
                        <Clock size={16} className="text-blue-500"/> {t('last_logs')}
                     </h3>
                     <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar px-1">
                         {lastLogs.map(log => (
                             <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-sm mb-2 last:mb-0">
                                 <div className="font-bold text-slate-800 truncate">{log.sites?.name}</div>
                                 <div className="flex justify-between items-center mt-1">
                                     <span className="text-slate-400 font-bold uppercase text-[9px]">{formatDate(log.date)}</span>
                                     <span className="font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        {log.payment_type === 'fixed' ? (showWage ? formatMoney(log.fixed_amount) : t('fixed')) : formatDuration(Number(log.hours))}
                                     </span>
                                 </div>
                             </div>
                         ))}
                         {lastLogs.length === 0 && (
                             <div className="text-center py-8 text-slate-300 text-[10px] font-bold uppercase border-2 border-dashed border-slate-100 rounded-xl">{t('no_logs')}</div>
                         )}
                     </div>
                     <button 
                        onClick={() => setActiveTab('log')}
                        className="w-full flex items-center justify-center gap-2 h-10 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition"
                     >
                         <Zap size={14} className="text-orange-500" /> {t('write_log')}
                     </button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden pt-safe-top">
      
      <aside className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
          <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-2.5`}>
              <img 
                src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" 
                alt="Logo" 
                className="w-11 h-11 object-contain shrink-0" 
              />
              {!isSidebarCollapsed && (
                  <div className="min-w-0">
                    <div className="font-extrabold text-xl tracking-tight text-slate-800">
                        Moja<span className="text-orange-600">Stavba</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none truncate pr-2">{profile.full_name}</div>
                  </div>
              )}
          </div>

          <nav className="flex-1 px-3 space-y-1 mt-4">
              <NavItem id="dashboard" label={t('nav_home')} icon={LayoutGrid} colorClass="text-orange-600" />
              <NavItem id="tasks" label={t('nav_tasks')} icon={ListTodo} count={todoTasks.length} colorClass="text-blue-500" />
              <NavItem id="log" label={t('nav_log')} icon={Zap} colorClass="text-emerald-500" />
              <NavItem id="advances" label={t('nav_advances')} icon={Banknote} colorClass="text-orange-500" />
              <NavItem id="history" label={t('nav_history')} icon={History} colorClass="text-blue-600" />
              {isApp && <NavItem id="updates" label={t('nav_updates')} icon={RefreshCw} colorClass="text-purple-500" />}
              <NavItem id="profile" label={t('nav_profile')} icon={User} colorClass="text-purple-500" />
          </nav>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <div className={`flex items-center gap-3 mb-3 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-2 pt-2'}`}>
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700 overflow-hidden shadow-sm shrink-0">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover"/>
                        ) : (
                            profile.full_name?.charAt(0) || 'U'
                        )}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="truncate flex-1">
                          <p className="text-sm font-bold text-slate-800 truncate">{profile.full_name}</p>
                          <p className="text-[10px] text-slate-500 truncate font-medium">{profile.email}</p>
                        </div>
                    )}
                </div>

              {!isSidebarCollapsed && (
                <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50">
                    <LogOut size={16}/> {t('logout')}
                </button>
              )}
          </div>

          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-3 text-slate-300 hover:text-slate-500 border-t border-slate-100 flex justify-center hover:bg-slate-50 transition">
              {isSidebarCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
          </button>
      </aside>

      <main ref={mainScrollRef} className="flex-1 overflow-y-auto relative flex flex-col w-full pb-24 md:pb-0 scroll-container">
          
          <div className="md:hidden bg-white border-b border-slate-200 p-4 px-6 flex justify-between items-center sticky top-0 z-30 shadow-sm">
               <div className="flex items-center gap-2">
                  <img src="https://lordsbenison.sk/wp-content/uploads/2025/12/image-1.png" alt="Logo" className="w-8 h-8" />
                  <span className="font-extrabold text-lg tracking-tight">Moja<span className="text-orange-600">Stavba</span></span>
               </div>
               <button onClick={() => setShowLogoutConfirm(true)} className="text-slate-400 p-1"><LogOut size={20}/></button>
          </div>

          <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
              
              {activeTab === 'dashboard' && renderDashboardContent()}

              {activeTab === 'advances' && (
                  <div className="animate-in slide-in-from-right-2 space-y-6">
                      <div className="text-center py-4">
                         <h2 className="text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
                            <Banknote className="text-orange-600" size={28} /> {t('nav_advances')}
                         </h2>
                         <p className="text-xs text-slate-400 font-bold uppercase mt-1">{t('current_debt')}</p>
                      </div>

                      <Card className="bg-white border-orange-100 shadow-sm p-6 text-center relative overflow-hidden">
                          <div className="relative z-10">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('total_to_return')}</p>
                              <p className="text-4xl font-black text-orange-600 tracking-tight">{formatMoney(pendingAdvancesTotal)}</p>
                          </div>
                          <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                              <Banknote size={100} />
                          </div>
                      </Card>

                      <div className="space-y-4">
                          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                              <History size={14} className="text-blue-500"/> {t('nav_history')}
                          </h3>
                          
                          <div className="grid grid-cols-1 gap-3">
                              {myAdvances.length === 0 ? (
                                  <div className="py-20 text-center text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl font-bold uppercase text-[10px]">
                                      {t('no_advances')}
                                  </div>
                              ) : (
                                  myAdvances.map(adv => {
                                      const settled = Number(adv.settled_amount || 0);
                                      const total = Number(adv.amount);
                                      const remaining = total - settled;
                                      const percent = (settled / total) * 100;
                                      
                                      return (
                                          <div key={adv.id} onClick={() => openAdvanceHistory(adv)} className={`bg-white p-5 rounded-2xl border shadow-sm transition-all cursor-pointer hover:border-orange-300 ${adv.status === 'settled' ? 'opacity-60 border-slate-200' : 'border-orange-200'}`}>
                                              <div className="flex justify-between items-start mb-4">
                                                  <div>
                                                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                                                          <Calendar size={10}/> {formatDate(adv.date)}
                                                      </div>
                                                      <div className="font-black text-slate-900 text-lg">
                                                          {formatMoney(total)}
                                                      </div>
                                                  </div>
                                                  <div className="text-right">
                                                      {adv.status === 'settled' ? (
                                                          <span className="text-[9px] bg-green-100 text-green-700 px-2 py-1 rounded-lg font-black uppercase flex items-center gap-1"><Check size={10}/> {t('splatene')}</span>
                                                      ) : settled > 0 ? (
                                                          <div className="flex flex-col items-end">
                                                              <span className="text-[9px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg font-black uppercase mb-1">{t('in_repayment')}</span>
                                                              <span className="text-[10px] font-black text-orange-600">{t('current_debt')}: {formatMoney(remaining)}</span>
                                                          </div>
                                                      ) : null}
                                                  </div>
                                              </div>

                                              {adv.status === 'pending' && (
                                                  <div className="space-y-2">
                                                      <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                                                          <span>{t('nav_advances')} {formatMoney(settled)}</span>
                                                          <span>{Math.round(percent)}%</span>
                                                      </div>
                                                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                                          <div 
                                                              className="h-full bg-orange-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                                                              style={{ width: `${percent}%` }}
                                                          ></div>
                                                      </div>
                                                  </div>
                                              )}

                                              {adv.description && (
                                                  <p className="text-[11px] text-slate-500 italic mt-3 bg-slate-50 p-2 rounded-xl border border-slate-100">"{adv.description}"</p>
                                              )}
                                          </div>
                                      );
                                  })
                              )}
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'tasks' && (
                  <div className="animate-in slide-in-from-right-2 space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <ListTodo className="text-orange-600" size={24}/> {t('nav_tasks')}
                            </h2>
                        </div>
                        <button 
                            onClick={() => setShowHistory(!showHistory)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition shadow-sm border ${showHistory ? 'bg-slate-800 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                            <History size={14}/> {showHistory ? t('close') : t('nav_history')}
                        </button>
                      </div>
                      
                      <div className="space-y-8">
                          {!showHistory && (
                            <div className="space-y-3">
                                <h3 className="text-[11px] font-black text-orange-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Clock size={14}/> {t('today_agenda')} ({taskGroups.today.length})
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {taskGroups.today.length === 0 ? (
                                        <div className="p-8 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100 italic text-slate-300 text-xs font-bold uppercase">
                                            {t('no_tasks')}
                                        </div>
                                    ) : taskGroups.today.map(t => <TaskItem key={t.id} task={t} />)}
                                </div>
                            </div>
                          )}

                          {showHistory && (
                              <div className="space-y-3 animate-in slide-in-from-bottom-4">
                                  <h3 className="text-[11px] font-black text-green-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                      <History size={14}/> {t('nav_history')}
                                  </h3>
                                  <div className="flex flex-col gap-2">
                                      {doneTasks.map(t => <TaskItem key={t.id} task={t} />)}
                                      
                                      {doneTasks.length === 0 && !loadingMoreDone && (
                                          <div className="p-8 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100 italic text-slate-300 text-xs font-bold uppercase">
                                              {t('no_logs')}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'history' && (
                  <div className="animate-in slide-in-from-bottom-2 space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <History className="text-blue-600" size={24}/> {t('nav_history')}
                            </h2>
                          </div>
                      </div>

                      {/* Filters Section */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                      <Building2 size={12}/> {t('site_label')}
                                  </label>
                                  <select 
                                      value={historySiteFilter} 
                                      onChange={e => setHistorySiteFilter(e.target.value)} 
                                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 appearance-none outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition shadow-inner"
                                  >
                                      <option value="">{t('all_sites')}</option>
                                      {relevantSites.map(site => (
                                          <option key={site.id} value={site.id}>{site.name}</option>
                                      ))}
                                  </select>
                              </div>
                              
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                      <Calendar size={12}/> Rok
                                  </label>
                                  <select 
                                      value={historyYearFilter} 
                                      onChange={e => {
                                          setHistoryYearFilter(e.target.value);
                                          setHistoryMonthFilter(''); // Reset month when year changes
                                      }} 
                                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 appearance-none outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition shadow-inner"
                                  >
                                      {availableYears.map(year => (
                                          <option key={year} value={year}>{year}</option>
                                      ))}
                                  </select>
                              </div>
                              
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                      <Calendar size={12}/> Mesiac
                                  </label>
                                  <select 
                                      value={historyMonthFilter} 
                                      onChange={e => setHistoryMonthFilter(e.target.value)} 
                                      disabled={!historyYearFilter}
                                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 appearance-none outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition shadow-inner disabled:opacity-50 disabled:bg-slate-100"
                                  >
                                      <option value="">Všetky mesiace</option>
                                      {availableMonths.map(month => (
                                          <option key={month.value} value={month.value}>{month.label}</option>
                                      ))}
                                  </select>
                              </div>
                              
                              <div className="flex items-end">
                                  <button 
                                      onClick={() => {
                                          setHistorySiteFilter('');
                                          setHistoryYearFilter(new Date().getFullYear().toString());
                                          setHistoryMonthFilter('');
                                      }}
                                      className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 border border-slate-300"
                                  >
                                      <Filter size={14}/> {t('reset_filter')}
                                  </button>
                              </div>
                          </div>
                          
                          {(historySiteFilter || historyYearFilter !== new Date().getFullYear().toString() || historyMonthFilter) && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                  {historySiteFilter && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                                          <Building2 size={10}/> {relevantSites.find(s => s.id === historySiteFilter)?.name || 'Stavba'}
                                      </span>
                                  )}
                                  {historyYearFilter !== new Date().getFullYear().toString() && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                                          <Calendar size={10}/> {historyYearFilter}
                                      </span>
                                  )}
                                  {historyMonthFilter && (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">
                                          <Calendar size={10}/> {availableMonths.find(m => m.value === historyMonthFilter)?.label || historyMonthFilter}
                                      </span>
                                  )}
                              </div>
                          )}
                      </div>

                      <div className="space-y-4 pb-12">
                          {groupedHistory.map(([month, data]) => {
                              const isExpanded = expandedMonths[month];
                              return (
                                  <div key={month} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                                      <button 
                                          onClick={() => toggleMonth(month)}
                                          className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isExpanded ? 'bg-slate-50 border-b border-slate-200' : 'hover:bg-slate-50'}`}
                                      >
                                          <div className="flex items-center gap-3">
                                              <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                  <Calendar size={18} />
                                              </div>
                                              <div>
                                                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{month}</h3>
                                                  <div className="flex items-center gap-3 mt-0.5">
                                                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                                          <Clock size={10}/> {formatDuration(data.totalHours)}
                                                      </span>
                                                      {showWage && (
                                                          <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                                                              <Wallet size={10}/> {formatMoney(data.totalEarned)}
                                                          </span>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                          {isExpanded ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                                      </button>
                                      
                                      {isExpanded && (
                                          <div className="divide-y divide-slate-100 animate-in slide-in-from-top-1">
                                              {data.logs.map(log => (
                                                  <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors group">
                                                      <div className="flex justify-between items-start gap-4">
                                                          <div className="min-w-0 flex-1">
                                                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                  <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                                                                      {new Date(log.date).getDate()}. {new Date(log.date).toLocaleString(getLocaleCode(), { month: 'short' })}
                                                                  </span>
                                                                  <div className="font-bold text-slate-800 truncate text-xs">{log.sites?.name}</div>
                                                                  {log.payment_type === 'fixed' && (
                                                                      <span className="text-[8px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">{t('fixed')}</span>
                                                                  )}
                                                              </div>
                                                              <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-2">
                                                                  <Clock size={9}/> {log.start_time} - {log.end_time}
                                                              </div>
                                                              {log.description && (
                                                                  <p className="text-[11px] text-slate-500 mt-2 italic leading-tight line-clamp-2">
                                                                      {log.description}
                                                                  </p>
                                                              )}
                                                          </div>
                                                          <div className="text-right shrink-0">
                                                              <div className="text-sm font-black text-slate-900">{formatDuration(Number(log.hours))}</div>
                                                              {showWage && (
                                                                  <div className={`text-[10px] font-black ${log.payment_type === 'fixed' ? 'text-orange-600' : 'text-green-600'}`}>
                                                                      {log.payment_type === 'fixed' ? formatMoney(log.fixed_amount) : `+${formatMoney(Number(log.hours) * (log.hourly_rate_snapshot || profile.hourly_rate || 0))}`}
                                                                  </div>
                                                              )}
                                                          </div>
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              );
                          })}

                          {historyLogs.length === 0 && !loadingHistory && (
                              <div className="py-20 text-center">
                                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">{t('no_logs')}</p>
                              </div>
                          )}

                          {hasMoreHistory && historyLogs.length > 0 && (
                              <div className="text-center py-6">
                                  <button 
                                      onClick={() => loadHistoryLogs(historyPage + 1, false)}
                                      disabled={loadingHistory}
                                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 mx-auto shadow-lg shadow-blue-100"
                                  >
                                      {loadingHistory ? (
                                          <>
                                              <Loader2 size={16} className="animate-spin"/>
                                              {t('loading')}
                                          </>
                                      ) : (
                                          <>
                                              <ArrowRight size={16}/>
                                              Načítať viac záznamov
                                          </>
                                      )}
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'log' && (
                  <div className="animate-in zoom-in-95 max-w-xl mx-auto space-y-6">
                      <div className="text-center">
                        <h2 className="text-xl font-black text-slate-900 flex items-center justify-center gap-2">
                           <Zap className="text-orange-600" size={24} fill="currentColor"/> {t('nav_log')}
                        </h2>
                      </div>
                      
                      {success ? (
                          <div className="py-16 text-center animate-in zoom-in">
                              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-md">
                                  <CheckCircle2 size={32}/>
                              </div>
                              <h3 className="text-xl font-bold text-slate-800">{t('success_msg')}</h3>
                              <p className="text-xs text-slate-400 mt-1">{t('success_desc')}</p>
                          </div>
                      ) : (
                          <form onSubmit={handleLogSubmit} className="space-y-4">
                              <Card className="shadow-sm border-slate-200">
                                  <Input 
                                      label={t('date_label')} 
                                      type="date" 
                                      value={logForm.date} 
                                      onChange={(e: any) => setLogForm({...logForm, date: e.target.value})} 
                                      required 
                                  />
                                  {isRetroactiveEntry && (
                                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-[10px] text-orange-800 font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                                          <AlertCircle size={14} className="text-orange-600 shrink-0"/>
                                          {t('retro_warning')}
                                      </div>
                                  )}
                              </Card>

                              <Card className="shadow-sm border-slate-200">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('site_select')}</label>
                                  <div className="relative">
                                      <select 
                                          value={logForm.site_id} 
                                          onChange={e => setLogForm({...logForm, site_id: e.target.value})} 
                                          required 
                                          className="w-full p-4 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 appearance-none outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition shadow-inner"
                                      >
                                          <option value="">-- {t('site_select')} --</option>
                                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                      </select>
                                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                          <MapPin size={18}/>
                                      </div>
                                  </div>
                              </Card>

                              <Card className="shadow-sm border-slate-200">
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                      <Input label={t('arrival')} type="time" value={logForm.start_time} onChange={(e:any) => setLogForm({...logForm, start_time: e.target.value})} required className="text-center font-bold" />
                                      <Input label={t('departure')} type="time" value={logForm.end_time} onChange={(e:any) => setLogForm({...logForm, end_time: e.target.value})} required className="text-center font-bold" />
                                  </div>
                                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{t('duration_on_site')}</span><span className="text-lg font-black text-slate-700">{readableDuration}</span></div>
                              </Card>

                              <Card className="shadow-sm border-slate-200">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('payment_type')}</label>
                                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                                      <button 
                                          type="button" 
                                          onClick={() => setLogForm({...logForm, payment_type: 'hourly'})} 
                                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${logForm.payment_type === 'hourly' ? 'bg-white shadow-sm text-orange-600 border border-orange-100' : 'text-slate-500 border border-transparent'}`}
                                      >
                                          <Clock size={14}/> {t('hourly')}
                                      </button>
                                      <button 
                                          type="button" 
                                          onClick={() => setLogForm({...logForm, payment_type: 'fixed'})} 
                                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${logForm.payment_type === 'fixed' ? 'bg-white shadow-sm text-orange-600 border border-orange-100' : 'text-slate-500 border border-transparent'}`}
                                      >
                                          <Briefcase size={14}/> {t('fixed')}
                                      </button>
                                  </div>
                                  
                                  {logForm.payment_type === 'fixed' && (
                                      <div className="animate-in fade-in slide-in-from-top-2">
                                          <Input 
                                              label={t('fixed_amount_label')} 
                                              type="text" 
                                              value={logForm.fixed_amount} 
                                              onChange={(e:any) => setLogForm({...logForm, fixed_amount: e.target.value})} 
                                              required 
                                              placeholder="0.00" 
                                          />
                                      </div>
                                  )}
                              </Card>

                              <Card className="shadow-sm border-slate-200">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('work_desc_label')}</label>
                                  <textarea 
                                    value={logForm.description} 
                                    onChange={e => setLogForm({...logForm, description: e.target.value})} 
                                    className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition h-28 shadow-inner" 
                                    required
                                  ></textarea>
                              </Card>

                              <Button type="submit" fullWidth size="lg" loading={actionLoading} className="h-14 font-bold shadow-lg shadow-orange-100">
                                  <Send size={18} className="mr-2"/> {t('send_log')}
                              </Button>
                          </form>
                      )}
                  </div>
              )}

              {activeTab === 'profile' && (
                  <div className="animate-in slide-in-from-right-2 max-w-xl mx-auto space-y-6">
                      <div className="text-center py-6">
                          <div className="relative inline-block group">
                            <div 
                                onClick={() => avatarInputRef.current?.click()}
                                className="w-24 h-24 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 font-bold text-3xl border-4 border-white shadow-lg overflow-hidden cursor-pointer group-hover:scale-105 transition-transform"
                            >
                                {uploadingAvatar ? <Loader2 className="animate-spin text-orange-600" size={32}/> : profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : profile?.full_name?.charAt(0)}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={24}/></div>
                            </div>
                            <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            <div className="absolute bottom-2 right-0 bg-orange-600 text-white p-1.5 rounded-full border-2 border-white shadow-md">
                                <Pencil size={12}/>
                            </div>
                          </div>
                          <h2 className="text-xl font-black text-slate-900">{profile?.full_name}</h2>
                      </div>

                      <Card className="border-slate-200 shadow-sm">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Globe size={14} className="text-blue-500"/> {t('language')}</h3>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                              {[
                                  { code: 'sk', label: 'SK' },
                                  { code: 'en', label: 'EN' },
                                  { code: 'de', label: 'DE' },
                                  { code: 'hu', label: 'HU' },
                                  { code: 'pl', label: 'PL' },
                                  { code: 'ua', label: 'UA' }
                              ].map(l => (
                                  <button 
                                      key={l.code}
                                      type="button"
                                      onClick={() => changeLanguage(l.code)}
                                      className={`py-2 rounded-xl text-xs font-black transition ${lang === l.code ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                  >
                                      {l.label}
                                  </button>
                              ))}
                          </div>
                      </Card>

                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                          <Card className="border-slate-200 shadow-sm">
                              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><User size={14} className="text-purple-500"/> {t('personal_info')}</h3>
                              <div className="space-y-2">
                                  <Input label={t('personal_info_name')} value={profileForm.full_name} onChange={(e:any) => setProfileForm({...profileForm, full_name: e.target.value})} required />
                                  <Input label={t('personal_info_phone')} value={profileForm.phone} onChange={(e:any) => setProfileForm({...profileForm, phone: e.target.value})} placeholder="+421..." />
                                  <div className="pt-2">
                                    <Button type="submit" fullWidth loading={actionLoading} variant="secondary" size="sm">
                                        <Save size={16}/> {t('save_changes')}
                                    </Button>
                                  </div>
                              </div>
                          </Card>
                      </form>

                      <form onSubmit={handlePasswordChange} className="space-y-4">
                          <Card className="border-slate-200 shadow-sm">
                              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Shield size={14} className="text-blue-500"/> {t('security')}</h3>
                              <div className="space-y-3">
                                  <Input label={t('new_password')} type="password" value={passwordForm.new} onChange={(e:any) => setPasswordForm({...passwordForm, new: e.target.value})} placeholder="••••••••" required />
                                  <Input label={t('confirm_password')} type="password" value={passwordForm.confirm} onChange={(e:any) => setPasswordForm({...passwordForm, confirm: e.target.value})} placeholder="••••••••" required />
                                  <div className="pt-1">
                                    <Button type="submit" fullWidth loading={actionLoading} variant="outline" size="sm">
                                        <KeyRound size={16}/> {t('change_password')}
                                    </Button>
                                  </div>
                              </div>
                          </Card>
                      </form>

                      {showWage && (
                        <Card className="bg-white border-slate-200 shadow-sm animate-in fade-in">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Coins size={14} className="text-orange-500"/> {t('wage_info')}</h3>
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{t('hourly')}</span>
                                  <span className="font-black text-slate-800 text-xl">{formatMoney(profile?.hourly_rate || 0)} / h</span>
                                </div>
                                <Wallet size={24} className="text-orange-500 opacity-20"/>
                            </div>
                        </Card>
                      )}

                      <div className="pt-4 space-y-2 pb-12">
                          <Button variant="danger" fullWidth onClick={() => setShowLogoutConfirm(true)} className="h-11 rounded-xl font-bold text-xs uppercase tracking-widest">
                              <LogOut size={16} className="mr-2"/> {t('logout')}
                          </Button>
                      </div>
                  </div>
              )}

              {activeTab === 'updates' && isApp && (
                  <div className="animate-in slide-in-from-right-2 max-w-2xl mx-auto space-y-6">
                      <div className="text-center py-8">
                         <h2 className="text-3xl font-extrabold flex items-center justify-center gap-2">
                            <RefreshCw className="text-orange-600" size={32} /> {t('nav_updates')}
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
                            v{currentVersion}
                          </div>
                        </div>

                        <div className="max-w-sm mx-auto space-y-4">
                          {(updateStatus === 'idle' || updateStatus === 'no-update') && (
                            <>
                              {updateStatus === 'no-update' && (
                                <div className="bg-green-50 text-green-700 p-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border border-green-100 animate-in zoom-in">
                                  <CheckCircle2 size={20} /> Máte najnovšiu verziu
                                </div>
                              )}
                              <Button onClick={checkForUpdates} fullWidth size="lg" className="h-14 uppercase tracking-widest font-black text-xs shadow-orange-100">
                                Skontrolovať aktualizácie
                              </Button>
                            </>
                          )}

                          {updateStatus === 'checking' && (
                            <div className="flex flex-col items-center py-4 space-y-4">
                              <Loader2 className="animate-spin text-orange-500" size={32} />
                              <div className="text-slate-500 font-black text-xs uppercase tracking-widest animate-pulse">
                                Vyhľadávam novú verziu na serveri...
                              </div>
                            </div>
                          )}

                          {updateStatus === 'available' && (
                            <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl animate-in fade-in slide-in-from-top-4">
                              <ArrowUpCircle className="mx-auto text-blue-600 mb-3" size={40} />
                              <div className="font-black text-blue-900 text-lg">Dostupná verzia v{newVersion}</div>
                              <p className="text-xs text-blue-600 font-bold mb-6 mt-1 uppercase tracking-tight">Bola vydaná nová aktualizácia systému.</p>
                              
                              <div className="text-xs text-blue-800 bg-white/50 p-4 rounded-xl border border-blue-100 mb-6 font-medium leading-relaxed">
                                Pre stiahnutie tejto aktualizácie stačí reštartovať aplikáciu. Systém si nový balík stiahne automaticky pri štarte.
                              </div>

                              <Button onClick={() => window.location.reload()} fullWidth className="bg-blue-600 hover:bg-blue-700 shadow-blue-100 border-none">
                                <RefreshCw size={18}/> Reštartovať a aktualizovať
                              </Button>
                            </div>
                          )}

                          {updateStatus === 'error' && (
                            <div className="bg-red-50 border border-red-100 p-6 rounded-3xl">
                              <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
                              <div className="text-red-700 font-black text-xs uppercase tracking-widest mb-3">Chyba pri aktualizácii</div>
                              <p className="text-[10px] text-red-600 font-medium mb-6 leading-relaxed bg-white/50 p-3 rounded-xl border border-red-100">{updateError}</p>
                              <Button onClick={checkForUpdates} size="sm" variant="secondary" fullWidth className="text-[10px] uppercase font-black tracking-widest h-10">
                                Skúsiť znova
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                  </div>
              )}
          </div>
      </main>

      {showScrollTop && (
          <button 
            onClick={scrollToTop}
            className="fixed bottom-24 md:bottom-8 right-4 md:right-8 bg-slate-800 text-white p-3 rounded-full shadow-2xl z-[60] animate-in zoom-in slide-in-from-bottom-4 transition-all hover:bg-orange-600 active:scale-90"
          >
              <ArrowUp size={24} />
          </button>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] pb-safe-bottom">
          <div className="flex w-full justify-around h-16 items-center">
              {(() => {
                const mobileTabs = [
                  { id: 'dashboard', icon: LayoutGrid, colorClass: 'text-orange-600' },
                  { id: 'tasks', icon: ListTodo, count: todoTasks.length, colorClass: 'text-blue-500' },
                  { id: 'log', icon: Zap, colorClass: 'text-emerald-500' },
                  { id: 'advances', icon: Banknote, colorClass: 'text-orange-500' },
                  { id: 'history', icon: History, colorClass: 'text-blue-600' },
                  ...(isApp ? [{ id: 'updates', icon: RefreshCw, colorClass: 'text-purple-500' }] : []),
                  { id: 'profile', icon: User, colorClass: 'text-purple-500' },
                ];
                return mobileTabs.map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); setSuccess(false); setActivePrivilege(null); }}
                    /* Fix: replace undefined id with tab.id on line 1597 */
                    className={`flex flex-col items-center justify-center flex-1 transition-all relative h-full ${activeTab === tab.id ? tab.colorClass + ' scale-110' : 'text-slate-300'}`}
                  >
                    <tab.icon size={22} className={activeTab === tab.id ? tab.colorClass : 'text-slate-300'} />
                    {tab.count !== undefined && tab.count > 0 && (
                        <span className="absolute top-2 right-1/4 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white">
                            {tab.count}
                        </span>
                    )}
                    {activeTab === tab.id && <div className={`absolute bottom-1 w-1 h-1 ${tab.colorClass.replace('text-', 'bg-')} rounded-full`}></div>}
                  </button>
                ));
              })()}
          </div>
      </nav>

      {showHistoryModal && (
          <Modal title={t('nav_advances')} onClose={() => setShowHistoryModal(false)}>
              <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('advance_height')}</p>
                          <h3 className="text-lg font-bold text-slate-900">{formatMoney(Number(selectedForHistory?.amount))}</h3>
                          <p className="text-xs text-slate-500 font-bold">{formatDate(selectedForHistory?.date)}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">{t('current_debt')}</p>
                          <div className="text-lg font-bold text-orange-600">{formatMoney(Number(selectedForHistory?.amount) - Number(selectedForHistory?.settled_amount || 0))}</div>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><History size={14} className="text-blue-500"/> {t('settlement_history')}</h4>
                      {loadingHistorySettle ? (
                          <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={24}/></div>
                      ) : settlements.length === 0 ? (
                          <div className="py-10 text-center text-slate-300 italic text-sm border-2 border-dashed border-slate-100 rounded-2xl">{t('no_logs')}</div>
                      ) : (
                          <div className="space-y-2">
                              {settlements.map(s => (
                                  <div key={s.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 transition hover:border-blue-200">
                                      <div className="flex items-center gap-3">
                                          <div className="bg-white p-2 rounded-lg border border-slate-200 text-blue-500 shadow-sm"><Calendar size={16}/></div>
                                          <div className="text-sm font-black text-slate-800">{formatDate(s.date)}</div>
                                      </div>
                                      <div className="text-lg font-black text-green-600">-{formatMoney(s.amount)}</div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <Button fullWidth onClick={() => setShowHistoryModal(false)} variant="secondary">{t('close')}</Button>
              </div>
          </Modal>
      )}

      {selectedTask && (
          <Modal title={t('task_detail')} onClose={() => setSelectedTask(null)} maxWidth="max-w-md">
              <div className="space-y-6">
                  <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('task_title')}</div>
                      <h3 className="text-xl font-black text-slate-900 leading-tight">{selectedTask.title}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="text-[9px] font-black text-slate-400 uppercase mb-1">{t('term')}</div>
                          <div className="text-xs font-bold text-slate-800">{formatDate(selectedTask.start_date)}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="text-[9px] font-black text-slate-400 uppercase mb-1">{t('site_label')}</div>
                          <div className="text-xs font-bold text-slate-800 truncate">{selectedTask.sites?.name || t('administrator')}</div>
                      </div>
                  </div>

                  {selectedTask.description && (
                      <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('work_instructions')}</div>
                          <p className="text-sm text-slate-700 bg-orange-50/50 p-4 rounded-xl border border-orange-100 italic leading-relaxed shadow-inner">
                              {selectedTask.description.replace(PRIORITY_FLAG, '').trim()}
                          </p>
                      </div>
                  )}

                  <div className="pt-4 flex flex-col gap-2">
                      {selectedTask.status !== 'done' && (
                          <Button fullWidth size="lg" loading={actionLoading} onClick={() => handleTaskDone(selectedTask.id)} className="h-14 font-black shadow-lg shadow-green-100 bg-green-600 hover:bg-green-700 border-none">
                              <CheckCircle2 size={20}/> {t('mark_done')}
                          </Button>
                      )}
                      <Button variant="secondary" fullWidth onClick={() => setSelectedTask(null)}>{t('close')}</Button>
                  </div>
              </div>
          </Modal>
      )}

      <ConfirmModal 
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={onLogout}
        title={t('logout_confirm_title')}
        message={t('logout_confirm_msg')}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        type="danger"
      />

      <AlertModal 
        isOpen={alertState.open} 
        onClose={() => setAlertState({ ...alertState, open: false })} 
        title={alertState.title || "Info"} 
        message={alertState.message} 
        buttonText={t('understand')}
        type={alertState.type || 'error'} 
      />
    </div>
  );
};
