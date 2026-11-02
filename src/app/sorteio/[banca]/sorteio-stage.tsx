"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { BancaDTO, GroupDTO } from "@/lib/data";

const formatTime = (base: string, position: number, minutesPerGroup: number) => {
  const [hour, minute] = base.split(":").map(Number);
  const total = hour * 60 + minute + (position - 1) * minutesPerGroup;
  const nextHour = Math.floor(total / 60) % 24;
  const nextMinute = total % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
};

function shuffleArray<T>(array: T[]) {
  const items = [...array];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const swapIndex = random[0] % (index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function playTone(frequency: number, duration: number) {
  if (typeof window === "undefined") return;

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gainNode.gain.value = 0.08;

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + duration / 1000);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration / 1000);

  setTimeout(() => context.close(), duration + 20);
}

export function SorteioStage({ banca, initialGroups }: { banca: BancaDTO; initialGroups: GroupDTO[] }) {
  const [drawnOrder, setDrawnOrder] = useState(initialGroups);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const mutedRef = useRef(muted);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const tone = (frequency: number, duration: number) => {
    if (!mutedRef.current) playTone(frequency, duration);
  };

  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      const timeoutHandle = window.setTimeout(() => {
        const finalOrder = shuffleArray(initialGroups).map((group, index) => ({
          ...group,
          drawPosition: index + 1,
          scheduledTime: formatTime(banca.startsAt, index + 1, banca.minutesPerGroup),
        }));

        setDrawnOrder(finalOrder);
        setIsRunning(false);
        setDrawn(true);
        setCountdown(null);
        tone(1320, 600);
      }, 0);

      return () => window.clearTimeout(timeoutHandle);
    }

    timeoutRef.current = window.setTimeout(() => {
      setCountdown((value) => (value ?? 0) - 1);
      tone(880, 150);
      setActiveIndex((value) => (value === null ? 0 : (value + 1) % Math.max(initialGroups.length, 1)));
    }, 1000);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const startDraw = () => {
    if (isRunning || initialGroups.length === 0) return;
    setIsRunning(true);
    setDrawn(false);
    setConfirmed(false);
    setCountdown(5);
    setActiveIndex(0);
    tone(880, 150);
  };

  const confirmOrder = async () => {
    if (!drawn) {
      window.alert("Realize o sorteio antes de confirmar a ordem.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/bancas/${encodeURIComponent(banca.id)}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds: drawnOrder.map((group) => group.id) }),
      });
      const payload = await response.json();

      if (!response.ok) {
        window.alert(payload.error ?? "Não foi possível confirmar a ordem.");
        return;
      }

      setDrawnOrder(payload.groups);
      setConfirmed(true);
    } catch {
      window.alert("Sem conexão. Tente confirmar novamente.");
    } finally {
      setSaving(false);
    }
  };

  const sortAgain = () => {
    const shouldRepeat = window.confirm("Deseja sortear novamente? A ordem só é registrada ao confirmar.");
    if (!shouldRepeat) return;
    startDraw();
  };

  const phase = countdown !== null ? "drawing" : confirmed ? "confirmed" : drawn ? "revealed" : "idle";

  return (
    <main className="sorteio-shell">
      <div className="sorteio-stage">
        <div className="sorteio-header">
          <div>
            <span className="eyebrow">Sorteio da banca</span>
            <h1>{banca.name}</h1>
          </div>
          <div className="controls">
            <Link href="/admin" className="secondary-btn">Voltar ao painel</Link>
            <button type="button" className="secondary" onClick={() => setMuted((value) => !value)}>
              {muted ? "🔇 Som desligado" : "🔊 Som ligado"}
            </button>
            <button type="button" onClick={startDraw} disabled={isRunning || initialGroups.length === 0}>Sortear</button>
          </div>
        </div>

        <div className={`countdown-panel ${phase}`} aria-live="polite">
          {phase === "drawing" ? (
            <div className="countdown-number">{countdown}</div>
          ) : phase === "revealed" ? (
            <div className="countdown-result">
              <strong>Ordem sorteada!</strong>
              <span>Confira a ordem abaixo e clique em “Confirmar ordem” para salvar.</span>
            </div>
          ) : phase === "confirmed" ? (
            <div className="countdown-result">
              <strong>✓ Ordem confirmada</strong>
              <span>A ordem e os horários foram salvos e já aparecem para os avaliadores.</span>
            </div>
          ) : (
            <div className="countdown-placeholder">{initialGroups.length ? "Aguardando sorteio" : "Nenhum grupo cadastrado nesta banca"}</div>
          )}
        </div>

        <div className={`reel ${phase}`}>
          {drawnOrder.map((group, index) => (
            <div
              key={`${group.id}-${index}-${phase}`}
              className={`reel-slot ${activeIndex === index && phase === "drawing" ? "active" : ""} ${index === 0 ? "first" : ""}`}
              style={{ "--reveal-delay": `${index * 180}ms` } as React.CSSProperties}
            >
              <span className="reel-position">{index + 1}º</span>
              <strong>{group.name}</strong>
              <small>{group.project}</small>
              {group.scheduledTime ? <em>{group.scheduledTime}</em> : null}
            </div>
          ))}
        </div>

        <div className="sorteio-actions">
          <button type="button" onClick={confirmOrder} disabled={!drawn || confirmed || saving || isRunning}>
            {saving ? "Salvando..." : "Confirmar ordem"}
          </button>
          <button type="button" className="secondary" onClick={sortAgain} disabled={isRunning}>Sortear novamente</button>
        </div>
      </div>
    </main>
  );
}
