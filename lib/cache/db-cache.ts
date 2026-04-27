import type { Message } from '@/lib/types'

interface CacheEntry<T> {
  key: string
  data: T
  timestamp: number
  ttl: number
}

class DBCache {
  private dbName = 'NutriAICache'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        // Create object stores for different data types
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' })
        }
      }
    })
  }

  /**
   * Get cached data with TTL expiration check
   */
  async get<T>(key: string, storeName: string = 'cache'): Promise<T | null> {
    await this.ensureDb()

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const request = store.get(key)

        request.onsuccess = () => {
          const entry = request.result as CacheEntry<T> | undefined
          if (entry) {
            const now = Date.now()
            const isExpired = now - entry.timestamp > entry.ttl
            if (!isExpired) {
              resolve(entry.data)
              return
            }
            // Delete expired entry
            store.delete(key)
          }
          resolve(null)
        }

        request.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }

  /**
   * Set cached data with TTL
   */
  async set<T>(
    key: string,
    data: T,
    ttl: number = 24 * 60 * 60 * 1000, // 24 hours
    storeName: string = 'cache'
  ): Promise<void> {
    await this.ensureDb()

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)

        const entry: CacheEntry<T> = {
          key,
          data,
          timestamp: Date.now(),
          ttl,
        }

        store.put(entry)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => resolve()
      } catch {
        resolve()
      }
    })
  }

  /**
   * Cache conversation messages
   */
  async cacheConversation(conversationId: string, messages: Message[]): Promise<void> {
    await this.set(
      `conversation_${conversationId}`,
      messages,
      7 * 24 * 60 * 60 * 1000, // 7 days
      'messages'
    )
  }

  /**
   * Get cached conversation
   */
  async getConversation(conversationId: string): Promise<Message[] | null> {
    return this.get<Message[]>(`conversation_${conversationId}`, 'messages')
  }

  /**
   * Cache all conversations list
   */
  async cacheConversationsList(userId: string, conversations: any[]): Promise<void> {
    await this.set(
      `conversations_${userId}`,
      conversations,
      60 * 60 * 1000, // 1 hour
      'conversations'
    )
  }

  /**
   * Get cached conversations list
   */
  async getConversationsList(userId: string): Promise<any[] | null> {
    return this.get<any[]>(`conversations_${userId}`, 'conversations')
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    await this.ensureDb()

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(['conversations', 'messages', 'cache'], 'readwrite')
        transaction.objectStore('conversations').clear()
        transaction.objectStore('messages').clear()
        transaction.objectStore('cache').clear()
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => resolve()
      } catch {
        resolve()
      }
    })
  }

  private async ensureDb(): Promise<void> {
    if (!this.db) {
      await this.init()
    }
  }
}

export const dbCache = new DBCache()
