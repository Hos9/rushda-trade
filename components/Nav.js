"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sales", label: "Sales" },
  { href: "/received", label: "Received" },
  { href: "/purchase", label: "Purchase" },
  { href: "/payment", label: "Payment" },
  { href: "/items", label: "Items" },
  { href: "/customers", label: "Customers" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/profile", label: "Profile" },
];

export default function Nav({ userName, companyName }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          <span className="font-semibold text-slate-900">
            {companyName || "AR / AP Manager"}
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{userName}</span>
            <button onClick={handleLogout} className="btn-secondary text-sm">
              Log out
            </button>
          </div>
        </div>
        <nav className="-mb-px flex gap-1 overflow-x-auto pb-px">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
