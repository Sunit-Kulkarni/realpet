import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RealPet™ — Virtual Pets for the New Millennium!",
  description: "Adopt your very own virtual pet! They're REAL (on the server).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page-wrap">
          <header className="site-header">
            <h1 className="site-title">✨ RealPet™ ✨</h1>
            <p className="site-subtitle">Virtual Pets for the New Millennium! They live on the server 24/7!</p>
            <div className="marquee-wrap">
              <div className="marquee-track">
                🐾 Welcome to RealPet™! Your pet is ALIVE on the server RIGHT NOW! 🐾 &nbsp;&nbsp;&nbsp;
                🌟 Built with Cloudflare Workers + Durable Objects + Neon Postgres! 🌟 &nbsp;&nbsp;&nbsp;
                💾 Best viewed in 800x600 resolution • Internet Explorer 6.0 💾 &nbsp;&nbsp;&nbsp;
                🎉 Frontier Tech Week Hackathon 2026 Entry 🎉 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                🐾 Welcome to RealPet™! Your pet is ALIVE on the server RIGHT NOW! 🐾 &nbsp;&nbsp;&nbsp;
                🌟 Built with Cloudflare Workers + Durable Objects + Neon Postgres! 🌟 &nbsp;&nbsp;&nbsp;
              </div>
            </div>
            <hr className="rainbow" />
          </header>

          {children}

          <footer className="site-footer">
            <div className="under-construction">🚧 UNDER CONSTRUCTION 🚧</div>
            <br />
            You are visitor number:
            <div className="visitor-counter">0042069</div>
            <br />
            <small>© 2026 RealPet™ Corp • Made with ♥ and Cloudflare • Best viewed in Netscape Navigator 4.0</small>
          </footer>
        </div>
      </body>
    </html>
  );
}
