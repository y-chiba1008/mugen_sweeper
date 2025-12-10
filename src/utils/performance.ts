export const measureTime = <T extends (...args: any[]) => any>(
  fn: T,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  name: string = fn.name,
): ((...args: Parameters<T>) => ReturnType<T>) => {
  return (...args: Parameters<T>): ReturnType<T> => {
    const result = fn(...args)
    return result
  }
}
