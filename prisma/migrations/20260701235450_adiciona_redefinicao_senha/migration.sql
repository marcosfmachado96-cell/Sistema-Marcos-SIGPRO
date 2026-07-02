-- CreateTable
CREATE TABLE "redefinicoes_senha" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redefinicoes_senha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "redefinicoes_senha_token_key" ON "redefinicoes_senha"("token");

-- CreateIndex
CREATE INDEX "redefinicoes_senha_usuarioId_idx" ON "redefinicoes_senha"("usuarioId");

-- AddForeignKey
ALTER TABLE "redefinicoes_senha" ADD CONSTRAINT "redefinicoes_senha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
