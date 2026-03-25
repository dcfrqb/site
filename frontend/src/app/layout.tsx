import type { Metadata } from "next";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@/styles/globals.css";
import { theme } from "@/lib/theme";
import { AuthProvider } from "@/components/layout/AuthProvider";

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
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <Notifications position="top-right" />
          <ModalsProvider>
            <AuthProvider>{children}</AuthProvider>
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
