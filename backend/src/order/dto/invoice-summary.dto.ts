export type InvoiceItemDto = {
  productName: string;
  variant: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
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
