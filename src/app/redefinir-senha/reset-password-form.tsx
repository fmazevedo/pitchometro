"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

const MIN_LENGTH = 12;

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <>
        <p className="auth-message error">Link incompleto. Abra o link exatamente como recebido no e-mail ou solicite um novo.</p>
        <div className="auth-links">
          <Link href="/esqueci-senha">Solicitar novo link</Link>
        </div>
      </>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (newPassword.length < MIN_LENGTH) {
      setMessage({ text: `A nova senha deve ter pelo menos ${MIN_LENGTH} caracteres.`, error: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: "A confirmação não confere com a nova senha.", error: true });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage({ text: payload.error ?? "Não foi possível redefinir a senha.", error: true });
        return;
      }

      setDone(true);
      setMessage({ text: "Senha redefinida com sucesso. Agora você já pode entrar com a nova senha.", error: false });
    } catch {
      setMessage({ text: "Sem conexão. Tente novamente.", error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {!done ? (
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Nova senha
            <input type="password" autoComplete="new-password" required minLength={MIN_LENGTH} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <small>Mínimo de {MIN_LENGTH} caracteres.</small>
          </label>
          <label>
            Confirmar nova senha
            <input type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </label>
          <button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar nova senha"}</button>
        </form>
      ) : null}

      {message ? (
        <p role="status" className={message.error ? "auth-message error" : "auth-message"}>{message.text}</p>
      ) : null}

      <div className="auth-links">
        {done ? <Link href="/login">Ir para o login →</Link> : <Link href="/esqueci-senha">Solicitar novo link</Link>}
      </div>
    </>
  );
}
