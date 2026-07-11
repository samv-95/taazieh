export function groupByTopic(scripts) {
  const map = new Map();
  scripts.forEach((s) => {
    const key = s.topic?.trim() || "دسته‌بندی‌نشده";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  });
  return Array.from(map.entries())
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => b.items.length - a.items.length);
}