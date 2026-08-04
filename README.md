# 🍔 Bot de WhatsApp - Lanchonete

Bot que atende clientes no WhatsApp, mostra o cardápio, monta o pedido,
calcula o total e aplica a taxa de entrega conforme o bairro do cliente.

## Como funciona a conversa

1. Cliente manda qualquer mensagem → bot mostra o cardápio numerado.
2. Cliente digita o número do item → bot pergunta a quantidade.
3. Cliente pode adicionar quantos itens quiser.
4. Cliente digita `fechar` → bot pergunta `entrega` ou `retirada`.
5. Se for entrega, pergunta o bairro e calcula a taxa automaticamente.
6. Mostra o resumo (subtotal + taxa + total) e pede `confirmar`.
7. Pedido confirmado aparece no terminal (console) do servidor — é aqui
   que você pode plugar um banco de dados, planilha, ou grupo do WhatsApp
   da cozinha para receber os pedidos automaticamente.

Comandos que funcionam a qualquer momento:
- `menu` ou `cardapio` → mostra o cardápio de novo
- `cancelar` → cancela o pedido e reinicia a conversa

## O que você PRECISA editar antes de usar

### 1. Cardápio → `config/catalogo.js`
Troque nomes, categorias e preços dos produtos, ou adicione novos itens
(basta seguir o mesmo formato, com um `id` novo).

### 2. Bairros e taxas → `config/entrega.js`
Coloque os bairros que você atende e o valor da entrega para cada um.
Também dá pra configurar frete grátis acima de um valor mínimo.

## Como instalar e rodar

Você precisa ter o **Node.js** instalado (versão 18 ou mais recente).

```bash
# 1. Entre na pasta do projeto
cd lanches-bot

# 2. Instale as dependências
npm install

# 3. Rode o bot
npm start
```

Vai aparecer um **QR Code** no terminal. Abra o WhatsApp do número do seu
negócio → *Aparelhos conectados* → *Conectar um aparelho* → escaneie o QR.

Pronto! O número do seu negócio já está conectado e vai responder
automaticamente às mensagens dos clientes.

> ⚠️ Este bot usa a biblioteca `whatsapp-web.js`, que simula o WhatsApp Web.
> É a forma mais rápida e gratuita de começar, sem precisar de aprovação
> da Meta. Ela roda de forma não-oficial, então: mantenha o celular do
> número do negócio conectado à internet, e evite enviar mensagens em massa
> (spam), pois o número pode ser bloqueado pelo WhatsApp se for usado de
> forma abusiva. Para um volume muito grande de pedidos/dia, o ideal no
> futuro é migrar para a API oficial do WhatsApp (Meta Cloud API) — a
> lógica de catálogo e cálculo de pedido deste projeto pode ser reaproveitada
> quase sem alterações.

## Onde os pedidos ficam salvos

Hoje, cada pedido confirmado é impresso no console do servidor (arquivo
`bot.js`, dentro do `case ETAPAS.AGUARDANDO_CONFIRMACAO`). Para produção,
recomendo:
- Salvar em um arquivo/planilha (fácil de adicionar com a lib `xlsx` ou `csv-writer`)
- Ou salvar em um banco (ex: SQLite, Firebase, Supabase)
- Ou encaminhar automaticamente para um grupo/número da cozinha

Posso te ajudar a implementar qualquer uma dessas opções — é só pedir.

## Rodando 24 horas

Para o bot ficar sempre ativo (mesmo com o computador desligado), hospede
em um servidor simples (ex: uma VPS barata, Railway, Render, ou um
Raspberry Pi em casa) e mantenha o `npm start` rodando com um gerenciador
de processos como o `pm2`.
