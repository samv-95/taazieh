import { useEffect, useRef, useState } from "react";
import { getCachedMediaUrl } from "../lib/mediaCache";

// جلوگیری از راست‌کلیک/نگه‌داشتن انگشت (که در خیلی از مرورگرها منوی
// «ذخیره‌ی صدا/ویدئو» را باز می‌کند). بازدارنده‌ی واقع‌بینانه است، نه
// قفل غیرقابل‌دور زدن — چون همه‌چیز نهایتاً در خودِ مرورگر اجرا می‌شود.
function blockContextMenu(e) {
  e.preventDefault();
  return false;
}

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "۰:۰۰";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function useResolvedMediaUrl(mediaUrl) {
  const [playbackUrl, setPlaybackUrl] = useState(mediaUrl);

  useEffect(() => {
    let objectUrlToRevoke = null;
    let cancelled = false;
    setPlaybackUrl(mediaUrl);

    // اگر این رسانه قبلاً از صفحه‌ی «دانلودها» برای پخش آفلاین ذخیره
    // شده باشد، به‌جای استریم از سرور، از همان نسخه‌ی ذخیره‌شده در
    // خودِ برنامه پخش می‌کنیم.
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

  return playbackUrl;
}

// پلیر صوتی کاملاً سفارشی، هم‌رنگ محیط سایت — کنترل‌های پیش‌فرض
// مرورگر (که قابل هم‌رنگ‌کردن واقعی نیستند، خصوصاً روی موبایل) اصلاً
// نمایش داده نمی‌شوند؛ این هم‌زمان دکمه‌ی دانلود بومی مرورگر را هم
// حذف می‌کند.
function AudioPlayer({ mediaUrl, title }) {
  const audioRef = useRef(null);
  const playbackUrl = useResolvedMediaUrl(mediaUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [playbackUrl]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
    } else {
      el.pause();
    }
  };

  const handleSeek = (e) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
  };

  const toggleMute = () => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    // این کنترل عمداً dir="ltr" است، جدا از بقیه‌ی صفحه که راست‌چین
    // است — همین کاری‌ست که واتساپ/تلگرام فارسی هم برای نوار پیام
    // صوتی انجام می‌دهند؛ دکمه‌ی پخش همیشه سمت چپ می‌ماند و نوار از
    // چپ به راست پر می‌شود، بدون تناقض بین جهت دایره و جهت رنگ پرشده.
    <div className="audio-player" dir="ltr">
      <audio
        ref={audioRef}
        src={playbackUrl}
        preload="metadata"
        onContextMenu={blockContextMenu}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
      />

      <button className="play-btn" onClick={togglePlay} aria-label={isPlaying ? "توقف" : "پخش"}>
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <rect x="5" y="4" width="5" height="16" rx="1" />
            <rect x="14" y="4" width="5" height="16" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M7 4.5v15l13-7.5z" />
          </svg>
        )}
      </button>

      <div className="audio-main">
        <span className="audio-label" dir="rtl">
          🎙 {title || "پخش صوت"}
        </span>
        <div className="seek-row">
          <span className="time">{formatTime(currentTime)}</span>
          <div className="seek-track" onClick={handleSeek}>
            <div className="seek-fill" style={{ width: `${progressPct}%` }} />
            <div className="seek-thumb" style={{ left: `${progressPct}%` }} />
          </div>
          <span className="time">{formatTime(duration)}</span>
        </div>
      </div>

      <button className="mute-btn" onClick={toggleMute} aria-label={isMuted ? "باصدا کردن" : "بی‌صدا کردن"}>
        {isMuted ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M16.5 12 21 7.5l-1.5-1.5-4.5 4.5-4.5-4.5L9 7.5l4.5 4.5L9 16.5 10.5 18l4.5-4.5 4.5 4.5 1.5-1.5z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 7.97v8.05A4.48 4.48 0 0 0 16.5 12z" />
          </svg>
        )}
      </button>

      <style jsx>{`
        .audio-player {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, var(--color-surface-raised), var(--color-surface));
          border: 1px solid var(--color-gold);
          border-radius: var(--radius);
          padding: 10px 14px;
        }
        .play-btn,
        .mute-btn {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .play-btn {
          background: var(--color-gold);
          color: var(--color-bg);
        }
        .play-btn:hover {
          background: var(--color-gold-bright);
        }
        .mute-btn {
          background: transparent;
          color: var(--color-text-muted);
          width: 28px;
          height: 28px;
        }
        .mute-btn:hover {
          color: var(--color-gold-bright);
        }
        .audio-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .audio-label {
          font-size: 13px;
          color: var(--color-gold-bright);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .seek-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .time {
          font-variant-numeric: tabular-nums;
          font-size: 11px;
          color: var(--color-text-muted);
          flex-shrink: 0;
        }
        .seek-track {
          position: relative;
          flex: 1;
          height: 6px;
          border-radius: 4px;
          background: var(--color-border);
          cursor: pointer;
        }
        .seek-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          border-radius: 4px;
          background: linear-gradient(90deg, var(--color-gold), var(--color-gold-bright));
        }
        .seek-thumb {
          position: absolute;
          top: 50%;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--color-gold-bright);
          box-shadow: 0 0 0 2px var(--color-bg);
          transform: translate(-50%, -50%);
        }
      `}</style>
    </div>
  );
}

// برای ویدئو، کنترل‌های بومی مرورگر را نگه می‌داریم (بازسازی کامل
// کنترل‌های ویدئو — با پخش‌تمام‌صفحه، بافرینگ و... — کار بسیار
// بزرگ‌تری است)، ولی با accent-color و یک قاب هم‌رنگ محیط، تا حد
// ممکن با ظاهر سایت هماهنگش می‌کنیم.
function VideoPlayer({ mediaUrl }) {
  const playbackUrl = useResolvedMediaUrl(mediaUrl);
  return (
    <div className="video-frame">
      <video
        src={playbackUrl}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        playsInline
        preload="metadata"
        onContextMenu={blockContextMenu}
      />
      <style jsx>{`
        .video-frame {
          border: 1px solid var(--color-gold);
          border-radius: var(--radius);
          overflow: hidden;
          background: #000;
        }
        video {
          width: 100%;
          max-height: 40vh;
          display: block;
          accent-color: var(--color-gold-bright);
        }
      `}</style>
    </div>
  );
}

export default function MediaPlayer({ mediaType, mediaUrl, title }) {
  if (!mediaUrl || mediaType === "none") return null;

  return (
    <div className="media-sticky no-print">
      <div className="media-sticky-inner">
        {mediaType === "video" ? <VideoPlayer mediaUrl={mediaUrl} /> : <AudioPlayer mediaUrl={mediaUrl} title={title} />}
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
      `}</style>
    </div>
  );
}
