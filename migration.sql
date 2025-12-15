-- Companies Tablosu Güncellemeleri
ALTER TABLE companies RENAME COLUMN phone TO phone1;
ALTER TABLE companies RENAME COLUMN email TO email1;

ALTER TABLE companies ADD COLUMN phone1_type text DEFAULT 'cep';
ALTER TABLE companies ADD COLUMN phone2 text;
ALTER TABLE companies ADD COLUMN phone2_type text;
ALTER TABLE companies ADD COLUMN phone3 text;
ALTER TABLE companies ADD COLUMN phone3_type text;
ALTER TABLE companies ADD COLUMN email2 text;

-- Persons Tablosu Güncellemeleri
ALTER TABLE persons RENAME COLUMN phone TO phone1;
ALTER TABLE persons RENAME COLUMN email TO email1;

ALTER TABLE persons ADD COLUMN phone1_type text DEFAULT 'cep';
ALTER TABLE persons ADD COLUMN phone2 text;
ALTER TABLE persons ADD COLUMN phone2_type text;
ALTER TABLE persons ADD COLUMN phone3 text;
ALTER TABLE persons ADD COLUMN phone3_type text;
ALTER TABLE persons ADD COLUMN email2 text;
