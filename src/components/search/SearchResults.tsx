'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Search, 
  FolderOpen, 
  Target, 
  MessageSquare, 
  FileText,
  Calendar,
  User,
  ArrowUpDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

interface SearchResult {
  result_type: string
  result_id: string
  title: string
  description?: string
  project_id: string
  project_name: string
  relevance_score: number
  created_at: string
  updated_at: string
  metadata: any
}

interface GroupedResults {
  projects: SearchResult[]
  tasks: SearchResult[]
  messages: SearchResult[]
}

interface SearchResultsProps {
  results: SearchResult[]
  groupedResults?: GroupedResults
  searchQuery?: string
  totalResults?: number
  isLoading?: boolean
  pagination?: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
  onResultClick?: (result: SearchResult) => void
  onPageChange?: (offset: number) => void
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  className?: string
}

type SortOption = 'relevance' | 'date' | 'title' | 'type'
type ViewMode = 'all' | 'grouped'

const resultTypeConfig = {
  project: {
    label: 'Projeto',
    icon: FolderOpen,
    color: 'bg-blue-100 text-blue-800',
    bgColor: 'bg-blue-50'
  },
  task: {
    label: 'Tarefa',
    icon: Target,
    color: 'bg-green-100 text-green-800',
    bgColor: 'bg-green-50'
  },
  message: {
    label: 'Mensagem',
    icon: MessageSquare,
    color: 'bg-purple-100 text-purple-800',
    bgColor: 'bg-purple-50'
  }
}

export function SearchResults({
  results,
  groupedResults,
  searchQuery = '',
  totalResults = 0,
  isLoading = false,
  pagination,
  onResultClick,
  onPageChange,
  onSortChange,
  className
}: SearchResultsProps) {
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('all')

  const handleSortChange = (newSortBy: SortOption) => {
    const newSortOrder = sortBy === newSortBy && sortOrder === 'desc' ? 'asc' : 'desc'
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    onSortChange?.(newSortBy, newSortOrder)
  }

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    )
  }

  const ResultCard = ({ result }: { result: SearchResult }) => {
    const config = resultTypeConfig[result.result_type as keyof typeof resultTypeConfig]
    const Icon = config?.icon || FileText

    return (
      <Card 
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]',
          config?.bgColor
        )}
        onClick={() => onResultClick?.(result)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Icon className="h-5 w-5 text-gray-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-medium truncate">
                  {highlightText(result.title, searchQuery)}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={config?.color}>
                    {config?.label}
                  </Badge>
                  <span className="text-sm text-gray-500 truncate">
                    {result.project_name}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge variant="secondary" className="text-xs">
                {Math.round(result.relevance_score * 100)}%
              </Badge>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </CardHeader>

        {result.description && (
          <CardContent className="pt-0">
            <p className="text-sm text-gray-600 line-clamp-2">
              {highlightText(result.description, searchQuery)}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(result.updated_at), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
              {result.metadata?.assigned_to && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Atribuído</span>
                </div>
              )}
              {result.metadata?.priority && (
                <Badge variant="outline" className="text-xs">
                  {result.metadata.priority}
                </Badge>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  const GroupedView = () => {
    if (!groupedResults) return null

    return (
      <div className="space-y-6">
        {Object.entries(groupedResults).map(([type, typeResults]) => {
          if (typeResults.length === 0) return null
          
          const config = resultTypeConfig[type as keyof typeof resultTypeConfig]
          const Icon = config?.icon || FileText

          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold">{config?.label}s</h3>
                <Badge variant="secondary">{typeResults.length}</Badge>
              </div>
              <div className="grid gap-3">
                {typeResults.map((result) => (
                  <ResultCard key={`${result.result_type}-${result.result_id}`} result={result} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const AllResultsView = () => (
    <div className="grid gap-3">
      {results.map((result) => (
        <ResultCard key={`${result.result_type}-${result.result_id}`} result={result} />
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum resultado encontrado</h3>
        <p className="text-gray-500">
          Tente ajustar sua busca ou usar termos diferentes
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            Resultados da Busca
            {totalResults > 0 && (
              <span className="text-gray-500 font-normal ml-2">
                ({totalResults} resultado{totalResults !== 1 ? 's' : ''})
              </span>
            )}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="grouped">Agrupados</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Options */}
          <Select value={sortBy} onValueChange={(value: SortOption) => handleSortChange(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevância</SelectItem>
              <SelectItem value="date">Data</SelectItem>
              <SelectItem value="title">Título</SelectItem>
              <SelectItem value="type">Tipo</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSortChange(sortBy)}
            className="px-2"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Results */}
      {viewMode === 'grouped' ? <GroupedView /> : <AllResultsView />}

      {/* Pagination */}
      {pagination && pagination.total > pagination.limit && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-500">
            Mostrando {pagination.offset + 1} a {Math.min(pagination.offset + pagination.limit, pagination.total)} de {pagination.total} resultados
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(Math.max(0, pagination.offset - pagination.limit))}
              disabled={pagination.offset === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.offset + pagination.limit)}
              disabled={!pagination.has_more}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
