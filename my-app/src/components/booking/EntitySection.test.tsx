import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EntitySection, { type Child, type Pet, type EntityFormData } from './EntitySection'

const childItems: Child[] = [
  { id: 1, name: 'Mira', age: 6, school_type: 'Full Time' },
  { id: 2, name: 'Sami', age: 9, school_type: 'Part Time' },
]

const petItems: Pet[] = [
  { id: 10, name: 'Rex', age: 3, type: 'Dog', breed: 'Labrador' },
  { id: 11, name: 'Milo', age: null, type: 'Cat' },
]

type Props = React.ComponentProps<typeof EntitySection>

const baseProps = (overrides: Partial<Props> = {}): Props => ({
  sitterType: 'baby',
  childItems,
  petItems,
  selectedEntityIds: [],
  onToggleSelect: vi.fn(),
  isLoadingData: false,
  showAddForm: false,
  onAddClick: vi.fn(),
  onCancelAdd: vi.fn(),
  entityFormData: {} as EntityFormData,
  setEntityFormData: vi.fn(),
  isSavingEntity: false,
  onSaveEntity: vi.fn(),
  ...overrides,
})

describe('EntitySection — selection list', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists children with age for a baby sitter', () => {
    render(<EntitySection {...baseProps({ sitterType: 'baby' })} />)
    expect(screen.getByText('Mira, 6 years')).toBeInTheDocument()
    expect(screen.getByText('Sami, 9 years')).toBeInTheDocument()
  })

  it('lists pets (breed + age, omitting age when null) for a pet sitter', () => {
    render(<EntitySection {...baseProps({ sitterType: 'pet' })} />)
    expect(screen.getByText('Rex, Labrador, 3 years')).toBeInTheDocument()
    expect(screen.getByText('Milo')).toBeInTheDocument()
  })

  it('shows an empty message when there are no items', () => {
    render(<EntitySection {...baseProps({ sitterType: 'pet', petItems: [] })} />)
    expect(screen.getByText('No pets available')).toBeInTheDocument()
  })

  it('toggles selection when a checkbox is clicked', () => {
    const onToggleSelect = vi.fn()
    render(<EntitySection {...baseProps({ onToggleSelect })} />)
    fireEvent.click(screen.getAllByRole('checkbox')[1])
    expect(onToggleSelect).toHaveBeenCalledWith(2)
  })

  it('reflects the selected state via the checked checkbox', () => {
    render(<EntitySection {...baseProps({ selectedEntityIds: [1] })} />)
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes[0].checked).toBe(true)
    expect(boxes[1].checked).toBe(false)
  })

  it('disables selection while data is loading', () => {
    render(<EntitySection {...baseProps({ isLoadingData: true })} />)
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toBeDisabled()
    }
  })

  it('fires onAddClick from the add button', () => {
    const onAddClick = vi.fn()
    render(<EntitySection {...baseProps({ onAddClick })} />)
    fireEvent.click(screen.getByText(/Add a Child/i))
    expect(onAddClick).toHaveBeenCalledTimes(1)
  })
})

describe('EntitySection — add form', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders pet fields when adding for a pet sitter', () => {
    render(<EntitySection {...baseProps({ sitterType: 'pet', showAddForm: true })} />)
    expect(screen.getByPlaceholderText('Enter pet name')).toBeInTheDocument()
    expect(screen.getByText('Pet Type *')).toBeInTheDocument()
  })

  it('renders child fields (incl. school schedule) when adding for a baby sitter', () => {
    render(<EntitySection {...baseProps({ sitterType: 'baby', showAddForm: true })} />)
    expect(screen.getByPlaceholderText("Enter child's name")).toBeInTheDocument()
    expect(screen.getByText('School Schedule *')).toBeInTheDocument()
  })

  it('updates form data as the name is typed', () => {
    const setEntityFormData = vi.fn()
    render(
      <EntitySection
        {...baseProps({ sitterType: 'pet', showAddForm: true, setEntityFormData })}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('Enter pet name'), {
      target: { value: 'Bella' },
    })
    expect(setEntityFormData).toHaveBeenCalledWith({ name: 'Bella' })
  })

  it('calls onSaveEntity and onCancelAdd from the action buttons', () => {
    const onSaveEntity = vi.fn()
    const onCancelAdd = vi.fn()
    render(
      <EntitySection
        {...baseProps({ sitterType: 'pet', showAddForm: true, onSaveEntity, onCancelAdd })}
      />,
    )
    fireEvent.click(screen.getByText(/Save Pet/i))
    expect(onSaveEntity).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancelAdd).toHaveBeenCalledTimes(1)
  })

  it('shows a saving state and disables the save button', () => {
    render(
      <EntitySection {...baseProps({ sitterType: 'pet', showAddForm: true, isSavingEntity: true })} />,
    )
    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })
})
