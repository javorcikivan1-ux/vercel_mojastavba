import { copyStylesInto, getPrintStyles, type PrintExportOptions } from './pdfExport';

let closeActiveExport: (() => void) | undefined;

// All potentially slow work is bounded, including image and font loading.
const bounded = <T>(work: PromiseLike<T>, signal: AbortSignal, ms = 30000): Promise<T> =>
  new Promise((resolve, reject) => {
    const abort = () => finish(() => reject(new DOMException('Export bol zrušený.', 'AbortError')));
    const timer = setTimeout(() => finish(() => reject(new Error('Príprava PDF trvá príliš dlho. Skúste menší rozsah exportu.'))), ms);
    const finish = (action: () => void) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      action();
    };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(work).then(value => finish(() => resolve(value)), error => finish(() => reject(error)));
  });

const waitForAssets = async (doc: Document, signal: AbortSignal) => {
  const images = Array.from(doc.images);
  const pending = images.map(image => {
    image.loading = 'eager';
    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        image.removeEventListener('load', loaded);
        image.removeEventListener('error', failed);
        signal.removeEventListener('abort', cancelled);
      };
      const loaded = () => { cleanup(); image.naturalWidth ? resolve() : reject(new Error('Fotografiu alebo pečiatku sa nepodarilo načítať. Skúste export znova.')); };
      const failed = () => { cleanup(); reject(new Error('Fotografiu alebo pečiatku sa nepodarilo načítať. Skúste export znova.')); };
      const cancelled = () => { cleanup(); reject(new DOMException('Export bol zrušený.', 'AbortError')); };
      if (image.complete) { loaded(); return; }
      image.addEventListener('load', loaded, { once: true });
      image.addEventListener('error', failed, { once: true });
      signal.addEventListener('abort', cancelled, { once: true });
    });
  });
  await bounded(Promise.all(pending), signal, 15000);
  if (doc.fonts) await bounded(doc.fonts.ready, signal, 10000);
};

// Keep page canvases small on iOS; a single canvas for a long diary can exceed
// Safari's canvas/memory limits. Avoid slicing through rows and small blocks.
const pageEnd = (root: HTMLElement, start: number, height: number, total: number) => {
  let end = Math.min(start + height, total);
  const top = root.getBoundingClientRect().top;
  const blocks = Array.from(root.querySelectorAll('tr, img, .break-inside-avoid'))
    .map(node => node.getBoundingClientRect())
    .map(rect => ({ top: rect.top - top, bottom: rect.bottom - top, height: rect.height }));
  for (let i = 0; i < blocks.length; i++) {
    const crossing = blocks.filter(block => block.top > start + 1 && block.top < end - 1 && block.bottom > end + 1 && block.height <= height);
    if (!crossing.length) break;
    end = Math.min(...crossing.map(block => block.top));
  }
  return Math.max(start + 1, end);
};

export const exportApplePdf = async (element: HTMLElement, options: PrintExportOptions) => {
  closeActiveExport?.();
  const controller = new AbortController();
  const { signal } = controller;
  const title = (options.title || options.filename || 'MojaStavba PDF').replace(/\.pdf$/i, '');
  const filename = `${(options.filename || title).replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
  const margin = options.pageMarginMm ?? 10;
  if (margin < 0 || margin >= 100) throw new Error('Neplatné okraje PDF.');

  const previousFocus = document.activeElement as HTMLElement | null;
  const previousOverflow = document.body.style.overflow;
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Export PDF');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.65);display:flex;align-items:center;justify-content:center;padding:16px;';
  const panel = document.createElement('div');
  panel.style.cssText = 'background:white;color:#0f172a;border-radius:20px;padding:24px;width:100%;max-width:440px;max-height:90dvh;overflow:auto;font-family:Arial,sans-serif;';
  const heading = document.createElement('h2');
  heading.textContent = 'Pripravujem PDF';
  heading.style.cssText = 'font-size:20px;font-weight:700;margin:0 0 12px;';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.style.cssText = 'font-size:14px;line-height:1.6;color:#475569;overflow-wrap:anywhere;margin:0 0 16px;';
  status.textContent = 'Načítavam dokument a fotografie…';
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Zrušiť';
  close.style.cssText = 'padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;color:#334155;font-weight:600;font-size:15px;margin-top:16px;width:100%;';
  panel.append(heading, status, actions, close);
  overlay.append(panel);
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';
  close.focus();

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;pointer-events:none;';
  let objectUrl: string | undefined;
  const cleanup = () => {
    controller.abort();
    frame.remove();
    overlay.remove();
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = undefined; }
    document.body.style.overflow = previousOverflow;
    document.removeEventListener('keydown', keydown);
    if (previousFocus?.isConnected) previousFocus.focus();
    if (closeActiveExport === cleanup) closeActiveExport = undefined;
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') cleanup();
    if (event.key === 'Tab') {
      const controls = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  };
  close.onclick = cleanup;
  closeActiveExport = cleanup;
  document.addEventListener('keydown', keydown);

  try {
    const [{ default: html2canvas }, { jsPDF }] = await bounded(Promise.all([import('html2canvas'), import('jspdf')]), signal);
    document.body.append(frame);
    const doc = frame.contentDocument;
    if (!doc) throw new Error('Nepodarilo sa pripraviť dokument.');
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
    doc.close();
    copyStylesInto(doc);
    // Wait for the copied stylesheet links before measuring the document.
    await bounded(Promise.all(Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map(link =>
      link.sheet ? Promise.resolve() : new Promise<void>((resolve, reject) => {
        link.onload = () => resolve();
        link.onerror = () => reject(new Error('Nepodarilo sa načítať vzhľad dokumentu.'));
      })
    )), signal, 15000);
    const style = doc.createElement('style');
    style.textContent = getPrintStyles(margin);
    doc.head.append(style);
    const root = element.cloneNode(true) as HTMLElement;
    root.classList.add('pdf-print-root');
    doc.body.append(root);
    await waitForAssets(doc, signal);
    await bounded(new Promise(resolve => setTimeout(resolve, options.settleDelayMs ?? 350)), signal);

    const width = root.getBoundingClientRect().width;
    const total = Math.ceil(Math.max(root.scrollHeight, root.getBoundingClientRect().height));
    if (width <= 0 || total <= 0) throw new Error('Dokument je prázdny.');
    const widthMm = 210 - 2 * margin;
    const height = (297 - 2 * margin) * width / widthMm;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    pdf.setProperties({ title });
    let start = 0, page = 0;
    while (start < total) {
      const end = pageEnd(root, start, height, total);
      status.textContent = `Generujem stranu ${page + 1}…`;
      const canvas = await bounded(html2canvas(root, {
        backgroundColor: '#ffffff', scale: 1.5, useCORS: true, allowTaint: false,
        imageTimeout: 12000, logging: false, scrollX: 0, scrollY: 0,
        windowWidth: 794, windowHeight: 1123, width, height: end - start, y: start
      }), signal, 45000);
      if (page > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', margin, margin, widthMm, (end - start) * widthMm / width);
      canvas.width = canvas.height = 0;
      start = end;
      page++;
      await bounded(new Promise(resolve => setTimeout(resolve, 0)), signal);
    }

    const blob = pdf.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });
    objectUrl = URL.createObjectURL(blob);
    frame.remove();
    heading.textContent = 'PDF je pripravené';
    status.textContent = `${filename} · ${page} ${page === 1 ? 'strana' : page < 5 ? 'strany' : 'strán'}. Klepnite na „Uložiť alebo zdieľať PDF“ a vyberte „Uložiť do Súborov“. Súbor sa neukladá automaticky.`;
    close.textContent = 'Zavrieť';

    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      const share = document.createElement('button');
      share.type = 'button';
      share.textContent = 'Uložiť alebo zdieľať PDF';
      share.style.cssText = 'background:#ea580c;color:white;font-size:15px;font-weight:700;border:0;border-radius:12px;padding:14px;';
      share.onclick = async () => {
        share.disabled = true;
        try {
          // This fresh tap provides the user activation iOS requires for sharing.
          await navigator.share({ files: [file], title });
        } catch (error) {
          if (!(error instanceof DOMException && error.name === 'AbortError')) {
            status.textContent = 'Zdieľanie sa nepodarilo. Použite „Otvoriť PDF“ a uložte ho cez ponuku zdieľania.';
          }
        } finally { share.disabled = false; }
      };
      actions.append(share);
    } else {
      status.textContent = `${filename} · PDF je pripravené. Otvorte ho a cez ponuku zdieľania vyberte „Uložiť do Súborov“.`;
    }
    const open = document.createElement('a');
    open.href = objectUrl;
    open.target = '_blank';
    open.rel = 'noopener';
    open.textContent = 'Otvoriť PDF';
    open.style.cssText = 'display:block;padding:12px;text-align:center;border:1px solid #cbd5e1;border-radius:12px;color:#334155;font-weight:600;text-decoration:none;';
    actions.append(open);
    (actions.firstElementChild as HTMLElement)?.focus();
  } catch (error) {
    if (signal.aborted) return;
    controller.abort();
    frame.remove();
    heading.textContent = 'PDF sa nepodarilo pripraviť';
    status.textContent = error instanceof Error ? error.message : 'Skúste export znova.';
    close.textContent = 'Zavrieť';
  }
};
