// frontend/app/account/information/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

type Profile = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  homeAddress?: string;
  taxId?: string;
};

export default function AccountInformationPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      // Add cache-busting timestamp to force fresh data
      const data = await api.get<Profile>(`/users/${user.id}?t=${Date.now()}`);
      setProfile(data);
    } catch (error) {
      console.error("Failed to load account info", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Refresh data when page becomes visible (e.g., returning from settings)
  useEffect(() => {
    const handleFocus = () => {
      loadProfile();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadProfile]);

  if (!user) {
    return <div className="text-sm text-neutral-600">Please sign in to view your account.</div>;
  }

  const fullName = profile?.name?.trim() || user.name || "—";
  const email = profile?.email ?? user.email ?? "—";
  const homeAddress = profile?.homeAddress?.trim() || "—";
  const taxId = profile?.taxId?.trim() || "—";

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">My Account</h1>
        <Link 
          href="/account/settings" 
          className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800"
        >
          Edit Profile
        </Link>
      </div>
      <h2 className="text-xl font-semibold mb-6">Profile</h2>

      {loading ? (
        <div className="text-sm text-neutral-500">Loading account info…</div>
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-gray-500">Customer ID</div>
            <div className="font-medium">{user.id}</div>
          </div>
          <div>
            <div className="text-gray-500">Full Name</div>
            <div className="font-medium">{fullName}</div>
          </div>
          <div>
            <div className="text-gray-500">Email address</div>
            <div className="font-medium">{email}</div>
          </div>
          <div>
            <div className="text-gray-500">Home address</div>
            <div className="font-medium whitespace-pre-line">{homeAddress}</div>
          </div>
          <div>
            <div className="text-gray-500">Tax ID</div>
            <div className="font-medium">{taxId}</div>
          </div>
          
          <button 
            onClick={loadProfile}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            ↻ Refresh
          </button>
        </div>
      )}
    </div>
  );
}
