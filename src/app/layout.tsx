import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'ProjectLinkUMS — Find your team',description:'UMS collaboration and project team matching (closed beta)'};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body>{children}<footer className="footer">ProjectLinkUMS — Early prototype | For consenting beta testers only</footer></body></html>;
}
