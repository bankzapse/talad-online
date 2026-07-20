import Link from "next/link";
import type { Category } from "@/lib/types";

// แถบเลือกประเภทสินค้า (แนวตั้ง) สไตล์ร้านค้าออนไลน์
export default function CategorySidebar({
  categories,
  activeId,
}: {
  categories: Category[];
  activeId?: string;
}) {
  const Item = ({
    href,
    active,
    children,
  }: {
    href: string;
    active: boolean;
    children: React.ReactNode;
  }) => (
    <Link
      href={href}
      className={`block rounded-xl px-3 py-2.5 text-sm transition ${
        active
          ? "bg-brand-soft font-semibold text-brand-dark"
          : "text-slate-600 hover:bg-slate-50 hover:text-brand-dark"
      }`}
    >
      {children}
    </Link>
  );

  return (
    <aside className="card h-fit p-3">
      <div className="px-2 pb-2 text-sm font-bold text-ink">เลือกประเภทสินค้า</div>
      <nav className="space-y-0.5">
        <Item href="/#listings" active={!activeId}>
          ทั้งหมด
        </Item>
        {categories.map((c) => (
          <Item key={c.id} href={`/?category=${c.id}#listings`} active={activeId === c.id}>
            {c.name}
          </Item>
        ))}
      </nav>
    </aside>
  );
}
