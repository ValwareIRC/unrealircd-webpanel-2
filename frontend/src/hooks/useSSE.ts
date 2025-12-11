import { useEffect, useRef, useCallback } from 'react'

interface SSEOptions {
  onMessage?: (event: MessageEvent) => void
  onOpen?: () => void
  onError?: (event: Event) => void
  onClose?: () => void
}

export function useSSE(url: string, options: SSEOptions = {}) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const token = localStorage.getItem('token')
    const fullUrl = `${url}${url.includes('?') ? '&' : '?'}token=${token}`
    
    const eventSource = new EventSource(fullUrl)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      options.onOpen?.()
    }

    eventSource.onmessage = (event) => {
      options.onMessage?.(event)
    }

    eventSource.onerror = (event) => {
      options.onError?.(event)
      
      // Attempt to reconnect after 5 seconds
      if (eventSource.readyState === EventSource.CLOSED) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 5000)
      }
    }
  }, [url, options])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      options.onClose?.()
    }
  }, [options])

  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return { disconnect, reconnect: connect }
}
