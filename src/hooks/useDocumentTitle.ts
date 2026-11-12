import { useEffect } from 'react'

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} · Food Wiki`
    return () => {
      document.title = previous
    }
  }, [title])
}
