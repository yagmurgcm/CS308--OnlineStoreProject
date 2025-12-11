// frontend/app/account/information/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Profile = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
};

export default function AccountInformationPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await api.get<Profile>(`/users/${user.id}`);
        if (!cancelled) setProfile(data);
      } catch (error) {
        console.error("Failed to load account info", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) {
    return <div className="text-sm text-neutral-600">Please sign in to view your account.</div>;
  }

  const fullName = profile?.name ?? user.name ?? "";
  const [firstName, ...rest] = fullName.split(" ").filter(Boolean);
  const lastName = rest.join(" ");
  const email = profile?.email ?? user.email ?? "—";
  const phone = profile?.phone ?? "—";
  const company = profile?.company ?? "—";

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">My Account</h1>
      <h2 className="text-xl font-semibold mb-6">Account Information</h2>

      {loading ? (
        <div className="text-sm text-neutral-500">Loading account info…</div>
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-gray-500">First Name</div>
            <div className="font-medium">{firstName || "—"}</div>
          </div>
          <div>
            <div className="text-gray-500">Last Name</div>
            <div className="font-medium">{lastName || "—"}</div>
          </div>
          <div>
            <div className="text-gray-500">Email Address</div>
            <div className="font-medium">{email}</div>
          </div>
          <div>
            <div className="text-gray-500">Phone Number</div>
            <div className="font-medium">{phone}</div>
          </div>
          <div>
            <div className="text-gray-500">Company</div>
            <div className="font-medium">{company}</div>
          </div>
        </div>
      )}
    </div>
  );
}