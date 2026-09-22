"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";

const EMPTY = { name: "", phone: "", email: "", address: "", openingBalance: "" };

export default function CustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const { data } = await supabase.from("customers").select("*").order("name");
    setCustomers(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("customers").insert({
      user_id: user.id,
      name: form.name.trim(),
      phone: form.phone,
      email: form.email,
      address: form.address,
      opening_balance: Number(form.openingBalance) || 0,
    });
    setSaving(false);
    if (error) {
      setError(error.message || "Could not save customer");
      return;
    }
    setForm(EMPTY);
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this customer?")) return;
    await supabase.from("customers").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Customers</h1>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New Customer"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name *">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Address">
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="Opening Balance">
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            />
          </Field>
          <div className="flex items-end">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Customer"}
            </button>
          </div>
          {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        </form>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th className="text-right">Opening Balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400">
                  No customers yet
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="font-medium text-slate-800">{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.email}</td>
                <td className="text-right">{formatMoney(c.opening_balance)}</td>
                <td className="text-right">
                  <button className="text-sm text-red-600 hover:underline" onClick={() => handleDelete(c.id)}>
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
