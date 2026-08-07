// ==========================================================
//  SERVIDOR DE PEDIDOS DO SITE
// ==========================================================

const express = require("express");
const path = require("path");
const QRCode = require("qrcode");
const { salvarPedido } = require("./pedidos");
const { listarProdutos, conferirEstoque, baixarEstoque } = require("./produtos");
const { estaAberto, obterHorariosParaApi } = require("./horario");
const { obterConfigEntrega } = require("./entrega");
const { criarRotasApiPainel, criarRotasEstaticasPainel } = require("../painel/server");
const { marcarPedidoFinalizado } = require("./state");

const PORTA_PEDIDOS = process.env.PORTA_PEDIDOS || process.env.PORT || 3333;

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

function marcarDesconectado() {
  conectado = false;
}

function formatarReais(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function numeroParaJid(numeroDigitado) {
  let digitos = String(numeroDigitado).replace(/\D/g, "");
  if (digitos.length <= 11) {
    digitos = "55" + digitos;
  }
  return `${digitos}@s.whatsapp.net`;
}

function montarResumoPedido(pedido) {
  const nomesPagamento = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão (aproximação)" };

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
  
  msg += `\n\n📌 *Pedido já realizado, agora é somente aguardar para o preparo!* 🚀`;

  return msg;
}

function iniciarServidorPedidos(obterSockAtivo) {
  const app = express();
  app.use(express.json());

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
      const temIdentificacao = dados && (dados.jidCliente || dados.numeroCliente);

      if (!dados || !temIdentificacao || !dados.nome || !Array.isArray(dados.itens) || dados.itens.length === 0) {
        return res.status(400).json({ ok: false, erro: "Dados do pedido incompletos." });
      }

      if (!(await estaAberto())) {
        return res.status(423).json({ ok: false, erro: "Estamos fechados no momento. Confira nosso horário de funcionamento." });
      }

      const itensSemEstoque = await conferirEstoque(dados.itens);
      if (itensSemEstoque.length > 0) {
        const detalhes = itensSemEstoque
          .map((i) => `${i.nome} (disponível: ${i.disponivel})`)
          .join(", ");
        return res.status(409).json({ ok: false, erro: `Sem estoque suficiente: ${detalhes}` });
      }

      const jidCliente = dados.jidCliente || numeroParaJid(dados.numeroCliente);
      const resumo = montarResumoPedido(dados);

      await salvarPedido({
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

      await baixarEstoque(dados.itens);
      marcarPedidoFinalizado(jidCliente);

      res.json({ ok: true });

      // Dispara o WhatsApp buscando o socket ativo no exato momento do pedido
      const sockAtual = typeof obterSockAtivo === "function" ? obterSockAtivo() : null;
      if (sockAtual) {
        sockAtual.sendMessage(jidCliente, { text: resumo }).catch(err => {
          console.error("Erro ao enviar mensagem no WhatsApp:", err);
        });
      } else {
        console.warn("⚠️ Socket do WhatsApp não encontrado no momento do disparo do pedido.");
      }

    } catch (erro) {
      console.error("Erro ao processar pedido do site:", erro);
      res.status(500).json({
        ok: false,
        erro: `Não foi possível processar o pedido (${erro.message || "erro desconhecido"}).`,
      });
    }
  });

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

  app.get("/api/produtos", async (req, res) => {
    try {
      res.json(await listarProdutos());
    } catch (erro) {
      console.error("Erro ao listar produtos:", erro);
      res.status(500).json({ ok: false, erro: "Não foi possível carregar o cardápio." });
    }
  });

  app.get("/api/entrega", async (req, res) => {
    try {
      res.json(await obterConfigEntrega());
    } catch (erro) {
      console.error("Erro ao buscar config de entrega:", erro);
      res.status(500).json({ ok: false, erro: "Não foi possível carregar os bairros." });
    }
  });

  app.get("/api/horario", async (req, res) => {
    try {
      res.json(await obterHorariosParaApi());
    } catch (erro) {
      console.error("Erro ao buscar horário:", erro);
      res.status(500).json({ ok: false, erro: "Não foi possível carregar o horário." });
    }
  });

  app.use("/api", criarRotasApiPainel());
  app.use("/painel", criarRotasEstaticasPainel());
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.listen(PORTA_PEDIDOS, () => {
    console.log(`📦 Servidor rodando na porta ${PORTA_PEDIDOS}`);
  });
}

module.exports = { iniciarServidorPedidos, atualizarQR, marcarConectado, marcarDesconectado };