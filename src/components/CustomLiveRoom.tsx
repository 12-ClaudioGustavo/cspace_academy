'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Perfil, isSupabaseConfigured } from '@/lib/db'
import { createClient } from '@/lib/supabase/client'
import { 
  Video, VideoOff, Mic, MicOff, Monitor, StopCircle, 
  Play, Users, Shield, AlertCircle, RefreshCw, ExternalLink,
  MessageSquare, Send, X, Maximize, Minimize, Maximize2, Minimize2
} from 'lucide-react'

export interface PresentUser {
  id: string
  nome: string
  role: 'admin' | 'professor' | 'aluno'
  handRaised?: boolean
  micAuthorized?: boolean
}

interface CustomLiveRoomProps {
  roomName: string
  user: Perfil
}

export function CustomLiveRoom({ roomName, user }: CustomLiveRoomProps) {
  const isProfessor = user.role === 'professor' || user.role === 'admin'
  
  // Deteta se o roomName é um link de streaming externo
  const isExternalUrl = 
    roomName.startsWith('http://') || 
    roomName.startsWith('https://') || 
    roomName.includes('youtube.com') || 
    roomName.includes('youtu.be') || 
    roomName.includes('twitch.tv') || 
    roomName.includes('.m3u8')

  if (isExternalUrl) {
    return <ExternalStreamPlayer url={roomName} />
  }

  return <WebRTCLiveRoom roomName={roomName} user={user} isProfessor={isProfessor} />
}

// ==========================================
// 1. JOGADOR DE STREAM EXTERNO (Fallback)
// ==========================================
function ExternalStreamPlayer({ url }: { url: string }) {
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
  const isTwitch = url.includes('twitch.tv')

  let embedUrl = url
  if (isYouTube) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    const videoId = (match && match[2].length === 11) ? match[2] : null
    embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : url
  } else if (isTwitch) {
    // Extrai o canal
    const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/)
    const channel = match ? match[1] : null
    embedUrl = channel ? `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&autoplay=true` : url
  }

  return (
    <div className="relative h-full w-full bg-slate-950 rounded-2xl overflow-hidden flex flex-col border border-slate-800">
      <div className="absolute top-3 left-3 bg-red-650 bg-red-600 text-white font-bold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse z-15 flex items-center gap-1 shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
        <span>Live Externa</span>
      </div>

      <div className="flex-1 w-full h-full">
        {isYouTube || isTwitch ? (
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-350 p-6 text-center space-y-4">
            <Video className="w-12 h-12 text-indigo-400 animate-pulse" />
            <div>
              <h3 className="font-bold text-white text-sm">Aula ao Vivo Programada</h3>
              <p className="text-[11px] text-slate-450 mt-1 max-w-sm">Esta live está sendo transmitida por uma plataforma externa.</p>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow transition-colors"
            >
              <span>Abrir Transmissão Externa</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// 2. SALA WEBRTC IN-HOUSE (P2P + Supabase)
// ======================================
function WebRTCLiveRoom({ 
  roomName, user, isProfessor 
}: { roomName: string, user: Perfil, isProfessor: boolean }) {
  
  const [streamActive, setStreamActive] = useState(false)
  const [onlineStudents, setOnlineStudents] = useState<string[]>([])
  const [onlineUsers, setOnlineUsers] = useState<PresentUser[]>([])
  const handRaisedRef = useRef(false)
  const micAuthorizedRef = useRef(false)
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [sharingScreen, setSharingScreen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Remote Tracks state for student
  const [remoteTracks, setRemoteTracks] = useState<MediaStreamTrack[]>([])
  
  // Controle do Microfone do Aluno (Chamada de Voz Bidirecional)
  const [studentMicOn, setStudentMicOn] = useState(false)
  const studentMicOnRef = useRef(false)
  const studentLocalStreamRef = useRef<MediaStream | null>(null)
  
  // Estados para Pedido de Fala (Levantar a Mão)
  const [handRaises, setHandRaises] = useState<{ id: string, nome: string }[]>([])
  const [handRaised, setHandRaised] = useState(false)
  const [micAuthorized, setMicAuthorized] = useState(false)
  
  // Chat state
  const [messages, setMessages] = useState<any[]>([])
  const [chatOpen, setChatOpen] = useState(false)
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'participants'>('chat')
  const [chatInput, setChatInput] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Ecrã Inteiro e Redimensionamento
  const [videoFit, setVideoFit] = useState<'cover' | 'contain'>('contain')
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const pipVideoRef = useRef<HTMLVideoElement>(null)
  const streamAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  
  // Conexões WebRTC
  // Professor guarda conexão para cada estudante: { [studentId]: RTCPeerConnection }
  const pcsRef = useRef<{ [key: string]: RTCPeerConnection }>({})
  // Estudante guarda conexão com o Professor
  const pcRef = useRef<RTCPeerConnection | null>(null)
  
  // Identificadores de Sessão de Conexão para evitar condições de corrida (Race Conditions)
  const connectionIdsRef = useRef<{ [key: string]: string }>({})
  const connectionIdRef = useRef<string | null>(null)
  
  // Filas para guardar candidatos ICE recebidos antes do remoteDescription estar definido
  const studentQueuedCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const professorQueuedCandidatesRef = useRef<{ [key: string]: RTCIceCandidateInit[] }>({})
  
  // Canal Supabase Realtime
  const channelRef = useRef<any>(null)
  const supabase = isSupabaseConfigured() ? createClient() : null

  // Ref to track streamActive and sharingScreen without resubscribing
  const streamActiveRef = useRef(streamActive)
  const sharingScreenRef = useRef(sharingScreen)
  
  useEffect(() => {
    streamActiveRef.current = streamActive
  }, [streamActive])

  useEffect(() => {
    sharingScreenRef.current = sharingScreen
  }, [sharingScreen])

  useEffect(() => {
    handRaisedRef.current = handRaised
  }, [handRaised])

  useEffect(() => {
    micAuthorizedRef.current = micAuthorized
  }, [micAuthorized])

  const updatePresenceMetadata = useCallback(async (overrides: Record<string, any> = {}) => {
    if (channelRef.current && supabase) {
      await channelRef.current.track({
        nome: user.nome,
        role: user.role,
        isStreaming: isProfessor ? streamActiveRef.current : false,
        handRaised: !isProfessor ? handRaisedRef.current : false,
        micAuthorized: !isProfessor ? micAuthorizedRef.current : false,
        ...overrides
      })
    }
  }, [user.nome, user.role, isProfessor, supabase])

  useEffect(() => {
    updatePresenceMetadata()
  }, [streamActive, handRaised, micAuthorized, updatePresenceMetadata])

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, chatOpen])

  // Helper for student to update tracks list
  const updateRemoteTracks = () => {
    if (!pcRef.current) return
    const videoTracks = pcRef.current.getReceivers()
      .filter(r => r.track && r.track.kind === 'video')
      .map(r => r.track!)
    setRemoteTracks(videoTracks)
  }

  // 1. Inicializa o Canal de Realtime e Presença
  useEffect(() => {
    if (!supabase) {
      // Modo Mock: simula sinalização
      setOnlineStudents(['António Silva (Mock)', 'Estudante Simulado'])
      return
    }

    const channelId = `live_channel_${roomName}`
    const channel = supabase.channel(channelId, {
      config: {
        presence: {
          key: user.id
        }
      }
    })

    channelRef.current = channel

    // Ouvir mensagens de sinalização do WebRTC e Chat
    channel.on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
      const { targetId, senderId, type, connectionId, data } = payload
      
      // Apenas processa se for direcionado a mim
      if (targetId !== user.id) return

      try {
        // Validação de Session/Connection ID para evitar condições de corrida (Race Conditions)
        if (connectionId) {
          if (isProfessor) {
            const currentId = connectionIdsRef.current[senderId]
            if (currentId && currentId !== connectionId) {
              console.warn(`[WebRTC] Sinal '${type}' descartado no professor: ID antigo (${connectionId}) vs atual (${currentId})`)
              return
            }
          } else {
            const currentId = connectionIdRef.current
            if (currentId && currentId !== connectionId) {
              console.warn(`[WebRTC] Sinal '${type}' descartado no aluno: ID antigo (${connectionId}) vs atual (${currentId})`)
              return
            }
          }
        }

        if (type === 'offer' && !isProfessor) {
          // Estudante recebe proposta do Professor
          if (connectionId) {
            connectionIdRef.current = connectionId
          }
          await handleOffer(senderId, data, connectionId)
        } else if (type === 'answer' && isProfessor) {
          // Professor recebe resposta do Estudante
          await handleAnswer(senderId, data)
        } else if (type === 'ice-candidate') {
          // Ambos recebem candidatos ICE
          const pc = isProfessor ? pcsRef.current[senderId] : pcRef.current
          if (pc) {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(data)).catch(e => console.error('Erro ao adicionar candidato ICE:', e))
            } else {
              if (isProfessor) {
                if (!professorQueuedCandidatesRef.current[senderId]) {
                  professorQueuedCandidatesRef.current[senderId] = []
                }
                professorQueuedCandidatesRef.current[senderId].push(data)
              } else {
                studentQueuedCandidatesRef.current.push(data)
              }
            }
          }
        }
      } catch (err) {
        console.error('Erro no processamento do sinal WebRTC:', err)
      }
    })

    // Ouvir pedido de conexão do aluno
    channel.on('broadcast', { event: 'webrtc-request-offer' }, ({ payload }) => {
      const { senderId } = payload
      if (isProfessor && streamActiveRef.current && localStreamRef.current) {
        initiateConnectionToStudent(senderId, localStreamRef.current)
      }
    })

    channel.on('broadcast', { event: 'chat-message' }, ({ payload }) => {
      setMessages(prev => [...prev, payload])
      if (!chatOpen) {
        setUnreadCount(c => c + 1)
      }
    })

    // Ouvir hand-raise e microfone signals
    channel.on('broadcast', { event: 'raise-hand' }, ({ payload }) => {
      const { studentId, nome } = payload
      if (isProfessor) {
        setHandRaises(prev => {
          if (!prev.some(item => item.id === studentId)) {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('Pedido para Falar ✋', {
                  body: `${nome} solicitou falar na aula.`,
                  tag: `raise-hand-${studentId}`
                })
              } catch (e) {
                console.error(e)
              }
            }
            return [...prev, { id: studentId, nome }]
          }
          return prev
        })
      }
    })

    channel.on('broadcast', { event: 'lower-hand' }, ({ payload }) => {
      const { studentId } = payload
      if (isProfessor) {
        setHandRaises(prev => prev.filter(item => item.id !== studentId))
      }
    })

    channel.on('broadcast', { event: 'permit-mic' }, ({ payload }) => {
      const { targetId } = payload
      if (!isProfessor && targetId === user.id) {
        setMicAuthorized(true)
        micAuthorizedRef.current = true
        setHandRaised(false)
        handRaisedRef.current = false
        updatePresenceMetadata()
      }
    })

    channel.on('broadcast', { event: 'revoke-mic' }, ({ payload }) => {
      const { targetId } = payload
      if (!isProfessor && targetId === user.id) {
        setMicAuthorized(false)
        micAuthorizedRef.current = false
        setHandRaised(false)
        handRaisedRef.current = false
        setStudentMicOn(false)
        studentMicOnRef.current = false
        if (studentLocalStreamRef.current) {
          const track = studentLocalStreamRef.current.getAudioTracks()[0]
          if (track) track.enabled = false
        }
        updatePresenceMetadata()
      }
    })

    // Presença: rastrear quem está online na sala
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState()
      const names: string[] = []
      const usersList: PresentUser[] = []
      
      Object.keys(presenceState).forEach(id => {
        const pres = presenceState[id] as any
        if (pres && pres[0]) {
          names.push(pres[0].nome || 'Utilizador')
          usersList.push({
            id: id,
            nome: pres[0].nome || 'Utilizador',
            role: pres[0].role || 'aluno',
            handRaised: pres[0].handRaised || false,
            micAuthorized: pres[0].micAuthorized || false
          })
        }
      })
      setOnlineStudents(names.filter(n => n !== user.nome))
      setOnlineUsers(usersList)

      // Se for professor e a live estiver ativa, iniciar conexão com quem não tiver conexão ativa
      if (isProfessor && streamActiveRef.current && localStreamRef.current) {
        Object.keys(presenceState).forEach(id => {
          if (id !== user.id) {
            const pc = pcsRef.current[id]
            if (!pc || pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
              initiateConnectionToStudent(id, localStreamRef.current!)
            }
          }
        })
      }
    })

    // Inscreve no canal com metadata do utilizador
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await updatePresenceMetadata()

        // Aluno envia pedido de conexão imediatamente caso o professor já esteja online
        if (!isProfessor) {
          channel.send({
            type: 'broadcast',
            event: 'webrtc-request-offer',
            payload: { senderId: user.id }
          })
        }
      }
    })

    return () => {
      channel.unsubscribe()
      cleanupWebRTC()
    }
  }, [roomName, user, isProfessor])

  // Limpa streams e peer connections
  const cleanupWebRTC = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
    }
    if (studentLocalStreamRef.current) {
      studentLocalStreamRef.current.getTracks().forEach(t => t.stop())
      studentLocalStreamRef.current = null
    }
    
    // Fecha conexões do Professor e remove elementos de áudio
    Object.keys(pcsRef.current).forEach(studentId => {
      pcsRef.current[studentId].close()
      const audioEl = document.getElementById(`audio-student-${studentId}`)
      if (audioEl) audioEl.remove()
    })
    pcsRef.current = {}
    
    // Fecha conexão do Estudante
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    
    const profAudioEl = document.getElementById('professor-audio')
    if (profAudioEl) profAudioEl.remove()
    
    setStreamActive(false)
    setSharingScreen(false)
    setRemoteTracks([])
  }

  // ==========================================
  // LOGICA DO PROFESSOR (Broadcaster)
  // ==========================================
  const startBroadcast = async () => {
    try {
      setErrorMsg(null)
      // Captura camera e microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      setStreamActive(true)

      // Se houver estudantes já presentes na sala, inicia conexões
      if (channelRef.current && supabase) {
        const presence = channelRef.current.presenceState()
        Object.keys(presence).forEach(studentId => {
          if (studentId !== user.id) {
            initiateConnectionToStudent(studentId, stream)
          }
        })
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg('Sem permissão de acesso à câmara/microfone. Dê autorização no seu navegador.')
    }
  }

  const initiateConnectionToStudent = async (studentId: string, stream: MediaStream) => {
    if (pcsRef.current[studentId]) {
      pcsRef.current[studentId].close()
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    pcsRef.current[studentId] = pc

    // Cria um identificador único de sessão para esta conexão
    const connId = Math.random().toString(36).substring(2, 11) + '-' + Date.now()
    connectionIdsRef.current[studentId] = connId

    // Adiciona tracks locais de camera e áudio
    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    // Escuta áudio do aluno (chamada de voz bidirecional)
    pc.ontrack = (event) => {
      const remoteTrack = event.track
      if (remoteTrack && remoteTrack.kind === 'audio') {
        let audioEl = document.getElementById(`audio-student-${studentId}`) as HTMLAudioElement
        if (!audioEl) {
          audioEl = document.createElement('audio')
          audioEl.id = `audio-student-${studentId}`
          audioEl.autoplay = true
          document.body.appendChild(audioEl)
        }
        audioEl.srcObject = new MediaStream([remoteTrack])
        audioEl.volume = 1.0
        audioEl.muted = false
        audioEl.play().catch(e => {
          console.warn('Autoplay do áudio do aluno bloqueado. Registando callback no clique:', e)
          const resumeAudio = () => {
            audioEl.play().catch(err => console.error('Erro ao reproduzir áudio do aluno:', err))
            document.removeEventListener('click', resumeAudio)
            document.removeEventListener('keydown', resumeAudio)
          }
          document.addEventListener('click', resumeAudio)
          document.addEventListener('keydown', resumeAudio)
        })
      }
    }

    // Se estiver a partilhar ecrã, adiciona também a track do ecrã
    if (sharingScreenRef.current && screenStreamRef.current) {
      const screenTrack = screenStreamRef.current.getVideoTracks()[0]
      if (screenTrack) {
        pc.addTrack(screenTrack, screenStreamRef.current)
      }
    }

    // Envia candidatos ICE com o connectionId correspondente
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            targetId: studentId,
            senderId: user.id,
            type: 'ice-candidate',
            connectionId: connId,
            data: event.candidate
          }
        })
      }
    }

    // Cria oferta SDP
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: {
          targetId: studentId,
          senderId: user.id,
          type: 'offer',
          connectionId: connId,
          data: offer
        }
      })
    }
  }

  const handleAnswer = async (studentId: string, answer: RTCSessionDescriptionInit) => {
    const pc = pcsRef.current[studentId]
    if (pc) {
      if (pc.signalingState === 'stable' || (pc.remoteDescription && pc.remoteDescription.sdp === answer.sdp)) {
        return
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        const queue = professorQueuedCandidatesRef.current[studentId]
        if (queue) {
          while (queue.length > 0) {
            const candidate = queue.shift()
            if (candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error('Erro ao adicionar candidato ICE da fila:', e))
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao aplicar setRemoteDescription no professor, reiniciando ligação para o aluno:', studentId, err)
        if (streamActiveRef.current) {
          const activeStream = screenStreamRef.current || localStreamRef.current
          if (activeStream) {
            initiateConnectionToStudent(studentId, activeStream)
          }
        }
      }
    }
  }

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !micOn
        setMicOn(!micOn)
      }
    }
  }

  const toggleStudentMic = async () => {
    const nextState = !studentMicOn
    
    if (!studentLocalStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        studentLocalStreamRef.current = stream
      } catch (err) {
        console.error('Erro ao capturar microfone do aluno:', err)
        alert('Não foi possível aceder ao microfone. Por favor, dê permissão no seu navegador.')
        return
      }
    }

    const audioTrack = studentLocalStreamRef.current?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = nextState
      setStudentMicOn(nextState)
      studentMicOnRef.current = nextState

      const pc = pcRef.current
      if (pc) {
        const senders = pc.getSenders()
        const hasTrack = senders.some(s => s.track === audioTrack)
        if (!hasTrack) {
          pc.addTrack(audioTrack, studentLocalStreamRef.current)
          
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'webrtc-request-offer',
              payload: { senderId: user.id }
            })
          }
        }
      }
    }
  }

  const raiseHand = () => {
    if (!channelRef.current) return
    const nextState = !handRaised
    setHandRaised(nextState)
    handRaisedRef.current = nextState
    
    channelRef.current.send({
      type: 'broadcast',
      event: nextState ? 'raise-hand' : 'lower-hand',
      payload: { studentId: user.id, nome: user.nome }
    })
    updatePresenceMetadata()
  }

  const handleAuthorizeMic = (studentId: string, authorize: boolean) => {
    if (!channelRef.current) return
    
    setHandRaises(prev => prev.filter(item => item.id !== studentId))

    channelRef.current.send({
      type: 'broadcast',
      event: authorize ? 'permit-mic' : 'revoke-mic',
      payload: { targetId: studentId }
    })
  }

  useEffect(() => {
    if (isProfessor && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [isProfessor])

  const toggleFullscreen = () => {
    if (!streamAreaRef.current) return
    const anyScreen = screen as any
    if (!document.fullscreenElement) {
      streamAreaRef.current.requestFullscreen()
        .then(() => {
          setIsFullscreen(true)
          if (anyScreen.orientation && typeof anyScreen.orientation.lock === 'function') {
            anyScreen.orientation.lock('landscape').catch((err: any) => {
              console.warn('Bloqueio de orientação horizontal não suportado:', err)
            })
          }
        })
        .catch(err => console.error('Erro ao activar ecrã inteiro:', err))
    } else {
      document.exitFullscreen()
        .then(() => {
          setIsFullscreen(false)
          if (anyScreen.orientation && typeof anyScreen.orientation.unlock === 'function') {
            anyScreen.orientation.unlock()
          }
        })
        .catch(err => console.error('Erro ao sair do ecrã inteiro:', err))
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement
      setIsFullscreen(active)
      const anyScreen = screen as any
      if (!active && anyScreen.orientation && typeof anyScreen.orientation.unlock === 'function') {
        anyScreen.orientation.unlock()
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !cameraOn
        setCameraOn(!cameraOn)
      }
    }
  }

  const toggleScreenShare = async () => {
    if (sharingScreen) {
      // Para a partilha
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop())
        screenStreamRef.current = null
      }

      // Remove a track em todas as conexões
      Object.keys(pcsRef.current).forEach(async (studentId) => {
        const pc = pcsRef.current[studentId]
        if (pc) {
          try {
            const senders = pc.getSenders()
            const cameraTrack = localStreamRef.current?.getVideoTracks()[0]
            
            // Procura o video sender que não é a câmera local
            const senderToRemove = senders.find(s => 
              s.track && 
              s.track.kind === 'video' && 
              s.track !== cameraTrack
            )

            if (senderToRemove) {
              pc.removeTrack(senderToRemove)
            }

            // Renegocia
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            const connId = connectionIdsRef.current[studentId]
            channelRef.current.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: {
                targetId: studentId,
                senderId: user.id,
                type: 'offer',
                connectionId: connId,
                data: offer
              }
            })
          } catch (e) {
            console.error('Erro ao remover track de ecrã:', studentId, e)
          }
        }
      })

      setSharingScreen(false)
    } else {
      // Inicia Screen Share
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        screenStreamRef.current = stream
        const screenTrack = stream.getVideoTracks()[0]

        screenTrack.onended = () => {
          toggleScreenShare()
        }

        // Adiciona track em todas as conexões de alunos ativos
        Object.keys(pcsRef.current).forEach(async (studentId) => {
          const pc = pcsRef.current[studentId]
          if (pc) {
            try {
              pc.addTrack(screenTrack, stream)

              // Renegocia
              const offer = await pc.createOffer()
              await pc.setLocalDescription(offer)
              const connId = connectionIdsRef.current[studentId]
              channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc-signal',
                payload: {
                  targetId: studentId,
                  senderId: user.id,
                  type: 'offer',
                  connectionId: connId,
                  data: offer
                }
              })
            } catch (e) {
              console.error('Erro ao adicionar track de ecrã:', studentId, e)
            }
          }
        })

        setSharingScreen(true)
      } catch (err) {
        console.error(err)
      }
    }
  }

  // Update professor video elements
  useEffect(() => {
    if (!isProfessor) return

    if (streamActive) {
      if (sharingScreen) {
        if (localVideoRef.current && screenStreamRef.current) {
          localVideoRef.current.srcObject = screenStreamRef.current
        }
        if (pipVideoRef.current && localStreamRef.current) {
          pipVideoRef.current.srcObject = localStreamRef.current
        }
      } else {
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current
        }
        if (pipVideoRef.current) {
          pipVideoRef.current.srcObject = null
        }
      }
    }
  }, [streamActive, sharingScreen, isProfessor, cameraOn])

  // ==========================================
  // LOGICA DO ESTUDANTE (Viewer)
  // ==========================================
  const handleOffer = async (professorId: string, offer: RTCSessionDescriptionInit, connectionId?: string) => {
    if (pcRef.current && pcRef.current.remoteDescription && pcRef.current.remoteDescription.sdp === offer.sdp) {
      return
    }

    const pc = pcRef.current

    // Recria a ligação se não existir, se estiver fechada/falhada, ou se não estiver ativa/estável
    const shouldRecreate = !pc || 
      pc.connectionState === 'closed' || 
      pc.connectionState === 'failed' ||
      (pc.connectionState !== 'connected' && pc.signalingState !== 'stable')

    let activePc: RTCPeerConnection

    if (shouldRecreate) {
      if (pc) {
        try {
          pc.close()
        } catch (e) {}
      }

      activePc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      pcRef.current = activePc

      activePc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc-signal',
            payload: {
              targetId: professorId,
              senderId: user.id,
              type: 'ice-candidate',
              connectionId: connectionId,
              data: event.candidate
            }
          })
        }
      }

      activePc.ontrack = (event) => {
        setStreamActive(true)
        updateRemoteTracks()
        
        const remoteTrack = event.track
        if (remoteTrack && remoteTrack.kind === 'audio') {
          let audioEl = document.getElementById('professor-audio') as HTMLAudioElement
          if (!audioEl) {
            audioEl = document.createElement('audio')
            audioEl.id = 'professor-audio'
            audioEl.autoplay = true
            document.body.appendChild(audioEl)
          }
          audioEl.srcObject = new MediaStream([remoteTrack])
          audioEl.play().catch(e => {
            console.warn('Autoplay do áudio do professor bloqueado:', e)
            const resumeAudio = () => {
              audioEl.play().catch(err => console.error('Erro ao reproduzir áudio do professor:', err))
              document.removeEventListener('click', resumeAudio)
              document.removeEventListener('keydown', resumeAudio)
            }
            document.addEventListener('click', resumeAudio)
            document.addEventListener('keydown', resumeAudio)
          })
        }
      }

      activePc.onconnectionstatechange = () => {
        if (activePc.connectionState === 'disconnected' || activePc.connectionState === 'failed' || activePc.connectionState === 'closed') {
          setStreamActive(false)
          setRemoteTracks([])
        }
      }
    } else {
      activePc = pc
    }

    // Captura o microfone do aluno para chamada de voz bidirecional (mudo por padrão)
    if (!studentLocalStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        studentLocalStreamRef.current = stream
        const micTrack = stream.getAudioTracks()[0]
        if (micTrack) {
          micTrack.enabled = studentMicOnRef.current
          activePc.addTrack(micTrack, stream)
        }
      } catch (err) {
        console.warn('Microfone do aluno não disponível ou recusado:', err)
      }
    } else {
      const micTrack = studentLocalStreamRef.current.getAudioTracks()[0]
      if (micTrack) {
        const senders = activePc.getSenders()
        const hasTrack = senders.some(s => s.track === micTrack)
        if (!hasTrack) {
          activePc.addTrack(micTrack, studentLocalStreamRef.current)
        }
      }
    }

    try {
      await activePc.setRemoteDescription(new RTCSessionDescription(offer))
      
      const queue = studentQueuedCandidatesRef.current
      while (queue.length > 0) {
        const candidate = queue.shift()
        if (candidate) {
          await activePc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error('Erro ao adicionar candidato ICE da fila (aluno):', e))
        }
      }

      const answer = await activePc.createAnswer()
      await activePc.setLocalDescription(answer)

      updateRemoteTracks()

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            targetId: professorId,
            senderId: user.id,
            type: 'answer',
            connectionId: connectionId,
            data: answer
          }
        })
      }
    } catch (err) {
      console.warn('Erro ao processar oferta no aluno, solicitando nova ligação:', err)
      try {
        activePc.close()
      } catch (e) {}
      pcRef.current = null
      
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-request-offer',
          payload: { senderId: user.id }
        })
      }
    }
  }

  // Update remote video streams for student
  useEffect(() => {
    if (isProfessor) return

    if (remoteTracks.length === 0) {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
      if (pipVideoRef.current) pipVideoRef.current.srcObject = null
      return
    }

    const playStream = (videoEl: HTMLVideoElement, videoTrack: MediaStreamTrack) => {
      const currentStream = videoEl.srcObject as MediaStream | null
      const hasVideoTrack = currentStream && currentStream.getVideoTracks().includes(videoTrack)
      
      if (hasVideoTrack) {
        if (videoEl.paused) {
          videoEl.play().catch(() => {})
        }
        return
      }

      const stream = new MediaStream([videoTrack])
      videoEl.srcObject = stream
      
      // Auto-play handling browser permission blocks
      videoEl.play().catch(err => {
        console.warn('Autoplay bloqueado. Registando callback de recuperação no clique do utilizador:', err)
        const resumePlayback = () => {
          videoEl.play().catch(e => console.error('Erro ao resumir vídeo:', e))
          document.removeEventListener('click', resumePlayback)
          document.removeEventListener('keydown', resumePlayback)
        }
        document.addEventListener('click', resumePlayback)
        document.addEventListener('keydown', resumePlayback)
      })
    }

    if (remoteTracks.length === 1) {
      // Apenas Camera
      if (remoteVideoRef.current) {
        playStream(remoteVideoRef.current, remoteTracks[0])
      }
      if (pipVideoRef.current) pipVideoRef.current.srcObject = null
    } else {
      // Ecrã + Camera
      if (remoteVideoRef.current) {
        playStream(remoteVideoRef.current, remoteTracks[1])
      }
      if (pipVideoRef.current) {
        playStream(pipVideoRef.current, remoteTracks[0])
      }
    }
  }, [remoteTracks, isProfessor])

  // Chat actions
  const sendChatMessage = () => {
    if (!chatInput.trim() || !channelRef.current) return
    const newMessage = {
      id: `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: user.id,
      nome: user.nome,
      role: user.role,
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
    }

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat-message',
      payload: newMessage
    })

    setMessages(prev => [...prev, newMessage])
    setChatInput('')
  }

  const showPip = isProfessor ? (streamActive && sharingScreen && cameraOn) : (streamActive && remoteTracks.length >= 2);

  return (
    <div className="w-full bg-slate-950 rounded-2xl shadow-2xl border border-slate-800/80 flex flex-col overflow-hidden" style={{ minHeight: '450px' }}>
      
      {/* Badges de Estado */}
      <div className="relative flex items-center justify-between px-4 py-2.5 bg-[#080c17] border-b border-slate-800/60 shrink-0">
        <div className="flex items-center gap-2">
          {streamActive ? (
            <span className="flex items-center gap-1.5 px-3 py-1 text-[9px] font-bold rounded-full bg-red-600 text-white shadow-lg animate-pulse uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              <span>AO VIVO</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 text-[9px] font-bold rounded-full bg-slate-800 text-slate-400 border border-slate-700/50 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
              <span>OFF-LINE</span>
            </span>
          )}
          
          <span className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold rounded-full bg-slate-900 text-indigo-400 border border-slate-800 shadow">
            <Users className="w-3 h-3 text-indigo-500" />
            <span>{onlineStudents.length + 1} online</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-[9px] font-bold text-slate-300">
            {isProfessor ? <Shield className="w-3 h-3 text-indigo-400" /> : <Users className="w-3 h-3 text-indigo-400" />}
            <span>{isProfessor ? 'Professor / Canal' : 'Aluno / Visualizador'}</span>
          </span>
          
          {/* Chat Toggle Button */}
          <button 
            onClick={() => { setChatOpen(!chatOpen); setUnreadCount(0); }} 
            className={`relative p-1.5 rounded-lg border text-slate-400 hover:text-white transition-colors ${chatOpen ? 'bg-indigo-600/20 border-indigo-500/35 text-indigo-400' : 'bg-slate-900 border-slate-800'}`}
          >
            <MessageSquare className="w-4 h-4" />
            {!chatOpen && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-black text-white animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace: Stream + Chat */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        
        {/* Stream Area */}
        <div ref={streamAreaRef} className="flex-1 relative flex items-center justify-center bg-[#070b13] min-h-[300px]">
          {isProfessor ? (
            streamActive ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full ${videoFit === 'cover' ? 'object-cover' : 'object-contain'} scale-x-[-1]`}
              />
            ) : (
              <div className="text-center p-6 space-y-5 max-w-sm">
                <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                  <Video className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200 text-sm">Iniciar Live do Professor</h3>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    Pronto para transmitir a sua aula? Utilize o nosso sistema WebRTC in-house sem limite de tempo para se conectar diretamente com seus alunos.
                  </p>
                </div>
                <button
                  onClick={startBroadcast}
                  className="w-full px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play className="w-4 h-4" />
                  <span>Iniciar Transmissão</span>
                </button>
              </div>
            )
          ) : (
            streamActive ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 w-full h-full ${videoFit === 'cover' ? 'object-cover' : 'object-contain'}`}
              />
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/15">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-300 text-xs">Aguardando o Professor...</h3>
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal max-w-xs mx-auto">
                    A aula iniciará automaticamente assim que o professor iniciar a sua transmissão WebRTC em tempo real.
                  </p>
                </div>
              </div>
            )
          )}

          {/* Floating Controls Overlay */}
          {streamActive && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <button
                onClick={() => setVideoFit(prev => prev === 'cover' ? 'contain' : 'cover')}
                title={videoFit === 'cover' ? 'Ajustar vídeo à tela' : 'Preencher tela inteira'}
                className="p-2 bg-slate-900/80 hover:bg-slate-800/90 text-slate-200 hover:text-white border border-slate-700/50 rounded-xl transition-all shadow-lg backdrop-blur-sm"
              >
                {videoFit === 'cover' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Sair do Ecrã Inteiro' : 'Ecrã Inteiro'}
                className="p-2 bg-slate-900/80 hover:bg-slate-800/90 text-slate-200 hover:text-white border border-slate-700/50 rounded-xl transition-all shadow-lg backdrop-blur-sm"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Floating PIP Video overlay */}
          {showPip && (
            <div className="absolute bottom-4 right-4 w-32 sm:w-44 aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700/60 z-30 transition-all">
              <video
                ref={pipVideoRef}
                autoPlay
                playsInline
                muted={isProfessor}
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute top-1 left-1 bg-slate-900/80 px-1 py-0.5 rounded text-[7px] font-bold text-slate-300">
                Câmara
              </div>
            </div>
          )}

          {/* Error overlay */}
          {errorMsg && (
            <div className="absolute inset-0 bg-[#090d16]/95 z-30 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
              <h4 className="font-bold text-slate-200 text-sm">Erro de Ligação</h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-normal">{errorMsg}</p>
              <button
                onClick={() => { setErrorMsg(null); startBroadcast(); }}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* Alertas de Mão Levantada para o Professor */}
          {isProfessor && handRaises.length > 0 && (
            <div className="absolute top-16 left-4 right-4 z-20 space-y-2 max-w-sm pointer-events-auto">
              {handRaises.map(raiser => (
                <div key={raiser.id} className="flex items-center justify-between gap-3 p-3 bg-slate-900/95 border border-amber-500/35 rounded-xl shadow-2xl backdrop-blur-sm animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✋</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{raiser.nome}</p>
                      <p className="text-[10px] text-slate-400">Pede palavra para falar</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleAuthorizeMic(raiser.id, true)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all"
                    >
                      Autorizar
                    </button>
                    <button
                      onClick={() => handleAuthorizeMic(raiser.id, false)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Banner de Autorização para o Aluno */}
          {!isProfessor && micAuthorized && (
            <div className="absolute top-16 left-4 right-4 z-20 max-w-sm p-3 bg-emerald-950/90 border border-emerald-500/40 rounded-xl shadow-2xl backdrop-blur-sm flex items-center justify-between gap-3 pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-base">🎙️</span>
                <div>
                  <p className="text-xs font-semibold text-emerald-250">Microfone Autorizado</p>
                  <p className="text-[10px] text-emerald-400/90">Ative o microfone abaixo para falar.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMicAuthorized(false);
                  setStudentMicOn(false);
                  studentMicOnRef.current = false;
                  if (studentLocalStreamRef.current) {
                    const track = studentLocalStreamRef.current.getAudioTracks()[0];
                    if (track) track.enabled = false;
                  }
                  if (channelRef.current) {
                    channelRef.current.send({
                      type: 'broadcast',
                      event: 'lower-hand',
                      payload: { studentId: user.id }
                    });
                  }
                }}
                className="px-2 py-1 bg-emerald-900/60 hover:bg-emerald-900 text-emerald-300 rounded-lg text-[10px] font-bold transition-all shrink-0"
              >
                Terminar
              </button>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        {/* Chat Sidebar */}
        {chatOpen && (
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 bg-[#0c1220] flex flex-col shrink-0 h-[250px] md:h-auto">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-slate-800 bg-[#080c17]">
              <button
                onClick={() => setActiveSidebarTab('chat')}
                className={`flex-1 py-3.5 text-[9px] font-black uppercase tracking-wider border-b-2 transition-all ${
                  activeSidebarTab === 'chat' 
                    ? 'border-indigo-500 text-white bg-[#0c1220]' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Dúvidas (Chat)
              </button>
              <button
                onClick={() => setActiveSidebarTab('participants')}
                className={`flex-1 py-3.5 text-[9px] font-black uppercase tracking-wider border-b-2 transition-all relative ${
                  activeSidebarTab === 'participants' 
                    ? 'border-indigo-500 text-white bg-[#0c1220]' 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Participantes
                <span className="ml-1.5 px-1.5 py-0.2 bg-slate-850 border border-slate-700/60 rounded-full text-[8px] text-slate-300 font-bold">
                  {onlineUsers.length}
                </span>
              </button>
              <button 
                onClick={() => setChatOpen(false)} 
                className="px-3.5 text-slate-500 hover:text-white transition-colors border-l border-slate-800 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeSidebarTab === 'chat' ? (
              <>
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-[10px] text-slate-500 text-center py-6 leading-relaxed">Nenhuma dúvida enviada ainda.<br />Seja o primeiro a enviar!</p>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.senderId === user.id;
                      const isDocente = msg.role === 'professor' || msg.role === 'admin';
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-1 mb-0.5 max-w-full">
                            <span className="text-[9px] font-semibold text-slate-400 truncate max-w-[100px]">{msg.nome}</span>
                            {isDocente && (
                              <span className="text-[7px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1 py-0.2 rounded font-black uppercase tracking-wide">
                                Docente
                              </span>
                            )}
                            <span className="text-[7px] text-slate-500">{msg.timestamp}</span>
                          </div>
                          <div className={`px-2.5 py-1.5 rounded-xl text-xs leading-normal max-w-[90%] break-words ${isMe ? 'bg-indigo-650 text-white rounded-tr-none' : 'bg-[#111622] border border-slate-800/80 text-slate-200 rounded-tl-none'}`}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Send Input */}
                <div className="p-2 border-t border-slate-800/70 bg-[#080c17] flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
                    placeholder="Escreva a sua dúvida..."
                    className="flex-1 min-w-0 px-2.5 py-1.5 bg-[#0e1322] border border-slate-800 rounded-lg focus:outline-none focus:border-slate-700 text-xs text-slate-200 placeholder-slate-500"
                  />
                  <button 
                    onClick={sendChatMessage}
                    className="p-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              /* Participants List */
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-2">Pessoas na Aula ({onlineUsers.length})</span>
                {onlineUsers.length === 0 ? (
                  <p className="text-[10px] text-slate-500 text-center py-6">Nenhum participante conectado.</p>
                ) : (
                  onlineUsers.map(u => {
                    const isUserProfessor = u.role === 'professor' || u.role === 'admin'
                    return (
                      <div key={u.id} className="flex items-center justify-between p-2 rounded-xl bg-[#111622] border border-slate-800/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`h-2 w-2 rounded-full ${isUserProfessor ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
                          <span className="text-xs font-semibold text-slate-200 truncate">{u.nome}</span>
                          {isUserProfessor && (
                            <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 rounded font-black uppercase">
                              Docente
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          {u.handRaised && (
                            <span className="text-xs animate-bounce" title="Solicitou a palavra">✋</span>
                          )}
                          {u.micAuthorized && (
                            <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-black uppercase">
                              Microfone
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barra de Controles do Professor */}
      {isProfessor && streamActive && (
        <div className="shrink-0 px-4 py-3 bg-[#0c1220] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Microfone */}
            <button
              onClick={toggleMic}
              title={micOn ? 'Desativar Microfone' : 'Ativar Microfone'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                micOn 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
              }`}
            >
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{micOn ? 'Mic' : 'Mudo'}</span>
            </button>

            {/* Câmara */}
            <button
              onClick={toggleCamera}
              title={cameraOn ? 'Desativar Câmara' : 'Ativar Câmara'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                cameraOn 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
              }`}
            >
              {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{cameraOn ? 'Câmara' : 'Câmara Off'}</span>
            </button>

            {/* Partilhar Ecrã */}
            <button
              onClick={toggleScreenShare}
              title={sharingScreen ? 'Voltar à Câmara' : 'Partilhar Ecrã'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                sharingScreen 
                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">{sharingScreen ? 'Câmara' : 'Ecrã'}</span>
            </button>
          </div>

          {/* Encerrar */}
          <button
            onClick={cleanupWebRTC}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition-all"
          >
            <StopCircle className="w-4 h-4" />
            <span>Encerrar Live</span>
          </button>
        </div>
      )}

      {/* Barra de Controles do Aluno (Chamada de Voz Bidirecional / Pedir Palavra) */}
      {!isProfessor && streamActive && (
        <div className="shrink-0 px-4 py-3 bg-[#0c1220] border-t border-slate-800 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            {micAuthorized ? (
              <button
                onClick={toggleStudentMic}
                title={studentMicOn ? 'Silenciar Microfone' : 'Ativar Microfone para Falar'}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  studentMicOn 
                    ? 'bg-emerald-600/20 border-emerald-500/35 text-emerald-400 hover:bg-emerald-600/30' 
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                }`}
              >
                {studentMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                <span>{studentMicOn ? 'Falar (Microfone Ligado)' : 'Ativar Microfone'}</span>
              </button>
            ) : (
              <button
                onClick={raiseHand}
                title={handRaised ? 'Baixar a Mão' : 'Pedir para Falar'}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  handRaised 
                    ? 'bg-amber-500/20 border-amber-500/35 text-amber-400 hover:bg-amber-500/30' 
                    : 'bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-750 hover:text-white'
                }`}
              >
                <span className="text-sm">✋</span>
                <span>{handRaised ? 'Aguardando Professor (Baixar Mão)' : 'Pedir para Falar'}</span>
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            {micAuthorized ? 'Você tem permissão de fala' : 'Chamada de voz ativa (mudo)'}
          </span>
        </div>
      )}
    </div>
  )
}


