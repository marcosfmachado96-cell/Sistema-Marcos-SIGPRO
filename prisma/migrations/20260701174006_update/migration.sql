-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('COORDENADOR', 'USUARIO');

-- CreateEnum
CREATE TYPE "StatusConvite" AS ENUM ('PENDENTE', 'ACEITO', 'EXPIRADO', 'REVOGADO');

-- CreateEnum
CREATE TYPE "EstadoRelatorio" AS ENUM ('ENVIADO', 'EM_ANALISE', 'REPROVADO', 'APROVADO', 'AGUARDANDO_ATESTO', 'CORRECAO_DOCUMENTAL', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "CategoriaAnexo" AS ENUM ('MEDICAO', 'DOC_FISCAL', 'ATESTO', 'RELATORIO_ASSINADO');

-- CreateEnum
CREATE TYPE "TipoObservacao" AS ENUM ('REPROVACAO_MEDICAO', 'CORRECAO_DOCUMENTAL');

-- CreateEnum
CREATE TYPE "OrigemObservacao" AS ENUM ('COORDENADOR', 'IA');

-- CreateEnum
CREATE TYPE "StatusColaborador" AS ENUM ('PENDENTE', 'ATENDIDO', 'NAO_ATENDIDO');

-- CreateEnum
CREATE TYPE "ConfirmacaoCoordenador" AS ENUM ('PENDENTE', 'CONFIRMADO', 'REABERTO');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'RESOLVIDA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT,
    "perfil" "Perfil" NOT NULL DEFAULT 'USUARIO',
    "contratada" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'USUARIO',
    "contratada" TEXT,
    "status" "StatusConvite" NOT NULL DEFAULT 'PENDENTE',
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convidadoPorId" TEXT NOT NULL,

    CONSTRAINT "convites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorios" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "numMedicao" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFim" TIMESTAMP(3) NOT NULL,
    "contrato" TEXT NOT NULL,
    "objeto" TEXT NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "estado" "EstadoRelatorio" NOT NULL DEFAULT 'ENVIADO',
    "versaoAtual" INTEGER NOT NULL DEFAULT 1,
    "excluidoEm" TIMESTAMP(3),
    "excluidoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relatorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorio_versoes" (
    "id" TEXT NOT NULL,
    "relatorioId" TEXT NOT NULL,
    "numeroVersao" INTEGER NOT NULL,
    "numMedicao" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFim" TIMESTAMP(3) NOT NULL,
    "contrato" TEXT NOT NULL,
    "objeto" TEXT NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relatorio_versoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observacoes" (
    "id" TEXT NOT NULL,
    "relatorioId" TEXT NOT NULL,
    "versaoId" TEXT,
    "autorId" TEXT NOT NULL,
    "tipo" "TipoObservacao" NOT NULL,
    "origem" "OrigemObservacao" NOT NULL DEFAULT 'COORDENADOR',
    "numero" INTEGER NOT NULL DEFAULT 0,
    "rodada" INTEGER NOT NULL DEFAULT 1,
    "texto" TEXT NOT NULL,
    "statusColaborador" "StatusColaborador" NOT NULL DEFAULT 'PENDENTE',
    "declaracao" TEXT,
    "confirmacao" "ConfirmacaoCoordenador" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos" (
    "id" TEXT NOT NULL,
    "relatorioId" TEXT NOT NULL,
    "versaoId" TEXT,
    "categoria" "CategoriaAnexo" NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "chaveS3" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "enviadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atestos" (
    "id" TEXT NOT NULL,
    "relatorioId" TEXT NOT NULL,
    "coordenadorId" TEXT NOT NULL,
    "anexoId" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analises_ia" (
    "id" TEXT NOT NULL,
    "relatorioId" TEXT NOT NULL,
    "versaoAnalisada" INTEGER NOT NULL,
    "modelo" TEXT,
    "resumo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analises_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analise_ia_itens" (
    "id" TEXT NOT NULL,
    "analiseId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "severidade" TEXT,
    "aceito" BOOLEAN,

    CONSTRAINT "analise_ia_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aprendizado_ia" (
    "id" TEXT NOT NULL,
    "diretriz" TEXT NOT NULL,
    "origem" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aprendizado_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'ABERTA',
    "resposta" TEXT,
    "respondidoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" TEXT NOT NULL,
    "relatorioId" TEXT,
    "atorId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "estadoDe" "EstadoRelatorio",
    "estadoPara" "EstadoRelatorio",
    "detalhe" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "convites_token_key" ON "convites"("token");

-- CreateIndex
CREATE INDEX "convites_email_idx" ON "convites"("email");

-- CreateIndex
CREATE INDEX "relatorios_estado_idx" ON "relatorios"("estado");

-- CreateIndex
CREATE INDEX "relatorios_autorId_idx" ON "relatorios"("autorId");

-- CreateIndex
CREATE UNIQUE INDEX "relatorio_versoes_relatorioId_numeroVersao_key" ON "relatorio_versoes"("relatorioId", "numeroVersao");

-- CreateIndex
CREATE INDEX "anexos_relatorioId_categoria_idx" ON "anexos"("relatorioId", "categoria");

-- CreateIndex
CREATE UNIQUE INDEX "atestos_relatorioId_key" ON "atestos"("relatorioId");

-- CreateIndex
CREATE INDEX "solicitacoes_autorId_idx" ON "solicitacoes"("autorId");

-- CreateIndex
CREATE INDEX "solicitacoes_status_idx" ON "solicitacoes"("status");

-- CreateIndex
CREATE INDEX "log_auditoria_relatorioId_idx" ON "log_auditoria"("relatorioId");

-- AddForeignKey
ALTER TABLE "convites" ADD CONSTRAINT "convites_convidadoPorId_fkey" FOREIGN KEY ("convidadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_excluidoPorId_fkey" FOREIGN KEY ("excluidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorio_versoes" ADD CONSTRAINT "relatorio_versoes_relatorioId_fkey" FOREIGN KEY ("relatorioId") REFERENCES "relatorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observacoes" ADD CONSTRAINT "observacoes_relatorioId_fkey" FOREIGN KEY ("relatorioId") REFERENCES "relatorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observacoes" ADD CONSTRAINT "observacoes_versaoId_fkey" FOREIGN KEY ("versaoId") REFERENCES "relatorio_versoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observacoes" ADD CONSTRAINT "observacoes_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_relatorioId_fkey" FOREIGN KEY ("relatorioId") REFERENCES "relatorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_versaoId_fkey" FOREIGN KEY ("versaoId") REFERENCES "relatorio_versoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atestos" ADD CONSTRAINT "atestos_relatorioId_fkey" FOREIGN KEY ("relatorioId") REFERENCES "relatorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atestos" ADD CONSTRAINT "atestos_coordenadorId_fkey" FOREIGN KEY ("coordenadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analises_ia" ADD CONSTRAINT "analises_ia_relatorioId_fkey" FOREIGN KEY ("relatorioId") REFERENCES "relatorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analise_ia_itens" ADD CONSTRAINT "analise_ia_itens_analiseId_fkey" FOREIGN KEY ("analiseId") REFERENCES "analises_ia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_respondidoPorId_fkey" FOREIGN KEY ("respondidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_relatorioId_fkey" FOREIGN KEY ("relatorioId") REFERENCES "relatorios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_atorId_fkey" FOREIGN KEY ("atorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
