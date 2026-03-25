"use client";

import {
  Group,
  Button,
  Text,
  Avatar,
  Menu,
  ActionIcon,
  Burger,
  Drawer,
  Stack,
  Anchor,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconShield,
  IconUser,
  IconLogout,
  IconSettings,
  IconChevronDown,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { colors } from "@/lib/theme";

const navLinks = [
  { href: "/#plans", label: "Тарифы" },
  { href: "/#faq", label: "FAQ" },
];

export function Header() {
  const [drawerOpen, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(10, 10, 15, 0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none" }}>
            <Group gap="xs">
              <IconShield size={28} color={colors.primary} />
              <Text fw={700} size="lg" c="white">
                CRS VPN
              </Text>
            </Group>
          </Link>

          {/* Desktop Nav */}
          <Group gap="xl" visibleFrom="sm">
            {navLinks.map((link) => (
              <Anchor
                key={link.href}
                component={Link}
                href={link.href}
                c="dimmed"
                fw={500}
                style={{ textDecoration: "none" }}
                styles={{ root: { "&:hover": { color: colors.text } } }}
              >
                {link.label}
              </Anchor>
            ))}
          </Group>

          {/* Auth */}
          <Group gap="sm" visibleFrom="sm">
            {user ? (
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button
                    variant="subtle"
                    rightSection={<IconChevronDown size={14} />}
                    leftSection={
                      <Avatar size="sm" color="violet" radius="xl">
                        {(user.first_name || user.username || "U")[0].toUpperCase()}
                      </Avatar>
                    }
                  >
                    {user.first_name || user.username || `ID:${user.telegram_id}`}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown
                  style={{
                    background: colors.surfaceElevated,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <Menu.Item
                    leftSection={<IconUser size={14} />}
                    component={Link}
                    href="/dashboard"
                  >
                    Личный кабинет
                  </Menu.Item>
                  {user.is_admin && (
                    <Menu.Item
                      leftSection={<IconSettings size={14} />}
                      component={Link}
                      href="/admin"
                    >
                      Панель администратора
                    </Menu.Item>
                  )}
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconLogout size={14} />}
                    color="red"
                    onClick={handleLogout}
                  >
                    Выйти
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <Button
                component={Link}
                href="/login"
                variant="filled"
                leftSection={<IconShield size={16} />}
              >
                Войти
              </Button>
            )}
          </Group>

          {/* Mobile burger */}
          <Burger
            opened={drawerOpen}
            onClick={toggleDrawer}
            hiddenFrom="sm"
            size="sm"
          />
        </div>
      </header>

      {/* Mobile drawer */}
      <Drawer
        opened={drawerOpen}
        onClose={closeDrawer}
        title="CRS VPN"
        hiddenFrom="sm"
        styles={{
          content: { background: colors.surface },
          header: { background: colors.surface, borderBottom: `1px solid ${colors.border}` },
        }}
      >
        <Stack>
          {navLinks.map((link) => (
            <Anchor
              key={link.href}
              component={Link}
              href={link.href}
              c="white"
              size="lg"
              fw={500}
              onClick={closeDrawer}
            >
              {link.label}
            </Anchor>
          ))}
          {user ? (
            <>
              <Anchor
                component={Link}
                href="/dashboard"
                c="white"
                size="lg"
                fw={500}
                onClick={closeDrawer}
              >
                Личный кабинет
              </Anchor>
              <Button variant="light" color="red" onClick={handleLogout}>
                Выйти
              </Button>
            </>
          ) : (
            <Button
              component={Link}
              href="/login"
              fullWidth
              onClick={closeDrawer}
            >
              Войти через Telegram
            </Button>
          )}
        </Stack>
      </Drawer>
    </>
  );
}
