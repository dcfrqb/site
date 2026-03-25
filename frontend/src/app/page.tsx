"use client";

import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  List,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Badge,
  Accordion,
  SimpleGrid,
} from "@mantine/core";
import {
  IconShield,
  IconBolt,
  IconGlobe,
  IconDevices,
  IconCheck,
  IconArrowRight,
  IconLock,
  IconServer,
} from "@tabler/icons-react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { colors } from "@/lib/theme";

// Тарифы (статические для landing)
const plans = [
  {
    key: "basic",
    name: "Базовый",
    price: "199",
    period: "мес",
    features: ["5 устройств", "Базовые серверы", "Поддержка 24/7"],
    popular: false,
    tariff: "basic_1",
  },
  {
    key: "premium",
    name: "Премиум",
    price: "299",
    period: "мес",
    features: ["15 устройств", "Все серверы", "Приоритетная поддержка", "Максимальная скорость"],
    popular: true,
    tariff: "premium_1",
  },
];

const features = [
  {
    icon: IconBolt,
    title: "Высокая скорость",
    description: "Серверы оптимизированы для минимальных задержек и максимальной пропускной способности.",
  },
  {
    icon: IconLock,
    title: "Шифрование",
    description: "Военный уровень шифрования. Ваши данные под надёжной защитой.",
  },
  {
    icon: IconGlobe,
    title: "Серверы по всему миру",
    description: "Подключайтесь к серверам в разных странах. Обходите блокировки легко.",
  },
  {
    icon: IconDevices,
    title: "Все устройства",
    description: "Windows, macOS, iOS, Android, Linux. Один аккаунт — все платформы.",
  },
];

const faqs = [
  {
    q: "Как начать использовать VPN?",
    a: "Оформите подписку, скачайте приложение для вашего устройства и подключитесь в один клик.",
  },
  {
    q: "Какие протоколы поддерживаются?",
    a: "Мы поддерживаем VLESS, VMESS и другие современные протоколы через Remnawave.",
  },
  {
    q: "Можно ли использовать на нескольких устройствах?",
    a: "Базовый тариф — до 5 устройств, Премиум — до 15 устройств одновременно.",
  },
  {
    q: "Как продлить подписку?",
    a: "Продление доступно в личном кабинете или через Telegram-бот. Подписка продлевается от текущей даты окончания.",
  },
  {
    q: "Есть ли возврат средств?",
    a: "Да, мы предоставляем возврат в течение 3 дней после оплаты, если у вас возникли технические проблемы.",
  },
];

export default function HomePage() {
  return (
    <Box style={{ minHeight: "100vh", background: colors.bg }}>
      <Header />

      {/* Hero */}
      <Box
        style={{
          background: `radial-gradient(ellipse at 50% -20%, rgba(120, 64, 246, 0.15) 0%, transparent 70%)`,
          paddingTop: 80,
          paddingBottom: 80,
        }}
      >
        <Container size="lg">
          <Stack align="center" gap="xl">
            <Badge
              size="lg"
              variant="light"
              color="violet"
              leftSection={<IconShield size={14} />}
            >
              Безопасный VPN
            </Badge>

            <Title
              order={1}
              ta="center"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                fontWeight: 800,
                lineHeight: 1.1,
                color: colors.text,
              }}
            >
              Интернет без{" "}
              <Text
                component="span"
                inherit
                variant="gradient"
                gradient={{ from: "violet", to: "blue" }}
              >
                границ и слежки
              </Text>
            </Title>

            <Text
              size="xl"
              c="dimmed"
              ta="center"
              maw={600}
              style={{ lineHeight: 1.6 }}
            >
              Быстрый, надёжный и приватный VPN для всех ваших устройств.
              Подключитесь за 2 минуты.
            </Text>

            <Group gap="md">
              <Button
                component={Link}
                href="/login"
                size="lg"
                leftSection={<IconArrowRight size={18} />}
              >
                Начать сейчас
              </Button>
              <Button
                component="a"
                href="#plans"
                size="lg"
                variant="outline"
                color="gray"
              >
                Смотреть тарифы
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Features */}
      <Container size="lg" py={80}>
        <Title order={2} ta="center" mb={48} c="white">
          Почему выбирают нас
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          {features.map((f) => (
            <Card
              key={f.title}
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
              }}
            >
              <ThemeIcon
                size="lg"
                variant="light"
                color="violet"
                mb="md"
              >
                <f.icon size={20} />
              </ThemeIcon>
              <Text fw={600} mb="xs" c="white">
                {f.title}
              </Text>
              <Text size="sm" c="dimmed">
                {f.description}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      {/* Plans */}
      <Box
        id="plans"
        style={{ background: colors.surface, borderTop: `1px solid ${colors.border}` }}
        py={80}
      >
        <Container size="lg">
          <Title order={2} ta="center" mb={8} c="white">
            Тарифы
          </Title>
          <Text c="dimmed" ta="center" mb={48}>
            Выберите подходящий план
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" maw={800} mx="auto">
            {plans.map((plan) => (
              <Card
                key={plan.key}
                style={{
                  background: plan.popular
                    ? `linear-gradient(135deg, rgba(120, 64, 246, 0.15), rgba(120, 64, 246, 0.05))`
                    : colors.bg,
                  border: `1px solid ${plan.popular ? colors.primary : colors.border}`,
                  position: "relative",
                }}
              >
                {plan.popular && (
                  <Badge
                    color="violet"
                    variant="filled"
                    style={{ position: "absolute", top: -12, right: 20 }}
                  >
                    Популярный
                  </Badge>
                )}

                <Text fw={700} size="xl" c="white" mb="xs">
                  {plan.name}
                </Text>

                <Group align="baseline" gap="xs" mb="lg">
                  <Text style={{ fontSize: 40, fontWeight: 800, color: colors.primary }}>
                    {plan.price}₽
                  </Text>
                  <Text c="dimmed">/{plan.period}</Text>
                </Group>

                <List
                  spacing="xs"
                  mb="xl"
                  icon={
                    <ThemeIcon color="violet" size="sm" radius="xl">
                      <IconCheck size={12} />
                    </ThemeIcon>
                  }
                >
                  {plan.features.map((f) => (
                    <List.Item key={f}>
                      <Text size="sm" c={colors.textSubtle}>
                        {f}
                      </Text>
                    </List.Item>
                  ))}
                </List>

                <Button
                  component={Link}
                  href="/login"
                  fullWidth
                  variant={plan.popular ? "filled" : "outline"}
                  color={plan.popular ? "violet" : "gray"}
                >
                  Выбрать план
                </Button>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Stats */}
      <Container size="lg" py={80}>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
          {[
            { value: "99.9%", label: "Uptime" },
            { value: "< 5ms", label: "Пинг до серверов" },
            { value: "∞", label: "Трафик" },
          ].map((s) => (
            <Stack key={s.label} align="center">
              <Text
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  background: `linear-gradient(135deg, ${colors.primary}, #4f46e5)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {s.value}
              </Text>
              <Text c="dimmed" fw={500}>
                {s.label}
              </Text>
            </Stack>
          ))}
        </SimpleGrid>
      </Container>

      {/* FAQ */}
      <Box
        id="faq"
        style={{ background: colors.surface, borderTop: `1px solid ${colors.border}` }}
        py={80}
      >
        <Container size="md">
          <Title order={2} ta="center" mb={48} c="white">
            Часто задаваемые вопросы
          </Title>
          <Accordion
            styles={{
              item: {
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                marginBottom: 8,
              },
              control: { color: colors.text },
              panel: { color: colors.textMuted },
            }}
          >
            {faqs.map((faq, i) => (
              <Accordion.Item key={i} value={String(i)}>
                <Accordion.Control>{faq.q}</Accordion.Control>
                <Accordion.Panel>{faq.a}</Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Container>
      </Box>

      {/* CTA */}
      <Box
        style={{
          background: `linear-gradient(135deg, rgba(120, 64, 246, 0.2), rgba(79, 70, 229, 0.1))`,
          borderTop: `1px solid ${colors.border}`,
        }}
        py={80}
      >
        <Container size="sm">
          <Stack align="center" gap="xl">
            <Title order={2} ta="center" c="white">
              Готовы начать?
            </Title>
            <Text c="dimmed" ta="center" size="lg">
              Подключитесь за 2 минуты через Telegram
            </Text>
            <Button
              component={Link}
              href="/login"
              size="xl"
              leftSection={<IconArrowRight size={20} />}
            >
              Войти и подключиться
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        style={{
          borderTop: `1px solid ${colors.border}`,
          padding: "32px 0",
          background: colors.bg,
        }}
      >
        <Container size="lg">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <IconShield size={20} color={colors.primary} />
              <Text c="dimmed" size="sm">
                © 2026 CRS VPN. Все права защищены.
              </Text>
            </Group>
            <Group gap="lg">
              <Text component={Link} href="/#plans" size="sm" c="dimmed" style={{ textDecoration: "none" }}>
                Тарифы
              </Text>
              <Text component={Link} href="/#faq" size="sm" c="dimmed" style={{ textDecoration: "none" }}>
                FAQ
              </Text>
            </Group>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
