"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
import { useAuth } from "@/lib/auth-context";
import { io, Socket } from "socket.io-client";

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
  messages?: Message[];
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && conversation) {
      scrollToBottom();
    }
  }, [messages, isOpen, conversation]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isOpen || !user?.accessToken) return;

    // Connect to WebSocket
    const socket = io(`${API_BASE}/support`, {
      auth: {
        token: user.accessToken,
      },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket connected");
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    // Listen for new messages
    socket.on("new-message", (message: Message) => {
      if (message.conversationId === conversation?.id) {
        setMessages((prev) => {
          // Check if message already exists (to avoid duplicates)
          if (prev.find((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      }
    });

    // Listen for conversation status changes
    socket.on("conversation-status-changed", (data: { conversationId: number; status: string }) => {
      if (data.conversationId === conversation?.id) {
        setConversation((prev) => prev ? { ...prev, status: data.status } : null);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isOpen, user?.accessToken, conversation?.id]);

  // Load or create conversation when widget opens
  useEffect(() => {
    if (!isOpen) return;

    const loadConversation = async () => {
      setLoading(true);
      try {
        // Try to get existing conversations first
        if (user?.id) {
          const conversations = await api.get<Conversation[]>(
            "/support/conversations"
          );
          if (conversations && conversations.length > 0) {
            // Use the most recent open/claimed conversation
            const activeConv = conversations.find(
              (c) => c.status === "open" || c.status === "claimed"
            ) || conversations[0];
            const fullConv = await api.get<Conversation>(
              `/support/conversations/${activeConv.id}`
            );
            setConversation(fullConv);
            setMessages(fullConv.messages || []);

            // Join conversation room via WebSocket
            if (socketRef.current) {
              socketRef.current.emit("join-conversation", {
                conversationId: fullConv.id,
              });
            }
            return;
          }
        }

        // Create new conversation if none exists
        const newConv = await api.post<Conversation>("/support/conversations", {
          guestEmail: user?.email || undefined,
          guestName: user?.name || undefined,
        });
        setConversation(newConv);
        setMessages([]);

        // Join conversation room via WebSocket
        if (socketRef.current) {
          socketRef.current.emit("join-conversation", {
            conversationId: newConv.id,
          });
        }
      } catch (error) {
        // Silently handle unauthorized errors (user not logged in or token expired)
        if (error instanceof Error && (error.message === "Unauthorized" || (error as any).status === 401)) {
          // User is not authenticated, just don't load conversation
          setConversation(null);
          setMessages([]);
          return;
        }
        console.error("Failed to load conversation", error);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [isOpen, user]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversation || sending) return;

    const text = messageText.trim();
    setMessageText("");
    setSending(true);

    try {
      // Send message and immediately add to state
      const newMessage = await api.post<Message>(
        `/support/conversations/${conversation.id}/messages`,
        { content: text }
      );

      // Immediately add to messages state (optimistic update)
      setMessages((prev) => {
        // Check if message already exists (to avoid duplicates from WebSocket)
        if (prev.find((m) => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    } catch (error) {
      // Silently handle unauthorized errors
      if (error instanceof Error && (error.message === "Unauthorized" || (error as any).status === 401)) {
        alert("Please sign in to send messages.");
        setMessageText(text); // Restore message on error
        return;
      }
      console.error("Failed to send message", error);
      alert("Failed to send message. Please try again.");
      setMessageText(text); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-50 transition"
        aria-label="Open support chat"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Support Chat</h3>
          <p className="text-xs text-blue-100">
            {conversation?.status === "claimed"
              ? "Agent assigned"
              : "Waiting for agent..."}
          </p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-gray-200 text-xl"
          aria-label="Close chat"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Start a conversation! 👋
          </div>
        ) : (
          messages.map((msg) => {
            const isCustomer = msg.senderType === "customer" || msg.senderType === "guest";
            const isAgent = msg.senderType === "agent";
            
            return (
              <div
                key={msg.id}
                className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    isAgent
                      ? "bg-gray-100 text-gray-900"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
                    {isAgent
                      ? "Support Agent"
                      : msg.sender?.name || "You"}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      isAgent ? "text-gray-500" : "text-blue-100"
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
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
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
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending || !conversation}
          />
          <button
            onClick={handleSendMessage}
            disabled={sending || !conversation || !messageText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

