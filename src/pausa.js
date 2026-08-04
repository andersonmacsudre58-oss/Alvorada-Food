const fs = require("fs");
const path = require("path");

const caminhoArquivo = path.join(__dirname, "..", "config", "pausa.json");

function lerEstado() {
  try {
    const conteudo = fs.readFileSync(caminhoArquivo, "utf-8");
    return JSON.parse(conteudo);
  } catch (erro) {
    return {
      pausado: false,
      mensagem: "🙏 No momento não estamos aceitando pedidos por aqui.",
    };
  }
}

function salvarEstado(estado) {
  fs.writeFileSync(caminhoArquivo, JSON.stringify(estado, null, 2), "utf-8");
}

function estaPausado() {
  return lerEstado().pausado === true;
}

function mensagemPausa() {
  return lerEstado().mensagem;
}

function pausar() {
  const estado = lerEstado();
  estado.pausado = true;
  salvarEstado(estado);
}

function despausar() {
  const estado = lerEstado();
  estado.pausado = false;
  salvarEstado(estado);
}

module.exports = { estaPausado, mensagemPausa, pausar, despausar };
