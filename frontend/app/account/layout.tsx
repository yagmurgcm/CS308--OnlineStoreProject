import type { ReactNode } from "react";
import AccountSidebar from "../components/AccountSidebar";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <main className="max-w-5xl mx-auto px-6 py-10 flex gap-10">
      <AccountSidebar />
      <div className="flex-1">{children}</div>
    </main>
  );
}
