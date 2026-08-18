-- CreateEnum
CREATE TYPE "TipoEventoNota" AS ENUM ('MOBILIZACAO', 'DESMOBILIZACAO', 'OCORRENCIA', 'PARALISACAO', 'RETOMADA', 'ANDAMENTO');

-- CreateTable
CREATE TABLE "notas_servico" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "contrato" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "rodovia" INTEGER NOT NULL,
    "kmInicial" DECIMAL(7,2) NOT NULL,
    "kmFinal" DECIMAL(7,2) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "autorId" TEXT NOT NULL,
    "excluidoEm" TIMESTAMP(3),
    "excluidoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_nota_servico" (
    "id" TEXT NOT NULL,
    "notaServicoId" TEXT NOT NULL,
    "tipo" "TipoEventoNota" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "texto" TEXT,
    "autorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_nota_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos_evento_nota" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "chaveS3" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "enviadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_evento_nota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notas_servico_autorId_idx" ON "notas_servico"("autorId");

-- CreateIndex
CREATE INDEX "notas_servico_rodovia_idx" ON "notas_servico"("rodovia");

-- CreateIndex
CREATE INDEX "eventos_nota_servico_notaServicoId_idx" ON "eventos_nota_servico"("notaServicoId");

-- CreateIndex
CREATE INDEX "anexos_evento_nota_eventoId_idx" ON "anexos_evento_nota"("eventoId");

-- AddForeignKey
ALTER TABLE "notas_servico" ADD CONSTRAINT "notas_servico_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_servico" ADD CONSTRAINT "notas_servico_excluidoPorId_fkey" FOREIGN KEY ("excluidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_nota_servico" ADD CONSTRAINT "eventos_nota_servico_notaServicoId_fkey" FOREIGN KEY ("notaServicoId") REFERENCES "notas_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_nota_servico" ADD CONSTRAINT "eventos_nota_servico_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos_evento_nota" ADD CONSTRAINT "anexos_evento_nota_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos_nota_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos_evento_nota" ADD CONSTRAINT "anexos_evento_nota_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
