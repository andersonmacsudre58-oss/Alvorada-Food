const { createClient } = require("@supabase/supabase-js");

// ==========================================================
//  PEDIDOS CONFIRMADOS (Supabase)
//  Guarda cada pedido finalizado na tabela "pedidos" do
//  Supabase, para o painel de cozinha e o de vendas consultarem.
//  Precisa das variáveis de ambiente SUPABASE_URL e SUPABASE_KEY.
// ==========================================================

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function paraLinha(pedido) {
  return {
    id: pedido.id,
    status: pedido.status,
    data_hora_iso: pedido.dataHoraISO,
    cliente: pedido.cliente || null,
    nome: pedido.nome || null,
    itens: pedido.itens || [],
    tipo_entrega: pedido.tipoEntrega || null,
    bairro: pedido.bairro || null,
    complemento: pedido.complemento || null,
    endereco_detalhado: pedido.enderecoDetalhado || null,
    forma_pagamento: pedido.formaPagamento || null,
    troco_para: pedido.trocoPara || null,
    subtotal: pedido.subtotal || null,
    taxa_entrega: pedido.taxaEntrega || null,
    total: pedido.total || null,
    origem: pedido.origem || null,
  };
}

function paraPedido(linha) {
  return {
    id: linha.id,
    status: linha.status,
    dataHoraISO: linha.data_hora_iso,
    cliente: linha.cliente,
    nome: linha.nome,
    itens: linha.itens,
    tipoEntrega: linha.tipo_entrega,
    bairro: linha.bairro,
    complemento: linha.complemento,
    enderecoDetalhado: linha.endereco_detalhado,
    formaPagamento: linha.forma_pagamento,
    trocoPara: linha.troco_para,
    subtotal: linha.subtotal,
    taxaEntrega: linha.taxa_entrega,
    total: linha.total,
    origem: linha.origem,
  };
}

async function salvarPedido(dadosPedido) {
  const novoPedido = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "recebido", // recebido -> preparando -> pronto -> entregue
    dataHoraISO: new Date().toISOString(),
    ...dadosPedido,
  };

  const { error } = await supabase.from("pedidos").insert(paraLinha(novoPedido));
  if (error) {
    console.log("⚠️ Erro ao salvar pedido no Supabase:", error.message);
  }

  return novoPedido;
}

async function listarPedidos() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .order("data_hora_iso", { ascending: true });

  if (error) {
    console.log("⚠️ Erro ao listar pedidos do Supabase:", error.message);
    return [];
  }

  return (data || []).map(paraPedido);
}

async function atualizarStatusPedido(id, novoStatus) {
  const { data, error } = await supabase
    .from("pedidos")
    .update({ status: novoStatus })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.log("⚠️ Erro ao atualizar status no Supabase:", error.message);
    return null;
  }

  return data ? paraPedido(data) : null;
}

module.exports = { salvarPedido, listarPedidos, atualizarStatusPedido };
