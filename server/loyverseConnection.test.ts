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

  testConnection("recibe una respuesta JSON válida del recurso de recibos reciente", async () => {
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 30);
    const url = new URL("https://api.loyverse.com/v1.0/receipts");
    url.searchParams.set("limit", "5");
    url.searchParams.set("created_at_min", `${from.toISOString().slice(0, 10)}T00:00:00.000Z`);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.LOYVERSE_ACCESS_TOKEN}`, Accept: "application/json" },
    });
    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type")).toContain("application/json");
    const payload = await response.json() as { receipts?: unknown[] };
    expect(Array.isArray(payload.receipts)).toBe(true);
  }, 30_000);
});
