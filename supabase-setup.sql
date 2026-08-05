-- ==========================================================
--  TABELAS DO ALVORADA FOOD NO SUPABASE
--  Cole isso no SQL Editor do Supabase e clique em "Run".
-- ==========================================================

-- Pedidos (substitui o pedidos.json)
create table if not exists pedidos (
  id text primary key,
  status text not null default 'recebido',
  data_hora_iso timestamptz not null default now(),
  cliente text,
  nome text,
  itens jsonb not null default '[]',
  tipo_entrega text,
  bairro text,
  complemento text,
  endereco_detalhado text,
  forma_pagamento text,
  troco_para numeric,
  subtotal numeric,
  taxa_entrega numeric,
  total numeric,
  origem text
);

-- Pausa geral do bot (substitui o pausa.json) — sempre 1 linha só, id fixo = 1
create table if not exists pausa (
  id smallint primary key default 1,
  pausado boolean not null default false,
  mensagem text not null default '🙏 No momento não estamos aceitando pedidos por aqui.'
);
insert into pausa (id, pausado) values (1, false) on conflict (id) do nothing;

-- Pausa individual por conversa (substitui o pausaIndividual.json)
create table if not exists pausa_individual (
  numero text primary key
);

-- ==========================================================
--  PRODUTOS (cardápio + estoque num lugar só)
--  Edite aqui pra: adicionar item, mudar preço, mudar estoque,
--  ou desativar um item (ativo = false) sem precisar apagar.
-- ==========================================================
create table if not exists produtos (
  id integer primary key,
  nome text not null,
  categoria text not null,
  preco numeric not null,
  estoque numeric not null default 0,   -- quantidade disponível agora
  unidade text not null default 'un',   -- ex: "un", "kg", "L", "porção"
  descricao text,                       -- opcional, aparece no card do site
  ativo boolean not null default true   -- false = não aparece no site
);

insert into produtos (id, nome, categoria, preco, estoque, unidade, descricao, ativo) values
  (1, 'Dogão Completo', 'Lanches', 15.00, 30, 'un', 'Pão, salsicha, molho da casa, milho, batata palha e temperos.', true),
  (2, 'Macarronada', 'Lanches', 20.00, 20, 'un', 'Porção generosa, do jeito que a casa faz.', true),
  (3, 'Refrigerante Coca-Cola (lata)', 'Bebidas', 5.00, 50, 'un', 'Geladinha, 350ml.', true),
  (4, 'Refrigerante Guaraná (200 ml)', 'Bebidas', 2.00, 50, 'un', 'Porção individual, geladinha.', true)
on conflict (id) do nothing;

-- ==========================================================
--  HORÁRIO DE FUNCIONAMENTO
--  aberto = false -> fechado o dia inteiro (ex: domingo)
--  abre/fecha em formato 24h (ex: 18:00, 23:00)
-- ==========================================================
create table if not exists horario_funcionamento (
  dia_semana smallint primary key, -- 0=domingo, 1=segunda ... 6=sábado
  aberto boolean not null default true,
  abre time,
  fecha time
);

insert into horario_funcionamento (dia_semana, aberto, abre, fecha) values
  (0, false, null, null),
  (1, true, '18:00', '23:00'),
  (2, true, '18:00', '23:00'),
  (3, true, '18:00', '23:00'),
  (4, true, '18:00', '23:00'),
  (5, true, '18:00', '23:59'),
  (6, true, '18:00', '23:59')
on conflict (dia_semana) do nothing;

-- ==========================================================
--  BAIRROS DE ENTREGA + TAXAS
--  Edite aqui pra adicionar bairro, mudar taxa, ou marcar se
--  precisa perguntar bloco/apartamento (ex: condomínios).
-- ==========================================================
create table if not exists bairros (
  id integer primary key,
  nome text not null,
  taxa numeric not null default 0,
  precisa_complemento boolean not null default false,
  ativo boolean not null default true
);

insert into bairros (id, nome, taxa, precisa_complemento, ativo) values
  (1, 'São Raimundo', 5.00, false, true),
  (2, 'São Cristovão', 5.00, false, true),
  (3, 'Santa Barbara', 3.00, false, true),
  (4, 'Alvorada 1', 3.00, true, true),
  (5, 'Alvorada 2', 0.00, true, true)
on conflict (id) do nothing;

-- Configuração geral de entrega (taxa pra bairros fora da lista, frete grátis).
-- Sempre 1 linha só, id fixo = 1.
create table if not exists config_entrega (
  id smallint primary key default 1,
  taxa_padrao numeric not null default 7.00,
  frete_gratis_acima_de numeric
);
insert into config_entrega (id, taxa_padrao, frete_gratis_acima_de)
  values (1, 7.00, 100.00)
  on conflict (id) do nothing;
