"use client";

import {
  Card,
  Container,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconUsers,
  IconShield,
  IconCreditCard,
  IconCurrencyRubel,
} from "@tabler/icons-react";
import useSWR from "swr";
import { adminApi } from "@/lib/api";
import { colors } from "@/lib/theme";
import { formatAmount } from "@/lib/utils";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useSWR("/admin/stats", () => adminApi.stats());

  const cards = stats
    ? [
        {
          label: "Пользователей",
          value: stats.total_users,
          icon: IconUsers,
          color: "blue",
          format: (v: number) => v.toString(),
        },
        {
          label: "Активных подписок",
          value: stats.active_subscriptions,
          icon: IconShield,
          color: "violet",
          format: (v: number) => v.toString(),
        },
        {
          label: "Платежей (успешных)",
          value: stats.succeeded_payments,
          icon: IconCreditCard,
          color: "green",
          format: (v: number) => `${v} / ${stats.total_payments}`,
        },
        {
          label: "Выручка",
          value: stats.revenue_rub,
          icon: IconCurrencyRubel,
          color: "teal",
          format: (v: number) => formatAmount(v),
        },
      ]
    : [];

  return (
    <Container size="lg" py="xl">
      <Title order={2} c="white" mb="xs">
        Статистика
      </Title>
      <Text c="dimmed" mb="xl">
        Обзор системы
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        {isLoading
          ? [...Array(4)].map((_, i) => <Skeleton key={i} height={120} radius="lg" />)
          : cards.map((c) => (
              <Card
                key={c.label}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Group justify="space-between" mb="md">
                  <Text size="sm" c="dimmed">
                    {c.label}
                  </Text>
                  <ThemeIcon variant="light" color={c.color} size="md">
                    <c.icon size={16} />
                  </ThemeIcon>
                </Group>
                <Text fw={700} style={{ fontSize: 28, color: colors.text }}>
                  {c.format(c.value)}
                </Text>
              </Card>
            ))}
      </SimpleGrid>
    </Container>
  );
}
