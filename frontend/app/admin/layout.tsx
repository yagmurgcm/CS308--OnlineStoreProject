"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const ADMIN_TABS = [
  { href: "/admin/orders", label: "📦 Orders", description: "Manage customer orders" },
  { href: "/admin/products", label: "🛍️ Products", description: "Manage products & inventory" },
  { href: "/admin/reviews", label: "💬 Reviews", description: "Approve/reject reviews" },
  { href: "/admin/returns", label: "Returns", description: "Review return requests" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header - Replaces normal site header */}
      <header className="bg-gradient-to-r from-red-700 to-red-600 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          {/* Top Bar */}
          <div className="h-16 flex items-center justify-between">
            {/* Left: Logo & Title */}
            <div className="flex items-center gap-4">
              <Link href="/admin/orders" className="flex items-center gap-3">
                <span className="text-3xl">🛡️</span>
                <div>
                  <h1 className="text-xl font-bold tracking-wide">MKN Admin</h1>
                  <p className="text-red-200 text-xs">Store Management Panel</p>
                </div>
              </Link>
            </div>

            {/* Right: User Info & Actions */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Store
              </Link>

              {user && (
                <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                  <div className="text-right">
                    <p className="text-sm font-medium">{user.name || user.email}</p>
                    <p className="text-xs text-red-200">Administrator</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1">
            {ADMIN_TABS.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition ${isActive
                      ? "border-red-600 text-red-600 bg-red-50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      <main className="bg-gray-50 min-h-[calc(100vh-128px)]">{children}</main>
    </div>
  );
}


