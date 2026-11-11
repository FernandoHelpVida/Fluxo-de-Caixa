import { FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, FileSpreadsheet, LineChart, LockKeyhole, ShieldCheck } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/format'
import { isAuthenticated, signIn } from '@/services/auth'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated()) return <Navigate to="/dashboard" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn(email, password)
      const target = (location.state as { from?: string } | null)?.from || '/dashboard'
      navigate(target, { replace: true })
    } catch (reason) {
      setError(
        getErrorMessage(reason, 'E-mail ou senha inválidos. Confira os dados e tente novamente.'),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#064A35] p-14 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-28 h-[420px] w-[420px] rounded-full bg-[#0D795D]/40 blur-2xl" />
        <div className="absolute -bottom-40 -left-32 h-[460px] w-[460px] rounded-full border-[80px] border-white/[0.025]" />
        <div className="absolute right-14 top-1/2 h-52 w-52 -translate-y-1/2 rotate-12 opacity-[0.05]">
          <svg viewBox="0 0 52 52">
            <path
              d="M22 2h9l-1 15L42 8l5 8-14 7 15 5-3 9-14-7 2 16h-9l1-15-12 9-5-8 14-7-15-5 3-9 14 7z"
              fill="white"
            />
          </svg>
        </div>
        <BrandLogo inverted />
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-[#E5C532]">
            <ShieldCheck className="h-3.5 w-3.5" /> Informação financeira segura
          </span>
          <h1 className="mt-7 font-display text-5xl font-semibold leading-[1.08] tracking-[-0.045em] text-white xl:text-[3.6rem]">
            Clareza para decidir.
            <br />
            <span className="text-[#64D1B5]">Previsibilidade para cuidar.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-white/58">
            Transforme a pivot do OMIE em uma visão consolidada, pronta para a leitura da
            presidência e para as decisões da equipe financeira.
          </p>
          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur">
              <FileSpreadsheet className="h-5 w-5 text-[#D5AE00]" />
              <p className="mt-3 text-sm font-semibold text-white">Importação tratada</p>
              <p className="mt-1 text-xs leading-relaxed text-white/42">
                Datas, valores e subtotais normalizados.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur">
              <LineChart className="h-5 w-5 text-[#5CD1B3]" />
              <p className="mt-3 text-sm font-semibold text-white">Posição executiva</p>
              <p className="mt-1 text-xs leading-relaxed text-white/42">
                Fluxo diário e semanal em um só lugar.
              </p>
            </div>
          </div>
        </div>
        <p className="relative z-10 text-xs text-white/30">
          © {new Date().getFullYear()} HelpVida · Uso interno
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#F7F9F8] px-5 py-10 sm:px-10">
        <div className="w-full max-w-[430px]">
          <div className="mb-10 lg:hidden">
            <BrandLogo />
          </div>
          <div className="mb-8">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E5F2ED] text-[#08745A]">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-[#143D31]">
              Bem-vindo de volta
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#71827C]">
              Entre com suas credenciais para acessar o fluxo de caixa da HelpVida.
            </p>
          </div>
          {error && (
            <Alert variant="destructive" className="mb-5 bg-red-50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-[#405C52]">
                E-mail corporativo
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu.nome@helpvida.com.br"
                className="h-12 border-[#D8E4DE] bg-white px-4 focus-visible:ring-[#0E8F71]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-[#405C52]">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  className="h-12 border-[#D8E4DE] bg-white px-4 pr-12 focus-visible:ring-[#0E8F71]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#81908B] hover:text-[#0B7058]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full bg-[#087158] font-semibold text-white shadow-[0_10px_24px_rgba(8,113,88,0.22)] hover:bg-[#075E4A]"
            >
              {loading ? 'Entrando…' : 'Entrar no fluxo de caixa'}
            </Button>
          </form>
          <p className="mt-8 text-center text-xs leading-relaxed text-[#8A9893]">
            Acesso restrito à equipe financeira e à presidência.
            <br />
            Em caso de dúvida, procure o administrador.
          </p>
        </div>
      </section>
    </div>
  )
}
