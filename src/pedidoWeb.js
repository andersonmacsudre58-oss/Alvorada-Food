// ==========================================================
//  SERVIDOR DE PEDIDOS DO SITE
//  Recebe o pedido finalizado no site (via HTTP) e manda a
//  mensagem automaticamente pelo WhatsApp, usando a mesma
//  conexão do bot (Baileys) — sem o cliente precisar apertar
//  "enviar" em lugar nenhum.
//
//  IMPORTANTE: pra isso funcionar, este servidor precisa estar
//  acessível pela internet (HTTPS), rodando junto com o bot.js
//  em algum servidor (VPS, Railway, Render etc). Rodando só no
//  seu computador de casa, o site não vai conseguir chamar essa
//  API.
// ==========================================================

const express = require("express");
const path = require("path");
const QRCode = require("qrcode");
const { salvarPedido } = require("./pedidos");
const { criarRotasPainel } = require("../painel/server");

// Porta em que essa API vai escutar.
const PORTA_PEDIDOS = process.env.PORTA_PEDIDOS || process.env.PORT || 3333;

// Estado da conexão com o WhatsApp, usado pela página /qr.
let ultimoQR = null;
let conectado = false;

function atualizarQR(qr) {
  ultimoQR = qr;
  conectado = false;
}

function marcarConectado() {
  conectado = true;
  ultimoQR = null;
}

function formatarReais(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Transforma o número digitado pelo cliente (ex: "98 98227-3236")
// no formato de jid que o Baileys usa para mandar mensagem (ex: "5598982273236@s.whatsapp.net").
function numeroParaJid(numeroDigitado) {
  let digitos = String(numeroDigitado).replace(/\D/g, "");

  // Se a pessoa não digitou o código do país, assume Brasil (55).
  if (digitos.length <= 11) {
    digitos = "55" + digitos;
  }

  return `${digitos}@s.whatsapp.net`;
}

function montarResumoPedido(pedido) {
  const nomesPagamento = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão" };

  let msg = `🌭 *Pedido recebido pelo site!*\n\n`;
  msg += `*Cliente:* ${pedido.nome}\n\n`;
  msg += `*Itens:*\n`;
  pedido.itens.forEach((item) => {
    msg += `${item.quantidade}x ${item.nome} — ${formatarReais(item.precoUnitario * item.quantidade)}\n`;
  });
  msg += `\n*Subtotal:* ${formatarReais(pedido.subtotal)}\n`;
  msg += `*Entrega:* ${pedido.taxaEntrega === 0 ? "Grátis" : formatarReais(pedido.taxaEntrega)}\n`;
  msg += `*Total:* ${formatarReais(pedido.total)}\n\n`;
  msg += `*Tipo:* ${pedido.tipoEntrega === "entrega" ? "Entrega" : "Retirada no local"}\n`;
  if (pedido.tipoEntrega === "entrega") {
    msg += `*Bairro:* ${pedido.bairro}\n`;
    if (pedido.complemento) msg += `*Complemento:* ${pedido.complemento}\n`;
    if (pedido.enderecoDetalhado) msg += `*Endereço:* ${pedido.enderecoDetalhado}\n`;
  }
  msg += `*Pagamento:* ${nomesPagamento[pedido.formaPagamento] || pedido.formaPagamento}`;
  if (pedido.formaPagamento === "dinheiro" && pedido.trocoPara) {
    msg += ` (troco para ${pedido.trocoPara})`;
  }

  return msg;
}

/**
 * Sobe o servidor da API de pedidos do site.
 * @param {object} sock - a conexão ativa do Baileys (a mesma usada pelo bot).
 */
function iniciarServidorPedidos(sock) {
  const app = express();
  app.use(express.json());

  // Libera acesso de qualquer site (o site fica hospedado em outro domínio).
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  app.post("/pedido", async (req, res) => {
    try {
      const dados = req.body;

      if (!dados || !dados.numeroCliente || !dados.nome || !Array.isArray(dados.itens) || dados.itens.length === 0) {
        return res.status(400).json({ ok: false, erro: "Dados do pedido incompletos." });
      }

      if (!conectado) {
        return res.status(503).json({ ok: false, erro: "O WhatsApp ainda não está conectado. Tente novamente em instantes." });
      }

      const jidCliente = numeroParaJid(dados.numeroCliente);
      const resumo = montarResumoPedido(dados);

      // Manda a mensagem pro cliente automaticamente — como é o mesmo número
      // conectado ao bot, essa mensagem também aparece na sua própria conversa
      // com esse cliente no WhatsApp.
      await sock.sendMessage(jidCliente, { text: resumo });

      salvarPedido({
        cliente: jidCliente,
        nome: dados.nome,
        itens: dados.itens,
        tipoEntrega: dados.tipoEntrega,
        bairro: dados.bairro || null,
        complemento: dados.complemento || null,
        enderecoDetalhado: dados.enderecoDetalhado || null,
        formaPagamento: dados.formaPagamento,
        trocoPara: dados.trocoPara || null,
        subtotal: dados.subtotal,
        taxaEntrega: dados.taxaEntrega,
        total: dados.total,
        origem: "site",
      });

      res.json({ ok: true });
    } catch (erro) {
      console.error("Erro ao processar pedido do site:", erro);
      res.status(500).json({ ok: false, erro: "Não foi possível enviar o pedido pelo WhatsApp." });
    }
  });

  // Página pra escanear o QR Code pelo navegador (útil quando o bot roda
  // num servidor remoto, tipo Render, onde não dá pra ver o terminal fácil).
  app.get("/qr", async (req, res) => {
    res.set("Content-Type", "text/html; charset=utf-8");

    if (conectado) {
      return res.send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h1>✅ WhatsApp conectado!</h1>
          <p>O bot já está autenticado e pronto pra atender pedidos.</p>
        </body></html>
      `);
    }

    if (!ultimoQR) {
      return res.send(`
        <html><head><meta http-equiv="refresh" content="4"></head>
        <body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h1>⏳ Gerando QR Code...</h1>
          <p>Essa página atualiza sozinha a cada poucos segundos.</p>
        </body></html>
      `);
    }

    const qrImagem = await QRCode.toDataURL(ultimoQR, { width: 320 });
    res.send(`
      <html><head><meta http-equiv="refresh" content="20"></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px;">
        <h1>📱 Escaneie com o WhatsApp</h1>
        <p>Abra o WhatsApp do número do negócio → Aparelhos conectados → Conectar um aparelho.</p>
        <img src="${qrImagem}" alt="QR Code" style="margin-top:20px;" />
        <p style="color:#888;font-size:13px;margin-top:16px;">O QR expira em alguns segundos; esta página atualiza sozinha.</p>
      </body></html>
    `);
  });

  // Painel de cozinha + vendas, disponível em /painel
  app.use("/painel", criarRotasPainel());

  // Serve o site (index.html e afins) direto pela mesma URL do bot,
  // já que ele está numa pasta "public" dentro do projeto.
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.listen(PORTA_PEDIDOS, () => {
    console.log(`📦 Servidor rodando na porta ${PORTA_PEDIDOS}`);
    console.log(`   Site: http://localhost:${PORTA_PEDIDOS}/`);
    console.log(`   Painel: http://localhost:${PORTA_PEDIDOS}/painel`);
    console.log(`   QR Code: http://localhost:${PORTA_PEDIDOS}/qr`);
  });
}

module.exports = { iniciarServidorPedidos, atualizarQR, marcarConectado };
