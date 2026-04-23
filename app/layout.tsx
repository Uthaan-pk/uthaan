import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/Toast";
import { LanguageProvider } from "@/context/LanguageContext";
import { CommandPaletteProvider } from "@/components/CommandPaletteProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Uthaan — School Management System",
  description:
    "Uthaan helps Pakistani private schools manage attendance, fees, results, and parent communication — all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f8f7f4] text-gray-900">
        <LanguageProvider>
          <CommandPaletteProvider>
            {children}
            <ToastProvider />
          </CommandPaletteProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
