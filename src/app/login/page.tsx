"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function redirectIfLoggedIn() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (response.ok) {
          window.location.href = "/admin";
        }
      } catch {
        // Ignore and keep login page visible.
      }
    }

    redirectIfLoggedIn();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Falha ao autenticar.");
      }

      setMessage(`Login realizado com sucesso para ${payload.user.email}. Redirecionando...`);
      window.location.href = "/admin";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="glass-card" style={{ maxWidth: 520, margin: "60px auto", padding: "32px" }}>
        <span className="eyebrow">Administrador</span>
        <h1 style={{ marginBottom: 20 }}>Acessar painel</h1>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label htmlFor="email" style={{ color: "#111827" }}>E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={{ padding: "0.8rem 1rem", borderRadius: 10, border: "1px solid rgba(17, 24, 39, 0.2)", background: "rgba(255,255,255,0.8)", color: "#111827" }}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label htmlFor="password" style={{ color: "#111827" }}>Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={{ padding: "0.8rem 1rem", borderRadius: 10, border: "1px solid rgba(17, 24, 39, 0.2)", background: "rgba(255,255,255,0.8)", color: "#111827" }}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {message ? (
          <p role="status" style={{ marginTop: 18, color: "#111827" }}>{message}</p>
        ) : null}

        <div className="auth-links">
          <Link href="/">← Página inicial</Link>
          <Link href="/esqueci-senha">Esqueci minha senha</Link>
        </div>
      </section>
    </main>
  );
}
