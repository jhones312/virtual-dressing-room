import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Camera Virtual Dressing Room",
  description: "Browser-native AR mirror powered by MediaPipe and Three.js.",
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
