import { describe, expect, it } from "vitest";

describe("conexión de Loyverse", () => {
  const testConnection = process.env.LOYVERSE_ACCESS_TOKEN ? it : it.skip;

  testConnection("autentica el token configurado sin exponerlo", async () => {
    const token = process.env.LOYVERSE_ACCESS_TOKEN;
    expect(token).toBeTruthy();

    const response = await fetch("https://api.loyverse.com/v1.0/merchant", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    expect(response.ok).toBe(true);
    const merchant = await response.json() as { id?: string };
    expect(merchant.id).toBeTruthy();
  }, 15_000);
});
