-- AlterEnum
ALTER TYPE "TipoObservacao" ADD VALUE 'REABERTURA';

-- DropIndex
DROP INDEX "atestos_relatorioId_key";

-- CreateIndex
CREATE INDEX "atestos_relatorioId_idx" ON "atestos"("relatorioId");
