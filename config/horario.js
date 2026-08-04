// ==========================================================
//  HORÁRIO DE FUNCIONAMENTO
//  Edite os horários de abertura/fechamento de cada dia.
//  Use null no dia inteiro para marcar como fechado.
//  Formato de hora: "HH:MM" (24h).
// ==========================================================

module.exports = {
  mensagemFechado: "😴 No momento estamos fechados. ",

  // 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
  dias: {
    0: null,
    1: { abre: "18:00", fecha: "23:00" },
    2: { abre: "18:00", fecha: "23:00" },
    3: { abre: "18:00", fecha: "23:00" },
    4: { abre: "18:00", fecha: "23:00" },
    5: { abre: "18:00", fecha: "23:59" },
    6: { abre: "18:00", fecha: "23:59" },
  },

  // Se faltar esse tanto de minutos (ou menos) pra fechar, o bot avisa o
  // cliente junto da resposta normal (ex: "fechamos em 20 minutos!").
  avisoFechamentoProximoMinutos: 30,
};
