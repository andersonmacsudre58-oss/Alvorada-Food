const horarioConfig = require("../config/horario");

const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_SEMANA_EN = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Descobre o dia da semana e a hora atual no fuso de São Luís/Brasil,
// independente de onde o servidor esteja rodando (ex: Render nos EUA).
function obterDiaEHoraAtual() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const partes = {};
  formatter.formatToParts(new Date()).forEach((parte) => {
    partes[parte.type] = parte.value;
  });

  return {
    diaSemana: DIAS_SEMANA_EN[partes.weekday],
    horaMinuto: `${partes.hour}:${partes.minute}`,
  };
}

function paraMinutos(horaMinuto) {
  const [horas, minutos] = horaMinuto.split(":").map(Number);
  return horas * 60 + minutos;
}

function estaAberto() {
  const { diaSemana, horaMinuto } = obterDiaEHoraAtual();
  const janela = horarioConfig.dias[diaSemana];
  if (!janela) return false;

  const agoraMin = paraMinutos(horaMinuto);
  const abreMin = paraMinutos(janela.abre);
  const fechaMin = paraMinutos(janela.fecha);

  return agoraMin >= abreMin && agoraMin < fechaMin;
}

function textoHorarioCompleto() {
  let texto = "*Horário de funcionamento:*\n";
  for (let dia = 0; dia <= 6; dia++) {
    const janela = horarioConfig.dias[dia];
    texto += `${NOMES_DIAS[dia]}: ${janela ? `${janela.abre} às ${janela.fecha}` : "fechado"}\n`;
  }
  return texto;
}

// Se estiver perto de fechar, devolve um aviso pra colar na resposta do bot.
// Se não houver aviso a dar, devolve null.
function textoAvisoFechamentoSeAplicavel() {
  const { diaSemana, horaMinuto } = obterDiaEHoraAtual();
  const janela = horarioConfig.dias[diaSemana];
  if (!janela) return null;

  const agoraMin = paraMinutos(horaMinuto);
  const fechaMin = paraMinutos(janela.fecha);
  const faltamMinutos = fechaMin - agoraMin;
  const limiteAviso = horarioConfig.avisoFechamentoProximoMinutos || 0;

  if (faltamMinutos > 0 && faltamMinutos <= limiteAviso) {
    return `⏰ Atenção: fechamos em ${faltamMinutos} minutos! Pode continuar pedindo, mas se passar disso, o pedido fica pra outro horário.`;
  }
  return null;
}

module.exports = { estaAberto, textoHorarioCompleto, textoAvisoFechamentoSeAplicavel };
