"use client";

import {
  Badge,
  Button,
  Container,
  Group,
  Modal,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSearch, IconShield } from "@tabler/icons-react";
import { useState } from "react";
import useSWR from "swr";
import { notifications } from "@mantine/notifications";
import { adminApi } from "@/lib/api";
import { colors } from "@/lib/theme";
import { formatDateTime } from "@/lib/utils";

const TARIFFS = [
  { value: "basic_1", label: "Базовый 1 мес" },
  { value: "basic_3", label: "Базовый 3 мес" },
  { value: "basic_12", label: "Базовый 12 мес" },
  { value: "premium_1", label: "Премиум 1 мес" },
  { value: "premium_3", label: "Премиум 3 мес" },
  { value: "premium_12", label: "Премиум 12 мес" },
  { value: "premium_forever", label: "Премиум бессрочно" },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [grantUserId, setGrantUserId] = useState<number | null>(null);
  const [selectedTariff, setSelectedTariff] = useState<string | null>(null);
  const [modalOpen, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [granting, setGranting] = useState(false);

  const { data: users, isLoading } = useSWR(
    ["/admin/users", search],
    () => adminApi.users(50, 0, search || undefined)
  );

  const handleGrant = async () => {
    if (!grantUserId || !selectedTariff) return;
    setGranting(true);
    try {
      await adminApi.grant(grantUserId, selectedTariff);
      notifications.show({
        title: "Готово",
        message: `Подписка "${selectedTariff}" выдана пользователю ${grantUserId}`,
        color: "green",
      });
      closeModal();
    } catch (err: any) {
      notifications.show({
        title: "Ошибка",
        message: err.message,
        color: "red",
      });
    } finally {
      setGranting(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Stack gap={4}>
          <Title order={2} c="white">Пользователи</Title>
          <Text c="dimmed">{users?.length || 0} записей</Text>
        </Stack>
        <TextInput
          placeholder="Поиск по имени / username"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          w={280}
          styles={{ input: { background: colors.surface, borderColor: colors.border, color: colors.text } }}
        />
      </Group>

      <div style={{ background: colors.surface, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: "hidden" }}>
        {isLoading ? (
          <Stack p="md">
            {[...Array(5)].map((_, i) => <Skeleton key={i} height={48} />)}
          </Stack>
        ) : (
          <Table styles={{
            thead: { background: colors.bg, borderBottom: `1px solid ${colors.border}` },
            th: { color: colors.textMuted, fontWeight: 500, padding: "12px 16px" },
            td: { color: colors.text, padding: "12px 16px", borderBottom: `1px solid ${colors.border}` },
          }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Имя</Table.Th>
                <Table.Th>Username</Table.Th>
                <Table.Th>Подписка</Table.Th>
                <Table.Th>Зарегистрирован</Table.Th>
                <Table.Th>Действия</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users?.map((u) => (
                <Table.Tr key={u.telegram_id}>
                  <Table.Td><Text size="sm" c="dimmed">{u.telegram_id}</Text></Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Text size="sm">{u.first_name || "—"}</Text>
                      {u.is_admin && <Badge color="violet" size="xs">Admin</Badge>}
                    </Group>
                  </Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{u.username ? `@${u.username}` : "—"}</Text></Table.Td>
                  <Table.Td>
                    <Badge color={u.has_active_subscription ? "green" : "gray"} variant="light" size="sm">
                      {u.has_active_subscription ? "Активна" : "Нет"}
                    </Badge>
                  </Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{formatDateTime(u.created_at)}</Text></Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="light"
                      color="violet"
                      leftSection={<IconShield size={12} />}
                      onClick={() => {
                        setGrantUserId(u.telegram_id);
                        setSelectedTariff(null);
                        openModal();
                      }}
                    >
                      Выдать
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>

      <Modal
        opened={modalOpen}
        onClose={closeModal}
        title="Выдать подписку"
        styles={{
          content: { background: colors.surface },
          header: { background: colors.surface, borderBottom: `1px solid ${colors.border}` },
          title: { color: colors.text },
        }}
      >
        <Stack>
          <Text size="sm" c="dimmed">Пользователь ID: <Text span c="white">{grantUserId}</Text></Text>
          <Select
            label="Тариф"
            data={TARIFFS}
            value={selectedTariff}
            onChange={setSelectedTariff}
            styles={{ input: { background: colors.bg, borderColor: colors.border, color: colors.text } }}
          />
          <Button onClick={handleGrant} loading={granting} disabled={!selectedTariff}>
            Выдать подписку
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
