// Page 5 — Assistant pédagogique IA (Questions / Réponses).
// • La question est envoyée à un vrai service d'IA (Gemini ou Groq) via services/aiService.js.
//   La clé est lue depuis .env.local (import.meta.env.VITE_AI_API_KEY), jamais écrite dans le code.
// • Pendant l'appel : indicateur « L'assistant réfléchit… » et bouton désactivé.
// • En cas d'erreur : message convivial + possibilité de répondre avec le mode hors ligne.
// • Les commandes de l'application (« ajoute une tâche… ») sont traitées localement.
import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowUp, Copy, Info, KeyRound, RotateCcw, Sparkles, Square, WifiOff } from 'lucide-react'
import { useStore, uid } from '../context/StoreContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import HoloOrb from '../components/HoloOrb.jsx'
import { SplitWords } from '../components/PageHeader.jsx'
import { EASE } from '../components/Motion.jsx'
import { AI_PROVIDER_LABEL, askAI, isAIConfigured } from '../services/aiService.js'
import { SUGGESTIONS, respond } from '../services/offlineAssistant.js'

const SOURCE_LABEL = { ai: AI_PROVIDER_LABEL, offline: 'Mode hors ligne', app: 'SkillUp' }

export default function Assistant() {
  const ctx = useStore()
  const { state, dispatch } = ctx
  const toast = useToast()
  const [question, setQuestion] = useState('') // champ contrôlé
  const [phase, setPhase] = useState('idle') // idle | thinking | typing
  const [typing, setTyping] = useState(null) // réponse en cours d'affichage
  const [follow, setFollow] = useState(SUGGESTIONS.slice(0, 4))
  const threadRef = useRef(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const stopRef = useRef(false)
  const abortRef = useRef(null)

  const messages = state.chat
  const busy = phase !== 'idle'

  // Défilement automatique vers le dernier message
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, typing?.shown, phase])

  // Nettoyage en quittant la page : on annule la requête et l'animation en cours
  useEffect(
    () => () => {
      abortRef.current?.abort()
      clearTimeout(timerRef.current)
    },
    [],
  )

  const addMessage = (message) => dispatch({ type: 'chat/add', message: { id: uid(), at: new Date().toISOString(), ...message } })

  /** Affiche la réponse avec un effet machine à écrire, puis l'enregistre. */
  const typeOut = (text, nextFollow, source) => {
    const msg = { full: text, shown: 0 }
    stopRef.current = false
    setPhase('typing')
    const step = () => {
      const done = stopRef.current || msg.shown >= msg.full.length
      if (done) {
        addMessage({ role: 'bot', text: msg.full, source })
        setTyping(null)
        setPhase('idle')
        setFollow(nextFollow?.length ? nextFollow : SUGGESTIONS.slice(0, 4))
        inputRef.current?.focus()
        return
      }
      msg.shown = Math.min(msg.full.length, msg.shown + 4 + Math.floor(Math.random() * 5))
      setTyping({ ...msg })
      timerRef.current = setTimeout(step, 16)
    }
    step()
  }

  /** Réponse du moteur local (hors ligne) — utilisé en secours ou pour les commandes. */
  const answerOffline = (text) => {
    const reply = respond(text, ctx)
    if (reply.action?.type === 'addTask') {
      dispatch({ type: 'task/add', task: { id: uid(), done: false, notes: '', createdAt: new Date().toISOString(), ...reply.action.task } })
    }
    setPhase('thinking')
    timerRef.current = setTimeout(() => typeOut(reply.text, reply.follow, reply.action ? 'app' : 'offline'), 600)
  }

  const send = async (raw) => {
    const text = raw.trim()
    if (!text || busy) return
    setQuestion('')
    addMessage({ role: 'user', text })

    // 1. Commandes de l'application (ajouter une tâche…) : traitées localement
    const local = respond(text, ctx)
    if (local.action) return answerOffline(text)

    // 2. Question de cours : appel au service d'IA
    setPhase('thinking')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const answer = await askAI(text, controller.signal)
      typeOut(answer, SUGGESTIONS.slice(0, 4), 'ai')
    } catch (error) {
      if (error.name === 'AbortError') return
      addMessage({ role: 'error', text: error.message, question: text })
      setPhase('idle')
    }
  }

  const clear = () => {
    if (busy) return
    dispatch({ type: 'chat/clear' })
    setFollow(SUGGESTIONS.slice(0, 4))
    toast('Conversation effacée')
  }

  return (
    <div className="assistant">
      <aside className="assistant__side glass glow-border">
        <div className="assistant__orb">
          <HoloOrb size={210} state={busy ? 'thinking' : 'idle'} interactive />
        </div>
        <div className="assistant__id">
          <span className="eyebrow">05 — Assistant IA</span>
          <h1 className="display assistant__name">
            <SplitWords text="Nova" /> <span className="serif gradient-text">study guide</span>
          </h1>
          <p className="assistant__status mono">
            <span className={`pulse-dot ${busy ? 'is-busy' : ''}`} />
            {phase === 'thinking' ? "L'assistant réfléchit…" : phase === 'typing' ? 'Rédaction de la réponse…' : 'Prêt à répondre'}
          </p>
        </div>
        {isAIConfigured ? (
          <div className="assistant__notice assistant__notice--ok">
            <Info size={16} />
            <p>
              <strong>IA connectée :</strong> {AI_PROVIDER_LABEL}. La clé est lue depuis le fichier <code>.env.local</code>.
            </p>
          </div>
        ) : (
          <div className="assistant__notice">
            <KeyRound size={16} />
            <p>
              <strong>Clé API manquante.</strong> Ajoutez <code>VITE_AI_API_KEY</code> dans <code>.env.local</code> puis relancez <code>npm run dev</code>. En attendant, le mode hors ligne peut répondre aux questions courantes.
            </p>
          </div>
        )}
      </aside>

      <section className="chat glass">
        <header className="chat__head">
          <div className="chat__who">
            <span className="chat__avatar">
              <Sparkles size={16} />
            </span>
            <div>
              <strong>Nova</strong>
              <span className="mono muted">
                {messages.length} message{messages.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <button type="button" className="btn btn--sm btn--ghost" onClick={clear} disabled={!messages.length || busy}>
            <RotateCcw size={14} /> Nouvelle conversation
          </button>
        </header>

        <div className="chat__thread" ref={threadRef} aria-live="polite">
          {messages.length === 0 && !busy && (
            <motion.div className="chat__welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
              <h2 className="display">
                Bonjour {state.user.name}, <span className="serif gradient-text">quelle notion voulez-vous comprendre ?</span>
              </h2>
              <p className="muted">Choisissez une suggestion ou posez votre question.</p>
              <div className="chat__grid">
                {SUGGESTIONS.slice(0, 6).map((s, i) => (
                  <motion.button
                    key={s}
                    type="button"
                    className="suggest-card glass"
                    onClick={() => send(s)}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.06, duration: 0.5, ease: EASE }}
                  >
                    <Sparkles size={14} />
                    <span>{s}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m) =>
              m.role === 'error' ? (
                <ErrorBubble key={m.id} message={m.text} disabled={busy} onOffline={() => answerOffline(m.question ?? '')} />
              ) : (
                <Bubble key={m.id} role={m.role} text={m.text} source={m.source} onCopy={() => copy(m.text, toast)} />
              ),
            )}
          </AnimatePresence>

          {phase === 'thinking' && (
            <motion.div className="bubble bubble--bot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <span className="bubble__avatar">
                <Sparkles size={13} />
              </span>
              <div className="bubble__body thinking" role="status">
                <span className="typing-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>L'assistant réfléchit…</span>
              </div>
            </motion.div>
          )}
          {typing && <Bubble role="bot" text={typing.full.slice(0, typing.shown)} streaming />}
        </div>

        <footer className="chat__foot">
          <AnimatePresence mode="popLayout">
            {!busy && messages.length > 0 && (
              <motion.div className="chat__follow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {follow.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault()
              send(question)
            }}
          >
            <textarea
              ref={inputRef}
              className="composer__input"
              value={question}
              rows={1}
              maxLength={800}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(question)
                }
              }}
              placeholder="Ex. : Quelle est la différence entre props et state en React ?"
              aria-label="Votre question"
            />
            {phase === 'typing' ? (
              <button type="button" className="composer__send" onClick={() => (stopRef.current = true)}>
                <Square size={14} /> Arrêter
              </button>
            ) : (
              // Désactivé si le champ est vide ou pendant l'appel au service
              <button type="submit" className="composer__send" disabled={!question.trim() || busy}>
                {phase === 'thinking' ? 'Réflexion…' : 'Poser la question'} <ArrowUp size={16} />
              </button>
            )}
          </form>
        </footer>
      </section>
    </div>
  )
}

function copy(text, toast) {
  const plain = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[(.+?)\]\((.+?)\)/g, '$1')
  navigator.clipboard
    ?.writeText(plain)
    .then(() => toast('Réponse copiée'))
    .catch(() => toast('Copie impossible dans ce navigateur', { tone: 'info' }))
}

function ErrorBubble({ message, disabled, onOffline }) {
  return (
    <motion.div className="bubble bubble--error" role="alert" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <span className="bubble__avatar bubble__avatar--error">
        <AlertTriangle size={14} />
      </span>
      <div className="bubble__body">
        <strong>Le service IA n'a pas pu répondre.</strong>
        <p>{message}</p>
        <button type="button" className="btn btn--sm" onClick={onOffline} disabled={disabled}>
          <WifiOff size={14} /> Répondre en mode hors ligne
        </button>
      </div>
    </motion.div>
  )
}

function Bubble({ role, text, source, streaming = false, onCopy }) {
  return (
    <motion.div
      layout="position"
      className={`bubble bubble--${role}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {role === 'bot' && (
        <span className="bubble__avatar">
          <Sparkles size={13} />
        </span>
      )}
      <div className="bubble__body">
        {role === 'bot' && source && <span className="bubble__source">{SOURCE_LABEL[source]}</span>}
        <RichText text={text} />
        {streaming && <span className="caret" />}
        {role === 'bot' && !streaming && onCopy && (
          <button type="button" className="bubble__copy" onClick={onCopy} aria-label="Copier la réponse" title="Copier">
            <Copy size={13} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Affichage du texte brut renvoyé par le modèle, rendu lisible :
 * paragraphes, listes (« - » ou « * »), titres « # », **gras**, `code`, blocs ``` et [liens](/route).
 */
function RichText({ text }) {
  const blocks = text.split(/\n{2,}/)
  return blocks.map((block, i) => {
    if (block.startsWith('```')) {
      return (
        <pre key={i} className="bubble__pre">
          <code>{block.replace(/^```\w*\n?/, '').replace(/```$/, '')}</code>
        </pre>
      )
    }
    const lines = block.split('\n')
    const isItem = (l) => /^\s*[-*]\s+/.test(l)
    if (lines.every(isItem)) {
      return (
        <ul key={i}>
          {lines.map((l, j) => (
            <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ''))}</li>
          ))}
        </ul>
      )
    }
    return (
      <p key={i}>
        {lines.map((l, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {/^#{1,6}\s/.test(l) ? <strong>{inline(l.replace(/^#{1,6}\s/, ''))}</strong> : isItem(l) ? <>• {inline(l.replace(/^\s*[-*]\s+/, ''))}</> : inline(l)}
          </Fragment>
        ))}
      </p>
    )
  })
}

// Découpe une ligne en morceaux (texte, gras, code, lien) avec une expression régulière
function inline(str) {
  const re = /(\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g
  const matches = [...str.matchAll(re)]
  const pieces = matches.flatMap((m, k) => {
    const before = str.slice(k === 0 ? 0 : matches[k - 1].index + matches[k - 1][0].length, m.index)
    const node = m[2] ? (
      <strong key={k}>{m[2]}</strong>
    ) : m[3] ? (
      <code key={k}>{m[3]}</code>
    ) : m[5].startsWith('/') ? (
      <Link key={k} to={m[5]} className="bubble__link">
        {m[4]}
      </Link>
    ) : (
      <a key={k} href={m[5]} target="_blank" rel="noreferrer noopener" className="bubble__link">
        {m[4]}
      </a>
    )
    return [before, node]
  })
  const last = matches.at(-1)
  return [...pieces, last ? str.slice(last.index + last[0].length) : str]
}
