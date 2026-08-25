-- AlterTable: adiciona a coluna opcional primeiro para poder preencher as
-- notas já existentes antes de torná-la obrigatória.
ALTER TABLE "notas_servico" ADD COLUMN "dataEmissao" TIMESTAMP(3);

-- Preenche notas já cadastradas usando a própria data de cadastro como
-- aproximação (não há como recuperar a data de emissão original delas).
UPDATE "notas_servico" SET "dataEmissao" = "criadoEm" WHERE "dataEmissao" IS NULL;

-- AlterTable: agora que todas as linhas têm valor, torna a coluna obrigatória.
ALTER TABLE "notas_servico" ALTER COLUMN "dataEmissao" SET NOT NULL;
