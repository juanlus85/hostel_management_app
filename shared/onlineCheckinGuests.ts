export function onlineGuestToken(linkToken: string, guestIndex: number): string | null {
  return guestIndex === 0 ? linkToken : null;
}

export function hasInvitationEmail(email: string | null | undefined): boolean {
  return Boolean(email?.trim());
}
