const { createClient } = require("@supabase/supabase-js");

// ==========================================================
//  PRODUTOS (cardápio + estoque) — Supabase
//  Fonte única de verdade: tanto o site quanto o painel usam
//  esses dados. Editar preço/estoque/nome é editar a tabela
//  "produtos" direto no Supabase (Table Editor) — não precisa
//  mexer em código nem publicar de novo.
// ==========================================================

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function paraProduto(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    categoria: linha.categoria,
    preco: Number(linha.preco),
    estoque: Number(linha.estoque),
    unidade: linha.unidade,
    descricao: linha.descricao || "",
    ativo: linha.ativo,
  };
}

// Lista só os produtos ativos, pro site mostrar.
async function listarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("ativo", true)
    .order("categoria", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.log("⚠️ Erro ao listar produtos do Supabase:", error.message);
    return [];
  }

  return (data || []).map(paraProduto);
}

/**
 * Confere se há estoque suficiente para todos os itens de um pedido.
 * Retorna uma lista dos itens que NÃO têm estoque suficiente (vazia se tudo ok).
 */
async function conferirEstoque(itensPedido) {
  const { data, error } = await supabase.from("produtos").select("id, nome, estoque");
  if (error) {
    console.log("⚠️ Erro ao conferir estoque:", error.message);
    return []; // em caso de falha na checagem, deixa passar pra não travar o pedido
  }

  const insuficientes = [];
  for (const item of itensPedido) {
    const produto = data.find((p) => p.id === item.produtoId || p.nome === item.nome);
    if (produto && Number(produto.estoque) < item.quantidade) {
      insuficientes.push({ nome: produto.nome, disponivel: produto.estoque, pedido: item.quantidade });
    }
  }
  return insuficientes;
}

/**
 * Baixa o estoque dos itens de um pedido já confirmado.
 */
async function baixarEstoque(itensPedido) {
  for (const item of itensPedido) {
    const { data, error: erroLeitura } = await supabase
      .from("produtos")
      .select("id, estoque")
      .or(`id.eq.${item.produtoId || -1},nome.eq.${item.nome}`)
      .maybeSingle();

    if (erroLeitura || !data) continue;

    const novoEstoque = Math.max(0, Number(data.estoque) - item.quantidade);
    const { error: erroEscrita } = await supabase
      .from("produtos")
      .update({ estoque: novoEstoque })
      .eq("id", data.id);

    if (erroEscrita) {
      console.log(`⚠️ Erro ao baixar estoque de "${item.nome}":`, erroEscrita.message);
    }
  }
}

module.exports = { listarProdutos, conferirEstoque, baixarEstoque };
