import bcrypt from "bcryptjs";
import { newToken } from "@/lib/data";
import { prisma } from "@/lib/prisma";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    const admins = await prisma.adminUser.count({ where: { role: "ADMIN" } });
    console.log(
      admins
        ? "ADMIN_EMAIL/ADMIN_PASSWORD não definidos; administradores existentes mantidos."
        : "ATENÇÃO: nenhum administrador cadastrado. Defina ADMIN_EMAIL e ADMIN_PASSWORD e rode o seed novamente.",
    );
    return;
  }

  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD deve ter pelo menos 12 caracteres.");
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });

  // The password can be changed from the admin panel, so it is only forced from the
  // environment when the admin is created or when ADMIN_RESET_PASSWORD=true is set explicitly.
  if (existing && process.env.ADMIN_RESET_PASSWORD !== "true") {
    console.log(`Administrador ${email} já existe; senha mantida (use ADMIN_RESET_PASSWORD=true para forçar).`);
    return;
  }

  if (existing && (await bcrypt.compare(password, existing.passwordHash))) {
    console.log(`Administrador ${email} já está com a senha de ADMIN_PASSWORD.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { email },
    create: { email, name: "Administrador", passwordHash, role: "ADMIN" },
    update: { passwordHash, sessionVersion: { increment: 1 } },
  });
  console.log(`Administrador ${email} ${existing ? "teve a senha redefinida a partir de ADMIN_PASSWORD" : "criado"}.`);

  // The original demo account shipped with a public password; remove it once a real admin exists.
  const demo = await prisma.adminUser.deleteMany({ where: { email: "admin@pitchometro.com", NOT: { email } } });
  if (demo.count) {
    console.log("Conta demo admin@pitchometro.com removida.");
  }
}

async function seedEvaluation() {
  const existingEvaluation = await prisma.evaluation.findFirst();
  if (existingEvaluation) {
    console.log("Avaliação já cadastrada; dados de exemplo não foram recriados.");
    return;
  }

  const evaluation = await prisma.evaluation.create({
    data: {
      name: "Banca Final - Digital Innovation Strategy",
      discipline: "Digital Innovation Strategy",
      turma: "Turma 2026.1",
      date: new Date("2026-11-15T20:30:00.000Z"),
      scaleMin: 0,
      scaleMax: 10,
      status: "ABERTA",
      criteria: {
        create: [
          { order: 1, name: "Problema & cliente", description: "Clareza do problema, profundidade do cliente e relevância do mercado.", weight: 15 },
          { order: 2, name: "Proposta de valor & segmento", description: "Qualidade da proposta, diferenciação e segmentação de clientes.", weight: 15 },
          { order: 3, name: "Modelo & viabilidade", description: "Estrutura do negócio, capacidade de execução e sustentabilidade.", weight: 20 },
          { order: 4, name: "MVP funcionando", description: "Nível de execução do protótipo ou demonstração funcional.", weight: 20 },
          { order: 5, name: "Validação & aprendizado", description: "Aprendizados da validação, evidências e capacidade de ajuste.", weight: 15 },
          { order: 6, name: "Pitch, comunicação & arguição", description: "Capacidade de comunicar, responder e defender a solução.", weight: 15 },
        ],
      },
      rubricLevels: {
        create: [
          { name: "Insuficiente", rangeLabel: "0-4", description: "Não atende ao mínimo esperado para a proposta.", minScore: 0, maxScore: 4 },
          { name: "Em desenvolvimento", rangeLabel: "5-6", description: "Há base da ideia, mas ainda faltam consistência e aprofundamento.", minScore: 5, maxScore: 6 },
          { name: "Proficiente", rangeLabel: "7-8", description: "A solução demonstra maturidade e clareza metodológica.", minScore: 7, maxScore: 8 },
          { name: "Exemplar", rangeLabel: "9-10", description: "Excelente desempenho, com alto nível de argumentação e visão prática.", minScore: 9, maxScore: 10 },
        ],
      },
    },
  });

  const banca = await prisma.banca.create({
    data: {
      evaluationId: evaluation.id,
      name: "Banca Final",
      local: "Auditório 2",
      startsAt: new Date("2026-11-15T20:30:00.000Z"),
      minutesPerGroup: 25,
    },
  });

  const evaluatorResult = await prisma.evaluator.createMany({
    data: [
      { name: "Ana Souza", role: "Professora", company: "Universidade de São Paulo" },
      { name: "Rafael Costa", role: "Product Lead", company: "NovaMente" },
      { name: "Marina Prado", role: "Consultora de negócios", company: "Aster Labs" },
      { name: "Eduardo Silva", role: "Diretor de inovação", company: "Luma Ventures" },
    ].map((evaluator) => ({ ...evaluator, bancaId: banca.id, token: newToken() })),
  });

  const groupResult = await prisma.group.createMany({
    data: [
      { name: "Grupo 01", project: "Viva Verde", track: "Sustentabilidade", members: ["Lívia Martins", "Iago Rocha", "Mateus Silva"] },
      { name: "Grupo 02", project: "Fluxo IQ", track: "Saúde digital", members: ["Beatriz Lemos", "Thiago Pires", "Nina Costa"] },
      { name: "Grupo 03", project: "Mural Móvel", track: "Edtech", members: ["Caio Nogueira", "Paula Diniz", "João Bento"] },
      { name: "Grupo 04", project: "NexoNube", track: "B2B SaaS", members: ["Renata Leal", "Breno Santos", "Larissa Pereira"] },
    ].map((group, index) => ({
      ...group,
      bancaId: banca.id,
      feedbackToken: newToken(),
      drawPosition: index + 1,
      scheduledTime: new Date(banca.startsAt.getTime() + index * banca.minutesPerGroup * 60_000),
    })),
  });

  console.log(`Seed concluída: ${evaluatorResult.count} avaliadores e ${groupResult.count} grupos cadastrados.`);
}

// Tokens hardcoded in the first version of the app; anyone who saw the source could use them.
const LEGACY_EVALUATOR_TOKENS = [
  "A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6",
  "Q1W2E3R4T5Y6U7I8O9P0A1S2D3F4G5H6",
  "Z1X2C3V4B5N6M7A8S9D0F1G2H3J4K5L6",
  "P1O2I3U4Y5T6R7E8W9Q0A1S2D3F4G5H6",
];
const LEGACY_FEEDBACK_TOKENS = [
  "grupo-01-feedback-abc123",
  "grupo-02-feedback-def456",
  "grupo-03-feedback-ghi789",
  "grupo-04-feedback-jkl012",
];

async function rotateLegacyTokens() {
  const evaluators = await prisma.evaluator.findMany({ where: { token: { in: LEGACY_EVALUATOR_TOKENS } } });
  for (const evaluator of evaluators) {
    await prisma.evaluator.update({ where: { id: evaluator.id }, data: { token: newToken() } });
  }

  const groups = await prisma.group.findMany({ where: { feedbackToken: { in: LEGACY_FEEDBACK_TOKENS } } });
  for (const group of groups) {
    await prisma.group.update({ where: { id: group.id }, data: { feedbackToken: newToken() } });
  }

  if (evaluators.length || groups.length) {
    console.log(`Tokens antigos substituídos: ${evaluators.length} avaliadores e ${groups.length} grupos.`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada.");
  }

  await seedAdmin();
  await seedEvaluation();
  await rotateLegacyTokens();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
