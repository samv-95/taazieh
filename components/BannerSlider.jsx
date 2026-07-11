import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD_PX = 40;

export default function BannerSlider() {
  const [banners, setBanners] = useState(null);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_banners")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      setBanners(data || []);
    })();
  }, []);

  useEffect(() => {
    if (!banners || banners.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [banners]);

  if (!banners || banners.length === 0) return null;

  const goTo = (i) => setIndex(((i % banners.length) + banners.length) % banners.length);
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD_PX) {
      if (delta > 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  const banner = banners[index];

  const Content = () => (
    <>
      {banner.banner_image_url && (
        <img src={banner.banner_image_url} alt="اعلامیه" className="announcement-banner-image" />
      )}
      {banner.banner_text && <p className="announcement-banner-text">{banner.banner_text}</p>}
    </>
  );

  return (
    <div className="announcement-banner-wrap">
      {banner.banner_link ? (
        <Link
          href={banner.banner_link}
          className="announcement-banner"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Content />
        </Link>
      ) : (
        <div
          className="announcement-banner"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Content />
        </div>
      )}

      {banners.length > 1 && (
        <div className="announcement-banner-dots">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              className={"announcement-banner-dot" + (i === index ? " active" : "")}
              onClick={() => goTo(i)}
              aria-label={`اسلاید ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}