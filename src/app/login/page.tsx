'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/Logo'
import { Mail, Lock, AlertCircle, ArrowRight, HelpCircle } from 'lucide-react'

export default function LoginPage() {
  const { isDemo, loginAsStudent, loginAsAdmin, refreshUser } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (isDemo) {
      // Simulação em Modo Demo
      if (email.includes('admin')) {
        loginAsAdmin()
      } else {
        loginAsStudent()
      }
      router.push('/')
      setLoading(false)
      return
    }

    // Login Real com Supabase
    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        setError(authError.message)
      } else {
        await refreshUser()
        // Verifica se é admin para redirecionar para a rota certa
        const { data: perfil } = await supabase
          .from('perfis')
          .select('role')
          .eq('id', data.user.id)
          .single()
        
        if (perfil?.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
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
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Seja bem-vindo de volta</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Insira os seus dados de acesso</p>
        </div>


        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="exemplo@cspace.ao"
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-cyan-500 text-slate-800 dark:text-slate-200 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Palavra-passe
              </label>
              <Link href="/recuperar-senha" className="text-[10px] font-semibold text-indigo-600 dark:text-cyan-400 hover:underline">
                Esqueceu a palavra-passe?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-cyan-500 text-slate-800 dark:text-slate-200 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full h-11 items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-cyan-600 shadow-md transition-all active:scale-98 disabled:opacity-50"
          >
            <span>{loading ? 'Entrando...' : 'Entrar na Plataforma'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
          Não tem uma conta acadêmica?{' '}
          <Link href="/cadastro" className="font-semibold text-indigo-600 dark:text-cyan-400 hover:underline">
            Cadastre-se grátis
          </Link>
        </div>
      </div>
    </div>
  )
}
