export type InvoiceItemDto = {
  productName: string;
  variant: string | null;
  unitPrice: number;
  originalPrice?: number | null;
  discountRate?: number | null;
  quantity: number;
  lineTotal: number;
  originalLineTotal?: number | null;
};

export type InvoiceTotalsDto = {
  subtotal: number;
  tax: number;
  discount: number;
  shipment: number;
  grandTotal: number;
};

export type InvoiceSummaryDto = {
  orderId: number;
  customer: {
    userId: number;
    email: string | null;
  };
  createdAt: Date;
  items: InvoiceItemDto[];
  totals: InvoiceTotalsDto;
};

export type InvoiceBuildOptions = {
  taxRate?: number;
  discount?: number;
  shipment?: number;
};
