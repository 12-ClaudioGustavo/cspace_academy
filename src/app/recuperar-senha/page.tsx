'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/db'
import { Logo } from '@/components/Logo'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Send } from 'lucide-react'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDemo = !isSupabaseConfigured()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isDemo) {
      setError('Esta funcionalidade requer o Supabase configurado. Em modo demonstração o envio de email não está disponível.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://cspace-academy.vercel.app/atualizar-senha'
      })

      if (authError) {
        setError(authError.message)
      } else {
        setSent(true)
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b13] px-6 py-12 font-sans">
      
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-15 pointer-events-none">
        <div className="w-[400px] h-[400px] bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="mb-3">
            <Logo height="h-10 sm:h-12" />
          </Link>
        </div>

        {sent ? (
          /* Estado de Sucesso */
          <div className="bg-[#0c1220] rounded-2xl border border-slate-800 shadow-2xl p-8 text-center space-y-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">Email enviado!</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Enviámos um link de recuperação para{' '}
                <strong className="text-white">{email}</strong>.
                <br />
                Verifique a sua caixa de entrada (e a pasta de spam).
              </p>
            </div>
            <div className="pt-2 space-y-3">
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-colors border border-slate-700"
              >
                Enviar para outro email
              </button>
              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 w-full py-2.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Login
              </Link>
            </div>
          </div>
        ) : (
          /* Formulário */
          <div className="bg-[#0c1220] rounded-2xl border border-slate-800 shadow-2xl p-8">
            <div className="mb-7 space-y-1.5">
              <h2 className="text-xl font-bold text-white">Esqueceu a palavra-passe?</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Introduza o seu email académico e enviaremos um link para redefinir a sua palavra-passe.
              </p>
            </div>

            {isDemo && (
              <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Modo Demonstração: o envio de emails requer o Supabase Auth configurado no <code className="bg-amber-500/20 px-1 rounded">.env.local</code>.</span>
              </div>
            )}

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Endereço de E-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@cspace.ao"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-600 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full h-11 items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-cyan-600 shadow-md transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Enviando...' : 'Enviar Link de Recuperação'}</span>
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
