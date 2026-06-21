'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { 
  getCourseById, 
  getLessons, 
  getLessonDetails, 
  getEnrollments, 
  submitExerciseResponse, 
  getExerciseResponses, 
  Curso, 
  Aula, 
  Inscricao,
  RespostaExercicio
} from '@/lib/db'
import { CustomLiveRoom } from '@/components/CustomLiveRoom'
import { 
  ArrowLeft, 
  BookOpen, 
  Video, 
  FileText, 
  CheckSquare, 
  Play, 
  Calendar, 
  User, 
  CheckCircle,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Menu,
  ChevronRight,
  Lock
} from 'lucide-react'

export default function ClassroomPage() {
  const { id: courseId, aulaId } = useParams() as { id: string; aulaId: string }
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [course, setCourse] = useState<Curso | null>(null)
  const [lessons, setLessons] = useState<Aula[]>([])
  const [currentLesson, setCurrentLesson] = useState<Aula | null>(null)
  const [enrollment, setEnrollment] = useState<Inscricao | null>(null)
  const [exerciseResponses, setExerciseResponses] = useState<RespostaExercicio[]>([])
  const [loading, setLoading] = useState(true)
  
  // Abas do Aluno
  const [activeTab, setActiveTab] = useState<'video' | 'material' | 'exercicios'>('video')
  
  // Controle de Live Forçada para Testes
  const [forceLive, setForceLive] = useState(false)

  // Leitor Interno de PDF
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null)
  const [activePdfTitle, setActivePdfTitle] = useState<string>('')

  // Controle de Respostas dos Exercícios
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({})
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, { answered: boolean; correct: boolean }>>({})

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    async function loadClassroom() {
      if (!user) return
      try {
        // 1. Carrega Curso
        const c = await getCourseById(courseId)
        if (!c) {
          router.push('/dashboard')
          return
        }
        setCourse(c)

        // 2. Valida Inscrição (Admin ignora validação de pagamento)
        const myEnrollments = await getEnrollments(user.id)
        const foundEnroll = myEnrollments.find(e => e.curso_id === courseId)
        setEnrollment(foundEnroll || null)

        if (user.role !== 'admin' && user.role !== 'professor' && (!foundEnroll || foundEnroll.status !== 'aprovado')) {
          router.push(`/cursos/${courseId}`)
          return
        }

        // 3. Lista de Aulas da Playlist
        const listLessons = await getLessons(courseId)
        setLessons(listLessons)

        // 4. Detalhes da Aula Atual (com materiais e exercícios)
        const lessonDetail = await getLessonDetails(aulaId)
        if (!lessonDetail) {
          // Se aula não existe, redireciona para a primeira do curso
          if (listLessons.length > 0) {
            router.push(`/cursos/${courseId}/aula/${listLessons[0].id}`)
          } else {
            router.push('/dashboard')
          }
          return
        }
        setCurrentLesson(lessonDetail)

        // 5. Histórico de Exercícios Respondidos
        const responses = await getExerciseResponses(user.id)
        setExerciseResponses(responses)

        // Carrega respostas salvas na interface
        const initialSubmissions: Record<string, { answered: boolean; correct: boolean }> = {}
        const initialSelections: Record<string, number> = {}
        
        lessonDetail.exercicios?.forEach(ex => {
          const resp = responses.find(r => r.exercicio_id === ex.id)
          if (resp) {
            initialSubmissions[ex.id] = { answered: true, correct: resp.correta }
            initialSelections[ex.id] = resp.resposta_aluno
          }
        })
        setSubmittedAnswers(initialSubmissions)
        setSelectedAnswers(initialSelections)

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadClassroom()
    }
  }, [user, authLoading, courseId, aulaId, router])

  useEffect(() => {
    setActivePdfUrl(null)
    setActivePdfTitle('')
  }, [aulaId])

  // Submeter Exercício
  const handleSubmitExercise = async (exId: string, correctIndex: number) => {
    if (!user || submittedAnswers[exId]?.answered) return

    const selectedIndex = selectedAnswers[exId]
    if (selectedIndex === undefined) return

    const isCorrect = selectedIndex === correctIndex

    try {
      await submitExerciseResponse(user.id, exId, selectedIndex, isCorrect)
      setSubmittedAnswers(prev => ({
        ...prev,
        [exId]: { answered: true, correct: isCorrect }
      }))
    } catch (err) {
      console.error(err)
    }
  }

  // Verifica se uma aula (qualquer) é uma live futura ainda bloqueada
  const isFutureLive = (lesson: Aula) => {
    if (!lesson.data_hora_live) return false
    if (user?.role !== 'aluno') return false
    const liveTime = new Date(lesson.data_hora_live).getTime()
    return new Date().getTime() < (liveTime - 15 * 60 * 1000)
  }

  // Verifica se o aluno está tentando entrar antes da hora da live ATUAL
  const isLessonLocked = () => {
    if (!currentLesson?.data_hora_live) return false
    if (user?.role !== 'aluno') return false // Professor e Admin sempre podem acessar
    
    const liveTime = new Date(currentLesson.data_hora_live).getTime()
    const now = new Date().getTime()
    
    // Bloqueia se faltar mais de 15 minutos para iniciar
    return now < (liveTime - 15 * 60 * 1000)
  }

  // Verifica se a live está acontecendo agora (ou agendada para hoje)
  const isLiveActive = () => {
    if (forceLive) return true
    if (!currentLesson?.data_hora_live) return false
    
    const liveTime = new Date(currentLesson.data_hora_live).getTime()
    const now = new Date().getTime()
    
    // Mostra o player se faltar 15 min ou se já tiver começado
    return now >= (liveTime - 15 * 60 * 1000) && now <= (liveTime + 3 * 60 * 60 * 1000)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (isLessonLocked()) {
    return (
      <div className="min-h-screen bg-[#070b13] text-slate-100 font-sans flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#0b101d] border border-slate-800/80 rounded-2xl p-8 shadow-2xl space-y-6 relative overflow-hidden animate-fade-in">
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />

          <div className="h-14 w-14 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              {course?.titulo}
            </span>
            <h2 className="text-lg font-bold text-white">
              {currentLesson?.titulo}
            </h2>
          </div>

          <div className="p-4 bg-[#070b13] border border-slate-850 rounded-xl space-y-3">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide block text-center">Transmissão Agendada</span>
            <p className="text-xs text-slate-350 leading-relaxed">
              Esta aula ao vivo está programada para iniciar em:<br />
              <strong className="text-white text-sm">{currentLesson?.data_hora_live ? new Date(currentLesson.data_hora_live).toLocaleString('pt-AO') : ''}</strong>
            </p>
            <p className="text-[10px] text-slate-550 leading-normal text-slate-400">
              O acesso aos materiais e à sala de transmissão será liberado automaticamente 15 minutos antes do início (às {currentLesson?.data_hora_live ? new Date(new Date(currentLesson.data_hora_live).getTime() - 15 * 60 * 1000).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }) : ''}).
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 font-sans flex flex-col">
      
      {/* Header da Aula */}
      <header className="bg-[#0b101d] border-b border-slate-800/80 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              {course?.titulo}
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1">
              {currentLesson?.titulo}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentLesson?.data_hora_live && (
            <span className="hidden sm:inline-flex items-center gap-1 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-[10px] font-semibold text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Agendada: {new Date(currentLesson.data_hora_live).toLocaleString('pt-AO')}
              </span>
            </span>
          )}
          <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-xl font-semibold">
            {user?.role === 'admin' ? '🧑‍💼 Professor / Admin' : '🧑‍🎓 Aluno'}
          </span>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Esquerda: Player de Vídeo / Jitsi / Abas */}
        <div className="flex-1 flex flex-col p-6 space-y-6 lg:overflow-y-auto lg:max-h-[calc(100vh-70px)]">
          
          {/* Box de Exibição de Conteúdo (Video/Live Room) */}
          <div className="w-full max-w-5xl mx-auto">
            
            {isLiveActive() ? (
              user && currentLesson ? (
                <CustomLiveRoom 
                  roomName={currentLesson.sala_live_id || `cspace-live-${currentLesson.id}`} 
                  user={user} 
                />
              ) : null
            ) : (
              // Estado Offline da Live
              <div className="w-full min-h-[380px] flex flex-col items-center justify-center p-8 text-center bg-[#090d16] rounded-2xl border border-slate-800 shadow-2xl">
                <Video className="w-12 h-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-bold text-slate-300">A aula ao vivo ainda não começou</h3>
                
                {currentLesson?.data_hora_live ? (
                  <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                    Esta aula tem uma transmissão programada para{' '}
                    <strong>{new Date(currentLesson.data_hora_live).toLocaleString('pt-AO')}</strong>. 
                    O acesso à sala será liberado 15 minutos antes.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                    Esta aula não possui transmissão ao vivo agendada. Consulte os materiais PDFs e realize os exercícios abaixo.
                  </p>
                )}

                {/* Botão de Bypass de Testes */}
                <button
                  onClick={() => setForceLive(true)}
                  className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Testar Live Integrada Agora (Modo Teste)</span>
                </button>
              </div>
            )}
          </div>

          {/* Abas e Materiais */}
          <div className="w-full max-w-5xl mx-auto bg-[#0a0f1d] border border-slate-800 rounded-2xl flex flex-col">
            
            {/* Navegação de Abas */}
            <div className="flex border-b border-slate-800 bg-[#070b13]">
              <button
                onClick={() => setActiveTab('video')}
                className={`flex-1 py-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'video' 
                    ? 'border-indigo-500 text-white bg-[#0a0f1d]' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Descrição da Aula
              </button>
              <button
                onClick={() => setActiveTab('material')}
                className={`flex-1 py-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'material' 
                    ? 'border-indigo-500 text-white bg-[#0a0f1d]' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Materiais ({currentLesson?.materiais?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('exercicios')}
                className={`flex-1 py-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'exercicios' 
                    ? 'border-indigo-500 text-white bg-[#0a0f1d]' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Exercícios ({currentLesson?.exercicios?.length || 0})
              </button>
            </div>

            {/* Conteúdo das Abas */}
            <div className="p-6">
              
              {/* Tab 1: Descrição */}
              {activeTab === 'video' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white">Sobre esta Aula</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {currentLesson?.descricao}
                  </p>
                  
                  {forceLive && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-xs text-amber-300">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
                      <div>
                        <span className="font-semibold">Modo Simulado de Live Ativo:</span>
                        <p className="mt-0.5">Está visualizando o nosso sistema próprio de transmissão WebRTC em tempo real. Para retornar ao visual offline, clique no botão para atualizar a página.</p>
                        <button 
                          onClick={() => { setForceLive(false); window.location.reload(); }}
                          className="mt-2 text-indigo-400 hover:underline font-bold"
                        >
                          Recarregar Aula
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

                {/* Tab 2: Materiais */}
                {activeTab === 'material' && (
                <div className="space-y-4">
                  {activePdfUrl ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-indigo-500/10 p-1.5 rounded-lg text-indigo-400">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white leading-tight">{activePdfTitle}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">Leitor de PDF Integrado</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={activePdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Visualizar em Nova Aba
                          </a>
                          <a
                            href={activePdfUrl}
                            download
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Baixar Original
                          </a>
                          <button
                            onClick={() => {
                              setActivePdfUrl(null)
                              setActivePdfTitle('')
                            }}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            Fechar Leitor
                          </button>
                        </div>
                      </div>
                      
                      {/* Leitor Interno */}
                      <div className="w-full h-[500px] sm:h-[650px] bg-[#070b13] rounded-2xl border border-slate-800/85 shadow-2xl">
                        <iframe
                          src={`${activePdfUrl}#toolbar=1`}
                          className="w-full h-full border-0"
                          title={activePdfTitle}
                          scrolling="yes"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-base font-bold text-white">Arquivos de Apoio</h3>
                      
                      {!currentLesson?.materiais || currentLesson.materiais.length === 0 ? (
                        <p className="text-xs text-slate-500">Nenhum material de apoio anexado a esta aula.</p>
                      ) : (
                        <div className="grid gap-3">
                          {currentLesson.materiais.map((mat) => (
                            <div 
                              key={mat.id}
                              className="flex items-center justify-between p-4 bg-[#111827] border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-200">{mat.titulo}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Arquivo PDF</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setActivePdfUrl(mat.arquivo_url)
                                    setActivePdfTitle(mat.titulo)
                                  }}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  Ler PDF
                                </button>
                                <a
                                  href={mat.arquivo_url}
                                  download
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-355 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  Baixar
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Tab 3: Exercícios */}
              {activeTab === 'exercicios' && (
                <div className="space-y-6">
                  <h3 className="text-base font-bold text-white">Questões Avaliativas</h3>
                  
                  {!currentLesson?.exercicios || currentLesson.exercicios.length === 0 ? (
                    <p className="text-xs text-slate-500">Nenhum exercício disponível para esta aula.</p>
                  ) : (
                    <div className="space-y-6">
                      {currentLesson.exercicios.map((ex, index) => {
                        const isSubmitted = submittedAnswers[ex.id]?.answered
                        const isCorrect = submittedAnswers[ex.id]?.correct
                        
                        return (
                          <div 
                            key={ex.id}
                            className="p-5 bg-[#111827] border border-slate-800 rounded-2xl space-y-4"
                          >
                            <div className="flex gap-2.5 items-start">
                              <div className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded bg-indigo-500/10 text-indigo-400 text-xs font-bold mt-0.5">
                                {index + 1}
                              </div>
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-100">
                                {ex.pergunta}
                              </h4>
                            </div>

                            {/* Opções de Resposta */}
                            <div className="grid gap-2">
                              {ex.opcoes.map((opcao, optIdx) => {
                                const isSelected = selectedAnswers[ex.id] === optIdx
                                const isRealCorrect = ex.resposta_correta === optIdx
                                
                                let optClass = 'bg-[#0c1220] border-slate-800 text-slate-300'
                                
                                if (isSelected) {
                                  optClass = 'bg-indigo-500/10 border-indigo-500 text-indigo-300'
                                }
                                
                                if (isSubmitted) {
                                  if (isRealCorrect) {
                                    optClass = 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                                  } else if (isSelected) {
                                    optClass = 'bg-rose-500/15 border-rose-500 text-rose-400'
                                  } else {
                                    optClass = 'bg-[#0c1220]/50 border-slate-800/50 text-slate-500 opacity-60'
                                  }
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    disabled={isSubmitted}
                                    onClick={() => setSelectedAnswers(prev => ({
                                      ...prev,
                                      [ex.id]: optIdx
                                    }))}
                                    className={`flex items-center w-full px-4 py-2.5 rounded-xl border text-xs text-left font-medium transition-all ${optClass}`}
                                  >
                                    <span className="mr-3 h-4 w-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px]">
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span>{opcao}</span>
                                  </button>
                                )
                              })}
                            </div>

                            {/* Botão Submeter / Feedback */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                              <div>
                                {isSubmitted && (
                                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                                    {isCorrect ? (
                                      <span className="text-emerald-400 flex items-center gap-1">
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Correto! Parabéns.</span>
                                      </span>
                                    ) : (
                                      <span className="text-rose-400 flex items-center gap-1">
                                        <XCircle className="w-4 h-4" />
                                        <span>Incorreto. Tente estudar mais!</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {!isSubmitted && (
                                <button
                                  onClick={() => handleSubmitExercise(ex.id, ex.resposta_correta)}
                                  disabled={selectedAnswers[ex.id] === undefined}
                                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                                >
                                  Validar Resposta
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>

        </div>

        {/* Direita: Playlist Lateral de Aulas */}
        <div className="w-full lg:w-80 bg-[#0b101d] border-t lg:border-t-0 lg:border-l border-slate-800/80 p-6 flex flex-col shrink-0 lg:overflow-y-auto lg:max-h-[calc(100vh-70px)]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <Menu className="w-4 h-4 text-indigo-400" />
            <span>Índice do Curso</span>
          </h3>

          <div className="space-y-3">
            {lessons.map((lesson) => {
              const isActive = lesson.id === aulaId
              const isLive = !!lesson.data_hora_live
              const locked = isFutureLive(lesson)

              if (locked) {
                // Aula ao vivo futura — bloqueada para alunos
                return (
                  <div
                    key={lesson.id}
                    title={`Disponível em: ${new Date(lesson.data_hora_live!).toLocaleString('pt-AO')}`}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-800/50 bg-[#0a0d17] opacity-60 cursor-not-allowed select-none"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-600">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-snug line-clamp-2 text-slate-500">
                        {lesson.titulo}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Lock className="w-2.5 h-2.5 text-slate-600" />
                        <span className="text-[10px] text-slate-600">
                          {lesson.data_hora_live ? new Date(lesson.data_hora_live).toLocaleString('pt-AO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Agendada'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <Link
                  key={lesson.id}
                  href={`/cursos/${courseId}/aula/${lesson.id}`}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                    isActive 
                      ? 'bg-indigo-500/10 border-indigo-500/40 text-white' 
                      : 'bg-[#0f1525] border-slate-800/50 hover:bg-[#151c2e] hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow' 
                      : isLive 
                        ? 'bg-red-500/10 text-red-400 border border-red-500/15'
                        : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isLive ? <Video className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold leading-snug line-clamp-2 ${isActive ? 'text-white' : 'text-slate-200'}`}>
                      {lesson.titulo}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {isLive && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                      <span className="text-[10px] text-slate-500">
                        {isLive ? 'Aula ao Vivo' : 'Material de Apoio'}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
