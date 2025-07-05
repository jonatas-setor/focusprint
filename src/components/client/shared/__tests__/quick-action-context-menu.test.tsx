import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuickActionContextMenu, { 
  ContextAction, 
  ContextActionGroup, 
  PROJECT_ACTIONS, 
  TASK_ACTIONS, 
  CHAT_MESSAGE_ACTIONS 
} from '../quick-action-context-menu'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  Copy: () => <div data-testid="copy-icon">Copy</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  Archive: () => <div data-testid="archive-icon">Archive</div>,
  Star: () => <div data-testid="star-icon">Star</div>,
  Share: () => <div data-testid="share-icon">Share</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  MessageSquare: () => <div data-testid="message-icon">Message</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  FolderOpen: () => <div data-testid="folder-icon">Folder</div>,
  Hash: () => <div data-testid="hash-icon">Hash</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Flag: () => <div data-testid="flag-icon">Flag</div>,
  MoreHorizontal: () => <div data-testid="more-icon">More</div>,
}))

const mockActions: ContextActionGroup[] = [
  {
    label: 'Basic Actions',
    actions: [
      {
        id: 'edit',
        label: 'Edit Item',
        icon: <div data-testid="edit-icon">Edit</div>,
        shortcut: 'Ctrl+E',
        handler: jest.fn(),
      },
      {
        id: 'copy',
        label: 'Copy Item',
        icon: <div data-testid="copy-icon">Copy</div>,
        shortcut: 'Ctrl+C',
        handler: jest.fn(),
      },
    ],
  },
  {
    actions: [
      {
        id: 'delete',
        label: 'Delete Item',
        icon: <div data-testid="trash-icon">Trash</div>,
        variant: 'destructive',
        handler: jest.fn(),
      },
    ],
  },
]

describe('QuickActionContextMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render children when not disabled', () => {
    render(
      <QuickActionContextMenu actions={mockActions}>
        <div data-testid="trigger">Right click me</div>
      </QuickActionContextMenu>
    )
    
    expect(screen.getByTestId('trigger')).toBeInTheDocument()
  })

  it('should render children without context menu when disabled', () => {
    render(
      <QuickActionContextMenu actions={mockActions} disabled>
        <div data-testid="trigger">Right click me</div>
      </QuickActionContextMenu>
    )
    
    expect(screen.getByTestId('trigger')).toBeInTheDocument()
    
    // Right click should not show context menu
    fireEvent.contextMenu(screen.getByTestId('trigger'))
    expect(screen.queryByText('Edit Item')).not.toBeInTheDocument()
  })

  it('should render children without context menu when no actions provided', () => {
    render(
      <QuickActionContextMenu actions={[]}>
        <div data-testid="trigger">Right click me</div>
      </QuickActionContextMenu>
    )
    
    expect(screen.getByTestId('trigger')).toBeInTheDocument()
    
    // Right click should not show context menu
    fireEvent.contextMenu(screen.getByTestId('trigger'))
    expect(screen.queryByText('Edit Item')).not.toBeInTheDocument()
  })

  it('should show context menu on right click', async () => {
    render(
      <QuickActionContextMenu actions={mockActions}>
        <div data-testid="trigger">Right click me</div>
      </QuickActionContextMenu>
    )
    
    fireEvent.contextMenu(screen.getByTestId('trigger'))
    
    await waitFor(() => {
      expect(screen.getByText('Edit Item')).toBeInTheDocument()
      expect(screen.getByText('Copy Item')).toBeInTheDocument()
      expect(screen.getByText('Delete Item')).toBeInTheDocument()
    })
  })

  it('should display group labels', async () => {
    render(
      <QuickActionContextMenu actions={mockActions}>
        <div data-testid="trigger">Right click me</div>
      </QuickActionContextMenu>
    )
    
    fireEvent.contextMenu(screen.getByTestId('trigger'))
    
    await waitFor(() => {
      expect(screen.getByText('Basic Actions')).toBeInTheDocument()
    })
  })

  it('should display keyboard shortcuts', async () => {
    render(
      <QuickActionContextMenu actions={mockActions}>
        <div data-testid="trigger">Right click me</div>
      </QuickActionContextMenu>
    )
    
    fireEvent.contextMenu(screen.getByTestId('trigger'))
    
    await waitFor(() => {
      expect(screen.getByText('Ctrl+E')).toBeInTheDocument()
      expect(screen.getByText('Ctrl+C')).toBeInTheDocument()
    })
  })

  it('should execute action handler when clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <QuickActionContextMenu actions={mockActions}>
        <div data-testid="trigger">Right click me</div>
      </QuickActionContextMenu>
    )
    
    fireEvent.contextMenu(screen.getByTestId('trigger'))
    
    await waitFor(() => {
      expect(screen.getByText('Edit Item')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('Edit Item'))
    
    expect(mockActions[0].actions[0].handler).toHaveBeenCalled()
  })

  it('should handle disabled actions', async () => {
    const disabledActions: ContextActionGroup[] = [
      {
        actions: [
          {
            id: 'disabled_action',
            label: 'Disabled Action',
            handler: jest.fn(),
            disabled: true,
          },
        ],
      },
    ]
    
    render(
      <QuickActionContextMenu actions={disabledActions}>
        <div data-testid="trigger">Right click me</div>
      </QuickActionContextMenu>
    )
    
    fireEvent.contextMenu(screen.getByTestId('trigger'))
    
    await waitFor(() => {
      const disabledItem = screen.getByText('Disabled Action')
      expect(disabledItem).toBeInTheDocument()
      // The disabled state would be handled by the underlying ContextMenuItem component
    })
  })

  it('should display icons for actions', async () => {
    render(
      <QuickActionContextMenu actions={mockActions}>
        <div data-testid="trigger">Right click me</div>
      </QuickActionContextMenu>
    )
    
    fireEvent.contextMenu(screen.getByTestId('trigger'))
    
    await waitFor(() => {
      expect(screen.getByTestId('edit-icon')).toBeInTheDocument()
      expect(screen.getByTestId('copy-icon')).toBeInTheDocument()
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument()
    })
  })

  it('should handle actions without shortcuts', async () => {
    const actionsWithoutShortcuts: ContextActionGroup[] = [
      {
        actions: [
          {
            id: 'no_shortcut',
            label: 'No Shortcut Action',
            handler: jest.fn(),
          },
        ],
      },
    ]
    
    render(
      <QuickActionContextMenu actions={actionsWithoutShortcuts}>
        <div data-testid="trigger">Right click me</div>
      </QuickActionContextMenu>
    )
    
    fireEvent.contextMenu(screen.getByTestId('trigger'))
    
    await waitFor(() => {
      expect(screen.getByText('No Shortcut Action')).toBeInTheDocument()
      // Should not display any shortcut text
      expect(screen.queryByText('Ctrl+')).not.toBeInTheDocument()
    })
  })

  it('should handle actions without icons', async () => {
    const actionsWithoutIcons: ContextActionGroup[] = [
      {
        actions: [
          {
            id: 'no_icon',
            label: 'No Icon Action',
            handler: jest.fn(),
          },
        ],
      },
    ]
    
    render(
      <QuickActionContextMenu actions={actionsWithoutIcons}>
        <div data-testid="trigger">Right click me</div>
      </QuickActionContextMenu>
    )
    
    fireEvent.contextMenu(screen.getByTestId('trigger'))
    
    await waitFor(() => {
      expect(screen.getByText('No Icon Action')).toBeInTheDocument()
    })
  })

  describe('Predefined action templates', () => {
    it('should have PROJECT_ACTIONS template', () => {
      expect(PROJECT_ACTIONS).toBeDefined()
      expect(PROJECT_ACTIONS.length).toBeGreaterThan(0)
      expect(PROJECT_ACTIONS[0].actions[0].id).toBe('open_project')
    })

    it('should have TASK_ACTIONS template', () => {
      expect(TASK_ACTIONS).toBeDefined()
      expect(TASK_ACTIONS.length).toBeGreaterThan(0)
      expect(TASK_ACTIONS[0].actions[0].id).toBe('open_task')
    })

    it('should have CHAT_MESSAGE_ACTIONS template', () => {
      expect(CHAT_MESSAGE_ACTIONS).toBeDefined()
      expect(CHAT_MESSAGE_ACTIONS.length).toBeGreaterThan(0)
      expect(CHAT_MESSAGE_ACTIONS[0].actions[0].id).toBe('reply_message')
    })

    it('should render PROJECT_ACTIONS template correctly', async () => {
      render(
        <QuickActionContextMenu actions={PROJECT_ACTIONS}>
          <div data-testid="trigger">Project item</div>
        </QuickActionContextMenu>
      )
      
      fireEvent.contextMenu(screen.getByTestId('trigger'))
      
      await waitFor(() => {
        expect(screen.getByText('Abrir Projeto')).toBeInTheDocument()
        expect(screen.getByText('Editar Projeto')).toBeInTheDocument()
        expect(screen.getByText('Clonar Projeto')).toBeInTheDocument()
        expect(screen.getByText('Excluir')).toBeInTheDocument()
      })
    })

    it('should render TASK_ACTIONS template correctly', async () => {
      render(
        <QuickActionContextMenu actions={TASK_ACTIONS}>
          <div data-testid="trigger">Task item</div>
        </QuickActionContextMenu>
      )
      
      fireEvent.contextMenu(screen.getByTestId('trigger'))
      
      await waitFor(() => {
        expect(screen.getByText('Abrir Tarefa')).toBeInTheDocument()
        expect(screen.getByText('Editar Tarefa')).toBeInTheDocument()
        expect(screen.getByText('Alta Prioridade')).toBeInTheDocument()
        expect(screen.getByText('Duplicar')).toBeInTheDocument()
      })
    })

    it('should render CHAT_MESSAGE_ACTIONS template correctly', async () => {
      render(
        <QuickActionContextMenu actions={CHAT_MESSAGE_ACTIONS}>
          <div data-testid="trigger">Chat message</div>
        </QuickActionContextMenu>
      )
      
      fireEvent.contextMenu(screen.getByTestId('trigger'))
      
      await waitFor(() => {
        expect(screen.getByText('Responder')).toBeInTheDocument()
        expect(screen.getByText('Copiar Texto')).toBeInTheDocument()
        expect(screen.getByText('Editar')).toBeInTheDocument()
      })
    })
  })
})
