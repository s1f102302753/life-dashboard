import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life Dashboard",
  description: "Daily life dashboard optimized for mobile"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
