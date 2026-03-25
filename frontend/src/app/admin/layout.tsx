"use client";

import { useEffect } from "react";
import {
  AppShell,
  NavLink,
  Text,
  Group,
  ThemeIcon,
  Stack,
  Box,
} from "@mantine/core";
import {
  IconDashboard,
  IconUsers,
  IconCreditCard,
  IconShield,
  IconChevronLeft,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { colors } from "@/lib/theme";

const navItems = [
  { href: "/admin", icon: IconDashboard, label: "Статистика", exact: true },
  { href: "/admin/users", icon: IconUsers, label: "Пользователи" },
  { href: "/admin/subscriptions", icon: IconShield, label: "Подписки" },
  { href: "/admin/payments", icon: IconCreditCard, label: "Платежи" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initialized && !user) router.push("/login?from=/admin");
    if (initialized && user && !user.is_admin) router.push("/dashboard");
  }, [user, initialized, router]);

  if (!initialized || !user?.is_admin) {
    return (
      <Box style={{ minHeight: "100vh", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text c="dimmed">Загрузка...</Text>
      </Box>
    );
  }

  return (
    <AppShell
      navbar={{ width: 240, breakpoint: "sm" }}
      styles={{
        root: { background: colors.bg },
        navbar: { background: colors.surface, borderRight: `1px solid ${colors.border}` },
        main: { background: colors.bg },
      }}
    >
      <AppShell.Navbar p="md">
        <Group mb="xl">
          <IconShield size={24} color={colors.primary} />
          <Text fw={700} c="white">Админ панель</Text>
        </Group>

        <Stack gap={4} style={{ flex: 1 }}>
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
            return (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                label={item.label}
                leftSection={
                  <ThemeIcon variant={isActive ? "filled" : "subtle"} color={isActive ? "violet" : "gray"} size="sm">
                    <item.icon size={14} />
                  </ThemeIcon>
                }
                active={isActive}
                styles={{ root: { borderRadius: 8 } }}
              />
            );
          })}
        </Stack>

        <NavLink
          component={Link}
          href="/dashboard"
          label="Личный кабинет"
          leftSection={<ThemeIcon variant="subtle" color="gray" size="sm"><IconChevronLeft size={14} /></ThemeIcon>}
          styles={{ root: { borderRadius: 8 } }}
        />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
