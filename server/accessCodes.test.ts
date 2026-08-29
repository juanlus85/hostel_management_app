import { describe, expect, it } from "vitest";
import { findAccessCodeForRoom } from "../shared/accessCodes";

describe("códigos de acceso por habitación", () => {
  const codes = [
    { roomNumber: "42", roomCode: "BASE42" },
    { roomNumber: "15", roomCode: "ROOM15" },
  ];

  it("reutiliza el código de la habitación base para subhabitaciones", () => {
    expect(findAccessCodeForRoom(codes, "42-1")?.roomCode).toBe("BASE42");
    expect(findAccessCodeForRoom(codes, "42-2")?.roomCode).toBe("BASE42");
    expect(findAccessCodeForRoom(codes, "42-3")?.roomCode).toBe("BASE42");
  });

  it("prioriza un código específico y no aproxima números no relacionados", () => {
    const withSpecific = [...codes, { roomNumber: "42-1", roomCode: "SPECIFIC42_1" }];
    expect(findAccessCodeForRoom(withSpecific, "42-1")?.roomCode).toBe("SPECIFIC42_1");
    expect(findAccessCodeForRoom(codes, "421")?.roomCode).toBeUndefined();
  });
});
