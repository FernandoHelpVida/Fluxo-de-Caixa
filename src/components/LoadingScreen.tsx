import { BrandLogo } from '@/components/BrandLogo'

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F7F5]">
      <div className="flex flex-col items-center gap-6">
        <BrandLogo />
        <div className="h-1 w-40 overflow-hidden rounded-full bg-[#DDE8E3]">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#0D8A70]" />
        </div>
        <p className="text-sm font-medium text-[#5D7069]">Carregando visão financeira…</p>
      </div>
    </div>
  )
}
