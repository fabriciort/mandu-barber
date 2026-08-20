-- A barbearia se chama "mr. mandu" — o nome anterior era um palpite nosso,
-- feito antes de ver a marca. So renomeia se o valor ainda for aquele palpite:
-- se a barbearia ja tiver ajustado o nome pelo painel, respeita a escolha dela.

UPDATE "ShopSettings" SET "name" = 'mr. mandu' WHERE "name" = 'Mandu Barber';
