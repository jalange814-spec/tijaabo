/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { ExamCard, SchoolSettings } from '../types';

export function chunkCardsForA4<T>(items: T[], cardsPerPage: 5 | 8): T[][] {
  const size = cardsPerPage === 5 ? 5 : 8;
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

async function tryLoadImage(url: string | undefined): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => resolve(null), 2500);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSingleExamCard(
  ctx: CanvasRenderingContext2D,
  card: ExamCard,
  settings: SchoolSettings,
  logoImg: HTMLImageElement | null,
  studentImg: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  layoutMode: 5 | 8
) {
  const isCompact = layoutMode === 8;

  ctx.save();
  // Card outer shell
  drawRoundedRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#00723A';
  ctx.stroke();
  ctx.clip();

  // Header band (brand green)
  const headerH = isCompact ? Math.round(h * 0.25) : Math.round(h * 0.26);
  ctx.fillStyle = '#00723A';
  ctx.fillRect(x, y, w, headerH);

  // Gold accent stripe under header
  const goldStripeH = 5;
  ctx.fillStyle = '#FCA700';
  ctx.fillRect(x, y + headerH, w, goldStripeH);

  // Logo circle
  const logoSize = Math.round(headerH * 0.72);
  const logoX = x + 16;
  const logoY = y + Math.round((headerH - logoSize) / 2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#FCA700';
  ctx.stroke();
  ctx.clip();
  if (logoImg) {
    try {
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    } catch {
      // ignore
    }
  } else {
    ctx.fillStyle = '#00723A';
    ctx.font = `bold ${Math.round(logoSize * 0.42)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MK', logoX + logoSize / 2, logoY + logoSize / 2);
  }
  ctx.restore();

  // School header text (Arabic + Somali/English)
  const titleX = logoX + logoSize + 14;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#FCA700';
  ctx.font = `bold ${isCompact ? 18 : 22}px Amiri, serif`;
  ctx.fillText('معهد خديجة بنت خويلد – قرطو', titleX, y + 10, w - (titleX - x) - 180);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${isCompact ? 15 : 19}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('MACHADKA KHADIIJA BINTU KHUWAYLID – QARDHO', titleX, y + (isCompact ? 34 : 40), w - (titleX - x) - 180);

  ctx.fillStyle = '#E2F5EB';
  ctx.font = `600 ${isCompact ? 12 : 14}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('KAARKA OGOLAANSHAHA IMTIXAANKA · EXAMINATION ID CARD', titleX, y + (isCompact ? 56 : 67));

  // Top-right badge: Academic Year + Exam Title
  const badgeW = isCompact ? 168 : 240;
  const badgeX = x + w - badgeW - 14;
  const badgeY = y + 12;
  const badgeH = headerH - 24;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#FCA700';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FCA700';
  ctx.font = `bold ${isCompact ? 12 : 14}px "JetBrains Mono", monospace`;
  ctx.fillText(card.academicYear, badgeX + badgeW / 2, badgeY + 8, badgeW - 12);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${isCompact ? 13 : 16}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(card.examTitle, badgeX + badgeW / 2, badgeY + (isCompact ? 28 : 34), badgeW - 12);

  // Body area
  const bodyY = y + headerH + goldStripeH + 14;
  const footerH = isCompact ? 62 : 70;
  const bodyH = y + h - footerH - bodyY;

  // Student Photo box on right side (or left)
  const photoW = isCompact ? 105 : 132;
  const photoH = isCompact ? 126 : 154;
  const photoX = x + 18;
  const photoY = bodyY + 2;

  drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 8);
  ctx.fillStyle = '#F1F5F9';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#CBD5E1';
  ctx.stroke();

  if (studentImg) {
    ctx.save();
    drawRoundedRect(ctx, photoX + 2, photoY + 2, photoW - 4, photoH - 4, 6);
    ctx.clip();
    try {
      ctx.drawImage(studentImg, photoX + 2, photoY + 2, photoW - 4, photoH - 4);
    } catch {
      // ignore
    }
    ctx.restore();
  } else {
    ctx.fillStyle = '#00723A';
    ctx.font = `bold ${isCompact ? 34 : 42}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials = (card.studentName || 'ST')
      .split(' ')
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
    ctx.fillText(initials || 'ST', photoX + photoW / 2, photoY + photoH / 2);
  }

  // Student Details Grid
  const infoX = photoX + photoW + 18;
  const infoW = w - (infoX - x) - 18;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#0F172A';
  ctx.font = `bold ${isCompact ? 20 : 24}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(card.studentName, infoX, bodyY, infoW);

  if (card.studentArabicName) {
    ctx.fillStyle = '#9A6300';
    ctx.font = `bold ${isCompact ? 15 : 18}px Amiri, serif`;
    ctx.fillText(card.studentArabicName, infoX, bodyY + (isCompact ? 25 : 30), infoW);
  }

  const rowStartY = bodyY + (isCompact ? 54 : 62);
  const lineGap = isCompact ? 26 : 30;
  const col2X = infoX + Math.round(infoW * 0.52);

  const drawField = (label: string, value: string, fx: number, fy: number, maxW: number, mono = false) => {
    ctx.fillStyle = '#64748B';
    ctx.font = `700 ${isCompact ? 11 : 12}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(label, fx, fy);
    ctx.fillStyle = '#0F172A';
    ctx.font = `${mono ? 'bold' : '700'} ${isCompact ? 14 : 16}px ${
      mono ? '"JetBrains Mono", monospace' : '"Plus Jakarta Sans", sans-serif'
    }`;
    ctx.fillText(value, fx, fy + (isCompact ? 13 : 15), maxW);
  };

  drawField('AQOONSIGA (ID):', card.studentId, infoX, rowStartY, col2X - infoX - 10, true);
  drawField('ROLL / KURSI:', `${card.rollNumber} / ${card.seatNumber}`, col2X, rowStartY, infoW * 0.48, true);

  drawField(
    'FASALKA & QAYBTA:',
    `${card.className} (${card.section}) · ${card.shift}`,
    infoX,
    rowStartY + lineGap + 8,
    col2X - infoX - 10
  );
  drawField(
    'TAARIIKHDA IMTIXAANKA:',
    card.examDate,
    col2X,
    rowStartY + lineGap + 8,
    infoW * 0.48,
    true
  );

  if (!isCompact) {
    drawField(
      'TILMAAMAHA:',
      card.instructions || 'Horay u soo qaado qalin iyo kaarkan markaad soo gelayso hoolka imtixaanka.',
      infoX,
      rowStartY + (lineGap + 8) * 2,
      infoW
    );
  }

  // Footer with Instructions (compact), Authorized Signature, and Official Stamp Circle
  const footerY = y + h - footerH;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(x, footerY, w, footerH);
  ctx.beginPath();
  ctx.moveTo(x, footerY);
  ctx.lineTo(x + w, footerY);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  if (isCompact) {
    ctx.fillStyle = '#475569';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `Tilmaam: ${card.instructions || 'Kaarkan soo qaado hoolka imtixaanka'}`,
      x + 16,
      footerY + 10,
      w - 310
    );
    ctx.fillStyle = '#00723A';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(`Card Ref: ${card.id}`, x + 16, footerY + 34);
  } else {
    ctx.fillStyle = '#00723A';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText(`Card ID: ${card.id}  |  Batch: ${card.batchId}`, x + 18, footerY + 24);
  }

  // Signature line
  const sigX = x + w - 285;
  ctx.beginPath();
  ctx.moveTo(sigX, footerY + 36);
  ctx.lineTo(sigX + 145, footerY + 36);
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Saxiixa: ${settings.principalName || 'Maamulaha'}`, sigX + 72, footerY + 42, 145);

  // Official Stamp Area Circle
  const stampR = isCompact ? 23 : 26;
  const stampCX = x + w - 46;
  const stampCY = footerY + Math.round(footerH / 2);
  ctx.beginPath();
  ctx.arc(stampCX, stampCY, stampR, 0, Math.PI * 2);
  ctx.strokeStyle = '#00723A';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(stampCX, stampCY, stampR - 5, 0, Math.PI * 2);
  ctx.strokeStyle = '#FCA700';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#00723A';
  ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('KHADIIJA', stampCX, stampCY - 5);
  ctx.fillText('QARDHO', stampCX, stampCY + 5);

  ctx.restore();
}

export async function generateExamCardsPdf(
  cards: ExamCard[],
  settings: SchoolSettings,
  cardsPerPage: 5 | 8,
  filename?: string
): Promise<{ pageCount: number; cardCount: number }> {
  const pages = chunkCardsForA4(cards, cardsPerPage);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // A4 at 200 DPI = 1654 x 2339 px
  const PAGE_W = 1654;
  const PAGE_H = 2339;
  const MARGIN_X = 48;
  const MARGIN_Y = 56;
  const GAP_X = 28;
  const GAP_Y = 24;

  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  const logoImg = await tryLoadImage(settings.logoUrl);
  const uniquePhotoUrls = Array.from(new Set(cards.map((c) => c.photoUrl).filter(Boolean)));
  const photoCache = new Map<string, HTMLImageElement | null>();
  await Promise.all(
    uniquePhotoUrls.map(async (url) => {
      photoCache.set(url, await tryLoadImage(url));
    })
  );

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    if (pIdx > 0) {
      pdf.addPage('a4', 'portrait');
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // Subtle A4 Header + Page Marker
    ctx.fillStyle = '#00723A';
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `MACHADKA KHADIIJA BINTU KHUWAYLID – KAARARKA IMTIXAANKA (${cardsPerPage}/Bogga)`,
      MARGIN_X,
      20
    );
    ctx.fillStyle = '#64748B';
    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Bogga ${pIdx + 1} / ${pages.length}`, PAGE_W - MARGIN_X, 20);

    const usableTop = MARGIN_Y + 8;
    const usableH = PAGE_H - usableTop - MARGIN_Y;
    const usableW = PAGE_W - MARGIN_X * 2;
    const pageCards = pages[pIdx];

    if (cardsPerPage === 8) {
      const cols = 2;
      const rows = 4;
      const cardW = Math.floor((usableW - GAP_X) / cols);
      const cardH = Math.floor((usableH - GAP_Y * (rows - 1)) / rows);
      pageCards.forEach((card, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = MARGIN_X + col * (cardW + GAP_X);
        const cy = usableTop + row * (cardH + GAP_Y);
        drawSingleExamCard(
          ctx,
          card,
          settings,
          logoImg,
          photoCache.get(card.photoUrl) || null,
          cx,
          cy,
          cardW,
          cardH,
          8
        );
      });
    } else {
      const rows = 5;
      const cardW = usableW;
      const cardH = Math.floor((usableH - GAP_Y * (rows - 1)) / rows);
      pageCards.forEach((card, idx) => {
        const cy = usableTop + idx * (cardH + GAP_Y);
        drawSingleExamCard(
          ctx,
          card,
          settings,
          logoImg,
          photoCache.get(card.photoUrl) || null,
          MARGIN_X,
          cy,
          cardW,
          cardH,
          5
        );
      });
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }

  const targetName =
    filename ||
    `Kaararka-Imtixaanka-${cardsPerPage}-per-A4-${new Date().toISOString().substring(0, 10)}.pdf`;
  pdf.save(targetName);

  return { pageCount: pages.length, cardCount: cards.length };
}

export function buildPrintableExamCardsHtml(
  cards: ExamCard[],
  settings: SchoolSettings,
  cardsPerPage: 5 | 8
): string {
  const pages = chunkCardsForA4(cards, cardsPerPage);
  const esc = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const pagesHtml = pages
    .map((pageCards, pIdx) => {
      const gridStyle =
        cardsPerPage === 8
          ? 'display:grid;grid-template-columns:repeat(2,1fr);gap:4mm;'
          : 'display:grid;grid-template-columns:1fr;gap:4mm;';

      const cardsHtml = pageCards
        .map(
          (card) => `
          <div style="border:1.5px solid #00723A;border-radius:6px;overflow:hidden;background:#fff;page-break-inside:avoid;break-inside:avoid;display:flex;flex-direction:column;${
            cardsPerPage === 8 ? 'height:63mm;' : 'height:51mm;'
          }">
            <div style="background:#00723A;color:#fff;padding:5px 10px;border-bottom:3px solid #FCA700;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="color:#FCA700;font-weight:700;font-size:11px;">معهد خديجة بنت خويلد – قرطو</div>
                <div style="font-weight:800;font-size:10px;">MACHADKA KHADIIJA BINTU KHUWAYLID – QARDHO</div>
              </div>
              <div style="text-align:right;font-size:9px;">
                <div style="color:#FCA700;font-weight:700;">${esc(card.academicYear)}</div>
                <div style="font-weight:700;">${esc(card.examTitle)}</div>
              </div>
            </div>
            <div style="flex:1;display:flex;gap:10px;padding:7px 10px;align-items:center;">
              <div style="width:${cardsPerPage === 8 ? '46px' : '56px'};height:${
            cardsPerPage === 8 ? '54px' : '64px'
          };border:1px solid #cbd5e1;border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-weight:800;color:#00723A;flex-shrink:0;">
                ${
                  card.photoUrl
                    ? `<img src="${esc(card.photoUrl)}" style="width:100%;height:100%;object-fit:cover;" />`
                    : esc(card.studentName.slice(0, 2).toUpperCase())
                }
              </div>
              <div style="flex:1;font-size:10px;line-height:1.35;">
                <div style="font-size:12px;font-weight:800;color:#0f172a;">${esc(card.studentName)}</div>
                <div style="color:#b45309;font-weight:600;font-size:10px;">${esc(card.studentArabicName)}</div>
                <div><strong>ID:</strong> ${esc(card.studentId)} &nbsp;|&nbsp; <strong>Roll:</strong> ${esc(
            card.rollNumber
          )} &nbsp;|&nbsp; <strong>Seat:</strong> ${esc(card.seatNumber)}</div>
                <div><strong>Fasalka:</strong> ${esc(card.className)} (${esc(card.section)}) · ${esc(
            card.shift
          )} &nbsp;|&nbsp; <strong>Taariikh:</strong> ${esc(card.examDate)}</div>
              </div>
            </div>
            <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:4px 10px;display:flex;justify-content:space-between;align-items:center;font-size:8.5px;color:#475569;">
              <span>${esc(card.instructions || 'Kaarka ogolaanshaha imtixaanka')} · ${esc(card.id)}</span>
              <span>Saxiixa: ${esc(settings.principalName)} &nbsp;|&nbsp; <strong>Shaabadda</strong></span>
            </div>
          </div>`
        )
        .join('');

      return `
      <div style="width:210mm;min-height:282mm;margin:0 auto;padding:5mm;box-sizing:border-box;page-break-after:${
        pIdx === pages.length - 1 ? 'auto' : 'always'
      };">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#00723A;font-weight:700;margin-bottom:3mm;">
          <span>Kaararka Imtixaanka · Machadka Khadiija Bintu Khuwaylid</span>
          <span>Bogga ${pIdx + 1} / ${pages.length}</span>
        </div>
        <div style="${gridStyle}">${cardsHtml}</div>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="so">
<head>
<meta charset="UTF-8" />
<title>Kaararka Imtixaanka - A4 Print</title>
<style>
@page { size: A4 portrait; margin: 6mm; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head>
<body>${pagesHtml}<script>window.onload=function(){try{window.print();}catch(e){}}</script></body>
</html>`;
}
