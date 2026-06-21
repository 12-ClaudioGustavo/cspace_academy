'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Perfil, getLoggedUser, setLoggedUser, isSupabaseConfigured } from '@/lib/db'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: Perfil | null
  loading: boolean
  isDemo: boolean
  loginAsStudent: () => void
  loginAsAdmin: () => void
  logout: () => void
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(true)

  const refreshUser = async () => {
    setLoading(true)
    const configured = isSupabaseConfigured()
    setIsDemo(!configured)

    if (configured) {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Busca perfil do banco real
        const { data: perfil } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', session.user.id)
          .single()
          
        if (perfil) {
          setUserState(perfil as Perfil)
        } else {
          setUserState({
            id: session.user.id,
            nome: session.user.user_metadata.nome || 'Estudante',
            email: session.user.email || '',
            role: (session.user.user_metadata.role as any) || 'aluno',
            criado_em: session.user.created_at
          })
        }
      } else {
        setUserState(null)
      }
    } else {
      // Modo Demo
      setUserState(getLoggedUser())
    }
    setLoading(false)
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const loginAsStudent = () => {
    if (!isDemo) return
    const student: Perfil = {
      id: 'user-aluno-1',
      nome: 'Cláudio Cajado',
      email: 'claudio@cspace.ao',
      role: 'aluno',
      criado_em: new Date().toISOString()
    }
    setLoggedUser(student)
    setUserState(student)
    window.location.reload()
  }

  const loginAsAdmin = () => {
    if (!isDemo) return
    const admin: Perfil = {
      id: 'user-admin-1',
      nome: 'Admin C-Space',
      email: 'admin@cspace.ao',
      role: 'admin',
      criado_em: new Date().toISOString()
    }
    setLoggedUser(admin)
    setUserState(admin)
    window.location.reload()
  }

  const logout = async () => {
    if (!isDemo) {
      const supabase = createClient()
      await supabase.auth.signOut()
    } else {
      setLoggedUser(null)
    }
    setUserState(null)
    window.location.reload()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemo,
        loginAsStudent,
        loginAsAdmin,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
