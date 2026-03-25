import type { Metadata } from "next";
import { ColorSchemeScript } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@/styles/globals.css";
import { Providers } from "@/components/layout/Providers";

export const metadata: Metadata = {
  title: "CRS VPN — Быстрый и безопасный VPN",
  description: "Надёжный VPN с высокой скоростью. Подключайтесь к серверам по всему миру.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-mantine-color-scheme="dark">
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
