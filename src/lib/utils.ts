import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility functions para FocuSprint
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR').format(dateObj)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// CNPJ validation and formatting utilities
export function formatCNPJ(cnpj: string): string {
  // Remove all non-numeric characters
  const numbers = cnpj.replace(/\D/g, '')

  // Apply CNPJ mask: XX.XXX.XXX/XXXX-XX
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`
}

export function validateCNPJ(cnpj: string): boolean {
  // Remove all non-numeric characters
  const numbers = cnpj.replace(/\D/g, '')

  // CNPJ must have exactly 14 digits
  if (numbers.length !== 14) return false

  // Check for invalid sequences (all same digits)
  if (/^(\d)\1{13}$/.test(numbers)) return false

  // Validate first check digit
  let sum = 0
  let weight = 5
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weight
    weight = weight === 2 ? 9 : weight - 1
  }
  const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (parseInt(numbers[12]) !== firstDigit) return false

  // Validate second check digit
  sum = 0
  weight = 6
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weight
    weight = weight === 2 ? 9 : weight - 1
  }
  const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (parseInt(numbers[13]) !== secondDigit) return false

  return true
}

export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

// Phone number validation and formatting utilities
export function formatPhone(phone: string): string {
  // Remove all non-numeric characters
  const numbers = phone.replace(/\D/g, '')

  // Brazilian phone format: +55 (XX) XXXXX-XXXX or +55 (XX) XXXX-XXXX
  if (numbers.length === 0) return ''
  if (numbers.length <= 2) return `+${numbers}`
  if (numbers.length <= 4) return `+${numbers.slice(0, 2)} (${numbers.slice(2)}`
  if (numbers.length <= 9) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4)}`
  if (numbers.length <= 10) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 8)}-${numbers.slice(8)}`
  return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`
}

export function validatePhone(phone: string): boolean {
  // Remove all non-numeric characters
  const numbers = phone.replace(/\D/g, '')

  // Brazilian phone validation
  if (numbers.startsWith('55')) {
    // Brazilian format: +55 (XX) XXXXX-XXXX (mobile) or +55 (XX) XXXX-XXXX (landline)
    return numbers.length === 13 || numbers.length === 12
  }

  // International format: minimum 7 digits, maximum 15 digits
  return numbers.length >= 7 && numbers.length <= 15
}

export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

// Plan limits conforme PRD
export const PLAN_LIMITS = {
  free: {
    users: 5,
    projects: 3,
    price: 0
  },
  pro: {
    users: 15,
    projects: 10,
    price: 97
  },
  business: {
    users: 50,
    projects: 50,
    price: 399
  }
} as const

export type PlanType = keyof typeof PLAN_LIMITS
