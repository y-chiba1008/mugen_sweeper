import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSS クラス名を安全に結合するユーティリティ関数
 * - `clsx` で条件付きクラスを構築し
 * - `twMerge` で Tailwind のクラス競合をマージする
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
