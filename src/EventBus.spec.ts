import { describe, it, expect, jest } from 'jest'
import { createEventBus } from './EventBus'

interface TestEvents {
  greet: (message: string) => void
  count: (n: number) => void
  multi: (a: string, b: number) => void
}

describe('createEventBus', () => {
  describe('return value', () => {
    it('returns an object with on, off, and emit methods', () => {
      const bus = createEventBus<TestEvents>()
      expect(typeof bus.on).toBe('function')
      expect(typeof bus.off).toBe('function')
      expect(typeof bus.emit).toBe('function')
    })
  })

  describe('on()', () => {
    it('subscribes a handler that is invoked when the event is emitted', () => {
      const bus = createEventBus<TestEvents>()
      const handler = jest.fn()
      bus.on('greet', handler)
      bus.emit('greet', 'hello')
      expect(handler).toHaveBeenCalledOnce()
      expect(handler).toHaveBeenCalledWith('hello')
    })

    it('allows multiple handlers on the same event', () => {
      const bus = createEventBus<TestEvents>()
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      bus.on('greet', handler1)
      bus.on('greet', handler2)
      bus.emit('greet', 'hello')
      expect(handler1).toHaveBeenCalledOnce()
      expect(handler2).toHaveBeenCalledOnce()
    })

    it('returns an unsubscribe function', () => {
      const bus = createEventBus<TestEvents>()
      const unsubscribe = bus.on('greet', jest.fn())
      expect(typeof unsubscribe).toBe('function')
    })

    it('calling the returned unsubscribe function removes the handler', () => {
      const bus = createEventBus<TestEvents>()
      const handler = jest.fn()
      const unsubscribe = bus.on('greet', handler)
      unsubscribe()
      bus.emit('greet', 'hello')
      expect(handler).not.toHaveBeenCalled()
    })

    it('calls config.onSubscribe with the event key and handler', () => {
      const onSubscribe = jest.fn()
      const bus = createEventBus<TestEvents>({ onSubscribe })
      const handler = jest.fn()
      bus.on('greet', handler)
      expect(onSubscribe).toHaveBeenCalledOnce()
      expect(onSubscribe).toHaveBeenCalledWith('greet', handler)
    })

    it('does not throw when no config is provided', () => {
      const bus = createEventBus<TestEvents>()
      expect(() => bus.on('greet', jest.fn())).not.toThrow()
    })

    it('does not throw when config.onSubscribe is not provided', () => {
      const bus = createEventBus<TestEvents>({})
      expect(() => bus.on('greet', jest.fn())).not.toThrow()
    })
  })

  describe('off()', () => {
    it('removes a specific handler so it is no longer invoked on emit', () => {
      const bus = createEventBus<TestEvents>()
      const handler = jest.fn()
      bus.on('greet', handler)
      bus.off('greet', handler)
      bus.emit('greet', 'hello')
      expect(handler).not.toHaveBeenCalled()
    })

    it('only removes the specified handler, leaving others intact', () => {
      const bus = createEventBus<TestEvents>()
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      bus.on('greet', handler1)
      bus.on('greet', handler2)
      bus.off('greet', handler1)
      bus.emit('greet', 'hello')
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledOnce()
    })

    it('does nothing when called for an event that has no registered handlers', () => {
      const onUnsubscribe = jest.fn()
      const bus = createEventBus<TestEvents>({ onUnsubscribe })
      expect(() => bus.off('greet', jest.fn())).not.toThrow()
      expect(onUnsubscribe).not.toHaveBeenCalled()
    })

    it('calls config.onUnsubscribe with the event key and handler', () => {
      const onUnsubscribe = jest.fn()
      const bus = createEventBus<TestEvents>({ onUnsubscribe })
      const handler = jest.fn()
      bus.on('greet', handler)
      bus.off('greet', handler)
      expect(onUnsubscribe).toHaveBeenCalledOnce()
      expect(onUnsubscribe).toHaveBeenCalledWith('greet', handler)
    })

    it('does not call config.onUnsubscribe when the event key has no handlers', () => {
      const onUnsubscribe = jest.fn()
      const bus = createEventBus<TestEvents>({ onUnsubscribe })
      bus.off('greet', jest.fn())
      expect(onUnsubscribe).not.toHaveBeenCalled()
    })

    it('does not throw when config.onUnsubscribe is not provided', () => {
      const bus = createEventBus<TestEvents>({})
      const handler = jest.fn()
      bus.on('greet', handler)
      expect(() => bus.off('greet', handler)).not.toThrow()
    })
  })

  describe('emit()', () => {
    it('invokes all handlers registered for the event with the payload', () => {
      const bus = createEventBus<TestEvents>()
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      bus.on('count', handler1)
      bus.on('count', handler2)
      bus.emit('count', 42)
      expect(handler1).toHaveBeenCalledWith(42)
      expect(handler2).toHaveBeenCalledWith(42)
    })

    it('passes all arguments to handlers for multi-argument events', () => {
      const bus = createEventBus<TestEvents>()
      const handler = jest.fn()
      bus.on('multi', handler)
      bus.emit('multi', 'text', 99)
      expect(handler).toHaveBeenCalledWith('text', 99)
    })

    it('does nothing when there are no handlers for the event', () => {
      const bus = createEventBus<TestEvents>()
      expect(() => bus.emit('greet', 'hello')).not.toThrow()
    })

    it('calls config.onEmit after each successful handler invocation', () => {
      const onEmit = jest.fn()
      const bus = createEventBus<TestEvents>({ onEmit })
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      bus.on('greet', handler1)
      bus.on('greet', handler2)
      bus.emit('greet', 'hello')
      expect(onEmit).toHaveBeenCalledTimes(2)
      expect(onEmit).toHaveBeenCalledWith('greet', handler1, 'hello')
      expect(onEmit).toHaveBeenCalledWith('greet', handler2, 'hello')
    })

    it('does not call config.onEmit when there are no handlers', () => {
      const onEmit = jest.fn()
      const bus = createEventBus<TestEvents>({ onEmit })
      bus.emit('greet', 'hello')
      expect(onEmit).not.toHaveBeenCalled()
    })

    it('does not call config.onEmit when a handler throws', () => {
      const onEmit = jest.fn()
      const bus = createEventBus<TestEvents>({ onEmit })
      bus.on('greet', () => {
        throw new Error('fail')
      })
      bus.emit('greet', 'hello')
      expect(onEmit).not.toHaveBeenCalled()
    })

    it('calls config.onError with the error, event key, and payload when a handler throws', () => {
      const onError = jest.fn()
      const error = new Error('handler error')
      const bus = createEventBus<TestEvents>({ onError })
      bus.on('greet', () => {
        throw error
      })
      bus.emit('greet', 'hello')
      expect(onError).toHaveBeenCalledOnce()
      expect(onError).toHaveBeenCalledWith(error, 'greet', 'hello')
    })

    it('continues invoking remaining handlers after one throws', () => {
      const bus = createEventBus<TestEvents>()
      const handler1 = jest.fn(() => {
        throw new Error('fail')
      })
      const handler2 = jest.fn()
      bus.on('greet', handler1)
      bus.on('greet', handler2)
      bus.emit('greet', 'hello')
      expect(handler1).toHaveBeenCalledOnce()
      expect(handler2).toHaveBeenCalledOnce()
    })

    it('does not throw when a handler throws and no config.onError is provided', () => {
      const bus = createEventBus<TestEvents>()
      bus.on('greet', () => {
        throw new Error('fail')
      })
      expect(() => bus.emit('greet', 'hello')).not.toThrow()
    })

    it('does not throw when config.onEmit is not provided', () => {
      const bus = createEventBus<TestEvents>({})
      bus.on('greet', jest.fn())
      expect(() => bus.emit('greet', 'hello')).not.toThrow()
    })
  })

  describe('unsubscribe function', () => {
    it('only removes the handler it was created for, not other handlers', () => {
      const bus = createEventBus<TestEvents>()
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      const unsubscribe1 = bus.on('greet', handler1)
      bus.on('greet', handler2)
      unsubscribe1()
      bus.emit('greet', 'hello')
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledOnce()
    })

    it('is safe to call more than once', () => {
      const bus = createEventBus<TestEvents>()
      const handler = jest.fn()
      const unsubscribe = bus.on('greet', handler)
      unsubscribe()
      expect(() => unsubscribe()).not.toThrow()
    })

    it('handler is not invoked after calling unsubscribe', () => {
      const bus = createEventBus<TestEvents>()
      const handler = jest.fn()
      const unsubscribe = bus.on('greet', handler)
      bus.emit('greet', 'first')
      unsubscribe()
      bus.emit('greet', 'second')
      expect(handler).toHaveBeenCalledOnce()
      expect(handler).toHaveBeenCalledWith('first')
    })
  })

  describe('event isolation', () => {
    it('handlers for different events do not interfere with each other', () => {
      const bus = createEventBus<TestEvents>()
      const greetHandler = jest.fn()
      const countHandler = jest.fn()
      bus.on('greet', greetHandler)
      bus.on('count', countHandler)
      bus.emit('greet', 'hello')
      expect(greetHandler).toHaveBeenCalledOnce()
      expect(countHandler).not.toHaveBeenCalled()
      bus.emit('count', 7)
      expect(countHandler).toHaveBeenCalledOnce()
      expect(greetHandler).toHaveBeenCalledOnce()
    })

    it('unsubscribing from one event does not affect handlers on other events', () => {
      const bus = createEventBus<TestEvents>()
      const greetHandler = jest.fn()
      const countHandler = jest.fn()
      const unsubscribe = bus.on('greet', greetHandler)
      bus.on('count', countHandler)
      unsubscribe()
      bus.emit('count', 1)
      expect(countHandler).toHaveBeenCalledOnce()
    })
  })

  describe('symbol and number event keys', () => {
    it('supports symbol event keys', () => {
      const key = Symbol('test')
      interface SymbolEvents {
        [key: symbol]: (v: string) => void
      }
      const bus = createEventBus<{ [k: typeof key]: (v: string) => void }>()
      const handler = jest.fn()
      bus.on(key, handler)
      bus.emit(key, 'value')
      expect(handler).toHaveBeenCalledWith('value')
    })

    it('supports number event keys', () => {
      const bus = createEventBus<{ 1: (v: string) => void }>()
      const handler = jest.fn()
      bus.on(1, handler)
      bus.emit(1, 'value')
      expect(handler).toHaveBeenCalledWith('value')
    })
  })
})
