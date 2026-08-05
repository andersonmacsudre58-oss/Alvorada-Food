require("dotenv").config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");
const pino = require("pino");

const adminConfig = require("./config/admin");
const { estaPausado, mensagemPausa, pausar, despausar } = require("./src/pausa");
const {
  estaPausadoIndividualmente,
  pausarIndividual,
  despausarIndividual,
} = require("./src/pausaIndividual");
const { iniciarServidorPedidos, atualizarQR, marcarConectado } = require("./src/pedidoWeb");

let servidorPedidosIniciado = false;
let sockAtual = null;

// ----------------------------------------------------------
//  MENSAGENS
// ----------------------------------------------------------
// Link do site de pedidos (troque quando publicar, ex: "https://alvoradafood.onrender.com")
const SITE_URL = "https://SEU-SITE-AQUI.onrender.com";

function textoBoasVindas(numero) {
  const linkComIdentificacao = `${SITE_URL}?cliente=${encodeURIComponent(numero)}`;
  return (
    "🌭 *Bem-vindo(a) à Alvorada Food!* 🌭\n\n" +
    "Todo o nosso atendimento agora é pelo site — lá você vê o cardápio, monta seu carrinho e finaliza o pedido em poucos toques:\n\n" +
    `🔗 ${linkComIdentificacao}\n\n` +
    "Assim que você finalizar o pedido por lá, ele já cai certinho aqui na nossa conversa, com todos os detalhes. 😉"
  );
}

/**
 * Ponto de entrada de cada mensagem recebida. Não existe mais fluxo de
 * pedido por aqui — só trata comandos de administrador (pausar/despausar
 * o bot) e devolve a mensagem de boas-vindas com o link do site.
 */
async function processarMensagem(numero, textoOriginal) {
  const texto = textoOriginal.trim().toLowerCase();

  // Comandos de administrador funcionam mesmo com o bot pausado
  if (adminConfig.numerosAdmin.includes(numero)) {
    if (texto === "pausar bot" || texto === "pausar") {
      await pausar();
      return "🔴 Bot pausado. Os clientes vão receber a mensagem de indisponibilidade até você digitar *voltar bot*.";
    }
    if (texto === "voltar bot" || texto === "despausar" || texto === "despausar bot") {
      await despausar();
      return "🟢 Bot reativado! Já está respondendo normalmente.";
    }
  }

  if (await estaPausado()) {
    return await mensagemPausa();
  }

  return textoBoasVindas(numero);
}

// ----------------------------------------------------------
//  CONEXÃO COM O WHATSAPP (via Baileys)
// ----------------------------------------------------------
async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: "silent" }), // troque para "info" se quiser ver os logs internos
    printQRInTerminal: false,
  });
  sockAtual = sock;

  if (!servidorPedidosIniciado) {
    iniciarServidorPedidos(sock);
    servidorPedidosIniciado = true;
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("Escaneie o QR Code abaixo com o WhatsApp do número do seu negócio:");
      qrcode.generate(qr, { small: true });
      console.log("(ou acesse /qr pelo navegador, se estiver rodando num servidor remoto)");
      atualizarQR(qr);
    }

    if (connection === "close") {
      const erro = lastDisconnect?.error;
      const codigoErro = new Boom(erro)?.output?.statusCode;
      const deveReconectar = codigoErro !== DisconnectReason.loggedOut;
      console.log("Conexão encerrada. Código:", codigoErro, "| Motivo:", erro?.message || erro);
      console.log("Reconectando?", deveReconectar);
      if (deveReconectar) {
        iniciarBot();
      } else {
        console.log("Sessão desconectada (logout). Apague a pasta 'auth_info_baileys' e escaneie o QR novamente.");
      }
    } else if (connection === "open") {
      console.log("✅ Bot conectado! Recebendo mensagens e enviando o link do site.");
      marcarConectado();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message) continue; // ignora mensagens sem texto (ex: reações, status internos)
      if (msg.key.remoteJid === "status@broadcast") continue; // ignora status/stories
      if (msg.key.remoteJid.endsWith("@g.us")) continue; // ignora mensagens de grupos

      const numero = msg.key.remoteJid;
      const textoRecebido =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      if (!textoRecebido) continue; // ignora áudios, figurinhas, imagens sem legenda, etc.

      // Mensagem enviada por você mesmo, digitando direto na conversa do cliente
      // (mesmo WhatsApp conectado ao bot). Usada para pausar/despausar só aquele cliente.
      if (msg.key.fromMe) {
        const textoNormalizado = textoRecebido.trim().toLowerCase();
        if (textoNormalizado === "oi") {
          await pausarIndividual(numero);
        } else if (textoNormalizado === "obrigado") {
          await despausarIndividual(numero);
        }
        continue; // nunca processa o fluxo do bot para mensagens enviadas por nós mesmos
      }

      // Cliente pausado individualmente: bot não responde até você mandar "obrigado" na conversa dele.
      if (await estaPausadoIndividualmente(numero)) continue;

      const resposta = await processarMensagem(numero, textoRecebido);
      await sock.sendMessage(numero, { text: resposta });
    }
  });
}

process.on("unhandledRejection", (erro) => {
  console.log("Erro não tratado:", erro);
});

iniciarBot();
