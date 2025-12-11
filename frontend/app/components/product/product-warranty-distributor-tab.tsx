"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type WarrantyTabProps = {
  className?: string;
  defaultOpen?: boolean;
};

const warrantyItems = [
  { label: "Warranty", value: "30 Days Limited Warranty" },
  { label: "Distributor", value: "Our official store" },
  { label: "Support Email", value: "support@example.com" },
  {
    label: "Additional Note",
    value: "Warranty covers manufacturing defects only.",
  },
];

export default function ProductWarrantyDistributorTab({
  className = "",
  defaultOpen = true,
}: WarrantyTabProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      className={`border border-gray-200 rounded-md bg-white ${className}`}
      aria-label="Warranty and distributor details"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-base md:text-lg font-semibold tracking-tight text-gray-900">
          Warranty &amp; Distributor Info
        </span>
        <ChevronDown
          size={18}
          className={`text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 px-5 py-4">
          <dl className="space-y-3 text-sm text-gray-700">
            {warrantyItems.map((item) => (
              <div
                key={item.label}
                className="flex flex-col md:flex-row md:items-center md:justify-between"
              >
                <dt className="font-semibold text-gray-900">{item.label}</dt>
                <dd className="text-gray-600 md:text-right">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
