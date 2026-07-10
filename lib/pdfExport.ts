type PrintExportOptions = {
  filename?: string;
  title?: string;
  pageMarginMm?: number;
  settleDelayMs?: number;
};

const waitForImages = async (doc: Document) => {
  const images = Array.from(doc.images);

  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();

      return new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    })
  );
};

const copyStylesInto = (targetDoc: Document) => {
  const base = targetDoc.createElement('base');
  base.href = window.location.href;
  targetDoc.head.appendChild(base);

  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    targetDoc.head.appendChild(node.cloneNode(true));
  });
};

const getPrintStyles = (pageMarginMm: number) => {
  const printableWidthMm = 210 - pageMarginMm * 2;

  return `
  @page {
    size: A4 portrait;
    margin: ${pageMarginMm}mm;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #ffffff !important;
    color: #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    width: ${printableWidthMm}mm;
    min-height: auto;
    overflow: visible !important;
    font-family: Arial, Helvetica, sans-serif;
  }

  .pdf-print-root {
    display: block !important;
    width: ${printableWidthMm}mm !important;
    height: auto !important;
    min-height: auto !important;
    max-height: none !important;
    margin: 0 !important;
    box-shadow: none !important;
    transform: none !important;
    position: static !important;
    overflow: visible !important;
    page-break-after: auto;
    break-after: auto;
  }

  .pdf-print-root,
  .pdf-print-root * {
    max-height: none !important;
  }

  .pdf-print-root .overflow-auto,
  .pdf-print-root .overflow-y-auto,
  .pdf-print-root .overflow-x-auto,
  .pdf-print-root .overflow-hidden,
  .pdf-print-root .custom-scrollbar {
    overflow: visible !important;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    page-break-inside: auto;
  }

  thead {
    display: table-header-group;
  }

  tfoot {
    display: table-footer-group;
  }

  tr,
  img,
  .break-inside-avoid {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  td,
  th {
    overflow-wrap: anywhere;
    word-break: normal;
  }

  img {
    max-width: 100%;
  }

  @media print {
    html,
    body {
      width: ${printableWidthMm}mm;
      overflow: visible !important;
    }
  }
`;
};

export const exportElementToPdf = async (
  element: HTMLElement,
  options: PrintExportOptions = {}
) => {
  const iframe = document.createElement('iframe');
  const title = (options.title || options.filename || 'MojaStavba PDF').replace(/\.pdf$/i, '');

  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;
  const printDoc = iframe.contentDocument || printWindow?.document;

  if (!printWindow || !printDoc) {
    document.body.removeChild(iframe);
    throw new Error('Nepodarilo sa vytvorit tlacove okno pre PDF export.');
  }

  printDoc.open();
  printDoc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
  printDoc.close();
  printDoc.title = title;

  copyStylesInto(printDoc);

  const printStyle = printDoc.createElement('style');
  printStyle.textContent = getPrintStyles(options.pageMarginMm ?? 10);
  printDoc.head.appendChild(printStyle);

  const clonedElement = element.cloneNode(true) as HTMLElement;
  clonedElement.classList.add('pdf-print-root');
  printDoc.body.appendChild(clonedElement);

  await new Promise((resolve) => requestAnimationFrame(resolve));
  await waitForImages(printDoc);
  await new Promise((resolve) => setTimeout(resolve, options.settleDelayMs ?? 350));

  return new Promise<void>((resolve) => {
    let finished = false;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        resolve();
      }, 500);
    };

    printWindow.onafterprint = cleanup;
    printWindow.focus();
    printWindow.print();

    setTimeout(cleanup, 3000);
  });
};
