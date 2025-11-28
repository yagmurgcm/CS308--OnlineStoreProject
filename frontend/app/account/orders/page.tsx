"use client";

export default function OrdersPage() {
  // Şimdilik boş array -> Sadece "no orders" mesajı çıkacak
  const orders: any[] = [];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">My Orders</h1>

      {orders.length === 0 && (
        <p className="text-gray-600">You don't have any orders yet.</p>
      )}

      {/* İleride backend eklenince burası otomatik devreye girecek */}
      {orders.length > 0 && (
        <div className="space-y-4">
          {/* order kartları burada olacak */}
        </div>
      )}
    </div>
  );
}
