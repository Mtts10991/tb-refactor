import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThingsBoard",
  description: "Open-source IoT Platform — Device management, data collection, processing, and visualization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
