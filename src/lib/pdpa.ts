import { getServiceClient, isSupabaseReady } from "./supabase/admin";
import { db } from "./store";
import {
  getSeller,
  getSellerListings,
  getSellerPayments,
  getSellerOrders,
  getBuyerOrders,
  logAdmin,
} from "./data";

// -----------------------------------------------------------------------------
// สิทธิเจ้าของข้อมูลตาม PDPA
//   • ขอดู / ขอสำเนา  → exportSellerData / exportBuyerData
//   • ขอลบ            → eraseSellerData / eraseBuyerData
//
// หมายเหตุสำคัญเรื่องการลบ:
// "ลบ" ที่นี่คือ **ลบข้อมูลที่ระบุตัวบุคคลได้** ไม่ใช่ลบทั้งแถวทิ้ง
// เพราะรายการซื้อขายและการชำระเงินเป็นเอกสารทางบัญชีที่กฎหมายภาษีกำหนดให้เก็บ
// จึงเก็บเฉพาะตัวเลข (ราคา จำนวน วันที่) แล้วล้างชื่อ/เบอร์/ที่อยู่ออก
// -----------------------------------------------------------------------------

const sb = () => getServiceClient()!;

const ANON_NAME = "ผู้ใช้ที่ลบบัญชีแล้ว";

export interface DataExport {
  ประเภทผู้ใช้: string;
  วันที่ขอข้อมูล: string;
  ข้อมูลส่วนตัว: Record<string, unknown>;
  ประกาศ?: unknown[];
  รายการสั่งซื้อ: unknown[];
  ประวัติการชำระเงิน?: unknown[];
  หมายเหตุ: string;
}

// ---------- ขอดู/ขอสำเนา ----------
export async function exportSellerData(sellerId: string): Promise<DataExport | null> {
  const s = await getSeller(sellerId);
  if (!s) return null;

  const [listings, payments, orders] = await Promise.all([
    getSellerListings(sellerId),
    getSellerPayments(sellerId),
    getSellerOrders(sellerId),
  ]);

  return {
    ประเภทผู้ใช้: "ผู้ขาย",
    วันที่ขอข้อมูล: new Date().toISOString(),
    ข้อมูลส่วนตัว: {
      ชื่อที่แสดง: s.displayName,
      ชื่อร้าน: s.shopName,
      เกี่ยวกับร้าน: s.shopAbout,
      เบอร์ติดต่อ: s.contactPhone,
      เบอร์ที่ยืนยัน: s.phone,
      ยืนยันเบอร์แล้ว: s.phoneVerified,
      lineId: s.lineId,
      ธนาคาร: s.bankName,
      เลขบัญชี: s.bankAccountNo,
      ชื่อบัญชี: s.bankAccountName,
      ชื่อบริษัท: s.companyName,
      แนบหน้าสมุดบัญชี: s.bookBankUrl ? "มี (เก็บแบบไม่เปิดเผยต่อสาธารณะ)" : "ไม่มี",
      สถานะยืนยันกับบริษัท: s.verifyStatus,
      เข้าร่วมเมื่อ: s.joinedAt,
      สมาชิกหมดอายุ: s.membershipExpiresAt,
    },
    ประกาศ: listings.map((l) => ({
      ชื่อสินค้า: l.title,
      รายละเอียด: l.description,
      ราคา: l.price,
      หน่วย: l.unit,
      จำนวนคงเหลือ: l.stock,
      พื้นที่: `${l.marketName} ${l.subdistrict} ${l.district} ${l.province}`,
      สถานะ: l.status,
      ลงเมื่อ: l.createdAt,
      รูป: l.images,
    })),
    รายการสั่งซื้อ: orders.map((o) => ({
      สินค้า: o.listingTitle,
      ราคา: o.price,
      จำนวน: o.qty,
      ผู้ซื้อ: o.buyerName,
      เบอร์ผู้ซื้อ: o.buyerPhone,
      ที่อยู่จัดส่ง: o.address,
      สถานะ: o.status,
      เลขพัสดุ: o.trackingNo,
      สั่งเมื่อ: o.createdAt,
    })),
    ประวัติการชำระเงิน: payments.map((p) => ({
      จำนวนเงิน: p.amount,
      สถานะ: p.status,
      วันที่: p.createdAt,
      วันที่ตรวจสอบ: p.verifiedAt,
    })),
    หมายเหตุ:
      "ไฟล์นี้คือข้อมูลส่วนบุคคลทั้งหมดที่ตลาดออนไลน์เก็บเกี่ยวกับบัญชีของท่าน ณ เวลาที่ขอ",
  };
}

export async function exportBuyerData(buyerKey: string): Promise<DataExport> {
  const orders = await getBuyerOrders(buyerKey);
  const latest = orders[0];

  return {
    ประเภทผู้ใช้: "ผู้ซื้อ",
    วันที่ขอข้อมูล: new Date().toISOString(),
    ข้อมูลส่วนตัว: {
      ชื่อผู้รับล่าสุด: latest?.buyerName ?? null,
      เบอร์ติดต่อล่าสุด: latest?.buyerPhone ?? null,
      ที่อยู่จัดส่งล่าสุด: latest?.address ?? null,
      หมายเหตุ: "ระบบไม่ได้เก็บโปรไฟล์ผู้ซื้อแยก — เก็บไว้กับแต่ละคำสั่งซื้อเท่านั้น",
    },
    รายการสั่งซื้อ: orders.map((o) => ({
      สินค้า: o.listingTitle,
      ราคา: o.price,
      จำนวน: o.qty,
      ชื่อผู้รับ: o.buyerName,
      เบอร์: o.buyerPhone,
      ที่อยู่จัดส่ง: o.address,
      ข้อความถึงร้าน: o.note,
      สถานะ: o.status,
      เลขพัสดุ: o.trackingNo,
      สั่งเมื่อ: o.createdAt,
    })),
    หมายเหตุ:
      "ไฟล์นี้คือข้อมูลส่วนบุคคลทั้งหมดที่ตลาดออนไลน์เก็บเกี่ยวกับท่าน ณ เวลาที่ขอ",
  };
}

// ---------- ขอลบ ----------
export type EraseResult =
  | { ok: true }
  | { ok: false; reason: "open_orders"; count: number };

// ผู้ซื้อ: ล้างชื่อ/เบอร์/ที่อยู่ออกจากคำสั่งซื้อ แต่คงตัวเลขไว้เป็นหลักฐานทางบัญชี
export async function eraseBuyerData(buyerKey: string): Promise<EraseResult> {
  const orders = await getBuyerOrders(buyerKey);
  const open = orders.filter((o) => o.status === "pending" || o.status === "confirmed");
  // มีออร์เดอร์ค้างอยู่ ลบไม่ได้ — ร้านต้องใช้ที่อยู่ส่งของ
  if (open.length > 0) return { ok: false, reason: "open_orders", count: open.length };

  const patch = {
    buyer_name: ANON_NAME,
    buyer_phone: "",
    address: null,
    note: null,
  };

  if (isSupabaseReady()) {
    await sb().from("orders").update(patch).eq("buyer_key", buyerKey);
    await sb().from("contact_events").delete().eq("buyer_key", buyerKey);
    await sb().from("reports").update({ buyer_key: null }).eq("buyer_key", buyerKey);
  } else {
    db.orders
      .filter((o) => o.buyerKey === buyerKey)
      .forEach((o) => {
        o.buyerName = ANON_NAME;
        o.buyerPhone = "";
        o.address = null;
        o.note = null;
      });
    db.contactEvents = db.contactEvents.filter((e) => e.key !== buyerKey);
  }

  await logAdmin("ลบข้อมูลผู้ซื้อตามคำขอ (PDPA)", `คำสั่งซื้อ ${orders.length} รายการถูกลบข้อมูลระบุตัวตน`);
  return { ok: true };
}

// ผู้ขาย: ลบประกาศ + เอกสาร แล้วล้างข้อมูลระบุตัวตนออกจากบัญชี
export async function eraseSellerData(sellerId: string): Promise<EraseResult> {
  const orders = await getSellerOrders(sellerId);
  const open = orders.filter((o) => o.status === "pending" || o.status === "confirmed");
  // ยังมีลูกค้ารออยู่ ปิดบัญชีไม่ได้
  if (open.length > 0) return { ok: false, reason: "open_orders", count: open.length };

  const seller = await getSeller(sellerId);

  if (isSupabaseReady()) {
    // เอกสารหน้าสมุดบัญชีใน bucket ส่วนตัว
    if (seller?.bookBankUrl) {
      await sb().storage.from("docs").remove([seller.bookBankUrl]);
    }
    await sb().from("listings").delete().eq("seller_id", sellerId);
    await sb()
      .from("sellers")
      .update({
        display_name: ANON_NAME,
        shop_name: null,
        shop_about: null,
        contact_phone: null,
        phone: null,
        phone_verified: false,
        line_id: null,
        line_user_id: null,
        bank_name: null,
        bank_account_no: null,
        bank_account_name: null,
        company_name: null,
        book_bank_url: null,
        verify_status: "none",
        verify_note: null,
        company_verified: false,
        blocked: true, // กันล็อกอินกลับเข้ามาใช้บัญชีเดิม
      })
      .eq("id", sellerId);
  } else {
    db.listings = db.listings.filter((l) => l.sellerId !== sellerId);
    const s = db.sellers.find((x) => x.id === sellerId);
    if (s) {
      Object.assign(s, {
        displayName: ANON_NAME,
        shopName: null,
        shopAbout: null,
        contactPhone: null,
        phone: null,
        phoneVerified: false,
        lineId: null,
        lineUserId: undefined,
        bankName: null,
        bankAccountNo: null,
        bankAccountName: null,
        companyName: null,
        bookBankUrl: null,
        verifyStatus: "none" as const,
        verifyNote: null,
        companyVerified: false,
        blocked: true,
      });
    }
  }

  await logAdmin(
    "ลบข้อมูลผู้ขายตามคำขอ (PDPA)",
    `${seller?.shopName ?? seller?.displayName ?? sellerId} — ลบประกาศและข้อมูลระบุตัวตนแล้ว`
  );
  return { ok: true };
}
