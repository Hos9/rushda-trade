"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatDate } from "@/lib/utils";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReceivedPage() {
  const supabase = createClient();
  const [receipts, setReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("cash");
  const [note, setNote] = useState("");

  const [newCustomerName, setNewCustomerName] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const [recRes, custRes] = await Promise.all([
      supabase
        .from("receipts")
        .select("*, customers(name)")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("*").order("name"),
    ]);
    setReceipts((recRes.data || []).map((r) => ({ ...r, customerName: r.customers?.name })));
    setCustomers(custRes.data || []);
  }

  async function handleAddCustomer(e) {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    setSavingCustomer(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: created, error } = await supabase
      .from("customers")
      .insert({ user_id: user.id, name: newCustomerName.trim() })
      .select()
      .single();
    setSavingCustomer(false);
    if (!error && created) {
      setCustomers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCustomerId(created.id);
      setNewCustomerName("");
      setShowNewCustomer(false);
    }
  }

  function resetForm() {
    setCustomerId("");
    setDate(todayStr());
    setAmount("");
    setMode("cash");
    setNote("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!customerId) {
      setError("Please select a customer");
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
    const { error } = await supabase.from("receipts").insert({
      user_id: user.id,
      customer_id: customerId,
      date,
      amount: Number(amount),
      mode,
      note,
    });
    setSaving(false);
    if (error) {
      setError(error.message || "Could not save receipt");
      return;
    }
    resetForm();
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this receipt?")) return;
    await supabase.from("receipts").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Received from Customers</h1>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Record Receipt"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Customer *">
              <div className="flex gap-2">
                <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="mt-1 text-xs font-medium text-brand-600 hover:underline"
                onClick={() => setShowNewCustomer((v) => !v)}
              >
                {showNewCustomer ? "Cancel new customer" : "+ New customer"}
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

          {showNewCustomer && (
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
              <Field label="New customer name">
                <input
                  className="input"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
              </Field>
              <button className="btn-secondary" type="button" onClick={handleAddCustomer} disabled={savingCustomer}>
                {savingCustomer ? "Adding..." : "Add customer"}
              </button>
            </div>
          )}

          <Field label="Note">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          <div className="flex items-center justify-end border-t border-slate-200 pt-3">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Receipt"}
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
              <th>Customer</th>
              <th>Mode</th>
              <th>Note</th>
              <th className="text-right">Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400">
                  No receipts recorded yet
                </td>
              </tr>
            )}
            {receipts.map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.date)}</td>
                <td className="font-medium text-slate-800">{r.customerName || "Unknown"}</td>
                <td className="capitalize">{r.mode}</td>
                <td className="text-slate-500">{r.note}</td>
                <td className="text-right font-semibold text-emerald-700">{formatMoney(r.amount)}</td>
                <td className="text-right">
                  <button className="text-sm text-red-600 hover:underline" onClick={() => handleDelete(r.id)}>
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
