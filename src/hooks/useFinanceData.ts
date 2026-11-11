import { useCallback, useEffect, useState } from 'react'
import { listAllPayables, listAvailabilities, listReceivables } from '@/services/finance'
import type { Availability, FinanceFilters, Payable, Receivable } from '@/types/finance'

export const EMPTY_FILTERS: FinanceFilters = {
  inicio: '',
  fim: '',
  categoria: '',
  conta: '',
  departamento: '',
}

export function useFinanceData(filters: FinanceFilters = EMPTY_FILTERS) {
  const [payables, setPayables] = useState<Payable[]>([])
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [payableRows, receivableRows, availabilityRows] = await Promise.all([
        listAllPayables(filters),
        listReceivables(),
        listAvailabilities(),
      ])
      setPayables(payableRows)
      setReceivables(receivableRows)
      setAvailabilities(availabilityRows)
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : 'Falha ao consultar os dados do fluxo.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const listener = () => void load()
    window.addEventListener('helpvida:refresh', listener)
    return () => window.removeEventListener('helpvida:refresh', listener)
  }, [load])

  return { payables, receivables, availabilities, loading, error, reload: load }
}
