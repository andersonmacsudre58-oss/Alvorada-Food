const fs = require("fs");
const path = require("path");

// ==========================================================
//  ESTADO DA CONVERSA (sessão de cada cliente)
//  Guarda em que etapa cada cliente está, o carrinho dele, etc.
//  Persiste em sessoes-em-andamento.json pra sobreviver a reinícios.
// ==========================================================

const ETAPAS = {
  MENU: "MENU",
  AGUARDANDO_QUANTIDADE: "AGUARDANDO_QUANTIDADE",
  AGUARDANDO_REMOCAO_SIMNAO: "AGUARDANDO_REMOCAO_SIMNAO",
  AGUARDANDO_REMOCAO_TEXTO: "AGUARDANDO_REMOCAO_TEXTO",
  AGUARDANDO_REVISAO_CARRINHO: "AGUARDANDO_REVISAO_CARRINHO",
  AGUARDANDO_NOME: "AGUARDANDO_NOME",
  AGUARDANDO_TIPO_ENTREGA: "AGUARDANDO_TIPO_ENTREGA",
  AGUARDANDO_BAIRRO: "AGUARDANDO_BAIRRO",
  AGUARDANDO_COMPLEMENTO: "AGUARDANDO_COMPLEMENTO",
  AGUARDANDO_ENDERECO: "AGUARDANDO_ENDERECO",
  AGUARDANDO_PAGAMENTO: "AGUARDANDO_PAGAMENTO",
  AGUARDANDO_TROCO: "AGUARDANDO_TROCO",
  AGUARDANDO_CONFIRMACAO: "AGUARDANDO_CONFIRMACAO",
};

const arquivoSessoes = path.join(__dirname, "..", "sessoes-em-andamento.json");

let sessoes = new Map();

function sessaoPadrao() {
  return {
    etapa: ETAPAS.MENU,
    carrinho: [],
    produtoEmEscolha: null,
    nomeCliente: null,
    tipoEntrega: null,
    bairro: null,
    complemento: null,
    enderecoDetalhado: null,
    formaPagamento: null,
    trocoPara: null,
    trocoPendente: null,
    ultimaInteracao: Date.now(),
  };
}

function obterSessao(numero) {
  if (!sessoes.has(numero)) {
    sessoes.set(numero, sessaoPadrao());
  }
  return sessoes.get(numero);
}

function resetarSessao(numero) {
  sessoes.set(numero, sessaoPadrao());
}

function salvarSessoes() {
  try {
    fs.writeFileSync(
      arquivoSessoes,
      JSON.stringify(Array.from(sessoes.entries()), null, 2),
      "utf-8"
    );
  } catch (erro) {
    console.log("⚠️ Não foi possível salvar sessões:", erro.message);
  }
}

function carregarSessoes() {
  try {
    if (!fs.existsSync(arquivoSessoes)) return;
    const conteudo = fs.readFileSync(arquivoSessoes, "utf-8");
    sessoes = new Map(JSON.parse(conteudo));
  } catch (erro) {
    console.log("⚠️ Não foi possível carregar sessões:", erro.message);
    sessoes = new Map();
  }
}

// Lista os números com pedido em andamento (etapa diferente do menu inicial,
// ou carrinho com itens) que estão parados há mais tempo que o timeout.
function listarSessoesInativas(timeoutMs) {
  const agora = Date.now();
  const inativos = [];

  for (const [numero, sessao] of sessoes.entries()) {
    const emAndamento = sessao.etapa !== ETAPAS.MENU || sessao.carrinho.length > 0;
    if (emAndamento && agora - sessao.ultimaInteracao > timeoutMs) {
      inativos.push(numero);
    }
  }

  return inativos;
}

module.exports = {
  ETAPAS,
  obterSessao,
  resetarSessao,
  salvarSessoes,
  carregarSessoes,
  listarSessoesInativas,
};
