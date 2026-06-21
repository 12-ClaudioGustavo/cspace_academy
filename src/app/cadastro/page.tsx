'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { User, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  const { isDemo, refreshUser } = useAuth()
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.')
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
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://cspace-academy.vercel.app/',
          data: {
            nome: nome,
            role: 'aluno' // Cadastrado por padrão como aluno
          }
        }
      })

      if (authError) {
        setError(authError.message)
      } else {
        await refreshUser()
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.')
    } finally {
      setLoading(false)
    }
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
