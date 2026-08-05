const { createClient } = require("@supabase/supabase-js");

// ==========================================================
//  PAUSA INDIVIDUAL (por conversa) — Supabase
//  Permite pausar o bot só para um cliente específico.
//  Como usar: entre na conversa do cliente pelo WhatsApp
//  conectado ao bot e mande:
//    "oi"       -> pausa o bot só para esse cliente
//    "obrigado" -> volta o bot a responder esse cliente
// ==========================================================

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function estaPausadoIndividualmente(numero) {
  const { data, error } = await supabase
    .from("pausa_individual")
    .select("numero")
    .eq("numero", numero)
    .maybeSingle();

  if (error) {
    console.log("⚠️ Erro ao checar pausa individual no Supabase:", error.message);
    return false;
  }
  return !!data;
}

async function pausarIndividual(numero) {
  const { error } = await supabase.from("pausa_individual").upsert({ numero });
  if (error) console.log("⚠️ Erro ao pausar individual no Supabase:", error.message);
}

async function despausarIndividual(numero) {
  const { error } = await supabase.from("pausa_individual").delete().eq("numero", numero);
  if (error) console.log("⚠️ Erro ao despausar individual no Supabase:", error.message);
}

module.exports = { estaPausadoIndividualmente, pausarIndividual, despausarIndividual };
