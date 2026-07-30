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

const USABLE_WIDTH_MM = TILE_W_MM - (TILE_PAD_X_MM * 2);
const USABLE_HEIGHT_MM = TILE_H_MM - TILE_PAD_TOP_MM - TILE_PAD_BOTTOM_MM;
const DIVIDER_HEIGHT_MM = 6.0;

const ptToMm = (pt) => pt * (25.4 / 72);
const mmToPx = (mm) => mm * (96 / 25.4);

function paginateForPrint(segments, fontSizePt = PRINT_FONT_PT) {
  if (typeof document === "undefined") return [];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = `bold ${fontSizePt}pt ${PRINT_FONT_FAMILY}`;

  const fontSizeMm = ptToMm(fontSizePt);
  const lineHeightMm = fontSizeMm * LINE_HEIGHT_RATIO;
  
  // ۴ میلی‌متر بافر اطمینان برای اختلاف محاسبه‌ی بوم (Canvas) با مرورگر
  const safeWidthPx = mmToPx(USABLE_WIDTH_MM - 4);

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
  let currentHeightMm = 0;

  const flushPageIfFull = (neededMm) => {
    // 0.1 میلی‌متر تلورانس خطای اعشاری
    if (currentHeightMm + neededMm > USABLE_HEIGHT_MM + 0.1 && pageBlocks.length > 0) {
      pages.push(pageBlocks);
      pageBlocks = [];
      currentHeightMm = 0;
    }
  };

  const pushLine = (text) => {
    flushPageIfFull(lineHeightMm);
    pageBlocks.push({ type: "line", text });
    currentHeightMm += lineHeightMm;
  };

  const pushRole = (text) => {
    flushPageIfFull(lineHeightMm);
    pageBlocks.push({ type: "role", text });
    currentHeightMm += lineHeightMm;
  };

  const pushDivider = () => {
    flushPageIfFull(DIVIDER_HEIGHT_MM);
    pageBlocks.push({ type: "divider" });
    currentHeightMm += DIVIDER_HEIGHT_MM;
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

  const fontSizeMm = ptToMm(fontSizePt);
  const lineHeightMm = fontSizeMm * LINE_HEIGHT_RATIO;

  return (
    <div className="script-card" style={rotationStyle}>
      <div 
        className="script-card-body" 
        style={{ 
          fontSize: `${fontSizePt}pt`, 
          height: `${USABLE_HEIGHT_MM}mm`, 
          overflow: "hidden" 
        }}
      >
        {page.blocks.map((block, i) =>
          block.type === "divider" ? (
            <div
              key={i}
              style={{
                height: `${DIVIDER_HEIGHT_MM}mm`,
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
                height: `${lineHeightMm}mm`,
                lineHeight: `${lineHeightMm}mm`,
                margin: 0,
                fontWeight: "bold",
                whiteSpace: "nowrap",
                overflow: "hidden",
                color: "#8c1015"
              }}
            >
              {block.text}
            </div>
          ) : (
            <p
              className="script-card-line"
              key={i}
              style={{
                height: `${lineHeightMm}mm`,
                lineHeight: `${lineHeightMm}mm`,
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textAlign: "justify",
                textAlignLast: "justify",
                fontWeight: "bold",
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
