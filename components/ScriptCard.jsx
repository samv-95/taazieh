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
const TILE_PAD_X_MM = 4; // یک طرف؛ باید با پدینگ افقی styles/print.css (.script-card) هماهنگ بماند — کل پدینگ افقی = ۲×این عدد
const TILE_PAD_TOP_MM = 8; // فاصله‌ی بالای کارت تا متن، کمی بیشتر از بقیه
const TILE_PAD_BOTTOM_MM = 4;
const PRINT_FONT_PT = 16;
const PRINT_FONT_FAMILY = '"B Nazanin", Tahoma, "Vazirmatn", sans-serif';
const LINE_HEIGHT_RATIO = 1.30;

const MM_TO_PX = 96 / 25.4;

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
// نکته‌ی مهم: قبلاً اندازه‌گیری با canvas + ctx.measureText انجام می‌شد.
// canvas برای فونت لاتین دقیق است، ولی برای فونت فارسی/عربی مثل
// B Nazanin — که حروفش به‌هم می‌چسبند و شکل هر حرف بسته به موقعیتش
// در کلمه (اول/وسط/آخر) عوض می‌شود — عرض واقعی متن را کمتر از
// واقعیت تخمین می‌زد. نتیجه: بعضی خط‌ها در تخمین «جا می‌شدند» ولی در
// رندر واقعی (که overflow: hidden دارد) جا نمی‌شدند و کاملاً بی‌صدا
// از کارت چاپی حذف می‌شدند — نه بریده، بلکه کاملاً ناپدید.
// برای همین دیگر به‌جای حدس‌زدن با canvas، مستقیماً یک نسخه‌ی مخفی و
// دقیقاً هم‌شکل با کارت واقعی چاپی می‌سازیم و خط‌به‌خط داخلش می‌چینیم؛
// هر بار ارتفاع/عرض واقعی DOM را چک می‌کنیم. این روش به هیچ فونتی
// وابسته نیست و همیشه با آنچه واقعاً چاپ می‌شود یکی است.
function paginateForPrint(segments, fontSizePt = PRINT_FONT_PT) {
  if (typeof document === "undefined") return [];

  const usableWidthMm = TILE_W_MM - TILE_PAD_X_MM * 2;
  const usableHeightPx = (TILE_H_MM - TILE_PAD_TOP_MM - TILE_PAD_BOTTOM_MM) * MM_TO_PX;
  // یک حاشیه‌ی امن کوچک (~۱mm) کم می‌کنیم تا هیچ‌وقت خط آخر درست لب
  // کادر رندر نشه؛ بدون این حاشیه، گاهی به‌خاطر گرد شدن اعداد در
  // مرورگر، یک خط دقیقاً روی مرز اندازه‌گیری می‌شد ولی در رندر نهایی
  // چند دهم پیکسل بیشتر می‌شد و لبه‌اش افتاده/بریده به نظر می‌رسید.
  const SAFETY_MARGIN_PX = MM_TO_PX; // ~۱mm

  // ظرف اندازه‌گیری: دقیقاً هم‌عرض ناحیه‌ی متن یک کارت واقعی، با همان
  // فونت/سایز/line-height؛ نامرئی و خارج از دید، ولی واقعاً در DOM
  // رندر می‌شود تا مرورگر شکل واقعی حروف فارسی را بسازد و اندازه‌ی
  // واقعی را بدهد.
  const measurer = document.createElement("div");
  measurer.style.position = "fixed";
  measurer.style.visibility = "hidden";
  measurer.style.pointerEvents = "none";
  measurer.style.left = "-9999px";
  measurer.style.top = "0";
  measurer.style.width = `${usableWidthMm}mm`;
  measurer.style.fontSize = `${fontSizePt}pt`;
  measurer.style.lineHeight = String(LINE_HEIGHT_RATIO);
  measurer.style.fontFamily = PRINT_FONT_FAMILY;
  measurer.style.fontWeight = "bold";
  document.body.appendChild(measurer);

  const lineEl = document.createElement("p");
  lineEl.className = "script-card-line";
  lineEl.style.margin = "0";
  lineEl.style.whiteSpace = "nowrap";
  measurer.appendChild(lineEl);

  // عرض واقعی یک رشته را با رندر واقعی در همان ظرف اندازه می‌گیریم
  // (نه canvas) — این دقیقاً همان چیزی است که در چاپ واقعی رندر می‌شود.
  const measureLineWidthPx = (text) => {
    lineEl.textContent = text;
    return lineEl.scrollWidth;
  };
  const usableWidthPx = measurer.clientWidth;

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

  // همه‌ی خط‌ها/جداکننده‌ها را اول کامل می‌سازیم (بدون توجه به ارتفاع
  // کارت)، بعد در مرحله‌ی دوم بر اساس ارتفاع واقعی صفحه‌بندی می‌کنیم.
  const blocks = [];
  chunks.forEach((text, idx) => {
    if (idx > 0 && blocks.length > 0) blocks.push({ type: "divider" });

    const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);

    paragraphs.forEach((para) => {
      if (measureLineWidthPx(para) <= usableWidthPx) {
        blocks.push({ type: "line", text: para });
        return;
      }

      // اگر یک مصرع/پاراگراف از عرض کارت بلندتر بود، بین چند خط
      // می‌شکنیمش — نه کوچیک‌کردن فونت، تا اندازه‌ی فونت در کل متن
      // همیشه یکسان بماند.
      const words = para.split(/\s+/).filter(Boolean);
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (measureLineWidthPx(candidate) > usableWidthPx && line) {
          blocks.push({ type: "line", text: line });
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) blocks.push({ type: "line", text: line });
    });
  });

  // مرحله‌ی دوم: با همان ظرف مخفی، خط‌به‌خط واقعاً می‌چینیم و ارتفاع
  // واقعی DOM را چک می‌کنیم تا بفهمیم کِی کارت واقعاً پر شده — نه بر
  // اساس فرمول تخمینی، بلکه بر اساس چیزی که مرورگر خودش اندازه می‌گیرد.
  measurer.innerHTML = "";
  measurer.style.whiteSpace = "normal";

  const renderBlocksInMeasurer = (list) => {
    measurer.innerHTML = "";
    list.forEach((b) => {
      if (b.type === "divider") {
        const hr = document.createElement("hr");
        hr.className = "script-card-divider";
        measurer.appendChild(hr);
      } else {
        const p = document.createElement("p");
        p.className = "script-card-line";
        p.textContent = b.text;
        measurer.appendChild(p);
      }
    });
  };

  const fitsInTile = () => measurer.scrollHeight <= usableHeightPx - SAFETY_MARGIN_PX;

  const pages = [];
  let pageBlocks = [];

  blocks.forEach((block) => {
    const candidate = [...pageBlocks, block];
    renderBlocksInMeasurer(candidate);
    if (fitsInTile() || pageBlocks.length === 0) {
      // یا واقعاً جا می‌شود، یا این اولین بلوکِ یک کارتِ خالی است —
      // در این حالت دوم حتی اگر خودش هم بزرگ‌تر از کارت باشد باید
      // جایی چاپ شود، وگرنه برای همیشه گم می‌شود.
      pageBlocks = candidate;
    } else {
      pages.push(pageBlocks);
      pageBlocks = [block];
    }
  });
  if (pageBlocks.length) pages.push(pageBlocks);

  document.body.removeChild(measurer);

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

function BookletCell({ page, fontSizePt }) {
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
      <div className="script-card-body" style={{ fontSize: `${fontSizePt}pt` }}>
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

function BookletFace({ pages, breakAfter, fontSizePt }) {
  const cells = Array.from({ length: 8 }, (_, i) => pages[i] || null);
  return (
    <div
      className="print-sheet print-sheet-booklet"
      dir="rtl"
      style={{ pageBreakAfter: breakAfter ? "always" : "auto" }}
    >
      {cells.map((page, i) => (
        <BookletCell page={page} fontSizePt={fontSizePt} key={i} />
      ))}
    </div>
  );
}

// نسخه‌ی مخصوص چاپ «مجلس»: بوکلت افقی ۸تایی با صفحه‌بندی فرد/زوج
export function PrintBooklet({ script, segments }) {
  const [signatures, setSignatures] = useState(null);
  const fontSizePt = Number(script?.print_font_size_pt) || PRINT_FONT_PT;

  useEffect(() => {
    const contentChunks = paginateForPrint(segments, fontSizePt);
    setSignatures(buildSignatures(script, contentChunks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, segments, fontSizePt]);

  if (!signatures) return null;

  const isFaceEmpty = (facePages) => facePages.every((p) => !p);

// همه‌ی روهای غیرخالی (رو و پشت هر دست برگه) را یک‌جا جمع می‌کنیم
  // تا بدانیم کدام‌یک واقعاً «آخرین» روی چاپ‌شونده است.
  const faces = [];
  signatures.forEach((sig, sIdx) => {
    const oddPages = sig.filter((_, i) => i % 2 === 0);
    const evenPagesRaw = sig.filter((_, i) => i % 2 === 1);
    // برای چاپ دورو با «چرخش از لبه‌ی کوتاه» (مناسب صفحات landscape)،
    // وقتی برگه رو برمی‌گردونید، ردیف بالا و پایین جابه‌جا می‌شن — پس
    // باید همین جابه‌جایی رو از قبل توی روی پشت اعمال کنیم تا بعد از
    // چرخش فیزیکی، هر خانه دقیقاً پشت همون خانه‌ی روی جلو بیفتد.
    const evenPages = [...evenPagesRaw.slice(4, 8), ...evenPagesRaw.slice(0, 4)];
    if (!isFaceEmpty(oddPages)) faces.push({ key: `${sIdx}-odd`, pages: oddPages });
    if (!isFaceEmpty(evenPages)) faces.push({ key: `${sIdx}-even`, pages: evenPages });
  });

  return (
    <div className="print-only">
      {faces.map((face, i) => (
        <BookletFace pages={face.pages} breakAfter={i < faces.length - 1} fontSizePt={fontSizePt} key={face.key} />
      ))}
    </div>
  );
}

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
