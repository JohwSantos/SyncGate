// Script de linha de comando para criar o PRIMEIRO administrador
// do sistema. Existe porque, a partir desta etapa, cadastrar
// usuário pela API exige estar logado — e ninguém consegue logar
// antes de existir pelo menos um usuário. É a única forma "oficial"
// de criar um usuário sem passar pela API.
//
// Uso:
//   node scripts/criarAdmin.js "Nome Completo" "12345678900" "login" "senha"

require('dotenv').config();
const usuarioService = require('../src/services/usuario.service');

async function main() {
  const [, , nome, cpf, login, senha] = process.argv;

  if (!nome || !cpf || !login || !senha) {
    console.log('Uso: node scripts/criarAdmin.js "Nome Completo" "12345678900" "login" "senha"');
    process.exit(1);
  }

  const admin = await usuarioService.criar({
    nome,
    cpf,
    tipo: 'admin',
    login,
    senha,
    perfil: 'master',
  });

  console.log('Administrador criado com sucesso:');
  console.log(admin);
  process.exit(0);
}

main().catch((erro) => {
  console.error('Erro ao criar administrador:', erro.message);
  process.exit(1);
});
