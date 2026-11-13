export type HelpRole = 'admin' | 'employee';
export type HelpArticle = {
  id: string; title: string; category: string; summary: string;
  roles: HelpRole[]; keywords: string; steps: string[]; note?: string; related?: string[];
};

const relatedGuides: Record<string, string[]> = {
  'invite-worker': ['invite-manual', 'invite-trouble', 'temporary-worker'],
  'temporary-worker': ['temporary-return', 'attendance-admin', 'worker-delete'],
  'attendance-admin': ['attendance-batch', 'default-lunch', 'fixed-work', 'attendance-edit'],
  'attendance-batch': ['attendance-admin', 'default-lunch', 'attendance-edit'],
  'attendance-export': ['attendance-layout', 'attendance-preview-edit', 'pdf-iphone'],
  'project-pdf': ['attendance-export', 'diary-full-export', 'pdf-iphone'],
  'quote-create': ['quote-transfer', 'quote-items', 'quote-vat-discount', 'quote-edit-pdf'],
  'quote-calculator': ['quote-transfer', 'calculator-tools'],
  'quote-transfer': ['quote-vat-discount', 'quote-edit-pdf', 'lead-convert'],
  'diary-write': ['diary-import', 'diary-weather', 'diary-photos', 'diary-export'],
  'diary-import': ['attendance-admin', 'attendance-worker', 'diary-copy', 'diary-write'],
  'diary-export': ['diary-full-export', 'project-pdf', 'pdf-iphone'],
  'project-access': ['worker-delegated', 'worker-expenses'],
  'expense-add': ['material-add', 'finance-edit', 'finance-overhead'],
  'calendar-task': ['calendar-edit', 'task-categories', 'calendar-notifications'],
  'advance-add': ['advance-settle', 'advance-edit'],
  'worker-delegated': ['diary-write', 'worker-expenses', 'phm-edit'],
  'company-settings': ['brand-images', 'quote-vat-discount'],
  'password-reset': ['contact-support'],
  'find-work-by-person': ['employee-detail', 'find-person-on-project', 'attendance-export'],
  'find-project-work': ['find-person-on-project', 'project-pdf', 'diary-import'],
  'find-person-on-project': ['employee-detail', 'attendance-edit', 'project-pdf'],
  'worker-restore': ['archive-worker', 'temporary-return', 'worker-delete', 'contact-support'],
  'find-missing-records': ['worker-restore', 'worker-history', 'save-trouble'],
  'work-documents': ['attendance-export', 'project-pdf', 'diary-write', 'diary-export']
};
const guide = (id: string, title: string, category: string, roles: HelpRole[], summary: string, keywords: string, steps: string[], note?: string): HelpArticle => ({ id, title, category, roles, summary, keywords, steps, note, related: relatedGuides[id] || [] });
const admin: HelpRole[] = ['admin'];
const employee: HelpRole[] = ['employee'];
const both: HelpRole[] = ['admin', 'employee'];

export const HELP_ARTICLES: HelpArticle[] = [
  guide('invite-worker', 'Ako pridať zamestnanca do tímu', 'Tím', admin, 'Pozvanie zamestnanca a jeho registrácia do vašej firmy.', 'pridať zamestnanca pracovník kolega pozvánka email registrácia registračný link hromadne naraz viac riadky odosielanie', [
    'Otvorte sekciu Tím, kliknite na prvú kartu Pridať zamestnanca a vyberte bežného zamestnanca.',
    'Vyplňte email a prípadne meno. Cez Pridať riadok môžete zadať ďalších zamestnancov.',
    'Kliknite na Odoslať pozvánky. Emaily sa odosielajú postupne s odstupom jednej sekundy; modal ukazuje aktuálny email, priebeh aj odhad času. Nezatvárajte aplikáciu.',
    'Skontrolujte výsledok pri jednotlivých emailoch. Neúspešné pozvánky môžete zopakovať bez opätovného posielania úspešných. Registračný odkaz nájdete v rozbaľovacej časti formulára.',
    'Zamestnanec dokončí registráciu do vašej firmy. Následne mu cez ikonu ceruzky nastavte sadzby a ostatné údaje.'
  ], 'Počet zamestnancov závisí od vášho balíka. Pozvaný zamestnanec a zaregistrovaný člen tímu sú odlišné stavy.'),
  guide('edit-worker', 'Ako upraviť údaje zamestnanca', 'Tím', admin, 'Meno, telefón, sadzby a nastavenia profilu.', 'zamestnanec upraviť zmeniť meno telefón ceruzka profil', [
    'V sekcii Tím nájdite zamestnanca a kliknite na ikonu ceruzky na jeho karte.',
    'Upravte meno, pracovnú pozíciu, telefón alebo hodinové sadzby.',
    'Podľa potreby zmeňte viditeľnosť mzdy alebo predvolený obed a uložte zmeny.'
  ], 'Email existujúceho zamestnanca je v tomto formulári iba na čítanie.'),
  guide('worker-wages', 'Mzdová sadzba, cena práce a viditeľnosť mzdy', 'Tím', admin, 'Čo znamenajú sadzby a čo zamestnanec uvidí vo svojom profile.', 'mzda výplata hodinovka sadzba ccp cena práce náklad skrytá viditeľná', [
    'V sekcii Tím kliknite na ceruzku pri zamestnancovi.',
    'Mzdová sadzba je hodinová mzda zamestnanca. Celková cena práce predstavuje náklad firmy a používa sa v analytike.',
    'Voľbou Zobrazovať mzdu v profile nastavíte, či zamestnanec uvidí svoju hodinovú mzdu a mesačný zárobok.',
    'Uložte zmeny. Vysvetlenie sadzieb je dostupné aj pri otázniku vo formulári.'
  ], 'Už uložené zápisy môžu obsahovať sadzbu platnú pri zápise. Zmena profilu preto automaticky neprepisuje všetky historické náklady.'),
  guide('default-lunch', 'Ako nastaviť zamestnancovi predvolený obed', 'Dochádzka', admin, 'Automatické predvyplnenie obednej prestávky pri zápise práce.', 'pridať obed pauza prestávka predvolený automatický zamestnanec tím nastaviť', [
    'Otvorte Tím a cez ceruzku upravte konkrétneho zamestnanca.',
    'V nastavení predvoleného obeda zapnite prestávku a zadajte čas od–do, napríklad 12:00–12:45.',
    'Uložte profil zamestnanca.',
    'Pri novom zápise jeho práce sa prestávka predvyplní zamestnancovi aj administrátorovi. Pred uložením skontrolujte, či leží v čase zmeny.'
  ], 'Bez nastaveného alebo zadaného obeda sa čas prestávky neodpočíta. Nastavenie neprepisuje staré zápisy.'),
  guide('temporary-worker', 'Ako pridať brigádnika alebo dočasného pracovníka', 'Tím', admin, 'Krátkodobá výpomoc bez registrácie vlastného účtu.', 'pridať dočasný pracovník brigádnik pomocník výpomoc dochádzka úkol hodinovka účet', [
    'Otvorte Tím, kliknite na prvú kartu Pridať zamestnanca a vyberte Pridať brigádnika / pomocníka. Otáznik vo formulári stručne vysvetlí túto evidenciu.',
    'Vyplňte meno a obdobie spolupráce. Do poľa Pozícia môžete napísať vlastný názov, napríklad brigádnik alebo tesár. Email ani prihlasovací účet nie sú potrebné.',
    'Predvolenú odmenu môžete nechať na zápis práce alebo nastaviť hodinovku či úkol. Pracovníka uložte.',
    'V zákazke otvorte Dochádzku, vyberte dočasného pracovníka a zapíšte mu čas, prestávku a odmenu. Nového pomocníka môžete pridať aj priamo z tohto formulára cez Pridať brigádnika / pomocníka.',
    'Po skončení posledného obdobia sa pracovník zobrazí v archíve. Pri návrate v archíve použite obnovenie, skontrolujte nové obdobie a uložte ho. Jeho história zostane na jednej karte.'
  ], 'Dočasný pracovník sa nezapočítava medzi nezapísaných členov bežného tímu. Jeho zapísaná práca sa však normálne zobrazí vo výkazoch a nákladoch.'),
  guide('archive-worker', 'Ako archivovať alebo obnoviť zamestnanca', 'Tím', admin, 'Skrytie neaktívneho pracovníka a jeho návrat do tímu.', 'archív archivovať obnoviť deaktivovať odchod zamestnanec', [
    'V sekcii Tím kliknite na ikonu archívu pri zamestnancovi a potvrďte archiváciu.',
    'Archivovaných členov nájdete cez Zobraziť Archív.',
    'V archíve použite ikonu obnovenia, ak sa zamestnanec vracia do tímu.'
  ], 'Archivácia zachováva historické zápisy. Trvalé odstránenie nie je to isté ako archivácia.'),
  guide('another-admin', 'Ako pridať ďalšieho administrátora', 'Tím', admin, 'Aktuálny stav funkcie ďalšieho administrátora.', 'pridať administrátor správca admin oprávnenia', [
    'V sekcii Tím otvorte prvú kartu Pridať zamestnanca. Pod výberom pracovníka nájdete Pridať ďalšieho administrátora.',
    'Táto možnosť je zatiaľ v príprave. Kliknutie iba zobrazí informáciu a nevytvorí nový účet ani oprávnenie.'
  ]),
  guide('absence-add', 'Ako zapísať PN, OČR alebo dovolenku', 'Neprítomnosti', admin, 'Celodenná alebo čiastočná neprítomnosť konkrétneho zamestnanca.', 'pridať zapísať PN OČR dovolenka lekár P sprevádzanie voľno neprítomnosť choroba', [
    'Otvorte Tím a pri zamestnancovi kliknite na ikonu kalendára.',
    'Kliknite na Pridať neprítomnosť a vyberte typ, napríklad PN, OČR alebo dovolenka.',
    'Zadajte dátum začiatku. Ak neviete, kedy sa zamestnanec vráti, nechajte koniec nevyplnený.',
    'Pri celom dni ponechajte zapnutú Celodennú neprítomnosť. Pri časti dňa ju vypnite a vyplňte čas od–do.',
    'Prípadne doplňte internú poznámku a kliknite na Uložiť neprítomnosť.'
  ], 'OČR a návšteva lekára predvolia rovnaký deň od aj do; dátumy môžete zmeniť. Interné poznámky sa neexportujú.'),
  guide('absence-edit', 'Ako upraviť, ukončiť alebo vymazať PN', 'Neprítomnosti', admin, 'Zmena existujúcej neprítomnosti a ukončenie PN bez zadaného konca.', 'PN neprítomnosť upraviť ukončiť zrušiť vymazať odstrániť koniec', [
    'V sekcii Tím otvorte kalendár pri zamestnancovi alebo jeho detail a zoznam neprítomností.',
    'Vyberte príslušný mesiac. Staršie záznamy nájdete aj cez Zobraziť aj záznamy mimo zvoleného mesiaca.',
    'Ceruzkou upravíte typ, dátumy, čas aj poznámku. Pri trvajúcej neprítomnosti môžete použiť Ukončiť k dnešku.',
    'Ak má neprítomnosť končiť v iný deň, upravte dátum Do a záznam uložte. Kôš použite iba na odstránenie nesprávneho záznamu.'
  ]),
  guide('absence-report', 'Ako sa PN a dovolenka zobrazujú v dochádzke', 'Neprítomnosti', admin, 'Kalendár, nástenka a PDF výkaz počas neprítomnosti.', 'PN OČR dovolenka kalendár export dochádzka nezapísal chýbajúci zápis', [
    'V sekcii Dochádzka vyberte zamestnanca a mesiac. Kalendár aj riadky výkazu obsahujú evidované neprítomnosti.',
    'Otvorená neprítomnosť bez dátumu konca sa vo výkaze zobrazuje iba po dnešný deň.',
    'Pri celodennej neprítomnosti sa pracovník na nástenke nezobrazuje medzi chýbajúcimi zápismi. Pri časti dňa sa stále očakáva zápis odpracovaného času.',
    'PDF obsahuje neprítomnosti pri konkrétnych dátumoch; nepripočítava ich k odpracovaným hodinám.'
  ], 'Evidencia neprítomností nevypočítava náhrady mzdy ani nárok na dovolenku.'),
  guide('attendance-worker', 'Ako zapísať dochádzku ako zamestnanec', 'Dochádzka', employee, 'Zápis vlastnej práce, času a obednej prestávky.', 'pridať zapísať práca výkaz hodiny dochádzka zamestnanec príchod odchod', [
    'Vo svojom zamestnaneckom účte otvorte zápis práce cez Zapísať prácu.',
    'Vyberte zákazku a dátum práce. Pri spätnom zápise skontrolujte, že ste vybrali správny deň.',
    'Zadajte príchod a odchod. Ak bola prestávka, skontrolujte alebo zapnite obed a vyplňte jeho čas od–do.',
    'Doplňte popis vykonanej činnosti a skontrolujte vypočítané trvanie.',
    'Kliknite na Odoslať dnešný výkaz a počkajte na potvrdenie úspešného zápisu.'
  ], 'Predvolený obed nastavuje administrátor v Tíme. Pri chybe v už uloženom zápise sa obráťte na administrátora.'),
  guide('attendance-admin', 'Ako zapísať dochádzku za zamestnanca', 'Dochádzka', admin, 'Zápis práce konkrétneho zamestnanca priamo v zákazke.', 'pridať zapísať dochádzka práca hodiny zamestnanec administrátor výkaz zákazka', [
    'Otvorte Zákazky a kliknite na zákazku, ku ktorej chcete zapísať prácu.',
    'V jej detaile prejdite na Dochádzka a kliknite na Zapísať dochádzku. Na mobile sekciu nájdete po rozbalení Menu zákazky.',
    'V otvorenom okne vyberte jedného pracovníka, dátum a čas od–do. Zvoľte hodinovku alebo úkol a skontrolujte sadzbu či pevnú sumu.',
    'Ak mal pracovník obednú prestávku, skontrolujte predvyplnený čas alebo ju zapnite a doplňte. Trvanie práce sa vypočíta po odpočítaní prestávky.',
    'Doplňte popis činnosti, kliknite na Zapísať hodiny a počkajte na úspešné uloženie. Zápis nájdete pri zákazke aj v mesačnej dochádzke pracovníka.'
  ], 'Druhý spôsob je cez hlavné menu Dochádzky → Zapísať dochádzku. Toto samostatné okno umožňuje vybrať zákazku a označiť aj viacerých pracovníkov. Formulár priamo v zákazke zapisuje jedného pracovníka naraz.'),
  guide('attendance-batch', 'Ako zapísať viacerých pracovníkov naraz cez Dochádzky', 'Dochádzka', admin, 'Spoločný dátum a pracovný čas, samostatná odmena a obed pre každého.', 'zapísať dochádzka hromadne naraz viacerí viac pracovníkov zamestnancov spoločný čas', [
    'V hlavnom menu otvorte Dochádzky a kliknite na Zapísať dochádzku. Použite tento vstup, nie rovnomenné tlačidlo v detaile zákazky.',
    'Vyberte zákazku, dátum a čas od–do. Dátum, pracovný čas a spoločný popis budú rovnaké pre všetkých označených pracovníkov.',
    'V zozname Pracovníci zaškrtnite políčka pri požadovaných menách. Po výbere jedného môžete označiť aj ďalších; nemusíte formulár medzi nimi ukladať.',
    'Pri každom označenom človeku skontrolujte odmenu a jeho vlastnú obednú prestávku. Každý preto môže mať iné čisté trvanie aj inú odmenu.',
    'Doplňte spoločný popis a kliknite na Zapísať dochádzku. Vznikne samostatný pracovný záznam pre každého vybraného pracovníka.'
  ], 'Ak ľudia pracovali v rôznych časoch alebo potrebujú rozdielne popisy, zapíšte ich oddelene. Priamo v zákazke zostáva k dispozícii pôvodný formulár pre jedného pracovníka.'),
  guide('attendance-edit', 'Ako opraviť alebo vymazať zápis práce', 'Dochádzka', admin, 'Oprava uloženého času, prestávky alebo nesprávneho zápisu.', 'dochádzka zápis upraviť zmeniť vymazať zle hodiny obed duplicitný', [
    'Otvorte príslušnú zákazku a jej sekciu Dochádzka.',
    'Nájdite záznam a cez ceruzku otvorte jeho úpravu.',
    'Opravte údaje, skontrolujte čisté trvanie po prestávke a uložte.',
    'Ak je celý zápis nesprávny alebo duplicitný, použite kôš a potvrďte odstránenie.'
  ], 'Úprava riadka v samostatnom exporte Dochádzky mení pripravený výkaz, nie pôvodný databázový zápis v zákazke.'),
  guide('lunch-calculation', 'Ako sa odpočítava obedná prestávka', 'Dochádzka', both, 'Čistý pracovný čas bez plateného obeda.', 'obed prestávka pauza 45 minút odpočet hodiny výpočet 8.25', [
    'Zadajte celý čas prítomnosti od príchodu po odchod.',
    'Zapnite obednú prestávku a vyplňte jej začiatok a koniec, napríklad 12:00–12:45.',
    'Aplikácia odpočíta čas prestávky. Zmena 07:00–16:00 s týmto obedom predstavuje 8 h 15 min práce.',
    'Pri dvoch samostatných zápisoch oddeľte čas práce tak, aby ste tú istú prestávku neodpočítali dvakrát.'
  ], 'Prestávka musí ležať v čase zmeny. Samotný popis „obed“ v poznámke čas neodpočíta.'),
  guide('fixed-work', 'Ako zapísať prácu za pevnú sumu', 'Dochádzka', both, 'Úkolové odmeňovanie namiesto hodinovej sadzby.', 'úkol fix fixná pevná suma hodinovka odmena práca', [
    'Otvorte formulár zápisu práce pri vybranej zákazke.',
    'Pri spôsobe odmeňovania zvoľte úkol alebo fixnú sumu.',
    'Vyplňte dohodnutú sumu a ostatné požadované údaje, potom zápis uložte.'
  ], 'Úkolové práce sú vo výkaze vedené samostatne; ich odmena sa nepočíta násobením hodín a hodinovej sadzby.'),
  guide('attendance-export', 'Ako exportovať dochádzku do PDF', 'PDF exporty', admin, 'Mesačný výkaz zamestnanca vrátane prestávok a neprítomností.', 'dochádzka výkaz export PDF tlač stiahnuť zamestnanec mesiac', [
    'V hlavnom menu otvorte Dochádzku a vyberte zamestnanca aj mesiac.',
    'V Nastaveniach exportu vyberte Podrobný alebo Súhrnný výkaz a nastavte zobrazenie zákaziek a popisov.',
    'Skontrolujte časové úseky, čisté trvanie a riadky neprítomností. Trvanie je zobrazené v hodinách a minútach.',
    'Kliknite na Generovať PDF a v nasledujúcom okne dokument uložte alebo vytlačte.'
  ], 'Voliteľné rozvrhnutie času používa vašu šablónu. Ak chcete skutočné zapísané časy a prestávky, nechajte túto voľbu vypnutú.'),
  guide('pdf-iphone', 'Ako uložiť PDF na iPhone alebo iPade', 'PDF exporty', both, 'Uloženie a zdieľanie PDF po jeho vygenerovaní.', 'iphone ipad ios apple safari PDF export generujem uložiť súbory zdieľať tlačiť', [
    'V príslušnej sekcii spustite generovanie PDF a počkajte na okno PDF je pripravené.',
    'Kliknite na Uložiť alebo zdieľať PDF. Ak táto možnosť nie je dostupná alebo zlyhá, použite Otvoriť PDF.',
    'V systémovej ponuke zdieľania vyberte Uložiť do Súborov, zvoľte priečinok a potvrďte uloženie.',
    'Ak chcete dokument poslať ďalej alebo vytlačiť, vyberte príslušnú aplikáciu alebo tlač v systémovej ponuke.'
  ], 'Samotné vygenerovanie ešte neznamená uloženie do Súborov. Názvy systémových možností závisia od jazyka a verzie iOS.'),
  guide('pdf-trouble', 'PDF sa nevytvorí alebo sa neotvorí', 'PDF exporty', both, 'Čo skontrolovať, ak export zostane pri generovaní.', 'PDF nefunguje chyba generujem export stiahnuť tlač okno zablokované', [
    'Počkajte na dokončenie načítania údajov a skontrolujte, či výkaz obsahuje záznamy.',
    'Skontrolujte pripojenie a či používate aktuálnu verziu aplikácie. Potom export skúste znova.',
    'Na iPhone po vygenerovaní použite otvorenie alebo zdieľanie PDF. Na počítači skontrolujte aj otvorené okná tlače.',
    'Ak problém trvá, cez Nahlásiť chybu nám napíšte sekciu, zariadenie, prehliadač a presný postup, pri ktorom export zlyhá.'
  ]),
  guide('project-add', 'Ako pridať zákazku', 'Zákazky', admin, 'Vytvorenie zákazky v realizácii.', 'pridať nová vytvoriť zákazka stavba projekt realizácia klient rozpočet', [
    'Otvorte Zákazky a kartu Realizácia.',
    'Kliknite na Pridať zákazku a vyplňte názov, klienta a podľa potreby adresu, rozpočet a poznámku.',
    'Skontrolujte stav a ostatné údaje a kliknite na Vytvoriť Zákazku.',
    'Po otvorení zákazky môžete viesť dochádzku, príjmy, výdavky a PHM.'
  ]),
  guide('lead-add', 'Ako pridať dopyt do obchodu', 'Cenové ponuky', admin, 'Evidencia záujemcu pred začiatkom realizácie.', 'pridať dopyt obchod klient obhliadka cenová ponuka záujemca', [
    'Otvorte Zákazky a prepnite sa na Obchod.',
    'Kliknite na Pridať dopyt, vyplňte údaje a záznam uložte.',
    'Otvorte dopyt. Nájdete tu údaje, kalkulačku a cenové ponuky.',
    'Podľa priebehu obchodu môžete meniť fázu dopytu, napríklad na Kontakt, Obhliadka alebo Ponuka.'
  ]),
  guide('quote-create', 'Ako vytvoriť cenovú ponuku', 'Cenové ponuky', admin, 'Od dopytu cez položky až po PDF cenovej ponuky.', 'pridať vytvoriť cenová ponuka nacenenie kalkulácia PDF rozpočet obchod', [
    'Otvorte Zákazky → Obchod a vyberte dopyt. Ak ho ešte nemáte, najprv pridajte nový dopyt.',
    'V detaile otvorte Cenové ponuky a vytvorte ponuku. Na mobile môže mať karta skrátený názov Ponuky.',
    'Doplňte údaje a položky, ich množstvá, jednotky a ceny. Skontrolujte nastavenia DPH a výslednú sumu.',
    'Ponuku uložte. V jej detaile môžete otvoriť náhľad a exportovať ju do PDF.',
    'Ak vychádzate z kalkulačky, použite Preniesť do Cenovej Ponuky, na mobile Vytvoriť ponuku z rozpočtu.'
  ]),
  guide('quote-calculator', 'Kalkulačka: marža alebo prirážka', 'Cenové ponuky', admin, 'Rozdiel medzi dvoma spôsobmi výpočtu predajnej ceny.', 'cenová ponuka kalkulačka marža prirážka zisk percento náklad cena', [
    'V detaile dopytu v Zákazky → Obchod otvorte Rozpočet & Kalkulácia. Na mobile sa karta volá Rozpočet.',
    'Zadajte položky, množstvo a jednotkový náklad.',
    'Vyberte Marža alebo Prirážka a zadajte percento. Pri náklade 100 € a 20 % dá prirážka cenu 120 €, marža cenu 125 €.',
    'Skontrolujte výsledok a podľa potreby preneste rozpočet do cenovej ponuky.'
  ], 'Marža je podiel z predajnej ceny, prirážka je navýšenie nákladu. Pri marži musí byť percento menšie ako 100.'),
  guide('project-edit', 'Ako upraviť alebo archivovať zákazku', 'Zákazky', admin, 'Zmena údajov a orientácia v stavoch zákaziek.', 'zákazka stavba upraviť vymazať archív archivovať dokončiť stav', [
    'V zozname Zákaziek použite ceruzku na úpravu údajov zákazky.',
    'Stav zákazky môžete zmeniť aj cez jej stavový štítok v detaile.',
    'Ukončené zákazky hľadajte aj na karte Archív.',
    'Kôš znamená vymazanie. Pred potvrdením si prečítajte upozornenie; nie je to rovnaké ako zmena stavu.'
  ]),
  guide('expense-add', 'Ako pridať výdavok k zákazke', 'Financie', admin, 'Zapísanie nákladu alebo nákupu materiálu.', 'pridať výdavok náklad platba nákup bloček zákazka financie', [
    'Otvorte konkrétnu zákazku a v hlavičke kliknite na Pridať výdavok.',
    'Otvorí sa sekcia Príjmy & výdavky aj formulár s vybraným výdavkom. Môžete ho otvoriť aj cez Pridať pohyb.',
    'Zadajte dátum, kategóriu alebo hlavný popis a sumu. Pri materiáli zapnite Je to nákup materiálu? a vyplňte jeho údaje.',
    'Skontrolujte údaje a záznam uložte.'
  ]),
  guide('income-add', 'Ako pridať príjem k zákazke', 'Financie', admin, 'Prijatá platba alebo príjem evidovaný pri zákazke.', 'pridať príjem platba faktúra záloha klient zaplatené financie', [
    'Otvorte zákazku a v hlavičke kliknite na Pridať príjem.',
    'Vo formulári bude vybraný Príjem / Platba. Vyplňte dátum, kategóriu alebo popis a sumu.',
    'Skontrolujte, či má byť platba označená ako uhradená, a záznam uložte.',
    'Záznam potom nájdete v Príjmy & výdavky.'
  ], 'Priebežný zisk zákazky vychádza z uhradených príjmov a evidovaných nákladov. Evidencia príjmu nie je automatické vystavenie účtovnej faktúry.'),
  guide('finance-overview', 'Kde nájdem firemné príjmy a výdavky', 'Financie', admin, 'Filtrovanie firemných financií podľa obdobia a zákazky.', 'financie firemná analytika príjmy výdavky réžia obdobie filter', [
    'V hlavnom menu rozbaľte Financie a otvorte Firemnú analytiku.',
    'Vyberte obdobie a podľa potreby zákazku alebo typ záznamu.',
    'V prehľade skontrolujte príjmy a jednotlivé náklady. Existujúce záznamy môžete otvoriť na úpravu.'
  ], 'Dostupnosť analytiky závisí od vášho balíka. Náklady práce môžu používať celkovú cenu práce, nie čistú mzdu.'),
  guide('project-profit', 'Ako sa počíta priebežný zisk zákazky', 'Financie', admin, 'Čo ovplyvňuje sumu v hlavičke zákazky.', 'zisk zákazka príjem výdavok náklad materiál PHM hodinovka', [
    'Otvorte zákazku a skontrolujte Príjmy & výdavky vrátane stavu úhrady príjmov.',
    'Priebežný zisk porovnáva uhradené príjmy s evidovanými nákladmi práce, materiálu, ostatných výdavkov a PHM.',
    'Ak suma nesedí, skontrolujte dátumy, duplicity, hodinové sadzby a to, či materiál nebol zapísaný ešte raz ako samostatný výdavok.'
  ]),
  guide('fuel-add', 'Ako pridať PHM alebo náhradu za kilometre', 'Financie', admin, 'Náklady na dopravu pri konkrétnej zákazke.', 'pridať PHM palivo benzín nafta kilometre km auto doprava bloček', [
    'V zákazke otvorte sekciu PHM. Na mobile ju vyberte cez Menu zákazky.',
    'Kliknite na Pridať záznam a vyberte typ záznamu paliva alebo kilometrov.',
    'Vyplňte dátum, vozidlo a sumu; pri kilometroch počet km a sadzbu. Prípadne doplňte poznámku alebo fotografiu dokladu.',
    'Uložte záznam a skontrolujte ho v zozname dopravy a PHM.'
  ]),
  guide('advance-add', 'Ako vyplatiť a evidovať zálohu zamestnancovi', 'Zálohy', admin, 'Pridanie zálohy a sledovanie zostatku k vráteniu.', 'pridať vyplatiť záloha zamestnanec dlh výplata', [
    'V hlavnom menu otvorte Financie → Zálohy.',
    'Kliknite na Vyplatiť Zálohu a vyberte zamestnanca.',
    'Vyplňte sumu, dátum a prípadnú poznámku a záznam uložte.',
    'V prehľade uvidíte priebeh splácania aj zostatok k vráteniu.'
  ], 'Zapísanie zálohy v aplikácii samo neodosiela bankový prevod.'),
  guide('advance-settle', 'Ako zúčtovať splátku zálohy', 'Zálohy', admin, 'Čiastočné aj úplné zúčtovanie evidovanej zálohy.', 'záloha splátka splatiť zúčtovať odpočítať vrátiť dlh história', [
    'Otvorte Financie → Zálohy a nájdite zálohu zamestnanca.',
    'Kliknite na Zúčtovať splátku a zadajte dátum a sumu. Pre celé splatenie môžete vložiť celý zostatok.',
    'Kliknite na Potvrdiť a odpočítať. Suma nesmie presiahnuť zostávajúci dlh.',
    'Históriu splátok otvoríte kliknutím na kartu zálohy.'
  ], 'Zúčtovanie je evidencia splátky, nie automatický bankový prevod alebo spracovanie mzdy.'),
  guide('diary-write', 'Ako vytvoriť zápis v denníku práce', 'Denník práce', both, 'Denný záznam priebehu prác pri zákazke.', 'pridať denník práce stavebný zápis deň počasie foto mechanizmy', [
    'V hlavnom menu otvorte Denník práce a vyberte zákazku.',
    'V kalendári zvoľte deň, pre ktorý chcete pripraviť zápis.',
    'V časti priebehu prác napíšte, čo sa v daný deň robilo. Ak už máte dochádzku s popismi, tlačidlom Importovať z dochádzky ich pridáte do textu aj s menami pracovníkov.',
    'Skontrolujte poveternostné podmienky, teploty a mechanizmy. Načítanú prácu a nákupy materiálu uvidíte v prehľade daného dňa.',
    'Pridajte fotografie, ak ich potrebujete, a kliknite na Uložiť záznam. Pred odchodom skontrolujte potvrdenie uloženia.'
  ], 'Zamestnanec otvorí denník cez Moje poverené stavby → Viesť denník; musí mať pridelený prístup. Denník práce nie je systém právneho podpisovania dokumentov.'),
  guide('diary-export', 'Ako exportovať jeden deň z denníka práce', 'PDF exporty', both, 'PDF otvoreného dňa namiesto celého denníka zákazky.', 'denník export PDF tlačiť stiahnuť denný výkaz jeden deň', [
    'Otvorte Denník práce, vyberte zákazku a v kalendári kliknite na požadovaný deň. Poverený zamestnanec vstúpi cez Viesť denník.',
    'Skontrolujte dátum v hlavičke. Ak ste zápis menili, najprv použite Uložiť záznam.',
    'V otvorenom dni kliknite hore na PDF, na menšej obrazovke na ikonu dokumentu so šípkou nadol.',
    'Na počítači v okne tlače vyberte tlačiareň alebo uloženie do PDF. Na iPhone po vygenerovaní použite otvorenie či zdieľanie dokumentu.'
  ], 'Tlačidlo Export PDF pri mesačnom prehľade zákazky slúži na kompletný denník. PDF v otvorenom dni exportuje iba tento deň.'),
  guide('calendar-task', 'Ako pridať a priradiť úlohu', 'Kalendár', admin, 'Plánovanie práce, termínu a zodpovednej osoby.', 'pridať úloha kalendár termín plán zamestnanec priradiť', [
    'Otvorte Kalendár a kliknite na Nová Úloha.',
    'Vyplňte názov, začiatok a koniec. Prípadne pripojte zákazku v poli Projekt.',
    'V poli Priradiť vyberte zamestnanca a nastavte stav úlohy.',
    'Úlohu uložte. Neskoršie zmeny vykonáte po otvorení jej detailu.'
  ]),
  guide('project-access', 'Ako zamestnancovi prideliť prístup k správe zákazky', 'Zákazky', admin, 'Poverenie vedením denníka alebo evidovaním výdavkov.', 'oprávnenia prístupy poverený zamestnanec zákazka denník výdavky', [
    'Otvorte zákazku a jej sekciu Prístupy.',
    'Pri pracovníkovi kliknite na Vedenie denníka alebo Správa nákupov podľa toho, čo mu chcete povoliť. Ide o dve samostatné oprávnenia.',
    'Potvrďte zmenu v otvorenom okne. Rovnakým ovládaním môžete neskôr oprávnenie aj odobrať.',
    'Zamestnanec nájde prístup v Moje poverené stavby; uvidí iba akcie, ktoré mu boli povolené.'
  ], 'Poverenie ku konkrétnej zákazke nie je povýšenie na administrátora celej firmy.'),
  guide('worker-delegated', 'Kde nájdem poverené zákazky a ich správu', 'Zákazky', employee, 'Denník a nákupy dostupné podľa pridelených oprávnení.', 'poverené stavby zákazka správa denník nákup výdavok doprava oprávnenia', [
    'Vo svojom účte vyhľadajte Moje poverené stavby.',
    'Otvorte pridelenú zákazku a vyberte dostupnú možnosť, napríklad Viesť denník alebo Pridať nákup.',
    'Vyplňte požadované údaje a záznam uložte.'
  ], 'Ak zákazku alebo funkciu nevidíte, požiadajte administrátora o kontrolu prístupov. Dostupné sú iba udelené oprávnenia.'),
  guide('worker-profile', 'Ako upraviť profil alebo zmeniť heslo', 'Nastavenia', employee, 'Osobné údaje a zabezpečenie zamestnaneckého účtu.', 'profil heslo zmena meno telefón jazyk účet', [
    'Vo svojom zamestnaneckom účte otvorte Profil.',
    'Pri osobných údajoch upravte meno alebo telefón a uložte zmeny.',
    'Heslo zmeníte v časti zabezpečenia zadaním nového hesla aj jeho potvrdenia.'
  ], 'Viditeľnosť mzdy a predvolený obed spravuje administrátor v sekcii Tím.'),
  guide('worker-history', 'Kde nájdem svoje odpracované hodiny', 'Dochádzka', employee, 'História vlastných zápisov a mesačný prehľad.', 'dochádzka história hodiny prehľad práca výkaz mzda obed', [
    'Vo svojom zamestnaneckom účte otvorte Moja História.',
    'Vyberte obdobie a podľa potreby zákazku. Pri zápisoch skontrolujte dátum, trvanie a popis práce.',
    'Na úvodnom prehľade nájdete aj súhrn za mesiac. Trvanie 8 h 15 min znamená osem hodín a pätnásť minút.',
    'Ak treba opraviť uložený zápis, kontaktujte administrátora svojej firmy.'
  ], 'Mzda a zárobok sa zobrazujú iba vtedy, ak ich viditeľnosť povolil administrátor.'),
  guide('worker-tasks', 'Kde nájdem pridelené úlohy', 'Kalendár', employee, 'Otvorenie pokynov a označenie splnenej úlohy.', 'úloha pridelené práca plán termín kalendár splnené', [
    'V zamestnaneckom účte otvorte Moje Úlohy.',
    'Otvorte konkrétnu úlohu a skontrolujte termín, zákazku aj pokyny k práci.',
    'Po dokončení použite Označiť ako splnené.'
  ], 'Označenie úlohy ako splnenej nenahrádza zápis dochádzky.'),
  guide('worker-advances', 'Kde nájdem svoje zálohy a splátky', 'Zálohy', employee, 'Prehľad evidovaných záloh a ich zostatkov.', 'záloha dlh splátky vrátenie výplata zostatok', [
    'Vo svojom účte otvorte Moje Zálohy.',
    'Vyberte zálohu a skontrolujte jej výšku, zostávajúci dlh a históriu zúčtovaných splátok.',
    'Ak suma nesedí, kontaktujte administrátora firmy a uveďte konkrétnu zálohu aj dátum splátky.'
  ]),
  guide('company-settings', 'Ako upraviť firemné údaje, logo alebo pečiatku', 'Nastavenia', admin, 'Údaje firmy používané aj v dokumentoch.', 'nastavenia firma IČO DIČ IČ DPH logo pečiatka adresa údaje', [
    'V hlavnom menu otvorte Nastavenia a časť s firemnými údajmi.',
    'Upravte údaje firmy. Logo alebo pečiatku zmeníte cez príslušné nahratie obrázka.',
    'Kliknite na Uložiť firemné údaje a pri ďalšom exporte skontrolujte výsledok.'
  ]),
  guide('admin-password', 'Ako zmeniť heslo administrátora', 'Nastavenia', admin, 'Zmena hesla v prihlásenom účte.', 'heslo administrátor zmeniť zabezpečenie účet', [
    'Otvorte Nastavenia a časť zabezpečenia.',
    'Vyplňte nové heslo aj jeho potvrdenie.',
    'Kliknite na Aktualizovať Heslo. Obe zadané heslá musia byť rovnaké.'
  ]),
  guide('plan-limits', 'Prečo nemôžem pridať ďalšieho zamestnanca alebo otvoriť funkciu', 'Účet a podpora', admin, 'Limity balíka a dostupnosť funkcií.', 'balík predplatné limit zamestnanec gold pro platinum upgrade zamknuté', [
    'Skontrolujte aktuálny balík v sekcii predplatného aplikácie.',
    'Pri dosiahnutí limitu zamestnancov archivujte členov, ktorí už nepracujú, alebo vyberte vyšší balík.',
    'Ak je funkcia dostupná až vo vyššom balíku, aplikácia zobrazí príslušnú ponuku.'
  ]),
  guide('mobile-menu', 'Kde nájdem dochádzku a financie zákazky na mobile', 'Zákazky', admin, 'Rozbalenie sekcií konkrétnej zákazky.', 'mobil menu zákazka prehľad dochádzka financie PHM prístupy', [
    'Otvorte detail zákazky.',
    'Ťuknite na Menu zákazky s ikonou troch čiar a šípkou.',
    'Vyberte požadovanú sekciu, napríklad Dochádzka, Príjmy & výdavky alebo PHM.'
  ]),
  guide('contact-support', 'Ako nahlásiť chybu alebo kontaktovať podporu', 'Účet a podpora', both, 'Kontakt priamo z ktorejkoľvek sekcie aplikácie.', 'chyba bug nefunguje problém kontakt pomoc podpora telefón email', [
    'Na pravom okraji aplikácie použite ikonku chrobáka pre Nahlásiť chybu alebo bublinu pre Kontaktujte nás. Na počítači sa názov zobrazí po prejdení myšou.',
    'Vyplňte kontaktný email, telefón a správu.',
    'Pri chybe uveďte sekciu, presný postup, čo ste očakávali a čo sa stalo. Doplňte aj zariadenie a prehliadač.',
    'Správu odošlite a počkajte na potvrdenie.'
  ], 'Do správy nikdy neposielajte svoje heslo.'),
  guide('dashboard', 'Ako čítať nástenku a chýbajúce zápisy', 'Nástenka', admin, 'Dnešný plán, omeškané úlohy a stav dochádzky na jednom mieste.', 'nástenka domov dnes prehľad nezapísaní chýbajúce úlohy termín', [
    'Otvorte Nástenku; v mobilnom menu môže byť označená ako Domov. Najprv skontrolujte zobrazený dátum.',
    'V prehľade dochádzky rozlíšte pracovníkov so zapísanou prácou a tých, ktorým zápis chýba. Ide o dnešný prehľad, nie uzavretý mesačný výkaz.',
    'Pracovník s celodennou PN alebo inou evidovanou celodennou neprítomnosťou sa nepovažuje za chýbajúci zápis. Dočasní pracovníci sa medzi bežným tímom nevyžadujú.',
    'Pozrite úlohy po termíne a dnešný plán. Chybné údaje opravte v príslušnej sekcii: úlohy v Kalendári, neprítomnosti v Tíme a pracovné zápisy v zákazke.'
  ], 'Čiastočná neprítomnosť nenahrádza zápis zostávajúcej odpracovanej časti dňa.'),
  guide('invite-manual', 'Ako pozvať zamestnanca registračným odkazom', 'Tím', admin, 'Náhradný postup, keď chcete odkaz poslať sami.', 'pozvánka registračný odkaz link ID firmy ručne kopírovať registrácia', [
    'V Tíme kliknite na Pozvať do tímu a rozbaľte Registračný odkaz a ID firmy v spodnej časti formulára.',
    'Skopírujte registračný odkaz a pošlite ho konkrétnemu zamestnancovi. Odkaz už obsahuje ID vašej firmy.',
    'Zamestnanec otvorí odkaz a dokončí registráciu zamestnanca. Nemá zakladať novú firmu.',
    'Ak sa registruje bez odkazu, odovzdajte mu ID firmy z rovnakého formulára. Po registrácii overte jeho kartu v Tíme a nastavte sadzby.'
  ], 'Registračný odkaz zdieľajte iba s ľuďmi, ktorých chcete prijať do firmy. Ručne poslaný odkaz nie je potvrdenie, že registrácia už prebehla.'),
  guide('invite-trouble', 'Pozvánka neprišla alebo odosielanie zlyhalo', 'Tím', admin, 'Ako odlíšiť neodoslaný email od nedokončenej registrácie.', 'pozvánka email neprišiel spam neodoslané chyba opakovať pozvaný zrušiť', [
    'Vo formulári pozvánok skontrolujte výsledok pri danom emaile. Ak odoslanie zlyhalo, opravte adresu alebo použite Odoslať zostávajúce pozvánky. Už úspešné riadky sa neposielajú znova.',
    'Ak odoslanie prešlo, nech zamestnanec skontroluje aj spam a hromadnú poštu. Správa prichádza z noreply@moja-stavba.sk.',
    'Karta so štítkom Pozvaný znamená, že registrácia ešte nie je dokončená. Zamestnanec musí otvoriť odkaz a vytvoriť svoj účet.',
    'Pri vypršanom alebo nefunkčnom odkaze pošlite novú pozvánku, prípadne použite registračný odkaz z formulára. Pri hlásení limitu odosielania počkajte; opakované klikanie limit neodstráni.',
    'Nesprávnu čakajúcu pozvánku môžete zrušiť košom na jej karte. Pri pretrvávajúcom probléme podpore pošlite email príjemcu a presné chybové hlásenie.'
  ]),
  guide('employee-register', 'Ako sa zaregistrovať ako zamestnanec', 'Účet a podpora', employee, 'Pripojenie k existujúcej firme cez pozvánku.', 'registrácia zamestnanec účet pozvánka email ID firmy overenie prihlásenie', [
    'Otvorte registračný odkaz od zamestnávateľa. Použite email, na ktorý bola pozvánka poslaná.',
    'Skontrolujte predvyplnenú firmu, doplňte svoje údaje a zvoľte heslo. Vyberáte registráciu zamestnanca, nie vytvorenie vlastnej firmy.',
    'Dokončite registráciu a riaďte sa prípadnou výzvou na overenie emailu. Overovací email hľadajte aj v spame.',
    'Prihláste sa svojím emailom a heslom. Ak nevidíte správnu firmu alebo zákazky, obráťte sa na administrátora; nezakladajte ďalšie účty naslepo.'
  ]),
  guide('employee-detail', 'Kde skontrolujem prácu konkrétneho zamestnanca', 'Tím', admin, 'Detail pracovníka s filtrom zákazky, mesiaca a zoznamom zápisov.', 'zamestnanec detail karta hodiny náklad história mesiac zákazka filter', [
    'V Tíme kliknite na kartu alebo meno pracovníka. Ceruzka na karte otvára úpravu profilu, nie jeho pracovný prehľad.',
    'Vyberte mesiac a prípadne zákazku cez Hľadať zákazku. Súčet hodín a nákladov sa vzťahuje na zvolený výber.',
    'V Detailnom výkaze prác zamestnanca skontrolujte jednotlivé dni, popisy a trvanie práce.',
    'Ak potrebujete opraviť hodiny alebo odmenu v konkrétnom zápise, otvorte príslušnú zákazku → Dochádzka a použite ceruzku pri danom riadku. Pre mesačné PDF prejdite do Dochádzok.'
  ]),
  guide('temporary-return', 'Ako ukončiť alebo obnoviť spoluprácu s brigádnikom', 'Tím', admin, 'Viac období na jednej karte bez zakladania ďalšieho pracovníka.', 'brigádnik dočasný návrat obnoviť obdobie spolupráca koniec archív pozícia', [
    'V Tíme otvorte ceruzkou dočasného pracovníka. Pri období spolupráce doplňte dátum Do; posledný uvedený deň ešte patrí do obdobia.',
    'Po skončení posledného uzavretého obdobia sa pracovník zobrazí v archíve. Obdobie bez konca sa považuje za pokračujúcu spoluprácu.',
    'Pri návrate otvorte Zobraziť archív a použite obnovenie pracovníka. Formulár pripraví nové obdobie, ktoré skontrolujte a uložte.',
    'Ďalšie obdobie môžete pridať aj pri úprave pracovníka cez Ďalšie obdobie spolupráce. Staré obdobia ponechajte, ak sú správne.'
  ], 'Použite existujúcu kartu. Nová karta s rovnakým menom by predstavovala iného pracovníka a rozdelila jeho históriu.'),
  guide('worker-delete', 'Archivovať alebo natrvalo odstrániť zamestnanca?', 'Tím', admin, 'Ako zachovať históriu pri odchode pracovníka.', 'zamestnanec vymazať odstrániť zmazať archív história dáta', [
    'Ak zamestnanec iba skončil alebo dočasne nepracuje, v Tíme použite Archivovať. Jeho doterajšie zápisy zostanú zachované.',
    'Archivovaného pracovníka nájdete cez Zobraziť archív. Odtiaľ ho môžete obnoviť.',
    'Kôš v archíve je trvalé odstránenie. Pred potvrdením si prečítajte upozornenie a overte, či pracovníka nepotrebujete v historických výkazoch.'
  ], 'Odstránenie pracovníka môže odstrániť aj nadväzujúce údaje. Na bežné ukončenie spolupráce používajte archív.'),
  guide('attendance-preview-edit', 'Ako upraviť PDF výkaz bez zmeny uloženej dochádzky', 'PDF exporty', admin, 'Čo mení Editor náhľadu PDF a čo zostáva v pôvodných záznamoch.', 'dochádzka editor náhľad PDF úprava riadok čas hodiny popis neuložilo', [
    'V Dochádzkach vyberte zamestnanca a mesiac. Po načítaní pracujete v Editore náhľadu PDF.',
    'Podľa potreby upravte dostupné polia pracovného riadka, napríklad časové úseky alebo popis. Pri platnom časovom úseku sa prepočíta trvanie v náhľade.',
    'Neprítomnosti upravujte v Tíme cez kalendár zamestnanca; ich riadky nie sú bežnými pracovnými riadkami na editovanie.',
    'Výkaz skontrolujte a použite Generovať PDF. Ak chcete opraviť zdrojové údaje, upravte pôvodný zápis v zákazke → Dochádzka.'
  ], 'Úpravy náhľadu sa neukladajú ako oprava databázovej dochádzky. Po novom načítaní zamestnanca alebo mesiaca sa náhľad vytvorí z uložených záznamov znova.'),
  guide('attendance-layout', 'Podrobný výkaz, súhrn a rozvrhnutie času v PDF', 'PDF exporty', admin, 'Ako vybrať skutočné zápisy alebo zobrazenie podľa vlastnej šablóny.', 'dochádzka PDF podrobný súhrnný výkaz rozvrhnutie šablóna prestávka zákazka popis', [
    'V Dochádzkach vyberte zamestnanca a mesiac. V Nastaveniach exportu prepnite Podrobný alebo Súhrnný výkaz.',
    'Podrobný výkaz ponechá jednotlivé pracovné zápisy; súhrnný zoskupí prácu podľa dňa. Samostatné pracovné úseky môžu byť oddelené čiarkou.',
    'Voľbami Zákazka a Popis ovplyvníte, ktoré stĺpce budú vo výkaze.',
    'Upraviť rozvrhnutie času zapnite iba vtedy, ak chcete hodiny vo výkaze rozložiť podľa šablóny. Nastavte začiatok práce, čas prestávky a jej trvanie.',
    'Ak potrebujete skutočné zapísané časy a obedy, rozvrhnutie nechajte vypnuté. Pred generovaním skontrolujte niekoľko konkrétnych dní.'
  ], 'Šablóna upravuje pripravený výkaz. Nenastavuje predvolený obed zamestnanca a neopravuje pôvodné pracovné zápisy.'),
  guide('project-pdf', 'Ako exportovať výkaz zákazky pre klienta alebo majiteľa', 'PDF exporty', admin, 'Výber medzi klientskym výkazom a interným finančným prehľadom.', 'zákazka projekt výkaz export PDF klient majiteľ finančné info mená pracovníci mzdy', [
    'Otvorte Zákazky → Realizácia alebo Archív a vyberte zákazku. V jej hlavičke kliknite na Stiahnuť PDF.',
    'Vyberte Pre klienta pre výkaz realizovaných prác. Pri pracovných zápisoch sa zobrazí aj meno pracovníka, čas a popis.',
    'Pri klientskom výkaze zapnite Zahrnúť finančné info iba vtedy, ak ho chcete odovzdať aj s finančnými údajmi. Pred poslaním dokument skontrolujte.',
    'Pre vlastné posúdenie zákazky vyberte Pre majiteľa. Interný variant obsahuje aj podrobnejšie finančné a mzdové informácie.',
    'Kliknite na Generovať PDF. Na počítači v tlačovom okne zvoľte uloženie do PDF; na iPhone použite otvorenie alebo zdieľanie súboru.'
  ], 'Ide o výkaz celej vybranej zákazky. Pre konkrétneho zamestnanca a mesiac použite samostatnú sekciu Dochádzky; pre denný stavebný zápis použite Denník práce.'),
  guide('project-rates', 'Ako nastaviť zamestnancovi sadzbu iba pre jednu zákazku', 'Zákazky', admin, 'Sadzby tímu v konkrétnej zákazke namiesto všeobecnej sadzby profilu.', 'sadzby tímu zákazka hodinová mzda cena práce individuálna sadzba', [
    'Otvorte konkrétnu zákazku a sekciu Sadzby tímu. Na mobile ju nájdete v Menu zákazky.',
    'Pri pracovníkovi zadajte mzdovú sadzbu a cenu práce pre túto zákazku a použite uloženie pri jeho riadku.',
    'Pri novom zápise skontrolujte predvyplnené sadzby. Administrátor ich vo formulári práce môže upraviť pre konkrétny zápis.',
    'Všeobecnú sadzbu pre ostatné zákazky zmeníte v Tíme cez úpravu pracovníka.'
  ], 'Zmena nastavenia sadzby sama neprepisuje historické zápisy, ktoré už majú uloženú vlastnú sadzbu.'),
  guide('project-location', 'Ako priradiť zákazke adresu a polohu pre počasie', 'Zákazky', admin, 'Potvrdená poloha zákazky pre automatické údaje v denníku.', 'zákazka adresa poloha počasie mesto obec kraj okres priradiť GPS', [
    'Pri vytváraní alebo úprave zákazky otvorte časť adresy. Vyberte krajinu, kraj a okres a vyhľadajte obec alebo mesto.',
    'Vyberte zodpovedajúci výsledok vyhľadávania a doplňte ulicu alebo podrobnosti adresy. Skontrolujte zobrazenú adresu aj priradenú polohu.',
    'Uložte zákazku. Denník bude môcť načítať počasie podľa jej polohy, nie podľa toho, kde sa práve nachádza váš telefón.',
    'Ak denník žiada potvrdenie polohy, vráťte sa k úprave zákazky a adresu vyberte z ponúknutých výsledkov znova.'
  ], 'Samotný názov mesta napísaný v poznámke nenahrádza priradenú polohu.'),
  guide('project-budget', 'Ako zadať položkový rozpočet zákazky a DPH', 'Zákazky', admin, 'Celková dohodnutá suma alebo rozpis položiek pri vytvorení zákazky.', 'zákazka rozpočet položkový rozpis položka DPH suma jednotky cena', [
    'V Zákazkách pridajte zákazku alebo otvorte jej úpravu ceruzkou.',
    'Ak stačí jedna suma, vyplňte Rozpočet. Pre podrobnosti zapnite položkový rozpis a dopĺňajte jednotlivé riadky.',
    'Pri položkách vyplňte názov a požadované množstvá či ceny. Skontrolujte spoločnú alebo individuálnu sadzbu DPH podľa zvoleného režimu.',
    'Celkový rozpočet pri zapnutom rozpise vychádza z položiek; hlavné pole preto nie je určené na nezávislé prepísanie sumy.',
    'Zákazku uložte a rozpis skontrolujte v jej Prehľade.'
  ], 'Rozpočet je plán alebo dohoda s klientom. Príjem vznikne až samostatným zápisom platby; zadanie rozpočtu samo nevytvorí uhradený príjem.'),
  guide('project-notes', 'Kde si viesť poznámky k zákazke alebo dopytu', 'Zákazky', admin, 'Dohodnuté detaily a interné podklady k zákazke.', 'poznámky zákazka dopyt obchod dohoda text uložiť', [
    'Otvorte zákazku a jej Prehľad. Pri obchodnom dopyte otvorte Prehľad & Poznámky.',
    'Do poznámok zapíšte dohodnuté podrobnosti, požiadavky klienta alebo interné pripomienky.',
    'Dokončite úpravu a skontrolujte uloženie. Text poznámky nie je pracovný zápis, výdavok ani položka cenovej ponuky; tie zapisujte vo vlastných formulároch.'
  ]),
  guide('lead-convert', 'Ako presunúť dohodnutý dopyt do realizácie', 'Cenové ponuky', admin, 'Začatie práce na zákazke bez vytvárania duplicitnej karty.', 'dopyt obchod ponuka schválená prijať začať realizáciu presunúť zákazka', [
    'V Zákazky → Obchod otvorte dopyt, na ktorom ste sa s klientom dohodli.',
    'Skontrolujte klienta, rozpočet a podklady. Kliknite na Začať realizáciu v detaile dopytu.',
    'Potvrďte Začať realizáciu. Zákazka sa presunie medzi realizované zákazky; nezakladajte ju znova cez Pridať zákazku.',
    'Po otvorení realizácie môžete zapisovať dochádzku, materiál, výdavky a PHM.'
  ], 'Stav Ponuka na karte dopytu je iba obchodná fáza. Samotné vystavenie cenovej ponuky ešte neznamená začatie realizácie.'),
  guide('quote-transfer', 'Ako preniesť kalkuláciu do cenovej ponuky', 'Cenové ponuky', admin, 'Použitie pripraveného rozpočtu bez opätovného prepisovania položiek.', 'cenová ponuka preniesť prenesenie údaje kalkulácia rozpočet import vytvoriť', [
    'Otvorte dopyt cez Zákazky → Obchod a prejdite na Rozpočet & Kalkulácia, na mobile Rozpočet.',
    'Doplňte názvy položiek, množstvá, náklady a maržu alebo prirážku. Najprv skontrolujte vypočítané predajné ceny.',
    'Kliknite na Preniesť do Cenovej Ponuky, na mobile Vytvoriť ponuku z rozpočtu.',
    'V otvorenom formulári skontrolujte prenesené riadky aj jednotkové ceny. Doplňte klienta, platnosť, prípadnú zľavu a DPH.',
    'Kliknite na Vystaviť Cenovú Ponuku. Prenos vytvára podklad ponuky; pred uložením ho ešte môžete zmeniť.'
  ], 'Neskoršie zmeny kalkulácie automaticky neprepíšu už vystavenú ponuku. Tú otvorte a upravte samostatne.'),
  guide('quote-items', 'Ako pridať a upraviť položky cenovej ponuky', 'Cenové ponuky', admin, 'Množstvo, merná jednotka, cena a uložené názvy položiek.', 'cenová ponuka položky riadok názov jednotka množstvo cena našeptávač uložené názvy', [
    'V detaile dopytu kliknite na Vytvoriť cenovú ponuku alebo otvorte existujúcu ponuku a zvoľte Upraviť.',
    'V Položkách rozpočtu použite Pridať riadok. Napíšte názov práce alebo materiálu, množstvo, mernú jednotku a jednotkovú cenu.',
    'Ak sa pri názve ponúkne uložená položka, vyberte ju a skontrolujte výsledný text. Ovládanie pri uložených názvoch umožňuje názov upraviť alebo odstrániť.',
    'Skontrolujte cenu riadka a prípadnú DPH. Nepotrebný riadok odstráňte košom, nie vynulovaním náhodného údaja.',
    'Novú ponuku vystavte alebo pri existujúcej kliknite na Uložiť Cenovú Ponuku. Pred poslaním klientovi ju otvorte v náhľade.'
  ]),
  guide('quote-vat-discount', 'Ako nastaviť DPH a zľavu v cenovej ponuke', 'Cenové ponuky', admin, 'Spoločná sadzba, DPH položiek a percentuálna alebo pevná zľava.', 'cenová ponuka DPH sadzba zľava percentuálna pevná cena s bez dane', [
    'Vo formulári cenovej ponuky skontrolujte Započítať DPH. Ak má byť ponuka s daňou, zapnite túto možnosť.',
    'Nastavte Predvolenú DPH. Tlačidlo Použiť prenesie predvolenú sadzbu na položky; následne skontrolujte aj sadzby jednotlivých riadkov.',
    'V poli Zľava vyberte Bez zľavy, Percentuálna (%) alebo Pevná suma (€) a pri zľave doplňte hodnotu.',
    'Skontrolujte zobrazenú zľavu, základ, DPH a konečnú sumu. Percentuálna zľava 10 % pri základe 1 000 € zníži základ o 100 €; 100 € pevnej zľavy odpočíta túto sumu.',
    'Ponuku uložte a skontrolujte výsledný náhľad alebo PDF.'
  ], 'Zapnutie DPH v dokumente nenahrádza správne firemné údaje. IČ DPH a status platiteľa spravujete v Nastaveniach firmy.'),
  guide('quote-edit-pdf', 'Ako upraviť, vymazať alebo stiahnuť existujúcu ponuku', 'Cenové ponuky', admin, 'Práca s už vystavenou cenovou ponukou.', 'cenová ponuka existujúca upraviť vymazať PDF náhľad tlačiť stiahnuť číslo platnosť', [
    'Otvorte Zákazky → Obchod, vyberte dopyt a kartu Cenové ponuky; na mobile Ponuky.',
    'Kliknite na konkrétnu ponuku. Skontrolujte jej číslo, klienta, dátum, platnosť a položky.',
    'Cez Upraviť otvoríte formulár. Zmeny potvrďte tlačidlom Uložiť Cenovú Ponuku; len zatvorenie formulára ich neuloží.',
    'Cez Stiahnuť PDF pripravíte dokument na uloženie alebo tlač. Dokument sa klientovi neposiela automaticky; uložený súbor mu odošlite sami.',
    'Zmazať použite iba pri ponuke, ktorú chcete natrvalo odstrániť. Späť na zoznam vás vráti k ostatným ponukám dopytu.'
  ]),
  guide('calculator-tools', 'Ako používať pomocnú kalkulačku a históriu výpočtov', 'Cenové ponuky', admin, 'Rýchle výpočty popri položkovom rozpočte.', 'kalkulačka výpočet percentá odmocnina mocnina história výsledok', [
    'V dopyte otvorte Rozpočet & Kalkulácia a nájdite pomocnú kalkulačku pod rozpočtom.',
    'Zadajte čísla a operácie. Podľa potreby použite percentá, odmocninu alebo druhú mocninu a výpočet dokončite rovná sa.',
    'Predchádzajúce výpočty nájdete v histórii pri kalkulačke. Nepotrebnú položku histórie odstránite krížikom.',
    'Výsledok použite pri vypĺňaní rozpočtu. Samotné stlačenie rovná sa nevytvorí položku ponuky ani evidovaný výdavok.'
  ], 'História tejto kalkulačky je lokálna pomôcka v danom prehliadači; nepoužívajte ju ako jedinú evidenciu rozpočtu firmy.'),
  guide('material-add', 'Ako zapísať nákup materiálu k zákazke', 'Financie', admin, 'Množstvo, jednotková cena a dodávateľ v jednom zázname.', 'pridať materiál nákup dodávateľ množstvo jednotková cena jednotka denník', [
    'Otvorte zákazku a použite Pridať výdavok alebo Príjmy & výdavky → Pridať pohyb.',
    'Pri výdavku zapnite Je to nákup materiálu? Zobrazí sa formulár materiálu.',
    'Vyplňte názov, množstvo, jednotku, cenu za jednotku a prípadne dodávateľa. Skontrolujte vypočítanú celkovú sumu.',
    'Zvoľte skutočný dátum nákupu a uložte záznam. Materiál sa priradí k zákazke a môže sa zobraziť aj v jej denníku pri danom dni.'
  ], 'Ten istý nákup nezapisujte druhýkrát ako bežný výdavok, inak sa náklad započíta dvakrát.'),
  guide('finance-edit', 'Ako opraviť alebo odstrániť finančný záznam', 'Financie', admin, 'Rozlíšenie ručného výdavku, materiálu, PHM a nákladu práce.', 'financie výdavok príjem opraviť upraviť zmazať materiál PHM mzdy', [
    'V zákazke otvorte Príjmy & výdavky a pri konkrétnom pohybe použite ceruzku. Zmeňte údaje a uložte ich.',
    'Vo Firemnej analytike môžete otvoriť detail pohybu. Ručné záznamy upravíte cez dostupnú akciu v detaile.',
    'Ak ide o náklad práce vypočítaný z dochádzky, opravte zdrojový pracovný zápis v zákazke → Dochádzka. Súhrn mzdy nie je samostatná ručne vystavená faktúra.',
    'Dopravu a PHM opravujte v príslušnej sekcii zákazky. Materiál upravujte ako materiálový záznam vrátane množstva a ceny.',
    'Kôš použite len na nesprávny alebo duplicitný pohyb. Odstránenie nákladu mení súčty zákazky.'
  ]),
  guide('finance-overhead', 'Ako zapísať firemný výdavok bez zákazky', 'Financie', admin, 'Réžia alebo iný pohyb, ktorý nepatrí ku konkrétnej realizácii.', 'firemná analytika výdavok réžia bez zákazky nájom kancelária pohyb', [
    'V hlavnom menu otvorte Financie → Firemná analytika a kliknite na Pridať režijný výdavok.',
    'Vyberte príjem alebo výdavok, dátum, sumu a zodpovedajúcu kategóriu.',
    'V poli Priradiť k stavbe ponechajte možnosť bez konkrétnej zákazky, ak ide o firemnú réžiu. Doplňte zrozumiteľný popis a uložte.',
    'Záznam hľadajte vo Firemnej analytike v období zadaného dátumu. Nebude priradený do nákladov jednej konkrétnej zákazky.'
  ]),
  guide('unpaid-invoices', 'Kde nájdem neuhradené príjmy a ako označiť úhradu', 'Financie', admin, 'Evidencia čakajúcej platby a jej zahrnutie do príjmov.', 'nezaplatené neuhradené faktúry uhradené zaplatené príjem platba pohľadávka', [
    'Vo Firemnej analytike otvorte prehľad Nezaplatené faktúry. Nájdite platbu podľa zákazky, dátumu a sumy.',
    'Keď platbu skutočne prijmete, použite ovládanie úhrady pri danom ručne evidovanom príjme alebo otvorte jeho úpravu.',
    'Skontrolujte, že je označená ako uhradená. Až uhradené príjmy vstupujú do príslušných ukazovateľov príjmu a zisku.',
    'Ak sa záznam nezobrazuje v bežnom zozname, overte obdobie a filtre. Nepíšte tú istú platbu znova iba preto, že ste ju v aktuálnom výbere nenašli.'
  ], 'Táto evidencia nesleduje váš bankový účet automaticky a sama nevystavuje účtovné faktúry.'),
  guide('analytics-charts', 'Ako čítať firemnú analytiku a analytiku zákaziek', 'Financie', admin, 'Obdobia, mesačný graf, kumulatívny vývoj a náklady pracovníkov.', 'analytika graf kumulatívny mesačný celá firma všetky zákazky obdobie zisk náklady', [
    'Firemná analytika slúži na pohyby firmy a ich filtrovanie. Analytika zákaziek porovnáva príjmy, náklady a výsledok zákaziek.',
    'V Analytike zákaziek vyberte konkrétnu zákazku alebo Všetky zákazky. Pri spoločnom pohľade nastavte Tento rok, Minulý rok, 12 mesiacov alebo Celé obdobie.',
    'Mesačný graf porovnáva sumy jednotlivých mesiacov. Kumulatívny zobrazuje postupne narastajúce príjmy a náklady od začiatku sledovaného obdobia.',
    'V rozbore pracovníkov skontrolujte hodiny a náklady. Cena práce môže byť vyššia než mzdová sadzba zamestnanca.',
    'Pri nezrovnalosti najprv porovnajte rovnaké obdobie, úhrady príjmov a zdrojové zápisy. Samotná zmena grafu neopravuje dochádzku ani účtovaný pohyb.'
  ], 'Firemné pohyby bez priradenej zákazky sa nemusia zobrazovať v pohľade Analytika zákaziek. Tieto dva prehľady preto nemusia mať rovnaký výsledok.'),
  guide('phm-edit', 'Ako upraviť dopravu, kilometre alebo doklad k PHM', 'Financie', both, 'Oprava záznamu paliva či kilometrov pri zákazke.', 'PHM doprava kilometre km sadzba doklad fotografia opraviť vymazať', [
    'Administrátor otvorí zákazku → PHM. Poverený zamestnanec otvorí pridelenú zákazku a Dopravu, ak má potrebné oprávnenie.',
    'Pri novom zázname vyberte PHM alebo kilometre. Pri kilometroch zadajte počet km a sadzbu; aplikácia z nich vypočíta sumu.',
    'Doplňte dátum, vozidlo, popis a podľa potreby fotografiu dokladu. Existujúci záznam otvorte na úpravu dostupnou ceruzkou.',
    'Po uložení skontrolujte sumu. Kôš použite na odstránenie nesprávneho záznamu, nie na označenie, že ste výdavok už uhradili.'
  ]),
  guide('advance-edit', 'Ako opraviť zálohu a skontrolovať jej splátky', 'Zálohy', admin, 'Rozlíšenie pôvodnej zálohy a postupne zúčtovaných súm.', 'záloha upraviť vymazať história splátky zostatok čakajúce splatené filter', [
    'Vo Financie → Zálohy vyberte pracovníka a stav Čakajúce, Splatené alebo Všetko.',
    'Kliknutím na kartu otvoríte históriu splátok. Porovnajte pôvodnú sumu, zúčtované splátky a zostatok k vráteniu.',
    'Ceruzkou upravte pôvodnú zálohu, ak bola zadaná chybne. Celkovú sumu nemôžete znížiť pod už zúčtované splátky.',
    'Novú vrátenú sumu nezadávajte znížením pôvodnej zálohy. Použite Zúčtovať splátku, aby zostala zachovaná história.'
  ], 'Trvalé odstránenie zálohy nie je to isté ako jej splatenie.'),
  guide('diary-import', 'Ako preniesť dochádzku do denníka práce', 'Denník práce', both, 'Prenesenie mien a popisov práce do textu konkrétneho dňa.', 'preniesť prenesenie importovať import údaje dochádzka denník práce popisy mená', [
    'Najprv zapíšte dochádzku ku správnej zákazke a dátumu. Pri práci vyplňte aj popis; bez popisu sa nemá aký text preniesť.',
    'Otvorte Denník práce, vyberte tú istú zákazku a v kalendári ten istý deň. Zamestnanec vstupuje cez poverenú zákazku.',
    'V časti priebehu prác kliknite na Importovať z dochádzky. Na menšej obrazovke hľadajte tlačidlo s ikonou importu pri nadpise tejto časti.',
    'Do poznámok pribudnú riadky s menom pracovníka a jeho popisom práce. Existujúci text zostáva; identické riadky sa pri opakovanom importe znova nepridávajú.',
    'Text upravte do výslednej podoby a kliknite na Uložiť záznam. Samotný import ešte nenahrádza uloženie celého denníka.'
  ], 'Prenos nemení pôvodnú dochádzku. Ak sa popis práce neskôr zmení, text denníka skontrolujte; už upravené poznámky nie sú živým prepojením na každý pracovný zápis.'),
  guide('diary-copy', 'Čo skopíruje tlačidlo Kopírovať včerajšok', 'Denník práce', both, 'Prevzatie počasia a mechanizmov z predchádzajúceho kalendárneho dňa.', 'denník kopírovať včerajšok predchádzajúci deň počasie mechanizmy', [
    'V denníku otvorte cieľový deň, do ktorého chcete údaje prevziať.',
    'Hore kliknite na Kopírovať včerajšok, na menšej obrazovke na ikonu dvoch prekrývajúcich sa dokumentov.',
    'Aplikácia hľadá zápis presne z predchádzajúceho kalendárneho dňa. Prevezme údaje o mechanizmoch, počasí a teplotách.',
    'Skontrolujte ich podľa skutočnosti cieľového dňa a použite Uložiť záznam. Ak včera zápis neexistuje, údaje doplňte ručne.'
  ], 'Táto funkcia nekopíruje včerajšiu dochádzku, materiál, fotografie ani text priebehu prác. Prevzaté počasie tiež nie je nové meranie pre dnešný deň.'),
  guide('diary-weather', 'Ako doplniť alebo opraviť počasie v denníku', 'Denník práce', both, 'Automatické údaje podľa polohy zákazky a ručné opravy.', 'denník počasie automatické teplota ráno obed večer poloha meranie ručne', [
    'Otvorte vybraný deň denníka a časť Poveternostné podmienky. Pozrite informáciu o automatickom načítaní.',
    'Automatické počasie potrebuje potvrdenú polohu zákazky. Ak chýba, administrátor ju priradí pri úprave zákazky.',
    'Skontrolujte ranný, obedný a večerný stav počasia a teploty. Budúce meranie ešte nemusí byť dostupné.',
    'Ak sa údaje nenačítali alebo nezodpovedajú situácii na mieste, doplňte či opravte dostupné polia ručne a uložte záznam.'
  ], 'Poloha sa berie zo zákazky. Zmena miesta, z ktorého otvárate aplikáciu, nemá presunúť počasie denníka na inú stavbu.'),
  guide('diary-photos', 'Ako pridať a odstrániť fotografie v denníku', 'Denník práce', both, 'Fotodokumentácia priradená k správnej zákazke a dňu.', 'denník foto fotky fotografie fotodokumentácia nahrať odstrániť PDF', [
    'Otvorte konkrétnu zákazku a deň v denníku. V časti Fotodokumentácia použite Pridať foto.',
    'Vyberte obrázok alebo na podporovanom telefóne použite fotoaparát. Počkajte na dokončenie nahrávania a zobrazenie náhľadu.',
    'Ak ste vybrali nesprávnu fotografiu, odstráňte ju ovládaním na jej náhľade. Pred odstránením si overte, že ju už nepotrebujete.',
    'Uložte záznam denníka. Fotografie skontrolujte aj v pripravenom PDF, najmä pred odoslaním klientovi.'
  ], 'Priebeh nahrávania neprerušujte zatvorením stránky. Fotografie sa pri nahrávaní zmenšujú, aby nezaberali zbytočne veľa úložiska.'),
  guide('diary-overview', 'Ako nájsť starší deň a zákazku v denníku', 'Denník práce', both, 'Výber zákazky, mesiaca a náhľad dňa.', 'denník kalendár mesiac archív ukončené zákazky prehľad starý zápis', [
    'V Denníku práce vyhľadajte zákazku. Ak je ukončená, prepnite zoznam na Ukončené alebo Všetky.',
    'Po výbere zákazky sa zobrazí mesačný prehľad. Prepnutím mesiaca nájdite požadovaný dátum.',
    'Kliknutím na deň otvoríte jeho zápis. Na počítači môže prejdenie myšou ukázať náhľad; na mobile ho zobrazíte dlhším podržaním dňa.',
    'Pri hľadaní práce porovnajte aj správnu zákazku a dátum pôvodnej dochádzky. Denník jednej zákazky nezhromažďuje zápisy všetkých ostatných zákaziek.'
  ], 'Poverený zamestnanec vidí iba zákazky, ku ktorým dostal prístup.'),
  guide('diary-full-export', 'Ako exportovať kompletný denník zákazky', 'PDF exporty', both, 'Rozdiel medzi kompletným denníkom a PDF jedného dňa.', 'denník kompletný celý export PDF všetky dni mesiac dokument', [
    'V Denníku práce vyberte zákazku a zostaňte v jej kalendárnom prehľade. Neotvárajte iba jeden deň.',
    'Ak ste práve upravovali denný zápis, najprv ho uložte a vráťte sa do prehľadu.',
    'V hlavičke denníka kliknite na Export PDF. Táto možnosť pripravuje kompletný denník vybranej zákazky, nie iba mesiac práve zobrazený v kalendári.',
    'Počkajte na generovanie. Výsledok skontrolujte a uložte alebo vytlačte; pri veľkom počte dní a fotografií môže príprava trvať dlhšie.'
  ], 'Pre jediný deň použite PDF priamo v otvorenom dni. Kompletný denník a výkaz prác z hlavičky zákazky sú dva odlišné dokumenty.'),
  guide('calendar-views', 'Ako prechádzať kalendár a nájsť konkrétnu úlohu', 'Kalendár', admin, 'Orientácia v termínoch a otvorenie detailu úlohy.', 'kalendár úlohy mesiac týždeň deň dnes termíny filter', [
    'Otvorte Kalendár. Zobrazuje týždenný rozvrh; šípky pri Aktuálnom týždni posúvajú prehľad o sedem dní dozadu alebo dopredu.',
    'Na úzkom displeji môžete rozvrh posúvať aj vodorovne, aby ste videli ďalšie dni. Skontrolujte dátumy v hlavičke stĺpcov.',
    'Kliknite na konkrétnu úlohu v prehľade. Vo formulári skontrolujte čas, zákazku, priradeného pracovníka a stav.',
    'Ak úlohu hľadáte podľa pracovníka, skontrolujte, komu bola naozaj priradená. Samotné pripojenie zákazky ešte nepriraďuje úlohu jej všetkým zamestnancom.'
  ]),
  guide('calendar-edit', 'Ako zmeniť termín, prioritu alebo dokončiť úlohu', 'Kalendár', admin, 'Úprava existujúcej úlohy a rozdiel medzi dokončením a zmazaním.', 'úloha upraviť termín priorita dokončiť hotovo zmazať kalendár', [
    'V Kalendári otvorte existujúcu úlohu. Upravte začiatok, koniec, priradenie alebo zákazku podľa potreby.',
    'Dôležitú úlohu označte voľbou Označiť ako prioritu. Kategória určuje jej typ a farbu, priorita jej naliehavosť.',
    'Pri dokončenej práci zvoľte Hotovo alebo dostupné označenie dokončenia a potvrďte Uložiť Úlohu.',
    'Zmazať použite, ak úloha vôbec nemala existovať. Na dokončenú úlohu používajte stav, aby zostala v histórii.'
  ], 'Stav úlohy nepridá pracovné hodiny do dochádzky. Tie treba zapísať samostatne.'),
  guide('task-categories', 'Ako vytvoriť vlastné kategórie úloh', 'Kalendár', admin, 'Pomenovanie a farby kategórií používaných pri plánovaní.', 'kategórie úlohy farba názov kalendár nastavenia spravovať kategórie', [
    'Otvorte Nastavenia → Kategórie úloh. Dostanete sa tam aj cez Spravovať kategórie vo formulári úlohy.',
    'Upravte názvy a farby kategórií alebo doplňte ďalšiu kategóriu podľa toho, ako si organizujete prácu.',
    'Kliknite na Uložiť Kategórie. Potom sa vráťte do Kalendára a kategóriu vyberte pri úlohe.'
  ], 'Otvorenie správy kategórií zatvorí formulár úlohy. Rozpracovanú úlohu preto najprv uložte, ak o jej údaje nechcete prísť.'),
  guide('calendar-notifications', 'Ako zapnúť upozornenia na úlohy', 'Nastavenia', admin, 'Povolenie notifikácií pre tento prehliadač alebo zariadenie.', 'notifikácie upozornenia kalendár úlohy push zapnúť povolenie telefón', [
    'Otvorte Nastavenia → Notifikácie a zapnite upozornenia pre kalendár.',
    'Keď sa prehliadač alebo systém opýta na povolenie, povoľte odosielanie upozornení.',
    'Ak je povolenie zablokované, zmeňte ho v nastaveniach stránky alebo aplikácie v zariadení a vráťte sa do nastavení MojaStavba.',
    'Na ďalšom zariadení skontrolujte povolenie znova. Hlásenie aplikácie pri zapnutí vám ukáže, či sa registrácia upozornení podarila.'
  ], 'Systémové nastavenia, režim nerušiť a podpora prehliadača môžu ovplyvniť doručenie. Zapnutie samo nevytvára úlohy ani pracovné zápisy.'),
  guide('worker-expenses', 'Ako zapísať nákup ako poverený zamestnanec', 'Financie', employee, 'Materiál a bežný výdavok iba pri zákazke s prideleným oprávnením.', 'zamestnanec poverený nákup materiál výdavok pridať doklad zákazka', [
    'Otvorte Moje poverené stavby a pri správnej zákazke vyberte Pridať nákup alebo dostupnú správu výdavkov.',
    'V časti Výdavky kliknite na Pridať výdavok. Zákazka je už určená tým, odkiaľ ste formulár otvorili.',
    'Pri materiáli zapnite Je to nákup materiálu? a vyplňte názov, množstvo, jednotku a sumu. Pri službe či inom výdavku doplňte popis a sumu.',
    'Skontrolujte dátum a uložte záznam. Opravu alebo odstránenie vykonajte pri konkrétnom riadku, ak máte tieto akcie dostupné.'
  ], 'Ak možnosť nevidíte, administrátor musí skontrolovať prístup k výdavkom danej zákazky. Táto funkcia nesprístupňuje firemnú analytiku ani výdavky ostatných zákaziek.'),
  guide('worker-language-avatar', 'Ako zmeniť jazyk a profilovú fotografiu zamestnanca', 'Nastavenia', employee, 'Jazyk rozhrania a vlastná fotografia v profile.', 'jazyk angličtina nemčina maďarčina poľština ukrajinčina profil fotografia avatar', [
    'Vo svojom účte otvorte Profil. V časti Jazyk vyberte SK, EN, DE, HU, PL alebo UA.',
    'Rozhranie sa prepne do zvoleného jazyka. Vlastné názvy zákaziek a popisy práce sa tým automaticky neprekladajú.',
    'Profilovú fotografiu zmeníte kliknutím na svoj avatar alebo jeho ikonu úpravy. Vyberte obrázok a počkajte na nahratie a zobrazenie novej fotografie.'
  ]),
  guide('brand-images', 'Ako orezať logo alebo pečiatku pre PDF', 'Nastavenia', admin, 'Príprava obrázka pre firemné dokumenty.', 'logo pečiatka podpis obrázok orezať orezanie PDF dokument', [
    'Otvorte Nastavenia → Všeobecné a pri Logu firmy alebo Pečiatke a podpise vyberte obrázok.',
    'V okne orezania nastavte hranice tak, aby zostal celý požadovaný obsah. Pri logu sledujte aj náhľad použitia v aplikácii a PDF.',
    'Potvrďte pripravený výrez a počkajte na nahratie. Skontrolujte výsledok v nastaveniach aj pri ďalšom exporte.'
  ], 'Obrázok podpisu alebo pečiatky v PDF nie je elektronický podpisový certifikát. Neukladajte do neho údaje, ktoré nechcete zobrazovať na dokumentoch firmy.'),
  guide('subscription-order', 'Ako zmeniť balík a dokončiť objednávku predplatného', 'Účet a podpora', admin, 'Výber balíka, fakturačné údaje a kontrola stavu aktivácie.', 'predplatné balík objednávka platba fakturačné údaje aktivácia faktúra upgrade', [
    'Otvorte Predplatné v hlavnom menu a porovnajte balíky podľa počtu pracovníkov a potrebných funkcií. Na mobile najprv rozbaľte hlavné menu.',
    'Pri vybranom balíku pokračujte do objednávky a vyplňte správne fakturačné údaje a kontaktný email.',
    'V súhrne skontrolujte balík, cenu a údaje. Dokončite objednávku podľa pokynov na obrazovke.',
    'Faktúru a platobné údaje očakávajte na zadanom emaile. Ak sa zobrazuje Čakáme na platbu, objednávka ešte neznamená aktivované predplatné.',
    'Ak platba alebo aktivácia nesedí, kontaktujte podporu a uveďte firmu a údaje objednávky. Neodosielajte opakovane rovnakú objednávku bez kontroly.'
  ]),
  guide('updates', 'Kde nájdem novinky a ako aktualizovať aplikáciu', 'Účet a podpora', both, 'Rozdiel medzi webovou aplikáciou a samostatne nainštalovanou verziou.', 'aktualizácia verzia novinky čo nové obnoviť aplikácia inštalácia', [
    'Administrátor otvorí Aktualizácie v menu. Na webe je tu zoznam noviniek s dátumom a verziou.',
    'Webová aplikácia používa automatické aktualizácie. Pred obnovením stránky alebo prijatím novej verzie dokončite a uložte rozpracované formuláre.',
    'V samostatnej nainštalovanej aplikácii použite dostupnú kontrolu aktualizácie a riaďte sa jej pokynmi; zobrazené ovládanie sa líši podľa platformy.',
    'Ak sa nová funkcia nezobrazuje, overte verziu a znovu otvorte aplikáciu. Pri chybe pošlite podpore aj údaj o zariadení a verzii.'
  ]),
  guide('install-app', 'Ako mať MojaStavba na ploche telefónu alebo počítača', 'Účet a podpora', both, 'Pridanie webovej aplikácie na plochu z prehliadača.', 'nainštalovať inštalácia plocha ikona PWA Android iPhone iPad Windows aplikácia', [
    'Otvorte MojaStavba v prehliadači zariadenia, na ktorom ju chcete používať.',
    'Na iPhone alebo iPade použite v Safari ponuku zdieľania a Pridať na plochu. Na Androide vyhľadajte v ponuke prehliadača inštaláciu aplikácie alebo pridanie na plochu.',
    'Na podporovanom počítači použite ikonu inštalácie pri adresnom riadku alebo príslušnú položku v ponuke prehliadača.',
    'Otvorte novú ikonu na ploche a podľa potreby sa prihláste rovnakým účtom.'
  ], 'Názvy ponúk sa líšia podľa zariadenia a jazyka. Ikona na ploche neznamená, že sa všetky funkcie a ukladanie dát dajú používať bez internetu.'),
  guide('password-reset', 'Čo robiť, keď sa neviem prihlásiť alebo som zabudol heslo', 'Účet a podpora', both, 'Obnovenie prístupu bez zakladania ďalšieho účtu.', 'prihlásenie heslo zabudol obnoviť nefunguje email overenie účet', [
    'Na prihlasovacej obrazovke skontrolujte email a použite Zabudli ste heslo?, ak si heslom nie ste istí.',
    'Zadajte email svojho existujúceho účtu. Otvorte doručenú správu na obnovu hesla; skontrolujte aj spam.',
    'Postupujte podľa odkazu, nastavte nové heslo a prihláste sa znova.',
    'Ak aplikácia žiada overenie emailu, dokončite overenie alebo použite ponúknuté opätovné odoslanie overovacej správy.',
    'Ak sa nedostanete k svojmu emailu alebo chyba pretrváva, kontaktujte podporu. Zamestnanec môže o pomoc požiadať aj administrátora firmy.'
  ], 'Nevytvárajte si ďalší firemný účet iba kvôli zabudnutému heslu. Podpore ani zamestnávateľovi neposielajte svoje heslo.'),
  guide('delete-account', 'Ako požiadať o zmazanie účtu a firemných dát', 'Nastavenia', admin, 'Trvalé zrušenie účtu namiesto archivácie pracovníka alebo zákazky.', 'zmazať účet vymazať firma údaje odstrániť dáta zrušenie', [
    'Ak chcete iba skryť ukončenú zákazku alebo bývalého pracovníka, použite ich archív. Firemný účet kvôli tomu nemažte.',
    'Pre zrušenie firmy otvorte Nastavenia → Zabezpečenie a časť Zmazanie účtu.',
    'Prečítajte si upozornenie k súvisiacim zákazkám, dochádzke a fotografiám. Potrebné dokumenty si vopred exportujte.',
    'Použite Zmazať účet a všetky dáta a postupujte podľa potvrdenia v aplikácii. Odošlete žiadosť o zmazanie; podpora vás má kontaktovať kvôli overeniu totožnosti.'
  ], 'Nejde o okamžité vymazanie ani o odhlásenie. Samotné následné odstránenie dát je nevratné; odhlásenie nájdete samostatne v menu účtu.'),
  guide('ai-assistant', 'Ako používať AI asistenta a čím sa líši od nápovedy', 'Účet a podpora', admin, 'Otázky k používaniu aplikácie v balíku s AI asistentom.', 'AI asistent robot otázka pomoc návod Platinum chat', [
    'Ak máte balík s AI asistentom, otvorte ikonku robota na pravom okraji aplikácie. Zamestnanecký účet túto možnosť nemá.',
    'Napíšte konkrétnu otázku a uveďte sekciu, v ktorej pracujete. Napríklad: Ako prenesiem položky rozpočtu do cenovej ponuky?',
    'Prejdite odporúčaný postup a porovnajte ho s ovládaním na obrazovke. Ak vám nesedí, overte postup cez Nápovedu alebo kontaktujte podporu.',
    'Nápoveda pod otáznikom obsahuje pripravené návody; AI asistent odpovedá na voľne napísané otázky.'
  ], 'Odpoveď asistenta nie je potvrdenie, že sa zápis uložil alebo vykonala operácia. Rozhodujúce je potvrdenie priamo vo formulári aplikácie.'),
  guide('first-steps', 'Ako začať používať aplikáciu vo firme', 'Účet a podpora', admin, 'Od firemných údajov cez tím až po prvú zákazku.', 'začať prvé kroky nová firma nastavenie registrácia zavedenie aplikácia', [
    'Po prihlásení otvorte Nastavenia → Všeobecné a skontrolujte názov firmy, identifikačné údaje, adresu a status platiteľa DPH. Použijú sa aj v dokumentoch.',
    'V Tíme pozvite bežných zamestnancov. Pri krátkodobej výpomoci bez účtu použite dočasného pracovníka. Nastavte sadzby a podľa potreby predvolený obed.',
    'V Zákazky → Realizácia pridajte prvú dohodnutú zákazku. Ak ešte len pripravujete ponuku, pridajte dopyt v Obchode.',
    'Zapíšte skúšobný skutočný pracovný deň do správnej zákazky a skontrolujte ho v Dochádzkach. Materiál a ďalšie náklady zapisujte samostatne podľa ich typu.',
    'Potrebné pracovné postupy nájdete podľa ich názvu v tejto nápovede. Pred prvým odovzdaním klientovi si otvorte a skontrolujte PDF dokument.'
  ]),
  guide('save-trouble', 'Záznam sa neuložil alebo sa po uložení nezobrazuje', 'Účet a podpora', both, 'Ako overiť výsledok bez vytvorenia duplicitného zápisu.', 'uložiť neuložilo zmizlo nezobrazuje chyba internet pripojenie duplicitný zápis', [
    'Pozrite presné hlásenie vo formulári. Skontrolujte pripojenie, povinné polia, dátum a pri dochádzke aj rozsah prestávky.',
    'Ak formulár hlási chybu a údaje v ňom zostali, opravte uvedený problém. Počas ukladania neklikajte opakovane na potvrdenie.',
    'Ak ste nedostali jednoznačné potvrdenie, pred opakovaným zápisom skontrolujte zoznam alebo históriu. Pri výpadku spojenia sa mohol zápis uložiť aj bez zobrazeného potvrdenia.',
    'Skontrolujte vybranú zákazku, pracovníka, mesiac, rok a prípadný archív. Záznam s iným dátumom sa v aktuálnom mesiaci nezobrazí.',
    'Ak výsledok stále nesedí, pošlite podpore sekciu, dátum, meno pracovníka alebo zákazku a presné hlásenie. Nezakladajte ďalšie rovnaké záznamy bez overenia.'
  ]),
  guide('find-work-by-person', 'Kde zistím, kto koľko pracoval a na ktorej zákazke', 'Tím', admin, 'Prehľad jedného pracovníka naprieč zákazkami a mesačný výkaz.', 'kto koľko kde pracoval odpracoval zamestnanec pracovník hodiny zákazky prehľad mesiac', [
    'Otvorte Tím a kliknite na kartu pracovníka. Otvorí sa jeho pracovný prehľad; ceruzka na karte slúži na úpravu profilu.',
    'Zvoľte mesiac. Pri výbere Všetky zákazky uvidíte pracovníkove zápisy z rôznych zákaziek vrátane ich názvov, dátumov, popisov a trvania.',
    'Ak chcete len jednu zákazku, vyberte ju cez Hľadať zákazku. Súčet hodín a nákladov nad zoznamom sa prepočíta pre tento výber.',
    'Pre celý tím na jednej zákazke otvorte Zákazky → vybraná zákazka → Dochádzka. Finančný súhrn prác rozdelí hodiny a náklady podľa pracovníkov.',
    'Ak potrebujete odovzdať mesačný výkaz jedného zamestnanca, otvorte Dochádzky, zvoľte jeho meno a mesiac a použite Generovať PDF.'
  ], 'Hodiny predstavujú čisté trvanie po evidovaných prestávkach. Pri úkole sa odmena určuje pevnou sumou, nie násobením hodín a sadzby.'),
  guide('find-project-work', 'Kde nájdem zoznam prác na konkrétnej zákazke', 'Zákazky', admin, 'Kto pracoval, kedy, koľko hodín a aký popis práce zapísal.', 'zoznam čo sa robilo vykonané práce história zákazka stavba zamestnanci dni popisy', [
    'Otvorte Zákazky a vyberte konkrétnu zákazku. Dokončenú alebo pozastavenú hľadajte aj v Archíve.',
    'V detaile zvoľte Dochádzka; na mobile najprv otvorte Menu zákazky. Nad zoznamom je finančný súhrn a pod ním Denník prác (História).',
    'V jednotlivých zápisoch nájdete meno, dátum, čisté trvanie, časové úseky a popis práce. Kliknutím na zápis otvoríte detail práce.',
    'Ak potrebujete formálny prehľad dňa, otvorte samostatný Denník práce, tú istú zákazku a dátum. Text denníka a fotografie sú iná evidencia než zoznam dochádzky.',
    'Pre odovzdanie zoznamu klientovi použite Stiahnuť PDF v hlavičke zákazky a zvoľte klientsky výkaz.'
  ], 'Zoznam opisuje uložené zápisy. Ak pracovník nevyplnil popis, aplikácia z hodín sama nezistí, akú činnosť vykonával.'),
  guide('find-person-on-project', 'Ako zistím, čo robil konkrétny zamestnanec na zákazke', 'Tím', admin, 'Výber človeka, zákazky a mesiaca bez prehľadávania celého tímu.', 'čo robil zamestnanec konkrétna zákazka práca pracovník filter mesiac popis', [
    'Otvorte Tím, kliknite na pracovníkovu kartu a nastavte požadovaný mesiac.',
    'Cez Hľadať zákazku vyberte danú zákazku. Zoznam sa obmedzí na pracovné zápisy tohto človeka v tejto zákazke a mesiaci.',
    'Pri každom dni si pozrite popis činnosti, dĺžku práce a náklad. Pre ďalší mesiac zmeňte mesiac; pre všetky zákazky zrušte výber konkrétnej zákazky.',
    'Ak chcete porovnať jeho prácu s ostatnými pracovníkmi, prejdite do zákazky → Dochádzka. Tam je súhrn podľa pracovníkov aj spoločná história.'
  ], 'Pred zmenou alebo opätovným zápisom vždy porovnajte správny dátum. Chýbajúci popis činnosti doplníte úpravou pôvodnej dochádzky v zákazke.'),
  guide('worker-restore', 'Dá sa obnoviť omylom archivovaný alebo vymazaný zamestnanec?', 'Tím', admin, 'Čo obnovíte sami z archívu a kedy je potrebná pomoc podpory.', 'obnoviť vrátiť naspäť omylom vymazaný zmazaný odstránený zamestnanec archív história záloha', [
    'Najprv otvorte Tím → Zobraziť archív a vyhľadajte meno. Ak je pracovník tam, bol archivovaný a jeho história zostala zachovaná.',
    'Na karte v archíve použite Obnoviť. Pri dočasnom pracovníkovi s ukončenou spoluprácou skontrolujte nové obdobie vo formulári a uložte ho.',
    'Ak pracovník v archíve nie je, zrušte vyhľadávací filter a overte, že ste v správnej firme. Samotná neprítomnosť v aktuálnom zozname ešte nedokazuje vymazanie.',
    'Ak ste naozaj potvrdili trvalé odstránenie košom, aplikácia nemá používateľský kôš ani tlačidlo Späť na obnovenie. Čo najskôr kontaktujte podporu.',
    'Uveďte firmu, meno a email pracovníka, približný čas odstránenia a či chýbajú aj pracovné zápisy. Nová karta s rovnakým menom sama neobnoví starú históriu.'
  ], 'Obnova po trvalom vymazaní závisí od dostupnej zálohy a musí sa posúdiť individuálne. Nedá sa zaručiť. Na bežné ukončenie spolupráce používajte archiváciu.'),
  guide('find-missing-records', 'Prečo nevidím pracovníka alebo staršie pracovné zápisy', 'Dochádzka', both, 'Kontrola filtrov, dátumu, zákazky a archívu pred opätovným zapisovaním.', 'kde nájsť chýba nevidím zmizol pracovník staré zápisy história filter mesiac rok zákazka', [
    'Skontrolujte dátum a obdobie. Mesačný výkaz neukazuje ostatné mesiace a história zamestnanca môže mať nastavený rok aj mesiac.',
    'Zrušte výber konkrétnej zákazky alebo vyhľadávací text, ak chcete širší prehľad. Pri kontrole jedného človeka overte aj jeho meno vo výbere.',
    'Administrátor nájde neaktívnych pracovníkov v Tím → Zobraziť archív a ukončené zákazky v Archíve zákaziek. Ukončenie spolupráce neznamená, že sa má práca zapisovať znova.',
    'Zamestnanec vidí svoju históriu a iba pridelené možnosti správy zákaziek. Ak nemá prístup, musí ho skontrolovať administrátor.',
    'Až po týchto kontrolách riešte možné neuloženie alebo odstránenie. Pri neistom výsledku kontaktujte administrátora alebo podporu namiesto vytvárania duplicitných zápisov.'
  ]),
  guide('work-documents', 'Aký je rozdiel medzi dochádzkou, denníkom práce a výkazom zákazky', 'PDF exporty', both, 'Ktorý prehľad otvoriť podľa toho, čo chcete zistiť alebo odovzdať.', 'rozdiel dochádzka denník práce výkaz zákazky ktorý dokument PDF nájsť hodiny', [
    'Dochádzka eviduje pracovný čas konkrétneho človeka, prestávku, odmenu a popis. Administrátor v sekcii Dochádzky pripraví mesačný výkaz jedného pracovníka.',
    'Dochádzka v detaile zákazky obsahuje prácu viacerých ľudí na tejto zákazke. Odtiaľ zistíte, kto na nej pracoval a aké popisy uviedol.',
    'Denník práce vedie zápis k zákazke a dňu: priebeh, počasie, mechanizmy a fotografie. Popisy dochádzky doň môžete preniesť, ale výsledný denný text treba samostatne uložiť.',
    'Výkaz zákazky z tlačidla Stiahnuť PDF je dokument pre klienta alebo interný prehľad pre majiteľa. Nie je to totožný dokument s PDF jedného dňa v denníku.'
  ], 'Poverený zamestnanec môže viesť denník iba pri pridelenej zákazke. Firemné a klientské exporty pripravuje administrátor.'),
  guide('deleted-record', 'Čo robiť po omylom vymazanom pracovnom alebo finančnom zázname', 'Účet a podpora', admin, 'Postup pri skutočnom odstránení, nie pri skrytom filtri.', 'omylom vymazaný záznam obnoviť späť kôš dochádzka výdavok príjem história záloha', [
    'Najprv skontrolujte správnu zákazku, dátum a filtre. Záznam mimo aktuálneho obdobia nie je automaticky vymazaný.',
    'Ak ste potvrdili odstránenie košom, príslušný formulár neponúka univerzálne späť ani používateľský kôš na obnovu.',
    'Zapíšte si, o aký druh záznamu šlo, zákazku, pracovníka alebo sumu, dátum záznamu a približný čas odstránenia. Kontaktujte podporu.',
    'Nesľubujte obnovenie celej histórie vytvorením nového záznamu. Pri väčšom rozsahu alebo odstránení celej zákazky najprv dohodnite ďalší postup s podporou.'
  ], 'Možnosť obnovy závisí od dostupných podkladov a záloh. Samostatné obnovenie z archívu sa týka archivovaných pracovníkov či zmien stavu, nie trvalo odstránených záznamov.'),
];

export const normalizeHelpText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const canonical = (word: string) => {
  for (const [prefix, token] of [['zamestnan', 'zamestnanec'], ['pracovnik', 'zamestnanec'], ['prida', 'pridat'], ['zapis', 'zapis'], ['dochadz', 'dochadzka'], ['vydav', 'vydavok'], ['prijm', 'prijem'], ['ponuk', 'ponuka'], ['cenov', 'cenova'], ['prestav', 'obed'], ['pauz', 'obed'], ['nepritom', 'nepritomnost'], ['dovolenk', 'dovolenka'], ['uprav', 'upravit'], ['zmen', 'upravit'], ['nahlad', 'nahlad'], ['vymaz', 'vymazat'], ['zmaz', 'vymazat'], ['archiv', 'archiv'], ['admin', 'admin'], ['prenes', 'prenos'], ['preni', 'prenos'], ['prenos', 'prenos'], ['import', 'prenos'], ['udaj', 'udaje'], ['dennik', 'dennik'], ['export', 'export'], ['rozpoc', 'rozpocet'], ['kalkul', 'kalkulacka'], ['material', 'material'], ['pozvan', 'pozvanka'], ['notifik', 'notifikacia'], ['upozorn', 'notifikacia'], ['faktur', 'faktura'], ['vyexport', 'export'], ['uloz', 'ulozit'], ['kopir', 'kopirovat'], ['prihlas', 'prihlasenie'], ['registr', 'registracia'], ['zaregistr', 'registracia'], ['nepris', 'neprislo'], ['nedoruc', 'neprislo'], ['obnov', 'obnovit'], ['vrat', 'obnovit'], ['najd', 'hladat'], ['najst', 'hladat'], ['hlad', 'hladat'], ['hodin', 'hodiny']]) {
    if (word.startsWith(prefix)) return token;
  }
  return word;
};
const stopwords = new Set(['ako', 'kde', 'co', 'sa', 'si', 'na', 'do', 'v', 'vo', 'a', 'aj', 'je', 'to', 'mi', 'mam', 'mozem', 'chcem', 'prosim', 'pre', 'za', 'som', 'ze', 'z', 'zo', 'ku', 's', 'so', 'o', 'od', 'pri']);
const words = (text: string) => normalizeHelpText(text).split(' ').filter(word => word && !stopwords.has(word)).map(canonical);

export const searchHelp = (query: string, role: HelpRole, category = ''): HelpArticle[] => {
  const terms = [...new Set(words(query.slice(0, 200)))];
  return HELP_ARTICLES.filter(article => article.roles.includes(role) && (!category || article.category === category))
    .map((article, index) => {
      const title = words(article.title);
      const tags = words(article.keywords);
      const body = words([article.summary, ...article.steps, article.note || ''].join(' '));
      let score = 0;
      const match = (list: string[], term: string) => list.some(word => word === term || (term.length >= 2 && word.startsWith(term)));
      for (const term of terms) {
        if (match(title, term)) score += 12;
        else if (match(tags, term)) score += 7;
        else if (match(body, term)) score += 1;
        else return { article, score: -1, index };
      }
      return { article, score, index };
    }).filter(result => result.score >= 0).sort((a, b) => b.score - a.score || a.index - b.index).map(result => result.article);
};
