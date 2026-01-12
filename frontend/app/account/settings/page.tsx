"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

type Profile = {
  id: number;
  name?: string;
  email?: string;
  taxId?: string;
  homeAddress?: string;
};

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    taxId: "",
    homeAddress: "",
    email: "",
    password: "",
    confirmPassword: "",
    currentPassword: "",
  });

  // Load current profile data
  useEffect(() => {
    if (!user?.id) return;
    
    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await api.get<Profile>(`/users/${user.id}`);
        setFormData(prev => ({
          ...prev,
          name: data.name || "",
          email: data.email || "",
          taxId: data.taxId || "",
          homeAddress: data.homeAddress || "",
        }));
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [user?.id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setMessage(null);
    setSaving(true);
    
    try {
      await api.patch(`/users/${user.id}`, {
        name: formData.name,
        taxId: formData.taxId,
        homeAddress: formData.homeAddress,
      });
      setMessage({ type: "success", text: "Profile updated successfully! Redirecting..." });
      // Redirect to information page after 1 second
      setTimeout(() => {
        router.push("/account/information");
      }, 1000);
    } catch (error) {
      console.error("Failed to update profile", error);
      setMessage({ type: "error", text: "Failed to update profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <div className="text-sm text-neutral-600">Please sign in to view settings.</div>;
  }

  if (loading) {
    return <div className="text-sm text-neutral-500">Loading settings…</div>;
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">My Account</h1>
      <h2 className="text-xl font-semibold mb-8">Account Settings</h2>

      {message && (
        <div className={`mb-6 p-3 rounded ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Full Name */}
        <div>
          <label className="block mb-1 text-sm font-semibold">
            Full Name <span className="text-xs text-gray-500">(REQUIRED)</span>
          </label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block mb-1 text-sm font-semibold">
            Email Address
          </label>
          <input
            name="email"
            value={formData.email}
            className="w-full border px-3 py-2 rounded bg-gray-100 text-gray-600"
            disabled
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        {/* Tax ID */}
        <div>
          <label className="block mb-1 text-sm font-semibold">
            Tax ID
          </label>
          <input
            name="taxId"
            value={formData.taxId}
            onChange={handleChange}
            placeholder="e.g. 12345678901"
            className="w-full border px-3 py-2 rounded"
          />
          <p className="text-xs text-gray-500 mt-1">Your tax identification number for invoices</p>
        </div>

        {/* Home Address */}
        <div>
          <label className="block mb-1 text-sm font-semibold">
            Home Address
          </label>
          <textarea
            name="homeAddress"
            value={formData.homeAddress}
            onChange={handleChange}
            placeholder="Enter your full home address"
            rows={3}
            className="w-full border px-3 py-2 rounded resize-none"
          />
        </div>

        <hr className="my-6" />

        <p className="text-sm text-gray-500">
          Password change functionality coming soon.
        </p>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-black text-white font-semibold rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "SAVING..." : "UPDATE DETAILS"}
        </button>
      </form>
    </div>
  );
}
