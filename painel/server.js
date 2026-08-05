// ==========================================================
//  PAINEL (Cozinha + Vendas)
//  Exporta duas partes:
//   - criarRotasApiPainel(): as rotas /pedidos/ativos, /pedidos/:id/status
//     e /vendas, montadas em "/api" pelo servidor principal (pedidoWeb.js).
//     Ficam na raiz do site porque o painel/app.js chama fetch("/api/...").
//   - criarRotasEstaticasPainel(): serve o HTML/CSS/JS do painel,
//     montado em "/painel" pelo servidor principal.
// ==========================================================

const express = require("express");
const { listarPedidos, atualizarStatusPedido } = require("../src/pedidos");

const STATUS_ATIVOS = ["recebido", "preparando", "pronto"];
const STATUS_VALIDOS = ["recebido", "preparando", "pronto", "entregue"];

function chaveDataSaoPaulo(dataISO) {
  return new Date(dataISO).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function pedidoDentroDoPeriodo(pedido, periodo) {
  const agora = Date.now();
  const dataPedido = new Date(pedido.dataHoraISO).getTime();

  if (periodo === "hoje") {
    const hojeChave = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    return chaveDataSaoPaulo(pedido.dataHoraISO) === hojeChave;
  }
  if (periodo === "semana") return agora - dataPedido <= 7 * 24 * 60 * 60 * 1000;
  if (periodo === "mes") return agora - dataPedido <= 30 * 24 * 60 * 60 * 1000;
  return true; // "tudo"
}

// Agora é assíncrona porque listarPedidos() busca os dados no Supabase.
async function calcularVendas(periodo) {
  const todosPedidos = await listarPedidos();
  const pedidosEntregues = todosPedidos.filter(
    (p) => p.status === "entregue" && pedidoDentroDoPeriodo(p, periodo)
  );

  const faturamento = pedidosEntregues.reduce((soma, p) => soma + (p.total || 0), 0);
  const totalPedidos = pedidosEntregues.length;
  const ticketMedio = totalPedidos > 0 ? faturamento / totalPedidos : 0;

  const quantidadePorItem = {};
  const quantidadePorPagamento = {};

  pedidosEntregues.forEach((pedido) => {
    (pedido.itens || []).forEach((item) => {
      quantidadePorItem[item.nome] = (quantidadePorItem[item.nome] || 0) + item.quantidade;
    });

    const forma = pedido.formaPagamento || "não informado";
    quantidadePorPagamento[forma] = (quantidadePorPagamento[forma] || 0) + 1;
  });

  const itensVendidos = Object.entries(quantidadePorItem)
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const porFormaPagamento = Object.entries(quantidadePorPagamento)
    .map(([forma, quantidade]) => ({ forma, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);

  return { faturamento, totalPedidos, ticketMedio, itensVendidos, porFormaPagamento };
}

function criarRotasApiPainel() {
  const router = express.Router();
  router.use(express.json());

  router.get("/pedidos/ativos", async (req, res) => {
    try {
      const todosPedidos = await listarPedidos();
      const ativos = todosPedidos
        .filter((p) => STATUS_ATIVOS.includes(p.status))
        .sort((a, b) => new Date(a.dataHoraISO) - new Date(b.dataHoraISO)); // mais antigo primeiro

      res.json(ativos);
    } catch (erro) {
      console.error("Erro ao listar pedidos ativos:", erro);
      res.status(500).json({ ok: false, erro: "Não foi possível carregar os pedidos." });
    }
  });

  router.post("/pedidos/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body || {};

      if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({ ok: false, erro: "Status inválido." });
      }

      const pedidoAtualizado = await atualizarStatusPedido(id, status);
      if (!pedidoAtualizado) {
        return res.status(404).json({ ok: false, erro: "Pedido não encontrado." });
      }

      res.json({ ok: true, pedido: pedidoAtualizado });
    } catch (erro) {
      console.error("Erro ao atualizar status do pedido:", erro);
      res.status(500).json({ ok: false, erro: "Não foi possível atualizar o pedido." });
    }
  });

  router.get("/vendas", async (req, res) => {
    try {
      const periodo = ["hoje", "semana", "mes", "tudo"].includes(req.query.periodo)
        ? req.query.periodo
        : "hoje";

      res.json(await calcularVendas(periodo));
    } catch (erro) {
      console.error("Erro ao calcular vendas:", erro);
      res.status(500).json({ ok: false, erro: "Não foi possível calcular as vendas." });
    }
  });

  return router;
}

function criarRotasEstaticasPainel() {
  return express.static(__dirname);
}

module.exports = { criarRotasApiPainel, criarRotasEstaticasPainel };
