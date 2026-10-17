"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Store,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Package,
  Plus,
  RefreshCw,
  ArrowLeft,
  FileSpreadsheet,
  Download,
  Key,
  ShieldCheck,
  ChevronRight,
  Database,
  FileText,
  AlertCircle,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { flattenCatalog } from "@/lib/catalog-shapes";

const PRESET_FEEDS = {
  urban: [
    {
      name: "Urban Minimalist Waterproof Parka",
      category: "apparel",
      price: 119.0,
      originalPrice: 160.0,
      size: "Large",
      color: "Matte Black",
      sku: "URB-PARKA-BLK",
      store: "Urban Athletics Co",
      image:
        "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80",
      description:
        "Triple-layer technical membrane with taped seams and thermal storm collar.",
    },
    {
      name: "Carbon Fiber Running Insole Inserts",
      category: "shoes",
      price: 34.99,
      originalPrice: 49.99,
      size: "Size 10-11",
      color: "Carbon Gray",
      sku: "URB-INSOLE-CF",
      store: "Urban Athletics Co",
      image:
        "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=600&q=80",
      description:
        "Aerospace-grade composite spring plate for 12% increased energy restitution.",
    },
  ],
  alpine: [
    {
      name: "Alpine Pro Titanium Thermal Bottle",
      category: "fitness",
      price: 44.5,
      originalPrice: 65.0,
      size: "750ml",
      color: "Brushed Titanium",
      sku: "ALP-BOT-TI750",
      store: "Alpine Outdoor Labs",
      image:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
      description:
        "Ultralight grade 1 titanium with vacuum wall insulation and paracord sling.",
    },
    {
      name: "Vibram MegaGrip Trail Stride Shoes",
      category: "shoes",
      price: 84.99,
      originalPrice: 120.0,
      size: "Size 10",
      color: "Olive & Amber",
      sku: "ALP-TRAIL-10OLV",
      store: "Alpine Outdoor Labs",
      image:
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80",
      description:
        "Aggressive 5mm multi-directional lugs with rock shield puncture protection.",
    },
  ],
};

function MerchantPortalContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "inventory";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [catalogCount, setCatalogCount] = useState(0);
  const [catalogItems, setCatalogItems] = useState([]);
  const catalogVariants = flattenCatalog(catalogItems);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  // Store Sign-Up Profile State
  const [storeProfile, setStoreProfile] = useState({
    name: "Apex Athletic Store",
    email: "merchant@apexathletic.com",
    platform: "Shopify API",
    paypalMerchantId: "sb-merchant-apex@business.example.com",
    returnDays: "30 Days",
    isRegistered: true,
  });

  // Excel / CSV File Parsing State
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [merchantToken, setMerchantToken] = useState("");
  const [merchantSessionActive, setMerchantSessionActive] = useState(false);
  const [merchantAuthBusy, setMerchantAuthBusy] = useState(false);
  const [merchantAuthMessage, setMerchantAuthMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetch("/api/merchant/session")
      .then((response) => response.json())
      .then((data) => {
        if (active) setMerchantSessionActive(data.authenticated === true);
      })
      .catch((error) => {
        console.error("Failed to check merchant session:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const updateTab = window.setTimeout(() => setActiveTab(tabParam), 0);
      return () => window.clearTimeout(updateTab);
    }
  }, [searchParams]);

  const fetchCatalogStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/merchant/import");
      const data = await res.json();
      setCatalogCount(data.total || 0);
      setCatalogItems(data.catalog || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void fetchCatalogStatus();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  // Handle Drag & Drop Excel / CSV Upload
  const handleFileUpload = (e) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;

    setFileName(file.name);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (!data || data.length === 0) {
          setImportStatus({
            type: "error",
            message:
              "Spreadsheet appears to be empty. Please check the file contents.",
          });
          return;
        }

        const normalized = data.map((row, idx) => ({
          name:
            row.name ||
            row.Name ||
            row.product_name ||
            row["Product Name"] ||
            `Imported Item ${idx + 1}`,
          category: (row.category || row.Category || "general").toLowerCase(),
          price: parseFloat(row.price || row.Price || 49.99),
          originalPrice: parseFloat(
            row.original_price ||
              row["Original Price"] ||
              row.originalPrice ||
              69.99,
          ),
          size: String(row.size || row.Size || "Standard"),
          color: String(row.color || row.Color || "Default"),
          sku: String(row.sku || row.SKU || `SKU-IMP-${idx + 1}`),
          store: storeProfile.name || "Merchant Partner",
          image: row.image || row.image_url || row["Image URL"] || "",
          description:
            row.description ||
            row.Description ||
            "Imported via SwiftCart Merchant Excel Pipeline.",
        }));

        setParsedRows(normalized);
        setImportStatus({
          type: "success",
          message: `Parsed ${normalized.length} valid rows from "${file.name}". Review the preview table below and click "Publish Goods" to commit.`,
        });
      } catch (err) {
        setImportStatus({
          type: "error",
          message: `Failed to parse Excel file: ${err.message}`,
        });
      }
    };

    reader.readAsBinaryString(file);
  };

  // Commit Parsed Goods to the Server Catalog
  const postCatalogImport = async (storeName, items) => {
    const res = await fetch("/api/merchant/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ storeName, items }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to import goods.");
    return data;
  };

  const handleMerchantLogin = async (event) => {
    event.preventDefault();
    setMerchantAuthBusy(true);
    setMerchantAuthMessage("");
    try {
      const response = await fetch("/api/merchant/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: merchantToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Merchant sign-in failed.");
      setMerchantToken("");
      setMerchantSessionActive(true);
      setMerchantAuthMessage("Signed in. Inventory publishing is enabled.");
    } catch (error) {
      setMerchantAuthMessage(error.message || "Merchant sign-in failed.");
    } finally {
      setMerchantAuthBusy(false);
    }
  };

  const handleMerchantLogout = async () => {
    const response = await fetch("/api/merchant/session", { method: "DELETE" });
    if (!response.ok) {
      setMerchantAuthMessage("Could not end the merchant session.");
      return;
    }
    setMerchantSessionActive(false);
    setMerchantAuthMessage("Signed out.");
  };

  const handleCommitParsedGoods = async () => {
    if (!parsedRows || parsedRows.length === 0) return;

    setIsImporting(true);
    try {
      const data = await postCatalogImport(storeProfile.name, parsedRows);
      setImportStatus({
        type: "success",
        message: `Successfully ingested ${data.importedCount} new goods into the catalog! Total live inventory is now ${data.totalCatalogCount} items.`,
      });
      setParsedRows([]);
      setFileName("");
      fetchCatalogStatus();
    } catch (err) {
      setImportStatus({
        type: "error",
        message: err.message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        name: "Pro Sprint Carbon Road Shoes",
        category: "shoes",
        price: 89.99,
        original_price: 120.0,
        size: "Size 10",
        color: "Midnight Blue",
        sku: "PRO-SPR-10BLU",
        image_url:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
        description:
          "Carbon fiber plate running shoes engineered for fast tempo road runs.",
      },
      {
        name: "Aero Mesh Breathable Running Singlet",
        category: "apparel",
        price: 38.0,
        original_price: 50.0,
        size: "Medium",
        color: "Navy",
        sku: "AERO-SING-MED",
        image_url:
          "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
        description:
          "Laser-cut ventilation holes with anti-odor silver ion thread treatment.",
      },
      {
        name: "Hydration Flask 500ml Ergonomic Pack",
        category: "fitness",
        price: 22.5,
        original_price: 30.0,
        size: "500ml",
        color: "Translucent Blue",
        sku: "HYD-FLASK-500",
        image_url:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
        description:
          "BPA-free high-flow bite valve designed for marathon hydration vests.",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "InventoryTemplate");
    XLSX.writeFile(wb, "SwiftCart_Merchant_Inventory_Template.xlsx");
  };

  return (
    <div className="flex w-full flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-stone-300 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Studio</span>
          </Link>
          <button
            onClick={fetchCatalogStatus}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-stone-200 transition disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Sync Inventory</span>
          </button>
          <Link
            href="/connections"
            className="inline-flex items-center rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-amber-300 transition"
          >
            API Status
          </Link>
        </div>
      </div>

      <div>
        <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">
          Inventory
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          What you have.
        </h1>
        <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-stone-400">
          Track every listing in the catalog. Products marked unavailable are
          excluded from agent results.
        </p>
      </div>

      {/* Live Network Metrics Banner */}
      <div className="hidden grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-white/10 bg-[#1f1a16]/95 p-6 backdrop-blur-xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-stone-400 text-xs block font-medium">
              Live Ingested Goods:
            </span>
            <span className="text-3xl font-extrabold text-white mt-1 block">
              {catalogCount} Items
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#1f1a16]/95 p-6 backdrop-blur-xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-stone-400 text-xs block font-medium">
              Store Status:
            </span>
            <span className="text-3xl font-extrabold text-emerald-400 mt-1 block">
              {storeProfile.isRegistered ? "Connected" : "Pending"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#1f1a16]/95 p-6 backdrop-blur-xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-stone-400 text-xs block font-medium">
              Payout Settlement:
            </span>
            <span className="text-3xl font-extrabold text-amber-300 mt-1 block">
              PayPal Sandbox
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Step Navigation Bar */}
      <div className="flex gap-2 overflow-x-auto border-b border-white/10 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { id: "inventory", label: "Inventory" },
          { id: "excel", label: "1. Excel & CSV Ingestion" },
          { id: "store", label: "2. Store & PayPal Profile" },
          { id: "presets", label: "3. Preset Supplier Feeds" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap text-xs font-semibold px-4 py-2 rounded-full transition ${
              activeTab === tab.id
                ? "bg-amber-400/20 text-amber-200 border border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                : "text-stone-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(activeTab === "excel" || activeTab === "presets") && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
          {merchantSessionActive ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-emerald-200">
                Merchant session active. The session token is stored in an
                HttpOnly cookie.
              </p>
              <button
                type="button"
                onClick={handleMerchantLogout}
                className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-stone-200"
              >
                Sign out
              </button>
            </div>
          ) : (
            <form onSubmit={handleMerchantLogin}>
              <label
                htmlFor="merchant-login-token"
                className="block text-xs font-bold text-amber-100"
              >
                Merchant sign-in
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="merchant-login-token"
                  type="password"
                  autoComplete="current-password"
                  value={merchantToken}
                  onChange={(event) => setMerchantToken(event.target.value)}
                  placeholder="Enter merchant credentials"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-300 sm:max-w-xl"
                />
                <button
                  type="submit"
                  disabled={merchantAuthBusy || !merchantToken.trim()}
                  className="rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-bold text-black disabled:opacity-50"
                >
                  {merchantAuthBusy ? "Signing in…" : "Sign in"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-stone-400">
                The credential is exchanged with this server and then cleared
                from the form. It is never stored in browser storage.
              </p>
            </form>
          )}
          {merchantAuthMessage && (
            <p className="mt-2 text-xs text-stone-200" role="status">
              {merchantAuthMessage}
            </p>
          )}
        </div>
      )}

      {activeTab === "inventory" && (
        <section className="overflow-hidden rounded-[18px] border border-[#e4ebeb] bg-white p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold">Catalog inventory</h2>
              <p className="mt-1 text-xs text-[#596669]">
                {loading
                  ? "Loading listingsâ€¦"
                  : `${catalogItems.length} products · ${catalogVariants.length} variants`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("excel")}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#073e32] px-4 text-xs font-bold text-white transition hover:bg-[#0b5746]"
            >
              <Plus className="h-4 w-4" />
              Add products
            </button>
          </div>
          {catalogVariants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e8eeee]">
                    <th className="px-2 py-3">Product</th>
                    <th className="px-2 py-3">Color / size</th>
                    <th className="px-2 py-3">SKU</th>
                    <th className="px-2 py-3">Price</th>
                    <th className="px-2 py-3">Merchant</th>
                    <th className="px-2 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogVariants.map((item) => (
                    <tr
                      key={item.sku}
                      className="border-b border-[#edf1f1] last:border-0"
                    >
                      <td className="px-2 py-3 font-bold">{item.name}</td>
                      <td className="px-2 py-3 capitalize">
                        {item.color} / {item.size}
                      </td>
                      <td className="px-2 py-3 font-mono text-[11px]">
                        {item.sku}
                      </td>
                      <td className="px-2 py-3">
                        ${Number(item.price).toFixed(2)}
                      </td>
                      <td className="px-2 py-3">{item.store}</td>
                      <td className="px-2 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${item.inStock ? "bg-[#e3f3ed] text-[#087650]" : "bg-[#fce7e7] text-[#a63232]"}`}
                        >
                          {item.inStock ? "In stock" : "Out of stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-[#596669]">
              {loading
                ? "Loading catalogâ€¦"
                : "No listings yet. Add products to populate your catalog."}
            </div>
          )}
        </section>
      )}

      {/* TAB 1: EXCEL / CSV DRAG & DROP PIPELINE */}
      {activeTab === "excel" && (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-[#e3e8ee] rounded-3xl p-6 md:p-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#001c64] flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#0070ba]" />
                  <span>
                    Upload Merchant Inventory File (.xlsx, .xls, .csv)
                  </span>
                </h2>
                <p className="text-xs text-[#545d68] mt-1">
                  Upload your raw inventory spreadsheet. Columns are parsed
                  automatically in your browser.
                </p>
              </div>

              <button
                onClick={handleDownloadTemplate}
                className="self-start sm:self-auto flex items-center gap-2 text-xs font-semibold text-[#001c64] bg-[#f5f7fa] hover:bg-[#eef6fc] px-4 py-2.5 rounded-xl border border-[#e3e8ee] transition"
              >
                <Download className="w-4 h-4 text-[#0070ba]" />
                <span>Download Excel Template</span>
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#d5dbe3] hover:border-[#0070ba] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition bg-[#f5f7fa] hover:bg-[#f5f7fa]"
            >
              <div className="w-14 h-14 rounded-full bg-[#eef6fc] border border-[#c7e0f5] flex items-center justify-center text-[#0070ba]">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="text-center">
                <span className="text-sm font-bold text-[#001c64] block">
                  {fileName
                    ? `Loaded: ${fileName}`
                    : "Click to browse or drag & drop inventory file"}
                </span>
                <span className="text-xs text-[#545d68] block mt-1">
                  Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated
                  Values (.csv)
                </span>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />
            </div>

            {importStatus && (
              <div
                className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
                  importStatus.type === "success"
                    ? "bg-[#e8f6ee] border-[#b7e4c7] text-[#007d3a]"
                    : "bg-[#fdecec] border-[#f5c2c2] text-[#c72c2c]"
                }`}
              >
                {importStatus.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 shrink-0" />
                )}
                <span>{importStatus.message}</span>
              </div>
            )}
          </div>

          {parsedRows.length > 0 && (
            <div className="bg-white border border-[#e3e8ee] rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#001c64] uppercase tracking-wider">
                    Preview Parsed Goods ({parsedRows.length} Rows)
                  </h3>
                  <p className="text-xs text-[#545d68] mt-0.5">
                    Verify data mapping before committing into the live agent
                    catalog.
                  </p>
                </div>

                <button
                  onClick={handleCommitParsedGoods}
                  disabled={isImporting || !merchantSessionActive}
                  className="py-2.5 px-6 rounded-xl bg-[#ffc439] hover:bg-[#f5b800] text-[#001c64] font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-amber-400/20 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isImporting ? "Publishing..." : "Publish Goods to Network"}
                  </span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#e3e8ee] bg-[#f5f7fa]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white border-b border-[#e3e8ee] text-[#545d68] uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Size/Color</th>
                      <th className="p-3">Image Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e3e8ee] text-[#2c2e2f]">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className="hover:bg-white">
                        <td className="p-3 font-semibold text-[#001c64]">
                          {r.name}
                        </td>
                        <td className="p-3 uppercase text-[10px] text-[#0070ba]">
                          {r.category}
                        </td>
                        <td className="p-3 font-mono text-[#545d68] text-[11px]">
                          {r.sku}
                        </td>
                        <td className="p-3 font-bold text-[#007d3a]">
                          ${r.price.toFixed(2)}
                        </td>
                        <td className="p-3 text-[#545d68]">
                          {r.size} Â· {r.color}
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] bg-emerald-500/20 text-[#007d3a] px-2 py-0.5 rounded font-bold">
                            {r.image ? "Custom URL" : "Auto-Resolved"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STORE SIGN-UP & PAYPAL ONBOARDING */}
      {activeTab === "store" && (
        <div className="bg-white border border-[#e3e8ee] rounded-3xl p-6 md:p-8 flex flex-col gap-6">
          <div>
            <h2 className="text-base font-bold text-[#001c64] flex items-center gap-2">
              <Store className="w-5 h-5 text-[#0070ba]" />
              <span>Store Profile &amp; PayPal Sandbox Payout Settings</span>
            </h2>
            <p className="text-xs text-[#545d68] mt-1">
              Configure your store identity and PayPal Sandbox merchant account
              so buyer payments settle to your store.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[#545d68] block mb-1 font-medium">
                Merchant Business Name
              </label>
              <input
                type="text"
                value={storeProfile.name}
                onChange={(e) =>
                  setStoreProfile({ ...storeProfile, name: e.target.value })
                }
                className="w-full bg-[#f5f7fa] border border-[#d5dbe3] rounded-xl px-4 py-2.5 text-[#001c64] focus:outline-none focus:border-amber-400/60"
              />
            </div>

            <div>
              <label className="text-[#545d68] block mb-1 font-medium">
                Contact Business Email
              </label>
              <input
                type="email"
                value={storeProfile.email}
                onChange={(e) =>
                  setStoreProfile({ ...storeProfile, email: e.target.value })
                }
                className="w-full bg-[#f5f7fa] border border-[#d5dbe3] rounded-xl px-4 py-2.5 text-[#001c64] focus:outline-none focus:border-amber-400/60"
              />
            </div>

            <div>
              <label className="text-[#545d68] block mb-1 font-medium">
                E-Commerce Platform Feed
              </label>
              <select
                value={storeProfile.platform}
                onChange={(e) =>
                  setStoreProfile({ ...storeProfile, platform: e.target.value })
                }
                className="w-full bg-[#f5f7fa] border border-[#d5dbe3] rounded-xl px-4 py-2.5 text-[#001c64] focus:outline-none focus:border-amber-400/60"
              >
                <option value="Shopify API">Shopify Store API</option>
                <option value="WooCommerce">WooCommerce REST v3</option>
                <option value="Custom REST / CSV">
                  Custom Inventory CSV Feed
                </option>
              </select>
            </div>

            <div>
              <label className="text-[#545d68] block mb-1 font-medium">
                PayPal Merchant Payout ID / Email
              </label>
              <input
                type="text"
                value={storeProfile.paypalMerchantId}
                onChange={(e) =>
                  setStoreProfile({
                    ...storeProfile,
                    paypalMerchantId: e.target.value,
                  })
                }
                className="w-full bg-[#f5f7fa] border border-[#d5dbe3] rounded-xl px-4 py-2.5 text-[#0070ba] font-mono focus:outline-none focus:border-amber-400/60"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#f5f7fa] border border-[#e3e8ee] text-xs text-[#2c2e2f] flex items-center justify-between">
            <div>
              <span className="font-bold text-[#001c64] block">
                Connected Settlement Protocol
              </span>
              <span className="text-[#545d68]">
                PayPal Multiparty Orders v2 Sandbox Integration
              </span>
            </div>
            <span className="text-[11px] bg-emerald-500/20 text-[#007d3a] px-3 py-1 rounded-full font-bold">
              Active &amp; Ready
            </span>
          </div>

          <button
            onClick={() => {
              setImportStatus({
                type: "success",
                message: `Merchant profile "${storeProfile.name}" updated successfully.`,
              });
            }}
            className="self-start py-2.5 px-6 rounded-xl bg-[#f5f7fa] hover:bg-[#eef6fc] text-[#001c64] font-semibold text-xs transition"
          >
            Save Profile Changes
          </button>
        </div>
      )}

      {/* TAB 3: PRESET SUPPLIER FEEDS */}
      {activeTab === "presets" && (
        <div className="bg-white border border-[#e3e8ee] rounded-3xl p-6 md:p-8 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#001c64]">
              1-Click Preset Supplier Feeds
            </h2>
            <p className="text-xs text-[#545d68] mt-0.5">
              Simulate instant catalog sync from partner merchant feeds with
              automatic photo resolution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-[#f5f7fa] border border-[#e3e8ee] rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#001c64]">
                    Urban Athletics Co.
                  </span>
                  <span className="text-[10px] bg-[#eef6fc] text-[#0070ba] px-2 py-0.5 rounded-full font-bold">
                    2 Products Ready
                  </span>
                </div>
                <p className="text-xs text-[#545d68] leading-relaxed">
                  Technical apparel, waterproof parkas, and carbon fiber running
                  insoles with verified studio photography.
                </p>
              </div>

              <button
                onClick={async () => {
                  setIsImporting(true);
                  try {
                    const d = await postCatalogImport(
                      "Urban Athletics Co",
                      PRESET_FEEDS.urban,
                    );
                    if (d.success) {
                      setImportStatus({
                        type: "success",
                        message: `Ingested ${d.importedCount} items from Urban Athletics Co.`,
                      });
                      fetchCatalogStatus();
                    }
                  } catch (err) {
                    setImportStatus({ type: "error", message: err.message });
                  } finally {
                    setIsImporting(false);
                  }
                }}
                disabled={isImporting || !merchantSessionActive}
                className="w-full py-2.5 rounded-xl bg-[#eef6fc] hover:bg-[#e8f2fb] text-[#003087] border border-[#c7e0f5] text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>
                  {isImporting ? "Ingesting..." : "Import Urban Athletics Feed"}
                </span>
              </button>
            </div>

            <div className="bg-[#f5f7fa] border border-[#e3e8ee] rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#001c64]">
                    Alpine Outdoor Labs
                  </span>
                  <span className="text-[10px] bg-emerald-400/20 text-[#007d3a] px-2 py-0.5 rounded-full font-bold">
                    2 Products Ready
                  </span>
                </div>
                <p className="text-xs text-[#545d68] leading-relaxed">
                  Titanium thermal bottles and Vibram trail shoes with
                  multi-merchant comparison pricing.
                </p>
              </div>

              <button
                onClick={async () => {
                  setIsImporting(true);
                  try {
                    const d = await postCatalogImport(
                      "Alpine Outdoor Labs",
                      PRESET_FEEDS.alpine,
                    );
                    if (d.success) {
                      setImportStatus({
                        type: "success",
                        message: `Ingested ${d.importedCount} items from Alpine Outdoor Labs.`,
                      });
                      fetchCatalogStatus();
                    }
                  } catch (err) {
                    setImportStatus({ type: "error", message: err.message });
                  } finally {
                    setIsImporting(false);
                  }
                }}
                disabled={isImporting || !merchantSessionActive}
                className="w-full py-2.5 rounded-xl bg-[#e8f6ee] hover:bg-[#d8f0e2] text-[#007d3a] border border-[#b7e4c7] text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>
                  {isImporting ? "Ingesting..." : "Import Alpine Outdoor Feed"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Catalog Stream Preview */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#2c2e2f]">
            Live Inventory Stream ({catalogItems.length} Products ·{" "}
            {catalogVariants.length} Variants)
          </h2>
          <Link
            href="/"
            className="text-xs font-semibold text-[#0070ba] hover:text-[#003087] flex items-center gap-1"
          >
            <span>Test in AI Search</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {catalogVariants.slice(0, 6).map((item) => (
            <div
              key={item.sku}
              className="bg-white border border-[#e3e8ee] rounded-2xl p-4 flex flex-col justify-between gap-3"
            >
              <div className="relative w-full h-32 rounded-xl overflow-hidden bg-[#f5f7fa] border border-[#e3e8ee]">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                <div className="absolute top-2 right-2 rounded bg-white px-2 py-0.5 text-[10px] font-bold text-[#001c64] shadow-sm">
                  {item.currency} {item.price.toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-[#0070ba] uppercase tracking-wider">
                  {item.store}
                </div>
                <h3 className="font-bold text-[#001c64] text-xs mt-0.5 truncate">
                  {item.name}
                </h3>
                <p className="text-[11px] text-[#545d68] mt-1 line-clamp-2">
                  {item.color} · size {item.size} · {item.stock} in stock
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MerchantPortal() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="text-sm text-[#545d68]">Loading merchant portalâ€¦</div>
        }
      >
        <MerchantPortalContent />
      </Suspense>
    </PageShell>
  );
}
