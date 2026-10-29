-- Fotos do feed não subiam: as regras do bucket "feed" chamam hs_tem_acesso(), mas o papel authenticated
-- não tinha permissão de executá-la (a regra falhava e o envio era recusado para todo mundo).
-- A função só diz se o próprio usuário logado tem acesso; liberar a execução é seguro.
grant execute on function public.hs_tem_acesso() to authenticated;
