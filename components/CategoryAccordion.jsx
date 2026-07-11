import { useState } from "react";

export default function CategoryAccordion({ categories, renderItem }) {
  const [open, setOpen] = useState({});
  const toggle = (name) => setOpen((prev) => ({ ...prev, [name]: !prev[name] }));

  if (categories.length === 0) return <div className="empty-state">چیزی پیدا نشد.</div>;

  return (
    <div className="category-list">
      {categories.map((cat) => (
        <div className="category-box" key={cat.name}>
          <button type="button" className="category-header" onClick={() => toggle(cat.name)}>
            <span>
              {cat.name} <span className="category-count">({cat.items.length})</span>
            </span>
            <span className={"category-chevron" + (open[cat.name] ? " open" : "")}>▾</span>
          </button>
          {open[cat.name] && <div className="category-body category-body-admin">{cat.items.map(renderItem)}</div>}
        </div>
      ))}
    </div>
  );
}