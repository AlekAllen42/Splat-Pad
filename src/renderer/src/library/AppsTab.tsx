import { useState } from 'react'
import { removeApp, type AppTile, type Config, type TileShape } from '../../../shared/config'
import { readableOn } from '../device/Tile'
import { ColorInput } from './controls'
import { attachSiteIcon, describeAction, makeId, TILE_COLORS, type ConfigUpdate } from './helpers'
import StarterFinder from './StarterFinder'
import IconFinder, { type IconRequest } from './IconFinder'
import { useT } from '../i18n'

function AppRow({
  app,
  config,
  favorite,
  isFirst,
  isLast,
  onChange,
  onToggleFavorite,
  onMove,
  onRemove
}: {
  app: AppTile
  config: Config
  favorite: boolean
  isFirst: boolean
  isLast: boolean
  onChange: (app: AppTile) => void
  onToggleFavorite: () => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}): React.JSX.Element {
  const t = useT()
  const target = describeAction(app.action, config, t)
  return (
    <li className="lib-app">
      <button
        className="lib-app-icon"
        style={{ background: app.color, color: readableOn(app.color) }}
        title={t.changeIcon}
        onClick={async () => {
          const icon = await window.splatPad.pickImage()
          if (icon) onChange({ ...app, icon })
        }}
      >
        {app.icon ? <img src={app.icon} alt="" /> : app.name.charAt(0).toUpperCase()}
      </button>
      <div className="lib-app-main">
        <input
          className="lib-input lib-app-name"
          value={app.name}
          aria-label={t.appName}
          onChange={(e) => onChange({ ...app, name: e.target.value })}
        />
        <span className="lib-app-target" title={target}>
          {target}
        </span>
      </div>
      {config.tiles.shape === 'mixed' && (
        <select
          className="lib-input lib-shape"
          value={app.shape ?? 'square'}
          aria-label={t.shapeOf(app.name)}
          title={t.tileShape}
          onChange={(e) => onChange({ ...app, shape: e.target.value as TileShape })}
        >
          <option value="square">{t.shapeSquare}</option>
          <option value="circle">{t.shapeCircle}</option>
          <option value="rectangle">{t.shapeWide}</option>
        </select>
      )}
      <ColorInput label={t.tileColor} value={app.color} onChange={(color) => onChange({ ...app, color })} />
      <button
        className={`lib-icon-btn lib-star ${favorite ? 'is-on' : ''}`}
        aria-label={favorite ? t.removeFavorite : t.addFavorite}
        aria-pressed={favorite}
        title={t.favorite}
        onClick={onToggleFavorite}
      >
        ★
      </button>
      <button className="lib-icon-btn" aria-label={t.moveUp} disabled={isFirst} onClick={() => onMove(-1)}>
        ↑
      </button>
      <button className="lib-icon-btn" aria-label={t.moveDown} disabled={isLast} onClick={() => onMove(1)}>
        ↓
      </button>
      <button className="lib-icon-btn lib-remove" aria-label={t.removeNamed(app.name)} onClick={onRemove}>
        ✕
      </button>
    </li>
  )
}

export default function AppsTab({ config, update }: { config: Config; update: ConfigUpdate }): React.JSX.Element {
  const t = useT()
  const [webForm, setWebForm] = useState<{ name: string; url: string } | null>(null)
  const [iconRequest, setIconRequest] = useState<IconRequest | null>(null)
  // programs on this PC that tiles open (one entry per program, even if two tiles share it)
  const launchTargets = [...new Set(config.apps.flatMap((a) => (a.action.type === 'launch' ? [a.action.target] : [])))]

  const addApp = (fields: Omit<AppTile, 'id' | 'color'>): void =>
    update((c) => ({
      ...c,
      apps: [
        ...c.apps,
        {
          ...fields,
          id: makeId(fields.name, c.apps.map((a) => a.id)),
          color: TILE_COLORS[c.apps.length % TILE_COLORS.length]
        }
      ]
    }))

  const addProgram = async (): Promise<void> => {
    const picked = await window.splatPad.pickProgram()
    if (!picked) return
    addApp({ name: picked.name, icon: picked.icon, action: { type: 'launch', target: picked.path } })
    setIconRequest({ targets: [picked.path], quiet: true }) // offer a sharper icon if the program has one
  }

  const addWebsite = (): void => {
    if (!webForm) return
    let url = webForm.url.trim()
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    const name = webForm.name.trim() || url.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0]
    addApp({ name, action: { type: 'url', target: url } })
    setWebForm(null)
    void attachSiteIcon(update, url) // the tile shows its letter until the icon arrives
  }

  const setApp = (next: AppTile): void =>
    update((c) => ({ ...c, apps: c.apps.map((a) => (a.id === next.id ? next : a)) }))

  const moveApp = (index: number, dir: -1 | 1): void =>
    update((c) => {
      const apps = [...c.apps]
      ;[apps[index], apps[index + dir]] = [apps[index + dir], apps[index]]
      return { ...c, apps }
    })

  // Also removes it from favorites and custom buttons.
  const removeAppById = (id: string): void => update((c) => removeApp(c, id))

  const toggleFavorite = (id: string): void =>
    update((c) => ({
      ...c,
      favorites: c.favorites.includes(id) ? c.favorites.filter((f) => f !== id) : [...c.favorites, id]
    }))

  return (
    <div className="lib-tab">
      <div className="lib-actions">
        <button className="btn btn-small btn-primary" onClick={addProgram}>
          {t.addProgram}
        </button>
        <button className="btn btn-small" onClick={() => setWebForm({ name: '', url: '' })}>
          {t.addWebsite}
        </button>
        {launchTargets.length > 0 && (
          <button className="btn btn-small" onClick={() => setIconRequest({ targets: launchTargets, quiet: false })}>
            {t.findIcons}
          </button>
        )}
        <span className="lib-count">{t.appCount(config.apps.length)}</span>
      </div>

      {webForm && (
        <form
          className="lib-inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            addWebsite()
          }}
        >
          <input
            className="lib-input"
            placeholder={t.nameOptional}
            value={webForm.name}
            onChange={(e) => setWebForm({ ...webForm, name: e.target.value })}
          />
          <input
            className="lib-input"
            placeholder="example.com"
            required
            autoFocus
            value={webForm.url}
            onChange={(e) => setWebForm({ ...webForm, url: e.target.value })}
          />
          <button className="btn btn-small btn-primary" type="submit">
            {t.add}
          </button>
          <button className="btn btn-small" type="button" onClick={() => setWebForm(null)}>
            {t.cancel}
          </button>
        </form>
      )}

      <IconFinder config={config} update={update} request={iconRequest} onDone={() => setIconRequest(null)} />

      <StarterFinder
        config={config}
        update={update}
        onLinked={(targets) => targets.length && setIconRequest({ targets, quiet: true })}
      />

      <p className="lib-hint">{t.appsHint}</p>

      <ul className="lib-list">
        {config.apps.map((app, i) => (
          <AppRow
            key={app.id}
            app={app}
            config={config}
            favorite={config.favorites.includes(app.id)}
            isFirst={i === 0}
            isLast={i === config.apps.length - 1}
            onChange={setApp}
            onToggleFavorite={() => toggleFavorite(app.id)}
            onMove={(dir) => moveApp(i, dir)}
            onRemove={() => removeAppById(app.id)}
          />
        ))}
      </ul>
    </div>
  )
}
