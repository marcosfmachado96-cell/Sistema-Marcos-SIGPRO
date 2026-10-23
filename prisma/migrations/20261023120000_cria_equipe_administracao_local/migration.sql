-- CreateEnum
CREATE TYPE "AreaGestao" AS ENUM ('AREA_01', 'AREA_02', 'AREA_03', 'AREA_04', 'AREA_05', 'SR_LESTE');

-- CreateTable
CREATE TABLE "contratos_equipe" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "area" "AreaGestao" NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "autorId" TEXT NOT NULL,
    "excluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros_equipe" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeNormalizado" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membros_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alteracoes_prazo_contrato" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "instrumento" TEXT,
    "observacao" TEXT,
    "autorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alteracoes_prazo_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contratos_equipe_numero_idx" ON "contratos_equipe"("numero");

-- CreateIndex
CREATE INDEX "membros_equipe_contratoId_idx" ON "membros_equipe"("contratoId");

-- CreateIndex
CREATE INDEX "membros_equipe_nomeNormalizado_idx" ON "membros_equipe"("nomeNormalizado");

-- CreateIndex
CREATE INDEX "alteracoes_prazo_contrato_contratoId_idx" ON "alteracoes_prazo_contrato"("contratoId");

-- AddForeignKey
ALTER TABLE "contratos_equipe" ADD CONSTRAINT "contratos_equipe_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_equipe" ADD CONSTRAINT "membros_equipe_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alteracoes_prazo_contrato" ADD CONSTRAINT "alteracoes_prazo_contrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alteracoes_prazo_contrato" ADD CONSTRAINT "alteracoes_prazo_contrato_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

