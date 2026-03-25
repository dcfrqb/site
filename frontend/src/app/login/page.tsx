"use client";

import { useEffect, useCallback, Suspense } from "react";
import {
  Box,
  Card,
  Container,
  Stack,
  Text,
  Title,
  ThemeIcon,
  Alert,
  Loader,
} from "@mantine/core";
import { IconShield, IconBrandTelegram, IconAlertCircle } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { notifications } from "@mantine/notifications";
import { useAuthStore } from "@/lib/auth-store";
import { authApi, TelegramAuthData } from "@/lib/api";
import { colors } from "@/lib/theme";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void;
  }
}

// Вынесено в отдельный компонент для Suspense
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser } = useAuthStore();

  const from = searchParams?.get("from") || "/dashboard";

  useEffect(() => {
    if (user) {
      router.push(from);
    }
  }, [user, router, from]);

  const handleTelegramAuth = useCallback(
    async (authData: TelegramAuthData) => {
      try {
        const userData = await authApi.loginTelegram(authData);
        setUser(userData);
        notifications.show({
          title: "Добро пожаловать!",
          message: `Привет, ${userData.first_name || userData.username}!`,
          color: "green",
        });
        router.push(from);
      } catch {
        notifications.show({
          title: "Ошибка входа",
          message: "Не удалось войти через Telegram. Попробуйте снова.",
          color: "red",
        });
      }
    },
    [setUser, router, from]
  );

  useEffect(() => {
    window.onTelegramAuth = handleTelegramAuth;

    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-radius", "8");
    script.async = true;

    const container = document.getElementById("telegram-login-container");
    if (container) {
      container.innerHTML = "";
      container.appendChild(script);
    }

    return () => {
      delete window.onTelegramAuth;
    };
  }, [handleTelegramAuth]);

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: colors.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `radial-gradient(ellipse at 50% 30%, rgba(120, 64, 246, 0.12) 0%, transparent 70%)`,
      }}
    >
      <Container size="xs" w="100%">
        <Stack align="center" gap="xl">
          <ThemeIcon size={64} radius="xl" variant="light" color="violet">
            <IconShield size={36} />
          </ThemeIcon>

          <Stack align="center" gap="xs">
            <Title order={2} c="white">Войти в CRS VPN</Title>
            <Text c="dimmed" ta="center">Используйте аккаунт Telegram для входа</Text>
          </Stack>

          <Card w="100%" style={{ background: colors.surface, border: `1px solid ${colors.border}` }}>
            <Stack align="center" gap="lg">
              <ThemeIcon size="xl" color="blue" variant="light">
                <IconBrandTelegram size={28} />
              </ThemeIcon>

              <Text c={colors.textSubtle} ta="center" size="sm">
                Нажмите кнопку ниже для входа через Telegram.
                Мы не получаем доступ к вашим сообщениям.
              </Text>

              <div id="telegram-login-container" style={{ minHeight: 50 }}>
                {!process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME && (
                  <Alert icon={<IconAlertCircle />} color="orange" title="Настройка">
                    Задайте <code>NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code> в .env
                  </Alert>
                )}
              </div>
            </Stack>
          </Card>

          <Text size="xs" c="dimmed" ta="center" maw={320}>
            Войдя, вы соглашаетесь с условиями использования сервиса.
            Ваши данные Telegram используются только для идентификации.
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Box style={{ minHeight: "100vh", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader color="violet" />
        </Box>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
