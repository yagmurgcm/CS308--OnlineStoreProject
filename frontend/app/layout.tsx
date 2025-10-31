import "./globals.css";
import type { Metadata } from "next";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "FATIH-style",
  description: "Simple, functional, affordable.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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
              <div className="font-medium mb-2">FATIH Membership</div>
              <p className="text-white/70 mb-4">
                Become a member and receive {`\u20BA`}300 off your first online purchase over {`\u20BA`}1500.
              </p>
              <form className="flex gap-2">
                <input className="input !bg-white" placeholder="Enter your email" />
                <button className="btn btn-primary">Join</button>
              </form>
            </div>
            <div>
              <div className="font-medium mb-2">Shopping with FATIH</div>
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
                    About FATIH
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
                  <a className="underline underline-offset-4" href="#">
                    Our Philosophy
                  </a>
                </li>
                <li>
                  <a className="underline underline-offset-4" href="#">
                    Materials
                  </a>
                </li>
                <li>
                  <a className="underline underline-offset-4" href="#">
                    Recycling
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 py-6 text-center text-xs text-white/60">
            &copy; {currentYear} FATIH-style
          </div>
        </footer>
      </body>
    </html>
  );
}
