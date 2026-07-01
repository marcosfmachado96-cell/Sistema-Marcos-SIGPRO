// Cliente Prisma compartilhado (singleton) para toda a aplicação.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
