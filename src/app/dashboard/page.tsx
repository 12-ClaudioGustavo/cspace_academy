'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getEnrollments, getCourses, Inscricao, Curso } from '@/lib/db'
import ProfessorDashboard from '@/components/ProfessorDashboard'
import StudentDashboardView from '@/components/StudentDashboard'

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<Inscricao[]>([])
  const [catalog, setCatalog] = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user && user.role === 'admin') {
      router.push('/admin')
      return
    }

    async function loadDashboardData() {
      if (!user) return
      try {
        const myEnrollments = await getEnrollments(user.id)
        const allCourses = await getCourses()
        
        setEnrollments(myEnrollments)
        
        // Filtra cursos do catálogo onde o aluno não está matriculado
        const enrolledIds = myEnrollments.map(e => e.curso_id)
        const notEnrolled = allCourses.filter(c => !enrolledIds.includes(c.id))
        setCatalog(notEnrolled)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadDashboardData()
    }
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b13]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (user && user.role === 'professor') {
    return <ProfessorDashboard user={user} logout={logout} />
  }

  if (user && user.role === 'aluno') {
    return (
      <StudentDashboardView
        user={user}
        enrollments={enrollments}
        catalog={catalog}
        logout={logout}
      />
    )
  }

  return null
}
