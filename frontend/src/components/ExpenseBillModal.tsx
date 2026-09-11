"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Receipt,
  FileText,
  DollarSign,
  Building2,
  Sparkles,
  Info,
  ShieldAlert,
} from "lucide-react";
import {
  api,
  ExpenseBillItemInput,
  MaterialBenchmarkItem,
  BillAnalysisPreviewResult,
} from "@/lib/api";

interface ExpenseBillModalProps {
  projectId: string;
  projectCode?: string;
  projectName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_NORMAL: { vendor: string; inv: string; items: ExpenseBillItemInput[] } = {
  vendor: "Balaji Cement & Construction Mart",
  inv: "INV-2026-0819",
  items: [
    { item_name: "OPC 53 Grade Cement", category: "cement", quantity: 300, unit: "bags", claimed_unit_price: 385 },
    { item_name: "Fe500D TMT Rebar Steel", category: "steel_tmt", quantity: 2500, unit: "kg", claimed_unit_price: 63.5 },
    { item_name: "River Sand (Coarse)", category: "sand", quantity: 35, unit: "cu.m", claimed_unit_price: 1850 },
    { item_name: "20mm Coarse Aggregate", category: "aggregate", quantity: 40, unit: "cu.m", claimed_unit_price: 1220 },
  ],
};

const PRESET_FRAUD_INFLATED: { vendor: string; inv: string; items: ExpenseBillItemInput[] } = {
  vendor: "Apex Infra & Material Suppliers",
  inv: "INV-2026-9941",
  items: [
    { item_name: "OPC 53 Grade Cement (Over-invoiced)", category: "cement", quantity: 450, unit: "bags", claimed_unit_price: 640 }, // +68.4%
    { item_name: "TMT Rebar 12mm Fe500 (Escalated)", category: "steel_tmt", quantity: 3200, unit: "kg", claimed_unit_price: 104 }, // +67.7%
    { item_name: "River Sand Bulk (Escalated)", category: "sand", quantity: 50, unit: "cu.m", claimed_unit_price: 3200 }, // +77.7%
    { item_name: "Class 1 Red Clay Bricks", category: "bricks", quantity: 15000, unit: "nos", claimed_unit_price: 14.5 }, // +70.5%
  ],
};

const PRESET_MODERATE: { vendor: string; inv: string; items: ExpenseBillItemInput[] } = {
  vendor: "National Earthmovers & Labor Syndicate",
  inv: "INV-2026-4412",
  items: [
    { item_name: "Skilled Mason & Bar Benders", category: "labor_skilled", quantity: 60, unit: "person-day", claimed_unit_price: 1150 }, // +35.3%
    { item_name: "JCB Excavator 3DX Rental", category: "machinery_jcb", quantity: 45, unit: "hours", claimed_unit_price: 2100 }, // +31.2%
    { item_name: "Fly Ash Bricks", category: "bricks", quantity: 8000, unit: "nos", claimed_unit_price: 11.2 }, // +31.7%
  ],
};

export function ExpenseBillModal({
  projectId,
  projectCode,
  projectName,
  isOpen,
  onClose,
  onSuccess,
}: ExpenseBillModalProps) {
  const [vendorName, setVendorName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [fileName, setFileName] = useState("");
  const [items, setItems] = useState<ExpenseBillItemInput[]>([
    { item_name: "", category: "cement", quantity: 100, unit: "bags", claimed_unit_price: 0 },
  ]);

  const [benchmarks, setBenchmarks] = useState<MaterialBenchmarkItem[]>([]);
  const [previewResult, setPreviewResult] = useState<BillAnalysisPreviewResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Load benchmarks
  useEffect(() => {
    if (isOpen) {
      api.getMaterialBenchmarks()
        .then((bms) => setBenchmarks(bms))
        .catch(() => {});
    }
  }, [isOpen]);

  // Update line item
  const updateItem = (index: number, field: keyof ExpenseBillItemInput, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };

    // Auto-update unit & name recommendation if category changed
    if (field === "category") {
      const bm = benchmarks.find((b) => b.category === value);
      if (bm) {
        next[index].unit = bm.unit;
        if (!next[index].item_name || next[index].item_name.trim() === "") {
          next[index].item_name = bm.name;
        }
      }
    }

    setItems(next);
    setPreviewResult(null); // invalidate preview
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { item_name: "", category: "cement", quantity: 10, unit: "bags", claimed_unit_price: 0 },
    ]);
    setPreviewResult(null);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
    setPreviewResult(null);
  };

  const loadPreset = (preset: typeof PRESET_NORMAL) => {
    setVendorName(preset.vendor);
    setInvoiceNumber(preset.inv);
    setItems(preset.items);
    setFileName(`${preset.inv}.pdf`);
    setPreviewResult(null);
    setError(null);
  };

  const calculateTotalClaimed = () => {
    return items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0) * (Number(curr.claimed_unit_price) || 0), 0);
  };

  const runLiveAnalysis = async () => {
    try {
      setIsPreviewLoading(true);
      setError(null);
      const validItems = items.filter((i) => i.item_name.trim() !== "" && i.claimed_unit_price > 0);
      if (validItems.length === 0) {
        setError("Please add at least one line item with a non-zero price to analyze.");
        setIsPreviewLoading(false);
        return;
      }
      const res = await api.analyzeBillPreview(validItems);
      setPreviewResult(res);
      setActiveTab("preview");
    } catch (err: any) {
      setError(err.message || "Failed to analyze bill items.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vendorName.trim()) {
      setError("Please specify the Vendor / Supplier name.");
      return;
    }
    const validItems = items.filter((i) => i.item_name.trim() !== "" && Number(i.claimed_unit_price) > 0);
    if (validItems.length === 0) {
      setError("Please add at least one valid material line item with a price.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createExpenseBill({
        project_id: projectId,
        vendor_name: vendorName.trim(),
        invoice_number: invoiceNumber.trim() || undefined,
        bill_date: billDate,
        items: validItems,
        file_name: fileName || "invoice_receipt.pdf",
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit expense bill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Upload Expense Bill & AI Material Price Audit
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  CPWD Benchmark Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Project: <span className="font-semibold text-slate-700 dark:text-slate-300">{projectCode || projectId}</span> {projectName && `— ${projectName}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Quick-Fill Presets Bar */}
        <div className="bg-slate-50 dark:bg-slate-850 px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Quick Demo Presets:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => loadPreset(PRESET_NORMAL)}
              className="text-xs px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-medium transition-colors"
            >
              🟢 Normal Market Bill (Pass)
            </button>
            <button
              type="button"
              onClick={() => loadPreset(PRESET_FRAUD_INFLATED)}
              className="text-xs px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-medium transition-colors"
            >
              🚨 Severe Inflation Bill (Fraud Anomaly)
            </button>
            <button
              type="button"
              onClick={() => loadPreset(PRESET_MODERATE)}
              className="text-xs px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-medium transition-colors"
            >
              🟡 Elevated Rates (Review)
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Fields: Vendor & Invoice Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vendor / Supplier Name *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Balaji Steel & Cement Traders"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Invoice / Bill Number
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. INV-2026-9810"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bill Date
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Receipt attachment mock */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-slate-400" />
              <div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {fileName ? fileName : "Attach Vendor Invoice / Voucher (PDF/Scan)"}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Invoice receipts are cryptographically hashed and indexed in the forensic dossier.
                </p>
              </div>
            </div>
            <label className="text-xs font-semibold px-3 py-1.5 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer shadow-xs">
              Choose File
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFileName(e.target.files[0].name);
                  }
                }}
              />
            </label>
          </div>

          {/* Tabs: Edit Line Items vs AI Comparison Preview */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`pb-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "edit"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <FileText className="w-4 h-4" />
              1. Material Line Items ({items.length})
            </button>
            <button
              type="button"
              onClick={runLiveAnalysis}
              className={`pb-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "preview"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              2. AI Benchmark Comparison {previewResult && `(${previewResult.fraud_risk_level})`}
            </button>
          </div>

          {activeTab === "edit" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Bill Line Items (Claimed Unit Prices)
                </span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Prices will be checked against CPWD Schedule of Rates
                </span>
              </div>

              <div className="space-y-2.5">
                {items.map((item, idx) => {
                  const bm = benchmarks.find((b) => b.category === item.category);
                  const itemTotal = (Number(item.quantity) || 0) * (Number(item.claimed_unit_price) || 0);

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center"
                    >
                      <div className="flex-1 min-w-[180px]">
                        <input
                          type="text"
                          placeholder="Item Name (e.g. OPC 53 Cement)"
                          value={item.item_name}
                          onChange={(e) => updateItem(idx, "item_name", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium"
                        />
                      </div>

                      <div className="w-full sm:w-44">
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(idx, "category", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                        >
                          <option value="cement">Cement (₹380/bag)</option>
                          <option value="steel_tmt">TMT Steel (₹62/kg)</option>
                          <option value="sand">River Sand (₹1,800/cu.m)</option>
                          <option value="aggregate">Coarse Aggregate (₹1,200/cu.m)</option>
                          <option value="bricks">Red Bricks (₹8.50/pc)</option>
                          <option value="concrete_rmc">RMC Concrete (₹4,200/cu.m)</option>
                          <option value="bitumen">Bitumen VG30 (₹48/kg)</option>
                          <option value="steel_structural">Structural Steel (₹68/kg)</option>
                          <option value="pipes_pvc">PVC Pipes (₹420/m)</option>
                          <option value="labor_skilled">Skilled Mason (₹850/day)</option>
                          <option value="labor_unskilled">Helper Labor (₹550/day)</option>
                          <option value="machinery_jcb">JCB Excavator (₹1,600/hr)</option>
                        </select>
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          placeholder="Qty"
                          value={item.quantity || ""}
                          onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-right"
                        />
                      </div>

                      <div className="w-20">
                        <input
                          type="text"
                          placeholder="Unit"
                          value={item.unit}
                          onChange={(e) => updateItem(idx, "unit", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-center"
                        />
                      </div>

                      <div className="w-28">
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-xs text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Unit Rate"
                            value={item.claimed_unit_price || ""}
                            onChange={(e) =>
                              updateItem(idx, "claimed_unit_price", parseFloat(e.target.value) || 0)
                            }
                            className="w-full pl-5 pr-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono font-medium text-right"
                          />
                        </div>
                      </div>

                      <div className="w-28 text-right font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 py-1.5">
                        ₹{itemTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors disabled:opacity-30 cursor-pointer"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">Total Invoice Amount:</span>
                    <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      ₹{calculateTotalClaimed().toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={runLiveAnalysis}
                    disabled={isPreviewLoading}
                    className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isPreviewLoading ? "Analyzing Rates..." : "Check Rates with AI"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* AI Comparison Analysis Report */}
              {previewResult ? (
                <div className="space-y-4">
                  {/* Summary Banner */}
                  <div
                    className={`p-4 rounded-xl border ${
                      previewResult.fraud_risk_level === "CRITICAL" || previewResult.fraud_risk_level === "HIGH"
                        ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200"
                        : previewResult.fraud_risk_level === "MODERATE"
                        ? "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200"
                        : "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {previewResult.fraud_risk_level === "CRITICAL" || previewResult.fraud_risk_level === "HIGH" ? (
                          <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        ) : previewResult.fraud_risk_level === "MODERATE" ? (
                          <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <h4 className="text-sm font-bold">
                            AI Price Audit: {previewResult.fraud_risk_level} FRAUD RISK ({previewResult.anomaly_score.toFixed(0)}/100)
                          </h4>
                          <p className="text-xs mt-1 leading-relaxed opacity-90">
                            {previewResult.summary}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-white/70 dark:bg-slate-900/80 border border-current shadow-xs">
                          {previewResult.overall_deviation_pct > 0 ? `+${previewResult.overall_deviation_pct}% Deviation` : `${previewResult.overall_deviation_pct}% Deviation`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Line Item Breakdown Table */}
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">Material Item</th>
                          <th className="p-3 text-right">Qty & Unit</th>
                          <th className="p-3 text-right">Claimed Rate</th>
                          <th className="p-3 text-right">CPWD Benchmark</th>
                          <th className="p-3 text-right">Price Deviation</th>
                          <th className="p-3">AI Verdict & Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                        {previewResult.items.map((it, idx) => {
                          const isHigh = it.status === "fraud_risk" || it.status === "severe_inflation";
                          return (
                            <tr key={idx} className={isHigh ? "bg-red-50/40 dark:bg-red-950/20" : ""}>
                              <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                                {it.item_name}
                                <span className="block text-[10px] text-slate-400 uppercase font-normal">{it.category}</span>
                              </td>
                              <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                                {it.quantity} {it.unit}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                ₹{it.claimed_unit_price.toFixed(2)}
                              </td>
                              <td className="p-3 text-right font-mono text-slate-500 dark:text-slate-400">
                                ₹{it.benchmark_unit_price.toFixed(2)}
                              </td>
                              <td className="p-3 text-right">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded font-mono font-bold ${
                                    it.deviation_pct > 35
                                      ? "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300"
                                      : it.deviation_pct > 15
                                      ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                                      : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                                  }`}
                                >
                                  {it.deviation_pct > 0 ? `+${it.deviation_pct}%` : `${it.deviation_pct}%`}
                                </span>
                              </td>
                              <td className="p-3 text-slate-600 dark:text-slate-300 text-[11px] leading-tight">
                                {it.notes}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={() => setActiveTab("edit")}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      ← Modify Line Items
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm">Click "Check Rates with AI" to inspect benchmark price deviations.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {items.length} line items • Total: ₹{calculateTotalClaimed().toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>Submitting & Auditing...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Submit Bill for Forensic Audit
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
