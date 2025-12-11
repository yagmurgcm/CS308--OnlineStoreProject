import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";

import OrderHistoryView from "@/app/components/OrderHistoryView";
import type { OrderSummary } from "@/lib/orders";

const buildOrder = (overrides: Partial<OrderSummary>): OrderSummary => ({
  id: overrides.id ?? 1,
  status: overrides.status ?? "shipped",
  totalPrice: overrides.totalPrice ?? "199.99",
  createdAt: overrides.createdAt ?? new Date().toISOString(),
  contactEmail: "user@example.com",
  details:
    overrides.details ??
    [
      {
        id: 1,
        quantity: 1,
        price: 99.99,
        product: { id: 10, name: "Sneaker", price: 99.99 },
      },
    ],
});

describe("OrderHistoryView", () => {
  it("loads and renders user's order history", async () => {
    const orders = [
      buildOrder({ id: 1, totalPrice: "150", createdAt: "2024-01-01T00:00:00Z" }),
      buildOrder({
        id: 2,
        status: "processing",
        details: [
          {
            id: 2,
            quantity: 2,
            price: 120,
            product: { id: 11, name: "Boots", price: 120 },
          },
        ],
      }),
    ];
    const fetchOrders = jest.fn().mockResolvedValue(orders);

    render(<OrderHistoryView fetchOrders={fetchOrders} />);

    expect(screen.getByTestId("orders-loading")).toBeInTheDocument();

    const renderedOrders = await screen.findAllByTestId("order-item");
    expect(renderedOrders).toHaveLength(2);
    expect(screen.getByText(/Order #1/)).toBeInTheDocument();
    expect(screen.getByText(/Total: 150/)).toBeInTheDocument();
    expect(screen.getByText(/Boots × 2/)).toBeInTheDocument();
  });

  it("displays empty state when user has no orders", async () => {
    const fetchOrders = jest.fn().mockResolvedValue([]);

    render(<OrderHistoryView fetchOrders={fetchOrders} />);

    await waitFor(() =>
      expect(screen.getByTestId("orders-empty")).toBeInTheDocument(),
    );
  });

  it("shows loading state correctly", async () => {
    let resolveOrders: (orders: OrderSummary[]) => void = () => {};
    const fetchOrders = jest.fn(
      () =>
        new Promise<OrderSummary[]>((resolve) => {
          resolveOrders = resolve;
        }),
    );

    render(<OrderHistoryView fetchOrders={fetchOrders} />);

    expect(screen.getByTestId("orders-loading")).toBeInTheDocument();

    act(() => resolveOrders([buildOrder({ id: 5 })]));

    expect(await screen.findByTestId("orders-list")).toBeInTheDocument();
  });

  it("renders error state when loader rejects", async () => {
    const fetchOrders = jest
      .fn()
      .mockRejectedValue(new Error("Network unavailable"));

    render(<OrderHistoryView fetchOrders={fetchOrders} />);

    const errorMessage = await screen.findByTestId("orders-error");
    expect(errorMessage.textContent).toMatch(/network unavailable/i);
  });
});
