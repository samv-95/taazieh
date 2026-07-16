import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem("install_prompt_dismissed") === "1");

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

    const ua = window.navigator.userAgent;
    const iosDevice = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
    if (iosDevice && !standalone) setIsIos(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const dismiss = () => {
    setVisible(false);
    setIsIos(false);
    window.localStorage.setItem("install_prompt_dismissed", "1");
  };

  if (dismissed) return null;
  if (!visible && !isIos) return null;

  return (
    <div className="install-banner no-print">
      <span>
        {isIos
          ? "برای نصب این اپ: دکمه‌ی اشتراک‌گذاری Safari رو بزنید و «Add to Home Screen» رو انتخاب کنید."
          : "این اپ رو روی گوشی یا کامپیوترتون نصب کنید تا آفلاین هم در دسترس باشه."}
      </span>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {!isIos && (
          <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 13 }} onClick={install}>
            نصب
          </button>
        )}
        <button className="btn" style={{ padding: "6px 14px", fontSize: 13 }} onClick={dismiss}>
          بعداً
        </button>
      </div>
    </div>
  );
