"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import type { BancaDTO, CriterionDTO, EvaluationDTO, EvaluatorDTO, FichaDTO, GroupDTO } from "@/lib/data";
import { createCsvDownload, formatDecimal, getCriterionAverage, getSentFichas, getWeightedScore } from "@/lib/utils";

type SummaryPayload = {
  evaluation: EvaluationDTO;
  banca: BancaDTO;
  criteria: CriterionDTO[];
  groups: GroupDTO[];
  evaluators: EvaluatorDTO[];
  fichas: FichaDTO[];
  groupScores: { group: GroupDTO; finalScore: number; sentCount: number }[];
  criteriaRows: { criterion: CriterionDTO; average: number }[];
  stats: {
    groupsCount: number;
    evaluatorsCount: number;
    sentFichasCount: number;
    leadingScore: number;
    leadingScoreLabel: string;
  };
};

type Step = "banca" | "avaliadores" | "grupos" | "links" | "dashboard";

const emptyBanca = { name: "", local: "Auditório", date: new Date().toISOString().slice(0, 10), startsAt: "19:00", minutesPerGroup: "25" };
const emptyEvaluator = { name: "", role: "", company: "" };
const emptyGroup = { name: "", project: "", track: "", description: "", members: "", scheduledTime: "", durationMinutes: "25" };
const DESCRIPTION_MAX = 2000;

const statusLabels: Record<EvaluationDTO["status"], string> = {
  RASCUNHO: "Rascunho",
  ABERTA: "Avaliação aberta",
  ENCERRADA: "Avaliação encerrada",
  PUBLICADA: "Resultados publicados",
};

const formatDateBr = (date: string) => date.split("-").reverse().join("/");

const copyLink = async (label: string, value: string) => {
  await navigator.clipboard.writeText(value);
  window.alert(`${label} copiado com sucesso.`);
};

async function sendJson(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    window.location.href = "/login";
    return null;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    window.alert(payload.error ?? "Não foi possível concluir a operação.");
    return null;
  }

  return payload;
}

export default function AdminDashboard() {
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [bancas, setBancas] = useState<BancaDTO[]>([]);
  const [selectedBancaId, setSelectedBancaId] = useState("");
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [step, setStep] = useState<Step>("banca");
  const [newBanca, setNewBanca] = useState(emptyBanca);
  const [editingBancaId, setEditingBancaId] = useState<string | null>(null);
  const [newEvaluator, setNewEvaluator] = useState(emptyEvaluator);
  const [newGroup, setNewGroup] = useState(emptyGroup);
  const [editingEvaluatorId, setEditingEvaluatorId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const loadBancas = useCallback(async () => {
    const response = await fetch("/api/bancas", { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = "/login";
      return [];
    }
    const list = (await response.json()) as BancaDTO[];
    setBancas(list);
    return list;
  }, []);

  const loadSummary = useCallback(async (bancaId: string) => {
    if (!bancaId) {
      setSummary(null);
      return;
    }

    try {
      const response = await fetch(`/api/evaluation/summary?bancaId=${encodeURIComponent(bancaId)}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Falha ao carregar os dados da banca.");
      }
      setSummary((await response.json()) as SummaryPayload);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Falha ao carregar os dados.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBaseUrl(window.location.origin);
    loadBancas()
      .catch(() => setLoadError("Falha ao carregar as bancas."))
      .finally(() => setLoading(false));
  }, [loadBancas]);

  const evaluators = summary?.evaluators ?? [];
  const groups = summary?.groups ?? [];
  const fichas = summary?.fichas ?? [];
  const criteria = summary?.criteria ?? [];
  const activeBanca = bancas.find((item) => item.id === selectedBancaId) ?? null;
  const hasScores = fichas.some((ficha) => Object.keys(ficha.notes).length > 0);

  const unlocked: Record<Step, boolean> = {
    banca: true,
    avaliadores: Boolean(summary),
    grupos: evaluators.length > 0,
    links: evaluators.length > 0 && groups.length > 0,
    dashboard: evaluators.length > 0 && groups.length > 0,
  };

  const lockReasons: Record<Step, string> = {
    banca: "",
    avaliadores: "Selecione uma banca primeiro.",
    grupos: "Cadastre ao menos um avaliador.",
    links: "Cadastre avaliadores e grupos para ativar a banca.",
    dashboard: "Cadastre avaliadores e grupos para ativar a banca.",
  };

  const selectBanca = async (bancaId: string) => {
    setSelectedBancaId(bancaId);
    setEditingEvaluatorId(null);
    setEditingGroupId(null);
    setNewEvaluator(emptyEvaluator);
    setNewGroup(emptyGroup);
    await loadSummary(bancaId);
    setStep("avaliadores");
  };

  const clearBanca = () => {
    setSelectedBancaId("");
    setSummary(null);
    setStep("banca");
  };

  const refresh = () => loadSummary(selectedBancaId);

  const handleLogout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.href = "/login";
  };

  const cancelBancaEdit = () => {
    setEditingBancaId(null);
    setNewBanca(emptyBanca);
  };

  const handleSaveBanca = async () => {
    if (!newBanca.name.trim()) {
      window.alert("Informe o nome da banca antes de salvar.");
      return;
    }

    const payload = {
      name: newBanca.name.trim(),
      local: newBanca.local.trim(),
      date: newBanca.date,
      startsAt: newBanca.startsAt,
      minutesPerGroup: Number(newBanca.minutesPerGroup) || 25,
    };

    if (editingBancaId) {
      if (!(await sendJson(`/api/bancas/${editingBancaId}`, "PATCH", payload))) return;
      const wasSelected = editingBancaId === selectedBancaId;
      cancelBancaEdit();
      await loadBancas();
      if (wasSelected) await loadSummary(selectedBancaId);
      return;
    }

    const created = await sendJson("/api/bancas", "POST", payload);
    if (!created) return;

    setNewBanca(emptyBanca);
    await loadBancas();
    await selectBanca(created.id);
  };

  const handleEditBanca = (banca: BancaDTO) => {
    setEditingBancaId(banca.id);
    setNewBanca({
      name: banca.name,
      local: banca.local,
      date: banca.date,
      startsAt: banca.startsAt,
      minutesPerGroup: String(banca.minutesPerGroup),
    });
  };

  const handleDeleteBanca = async (banca: BancaDTO) => {
    if (!window.confirm(`Excluir a banca "${banca.name}"? Avaliadores, grupos e fichas dela também serão apagados.`)) return;
    if (!(await sendJson(`/api/bancas/${banca.id}`, "DELETE"))) return;
    if (banca.id === editingBancaId) cancelBancaEdit();
    if (banca.id === selectedBancaId) clearBanca();
    await loadBancas();
  };

  const handleSaveEvaluator = async () => {
    if (!newEvaluator.name.trim()) {
      window.alert("Informe o nome do avaliador.");
      return;
    }

    const payload = {
      bancaId: selectedBancaId,
      name: newEvaluator.name.trim(),
      role: newEvaluator.role.trim(),
      company: newEvaluator.company.trim(),
    };

    const saved = editingEvaluatorId
      ? await sendJson(`/api/evaluators/${editingEvaluatorId}`, "PATCH", payload)
      : await sendJson("/api/evaluators", "POST", payload);
    if (!saved) return;

    setEditingEvaluatorId(null);
    setNewEvaluator(emptyEvaluator);
    await refresh();
  };

  const handleEditEvaluator = (evaluator: EvaluatorDTO) => {
    setEditingEvaluatorId(evaluator.id);
    setNewEvaluator({ name: evaluator.name, role: evaluator.role, company: evaluator.company });
  };

  const handleDeleteEvaluator = async (evaluator: EvaluatorDTO) => {
    if (!window.confirm(`Excluir ${evaluator.name}? As fichas desse avaliador também serão apagadas.`)) return;
    if (!(await sendJson(`/api/evaluators/${evaluator.id}`, "DELETE"))) return;

    if (editingEvaluatorId === evaluator.id) {
      setEditingEvaluatorId(null);
      setNewEvaluator(emptyEvaluator);
    }

    await refresh();
  };

  const handleRegenerateEvaluatorLink = async (evaluator: EvaluatorDTO) => {
    if (!window.confirm(`Gerar um novo link para ${evaluator.name}? O link atual deixará de funcionar.`)) return;
    if (!(await sendJson(`/api/evaluators/${evaluator.id}`, "PATCH", { regenerateToken: true }))) return;
    await refresh();
  };

  const handleSaveGroup = async () => {
    if (!newGroup.name.trim() || !newGroup.project.trim()) {
      window.alert("Informe o nome do grupo e o projeto antes de salvar.");
      return;
    }

    const payload = {
      bancaId: selectedBancaId,
      name: newGroup.name.trim(),
      project: newGroup.project.trim(),
      track: newGroup.track.trim(),
      description: newGroup.description.trim(),
      members: newGroup.members
        .split(",")
        .map((member) => member.trim())
        .filter(Boolean),
      scheduledTime: newGroup.scheduledTime || undefined,
      durationMinutes: Number(newGroup.durationMinutes) || undefined,
    };

    const saved = editingGroupId
      ? await sendJson(`/api/groups/${editingGroupId}`, "PATCH", payload)
      : await sendJson("/api/groups", "POST", payload);
    if (!saved) return;

    setEditingGroupId(null);
    setNewGroup(emptyGroup);
    await refresh();
  };

  const handleEditGroup = (group: GroupDTO) => {
    setEditingGroupId(group.id);
    setNewGroup({
      name: group.name,
      project: group.project,
      track: group.track,
      description: group.description,
      members: group.members.join(", "),
      scheduledTime: group.scheduledTime,
      durationMinutes: String(group.durationMinutes),
    });
  };

  const handleDeleteGroup = async (group: GroupDTO) => {
    if (!window.confirm(`Excluir ${group.name}? As fichas recebidas por esse grupo também serão apagadas.`)) return;
    if (!(await sendJson(`/api/groups/${group.id}`, "DELETE"))) return;

    if (editingGroupId === group.id) {
      setEditingGroupId(null);
      setNewGroup(emptyGroup);
    }

    await refresh();
  };

  const handleRevokeFeedbackLink = async (group: GroupDTO) => {
    if (!window.confirm(`Revogar o link de devolutiva de ${group.name}? Um novo link será gerado e o atual deixará de funcionar.`)) return;
    if (!(await sendJson(`/api/groups/${group.id}`, "PATCH", { regenerateFeedbackToken: true }))) return;
    await refresh();
  };

  const handleToggleFicha = async (ficha: FichaDTO) => {
    if (!(await sendJson(`/api/fichas/${ficha.id}`, "PATCH", { hidden: !ficha.hidden }))) return;
    await refresh();
  };

  const handleResetScores = async () => {
    if (!activeBanca) return;
    const answer = window.prompt(
      `Isto apaga TODAS as notas e feedbacks da banca "${activeBanca.name}", inclusive fichas já enviadas, e não pode ser desfeito.\n\nPara confirmar, digite o nome da banca:`,
    );
    if (answer === null) return;
    if (answer.trim() !== activeBanca.name) {
      window.alert("O nome digitado não confere. Nenhuma nota foi removida.");
      return;
    }

    const result = await sendJson(`/api/bancas/${activeBanca.id}/fichas`, "DELETE");
    if (!result) return;
    window.alert(`${result.deletedFichas} ficha(s) removida(s). A banca está pronta para um novo ciclo.`);
    await refresh();
  };

  const handleTogglePublish = async () => {
    if (!summary) return;
    const publish = summary.evaluation.status !== "PUBLICADA";
    const message = publish
      ? "Publicar os resultados? Os grupos poderão ver a devolutiva pelos links."
      : "Despublicar os resultados? Os links de devolutiva deixarão de mostrar notas.";
    if (!window.confirm(message)) return;

    if (!(await sendJson(`/api/evaluation/${summary.evaluation.id}`, "PATCH", { status: publish ? "PUBLICADA" : "ENCERRADA" }))) return;
    await refresh();
  };

  if (loading) {
    return (
      <main className="page-shell admin-shell">
        <section className="glass-card" style={{ padding: 32 }}>
          <span className="eyebrow">Painel administrativo</span>
          <h1>Carregando...</h1>
        </section>
      </main>
    );
  }

  const steps: { id: Step; label: string }[] = [
    { id: "banca", label: "1. Banca" },
    { id: "avaliadores", label: "2. Avaliadores" },
    { id: "grupos", label: "3. Grupos" },
    { id: "links", label: "4. Links" },
    { id: "dashboard", label: "5. Dashboard" },
  ];

  return (
    <main className="page-shell admin-shell">
      <section className="hero-panel glass-card admin-overview">
        <div className="admin-overview-copy">
          <span className="eyebrow">Painel administrativo</span>
          {summary && activeBanca ? (
            <>
              <div className="status-inline">
                <span className="status-pill">{statusLabels[summary.evaluation.status]}</span>
              </div>
              <h1>{activeBanca.name}</h1>
              <p>
                {summary.evaluation.discipline} · {summary.evaluation.turma} · {activeBanca.local} · {formatDateBr(activeBanca.date)} · Início{" "}
                {activeBanca.startsAt}
              </p>
            </>
          ) : (
            <>
              <h1>Selecione uma banca</h1>
              <p>Escolha uma banca existente ou crie uma nova para começar.</p>
            </>
          )}
          {loadError ? <p role="alert">{loadError}</p> : null}
        </div>
        <div className="action-cluster admin-actions">
          {activeBanca ? (
            <button type="button" className="secondary" onClick={clearBanca}>Trocar banca</button>
          ) : null}
          <Link href="/admin/administradores" className="secondary-btn">Administradores</Link>
          <Link href="/admin/senha" className="secondary-btn">Alterar senha</Link>
          <button type="button" className="secondary" onClick={handleLogout}>Sair</button>
        </div>
      </section>

      <section className="glass-card admin-menu-panel">
        <nav className="admin-menu workflow-steps" aria-label="Etapas da banca">
          {steps.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={step === id ? "menu-tab active" : "menu-tab"}
              disabled={!unlocked[id]}
              title={unlocked[id] ? undefined : lockReasons[id]}
              onClick={() => setStep(id)}
            >
              {unlocked[id] ? label : `🔒 ${label}`}
            </button>
          ))}
        </nav>

        {summary && groups.length > 0 && !hasScores && step !== "dashboard" ? (
          <div className="sorteio-callout">
            <div>
              <strong>Sorteio da ordem de apresentação</strong>
              <span>Disponível até o primeiro avaliador registrar uma nota.</span>
            </div>
            <Link href={`/sorteio/${selectedBancaId}`} className="primary-btn">Abrir sorteio</Link>
          </div>
        ) : null}

        {step === "banca" && (
          <div className="management-grid">
            <div className="management-column">
              <h3>Bancas disponíveis</h3>
              <div className="stack-list">
                {bancas.length === 0 ? (
                  <div className="info-card empty-card">
                    <strong>Nenhuma banca cadastrada</strong>
                    <span>Crie a primeira banca ao lado.</span>
                  </div>
                ) : null}
                {bancas.map((item) => (
                  <div
                    key={item.id}
                    className={selectedBancaId === item.id ? "selection-card selected" : "selection-card"}
                    style={editingBancaId === item.id ? { borderColor: "var(--primary)" } : undefined}
                  >
                    <strong>{item.name}{editingBancaId === item.id ? " · em edição" : ""}</strong>
                    <span>{item.local}</span>
                    <small>
                      {formatDateBr(item.date)} · início às {item.startsAt} · {item.minutesPerGroup} min por grupo
                    </small>
                    <div className="card-actions">
                      <button type="button" className="small-btn" onClick={() => selectBanca(item.id)}>
                        {selectedBancaId === item.id ? "Selecionada" : "Selecionar"}
                      </button>
                      <button type="button" className="secondary small-btn" onClick={() => handleEditBanca(item)}>Editar</button>
                      <button type="button" className="danger small-btn" onClick={() => handleDeleteBanca(item)}>Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="management-column">
              <h3>{editingBancaId ? "Editar banca" : "Criar nova banca"}</h3>
              <div className="inline-form">
                <label>
                  Nome
                  <input value={newBanca.name} onChange={(event) => setNewBanca((state) => ({ ...state, name: event.target.value }))} placeholder="Ex: Banca de encerramento" />
                </label>
                <label>
                  Local
                  <input value={newBanca.local} onChange={(event) => setNewBanca((state) => ({ ...state, local: event.target.value }))} placeholder="Auditório / Sala / Online" />
                </label>
                <label>
                  Data
                  <input type="date" value={newBanca.date} onChange={(event) => setNewBanca((state) => ({ ...state, date: event.target.value }))} />
                </label>
                <label>
                  Horário de início
                  <input type="time" value={newBanca.startsAt} onChange={(event) => setNewBanca((state) => ({ ...state, startsAt: event.target.value }))} />
                </label>
                <label>
                  Minutos por grupo
                  <input type="number" min={5} step={5} value={newBanca.minutesPerGroup} onChange={(event) => setNewBanca((state) => ({ ...state, minutesPerGroup: event.target.value }))} />
                </label>
                <button type="button" onClick={handleSaveBanca}>{editingBancaId ? "Salvar alterações" : "Criar e selecionar banca"}</button>
                {editingBancaId && (
                  <button type="button" className="secondary" onClick={cancelBancaEdit}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === "avaliadores" && summary && (
          <div className="management-grid">
            <div className="management-column">
              <h3>Avaliadores da banca</h3>
              <div className="stack-list">
                {evaluators.length === 0 ? (
                  <div className="info-card empty-card">
                    <strong>Nenhum avaliador cadastrado</strong>
                    <span>Adicione o primeiro avaliador para liberar o cadastro de grupos.</span>
                  </div>
                ) : (
                  evaluators.map((evaluator) => (
                    <div key={evaluator.id} className="info-card">
                      <strong>{evaluator.name}</strong>
                      <span>{evaluator.role}</span>
                      <small>{evaluator.company}</small>
                      <div className="card-actions">
                        <button type="button" className="secondary small-btn" onClick={() => handleEditEvaluator(evaluator)}>Editar</button>
                        <button type="button" className="danger small-btn" onClick={() => handleDeleteEvaluator(evaluator)}>Excluir</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="management-column">
              <h3>{editingEvaluatorId ? "Editar avaliador" : "Adicionar avaliador"}</h3>
              <div className="inline-form">
                <label>
                  Nome
                  <input value={newEvaluator.name} onChange={(event) => setNewEvaluator((state) => ({ ...state, name: event.target.value }))} placeholder="Nome completo" />
                </label>
                <label>
                  Cargo
                  <input value={newEvaluator.role} onChange={(event) => setNewEvaluator((state) => ({ ...state, role: event.target.value }))} placeholder="Especialista / Mentor / Diretor" />
                </label>
                <label>
                  Empresa / instituição
                  <input value={newEvaluator.company} onChange={(event) => setNewEvaluator((state) => ({ ...state, company: event.target.value }))} placeholder="Empresa ou instituição" />
                </label>
                <button type="button" onClick={handleSaveEvaluator}>{editingEvaluatorId ? "Salvar alterações" : "Adicionar avaliador"}</button>
                {editingEvaluatorId && (
                  <button type="button" className="secondary" onClick={() => {
                    setEditingEvaluatorId(null);
                    setNewEvaluator(emptyEvaluator);
                  }}>
                    Cancelar
                  </button>
                )}
                <button type="button" className="secondary" disabled={!unlocked.grupos} onClick={() => setStep("grupos")}>
                  Continuar para grupos →
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "grupos" && summary && (
          <div className="management-grid">
            <div className="management-column">
              <h3>Grupos da banca</h3>
              <div className="stack-list">
                {groups.length === 0 ? (
                  <div className="info-card empty-card">
                    <strong>Nenhum grupo cadastrado</strong>
                    <span>Adicione os grupos para ativar a banca e liberar os links.</span>
                  </div>
                ) : (
                  groups.map((group) => (
                    <div key={group.id} className="info-card">
                      <strong>{group.drawPosition ? `#${group.drawPosition} · ` : ""}{group.name}</strong>
                      <span>{group.project}</span>
                      <small>{group.track}</small>
                      <small title={group.description || undefined}>
                        {group.description
                          ? group.description.length > 120
                            ? `${group.description.slice(0, 120)}…`
                            : group.description
                          : "Sem descrição do projeto"}
                      </small>
                      <small>{group.members.join(", ") || "Sem integrantes cadastrados"}</small>
                      <small>
                        {group.scheduledTime ? `Apresentação às ${group.scheduledTime}` : "Horário definido no sorteio"} · {group.durationMinutes} min
                      </small>
                      <div className="card-actions">
                        <button type="button" className="secondary small-btn" onClick={() => handleEditGroup(group)}>Editar</button>
                        <button type="button" className="danger small-btn" onClick={() => handleDeleteGroup(group)}>Excluir</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="management-column">
              <h3>{editingGroupId ? "Editar grupo" : "Novo grupo"}</h3>
              <div className="inline-form">
                <label>
                  Nome do grupo
                  <input value={newGroup.name} onChange={(event) => setNewGroup((state) => ({ ...state, name: event.target.value }))} placeholder="Grupo 05" />
                </label>
                <label>
                  Projeto
                  <input value={newGroup.project} onChange={(event) => setNewGroup((state) => ({ ...state, project: event.target.value }))} placeholder="Nome do projeto" />
                </label>
                <label>
                  Track
                  <input value={newGroup.track} onChange={(event) => setNewGroup((state) => ({ ...state, track: event.target.value }))} placeholder="Sustentabilidade / SaaS / Saúde" />
                </label>
                <label>
                  Descrição do projeto
                  <textarea
                    rows={5}
                    maxLength={DESCRIPTION_MAX}
                    value={newGroup.description}
                    onChange={(event) => setNewGroup((state) => ({ ...state, description: event.target.value }))}
                    placeholder="Qual problema o projeto resolve, para quem, e como funciona a solução. Os avaliadores verão este texto ao clicar em “Saiba mais”."
                  />
                  <small>{newGroup.description.length}/{DESCRIPTION_MAX} caracteres</small>
                </label>
                <label>
                  Horário da apresentação (opcional)
                  <input type="time" value={newGroup.scheduledTime} onChange={(event) => setNewGroup((state) => ({ ...state, scheduledTime: event.target.value }))} />
                </label>
                <label>
                  Duração (minutos)
                  <input type="number" min={5} step={5} value={newGroup.durationMinutes} onChange={(event) => setNewGroup((state) => ({ ...state, durationMinutes: event.target.value }))} placeholder="25" />
                </label>
                <label>
                  Integrantes
                  <input value={newGroup.members} onChange={(event) => setNewGroup((state) => ({ ...state, members: event.target.value }))} placeholder="Nome 1, Nome 2, Nome 3" />
                </label>
                <button type="button" onClick={handleSaveGroup}>{editingGroupId ? "Salvar alterações" : "Adicionar grupo"}</button>
                {editingGroupId && (
                  <button type="button" className="secondary" onClick={() => {
                    setEditingGroupId(null);
                    setNewGroup(emptyGroup);
                  }}>
                    Cancelar
                  </button>
                )}
                <button type="button" className="secondary" disabled={!unlocked.links} onClick={() => setStep("links")}>
                  Continuar para links →
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "links" && summary && (
          <div className="management-grid">
            <div className="management-column">
              <h3>Links de avaliação</h3>
              <div className="stack-list">
                {evaluators.map((evaluator) => {
                  const evaluatorLink = `${baseUrl}/avaliar/${evaluator.token}`;
                  const sent = fichas.filter((ficha) => ficha.evaluatorId === evaluator.id && ficha.status === "ENVIADA").length;
                  return (
                    <div key={evaluator.id} className="info-card">
                      <strong>{evaluator.name}</strong>
                      <span>{evaluator.role} · {evaluator.company}</span>
                      <small>{sent}/{groups.length} fichas enviadas</small>
                      <code>{evaluatorLink}</code>
                      <div className="card-actions">
                        <button type="button" className="secondary small-btn" onClick={() => copyLink("Link do avaliador", evaluatorLink)}>Copiar link</button>
                        <button type="button" className="secondary small-btn" onClick={() => handleRegenerateEvaluatorLink(evaluator)}>Gerar novo link</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="management-column">
              <h3>Banca ativa</h3>
              <div className="info-card">
                <strong>{activeBanca?.name}</strong>
                <span>{groups.length} grupos · {evaluators.filter((evaluator) => evaluator.active).length} avaliadores</span>
                <small>Envie a cada avaliador o seu link individual. Ele abre uma página com todos os grupos da banca, na ordem de apresentação, e cada grupo é avaliado e enviado separadamente.</small>
                <small>Acompanhe as notas e os feedbacks no Dashboard.</small>
                <div className="card-actions">
                  <button type="button" className="small-btn" onClick={() => setStep("dashboard")}>Abrir dashboard →</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {step === "dashboard" && summary ? (
        <BancaDashboard
          summary={summary}
          baseUrl={baseUrl}
          onRevokeFeedbackLink={handleRevokeFeedbackLink}
          onToggleFicha={handleToggleFicha}
          onTogglePublish={handleTogglePublish}
          onResetScores={handleResetScores}
          criteria={criteria}
        />
      ) : null}
    </main>
  );
}

type DashboardProps = {
  summary: SummaryPayload;
  criteria: CriterionDTO[];
  baseUrl: string;
  onRevokeFeedbackLink: (group: GroupDTO) => void;
  onToggleFicha: (ficha: FichaDTO) => void;
  onTogglePublish: () => void;
  onResetScores: () => void;
};

function BancaDashboard({ summary, criteria, baseUrl, onRevokeFeedbackLink, onToggleFicha, onTogglePublish, onResetScores }: DashboardProps) {
  const { groups, evaluators, fichas, groupScores, criteriaRows, stats, evaluation } = summary;
  const sentFichas = fichas.filter((ficha) => ficha.status === "ENVIADA");
  const scaleMax = evaluation.scaleMax || 10;

  const exportCsv = () => {
    createCsvDownload("notas-por-grupo.csv", [
      ["Grupo", "Projeto", "Nota final", "Fichas recebidas"],
      ...groupScores.map(({ group, finalScore, sentCount }) => [group.name, group.project, formatDecimal(finalScore), String(sentCount)]),
    ]);
  };

  const exportFeedbackReport = () => {
    createCsvDownload("relatorio-feedback-por-grupo.csv", [
      [
        "Grupo",
        "Projeto",
        "Nota final",
        "Fichas recebidas",
        "Link de devolutiva",
        ...criteria.map((criterion) => `${criterion.name} (${criterion.weight}%)`),
      ],
      ...groupScores.map(({ group, finalScore, sentCount }) => [
        group.name,
        group.project,
        formatDecimal(finalScore),
        String(sentCount),
        `${baseUrl}/devolutiva/${group.feedbackToken}`,
        ...criteria.map((criterion) => formatDecimal(getCriterionAverage(getSentFichas(fichas, group.id), criterion.id))),
      ]),
    ]);
  };

  const exportXlsx = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      groupScores.map(({ group, finalScore, sentCount }) => ({
        Grupo: group.name,
        Projeto: group.project,
        "Nota final": Number(finalScore.toFixed(2)),
        "Fichas recebidas": sentCount,
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Notas");
    XLSX.writeFile(workbook, "notas-por-grupo.xlsx");
  };

  return (
    <>
      <section className="glass-card admin-menu-panel">
        <div className="panel-header">
          <h2>Dashboard da banca</h2>
          <div className="action-cluster admin-actions">
            <button type="button" onClick={exportCsv}>Exportar CSV</button>
            <button type="button" className="secondary" onClick={exportFeedbackReport}>Relatório por grupo</button>
            <button type="button" className="secondary" onClick={exportXlsx}>Exportar XLSX</button>
            <button type="button" className="secondary" onClick={() => window.print()}>Baixar PDF</button>
            <button type="button" className="danger" onClick={onResetScores} disabled={fichas.length === 0}>
              Zerar notas da banca
            </button>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <article className="metric-card glass-card">
          <span>Grupos</span>
          <strong>{stats.groupsCount}</strong>
          <small>Nesta banca</small>
        </article>
        <article className="metric-card glass-card">
          <span>Avaliadores</span>
          <strong>{stats.evaluatorsCount}</strong>
          <small>Ativos na banca</small>
        </article>
        <article className="metric-card glass-card">
          <span>Fichas enviadas</span>
          <strong>{stats.sentFichasCount}</strong>
          <small>de {groups.length * evaluators.length} esperadas</small>
        </article>
        <article className="metric-card glass-card">
          <span>Nota líder</span>
          <strong>{stats.leadingScoreLabel}</strong>
          <small>Maior pontuação atual</small>
        </article>
      </section>

      <section className="dashboard-grid">
        <div className="glass-card large-panel">
          <div className="panel-header">
            <h2>Nota final por grupo</h2>
          </div>
          <div className="score-list">
            {groupScores.map(({ group, finalScore, sentCount }) => (
              <div key={group.id} className="score-row">
                <div>
                  <strong>{group.name}</strong>
                  <span>{group.project}</span>
                </div>
                <div className="score-meta">
                  <b>{formatDecimal(finalScore)}</b>
                  <small>{sentCount}/{evaluators.length} fichas</small>
                </div>
                <div className="progress-bar">
                  <span style={{ width: `${Math.min((finalScore / scaleMax) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card large-panel">
          <div className="panel-header">
            <h2>Links de devolutiva</h2>
          </div>
          <div className="link-list">
            {groups.map((group) => {
              const link = `${baseUrl}/devolutiva/${group.feedbackToken}`;
              return (
                <div className="link-item" key={group.id}>
                  <div>
                    <strong>{group.name}</strong>
                    <small>{group.project}</small>
                  </div>
                  <div className="link-actions">
                    <button type="button" onClick={() => copyLink(group.name, link)}>Copiar link</button>
                    <button type="button" className="secondary" onClick={() => onRevokeFeedbackLink(group)}>Revogar</button>
                    {baseUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(link)}`}
                        alt={`QR Code do ${group.name}`}
                        width={80}
                        height={80}
                        style={{ borderRadius: 12, background: "#fff", padding: 6 }}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="glass-card table-panel">
        <div className="panel-header">
          <h2>Grupo x critério</h2>
          <span>Notas médias por critério</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Critério</th>
                {groups.map((group) => (
                  <th key={group.id}>{group.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteria.map((criterion) => (
                <tr key={criterion.id}>
                  <td>{criterion.name}</td>
                  {groups.map((group) => (
                    <td key={`${criterion.id}-${group.id}`}>
                      {formatDecimal(getCriterionAverage(getSentFichas(fichas, group.id), criterion.id))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card table-panel">
        <div className="panel-header">
          <h2>Notas por avaliador</h2>
          <span>Dispersão e consistência</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Avaliador</th>
                {groups.map((group) => (
                  <th key={group.id}>{group.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evaluators.map((evaluator) => (
                <tr key={evaluator.id}>
                  <td>{evaluator.name}</td>
                  {groups.map((group) => {
                    const ficha = sentFichas.find((item) => item.evaluatorId === evaluator.id && item.groupId === group.id);
                    return <td key={`${evaluator.id}-${group.id}`}>{ficha ? formatDecimal(getWeightedScore(ficha.notes, criteria)) : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="chart-grid">
        <div className="glass-card large-panel">
          <div className="panel-header">
            <h2>Média por critério</h2>
          </div>
          <div className="bar-chart">
            {criteriaRows.map(({ criterion, average }) => (
              <div key={criterion.id} className="bar-item">
                <div className="bar-label">
                  <span>{criterion.name}</span>
                  <strong>{formatDecimal(average)}</strong>
                </div>
                <div className="bar-track">
                  <span style={{ width: `${(average / scaleMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card large-panel">
          <div className="panel-header">
            <h2>Feedbacks recebidos</h2>
            <button type="button" className="secondary" onClick={onTogglePublish}>
              {evaluation.status === "PUBLICADA" ? "Despublicar resultados" : "Publicar resultados"}
            </button>
          </div>
          <div className="feedback-list">
            {sentFichas.length === 0 ? <p>Nenhuma ficha enviada ainda.</p> : null}
            {sentFichas.map((ficha) => {
              const group = groups.find((item) => item.id === ficha.groupId);
              const evaluator = evaluators.find((item) => item.id === ficha.evaluatorId);
              return (
                <article key={ficha.id} className="feedback-card" style={ficha.hidden ? { opacity: 0.55 } : undefined}>
                  <div className="feedback-head">
                    <strong>{group?.name ?? "Grupo"}</strong>
                    <span>{evaluator?.name ?? "Avaliador"}{ficha.hidden ? " · oculto na devolutiva" : ""}</span>
                  </div>
                  <p>
                    <b>Pontos fortes:</b> {ficha.strengths || "—"}
                  </p>
                  <p>
                    <b>Melhorias:</b> {ficha.improvements || "—"}
                  </p>
                  <p>
                    <b>Comentário geral:</b> {ficha.generalComment || "—"}
                  </p>
                  <div className="feedback-actions">
                    <button type="button" className="secondary" onClick={() => onToggleFicha(ficha)}>
                      {ficha.hidden ? "Mostrar na devolutiva" : "Ocultar da devolutiva"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
