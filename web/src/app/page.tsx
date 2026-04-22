import Link from "next/link";
import { AdoptForm } from "@/components/AdoptForm";

export default function HomePage() {
  return (
    <main>
      <AdoptForm />
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <Link href="/dashboard" style={{
          display: "inline-block",
          background: "linear-gradient(180deg,#ddeeff,#8899ff)",
          border: "2px outset #ffffff",
          padding: "5px 18px",
          fontWeight: "bold",
          fontSize: 12,
          color: "#000",
          textDecoration: "none",
          boxShadow: "1px 1px 0 #334488",
        }}>
          🌍 Visit the Pet Sanctuary →
        </Link>
      </div>
    </main>
  );
}
