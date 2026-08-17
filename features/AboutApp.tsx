
import React, { useEffect, useRef, useState } from 'react';
import { LegalModal } from '../components/UI';
import { 
  ArrowLeft, Mail, Phone, Clock, 
  X, ArrowRight, ShieldCheck, Zap, Target, Sparkles, 
  BookOpen, BarChart3, Cloud, Image as ImageIcon, TrendingUp, 
  ChevronRight, ChevronLeft, Maximize2, LayoutGrid, ChevronDown,
  Trophy, Star, Crown, CheckCircle2, Building2, Users, Wallet, Calendar,
  FileCheck, Shield, MapPin, User, HardHat, Info, PieChart, MoreVertical, ZoomIn, ZoomOut, Heart, Crosshair
} from 'lucide-react';
import { PricingModal } from '../components/PricingModal';

const REASONS = [
  {
    id: 1,
    title: "Denník práce",
    brandTitle: "Denník",
    brandHighlight: "práce",
    desc: "Vedenie elektronického denníka práce Vám ušetrí čas a zjednoduší prácu. Ponúka automatický import počasia a vykonaných prác z dochádzky, fotodokumentáciu a mnoho ďalšieho.",
    color: "from-orange-400 to-orange-600",
    theme: "rgba(249, 115, 22, 0.03)",
    preview: "Diary",
    detailImg: "/about-dennik-wide.png",
    overlayImg: "/about-dennik-detail.png"
  },
  {
    id: 2,
    title: "Prehľad zákaziek",
    brandTitle: "Prehľad",
    brandHighlight: "zákaziek",
    desc: "Získajte okamžitý prehľad o ziskovosti zákaziek, o rozsahu a čase prác Vašich zamestnancov, spravujte príjmy a výdavky, alebo tvorte cenové ponuky a rozpočty na pár klikov.",
    color: "from-orange-400 to-orange-600",
    theme: "rgba(249, 115, 22, 0.03)",
    preview: "Projects",
    detailImg: "/about-zakazky-wide.png",
    overlayImg: "/about-zakazky-detail.png"
  },
  {
    id: 3,
    title: "Elektronická dochádzka",
    brandTitle: "Elektronická",
    brandHighlight: "dochádzka",
    desc: "Zamestnanci si zapisujú dochádzku a rozsah prác priamo cez mobilnú aplikáciu MojaStavba, čo zaručí úplný prehľad o ich práci či o mzdových nákladoch.",
    color: "from-orange-400 to-orange-600",
    theme: "rgba(249, 115, 22, 0.03)",
    preview: "Attendance",
    detailImg: "/about-dochadzka-wide.png",
    overlayImg: "/about-dochadzka-detail.png"
  },
  {
    id: 4,
    title: "Správa financií",
    brandTitle: "Komplexná",
    brandHighlight: "analytika",
    desc: "Sledujte príjmy a výdavky, nákupy materiálu, PHM či réžiu firmy v reálnom čase. Prehľadné štatistiky a grafy zabezpečia ucelený pohľad na zdravie firmy a financií.",
    color: "from-orange-400 to-orange-600",
    theme: "rgba(249, 115, 22, 0.03)",
    preview: "Finance",
    detailImg: "/about-financie-wide.png",
    overlayImg: "/about-financie-detail.png"
  },
  {
    id: 5,
    title: "Správa zamestnancov",
    brandTitle: "Správa",
    brandHighlight: "zamestnancov",
    desc: "Každý zamestnanec má vlastný účet a appku priamo vo svojom mobile. Prideľte im rôzne role na konkrétnych zákazkách, ako vedenie denníka či zápis nákladov.",
    color: "from-orange-400 to-orange-600",
    theme: "rgba(249, 115, 22, 0.03)",
    preview: "Team",
    detailImg: "/about-tim-wide.png",
    overlayImg: "/about-tim-detail.png"
  }
];

const ABOUT_PREVIEW_DATA = [
  {
    sidebar: 'Nástenka',
    title: 'Nástenka',
    subtitle: 'Prehľad vašej stavebnej firmy',
    date: '18. marec 2026',
    kpis: [
      { label: 'Aktívne zákazky', value: '18', note: '+2 tento mesiac', tone: 'orange' },
      { label: 'Celkové výnosy', value: '128 560 €', note: '+8,4 %', tone: 'blue' },
      { label: 'Priebežný zisk', value: '32 750 €', note: '+12,5 %', tone: 'green' },
      { label: 'Úlohy na dnes', value: '24', note: '6 po termíne', tone: 'red' },
    ],
    chartTitle: 'Výnosy a náklady',
    chartSub: 'Vývoj za posledných 12 mesiacov',
    chartBadge: '2026',
    sideTitle: 'Náklady podľa kategórie',
    sideSub: 'Tento mesiac',
    sidePills: [
      { label: 'Materiál', value: '46%', tone: 'orange' },
      { label: 'Mzdy', value: '28%', tone: 'blue' },
      { label: 'Služby', value: '16%', tone: 'green' },
      { label: 'Ostatné', value: '10%', tone: 'slate' },
    ],
    bottomLeftTitle: 'Aktuálne zákazky',
    bottomLeftSub: 'Priebeh realizácie',
    bottomLeftRows: [
      { label: 'Rodinný dom Kvetná', value: '72%' },
      { label: 'Bytový dom Pod Hájom', value: '48%' },
      { label: 'Rekonštrukcia kancelárií', value: '86%' },
    ],
    bottomRightTitle: 'Najbližšie úlohy',
    bottomRightSub: 'Dnes',
    bottomRightRows: [
      { label: 'Kontrola dodávky materiálu', sub: '08:30 · Kvetná', owner: 'J. Novák', tone: 'urgent' },
      { label: 'Odovzdanie výkazu práce', sub: '11:00 · Pod Hájom', owner: 'P. Malík', tone: 'normal' },
      { label: 'Obhliadka stavby', sub: '14:30 · Centrum', owner: 'M. Horváth', tone: 'done' },
    ],
    mobileTitle: 'Pracovné skratky',
    mobileLead: 'Rýchly vstup k zákazkám a ponukám',
    mobileActions: ['Nová zákazka', 'Nová úloha', 'Cenová ponuka'],
    mobileCardTitle: 'Dnešný prehľad',
    mobileRows: [
      { label: 'Zákazka po termíne', value: '2' },
      { label: 'Úlohy na dnes', value: '24' },
      { label: 'Zapísané hodiny', value: '06:47' },
    ],
  },
  {
    sidebar: 'Dochádzka',
    title: 'Elektronická dochádzka',
    subtitle: 'Zápis hodín, výkazov a úprav z mobilu',
    date: '18. marec 2026',
    kpis: [
      { label: 'Zapísané hodiny', value: '126', note: '+18 dnes', tone: 'orange' },
      { label: 'Mzdové náklady', value: '8 460 €', note: '+4,1 %', tone: 'blue' },
      { label: 'Schválené záznamy', value: '32', note: '6 čaká', tone: 'green' },
      { label: 'Spätné zápisy', value: '4', note: '2 na kontrolu', tone: 'red' },
    ],
    chartTitle: 'Odpracované hodiny',
    chartSub: 'Vývoj za posledných 7 dní',
    chartBadge: 'Týždeň',
    sideTitle: 'Zamestnanci dnes',
    sideSub: 'Posledný zápis',
    sidePills: [
      { label: 'Zamestnanec č. 1', value: '06:47', tone: 'orange' },
      { label: 'Zamestnanec č. 2', value: '06:47', tone: 'blue' },
      { label: 'Zamestnanec č. 3', value: '07:01', tone: 'green' },
      { label: 'Zamestnanec č. 4', value: '07:15', tone: 'slate' },
    ],
    bottomLeftTitle: 'Spätné zápisy',
    bottomLeftSub: 'Dnes boli dopísané hodiny za iné dni',
    bottomLeftRows: [
      { label: 'Zamestnanec č. 1', value: 'Za deň 11. 8. 2026' },
      { label: 'Zamestnanec č. 2', value: 'Za deň 12. 8. 2026' },
      { label: 'Zamestnanec č. 3', value: 'Za deň 13. 8. 2026' },
    ],
    bottomRightTitle: 'Kontroly dochádzky',
    bottomRightSub: 'Na schválenie',
    bottomRightRows: [
      { label: 'Skontrolovať doplnené hodiny', sub: '06:47 · dnes', owner: 'Mzdárka', tone: 'urgent' },
      { label: 'Potvrdiť odchod z výjazdu', sub: '11:20 · včera', owner: 'Dispečer', tone: 'normal' },
      { label: 'Export pre mzdy', sub: 'zajtra · 08:00', owner: 'Admin', tone: 'done' },
    ],
    mobileTitle: 'Dnešná dochádzka',
    mobileLead: 'Rýchly zápis príchodu a odchodu',
    mobileActions: ['Príchod', 'Odchod', 'Prestávka'],
    mobileCardTitle: 'Zamestnanci',
    mobileRows: [
      { label: 'Zamestnanec č. 1', value: '06:47' },
      { label: 'Zamestnanec č. 2', value: '06:47' },
      { label: 'Zamestnanec č. 3', value: '07:01' },
    ],
  },
  {
    sidebar: 'Tím',
    title: 'Správa zamestnancov',
    subtitle: 'Sadzby, zálohy, výkony a právomoci',
    date: '18. marec 2026',
    kpis: [
      { label: 'Aktívny tím', value: '14', note: '3 noví členovia', tone: 'orange' },
      { label: 'Priradené roly', value: '6', note: 'všetko pod kontrolou', tone: 'blue' },
      { label: 'Zálohy', value: '2 350 €', note: '+180 € tento týždeň', tone: 'green' },
      { label: 'Výkonnosť', value: '94%', note: 'na pláne', tone: 'red' },
    ],
    chartTitle: 'Rozdelenie tímu',
    chartSub: 'Roly a zodpovednosti',
    chartBadge: 'Tím',
    sideTitle: 'Role v tíme',
    sideSub: 'Rýchly prehľad',
    sidePills: [
      { label: 'Majster', value: '2', tone: 'orange' },
      { label: 'Stavbyvedúci', value: '4', tone: 'blue' },
      { label: 'Robotníci', value: '8', tone: 'green' },
      { label: 'Administratíva', value: '2', tone: 'slate' },
    ],
    bottomLeftTitle: 'Najvyťaženejší členovia',
    bottomLeftSub: 'Tento mesiac',
    bottomLeftRows: [
      { label: 'Ivan Javorčík', value: '96 %' },
      { label: 'Peter Malík', value: '91 %' },
      { label: 'Martin Horváth', value: '88 %' },
    ],
    bottomRightTitle: 'Schvaľovania',
    bottomRightSub: 'Čakajú na vás',
    bottomRightRows: [
      { label: 'Zmena hodinovej sadzby', sub: '1 čaká na kontrolu', owner: 'HR', tone: 'urgent' },
      { label: 'Nový člen tímu', sub: 'pozvánka odoslaná', owner: 'Admin', tone: 'normal' },
      { label: 'Úprava právomocí', sub: 'hotovo', owner: 'Vedúci', tone: 'done' },
    ],
    mobileTitle: 'Tím na očiach',
    mobileLead: 'Zmeny, výkony a schválenia',
    mobileActions: ['Nový zamestnanec', 'Rola', 'Záloha'],
    mobileCardTitle: 'Najbližšie úlohy',
    mobileRows: [
      { label: 'Kontrola výkonu', value: '14:30' },
      { label: 'Zmena roly', value: '16:00' },
      { label: 'Záloha', value: '16:30' },
    ],
  },
  {
    sidebar: 'Denník práce',
    title: 'Denník práce',
    subtitle: 'Fotky, záznamy a automatický import z dochádzky',
    date: '18. marec 2026',
    kpis: [
      { label: 'Záznamy', value: '38', note: '+5 dnes', tone: 'orange' },
      { label: 'Fotografie', value: '126', note: 'priložené', tone: 'blue' },
      { label: 'Výkazy', value: '17', note: 'pripravené na PDF', tone: 'green' },
      { label: 'Chýbajúce vstupy', value: '3', note: 'treba doplniť', tone: 'red' },
    ],
    chartTitle: 'Denné záznamy',
    chartSub: 'Aktivity za posledný týždeň',
    chartBadge: 'Týždeň',
    sideTitle: 'Fotodokumentácia',
    sideSub: 'Posledné príspevky',
    sidePills: [
      { label: 'Murovanie', value: '12 fotiek', tone: 'orange' },
      { label: 'Betonáž', value: '9 fotiek', tone: 'blue' },
      { label: 'Úprava terénu', value: '7 fotiek', tone: 'green' },
      { label: 'Kontrola kvality', value: '4 fotky', tone: 'slate' },
    ],
    bottomLeftTitle: 'Posledné práce',
    bottomLeftSub: 'Z denníka sa prenášajú automaticky',
    bottomLeftRows: [
      { label: 'Murovanie priečok', value: '12:00 · Kvetná' },
      { label: 'Montáž okien', value: '14:30 · Centrum' },
      { label: 'Betonáž schodiska', value: '16:00 · Pod Hájom' },
    ],
    bottomRightTitle: 'Na doplnenie',
    bottomRightSub: 'Dnes večer',
    bottomRightRows: [
      { label: 'Pripojiť fotografie', sub: 'murovanie priečok', owner: 'Marek', tone: 'urgent' },
      { label: 'Exportovať výkaz', sub: 'za 18. marec', owner: 'Admin', tone: 'normal' },
      { label: 'Doplniť materiál', sub: 'centrálna stavba', owner: 'Vedúci', tone: 'done' },
    ],
    mobileTitle: 'Denné úlohy',
    mobileLead: 'Rýchly zápis a prílohy',
    mobileActions: ['Foto', 'Poznámka', 'Dokument'],
    mobileCardTitle: 'Rozpracované práce',
    mobileRows: [
      { label: 'Murovanie priečok', value: '12:00' },
      { label: 'Montáž okien', value: '14:30' },
      { label: 'Betonáž schodiska', value: '16:00' },
    ],
  },
  {
    sidebar: 'Financie',
    title: 'Správa financií',
    subtitle: 'Prehľad výnosov, nákladov a zisku',
    date: '18. marec 2026',
    kpis: [
      { label: 'Výnosy', value: '128 560 €', note: '+8,4 %', tone: 'orange' },
      { label: 'Náklady', value: '95 810 €', note: '+5,2 %', tone: 'blue' },
      { label: 'Zisk', value: '32 750 €', note: '+12,5 %', tone: 'green' },
      { label: 'Marža', value: '25,4 %', note: 'stabilná', tone: 'red' },
    ],
    chartTitle: 'Výnosy a náklady',
    chartSub: 'Vývoj za posledných 12 mesiacov',
    chartBadge: '2026',
    sideTitle: 'Náklady podľa kategórie',
    sideSub: 'Tento mesiac',
    sidePills: [
      { label: 'Materiál', value: '46%', tone: 'orange' },
      { label: 'Mzdy', value: '28%', tone: 'blue' },
      { label: 'Stroje', value: '16%', tone: 'green' },
      { label: 'Ostatné', value: '10%', tone: 'slate' },
    ],
    bottomLeftTitle: 'Stavy zákaziek',
    bottomLeftSub: 'Ziskovosť v reálnom čase',
    bottomLeftRows: [
      { label: 'Rodinný dom Kvetná', value: '72%' },
      { label: 'Bytový dom Pod Hájom', value: '48%' },
      { label: 'Rekonštrukcia kancelárií', value: '86%' },
    ],
    bottomRightTitle: 'Finančné úlohy',
    bottomRightSub: 'Dnes',
    bottomRightRows: [
      { label: 'Skontrolovať faktúry', sub: '3 nové doklady', owner: 'Účtovníctvo', tone: 'urgent' },
      { label: 'Zálohy zamestnancov', sub: '2 na potvrdenie', owner: 'Admin', tone: 'normal' },
      { label: 'Export pre daňové priznanie', sub: 'pripraviť PDF', owner: 'Mzdárka', tone: 'done' },
    ],
    mobileTitle: 'Finančný prehľad',
    mobileLead: 'Zisk, náklady a kategórie',
    mobileActions: ['Výnos', 'Náklad', 'Zisk'],
    mobileCardTitle: 'Kategórie',
    mobileRows: [
      { label: 'Materiál', value: '46%' },
      { label: 'Mzdy', value: '28%' },
      { label: 'Stroje', value: '16%' },
    ],
  },
  {
    sidebar: 'Kalendár',
    title: 'Kalendár a úlohy',
    subtitle: 'Plánovanie práce, termíny a pripomienky',
    date: '18. marec 2026',
    kpis: [
      { label: 'Dnešné úlohy', value: '24', note: '6 po termíne', tone: 'orange' },
      { label: 'Pripomienky', value: '13', note: 'nastavené', tone: 'blue' },
      { label: 'Zamestnanci', value: '8', note: 'priradení', tone: 'green' },
      { label: 'Dnes dokončené', value: '9', note: 'v poriadku', tone: 'red' },
    ],
    chartTitle: 'Kalendár plánu',
    chartSub: 'Prehľad najbližších dní',
    chartBadge: 'Týždeň',
    sideTitle: 'Dnešný harmonogram',
    sideSub: 'Pripomienky a termíny',
    sidePills: [
      { label: '08:30 Kontrola materiálu', value: 'Kvetná', tone: 'orange' },
      { label: '11:00 Odovzdanie výkazu', value: 'Pod Hájom', tone: 'blue' },
      { label: '14:30 Obhliadka', value: 'Centrum', tone: 'green' },
      { label: '16:00 Uzávierka', value: 'kancelária', tone: 'slate' },
    ],
    bottomLeftTitle: 'Aktuálne termíny',
    bottomLeftSub: 'Najbližšie plánované body',
    bottomLeftRows: [
      { label: 'Kontrola dodávky materiálu', value: '08:30 · Kvetná' },
      { label: 'Odovzdanie výkazu práce', value: '11:00 · Pod Hájom' },
      { label: 'Obhliadka stavby', value: '14:30 · Centrum' },
    ],
    bottomRightTitle: 'Pripomienky',
    bottomRightSub: 'Hodina, 15 minút a start',
    bottomRightRows: [
      { label: 'Hodinu pred začiatkom', sub: 'pošle upozornenie', owner: 'Kalendár', tone: 'urgent' },
      { label: '15 minút pred začiatkom', sub: 'krátke upozornenie', owner: 'Kalendár', tone: 'normal' },
      { label: 'Pri začiatku úlohy', sub: 'bezprostredné hlásenie', owner: 'Kalendár', tone: 'done' },
    ],
    mobileTitle: 'Kalendár v mobile',
    mobileLead: 'Úlohy, termíny a upozornenia',
    mobileActions: ['Úloha', 'Termín', 'Pripomienka'],
    mobileCardTitle: 'Najbližšie udalosti',
    mobileRows: [
      { label: 'Kontrola materiálu', value: '08:30' },
      { label: 'Odovzdanie výkazu', value: '11:00' },
      { label: 'Obhliadka stavby', value: '14:30' },
    ],
  },
  {
    sidebar: 'Prehľad',
    title: 'Všetko spolu',
    subtitle: 'Jedna appka pre zákazky, tím, financie aj kalendár',
    date: '18. marec 2026',
    kpis: [
      { label: 'Zákazky', value: '18', note: 'aktívne', tone: 'orange' },
      { label: 'Ľudia', value: '14', note: 'v tíme', tone: 'blue' },
      { label: 'Zisk', value: '32 750 €', note: 'priebežný', tone: 'green' },
      { label: 'Úlohy', value: '24', note: 'dnes', tone: 'red' },
    ],
    chartTitle: 'Prehľad firmy',
    chartSub: 'Kombinovaný pohľad na všetky sekcie',
    chartBadge: 'Live',
    sideTitle: 'Rýchle odkazy',
    sideSub: 'Najpoužívanejšie časti',
    sidePills: [
      { label: 'Zákazky', value: '18', tone: 'orange' },
      { label: 'Dochádzka', value: '126 h', tone: 'blue' },
      { label: 'Denník', value: '38', tone: 'green' },
      { label: 'Kalendár', value: '24', tone: 'slate' },
    ],
    bottomLeftTitle: 'Rozpracované veci',
    bottomLeftSub: 'Z celého systému',
    bottomLeftRows: [
      { label: 'Dopyt z Kvetnej', value: 'v realizácii' },
      { label: 'Dochádzka dopísaná', value: 'dnes 06:47' },
      { label: 'Ziskovosť kontrolovaná', value: '32 750 €' },
    ],
    bottomRightTitle: 'Čo treba dnes',
    bottomRightSub: 'Zhrnutie všetkého',
    bottomRightRows: [
      { label: 'Skontrolovať zákazky', sub: '3 body', owner: 'Admin', tone: 'urgent' },
      { label: 'Potvrdiť dochádzku', sub: '2 záznamy', owner: 'Mzdárka', tone: 'normal' },
      { label: 'Export výkazu', sub: '1 klik', owner: 'Vedúci', tone: 'done' },
    ],
    mobileTitle: 'Rýchly prehľad',
    mobileLead: 'Všetko dôležité na jednom mieste',
    mobileActions: ['Zákazka', 'Dochádzka', 'Kalendár'],
    mobileCardTitle: 'Dnešné priority',
    mobileRows: [
      { label: 'Skontrolovať výkaz', value: '08:30' },
      { label: 'Potvrdiť hodiny', value: '11:00' },
      { label: 'Exportovať PDF', value: '14:30' },
    ],
  },
];

const DemoAppPreview = ({ demo, activeIndex }: { demo: any; activeIndex: number }) => {
  const sidebarItems = ['Nástenka', 'Zákazky', 'Dochádzka', 'Denník práce', 'Kalendár', 'Tím', 'Financie', 'Analytika', 'Nastavenia'];

  return (
    <div className="relative flex-1 cursor-default bg-white rounded-[2rem] sm:rounded-[2.5rem] p-2 shadow-[0_35px_90px_-25px_rgba(15,23,42,0.35)] border border-orange-100 animate-in zoom-in-95 fade-in duration-700 overflow-hidden aspect-[16/10] max-h-[560px]">
      <div className="absolute inset-0 bg-orange-600/5 pointer-events-none" />
      <div className="relative landing-app-shell h-full overflow-hidden bg-slate-50 text-left">
        <aside className="landing-app-sidebar">
          <div className="landing-app-brand">
            <img src="/icon-only.png" alt="" />
            <strong>Moja<span>Stavba</span></strong>
          </div>
          <nav>
            {sidebarItems.map((item, idx) => (
              <div key={item} className={idx === activeIndex ? 'is-active' : ''}>
                <LayoutGrid aria-hidden="true" />
                <span>{item}</span>
                {item === 'Financie' && <ChevronDown className="landing-app-nav-chevron" aria-hidden="true" />}
              </div>
            ))}
          </nav>
          <div className="landing-app-user">
            <span>MF</span>
            <div><b>Moja firma</b><small>Administrátor</small></div>
          </div>
        </aside>

        <div className="landing-app-workspace">
          <main className="landing-app-dashboard">
            <div className="landing-app-heading">
              <div>
                <h3>{demo.title}</h3>
                <p>{demo.subtitle}</p>
              </div>
              <span>{demo.date}</span>
            </div>

            <div className="landing-app-kpis">
              {demo.kpis.map((kpi: any) => (
                <article key={kpi.label} className={`tone-${kpi.tone}`}>
                  <div><span>{kpi.label}</span><i /></div>
                  <strong>{kpi.value}</strong>
                  <small>{kpi.note}</small>
                </article>
              ))}
            </div>

            <div className="landing-app-analytics">
              <article className="landing-app-linechart">
                <div className="landing-chart-title">
                  <div>
                    <b>{demo.chartTitle}</b>
                    <span>{demo.chartSub}</span>
                  </div>
                  <em>{demo.chartBadge}⌄</em>
                </div>
                <div className="landing-chart-legend">
                  <span className="revenue">Výnosy</span>
                  <span className="costs">Náklady</span>
                </div>
                <svg viewBox="0 0 300 92" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="landingRevenueFillAbout" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#fb923c" stopOpacity=".22"/>
                      <stop offset="1" stopColor="#fb923c" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <g className="grid">
                    <path d="M0 18H300M0 40H300M0 62H300M0 84H300"/>
                    <path d="M30 0V92M85 0V92M140 0V92M195 0V92M250 0V92"/>
                  </g>
                  <path className="area" d="M0 78 C22 76 28 68 48 69 S77 58 97 60 S125 49 145 51 S173 34 193 39 S223 22 244 25 S273 10 300 12 L300 92 L0 92Z"/>
                  <path className="income" d="M0 78 C22 76 28 68 48 69 S77 58 97 60 S125 49 145 51 S173 34 193 39 S223 22 244 25 S273 10 300 12"/>
                  <path className="expense" d="M0 82 C27 79 35 76 55 77 S87 70 105 72 S132 63 153 65 S183 55 204 58 S235 45 256 49 S281 39 300 42"/>
                </svg>
                <div className="landing-chart-months">
                  <span>Jan</span><span>Mar</span><span>Máj</span><span>Júl</span><span>Sep</span><span>Nov</span>
                </div>
              </article>

              <article className="landing-app-donut-card">
                <div className="landing-chart-title">
                  <div>
                    <b>{demo.sideTitle}</b>
                    <span>{demo.sideSub}</span>
                  </div>
                  <em>•••</em>
                </div>
                <div className="landing-donut-content">
                  <div className="landing-donut">
                    <div>
                      <strong>{demo.kpis[0]?.value}</strong>
                      <span>spolu</span>
                    </div>
                  </div>
                  <ul>
                    {demo.sidePills.map((pill: any) => (
                      <li key={pill.label} className={pill.tone}>
                        {pill.label} <b>{pill.value}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </div>

            <div className="landing-app-bottom">
              <article>
                <div className="landing-chart-title">
                  <div>
                    <b>{demo.bottomLeftTitle}</b>
                    <span>{demo.bottomLeftSub}</span>
                  </div>
                  <em>Zobraziť všetky →</em>
                </div>
                {demo.bottomLeftRows.map((row: any, idx: number) => (
                  <div key={row.label} className="landing-project-row">
                    <span>{row.label}</span>
                    <i><b style={{ width: `${72 - idx * 12}%` }} /></i>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </article>
              <article>
                <div className="landing-chart-title">
                  <div>
                    <b>{demo.bottomRightTitle}</b>
                    <span>{demo.bottomRightSub}</span>
                  </div>
                  <em>Kalendár →</em>
                </div>
                {demo.bottomRightRows.map((row: any) => (
                  <div key={row.label} className="landing-task-row">
                    <i className={row.tone === 'urgent' ? 'urgent' : row.tone === 'done' ? 'done' : ''} />
                    <span>
                      <b>{row.label}</b>
                      <small>{row.sub}</small>
                    </span>
                    <em>{row.owner}</em>
                  </div>
                ))}
              </article>
            </div>
          </main>
        </div>
      </div>

      <div className="absolute -right-2 bottom-4 hidden sm:block w-[240px] sm:w-[260px]">
        <div className="relative rounded-[2rem] border-[7px] border-slate-900 bg-white shadow-[0_20px_50px_-15px_rgba(15,23,42,0.35)] overflow-hidden">
          <div className="absolute left-1/2 top-0 h-4 w-28 -translate-x-1/2 rounded-b-2xl bg-slate-900" />
          <div className="px-3 pt-5 pb-3">
            <div className="mb-3 flex items-center justify-between text-[9px] font-black text-slate-900">
              <span>9:00</span>
              <span>▂▆▇</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <img src="/icon-only.png" className="h-5 w-5 object-contain" alt="" />
                <strong className="text-[10px]">Moja<span className="text-orange-600">Stavba</span></strong>
              </div>
              <span className="text-[10px] text-slate-500">⇥</span>
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-2.5">
              <div className="text-center text-[10px] font-black uppercase tracking-wide text-slate-800">{demo.mobileTitle}</div>
              <div className="mt-1 text-center text-[9px] text-slate-500">{demo.mobileLead}</div>
              <div className="mt-3 space-y-1.5">
                {demo.mobileActions.map((action: string) => (
                  <div key={action} className="flex items-center justify-between rounded-xl border border-slate-100 px-2.5 py-1.5 text-[9px] font-semibold text-slate-700">
                    <span className="text-orange-500">+</span>
                    <span>{action}</span>
                    <span className="text-slate-300">›</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50/60 p-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-600 text-white text-[10px]">⌛</div>
                <div>
                  <div className="text-[9px] font-black text-slate-800">{demo.mobileCardTitle}</div>
                  <div className="text-[8px] text-slate-500">Demo údaje pre náhľad</div>
                </div>
              </div>
              <div className="mt-2 space-y-1.5">
                {demo.mobileRows.map((row: any) => (
                  <div key={row.label} className="flex items-center justify-between rounded-xl bg-white/80 px-2.5 py-1.5 text-[8px] font-semibold text-slate-700">
                    <span>{row.label}</span>
                    <span className="text-orange-600">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="h-5 bg-slate-900" />
        </div>
      </div>
    </div>
  );
};

const ABOUT_FEATURE_PILLARS = [
  {
    image: '/about-setri-cas.png',
    line1: 'ŠETRÍ',
    line2: 'ČAS',
    alt: 'Šetrí čas'
  },
  {
    image: '/about-zvysuje-kontrolu.png',
    line1: 'ZVYŠUJE',
    line2: 'KONTROLU',
    alt: 'Zvyšuje kontrolu'
  },
  {
    image: '/about-zjednodusuje-pracu.png',
    line1: 'ZJEDNODUŠUJE',
    line2: 'PRÁCU',
    alt: 'Zjednodušuje prácu'
  },
  {
    image: '/about-podporuje-rast.png',
    line1: 'PODPORUJE',
    line2: 'RAST',
    alt: 'Podporuje rast'
  },
];

export const AboutApp = ({ onStart, onLogin, onBack, onLandingSection }: { onStart: () => void; onLogin: () => void; onBack: () => void; onLandingSection: (sectionId: string) => void }) => {
  const [showLegal, setShowLegal] = useState<'vop' | 'gdpr' | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFeatureSwitching, setIsFeatureSwitching] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const featureSwitchTimeout = useRef<number | null>(null);

  const active = REASONS[currentIdx];
  const useLayeredPreview = true;
  const menuBtnStyle = "inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-orange-700 rounded-full hover:bg-orange-50 transition-all whitespace-nowrap active:scale-95";
  const menuIconStyle = "text-slate-400 group-hover:text-orange-600 transition-colors";
  const scrollMainToTop = () => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToFeatureSection = () => onLandingSection('funkcie');
  const scrollToContact = () => onLandingSection('kontakt');

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    switchFeature((currentIdx - 1 + REASONS.length) % REASONS.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    switchFeature((currentIdx + 1) % REASONS.length);
  };

  const switchFeature = (nextIdx: number) => {
    if (nextIdx === currentIdx) return;
    if (featureSwitchTimeout.current) window.clearTimeout(featureSwitchTimeout.current);

    setIsFeatureSwitching(true);
    featureSwitchTimeout.current = window.setTimeout(() => {
      setCurrentIdx(nextIdx);
      window.requestAnimationFrame(() => setIsFeatureSwitching(false));
    }, 90);
  };

  useEffect(() => {
    setLightboxZoom(1);
  }, [currentIdx, showLightbox]);

  useEffect(() => {
    REASONS.forEach((reason) => {
      [reason.detailImg, reason.overlayImg].filter(Boolean).forEach((src) => {
        const img = new window.Image();
        img.src = src as string;
      });
    });

    return () => {
      if (featureSwitchTimeout.current) window.clearTimeout(featureSwitchTimeout.current);
    };
  }, []);

  return (
    <div className="landing-shell min-h-screen bg-white text-slate-900 font-sans selection:bg-orange-100 flex flex-col scroll-smooth transition-colors duration-[1500ms] overflow-x-hidden">
      
      {/* --- LIGHTBOX --- */}
      {showLightbox && (
          <div className="fixed inset-0 z-[1000] bg-slate-950/95 sm:bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300" onClick={() => setShowLightbox(false)}>
              {/* Nice Close Button with Animation - Now Orange */}
              <button 
                onClick={() => setShowLightbox(false)} 
                className="absolute top-4 right-4 sm:top-6 sm:right-6 text-orange-500 hover:text-orange-400 transition-all hover:rotate-90 hover:scale-110 p-3 sm:p-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 z-[1020] shadow-xl"
              >
                <X size={24} className="sm:hidden"/>
                <X size={32} className="hidden sm:block"/>
              </button>
              
              {/* Lightbox Nav */}
              <button onClick={handlePrev} className="absolute left-1 sm:left-2 md:left-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 md:p-3 text-white bg-black/20 backdrop-blur-sm border border-white/10 rounded-full transition-all z-[1010] active:scale-90 hover:scale-110 hover:bg-black/40">
                <ChevronLeft size={24} className="sm:hidden"/>
                <ChevronLeft size={32} className="hidden sm:md:hidden"/>
                <ChevronLeft size={40} className="hidden md:block"/>
              </button>
              <button onClick={handleNext} className="absolute right-1 sm:right-2 md:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 md:p-3 text-white bg-black/20 backdrop-blur-sm border border-white/10 rounded-full transition-all z-[1010] active:scale-90 hover:scale-110 hover:bg-black/40">
                <ChevronRight size={24} className="sm:hidden"/>
                <ChevronRight size={32} className="hidden sm:md:hidden"/>
                <ChevronRight size={40} className="hidden md:block"/>
              </button>

              <div className="h-[100dvh] w-full max-w-[98vw] sm:h-auto sm:max-w-[95vw] flex flex-col items-center justify-center gap-4 sm:gap-10 animate-in zoom-in-95 duration-500 px-10 py-16 sm:px-12 sm:py-0" onClick={e => e.stopPropagation()}>
                  <div key={`lightbox-img-${active.id}`} className="relative flex max-h-full w-full flex-1 items-center overflow-auto overscroll-contain animate-in fade-in slide-in-from-bottom-4 duration-700 sm:w-auto sm:flex-none sm:overflow-visible">
                    <img 
                      src={active.detailImg} 
                      style={{ width: lightboxZoom === 1 ? '100%' : `${lightboxZoom * 100}%`, maxWidth: lightboxZoom === 1 ? '100%' : 'none' }}
                      className="mx-auto rounded-xl border border-white/10 object-contain shadow-2xl touch-pan-x touch-pan-y sm:!w-auto sm:!max-w-none sm:max-h-[85vh] sm:rounded-[2rem] sm:border-4 md:rounded-[2.5rem]" 
                      alt={active.title} 
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/35 p-1.5 text-white backdrop-blur sm:hidden">
                    <button type="button" onClick={() => setLightboxZoom(value => Math.max(1, value - 0.5))} disabled={lightboxZoom <= 1} aria-label="Oddialiť obrázok" className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-30"><ZoomOut size={20}/></button>
                    <span className="min-w-12 text-center text-xs font-bold">{Math.round(lightboxZoom * 100)} %</span>
                    <button type="button" onClick={() => setLightboxZoom(value => Math.min(3, value + 0.5))} disabled={lightboxZoom >= 3} aria-label="Priblížiť obrázok" className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-30"><ZoomIn size={20}/></button>
                  </div>
                  {/* Indicators - Increased contrast */}
                  <div className="flex gap-2 sm:gap-3">
                      {REASONS.map((_, i) => (
                          <div key={i} className={`h-1 sm:h-1.5 rounded-full transition-all duration-500 ${i === currentIdx ? 'w-8 sm:w-12 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'w-2 sm:w-3 bg-white/50'}`} />
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* --- HEADER --- */}
      <header className="relative z-[100]">
        <nav className="landing-header-nav sticky top-0 border-b border-slate-100 bg-white/95 backdrop-blur-md">
          <div className="landing-header-inner mx-auto flex items-center justify-between gap-2">
            <a href="/" onClick={(e) => { e.preventDefault(); onBack(); }} className="flex items-center gap-1.5 md:gap-2.5 min-w-0 shrink hover:opacity-80 transition">
              <img
                src="/icon-only.png"
                alt="MojaStavba Logo"
                className="landing-header-logo object-contain shrink-0"
              />
              <span className="landing-header-wordmark brand-wordmark truncate">Moja<span className="brand-wordmark-accent">Stavba</span></span>
            </a>

            <div className="landing-header-menu absolute left-1/2 hidden -translate-x-1/2 items-center md:flex">
              <button onClick={scrollMainToTop} className={`${menuBtnStyle} group`}>
                O aplikácii
              </button>
              <button onClick={scrollToFeatureSection} className={`${menuBtnStyle} group`}>
                Funkcie
              </button>
              <button onClick={() => setShowPricing(true)} className={`${menuBtnStyle} group`}>
                Cenník
              </button>
              <button onClick={scrollToContact} className={`${menuBtnStyle} group`}>
                Kontakt
              </button>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <button onClick={onLogin} className={`${menuBtnStyle} group`}>
                <User size={16} className={menuIconStyle} />
                Prihlásiť sa
              </button>
              <button
                onClick={onStart}
                className="landing-header-cta inline-flex items-center justify-center gap-2 font-bold leading-none text-white bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-100 transition transform hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
              >
                Vyskúšať zadarmo
                <ArrowRight size={16} strokeWidth={2.5} className="shrink-0" />
              </button>
            </div>

            <div className="flex md:hidden items-center gap-2 shrink-0">
              <button
                onClick={onStart}
                className="inline-flex items-center justify-center px-3 py-2 text-[10px] font-bold leading-none text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-md shadow-orange-100 active:scale-95 whitespace-nowrap"
              >
                Vyskúšať zadarmo
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-slate-500 hover:text-orange-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                {isMobileMenuOpen ? <X size={24} /> : <MoreVertical size={24} />}
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-2xl animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 space-y-2">
                <button
                  onClick={() => { scrollMainToTop(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-3"><Info size={18} className="text-orange-500"/>O aplikácii</span>
                  <ChevronRight size={18} className="text-slate-300"/>
                </button>
                <button
                  onClick={() => { scrollToFeatureSection(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-3"><Sparkles size={18} className="text-orange-500"/>Funkcie</span>
                  <ChevronRight size={18} className="text-slate-300"/>
                </button>
                <button
                  onClick={() => { setShowPricing(true); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-3"><Crown size={18} className="text-orange-500"/>Cenník</span>
                  <ChevronRight size={18} className="text-slate-300"/>
                </button>
                <button
                  onClick={() => { scrollToContact(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-3"><Mail size={18} className="text-orange-500"/>Kontakt</span>
                  <ChevronRight size={18} className="text-slate-300"/>
                </button>
                <button
                  onClick={() => { onLogin(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-orange-50 font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-3"><User size={18} className="text-orange-500"/>Prihlásiť sa</span>
                  <ChevronRight size={18} className="text-slate-300"/>
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      <main ref={mainRef} className="flex-1 flex flex-col overflow-y-auto no-scrollbar scroll-smooth">
        
        {/* --- HERO SHOWCASE --- */}
        <section id="funkcie" className="hidden">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl aspect-square bg-gradient-to-br ${active.color} opacity-[0.04] blur-[150px] rounded-full transition-all duration-1500 pointer-events-none`}></div>

            {/* Layout Container */}
            <div className="landing-desktop-shell relative z-10 w-full">
              <div className="grid w-full grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)] gap-7 lg:gap-8 xl:gap-9 items-start relative">
                
                {/* LEFT: TEXT & TABS */}
                <div className="relative z-20 flex flex-col justify-start pt-2 lg:pt-3">
                    <div className={`transition-[transform,opacity] duration-200 ease-out ${isFeatureSwitching ? 'translate-y-1 opacity-95' : 'translate-y-0 opacity-100'}`}>
                        <h2 className="text-3xl sm:text-[2.25rem] lg:text-[2.35rem] font-black text-slate-900 tracking-tight leading-[1.04]">
                            {active.brandTitle} <br/>
                            <span className="text-orange-600">{active.brandHighlight}</span>
                        </h2>
                        <p className="mt-7 text-sm text-slate-600 font-medium leading-[1.72] max-w-[260px]">
                            {active.desc}
                        </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:hidden">
                      <button type="button" onClick={handlePrev} aria-label="Predchádzajúca funkcia" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition active:scale-90">
                        <ChevronLeft size={20}/>
                      </button>
                      <div className="min-w-0 text-center">
                        <strong className="block truncate text-sm text-slate-900">{active.title}</strong>
                        <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{currentIdx + 1} / {REASONS.length}</span>
                      </div>
                      <button type="button" onClick={handleNext} aria-label="Nasledujúca funkcia" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm transition active:scale-90">
                        <ChevronRight size={20}/>
                      </button>
                    </div>

                    <div className="mt-8 hidden grid-cols-1 gap-1.5 lg:grid">
                        {REASONS.map((reason, i) => (
                            <button
                                key={reason.id}
                                onClick={() => switchFeature(i)}
                                className={`group flex w-40 shrink-0 items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all lg:w-auto lg:rounded-2xl ${
                                    i === currentIdx
                                        ? 'border-orange-200 bg-orange-50 text-orange-700 shadow-sm'
                                        : 'border-slate-200 bg-white/95 text-slate-500 hover:border-orange-100 hover:bg-orange-50/50'
                                }`}
                            >
                                <span className="truncate text-[12px] font-bold leading-tight">{reason.title}</span>
                                <span className={`ml-3 text-[12px] font-black ${i === currentIdx ? 'text-orange-500' : 'text-slate-400 group-hover:text-orange-300'}`}>{String(i + 1).padStart(2, '0')}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* RIGHT: REAL APP SCREENSHOT */}
                <div className="relative z-10 flex min-w-0 items-start pt-2 transition-all">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="group/nav absolute -right-10 top-12 z-30 hidden flex-col items-center gap-2 lg:inline-flex xl:-right-14"
                    >
                      <span className="landing-carousel-nudge-right inline-flex h-12 w-12 items-center justify-center rounded-full border border-orange-100 bg-white text-orange-600 shadow-xl shadow-orange-100/70 transition group-hover/nav:border-orange-200 group-hover/nav:bg-orange-600 group-hover/nav:text-white">
                        <ChevronRight size={22} strokeWidth={2.6} />
                      </span>
                      <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400 transition group-hover/nav:text-orange-600">
                        posuň ďalej
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLightbox(true)}
                      className={`group relative w-full text-left transition-[transform,opacity] duration-200 hover:-translate-y-0.5 ${isFeatureSwitching ? 'translate-x-1 opacity-95' : 'translate-x-0 opacity-100'} ${useLayeredPreview ? 'mx-auto max-w-[1050px] pb-10 sm:pb-34 lg:pb-40 xl:pb-44 lg:pr-10 xl:pr-14' : 'overflow-hidden rounded-[1.55rem] border border-slate-200/80 bg-white p-1.5 shadow-[0_28px_75px_-34px_rgba(15,23,42,0.55)] hover:shadow-[0_35px_90px_-36px_rgba(15,23,42,0.62)]'}`}
                      aria-label={`Zväčšiť náhľad: ${active.title}`}
                    >
                      {useLayeredPreview ? (
                        <>
                          <div className="relative ml-auto w-full overflow-hidden rounded-[1.55rem] border border-slate-200/80 bg-white p-1.5 shadow-[0_28px_75px_-34px_rgba(15,23,42,0.55)]">
                            <div className="relative overflow-hidden rounded-[1.1rem] bg-white">
                              <img
                                key={active.id}
                                src={active.detailImg}
                                alt={active.title}
                                loading="eager"
                                className="block h-auto w-full transition duration-700 group-hover:scale-[1.005]"
                              />
                              <div className="pointer-events-none absolute inset-0 rounded-[1.1rem] ring-1 ring-inset ring-slate-900/5" />
                            </div>
                          </div>
                          <div className="absolute bottom-2 right-2 hidden w-[72%] max-w-[720px] origin-top-right scale-[0.92] overflow-hidden rounded-[1.55rem] border border-slate-200/90 bg-white p-1.5 shadow-[0_32px_80px_-30px_rgba(15,23,42,0.62)] sm:bottom-[5.75rem] sm:-right-4 sm:block lg:bottom-[6.2rem] lg:-right-3 xl:-right-5">
                            <img
                              src={active.overlayImg || "/about-zakazky-detail.png"}
                              alt="Detail zákazky"
                              loading="eager"
                              className="block w-full rounded-[1.2rem]"
                            />
                            <div className="pointer-events-none absolute inset-1.5 rounded-[1.2rem] ring-1 ring-inset ring-slate-900/5" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex h-8 items-center gap-2 border-b border-slate-100 px-3">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                            <span className="ml-2 truncate text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                              {active.title}
                            </span>
                          </div>
                          <div className="relative aspect-[16/10] overflow-hidden rounded-[1.1rem] bg-white">
                            <img
                              key={active.id}
                              src={active.detailImg}
                              alt={active.title}
                              loading="eager"
                              className="h-full w-full object-contain object-top transition duration-700 group-hover:scale-[1.01]"
                            />
                            <div className="pointer-events-none absolute inset-0 rounded-[1.1rem] ring-1 ring-inset ring-slate-900/5" />
                          </div>
                        </>
                      )}
                    </button>
                </div>
              </div>
            </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-orange-50/25 via-white to-orange-50/15 px-5 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/80 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-orange-100/30 to-transparent" />
          <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-orange-200/35 blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-[1260px] gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 xl:gap-14 items-start">
            <div className="flex flex-col justify-start pt-2 sm:pt-4 lg:pt-5">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-extrabold leading-[1.1] tracking-tight text-slate-950">
                  Ako z jednej bežnej zákazky vznikol projekt
                  <span className="mt-3.5 flex items-center gap-2.5">
                    <img src="/icon-only.png" alt="" className="h-10 w-10 object-contain sm:h-11 sm:w-11" />
                    <span className="brand-wordmark text-[0.95em]">Moja<span className="brand-wordmark-accent">Stavba</span></span>
                  </span>
                </h2>
                <div className="mt-6 h-[2px] w-24 rounded-full bg-gradient-to-r from-orange-500 via-orange-400/60 to-transparent" aria-hidden="true" />

                <p className="mt-5 max-w-lg text-sm sm:text-[15px] font-medium leading-[1.75] text-slate-600">
                  Aplikácia MojaStavba pôvodne nevznikla ako veľký softvérový projekt. Začalo sa to oveľa jednoduchšie – ako riešenie na mieru pre jednu konkrétnu stavebnú firmu.
                </p>
              </div>

              <div className="mt-12 lg:mt-14 -ml-2 sm:-ml-4 lg:-ml-6 hidden lg:grid grid-cols-4 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/95 shadow-[0_4px_25px_-8px_rgba(15,23,42,0.06)] backdrop-blur-xs">
                {ABOUT_FEATURE_PILLARS.map((pillar, index) => (
                  <div
                    key={pillar.alt}
                    className={`flex flex-col items-center justify-center gap-2.5 px-2 py-4 sm:py-4.5 text-center transition-colors hover:bg-orange-50/20 ${index > 0 ? 'border-l border-slate-100' : ''}`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center">
                      <img
                        src={pillar.image}
                        alt={pillar.alt}
                        className="h-10 w-10 object-contain transition-transform duration-200 hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-[0.06em] text-slate-800 leading-[1.25] text-center flex flex-col items-center justify-center">
                      <span>{pillar.line1}</span>
                      <span>{pillar.line2}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-start">
              <div className="relative -ml-3 sm:-ml-4">
                <span className="absolute bottom-6 left-5 top-6 border-l-2 border-dashed border-orange-200/90 sm:left-[22px]" aria-hidden="true" />
                {[
                  [Crosshair, 'Cieľom bolo vytvoriť systém, ktorý jej uľahčí každodennú prácu, prinesie poriadok do zákaziek a nahradí množstvo tabuliek, papierov a zbytočnej administratívy.'],
                  [Heart, 'Postupne sme však do projektu vložili oveľa viac času, energie a srdca, než sme na začiatku plánovali. A začali si ho všímať aj ďalšie stavebné firmy.'],
                  [Users, 'Zistili sme, že problémy, ktoré sme riešili pre jedného klienta, v skutočnosti rieši takmer každá stavebná firma.']
                ].map(([Icon, text]: any) => (
                  <div key={text} className="relative grid grid-cols-[40px_1fr] gap-4 py-3.5 sm:grid-cols-[44px_1fr] sm:gap-4.5 sm:py-4 items-start">
                    <span className="relative z-10 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-orange-100 bg-white text-orange-600 shadow-sm shrink-0"><Icon size={20} strokeWidth={1.8}/></span>
                    <p className="pt-1 text-sm font-medium leading-[1.7] text-slate-600">{text}</p>
                  </div>
                ))}
              </div>

              <div className="relative mt-5 overflow-hidden rounded-2xl border border-orange-200/70 bg-gradient-to-br from-white via-white to-orange-50/40 p-5 sm:p-6 shadow-sm">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 via-orange-400 to-orange-200" aria-hidden="true" />
                <div className="space-y-3.5 text-sm font-medium leading-[1.75] text-slate-600 pl-1">
                  <p className="text-slate-900 font-semibold text-[15px]">
                    Dnes je <span className="brand-wordmark text-[1.05em]">Moja<span className="brand-wordmark-accent">Stavba</span></span> systém, ktorý pomáha stavebným firmám rásť každý deň.
                  </p>
                  <p>
                    Rozhodli sme sa pôvodné riešenie posunúť ďalej a vytvoriť z neho dostupný softvér pre celý stavebný sektor. Systém, ktorý sa neustále vyvíja podľa reálnych potrieb ľudí zo stavieb a pomáha firmám mať svoje projekty, ľudí, náklady aj každodennú agendu pod kontrolou.
                  </p>
                  <p>
                    Z jednej zákazky tak postupne vyrástol projekt s oveľa väčšou víziou – vytvoriť moderný nástroj pre stavebné firmy nielen na Slovensku, ale postupne kdekoľvek na svete.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer id="kontakt" className="bg-slate-900 text-white py-14 px-6 shrink-0">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-12 items-start">
                <div className="md:col-span-1 space-y-5">
                    <div className="flex items-center gap-2 h-6">
                      <img 
                        src="/icon-only.png" 
                        loading="lazy"
                        alt="Logo" 
                        className="w-10 h-10 object-contain" 
                      />
                      <span className="brand-wordmark brand-wordmark-light text-xl">Moja<span className="brand-wordmark-accent">Stavba</span></span>
                    </div>
                    <div className="space-y-3 text-sm leading-relaxed max-w-xs pt-1.5">
                      <p className="text-slate-300">
                        Moderný nástroj pre zefektívnenie podnikania. Zjednodušujeme procesy, šetríme čas a pomáhame vám rásť.
                      </p>
                      <p className="font-semibold text-orange-100">
                        Teraz si nás môžete vyskúšať na 30 dní zadarmo a bez zadávania platobných údajov.
                      </p>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-orange-500 mb-6 h-6 flex items-center">Dôležité informácie</h4>
                    <ul className="space-y-3">
                        <li><button onClick={onBack} className="text-sm text-slate-200 hover:text-orange-300 transition font-medium">O aplikácii</button></li>
                        <li><button onClick={() => setShowPricing(true)} className="text-sm text-slate-200 hover:text-orange-300 transition font-medium">Cenník a predplatné</button></li>
                        <li><a href="/vseobecne-obchodne-podmienky.html" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-200 hover:text-orange-300 transition font-medium">Obchodné podmienky (VOP)</a></li>
                        <li><a href="/zasady-ochrany-osobnych-udajov-gdpr.html" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-200 hover:text-orange-300 transition font-medium">Ochrana údajov (GDPR)</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-orange-500 mb-6 h-6 flex items-center">Technická podpora</h4>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <Mail size={18} className="text-slate-400 mt-0.5"/>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">E-mail</div>
                                <a href="mailto:sluzby@lordsbenison.eu" className="text-sm text-slate-200 hover:text-white transition">sluzby@lordsbenison.eu</a>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <Phone size={18} className="text-slate-400 mt-0.5"/>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Telefón</div>
                                <a href="tel:+421948225713" className="text-sm text-slate-200 hover:text-white transition">+421 948 225 713</a>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <Clock size={18} className="text-slate-400 mt-0.5"/>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pracovná doba</div>
                                <div className="text-sm text-slate-200">Po - Pi (08:00 - 16:30)</div>
                            </div>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-orange-500 mb-6 h-6 flex items-center">Prevádzkovateľ</h4>
                    <address className="space-y-3 text-sm text-slate-300 not-italic">
                        <p className="font-bold text-white">LORD'S BENISON s.r.o.</p>
                        <p>M. Nandrássyho 654/10<br/>050 01 Revúca</p>
                        <div className="pt-2 text-xs border-t border-slate-700/70 space-y-1 text-slate-400">
                            <p>IČO: 52404901</p>
                            <p>DIČ: 2121022992</p>
                            <p>IČ DPH: SK2121022992</p>
                        </div>
                    </address>
                </div>
            </div>
            <div className="max-w-6xl mx-auto mt-14 pt-7 border-t border-slate-700/70 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                <div className="text-sm font-medium text-slate-400">
                    © 2026 Vytvorené spoločnosťou LORD'S BENISON s.r.o. | Všetky práva vyhradené
                </div>
                <div className="text-sm font-medium text-slate-400">
                    Pozri aj naše weby <a href="https://www.lordsbenison.sk" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition-colors">www.lordsbenison.sk</a> & <a href="https://www.edugdpr.sk" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition-colors">www.edugdpr.sk</a>
                </div>
            </div>
        </footer>
      </main>

      {showLegal && <LegalModal type={showLegal} onClose={() => setShowLegal(null)} />}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} onSelect={() => { setShowPricing(false); onStart(); }} />}
    </div>
  );
};
