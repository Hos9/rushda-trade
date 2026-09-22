"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setEmail(user.email);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, company_name")
      .eq("id", user.id)
      .single();
    setFullName(profile?.full_name || "");
    setCompanyName(profile?.company_name || "");
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName, company_name: companyName, updated_at: new Date() });
    setSaving(false);
    if (error) {
      setMessage(error.message || "Could not save profile");
      return;
    }
    setMessage("Saved.");
  }

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Your Profile</h1>
      <form onSubmit={handleSubmit} className="card space-y-4 p-4">
        <Field label="Email">
          <input className="input" value={email} disabled />
        </Field>
        <Field label="Full Name">
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Company Name">
          <input
            className="input"
            placeholder="Shown in the top navigation"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </Field>
        <div className="flex items-center gap-3">
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {message && <span className="text-sm text-slate-500">{message}</span>}
        </div>
      </form>
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
