import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import Nav from '@/components/Nav';
export default function Dashboard(){return <RequireAuth><Nav/><main className="container"><h1>Find your next collaborator.</h1>
<p className="intro">ProjectLinkUMS connects UMS students by skills, interests, availability and project goals. Start by completing your profile.</p>
<div className="grid">
<div className="card"><h2>1. Complete Profile</h2><p>Choose skills, interests and weekly availability.</p><Link className="btn" href="/profile">My profile</Link></div>
<div className="card"><h2>2. Discover Projects</h2><p>Browse open projects and send a request to join.</p><Link className="btn" href="/projects">Discover</Link></div>
<div className="card"><h2>3. Find Teammates</h2><p>As a project owner, evaluate available candidates and invite them.</p><Link className="btn" href="/matches">Run matching</Link></div>
<div className="card"><h2>4. Manage Requests</h2><p>Approve applications or respond to invitations.</p><Link className="btn" href="/requests">My requests</Link></div>
</div></main></RequireAuth>}
