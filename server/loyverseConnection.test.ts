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

  testConnection("recibe una respuesta JSON válida del recurso de turnos", async () => {
    const response = await fetch("https://api.loyverse.com/v1.0/shifts?limit=5", {
      headers: { Authorization: `Bearer ${process.env.LOYVERSE_ACCESS_TOKEN}`, Accept: "application/json" },
    });
    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type")).toContain("application/json");
    const payload = await response.json() as { shifts?: unknown[] };
    expect(Array.isArray(payload.shifts)).toBe(true);
  }, 15_000);
});
