'use client'

import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Shield, User, LogOut, Code, AlertTriangle } from 'lucide-react'

export function DemoWidget() {
  const { user, isDemo, loginAsStudent, loginAsAdmin, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (!isDemo) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Botão de Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full shadow-lg hover:from-amber-600 hover:to-orange-700 transition-all transform hover:scale-105 font-medium text-sm border border-amber-400/20"
      >
        <AlertTriangle className="w-4 h-4" />
        <span>Painel de Testes (Modo Demo)</span>
      </button>

      {/* Conteúdo do Menu */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 transition-all">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <Code className="w-5 h-5 text-amber-500" />
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Painel de Simulação</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Banco de dados local ativado</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Estado Atual:
            </div>
            {user ? (
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-3 border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{user.nome}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{user.email}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 text-[9px] font-bold rounded-full ${
                  user.role === 'admin' 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                }`}>
                  {user.role.toUpperCase()}
                </span>
              </div>
            ) : (
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-3 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                Usuário não autenticado (Visitante)
              </div>
            )}

            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Simular Perfis:
            </div>
            <button
              onClick={() => { loginAsStudent(); setIsOpen(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <User className="w-4 h-4 text-indigo-500" />
              <span>Entrar como Aluno</span>
            </button>

            <button
              onClick={() => { loginAsAdmin(); setIsOpen(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Entrar como Administrador</span>
            </button>

            {user && (
              <button
                onClick={() => { logout(); setIsOpen(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors mt-2 border-t border-slate-100 dark:border-slate-800 pt-3"
              >
                <LogOut className="w-4 h-4" />
                <span>Desconectar / Sair</span>
              </button>
            )}
          </div>
          
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
            Para testar dados persistidos em nuvem, configure o arquivo <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-amber-600 font-mono">.env.local</code>.
          </div>
        </div>
      )}
    </div>
  )
}
