'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { 
  getPendingEnrollments, 
  approveEnrollment, 
  rejectEnrollment, 
  getCourses, 
  getLessons,
  getLessonDetails,
  createCourse, 
  createLesson, 
  createExercise,
  updateCourse,
  updateLesson,
  deleteLesson,
  deleteExercise,
  getAllEnrollments,
  isSupabaseConfigured,
  createMaterial,
  deleteMaterial,
  Inscricao, 
  Curso,
  Aula,
  Exercicio,
  Perfil,
  Material
} from '@/lib/db'
import { createClient } from '@/lib/supabase/client'
import { 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  PlusCircle, 
  Clock, 
  Eye, 
  Trash2,
  Pencil,
  CheckSquare,
  X,
  Video,
  Users,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Clipboard,
  Check,
  AlertTriangle,
  Calendar,
  Menu
} from 'lucide-react'

interface ProfessorDashboardProps {
  user: Perfil
  logout: () => void | Promise<void>
}

export default function ProfessorDashboard({ user, logout }: ProfessorDashboardProps) {
  // Estados de dados
  const [courses, setCourses] = useState<Curso[]>([])
  const [lessonsMap, setLessonsMap] = useState<Record<string, Aula[]>>({})
  const [allEnrollments, setAllEnrollments] = useState<Inscricao[]>([])
  const [activeLessonDetails, setActiveLessonDetails] = useState<Aula | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Controle de Abas Administrativas (Sidebar)
  const [activeTab, setActiveTab] = useState<'overview' | 'cursos' | 'aulas' | 'conferencias' | 'exercicios' | 'materiais' | 'matriculas'>('overview')

  // Visualizador de Comprovativo (Modal)
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)

  // Toast / Notificações
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  // --- FORMULÁRIOS DE CRIAÇÃO/EDIÇÃO ---

  // Formulário de Curso
  const [editCourseId, setEditCourseId] = useState<string | null>(null)
  const [cursoTitulo, setCursoTitulo] = useState('')
  const [cursoDescricao, setCursoDescricao] = useState('')
  const [cursoPreco, setCursoPreco] = useState('')
  const [cursoCapa, setCursoCapa] = useState('')
  const [cursoPublicado, setCursoPublicado] = useState(true)
  const [isUploadingCapa, setIsUploadingCapa] = useState(false)
  const [capaUploadError, setCapaUploadError] = useState<string | null>(null)

  // Formulário de Aula
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [editLessonId, setEditLessonId] = useState<string | null>(null)
  const [aulaTitulo, setAulaTitulo] = useState('')
  const [aulaDescricao, setAulaDescricao] = useState('')
  const [aulaOrdem, setAulaOrdem] = useState('')
  const [aulaIsLive, setAulaIsLive] = useState(false)
  const [aulaDataLive, setAulaDataLive] = useState('')
  const [aulaSalaLiveId, setAulaSalaLiveId] = useState('')

  // Formulário de Exercício
  const [exCourseId, setExCourseId] = useState('')
  const [exLessonId, setExLessonId] = useState('')
  const [exPergunta, setExPergunta] = useState('')
  const [exOpcoes, setExOpcoes] = useState<string[]>(['', '', '', ''])
  const [exRespostaCorreta, setExRespostaCorreta] = useState<number>(0)

  // Upload de Materiais
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({})
  const [lessonDetailsMap, setLessonDetailsMap] = useState<Record<string, Aula>>({})
  const [loadingLessonsMaterials, setLoadingLessonsMaterials] = useState<Record<string, boolean>>({})
  const [uploadingPdfLessonId, setUploadingPdfLessonId] = useState<string | null>(null)
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null)
  const [materialFiles, setMaterialFiles] = useState<Record<string, File | null>>({})
  const [materialTitles, setMaterialTitles] = useState<Record<string, string>>({})

  // Carregar Dados do Professor
  const loadProfessorData = async () => {
    try {
      const allCourses = await getCourses()
      // Filtra apenas cursos ministrados por este professor
      const profCourses = allCourses.filter(c => c.professor_id === user.id)
      setCourses(profCourses)

      const enrolls = await getAllEnrollments()
      setAllEnrollments(enrolls)
      
      if (profCourses.length > 0) {
        if (!selectedCourseId) setSelectedCourseId(profCourses[0].id)
        if (!exCourseId) setExCourseId(profCourses[0].id)
        
        // Carrega aulas para cada curso
        const mapping: Record<string, Aula[]> = {}
        for (const c of profCourses) {
          const listAulas = await getLessons(c.id)
          mapping[c.id] = listAulas
        }
        setLessonsMap(mapping)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfessorData()
  }, [])

  // Monitorar mudança na aula selecionada na aba de Exercícios para carregar detalhes
  useEffect(() => {
    async function loadExLessonDetails() {
      if (!exLessonId) {
        setActiveLessonDetails(null)
        return
      }
      try {
        const details = await getLessonDetails(exLessonId)
        setActiveLessonDetails(details)
      } catch (err) {
        console.error('Erro ao carregar detalhes da aula:', err)
      }
    }
    loadExLessonDetails()
  }, [exLessonId])

  // Sincronizar aula inicial do curso ao mudar de curso na aba de Exercícios
  useEffect(() => {
    if (exCourseId && lessonsMap[exCourseId]) {
      const aulas = lessonsMap[exCourseId] || []
      if (aulas.length > 0) {
        setExLessonId(aulas[0].id)
      } else {
        setExLessonId('')
      }
    } else {
      setExLessonId('')
    }
  }, [exCourseId, lessonsMap])

  // Processamento de Estatísticas (Apenas cursos do professor)
  const myCoursesCount = courses.length
  const myCourseIds = courses.map(c => c.id)
  
  // Total de aulas nos cursos do professor
  const myLessonsCount = myCourseIds.reduce((acc, cid) => acc + (lessonsMap[cid]?.length || 0), 0)
  
  // Inscrições nos cursos do professor
  const myEnrollments = allEnrollments.filter(e => myCourseIds.includes(e.curso_id))
  const activeStudents = myEnrollments.filter(e => e.status === 'aprovado').length
  const pendingPaymentsCount = myEnrollments.filter(e => e.status === 'pendente').length
  
  const approvalRate = myEnrollments.length > 0 
    ? Math.round((activeStudents / myEnrollments.length) * 100) 
    : 100

  // Aulas ao vivo do professor
  const liveLessons = Object.entries(lessonsMap).flatMap(([courseId, lessons]) => {
    const course = courses.find(c => c.id === courseId)
    return (lessons || [])
      .filter(l => l.data_hora_live)
      .map(l => ({
        ...l,
        courseTitle: course?.titulo || 'Curso',
        courseId
      }))
  }).sort((a, b) => new Date(a.data_hora_live!).getTime() - new Date(b.data_hora_live!).getTime())

  // --- AÇÕES ---

  // Upload de Capa do Curso
  const handleCapaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setIsUploadingCapa(true)
      setCapaUploadError(null)

      try {
        if (isSupabaseConfigured()) {
          const supabase = createClient()
          const fileExt = file.name.split('.').pop()
          const filePath = `capas/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
          
          const { error: uploadErr } = await supabase.storage
            .from('capas')
            .upload(filePath, file)
            
          if (uploadErr) {
            throw new Error(`Falha no upload: ${uploadErr.message}.`)
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('capas')
            .getPublicUrl(filePath)
            
          setCursoCapa(publicUrl)
          showNotification('Imagem de capa carregada com sucesso!')
        } else {
          setCursoCapa(`/capas/simulado_${file.name}`)
          showNotification('Imagem de capa simulada no modo demo!')
        }
      } catch (err: any) {
        setCapaUploadError(err.message || 'Erro ao carregar imagem de capa.')
      } finally {
        setIsUploadingCapa(false)
      }
    }
  }

  // Salvar Curso (Criar ou Editar)
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cursoTitulo || !cursoPreco) {
      showNotification('Por favor, preencha o título e o preço do curso.')
      return
    }

    const payload = {
      titulo: cursoTitulo,
      descricao: cursoDescricao,
      preco: parseFloat(cursoPreco),
      capa_url: cursoCapa || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
      publicado: cursoPublicado,
      professor_id: user.id // Força ser este professor logado
    }

    try {
      if (editCourseId) {
        const success = await updateCourse(editCourseId, payload)
        if (success) {
          showNotification('Curso atualizado com sucesso!')
          setEditCourseId(null)
          loadProfessorData()
        }
      } else {
        const novo = await createCourse(payload)
        setCourses(prev => [novo, ...prev])
        setSelectedCourseId(prev => prev ? prev : novo.id)
        showNotification('Novo curso publicado com sucesso!')
        loadProfessorData()
      }

      setCursoTitulo('')
      setCursoDescricao('')
      setCursoPreco('')
      setCursoCapa('')
      setCursoPublicado(true)
    } catch (err: any) {
      console.error(err)
      showNotification(err?.message || 'Erro ao processar curso.')
    }
  }

  const handleEditCourseClick = (c: Curso) => {
    setEditCourseId(c.id)
    setCursoTitulo(c.titulo)
    setCursoDescricao(c.descricao)
    setCursoPreco(c.preco.toString())
    setCursoCapa(c.capa_url)
    setCursoPublicado(c.publicado)
  }

  // Salvar Aula (Criar ou Editar)
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourseId) {
      showNotification('Por favor, selecione ou crie um curso primeiro.')
      return
    }
    if (!aulaTitulo || !aulaOrdem) {
      showNotification('Por favor, preencha o título e a ordem da aula.')
      return
    }

    const dataHoraLive = aulaIsLive && aulaDataLive ? new Date(aulaDataLive).toISOString() : null
    const finalSalaLiveId = aulaIsLive 
      ? (aulaSalaLiveId.trim() || `cspace-live-${Math.random().toString(36).substring(2, 9)}`)
      : null

    const payload = {
      curso_id: selectedCourseId,
      titulo: aulaTitulo,
      descricao: aulaDescricao,
      ordem: parseInt(aulaOrdem),
      data_hora_live: dataHoraLive,
      sala_live_id: finalSalaLiveId
    }

    try {
      if (editLessonId) {
        const success = await updateLesson(editLessonId, payload)
        if (success) {
          showNotification('Aula atualizada!')
          setEditLessonId(null)
          loadProfessorData()
        }
      } else {
        await createLesson(payload)
        showNotification('Aula cadastrada com sucesso!')
        loadProfessorData()
      }

      setAulaTitulo('')
      setAulaDescricao('')
      setAulaOrdem('')
      setAulaIsLive(false)
      setAulaDataLive('')
      setAulaSalaLiveId('')
    } catch (err: any) {
      console.error(err)
      showNotification(err?.message || 'Erro ao processar aula.')
    }
  }

  const handleEditLessonClick = (lesson: Aula) => {
    setEditLessonId(lesson.id)
    setSelectedCourseId(lesson.curso_id)
    setAulaTitulo(lesson.titulo)
    setAulaDescricao(lesson.descricao)
    setAulaOrdem(lesson.ordem.toString())
    setAulaIsLive(!!lesson.data_hora_live)
    setAulaSalaLiveId(lesson.sala_live_id || '')
    if (lesson.data_hora_live) {
      const dateObj = new Date(lesson.data_hora_live)
      const tzOffset = dateObj.getTimezoneOffset() * 60000
      const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16)
      setAulaDataLive(localISOTime)
    } else {
      setAulaDataLive('')
    }
  }

  const handleDeleteLessonClick = async (lessonId: string) => {
    if (!confirm('Deseja realmente excluir esta aula?')) return
    try {
      const success = await deleteLesson(lessonId)
      if (success) {
        showNotification('Aula excluída.')
        loadProfessorData()
      }
    } catch (err: any) {
      console.error(err)
      showNotification(err?.message || 'Erro ao excluir aula.')
    }
  }

  // Cadastrar Exercício
  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exLessonId || !exPergunta) {
      showNotification('Preencha a pergunta e selecione a aula.')
      return
    }

    const payload = {
      aula_id: exLessonId,
      pergunta: exPergunta,
      opcoes: exOpcoes,
      resposta_correta: exRespostaCorreta
    }

    try {
      await createExercise(payload)
      setExPergunta('')
      setExOpcoes(['', '', '', ''])
      showNotification('Exercício criado!')
      
      const details = await getLessonDetails(exLessonId)
      setActiveLessonDetails(details)
    } catch (err: any) {
      console.error(err)
      showNotification(err?.message || 'Erro ao criar exercício.')
    }
  }

  const handleDeleteExerciseClick = async (id: string) => {
    if (!confirm('Excluir esta questão?')) return
    try {
      const success = await deleteExercise(id)
      if (success) {
        showNotification('Questão removida.')
        if (exLessonId) {
          const details = await getLessonDetails(exLessonId)
          setActiveLessonDetails(details)
        }
      }
    } catch (err: any) {
      console.error(err)
      showNotification(err?.message || 'Erro ao excluir questão.')
    }
  }

  const handleExOptionChange = (index: number, val: string) => {
    const next = [...exOpcoes]
    next[index] = val
    setExOpcoes(next)
  }

  // PDF e Materiais
  const toggleLessonExpansion = async (lessonId: string) => {
    const isExpanding = !expandedLessons[lessonId]
    setExpandedLessons(prev => ({ ...prev, [lessonId]: isExpanding }))

    if (isExpanding && !lessonDetailsMap[lessonId]) {
      setLoadingLessonsMaterials(prev => ({ ...prev, [lessonId]: true }))
      try {
        const details = await getLessonDetails(lessonId)
        if (details) {
          setLessonDetailsMap(prev => ({ ...prev, [lessonId]: details }))
        }
      } catch (err) {
        console.error('Erro ao carregar detalhes da aula:', err)
      } finally {
        setLoadingLessonsMaterials(prev => ({ ...prev, [lessonId]: false }))
      }
    }
  }

  const handleAddMaterial = async (lessonId: string) => {
    const file = materialFiles[lessonId]
    const title = materialTitles[lessonId] || ''

    if (!file) {
      setPdfUploadError('Selecione um arquivo PDF para enviar.')
      return
    }

    setUploadingPdfLessonId(lessonId)
    setPdfUploadError(null)

    try {
      let arquivoUrl = ''

      if (isSupabaseConfigured()) {
        const supabase = createClient()
        const fileExt = file.name.split('.').pop()
        const filePath = `materiais/${lessonId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
        
        const { error: uploadErr } = await supabase.storage
          .from('materiais')
          .upload(filePath, file)
          
        if (uploadErr) {
          throw new Error(`Falha no upload: ${uploadErr.message}.`)
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('materiais')
          .getPublicUrl(filePath)
          
        arquivoUrl = publicUrl
      } else {
        arquivoUrl = `/materials/simulado_${file.name}`
      }

      const newMat = await createMaterial({
        aula_id: lessonId,
        titulo: title || file.name,
        arquivo_url: arquivoUrl
      })

      setLessonDetailsMap(prev => {
        const current = prev[lessonId]
        if (!current) return prev
        return {
          ...prev,
          [lessonId]: {
            ...current,
            materiais: [...(current.materiais || []), newMat]
          }
        }
      })

      setMaterialFiles(prev => ({ ...prev, [lessonId]: null }))
      setMaterialTitles(prev => ({ ...prev, [lessonId]: '' }))
      showNotification('Material PDF adicionado com sucesso!')

    } catch (err: any) {
      setPdfUploadError(err.message || 'Erro ao fazer upload do PDF.')
    } finally {
      setUploadingPdfLessonId(null)
    }
  }

  const handleDeleteMaterial = async (lessonId: string, materialId: string) => {
    if (!confirm('Deseja realmente excluir este material PDF?')) return
    try {
      const success = await deleteMaterial(materialId)
      if (success) {
        setLessonDetailsMap(prev => {
          const current = prev[lessonId]
          if (!current) return prev
          return {
            ...prev,
            [lessonId]: {
              ...current,
              materiais: (current.materiais || []).filter(m => m.id !== materialId)
            }
          }
        })
        showNotification('Material excluído.')
      }
    } catch (err: any) {
      console.error('Erro ao excluir material:', err)
      showNotification(err?.message || 'Erro ao excluir material.')
    }
  }

  // Aprovar / Recusar Inscrições
  const handleApproveEnrollment = async (id: string) => {
    try {
      const success = await approveEnrollment(id)
      if (success) {
        showNotification('Matrícula aprovada! O aluno agora tem acesso ao curso.')
        loadProfessorData()
      }
    } catch (err: any) {
      showNotification(err?.message || 'Erro ao aprovar matrícula.')
    }
  }

  const handleRejectEnrollment = async (id: string) => {
    if (!confirm('Deseja realmente recusar esta inscrição?')) return
    try {
      const success = await rejectEnrollment(id)
      if (success) {
        showNotification('Inscrição recusada.')
        loadProfessorData()
      }
    } catch (err: any) {
      showNotification(err?.message || 'Erro ao recusar inscrição.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b13]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-[#070b13] text-slate-100 flex font-sans">
      
      {/* NOTIFICAÇÃO TOAST */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-slate-900 border-l-4 border-indigo-500 text-slate-200 px-4 py-3 rounded-r-xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <div className="bg-indigo-500/10 p-1 rounded-full text-indigo-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">{notification}</span>
        </div>
      )}

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
                Docente
              </span>
            </div>

            {/* Identificação do Professor */}
            <div className="bg-[#070b13]/60 p-4 rounded-xl border border-slate-850 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Professor logado</p>
              <h4 className="text-xs font-bold text-white truncate">{user.nome}</h4>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>

            <nav className="flex-1 space-y-1.5 text-xs font-semibold">
              <button
                onClick={() => {
                  setActiveTab('overview')
                  setMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'overview' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
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
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Meus Cursos</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('aulas')
                  setMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'aulas' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Grade de Aulas</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('conferencias')
                  setMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'conferencias' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Video className="w-4 h-4 text-indigo-400" />
                <span>Conferências (Live)</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('exercicios')
                  setMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'exercicios' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                    : 'text-slate-404 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Exercícios</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('materiais')
                  setMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'materiais' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                    : 'text-slate-404 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Materiais PDF</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('matriculas')
                  setMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'matriculas' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                    : 'text-slate-404 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Matrículas ({pendingPaymentsCount})</span>
              </button>
            </nav>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  logout()
                  setMobileSidebarOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-455 hover:bg-rose-500/10 hover:text-rose-400 transition-all cursor-pointer"
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
            Docente
          </span>
        </div>

        {/* Identificação do Professor */}
        <div className="bg-[#070b13]/60 p-4 rounded-xl border border-slate-850 space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Professor logado</p>
          <h4 className="text-xs font-bold text-white truncate">{user.nome}</h4>
          <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
        </div>

        <nav className="flex-1 space-y-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'overview' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
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
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Meus Cursos</span>
          </button>

          <button
            onClick={() => setActiveTab('aulas')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'aulas' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Grade de Aulas</span>
          </button>

          <button
            onClick={() => setActiveTab('conferencias')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'conferencias' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4 text-indigo-400" />
            <span>Conferências (Live)</span>
          </button>

          <button
            onClick={() => setActiveTab('exercicios')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'exercicios' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Exercícios</span>
          </button>

          <button
            onClick={() => setActiveTab('materiais')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'materiais' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Materiais PDF</span>
          </button>

          <button
            onClick={() => setActiveTab('matriculas')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'matriculas' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Matrículas ({pendingPaymentsCount})</span>
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-450 hover:bg-rose-500/10 hover:text-rose-400 transition-all cursor-pointer"
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
            {/* Logo Visível apenas no Mobile */}
            <div className="md:hidden">
              <Logo height="h-6" />
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider hidden md:block">
              {activeTab === 'overview' && 'Visão Geral'}
              {activeTab === 'cursos' && 'Gerenciamento de Cursos'}
              {activeTab === 'aulas' && 'Gerenciamento de Aulas'}
              {activeTab === 'conferencias' && 'Salas de Conferência & Lives'}
              {activeTab === 'exercicios' && 'Banco de Exercícios'}
              {activeTab === 'materiais' && 'Arquivos e Apostilas'}
              {activeTab === 'matriculas' && 'Confirmação de Matrículas'}
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
            {/* Cargo logado no topo do mobile */}
            <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-1 rounded-lg border border-slate-700">
              🧑‍🏫 Professor
            </span>
            {/* Botão de Terminar Sessão Mobile */}
            <button
              onClick={logout}
              className="md:hidden p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg cursor-pointer"
              title="Terminar Sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* SEÇÃO MOBILE TAB SELECTOR */}
        <div className="md:hidden flex overflow-x-auto bg-[#0c1220]/80 border-b border-slate-850 p-2 gap-1.5 scrollbar-none">
          {[
            { id: 'overview', label: 'Painel' },
            { id: 'cursos', label: 'Cursos' },
            { id: 'aulas', label: 'Aulas' },
            { id: 'conferencias', label: 'Lives' },
            { id: 'exercicios', label: 'Exercícios' },
            { id: 'materiais', label: 'PDFs' },
            { id: 'matriculas', label: `Matrículas (${pendingPaymentsCount})` }
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 bg-[#0c1220] border border-slate-800 rounded-2xl flex items-center justify-between shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-3 -top-3 w-12 h-12 bg-indigo-500/5 rounded-full group-hover:scale-150 transition-all duration-550" />
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Meus Cursos</p>
                    <h3 className="text-2xl font-black text-white">{myCoursesCount}</h3>
                  </div>
                  <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-400 border border-indigo-500/15">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-[#0c1220] border border-slate-800 rounded-2xl flex items-center justify-between shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-3 -top-3 w-12 h-12 bg-cyan-500/5 rounded-full group-hover:scale-150 transition-all duration-550" />
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total de Aulas</p>
                    <h3 className="text-2xl font-black text-white">{myLessonsCount}</h3>
                  </div>
                  <div className="bg-cyan-500/10 p-2.5 rounded-xl text-cyan-400 border border-cyan-500/15">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-[#0c1220] border border-slate-800 rounded-2xl flex items-center justify-between shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-3 -top-3 w-12 h-12 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-all duration-550" />
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alunos Ativos</p>
                    <h3 className="text-2xl font-black text-white">{activeStudents}</h3>
                  </div>
                  <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/15">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-[#0c1220] border border-slate-800 rounded-2xl flex items-center justify-between shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-3 -top-3 w-12 h-12 bg-amber-500/5 rounded-full group-hover:scale-150 transition-all duration-550" />
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Taxa de Matrícula</p>
                    <h3 className="text-2xl font-black text-white">{approvalRate}%</h3>
                  </div>
                  <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-400 border border-amber-500/15">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Aulas ao Vivo (Nova Seção) */}
                <div className="p-6 bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-4 w-full">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center justify-between">
                      <span>Minhas Lives Agendadas</span>
                      <button 
                        onClick={() => setActiveTab('conferencias')} 
                        className="text-[10px] text-indigo-400 hover:text-white uppercase font-bold cursor-pointer"
                      >
                        Ver Todas
                      </button>
                    </h3>

                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {liveLessons.length === 0 ? (
                        <p className="text-xs text-slate-500 py-8 text-center">Nenhuma aula ao vivo agendada para seus cursos.</p>
                      ) : (
                        liveLessons.slice(0, 3).map((lesson) => {
                          const liveDate = new Date(lesson.data_hora_live!)
                          return (
                            <div key={lesson.id} className="p-3 bg-[#070b13] border border-slate-800 rounded-xl flex justify-between items-center gap-3">
                              <div className="min-w-0">
                                <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{lesson.courseTitle}</p>
                                <h4 className="text-xs font-bold text-white truncate mt-0.5">{lesson.titulo}</h4>
                                <p className="text-[9px] text-rose-450 font-semibold mt-1 flex items-center gap-1">
                                  <Video className="w-3 h-3" />
                                  <span>{liveDate.toLocaleString('pt-AO')}</span>
                                </p>
                              </div>
                              <Link
                                href={`/cursos/${lesson.courseId}/aula/${lesson.id}`}
                                target="_blank"
                                className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                              >
                                Transmitir
                              </Link>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Validações Pendentes */}
                <div className="p-6 bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center justify-between">
                    <span>Validações Pendentes ({pendingPaymentsCount})</span>
                    <button 
                      onClick={() => setActiveTab('matriculas')} 
                      className="text-[10px] text-indigo-400 hover:text-white uppercase font-bold cursor-pointer"
                    >
                      Ver Tudo
                    </button>
                  </h3>

                  {myEnrollments.filter(e => e.status === 'pendente').length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center">Nenhum comprovante pendente para os seus cursos no momento!</p>
                  ) : (
                    <div className="space-y-3">
                      {myEnrollments.filter(e => e.status === 'pendente').slice(0, 3).map((enroll) => (
                        <div 
                          key={enroll.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-[#070b13] border border-slate-800 rounded-xl gap-3 hover:border-slate-700 transition-all"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{enroll.aluno?.nome || 'Estudante'}</h4>
                            <p className="text-[9px] text-slate-400 truncate">{enroll.aluno?.email}</p>
                            <p className="text-[9px] text-indigo-400 font-semibold truncate">Curso: {enroll.curso?.titulo}</p>
                          </div>

                          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end shrink-0">
                            {enroll.comprovativo_url && (
                              <button
                                onClick={() => setSelectedReceipt(enroll.comprovativo_url)}
                                className="h-7 px-2.5 flex items-center gap-1 bg-slate-800 hover:bg-slate-750 text-white rounded-lg text-[9px] font-bold border border-slate-700 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Ver</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleApproveEnrollment(enroll.id)}
                              className="h-7 px-2.5 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-bold transition-colors cursor-pointer"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleRejectEnrollment(enroll.id)}
                              className="h-7 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-450 rounded-lg text-[9px] font-bold transition-colors cursor-pointer"
                            >
                              Recusar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEUS CURSOS */}
          {activeTab === 'cursos' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <span>Meus Cursos Ministrados ({myCoursesCount})</span>
              </h3>

              {courses.length === 0 ? (
                <div className="p-8 text-center bg-[#0c1220] border border-slate-800 rounded-2xl">
                  <p className="text-xs text-slate-500">Você ainda não possui nenhum curso cadastrado como professor.</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {courses.map(c => (
                    <div 
                      key={c.id} 
                      className="bg-[#0c1220] border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/20 transition-all flex flex-col justify-between"
                    >
                      <div className="h-32 w-full bg-slate-900 relative">
                        <img src={c.capa_url} alt={c.titulo} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          {c.publicado ? (
                            <span className="px-2 py-0.5 text-[8px] font-bold bg-emerald-500/90 text-white rounded-full">Ativo</span>
                          ) : (
                            <span className="px-2 py-0.5 text-[8px] font-bold bg-slate-700/90 text-white rounded-full">Rascunho</span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-white line-clamp-1">{c.titulo}</h4>
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{c.descricao}</p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                          <span className="text-xs font-black text-indigo-400">{c.preco.toLocaleString()} AOA</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GRADE DE AULAS */}
          {activeTab === 'aulas' && (
            <div className="grid gap-8 lg:grid-cols-5 items-start">
              {/* Formulário de Aula */}
              <div className="lg:col-span-2 p-6 bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center justify-between">
                  <span>{editLessonId ? 'Editar Aula' : 'Criar Aula'}</span>
                  {editLessonId && (
                    <button 
                      onClick={() => {
                        setEditLessonId(null); setAulaTitulo(''); setAulaDescricao(''); setAulaOrdem(''); setAulaIsLive(false); setAulaDataLive('');
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </h3>
                
                <form onSubmit={handleSaveLesson} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Selecionar Curso</label>
                    <select
                      required
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                    >
                      <option value="" disabled>-- Selecione um Curso --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.titulo}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Título da Aula</label>
                      <input
                        type="text"
                        required
                        value={aulaTitulo}
                        onChange={(e) => setAulaTitulo(e.target.value)}
                        placeholder="Ex: Introdução ao Assunto"
                        className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Ordem</label>
                      <input
                        type="number"
                        required
                        value={aulaOrdem}
                        onChange={(e) => setAulaOrdem(e.target.value)}
                        placeholder="Ex: 1"
                        className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Descrição da Aula</label>
                    <textarea
                      rows={2}
                      value={aulaDescricao}
                      onChange={(e) => setAulaDescricao(e.target.value)}
                      placeholder="Explique os objetivos desta aula..."
                      className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                    />
                  </div>

                  <div className="space-y-3 p-3.5 bg-[#070b13] border border-slate-850 rounded-xl">
                    <label className="flex items-center gap-2 font-bold text-indigo-400 uppercase tracking-wide cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aulaIsLive}
                        onChange={(e) => setAulaIsLive(e.target.checked)}
                        className="rounded border-slate-800 text-indigo-650 focus:ring-indigo-500 bg-[#070b13]"
                      />
                      <span className="flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-rose-500" />
                        <span>AULA AO VIVO / TRANSMISSÃO</span>
                      </span>
                    </label>

                    {aulaIsLive && (
                      <div className="space-y-3">
                        <div>
                          <label className="block font-semibold text-slate-500 mb-1.5 uppercase">Data e Hora</label>
                          <input
                            type="datetime-local"
                            required
                            value={aulaDataLive}
                            onChange={(e) => setAulaDataLive(e.target.value)}
                            className="block w-full px-3 py-2 bg-[#0b101d] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-500 mb-1.5 uppercase">Link / ID da Transmissão (Opcional)</label>
                          <input
                            type="text"
                            value={aulaSalaLiveId}
                            onChange={(e) => setAulaSalaLiveId(e.target.value)}
                            placeholder="Ex: cspace-sala-principal ou link do YouTube/Twitch"
                            className="block w-full px-3 py-2 bg-[#0b101d] border border-slate-800 rounded-xl focus:outline-none text-slate-200 text-xs"
                          />
                          <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                            Deixe em branco para usar o canal WebRTC padrão de 2h+. Cole um link do YouTube ou Twitch para transmitir via player externo.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all cursor-pointer"
                  >
                    {editLessonId ? 'Salvar Aula' : 'Criar Aula'}
                  </button>
                </form>
              </div>

              {/* Lista Aulas */}
              <div className="lg:col-span-3 p-6 bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <span>Grade de Aulas ({lessonsMap[selectedCourseId]?.length || 0})</span>
                </h3>

                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Filtrar por Curso</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200 text-xs"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.titulo}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
                  {!lessonsMap[selectedCourseId] || lessonsMap[selectedCourseId].length === 0 ? (
                    <p className="text-xs text-slate-500 p-4 bg-[#070b13] border border-slate-800 rounded-xl text-center">
                      Nenhuma aula cadastrada para este curso ainda.
                    </p>
                  ) : (
                    lessonsMap[selectedCourseId].map(lesson => (
                      <div 
                        key={lesson.id}
                        className="flex flex-col p-3.5 bg-[#070b13] border border-slate-800 rounded-xl hover:border-slate-750 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="text-xs font-black text-white flex items-center gap-2">
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                                #{lesson.ordem}
                              </span>
                              <span>{lesson.titulo}</span>
                            </h4>
                            <p className="text-[10px] text-slate-400 line-clamp-1 leading-normal">{lesson.descricao || 'Sem descrição.'}</p>
                            
                            {lesson.data_hora_live && (
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-450 px-2.5 py-0.5 rounded-full text-[9px] font-bold">
                                  <Video className="w-3 h-3" />
                                  <span>AO VIVO: {new Date(lesson.data_hora_live).toLocaleString('pt-AO')}</span>
                                </span>
                                <Link
                                  href={`/cursos/${selectedCourseId}/aula/${lesson.id}`}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  <span>Entrar na Sala</span>
                                  <ChevronRight className="w-3 h-3" />
                                </Link>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleEditLessonClick(lesson)}
                              className="h-7 w-7 flex items-center justify-center bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-slate-200 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteLessonClick(lesson.id)}
                              className="h-7 w-7 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONFERÊNCIAS */}
          {activeTab === 'conferencias' && (
            <div className="space-y-8">
              
              {/* Grid 2 colunas: Sala Geral e Próximas Lives */}
              <div className="grid gap-8 lg:grid-cols-5 items-start">
                
                {/* Sala de Reunião Geral */}
                <div className="lg:col-span-2 p-6 bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl space-y-6">
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-400/10 px-2.5 py-1 rounded-full border border-indigo-500/20 w-fit block">
                      Sala Rápida
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sala de Conferência Geral</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Esta é a sua sala geral de conferência. Use-a para aulas extras improvisadas, plantões de dúvidas ou conversas rápidas com os alunos sem precisar agendar na playlist do curso.
                    </p>
                  </div>

                  <div className="p-4 bg-[#070b13] border border-slate-800 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Nome da Sala:</span>
                      <span className="font-mono text-white text-[11px]">sala-geral-docente-{user.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Link de Acesso:</span>
                      <span className="text-[10px] text-indigo-400 truncate max-w-[170px]">
                        /cursos/{courses[0]?.id || 'geral'}/aula/sala-geral-{user.id}
                      </span>
                    </div>
                  </div>

                  {courses.length > 0 ? (
                    <Link
                      href={`/cursos/${courses[0].id}/aula/sala-geral-${user.id}`}
                      target="_blank"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-550 hover:to-indigo-650 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-650/15 cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>Iniciar Reunião Agora</span>
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed"
                    >
                      <Video className="w-4 h-4" />
                      <span>Aguardando atribuição de curso</span>
                    </button>
                  )}
                </div>

                {/* Lista de Transmissões Agendadas */}
                <div className="lg:col-span-3 p-6 bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center justify-between">
                    <span>Aulas ao Vivo Agendadas ({liveLessons.length})</span>
                  </h3>

                  <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                    {liveLessons.length === 0 ? (
                      <div className="text-center py-12 bg-[#070b13] border border-slate-850 rounded-xl space-y-2">
                        <Video className="w-8 h-8 text-slate-650 mx-auto" />
                        <p className="text-xs text-slate-500">Nenhuma aula ao vivo agendada.</p>
                        <p className="text-[10px] text-slate-600">Crie uma nova aula com transmissão ativada na aba "Grade de Aulas".</p>
                      </div>
                    ) : (
                      liveLessons.map(lesson => {
                        const liveDate = new Date(lesson.data_hora_live!)
                        const isToday = liveDate.toDateString() === new Date().toDateString()
                        
                        return (
                          <div
                            key={lesson.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#070b13] border border-slate-800 rounded-xl hover:border-slate-700 transition-all gap-4"
                          >
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider truncate max-w-[150px]">
                                  {lesson.courseTitle}
                                </span>
                                {isToday && (
                                  <span className="text-[8px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded uppercase animate-pulse">
                                    Hoje
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-white truncate">{lesson.titulo}</h4>
                              <p className="text-[10px] text-slate-450 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                <span>{liveDate.toLocaleString('pt-AO')}</span>
                              </p>
                            </div>

                            <Link
                              href={`/cursos/${lesson.courseId}/aula/${lesson.id}`}
                              target="_blank"
                              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 text-center flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>Transmitir</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: EXERCÍCIOS */}
          {activeTab === 'exercicios' && (
            <div className="grid gap-8 lg:grid-cols-5 items-start">
              {/* Formulário de Criação */}
              <div className="lg:col-span-2 p-6 bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
                  Nova Questão
                </h3>

                <form onSubmit={handleCreateExercise} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Curso</label>
                    <select
                      value={exCourseId}
                      onChange={(e) => setExCourseId(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.titulo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Aula Associada</label>
                    <select
                      value={exLessonId}
                      onChange={(e) => setExLessonId(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                    >
                      <option value="" disabled>-- Selecione a Aula --</option>
                      {(lessonsMap[exCourseId] || []).map(l => (
                        <option key={l.id} value={l.id}>Aula #{l.ordem}: {l.titulo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Pergunta / Enunciado</label>
                    <textarea
                      rows={3}
                      required
                      value={exPergunta}
                      onChange={(e) => setExPergunta(e.target.value)}
                      placeholder="Escreva o enunciado da questão..."
                      className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block font-semibold text-slate-400 uppercase">Opções e Resposta Correta</label>
                    {exOpcoes.map((op, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="exRespostaCorreta"
                          checked={exRespostaCorreta === idx}
                          onChange={() => setExRespostaCorreta(idx)}
                          className="text-indigo-650 border-slate-800 focus:ring-indigo-500 bg-[#070b13] cursor-pointer"
                        />
                        <input
                          type="text"
                          required
                          value={op}
                          onChange={(e) => handleExOptionChange(idx, e.target.value)}
                          placeholder={`Opção ${idx + 1}`}
                          className="block flex-1 px-3 py-2 bg-[#070b13] border border-slate-850 rounded-xl focus:outline-none text-slate-200"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer"
                  >
                    Adicionar Exercício
                  </button>
                </form>
              </div>

              {/* Lista dos Exercícios Cadastrados */}
              <div className="lg:col-span-3 p-6 bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-500" />
                  <span>Questões Cadastradas</span>
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Filtrar Curso</label>
                    <select
                      value={exCourseId}
                      onChange={(e) => setExCourseId(e.target.value)}
                      className="block w-full px-3 py-2 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200 text-xs"
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.titulo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Filtrar Aula</label>
                    <select
                      value={exLessonId}
                      onChange={(e) => setExLessonId(e.target.value)}
                      className="block w-full px-3 py-2 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200 text-xs"
                    >
                      <option value="" disabled>-- Selecione a Aula --</option>
                      {(lessonsMap[exCourseId] || []).map(l => (
                        <option key={l.id} value={l.id}>Aula #{l.ordem}: {l.titulo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 mt-4">
                  {!activeLessonDetails || !activeLessonDetails.exercicios || activeLessonDetails.exercicios.length === 0 ? (
                    <p className="text-xs text-slate-500 p-4 bg-[#070b13] border border-slate-800 rounded-xl text-center">
                      Nenhuma questão cadastrada para esta aula ainda.
                    </p>
                  ) : (
                    activeLessonDetails.exercicios.map((ex, idx) => (
                      <div 
                        key={ex.id}
                        className="p-4 bg-[#070b13] border border-slate-850 rounded-xl space-y-3 relative group hover:border-slate-750 transition-all"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="text-xs font-bold text-white leading-relaxed">
                            Q{idx+1}: {ex.pergunta}
                          </h4>
                          <button
                            onClick={() => handleDeleteExerciseClick(ex.id)}
                            className="h-7 w-7 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-450 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-1.5 pl-2 border-l border-slate-800">
                          {ex.opcoes.map((op, oIdx) => (
                            <p 
                              key={oIdx}
                              className={`text-[10px] py-1 px-2 rounded-lg ${
                                oIdx === ex.resposta_correta 
                                  ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-450 font-bold'
                                  : 'text-slate-450'
                              }`}
                            >
                              {oIdx + 1}) {op}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MATERIAIS */}
          {activeTab === 'materiais' && (
            <div className="p-6 bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <span>Upload de Apostilas e PDFs por Aula</span>
                </h3>
              </div>

              <div className="mb-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Filtrar por Curso</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200 text-xs"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.titulo}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {!lessonsMap[selectedCourseId] || lessonsMap[selectedCourseId].length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 bg-[#070b13] border border-slate-800 rounded-xl text-center">
                    Nenhuma aula cadastrada para este curso ainda.
                  </p>
                ) : (
                  lessonsMap[selectedCourseId].map(lesson => {
                    const isExpanded = !!expandedLessons[lesson.id]
                    const details = lessonDetailsMap[lesson.id]
                    const matList = details?.materiais || []
                    const currentFile = materialFiles[lesson.id]
                    const currentTitle = materialTitles[lesson.id] || ''

                    return (
                      <div 
                        key={lesson.id} 
                        className="bg-[#070b13] border border-slate-800 rounded-xl overflow-hidden hover:border-slate-750 transition-all"
                      >
                        <button
                          onClick={() => toggleLessonExpansion(lesson.id)}
                          className="w-full p-4 flex items-center justify-between bg-slate-900/40 text-left hover:bg-slate-900/80 transition-colors cursor-pointer"
                        >
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-2">
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Aula {lesson.ordem}</span>
                              <span>{lesson.titulo}</span>
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {matList.length} PDF(s) anexados
                            </p>
                          </div>
                          <span className="text-xs font-bold text-indigo-400">
                            {isExpanded ? 'Recolher' : 'Gerenciar'}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="p-4 border-t border-slate-850 bg-[#070b13]/40 space-y-4">
                            {loadingLessonsMaterials[lesson.id] ? (
                              <div className="py-4 text-center">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mx-auto" />
                              </div>
                            ) : (
                              <>
                                {/* Lista de Materiais do Curso */}
                                {matList.length === 0 ? (
                                  <p className="text-[10px] text-slate-500">Nenhum PDF adicionado a esta aula.</p>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Materiais Carregados</p>
                                    {matList.map(mat => (
                                      <div key={mat.id} className="flex items-center justify-between p-2.5 bg-[#0a101d] border border-slate-850 rounded-lg">
                                        <div className="space-y-0.5">
                                          <p className="text-[11px] font-bold text-white truncate max-w-sm">{mat.titulo}</p>
                                          <a 
                                            href={mat.arquivo_url} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="text-[9px] text-indigo-400 hover:underline cursor-pointer"
                                          >
                                            Visualizar Link do Arquivo
                                          </a>
                                        </div>
                                        <button
                                          onClick={() => handleDeleteMaterial(lesson.id, mat.id)}
                                          className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-md transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Adicionar Novo PDF */}
                                <div className="p-3 bg-[#0a101d] border border-slate-850 rounded-xl space-y-3">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Anexar Novo Material PDF</p>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-500 mb-1">Título do Documento</label>
                                      <input 
                                        type="text"
                                        value={currentTitle}
                                        onChange={(e) => setMaterialTitles(prev => ({ ...prev, [lesson.id]: e.target.value }))}
                                        placeholder="Ex: Apostila de Exercícios"
                                        className="block w-full px-2.5 py-1.5 bg-[#070b13] border border-slate-800 rounded-lg text-slate-200 text-[11px]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-500 mb-1">Arquivo PDF</label>
                                      <input 
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(e) => {
                                          const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null
                                          setMaterialFiles(prev => ({ ...prev, [lesson.id]: file }))
                                        }}
                                        className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                                      />
                                    </div>
                                  </div>
                                  {pdfUploadError && (
                                    <p className="text-[9px] text-rose-450 font-semibold">{pdfUploadError}</p>
                                  )}
                                  <button
                                    onClick={() => handleAddMaterial(lesson.id)}
                                    disabled={uploadingPdfLessonId === lesson.id}
                                    className="w-full sm:w-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                                  >
                                    {uploadingPdfLessonId === lesson.id ? 'Enviando...' : 'Salvar no Supabase'}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 6: MATRÍCULAS */}
          {activeTab === 'matriculas' && (
            <div className="p-6 bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  <span>Matrículas e Validações de Alunos</span>
                </h3>
              </div>

              {myEnrollments.length === 0 ? (
                <div className="p-8 text-center bg-[#070b13] border border-slate-800 rounded-2xl">
                  <p className="text-xs text-slate-500">Nenhuma matrícula registrada para os seus cursos ainda.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Estudante</th>
                        <th className="py-3 px-4">Curso</th>
                        <th className="py-3 px-4">Data Solicitada</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {myEnrollments.map((enroll) => (
                        <tr key={enroll.id} className="hover:bg-[#070b13]/55 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-bold text-white">{enroll.aluno?.nome || 'N/A'}</p>
                              <p className="text-[10px] text-slate-500">{enroll.aluno?.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-200">{enroll.curso?.titulo}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {enroll.data_solicitacao ? new Date(enroll.data_solicitacao).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            {enroll.status === 'aprovado' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-450 border border-emerald-500/15">Aprovado</span>
                            )}
                            {enroll.status === 'pendente' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-450 border border-amber-500/15">Pendente</span>
                            )}
                            {enroll.status === 'rejeitado' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-450 border border-rose-500/15">Recusado</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              {enroll.comprovativo_url && (
                                <button
                                  onClick={() => setSelectedReceipt(enroll.comprovativo_url)}
                                  className="h-7 w-7 flex items-center justify-center bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-white transition-colors cursor-pointer"
                                  title="Ver Comprovativo"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {enroll.status === 'pendente' && (
                                <>
                                  <button
                                    onClick={() => handleApproveEnrollment(enroll.id)}
                                    className="h-7 w-7 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-lg transition-colors cursor-pointer"
                                    title="Aprovar"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectEnrollment(enroll.id)}
                                    className="h-7 w-7 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 rounded-lg transition-colors cursor-pointer"
                                    title="Recusar"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* MODAL: VISUALIZAR COMPROVANTE */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1220] border border-slate-800 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Comprovativo de Pagamento</h3>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 flex items-center justify-center bg-[#070b13]">
              <img 
                src={selectedReceipt} 
                alt="Comprovante de pagamento" 
                className="max-h-[450px] max-w-full rounded-lg object-contain shadow-2xl border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
