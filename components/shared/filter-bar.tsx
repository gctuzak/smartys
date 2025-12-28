"use client"

import * as React from "react"
import { Filter, X, Check, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface FilterOption {
  label: string
  value: string
}

export interface FilterState {
  status: string[]
  paymentStatus: string[]
  dateRange: {
    from?: string
    to?: string
  }
}

interface FilterBarProps {
  statusOptions?: FilterOption[]
  paymentStatusOptions?: FilterOption[]
  onApply: (filters: FilterState) => void
  className?: string
  filterState?: FilterState
}

export function FilterBar({ 
  statusOptions = [], 
  paymentStatusOptions = [], 
  onApply,
  className,
  filterState
}: FilterBarProps) {
  const [open, setOpen] = React.useState(false)
  const [filters, setFilters] = React.useState<FilterState>(filterState || {
    status: [],
    paymentStatus: [],
    dateRange: {}
  })

  React.useEffect(() => {
    if (filterState) {
      setFilters(filterState)
    }
  }, [filterState])

  const [tempFilters, setTempFilters] = React.useState<FilterState>(filters)

  // Sync internal state when popover opens
  React.useEffect(() => {
    if (open) {
      setTempFilters(filters)
    }
  }, [open, filters])

  const handleApply = () => {
    setFilters(tempFilters)
    onApply(tempFilters)
    setOpen(false)
  }

  const handleClear = () => {
    const cleared = {
      status: [],
      paymentStatus: [],
      dateRange: {}
    }
    setFilters(cleared)
    setTempFilters(cleared)
    onApply(cleared)
    setOpen(false)
  }

  const toggleStatus = (value: string) => {
    setTempFilters(prev => {
      const current = prev.status
      const next = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value]
      return { ...prev, status: next }
    })
  }

  const togglePaymentStatus = (value: string) => {
    setTempFilters(prev => {
      const current = prev.paymentStatus
      const next = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value]
      return { ...prev, paymentStatus: next }
    })
  }

  const hasActiveFilters = 
    filters.status.length > 0 || 
    filters.paymentStatus.length > 0 || 
    !!filters.dateRange.from || 
    !!filters.dateRange.to

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 border-dashed">
            <Filter className="mr-2 h-4 w-4" />
            Filtrele
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 rounded-sm px-1 font-normal lg:hidden">
                {filters.status.length + filters.paymentStatus.length + (filters.dateRange.from ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-4" align="start">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Filtreler</h4>
              <p className="text-sm text-muted-foreground">
                Listeyi daraltmak için kriterleri seçin.
              </p>
            </div>
            
            {statusOptions.length > 0 && (
              <div className="space-y-2">
                <Label>Durum</Label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(option => (
                    <Badge
                      key={option.value}
                      variant={tempFilters.status.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleStatus(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {paymentStatusOptions.length > 0 && (
              <div className="space-y-2">
                <Label>Ödeme Durumu</Label>
                <div className="flex flex-wrap gap-2">
                  {paymentStatusOptions.map(option => (
                    <Badge
                      key={option.value}
                      variant={tempFilters.paymentStatus.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => togglePaymentStatus(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Tarih Aralığı</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Başlangıç</span>
                  <Input 
                    type="date" 
                    value={tempFilters.dateRange.from || ""} 
                    onChange={(e) => setTempFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, from: e.target.value }
                    }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Bitiş</span>
                  <Input 
                    type="date" 
                    value={tempFilters.dateRange.to || ""} 
                    onChange={(e) => setTempFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, to: e.target.value }
                    }))}
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Temizle
              </Button>
              <Button size="sm" onClick={handleApply}>
                Uygula
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Badges */}
      <div className="hidden lg:flex flex-1 items-center gap-2 overflow-x-auto">
        {filters.status.length > 0 && (
          <div className="flex items-center gap-1 rounded-sm border border-dashed px-2 py-1">
            <span className="text-xs font-medium">Durum:</span>
            {filters.status.map(val => (
              <Badge key={val} variant="secondary" className="h-5 px-1 text-[10px]">
                {statusOptions.find(o => o.value === val)?.label || val}
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1 hover:bg-transparent"
              onClick={() => {
                const newFilters = { ...filters, status: [] };
                setFilters(newFilters);
                onApply(newFilters);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        {filters.paymentStatus.length > 0 && (
          <div className="flex items-center gap-1 rounded-sm border border-dashed px-2 py-1">
            <span className="text-xs font-medium">Ödeme:</span>
            {filters.paymentStatus.map(val => (
              <Badge key={val} variant="secondary" className="h-5 px-1 text-[10px]">
                {paymentStatusOptions.find(o => o.value === val)?.label || val}
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1 hover:bg-transparent"
              onClick={() => {
                const newFilters = { ...filters, paymentStatus: [] };
                setFilters(newFilters);
                onApply(newFilters);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {(filters.dateRange.from || filters.dateRange.to) && (
          <div className="flex items-center gap-1 rounded-sm border border-dashed px-2 py-1">
            <span className="text-xs font-medium">Tarih:</span>
            <Badge variant="secondary" className="h-5 px-1 text-[10px]">
              {filters.dateRange.from || "..."} - {filters.dateRange.to || "..."}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1 hover:bg-transparent"
              onClick={() => {
                const newFilters = { ...filters, dateRange: {} };
                setFilters(newFilters);
                onApply(newFilters);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        {hasActiveFilters && (
           <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 lg:px-3"
            onClick={handleClear}
          >
            Temizle
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
