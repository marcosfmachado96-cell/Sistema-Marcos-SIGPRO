// Seed inicial: cria o coordenador (administrador) a partir de variáveis de ambiente.
// Não há cadastro público — este é o único usuário criado fora do fluxo de convite.
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

async function main() {
  const email = process.env.SEED_COORDENADOR_EMAIL;
  const senha = process.env.SEED_COORDENADOR_SENHA;
  const nome = process.env.SEED_COORDENADOR_NOME || 'Coordenador CO 036/2022 DOP';

  if (!email || !senha) {
    throw new Error('Defina SEED_COORDENADOR_EMAIL e SEED_COORDENADOR_SENHA para executar o seed.');
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log('Coordenador já existe. Nada a fazer.');
    return;
  }

  const senhaHash = await bcrypt.hash(senha, 12);
  await prisma.usuario.create({
    data: { nome, email, senhaHash, perfil: 'COORDENADOR' },
  });
  console.log(`Coordenador criado: ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
