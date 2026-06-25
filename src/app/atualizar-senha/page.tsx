'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { Lock, CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function AtualizarSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)

  useEffect(() => {
    // O Supabase injeta o token de recuperação automaticamente via URL hash (#access_token=...)
    // O cliente do Supabase lida com isso internamente via onAuthStateChange
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      } else if (event === 'SIGNED_IN' && session) {
        setSessionReady(true)
      }
    })

    // Timeout: se após 3s não houver sessão, provavelmente o link expirou
    const timeout = setTimeout(() => {
      if (!sessionReady) setSessionError(true)
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [sessionReady])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/dashboard'), 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b13] px-6 py-12 font-sans">
      
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-15 pointer-events-none">
        <div className="w-[400px] h-[400px] bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="mb-3">
            <Logo height="h-10 sm:h-12" />
          </Link>
        </div>

        {success ? (
          <div className="bg-[#0c1220] rounded-2xl border border-slate-800 shadow-2xl p-8 text-center space-y-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">Palavra-passe atualizada!</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                A sua senha foi alterada com sucesso. A redirecionar para o painel...
              </p>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 animate-[grow_3s_linear_forwards]" style={{ width: '100%', animation: 'none', transition: 'width 3s linear' }} />
            </div>
          </div>
        ) : sessionError ? (
          <div className="bg-[#0c1220] rounded-2xl border border-slate-800 shadow-2xl p-8 text-center space-y-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 mx-auto">
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">Link inválido ou expirado</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Este link de recuperação já foi usado ou expirou. Solicite um novo link.
              </p>
            </div>
            <Link
              href="/recuperar-senha"
              className="flex w-full h-11 items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl font-semibold text-sm transition-all"
            >
              Solicitar Novo Link
            </Link>
          </div>
        ) : (
          <div className="bg-[#0c1220] rounded-2xl border border-slate-800 shadow-2xl p-8">
            <div className="mb-7 space-y-1.5">
              <h2 className="text-xl font-bold text-white">Criar nova palavra-passe</h2>
              <p className="text-sm text-slate-400">
                Escolha uma palavra-passe segura com pelo menos 6 caracteres.
              </p>
            </div>

            {!sessionReady && (
              <div className="mb-5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />
                <span>A verificar o seu link de recuperação...</span>
              </div>
            )}

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Nova Palavra-passe
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mín. 6 caracteres"
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Confirmar Palavra-passe
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repetir palavra-passe"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-600 transition-colors"
                  />
                </div>
              </div>

              {/* Força da senha */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          password.length >= i * 3
                            ? i <= 1 ? 'bg-rose-500' : i <= 2 ? 'bg-amber-500' : i <= 3 ? 'bg-yellow-400' : 'bg-emerald-500'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {password.length < 6 ? 'Muito curta' : password.length < 9 ? 'Fraca' : password.length < 12 ? 'Média' : 'Forte'}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !sessionReady}
                className="flex w-full h-11 items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-cyan-600 shadow-md transition-all disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Atualizando...' : 'Atualizar Palavra-passe'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
