import { renderHook, act } from '@testing-library/react'
import { useKeyboardShortcuts } from '../use-keyboard-shortcuts'

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
})

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    // Clear all event listeners before each test
    document.removeEventListener = jest.fn()
    document.addEventListener = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useKeyboardShortcuts())

    expect(result.current.shortcuts).toEqual([])
    expect(result.current.conflicts).toEqual([])
    expect(result.current.enabled).toBe(true)
    expect(result.current.customKeys).toEqual({})
  })

  it('should initialize with custom config', () => {
    const config = {
      enabled: false,
      custom_shortcuts: { test: 'Ctrl+X' }
    }

    const { result } = renderHook(() => useKeyboardShortcuts(config))

    expect(result.current.enabled).toBe(false)
    expect(result.current.customKeys).toEqual({ test: 'Ctrl+X' })
  })

  it('should register a shortcut', () => {
    const { result } = renderHook(() => useKeyboardShortcuts())
    const mockHandler = jest.fn()

    act(() => {
      result.current.registerShortcut({
        id: 'test_shortcut',
        description: 'Test shortcut',
        category: 'general',
        defaultKey: 'Ctrl+T',
        handler: mockHandler,
        preventDefault: true,
      })
    })

    expect(result.current.shortcuts).toHaveLength(1)
    expect(result.current.shortcuts[0]).toMatchObject({
      id: 'test_shortcut',
      description: 'Test shortcut',
      category: 'general',
      defaultKey: 'Ctrl+T',
      preventDefault: true,
    })
  })

  it('should unregister a shortcut', () => {
    const { result } = renderHook(() => useKeyboardShortcuts())
    const mockHandler = jest.fn()

    act(() => {
      result.current.registerShortcut({
        id: 'test_shortcut',
        description: 'Test shortcut',
        category: 'general',
        defaultKey: 'Ctrl+T',
        handler: mockHandler,
      })
    })

    expect(result.current.shortcuts).toHaveLength(1)

    act(() => {
      result.current.unregisterShortcut('test_shortcut')
    })

    expect(result.current.shortcuts).toHaveLength(0)
  })

  it('should detect conflicts between shortcuts', () => {
    const { result } = renderHook(() => useKeyboardShortcuts())
    const mockHandler1 = jest.fn()
    const mockHandler2 = jest.fn()

    act(() => {
      result.current.registerShortcut({
        id: 'shortcut1',
        description: 'First shortcut',
        category: 'general',
        defaultKey: 'Ctrl+T',
        handler: mockHandler1,
      })
    })

    act(() => {
      result.current.registerShortcut({
        id: 'shortcut2',
        description: 'Second shortcut',
        category: 'general',
        defaultKey: 'Ctrl+T',
        handler: mockHandler2,
      })
    })

    expect(result.current.conflicts).toHaveLength(1)
    expect(result.current.conflicts[0].key).toBe('Ctrl+T')
    expect(result.current.conflicts[0].conflictingActions).toHaveLength(2)
  })

  it('should update shortcut key', () => {
    const { result } = renderHook(() => useKeyboardShortcuts())
    const mockHandler = jest.fn()

    act(() => {
      result.current.registerShortcut({
        id: 'test_shortcut',
        description: 'Test shortcut',
        category: 'general',
        defaultKey: 'Ctrl+T',
        handler: mockHandler,
      })
    })

    act(() => {
      result.current.updateShortcutKey('test_shortcut', 'Ctrl+Shift+T')
    })

    expect(result.current.shortcuts[0].defaultKey).toBe('Ctrl+Shift+T')
    expect(result.current.customKeys).toEqual({ test_shortcut: 'Ctrl+Shift+T' })
  })

  it('should enable/disable shortcuts', () => {
    const { result } = renderHook(() => useKeyboardShortcuts())

    expect(result.current.enabled).toBe(true)

    act(() => {
      result.current.setEnabled(false)
    })

    expect(result.current.enabled).toBe(false)

    act(() => {
      result.current.setEnabled(true)
    })

    expect(result.current.enabled).toBe(true)
  })

  it('should set up event listener when enabled', () => {
    const { result } = renderHook(() => useKeyboardShortcuts())

    expect(document.addEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      { capture: true }
    )
  })

  it('should not set up event listener when disabled', () => {
    const { result } = renderHook(() => useKeyboardShortcuts({ enabled: false }))

    expect(document.addEventListener).not.toHaveBeenCalled()
  })

  it('should handle keyboard events correctly', () => {
    const { result } = renderHook(() => useKeyboardShortcuts())
    const mockHandler = jest.fn()

    act(() => {
      result.current.registerShortcut({
        id: 'test_shortcut',
        description: 'Test shortcut',
        category: 'general',
        defaultKey: 'Ctrl+T',
        handler: mockHandler,
        preventDefault: true,
      })
    })

    // Get the event handler that was registered
    const eventHandler = (document.addEventListener as jest.Mock).mock.calls[0][1]

    // Create a mock keyboard event
    const mockEvent = {
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      key: 't',
      target: document.body,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    }

    // Trigger the event
    act(() => {
      eventHandler(mockEvent)
    })

    expect(mockHandler).toHaveBeenCalled()
    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockEvent.stopPropagation).toHaveBeenCalled()
  })

  it('should ignore events when typing in input fields', () => {
    const { result } = renderHook(() => useKeyboardShortcuts())
    const mockHandler = jest.fn()

    act(() => {
      result.current.registerShortcut({
        id: 'test_shortcut',
        description: 'Test shortcut',
        category: 'general',
        defaultKey: 'Ctrl+T',
        handler: mockHandler,
      })
    })

    const eventHandler = (document.addEventListener as jest.Mock).mock.calls[0][1]

    // Create mock events for different input types
    const inputEvent = {
      ctrlKey: true,
      key: 't',
      target: { tagName: 'INPUT' },
    }

    const textareaEvent = {
      ctrlKey: true,
      key: 't',
      target: { tagName: 'TEXTAREA' },
    }

    const editableEvent = {
      ctrlKey: true,
      key: 't',
      target: { contentEditable: 'true' },
    }

    act(() => {
      eventHandler(inputEvent)
      eventHandler(textareaEvent)
      eventHandler(editableEvent)
    })

    expect(mockHandler).not.toHaveBeenCalled()
  })
})
