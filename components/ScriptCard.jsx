import { Fragment, useEffect, useState } from "react";

// ============================================================
// نمایش برای مشترک (حالت خوانش داخل اپ)
// هر قطعه در یک کادر گرد و جدا با پس‌زمینه و رنگ یکپارچه نمایش داده می‌شود.
// ============================================================
export default function ScriptCard({ segments }) {
  return (
    <div className="segments-reader">
      {segments.map((seg, i) => (
        <div className="segment-box" key={i}>
          {seg.role && <div className="segment-box-role">{seg.role}</div>}
          <div className="segment-box-body">{seg.body}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// خروجی کاغذی «بوکلت» برای مجلس: برگه‌ی A4 افقی، ۸ قسمت مساوی
// (دقیقاً یک‌هشتم A4 هرکدام). صفحه‌ی اول = جلد (نقش + موضوع).
// صفحات بعدی: متن پیوسته (بدون خط‌چین قطعات)، تقسیم‌شده بر اساس
// اندازه‌گیری واقعی فونت چاپ (B Nazanin, 13pt) تا هیچ صفحه‌ی
// اضافه یا خالی به‌صورت الکی ساخته نشود.
// صفحات فرد روی یک روی برگه و صفحات زوج روی روی دیگر چاپ می‌شوند.
// ============================================================

const PAGES_PER_SIGNATURE = 16; // ۸ فرد + ۸ زوج = یک دست برگه (رو و پشت)

// ابعاد داخل هر کارت (میلی‌متر) — باید با styles/print.css هماهنگ بماند
const TILE_W_MM = 74.25;
const TILE_H_MM = 105;
const TILE_PAD_X_MM = 4; // یک طرف؛ کل پدینگ افقی = ۲×این عدد
const TILE_PAD_TOP_MM = 8; // فاصله‌ی بالای کارت تا متن، کمی بیشتر از بقیه
const TILE_PAD_BOTTOM_MM = 4;
const PRINT_FONT_PT = 18;
const PRINT_FONT_FAMILY = '"B Nazanin", Tahoma, "Vazirmatn", sans-serif';
const LINE_HEIGHT_RATIO = 1.55;

const MM_TO_PX = 96 / 25.4;
const PT_TO_PX = 96 / 72;

// با کانواس، دقیقاً اندازه‌گیری می‌کنیم چند کاراکتر/خط در هر کارت با
// فونت و سایز موردنظر جا می‌شود؛ سپس قطعات را به همان اندازه تقسیم می‌کنیم.
// هر خط به‌صورت جدا (nowrap) رندر می‌شود تا اگر فونت B Nazanin روی
// سیستم چاپ نصب نبود و اندازه‌گیری کمی جابه‌جا شد، خط اضافه به‌جای
// آنکه از کادر بیرون بزند، فقط بریده (clip) شود — دیگر هیچ کادری از
// A4 بیرون نمی‌افتد و صفحه‌ی الکی اضافه ساخته نمی‌شود.
// خط‌چین بین قطعات دیگر نیازی به تایپ دستی ندارد: بین هر «افزودن متن»
// و بعدی، خودکار یک جداکننده گذاشته می‌شود. اگر کسی قبلاً داخل متنش
// دستی یک خط از خط‌تیره/ـ گذاشته (۳ کاراکتر یا بیشتر پشت‌سرهم) همان‌جا
// هم به‌طور خودکار به یک جداکننده‌ی چاپی واقعی تبدیل می‌شود.
function paginateForPrint(segments) {
  if (typeof document === "undefined") return [];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const fontSizePx = PRINT_FONT_PT * PT_TO_PX;
  ctx.font = `bold ${fontSizePx}px ${PRINT_FONT_FAMILY}`;

  const usableWidthPx = (TILE_W_MM - TILE_PAD_X_MM * 2) * MM_TO_PX;
  const usableHeightPx = (TILE_H_MM - TILE_PAD_TOP_MM - TILE_PAD_BOTTOM_MM) * MM_TO_PX;
  const lineHeightPx = fontSizePx * LINE_HEIGHT_RATIO;
  const linesPerTile = Math.max(1, Math.floor(usableHeightPx / lineHeightPx));

  // همه‌ی قطعات را به «تکه‌متن»‌های جدا تبدیل می‌کنیم: هم مرز بین
  // قطعه‌های مختلف، هم خط‌چین دستی داخل یک قطعه، هر دو یک مرز حساب می‌شوند.
  const chunks = [];
  segments.forEach((seg) => {
    const raw = seg?.body || "";
    raw
      .split(/[\-_ـ]{3,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => chunks.push(part));
  });

  const pages = [];
  let pageBlocks = [];
  let lineCount = 0;

  const flushPageIfFull = () => {
    if (lineCount >= linesPerTile) {
      pages.push(pageBlocks);
      pageBlocks = [];
      lineCount = 0;
    }
  };

  const pushLine = (text) => {
    pageBlocks.push({ type: "line", text });
    lineCount++;
    flushPageIfFull();
  };

  const pushDivider = () => {
    pageBlocks.push({ type: "divider" });
    lineCount++;
    flushPageIfFull();
  };

  chunks.forEach((text, idx) => {
    // بین دو تکه پشت‌سرهم یک جداکننده می‌گذاریم؛ مگر این‌که دقیقاً از
    // ابتدای یک کارت خالی شروع شده باشیم (لبه‌ی کارت خودش مرز است).
    if (idx > 0 && pageBlocks.length > 0) pushDivider();

    const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);

    paragraphs.forEach((para) => {
      const fullWidth = ctx.measureText(para).width;

      if (fullWidth <= usableWidthPx) {
        pushLine(para);
        return;
      }

      // اگر یک مصرع/پاراگراف از عرض کارت بلندتر بود، بین چند خط
      // می‌شکنیمش — نه کوچیک‌کردن فونت، تا اندازه‌ی فونت در کل متن
      // همیشه یکسان بماند.
      const words = para.split(/\s+/).filter(Boolean);
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width > usableWidthPx && line) {
          pushLine(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) pushLine(line);
    });
  });

  if (pageBlocks.length) pages.push(pageBlocks);

  return pages.length ? pages : [[]];
}

// جایگاه فیزیکی ثابت: جلد همیشه در خانه‌ی ۱۵ قرار می‌گیرد (پشت آن، خانه‌ی
// ۱۶، خالی می‌ماند)، و خانه‌های ۷ و ۸ — که درست بالای ۱۵ و ۱۶ روی همان
// برگه‌اند — همیشه خالی نگه داشته می‌شوند. متن اصلی در باقی خانه‌های
// دست اول (۱ تا ۶ و ۹ تا ۱۴) و در صورت نیاز، در دست‌های بعدی (بدون
// جایگاه رزرو) چیده می‌شود.
const FIRST_SIGNATURE_CONTENT_SLOTS = [0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13]; // صفحات ۱-۶ و ۹-۱۴
const COVER_SLOT = 14; // صفحه‌ی ۱۵

function buildSignatures(script, contentChunks) {
  const signatures = [];

  const firstSig = new Array(PAGES_PER_SIGNATURE).fill(null);
  firstSig[COVER_SLOT] = { type: "cover", script };
  // خانه‌های ۷، ۸ (اندیس ۶،۷) و پشت جلد یعنی ۱۶ (اندیس ۱۵) عمداً خالی می‌مانند.

  let i = 0;
  for (const slot of FIRST_SIGNATURE_CONTENT_SLOTS) {
    if (i >= contentChunks.length) break;
    firstSig[slot] = { type: "content", blocks: contentChunks[i++] };
  }
  signatures.push(firstSig);

  while (i < contentChunks.length) {
    const sig = new Array(PAGES_PER_SIGNATURE).fill(null);
    for (let slot = 0; slot < PAGES_PER_SIGNATURE && i < contentChunks.length; slot++) {
      sig[slot] = { type: "content", blocks: contentChunks[i++] };
    }
    signatures.push(sig);
  }

  return signatures;
}

function BookletCell({ page }) {
  if (!page) return <div className="script-card script-card-empty" />;
  if (page.type === "cover") {
    const { script } = page;
    return (
      <div className="script-card script-card-cover">
        <h4 className="script-card-title">{script.title}</h4>
        {(script.role_name || script.topic) && (
          <p className="cover-line">
            {script.role_name}
            {script.role_name && script.topic ? " از " : ""}
            {script.topic}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="script-card">
      <div className="script-card-body">
        {page.blocks.map((block, i) =>
          block.type === "divider" ? (
            <hr className="script-card-divider" key={i} />
          ) : (
            <p className="script-card-line" key={i}>
              {block.text}
            </p>
          )
        )}
      </div>
    </div>
  );
}

function BookletFace({ pages, breakAfter }) {
  const cells = Array.from({ length: 8 }, (_, i) => pages[i] || null);
  return (
    <div
      className="print-sheet print-sheet-booklet"
      dir="rtl"
      // فقط بین روهای واقعی شکست صفحه می‌گذاریم؛ بعد از آخرین روی
      // چاپ‌شده هیچ شکستی نمی‌گذاریم تا یک صفحه‌ی خالیِ اضافه در
      // انتهای پرینت ساخته نشود.
      style={{ pageBreakAfter: breakAfter ? "always" : "auto" }}
    >
      {cells.map((page, i) => (
        <BookletCell page={page} key={i} />
      ))}
    </div>
  );
}

// نسخه‌ی مخصوص چاپ «مجلس»: بوکلت افقی ۸تایی با صفحه‌بندی فرد/زوج
export function PrintBooklet({ script, segments }) {
  const [signatures, setSignatures] = useState(null);

  useEffect(() => {
    const contentChunks = paginateForPrint(segments);
    setSignatures(buildSignatures(script, contentChunks));
  }, [script, segments]);

  if (!signatures) return null;

  const isFaceEmpty = (facePages) => facePages.every((p) => !p);

  // همه‌ی روهای غیرخالی (رو و پشت هر دست برگه) را یک‌جا جمع می‌کنیم
  // تا بدانیم کدام‌یک واقعاً «آخرین» روی چاپ‌شونده است.
  const faces = [];
  signatures.forEach((sig, sIdx) => {
    const oddPages = sig.filter((_, i) => i % 2 === 0);
    const evenPages = sig.filter((_, i) => i % 2 === 1);
    if (!isFaceEmpty(oddPages)) faces.push({ key: `${sIdx}-odd`, pages: oddPages });
    if (!isFaceEmpty(evenPages)) faces.push({ key: `${sIdx}-even`, pages: evenPages });
  });

  return (
    <div className="print-only">
      {faces.map((face, i) => (
        <BookletFace pages={face.pages} breakAfter={i < faces.length - 1} key={face.key} />
      ))}
    </div>
  );
}

// ============================================================
// خروجی کاغذی برای «جُنگ» — فعلاً بدون تغییر، فرمت آن جدا مشخص می‌شود.
// ============================================================
export function PrintJongDocument({ script, segments }) {
  return (
    <div className="print-only">
      <style>{"@media print { @page { size: 148mm 210mm; margin: 10mm 8mm; } }"}</style>
      <div className="jong-print-page">
        <h1 className="jong-print-title">{script.title}</h1>
        {(script.role_name || script.topic) && (
          <p className="jong-print-subtitle">
            {script.role_name}
            {script.role_name && script.topic ? " از " : ""}
            {script.topic}
          </p>
        )}
        <div className="jong-print-columns">
          {segments.map((seg, i) => (
            <Fragment key={i}>
              {i > 0 && <hr className="jong-print-divider" />}
              <div className="jong-print-segment">
                {seg.role && <div className="jong-print-role">{seg.role}</div>}
                <div className="jong-print-body">{seg.body}</div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
