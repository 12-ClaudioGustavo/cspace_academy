'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { 
  Inscricao, 
  Curso, 
  Perfil, 
  getExerciseResponses, 
  RespostaExercicio, 
  getLessons
} from '@/lib/db'
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  XCircle, 
  Library, 
  AlertCircle,
  LayoutDashboard,
  LogOut,
  Award,
  User,
  Settings,
  HelpCircle,
  TrendingUp,
  AwardIcon,
  BookOpenCheck,
  Search,
  Check,
  Download,
  Printer,
  Calendar,
  Menu,
  X
} from 'lucide-react'

interface StudentDashboardProps {
  user: Perfil
  enrollments: Inscricao[]
  catalog: Curso[]
  logout: () => void | Promise<void>
}

// Interface auxiliar para controlar o progresso do aluno em cada curso
interface CursoProgresso {
  cursoId: string
  totalAulas: number
  aulasConcluidas: number
  percentual: number
  allCorrect: boolean // true apenas se TODOS os exercícios foram respondidos corretamente
}

export default function StudentDashboard({ user, enrollments, catalog, logout }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'cursos' | 'catalogo' | 'certificados' | 'perfil'>('overview')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [exerciseResponses, setExerciseResponses] = useState<RespostaExercicio[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, CursoProgresso>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingProgress, setLoadingProgress] = useState(true)
  const [selectedCertificate, setSelectedCertificate] = useState<{ curso: Curso; data: string } | null>(null)
  
  // Perfil mock form states
  const [profileName, setProfileName] = useState(user.nome)
  const [supportMessage, setSupportMessage] = useState('')
  const [isSaved, setIsSaved] = useState(false)
  const [isTicketSent, setIsTicketSent] = useState(false)

  // Carregar dados de respostas e calcular progresso dinâmico
  useEffect(() => {
    async function loadStudentData() {
      try {
        const responses = await getExerciseResponses(user.id)
        setExerciseResponses(responses)

        // Calcula o progresso para cada matrícula aprovada
        const newProgressMap: Record<string, CursoProgresso> = {}
        const approvedEnrollments = enrollments.filter(e => e.status === 'aprovado')

        for (const enroll of approvedEnrollments) {
          const listAulas = await getLessons(enroll.curso_id)
          const totalAulas = listAulas.length

          // Uma aula é considerada concluída se o aluno respondeu CORRETAMENTE a todos os exercícios,
          // ou se a aula não possui exercícios (assume-se como assistida automaticamente)
          let aulasConcluidas = 0
          let hasAnyIncorrect = false

          listAulas.forEach(aula => {
            const hasExercises = aula.exercicios && aula.exercicios.length > 0
            if (!hasExercises) {
              // Aula sem exercícios: contada automaticamente
              aulasConcluidas++
            } else {
              const exercisesIds = aula.exercicios?.map(ex => ex.id) || []
              // Todos os exercícios devem estar respondidos E corretos
              const allAnsweredCorrectly = exercisesIds.length > 0 && exercisesIds.every(exId => {
                const resp = responses.find(r => r.exercicio_id === exId)
                return resp?.correta === true
              })
              if (allAnsweredCorrectly) {
                aulasConcluidas++
              } else {
                hasAnyIncorrect = true
              }
            }
          })

          const percentual = totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0
          newProgressMap[enroll.curso_id] = {
            cursoId: enroll.curso_id,
            totalAulas,
            aulasConcluidas,
            percentual,
            allCorrect: percentual === 100 && !hasAnyIncorrect
          }
        }

        setProgressMap(newProgressMap)
      } catch (err) {
        console.error('Erro ao carregar dados do aluno:', err)
      } finally {
        setLoadingProgress(false)
      }
    }

    loadStudentData()
  }, [user.id, enrollments])

  // Contagem de cursos
  const activeEnrollments = enrollments.filter(e => e.status === 'aprovado')
  const pendingEnrollments = enrollments.filter(e => e.status === 'pendente')
  const rejectedEnrollments = enrollments.filter(e => e.status === 'rejeitado')
  
  // Cursos concluídos: 100% de progresso E todos os exercícios respondidos corretamente
  const completedCourses = activeEnrollments.filter(e => {
    const prog = progressMap[e.curso_id]
    return prog && prog.percentual === 100 && prog.allCorrect
  })

  // Manipular salvar configurações do perfil
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  // Manipular envio de suporte
  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supportMessage.trim()) return
    setIsTicketSent(true)
    setSupportMessage('')
    setTimeout(() => setIsTicketSent(false), 4000)
  }

  // Filtrar catálogo de cursos
  const filteredCatalog = catalog.filter(c => 
    c.titulo.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.descricao.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-screen overflow-hidden bg-[#070b13] text-slate-100 flex font-sans">
      
      {/* MOBILE SIDEBAR DRAWER */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Drawer Content */}
          <aside className="relative flex flex-col w-72 max-w-[80vw] h-full bg-[#0c1220] border-r border-slate-800 p-6 space-y-6 shadow-2xl animate-fade-in">
            <button 
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <Logo height="h-7" />
              <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Aluno
              </span>
            </div>

            {/* Identificação do Aluno */}
            <div className="bg-[#070b13]/60 p-4 rounded-xl border border-slate-850 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Perfil do Estudante</p>
              <h4 className="text-xs font-bold text-white truncate">{profileName}</h4>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>

            {/* Links de Navegação */}
            <nav className="flex-1 space-y-1.5 text-xs font-semibold">
              <button
                onClick={() => {
                  setActiveTab('overview')
                  setMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'overview' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                    : 'text-slate-400 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Visão Geral</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('cursos')
                  setMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'cursos' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                    : 'text-slate-400 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Meus Cursos ({activeEnrollments.length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('catalogo')
                  setMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'catalogo' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                    : 'text-slate-405 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <Library className="w-4 h-4" />
                <span>Explorar Cursos</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('certificados')
                  setMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'certificados' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                    : 'text-slate-404 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Certificados</span>
                {completedCourses.length > 0 ? (
                  <span className="ml-auto text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                    {completedCourses.length}
                  </span>
                ) : (
                  <span className="ml-auto opacity-50">🔒</span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab('perfil')
                  setMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'perfil' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                    : 'text-slate-404 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Perfil & Configurações</span>
              </button>
            </nav>

            {/* Logout */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  logout()
                  setMobileSidebarOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-350 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Terminar Sessão</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0c1220] border-r border-slate-800 p-6 space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
          <Logo height="h-7" />
          <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Aluno
          </span>
        </div>

        {/* Identificação do Aluno */}
        <div className="bg-[#070b13]/60 p-4 rounded-xl border border-slate-850 space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Perfil do Estudante</p>
          <h4 className="text-xs font-bold text-white truncate">{profileName}</h4>
          <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 space-y-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'overview' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => setActiveTab('cursos')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'cursos' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Meus Cursos ({activeEnrollments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('catalogo')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'catalogo' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>Explorar Cursos</span>
          </button>

          <button
            onClick={() => setActiveTab('certificados')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'certificados' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Certificados</span>
            {completedCourses.length > 0 ? (
              <span className="ml-auto text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                {completedCourses.length}
              </span>
            ) : (
              <span className="ml-auto opacity-50">🔒</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('perfil')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'perfil' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                : 'text-slate-400 hover:bg-slate-850 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Perfil & Configurações</span>
          </button>
        </nav>

        {/* Logout */}
        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER */}
        <header className="bg-[#0c1220] border-b border-slate-800 py-4 px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg cursor-pointer border-0"
              title="Abrir Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="md:hidden">
              <Logo height="h-6" />
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider hidden md:block">
              {activeTab === 'overview' && 'Painel Geral do Aluno'}
              {activeTab === 'cursos' && 'Minhas Inscrições & Aulas'}
              {activeTab === 'catalogo' && 'Catálogo de Formação'}
              {activeTab === 'certificados' && 'Meus Certificados Académicos'}
              {activeTab === 'perfil' && 'Gerenciar Conta & Suporte'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Voltar ao Site
            </Link>
            <span className="h-4 w-px bg-slate-800" />
            <span className="text-[10px] bg-slate-855 text-slate-350 font-bold px-2 py-1 rounded-lg border border-slate-700 uppercase tracking-wider">
              🎓 {user.role}
            </span>
            <button
              onClick={logout}
              className="md:hidden p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-lg cursor-pointer"
              title="Terminar Sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* NAVEGAÇÃO DE TABS MOBILE */}
        <div className="md:hidden flex overflow-x-auto bg-[#0c1220]/80 border-b border-slate-850 p-2 gap-1.5 scrollbar-none">
          {[
            { id: 'overview', label: 'Painel' },
            { id: 'cursos', label: 'Cursos' },
            { id: 'catalogo', label: 'Catálogo' },
            { id: 'certificados', label: 'Certificados' },
            { id: 'perfil', label: 'Perfil' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-900/60 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTAINER DO FLUXO PRINCIPAL */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 max-w-7xl w-full mx-auto">
          
          {/* TAB 1: VISÃO GERAL */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Card de Boas-vindas Premium */}
              <div className="relative p-6 md:p-8 bg-gradient-to-r from-indigo-900/40 via-[#0c1220] to-[#0c1220] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="relative z-10 max-w-xl space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-400/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                    Bem-vindo de volta
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-white">Olá, {profileName}!</h3>
                  <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                    Você tem <strong className="text-white">{activeEnrollments.length} curso(s) ativo(s)</strong> em sua conta. Continue o seu aprendizado de onde parou ou explore novas matérias no catálogo.
                  </p>
                </div>
              </div>

              {/* Estatísticas Rápidas */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 bg-[#0c1220] border border-slate-800 rounded-2xl flex items-center justify-between shadow-2xl relative overflow-hidden group">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cursos Ativos</p>
                    <h3 className="text-xl font-black text-white">{activeEnrollments.length}</h3>
                  </div>
                  <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-400 border border-indigo-500/15">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-[#0c1220] border border-slate-800 rounded-2xl flex items-center justify-between shadow-2xl relative overflow-hidden group">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inscrições Pendentes</p>
                    <h3 className="text-xl font-black text-white">{pendingEnrollments.length}</h3>
                  </div>
                  <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-400 border border-amber-500/15">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-[#0c1220] border border-slate-800 rounded-2xl flex items-center justify-between shadow-2xl relative overflow-hidden group">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cursos Concluídos</p>
                    <h3 className="text-xl font-black text-white">{completedCourses.length}</h3>
                  </div>
                  <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/15">
                    <BookOpenCheck className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-[#0c1220] border border-slate-800 rounded-2xl flex items-center justify-between shadow-2xl relative overflow-hidden group">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exercícios Resolvidos</p>
                    <h3 className="text-xl font-black text-white">{exerciseResponses.length}</h3>
                  </div>
                  <div className="bg-cyan-500/10 p-2.5 rounded-xl text-cyan-400 border border-cyan-500/15">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Seção Continuar Aprendizado */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Meu Progresso nos Cursos</h4>
                
                {activeEnrollments.length === 0 ? (
                  <div className="p-6 text-center bg-[#0c1220] border border-slate-800 rounded-2xl">
                    <p className="text-xs text-slate-500">Nenhum curso ativo no momento. Inscreva-se em um curso na aba Catálogo!</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {activeEnrollments.map((enroll) => {
                      const prog = progressMap[enroll.curso_id] || { percentual: 0, totalAulas: 0, aulasConcluidas: 0 }
                      return (
                        <div 
                          key={enroll.id}
                          className="p-5 bg-[#0c1220] border border-slate-800 rounded-2xl space-y-4 shadow-xl flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] uppercase font-semibold text-slate-500">Curso em Andamento</span>
                              <span className="text-[10px] font-bold text-indigo-400">{prog.percentual}% Concluído</span>
                            </div>
                            <h5 className="text-xs font-bold text-white line-clamp-1">{enroll.curso?.titulo}</h5>
                            
                            {/* Barra de Progresso */}
                            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
                                style={{ width: `${prog.percentual}%` }}
                              />
                            </div>

                            <p className="text-[10px] text-slate-500">
                              {prog.aulasConcluidas} de {prog.totalAulas} aulas concluídas
                            </p>
                          </div>

                          <div className="pt-2">
                            <Link
                              href={`/cursos/${enroll.curso_id}`}
                              className="flex items-center justify-center gap-1 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-650/15"
                            >
                              <span>Ir para Aula</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MEUS CURSOS */}
          {activeTab === 'cursos' && (
            <div className="space-y-6">
              
              {/* Filtro ou Categoria */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Minhas Matrículas Académicas</h3>
                <span className="text-[10px] bg-slate-850 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
                  Total: {enrollments.length}
                </span>
              </div>

              {enrollments.length === 0 ? (
                <div className="p-8 text-center bg-[#0c1220] border border-slate-800 rounded-2xl max-w-lg mx-auto">
                  <BookOpen className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
                  <h4 className="font-semibold text-slate-200">Sem inscrições ativas</h4>
                  <p className="text-xs text-slate-500 mt-1">Navegue até a aba Explorar Cursos para solicitar a sua primeira matrícula!</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {enrollments.map((enroll) => {
                    const prog = progressMap[enroll.curso_id] || { percentual: 0 }
                    return (
                      <div 
                        key={enroll.id}
                        className="bg-[#0c1220] border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between"
                      >
                        {/* Imagem de Capa com Filtro */}
                        <div className="h-32 w-full bg-slate-900 relative">
                          <img src={enroll.curso?.capa_url} alt={enroll.curso?.titulo} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-[#070b13]/40" />
                          
                          {/* Badge de Status */}
                          <div className="absolute top-3 right-3">
                            {enroll.status === 'aprovado' && (
                              <span className="px-2 py-0.5 text-[8px] font-bold bg-emerald-500 text-white rounded-full">Ativo</span>
                            )}
                            {enroll.status === 'pendente' && (
                              <span className="px-2 py-0.5 text-[8px] font-bold bg-amber-500 text-white rounded-full">Aguardando IBAN</span>
                            )}
                            {enroll.status === 'rejeitado' && (
                              <span className="px-2 py-0.5 text-[8px] font-bold bg-rose-500 text-white rounded-full">Recusado</span>
                            )}
                          </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-bold text-white line-clamp-1">{enroll.curso?.titulo}</h4>
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{enroll.curso?.descricao}</p>
                          </div>

                          {enroll.status === 'aprovado' && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold">
                                <span>Progresso</span>
                                <span>{prog.percentual}%</span>
                              </div>
                              <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${prog.percentual}%` }} />
                              </div>
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-800/80">
                            {enroll.status === 'aprovado' ? (
                              <Link
                                href={`/cursos/${enroll.curso_id}`}
                                className="flex items-center justify-center gap-1 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                <span>Entrar na Aula</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            ) : enroll.status === 'pendente' ? (
                              <div className="text-center py-2 text-[10px] font-bold text-amber-500 bg-amber-500/5 rounded-xl border border-amber-500/10">
                                Matrícula sob verificação do Admin
                              </div>
                            ) : (
                              <Link
                                href={`/cursos/${enroll.curso_id}`}
                                className="flex items-center justify-center gap-1 w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                <span>Reenviar Comprovante</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXPLORAR CATÁLOGO */}
          {activeTab === 'catalogo' && (
            <div className="space-y-6">
              
              {/* Barra de Pesquisa */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#0c1220] p-4 border border-slate-800 rounded-2xl shadow-xl">
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por cursos disponíveis..."
                    className="block w-full pl-10 pr-4 py-2 bg-[#070b13] border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-slate-200"
                  />
                </div>
              </div>

              {filteredCatalog.length === 0 ? (
                <div className="p-8 text-center bg-[#0c1220] border border-slate-800 rounded-2xl">
                  <p className="text-xs text-slate-500">Nenhum novo curso encontrado para a sua pesquisa.</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredCatalog.map((course) => (
                    <div 
                      key={course.id}
                      className="bg-[#0c1220] border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/20 transition-all flex flex-col justify-between"
                    >
                      <div className="h-32 w-full bg-slate-900 relative">
                        <img src={course.capa_url} alt={course.titulo} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-[#070b13]/30" />
                        <span className="absolute bottom-3 left-3 bg-indigo-600 text-white font-black text-[9px] px-2 py-0.5 rounded shadow-lg uppercase tracking-wider">
                          {course.preco > 0 ? `${course.preco.toLocaleString()} AOA` : 'Gratuito'}
                        </span>
                      </div>

                      <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-white line-clamp-1">{course.titulo}</h4>
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{course.descricao}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80">
                          <Link
                            href={`/cursos/${course.id}`}
                            className="flex items-center justify-center gap-1 w-full py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <span>Ver Detalhes / Inscrever-se</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CERTIFICADOS */}
          {activeTab === 'certificados' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Meus Certificados de Conclusão</h3>
                <span className="text-[10px] bg-slate-850 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
                  Emitidos: {completedCourses.length}
                </span>
              </div>

              {completedCourses.length === 0 ? (
                <div className="p-8 text-center bg-[#0c1220] border border-slate-800 rounded-2xl max-w-lg mx-auto space-y-4">
                  <div className="h-14 w-14 rounded-full bg-slate-800/80 text-slate-600 flex items-center justify-center mx-auto border border-slate-700">
                    <AwardIcon className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-200">Nenhum certificado disponível ainda</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Para receber o certificado de conclusão, é necessário:
                    </p>
                  </div>
                  <ul className="text-left space-y-2 text-xs text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">①</span>
                      <span>Ter matrícula <strong className="text-slate-300">aprovada</strong> num curso</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">②</span>
                      <span>Assistir a <strong className="text-slate-300">todas as aulas</strong> do curso</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">③</span>
                      <span>Responder <strong className="text-slate-300">corretamente</strong> a <strong className="text-slate-300">todos os exercícios</strong> de todas as aulas (100% aprovado)</span>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {completedCourses.map((enroll) => (
                    <div 
                      key={enroll.id}
                      className="p-5 bg-gradient-to-br from-indigo-950/20 to-[#0c1220] border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400 border border-indigo-500/15 w-fit">
                          <Award className="w-5 h-5" />
                        </div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{enroll.curso?.titulo}</h4>
                        <p className="text-[10px] text-slate-500">Concluído em: {new Date(enroll.data_aprovacao || enroll.data_solicitacao).toLocaleDateString()}</p>
                      </div>

                      <button
                        onClick={() => setSelectedCertificate({
                          curso: enroll.curso!,
                          data: new Date(enroll.data_aprovacao || enroll.data_solicitacao).toLocaleDateString('pt-AO')
                        })}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer shrink-0"
                      >
                        Visualizar Certificado
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PERFIL & CONFIGURAÇÕES */}
          {activeTab === 'perfil' && (
            <div className="grid gap-8 lg:grid-cols-3 items-start">
              
              {/* Informações Pessoais Form */}
              <div className="lg:col-span-2 p-6 bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
                  Dados Cadastrais
                </h3>

                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 uppercase">E-mail de Acesso</label>
                      <input
                        type="email"
                        disabled
                        value={user.email}
                        className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Função / Cargo</label>
                      <span className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl text-slate-400 font-semibold uppercase">
                        🎓 {user.role}
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Membro desde</label>
                      <span className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl text-slate-400 font-semibold">
                        {new Date(user.criado_em).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {isSaved && (
                    <p className="text-[10px] text-emerald-450 font-bold flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>Configurações salvas com sucesso!</span>
                    </p>
                  )}

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </form>
              </div>

              {/* Suporte & FAQ */}
              <div className="p-6 bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-400" />
                  <span>Central de Suporte</span>
                </h3>

                <div className="space-y-4 text-xs">
                  <form onSubmit={handleSendTicket} className="space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Enviar Mensagem ao Admin</label>
                      <textarea
                        rows={3}
                        required
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        placeholder="Descreva a sua dúvida ou problema técnico..."
                        className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-200"
                      />
                    </div>

                    {isTicketSent && (
                      <p className="text-[10px] text-indigo-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Mensagem enviada! Retornaremos por email.</span>
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl font-semibold transition-all cursor-pointer"
                    >
                      Enviar Dúvida
                    </button>
                  </form>

                  <div className="pt-2 space-y-2 border-t border-slate-800/80">
                    <p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Perguntas Frequentes</p>
                    <div className="space-y-1.5 text-[11px] leading-relaxed">
                      <details className="bg-[#070b13] border border-slate-850 p-2 rounded-lg cursor-pointer">
                        <summary className="font-semibold text-slate-300">Como funciona a liberação de matrícula?</summary>
                        <p className="text-slate-500 mt-1">Após solicitar a inscrição e anexar o comprovante de pagamento, o Administrador valida o comprovante e seu curso é liberado em até 24 horas.</p>
                      </details>
                      <details className="bg-[#070b13] border border-slate-850 p-2 rounded-lg cursor-pointer">
                        <summary className="font-semibold text-slate-300">Como obtenho o meu certificado?</summary>
                        <p className="text-slate-500 mt-1">Você precisa assistir a todas as aulas do curso e responder a todos os questionários. Quando o progresso atingir 100%, ele ficará disponível para emissão na aba correspondente.</p>
                      </details>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* MODAL DE LEITOR/GERADOR DE CERTIFICADO */}
      {selectedCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-3xl w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedCertificate(null)}
              className="absolute top-4 right-4 p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>

            {/* Imagem/Esqueleto Visual do Certificado para Impressão */}
            <div 
              id="certificado-imprimir"
              className="border-8 border-double border-amber-600/40 bg-gradient-to-b from-[#111827] to-[#0c1220] p-8 md:p-12 text-center space-y-6 rounded-2xl relative shadow-inner overflow-hidden select-none"
            >
              {/* Ornamentos de Canto */}
              <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-600/30" />
              <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-600/30" />
              <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-600/30" />
              <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-600/30" />

              <div className="flex justify-center mb-4">
                <Logo height="h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Certificado de Conclusão</span>
                <p className="text-[10px] text-slate-400">Pelo presente documento certifica-se que</p>
              </div>

              <h2 className="text-lg md:text-2xl font-black text-white capitalize border-b border-slate-800 pb-2 w-fit mx-auto px-6">
                {profileName}
              </h2>

              <p className="text-[11px] text-slate-355 max-w-md mx-auto leading-relaxed">
                concluiu com êxito a formação profissional em <strong className="text-white font-bold">{selectedCertificate.curso.titulo}</strong> com aproveitamento pleno nas avaliações teóricas e práticas integradas ao sistema LMS.
              </p>

              <div className="flex items-center justify-between pt-6 max-w-sm mx-auto gap-4">
                <div className="text-center">
                  <div className="h-0.5 w-24 bg-slate-800 mx-auto mb-1.5" />
                  <p className="text-[8px] font-bold text-slate-500 uppercase">C-Space Academy</p>
                  <p className="text-[7px] text-slate-600">Entidade Certificadora</p>
                </div>
                <div className="text-center space-y-0.5">
                  <div className="bg-amber-600/10 border border-amber-600/20 text-amber-500 text-[8px] font-bold px-2 py-1 rounded w-fit mx-auto uppercase tracking-wider">
                    VALIDADO
                  </div>
                  <p className="text-[7px] text-slate-500">Emitido em {selectedCertificate.data}</p>
                </div>
              </div>
            </div>

            {/* Ações do Certificado */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-750 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / PDF</span>
              </button>
              <button
                onClick={() => setSelectedCertificate(null)}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-650/15 cursor-pointer"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
