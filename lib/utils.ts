import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type PageProps = {
  params: Promise<Record<string, string | string[] | undefined>>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}
