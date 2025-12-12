export const measureTime = <T extends (...args: any[]) => any>(
  fn: T,
  name: string = fn.name || 'anonymous func',
): ((...args: Parameters<T>) => ReturnType<T>) => {
  return (...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now()
    const result = fn(...args)
    const end = performance.now()
    console.log(`[Performance] ${name} elapsed: ${end - start}ms`)
    return result
  }
}
