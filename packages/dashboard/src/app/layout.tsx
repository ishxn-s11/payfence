import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Nav, Footer } from "@/components/layout";
import { ScrollProgress } from "@/components/layout/ScrollProgress";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pay-Fence",
  description: "Organization dashboard for AI agent payment policy enforcement",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} flex min-h-screen flex-col`}>
        <ScrollProgress />
        <Nav />
        <main className="relative z-10 mx-auto max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
