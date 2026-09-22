export const COLLECTIONS = {
  CUSTOMERS: "customers",
  SUPPLIERS: "suppliers",
  ITEMS: "items",
  SALES: "sales",
  PURCHASES: "purchases",
  RECEIPTS: "receipts", // received from customers
  PAYMENTS: "payments", // paid to suppliers
};

export function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function formatMoney(n) {
  const num = toNumber(n, 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString();
}
