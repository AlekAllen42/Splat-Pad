export default function App(): React.JSX.Element {
  return (
    <main className="placeholder">
      <h1>Control Pad</h1>
      <p>Scaffold is running. The configurator and device preview come next.</p>
      <p className="muted">Platform: {window.controlPad.platform}</p>
    </main>
  )
}
