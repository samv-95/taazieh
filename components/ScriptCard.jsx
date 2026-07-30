import { Fragment, useEffect, useState } from "react";

// ============================================================
// نمایش برای مشترک (حالت خوانش داخل اپ)
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
// خروجی کاغذی «بوکلت»
// ============================================================

const PAGES_PER_SIGNATURE = 16; 

const TILE_W_MM = 74.25;
const TILE_H_MM = 105;
const TILE_PAD_X_MM = 4; 
const TILE_PAD_TOP_MM = 8; 
const TILE_PAD_BOTTOM_MM = 4;
const PRINT_FONT_PT = 16;
const PRINT_FONT_FAMILY = '"B Nazanin", Tahoma, "Vazirmatn", sans-serif';
const LINE_HEIGHT_RATIO = 1.30;

function paginateForPrint(segments, fontSizePt = PRINT_FONT_PT) {
  if (typeof document === "undefined") return [];

  // برای اندازه‌گیری دقیق و ۱۰۰٪ منطبق با واقعیت مرورگر، از یک المان مخفی استفاده می‌کنیم
  // این روش باعث می‌شود اگر مرورگر یک خط را به خاطر طولانی بودن بشکند (Wrap)، 
  // ما ارتفاع دو خط را دریافت کنیم و محاسبات صفحه‌بندی هرگز خطا نرود.
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.visibility = "hidden";
  container.style.top = "-9999px";
  container.style.width = `${TILE_W_MM - TILE_PAD_X_MM * 2}mm`;
  container.style.fontSize = `${fontSizePt}pt`;
  container.style.fontFamily = PRINT_FONT_FAMILY;
  container.style.lineHeight = LINE_HEIGHT_RATIO;
  container.style.fontWeight = "bold";
  container.style.whiteSpace = "pre-wrap";
  container.style.wordBreak = "break-word";
  document.body.appendChild(container);

  // تبدیل میلی‌متر به پیکسل دقیق بر اساس رندر مرورگر جاری
  const measureMmToPx = (mm) => {
    const el = document.createElement("div");
    el.style.height = `${mm}mm`;
    document.body.appendChild(el);
    const px = el.getBoundingClientRect().height;
    document.body.removeChild(el);
    return px;
  };

  const usableHeightPx = measureMmToPx(TILE_H_MM - TILE_PAD_TOP_MM - TILE_PAD_BOTTOM_MM);
  // حاشیه اطمینان ۲ پیکسلی برای جلوگیری از خطای اعشاری مرورگرها
  const safeHeightPx = usableHeightPx - 2;
  const dividerHeightPx = measureMmToPx(6.0); // ارتفاع جداکننده

  const measureText = (text, isRole = false) => {
    if (isRole) {
      container.style.textAlign = "right";
      container.style.textAlignLast = "auto";
    } else {
      container.style.textAlign = "justify";
      container.style.textAlignLast = "justify";
    }
    // اگر متن خالی باشد، با یک اسپیس نامرئی ارتفاع واقعی یک خط خالی را می‌گیریم
    container.innerText = text || "\u00A0";
    return container.getBoundingClientRect().height;
  };

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
  let currentHeightPx = 0;

  const flushPageIfFull = (neededPx) => {
    if (currentHeightPx + neededPx > safeHeightPx && pageBlocks.length > 0) {
      pages.push(pageBlocks);
      pageBlocks = [];
      currentHeightPx = 0;
    }
  };

  const pushLine = (text) => {
    const h = measureText(text, false);
    flushPageIfFull(h);
    pageBlocks.push({ type: "line", text });
    currentHeightPx += h;
  };

  const pushRole = (text) => {
    const h = measureText(text, true);
    flushPageIfFull(h);
    pageBlocks.push({ type: "role", text });
    currentHeightPx += h;
  };

  const pushDivider = () => {
    flushPageIfFull(dividerHeightPx);
    // اگر صفحه جدیدی تازه ساخته شده، جداکننده در ابتدای آن نمی‌گذاریم
    if (pageBlocks.length > 0) {
      pageBlocks.push({ type: "divider" });
      currentHeightPx += dividerHeightPx;
    }
  };

  chunks.forEach((chunk, idx) => {
    if (idx > 0 && pageBlocks.length > 0) pushDivider();

    if (chunk.role) {
      pushRole(chunk.role);
    }

    if (chunk.text) {
      const paragraphs = chunk.text.split(/\n/).map((p) => p.trim());
      paragraphs.forEach((para) => {
        pushLine(para);
      });
    }
  });

  if (pageBlocks.length) pages.push(pageBlocks);

  document.body.removeChild(container);

  return pages.length ? pages : [[]];
}

function buildSignatures(script, contentChunks) {
  const signatures = [];
  let i = 0;

  const firstSig = new Array(PAGES_PER_SIGNATURE).fill(null);
  
  firstSig[14] = { type: "cover", script };
  
  const firstSigContentIndices = [0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13];
  
  for (const idx of firstSigContentIndices) {
    if (i >= contentChunks.length) break;
    firstSig[idx] = { type: "content", blocks: contentChunks[i++] };
  }
  signatures.push(firstSig);

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

  return (
    <div className="script-card" style={rotationStyle}>
      <div 
        className="script-card-body" 
        style={{ 
          fontSize: `${fontSizePt}pt`, 
          overflow: "hidden" 
        }}
      >
        {page.blocks.map((block, i) =>
          block.type === "divider" ? (
            <div
              key={i}
              style={{
                height: "6mm",
                display: "flex",
                alignItems: "center",
                margin: 0
              }}
            >
              <div style={{ width: "100%", borderTop: "0.3mm dashed #7a6360" }} />
            </div>
          ) : block.type === "role" ? (
            <div
              className="script-card-role"
              key={i}
              style={{
                margin: 0,
                fontWeight: "bold",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "#8c1015",
                textAlign: "right"
              }}
            >
              {block.text || "\u00A0"}
            </div>
          ) : (
            <p
              className="script-card-line"
              key={i}
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                textAlign: "justify",
                textAlignLast: "justify",
                fontWeight: "bold",
              }}
            >
              {block.text || "\u00A0"}
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

  // به جای dependency ساده، فقط زمانی اجرا می‌شود که document در دسترس باشد
  useEffect(() => {
    // از timeout برای اطمینان از رندر کامل استایل‌ها و فونت‌ها در مرورگر استفاده می‌کنیم
    const t = setTimeout(() => {
      const contentChunks = paginateForPrint(segments, fontSizePt);
      setSignatures(buildSignatures(script, contentChunks));
    }, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, segments, fontSizePt]);

  if (!signatures) return null;

  const isFaceEmpty = (facePages) => facePages.every((p) => !p);

  const faces = [];
  signatures.forEach((sig, sIdx) => {
    const oddFacePages = [
      sig[0], sig[2], sig[4], sig[6],
      sig[8], sig[10], sig[12], sig[14]
    ];
    
    const evenFacePages = [
      sig[7], sig[5], sig[3], sig[1],
      sig[15], sig[13], sig[11], sig[9]
    ];

    if (!isFaceEmpty(oddFacePages)) {
      faces.push({ key: `${sIdx}-odd`, pages: oddFacePages, rotate: false });
    }
    if (!isFaceEmpty(evenFacePages)) {
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
