/**
 * Represents the key type for events.
 */
export type EventKey = string | symbol | number

/**
 * Defines the shape of an event handler function.
 *
 * @template T - The type of the payload that the handler will receive.
 * @param payload - The data associated with the event.
 */
export type EventHandler<T = unknown> = (payload: T) => void

/**
 * Maps each event key to its corresponding event handler.
 * Intentionally has no index signature so that interfaces extending this type
 * preserve their exact key set — enabling strict key checking on `on`/`emit`.
 */
export type EventMap = Record<never, never>

/**
 * Represents any callable function.
 * Used internally to type event handlers without introducing an index signature
 * on the public EventMap.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Callable = (...args: any) => any

/**
 * Configuration options for the Event Bus.
 */
export type EventBusConfig = {
  /**
   * Callback function invoked when a handler subscribes to an event.
   *
   * @param eventKey - The key of the event being subscribed to.
   * @param handler - The handler function that was registered.
   */
  onSubscribe?: (eventKey: EventKey, handler: Callable) => void

  /**
   * Callback function invoked when a handler unsubscribes from an event.
   *
   * @param eventKey - The key of the event being unsubscribed from.
   * @param handler - The handler function that was removed.
   */
  onUnsubscribe?: (eventKey: EventKey, handler: Callable) => void

  /**
   * Callback function invoked when an event is emitted.
   *
   * @param eventKey - The key of the event that was emitted.
   * @param payload - The payload passed to the event handlers.
   */
  onEmit?: (eventKey: EventKey, payload?: unknown) => void

  /**
   * Callback function invoked when an error occurs within an event handler.
   *
   * @param error - The error that was thrown.
   * @param eventKey - The key of the event during which the error occurred.
   * @param payload - The payload that was being processed when the error occurred.
   */
  onError?: (error: unknown, eventKey?: EventKey, payload?: unknown) => void
}

/**
 * Represents the internal storage structure of the Event Bus.
 * Maps each event key to an array of its associated event handlers.
 *
 * @template E - The EventMap defining all possible events and their handlers.
 */
type Bus<E> = Map<keyof E, Callable[]>

/**
 * Defines the interface for the Event Bus.
 * Provides methods to subscribe, unsubscribe, and emit events.
 *
 * @template T - An object type mapping event keys to their handler functions.
 *   Every value must be callable. Only keys declared on `T` are accepted by
 *   `on`, `off`, and `emit`, enforcing type-safe event usage.
 */
export type EventBus<T extends { [K in keyof T]: Callable }> = {
  /**
   * Subscribes a handler to a specific event.
   *
   * @template Key - The key of the event to subscribe to.
   * @param key - The event key.
   * @param handler - The event handler function.
   * @returns A function to unsubscribe the handler from the event.
   */
  on<Key extends keyof T>(key: Key, handler: T[Key]): () => void

  /**
   * Unsubscribes a handler from a specific event.
   *
   * @template Key - The key of the event to unsubscribe from.
   * @param key - The event key.
   * @param handler - The event handler function to remove.
   */
  off<Key extends keyof T>(key: Key, handler: T[Key]): void

  /**
   * Emits an event, invoking all subscribed handlers with the provided payload.
   *
   * @template Key - The key of the event to emit.
   * @param key - The event key.
   * @param payload - The data to pass to each event handler.
   */
  emit<Key extends keyof T>(key: Key, ...payload: Parameters<T[Key]>): void
}

/**
 * Creates a new Event Bus.
 * Allows subscribing, unsubscribing, and emitting events with type safety.
 *
 * @template E - An object type mapping event keys to their handler functions.
 *   Only keys declared on `E` are accepted by `on`, `off`, and `emit`.
 * @param config - Optional configuration for the Event Bus.
 * @returns An object implementing the EventBus interface.
 *
 * @example
 * ```typescript
 * interface MyEvents {
 *   userLoggedIn: (user: User) => void;
 *   dataFetched: (data: Data) => void;
 * }
 *
 * const eventBus = createEventBus<MyEvents>({
 *   onError: (error, eventKey, payload) => {
 *     console.error(`Error in event ${String(eventKey)}:`, error, payload);
 *   },
 * });
 *
 * const unsubscribe = eventBus.on('userLoggedIn', (user) => {
 *   console.log('User logged in:', user);
 * });
 *
 * eventBus.emit('userLoggedIn', currentUser);
 * unsubscribe();
 * ```
 */
export function createEventBus<E extends { [K in keyof E]: Callable }>(
  config?: EventBusConfig,
): EventBus<E> {
  // Internal storage for event handlers using a Map for efficient lookups.
  const bus: Bus<E> = new Map()

  /**
   * Subscribes a handler to a specific event.
   *
   * @param key - The event key.
   * @param handler - The event handler function.
   * @returns A function to unsubscribe the handler.
   */
  const on: EventBus<E>['on'] = (key, handler) => {
    if (!bus.has(key)) {
      bus.set(key, [])
    }

    bus.get(key)!.push(handler as Callable)

    config?.onSubscribe?.(key, handler)

    // Return an unsubscribe function for convenience.
    return () => {
      off(key, handler)
    }
  }

  /**
   * Unsubscribes a handler from a specific event.
   *
   * @param key - The event key.
   * @param handler - The event handler function to remove.
   */
  const off: EventBus<E>['off'] = (key, handler) => {
    const handlers = bus.get(key)
    if (handlers) {
      // Filter out the handler to be removed.
      bus.set(
        key,
        handlers.filter((h) => h !== handler),
      )

      config?.onUnsubscribe?.(key, handler)
    }
  }

  /**
   * Emits an event, invoking all subscribed handlers with the provided payload.
   *
   * @param key - The event key.
   * @param payload - The data to pass to each event handler.
   */
  const emit: EventBus<E>['emit'] = (key, ...args) => {
    const handlers = bus.get(key)
    if (handlers) {
      config?.onEmit?.(key, args[0])

      handlers.forEach((fn) => {
        try {
          fn(...args)
        } catch (e) {
          // Invoke the onError callback if provided.
          config?.onError?.(e, key, args[0])
        }
      })
    }
  }

  // Expose the EventBus interface.
  return { on, off, emit }
}
