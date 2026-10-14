import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "SwiftCart — PayPal checkout for agentic shopping",
  description:
    "Find products with an AI shopping agent and check out securely with PayPal Buyer Protection.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} min-h-screen bg-[#c3d0d1] text-[#111416] antialiased selection:bg-lime-300 selection:text-black`}
      >
        {children}
      </body>
    </html>
  );
}
