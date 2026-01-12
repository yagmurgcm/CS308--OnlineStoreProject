"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { io, Socket } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Attachment = {
  id: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
};

type Message = {
  id: number;
  content: string;
  senderType: "customer" | "agent" | "guest";
  senderId: number | null;
  sender?: { id: number; name: string } | null;
  createdAt: string;
  conversationId?: number;
  attachments?: Attachment[];
};

type Conversation = {
  id: number;
  status: string;
  customerId: number | null;
  agentId: number | null;
  messages?: Message[];
};

// Helper to get/create guest session ID
const getGuestSession = (): string => {
  if (typeof window === "undefined") return "";
  let session = localStorage.getItem("guest_chat_session");
  if (!session) {
    session = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("guest_chat_session", session);
  }
  return session;
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [showGuestForm, setShowGuestForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && conversation) {
      scrollToBottom();
    }
  }, [messages, isOpen, conversation]);

  // Initialize WebSocket connection (supports both authenticated and guest)
  useEffect(() => {
    if (!isOpen) return;

    const guestSession = getGuestSession();

    // Connect to WebSocket
    const socket = io(`${API_BASE}/support`, {
      auth: {
        token: user?.accessToken || undefined,
        guestSession: !user?.accessToken ? guestSession : undefined,
      },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket connected");
      // Join conversation room if we have one
      if (conversation?.id) {
        socket.emit("join-conversation", { conversationId: conversation.id });
      }
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    // Listen for new messages
    socket.on("new-message", (message: Message) => {
      if (message.conversationId === conversation?.id) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      }
    });

    // Listen for conversation status changes
    socket.on(
      "conversation-status-changed",
      (data: { conversationId: number; status: string }) => {
        if (data.conversationId === conversation?.id) {
          setConversation((prev) =>
            prev ? { ...prev, status: data.status } : null
          );
        }
      }
    );

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
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (user?.accessToken) {
          headers["Authorization"] = `Bearer ${user.accessToken}`;
        }

        // Try to get existing conversations first (for logged-in users)
        if (user?.id) {
          const response = await fetch(`${API_BASE}/support/conversations`, {
            headers,
          });
          if (response.ok) {
            const conversations: Conversation[] = await response.json();
            if (conversations && conversations.length > 0) {
              const activeConv =
                conversations.find(
                  (c) => c.status === "open" || c.status === "claimed"
                ) || conversations[0];
              const fullResponse = await fetch(
                `${API_BASE}/support/conversations/${activeConv.id}`,
                { headers }
              );
              if (fullResponse.ok) {
                const fullConv: Conversation = await fullResponse.json();
                setConversation(fullConv);
                setMessages(fullConv.messages || []);
                if (socketRef.current) {
                  socketRef.current.emit("join-conversation", {
                    conversationId: fullConv.id,
                  });
                }
                return;
              }
            }
          }
        }

        // For guests, check if they need to enter info
        if (!user?.id) {
          const savedGuestName = localStorage.getItem("guest_chat_name");
          const savedGuestEmail = localStorage.getItem("guest_chat_email");
          if (!savedGuestName && !savedGuestEmail) {
            setShowGuestForm(true);
            setLoading(false);
            return;
          }
          setGuestName(savedGuestName || "");
          setGuestEmail(savedGuestEmail || "");
        }

        // Create new conversation
        await createNewConversation();
      } catch (error) {
        console.error("Failed to load conversation", error);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [isOpen, user]);

  const createNewConversation = async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (user?.accessToken) {
      headers["Authorization"] = `Bearer ${user.accessToken}`;
    }

    const savedGuestName =
      guestName || localStorage.getItem("guest_chat_name") || undefined;
    const savedGuestEmail =
      guestEmail || localStorage.getItem("guest_chat_email") || undefined;

    const response = await fetch(`${API_BASE}/support/conversations`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        guestEmail: user?.email || savedGuestEmail,
        guestName: user?.name || savedGuestName,
      }),
    });

    if (response.ok) {
      const newConv: Conversation = await response.json();
      setConversation(newConv);
      setMessages([]);
      if (socketRef.current) {
        socketRef.current.emit("join-conversation", {
          conversationId: newConv.id,
        });
      }
    }
  };

  const handleGuestSubmit = async () => {
    if (!guestName.trim() || !guestEmail.trim()) {
      alert("Please enter your name and email");
      return;
    }
    localStorage.setItem("guest_chat_name", guestName);
    localStorage.setItem("guest_chat_email", guestEmail);
    setShowGuestForm(false);
    setLoading(true);
    await createNewConversation();
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Filter allowed types
    const allowed = files.filter((f) =>
      [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "video/mp4",
        "video/webm",
      ].includes(f.type)
    );
    if (allowed.length !== files.length) {
      alert("Some files were not added. Allowed: images, PDF, videos");
    }
    setSelectedFiles((prev) => [...prev, ...allowed].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && selectedFiles.length === 0) || !conversation || sending)
      return;

    const text = messageText.trim();
    setMessageText("");
    const filesToSend = [...selectedFiles];
    setSelectedFiles([]);
    setSending(true);

    try {
      const formData = new FormData();
      formData.append("content", text || " "); // API requires content

      filesToSend.forEach((file) => {
        formData.append("files", file);
      });

      const headers: Record<string, string> = {};
      if (user?.accessToken) {
        headers["Authorization"] = `Bearer ${user.accessToken}`;
      }

      const response = await fetch(
        `${API_BASE}/support/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers,
          body: formData,
        }
      );

      if (response.ok) {
        const newMessage: Message = await response.json();
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Failed to send message", error);
      alert("Failed to send message. Please try again.");
      setMessageText(text);
      setSelectedFiles(filesToSend);
    } finally {
      setSending(false);
    }
  };

  const renderAttachment = (attachment: Attachment) => {
    const url = `${API_BASE}/support/attachments/${attachment.id}`;

    if (attachment.fileType.startsWith("image/")) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={url}
            alt={attachment.fileName}
            className="max-w-full max-h-40 rounded mt-2 cursor-pointer hover:opacity-80"
          />
        </a>
      );
    }

    if (attachment.fileType.startsWith("video/")) {
      return (
        <video controls className="max-w-full max-h-40 rounded mt-2">
          <source src={url} type={attachment.fileType} />
        </video>
      );
    }

    if (attachment.fileType === "application/pdf") {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mt-2 text-blue-600 hover:underline"
        >
          📄 {attachment.fileName}
        </a>
      );
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 mt-2 text-blue-600 hover:underline"
      >
        📎 {attachment.fileName}
      </a>
    );
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
              : conversation
              ? "Waiting for agent..."
              : "Starting chat..."}
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

      {/* Guest Form */}
      {showGuestForm && (
        <div className="flex-1 p-4 flex flex-col justify-center">
          <h4 className="font-medium mb-4 text-center">
            Please enter your details to start chatting
          </h4>
          <input
            type="text"
            placeholder="Your name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            placeholder="Your email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleGuestSubmit}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start Chat
          </button>
        </div>
      )}

      {/* Messages */}
      {!showGuestForm && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {loading ? (
              <div className="text-center text-gray-500 py-8">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Start a conversation! 👋
              </div>
            ) : (
              messages.map((msg) => {
                const isCustomer =
                  msg.senderType === "customer" || msg.senderType === "guest";
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
                        {isAgent ? "Support Agent" : msg.sender?.name || "You"}
                      </div>
                      {msg.content && msg.content.trim() !== "" && (
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                      )}
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-1">
                          {msg.attachments.map((att) => (
                            <div key={att.id}>{renderAttachment(att)}</div>
                          ))}
                        </div>
                      )}
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

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-sm"
                >
                  <span className="truncate max-w-[100px]">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,application/pdf,video/mp4,video/webm"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                disabled={sending || !conversation}
                title="Attach files"
              >
                📎
              </button>
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
                disabled={
                  sending ||
                  !conversation ||
                  (!messageText.trim() && selectedFiles.length === 0)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "..." : "Send"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
