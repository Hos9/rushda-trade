"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatDate } from "@/lib/utils";

function emptyLine() {
  return { itemId: "", itemName: "", qty: "1", rate: "0" };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function SalesPage() {
  const supabase = createClient();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [invoiceNo, setInvoiceNo] = useState("");
  const [lines, setLines] = useState([emptyLine()]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const [salesRes, custRes, itemRes] = await Promise.all([
      supabase
        .from("sales")
        .select("*, customers(name)")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("*").order("name"),
      supabase.from("items").select("*").order("name"),
    ]);
    setSales(
      (salesRes.data || []).map((s) => ({ ...s, customerName: s.customers?.name }))
    );
    setCustomers(custRes.data || []);
    setItems(itemRes.data || []);
  }

  function updateLine(idx, patch) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function handleItemPick(idx, itemId) {
    const item = items.find((i) => i.id === itemId);
    updateLine(idx, {
      itemId,
      itemName: item ? item.name : "",
      rate: item ? String(item.sale_price) : "0",
    });
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(idx) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  const total = lines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);

  function resetForm() {
    setCustomerId("");
    setDate(todayStr());
    setInvoiceNo("");
    setLines([emptyLine()]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!customerId) {
      setError("Please select a customer");
      return;
    }
    const validLines = lines.filter((l) => l.itemId && Number(l.qty) > 0);
    if (validLines.length === 0) {
      setError("Add at least one item line with a quantity");
      return;
    }
    const normalized = validLines.map((l) => ({
      itemId: l.itemId,
      itemName: l.itemName,
      qty: Number(l.qty) || 0,
      rate: Number(l.rate) || 0,
      amount: (Number(l.qty) || 0) * (Number(l.rate) || 0),
    }));
    const totalAmount = normalized.reduce((sum, l) => sum + l.amount, 0);

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("sales").insert({
      user_id: user.id,
      customer_id: customerId,
      date,
      invoice_no: invoiceNo,
      items: normalized,
      total_amount: totalAmount,
    });
    setSaving(false);
    if (error) {
      setError(error.message || "Could not save sale");
      return;
    }
    resetForm();
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this sale?")) return;
    await supabase.from("sales").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Sales</h1>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New Sale"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Customer *">
              <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Invoice No.">
              <input className="input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
            </Field>
          </div>

          {customers.length === 0 && (
            <p className="text-sm text-slate-500">
              No customers yet — add one on the{" "}
              <a href="/customers" className="text-brand-600 hover:underline">
                Customers
              </a>{" "}
              page first.
            </p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Items</p>
            {lines.map((line, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-2">
                <div className="w-full sm:w-48">
                  <select
                    className="input"
                    value={line.itemId}
                    onChange={(e) => handleItemPick(idx, e.target.value)}
                  >
                    <option value="">Select item</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  className="input w-24"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Qty"
                  value={line.qty}
                  onChange={(e) => updateLine(idx, { qty: e.target.value })}
                />
                <input
                  className="input w-28"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Rate"
                  value={line.rate}
                  onChange={(e) => updateLine(idx, { rate: e.target.value })}
                />
                <span className="w-28 text-sm text-slate-600">
                  = {formatMoney((Number(line.qty) || 0) * (Number(line.rate) || 0))}
                </span>
                <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => removeLine(idx)}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="btn-secondary text-sm" onClick={addLine}>
              + Add line
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <p className="text-base font-semibold text-slate-900">Total: {formatMoney(total)}</p>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Sale"}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Items</th>
              <th className="text-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400">
                  No sales recorded yet
                </td>
              </tr>
            )}
            {sales.map((s) => (
              <tr key={s.id}>
                <td>{formatDate(s.date)}</td>
                <td>{s.invoice_no || "—"}</td>
                <td className="font-medium text-slate-800">{s.customerName || "Unknown"}</td>
                <td className="text-slate-500">{(s.items || []).map((l) => l.itemName).join(", ")}</td>
                <td className="text-right font-semibold">{formatMoney(s.total_amount)}</td>
                <td className="text-right">
                  <button className="text-sm text-red-600 hover:underline" onClick={() => handleDelete(s.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
