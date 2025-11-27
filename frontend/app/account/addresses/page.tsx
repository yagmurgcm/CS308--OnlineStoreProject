"use client";

import { useState, type ChangeEvent } from "react";

type AddressForm = {
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  company: string;
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<AddressForm[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [form, setForm] = useState<AddressForm>({
    title: "",
    firstName: "",
    lastName: "",
    phone: "",
    country: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    company: "",
  });

  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const requiredFields: (keyof AddressForm)[] = [
    "title",
    "firstName",
    "lastName",
    "phone",
    "country",
    "address1",
    "city",
    "zip",
  ];

  const resetForm = () => {
    setForm({
      title: "",
      firstName: "",
      lastName: "",
      phone: "",
      country: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      company: "",
    });
  };

  const handleSave = () => {
    const missing = requiredFields.filter((f) => form[f].trim() === "");

    if (missing.length > 0) {
      setError("Please fill in all required fields.");
      setSuccess("");
      return;
    }

    if (editingIndex !== null) {
      // Update existing
      const updated = [...addresses];
      updated[editingIndex] = form;
      setAddresses(updated);

      setSuccess("Address successfully updated.");
      setEditingIndex(null);
    } else {
      // Add new
      setAddresses([...addresses, form]);
      setSuccess("Address successfully saved.");
    }

    setError("");
    resetForm();

    setTimeout(() => setSuccess(""), 3000);

    setShowForm(false);
  };
  const handleEdit = (index: number) => {
    setForm(addresses[index]);
    setEditingIndex(index);
    setShowForm(true);
  };

  const handleDelete = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };


  // EMPTY STATE
  if (!showForm && addresses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-md bg-gray-100 px-4 py-3 text-gray-700">
          <span className="text-lg">ℹ️</span>
          <p className="text-sm">
            You currently have no addresses added to your profile
          </p>
        </div>

        <div className="flex">
          <div
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex h-48 w-72 cursor-pointer flex-col items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:border-gray-400"
          >
            <span className="text-3xl font-semibold">+</span>
            <span className="mt-2 text-sm font-medium">New Address</span>
          </div>
        </div>
      </div>
    );
  }

  // FORM PAGE
  if (showForm) {
    return (
      <div className="space-y-6 max-w-3xl">
        {error && (
          <div className="rounded-md bg-red-100 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-100 text-green-700 px-4 py-3 text-sm">
            {success}
          </div>
        )}

        <h2 className="text-xl font-semibold">
          {editingIndex !== null ? "Edit Address" : "Add New Address"}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Title *"
            name="title"
            value={form.title}
            onChange={handleChange}
          />

          <Input
            label="First Name *"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
          />

          <Input
            label="Last Name *"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
          />

          <Input
            label="Phone Number *"
            name="phone"
            value={form.phone}
            onChange={handleChange}
          />

          <Select
            label="Country *"
            name="country"
            value={form.country}
            onChange={handleChange}
            options={["Turkey", "UK", "USA", "Germany", "France"]}
          />

          <Input
            label="Address Line 1 *"
            name="address1"
            value={form.address1}
            onChange={handleChange}
          />

          <Input
            label="Address Line 2"
            name="address2"
            value={form.address2}
            onChange={handleChange}
          />

          <Input
            label="City *"
            name="city"
            value={form.city}
            onChange={handleChange}
          />

          <Input
            label="Zip/Postcode *"
            name="zip"
            value={form.zip}
            onChange={handleChange}
          />

          <Input
            label="State/Province"
            name="state"
            value={form.state}
            onChange={handleChange}
          />

          <Input
            label="Company (optional)"
            name="company"
            value={form.company}
            onChange={handleChange}
          />
        </div>

        <div className="flex gap-3">
          <button
            className="px-5 py-2 bg-black text-white rounded hover:bg-gray-800"
            onClick={handleSave}
          >
            {editingIndex !== null ? "UPDATE ADDRESS" : "SAVE ADDRESS"}
          </button>

          <button
            className="px-5 py-2 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => {
              resetForm();
              setShowForm(false);
              setEditingIndex(null);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // LIST SAVED ADDRESSES
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-2">Saved Addresses</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((a, i) => (
          <div
            key={i}
            className="relative border p-4 rounded-md shadow-sm bg-white"
          >
            {/* Edit + Delete buttons */}
            <div className="absolute right-2 top-2 flex gap-2">
              <button
                className="text-blue-600 hover:text-blue-800 text-sm"
                onClick={() => handleEdit(i)}
              >
                ✏️
              </button>
              <button
                className="text-red-600 hover:text-red-800 text-sm"
                onClick={() => handleDelete(i)}
              >
                🗑️
              </button>
            </div>

            <p className="text-lg font-semibold">{a.title}</p>
            <p className="font-medium mt-1">
              {a.firstName} {a.lastName}
            </p>

            {a.company && <p>{a.company}</p>}

            <p>{a.address1}</p>
            {a.address2 && <p>{a.address2}</p>}

            <p>
              {a.city}, {a.state && `${a.state},`} {a.zip}
            </p>

            <p>{a.country}</p>

            <p className="text-gray-600 text-sm mt-2">📞 {a.phone}</p>
          </div>
        ))}

        {/* ADD ANOTHER ADDRESS CARD */}
        <div
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex h-48 cursor-pointer flex-col items-center justify-center border border-gray-300 rounded-md hover:border-gray-400"
        >
          <span className="text-3xl font-semibold">+</span>
          <span className="mt-2 text-sm">Add Another Address</span>
        </div>
      </div>
    </div>
  );
}

function Input({ label, name, value, onChange }: any) {
  return (
    <label className="flex flex-col text-sm">
      {label}
      <input
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 border border-gray-300 rounded px-3 py-2"
      />
    </label>
  );
}

function Select({ label, name, value, onChange, options }: any) {
  return (
    <label className="flex flex-col text-sm">
      {label}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 border border-gray-300 rounded px-3 py-2"
      >
        <option value="">Choose a Country</option>
        {options.map((o: string) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
