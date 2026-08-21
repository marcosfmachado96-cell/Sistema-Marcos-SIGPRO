-- CreateEnum
CREATE TYPE "ProgramaNota" AS ENUM ('PROMAC', 'PROSEG', 'NAO_PAVIMENTADA');

-- AlterTable
ALTER TABLE "notas_servico" ADD COLUMN "programa" "ProgramaNota";
