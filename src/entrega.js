const { createClient } = require("@supabase/supabase-js");

// ==========================================================
//  BAIRROS DE ENTREGA + TAXAS — Supabase
//  Editar bairro/taxa = editar as tabelas "bairros" e
//  "config_entrega" no Supabase (Table Editor).
// ==========================================================

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function obterConfigEntrega() {
  const [{ data: bairros, error: erroBairros }, { data: config, error: erroConfig }] = await Promise.all([
    supabase.from("bairros").select("*").eq("ativo", true).order("id", { ascending: true }),
    supabase.from("config_entrega").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (erroBairros) console.log("⚠️ Erro ao buscar bairros:", erroBairros.message);
  if (erroConfig) console.log("⚠️ Erro ao buscar config de entrega:", erroConfig.message);

  return {
    bairros: (bairros || []).map((b) => ({
      id: b.id,
      nome: b.nome,
      taxa: Number(b.taxa),
      precisaComplemento: b.precisa_complemento,
    })),
    taxaPadrao: config ? Number(config.taxa_padrao) : 7,
    freteGratisAcimaDe: config && config.frete_gratis_acima_de !== null ? Number(config.frete_gratis_acima_de) : null,
  };
}

// Descobre a taxa de um bairro pelo nome (usado ao montar a mensagem final do pedido).
async function taxaPorNomeBairro(nomeBairro) {
  const { bairros, taxaPadrao } = await obterConfigEntrega();
  const encontrado = bairros.find((b) => b.nome.toLowerCase() === String(nomeBairro).toLowerCase());
  return encontrado ? encontrado.taxa : taxaPadrao;
}

module.exports = { obterConfigEntrega, taxaPorNomeBairro };
