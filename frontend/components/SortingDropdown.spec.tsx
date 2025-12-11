import { fireEvent, render, screen } from "@testing-library/react";

import SortingDropdown, {
  type SortingOption,
} from "./SortingDropdown";

const OPTIONS: SortingOption[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

describe("SortingDropdown component", () => {
  it("renders default option label", () => {
    render(<SortingDropdown options={OPTIONS} defaultValue="recommended" />);
    expect(screen.getByRole("button", { name: "Recommended" })).toBeInTheDocument();
  });

  it("updates selection when an option is clicked", () => {
    render(<SortingDropdown options={OPTIONS} />);

    fireEvent.click(screen.getByRole("button", { name: "Recommended" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Price: High to Low" }),
    );

    expect(
      screen.getByRole("button", { name: "Price: High to Low" }),
    ).toBeInTheDocument();
  });

  it("triggers callback with the selected value", () => {
    const handleChange = jest.fn();
    render(
      <SortingDropdown
        options={OPTIONS}
        defaultValue="recommended"
        onChange={handleChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Recommended" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Price: Low to High" }),
    );

    expect(handleChange).toHaveBeenCalledWith("price_asc");
  });
});
