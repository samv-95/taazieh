import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/archive", label: "آرشیو" },
  { href: "/media", label: "مدیا" },
  { href: "/downloads", label: "دانلودها" },
];

// آیتم‌های نویگیشن پایین صفحه، فقط در موبایل نمایش داده می‌شود.
// فرض: «متن» به صفحه‌ی مدیا و «چند برگ» به صفحه‌ی دانلودها اشاره دارد؛
// اگه منظورتون مقصد دیگه‌ای بود فقط href همون آیتم رو عوض کنید.
const BOTTOM_NAV_ITEMS = [
  { href: "/", label: "خانه", icon: "home" },
  { href: "/media", label: "مدیا", icon: "media" },
  { href: "/downloads", label: "دانلود", icon: "download" },
  { href: "/archive", label: "آرشیو", icon: "archive" },
];

function BottomNavIcon({ name }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 22,
    height: 22,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
      </svg>
    );
  }
if (name === "media") {
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M10 9l5 3-5 3z" />
    </svg>
  );
}
  if (name === "download") {
    return (
      <svg {...common}>
        <path d="M12 4v11" />
        <path d="M7.5 11.5 12 16l4.5-4.5" />
        <path d="M5 19h14" />
      </svg>
    );
  }
  if (name === "archive") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <path d="M5 8v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
        <path d="M10 12h4" />
      </svg>
    );
  }
  return null;
}

export default function Layout({ children }) {
  const { user, role, logout, isAdmin } = useAuth();
  const router = useRouter();

  return (
    <div>
      <div className="top-bar no-print">
        <Link href="/" className="brand">
          کتابخانه تعزیه
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user && <span className="role-badge">{isAdmin ? "مدیر" : "مشترک"}</span>}
          {isAdmin && (
            <Link href="/admin" className="btn" style={{ padding: "6px 12px", fontSize: 13 }}>
              پنل مدیریت
            </Link>
          )}
          {user ? (
            <button className="btn" style={{ padding: "6px 12px", fontSize: 13 }} onClick={logout}>
              خروج
            </button>
          ) : (
            <Link href="/login" className="btn" style={{ padding: "6px 12px", fontSize: 13 }}>
              ورود
            </Link>
          )}
        </div>
      </div>

      {user && (
        <nav className="main-nav no-print">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={router.pathname === item.href ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      <main className={user ? "has-bottom-nav" : ""}>{children}</main>

      {user && (
        <nav className="bottom-nav no-print">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={"bottom-nav-item" + (router.pathname === item.href ? " active" : "")}
            >
              <BottomNavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}