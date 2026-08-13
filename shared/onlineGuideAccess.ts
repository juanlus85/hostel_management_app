export type OnlineGuideLink = {
  status: "pending" | "completed" | "cancelled" | "expired";
  checkInDate: string;
  expiresAt: string;
};

export function dayAfter(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function effectiveGuideExpiry(link: OnlineGuideLink): string {
  const minimumExpiry = dayAfter(link.checkInDate);
  return link.expiresAt > minimumExpiry ? link.expiresAt : minimumExpiry;
}

export function canAccessOnlineGuide(link: OnlineGuideLink, today: string): boolean {
  if (link.status !== "pending" && link.status !== "completed") return false;
  return effectiveGuideExpiry(link) >= today;
}
