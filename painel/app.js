const formatarReais = (valor) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const nomesFormaPagamento = {
  pix: "Pix",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  dinheiro: "Dinheiro",
};

// ==========================================================
//  NAVEGAÇÃO ENTRE ABAS
// ==========================================================
document.querySelectorAll(".aba").forEach((botao) => {
  botao.addEventListener("click", () => {
    document.querySelectorAll(".aba").forEach((b) => b.classList.remove("aba-ativa"));
    botao.classList.add("aba-ativa");

    const abaAlvo = botao.dataset.aba;
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("view-ativa"));
    document.getElementById(`view-${abaAlvo}`).classList.add("view-ativa");
  });
});

// ==========================================================
//  COZINHA
// ==========================================================
function tempoDecorrido(dataHoraISO) {
  const minutos = Math.floor((Date.now() - new Date(dataHoraISO).getTime()) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `${horas}h${minutos % 60}min`;
}

function textoEntrega(pedido) {
  if (pedido.tipoEntrega === "retirada") return "🏠 Retirada no local";
  let texto = `🛵 ${pedido.bairro || ""}`;
  if (pedido.complemento) texto += ` — ${pedido.complemento}`;
  if (pedido.enderecoDetalhado) texto += `<br>${pedido.enderecoDetalhado}`;
  return texto;
}

function textoPagamentoComanda(pedido) {
  const nome = nomesFormaPagamento[pedido.formaPagamento] || pedido.formaPagamento || "-";
  if (pedido.formaPagamento === "dinheiro" && pedido.trocoPara) {
    const troco = pedido.trocoPara - pedido.total;
    return `${nome} · troco para ${formatarReais(pedido.trocoPara)} (troco: ${formatarReais(troco)})`;
  }
  return nome;
}

const PROXIMO_STATUS = { recebido: "preparando", preparando: "pronto", pronto: "entregue" };
const TEXTO_BOTAO = {
  recebido: "▶ Iniciar preparo",
  preparando: "✅ Marcar como pronto",
  pronto: "📦 Marcar como entregue",
};

function criarComandaHTML(pedido) {
  const itensHtml = pedido.itens
    .map((item) => {
      const obs = item.observacao ? ` <span class="comanda-item-obs">(${item.observacao})</span>` : "";
      return `<li>${item.quantidade}x ${item.nome}${obs}</li>`;
    })
    .join("");

  const proximoStatus = PROXIMO_STATUS[pedido.status];
  const numeroTicket = pedido.id.slice(-4);
  const horaPedido = new Date(pedido.dataHoraISO).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <div class="comanda" style="--cor-status: var(--status-${pedido.status})" data-id="${pedido.id}">
      <div class="comanda-cabecalho">
        <span class="comanda-numero">#${numeroTicket} · ${horaPedido}</span>
        <span class="comanda-tempo">${tempoDecorrido(pedido.dataHoraISO)}</span>
      </div>
      <div class="comanda-cliente">${pedido.nome || "Cliente"}</div>
      <ul class="comanda-itens">${itensHtml}</ul>
      <div class="comanda-entrega">${textoEntrega(pedido)}</div>
      <div class="comanda-pagamento">${textoPagamentoComanda(pedido)}</div>
      ${
        proximoStatus
          ? `<button class="comanda-botao" onclick="avancarStatus('${pedido.id}', '${proximoStatus}')">${TEXTO_BOTAO[pedido.status]}</button>`
          : ""
      }
    </div>
  `;
}

async function avancarStatus(id, novoStatus) {
  await fetch(`/api/pedidos/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: novoStatus }),
  });
  carregarCozinha();
}

async function carregarCozinha() {
  const resposta = await fetch("/api/pedidos/ativos");
  const pedidos = await resposta.json();

  const colunas = { recebido: [], preparando: [], pronto: [] };
  pedidos.forEach((p) => {
    if (colunas[p.status]) colunas[p.status].push(p);
  });

  Object.entries(colunas).forEach(([status, lista]) => {
    document.getElementById(`lista-${status}`).innerHTML = lista.map(criarComandaHTML).join("");
    document.getElementById(`contador-${status}`).textContent = lista.length;
  });

  document.getElementById("cozinha-vazia").hidden = pedidos.length > 0;
}

// ==========================================================
//  VENDAS
// ==========================================================
let periodoAtual = "hoje";

document.querySelectorAll(".filtro").forEach((botao) => {
  botao.addEventListener("click", () => {
    document.querySelectorAll(".filtro").forEach((b) => b.classList.remove("filtro-ativo"));
    botao.classList.add("filtro-ativo");
    periodoAtual = botao.dataset.periodo;
    carregarVendas();
  });
});

async function carregarVendas() {
  const resposta = await fetch(`/api/vendas?periodo=${periodoAtual}`);
  const dados = await resposta.json();

  document.getElementById("stat-faturamento").textContent = formatarReais(dados.faturamento);
  document.getElementById("stat-pedidos").textContent = dados.totalPedidos;
  document.getElementById("stat-ticket").textContent = formatarReais(dados.ticketMedio);

  const maiorQuantidade = Math.max(1, ...dados.itensVendidos.map((i) => i.quantidade));
  const listaItens = document.getElementById("lista-itens-vendidos");
  listaItens.innerHTML = dados.itensVendidos.length
    ? dados.itensVendidos
        .map(
          (item) => `
        <div class="item-vendido-linha">
          <span class="item-vendido-nome">${item.nome}</span>
          <span class="item-vendido-barra-fundo">
            <span class="item-vendido-barra" style="width:${(item.quantidade / maiorQuantidade) * 100}%"></span>
          </span>
          <span class="item-vendido-qtd">${item.quantidade}x</span>
        </div>`
        )
        .join("")
    : '<p class="sem-dados">Nenhuma venda no período selecionado.</p>';

  const listaPagamentos = document.getElementById("lista-pagamentos");
  listaPagamentos.innerHTML = dados.porFormaPagamento.length
    ? dados.porFormaPagamento
        .map(
          (p) =>
            `<span class="pagamento-chip">${nomesFormaPagamento[p.forma] || p.forma}: ${p.quantidade}</span>`
        )
        .join("")
    : '<p class="sem-dados">Nenhum dado no período selecionado.</p>';
}

// ==========================================================
//  ATUALIZAÇÃO AUTOMÁTICA
// ==========================================================
function atualizarTudo() {
  carregarCozinha();
  carregarVendas();
}

atualizarTudo();
setInterval(atualizarTudo, 6000);
