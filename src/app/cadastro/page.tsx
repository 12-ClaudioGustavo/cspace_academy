'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { User, Mail, Lock, AlertCircle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react'

export default function RegisterPage() {
  const { isDemo, refreshUser } = useAuth()
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)

    if (isDemo) {
      // Simulação no Modo Demo: Cria sessão local fictícia do aluno
      const mockStudent = {
        id: `user-aluno-${Math.random().toString(36).substring(2, 9)}`,
        nome,
        email,
        role: 'aluno' as const,
        criado_em: new Date().toISOString()
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('cspace_user', JSON.stringify(mockStudent))
      }
      window.location.href = '/'
      setLoading(false)
      return
    }

    // Cadastro Real com Supabase
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://cspace-academy.vercel.app/',
          data: {
            nome: nome,
            role: 'aluno'
          }
        }
      })

      if (authError) {
        setError(authError.message)
      } else {
        // Mostra ecrã de confirmação de email
        setAwaitingConfirmation(true)
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setResent(false)
    try {
      const supabase = createClient()
      await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: 'https://cspace-academy.vercel.app/'
        }
      })
      setResent(true)
      setTimeout(() => setResent(false), 5000)
    } catch (err) {
      console.error('Erro ao reenviar email:', err)
    } finally {
      setResending(false)
    }
  }

  // Ecrã de confirmação de email
  if (awaitingConfirmation) {
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

          <div className="bg-[#0c1220] rounded-2xl border border-slate-800 shadow-2xl p-8 text-center space-y-6">
            {/* Ícone animado */}
            <div className="relative flex items-center justify-center mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-indigo-500/10 border border-indigo-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/15 border border-indigo-500/25">
                <Mail className="w-7 h-7 text-indigo-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Confirme o seu email</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Enviámos um link de confirmação para{' '}
                <strong className="text-white">{email}</strong>.{' '}
                Clique no link para ativar a sua conta.
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-left space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">①</span>
                <span>Abra o seu email em <strong className="text-slate-300">{email}</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">②</span>
                <span>Procure um email da <strong className="text-slate-300">C-Space Academy</strong> (verifique o spam)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">③</span>
                <span>Clique em <strong className="text-slate-300">"Confirmar email"</strong> para ativar a conta</span>
              </div>
            </div>

            {/* Botão reenviar */}
            <div className="space-y-3 pt-1">
              {resent ? (
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Email reenviado!
                </div>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-colors border border-slate-700 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Reenviando...' : 'Reenviar Email de Confirmação'}
                </button>
              )}

              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 w-full py-2.5 text-sm font-semibold text-slate-400 hover:text-indigo-400 transition-colors"
              >
                Já confirmei, ir para o Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#070b13] px-6 py-12 font-sans transition-colors duration-300">
      
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-20 pointer-events-none">
        <div className="w-[450px] h-[450px] bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8 backdrop-blur-md">
        
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="mb-3">
            <Logo height="h-10 sm:h-12 md:h-14" />
          </Link>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Crie a sua conta de aluno</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Inscreva-se gratuitamente para começar a aprender</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Nome Completo
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <User className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Cláudio Cajado"
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-cyan-500 text-slate-800 dark:text-slate-200 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Endereço de E-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="h-4.5 w-4.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu-email@cspace.ao"
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-cyan-500 text-slate-800 dark:text-slate-200 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Palavra-passe
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 caracteres"
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-cyan-500 text-slate-800 dark:text-slate-200 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Confirmar Palavra-passe
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a palavra-passe"
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-cyan-500 text-slate-800 dark:text-slate-200 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full h-11 items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-cyan-600 shadow-md transition-all active:scale-98 disabled:opacity-50"
          >
            <span>{loading ? 'Criando Conta...' : 'Criar Conta de Estudante'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
          Já possui cadastro académico?{' '}
          <Link href="/login" className="font-semibold text-indigo-600 dark:text-cyan-400 hover:underline">
            Entrar aqui
          </Link>
        </div>
      </div>
    </div>
  )
}
