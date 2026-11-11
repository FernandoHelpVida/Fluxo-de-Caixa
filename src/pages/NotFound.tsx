import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F7F5] p-6">
      <div className="max-w-md text-center">
        <BrandLogo className="mb-10" />
        <p className="font-display text-7xl font-semibold text-[#C9D8D2]">404</p>
        <h1 className="mt-4 font-display text-2xl font-semibold text-[#244A3E]">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-[#71817B]">
          O endereço informado não faz parte do fluxo de caixa HelpVida.
        </p>
        <Button asChild className="mt-7 bg-[#087158] hover:bg-[#065B47]">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar à visão executiva
          </Link>
        </Button>
      </div>
    </div>
  )
}
