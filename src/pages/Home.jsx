export default function Home() {
  return (
    <div className="phone" style={{ paddingTop: '18vh', textAlign: 'center' }}>
      <div className="brand">KYC/<b>KYB</b> CONSOLE</div>
      <p className="dim mono" style={{ fontSize: 12, letterSpacing: '.2em', marginTop: 10 }}>CLIENT ONBOARDING · RISK ASSESSMENT</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 40 }}>
        <a className="btn" href="#/join">Join as team</a>
        <a className="btn solid" href="#/presenter">Presenter</a>
      </div>
    </div>
  )
}
