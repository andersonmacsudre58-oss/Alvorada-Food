// ==========================================================
//  TAXA DE ENTREGA POR BAIRRO
//  Edite os nomes dos bairros e valores conforme sua região.
//  "retirada" é usada quando o cliente escolhe buscar no local.
// ==========================================================

module.exports = {
  // O "id" é o número que o cliente vai digitar para escolher o bairro
  // (igual ao número dos itens do cardápio).
  bairros: [
    { id: 1, nome: "São Raimundo", taxa: 5.00 },
    { id: 2, nome: "São Cristovão", taxa: 5.00 },
    { id: 3, nome: "Santa Barbara", taxa: 3.00 },
    { id: 4, nome: "alvorada 1", taxa: 3.00 },
    { id: 5, nome: "alvorada 2", taxa: 0.00 },
  ],
  taxaPadrao: 7.00,      // usada se, por algum motivo, o bairro não for encontrado
  retirada: 0,           // retirada no local = sem taxa
  freteGratisAcimaDe: 100.00, // pedidos acima desse valor não pagam entrega (defina null para desativar)

  // Bairros (condomínios) em que o bot também pergunta bloco e apartamento.
  // Aqui você usa o "id" do bairro (o número), não mais o nome.
  bairrosComComplemento: [4, 5], // 4 = alvorada 1, 5 = alvorada 2
};
