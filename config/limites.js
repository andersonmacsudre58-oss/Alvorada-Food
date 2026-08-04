// ==========================================================
//  LIMITES DO PEDIDO
// ==========================================================

module.exports = {
  // Quantidade máxima de um mesmo item que o cliente pode pedir pelo WhatsApp.
  // Acima disso, o bot pede pra combinar diretamente (evita erro de digitação virar pedido gigante).
  quantidadeMaximaPorItem: 15,

  // Se o troco calculado passar desse valor, o bot confirma com o cliente antes
  // de seguir (proteção contra erro de digitação no valor do pagamento).
  valorTrocoSuspeito: 100,
};
