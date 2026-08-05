-- ==========================================================
--  SETUP COMPLETO — ALVORADA FOOD (Supabase)
--  Pode rodar isso inteiro num projeto novo do zero, ou por
--  cima de um projeto que já tem os dados — não duplica nada
--  nem apaga pedidos/produtos que já existem (só os horários
--  são sempre resetados, porque são poucos e fáceis de reescrever).
-- ==========================================================

-- Pedidos
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

-- Pausa geral do bot — sempre 1 linha só, id fixo = 1
create table if not exists pausa (
  id smallint primary key default 1,
  pausado boolean not null default false,
  mensagem text not null default '🙏 No momento não estamos aceitando pedidos por aqui.'
);
insert into pausa (id, pausado) values (1, false) on conflict (id) do nothing;

-- Pausa individual por conversa
create table if not exists pausa_individual (
  numero text primary key
);

-- ==========================================================
--  PRODUTOS (cardápio + estoque)
-- ==========================================================
create table if not exists produtos (
  id integer primary key,
  nome text not null,
  categoria text not null,
  preco numeric not null,
  estoque numeric not null default 0,
  unidade text not null default 'un',
  descricao text,
  ativo boolean not null default true
);

insert into produtos (id, nome, categoria, preco, estoque, unidade, descricao, ativo) values
  (1, 'Dogão Completo', 'Lanches', 15.00, 30, 'un', 'Pão, salsicha, molho da casa, milho, ervilha, batata palha e salada.', true),
  (2, 'Macarronada', 'Lanches', 20.00, 20, 'un', 'Calabresa, ovo, queijo ralado, milho, ervilha e batata palha.', true),
  (3, 'Refrigerante Coca-Cola (lata)', 'Bebidas', 5.00, 10, 'un', 'Geladinha, 350ml.', true),
  (4, 'Refrigerante Guaraná (200 ml)', 'Bebidas', 2.00, 10, 'un', 'Porção individual, geladinha.', false),
  (5, 'Refrigerante Coca-Cola Zero (lata)', 'Bebidas', 5.00, 10, 'un', 'Geladinha, 350ml.', true)
on conflict (id) do nothing;

-- ==========================================================
--  HORÁRIO DE FUNCIONAMENTO
--  aberto = false -> fechado o dia inteiro
-- ==========================================================
create table if not exists horario_funcionamento (
  dia_semana smallint primary key, -- 0=domingo, 1=segunda ... 6=sábado
  aberto boolean not null default true,
  abre time,
  fecha time
);

delete from horario_funcionamento;

insert into horario_funcionamento (dia_semana, aberto, abre, fecha) values
  (0, true,  '18:00', '23:00'), -- domingo
  (1, false, null,    null),    -- segunda (fechado)
  (2, true,  '18:00', '23:59'), -- terça
  (3, false, null,    null),    -- quarta (fechado)
  (4, false, null,    null),    -- quinta (fechado)
  (5, true,  '18:00', '23:00'), -- sexta
  (6, true,  '18:00', '23:00'); -- sábado

-- ==========================================================
--  BAIRROS DE ENTREGA + TAXAS
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

-- Configuração geral de entrega (taxa pra bairros fora da lista, frete grátis)
create table if not exists config_entrega (
  id smallint primary key default 1,
  taxa_padrao numeric not null default 7.00,
  frete_gratis_acima_de numeric
);
insert into config_entrega (id, taxa_padrao, frete_gratis_acima_de)
  values (1, 7.00, 100.00)
  on conflict (id) do nothing;

-- Confere tudo:
select * from produtos order by categoria, id;
select * from horario_funcionamento order by dia_semana;
select * from bairros order by id;
select * from config_entrega;
