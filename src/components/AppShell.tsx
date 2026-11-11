import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowRightFromLine,
  ArrowUpFromLine,
  Building2,
  ChevronDown,
  CircleHelp,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  WalletCards,
  X,
} from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { currentUser, signOut } from '@/services/auth'

const navigation = [
  { label: 'Visão executiva', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Fluxo diário e semanal', path: '/fluxo', icon: ArrowRightFromLine },
  { label: 'Contas a pagar', path: '/contas-a-pagar', icon: ArrowUpFromLine },
  { label: 'Contas a receber', path: '/contas-a-receber', icon: ArrowDownToLine },
  { label: 'Disponibilidades', path: '/disponibilidades', icon: WalletCards },
  { label: 'Importação OMIE', path: '/importacao', icon: FileSpreadsheet },
]

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Visão executiva', subtitle: 'Posição consolidada do fluxo de caixa' },
  '/fluxo': { title: 'Fluxo diário e semanal', subtitle: 'Entradas, saídas e saldo projetado' },
  '/contas-a-pagar': {
    title: 'Contas a pagar',
    subtitle: 'Lançamentos consolidados da pivot OMIE',
  },
  '/contas-a-receber': { title: 'Contas a receber', subtitle: 'Entradas previstas e recebidas' },
  '/disponibilidades': {
    title: 'Disponibilidades',
    subtitle: 'Saldos informados por conta corrente',
  },
  '/importacao': { title: 'Importação OMIE', subtitle: 'Envio, processamento e inconsistências' },
}

function initials(value: string): string {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'HV'
  )
}

function SidebarNavigation({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-5" aria-label="Navegação principal">
      {!collapsed && (
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
          Planejamento financeiro
        </p>
      )}
      {navigation.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          className={({ isActive }) =>
            cn(
              'group flex h-11 items-center rounded-xl text-sm font-medium transition-all',
              collapsed ? 'justify-center px-0' : 'gap-3 px-3',
              isActive
                ? 'bg-white text-[#07583F] shadow-[0_8px_24px_rgba(0,0,0,0.14)]'
                : 'text-white/68 hover:bg-white/8 hover:text-white',
            )
          }
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = currentUser()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const page = pageTitles[location.pathname] ?? pageTitles['/dashboard']
  const userName = String(user?.name || user?.email || 'Equipe HelpVida')
  const userEmail = String(user?.email || '')

  function logout() {
    signOut()
    navigate('/login', { replace: true })
  }

  function refresh() {
    setRefreshing(true)
    window.dispatchEvent(new Event('helpvida:refresh'))
    window.setTimeout(() => setRefreshing(false), 650)
  }

  return (
    <div className="min-h-screen bg-[#F4F7F5] text-[#183A30]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden bg-[#064A35] shadow-[8px_0_32px_rgba(1,50,36,0.08)] transition-[width] duration-300 lg:flex',
          collapsed ? 'w-[82px]' : 'w-[252px]',
        )}
      >
        <div
          className={cn(
            'flex h-[86px] items-center border-b border-white/10 px-5',
            collapsed && 'justify-center px-0',
          )}
        >
          <BrandLogo compact={collapsed} inverted />
        </div>
        <SidebarNavigation collapsed={collapsed} />
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <div className="mb-3 rounded-xl bg-white/[0.06] p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-white/85">
                <CircleHelp className="h-4 w-4 text-[#D5AE00]" />
                Precisa de apoio?
              </div>
              <p className="text-[11px] leading-relaxed text-white/45">
                Confira as inconsistências após cada importação.
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full text-white/55 hover:bg-white/10 hover:text-white',
              collapsed ? 'px-0' : 'justify-start gap-3',
            )}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" /> Recolher menu
              </>
            )}
          </Button>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[288px] border-none bg-[#064A35] p-0 text-white [&>button]:hidden"
        >
          <SheetHeader className="flex h-[86px] flex-row items-center justify-between border-b border-white/10 px-5 text-left">
            <SheetTitle>
              <BrandLogo inverted />
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetHeader>
          <SidebarNavigation collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          'min-h-screen transition-[padding] duration-300',
          collapsed ? 'lg:pl-[82px]' : 'lg:pl-[252px]',
        )}
      >
        <header className="sticky top-0 z-30 flex h-[86px] items-center justify-between border-b border-[#DFE8E3] bg-white/95 px-4 backdrop-blur md:px-7 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-semibold tracking-[-0.025em] text-[#143D31] md:text-[1.6rem]">
                {page.title}
              </h1>
              <p className="hidden truncate text-xs text-[#71827C] sm:block">{page.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="hidden gap-2 border-[#DCE7E2] bg-white text-[#526B63] shadow-none sm:flex"
              onClick={refresh}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              Atualizar
            </Button>
            <div className="hidden h-8 w-px bg-[#E4EBE7] md:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-12 gap-2 rounded-xl px-2 hover:bg-[#F1F6F3] md:px-3"
                >
                  <Avatar className="h-8 w-8 border border-[#D9E9E2]">
                    <AvatarFallback className="bg-[#E6F4EF] text-[11px] font-bold text-[#08705A]">
                      {initials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden max-w-40 text-left md:block">
                    <p className="truncate text-xs font-semibold text-[#28483E]">{userName}</p>
                    <p className="truncate text-[10px] text-[#81908B]">Equipe financeira</p>
                  </div>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-[#80918B] md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <span className="block truncate text-sm">{userName}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {userEmail}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/disponibilidades')}>
                  <Building2 className="mr-2 h-4 w-4" /> Contas bancárias
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                  <ArrowRightFromLine className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1680px] p-4 md:p-7 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
