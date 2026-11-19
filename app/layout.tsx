import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Gönenli Süt · Davet Sistemi",
  description: "QR davetiye, giriş kontrolü ve çekiliş",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e3a63" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
