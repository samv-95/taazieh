export default function MediaPlayer({ mediaType, mediaUrl, title }) {
  if (!mediaUrl || mediaType === "none") return null;

  return (
    <div className="media-sticky no-print">
      <div className="media-sticky-inner">
        {mediaType === "video" ? (
          <video src={mediaUrl} controls playsInline preload="metadata" />
        ) : (
          <div className="audio-row">
            <span className="audio-label">🎙 {title || "پخش صوت"}</span>
            <audio src={mediaUrl} controls preload="metadata" />
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
