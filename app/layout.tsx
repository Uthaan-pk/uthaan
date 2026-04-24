import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/Toast";
import { LanguageProvider } from "@/context/LanguageContext";
import { CommandPaletteProvider } from "@/components/CommandPaletteProvider";
import { createClient } from "@/lib/supabase/server";
import { getSchoolContext } from "@/lib/school";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const schoolContext = user
    ? await getSchoolContext(supabase, user.id).catch(() => null)
    : null;

  const initialUserCtx = schoolContext
    ? { role: schoolContext.role, schoolId: schoolContext.schoolId }
    : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f8f7f4] text-gray-900">
        <LanguageProvider>
          <CommandPaletteProvider initialUserCtx={initialUserCtx}>
            {children}
            <ToastProvider />
          </CommandPaletteProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
