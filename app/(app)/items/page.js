"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";

const EMPTY = { name: "", unit: "pcs", purchasePrice: "", salePrice: "" };

export default function ItemsPage() {
  const supabase = createClient();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const { data } = await supabase.from("items").select("*").order("name");
    setItems(data || []);
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
    const { error } = await supabase.from("items").insert({
      user_id: user.id,
      name: form.name.trim(),
      unit: form.unit || "pcs",
      purchase_price: Number(form.purchasePrice) || 0,
      sale_price: Number(form.salePrice) || 0,
    });
    setSaving(false);
    if (error) {
      setError(error.message || "Could not save item");
      return;
    }
    setForm(EMPTY);
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this item?")) return;
    await supabase.from("items").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Items</h1>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New Item"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Name *">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Unit">
            <input
              className="input"
              placeholder="pcs, kg, box..."
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </Field>
          <Field label="Purchase Price">
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.purchasePrice}
              onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
            />
          </Field>
          <Field label="Sale Price">
            <input
              className="input"
              type="number"
              step="0.01"
              value={form.salePrice}
              onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
            />
          </Field>
          <div className="flex items-end">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Item"}
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
              <th>Unit</th>
              <th className="text-right">Purchase Price</th>
              <th className="text-right">Sale Price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400">
                  No items yet
                </td>
              </tr>
            )}
            {items.map((i) => (
              <tr key={i.id}>
                <td className="font-medium text-slate-800">{i.name}</td>
                <td>{i.unit}</td>
                <td className="text-right">{formatMoney(i.purchase_price)}</td>
                <td className="text-right">{formatMoney(i.sale_price)}</td>
                <td className="text-right">
                  <button className="text-sm text-red-600 hover:underline" onClick={() => handleDelete(i.id)}>
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
