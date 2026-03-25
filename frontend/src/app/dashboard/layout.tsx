"use client";

import { useEffect } from "react";
import {
  AppShell,
  NavLink,
  Text,
  Group,
  ThemeIcon,
  Stack,
  Avatar,
  Box,
} from "@mantine/core";
import {
  IconDashboard,
  IconCreditCard,
  IconShield,
  IconPlugConnected,
  IconLogout,
  IconChevronLeft,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { colors } from "@/lib/theme";

const navItems = [
  { href: "/dashboard", icon: IconDashboard, label: "Обзор", exact: true },
  { href: "/dashboard/subscription", icon: IconShield, label: "Подписка" },
  { href: "/dashboard/payments", icon: IconCreditCard, label: "Платежи" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, initialized } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initialized && !user) {
      router.push("/login?from=/dashboard");
    }
  }, [user, initialized, router]);

  if (!initialized || !user) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          background: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text c="dimmed">Загрузка...</Text>
      </Box>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <AppShell
      navbar={{ width: 240, breakpoint: "sm" }}
      styles={{
        root: { background: colors.bg },
        navbar: {
          background: colors.surface,
          borderRight: `1px solid ${colors.border}`,
        },
        main: { background: colors.bg },
      }}
    >
      <AppShell.Navbar p="md">
        {/* Logo */}
        <Group mb="xl">
          <IconShield size={24} color={colors.primary} />
          <Text fw={700} c="white">
            CRS VPN
          </Text>
        </Group>

        {/* User info */}
        <Box
          mb="lg"
          p="sm"
          style={{
            background: colors.bg,
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
          }}
        >
          <Group>
            <Avatar color="violet" radius="xl" size="md">
              {(user.first_name || user.username || "U")[0].toUpperCase()}
            </Avatar>
            <Stack gap={2}>
              <Text size="sm" fw={600} c="white" lineClamp={1}>
                {user.first_name || user.username || `ID:${user.telegram_id}`}
              </Text>
              {user.username && (
                <Text size="xs" c="dimmed">
                  @{user.username}
                </Text>
              )}
            </Stack>
          </Group>
        </Box>

        {/* Navigation */}
        <Stack gap={4} style={{ flex: 1 }}>
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);
            return (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                label={item.label}
                leftSection={
                  <ThemeIcon
                    variant={isActive ? "filled" : "subtle"}
                    color={isActive ? "violet" : "gray"}
                    size="sm"
                  >
                    <item.icon size={14} />
                  </ThemeIcon>
                }
                active={isActive}
                styles={{
                  root: {
                    borderRadius: 8,
                    color: isActive ? colors.primary : colors.textSubtle,
                    "&:hover": { background: colors.bg },
                  },
                }}
              />
            );
          })}
        </Stack>

        {/* Back to site + Logout */}
        <Stack gap={4} mt="auto">
          <NavLink
            component={Link}
            href="/"
            label="На главную"
            leftSection={
              <ThemeIcon variant="subtle" color="gray" size="sm">
                <IconChevronLeft size={14} />
              </ThemeIcon>
            }
            styles={{ root: { borderRadius: 8, color: colors.textSubtle } }}
          />
          <NavLink
            label="Выйти"
            onClick={handleLogout}
            leftSection={
              <ThemeIcon variant="subtle" color="red" size="sm">
                <IconLogout size={14} />
              </ThemeIcon>
            }
            styles={{ root: { borderRadius: 8, color: colors.textSubtle } }}
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
