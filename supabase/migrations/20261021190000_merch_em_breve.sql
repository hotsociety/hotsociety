-- Moletom e boné ainda não estão à venda: aparecem com cadeado ("Em breve") e o resgate fica bloqueado no banco.
-- Para liberar depois: update public.loja_itens set ativo = true where id in ('mo','bn');
update public.loja_itens set ativo = false where id in ('mo', 'bn');
