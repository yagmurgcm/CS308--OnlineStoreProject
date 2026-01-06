"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { fetchOrderById, type OrderSummary } from "@/lib/orders";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Message = {
  id: number;
  content: string;
  senderType: "customer" | "agent" | "guest";
  senderId: number | null;
  sender?: { id: number; name: string } | null;
  createdAt: string;
};

type Conversation = {
  id: number;
  status: string;
  customerId: number | null;
  agentId: number | null;
  customer?: { id: number; name: string; email: string } | null;
  agent?: { id: number; name: string } | null;
  guestEmail?: string | null;
  guestName?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
};

type CustomerContext = {
  customer: {
    id: number;
    name: string;
    email: string;
    homeAddress?: string;
  } | null;
  recentOrders: Array<{
    id: number;
    status: string;
    totalPrice: number;
    createdAt: string;
    items?: Array<{ productName?: string; quantity: number }>;
  }>;
  wishlist: Array<{
    productId: number;
    productName?: string;
  }>;
};

export default function SupportAgentDashboard() {
  const { user, initialized } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customerContext, setCustomerContext] =
    useState<CustomerContext | null>(null);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "my">("queue");
  const socketRef = useRef<Socket | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderSummary | null>(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace("/sign-in?redirect=/support-agent");
      return;
    }
    if (user.role !== "SUPPORT_AGENT") {
      router.replace("/");
      return;
    }
  }, [initialized, user, router]);

  useEffect(() => {
    if (!user || user.role !== "SUPPORT_AGENT") return;
    loadConversations();
  }, [user, activeTab]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!user || user.role !== "SUPPORT_AGENT" || !user.accessToken) return;

    const socket = io(`${API_BASE}/support`, {
      auth: {
        token: user.accessToken,
      },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Agent WebSocket connected");
    });

    // Listen for new conversations
    socket.on("new-conversation", () => {
      if (activeTab === "queue") {
        loadConversations();
      }
    });

    // Listen for conversation updates
    socket.on("conversation-updated", () => {
      loadConversations();
      // Reload selected conversation if exists
      if (selectedConversation?.id) {
        api.get<Conversation>(`/support/conversations/${selectedConversation.id}`)
          .then((updated) => {
            setSelectedConversation(updated);
            setMessages(updated.messages || []);
          })
          .catch(console.error);
      }
    });

    // Listen for new messages in selected conversation
    socket.on("new-message", (message: Message) => {
      setSelectedConversation((prev) => {
        if (prev?.id === message.conversationId) {
          // Update messages list
          setMessages((current) => {
            if (current.find((m) => m.id === message.id)) return current;
            return [...current, message];
          });
          return prev;
        }
        return prev;
      });
    });

    // Listen for status changes
    socket.on("conversation-status-changed", (data: { conversationId: number; status: string }) => {
      if (selectedConversation?.id === data.conversationId) {
        setSelectedConversation((prev) => prev ? { ...prev, status: data.status } : null);
      }
      loadConversations();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, activeTab]); // Removed selectedConversation to avoid infinite loops

  // Auto-scroll removed - let user control scroll manually

  useEffect(() => {
    const customerId =
      selectedConversation?.customerId ?? selectedConversation?.customer?.id;
    if (customerId) {
      loadCustomerContext(selectedConversation.id);
    } else {
      setCustomerContext(null);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data =
        activeTab === "queue"
          ? await api.get<Conversation[]>("/support/agent/queue")
          : await api.get<Conversation[]>("/support/agent/conversations");
      setConversations(data || []);
    } catch (error) {
      console.error("Failed to load conversations", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerContext = async (conversationId: number) => {
    try {
      const context = await api.get<CustomerContext>(
        `/support/agent/conversations/${conversationId}/customer-context`
      );
      setCustomerContext(context);
    } catch (error) {
      console.error("Failed to load customer context", error);
    }
  };

  const loadOrderDetails = async (orderId: number) => {
    setOrderDetailsLoading(true);
    try {
      const order = await fetchOrderById(orderId);
      setOrderDetails(order);
    } catch (error) {
      console.error("Failed to load order details", error);
      alert("Failed to load order details");
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  const handleClaim = async (conversationId: number) => {
    try {
      await api.patch(`/support/agent/conversations/${conversationId}/claim`);
      await loadConversations();
      if (conversationId === selectedConversation?.id) {
        const conv = await api.get<Conversation>(
          `/support/conversations/${conversationId}`
        );
        setSelectedConversation(conv);
      }
    } catch (error) {
      console.error("Failed to claim conversation", error);
      alert("Failed to claim conversation");
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    try {
      const full = await api.get<Conversation>(
        `/support/conversations/${conversation.id}`
      );
      setSelectedConversation(full);
      setMessages(full.messages || []);
      setMessageText("");

      // Join conversation room via WebSocket
      if (socketRef.current) {
        socketRef.current.emit("join-conversation", {
          conversationId: full.id,
        });
      }
    } catch (error) {
      console.error("Failed to load conversation", error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || sending) return;

    const text = messageText.trim();
    setMessageText("");
    setSending(true);

    try {
      await api.post(
        `/support/conversations/${selectedConversation.id}/messages`,
        { content: text }
      );

      // Message will be received via WebSocket, no need to reload
      // But we can reload to be safe
      const updated = await api.get<Conversation>(
        `/support/conversations/${selectedConversation.id}`
      );
      setSelectedConversation(updated);
      setMessages(updated.messages || []);
    } catch (error) {
      console.error("Failed to send message", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!selectedConversation) return;
    if (!confirm("Are you sure you want to close this conversation?")) return;

    try {
      await api.patch(
        `/support/agent/conversations/${selectedConversation.id}/close`
      );
      await loadConversations();
      setSelectedConversation(null);
    } catch (error) {
      console.error("Failed to close conversation", error);
      alert("Failed to close conversation");
    }
  };

  if (!initialized || !user || user.role !== "SUPPORT_AGENT") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-lg text-gray-600">Checking access…</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-700 to-green-600 text-white shadow-lg shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Support Agent Dashboard</h1>
          <p className="text-green-100 text-sm">Manage customer conversations</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pb-4 flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Left: Conversation List */}
          <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => {
                  setActiveTab("queue");
                  setSelectedConversation(null);
                }}
                className={`flex-1 px-4 py-3 font-medium text-sm ${
                  activeTab === "queue"
                    ? "bg-green-50 text-green-700 border-b-2 border-green-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Queue ({conversations.filter((c) => c.status === "open").length})
              </button>
              <button
                onClick={() => {
                  setActiveTab("my");
                  setSelectedConversation(null);
                }}
                className={`flex-1 px-4 py-3 font-medium text-sm ${
                  activeTab === "my"
                    ? "bg-green-50 text-green-700 border-b-2 border-green-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                My Conversations
              </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No conversations
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedConversation?.id === conv.id
                        ? "bg-green-50 border-l-4 border-l-green-600"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-medium text-sm">
                        {conv.customer?.name ||
                          conv.guestName ||
                          conv.customer?.email ||
                          conv.guestEmail ||
                          "Guest"}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          conv.status === "open"
                            ? "bg-orange-100 text-orange-700"
                            : conv.status === "claimed"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {conv.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(conv.updatedAt).toLocaleString()}
                    </div>
                    {activeTab === "queue" && conv.status === "open" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaim(conv.id);
                        }}
                        className="mt-2 w-full px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Claim
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Center: Chat */}
          <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col h-full min-h-0">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="font-semibold">
                      {selectedConversation.customer?.name ||
                        selectedConversation.guestName ||
                        selectedConversation.customer?.email ||
                        selectedConversation.guestEmail ||
                        "Guest"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.status}
                    </p>
                  </div>
                  {selectedConversation.status !== "closed" && (
                    <button
                      onClick={handleClose}
                      className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Close
                    </button>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {messages.map((msg) => {
                    const isAgent = msg.senderType === "agent";
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 ${
                            isAgent
                              ? "bg-green-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <div className="text-sm font-medium mb-1">
                            {isAgent
                              ? "You"
                              : msg.sender?.name ||
                                (selectedConversation.customer?.name ||
                                  selectedConversation.guestName ||
                                  "Customer")}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">
                            {msg.content}
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              isAgent ? "text-green-100" : "text-gray-500"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-200 shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={sending || selectedConversation.status === "closed"}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={
                        sending ||
                        !messageText.trim() ||
                        selectedConversation.status === "closed"
                      }
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a conversation to start
              </div>
            )}
          </div>

          {/* Right: Customer Context */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4 overflow-y-auto flex flex-col">
            <h3 className="font-semibold mb-4">Customer Information</h3>
            {customerContext?.customer ? (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-gray-500">Name</div>
                  <div className="font-medium">{customerContext.customer.name}</div>
                </div>
                <div>
                  <div className="text-gray-500">Email</div>
                  <div className="font-medium">{customerContext.customer.email}</div>
                </div>
                {customerContext.customer.homeAddress && (
                  <div>
                    <div className="text-gray-500">Address</div>
                    <div className="font-medium">
                      {customerContext.customer.homeAddress}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-semibold mb-2">Recent Orders</h4>
                  {customerContext.recentOrders.length > 0 ? (
                    <div className="space-y-2">
                      {customerContext.recentOrders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            loadOrderDetails(order.id);
                          }}
                          className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 transition cursor-pointer border border-transparent hover:border-gray-200"
                        >
                          <div className="font-medium">Order #{order.id}</div>
                          <div className="text-gray-500">{order.status}</div>
                          {order.totalPrice && (
                            <div className="text-gray-600 mt-1">
                              {new Intl.NumberFormat("tr-TR", {
                                style: "currency",
                                currency: "TRY",
                              }).format(Number(order.totalPrice))}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No orders</div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-semibold mb-2">Wishlist</h4>
                  {customerContext.wishlist.length > 0 ? (
                    <div className="space-y-1">
                      {customerContext.wishlist.map((item) => (
                        <div key={item.productId} className="text-xs">
                          {item.productName || `Product #${item.productId}`}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">Empty wishlist</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                {selectedConversation
                  ? "No customer information available"
                  : "Select a conversation to view customer details"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Order #{selectedOrderId}</h2>
              <button
                onClick={() => {
                  setSelectedOrderId(null);
                  setOrderDetails(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            <div className="p-6 flex-1">
              {orderDetailsLoading ? (
                <div className="text-center py-8">Loading order details...</div>
              ) : orderDetails ? (
                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Status</div>
                      <div className="font-medium capitalize">
                        {orderDetails.status.replace("_", " ")}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Price</div>
                      <div className="font-medium">
                        {new Intl.NumberFormat("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        }).format(Number(orderDetails.totalPrice))}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Created At</div>
                      <div className="font-medium">
                        {new Date(orderDetails.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {orderDetails.user && (
                      <div>
                        <div className="text-gray-500">Customer</div>
                        <div className="font-medium">
                          {orderDetails.user.name || orderDetails.user.email}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Shipping Info */}
                  {orderDetails.shippingAddress && (
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="font-semibold mb-2 text-sm">Shipping Address</h3>
                      <div className="text-sm text-gray-700">
                        <div>{orderDetails.shippingAddress}</div>
                        {orderDetails.shippingCity && (
                          <div>
                            {orderDetails.shippingCity}
                            {orderDetails.shippingPostalCode &&
                              ` ${orderDetails.shippingPostalCode}`}
                          </div>
                        )}
                        {orderDetails.shippingCountry && (
                          <div>{orderDetails.shippingCountry}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="font-semibold mb-3 text-sm">Order Items</h3>
                    <div className="border border-gray-200 rounded-lg divide-y">
                      {orderDetails.details?.map((detail) => (
                        <div
                          key={detail.id}
                          className="p-4 flex justify-between items-start"
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {detail.product?.name || `Product #${detail.product?.id}`}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Quantity: {detail.quantity}
                            </div>
                            {detail.variant && (
                              <div className="text-sm text-gray-500">
                                {detail.variant.color && `Color: ${detail.variant.color}`}
                                {detail.variant.size && ` • Size: ${detail.variant.size}`}
                              </div>
                            )}
                            {detail.returnedQuantity && detail.returnedQuantity > 0 && (
                              <div className="text-sm text-orange-600 mt-1">
                                Returned: {detail.returnedQuantity}
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-medium">
                              {new Intl.NumberFormat("tr-TR", {
                                style: "currency",
                                currency: "TRY",
                              }).format(Number(detail.price) * detail.quantity)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Intl.NumberFormat("tr-TR", {
                                style: "currency",
                                currency: "TRY",
                              }).format(Number(detail.price))}{" "}
                              each
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Failed to load order details
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
