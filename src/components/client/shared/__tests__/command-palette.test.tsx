import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommandPalette, { CommandAction } from '../command-palette'

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}))

const mockActions: CommandAction[] = [
  {
    id: 'action1',
    title: 'Create New Task',
    description: 'Add a new task to the project',
    category: 'tasks',
    icon: 'Plus',
    shortcut: 'Ctrl+T',
    handler: jest.fn(),
    keywords: ['new', 'task', 'create'],
  },
  {
    id: 'action2',
    title: 'Open Settings',
    description: 'Configure application settings',
    category: 'general',
    icon: 'Settings',
    shortcut: 'Ctrl+,',
    handler: jest.fn(),
    keywords: ['settings', 'config', 'preferences'],
  },
  {
    id: 'action3',
    title: 'Search Projects',
    description: 'Find specific projects',
    category: 'projects',
    icon: 'Search',
    handler: jest.fn(),
    keywords: ['search', 'find', 'projects'],
  },
]

describe('CommandPalette', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    actions: mockActions,
    placeholder: 'Type a command...',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render when open', () => {
    render(<CommandPalette {...defaultProps} />)
    
    expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument()
    expect(screen.getByText('Create New Task')).toBeInTheDocument()
    expect(screen.getByText('Open Settings')).toBeInTheDocument()
    expect(screen.getByText('Search Projects')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<CommandPalette {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByPlaceholderText('Type a command...')).not.toBeInTheDocument()
  })

  it('should filter actions based on search query', async () => {
    const user = userEvent.setup()
    render(<CommandPalette {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Type a command...')
    
    await user.type(searchInput, 'task')
    
    expect(screen.getByText('Create New Task')).toBeInTheDocument()
    expect(screen.queryByText('Open Settings')).not.toBeInTheDocument()
    expect(screen.queryByText('Search Projects')).not.toBeInTheDocument()
  })

  it('should filter actions based on keywords', async () => {
    const user = userEvent.setup()
    render(<CommandPalette {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Type a command...')
    
    await user.type(searchInput, 'config')
    
    expect(screen.queryByText('Create New Task')).not.toBeInTheDocument()
    expect(screen.getByText('Open Settings')).toBeInTheDocument()
    expect(screen.queryByText('Search Projects')).not.toBeInTheDocument()
  })

  it('should show all actions when search is empty', async () => {
    const user = userEvent.setup()
    render(<CommandPalette {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Type a command...')
    
    await user.type(searchInput, 'test')
    await user.clear(searchInput)
    
    expect(screen.getByText('Create New Task')).toBeInTheDocument()
    expect(screen.getByText('Open Settings')).toBeInTheDocument()
    expect(screen.getByText('Search Projects')).toBeInTheDocument()
  })

  it('should execute action when clicked', async () => {
    const user = userEvent.setup()
    render(<CommandPalette {...defaultProps} />)
    
    const action = screen.getByText('Create New Task')
    await user.click(action)
    
    expect(mockActions[0].handler).toHaveBeenCalled()
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('should execute action when Enter is pressed', async () => {
    const user = userEvent.setup()
    render(<CommandPalette {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Type a command...')
    
    await user.type(searchInput, '{Enter}')
    
    expect(mockActions[0].handler).toHaveBeenCalled()
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('should navigate with arrow keys', async () => {
    const user = userEvent.setup()
    render(<CommandPalette {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Type a command...')
    
    // Navigate down
    await user.type(searchInput, '{ArrowDown}')
    await user.type(searchInput, '{Enter}')
    
    expect(mockActions[1].handler).toHaveBeenCalled()
  })

  it('should navigate up with arrow keys', async () => {
    const user = userEvent.setup()
    render(<CommandPalette {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Type a command...')
    
    // Navigate down twice, then up once
    await user.type(searchInput, '{ArrowDown}{ArrowDown}{ArrowUp}')
    await user.type(searchInput, '{Enter}')
    
    expect(mockActions[1].handler).toHaveBeenCalled()
  })

  it('should close when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<CommandPalette {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Type a command...')
    
    await user.type(searchInput, '{Escape}')
    
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('should display shortcuts for actions', () => {
    render(<CommandPalette {...defaultProps} />)
    
    expect(screen.getByText('Ctrl+T')).toBeInTheDocument()
    expect(screen.getByText('Ctrl+,')).toBeInTheDocument()
  })

  it('should group actions by category', () => {
    render(<CommandPalette {...defaultProps} />)
    
    // Check that actions are grouped (this depends on the implementation)
    // The exact test would depend on how categories are displayed
    expect(screen.getByText('Create New Task')).toBeInTheDocument()
    expect(screen.getByText('Open Settings')).toBeInTheDocument()
    expect(screen.getByText('Search Projects')).toBeInTheDocument()
  })

  it('should handle empty search results', async () => {
    const user = userEvent.setup()
    render(<CommandPalette {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Type a command...')
    
    await user.type(searchInput, 'nonexistent')
    
    expect(screen.queryByText('Create New Task')).not.toBeInTheDocument()
    expect(screen.queryByText('Open Settings')).not.toBeInTheDocument()
    expect(screen.queryByText('Search Projects')).not.toBeInTheDocument()
  })

  it('should reset search and selection when opened', () => {
    const { rerender } = render(<CommandPalette {...defaultProps} isOpen={false} />)
    
    rerender(<CommandPalette {...defaultProps} isOpen={true} />)
    
    const searchInput = screen.getByPlaceholderText('Type a command...')
    expect(searchInput).toHaveValue('')
  })

  it('should handle keyboard navigation at boundaries', async () => {
    const user = userEvent.setup()
    render(<CommandPalette {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Type a command...')
    
    // Try to navigate up from first item (should wrap to last)
    await user.type(searchInput, '{ArrowUp}')
    await user.type(searchInput, '{Enter}')
    
    expect(mockActions[2].handler).toHaveBeenCalled()
  })

  it('should handle keyboard navigation with filtered results', async () => {
    const user = userEvent.setup()
    render(<CommandPalette {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Type a command...')
    
    // Filter to show only one result
    await user.type(searchInput, 'settings')
    await user.type(searchInput, '{Enter}')
    
    expect(mockActions[1].handler).toHaveBeenCalled()
  })
})
