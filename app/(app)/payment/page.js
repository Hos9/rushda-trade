"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatDate } from "@/lib/utils";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function PaymentPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("cash");
  const [note, setNote] = useState("");

  const [newSupplierName, setNewSupplierName] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const [payRes, supRes] = await Promise.all([
      supabase
        .from("payments")
        .select("*, suppliers(name)")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").order("name"),
    ]);
    setPayments((payRes.data || []).map((p) => ({ ...p, supplierName: p.suppliers?.name })));
    setSuppliers(supRes.data || []);
  }

  async function handleAddSupplier(e) {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    setSavingSupplier(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: created, error } = await supabase
      .from("suppliers")
      .insert({ user_id: user.id, name: newSupplierName.trim() })
      .select()
      .single();
    setSavingSupplier(false);
    if (!error && created) {
      setSuppliers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSupplierId(created.id);
      setNewSupplierName("");
      setShowNewSupplier(false);
    }
  }

  function resetForm() {
    setSupplierId("");
    setDate(todayStr());
    setAmount("");
    setMode("cash");
    setNote("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!supplierId) {
      setError("Please select a supplier");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      supplier_id: supplierId,
      date,
      amount: Number(amount),
      mode,
      note,
    });
    setSaving(false);
    if (error) {
      setError(error.message || "Could not save payment");
      return;
    }
    resetForm();
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this payment?")) return;
    await supabase.from("payments").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Payments to Suppliers</h1>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Record Payment"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Supplier *">
              <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="mt-1 text-xs font-medium text-brand-600 hover:underline"
                onClick={() => setShowNewSupplier((v) => !v)}
              >
                {showNewSupplier ? "Cancel new supplier" : "+ New supplier"}
              </button>
            </Field>
            <Field label="Date">
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Amount *">
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Mode">
              <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>

          {showNewSupplier && (
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
              <Field label="New supplier name">
                <input
                  className="input"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                />
              </Field>
              <button className="btn-secondary" type="button" onClick={handleAddSupplier} disabled={savingSupplier}>
                {savingSupplier ? "Adding..." : "Add supplier"}
              </button>
            </div>
          )}

          <Field label="Note">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          <div className="flex items-center justify-end border-t border-slate-200 pt-3">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Payment"}
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
              <th>Supplier</th>
              <th>Mode</th>
              <th>Note</th>
              <th className="text-right">Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400">
                  No payments recorded yet
                </td>
              </tr>
            )}
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{formatDate(p.date)}</td>
                <td className="font-medium text-slate-800">{p.supplierName || "Unknown"}</td>
                <td className="capitalize">{p.mode}</td>
                <td className="text-slate-500">{p.note}</td>
                <td className="text-right font-semibold text-red-700">{formatMoney(p.amount)}</td>
                <td className="text-right">
                  <button className="text-sm text-red-600 hover:underline" onClick={() => handleDelete(p.id)}>
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
