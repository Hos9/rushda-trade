"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";

function sumBy(rows, keyField, valueField) {
  const map = {};
  for (const row of rows) {
    const key = row[keyField];
    if (!key) continue;
    map[key] = (map[key] || 0) + (Number(row[valueField]) || 0);
  }
  return map;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const [customersRes, suppliersRes, salesRes, receiptsRes, purchasesRes, paymentsRes] = await Promise.all([
      supabase.from("customers").select("id, name, opening_balance").order("name"),
      supabase.from("suppliers").select("id, name, opening_balance").order("name"),
      supabase.from("sales").select("customer_id, total_amount"),
      supabase.from("receipts").select("customer_id, amount"),
      supabase.from("purchases").select("supplier_id, total_amount"),
      supabase.from("payments").select("supplier_id, amount"),
    ]);

    const customers = customersRes.data || [];
    const suppliers = suppliersRes.data || [];
    const salesByCustomer = sumBy(salesRes.data || [], "customer_id", "total_amount");
    const receivedByCustomer = sumBy(receiptsRes.data || [], "customer_id", "amount");
    const purchasesBySupplier = sumBy(purchasesRes.data || [], "supplier_id", "total_amount");
    const paidBySupplier = sumBy(paymentsRes.data || [], "supplier_id", "amount");

    const ar = customers.map((c) => {
      const sales = salesByCustomer[c.id] || 0;
      const received = receivedByCustomer[c.id] || 0;
      const opening = Number(c.opening_balance) || 0;
      return {
        id: c.id,
        name: c.name,
        openingBalance: opening,
        totalSales: sales,
        totalReceived: received,
        balance: opening + sales - received,
      };
    });

    const ap = suppliers.map((s) => {
      const purchases = purchasesBySupplier[s.id] || 0;
      const paid = paidBySupplier[s.id] || 0;
      const opening = Number(s.opening_balance) || 0;
      return {
        id: s.id,
        name: s.name,
        openingBalance: opening,
        totalPurchases: purchases,
        totalPaid: paid,
        balance: opening + purchases - paid,
      };
    });

    setData({
      ar,
      ap,
      totals: {
        totalAR: ar.reduce((sum, c) => sum + c.balance, 0),
        totalAP: ap.reduce((sum, s) => sum + s.balance, 0),
        customerCount: ar.length,
        supplierCount: ap.length,
      },
    });
    setLoading(false);
  }

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;
  if (!data) return <p className="text-sm text-red-600">Could not load dashboard.</p>;

  const { ar, ap, totals } = data;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Receivable (AR)" value={totals.totalAR} tone="positive" />
        <SummaryCard label="Total Payable (AP)" value={totals.totalAP} tone="negative" />
        <SummaryCard label="Customers" value={totals.customerCount} isCount />
        <SummaryCard label="Suppliers" value={totals.supplierCount} isCount />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Accounts Receivable — by Customer</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th className="text-right">Opening</th>
                <th className="text-right">Sales</th>
                <th className="text-right">Received</th>
                <th className="text-right">Balance (AR)</th>
              </tr>
            </thead>
            <tbody>
              {ar.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400">
                    No customers yet
                  </td>
                </tr>
              )}
              {ar.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-slate-800">{c.name}</td>
                  <td className="text-right">{formatMoney(c.openingBalance)}</td>
                  <td className="text-right">{formatMoney(c.totalSales)}</td>
                  <td className="text-right">{formatMoney(c.totalReceived)}</td>
                  <td className={`text-right font-semibold ${c.balance > 0 ? "text-emerald-700" : "text-slate-500"}`}>
                    {formatMoney(c.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Accounts Payable — by Supplier</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th className="text-right">Opening</th>
                <th className="text-right">Purchases</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Balance (AP)</th>
              </tr>
            </thead>
            <tbody>
              {ap.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400">
                    No suppliers yet
                  </td>
                </tr>
              )}
              {ap.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium text-slate-800">{s.name}</td>
                  <td className="text-right">{formatMoney(s.openingBalance)}</td>
                  <td className="text-right">{formatMoney(s.totalPurchases)}</td>
                  <td className="text-right">{formatMoney(s.totalPaid)}</td>
                  <td className={`text-right font-semibold ${s.balance > 0 ? "text-red-700" : "text-slate-500"}`}>
                    {formatMoney(s.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, tone, isCount }) {
  const toneClass = tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-slate-900";
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{isCount ? value : formatMoney(value)}</p>
    </div>
  );
}
