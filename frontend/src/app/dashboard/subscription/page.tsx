"use client";

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Container,
  CopyButton,
  Divider,
  Grid,
  Group,
  List,
  Modal,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconShield,
  IconPlugConnected,
  IconCopy,
  IconCheck,
  IconAlertCircle,
  IconCreditCard,
  IconRefresh,
} from "@tabler/icons-react";
import useSWR from "swr";
import { notifications } from "@mantine/notifications";
import { subscriptionsApi, paymentsApi } from "@/lib/api";
import { colors } from "@/lib/theme";
import { formatDate, formatAmount, statusColor, statusLabel } from "@/lib/utils";
import { useState } from "react";

// Тарифы для покупки
const TARIFF_GROUPS = [
  {
    plan: "Базовый",
    color: "blue",
    tariffs: [
      { key: "basic_1", label: "1 месяц", amount: 199 },
      { key: "basic_3", label: "3 месяца", amount: 499 },
      { key: "basic_6", label: "6 месяцев", amount: 899 },
      { key: "basic_12", label: "12 месяцев", amount: 1599 },
    ],
  },
  {
    plan: "Премиум",
    color: "violet",
    tariffs: [
      { key: "premium_1", label: "1 месяц", amount: 299 },
      { key: "premium_3", label: "3 месяца", amount: 799 },
      { key: "premium_6", label: "6 месяцев", amount: 1499 },
      { key: "premium_12", label: "12 месяцев", amount: 2699 },
    ],
  },
];

export default function SubscriptionPage() {
  const [payModalOpen, { open: openPayModal, close: closePayModal }] = useDisclosure(false);
  const [paying, setPaying] = useState(false);

  const { data: subscription, isLoading: subLoading, mutate: mutateSub } = useSWR(
    "/subscriptions/current",
    () => subscriptionsApi.current()
  );
  const { data: connectInfo, isLoading: connectLoading } = useSWR(
    "/subscriptions/connect",
    () => subscriptionsApi.connect(),
    { shouldRetryOnError: false }
  );

  const handlePay = async (tariff: string, amount: number, label: string) => {
    setPaying(true);
    try {
      const result = await paymentsApi.create(tariff);
      // Редиректим на YooKassa
      window.location.href = result.payment_url;
    } catch (err: any) {
      notifications.show({
        title: "Ошибка платежа",
        message: err.message || "Не удалось создать платёж",
        color: "red",
        icon: <IconAlertCircle />,
      });
      setPaying(false);
    }
  };

  const isActive = subscription?.status === "active";
  const statusC = isActive ? "green" : subscription?.status === "expired" ? "red" : "gray";

  return (
    <Container size="lg" py="xl">
      <Title order={2} c="white" mb="xs">
        Подписка
      </Title>
      <Text c="dimmed" mb="xl">
        Управление VPN-подпиской и подключение
      </Text>

      <Grid>
        {/* Current subscription */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card
            style={{
              background: colors.surface,
              border: `1px solid ${isActive ? colors.primary : colors.border}`,
            }}
            h="100%"
          >
            <Group justify="space-between" mb="md">
              <Group>
                <ThemeIcon variant="light" color="violet">
                  <IconShield size={18} />
                </ThemeIcon>
                <Text fw={600} c="white">
                  Текущий план
                </Text>
              </Group>
              {!subLoading && (
                <Badge color={statusC} variant="light">
                  {statusLabel(subscription?.status || "none")}
                </Badge>
              )}
            </Group>

            {subLoading ? (
              <Stack>
                <Skeleton height={20} />
                <Skeleton height={16} width="60%" />
              </Stack>
            ) : subscription?.status === "none" ? (
              <Stack align="center" py="md">
                <Text c="dimmed" ta="center">
                  Нет активной подписки
                </Text>
                <Button onClick={openPayModal}>Купить подписку</Button>
              </Stack>
            ) : (
              <Stack gap="sm">
                <Group>
                  <Text size="sm" c="dimmed" w={100}>
                    Тариф:
                  </Text>
                  <Text fw={500} c="white">
                    {subscription?.plan_name || subscription?.plan_code}
                  </Text>
                </Group>

                {subscription?.is_lifetime ? (
                  <Group>
                    <Text size="sm" c="dimmed" w={100}>
                      Срок:
                    </Text>
                    <Badge color="violet" variant="light">
                      Бессрочно
                    </Badge>
                  </Group>
                ) : (
                  <Group>
                    <Text size="sm" c="dimmed" w={100}>
                      Действует до:
                    </Text>
                    <Text fw={500} c="white">
                      {formatDate(subscription?.valid_until)}
                    </Text>
                    {subscription?.days_left !== null && subscription?.days_left !== undefined && (
                      <Badge
                        color={subscription.days_left > 7 ? "green" : "orange"}
                        variant="dot"
                      >
                        {subscription.days_left} дн.
                      </Badge>
                    )}
                  </Group>
                )}

                <Divider my="xs" color={colors.border} />

                <Button
                  variant="light"
                  leftSection={<IconCreditCard size={16} />}
                  onClick={openPayModal}
                >
                  Продлить / Сменить тариф
                </Button>
              </Stack>
            )}
          </Card>
        </Grid.Col>

        {/* Connect info */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
            h="100%"
          >
            <Group mb="md">
              <ThemeIcon variant="light" color="teal">
                <IconPlugConnected size={18} />
              </ThemeIcon>
              <Text fw={600} c="white">
                Подключение
              </Text>
            </Group>

            {connectLoading ? (
              <Skeleton height={80} />
            ) : !connectInfo?.subscription_url ? (
              <Alert icon={<IconAlertCircle />} color="gray">
                Ссылка для подключения появится после активации подписки
              </Alert>
            ) : (
              <Stack>
                <Text size="sm" c="dimmed">
                  Ваша ссылка для подписки на VPN-конфиг:
                </Text>
                <Box
                  p="sm"
                  style={{
                    background: colors.bg,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    overflowX: "auto",
                  }}
                >
                  <Code
                    style={{
                      background: "transparent",
                      color: colors.primary,
                      fontSize: 13,
                      wordBreak: "break-all",
                    }}
                  >
                    {connectInfo.subscription_url}
                  </Code>
                </Box>
                <CopyButton value={connectInfo.subscription_url} timeout={2000}>
                  {({ copied, copy }) => (
                    <Button
                      onClick={copy}
                      leftSection={
                        copied ? <IconCheck size={16} /> : <IconCopy size={16} />
                      }
                      variant={copied ? "filled" : "light"}
                      color={copied ? "green" : "violet"}
                      size="sm"
                    >
                      {copied ? "Скопировано!" : "Скопировать ссылку"}
                    </Button>
                  )}
                </CopyButton>
                <Text size="xs" c="dimmed">
                  Добавьте эту ссылку в приложение (Hiddify, v2rayN, Streisand и др.)
                </Text>
              </Stack>
            )}
          </Card>
        </Grid.Col>

        {/* Instructions */}
        <Grid.Col span={12}>
          <Card
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <Text fw={600} c="white" mb="md">
              Инструкции по подключению
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              {[
                {
                  os: "Windows",
                  app: "Hiddify",
                  steps: ["Скачайте Hiddify", "Нажмите «+»", "Вставьте ссылку подписки"],
                },
                {
                  os: "macOS",
                  app: "Hiddify",
                  steps: ["Скачайте Hiddify", "Нажмите «+»", "Вставьте ссылку подписки"],
                },
                {
                  os: "Android",
                  app: "Hiddify",
                  steps: ["Установите из Play Store", "Добавьте профиль", "Подключитесь"],
                },
                {
                  os: "iOS",
                  app: "Streisand",
                  steps: ["Установите из App Store", "Добавьте подписку", "Подключитесь"],
                },
              ].map((item) => (
                <Card
                  key={item.os}
                  padding="sm"
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <Text fw={600} size="sm" c="white" mb="xs">
                    {item.os}
                  </Text>
                  <Badge size="xs" variant="light" color="violet" mb="xs">
                    {item.app}
                  </Badge>
                  <List size="xs" c="dimmed" spacing={4}>
                    {item.steps.map((step, i) => (
                      <List.Item key={i}>{step}</List.Item>
                    ))}
                  </List>
                </Card>
              ))}
            </SimpleGrid>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Payment Modal */}
      <Modal
        opened={payModalOpen}
        onClose={closePayModal}
        title="Выберите тариф"
        size="lg"
        styles={{
          content: { background: colors.surface },
          header: { background: colors.surface, borderBottom: `1px solid ${colors.border}` },
          title: { color: colors.text, fontWeight: 600 },
        }}
      >
        <Stack>
          {TARIFF_GROUPS.map((group) => (
            <Box key={group.plan}>
              <Text fw={600} c="white" mb="sm">
                {group.plan}
              </Text>
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                {group.tariffs.map((t) => (
                  <Button
                    key={t.key}
                    variant="light"
                    color={group.color}
                    onClick={() => {
                      closePayModal();
                      handlePay(t.key, t.amount, `${group.plan} ${t.label}`);
                    }}
                    loading={paying}
                    styles={{
                      root: {
                        height: "auto",
                        padding: "12px 8px",
                        flexDirection: "column",
                      },
                      label: { flexDirection: "column", gap: 4 },
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      {t.label}
                    </Text>
                    <Text fw={700}>{formatAmount(t.amount)}</Text>
                  </Button>
                ))}
              </SimpleGrid>
            </Box>
          ))}
          <Text size="xs" c="dimmed" ta="center">
            После оплаты подписка активируется автоматически. Продление добавляется к текущей дате.
          </Text>
        </Stack>
      </Modal>
    </Container>
  );
}
