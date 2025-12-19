"use client";

import Link from "next/link";
import Header from "./components/Header";
import { useMemo } from "react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <>
      <div className="bg-[#8a0012] text-white text-sm">
        <div className="container-base py-2 text-center">
          Free delivery for purchases over {`\u20BA`}1500 - 30-day returns
        </div>
      </div>

      <Header />

      <main>{children}</main>

      <footer className="mt-16 bg-[#1f1f1f] text-white">
        <div className="container-base grid gap-8 md:grid-cols-4 py-12 text-sm">
          <div>
            <div className="font-medium mb-2">MKN Membership</div>
            <p className="text-white/70 mb-4">
              Become a member and receive {`\u20BA`}300 off your first online purchase over {`\u20BA`}1500.
            </p>
            <form className="flex gap-2">
              <input className="input !bg-white" placeholder="Enter your email" />
              <button className="btn btn-primary">Join</button>
            </form>
          </div>
          <div>
            <div className="font-medium mb-2">Shopping with MKN</div>
            <ul className="space-y-1 text-white/70">
              <li>
                <a className="underline underline-offset-4" href="#">
                  Delivery
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#">
                  Returns
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#">
                  FAQs
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">About Us</div>
            <ul className="space-y-1 text-white/70">
              <li>
                <a className="underline underline-offset-4" href="#">
                  About MKN
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a className="underline underline-offset-4" href="#">
                  Terms &amp; Conditions
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">Sustainability</div>
            <ul className="space-y-1 text-white/70">
              <li>
                <Link className="underline underline-offset-4" href="/sustainability#philosophy">
                  Our Philosophy
                </Link>
              </li>
              <li>
                <Link className="underline underline-offset-4" href="/sustainability#materials">
                  Materials
                </Link>
              </li>
              <li>
                <Link className="underline underline-offset-4" href="/sustainability#recycling">
                  Recycling
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-6 text-center text-xs text-white/60">
          &copy; {currentYear} MKN-style
        </div>
      </footer>
    </>
  );
}






