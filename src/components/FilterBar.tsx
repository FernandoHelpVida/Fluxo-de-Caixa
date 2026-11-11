import { RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FinanceFilters } from '@/types/finance'

const ALL_VALUE = '__all__'

type FilterOptions = {
  categories: string[]
  accounts: string[]
  departments: string[]
}

export function FilterBar({
  filters,
  options,
  onChange,
  onReset,
  showSearch = false,
  search = '',
  onSearchChange,
}: {
  filters: FinanceFilters
  options: FilterOptions
  onChange: (filters: FinanceFilters) => void
  onReset: () => void
  showSearch?: boolean
  search?: string
  onSearchChange?: (value: string) => void
}) {
  function set<K extends keyof FinanceFilters>(key: K, value: FinanceFilters[K]) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E1EAE5] bg-white p-4 shadow-[0_8px_30px_rgba(18,62,49,0.04)] xl:flex-row xl:items-end">
      {showSearch && (
        <label className="relative min-w-[220px] flex-1">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#6E7F79]">
            Buscar
          </span>
          <Search className="absolute bottom-2.5 left-3 h-4 w-4 text-[#87958F]" />
          <Input
            value={search}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="Fornecedor, NF ou registro"
            className="h-10 border-[#DCE6E1] pl-9"
          />
        </label>
      )}
      <label className="min-w-[145px]">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#6E7F79]">
          De
        </span>
        <Input
          type="date"
          value={filters.inicio}
          onChange={(event) => set('inicio', event.target.value)}
          className="h-10 border-[#DCE6E1]"
        />
      </label>
      <label className="min-w-[145px]">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#6E7F79]">
          Até
        </span>
        <Input
          type="date"
          value={filters.fim}
          onChange={(event) => set('fim', event.target.value)}
          className="h-10 border-[#DCE6E1]"
        />
      </label>
      <label className="min-w-[170px] flex-1">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#6E7F79]">
          Categoria
        </span>
        <Select
          value={filters.categoria || ALL_VALUE}
          onValueChange={(value) => set('categoria', value === ALL_VALUE ? '' : value)}
        >
          <SelectTrigger className="h-10 border-[#DCE6E1]">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todas</SelectItem>
            {options.categories.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="min-w-[170px] flex-1">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#6E7F79]">
          Conta corrente
        </span>
        <Select
          value={filters.conta || ALL_VALUE}
          onValueChange={(value) => set('conta', value === ALL_VALUE ? '' : value)}
        >
          <SelectTrigger className="h-10 border-[#DCE6E1]">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todas</SelectItem>
            {options.accounts.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="min-w-[170px] flex-1">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#6E7F79]">
          Departamento
        </span>
        <Select
          value={filters.departamento || ALL_VALUE}
          onValueChange={(value) => set('departamento', value === ALL_VALUE ? '' : value)}
        >
          <SelectTrigger className="h-10 border-[#DCE6E1]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos</SelectItem>
            {options.departments.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <Button
        variant="outline"
        size="icon"
        title="Limpar filtros"
        className="h-10 shrink-0 border-[#DCE6E1]"
        onClick={onReset}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  )
}
