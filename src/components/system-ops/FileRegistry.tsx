import { useState } from "react"
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, HelpCircle, File, Cloud, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface FileItem {
  registry_id: string
  name: string
  category: string
  type: string
  pipeline: string | null
  schedule: string | null
  status: 'success' | 'failed' | 'stale' | 'unknown'
  last_run: string | null
  next_run: string | null
  error_message: string | null
  runtime_seconds: number | null
  status_checked_at: string | null
}

interface FileRegistryProps {
  scripts: FileItem[]
  edgeFunctions: FileItem[]
}

export function FileRegistry({ scripts, edgeFunctions }: FileRegistryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Fight Flow Scripts': true,
    'Twitter Scripts': false,
    'Health Scripts': false,
    'Mission Control Scripts': false,
    'Edge Functions': false,
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'stale':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <HelpCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never run'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays > 0) {
      return `${diffDays}d ago`
    } else if (diffHours > 0) {
      return `${diffHours}h ago`
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`
    } else {
      return 'Just now'
    }
  }

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const filterItems = (items: FileItem[]) => {
    if (!searchQuery) return items
    return items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const groupByCategory = (items: FileItem[]) => {
    const groups: Record<string, FileItem[]> = {}
    
    items.forEach(item => {
      // Map categories to display names
      let categoryName = item.category
      switch (item.category) {
        case 'fightflow':
          categoryName = 'Fight Flow Scripts'
          break
        case 'twitter':
          categoryName = 'Twitter Scripts'
          break
        case 'health':
          categoryName = 'Health Scripts'
          break
        case 'mission_control':
          categoryName = 'Mission Control Scripts'
          break
        default:
          categoryName = item.category.charAt(0).toUpperCase() + item.category.slice(1)
      }
      
      if (!groups[categoryName]) {
        groups[categoryName] = []
      }
      groups[categoryName].push(item)
    })
    
    // Sort items within each group
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => a.name.localeCompare(b.name))
    })
    
    return groups
  }

  const filteredScripts = filterItems(scripts)
  const filteredEdgeFunctions = filterItems(edgeFunctions)
  const scriptGroups = groupByCategory(filteredScripts)
  const edgeFunctionGroup = filteredEdgeFunctions.length > 0 ? { 'Edge Functions': filteredEdgeFunctions } : {}

  const allGroups = { ...scriptGroups, ...edgeFunctionGroup }

  const getCategoryIcon = (categoryName: string) => {
    if (categoryName === 'Edge Functions') {
      return <Cloud className="h-4 w-4 text-blue-600" />
    }
    return <File className="h-4 w-4 text-gray-600" />
  }

  const getCategoryStats = (items: FileItem[]) => {
    return {
      total: items.length,
      success: items.filter(i => i.status === 'success').length,
      failed: items.filter(i => i.status === 'failed').length,
      stale: items.filter(i => i.status === 'stale').length,
      unknown: items.filter(i => i.status === 'unknown').length,
    }
  }

  const totalItems = filteredScripts.length + filteredEdgeFunctions.length

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search scripts and functions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Accordions */}
      <div className="space-y-3">
        {Object.entries(allGroups).map(([categoryName, items]) => {
          const stats = getCategoryStats(items)
          const isOpen = openCategories[categoryName] ?? false
          
          return (
            <Collapsible
              key={categoryName}
              open={isOpen}
              onOpenChange={() => toggleCategory(categoryName)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-600" />
                      )}
                      {getCategoryIcon(categoryName)}
                    </div>
                    <span className="font-medium text-gray-900">{categoryName}</span>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {stats.success > 0 && (
                      <div className="flex items-center text-xs text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {stats.success}
                      </div>
                    )}
                    {stats.failed > 0 && (
                      <div className="flex items-center text-xs text-red-600">
                        <XCircle className="h-3 w-3 mr-1" />
                        {stats.failed}
                      </div>
                    )}
                    {stats.stale > 0 && (
                      <div className="flex items-center text-xs text-yellow-600">
                        <Clock className="h-3 w-3 mr-1" />
                        {stats.stale}
                      </div>
                    )}
                    {stats.unknown > 0 && (
                      <div className="flex items-center text-xs text-gray-600">
                        <HelpCircle className="h-3 w-3 mr-1" />
                        {stats.unknown}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.registry_id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(item.status)}
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            {item.pipeline && (
                              <Badge variant="outline" className="text-xs">
                                {item.pipeline}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">Type:</span> {item.type.replace('_', ' ')}
                            </div>
                            <div>
                              <span className="font-medium">Last run:</span> {formatTimeAgo(item.last_run)}
                            </div>
                            <div>
                              <span className="font-medium">Status:</span> 
                              <span className={`ml-1 capitalize ${
                                item.status === 'success' ? 'text-green-600' :
                                item.status === 'failed' ? 'text-red-600' :
                                item.status === 'stale' ? 'text-yellow-600' :
                                'text-gray-600'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                          
                          {item.error_message && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                              <span className="font-medium">Error:</span> {item.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>

      {totalItems === 0 && searchQuery && (
        <div className="text-center py-8">
          <p className="text-gray-500">No scripts or functions match your search.</p>
        </div>
      )}

      {/* Summary */}
      <div className="text-sm text-gray-600 pt-2 border-t">
        Showing {totalItems} items ({filteredScripts.length} scripts, {filteredEdgeFunctions.length} edge functions)
      </div>
    </div>
  )
}