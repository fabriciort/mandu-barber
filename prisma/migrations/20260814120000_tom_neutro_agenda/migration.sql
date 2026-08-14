-- Paleta da agenda passa a ser neutra (preto e branco).
-- Os tons antigos eram cores de marca; os novos ficam na faixa media do cinza,
-- a unica que enxerga bem tanto sobre fundo branco quanto sobre fundo preto.

ALTER TABLE "BarberProfile" ALTER COLUMN "agendaColor" SET DEFAULT '#5c5c63';

UPDATE "BarberProfile" SET "agendaColor" = '#3f3f45' WHERE "agendaColor" = '#c98b3a';
UPDATE "BarberProfile" SET "agendaColor" = '#7c7c83' WHERE "agendaColor" = '#7fa66a';
UPDATE "BarberProfile" SET "agendaColor" = '#a1a1a6' WHERE "agendaColor" = '#c96f4a';
UPDATE "BarberProfile" SET "agendaColor" = '#5c5c63' WHERE "agendaColor" = '#5f8a4c';
UPDATE "BarberProfile" SET "agendaColor" = '#8b8b91' WHERE "agendaColor" = '#8a5227';
UPDATE "BarberProfile" SET "agendaColor" = '#3f3f45' WHERE "agendaColor" = '#6b6058';
UPDATE "BarberProfile" SET "agendaColor" = '#a1a1a6' WHERE "agendaColor" = '#b45a37';
