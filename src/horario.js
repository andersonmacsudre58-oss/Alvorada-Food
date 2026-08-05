const { createClient } = require("@supabase/supabase-js");

// ==========================================================
//  HORÁRIO DE FUNCIONAMENTO — Supabase
//  Editar dias/horários = editar a tabela "horario_funcionamento"
//  no Supabase (Table Editor). Não precisa mexer em código.
// ==========================================================

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const NOMES_DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function obterDiaEHoraAtual() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const DIAS_SEMANA_EN = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

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
  if (!horaMinuto) return null;
  const [horas, minutos] = horaMinuto.split(":").map(Number);
  return horas * 60 + minutos;
}

async function buscarTodosHorarios() {
  const { data, error } = await supabase
    .from("horario_funcionamento")
    .select("*")
    .order("dia_semana", { ascending: true });

  if (error || !data) {
    console.log("⚠️ Erro ao buscar horários do Supabase:", error?.message);
    return [];
  }
  return data;
}

function calcularAberto(todos) {
  const { diaSemana, horaMinuto } = obterDiaEHoraAtual();
  const hoje = todos.find((d) => d.dia_semana === diaSemana);
  if (!hoje || !hoje.aberto) return false;

  const agoraMin = paraMinutos(horaMinuto);
  const abreMin = paraMinutos(hoje.abre);
  const fechaMin = paraMinutos(hoje.fecha);
  if (abreMin === null || fechaMin === null) return false;

  return agoraMin >= abreMin && agoraMin < fechaMin;
}

async function estaAberto() {
  const todos = await buscarTodosHorarios();
  return calcularAberto(todos);
}

async function textoHorarioCompleto() {
  const todos = await buscarTodosHorarios();
  let texto = "*Horário de funcionamento:*\n";
  for (let dia = 0; dia <= 6; dia++) {
    const linha = todos.find((d) => d.dia_semana === dia);
    texto += `${NOMES_DIAS[dia]}: ${
      linha && linha.aberto ? `${linha.abre?.slice(0, 5)} às ${linha.fecha?.slice(0, 5)}` : "fechado"
    }\n`;
  }
  return texto;
}

// Formato simples pro site consumir via API (busca uma única vez).
async function obterHorariosParaApi() {
  const todos = await buscarTodosHorarios();
  return {
    abertoAgora: calcularAberto(todos),
    dias: todos.map((d) => ({
      diaSemana: d.dia_semana,
      nome: NOMES_DIAS[d.dia_semana],
      aberto: d.aberto,
      abre: d.abre ? d.abre.slice(0, 5) : null,
      fecha: d.fecha ? d.fecha.slice(0, 5) : null,
    })),
  };
}

module.exports = { estaAberto, textoHorarioCompleto, obterHorariosParaApi };
