// ==========================================================
//  PAINEL (Cozinha + Vendas)
//  Exporta um Router do Express com as rotas de API que o
//  painel/app.js consome, e serve os arquivos estáticos
//  (index.html, app.js, styles.css) desta mesma pasta.
// ==========================================================

const express = require("express");
const path = require("path");
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

function calcularVendas(periodo) {
  const pedidosEntregues = listarPedidos().filter(
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

function criarRotasPainel() {
  const router = express.Router();
  router.use(express.json());

  router.get("/api/pedidos/ativos", (req, res) => {
    const ativos = listarPedidos()
      .filter((p) => STATUS_ATIVOS.includes(p.status))
      .sort((a, b) => new Date(a.dataHoraISO) - new Date(b.dataHoraISO)); // mais antigo primeiro

    res.json(ativos);
  });

  router.post("/api/pedidos/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ ok: false, erro: "Status inválido." });
    }

    const pedidoAtualizado = atualizarStatusPedido(id, status);
    if (!pedidoAtualizado) {
      return res.status(404).json({ ok: false, erro: "Pedido não encontrado." });
    }

    res.json({ ok: true, pedido: pedidoAtualizado });
  });

  router.get("/api/vendas", (req, res) => {
    const periodo = ["hoje", "semana", "mes", "tudo"].includes(req.query.periodo)
      ? req.query.periodo
      : "hoje";

    res.json(calcularVendas(periodo));
  });

  // Serve index.html, app.js e styles.css desta mesma pasta.
  router.use(express.static(__dirname));

  return router;
}

module.exports = { criarRotasPainel };
