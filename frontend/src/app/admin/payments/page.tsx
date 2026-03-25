"use client";

import {
  Badge,
  Container,
  Group,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";
import useSWR from "swr";
import { adminApi } from "@/lib/api";
import { colors } from "@/lib/theme";
import { formatAmount, formatDateTime, statusColor, statusLabel } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: payments, isLoading } = useSWR(
    ["/admin/payments", statusFilter],
    () => adminApi.payments(100, 0, statusFilter || undefined)
  );

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Stack gap={4}>
          <Title order={2} c="white">Платежи</Title>
          <Text c="dimmed">{payments?.length || 0} записей</Text>
        </Stack>
        <Select
          placeholder="Фильтр по статусу"
          clearable
          value={statusFilter}
          onChange={setStatusFilter}
          data={[
            { value: "succeeded", label: "Успешные" },
            { value: "pending", label: "Ожидают" },
            { value: "canceled", label: "Отменены" },
            { value: "failed", label: "Ошибка" },
          ]}
          w={200}
          styles={{ input: { background: colors.surface, borderColor: colors.border, color: colors.text } }}
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
                <Table.Th>Дата</Table.Th>
                <Table.Th>TG ID</Table.Th>
                <Table.Th>Провайдер</Table.Th>
                <Table.Th>Сумма</Table.Th>
                <Table.Th>Статус</Table.Th>
                <Table.Th>Описание</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {payments?.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td><Text size="sm" c="dimmed">{formatDateTime(p.created_at)}</Text></Table.Td>
                  <Table.Td><Text size="sm">{p.telegram_user_id}</Text></Table.Td>
                  <Table.Td><Badge variant="outline" size="sm">{p.provider}</Badge></Table.Td>
                  <Table.Td><Text size="sm" fw={600}>{formatAmount(p.amount, p.currency)}</Text></Table.Td>
                  <Table.Td>
                    <Badge color={statusColor(p.status)} variant="light" size="sm">
                      {statusLabel(p.status)}
                    </Badge>
                  </Table.Td>
                  <Table.Td><Text size="sm" c="dimmed" lineClamp={1}>{p.description || "—"}</Text></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>
    </Container>
  );
}
