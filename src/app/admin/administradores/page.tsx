"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type AdminRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isCurrent: boolean;
};

const MIN_PASSWORD = 12;
const emptyForm = { name: "", email: "", password: "", confirmPassword: "" };

export default function AdministradoresPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    setAdmins(await response.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (admin: AdminRow) => {
    setEditingId(admin.id);
    setForm({ name: admin.name, email: admin.email, password: "", confirmPassword: "" });
    setMessage(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!editingId) {
      if (form.password.length < MIN_PASSWORD) {
        setMessage({ text: `A senha deve ter pelo menos ${MIN_PASSWORD} caracteres.`, error: true });
        return;
      }
      if (form.password !== form.confirmPassword) {
        setMessage({ text: "A confirmação não confere com a senha.", error: true });
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch(editingId ? `/api/admin/users/${editingId}` : "/api/admin/users", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { name: form.name, email: form.email } : { name: form.name, email: form.email, password: form.password },
        ),
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) {
        setMessage({ text: payload.error ?? "Não foi possível salvar.", error: true });
        return;
      }

      setMessage({
        text: editingId
          ? "Dados atualizados."
          : `Administrador ${payload.name} criado. Envie a ele o e-mail e a senha por um canal seguro e peça que altere a senha no primeiro acesso.`,
        error: false,
      });
      resetForm();
      await load();
    } catch {
      setMessage({ text: "Sem conexão. Tente novamente.", error: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin: AdminRow) => {
    if (!window.confirm(`Excluir o administrador ${admin.name} (${admin.email})? Ele perderá o acesso imediatamente.`)) return;

    const response = await fetch(`/api/admin/users/${admin.id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage({ text: payload.error ?? "Não foi possível excluir.", error: true });
      return;
    }

    if (editingId === admin.id) resetForm();
    setMessage({ text: `${admin.name} foi removido.`, error: false });
    await load();
  };

  return (
    <main className="page-shell admin-shell">
      <section className="hero-panel glass-card admin-overview">
        <div className="admin-overview-copy">
          <Link href="/admin" className="eyebrow">← Painel administrativo</Link>
          <h1>Administradores</h1>
          <p>Pessoas com acesso à área restrita. Todos os administradores têm as mesmas permissões.</p>
        </div>
      </section>

      <section className="glass-card admin-menu-panel">
        <div className="management-grid">
          <div className="management-column">
            <h3>Administradores cadastrados</h3>
            <div className="stack-list">
              {loading ? <div className="info-card empty-card"><span>Carregando...</span></div> : null}
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="info-card"
                  style={editingId === admin.id ? { borderColor: "var(--primary)" } : undefined}
                >
                  <strong>
                    {admin.name}
                    {admin.isCurrent ? " · você" : ""}
                  </strong>
                  <span>{admin.email}</span>
                  <small>Desde {new Date(admin.createdAt).toLocaleDateString("pt-BR")}</small>
                  <div className="card-actions">
                    <button type="button" className="secondary small-btn" onClick={() => startEdit(admin)}>Editar</button>
                    {!admin.isCurrent ? (
                      <button type="button" className="danger small-btn" onClick={() => handleDelete(admin)}>Excluir</button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="management-column">
            <h3>{editingId ? "Editar administrador" : "Novo administrador"}</h3>
            <form className="inline-form" onSubmit={handleSubmit}>
              <label>
                Nome completo
                <input required autoComplete="name" value={form.name} onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))} placeholder="Nome e sobrenome" />
              </label>
              <label>
                E-mail
                <input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))} placeholder="pessoa@instituicao.com" />
              </label>
              {!editingId ? (
                <>
                  <label>
                    Senha
                    <input required type="password" autoComplete="new-password" minLength={MIN_PASSWORD} value={form.password} onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))} />
                    <small>Mínimo de {MIN_PASSWORD} caracteres.</small>
                  </label>
                  <label>
                    Confirmar senha
                    <input required type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm((state) => ({ ...state, confirmPassword: event.target.value }))} />
                  </label>
                </>
              ) : (
                <small>A senha é pessoal: cada administrador a altera em “Alterar senha” ou pelo “Esqueci minha senha”.</small>
              )}
              <button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar administrador"}
              </button>
              {editingId ? (
                <button type="button" className="secondary" onClick={resetForm}>Cancelar</button>
              ) : null}
            </form>

            {message ? (
              <p role="status" className={message.error ? "auth-message error" : "auth-message"}>{message.text}</p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
