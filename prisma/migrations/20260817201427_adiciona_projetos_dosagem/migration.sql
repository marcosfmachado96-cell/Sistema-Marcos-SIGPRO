-- CreateTable
CREATE TABLE "projetos_dosagem" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "contrato" TEXT NOT NULL,
    "rodovias" TEXT[],
    "autorId" TEXT NOT NULL,
    "excluidoEm" TIMESTAMP(3),
    "excluidoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projetos_dosagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos_dosagem" (
    "id" TEXT NOT NULL,
    "projetoDosagemId" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "chaveS3" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "enviadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_dosagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projetos_dosagem_autorId_idx" ON "projetos_dosagem"("autorId");

-- CreateIndex
CREATE INDEX "anexos_dosagem_projetoDosagemId_idx" ON "anexos_dosagem"("projetoDosagemId");

-- AddForeignKey
ALTER TABLE "projetos_dosagem" ADD CONSTRAINT "projetos_dosagem_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projetos_dosagem" ADD CONSTRAINT "projetos_dosagem_excluidoPorId_fkey" FOREIGN KEY ("excluidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos_dosagem" ADD CONSTRAINT "anexos_dosagem_projetoDosagemId_fkey" FOREIGN KEY ("projetoDosagemId") REFERENCES "projetos_dosagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos_dosagem" ADD CONSTRAINT "anexos_dosagem_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
