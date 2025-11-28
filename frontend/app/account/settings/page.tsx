"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    company: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    currentPassword: "",
    membership: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitted data:", formData);
  };

  return (
    <div className="max-w-xl mx-auto mt-12 px-4">
      <h1 className="text-2xl font-semibold mb-6">My Account</h1>

      <h2 className="text-xl font-semibold mb-8">
        Account Settings
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* First Name */}
        <div>
          <label className="block mb-1 text-sm font-semibold">
            First Name{" "}
            <span className="text-xs text-gray-500">(REQUIRED)</span>
          </label>
          <input
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full border px-3 py-2"
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="block mb-1 text-sm font-semibold">
            Last Name{" "}
            <span className="text-xs text-gray-500">(REQUIRED)</span>
          </label>
          <input
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full border px-3 py-2"
          />
        </div>

        {/* Company */}
        <div>
          <label className="block mb-1 text-sm font-semibold">
            Company
          </label>
          <input
            name="company"
            value={formData.company}
            onChange={handleChange}
            className="w-full border px-3 py-2"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="block mb-1 text-sm font-semibold">
            Phone Number
          </label>
          <input
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full border px-3 py-2"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block mb-1 text-sm font-semibold">
            Email Address{" "}
            <span className="text-xs text-gray-500">(REQUIRED)</span>
          </label>
          <input
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border px-3 py-2"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block mb-1 text-sm font-semibold">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full border px-3 py-2"
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block mb-1 text-sm font-semibold">
            Confirm Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full border px-3 py-2"
          />
        </div>

        {/* Current Password */}
        <div>
          <label className="block mb-1 text-sm font-semibold">
            Current Password
          </label>
          <input
            type="password"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            className="w-full border px-3 py-2"
          />
        </div>

        {/* Membership */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="membership"
            checked={formData.membership}
            onChange={handleChange}
          />
          <label className="text-sm">
            Sign up for MUJI Membership and enjoy exclusive offers.
          </label>
        </div>

        {/* Button */}
        <button
          type="submit"
          className="px-6 py-3 bg-black text-white font-semibold"
        >
          UPDATE DETAILS
        </button>
      </form>
    </div>
  );
}
