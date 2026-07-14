import AdminNav from "@/components/AdminNav";
import { getPackages } from "@/lib/data";
import { savePackageAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Packages() {
  const packages = await getPackages();

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">แพ็กสมาชิก</h1>
      <AdminNav active="packages" />

      <p className="mb-3 text-sm text-slate-500">
        แก้ราคา / เปิด-ปิดแพ็กได้จากหน้านี้ (ไม่ต้องแตะโค้ด) · ขึ้นราคามีผลรอบใหม่เท่านั้น
        คนที่จ่ายแล้วใช้ครบตามที่จ่าย
      </p>

      <div className="space-y-2">
        {packages.map((p) => {
          const save = savePackageAction;
          return (
            <form key={p.id} action={save} className="card flex flex-wrap items-center gap-3 p-3">
              <input type="hidden" name="id" value={p.id} />
              <div className="w-28 text-sm font-medium">{p.name}</div>
              <div className="text-xs text-slate-400">{p.days} วัน</div>
              <label className="flex items-center gap-1 text-xs text-slate-500">
                ราคา
                <input
                  name="price"
                  type="number"
                  defaultValue={p.price}
                  className="input w-24"
                />
                ฿
              </label>
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input type="checkbox" name="active" defaultChecked={p.active} />
                เปิดใช้
              </label>
              <button className="btn-outline px-3 py-1 text-xs">บันทึก</button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
