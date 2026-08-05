const { createClient } = require("@supabase/supabase-js");

// ==========================================================
//  PAUSA GERAL DO BOT (Supabase)
//  Guarda numa tabela de 1 linha só (id fixo = 1) se o bot
//  está pausado ou não, pra sobreviver a reinícios do servidor.
// ==========================================================

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const MENSAGEM_PADRAO = "🙏 No momento não estamos aceitando pedidos por aqui.";

async function lerEstado() {
  const { data, error } = await supabase.from("pausa").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    if (error) console.log("⚠️ Erro ao ler pausa do Supabase:", error.message);
    return { pausado: false, mensagem: MENSAGEM_PADRAO };
  }
  return { pausado: data.pausado === true, mensagem: data.mensagem || MENSAGEM_PADRAO };
}

async function salvarEstado(estado) {
  const { error } = await supabase
    .from("pausa")
    .upsert({ id: 1, pausado: estado.pausado, mensagem: estado.mensagem });
  if (error) console.log("⚠️ Erro ao salvar pausa no Supabase:", error.message);
}

async function estaPausado() {
  const estado = await lerEstado();
  return estado.pausado === true;
}

async function mensagemPausa() {
  const estado = await lerEstado();
  return estado.mensagem;
}

async function pausar() {
  const estado = await lerEstado();
  estado.pausado = true;
  await salvarEstado(estado);
}

async function despausar() {
  const estado = await lerEstado();
  estado.pausado = false;
  await salvarEstado(estado);
}

module.exports = { estaPausado, mensagemPausa, pausar, despausar };
