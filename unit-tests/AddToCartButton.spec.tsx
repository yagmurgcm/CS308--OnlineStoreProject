import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

import AddToCartButton from "@/app/components/AddToCartButton";

const addItemMock = jest.fn();
const pushMock = jest.fn();

jest.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    addItem: addItemMock,
  }),
  CART_AUTH_ERROR: "AUTH_REQUIRED",
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

const sampleProduct = {
  productId: 1,
  name: "Sample",
  price: 100,
  quantity: 1,
};

describe("AddToCartButton", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders Add to cart button", () => {
    render(<AddToCartButton product={sampleProduct} />);

    expect(screen.getByRole("button").textContent).toMatch(/add to cart/i);
  });

  it("clicking calls addItem with correct product", async () => {
    addItemMock.mockResolvedValue(undefined);
    render(<AddToCartButton product={sampleProduct} />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(addItemMock).toHaveBeenCalledWith(sampleProduct));
  });

  it("shows Added! after successful action", async () => {
    addItemMock.mockResolvedValue(undefined);
    render(<AddToCartButton product={sampleProduct} />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("Adding..."));

    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("Added!"));

    act(() => {
      jest.advanceTimersByTime(1100);
    });
  });

  it("disables button while loading", async () => {
    let resolveAdd: () => void = () => {};
    addItemMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveAdd = resolve;
        }),
    );

    render(<AddToCartButton product={sampleProduct} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(button).toBeDisabled();
    resolveAdd();
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
