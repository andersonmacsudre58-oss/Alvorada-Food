const entregaConfig = require("../config/entrega");

function normalizar(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos para comparar melhor
}

/**
 * Calcula o subtotal de um pedido (soma dos itens x quantidade).
 * @param {Array<{produto: object, quantidade: number}>} itens
 */
function calcularSubtotal(itens) {
  return itens.reduce((soma, item) => soma + item.produto.preco * item.quantidade, 0);
}

/**
 * Descobre a taxa de entrega para um bairro (pelo nome já resolvido).
 * Faz busca "tolerante" (ignora maiúsculas/minúsculas e espaços extras).
 */
function taxaPorBairro(bairroDigitado) {
  const chave = normalizar(bairroDigitado);

  const encontrado = entregaConfig.bairros.find(
    (b) => normalizar(b.nome) === chave
  );

  return encontrado ? encontrado.taxa : entregaConfig.taxaPadrao;
}

/**
 * Encontra um bairro pelo número que o cliente digitou
 * (o mesmo número mostrado em textoListaBairros).
 * Retorna o objeto { id, nome, taxa } ou null se o número não existir.
 */
function bairroPorNumero(numeroDigitado) {
  const numero = parseInt(numeroDigitado, 10);
  if (!Number.isInteger(numero)) return null;
  return entregaConfig.bairros.find((b) => b.id === numero) || null;
}

/**
 * Monta a lista numerada de bairros cadastrados, com o valor de cada um,
 * para mostrar ao cliente na hora de perguntar o endereço.
 */
function textoListaBairros() {
  let texto = "*Bairros que entregamos:*\n";
  entregaConfig.bairros.forEach((b) => {
    texto += `${b.id}. ${b.nome} — ${formatarReais(b.taxa)}\n`;
  });
  texto += `\nDigite apenas o *número* do seu bairro.`;
  return texto;
}

/**
 * Verifica se o bairro (pelo nome já resolvido) exige complemento
 * (bloco/apartamento), com base na lista de ids configurada em config/entrega.js.
 */
function bairroPrecisaComplemento(bairroDigitado) {
  const chave = normalizar(bairroDigitado);
  const encontrado = entregaConfig.bairros.find((b) => normalizar(b.nome) === chave);
  if (!encontrado) return false;

  const lista = entregaConfig.bairrosComComplemento || [];
  return lista.includes(encontrado.id);
}

/**
 * Monta o resumo final do pedido: subtotal, taxa de entrega e total.
 * @param {Array} itens - lista de itens do carrinho
 * @param {"entrega"|"retirada"} tipoEntrega
 * @param {string} bairro - obrigatório se tipoEntrega === "entrega"
 */
function calcularPedido(itens, tipoEntrega, bairro) {
  const subtotal = calcularSubtotal(itens);

  let taxaEntrega = 0;
  if (tipoEntrega === "retirada") {
    taxaEntrega = entregaConfig.retirada;
  } else {
    taxaEntrega = taxaPorBairro(bairro);
    if (
      entregaConfig.freteGratisAcimaDe !== null &&
      subtotal >= entregaConfig.freteGratisAcimaDe
    ) {
      taxaEntrega = 0;
    }
  }

  const total = subtotal + taxaEntrega;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxaEntrega: Number(taxaEntrega.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

function formatarReais(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

module.exports = {
  calcularPedido,
  calcularSubtotal,
  taxaPorBairro,
  bairroPorNumero,
  textoListaBairros,
  bairroPrecisaComplemento,
  formatarReais,
};
