import { useEffect, useRef, useState } from 'react'
import type { Config } from '../../../shared/config'
import Tile from '../device/Tile'
import { attachSiteIcon, describeAction, type ConfigUpdate } from '../library/helpers'
import { applyCreation, respond, type Creation, type Reply } from './mockAssistant'
import { useReviewOutbox } from './reviewOutbox'
import './ai.css'

interface Message {
  id: number
  from: 'user' | 'assistant'
  text: string
  request?: string // for assistant replies: what the user asked
  reply?: Reply
}

const EXAMPLES = [
  'A button that opens Spotify and Discord and sets volume to 40',
  'A study mode with volume 20 and brightness 70',
  'Make it dark purple',
  'A button for youtube.com'
]

const THINKING_MS = 700 // pretend thinking time, so the demo feels like the real thing

// What a creation will look like, shown on its card.
function CreationPreview({ creation, config }: { creation: Creation; config: Config }): React.JSX.Element {
  switch (creation.kind) {
    case 'button':
      return (
        <div className="ai-preview">
          <Tile app={{ ...creation.app, id: 'preview' }} size={64} style={config.tiles.style} />
          <div>
            <strong>{creation.app.name}</strong>
            <span>{describeAction(creation.app.action, config)}</span>
          </div>
        </div>
      )
    case 'preset':
      return (
        <div className="ai-preview">
          <div className="ai-preview-preset">{creation.preset.name}</div>
          <div>
            <strong>Preset</strong>
            <span>
              {Object.entries(creation.preset.values)
                .map(([id, v]) => `${config.sliders.find((s) => s.id === id)?.label ?? id} ${v}%`)
                .join(' · ')}
            </span>
          </div>
        </div>
      )
    case 'theme':
      return (
        <div className="ai-preview">
          <div
            className="ai-preview-theme"
            style={{ background: creation.theme.background, borderColor: creation.theme.text }}
          >
            <span style={{ background: creation.theme.surface, borderColor: creation.theme.text }} />
            <span style={{ background: creation.theme.accent }} />
          </div>
          <div>
            <strong>{creation.name} theme</strong>
            <span>Replaces your current screen colors</span>
          </div>
        </div>
      )
  }
}

function ReplyCard({
  message,
  config,
  onAdd,
  onSendForReview
}: {
  message: Message
  config: Config
  onAdd: (creation: Creation) => void
  onSendForReview: () => void
}): React.JSX.Element {
  const [review, setReview] = useState(false)
  const [added, setAdded] = useState(false)
  const [sent, setSent] = useState(false)
  const reply = message.reply!

  return (
    <div className="ai-msg ai-msg-assistant">
      <p>{reply.message}</p>

      {reply.creation && (
        <div className="ai-card">
          <CreationPreview creation={reply.creation} config={config} />
          {added ? (
            <p className="ai-done">
              ✓ Added to your Splat Pad{sent ? ' · waiting to send to 42 Potential' : ''}
            </p>
          ) : (
            <div className="ai-card-actions">
              <label className="ai-review">
                <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} />
                Send to 42 Potential for review, so it could become a preset for everyone
              </label>
              <button
                className="btn btn-small btn-primary"
                onClick={() => {
                  onAdd(reply.creation!)
                  if (review) {
                    onSendForReview()
                    setSent(true)
                  }
                  setAdded(true)
                }}
              >
                Add to Splat Pad
              </button>
            </div>
          )}
        </div>
      )}

      {reply.idea &&
        (sent ? (
          <p className="ai-done">✓ Idea saved, waiting to send to 42 Potential</p>
        ) : (
          <button
            className="btn btn-small"
            onClick={() => {
              onSendForReview()
              setSent(true)
            }}
          >
            Send idea to 42 Potential for review
          </button>
        ))}
    </div>
  )
}

export default function AiPanel({ config, update }: { config: Config; update: ConfigUpdate }): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [outbox, addToOutbox] = useReviewOutbox()
  const nextId = useRef(1)
  const listRef = useRef<HTMLDivElement>(null)
  const configRef = useRef(config)
  configRef.current = config

  // keep the newest message in view
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const send = (text: string): void => {
    const request = text.trim()
    if (!request || thinking) return
    setDraft('')
    setMessages((m) => [...m, { id: nextId.current++, from: 'user', text: request }])
    setThinking(true)
    window.setTimeout(() => {
      const reply = respond(request, configRef.current)
      setMessages((m) => [...m, { id: nextId.current++, from: 'assistant', text: reply.message, request, reply }])
      setThinking(false)
    }, THINKING_MS)
  }

  return (
    <div className="ai-panel">
      <div className="ai-demo-note">
        Demo mode: answers are pretend until AI is connected through 42potential.com.
      </div>

      <div ref={listRef} className="ai-messages">
        {messages.length === 0 && (
          <div className="ai-empty">
            <p>Describe something you want your Splat Pad to do. Try:</p>
            <div className="ai-examples">
              {EXAMPLES.map((ex) => (
                <button key={ex} className="ai-example" onClick={() => send(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.from === 'user' ? (
            <div key={m.id} className="ai-msg ai-msg-user">
              {m.text}
            </div>
          ) : (
            <ReplyCard
              key={m.id}
              message={m}
              config={config}
              onAdd={(creation) => {
                update((c) => applyCreation(c, creation))
                if (creation.kind === 'button' && creation.app.action.type === 'url')
                  void attachSiteIcon(update, creation.app.action.target)
              }}
              onSendForReview={() => addToOutbox({ request: m.request ?? '', creation: m.reply?.creation })}
            />
          )
        )}
        {thinking && (
          <div className="ai-msg ai-msg-assistant ai-thinking" aria-label="Thinking">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <form
        className="ai-input"
        onSubmit={(e) => {
          e.preventDefault()
          send(draft)
        }}
      >
        <textarea
          className="lib-input"
          rows={2}
          value={draft}
          placeholder="e.g. a button that opens Discord and sets volume to 30"
          aria-label="Describe what you want"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter starts a new line
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(draft)
            }
          }}
        />
        <button className="btn btn-primary" type="submit" disabled={!draft.trim() || thinking}>
          Send
        </button>
      </form>

      {outbox.length > 0 && (
        <p className="ai-outbox">
          {outbox.length} {outbox.length === 1 ? 'item is' : 'items are'} waiting to send to 42 Potential for review. Sending
          starts once the app is connected to 42potential.com.
        </p>
      )}
    </div>
  )
}
