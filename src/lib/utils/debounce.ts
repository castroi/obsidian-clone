export interface DebouncedFn<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void
  cancel(): void
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): DebouncedFn<T> {
  let timer: ReturnType<typeof setTimeout> | null = null

  const debounced = (...args: Parameters<T>): void => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, delay)
  }

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  return debounced
}
