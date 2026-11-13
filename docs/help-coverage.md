# Kontrola nápovedy — 13. november 2026

Nápoveda obsahuje 100 pripravených článkov pre administrátora alebo zamestnanca. Texty boli porovnané s aktuálnym ovládaním a obsluhou akcií v nižšie uvedených súboroch. Tento prehľad opisuje pokrytie používateľských postupov; nie je potvrdením bezchybnosti všetkých funkcií aplikácie.

| Oblasť | Skontrolovaný zdroj | Pokryté postupy |
| --- | --- | --- |
| Navigácia a nástenka | `App.tsx`, `features/Dashboard.tsx` | Desktop a mobil, dnešná dochádzka, úlohy po termíne, neprítomnosti, dočasní pracovníci |
| Tím a pozvánky | `features/Team.tsx`, `components/InviteTeamModal.tsx`, `lib/teamInvitations.ts`, `api/send-invite.js` | Pozvanie, hromadné odosielanie, opakovanie neúspešných, čakajúca pozvánka, registračný odkaz, ID firmy, zrušenie pozvánky |
| Pracovníci | `features/Team.tsx`, `components/TemporaryWorkerForm.tsx`, `lib/temporaryWorkers.ts` | Úprava, pozícia, mzda a cena práce, viditeľnosť mzdy, detail a filtre, brigádnici bez účtu, obdobia spolupráce, archív, návrat, trvalé odstránenie, ďalší administrátor v príprave |
| Dochádzka | `features/Attendance.tsx`, `components/AttendanceEntryModal.tsx`, `features/Projects.tsx`, `lib/attendance.ts` | Zápis jedného aj viacerých pracovníkov, čas a obed, predvolená prestávka, hodinovka a úkol, oprava a odstránenie zdrojového zápisu |
| Neprítomnosti | `features/EmployeeAbsences.tsx`, `lib/absences.ts` | PN, OČR, dovolenka a ďalšie typy, otvorený koniec, časť dňa, zmena, ukončenie a odstránenie, nástenka a výkaz |
| Mesačné výkazy | `features/Attendance.tsx` | Výber pracovníka a mesiaca, podrobný a súhrnný režim, stĺpce, editor náhľadu, rozvrhnutie času, neprítomnosti, PDF |
| Zákazky | `features/Projects.tsx` | Vytvorenie a úprava, Realizácia/Obchod/Archív, stavy, vyhľadanie, poznámky, adresa a poloha, rozpočet a DPH, sadzby tímu, prístupy, mobilné menu, odstránenie |
| Dopyty a ponuky | `features/Projects.tsx` | Obchodné fázy, začatie realizácie, kalkulácia marže/prirážky, pomocná kalkulačka a história, prenos rozpočtu, položky a uložené názvy, DPH, zľavy, úprava a odstránenie ponuky, PDF |
| Výkaz zákazky | `features/Projects.tsx` | Variant pre klienta, finančné informácie, interný variant pre majiteľa, mená pracovníkov, odlíšenie od mesačnej dochádzky a denníka |
| Denník práce | `features/Diary.tsx` | Výber zákazky a mesiaca, náhľad dňa, denný zápis, import dochádzky, kopírovanie predchádzajúceho dňa, počasie a potvrdená poloha, mechanizmy, fotografie, práca a nákupy daného dňa |
| Exporty denníka | `features/Diary.tsx` | PDF jediného dňa a kompletný denník, rozsah dokumentu, uloženie pred exportom |
| Financie a materiál | `features/Finance.tsx`, `features/Projects.tsx` | Príjem/výdavok, úhrada a neuhradené príjmy, firemná réžia, materiál, množstvo a cena, oprava zdrojových údajov, prevencia duplicitného nákladu |
| Doprava a PHM | `features/ProjectPHM.tsx`, `features/ProjectFinanceWorker.tsx` | Tankovanie, kilometre a sadzba, vozidlo, dátum, doklad, úprava a odstránenie, poverený zamestnanec |
| Analytika | `features/Analytics.tsx`, `features/Finance.tsx` | Firemné pohyby oproti zákazkám, jedna/všetky zákazky, obdobia, mesačný/kumulatívny graf, mzdové náklady a zisk |
| Zálohy | `features/Advances.tsx` | Záloha, čiastočné aj úplné splatenie, história, zostatok, filtre, úprava a odlíšenie odstránenia od splatenia |
| Kalendár | `features/Calendar.tsx` | Týždenný rozvrh, mobilné posúvanie, pridanie a priradenie úlohy, zmena termínu, stav, priorita, kategórie, odstránenie |
| Zamestnanecký účet | `features/WorkerMode.tsx`, `features/PrivilegedSites.tsx` | Vlastný zápis, história a filtre, úlohy a dokončenie, zálohy a splátky, poverené zákazky, denník/nákupy/doprava, profil, heslo, jazyk, avatar |
| Nastavenia | `features/Settings.tsx` | Firemné údaje, platiteľ DPH, logo/pečiatka a orezanie, kategórie úloh, notifikácie a systémové povolenie, heslo, žiadosť o zmazanie účtu |
| Predplatné a účet | `features/Subscription.tsx`, `features/Auth.tsx`, `features/Updates.tsx` | Prvé kroky, limity, objednávka a fakturačné údaje, čakajúca aktivácia, registrácia zamestnanca, overenie emailu, obnova hesla, aktualizácie, inštalácia na plochu |
| PDF na zariadeniach | `lib/pdfExport.ts`, `lib/pdfExportApple.ts` | Tlač/uloženie na počítači, iOS „Uložiť alebo zdieľať PDF“ a „Otvoriť PDF“, Uložiť do Súborov, riešenie zlyhania |
| Podpora a AI | `components/SupportWidget.tsx`, `components/AIAssistantWidget.tsx` | Nahlásenie chyby, kontakt, čo uviesť v správe, úloha AI asistenta a balík, rozdiel oproti pripravenej nápovede |

## Praktické otázky a úvod nápovedy

Úvod zvýrazňuje otázky, podľa ktorých ľudia hľadajú údaje: kto koľko a kde pracoval, zoznam prác zákazky, práca konkrétneho človeka, obnova pracovníka, prenos dochádzky a rozdiely medzi dokumentmi. Ďalšie témy sú rozdelené podľa sekcií aplikácie; kompletný zoznam zostáva dostupný cez Všetky návody. Zamestnanec má vlastný výber otázok.

Obnova po archivácii je zdokumentovaná oddelene od trvalého odstránenia. Pri skutočnom vymazaní sa nesľubuje tlačidlo späť ani zaručená obnova zo zálohy. Návody vysvetľujú aj kontrolu filtrov a kontaktovanie podpory s konkrétnymi údajmi.

## Opravené nepresnosti a podstatné rozlíšenia

- Kalendár má týždenný rozvrh; nápoveda mu nepripisuje neexistujúci prepínač mesačného pohľadu ani tlačidlo návratu na dnešok.
- Karta dopytu sa volá „Rozpočet & Kalkulácia“, na mobile „Rozpočet“.
- Import dochádzky pridáva mená a neprázdne popisy do poznámok, vynecháva identické riadky a vyžaduje následné uloženie denníka.
- „Kopírovať včerajšok“ preberá mechanizmy, počasie a teploty z predchádzajúceho kalendárneho dňa. Nekopíruje celý denný zápis.
- Kompletný export denníka nie je export iba zobrazeného mesiaca. PDF otvoreného dňa je samostatná možnosť.
- Editor mesačného PDF nemení pôvodné pracovné zápisy. Oprava databázovej dochádzky sa robí v zákazke.
- Kalkulácia, cenová ponuka, rozpočet zákazky, prijatá platba a náklad sú odlišné záznamy; ich vytvorenie sa nezamieňa.
- Zmazanie účtu cez Nastavenia odosiela žiadosť, nie okamžitý príkaz na odstránenie firmy.
- AI asistent používa rovnaký aktuálny obsah ako nápoveda; pôvodný samostatný manuál s konfliktnými pokynmi sa už neposiela.

## Rozsah a overenie

Návody sú pre zákaznícke rozhranie administrátora firmy a zamestnanca. Interná správa prevádzkovateľa (`SuperAdmin.tsx`) a verejná marketingová prezentácia (`AboutApp.tsx`) nie sú návody na obsluhu firemnej agendy a nie sú vystavené bežným zákazníkom ako administrátorské postupy.

Automatické kontroly overujú identifikátory, dostupnosť podľa roly, súvisiace odkazy, dohľadateľnosť všetkých názvov, pokrytie oblastí a konkrétne otázky bez diakritiky. V prehliadači sa kontroluje otvorenie článkov, navigácia súvisiacimi návodmi, mobilné rozloženie a klávesnica. Testy obsahu nie sú skúškou reálneho doručovania emailov ani testom všetkých popisovaných operácií v produkčnej databáze.
