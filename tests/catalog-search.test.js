import test from "node:test";
import assert from "node:assert/strict";
import { searchCatalog } from "../src/lib/catalog-search.js";

const catalog = [
  {
    id: "blue-9",
    category: "running",
    color: "Electric Blue",
    price: 49,
    size: "9",
    inStock: true,
  },
  {
    id: "blue-multi-size",
    category: "running",
    color: "Navy",
    price: 59,
    sizes: [9, 10, 11],
    inStock: true,
  },
  {
    id: "blue-sold-out",
    category: "running",
    color: "Blue",
    price: 40,
    sizes: [10],
    inStock: false,
  },
  {
    id: "blue-over-budget",
    category: "running",
    color: "Blue",
    price: 90,
    sizes: [10],
    inStock: true,
  },
  {
    id: "casual-blue",
    category: "casual",
    color: "Blue",
    price: 55,
    sizes: [10],
    inStock: true,
  },
];

test("search applies color, size arrays, budget, and stock filters", () => {
  const results = searchCatalog(
    catalog,
    { query: "running shoes" },
    "cheapest blue running shoes under $80 size 10",
  );

  assert.deepEqual(
    results.map((product) => product.id),
    ["blue-multi-size"],
  );
});

test("running searches include legacy shoe-category products but not casual shoes", () => {
  const results = searchCatalog(
    [
      ...catalog,
      {
        id: "legacy-shoe",
        category: "shoes",
        color: "Blue",
        price: 50,
        size: "10",
        inStock: true,
      },
    ],
    { query: "running shoes" },
    "blue running shoes under $80 size 10",
  );

  assert.deepEqual(
    results.map((product) => product.id),
    ["blue-multi-size", "legacy-shoe"],
  );
});

test("a planned category and max price are honored", () => {
  const results = searchCatalog(
    catalog,
    { query: "shoes", category: "casual", max_price: 60, size: "10" },
    "comfortable shoe",
  );

  assert.deepEqual(
    results.map((product) => product.id),
    ["casual-blue"],
  );
});

test("a browse action keeps navy-and-white shoe requests on the matching shoe", () => {
  const results = searchCatalog(
    [
      {
        id: "nike-navy-white",
        name: "Nike Air Zoom Pegasus 40",
        category: "shoes",
        color: "Navy & White",
        price: 74.99,
        size: "10",
        inStock: true,
      },
      ...catalog,
    ],
    {
      query: "Navy White Nike Air Zoom Pegasus",
      category: "shoes",
    },
    "Find the Navy & White shoes Nike Air Zoom Pegasus 40 in size 10",
  );

  assert.deepEqual(
    results.map((product) => product.id),
    ["nike-navy-white"],
  );
});
