-- Import Representatives from Excel

INSERT INTO users (first_name, last_name, email, role)
SELECT 'Hatice', 'Dinç', 'hatice.dinc@smartys.com', 'representative'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'hatice.dinc@smartys.com');
INSERT INTO users (first_name, last_name, email, role)
SELECT 'Günay', 'Çağrı Tuzak', 'gunay.cagrituzak@smartys.com', 'representative'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'gunay.cagrituzak@smartys.com');
INSERT INTO users (first_name, last_name, email, role)
SELECT 'Büşra', 'Onak', 'busra.onak@smartys.com', 'representative'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'busra.onak@smartys.com');
INSERT INTO users (first_name, last_name, email, role)
SELECT 'Funda', 'Varlı Tuzak', 'funda.varlituzak@smartys.com', 'representative'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'funda.varlituzak@smartys.com');
INSERT INTO users (first_name, last_name, email, role)
SELECT 'Tuğba', 'Çayır', 'tugba.cayir@smartys.com', 'representative'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'tugba.cayir@smartys.com');
INSERT INTO users (first_name, last_name, email, role)
SELECT 'Pelin', 'Kılıç', 'pelin.kilic@smartys.com', 'representative'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'pelin.kilic@smartys.com');
INSERT INTO users (first_name, last_name, email, role)
SELECT 'Yağmur', 'Aydın', 'yagmur.aydin@smartys.com', 'representative'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'yagmur.aydin@smartys.com');
INSERT INTO users (first_name, last_name, email, role)
SELECT 'Fatma', 'Esra Kaya', 'fatma.esrakaya@smartys.com', 'representative'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'fatma.esrakaya@smartys.com');
