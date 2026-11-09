import { describe, expect, it } from "vitest";
import { COSTCO_CATALOG } from "../shared/costcoCatalog";
import { calculateCostcoOrderItem } from "../shared/costcoOrders";
import {
  costcoOrderCopy,
  costcoOrderCsv,
  costcoOrderEmailHtml,
  costcoOrderEmailText,
} from "../shared/costcoOrderExport";

const example = [
  ["costco-08", 15],
  ["costco-09", 20],
  ["costco-12", 4],
  ["costco-31", 1],
  ["costco-14", 3],
  ["costco-23", 1],
  ["costco-25", 1],
  ["costco-18", 1],
  ["costco-21", 1],
  ["costco-04", 1],
  ["costco-03", 1],
  ["costco-01", 1],
  ["costco-02", 1],
] as const;
const rows = example.map(([id, quantity]) => {
  const catalog = COSTCO_CATALOG.find(item => item.id === id)!;
  return {
    ...catalog,
    quantity,
    ...calculateCostcoOrderItem({
      cost: catalog.cost,
      quantity,
      inventoryStock: "111",
      unitsPerPackage: 40,
    }),
    inventoryProductName: "Dato interno secreto",
  };
});

describe("Costco: copia del pedido", () => {
  it("copia solo item, descripción y cantidad en el orden del pedido", () => {
    const text = costcoOrderCopy(rows);
    expect(text.split("\n")).toEqual([
      "Item\tDescripción\tCantidad",
      ...rows.map(row => `${row.costcoCode}\t${row.name}\t${row.quantity}`),
    ]);
    expect(text).not.toContain("PVP");
    expect(text).not.toContain("TOTAL PEDIDO");
    expect(text).not.toContain("€");
    expect(text.split("\n").every(line => line.split("\t").length === 3)).toBe(
      true
    );
  });
  it("excluye cantidades cero y campos internos del inventario", () => {
    const text = costcoOrderCopy([
      ...rows,
      { ...rows[0], name: "No pedir", quantity: 0, totalCost: "0.00" },
    ]);
    expect(text).not.toContain("No pedir");
    expect(text).not.toContain("Dato interno secreto");
    expect(text).not.toContain("Total previsto");
    expect(text).not.toContain("Unidad/Paquete");
    expect(text).not.toContain("Hay");
  });
  it("limpia tabuladores y saltos de línea sin añadir columnas ni filas", () => {
    const text = costcoOrderCopy([{ ...rows[0], name: "Agua\tCostco\nextra" }]);
    expect(text).toBe(
      "Item\tDescripción\tCantidad\n1138180\tAgua Costco extra\t15"
    );
    expect(costcoOrderCopy([])).toBe("Item\tDescripción\tCantidad");
  });
  it("mantiene el CSV detallado con precios y total de 296,89 euros", () => {
    const csv = costcoOrderCsv(rows);
    expect(csv.split("\r\n")[0]).toBe(
      '"Item";"Descripción";"Cantidad";"PVP unidad";"PVP total"'
    );
    expect(csv).toContain("TOTAL PEDIDO");
    expect(csv).toMatch(/296,89\s?€/);
  });
  it("exporta CSV escapando comillas y evitando columnas rotas", () => {
    const csv = costcoOrderCsv([
      { ...rows[0], name: 'Agua "Costco"; prueba\nextra' },
    ]);
    expect(csv).toContain('"Agua ""Costco""; prueba extra"');
    expect(csv.split("\r\n")).toHaveLength(3);
  });
  it("conserva las dos filas con código Costco repetido como artículos distintos", () => {
    expect(COSTCO_CATALOG).toHaveLength(31);
    expect(new Set(COSTCO_CATALOG.map(row => row.id)).size).toBe(31);
    expect(
      COSTCO_CATALOG.filter(row => row.costcoCode === "1008215").map(
        row => row.cost
      )
    ).toEqual(["5.99", "4.49"]);
  });
});

describe("Costco: formatos para correo", () => {
  const bodyCells = (html: string) =>
    [...html.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].flatMap(([, body]) =>
      [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, row]) =>
        [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(
          ([, cell]) => cell
        )
      )
    );

  it("genera una tabla real de exactamente tres columnas con encabezados y estilos inline", () => {
    const html = costcoOrderEmailHtml(rows);
    expect(html.match(/<table\b/g)).toHaveLength(1);
    expect(html).toMatch(/^<table\b[\s\S]*<\/table>$/);
    expect(
      [...html.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(
        ([, header]) => header
      )
    ).toEqual(["Item", "Descripción", "Cantidad"]);
    expect(bodyCells(html)).toEqual(
      rows.map(row => [row.costcoCode, row.name, String(row.quantity)])
    );
    expect(bodyCells(html).every(cells => cells.length === 3)).toBe(true);
    for (const [tag] of html.matchAll(/<(?:table|th|td)\b[^>]*>/g)) {
      expect(tag).toMatch(/style="[^"]*border[^";]*:/);
      if (!tag.startsWith("<table")) {
        expect(tag).toMatch(/style="[^"]*padding:8px 12px;/);
      }
    }
    expect(html).not.toMatch(/<(?:style|script|img|a|link)\b/i);
  });

  it("escapa todos los caracteres HTML especiales de códigos y descripciones", () => {
    const unsafe = `&<>"'<script>alert("x")</script><img src=x onerror='alert(1)'><a href="javascript:alert(1)">enlace</a>`;
    const safe = "&amp;&lt;&gt;&quot;&#39;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&lt;img src=x onerror=&#39;alert(1)&#39;&gt;&lt;a href=&quot;javascript:alert(1)&quot;&gt;enlace&lt;/a&gt;";
    const html = costcoOrderEmailHtml([
      { ...rows[0], costcoCode: unsafe, name: unsafe, quantity: 2 },
    ]);
    expect(bodyCells(html)).toEqual([[safe, safe, "2"]]);
    expect(html).not.toContain(unsafe);
    expect(html).not.toMatch(/<(?:script|img|a)\b/i);
    expect(bodyCells(html)[0][0]).not.toMatch(/&(?!amp;|lt;|gt;|quot;|#39;)/);
  });

  it("omite cantidades cero y conserva el orden y las filas con códigos repetidos", () => {
    const repeated = [
      { ...rows[0], costcoCode: "REPETIDO", name: "Primero", quantity: 2 },
      { ...rows[0], costcoCode: "OMITIDO", name: "No pedir", quantity: 0 },
      { ...rows[0], costcoCode: "OTRO", name: "Segundo", quantity: 3 },
      { ...rows[0], costcoCode: "REPETIDO", name: "Tercero", quantity: 1 },
    ];
    expect(bodyCells(costcoOrderEmailHtml(repeated))).toEqual([
      ["REPETIDO", "Primero", "2"],
      ["OTRO", "Segundo", "3"],
      ["REPETIDO", "Tercero", "1"],
    ]);
    expect(costcoOrderEmailText(repeated)).toBe(
      "Item: REPETIDO\nDescripción: Primero\nCantidad: 2\n\n" +
        "Item: OTRO\nDescripción: Segundo\nCantidad: 3\n\n" +
        "Item: REPETIDO\nDescripción: Tercero\nCantidad: 1"
    );
  });

  it("genera bloques legibles con solo item, descripción y cantidad", () => {
    const text = costcoOrderEmailText(rows);
    expect(text.split("\n\n")).toEqual(
      rows.map(
        row =>
          `Item: ${row.costcoCode}\nDescripción: ${row.name}\nCantidad: ${row.quantity}`
      )
    );
    expect(text).not.toContain("\t");
    for (const output of [text, costcoOrderEmailHtml(rows)]) {
      expect(output).not.toMatch(/PVP|TOTAL PEDIDO|€|Dato interno secreto/);
    }
  });

  it("limpia tabuladores y saltos de línea en los campos del texto sin alterar caracteres legibles", () => {
    const text = costcoOrderEmailText([
      {
        ...rows[0],
        costcoCode: "A\tB\r\nC",
        name: `Agua\tCostco\nextra & <prueba> "dobles" 'simples'`,
        quantity: 2,
      },
    ]);
    expect(text).toBe(
      `Item: A B C\nDescripción: Agua Costco extra & <prueba> "dobles" 'simples'\nCantidad: 2`
    );
  });

  it("conserva encabezados HTML sin artículos y devuelve texto vacío para un pedido vacío", () => {
    for (const empty of [[], [{ ...rows[0], quantity: 0 }]]) {
      const html = costcoOrderEmailHtml(empty);
      expect(bodyCells(html)).toEqual([]);
      expect(html.match(/<th\b/g)).toHaveLength(3);
      expect(html).toContain("<tbody></tbody>");
      expect(costcoOrderEmailText(empty)).toBe("");
    }
  });

  it("mantiene exactamente el CSV con costes, total, comillas, separadores y saltos CRLF", () => {
    const csv = costcoOrderCsv([
      {
        ...rows[0],
        costcoCode: "ABC",
        name: 'Agua "Costco"; prueba\nextra',
        cost: "12.50",
        quantity: 2,
        totalCost: "25.00",
      },
      { ...rows[0], name: "No pedir", quantity: 0, totalCost: "0.00" },
    ]);
    expect(csv).toBe(
      '"Item";"Descripción";"Cantidad";"PVP unidad";"PVP total"\r\n' +
        '"ABC";"Agua ""Costco""; prueba extra";"2";"12,50\u00a0€";"25,00\u00a0€"\r\n' +
        '"";"TOTAL PEDIDO";"";"";"25,00\u00a0€"'
    );
  });
});
