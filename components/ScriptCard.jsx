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
const PRINT_FONT_PT = 16;
const PRINT_FONT_FAMILY = '"B Nazanin", Tahoma, "Vazirmatn", sans-serif';
const LINE_HEIGHT_RATIO = 1.30;

const MM_TO_PX = 96 / 25.4;
const PT_TO_PX = 96 / 72;

function paginateForPrint(segments, fontSizePt = PRINT_FONT_PT) {
  if (typeof document === "undefined") return [];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const fontSizePx = fontSizePt * PT_TO_PX;
  ctx.font = `bold ${fontSizePx}px ${PRINT_FONT_FAMILY}`;

  const usableWidthPx = (TILE_W_MM - TILE_PAD_X_MM * 2) * MM_TO_PX;
  const usableHeightPx = (TILE_H_MM - TILE_PAD_TOP_MM - TILE_PAD_BOTTOM_MM) * MM_TO_PX;
  const lineHeightPx = fontSizePx * LINE_HEIGHT_RATIO;
  
  // بافر اطمینان: برای اینکه مطمئن باشیم هیچ وقت متن از کادر بيرون نمی‌زند
  // عرض را 15 پیکسل و ارتفاع را به اندازه 1 خط کمتر از فضای واقعی فرض می‌کنیم
  const safeWidthPx = usableWidthPx - 15;
  const linesPerTile = Math.max(1, Math.floor(usableHeightPx / lineHeightPx) - 1);

  const chunks = [];
  segments.forEach((seg) => {
    const raw = seg?.body || "";
    const parts = raw
      .split(/[\-_ـ]{3,}/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0 && seg.role) {
      chunks.push({ role: seg.role, text: "" });
    } else {
      parts.forEach((part, idx) => {
        chunks.push({ role: idx === 0 ? seg.role : null, text: part });
      });
    }
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

  const pushRole = (text) => {
    pageBlocks.push({ type: "role", text });
    lineCount++;
    flushPageIfFull();
  };

  const pushDivider = () => {
    pageBlocks.push({ type: "divider" });
    lineCount++;
    flushPageIfFull();
  };

  chunks.forEach((chunk, idx) => {
    if (idx > 0 && pageBlocks.length > 0) pushDivider();

    if (chunk.role) {
      pushRole(chunk.role);
    }

    if (chunk.text) {
      const paragraphs = chunk.text.split(/\n/).map((p) => p.trim());

      paragraphs.forEach((para) => {
        if (!para) {
          pushLine("");
          return;
        }

        const fullWidth = ctx.measureText(para).width;

        if (fullWidth <= safeWidthPx) {
          pushLine(para);
          return;
        }

        const words = para.split(/\s+/).filter(Boolean);
        let line = "";
        for (const word of words) {
          const candidate = line ? `${line} ${word}` : word;
          if (ctx.measureText(candidate).width > safeWidthPx && line) {
            pushLine(line);
            line = word;
          } else {
            line = candidate;
          }
        }
        if (line) pushLine(line);
      });
    }
  });

  if (pageBlocks.length) pages.push(pageBlocks);

  return pages.length ? pages : [[]];
}

function buildSignatures(script, contentChunks) {
  const signatures = [];
  let i = 0;

  // دست اول: ۱۶ صفحه‌ی منطقی می‌سازیم (۱-۱۶)
  const firstSig = new Array(PAGES_PER_SIGNATURE).fill(null);
  
  // صفحه‌ی جلد همیشه صفحه‌ی ۱۵ است (اندیس ۱۴)
  firstSig[14] = { type: "cover", script };
  
  // دقیقاً طبق دستور شما: صفحات ۷، ۸، ۱۵، ۱۶ در برگ اول رزرو و خالی می‌مانند برای کاور.
  // این صفحات معادل اندیس‌های ۶، ۷، ۱۴، ۱۵ هستند که محتوای متنی نمی‌گیرند.
  const firstSigContentIndices = [0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13];
  
  for (const idx of firstSigContentIndices) {
    if (i >= contentChunks.length) break;
    firstSig[idx] = { type: "content", blocks: contentChunks[i++] };
  }
  signatures.push(firstSig);

  // دست‌های بعدی (تمام ۱۶ صفحه محتوا می‌گیرند)
  while (i < contentChunks.length) {
    const sig = new Array(PAGES_PER_SIGNATURE).fill(null);
    for (let idx = 0; idx < PAGES_PER_SIGNATURE; idx++) {
      if (i >= contentChunks.length) break;
      sig[idx] = { type: "content", blocks: contentChunks[i++] };
    }
    signatures.push(sig);
  }

  return signatures;
}

function BookletCell({ page, fontSizePt, rotate }) {
  // چرخش ۱۸۰ درجه‌ی سلول‌ها برای پرینت غیرترتیب (Long Edge)
  const rotationStyle = rotate ? { transform: "rotate(180deg)" } : {};
  
  if (!page) return <div className="script-card script-card-empty" style={rotationStyle} />;
  
  if (page.type === "cover") {
    const { script } = page;
    return (
      <div className="script-card script-card-cover" style={rotationStyle}>
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

  // حذف height اجباری تا مرورگر بتواند خودش در صورت نیاز متن‌ها را Wrap کند،
  // به کمک بافر safeWidthPx و linesPerTile اطمینان پیدا کردیم که کادر Overflow نمی‌کند.
  return (
    <div className="script-card" style={rotationStyle}>
      <div className="script-card-body" style={{ fontSize: `${fontSizePt}pt`, overflow: "hidden" }}>
        {page.blocks.map((block, i) =>
          block.type === "divider" ? (
            <div
              key={i}
              style={{
                margin: "2mm 0",
                borderTop: "0.3mm dashed #7a6360"
              }}
            />
          ) : block.type === "role" ? (
            <div
              className="script-card-role"
              key={i}
              style={{
                margin: 0,
                fontWeight: "bold",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }}
            >
              {block.text}
            </div>
          ) : (
            <p
              className="script-card-line"
              key={i}
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }}
            >
              {block.text}
            </p>
          )
        )}
      </div>
    </div>
  );
}

function BookletFace({ pages, breakAfter, fontSizePt, rotate }) {
  const cells = Array.from({ length: 8 }, (_, i) => pages[i] || null);
  
  return (
    <div
      className="print-sheet print-sheet-booklet"
      dir="rtl"
      style={{ pageBreakAfter: breakAfter ? "always" : "auto" }}
    >
      {cells.map((page, i) => (
        <BookletCell page={page} fontSizePt={fontSizePt} rotate={rotate} key={i} />
      ))}
    </div>
  );
}

export function PrintBooklet({ script, segments }) {
  const [signatures, setSignatures] = useState(null);
  const fontSizePt = Number(script?.print_font_size_pt) || PRINT_FONT_PT;
  const duplexEdge = script?.print_duplex_edge === "long" ? "long" : "short";

  useEffect(() => {
    const contentChunks = paginateForPrint(segments, fontSizePt);
    setSignatures(buildSignatures(script, contentChunks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, segments, fontSizePt]);

  if (!signatures) return null;

  const isFaceEmpty = (facePages) => facePages.every((p) => !p);

  const faces = [];
  signatures.forEach((sig, sIdx) => {
    // ترتیب دقیق از بالا سمت راست در صفحه فرد: 1,3,5,7,9,11,13,15
    const oddFacePages = [
      sig[0], sig[2], sig[4], sig[6],
      sig[8], sig[10], sig[12], sig[14]
    ];
    
    // ترتیب دقیق از بالا سمت راست در صفحه زوج: 8,6,4,2,16,14,12,10
    // این آرایه برای هر دو حالت پرینت شورت و لانگ دقیقاً یکی و ثابت باقی می‌ماند.
    const evenFacePages = [
      sig[7], sig[5], sig[3], sig[1],
      sig[15], sig[13], sig[11], sig[9]
    ];

    if (!isFaceEmpty(oddFacePages)) {
      faces.push({ key: `${sIdx}-odd`, pages: oddFacePages, rotate: false });
    }
    if (!isFaceEmpty(evenFacePages)) {
      // در حالت لانگ اج (غیر ترتیب)، ترتیب آرایه تغییر نمی‌کند اما تک‌تک کارت‌های صفحه زوج ۱۸۰ درجه می‌چرخند
      faces.push({ key: `${sIdx}-even`, pages: evenFacePages, rotate: duplexEdge === "long" });
    }
  });

  return (
    <div className="print-only">
      {faces.map((face, i) => (
        <BookletFace 
          pages={face.pages} 
          breakAfter={i < faces.length - 1} 
          fontSizePt={fontSizePt} 
          rotate={face.rotate} 
          key={face.key} 
        />
      ))}
    </div>
  );
}

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
