import React, { useState } from 'react';
import { CheckCircle2, Mail, Phone, Send, User, X } from 'lucide-react';
import { LegalModal, Modal } from './UI';

export const LandingContactModal = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSending(true);

    try {
      const response = await fetch('/api/contact-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message, website, agreedToPrivacy })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Správu sa nepodarilo odoslať.');
      setSent(true);
    } catch (submitError: any) {
      setError(submitError.message || 'Správu sa nepodarilo odoslať. Skúste to prosím znova.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
    <Modal title="" onClose={onClose} maxWidth="max-w-6xl" hideHeader panelClassName="border-orange-100 shadow-[0_35px_100px_-28px_rgba(15,23,42,0.65)]">
      <div className="relative overflow-hidden bg-white">
        <button type="button" onClick={onClose} aria-label="Zavrieť kontaktný formulár" className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-400 shadow-sm backdrop-blur transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">
          <X size={20}/>
        </button>

        {sent ? (
          <div className="relative flex min-h-[430px] flex-col items-center justify-center px-7 py-12 text-center sm:px-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
              <CheckCircle2 size={42}/>
            </div>
            <h3 className="mt-7 text-2xl font-black tracking-tight text-slate-950">Správa bola odoslaná</h3>
            <p className="mt-3 max-w-md text-sm font-medium leading-6 text-slate-500">Ďakujeme, že ste nám napísali. Ozveme sa vám čo najskôr na uvedený e-mail alebo telefón.</p>
            <button type="button" onClick={onClose} className="mt-8 rounded-xl bg-slate-900 px-7 py-3 text-sm font-bold text-white transition hover:bg-orange-600">Zavrieť</button>
          </div>
        ) : (<div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(470px,1fr)]">
          <form onSubmit={handleSubmit} className="relative px-6 pb-6 pt-6 sm:px-8 sm:pb-7 lg:px-9 lg:py-9">
            <div className="mb-5 pr-12">
              <div className="mb-4 flex items-center gap-2">
                <img src="/icon-only.png" alt="" className="h-10 w-10 object-contain"/>
                <span className="brand-wordmark text-xl text-slate-900">Moja<span className="brand-wordmark-accent">Stavba</span></span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Zaujíma vás niečo konkrétne?</h3>
              <p className="mt-1.5 text-xs font-medium leading-5 text-slate-500">Napíšte nám. Radi vám poradíme s výberom balíka aj s fungovaním aplikácie.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><User size={13}/> Meno</span>
                <input value={name} onChange={event => setName(event.target.value)} required maxLength={120} autoComplete="name" placeholder="Ján Novák" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-xs placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"/>
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Mail size={13}/> E-mail</span>
                <input type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} autoComplete="email" placeholder="meno@firma.sk" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-xs placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"/>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Phone size={13}/> Telefón</span>
              <input type="tel" value={phone} onChange={event => setPhone(event.target.value)} required maxLength={50} autoComplete="tel" placeholder="+421 900 000 000" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-xs placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"/>
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Vaša správa</span>
              <textarea value={message} onChange={event => setMessage(event.target.value)} required maxLength={4000} rows={3} placeholder="S čím vám môžeme pomôcť?" className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-xs placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"/>
            </label>

            <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              Webová stránka
              <input value={website} onChange={event => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off"/>
            </label>

            {error && <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>}

            <label className={`mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-orange-200 px-3 py-2.5 text-left text-slate-700 transition ${agreedToPrivacy ? 'bg-orange-100/70' : 'bg-orange-50/70'}`}>
              <input type="checkbox" required checked={agreedToPrivacy} onChange={event => setAgreedToPrivacy(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-orange-600 focus:ring-orange-500"/>
              <span className="text-left text-[10px] font-medium leading-4 sm:text-[11px] sm:leading-[1.15rem] lg:text-[10px] lg:leading-4">Odoslaním formulára beriem na vedomie spracúvanie mojich osobných údajov v súlade so <button type="button" onClick={event => { event.preventDefault(); setShowPrivacy(true); }} className="inline p-0 text-left font-bold leading-[inherit] text-orange-600 hover:text-orange-800">Zásadami ochrany osobných údajov</button>.</span>
            </label>

            <div className="mt-5 flex justify-end">
              <button type="submit" disabled={sending} className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
                <Send size={17}/>{sending ? 'Odosielam...' : 'Odoslať správu'}
              </button>
            </div>
          </form>

          <section
            aria-label="Kontaktné údaje"
            className="relative flex min-h-[580px] flex-col overflow-hidden border-t border-orange-100 bg-white bg-[length:auto_100%] bg-right bg-no-repeat px-5 py-8 lg:border-l lg:border-t-0 lg:px-6 lg:py-9"
            style={{ backgroundImage: "url('/kontakt-mojastavba.webp')" }}
          >
            <div className="relative my-auto w-full rounded-3xl border border-white/75 bg-white/[0.68] p-5 shadow-[0_20px_55px_-25px_rgba(15,23,42,0.35)] backdrop-blur-xl lg:contents">
            <div className="relative mr-auto w-full px-1 lg:mt-12 lg:w-[62%] lg:px-2 lg:pt-3">
              <h4 className="text-xl font-black tracking-tight text-slate-950 lg:text-2xl">Sme tu pre vás</h4>
              <p className="mt-2 text-xs font-medium leading-5 text-slate-600 lg:mt-3 lg:text-sm lg:leading-6">Ozvite sa nám aj priamo. Radi odpovieme na vaše otázky.</p>
            </div>
            <div className="relative mr-auto mt-6 grid w-full grid-cols-1 gap-5 px-1 lg:mt-9 lg:w-[58%] lg:gap-6 lg:px-2">
              <a href="mailto:sluzby@lordsbenison.eu" className="group flex min-w-0 items-start gap-3">
                <Mail size={21} strokeWidth={2} className="mt-0.5 shrink-0 text-orange-600"/>
                <span className="min-w-0"><small className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">E-mail</small><strong className="mt-0.5 block truncate text-sm text-slate-900 group-hover:text-orange-600">sluzby@lordsbenison.eu</strong></span>
              </a>
              <a href="tel:+421948225713" className="group flex min-w-0 items-start gap-3">
                <Phone size={21} strokeWidth={2} className="mt-0.5 shrink-0 text-orange-600"/>
                <span><small className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Telefón · 15:00 – 19:00</small><strong className="mt-0.5 block whitespace-nowrap text-sm text-slate-900 group-hover:text-orange-600">+421 948 225 713</strong></span>
              </a>
              <a href="tel:+421915577927" className="group flex min-w-0 items-start gap-3">
                <Phone size={21} strokeWidth={2} className="mt-0.5 shrink-0 text-orange-600"/>
                <span><small className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Telefón · 07:30 – 15:00</small><strong className="mt-0.5 block whitespace-nowrap text-sm text-slate-900 group-hover:text-orange-600">0915 577 927</strong></span>
              </a>
            </div>
            </div>
          </section>
        </div>)}
      </div>
    </Modal>
    {showPrivacy && <LegalModal type="gdpr" onClose={() => setShowPrivacy(false)} />}
    </>
  );
};
