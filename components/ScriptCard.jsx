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

const PAGES_PER_SIGNATURE = 16; // ۸ فرد + ۸ زوج = یک دست برگه (رو و پشت) — فقط برای اندازه‌ی ۱/۸

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
  },
  quarter: {
    key: "quarter",
    label: "۱/۴ برگه‌ی A4 = نصف A5 (فونت و متن درشت‌تر)",
    tileWMm: 148.5,
    tileHMm: 105,
    cols: 2,
    rows: 2,
    padXMm: 7,
    padTopMm: 10,
    padBottomMm: 6,
    fontScale: 1.6,
    gridClassName: "print-sheet-booklet--quarter",
  },
};

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

// چیدمان ساده و پیاپی برای اندازه‌ی «۱/۴ A4»: بر خلاف اندازه‌ی ۱/۸
// که برای صحافی/تازیانه‌دوزی (fold + staple) با ترتیب ویژه‌ی فرد/زوج
// چیده می‌شود، اینجا چون قرار نیست به همان شکل تا و صحافی شود، صفحات
// فقط به ترتیب معمول خواندن (جلد، بعد متن پشت‌سرهم) پر می‌شوند —
// هر برگه چهار خانه (۲ ستون × ۲ ردیف). اگر بعداً لازم شد این اندازه
// هم دقیقاً مثل ۱/۸ برای صحافی تا بخورد، باید ترتیب فرد/زوج مشابه
// همان روش برایش هم پیاده‌سازی شود.
function buildSequentialSheets(script, contentChunks, slotsPerSheet) {
  const firstSheet = new Array(slotsPerSheet).fill(null);
  firstSheet[0] = { type: "cover", script };

  const sheets = [firstSheet];
  let slot = 1;
  let i = 0;
  while (i < contentChunks.length) {
    if (slot >= slotsPerSheet) {
      sheets.push(new Array(slotsPerSheet).fill(null));
      slot = 0;
    }
    sheets[sheets.length - 1][slot] = { type: "content", blocks: contentChunks[i++] };
    slot++;
  }
  return sheets;
}

function BookletCell({ page, fontSizePt, preset }) {
  if (!page) return <div className="script-card script-card-empty" />;
  if (page.type === "cover") {
    const { script } = page;
    return (
      <div className="script-card script-card-cover">
        <h4 className="script-card-title" style={{ fontSize: `${22 * preset.fontScale}pt` }}>
          {script.title}
        </h4>
        {(script.role_name || script.topic) && (
          <p className="cover-line" style={{ fontSize: `${16 * preset.fontScale}pt` }}>
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

function BookletFace({ pages, breakAfter, fontSizePt, preset }) {
  const slotsPerFace = preset.cols * preset.rows;
  const cells = Array.from({ length: slotsPerFace }, (_, i) => pages[i] || null);
  return (
    <div
      className={"print-sheet print-sheet-booklet " + preset.gridClassName}
      dir="rtl"
      style={{
        pageBreakAfter: breakAfter ? "always" : "auto",
        "--tile-w": `${preset.tileWMm}mm`,
        "--tile-h": `${preset.tileHMm}mm`,
      }}
    >
      {cells.map((page, i) => (
        <BookletCell page={page} fontSizePt={fontSizePt} preset={preset} key={i} />
      ))}
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
    if (preset.key === "eighth") {
      setLayout({ mode: "signatures", data: buildSignatures(script, contentChunks) });
    } else {
      const slotsPerSheet = preset.cols * preset.rows;
      setLayout({ mode: "sheets", data: buildSequentialSheets(script, contentChunks, slotsPerSheet) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, segments, fontSizePt, preset.key]);

  if (!layout) return null;

  const isFaceEmpty = (facePages) => facePages.every((p) => !p);

  // اندازه‌ی ۱/۸: صحافی با ترتیب فرد/زوج (همان روش قبلی، دست‌نخورده).
  if (layout.mode === "signatures") {
    // همه‌ی روهای غیرخالی (رو و پشت هر دست برگه) را یک‌جا جمع می‌کنیم
    // تا بدانیم کدام‌یک واقعاً «آخرین» روی چاپ‌شونده است.
    const faces = [];
    layout.data.forEach((sig, sIdx) => {
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
          <BookletFace
            pages={face.pages}
            breakAfter={i < faces.length - 1}
            fontSizePt={fontSizePt}
            preset={preset}
            key={face.key}
          />
        ))}
      </div>
    );
  }

  // اندازه‌ی ۱/۴: چیدمان پیاپی و ساده (توضیح کامل بالای buildSequentialSheets).
  return (
    <div className="print-only">
      {layout.data.map((sheetPages, i) => (
        <BookletFace
          pages={sheetPages}
          breakAfter={i < layout.data.length - 1}
          fontSizePt={fontSizePt}
          preset={preset}
          key={i}
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
