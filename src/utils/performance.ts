export const measureTime = <T extends (...args: any[]) => any>(
  fn: T,
  name: string = fn.name,
): ((...args: Parameters<T>) => ReturnType<T>) => {
  return (...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now()
    const result = fn(...args)
    const end = performance.now()
    console.log(`[Performance] ${name} took ${end - start}ms`)
    return result
  }
}
