import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const module = { exports: {} };
const source = ts.transpileModule(readFileSync(new URL('../lib/help.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
new Function('exports', 'module', source)(module.exports, module);
const { HELP_ARTICLES, searchHelp, normalizeHelpText } = module.exports;

test('guides have unique identifiers, actual steps and explicit audiences', () => {
  assert.equal(new Set(HELP_ARTICLES.map(article => article.id)).size, HELP_ARTICLES.length);
  assert.ok(HELP_ARTICLES.length >= 100);
  for (const article of HELP_ARTICLES) {
    assert.ok(article.title && article.summary && article.category && article.keywords);
    assert.ok(article.steps.length >= 2);
    assert.ok(article.roles.length > 0);
    for (const role of article.roles) assert.ok(searchHelp(article.title, role).slice(0, 5).some(result => result.id === article.id), `Unfindable title: ${article.id}`);
    for (const id of article.related || []) assert.ok(HELP_ARTICLES.some(item => item.id === id), `Missing related guide: ${id}`);
  }
});

test('employee invitation search works without accents and with word inflection', () => {
  for (const query of ['ako pridať zamestnanca', 'AKO PRIDAT ZAMESTNANCA', 'pridam pracovnika']) {
    assert.equal(searchHelp(query, 'admin')[0]?.id, 'invite-worker');
  }
});

test('typing a partial question suggests multiple relevant additions', () => {
  const results = searchHelp('ako pri', 'admin');
  for (const id of ['invite-worker', 'expense-add', 'income-add', 'project-add']) {
    assert.ok(results.some(article => article.id === id));
  }
});

test('attendance articles match role and contain the correct workflow', () => {
  assert.equal(searchHelp('zapis dochadzky zamestnancom', 'employee')[0]?.id, 'attendance-worker');
  assert.equal(searchHelp('dochadzka administratorom', 'admin')[0]?.id, 'attendance-admin');
  assert.ok(searchHelp('dochádzka', 'admin').some(article => article.id === 'attendance-export'));
});

test('quotes, expenses, income and absence searches return the intended guide', () => {
  for (const [query, id] of [['ako vytvorit cenovu ponuku', 'quote-create'], ['ako pridat vydavok', 'expense-add'], ['ako pridat prijem', 'income-add'], ['ako zapisat PN', 'absence-add'], ['ukoncit PN', 'absence-edit']]) {
    assert.equal(searchHelp(query, 'admin')[0]?.id, id, query);
  }
});

test('employee never receives administrator-only instructions', () => {
  for (const query of ['', 'zamestnanec', 'výdavok', 'PN', 'cenová ponuka', 'dochádzka']) {
    assert.ok(searchHelp(query, 'employee').every(article => article.roles.includes('employee')));
  }
  assert.equal(searchHelp('ako vytvorit cenovu ponuku', 'employee').length, 0);
});

test('category filters combine with searches, unknown questions stay empty', () => {
  assert.ok(searchHelp('PDF', 'admin', 'PDF exporty').every(article => article.category === 'PDF exporty'));
  assert.equal(searchHelp('xyzneznamyvyraz', 'admin').length, 0);
  assert.equal(searchHelp('P', 'admin')[0]?.id, 'absence-add');
});

test('punctuation, accents and very long input are handled safely', () => {
  assert.equal(normalizeHelpText('  Čo: OČR / PN?  '), 'co ocr pn');
  assert.doesNotThrow(() => searchHelp('a'.repeat(10000), 'admin'));
});

test('customer sections and detailed workflows have help for the correct audience', () => {
  const sections = {
    dashboard: ['dashboard'],
    team: ['invite-worker','invite-manual','invite-trouble','edit-worker','worker-wages','employee-detail','temporary-worker','temporary-return','archive-worker','worker-delete','another-admin'],
    attendance: ['attendance-admin','attendance-batch','attendance-edit','default-lunch','lunch-calculation','fixed-work','absence-add','absence-edit','absence-report'],
    projects: ['project-add','project-edit','project-location','project-budget','project-notes','project-rates','project-access','mobile-menu'],
    quotes: ['lead-add','lead-convert','quote-create','quote-transfer','quote-calculator','quote-items','quote-vat-discount','quote-edit-pdf','calculator-tools'],
    diary: ['diary-write','diary-import','diary-copy','diary-weather','diary-photos','diary-overview'],
    exports: ['project-pdf','attendance-export','attendance-layout','attendance-preview-edit','diary-export','diary-full-export','pdf-iphone','pdf-trouble'],
    finance: ['expense-add','income-add','material-add','finance-edit','finance-overhead','unpaid-invoices','finance-overview','project-profit','analytics-charts','fuel-add','phm-edit'],
    advances: ['advance-add','advance-settle','advance-edit'],
    calendar: ['calendar-task','calendar-views','calendar-edit','task-categories'],
    settings: ['company-settings','brand-images','admin-password','calendar-notifications','delete-account'],
    account: ['first-steps','subscription-order','plan-limits','updates','install-app','password-reset','save-trouble','contact-support','ai-assistant']
  };
  for (const [section, ids] of Object.entries(sections)) for (const id of ids) assert.ok(HELP_ARTICLES.some(article => article.id === id && article.roles.includes('admin')), `${section}: ${id}`);
  for (const id of ['employee-register','attendance-worker','worker-history','worker-tasks','worker-advances','worker-profile','worker-language-avatar','worker-delegated','worker-expenses','diary-import','diary-export','phm-edit']) {
    assert.ok(HELP_ARTICLES.some(article => article.id === id && article.roles.includes('employee')), id);
  }
});

test('real questions find transfer, exports, quotes, invitations and settings without accents', () => {
  const questions = [
    ['ako preniest udaje z dochadzky do dennika','diary-import','admin'],
    ['prenesenie udajov do dennika prace','diary-import','admin'],
    ['import dochadzky do dennika','diary-import','employee'],
    ['kopirovat vcerajsok','diary-copy','admin'],
    ['pocasie dennik','diary-weather','employee'],
    ['kompletny dennik PDF','diary-full-export','admin'],
    ['PDF zakazky pre klienta','project-pdf','admin'],
    ['PDF jeden den','diary-export','employee'],
    ['zmena nahladu PDF','attendance-preview-edit','admin'],
    ['cenova ponuka zlava DPH','quote-vat-discount','admin'],
    ['preniest rozpocet do ponuky','quote-transfer','admin'],
    ['pozvanka neprisla','invite-trouble','admin'],
    ['zapnut upozornenia','calendar-notifications','admin'],
    ['nakup material zamestnanec','worker-expenses','employee'],
    ['registračný odkaz ID firmy','invite-manual','admin']
  ];
  for (const [question,id,role] of questions) assert.ok(searchHelp(question,role).slice(0,3).some(article => article.id === id), `${question}: ${searchHelp(question,role).slice(0,3).map(article => article.id)}`);
});

test('guides explain consequential differences instead of treating every action as saving data', () => {
  const text = id => {const article=HELP_ARTICLES.find(article=>article.id===id);return [...article.steps,article.note || ''].join(' ');};
  assert.match(text('attendance-preview-edit'),/neukladajú/);
  assert.match(text('diary-import'),/nenahrádza uloženie/);
  assert.match(text('diary-copy'),/nekopíruje.*dochádzku.*materiál.*fotografie/);
  assert.match(text('diary-full-export'),/nie iba mesiac/);
  assert.match(text('quote-transfer'),/automaticky neprepíšu/);
  assert.match(text('material-add'),/dvakrát/);
  assert.match(text('save-trouble'),/mohol zápis uložiť/);
  assert.match(text('delete-account'),/Nejde o okamžité vymazanie/);
  assert.match(text('worker-restore'),/nemá používateľský kôš/);
  assert.match(text('worker-restore'),/Nedá sa zaručiť/);
});

test('where-to-find questions lead to practical lookup and honest restore instructions', () => {
  for (const [question,id] of [
    ['kto kolko kde pracoval','find-work-by-person'],
    ['kde najdem kto kolko pracoval','find-work-by-person'],
    ['zoznam co sa robilo na zakazke','find-project-work'],
    ['co robil zamestnanec na zakazke','find-person-on-project'],
    ['ako vratim vymazaneho zamestnanca','worker-restore'],
    ['obnovit omylom vymazany zaznam','deleted-record']
  ]) assert.ok(searchHelp(question,'admin').slice(0,3).some(article=>article.id===id), `${question}: ${searchHelp(question,'admin').slice(0,3).map(article=>article.id)}`);
});
