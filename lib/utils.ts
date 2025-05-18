import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export type PageArgs = {
  params: Promise<Record<string, string>>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
