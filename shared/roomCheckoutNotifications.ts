export function shouldCreateCheckoutNotification(previousStatus: string | null | undefined, nextStatus: string): boolean {
  return nextStatus === "checkout" && previousStatus !== "checkout";
}

export function checkoutNotificationContent(roomNumber: string, date: string) {
  return {
    type: "room_checkout" as const,
    title: `Checkout: habitación ${roomNumber}`,
    message: `La habitación ${roomNumber} tiene un checkout registrado para el ${date}. Está pendiente de preparar.`,
  };
}
