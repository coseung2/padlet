import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { DJPlayerProvider } from "@/components/dj/DJPlayerProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura-board",
  description: "나만의 Aura-board — Notion inspired MVP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <DJPlayerProvider>{children}</DJPlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
