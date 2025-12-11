"use client";

import { useEffect, useState } from "react";

export type SortingOption = {
  value: string;
  label: string;
};

type SortingDropdownProps = {
  options: SortingOption[];
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export default function SortingDropdown({
  options,
  defaultValue,
  onChange,
}: SortingDropdownProps) {
  const fallbackValue = options[0]?.value ?? "";
  const [selected, setSelected] = useState(defaultValue ?? fallbackValue);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (defaultValue !== undefined) {
      setSelected(defaultValue);
    }
  }, [defaultValue]);

  const currentLabel =
    options.find((option) => option.value === selected)?.label ?? "Select";

  const handleSelect = (value: string) => {
    setSelected(value);
    setOpen(false);
    onChange?.(value);
  };

  return (
    <div className="relative inline-block" data-testid="sorting-dropdown">
      <button
        type="button"
        className="btn h-10 px-4"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {currentLabel}
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg"
          data-testid="sorting-options"
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={`w-full px-3 py-2 text-left text-sm ${
                  option.value === selected
                    ? "bg-black text-white"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
