"use client";

import {
  Badge,
  Container,
  Group,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import useSWR from "swr";
import { paymentsApi } from "@/lib/api";
import { colors } from "@/lib/theme";
import { formatAmount, formatDateTime, statusColor, statusLabel } from "@/lib/utils";

export default function PaymentsPage() {
  const { data: payments, isLoading } = useSWR("/payments", () =>
    paymentsApi.list(50)
  );

  return (
    <Container size="lg" py="xl">
      <Title order={2} c="white" mb="xs">
        История платежей
      </Title>
      <Text c="dimmed" mb="xl">
        Все ваши транзакции
      </Text>

      {isLoading ? (
        <Stack>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} height={48} />
          ))}
        </Stack>
      ) : !payments?.length ? (
        <Text c="dimmed" ta="center" py="xl">
          Нет платежей
        </Text>
      ) : (
        <div
          style={{
            background: colors.surface,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            overflow: "hidden",
          }}
        >
          <Table
            styles={{
              table: { borderCollapse: "collapse" },
              thead: {
                background: colors.bg,
                borderBottom: `1px solid ${colors.border}`,
              },
              th: { color: colors.textMuted, fontWeight: 500, padding: "12px 16px" },
              td: { color: colors.text, padding: "12px 16px", borderBottom: `1px solid ${colors.border}` },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Дата</Table.Th>
                <Table.Th>Описание</Table.Th>
                <Table.Th>Сумма</Table.Th>
                <Table.Th>Статус</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {payments.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {formatDateTime(p.created_at)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{p.description || p.external_id}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600} c="white">
                      {formatAmount(p.amount, p.currency)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={statusColor(p.status)}
                      variant="light"
                      size="sm"
                    >
                      {statusLabel(p.status)}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}
    </Container>
  );
}
