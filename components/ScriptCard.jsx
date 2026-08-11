import { Fragment, useEffect, useRef, useState } from "react";

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

// دو اندازه‌ی خروجی کاغذی. مقادیر «eighth» باید همیشه با
// styles/print.css (.script-card, .print-sheet-booklet) هماهنگ بمانند.
const SIZE_PRESETS = {
  eighth: {
    key: "eighth",
    label: "۱/۸ برگه‌ی A4 (اندازه‌ی معمول جزوه)",
    tileWMm: 74.25,
    tileHMm: 105,
    cols: 4,
    rows: 2,
    padXMm: 4,
    padTopMm: 8,
    padBottomMm: 4,
    fontScale: 1,
    gridClassName: "",
    fontFamily: '"B Nazanin", Tahoma, "Vazirmatn", sans-serif',
  },
  quarter: {
    key: "quarter",
    label: "۱/۴ برگه‌ی A4 = نصف A5 (فونت درشت‌تر)",
    tileWMm: 148.5,
    tileHMm: 105,
    cols: 2,
    rows: 2,
    padXMm: 7,
    padTopMm: 10,
    padBottomMm: 6,
    fontScale: 1.75,
    gridClassName: "print-sheet-booklet--quarter",
    fontFamily: '"B Nazanin", Tahoma, "Vazirmatn", sans-serif',
  },
};

const PRINT_FONT_PT = 18;
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

// یک مصرع را همیشه دقیقاً در یک خط نگه می‌دارد — هیچ‌وقت به دو خط
// شکسته نمی‌شود. اگر با سایز فونت اصلی جا نشد، فقط برای همان یک خط
// (نه بقیه‌ی متن)، فونت کمی (حداکثر تا ۶۵٪ سایز اصلی) کوچیک‌تر
// می‌شود تا کامل توی عرض کارت جا شود.
function fitLineToWidth(text, baseFontSizePt, usableWidthPx, measureLineWidthPxAt) {
  if (measureLineWidthPxAt(text, baseFontSizePt) <= usableWidthPx) {
    return { text, fontSizePt: baseFontSizePt };
  }
  const MIN_SCALE = 0.65; // زیر این حد دیگر خوانا نمی‌ماند
  let lo = baseFontSizePt * MIN_SCALE;
  let hi = baseFontSizePt;
  // جست‌وجوی دودویی برای بزرگ‌ترین سایزی که هنوز کامل جا می‌شود
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (measureLineWidthPxAt(text, mid) <= usableWidthPx) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { text, fontSizePt: Math.round(lo * 100) / 100 };
}

function paginateForPrint(segments, fontSizePt = PRINT_FONT_PT, preset = SIZE_PRESETS.eighth) {
  if (typeof document === "undefined") return [];

  const usableWidthMm = preset.tileWMm - preset.padXMm * 2;
  const usableHeightPx = (preset.tileHMm - preset.padTopMm - preset.padBottomMm) * MM_TO_PX;
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
  measurer.style.fontFamily = preset.fontFamily;
  measurer.style.fontWeight = "bold";
  document.body.appendChild(measurer);

  const lineEl = document.createElement("p");
  lineEl.className = "script-card-line";
  lineEl.style.margin = "0";
  lineEl.style.whiteSpace = "nowrap";
  measurer.appendChild(lineEl);

  // عرض واقعی یک رشته را با رندر واقعی در همان ظرف اندازه می‌گیریم
  // (نه canvas) — این دقیقاً همان چیزی است که در چاپ واقعی رندر می‌شود.
  // همان اندازه‌گیری، ولی با یک سایز فونت دلخواه (برای وقتی که یک
  // مصرع را کمی جمع‌وجورتر می‌کنیم تا در یک خط جا شود).
  const measureLineWidthPxAt = (text, atFontSizePt) => {
    lineEl.style.fontSize = `${atFontSizePt}pt`;
    lineEl.textContent = text;
    const width = lineEl.scrollWidth;
    lineEl.style.fontSize = `${fontSizePt}pt`;
    return width;
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
      // هر مصرع همیشه دقیقاً یک خط می‌ماند؛ هیچ‌وقت به دو خط شکسته
      // نمی‌شود (نه با پرکردن حریصانه، نه با پخش متعادل کلمات). اگر
      // با سایز فونت اصلی جا نشد، فقط همان یک خط کمی کوچیک‌تر رندر
      // می‌شود تا کامل در امتداد همان خط جا شود.
      const fitted = fitLineToWidth(para, fontSizePt, usableWidthPx, measureLineWidthPxAt);
      blocks.push({
        type: "line",
        text: fitted.text,
        fontSizePt: fitted.fontSizePt < fontSizePt ? fitted.fontSizePt : null,
      });
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
        if (b.fontSizePt) p.style.fontSize = `${b.fontSizePt}pt`;
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

// جایگاه فیزیکی جلد و خانه‌های خالی به‌صورت عمومی (برای هر تعداد ستون)

// می‌سازد که برای هر تعداد ستون (cols) کار کند — با همان قانونی که
// برای اندازه‌ی ۱/۸ (cols=4) تنظیم و تست شده:
//   - کل «ستون آخر» (چپ‌ترین، چون راست‌چین) رزرو می‌شود؛
//   - بالای آن ستون همیشه خالی می‌ماند (هم رو، هم پشت)؛
//   - پایین آن ستون، روی برگه = جلد، پشتِ همان خانه = خالی.
// (کاربر تأیید کرد: جلد باید «پایین سمت چپ صفحه‌ی اول» بیفتد و پشتش
// سفید بماند — دقیقاً همین قانون.)
function buildFoldedSignatures(script, contentChunks, cols) {
  const rows = 2;
  const slotsPerFace = cols * rows;
  const pagesPerSignature = slotsPerFace * 2;

  const topLeftFrontSlot = 2 * (cols - 1);
  const bottomLeftFrontSlot = 2 * (slotsPerFace - 1);
  const reservedSlots = new Set([
    topLeftFrontSlot,
    topLeftFrontSlot + 1, // پشتِ همان خانه
    bottomLeftFrontSlot, // اینجا جلد می‌آید (جدا مدیریت می‌شود)
    bottomLeftFrontSlot + 1,
  ]);

  const firstSigContentSlots = [];
  for (let s = 0; s < pagesPerSignature; s++) {
    if (!reservedSlots.has(s)) firstSigContentSlots.push(s);
  }

  const signatures = [];

  const firstSig = new Array(pagesPerSignature).fill(null);
  firstSig[bottomLeftFrontSlot] = { type: "cover", script };

  let i = 0;
  for (const slot of firstSigContentSlots) {
    if (i >= contentChunks.length) break;
    firstSig[slot] = { type: "content", blocks: contentChunks[i++] };
  }
  signatures.push(firstSig);

  while (i < contentChunks.length) {
    const sig = new Array(pagesPerSignature).fill(null);
    for (let slot = 0; slot < pagesPerSignature && i < contentChunks.length; slot++) {
      sig[slot] = { type: "content", blocks: contentChunks[i++] };
    }
    signatures.push(sig);
  }

  return { signatures, slotsPerFace };
}

function BookletCell({ page, fontSizePt, preset }) {
  if (!page) return <div className="script-card script-card-empty" />;
  if (page.type === "cover") {
    const { script } = page;
    return (
      <div className="script-card script-card-cover">
        <h4
          className="script-card-title"
          style={{ fontSize: `${22 * preset.fontScale}pt`, fontFamily: preset.fontFamily }}
        >
          {script.title}
        </h4>
        {(script.role_name || script.topic) && (
          <p
            className="cover-line"
            style={{ fontSize: `${16 * preset.fontScale}pt`, fontFamily: preset.fontFamily }}
          >
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
      <div
        className="script-card-body"
        style={{ fontSize: `${fontSizePt}pt`, fontFamily: preset.fontFamily }}
      >
        {page.blocks.map((block, i) =>
          block.type === "divider" ? (
            <hr className="script-card-divider" key={i} />
          ) : (
            <p
              className="script-card-line"
              key={i}
              style={block.fontSizePt ? { fontSize: `${block.fontSizePt}pt` } : undefined}
            >
              {block.text}
            </p>
          )
        )}
      </div>
    </div>
  );
}

// نکته‌ی مهم: چرخش ۱۸۰ درجه باید فقط یک‌بار روی کلِ صفحه اعمال شود،
// نه جدا جدا روی هر خانه/متن. چرخوندن تک‌تکِ عناصر متنی هنگام خروجی
// PDF در کروم باعث خراب‌شدن و قاطی‌شدن حروف فارسی می‌شد (یک باگ
// شناخته‌شده‌ی موتور Skia/PDF کروم با متنِ چرخیده). با چرخوندن کل
// ظرفِ صفحه به‌عنوان یک واحد، همون جابه‌جایی و وارونگی درست اتفاق
// می‌افتد، بدون این‌که فونت خراب شود.
// روی پشتِ صفحه (زوج) را دیگر با transform: rotate(180deg) روی متن
// واقعی نمی‌چرخانیم — چون این کار باعث می‌شد کروم هنگام خروجی PDF
// حروف فارسی را قاطی/خراب چاپ کند (یک باگ تأییدشده‌ی موتور
// Skia/PDF کروم با متنِ چرخیده، مستقل از این‌که rotate یا scale یا
// matrix باشد). به‌جایش کل روی پشت را با Canvas به‌صورت تصویر رسم
// می‌کنیم؛ چون این‌جا دیگر پای موتور متنِ PDF کروم وسط نمی‌آید،
// حروف همیشه درست چاپ می‌شوند.
const CANVAS_SCALE = 3; // برای وضوح چاپ بهتر (تقریباً معادل ۲۸۸dpi)
const CANVAS_PT_TO_PX = (96 / 72) * CANVAS_SCALE;
const CANVAS_MM_TO_PX = (96 / 25.4) * CANVAS_SCALE;

function drawJustifiedWords(ctx, words, rightEdgePx, yPx, widthPx) {
  if (words.length === 0) return;
  if (words.length === 1) {
    ctx.textAlign = "right";
    ctx.fillText(words[0], rightEdgePx, yPx);
    return;
  }
  const wordWidths = words.map((w) => ctx.measureText(w).width);
  const totalWordsWidth = wordWidths.reduce((a, b) => a + b, 0);
  const gapWidth = Math.max(0, (widthPx - totalWordsWidth) / (words.length - 1));
  ctx.textAlign = "right";
  let cursor = rightEdgePx;
  words.forEach((word, i) => {
    ctx.fillText(word, cursor, yPx);
    cursor -= wordWidths[i] + gapWidth;
  });
}

function drawCanvasCell(ctx, page, leftPx, topPx, tileWpx, tileHpx, preset, fontSizePt, dpiScale) {
  const padX = preset.padXMm * CANVAS_MM_TO_PX;
  const padTop = preset.padTopMm * CANVAS_MM_TO_PX;

  if (!page) return; // خانه‌ی خالی: فقط پس‌زمینه‌ی سفید صفحه که از قبل رسم شده کافی است.

  ctx.save();
  ctx.fillStyle = "#fdf8f1";
  ctx.fillRect(leftPx, topPx, tileWpx, tileHpx);

  const contentLeft = leftPx + padX;
  const contentRight = leftPx + tileWpx - padX;
  const contentWidth = contentRight - contentLeft;
  let y = topPx + padTop;

  if (page.type === "cover") {
    ctx.fillStyle = "#a01820";
    ctx.font = `bold ${22 * preset.fontScale * CANVAS_PT_TO_PX}px "Lalezar", "B Nazanin", sans-serif`;
    const titleLineHeight = 22 * preset.fontScale * CANVAS_PT_TO_PX * 1.3;
    y += titleLineHeight * 0.8;
    ctx.textAlign = "center";
    ctx.fillText(page.script.title, leftPx + tileWpx / 2, y);
    if (page.script.role_name || page.script.topic) {
      y += titleLineHeight;
      const line =
        (page.script.role_name || "") +
        (page.script.role_name && page.script.topic ? " از " : "") +
        (page.script.topic || "");
      ctx.font = `bold ${16 * preset.fontScale * CANVAS_PT_TO_PX}px "Lalezar", "B Nazanin", sans-serif`;
      ctx.fillText(line, leftPx + tileWpx / 2, y);
    }
    ctx.restore();
    return;
  }

  ctx.fillStyle = "#241b14";
  ctx.direction = "rtl";
  const baseLineHeight = fontSizePt * CANVAS_PT_TO_PX * LINE_HEIGHT_RATIO;

  page.blocks.forEach((block) => {
    if (block.type === "divider") {
      y += 3.5 * CANVAS_MM_TO_PX;
      ctx.save();
      ctx.strokeStyle = "#7a6360";
      ctx.setLineDash([4 * dpiScale, 3 * dpiScale]);
      ctx.lineWidth = 0.3 * CANVAS_MM_TO_PX;
      ctx.beginPath();
      ctx.moveTo(contentLeft, y);
      ctx.lineTo(contentRight, y);
      ctx.stroke();
      ctx.restore();
      y += 3.5 * CANVAS_MM_TO_PX;
      return;
    }
    const linePt = block.fontSizePt || fontSizePt;
    const lineHeight = block.fontSizePt ? linePt * CANVAS_PT_TO_PX * LINE_HEIGHT_RATIO : baseLineHeight;
    ctx.font = `900 ${linePt * CANVAS_PT_TO_PX}px "B Nazanin", Tahoma, "Vazirmatn", sans-serif`;
    y += lineHeight * 0.8;
    const words = block.text.split(/\s+/).filter(Boolean);
    drawJustifiedWords(ctx, words, contentRight, y, contentWidth);
    y += lineHeight * 0.2;
  });

  ctx.restore();
}

function RotatedCanvasFace({ pages, fontSizePt, preset }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sheetWmm = preset.cols * preset.tileWMm;
    const sheetHmm = preset.rows * preset.tileHMm;
    const wPx = Math.round(sheetWmm * CANVAS_MM_TO_PX);
    const hPx = Math.round(sheetHmm * CANVAS_MM_TO_PX);
    canvas.width = wPx;
    canvas.height = hPx;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, wPx, hPx);

    // چرخش ۱۸۰ درجه‌ی کل صفحه دور مرکز، فقط برای رسم (نه CSS) — همان
    // اثر transform: rotate(180deg) را می‌دهد بدون درگیرکردن موتور
    // متنِ PDF کروم.
    ctx.save();
    ctx.translate(wPx / 2, hPx / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-wPx / 2, -hPx / 2);

    const tileWpx = preset.tileWMm * CANVAS_MM_TO_PX;
    const tileHpx = preset.tileHMm * CANVAS_MM_TO_PX;

    for (let i = 0; i < preset.cols * preset.rows; i++) {
      const row = Math.floor(i / preset.cols);
      const colFromRight = i % preset.cols; // ۰ = ستون راست‌ترین (چون RTL)
      const leftPx = (preset.cols - 1 - colFromRight) * tileWpx;
      const topPx = row * tileHpx;
      drawCanvasCell(ctx, pages[i] || null, leftPx, topPx, tileWpx, tileHpx, preset, fontSizePt, CANVAS_SCALE);
    }

    ctx.restore();
  }, [pages, fontSizePt, preset]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: `${preset.cols * preset.tileWMm}mm`,
        height: `${preset.rows * preset.tileHMm}mm`,
      }}
    />
  );
}

function BookletFace({ pages, breakAfter, fontSizePt, preset, rotated }) {
  const slotsPerFace = preset.cols * preset.rows;
  const cells = Array.from({ length: slotsPerFace }, (_, i) => pages[i] || null);

  if (rotated) {
    return (
      <div className="print-sheet" style={{ pageBreakAfter: breakAfter ? "always" : "auto" }}>
        <RotatedCanvasFace pages={cells} fontSizePt={fontSizePt} preset={preset} />
      </div>
    );
  }

  return (
    <div className="print-sheet" style={{ pageBreakAfter: breakAfter ? "always" : "auto" }}>
      <div
        className={"print-sheet-booklet " + preset.gridClassName}
        dir="rtl"
        style={{
          "--tile-w": `${preset.tileWMm}mm`,
          "--tile-h": `${preset.tileHMm}mm`,
          "--tile-pad-x": `${preset.padXMm}mm`,
          "--tile-pad-top": `${preset.padTopMm}mm`,
          "--tile-pad-bottom": `${preset.padBottomMm}mm`,
        }}
      >
        {cells.map((page, i) => (
          <BookletCell page={page} fontSizePt={fontSizePt} preset={preset} key={i} />
        ))}
      </div>
    </div>
  );
}

// نسخه‌ی مخصوص چاپ «مجلس»: بوکلت افقی، با انتخاب اندازه (۱/۸ یا ۱/۴ A4)
export function PrintBooklet({ script, segments, sizeMode = "eighth" }) {
  const [layout, setLayout] = useState(null);
  const preset = SIZE_PRESETS[sizeMode] || SIZE_PRESETS.eighth;
  const baseFontSizePt = Number(script?.print_font_size_pt) || PRINT_FONT_PT;
  const fontSizePt = Math.round(baseFontSizePt * preset.fontScale * 100) / 100;

  useEffect(() => {
    const contentChunks = paginateForPrint(segments, fontSizePt, preset);
    setLayout(buildFoldedSignatures(script, contentChunks, preset.cols));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, segments, fontSizePt, preset.key, preset.cols]);

  if (!layout) return null;

  const isFaceEmpty = (facePages) => facePages.every((p) => !p);

  // همه‌ی روهای غیرخالی (رو و پشت هر دست برگه) را یک‌جا جمع می‌کنیم تا
  // بدانیم کدام‌یک واقعاً «آخرین» روی چاپ‌شونده است.
  // کاغذها از بالا منگنه می‌شوند و چاپ دورو با چرخش از لبه‌ی کوتاه
  // انجام می‌شود؛ یعنی وقتی برگه را ورق می‌زنید، کل صفحه ۱۸۰ درجه
  // می‌چرخد. چون رویِ پشت را با یک transform: rotate(180deg) روی کلِ
  // صفحه (نه تک‌تک خانه‌ها) می‌چرخانیم، همین یک چرخش هم جای خانه‌ها را
  // درست جابه‌جا می‌کند هم متن را درست‌جهت می‌کند — پس محتوا را به
  // همون ترتیب طبیعی صفحات زوج (بدون برعکس‌کردن دستیِ آرایه) می‌دهیم.
  const faces = [];
  layout.signatures.forEach((sig, sIdx) => {
    const oddPages = sig.filter((_, i) => i % 2 === 0);
    const evenPages = sig.filter((_, i) => i % 2 === 1);
    if (!isFaceEmpty(oddPages)) faces.push({ key: `${sIdx}-odd`, pages: oddPages, rotated: false });
    if (!isFaceEmpty(evenPages)) faces.push({ key: `${sIdx}-even`, pages: evenPages, rotated: true });
  });

  return (
    <div className="print-only">
      {faces.map((face, i) => (
        <BookletFace
          pages={face.pages}
          breakAfter={i < faces.length - 1}
          fontSizePt={fontSizePt}
          preset={preset}
          rotated={face.rotated}
          key={face.key}
        />
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
