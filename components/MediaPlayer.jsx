import { useEffect, useState } from "react";
import { getCachedMediaUrl } from "../lib/mediaCache";

// جلوگیری از راست‌کلیک/نگه‌داشتن انگشت روی پلیر (که در خیلی از مرورگرها
// منوی «ذخیره‌ی صدا/ویدئو» را باز می‌کند). این کار دانلود مستقیم را برای
// کاربر عادی حذف می‌کند، ولی چون همه‌چیز نهایتاً در خودِ مرورگر اجرا
// می‌شود، هیچ روش وبی ۱۰۰٪ ضدضربه در برابر کاربر خیلی مصمم (مثلاً از
// طریق ابزارهای توسعه‌دهنده) وجود ندارد؛ این یک بازدارنده‌ی واقع‌بینانه
// است، نه یک قفل غیرقابل‌دور زدن.
function blockContextMenu(e) {
  e.preventDefault();
  return false;
}

export default function MediaPlayer({ mediaType, mediaUrl, title }) {
  const [playbackUrl, setPlaybackUrl] = useState(mediaUrl);

  useEffect(() => {
    let objectUrlToRevoke = null;
    let cancelled = false;

    setPlaybackUrl(mediaUrl);

    // اگر این رسانه قبلاً از صفحه‌ی «دانلودها» برای پخش آفلاین ذخیره
    // شده باشد، به‌جای استریم از سرور، از همان نسخه‌ی ذخیره‌شده در
    // خودِ برنامه پخش می‌کنیم (هم آفلاین کار می‌کند، هم یک درخواست
    // شبکه‌ی اضافه لازم نیست).
    (async () => {
      const cachedUrl = await getCachedMediaUrl(mediaUrl);
      if (cachedUrl && !cancelled) {
        objectUrlToRevoke = cachedUrl;
        setPlaybackUrl(cachedUrl);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    };
  }, [mediaUrl]);

  if (!mediaUrl || mediaType === "none") return null;

  return (
    <div className="media-sticky no-print">
      <div className="media-sticky-inner">
        {mediaType === "video" ? (
          <video
            src={playbackUrl}
            controls
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            playsInline
            preload="metadata"
            onContextMenu={blockContextMenu}
          />
        ) : (
          <div className="audio-row">
            <span className="audio-label">🎙 {title || "پخش صوت"}</span>
            <audio
              src={playbackUrl}
              controls
              controlsList="nodownload noremoteplayback"
              preload="metadata"
              onContextMenu={blockContextMenu}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .media-sticky {
          position: sticky;
          top: 0;
          z-index: 15;
          background: var(--color-surface);
          border-bottom: 2px solid var(--color-gold);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        }
        .media-sticky-inner {
          max-width: 760px;
          margin: 0 auto;
          padding: 10px 16px;
        }
        video {
          width: 100%;
          max-height: 40vh;
          border-radius: 6px;
          display: block;
          background: #000;
        }
        .audio-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .audio-label {
          font-size: 13px;
          color: var(--color-gold-bright);
        }
        audio {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
