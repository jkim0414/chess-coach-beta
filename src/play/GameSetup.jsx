import { PERSONAS, STYLES, OPENING_CHOICES, strengthLabel, personaById } from '../lib/opponent.js';
import { COURSES } from '../lib/courses.js';
import { useStore, setSettings } from '../lib/store.js';
import { Segmented, Toggle } from '../components/ui.jsx';
import { href } from '../lib/router.js';

const COACH_MODES = [
  { value: 'guided', label: 'Guided', blurb: 'I flag critical moments before you move (“there’s a tactic here”) and stop you after mistakes. Training wheels — use it while patterns are new.' },
  { value: 'coach', label: 'Coach', blurb: 'Like a real game: nobody announces tactics, because noticing them is the skill. I stop you after mistakes and missed chances so you can find the better move yourself.' },
  { value: 'exam', label: 'Exam', blurb: 'No help during the game. Afterwards, every mistake becomes a review card. Use it to check that what you’ve learned holds up.' },
];

export default function GameSetup({ onStart }) {
  const settings = useStore((s) => s.settings);
  const courses = useStore((s) => s.courses);
  const persona = personaById(settings.persona);
  const active = COURSES.filter((c) => courses[c.id]?.active);
  const colorFor = settings.userColor === 'black' ? 'black' : settings.userColor === 'white' ? 'white' : null;
  const sparringGap = persona.id === 'sparring' && (colorFor ? !active.some((c) => c.side === colorFor) : !active.length);
  const mode = COACH_MODES.find((m) => m.value === settings.coachMode) || COACH_MODES[1];

  function start() {
    onStart({
      personaId: settings.persona, custom: settings.custom, elo: settings.strength, userColor: settings.userColor,
      coachMode: settings.coachMode, threatPrompts: settings.threatPrompts,
    });
  }

  return (
    <div className="setup">
      <section className="setup-section">
        <h2 className="section-title">Opponent</h2>
        <div className="persona-grid">
          {PERSONAS.map((p) => (
            <button key={p.id} type="button" className={`persona ${settings.persona === p.id ? 'is-on' : ''}`} onClick={() => setSettings({ persona: p.id })} aria-pressed={settings.persona === p.id} aria-label={`${p.name}: ${p.tagline}`}>
              <span className="persona-icon" aria-hidden>{p.icon}</span>
              <span className="persona-name">{p.name}</span>
              <span className="persona-tag">{p.tagline}</span>
            </button>
          ))}
        </div>
        <p className="persona-about">{persona.about}</p>
        {persona.id === 'custom' && (
          <div className="custom-grid">
            <label className="field">
              <span>Style</span>
              <select value={settings.custom.style} onChange={(e) => setSettings({ custom: { ...settings.custom, style: e.target.value } })}>
                {Object.entries(STYLES).map(([id, s]) => <option key={id} value={id}>{s.name} — {s.blurb}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Openings as White</span>
              <select value={settings.custom.white} onChange={(e) => setSettings({ custom: { ...settings.custom, white: e.target.value } })}>
                {OPENING_CHOICES.white.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Openings as Black</span>
              <select value={settings.custom.black} onChange={(e) => setSettings({ custom: { ...settings.custom, black: e.target.value } })}>
                {OPENING_CHOICES.black.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
          </div>
        )}
        {sparringGap && (
          <p className="notice">
            You have no active opening course for {colorFor ? `the ${colorFor} pieces` : 'either colour'} yet, so this opponent will play like the Classicist. <a href={href('openings')}>Pick a course →</a>
          </p>
        )}
      </section>

      <section className="setup-section setup-row">
        <div className="field">
          <span>You play</span>
          <Segmented label="Your colour" value={settings.userColor} onChange={(v) => setSettings({ userColor: v })}
            options={[{ value: 'white', label: '♔ White' }, { value: 'black', label: '♚ Black' }, { value: 'random', label: '⚄ Random' }]} />
        </div>
        <label className="field field-grow">
          <span>Strength <b>{settings.strength}</b> · {strengthLabel(settings.strength)}</span>
          <input type="range" min={600} max={2400} step={50} value={settings.strength} onChange={(e) => setSettings({ strength: Number(e.target.value) })} />
        </label>
      </section>

      <section className="setup-section">
        <h2 className="section-title">Coaching</h2>
        <Segmented label="Coach mode" value={settings.coachMode} onChange={(v) => setSettings({ coachMode: v })} options={COACH_MODES} />
        <p className="mode-blurb">{mode.blurb}</p>
        <div className="toggles">
          <Toggle checked={settings.threatPrompts && settings.coachMode !== 'exam'} onChange={(v) => setSettings({ threatPrompts: v })}>
            Threat check — when your opponent creates a real threat, I ask you to spot it before you move
          </Toggle>
          <Toggle checked={settings.showEval} onChange={(v) => setSettings({ showEval: v })}>
            Show evaluation bar <span className="muted">(off by default: it does your judging for you)</span>
          </Toggle>
        </div>
      </section>

      <div className="setup-go">
        <button type="button" className="btn btn-primary btn-big" onClick={start}>Start game</button>
        {active.length > 0 && (
          <span className="muted">Repertoire in play: {active.map((c) => c.name).join(', ')}</span>
        )}
      </div>
    </div>
  );
}
