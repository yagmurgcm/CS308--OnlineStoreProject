import { render, screen } from "@testing-library/react";
import InvoiceView from "@/app/components/InvoiceView";
import { OrderSummary } from "@/lib/orders";

const mockOrder: OrderSummary = {
  id: 42,
  status: "paid",
  totalPrice: "199.99",
  createdAt: "2024-11-20T10:00:00Z",
  user: {
    email: "customer@example.com",
    name: "Customer",
  },
  details: [
    {
      id: 1,
      quantity: 2,
      price: "49.99",
      product: {
        id: 7,
        name: "Denim Jacket",
        price: "49.99",
      },
    },
    {
      id: 2,
      quantity: 1,
      price: "99.99",
      product: {
        id: 8,
        name: "Chelsea Boots",
        price: "99.99",
      },
    },
  ],
};

describe("InvoiceView", () => {
  it("renders invoice details and email info", () => {
    render(<InvoiceView order={mockOrder} />);

    expect(screen.getByText(/Invoice #42/)).toBeInTheDocument();
    expect(
      screen.getByText(/Invoice emailed to customer@example.com/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Denim Jacket/)).toBeInTheDocument();
    expect(screen.getByText(/Chelsea Boots/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download pdf/i }),
    ).toBeInTheDocument();
  });
});
