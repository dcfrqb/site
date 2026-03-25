"use client";

import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Badge,
  Skeleton,
} from "@mantine/core";
import {
  IconShield,
  IconClock,
  IconCreditCard,
  IconPlugConnected,
  IconArrowRight,
} from "@tabler/icons-react";
import Link from "next/link";
import useSWR from "swr";
import { subscriptionsApi, profileApi } from "@/lib/api";
import { colors } from "@/lib/theme";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data: profile, isLoading: profileLoading } = useSWR(
    "/profile",
    () => profileApi.get()
  );
  const { data: subscription, isLoading: subLoading } = useSWR(
    "/subscriptions/current",
    () => subscriptionsApi.current()
  );

  const statusColor =
    subscription?.status === "active"
      ? "green"
      : subscription?.status === "expired"
      ? "red"
      : "gray";

  const statusLabel =
    subscription?.status === "active"
      ? "Активна"
      : subscription?.status === "expired"
      ? "Истекла"
      : "Нет подписки";

  return (
    <Container size="lg" py="xl">
      {/* Header */}
      <Stack mb="xl">
        {profileLoading ? (
          <Skeleton height={32} width={300} />
        ) : (
          <Title order={2} c="white">
            Добро пожаловать,{" "}
            {profile?.first_name || profile?.username || "пользователь"}!
          </Title>
        )}
        <Text c="dimmed">Управляйте своей VPN-подпиской</Text>
      </Stack>

      <Grid>
        {/* Subscription status card */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              height: "100%",
            }}
          >
            <Group justify="space-between" mb="lg">
              <Group>
                <ThemeIcon size="lg" variant="light" color="violet">
                  <IconShield size={20} />
                </ThemeIcon>
                <Text fw={600} c="white">
                  Подписка
                </Text>
              </Group>
              {!subLoading && (
                <Badge color={statusColor} variant="light">
                  {statusLabel}
                </Badge>
              )}
            </Group>

            {subLoading ? (
              <Stack>
                <Skeleton height={20} />
                <Skeleton height={16} width="60%" />
              </Stack>
            ) : subscription?.status === "none" ? (
              <Stack>
                <Text c="dimmed">У вас нет активной подписки</Text>
                <Button
                  component={Link}
                  href="/dashboard/subscription"
                  leftSection={<IconArrowRight size={16} />}
                  style={{ width: "fit-content" }}
                >
                  Выбрать тариф
                </Button>
              </Stack>
            ) : (
              <Stack>
                <Group>
                  <Text size="sm" c="dimmed">
                    Тариф:
                  </Text>
                  <Text fw={500} c="white">
                    {subscription?.plan_name || subscription?.plan_code}
                  </Text>
                </Group>

                {subscription?.is_lifetime ? (
                  <Group>
                    <Text size="sm" c="dimmed">
                      Действие:
                    </Text>
                    <Badge color="violet" variant="light">
                      Бессрочно
                    </Badge>
                  </Group>
                ) : subscription?.valid_until ? (
                  <Group>
                    <Text size="sm" c="dimmed">
                      До:
                    </Text>
                    <Text fw={500} c="white">
                      {formatDate(subscription.valid_until)}
                    </Text>
                    {subscription.days_left !== null && (
                      <Badge
                        color={subscription.days_left > 7 ? "green" : "orange"}
                        variant="light"
                      >
                        Осталось {subscription.days_left} дн.
                      </Badge>
                    )}
                  </Group>
                ) : null}

                <Group mt="md">
                  <Button
                    component={Link}
                    href="/dashboard/subscription"
                    variant="light"
                    size="sm"
                  >
                    Управление подпиской
                  </Button>
                </Group>
              </Stack>
            )}
          </Card>
        </Grid.Col>

        {/* Quick actions */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack>
            <Card
              component={Link}
              href="/dashboard/subscription"
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                cursor: "pointer",
                textDecoration: "none",
                "&:hover": { borderColor: colors.primary },
              }}
            >
              <Group>
                <ThemeIcon variant="light" color="violet">
                  <IconPlugConnected size={18} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text size="sm" fw={600} c="white">
                    Подключиться
                  </Text>
                  <Text size="xs" c="dimmed">
                    Получить VPN конфиг
                  </Text>
                </Stack>
                <IconArrowRight size={16} color={colors.textMuted} style={{ marginLeft: "auto" }} />
              </Group>
            </Card>

            <Card
              component={Link}
              href="/dashboard/payments"
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              <Group>
                <ThemeIcon variant="light" color="blue">
                  <IconCreditCard size={18} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text size="sm" fw={600} c="white">
                    Платежи
                  </Text>
                  <Text size="xs" c="dimmed">
                    История оплат
                  </Text>
                </Stack>
                <IconArrowRight size={16} color={colors.textMuted} style={{ marginLeft: "auto" }} />
              </Group>
            </Card>

            <Card
              component={Link}
              href="/dashboard/subscription"
              style={{
                background: `linear-gradient(135deg, rgba(120, 64, 246, 0.2), rgba(120, 64, 246, 0.05))`,
                border: `1px solid ${colors.primary}`,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              <Group>
                <ThemeIcon variant="filled" color="violet">
                  <IconClock size={18} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text size="sm" fw={600} c="white">
                    Продлить
                  </Text>
                  <Text size="xs" c="dimmed">
                    Купить подписку
                  </Text>
                </Stack>
                <IconArrowRight size={16} color={colors.primary} style={{ marginLeft: "auto" }} />
              </Group>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
