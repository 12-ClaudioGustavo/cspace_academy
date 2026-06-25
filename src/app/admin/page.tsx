'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
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
  deleteCourse,
  updateLesson,
  deleteLesson,
  deleteExercise,
  getAllProfiles,
  updateProfileRole,
  deleteProfile,
  getAllEnrollments,
  getEnrollments,
  getExerciseResponses,
  getAllExercises,
  registerUserMock,
  isSupabaseConfigured,
  createMaterial,
  deleteMaterial,
  Inscricao, 
  Curso,
  Aula,
  Exercicio,
  Perfil,
  RespostaExercicio,
  Material
} from '@/lib/db'
import { createClient } from '@/lib/supabase/client'
import { 
  Shield, 
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
  DollarSign,
  TrendingUp,
  Award,
  GraduationCap,
  LogOut,
  ChevronRight,
  Clipboard,
  Check,
  BookOpenCheck,
  AlertTriangle,
  Mail,
  RefreshCw
} from 'lucide-react'

export default function AdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()

  // Estados de dados
  const [pendingPayments, setPendingPayments] = useState<Inscricao[]>([])
  const [courses, setCourses] = useState<Curso[]>([])
  const [lessonsMap, setLessonsMap] = useState<Record<string, Aula[]>>({})
  const [profiles, setProfiles] = useState<Perfil[]>([])
  const [allEnrollments, setAllEnrollments] = useState<Inscricao[]>([])
  const [activeLessonDetails, setActiveLessonDetails] = useState<Aula | null>(null)
  
  const [loading, setLoading] = useState(true)

  // Controle de Abas Administrativas (Sidebar)
  const [activeTab, setActiveTab] = useState<'overview' | 'pagamentos' | 'cursos' | 'exercicios' | 'usuarios' | 'conferencias' | 'newsletter'>('overview')

  // Visualizador de Comprovativo (Modal)
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)

  // Visualizador de Currículo do Aluno (Modal)
  const [selectedStudent, setSelectedStudent] = useState<Perfil | null>(null)
  const [studentEnrollments, setStudentEnrollments] = useState<Inscricao[]>([])
  const [studentResponses, setStudentResponses] = useState<RespostaExercicio[]>([])
  const [allExercises, setAllExercises] = useState<Exercicio[]>([])
  const [loadingStudentModal, setLoadingStudentModal] = useState(false)

  // Modal para Cadastrar Utilizador Diretamente
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'aluno' | 'professor' | 'admin'>('professor')
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false)
  const [newUserError, setNewUserError] = useState<string | null>(null)
  const [fallbackSql, setFallbackSql] = useState<string | null>(null)
  const [copiedSql, setCopiedSql] = useState(false)

  // Estados de Edição de Curso/Aula
  const [editCourseId, setEditCourseId] = useState<string | null>(null)
  const [editLessonId, setEditLessonId] = useState<string | null>(null)

  // Formulário - Curso
  const [cursoTitulo, setCursoTitulo] = useState('')
  const [cursoDescricao, setCursoDescricao] = useState('')
  const [cursoPreco, setCursoPreco] = useState('')
  const [cursoCapa, setCursoCapa] = useState('')
  const [cursoPublicado, setCursoPublicado] = useState(true)
  const [cursoProfessorId, setCursoProfessorId] = useState('')

  // Formulário - Aula
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [aulaTitulo, setAulaTitulo] = useState('')
  const [aulaDescricao, setAulaDescricao] = useState('')
  const [aulaOrdem, setAulaOrdem] = useState('')
  const [aulaIsLive, setAulaIsLive] = useState(false)
  const [aulaDataLive, setAulaDataLive] = useState('')

  // Formulário - Exercício
  const [exCourseId, setExCourseId] = useState('')
  const [exLessonId, setExLessonId] = useState('')
  const [exPergunta, setExPergunta] = useState('')
  const [exOpcoes, setExOpcoes] = useState(['', '', '', ''])
  const [exRespostaCorreta, setExRespostaCorreta] = useState('0')

  // Feedbacks
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  // Newsletter subscribers
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<{ id: string; email: string; nome: string | null; subscribed_at: string }[]>([])
  const [loadingNewsletter, setLoadingNewsletter] = useState(false)

  const loadNewsletterSubscribers = async () => {
    setLoadingNewsletter(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false })
      if (data) setNewsletterSubscribers(data)
    } catch (err) {
      console.error('Erro ao carregar newsletter:', err)
    } finally {
      setLoadingNewsletter(false)
    }
  }

  const showNotification = (msg: string) => {
    setActionMessage(msg)
    setTimeout(() => setActionMessage(null), 4000)
  }

  // Controle de upload de Capa de Curso
  const [isUploadingCapa, setIsUploadingCapa] = useState(false)
  const [capaUploadError, setCapaUploadError] = useState<string | null>(null)

  // Controle de materiais por Aula (Expansão e upload de PDFs)
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({})
  const [lessonDetailsMap, setLessonDetailsMap] = useState<Record<string, Aula>>({})
  const [loadingLessonsMaterials, setLoadingLessonsMaterials] = useState<Record<string, boolean>>({})
  const [uploadingPdfLessonId, setUploadingPdfLessonId] = useState<string | null>(null)
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null)
  
  // Campos de envio de material por aula
  const [materialFiles, setMaterialFiles] = useState<Record<string, File | null>>({})
  const [materialTitles, setMaterialTitles] = useState<Record<string, string>>({})

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
          
          const { error: uploadErr, data } = await supabase.storage
            .from('capas')
            .upload(filePath, file)
            
          if (uploadErr) {
            throw new Error(`Falha no upload: ${uploadErr.message}. Certifique-se de que o bucket "capas" foi criado como público no Storage do Supabase.`)
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('capas')
            .getPublicUrl(filePath)
            
          setCursoCapa(publicUrl)
          showNotification('Imagem de capa carregada no Supabase!')
        } else {
          setCursoCapa(`/capas/simulado_${file.name}`)
          showNotification('Imagem de capa simulada no modo de demonstração!')
        }
      } catch (err: any) {
        setCapaUploadError(err.message || 'Erro ao carregar imagem de capa.')
      } finally {
        setIsUploadingCapa(false)
      }
    }
  }

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
        
        const { error: uploadErr, data } = await supabase.storage
          .from('materiais')
          .upload(filePath, file)
          
        if (uploadErr) {
          throw new Error(`Falha no upload: ${uploadErr.message}. Certifique-se de que o bucket "materiais" foi criado como público no Storage do Supabase.`)
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

  // Carregar Dados Iniciais do Admin
  const loadAdminData = async () => {
    try {
      const list = await getPendingEnrollments()
      setPendingPayments(list)

      const allCourses = await getCourses()
      setCourses(allCourses)

      const allUsers = await getAllProfiles()
      setProfiles(allUsers)

      const enrolls = await getAllEnrollments()
      setAllEnrollments(enrolls)
      
      if (allCourses.length > 0) {
        if (!selectedCourseId) setSelectedCourseId(allCourses[0].id)
        if (!exCourseId) setExCourseId(allCourses[0].id)
        
        // Carrega aulas para cada curso
        const mapping: Record<string, Aula[]> = {}
        for (const c of allCourses) {
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
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login')
      return
    }

    if (user && user.role === 'admin') {
      loadAdminData()
    }
  }, [user, authLoading, router])

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
    if (exCourseId) {
      const aulasDoCurso = lessonsMap[exCourseId] || []
      if (aulasDoCurso.length > 0) {
        setExLessonId(aulasDoCurso[0].id)
      } else {
        setExLessonId('')
      }
    }
  }, [exCourseId, lessonsMap])

  // Carrega histórico e progresso do Aluno selecionado
  useEffect(() => {
    async function fetchStudentCurriculum() {
      if (!selectedStudent) return
      setLoadingStudentModal(true)
      try {
        const enrolls = await getEnrollments(selectedStudent.id)
        setStudentEnrollments(enrolls)

        const resps = await getExerciseResponses(selectedStudent.id)
        setStudentResponses(resps)

        const execs = await getAllExercises()
        setAllExercises(execs)
      } catch (err) {
        console.error('Erro ao carregar currículo do aluno:', err)
      } finally {
        setLoadingStudentModal(false)
      }
    }
    fetchStudentCurriculum()
  }, [selectedStudent])

  // Cadastrar Novo Utilizador Diretamente
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserName || !newUserEmail || !newUserPassword) return

    setIsSubmittingNewUser(true)
    setNewUserError(null)
    setFallbackSql(null)

    try {
      if (isSupabaseConfigured()) {
        // Envia requisição para a nossa API Route com a Service Role Key no Servidor
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nome: newUserName,
            email: newUserEmail,
            password: newUserPassword,
            role: newUserRole
          })
        })

        const data = await res.json()

        if (!res.ok) {
          setNewUserError(data.error || 'Erro desconhecido ao cadastrar utilizador.')
          
          // Se for erro de service_role ausente, gera a query como plano B automaticamente
          if (data.error && data.error.includes('SUPABASE_SERVICE_ROLE_KEY')) {
            generateFallbackSql()
          }
          return
        }

        showNotification(`Membro ${newUserName} cadastrado no banco de dados!`)
      } else {
        // Modo offline mock - salva direto no localStorage
        await registerUserMock({
          nome: newUserName,
          email: newUserEmail,
          role: newUserRole
        })
        showNotification(`Membro ${newUserName} cadastrado em modo demonstração!`)
      }

      // Sucesso: fecha modal e recarrega lista
      setIsRegisterModalOpen(false)
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserRole('professor')
      loadAdminData()

    } catch (err: any) {
      setNewUserError(err.message || 'Erro de conexão com a API.')
    } finally {
      setIsSubmittingNewUser(false)
    }
  }

  // Gera query de contingência
  const generateFallbackSql = () => {
    const randomUUID = typeof window !== 'undefined' && window.crypto?.randomUUID 
      ? window.crypto.randomUUID() 
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
    const query = `-- 🔑 CRIAÇÃO DE CONTINGÊNCIA (EXECUTE NO SQL EDITOR DO SUPABASE)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at) 
VALUES ('${randomUUID}', '${newUserEmail}', extensions.crypt('${newUserPassword}', extensions.gen_salt('bf', 10)), now(), '{"provider": "email", "providers": ["email"]}'::jsonb, '{"nome": "${newUserName}", "role": "${newUserRole}"}'::jsonb, 'authenticated', 'authenticated', now(), now());

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) 
VALUES ('${randomUUID}', '${randomUUID}', jsonb_build_object('sub', '${randomUUID}', 'email', '${newUserEmail}'), 'email', '${randomUUID}', now(), now(), now());

INSERT INTO public.perfis (id, nome, email, role) 
VALUES ('${randomUUID}', '${newUserName}', '${newUserEmail}', '${newUserRole}')
ON CONFLICT (id) DO UPDATE SET role = '${newUserRole}';`

    setFallbackSql(query)
  }

  const handleCopyFallbackSql = () => {
    if (!fallbackSql) return
    navigator.clipboard.writeText(fallbackSql)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 3000)
  }

  // Alterar cargo (role) de um utilizador
  const handleRoleChange = async (userId: string, newRole: 'admin' | 'professor' | 'aluno') => {
    try {
      const success = await updateProfileRole(userId, newRole)
      if (success) {
        setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p))
        showNotification(`Cargo do utilizador alterado para ${newRole.toUpperCase()} com sucesso!`)
      } else {
        showNotification('Erro ao atualizar cargo no banco de dados.')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Excluir Perfil de Usuário
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Deseja realmente remover este perfil? O acesso do usuário ao sistema será revogado.')) return
    try {
      const success = await deleteProfile(userId)
      if (success) {
        setProfiles(prev => prev.filter(p => p.id !== userId))
        showNotification('Perfil do utilizador removido.')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Ações de Pagamento
  const handleApprove = async (id: string) => {
    const success = await approveEnrollment(id)
    if (success) {
      setPendingPayments(prev => prev.filter(p => p.id !== id))
      showNotification('Inscrição aprovada com sucesso!')
      loadAdminData()
    }
  }

  const handleReject = async (id: string) => {
    const success = await rejectEnrollment(id)
    if (success) {
      setPendingPayments(prev => prev.filter(p => p.id !== id))
      showNotification('Comprovativo recusado.')
      loadAdminData()
    }
  }

  // Salvar Curso (com professor atribuído)
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cursoTitulo || !cursoPreco) return

    const payload = {
      titulo: cursoTitulo,
      descricao: cursoDescricao,
      preco: parseFloat(cursoPreco),
      capa_url: cursoCapa || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
      publicado: cursoPublicado,
      professor_id: cursoProfessorId || null
    }

    try {
      if (editCourseId) {
        const success = await updateCourse(editCourseId, payload)
        if (success) {
          showNotification('Curso atualizado com sucesso!')
          setEditCourseId(null)
          loadAdminData()
        }
      } else {
        const novo = await createCourse(payload)
        setCourses(prev => [novo, ...prev])
        setSelectedCourseId(prev => prev ? prev : novo.id)
        showNotification('Novo curso publicado com sucesso!')
      }

      setCursoTitulo('')
      setCursoDescricao('')
      setCursoPreco('')
      setCursoCapa('')
      setCursoPublicado(true)
      setCursoProfessorId('')
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
    setCursoProfessorId(c.professor_id || '')
  }

  const handleDeleteCourseClick = async (id: string) => {
    if (!confirm('Excluir curso e aulas associadas permanentemente?')) return
    try {
      const success = await deleteCourse(id)
      if (success) {
        setCourses(prev => prev.filter(c => c.id !== id))
        showNotification('Curso removido.')
        loadAdminData()
      }
    } catch (err: any) {
      console.error(err)
      showNotification(err?.message || 'Erro ao remover curso.')
    }
  }

  // Salvar Aula
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

    const dataHoraLive = aulaIsLive && aulaDataLive ? new Date(aulaDataLive).toISOString() : undefined
    const salaLiveId = aulaIsLive 
      ? (editLessonId ? undefined : `cspace-live-${Math.random().toString(36).substring(2, 9)}`)
      : undefined

    const payload = {
      curso_id: selectedCourseId,
      titulo: aulaTitulo,
      descricao: aulaDescricao,
      ordem: parseInt(aulaOrdem),
      data_hora_live: dataHoraLive,
      ...(salaLiveId ? { sala_live_id: salaLiveId } : {})
    }

    try {
      if (editLessonId) {
        const success = await updateLesson(editLessonId, payload)
        if (success) {
          showNotification('Grade de aulas atualizada!')
          setEditLessonId(null)
          loadAdminData()
        }
      } else {
        await createLesson(payload)
        showNotification('Aula cadastrada na playlist!')
        loadAdminData()
      }

      setAulaTitulo('')
      setAulaDescricao('')
      setAulaOrdem('')
      setAulaIsLive(false)
      setAulaDataLive('')
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
    if (lesson.data_hora_live) {
      const dateObj = new Date(lesson.data_hora_live)
      const tzOffset = dateObj.getTimezoneOffset() * 60000
      const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16)
      setAulaDataLive(localISOTime)
    } else {
      setAulaDataLive('')
    }
  }

  const handleDeleteLessonClick = async (lessonId: string, courseId: string) => {
    if (!confirm('Deseja realmente excluir esta aula?')) return
    try {
      const success = await deleteLesson(lessonId)
      if (success) {
        showNotification('Aula excluída.')
        loadAdminData()
      }
    } catch (err: any) {
      console.error(err)
      showNotification(err?.message || 'Erro ao excluir aula.')
    }
  }

  // Exercícios
  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exLessonId || !exPergunta || exOpcoes.some(o => o === '')) return

    try {
      await createExercise({
        aula_id: exLessonId,
        pergunta: exPergunta,
        opcoes: exOpcoes,
        resposta_correta: parseInt(exRespostaCorreta)
      })

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
    const updated = [...exOpcoes]
    updated[index] = val
    setExOpcoes(updated)
  }

  // Métricas de Visão Geral
  const totalStudents = profiles.filter(p => p.role === 'aluno').length
  const totalProfessors = profiles.filter(p => p.role === 'professor').length
  const totalRevenue = allEnrollments
    .filter(e => e.status === 'aprovado')
    .reduce((acc, curr) => acc + (curr.curso?.preco || 0), 0)

  // Todas as aulas ao vivo no sistema
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col md:flex-row">
      
      {/* 1. SIDEBAR DE NAVEGAÇÃO */}
      <aside className="w-full md:w-64 bg-[#0b101d] border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-850">
            <Link href="/">
              <Logo height="h-7 sm:h-8 md:h-9" variant="dark" />
            </Link>
            <div className="pl-1 mt-1">
              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-extrabold font-mono px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest">
                LMS Admin
              </span>
            </div>
          </div>

          {/* Opções de Navegação */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'overview' 
                  ? 'bg-indigo-500/10 text-indigo-400 border-l-4 border-indigo-500' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Visão Geral</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('pagamentos')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'pagamentos' 
                  ? 'bg-indigo-500/10 text-indigo-400 border-l-4 border-indigo-500' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Clock className="w-4 h-4" />
                <span>Aprovações</span>
              </span>
              {pendingPayments.length > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {pendingPayments.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('cursos')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'cursos' 
                  ? 'bg-indigo-500/10 text-indigo-400 border-l-4 border-indigo-500' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4" />
                <span>Cursos & Aulas</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('conferencias')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'conferencias' 
                  ? 'bg-indigo-500/10 text-indigo-400 border-l-4 border-indigo-500' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Video className="w-4 h-4 text-indigo-400" />
                <span>Conferências (Live)</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('exercicios')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'exercicios' 
                  ? 'bg-indigo-500/10 text-indigo-400 border-l-4 border-indigo-500' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <CheckSquare className="w-4 h-4" />
                <span>Exercícios</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('usuarios')}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'usuarios' 
                  ? 'bg-indigo-500/10 text-indigo-400 border-l-4 border-indigo-500' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Utilizadores / Cargos</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => { setActiveTab('newsletter'); loadNewsletterSubscribers() }}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'newsletter' 
                  ? 'bg-indigo-500/10 text-indigo-400 border-l-4 border-indigo-500' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Mail className="w-4 h-4" />
                <span>Newsletter</span>
              </span>
              {newsletterSubscribers.length > 0 && (
                <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {newsletterSubscribers.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-slate-850 space-y-1">
          <Link 
            href="/"
            className="w-full flex items-center gap-2 p-2.5 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/30 transition-all font-semibold"
          >
            <BookOpen className="w-4 h-4" />
            <span>Voltar ao Webapp</span>
          </Link>
          <button 
            onClick={() => {
              logout()
              router.push('/')
            }}
            className="w-full flex items-center gap-2 p-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all font-semibold text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>

      {/* 2. ÁREA DE CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="bg-[#0b101d]/50 border-b border-slate-800/80 py-4 px-6 sm:px-8 flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            {activeTab === 'overview' && 'Painel de Métricas'}
            {activeTab === 'pagamentos' && 'Validação Bancária'}
            {activeTab === 'cursos' && 'Playlist & Grade Curricular'}
            {activeTab === 'conferencias' && 'Salas de Conferência & Transmissões'}
            {activeTab === 'exercicios' && 'Quizzes Acadêmicos'}
            {activeTab === 'usuarios' && 'Controle de Membros'}
            {activeTab === 'newsletter' && 'Subscritores da Newsletter'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-[#0b101d] px-3.5 py-2 border border-slate-800 rounded-xl font-bold flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{user?.email}</span>
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          
          {actionMessage && (
            <div className="mb-6 p-4 rounded-xl bg-indigo-500 text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-indigo-400/20">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* --- VIEW 1: OVERVIEW (VISÃO GERAL) --- */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              
              {/* Cards de Estatísticas */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-5 bg-[#0b101d] border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total de Alunos</p>
                    <h3 className="text-xl font-extrabold text-white mt-1.5">{totalStudents}</h3>
                    <p className="text-[9px] text-emerald-400 flex items-center gap-0.5 mt-1 font-medium">
                      <TrendingUp className="w-3 h-3" />
                      <span>Alunos Reais</span>
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-5 bg-[#0b101d] border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Professores</p>
                    <h3 className="text-xl font-extrabold text-white mt-1.5">{totalProfessors}</h3>
                    <p className="text-[9px] text-slate-400 mt-1 font-medium">Lecionando Aulas</p>
                  </div>
                  <div className="h-10 w-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-5 bg-[#0b101d] border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Faturamento</p>
                    <h3 className="text-xl font-extrabold text-white mt-1.5">{totalRevenue.toLocaleString('pt-AO')} Kz</h3>
                    <p className="text-[9px] text-emerald-400 flex items-center gap-0.5 mt-1 font-medium">
                      <TrendingUp className="w-3 h-3" />
                      <span>Soma Aprovada</span>
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-5 bg-[#0b101d] border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pagamentos Pendentes</p>
                    <h3 className="text-xl font-extrabold text-white mt-1.5">{pendingPayments.length}</h3>
                    <p className="text-[9px] text-yellow-400 mt-1 font-medium">Aguardando auditoria</p>
                  </div>
                  <div className="h-10 w-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-400">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Aulas ao Vivo Agendadas */}
              <div className="p-6 bg-[#0b101d] border border-slate-800 rounded-2xl space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-indigo-400" />
                    <span>Aulas ao Vivo Agendadas</span>
                  </h4>
                  <button 
                    onClick={() => setActiveTab('conferencias')} 
                    className="text-[10px] text-indigo-400 hover:text-white uppercase font-bold cursor-pointer"
                  >
                    Ver Painel de Lives
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {liveLessons.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 col-span-full text-center">Nenhuma live agendada no sistema no momento.</p>
                  ) : (
                    liveLessons.slice(0, 3).map((lesson) => {
                      const liveDate = new Date(lesson.data_hora_live!)
                      return (
                        <div key={lesson.id} className="p-3.5 bg-[#070b13] border border-slate-800 rounded-xl flex justify-between items-center gap-3">
                          <div className="min-w-0">
                            <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{lesson.courseTitle}</p>
                            <h4 className="text-xs font-bold text-white truncate mt-0.5">{lesson.titulo}</h4>
                            <p className="text-[9px] text-rose-450 font-semibold mt-1 flex items-center gap-1">
                              <Video className="w-3 h-3 animate-pulse" />
                              <span>{liveDate.toLocaleString('pt-AO')}</span>
                            </p>
                          </div>
                          <Link
                            href={`/cursos/${lesson.courseId}/aula/${lesson.id}`}
                            target="_blank"
                            className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                          >
                            Entrar
                          </Link>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Tabela de Inscrições Recentes e Lista de Membros */}
              <div className="grid gap-8 lg:grid-cols-5">
                
                {/* Histórico Recente de Inscrições */}
                <div className="lg:col-span-3 p-6 bg-[#0b101d] border border-slate-800 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Últimas Inscrições Recebidas</h4>
                  
                  <div className="space-y-3">
                    {allEnrollments.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">Nenhum pagamento registrado na plataforma.</p>
                    ) : (
                      allEnrollments.slice(0, 5).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3.5 bg-[#070b13] border border-slate-800 rounded-xl">
                          <div>
                            <p className="text-xs font-bold text-slate-200">{item.aluno?.nome || 'Usuário'}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{item.curso?.titulo}</p>
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg border ${
                            item.status === 'aprovado' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : item.status === 'rejeitado'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Resumo de Usuários do Sistema */}
                <div className="lg:col-span-2 p-6 bg-[#0b101d] border border-slate-800 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Membros Recentes</h4>
                  <div className="divide-y divide-slate-850">
                    {profiles.slice(0, 5).map(p => (
                      <div key={p.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-xs font-bold text-slate-200">{p.nome}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{p.email}</p>
                        </div>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                          p.role === 'admin' 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                            : p.role === 'professor'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {p.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* --- VIEW 2: APROVAÇÕES DE PAGAMENTOS --- */}
          {activeTab === 'pagamentos' && (
            <section className="space-y-6">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Aprovação de Transferências</h3>
              
              {pendingPayments.length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#0b101d] border border-slate-800 text-center max-w-lg">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                  <h4 className="font-semibold text-white">Tudo em dia!</h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-normal">
                    Não há comprovativos de pagamento pendentes para aprovação neste momento.
                  </p>
                </div>
              ) : (
                <div className="bg-[#0b101d] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#070b13] border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="p-4">Estudante</th>
                          <th className="p-4">Curso Solicitado</th>
                          <th className="p-4">Data do Envio</th>
                          <th className="p-4">Comprovante</th>
                          <th className="p-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {pendingPayments.map((item) => (
                          <tr key={item.id} className="hover:bg-[#070b13]/40">
                            <td className="p-4">
                              <p className="font-semibold text-slate-200">{item.aluno?.nome}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{item.aluno?.email}</p>
                            </td>
                            <td className="p-4 font-semibold text-slate-200">
                              {item.curso?.titulo}
                            </td>
                            <td className="p-4 text-slate-400">
                              {new Date(item.data_solicitacao).toLocaleString('pt-AO')}
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => setSelectedReceipt(item.comprovativo_url)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:underline"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver Arquivo</span>
                              </button>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => handleReject(item.id)}
                                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-bold text-[10px] transition-colors border border-rose-500/20"
                              >
                                Rejeitar
                              </button>
                              <button
                                onClick={() => handleApprove(item.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] shadow transition-colors"
                              >
                                Aprovar Acesso
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* --- VIEW 3: GERENCIAR CURSOS E AULAS --- */}
          {activeTab === 'cursos' && (
            <div className="space-y-12">
              
              {/* LINHA 1: Curso */}
              <div className="grid gap-8 lg:grid-cols-5">
                {/* Form Curso */}
                <div className="lg:col-span-2 p-6 bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl space-y-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-500" />
                      <span>{editCourseId ? 'Editar Curso' : 'Novo Curso'}</span>
                    </span>
                    {editCourseId && (
                      <button 
                        onClick={() => {
                          setEditCourseId(null); setCursoTitulo(''); setCursoDescricao(''); setCursoPreco(''); setCursoCapa(''); setCursoPublicado(true); setCursoProfessorId('');
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </h3>
                  
                  <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Título do Curso (Turma)</label>
                      <input
                        type="text"
                        required
                        value={cursoTitulo}
                        onChange={(e) => setCursoTitulo(e.target.value)}
                        placeholder="Especialização React Native..."
                        className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Descrição / Resumo</label>
                      <textarea
                        rows={2}
                        value={cursoDescricao}
                        onChange={(e) => setCursoDescricao(e.target.value)}
                        placeholder="Descrição do curso..."
                        className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-200"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Preço (Kwanzas)</label>
                        <input
                          type="number"
                          required
                          value={cursoPreco}
                          onChange={(e) => setCursoPreco(e.target.value)}
                          placeholder="25000"
                          className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block font-semibold text-slate-400 uppercase">Imagem Capa do Curso</label>
                        <input
                          type="text"
                          value={cursoCapa}
                          onChange={(e) => setCursoCapa(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-200 text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCapaFileChange}
                            className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 file:hover:bg-indigo-500/20 cursor-pointer"
                          />
                          {isUploadingCapa && (
                            <span className="text-[9px] text-indigo-400 animate-pulse">Carregando capa...</span>
                          )}
                        </div>
                        {capaUploadError && (
                          <p className="text-[9px] text-rose-450 font-semibold leading-tight">{capaUploadError}</p>
                        )}
                      </div>
                    </div>

                    {/* Atribuição de Professor */}
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Professor Responsável (Atribuição)</label>
                      <select
                        value={cursoProfessorId}
                        onChange={(e) => setCursoProfessorId(e.target.value)}
                        className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200 cursor-pointer"
                      >
                        <option value="">Sem professor atribuído</option>
                        {profiles.filter(p => p.role === 'professor').map(p => (
                          <option key={p.id} value={p.id}>{p.nome} ({p.email})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-[#070b13] rounded-xl border border-slate-800">
                      <input 
                        type="checkbox"
                        id="pub-opt-4"
                        checked={cursoPublicado}
                        onChange={(e) => setCursoPublicado(e.target.checked)}
                        className="h-4 w-4 text-indigo-500"
                      />
                      <label htmlFor="pub-opt-4" className="text-[11px] text-slate-300 font-semibold cursor-pointer">
                        Publicado para alunos?
                      </label>
                    </div>

                    <div className="flex gap-2">
                      {editCourseId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditCourseId(null); setCursoTitulo(''); setCursoDescricao(''); setCursoPreco(''); setCursoCapa(''); setCursoPublicado(true); setCursoProfessorId('');
                          }}
                          className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all"
                      >
                        {editCourseId ? 'Salvar Alterações' : 'Criar Curso'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Lista Cursos */}
                <div className="lg:col-span-3 p-6 bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-500" />
                    <span>Cursos Cadastrados ({courses.length})</span>
                  </h3>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
                    {courses.map(c => (
                      <div 
                        key={c.id}
                        className="flex items-center justify-between p-4 bg-[#070b13] border border-slate-800 rounded-xl hover:border-slate-750 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-16 bg-slate-800 rounded overflow-hidden shrink-0 border border-slate-700">
                            <img src={c.capa_url} alt={c.titulo} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-200 line-clamp-1">{c.titulo}</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-mono">
                              {c.preco.toLocaleString('pt-AO')} Kz • {c.publicado ? 'Publicado' : 'Rascunho'}
                            </p>
                            <p className="text-[9px] text-indigo-400 mt-1 font-semibold">
                              🎓 Professor: {c.professor?.nome || 'Não atribuído'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleEditCourseClick(c)}
                            className="h-8 w-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCourseClick(c.id)}
                            className="h-8 w-8 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-450 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* LINHA 2: Aula */}
              <div className="grid gap-8 lg:grid-cols-5">
                {/* Form Aula */}
                <div className="lg:col-span-2 p-6 bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl space-y-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-500" />
                      <span>{editLessonId ? 'Editar Aula' : 'Nova Aula'}</span>
                    </span>
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
                          placeholder="Dia 1 - Ferramentas"
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
                          placeholder="1"
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
                        placeholder="Matéria da aula..."
                        className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                      />
                    </div>

                    <div className="p-4 bg-[#070b13] border border-slate-800 rounded-xl space-y-3">
                      <label className="flex items-center gap-2 font-semibold text-slate-350 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={aulaIsLive}
                          onChange={(e) => setAulaIsLive(e.target.checked)}
                          className="h-4 w-4 text-indigo-500"
                        />
                        <span>Agendar Transmissão ao Vivo?</span>
                      </label>

                      {aulaIsLive && (
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
                      )}
                    </div>

                    <div className="flex gap-2">
                      {editLessonId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditLessonId(null); setAulaTitulo(''); setAulaDescricao(''); setAulaOrdem(''); setAulaIsLive(false); setAulaDataLive('');
                          }}
                          className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all"
                      >
                        {editLessonId ? 'Salvar Aula' : 'Criar Aula'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Lista Aulas */}
                <div className="lg:col-span-3 p-6 bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    <span>Aulas na Playlist ({lessonsMap[selectedCourseId]?.length || 0})</span>
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
                          <div className="flex items-start justify-between w-full">
                            <div className="flex items-start gap-2.5">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-800 text-[10px] font-mono text-indigo-400 font-bold mt-0.5">
                                {lesson.ordem}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-200">{lesson.titulo}</p>
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{lesson.descricao}</p>
                                {lesson.data_hora_live && (
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className="flex items-center gap-1.5 text-[9px] text-red-400 font-semibold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                                      <Video className="w-3 h-3 animate-pulse" />
                                      <span>Live: {new Date(lesson.data_hora_live).toLocaleString('pt-AO')}</span>
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
                                
                                <button
                                  type="button"
                                  onClick={() => toggleLessonExpansion(lesson.id)}
                                  className="mt-2 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>
                                    {expandedLessons[lesson.id] ? 'Ocultar PDFs' : 'Ver/Adicionar PDFs'}
                                  </span>
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-4">
                              <button
                                onClick={() => handleEditLessonClick(lesson)}
                                className="h-7 w-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLessonClick(lesson.id, selectedCourseId)}
                                className="h-7 w-7 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {expandedLessons[lesson.id] && (
                            <div className="pt-3 border-t border-slate-800/60 w-full pl-8 space-y-4">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Materiais da Aula</h4>
                              
                              {loadingLessonsMaterials[lesson.id] ? (
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 py-1">
                                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                                  <span>Carregando PDFs...</span>
                                </div>
                              ) : (
                                <>
                                  {/* Lista de PDFs */}
                                  <div className="space-y-2">
                                    {(!lessonDetailsMap[lesson.id]?.materiais || lessonDetailsMap[lesson.id].materiais?.length === 0) ? (
                                      <p className="text-[10px] text-slate-500 italic">Sem materiais vinculados a esta aula.</p>
                                    ) : (
                                      lessonDetailsMap[lesson.id].materiais?.map(mat => (
                                        <div key={mat.id} className="flex items-center justify-between p-2 bg-[#0b101d]/60 rounded-xl border border-slate-800/40 text-[10px]">
                                          <a 
                                            href={mat.arquivo_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-slate-350 hover:underline hover:text-white flex items-center gap-1.5 font-medium line-clamp-1"
                                          >
                                            <FileText className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                            <span>{mat.titulo}</span>
                                          </a>
                                          <button
                                            onClick={() => handleDeleteMaterial(lesson.id, mat.id)}
                                            className="text-rose-400 hover:text-rose-350 p-1 rounded hover:bg-rose-500/10 transition-colors"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))
                                    )}
                                  </div>

                                  {/* Form para adicionar PDF */}
                                  <div className="p-3 bg-[#070b13] border border-slate-800 rounded-xl space-y-2.5">
                                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Adicionar Material (PDF)</span>
                                    
                                    {pdfUploadError && (
                                      <p className="text-[9px] text-rose-450 font-semibold">{pdfUploadError}</p>
                                    )}

                                    <div className="grid gap-3 sm:grid-cols-2 text-[10px]">
                                      <div>
                                        <label className="block text-slate-500 mb-1">Título do Documento</label>
                                        <input
                                          type="text"
                                          value={materialTitles[lesson.id] || ''}
                                          onChange={(e) => setMaterialTitles(prev => ({ ...prev, [lesson.id]: e.target.value }))}
                                          placeholder="Ex: Slides da Aula 3"
                                          className="w-full px-2.5 py-1.5 bg-[#0b101d] border border-slate-800 rounded-lg focus:outline-none text-slate-200"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-slate-500 mb-1">Arquivo PDF</label>
                                        <input
                                          type="file"
                                          accept="application/pdf"
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                              setMaterialFiles(prev => ({ ...prev, [lesson.id]: e.target.files![0] }))
                                            }
                                          }}
                                          className="w-full text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-slate-800 file:text-slate-300 file:hover:bg-slate-700 cursor-pointer"
                                        />
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      disabled={uploadingPdfLessonId === lesson.id}
                                      onClick={() => handleAddMaterial(lesson.id)}
                                      className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 text-[10px]"
                                    >
                                      {uploadingPdfLessonId === lesson.id ? 'Enviando...' : 'Salvar no Supabase'}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* --- VIEW 4: GERENCIAR EXERCÍCIOS --- */}
          {activeTab === 'exercicios' && (
            <section className="grid gap-8 lg:grid-cols-5">
              {/* Form Cadastro */}
              <div className="lg:col-span-2 p-6 bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl space-y-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-500" />
                  <span>Novo Exercício</span>
                </h3>

                <form onSubmit={handleCreateExercise} className="space-y-4 text-xs">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Selecionar Curso</label>
                      <select
                        value={exCourseId}
                        onChange={(e) => {
                          setExCourseId(e.target.value)
                          const list = lessonsMap[e.target.value] || []
                          if (list.length > 0) setExLessonId(list[0].id)
                        }}
                        className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                      >
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.titulo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Selecionar Aula</label>
                      <select
                        value={exLessonId}
                        onChange={(e) => setExLessonId(e.target.value)}
                        className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                      >
                        {(lessonsMap[exCourseId] || []).map(l => (
                          <option key={l.id} value={l.id}>{l.titulo}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Texto da Pergunta</label>
                    <input
                      type="text"
                      required
                      value={exPergunta}
                      onChange={(e) => setExPergunta(e.target.value)}
                      placeholder="Qual a tag HTML correta para criar um link?"
                      className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block font-semibold text-slate-400 uppercase">Alternativas</label>
                    {exOpcoes.map((opcao, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-[#070b13] border border-slate-800 font-bold text-[10px] text-slate-500">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <input
                          type="text"
                          required
                          value={opcao}
                          onChange={(e) => handleExOptionChange(optIdx, e.target.value)}
                          placeholder={`Alternativa ${String.fromCharCode(65 + optIdx)}`}
                          className="block w-full px-3 py-2 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Alternativa Correta</label>
                    <select
                      value={exRespostaCorreta}
                      onChange={(e) => setExRespostaCorreta(e.target.value)}
                      className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                    >
                      <option value="0">Alternativa A</option>
                      <option value="1">Alternativa B</option>
                      <option value="2">Alternativa C</option>
                      <option value="3">Alternativa D</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all"
                  >
                    Salvar Exercício na Aula
                  </button>
                </form>
              </div>

              {/* Lista Exercícios */}
              <div className="lg:col-span-3 p-6 bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-500" />
                  <span>Questões Cadastradas ({activeLessonDetails?.exercicios?.length || 0})</span>
                </h3>

                <div className="grid gap-4 sm:grid-cols-2 mb-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Filtrar Curso</label>
                    <select
                      value={exCourseId}
                      onChange={(e) => setExCourseId(e.target.value)}
                      className="block w-full px-3 py-2 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
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
                      className="block w-full px-3 py-2 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                    >
                      {(lessonsMap[exCourseId] || []).map(l => (
                        <option key={l.id} value={l.id}>{l.titulo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                  {!activeLessonDetails?.exercicios || activeLessonDetails.exercicios.length === 0 ? (
                    <p className="text-xs text-slate-500 p-4 bg-[#070b13] border border-slate-800 rounded-xl text-center">
                      Nenhuma questão cadastrada para esta aula ainda.
                    </p>
                  ) : (
                    activeLessonDetails.exercicios.map((ex, index) => (
                      <div 
                        key={ex.id}
                        className="p-4 bg-[#070b13] border border-slate-800 rounded-xl space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-500/10 text-[10px] text-indigo-400 font-bold font-mono">
                              {index + 1}
                            </span>
                            <p className="text-xs font-semibold text-slate-200">{ex.pergunta}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteExerciseClick(ex.id)}
                            className="h-6 w-6 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded text-rose-400 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid gap-1.5 pl-7 text-[10px] text-slate-400">
                          {ex.opcoes.map((opcao, optIdx) => (
                            <div 
                              key={optIdx} 
                              className={`p-1.5 rounded-lg border ${
                                ex.resposta_correta === optIdx 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-semibold' 
                                  : 'bg-[#0b101d]/30 border-slate-800'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}) {opcao}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

          {/* --- VIEW 5: UTILIZADORES E CARGOS --- */}
          {activeTab === 'usuarios' && (
            <div className="space-y-6">
              
              {/* Header com botão de cadastrar novo membro */}
              <div className="flex justify-between items-center bg-[#0b101d] p-5 border border-slate-800 rounded-2xl">
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">Membros da C-Space Academy</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Gerencie os alunos, professores e administradores do sistema.</p>
                </div>
                <button
                  onClick={() => {
                    setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserRole('professor'); setNewUserError(null); setFallbackSql(null);
                    setIsRegisterModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Cadastrar Membro</span>
                </button>
              </div>

              {/* Roster de Membros Registrados */}
              <div className="bg-[#0b101d] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#070b13] border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="p-4">Nome completo</th>
                        <th className="p-4">E-mail</th>
                        <th className="p-4">Nível de Acesso (Cargo)</th>
                        <th className="p-4">Cadastro</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {profiles.map((p) => (
                        <tr key={p.id} className="hover:bg-[#070b13]/40">
                          <td className="p-4 font-semibold text-slate-200">
                            {p.nome}
                          </td>
                          <td className="p-4 text-slate-350 font-mono">
                            {p.email}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                p.role === 'admin' 
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                  : p.role === 'professor'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {p.role}
                              </span>

                              {p.id !== user?.id ? (
                                <select
                                  value={p.role}
                                  onChange={(e) => handleRoleChange(p.id, e.target.value as any)}
                                  className="bg-[#070b13] border border-slate-800 text-[10px] rounded-lg p-1 text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                                >
                                  <option value="aluno">Aluno</option>
                                  <option value="professor">Professor</option>
                                  <option value="admin">Administrador</option>
                                </select>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">(Você)</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-slate-400">
                            {new Date(p.criado_em).toLocaleDateString('pt-AO')}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {/* Botão de Currículo / Progresso do Aluno */}
                            <button
                              onClick={() => setSelectedStudent(p)}
                              className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl font-bold text-[10px] text-indigo-400 transition-colors inline-flex items-center gap-1"
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>Progresso</span>
                            </button>

                            {p.id !== user?.id ? (
                              <button
                                onClick={() => handleDeleteUser(p.id)}
                                className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl font-bold text-[10px] text-rose-400 transition-colors"
                              >
                                Remover
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Bloqueado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* --- VIEW: CONFERÊNCIAS (ADMIN) --- */}
          {activeTab === 'conferencias' && (
            <div className="space-y-8">
              
              {/* Grid 2 colunas: Sala Geral e Próximas Lives */}
              <div className="grid gap-8 lg:grid-cols-5 items-start">
                
                {/* Sala de Reunião Geral */}
                <div className="lg:col-span-2 p-6 bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl space-y-6">
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-400/10 px-2.5 py-1 rounded-full border border-indigo-500/20 w-fit block">
                      Administração
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sala de Conferência Geral</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Como administrador, você pode iniciar uma conferência geral para reuniões administrativas, lives rápidas com alunos ou plantões de tutoria a qualquer momento.
                    </p>
                  </div>

                  <div className="p-4 bg-[#070b13] border border-slate-800 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Nome da Sala:</span>
                      <span className="font-mono text-white text-[11px]">sala-geral-admin-{user?.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Link de Acesso:</span>
                      <span className="text-[10px] text-indigo-400 truncate max-w-[170px]">
                        /cursos/{courses[0]?.id || 'geral'}/aula/sala-geral-{user?.id}
                      </span>
                    </div>
                  </div>

                  {courses.length > 0 ? (
                    <Link
                      href={`/cursos/${courses[0].id}/aula/sala-geral-${user?.id}`}
                      target="_blank"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-550 hover:to-indigo-650 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-650/15 cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>Iniciar Reunião Agora</span>
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="flex items-center justify-center gap-2 w-full py-3 bg-slate-805 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed"
                    >
                      <Video className="w-4 h-4" />
                      <span>Aguardando cadastro de curso</span>
                    </button>
                  )}
                </div>

                {/* Lista de Transmissões Agendadas */}
                <div className="lg:col-span-3 p-6 bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-3 flex items-center justify-between">
                    <span>Todas as Aulas ao Vivo Agendadas ({liveLessons.length})</span>
                  </h3>

                  <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                    {liveLessons.length === 0 ? (
                      <div className="text-center py-12 bg-[#070b13] border border-slate-850 rounded-xl space-y-2">
                        <Video className="w-8 h-8 text-slate-650 mx-auto" />
                        <p className="text-xs text-slate-500">Nenhuma aula ao vivo agendada.</p>
                        <p className="text-[10px] text-slate-600">Agende transmissões na aba "Cursos & Aulas" ao configurar a aula.</p>
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
                              <span>Entrar na Sala</span>
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

        </main>
      </div>

      {/* ========================================================
          MODAIS E POPUPS DO SISTEMA
      ======================================================== */}

      {/* MODAL 1: CADASTRAR NOVO MEMBRO (DIRETO NO BANCO VIA API) */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-[#0b101d] rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#070b13]">
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cadastrar Membro</h3>
              </div>
              <button 
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Corpo */}
            <form onSubmit={handleRegisterUser} className="flex-1 p-6 overflow-y-auto space-y-4 text-xs leading-normal">
              
              {newUserError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 font-bold space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-rose-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Falha no cadastro direto</span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-medium leading-relaxed mt-1">
                    {newUserError}
                  </p>
                </div>
              )}

              {/* Plano B: Exibir query SQL caso a service_role não esteja configurada no servidor */}
              {fallbackSql && (
                <div className="p-4 bg-[#070b13] border border-slate-800 rounded-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                    <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-wider">Solução Alternativa (Query SQL)</span>
                    <button
                      type="button"
                      onClick={handleCopyFallbackSql}
                      className="flex items-center gap-1 text-[9px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-bold"
                    >
                      {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Clipboard className="w-3 h-3" />}
                      <span>{copiedSql ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Adicione a variável <code className="text-yellow-400 font-mono">SUPABASE_SERVICE_ROLE_KEY</code> no seu arquivo local <code className="text-slate-300 font-mono">.env.local</code> para habilitar o cadastro automático direto por esta janela! Enquanto isso, você pode copiar e rodar esta query gerada no SQL Editor do Supabase:
                  </p>
                  <textarea
                    readOnly
                    value={fallbackSql}
                    className="w-full h-24 bg-[#0b101d] text-[9px] font-mono text-cyan-400 p-2 border border-slate-800 rounded focus:outline-none resize-none overflow-y-auto leading-relaxed"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ex: António Silva"
                  className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1.5 uppercase">E-mail</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="antonio@cspace.ao"
                  className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Senha de Acesso</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres..."
                  className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1.5 uppercase">Nível de Acesso (Cargo)</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="block w-full px-3 py-2.5 bg-[#070b13] border border-slate-800 rounded-xl focus:outline-none text-slate-205 cursor-pointer"
                >
                  <option value="professor">Professor</option>
                  <option value="aluno">Aluno</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewUser}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  {isSubmittingNewUser ? 'Cadastrando no Banco...' : 'Cadastrar Membro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CURRÍCULO E PROGRESSO DO ESTUDANTE */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl bg-[#0b101d] rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#070b13]">
              <div className="flex items-center gap-3">
                <BookOpenCheck className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Currículo Académico</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedStudent.nome} • {selectedStudent.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo Modal */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs leading-normal">
              {loadingStudentModal ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                  <p className="text-slate-500 text-xs">Carregando dados curriculares...</p>
                </div>
              ) : (
                <>
                  {/* Banner de Status Geral */}
                  <div className="grid gap-4 sm:grid-cols-3 bg-[#070b13] p-4 border border-slate-800 rounded-xl text-center">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Turmas/Cursos Ativos</p>
                      <p className="text-lg font-extrabold text-white mt-1">
                        {studentEnrollments.filter(e => e.status === 'aprovado').length}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Exercícios Resolvidos</p>
                      <p className="text-lg font-extrabold text-indigo-400 mt-1">
                        {studentResponses.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Respostas Corretas</p>
                      <p className="text-lg font-extrabold text-emerald-400 mt-1">
                        {studentResponses.filter(r => r.correta).length}
                      </p>
                    </div>
                  </div>

                  {/* Listagem de Progresso por Curso/Aula */}
                  <div className="space-y-6">
                    <h4 className="font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">Turmas & Desempenho Curricular</h4>
                    
                    {studentEnrollments.length === 0 ? (
                      <p className="text-slate-500 text-center py-4 bg-[#070b13] rounded-xl">O aluno não está matriculado em nenhum curso.</p>
                    ) : (
                      studentEnrollments.map(enroll => {
                        const cursoAulas = lessonsMap[enroll.curso_id] || []
                        
                        return (
                          <div key={enroll.id} className="p-4 bg-[#070b13] border border-slate-800 rounded-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                              <span className="font-bold text-slate-200 text-xs">{enroll.curso?.titulo}</span>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                                enroll.status === 'aprovado' 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                  : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                              }`}>
                                Matrícula: {enroll.status}
                              </span>
                            </div>

                            {/* Timeline de Aulas */}
                            <div className="space-y-3 pl-2 border-l border-slate-800">
                              {cursoAulas.length === 0 ? (
                                <p className="text-[10px] text-slate-500">Nenhuma aula cadastrada nesta playlist.</p>
                              ) : (
                                cursoAulas.map(lesson => {
                                  // Exercícios da aula
                                  const aulaExercicios = allExercises.filter(ex => ex.aula_id === lesson.id)
                                  
                                  return (
                                    <div key={lesson.id} className="relative pl-4 space-y-2">
                                      {/* Bolinha da Timeline */}
                                      <span className="absolute -left-[18px] top-1 h-2 w-2 rounded-full bg-indigo-500 border border-slate-900" />
                                      
                                      <p className="font-semibold text-slate-350">
                                        Aula {lesson.ordem}: {lesson.titulo}
                                      </p>

                                      {/* Avaliação de Quizzes */}
                                      <div className="pl-2 space-y-1.5">
                                        {aulaExercicios.length === 0 ? (
                                          <p className="text-[9px] text-slate-500 italic">Sem exercícios cadastrados.</p>
                                        ) : (
                                          aulaExercicios.map(ex => {
                                            const resp = studentResponses.find(r => r.exercicio_id === ex.id)
                                            
                                            return (
                                              <div 
                                                key={ex.id} 
                                                className="p-2 bg-[#0b101d]/50 rounded-lg flex items-center justify-between gap-4 text-[10px]"
                                              >
                                                <div className="space-y-1">
                                                  <p className="font-medium text-slate-300">Questão: {ex.pergunta}</p>
                                                  {resp ? (
                                                    <p className="text-slate-400">
                                                      Resposta marcada: <span className="font-mono text-indigo-400">{ex.opcoes[resp.resposta_aluno]}</span>
                                                    </p>
                                                  ) : (
                                                    <p className="text-slate-500">Ainda não respondido.</p>
                                                  )}
                                                </div>

                                                <div className="shrink-0 font-bold">
                                                  {resp ? (
                                                    resp.correta ? (
                                                      <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                                        ✅ Correto
                                                      </span>
                                                    ) : (
                                                      <span className="text-rose-450 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                                                        ❌ Incorreto
                                                      </span>
                                                    )
                                                  ) : (
                                                    <span className="text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                                                      ⏳ Pendente
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            )
                                          })
                                        )}
                                      </div>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>

          {/* --- VIEW 7: NEWSLETTER SUBSCRIBERS --- */}
          {activeTab === 'newsletter' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Subscritores da Newsletter</h3>
                  <p className="text-xs text-slate-400 mt-1">{newsletterSubscribers.length} emails subscritos via landing page.</p>
                </div>
                <button
                  onClick={loadNewsletterSubscribers}
                  disabled={loadingNewsletter}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingNewsletter ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {loadingNewsletter ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                </div>
              ) : newsletterSubscribers.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">Nenhum subscritor ainda</p>
                  <p className="text-xs mt-1">Os emails aparecem aqui quando alguém subscrever na landing page.</p>
                </div>
              ) : (
                <div className="bg-[#0b101d] border border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-[#070b13]">
                        <th className="text-left p-4 font-bold text-slate-400 uppercase tracking-wider">#</th>
                        <th className="text-left p-4 font-bold text-slate-400 uppercase tracking-wider">Email</th>
                        <th className="text-left p-4 font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Nome</th>
                        <th className="text-left p-4 font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Data de Subscrição</th>
                        <th className="text-right p-4 font-bold text-slate-400 uppercase tracking-wider">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {newsletterSubscribers.map((sub, idx) => (
                        <tr key={sub.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-4 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="p-4">
                            <span className="font-semibold text-slate-200">{sub.email}</span>
                          </td>
                          <td className="p-4 text-slate-400 hidden sm:table-cell">{sub.nome || '—'}</td>
                          <td className="p-4 text-slate-500 hidden md:table-cell">
                            {new Date(sub.subscribed_at).toLocaleString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-4 text-right">
                            <a
                              href={`mailto:${sub.email}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-lg font-semibold transition-colors"
                            >
                              <Mail className="w-3 h-3" />
                              Enviar
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-800 bg-[#070b13] flex justify-end">
              <button 
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-805 hover:bg-slate-700 text-white rounded-xl font-bold text-xs"
              >
                Fechar Currículo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VISUALIZADOR DE COMPROVATIVO */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="relative w-full max-w-2xl bg-[#0b101d] rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#070b13]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Visualizar Recibo de Pagamento</h3>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="text-xs font-semibold text-slate-400 hover:text-white"
              >
                Fechar
              </button>
            </div>
            
            <div className="p-6 flex items-center justify-center min-h-[300px] max-h-[500px] overflow-auto bg-slate-950/40">
              {selectedReceipt.startsWith('/proofs') ? (
                <div className="w-80 p-6 bg-[#070b13] border border-slate-800 rounded-xl shadow-md font-mono text-[10px] text-slate-300 space-y-4">
                  <div className="text-center border-b border-dashed border-slate-800 pb-3">
                    <h4 className="font-bold text-xs">MULTICAIXA COMPROVATIVO</h4>
                    <p className="text-[9px] text-slate-500 mt-1">EMISSÃO: {new Date().toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p><strong>BANCO DE DESTINO:</strong> BFA</p>
                    <p><strong>IBAN DESTINO:</strong> AO06.0006...012.3</p>
                    <p><strong>BENEFICIÁRIO:</strong> C-Space Technologies</p>
                    <p className="border-t border-dashed border-slate-800 pt-2 font-bold text-white">
                      VALOR DA TRANSFERÊNCIA:
                    </p>
                    <p className="text-xs font-extrabold text-indigo-400">25.000,00 Kz</p>
                  </div>
                  <div className="text-center border-t border-dashed border-slate-800 pt-3 text-[9px] text-slate-500">
                    <p>C-Space Academy - Modo Demonstração</p>
                    <p className="mt-1">ARQUIVO: {selectedReceipt.split('/').pop()}</p>
                  </div>
                </div>
              ) : (
                /* Imagem ou PDF Real do Supabase */
                selectedReceipt.endsWith('.pdf') ? (
                  <iframe src={selectedReceipt} className="w-full h-96 border-none" />
                ) : (
                  <img src={selectedReceipt} alt="Comprovante" className="max-w-full max-h-96 object-contain rounded shadow" />
                )
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
