/**
 * Утилиты для отображения данных.
 */

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function formatAmount(amount: number, currency = "RUB"): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function statusColor(status: string): string {
  switch (status) {
    case "succeeded":
    case "active":
      return "green";
    case "pending":
    case "waiting_for_capture":
      return "yellow";
    case "canceled":
    case "failed":
    case "expired":
      return "red";
    default:
      return "gray";
  }
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    succeeded: "Оплачен",
    pending: "Ожидает",
    waiting_for_capture: "Ожидает подтверждения",
    canceled: "Отменён",
    failed: "Ошибка",
    active: "Активна",
    expired: "Истекла",
    none: "Нет подписки",
  };
  return map[status] || status;
}
