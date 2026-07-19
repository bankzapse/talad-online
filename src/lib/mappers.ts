import type { Listing, Seller, Payment, MembershipPackage, Order } from "./types";

export function rowToOrder(r: Record<string, unknown>): Order {
  return {
    id: String(r.id),
    listingId: (r.listing_id as string) ?? null,
    sellerId: String(r.seller_id),
    buyerKey: String(r.buyer_key ?? ""),
    buyerName: String(r.buyer_name ?? ""),
    buyerPhone: String(r.buyer_phone ?? ""),
    address: (r.address as string) ?? null,
    listingTitle: String(r.listing_title ?? ""),
    price: Number(r.price ?? 0),
    unit: (r.unit as string) ?? null,
    qty: Number(r.qty ?? 1),
    note: (r.note as string) ?? null,
    deliveryMethod: ((r.delivery_method as string) ?? "meetup") as Order["deliveryMethod"],
    status: ((r.status as string) ?? "pending") as Order["status"],
    trackingNo: (r.tracking_no as string) ?? null,
    carrier: (r.carrier as string) ?? null,
    cancelReason: (r.cancel_reason as string) ?? null,
    createdAt: String(r.created_at),
    confirmedAt: (r.confirmed_at as string) ?? null,
  };
}

// แปลงแถว Supabase (snake_case) → โดเมน (camelCase)
export function rowToSeller(r: Record<string, unknown>): Seller {
  return {
    id: String(r.id),
    displayName: String(r.display_name ?? ""),
    phone: (r.phone as string) ?? null,
    phoneVerified: Boolean(r.phone_verified),
    joinedAt: String(r.joined_at),
    membershipExpiresAt: (r.membership_expires_at as string) ?? null,
    trialUsed: Boolean(r.trial_used),
    blocked: Boolean(r.blocked),
    companyVerified: Boolean(r.company_verified),
    shopName: (r.shop_name as string) ?? null,
    shopAbout: (r.shop_about as string) ?? null,
    contactPhone: (r.contact_phone as string) ?? null,
    bankName: (r.bank_name as string) ?? null,
    bankAccountNo: (r.bank_account_no as string) ?? null,
    bankAccountName: (r.bank_account_name as string) ?? null,
    companyName: (r.company_name as string) ?? null,
    bookBankUrl: (r.book_bank_url as string) ?? null,
    verifyStatus: ((r.verify_status as string) ?? "none") as Seller["verifyStatus"],
    verifyNote: (r.verify_note as string) ?? null,
    lineUserId: (r.line_user_id as string) ?? undefined,
  };
}

export function rowToListing(r: Record<string, unknown>): Listing {
  return {
    id: String(r.id),
    sellerId: String(r.seller_id),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    price: Number(r.price ?? 0),
    unit: r.unit as Listing["unit"],
    categoryId: String(r.category_id),
    areaId: (r.area_id as string) ?? null,
    province: String(r.province ?? ""),
    district: String(r.district ?? ""),
    subdistrict: String(r.subdistrict ?? ""),
    marketName: String(r.market_name ?? ""),
    images: (r.images as string[]) ?? [],
    status: r.status as Listing["status"],
    deliveryMethod: (r.delivery_method as Listing["deliveryMethod"]) ?? "meetup",
    createdAt: String(r.created_at),
    reportCount: Number(r.report_count ?? 0),
    flaggedKeywords: (r.flagged_keywords as string[]) ?? [],
  };
}

export function rowToPayment(r: Record<string, unknown>): Payment {
  return {
    id: String(r.id),
    sellerId: String(r.seller_id),
    packageId: String(r.package_id),
    amount: Number(r.amount ?? 0),
    slipUrl: (r.slip_url as string) ?? null,
    status: r.status as Payment["status"],
    createdAt: String(r.created_at),
    verifiedAt: (r.verified_at as string) ?? null,
    note: (r.note as string) ?? undefined,
  };
}

export function rowToPackage(r: Record<string, unknown>): MembershipPackage {
  return {
    id: String(r.id),
    name: String(r.name),
    days: Number(r.days),
    price: Number(r.price),
    active: Boolean(r.active),
  };
}
