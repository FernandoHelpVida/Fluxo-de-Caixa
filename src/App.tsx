import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { LoadingScreen } from '@/components/LoadingScreen'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { isAuthenticated, onAuthChange } from '@/services/auth'
import Availabilities from '@/pages/Availabilities'
import Dashboard from '@/pages/Dashboard'
import Flow from '@/pages/Flow'
import ImportPage from '@/pages/Import'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import Payables from '@/pages/Payables'
import Receivables from '@/pages/Receivables'

function ProtectedLayout() {
  const location = useLocation()
  if (!isAuthenticated())
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <AppShell />
}

function AppRoutes() {
  const [, setAuthVersion] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthChange(() => {
      setAuthVersion((value) => value + 1)
      setReady(true)
    })
    return unsubscribe
  }, [])

  if (!ready) return <LoadingScreen />

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/fluxo" element={<Flow />} />
        <Route path="/contas-a-pagar" element={<Payables />} />
        <Route path="/contas-a-receber" element={<Receivables />} />
        <Route path="/disponibilidades" element={<Availabilities />} />
        <Route path="/importacao" element={<ImportPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <AppRoutes />
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  )
}
