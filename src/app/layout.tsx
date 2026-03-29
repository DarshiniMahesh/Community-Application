<<<<<<< HEAD
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
export const metadata: Metadata = { title: 'Sangha Portal', description: 'Community Portal — Sangha' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
=======
import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Census Management System",
  description: "Community Portal — Admin",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body>{children}</body>
    </html>
  );
}
>>>>>>> 896f12acca765089e49da40a3264eeeedd8ad22c
