// ==========================================================
//  PAUSA INDIVIDUAL (por conversa)
//  Permite pausar o bot só para um cliente específico, sem
//  afetar o atendimento automático dos outros.
//
//  Como usar: entre na conversa do cliente pelo WhatsApp
//  conectado ao bot (o mesmo celular/computador) e mande:
//    "oi"       -> pausa o bot só para esse cliente
//    "obrigado" -> volta o bot a responder esse cliente
// ==========================================================

const fs = require("fs");
const path = require("path");

const caminhoArquivo = path.join(__dirname, "..", "config", "pausaIndividual.json");

function lerLista() {
  try {
    const conteudo = fs.readFileSync(caminhoArquivo, "utf-8");
    return JSON.parse(conteudo);
  } catch (erro) {
    return [];
  }
}

function salvarLista(lista) {
  fs.writeFileSync(caminhoArquivo, JSON.stringify(lista, null, 2), "utf-8");
}

function estaPausadoIndividualmente(numero) {
  return lerLista().includes(numero);
}

function pausarIndividual(numero) {
  const lista = lerLista();
  if (!lista.includes(numero)) {
    lista.push(numero);
    salvarLista(lista);
  }
}

function despausarIndividual(numero) {
  const lista = lerLista().filter((n) => n !== numero);
  salvarLista(lista);
}

module.exports = { estaPausadoIndividualmente, pausarIndividual, despausarIndividual };
