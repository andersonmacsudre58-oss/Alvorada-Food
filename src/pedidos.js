const fs = require("fs");
const path = require("path");

// ==========================================================
//  PEDIDOS CONFIRMADOS
//  Guarda cada pedido finalizado num arquivo JSON, para o
//  painel de cozinha e o painel de vendas poderem consultar.
// ==========================================================

const arquivoPedidos = path.join(__dirname, "..", "pedidos.json");

function lerPedidos() {
  try {
    if (!fs.existsSync(arquivoPedidos)) return [];
    const conteudo = fs.readFileSync(arquivoPedidos, "utf-8");
    return JSON.parse(conteudo);
  } catch (erro) {
    console.log("⚠️ Não foi possível ler pedidos.json:", erro.message);
    return [];
  }
}

function escreverPedidos(pedidos) {
  fs.writeFileSync(arquivoPedidos, JSON.stringify(pedidos, null, 2), "utf-8");
}

function salvarPedido(dadosPedido) {
  const pedidos = lerPedidos();

  const novoPedido = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "recebido", // recebido -> preparando -> pronto -> entregue
    dataHoraISO: new Date().toISOString(),
    ...dadosPedido,
  };

  pedidos.push(novoPedido);
  escreverPedidos(pedidos);
  return novoPedido;
}

function listarPedidos() {
  return lerPedidos();
}

function atualizarStatusPedido(id, novoStatus) {
  const pedidos = lerPedidos();
  const pedido = pedidos.find((p) => p.id === id);
  if (!pedido) return null;
  pedido.status = novoStatus;
  escreverPedidos(pedidos);
  return pedido;
}

module.exports = { salvarPedido, listarPedidos, atualizarStatusPedido };
