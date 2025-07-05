'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Search, 
  Filter, 
  Calendar, 
  Save, 
  X, 
  Loader2,
  FileText,
  MessageSquare,
  FolderOpen,
  Target
} from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/useDebounce'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const searchFormSchema = z.object({
  query: z.string().default(''),
  type: z.enum(['all', 'projects', 'tasks', 'messages']).default('all'),
  status: z.array(z.string()).default([]),
  priority: z.array(z.string()).default([]),
  date_from: z.date().optional(),
  date_to: z.date().optional(),
  project_ids: z.array(z.string()).default([])
})

type SearchFormData = z.infer<typeof searchFormSchema>

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

interface AdvancedSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSearchExecute?: (results: SearchResult[], searchParams: any) => void
}

const searchTypeOptions = [
  { value: 'all', label: 'Todos', icon: Search },
  { value: 'projects', label: 'Projetos', icon: FolderOpen },
  { value: 'tasks', label: 'Tarefas', icon: Target },
  { value: 'messages', label: 'Mensagens', icon: MessageSquare }
]

const statusOptions = [
  { value: 'active', label: 'Ativo' },
  { value: 'completed', label: 'Concluído' },
  { value: 'archived', label: 'Arquivado' },
  { value: 'on_hold', label: 'Em Espera' }
]

const priorityOptions = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' }
]

export function AdvancedSearchModal({ open, onOpenChange, onSearchExecute }: AdvancedSearchModalProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState<'from' | 'to' | null>(null)

  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      query: '',
      type: 'all',
      status: [],
      priority: [],
      project_ids: []
    }
  })

  const watchedQuery = form.watch('query')
  const debouncedQuery = useDebounce(watchedQuery, 300)

  const executeSearch = useCallback(async (searchData: SearchFormData) => {
    if (!searchData.query.trim() && searchData.status.length === 0 && searchData.priority.length === 0) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    
    try {
      const params = new URLSearchParams({
        q: searchData.query,
        type: searchData.type,
        limit: '20'
      })

      if (searchData.status.length > 0) {
        params.append('status', searchData.status.join(','))
      }
      if (searchData.priority.length > 0) {
        params.append('priority', searchData.priority.join(','))
      }
      if (searchData.date_from) {
        params.append('date_from', searchData.date_from.toISOString().split('T')[0])
      }
      if (searchData.date_to) {
        params.append('date_to', searchData.date_to.toISOString().split('T')[0])
      }
      if (searchData.project_ids.length > 0) {
        params.append('project_ids', searchData.project_ids.join(','))
      }

      const response = await fetch(`/api/client/search/projects?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro na busca')
      }

      const data = await response.json()
      setSearchResults(data.results || [])
      onSearchExecute?.(data.results || [], data.search_params)
      
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Erro ao executar busca')
    } finally {
      setIsSearching(false)
    }
  }, [onSearchExecute])

  // Auto-search when query changes
  useEffect(() => {
    if (debouncedQuery || form.getValues('status').length > 0 || form.getValues('priority').length > 0) {
      executeSearch(form.getValues())
    }
  }, [debouncedQuery, executeSearch, form])

  const onSubmit = (data: SearchFormData) => {
    executeSearch(data)
  }

  const handleSaveSearch = async () => {
    const searchData = form.getValues()
    // Implementation for saving search would go here
    toast.success('Busca salva com sucesso!')
    setShowSaveDialog(false)
  }

  const clearFilters = () => {
    form.reset({
      query: '',
      type: 'all',
      status: [],
      priority: [],
      project_ids: []
    })
    setSearchResults([])
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'project': return FolderOpen
      case 'task': return Target
      case 'message': return MessageSquare
      default: return FileText
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Busca Avançada
          </DialogTitle>
          <DialogDescription>
            Encontre projetos, tarefas e mensagens com filtros avançados
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-6 min-h-0">
          {/* Search Form */}
          <div className="w-1/3 space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Search Query */}
                <FormField
                  control={form.control}
                  name="query"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Termo de Busca</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input 
                            placeholder="Digite sua busca..."
                            className="pl-10"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Search Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Busca</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {searchTypeOptions.map((option) => {
                            const Icon = option.icon
                            return (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {option.label}
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status Filter */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((option) => (
                          <Badge
                            key={option.value}
                            variant={field.value.includes(option.value) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const newValue = field.value.includes(option.value)
                                ? field.value.filter(v => v !== option.value)
                                : [...field.value, option.value]
                              field.onChange(newValue)
                            }}
                          >
                            {option.label}
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Priority Filter */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {priorityOptions.map((option) => (
                          <Badge
                            key={option.value}
                            variant={field.value.includes(option.value) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const newValue = field.value.includes(option.value)
                                ? field.value.filter(v => v !== option.value)
                                : [...field.value, option.value]
                              field.onChange(newValue)
                            }}
                          >
                            {option.label}
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="date_from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Inicial</FormLabel>
                        <Popover open={calendarOpen === 'from'} onOpenChange={(open) => setCalendarOpen(open ? 'from' : null)}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                                ) : (
                                  <span>Selecionar</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date)
                                setCalendarOpen(null)
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Final</FormLabel>
                        <Popover open={calendarOpen === 'to'} onOpenChange={(open) => setCalendarOpen(open ? 'to' : null)}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                                ) : (
                                  <span>Selecionar</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date)
                                setCalendarOpen(null)
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSearching} className="flex-1">
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Buscar
                  </Button>
                  <Button type="button" variant="outline" onClick={clearFilters}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowSaveDialog(true)}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          <Separator orientation="vertical" />

          {/* Search Results */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Resultados {searchResults.length > 0 && `(${searchResults.length})`}
              </h3>
              {isSearching && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>

            <ScrollArea className="h-[500px]">
              {searchResults.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Digite um termo para começar a busca</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((result) => {
                    const Icon = getResultIcon(result.result_type)
                    return (
                      <div
                        key={`${result.result_type}-${result.result_id}`}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="h-4 w-4 text-gray-500 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{result.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {result.result_type === 'project' && 'Projeto'}
                                {result.result_type === 'task' && 'Tarefa'}
                                {result.result_type === 'message' && 'Mensagem'}
                              </Badge>
                            </div>
                            {result.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                {result.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{result.project_name}</span>
                              <span>•</span>
                              <span>
                                {format(new Date(result.updated_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                              <span>•</span>
                              <span>Relevância: {Math.round(result.relevance_score * 100)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
