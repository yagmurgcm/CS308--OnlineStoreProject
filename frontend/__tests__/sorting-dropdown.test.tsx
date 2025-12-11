import { fireEvent, render, screen } from "@testing-library/react";
import { SortSelect } from "@/app/products/page";

describe("SortSelect", () => {
  it("calls onChange with selected value", () => {
    const handleChange = jest.fn();
    render(<SortSelect value="" onChange={handleChange} />);

    const select = screen.getByTestId("sort-select");
    fireEvent.change(select, { target: { value: "price_desc" } });

    expect(handleChange).toHaveBeenCalledWith("price_desc");
  });
});
