import type { Listing, Seller, Payment, MembershipPackage } from "./types";

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
    areaId: String(r.area_id),
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
