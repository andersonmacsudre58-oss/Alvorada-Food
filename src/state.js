const fs = require("fs");
const path = require("path");

// ==========================================================
//  ESTADO DA CONVERSA (sessão de cada cliente)
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
  // Adicionado para bloquear o loop de boas-vindas após o pedido no site
  PEDIDO_FINALIZADO: "PEDIDO_FINALIZADO",
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
    pedidoFinalizado: false, // Controle extra para o site
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
  salvarSessoes();
}

// Função para marcar que o cliente já concluiu o pedido pelo site
function marcarPedidoFinalizado(numero) {
  const sessao = obterSessao(numero);
  sessao.etapa = ETAPAS.PEDIDO_FINALIZADO;
  sessao.pedidoFinalizado = true;
  sessao.ultimaInteracao = Date.now();
  sessoes.set(numero, sessao);
  salvarSessoes();
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
  marcarPedidoFinalizado, // Exportando para usar no pedidoWeb.js ou no bot
};