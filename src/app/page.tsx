import Link from 'next/link';
export default function Landing(){return <main className="container">
 <div className="hero"><p className="badge">Closed beta • Universiti Malaysia Sabah</p>
 <h1>ProjectLink<span style={{color:'#0d8d88'}}>UMS</span></h1>
 <p className="intro">Find project teammates beyond your existing circle. Discover projects, match by skills and availability, and collaborate by mutual agreement.</p>
 <p><Link href="/login" className="btn">Sign in to beta</Link></p></div>
 <div className="grid"><div className="card"><h2>Discover</h2><p>Find student projects and opportunities.</p></div>
 <div className="card"><h2>Match</h2><p>Compare skills, interests and schedules using transparent rules.</p></div>
 <div className="card"><h2>Collaborate</h2><p>Apply to a project or invite a suitable teammate.</p></div></div>
 </main>}
