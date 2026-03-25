"use client";

import {
  Badge,
  Container,
  Group,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";
import useSWR from "swr";
import { adminApi } from "@/lib/api";
import { colors } from "@/lib/theme";
import { formatDate } from "@/lib/utils";

export default function AdminSubscriptionsPage() {
  const [activeOnly, setActiveOnly] = useState(false);

  const { data: subs, isLoading } = useSWR(
    ["/admin/subscriptions", activeOnly],
    () => adminApi.subscriptions(100, 0, activeOnly)
  );

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Stack gap={4}>
          <Title order={2} c="white">Подписки</Title>
          <Text c="dimmed">{subs?.length || 0} записей</Text>
        </Stack>
        <Switch
          label="Только активные"
          checked={activeOnly}
          onChange={(e) => setActiveOnly(e.currentTarget.checked)}
          color="violet"
        />
      </Group>

      <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: "hidden" }}>
        {isLoading ? (
          <Stack p="md">{[...Array(5)].map((_, i) => <Skeleton key={i} height={48} />)}</Stack>
        ) : (
          <Table styles={{
            thead: { background: colors.bg, borderBottom: `1px solid ${colors.border}` },
            th: { color: colors.textMuted, fontWeight: 500, padding: "12px 16px" },
            td: { color: colors.text, padding: "12px 16px", borderBottom: `1px solid ${colors.border}` },
          }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>TG ID</Table.Th>
                <Table.Th>Тариф</Table.Th>
                <Table.Th>Статус</Table.Th>
                <Table.Th>До</Table.Th>
                <Table.Th>Создана</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {subs?.map((s) => (
                <Table.Tr key={s.id}>
                  <Table.Td><Text size="sm" c="dimmed">{s.id}</Text></Table.Td>
                  <Table.Td><Text size="sm">{s.telegram_user_id}</Text></Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Text size="sm">{s.plan_name || s.plan_code}</Text>
                      {s.is_lifetime && <Badge color="violet" size="xs">∞</Badge>}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={s.active ? "green" : "gray"} variant="light" size="sm">
                      {s.active ? "Активна" : "Неактивна"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={s.is_lifetime ? "violet" : "default"}>
                      {s.is_lifetime ? "Бессрочно" : formatDate(s.valid_until)}
                    </Text>
                  </Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{formatDate(s.created_at)}</Text></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>
    </Container>
  );
}
