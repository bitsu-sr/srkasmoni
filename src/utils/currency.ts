export const GROUP_CURRENCIES = ['SRD', 'USD', 'EUR'] as const

export type GroupCurrency = (typeof GROUP_CURRENCIES)[number]

export const GROUP_CURRENCY_OPTIONS: { value: GroupCurrency; label: string }[] = [
  { value: 'SRD', label: 'SRD — Surinamese dollar' },
  { value: 'USD', label: 'USD — US dollar' },
  { value: 'EUR', label: 'EUR — Euro' }
]

export function isGroupCurrency(value: string | null | undefined): value is GroupCurrency {
  return value === 'SRD' || value === 'USD' || value === 'EUR'
}

/** Missing or unknown values stay SRD so existing groups keep their current currency. */
export function normalizeGroupCurrency(value: string | null | undefined): GroupCurrency {
  const upper = (value || '').trim().toUpperCase()
  if (upper === 'EURO' || upper === '€') return 'EUR'
  if (upper === '$') return 'USD'
  return isGroupCurrency(upper) ? upper : 'SRD'
}

export function formatGroupAmount(
  amount: number,
  currency?: string | null,
  options?: { locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const code = normalizeGroupCurrency(currency)
  const formatted = Number(amount || 0).toLocaleString(options?.locale, {
    minimumFractionDigits: options?.minimumFractionDigits,
    maximumFractionDigits: options?.maximumFractionDigits
  })
  return `${code} ${formatted}`
}
