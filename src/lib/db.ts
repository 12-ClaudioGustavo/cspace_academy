import { createClient as createBrowserClient } from './supabase/client'

// Tipagens do Sistema
export interface Perfil {
  id: string
  nome: string
  email: string
  role: 'admin' | 'professor' | 'aluno'
  criado_em: string
}

export interface Curso {
  id: string
  titulo: string
  descricao: string
  preco: number
  capa_url: string
  publicado: boolean
  criado_em: string
  professor_id?: string | null
  professor?: Perfil
}

export interface Inscricao {
  id: string
  aluno_id: string
  curso_id: string
  status: 'pendente' | 'aprovado' | 'rejeitado'
  comprovativo_url: string
  data_solicitacao: string
  data_aprovacao?: string
  aluno?: Perfil
  curso?: Curso
}

export interface Aula {
  id: string
  curso_id: string
  titulo: string
  descricao: string
  ordem: number
  data_hora_live?: string | null // ISO string
  sala_live_id?: string | null
  criado_em: string
  materiais?: Material[]
  exercicios?: Exercicio[]
}

export interface Material {
  id: string
  aula_id: string
  titulo: string
  arquivo_url: string
}

export interface Exercicio {
  id: string
  aula_id: string
  pergunta: string
  opcoes: string[]
  resposta_correta: number // índice
}

export interface RespostaExercicio {
  id: string
  aluno_id: string
  exercicio_id: string
  resposta_aluno: number
  correta: boolean
  respondido_em: string
}

// Verifica se as credenciais do Supabase foram preenchidas e não são as originais do template
export const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return (
    url && 
    key && 
    url !== 'https://seu-projeto.supabase.co' && 
    key !== 'sua-chave-anonima-aqui'
  )
}

// --- MOCK DATABASE (BANCO DE DADOS DE SIMULAÇÃO) ---
const MOCK_COURSES: Curso[] = [
  {
    id: 'curso-desenvolvimento-web-7d',
    titulo: 'Formação Intensiva de Desenvolvimento Web',
    descricao: 'Aprenda HTML5, CSS3, JavaScript moderno, Git/GitHub e lance o seu primeiro projeto profissional em apenas 7 dias.',
    preco: 25000.00, // ex: 25.000 Kwanzas
    capa_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
    publicado: true,
    criado_em: new Date().toISOString()
  },
  {
    id: 'curso-react-next-level',
    titulo: 'Especialização React & Next.js Pro',
    descricao: 'Domine a stack favorita das grandes empresas de tecnologia e crie aplicações web de altíssima escala e velocidade.',
    preco: 45000.00,
    capa_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=600&q=80',
    publicado: true,
    criado_em: new Date().toISOString()
  }
]

const MOCK_LESSONS: Aula[] = [
  {
    id: 'aula-1',
    curso_id: 'curso-desenvolvimento-web-7d',
    titulo: 'Dia 1 – Abertura e Introdução ao Desenvolvimento Web',
    descricao: 'Apresentação da C-Space Academy, como funciona a internet, conceitos de Front-end/Back-end e instalação de ferramentas (VS Code, Extensões).',
    ordem: 1,
    data_hora_live: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(), // Live hoje às 19:00
    sala_live_id: 'cspace-devweb-dia1',
    criado_em: new Date().toISOString()
  },
  {
    id: 'aula-2',
    curso_id: 'curso-desenvolvimento-web-7d',
    titulo: 'Dia 2 – HTML5 na Prática',
    descricao: 'Estruturação de páginas web com HTML5, títulos, links, imagens, formulários de cadastro e listas organizadas.',
    ordem: 2,
    data_hora_live: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), // Live amanhã
    sala_live_id: 'cspace-devweb-dia2',
    criado_em: new Date().toISOString()
  },
  {
    id: 'aula-3',
    curso_id: 'curso-desenvolvimento-web-7d',
    titulo: 'Dia 3 – CSS3 e Design Premium',
    descricao: 'Cores, fontes modernas do Google, Flexbox para layouts, cards, botões de ação e animações sutis.',
    ordem: 3,
    data_hora_live: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
    sala_live_id: 'cspace-devweb-dia3',
    criado_em: new Date().toISOString()
  },
  {
    id: 'aula-4',
    curso_id: 'curso-desenvolvimento-web-7d',
    titulo: 'Dia 4 – Layout Responsivo e landing pages',
    descricao: 'Técnicas de responsividade para dispositivos móveis, design de navbar móvel, seções Hero e footer institucional.',
    ordem: 4,
    data_hora_live: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString(),
    sala_live_id: 'cspace-devweb-dia4',
    criado_em: new Date().toISOString()
  },
  {
    id: 'aula-5',
    curso_id: 'curso-desenvolvimento-web-7d',
    titulo: 'Dia 5 – Programação e JS Dinâmico',
    descricao: 'Introdução ao JavaScript, manipulação da árvore DOM, eventos de clique, variáveis, funções e validações de campos.',
    ordem: 5,
    data_hora_live: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString(),
    sala_live_id: 'cspace-devweb-dia5',
    criado_em: new Date().toISOString()
  },
  {
    id: 'aula-6',
    curso_id: 'curso-desenvolvimento-web-7d',
    titulo: 'Dia 6 – Versionamento com Git e GitHub',
    descricao: 'Aprenda comandos essenciais do Git, crie repositórios no GitHub, envie o seu código e publique a sua página web de forma gratuita.',
    ordem: 6,
    data_hora_live: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
    sala_live_id: 'cspace-devweb-dia6',
    criado_em: new Date().toISOString()
  },
  {
    id: 'aula-7',
    curso_id: 'curso-desenvolvimento-web-7d',
    titulo: 'Dia 7 – Conclusão, Apresentação e Certificados',
    descricao: 'Apresentação dos portfólios desenvolvidos, sessões de feedback, entrega de certificados e orientação sobre carreiras na tecnologia.',
    ordem: 7,
    data_hora_live: new Date(new Date().setDate(new Date().getDate() + 6)).toISOString(),
    sala_live_id: 'cspace-devweb-dia7',
    criado_em: new Date().toISOString()
  }
]

const MOCK_MATERIALS: Material[] = [
  { id: 'mat-1', aula_id: 'aula-1', titulo: 'PDF - Slides de Abertura & Introdução', arquivo_url: '/materials/dia1_introducao.pdf' },
  { id: 'mat-2', aula_id: 'aula-1', titulo: 'Guia de Instalação do VS Code', arquivo_url: '/materials/guia_vscode.pdf' },
  { id: 'mat-3', aula_id: 'aula-2', titulo: 'PDF - Manual de Tags HTML5', arquivo_url: '/materials/dia2_html5.pdf' },
  { id: 'mat-4', aula_id: 'aula-3', titulo: 'Cheat Sheet de Flexbox CSS', arquivo_url: '/materials/dia3_css_flexbox.pdf' }
]

const MOCK_EXERCISES: Exercicio[] = [
  {
    id: 'ex-1',
    aula_id: 'aula-1',
    pergunta: 'O que significa HTML?',
    opcoes: [
      'Hyper Text Markup Language',
      'High Tech Modern Language',
      'Home Tool Markup Line',
      'Hyperlink Text Medium Loop'
    ],
    resposta_correta: 0
  },
  {
    id: 'ex-2',
    aula_id: 'aula-1',
    pergunta: 'Qual extensão do VS Code nos permite rodar um servidor de testes instantâneo?',
    opcoes: [
      'Prettier',
      'Live Server',
      'GitLens',
      'Auto Rename Tag'
    ],
    resposta_correta: 1
  },
  {
    id: 'ex-3',
    aula_id: 'aula-2',
    pergunta: 'Qual tag HTML5 é a mais indicada para o título principal de uma página?',
    opcoes: [
      '<p>',
      '<header>',
      '<h1>',
      '<title>'
    ],
    resposta_correta: 2
  }
]

// Estado persistido no localStorage (apenas no browser)
const getLocalStorageData = <T>(key: string, initial: T): T => {
  if (typeof window === 'undefined') return initial
  const saved = localStorage.getItem(key)
  return saved ? JSON.parse(saved) : initial
}

const saveLocalStorageData = <T>(key: string, data: T) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data))
  }
}

// Simulando sessões
export const getLoggedUser = (): Perfil | null => {
  return getLocalStorageData<Perfil | null>('cspace_user', {
    id: 'user-aluno-1',
    nome: 'Cláudio Cajado',
    email: 'claudio@cspace.ao',
    role: 'aluno',
    criado_em: new Date().toISOString()
  })
}

export const setLoggedUser = (user: Perfil | null) => {
  saveLocalStorageData('cspace_user', user)
}

// Métodos de dados unificados (com Fallback automático)
export const getCourses = async (): Promise<Curso[]> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('cursos')
      .select('*, professor:professor_id(*)')
      .order('criado_em', { ascending: false })
    
    if (!error && data) return data as Curso[]

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('cursos')
      .select('*')
      .order('criado_em', { ascending: false })
    if (!fallbackError && fallbackData) return fallbackData as Curso[]
  }
  return MOCK_COURSES
}

export const getCourseById = async (id: string): Promise<Curso | null> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('cursos')
      .select('*, professor:professor_id(*)')
      .eq('id', id)
      .single()
    if (!error && data) return data as Curso

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('cursos')
      .select('*')
      .eq('id', id)
      .single()
    if (!fallbackError && fallbackData) return fallbackData as Curso
  }
  return MOCK_COURSES.find(c => c.id === id) || null
}

export const getLessons = async (courseId: string): Promise<Aula[]> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase.from('aulas').select('*').eq('curso_id', courseId).order('ordem', { ascending: true })
    if (!error && data) return data as Aula[]
  }
  return MOCK_LESSONS.filter(l => l.curso_id === courseId)
}

export const getLessonDetails = async (lessonId: string): Promise<Aula | null> => {
  let lesson: Aula | null = null
  
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data: lessonData } = await supabase.from('aulas').select('*').eq('id', lessonId).single()
    if (lessonData) {
      lesson = lessonData as Aula
      const { data: mats } = await supabase.from('materiais').select('*').eq('aula_id', lessonId)
      const { data: execs } = await supabase.from('exercicios').select('*').eq('aula_id', lessonId)
      lesson.materiais = mats || []
      lesson.exercicios = execs || []
      return lesson
    }
  }

  const found = MOCK_LESSONS.find(l => l.id === lessonId)
  if (found) {
    lesson = { ...found }
    const list = getLocalStorageData<Material[]>('cspace_materials', MOCK_MATERIALS)
    lesson.materiais = list.filter(m => m.aula_id === lessonId)
    lesson.exercicios = MOCK_EXERCISES.filter(e => e.aula_id === lessonId)
  }
  return lesson
}

export const getEnrollments = async (userId: string): Promise<Inscricao[]> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('inscricoes')
      .select('*, cursos(*)')
      .eq('aluno_id', userId)
    if (!error && data) {
      return data.map(item => ({
        ...item,
        curso: item.cursos
      })) as Inscricao[]
    }
  }

  const list = getLocalStorageData<Inscricao[]>('cspace_enrollments', [
    {
      id: 'enroll-1',
      aluno_id: 'user-aluno-1',
      curso_id: 'curso-desenvolvimento-web-7d',
      status: 'aprovado',
      comprovativo_url: '/proofs/comprovativo_mock.pdf',
      data_solicitacao: new Date().toISOString(),
      data_aprovacao: new Date().toISOString()
    }
  ])
  
  // Anexa dados do curso
  return list.filter(item => item.aluno_id === userId).map(item => ({
    ...item,
    curso: MOCK_COURSES.find(c => c.id === item.curso_id)
  }))
}

export const requestEnrollment = async (userId: string, courseId: string, comprovativoUrl: string): Promise<Inscricao> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('inscricoes')
      .insert({
        aluno_id: userId,
        curso_id: courseId,
        comprovativo_url: comprovativoUrl,
        status: 'pendente'
      })
      .select()
      .single()
    if (!error && data) return data as Inscricao
  }

  const list = getLocalStorageData<Inscricao[]>('cspace_enrollments', [])
  const newEnrollment: Inscricao = {
    id: `enroll-${Math.random().toString(36).substring(2, 9)}`,
    aluno_id: userId,
    curso_id: courseId,
    status: 'pendente',
    comprovativo_url: comprovativoUrl,
    data_solicitacao: new Date().toISOString()
  }
  
  list.push(newEnrollment)
  saveLocalStorageData('cspace_enrollments', list)
  return newEnrollment
}

// Ações do Administrador
export const getPendingEnrollments = async (): Promise<Inscricao[]> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('inscricoes')
      .select('*, perfis(*), cursos(*)')
      .eq('status', 'pendente')
    if (!error && data) {
      return data.map(item => ({
        ...item,
        aluno: item.perfis,
        curso: item.cursos
      })) as Inscricao[]
    }
  }

  const list = getLocalStorageData<Inscricao[]>('cspace_enrollments', [])
  // Mock users
  const mockStudent: Perfil = {
    id: 'user-aluno-1',
    nome: 'Cláudio Cajado',
    email: 'claudio@cspace.ao',
    role: 'aluno',
    criado_em: new Date().toISOString()
  }
  
  return list.filter(item => item.status === 'pendente').map(item => ({
    ...item,
    aluno: mockStudent,
    curso: MOCK_COURSES.find(c => c.id === item.curso_id)
  }))
}

export const approveEnrollment = async (enrollmentId: string): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('inscricoes')
      .update({ status: 'aprovado', data_aprovacao: new Date().toISOString() })
      .eq('id', enrollmentId)
    return !error
  }

  const list = getLocalStorageData<Inscricao[]>('cspace_enrollments', [])
  const index = list.findIndex(item => item.id === enrollmentId)
  if (index !== -1) {
    list[index].status = 'aprovado'
    list[index].data_aprovacao = new Date().toISOString()
    saveLocalStorageData('cspace_enrollments', list)
    return true
  }
  return false
}

export const rejectEnrollment = async (enrollmentId: string): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('inscricoes')
      .update({ status: 'rejeitado' })
      .eq('id', enrollmentId)
    return !error
  }

  const list = getLocalStorageData<Inscricao[]>('cspace_enrollments', [])
  const index = list.findIndex(item => item.id === enrollmentId)
  if (index !== -1) {
    list[index].status = 'rejeitado'
    saveLocalStorageData('cspace_enrollments', list)
    return true
  }
  return false
}

// Exercícios Respostas
export const getExerciseResponses = async (userId: string): Promise<RespostaExercicio[]> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data } = await supabase.from('respostas_exercicios').select('*').eq('aluno_id', userId)
    return (data || []) as RespostaExercicio[]
  }
  return getLocalStorageData<RespostaExercicio[]>(`cspace_resp_${userId}`, [])
}

export const submitExerciseResponse = async (userId: string, exerciseId: string, answerIndex: number, isCorrect: boolean): Promise<RespostaExercicio> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('respostas_exercicios')
      .insert({
        aluno_id: userId,
        exercicio_id: exerciseId,
        resposta_aluno: answerIndex,
        correta: isCorrect
      })
      .select()
      .single()
    if (!error && data) return data as RespostaExercicio
  }

  const list = getLocalStorageData<RespostaExercicio[]>(`cspace_resp_${userId}`, [])
  
  // Remove se já respondeu
  const filtered = list.filter(item => item.exercicio_id !== exerciseId)
  const newResponse: RespostaExercicio = {
    id: `resp-${Math.random().toString(36).substring(2, 9)}`,
    aluno_id: userId,
    exercicio_id: exerciseId,
    resposta_aluno: answerIndex,
    correta: isCorrect,
    respondido_em: new Date().toISOString()
  }
  
  filtered.push(newResponse)
  saveLocalStorageData(`cspace_resp_${userId}`, filtered)
  return newResponse
}

// Administração de Cursos/Aulas
export const createCourse = async (curso: Omit<Curso, 'id' | 'criado_em'>): Promise<Curso> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase.from('cursos').insert(curso).select().single()
    if (error) {
      console.error("Error creating course:", error)
      throw new Error(error.message || "Erro ao criar curso no banco de dados.")
    }
    if (data) return data as Curso
  }
  
  const newCourse: Curso = {
    ...curso,
    id: `curso-${Math.random().toString(36).substring(2, 9)}`,
    criado_em: new Date().toISOString()
  }
  MOCK_COURSES.push(newCourse)
  return newCourse
}

export const createLesson = async (aula: Omit<Aula, 'id' | 'criado_em'>): Promise<Aula> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase.from('aulas').insert(aula).select().single()
    if (error) {
      console.error("Error creating lesson:", error)
      throw new Error(error.message || "Erro ao cadastrar aula no banco de dados.")
    }
    if (data) return data as Aula
  }
  
  const newLesson: Aula = {
    ...aula,
    id: `aula-${Math.random().toString(36).substring(2, 9)}`,
    criado_em: new Date().toISOString()
  }
  MOCK_LESSONS.push(newLesson)
  return newLesson
}

export const createExercise = async (exercicio: Omit<Exercicio, 'id'>): Promise<Exercicio> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase.from('exercicios').insert(exercicio).select().single()
    if (error) {
      console.error("Error creating exercise:", error)
      throw new Error(error.message || "Erro ao criar exercício no banco de dados.")
    }
    if (data) return data as Exercicio
  }
  
  const newEx: Exercicio = {
    ...exercicio,
    id: `ex-${Math.random().toString(36).substring(2, 9)}`
  }
  MOCK_EXERCISES.push(newEx)
  return newEx
}


export const updateCourse = async (id: string, updates: Partial<Curso>): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('cursos').update(updates).eq('id', id)
    return !error
  }
  const index = MOCK_COURSES.findIndex(c => c.id === id)
  if (index !== -1) {
    MOCK_COURSES[index] = { ...MOCK_COURSES[index], ...updates }
    return true
  }
  return false
}

export const deleteCourse = async (id: string): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('cursos').delete().eq('id', id)
    if (error) {
      console.error("Error deleting course:", error)
      throw new Error(error.message || "Erro ao excluir curso no banco de dados.")
    }
    return true
  }
  const index = MOCK_COURSES.findIndex(c => c.id === id)
  if (index !== -1) {
    MOCK_COURSES.splice(index, 1)
    return true
  }
  return false
}

export const updateLesson = async (id: string, updates: Partial<Aula>): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('aulas').update(updates).eq('id', id)
    return !error
  }
  const index = MOCK_LESSONS.findIndex(l => l.id === id)
  if (index !== -1) {
    MOCK_LESSONS[index] = { ...MOCK_LESSONS[index], ...updates }
    return true
  }
  return false
}

export const deleteLesson = async (id: string): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('aulas').delete().eq('id', id)
    if (error) {
      console.error("Error deleting lesson:", error)
      throw new Error(error.message || "Erro ao excluir aula no banco de dados.")
    }
    return true
  }
  const index = MOCK_LESSONS.findIndex(l => l.id === id)
  if (index !== -1) {
    MOCK_LESSONS.splice(index, 1)
    return true
  }
  return false
}

export const deleteExercise = async (id: string): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('exercicios').delete().eq('id', id)
    if (error) {
      console.error("Error deleting exercise:", error)
      throw new Error(error.message || "Erro ao excluir exercício no banco de dados.")
    }
    return true
  }
  const index = MOCK_EXERCISES.findIndex(e => e.id === id)
  if (index !== -1) {
    MOCK_EXERCISES.splice(index, 1)
    return true
  }
  return false
}

export const getAllProfiles = async (): Promise<Perfil[]> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase.from('perfis').select('*').order('criado_em', { ascending: false })
    if (!error && data) return data as Perfil[]
  }
  return getLocalStorageData<Perfil[]>('cspace_profiles', [
    {
      id: 'user-aluno-1',
      nome: 'Cláudio Cajado',
      email: 'claudio@cspace.ao',
      role: 'aluno',
      criado_em: new Date().toISOString()
    },
    {
      id: 'd1b8c6e2-2a7f-4b3d-9d7e-0c1f2b3a4c5d',
      nome: 'Josemar',
      email: 'josemargstv@gmail.com',
      role: 'admin',
      criado_em: new Date().toISOString()
    },
    {
      id: 'user-prof-1',
      nome: 'Prof. António Silva',
      email: 'antonio@cspace.ao',
      role: 'professor',
      criado_em: new Date().toISOString()
    }
  ])
}

export const updateProfileRole = async (userId: string, role: 'admin' | 'professor' | 'aluno'): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('perfis').update({ role }).eq('id', userId)
    return !error
  }
  const list = getLocalStorageData<Perfil[]>('cspace_profiles', [])
  const index = list.findIndex(p => p.id === userId)
  if (index !== -1) {
    list[index].role = role
    saveLocalStorageData('cspace_profiles', list)
    return true
  }
  return false
}

export const deleteProfile = async (userId: string): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('perfis').delete().eq('id', userId)
    if (error) {
      console.error("Error deleting profile:", error)
      throw new Error(error.message || "Erro ao excluir perfil no banco de dados.")
    }
    return true
  }
  const list = getLocalStorageData<Perfil[]>('cspace_profiles', [])
  const index = list.findIndex(p => p.id === userId)
  if (index !== -1) {
    list.splice(index, 1)
    saveLocalStorageData('cspace_profiles', list)
    return true
  }
  return false
}

export const getAllEnrollments = async (): Promise<Inscricao[]> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('inscricoes')
      .select('*, aluno:perfis!aluno_id(*), curso:cursos(*)')
      .order('data_solicitacao', { ascending: false })
    if (!error && data) {
      return data as Inscricao[]
    }
  }
  
  // Fallback para mock
  const list = getLocalStorageData<Inscricao[]>('cspace_enrollments', [
    {
      id: 'enroll-1',
      aluno_id: 'user-aluno-1',
      curso_id: 'curso-desenvolvimento-web-7d',
      status: 'aprovado',
      comprovativo_url: '/proofs/comprovativo_mock.pdf',
      data_solicitacao: new Date().toISOString(),
      data_aprovacao: new Date().toISOString()
    }
  ])
  const mockStudent: Perfil = {
    id: 'user-aluno-1',
    nome: 'Cláudio Cajado',
    email: 'claudio@cspace.ao',
    role: 'aluno',
    criado_em: new Date().toISOString()
  }
  return list.map(item => ({
    ...item,
    aluno: mockStudent,
    curso: MOCK_COURSES.find(c => c.id === item.curso_id)
  }))
}

export const getAllExercises = async (): Promise<Exercicio[]> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase.from('exercicios').select('*')
    if (!error && data) return data as Exercicio[]
  }
  return MOCK_EXERCISES
}

export const registerUserMock = async (user: { nome: string, email: string, role: 'admin' | 'professor' | 'aluno' }): Promise<Perfil> => {
  const list = getLocalStorageData<Perfil[]>('cspace_profiles', [])
  const newUser: Perfil = {
    id: 'mock-user-' + Math.random().toString(36).substring(2, 9),
    nome: user.nome,
    email: user.email,
    role: user.role,
    criado_em: new Date().toISOString()
  }
  list.push(newUser)
  saveLocalStorageData('cspace_profiles', list)
  return newUser
}

export const createMaterial = async (material: Omit<Material, 'id'>): Promise<Material> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('materiais')
      .insert([material])
      .select()
    if (!error && data && data.length > 0) return data[0] as Material
  }
  const list = getLocalStorageData<Material[]>('cspace_materials', MOCK_MATERIALS)
  const newMat: Material = {
    id: `mat-${Math.random().toString(36).substring(2, 9)}`,
    ...material
  }
  list.push(newMat)
  saveLocalStorageData('cspace_materials', list)
  return newMat
}

export const deleteMaterial = async (id: string): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserClient()
    const { error } = await supabase.from('materiais').delete().eq('id', id)
    if (error) {
      console.error("Error deleting material:", error)
      throw new Error(error.message || "Erro ao excluir material no banco de dados.")
    }
    return true
  }
  const list = getLocalStorageData<Material[]>('cspace_materials', MOCK_MATERIALS)
  const filtered = list.filter(m => m.id !== id)
  saveLocalStorageData('cspace_materials', filtered)
  return true
}
