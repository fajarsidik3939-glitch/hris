import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HRIS",
  description: "Sistem informasi SDM dan absensi selfie GPS",
};

export const viewport: Viewport = { themeColor: "#1d4ed8" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-100 text-slate-900">{children}</body>
    </html>
  );
}
