# WHATSAPP-BOT BORUTO SERVER

Această aplicație permite trimiterea automată de mesaje pe WhatsApp folosind fișiere de credențiale personale `creds.json`.

## Funcționalități

- Încărcarea fișierului creds.json pentru autentificare (fără scanare de cod QR)
- Trimiterea automată de mesaje către numere sau grupuri specificate
- Suport pentru mesaje multiple (din fișier text sau direct în interfață)
- Monitorizarea sesiunii active (număr de mesaje trimise, stare)
- Interfață simplă și intuitivă

## Cerințe de instalare

Aplicația rulează pe Node.js și necesită următoarele biblioteci:

- Express
- Multer
- whatsapp-web.js
- Puppeteer

## Mod de utilizare

1. Deschideți aplicația în browser
2. Încărcați fișierul creds.json personal
3. Introduceți numărul dumneavoastră de telefon
4. Introduceți numerele de telefon sau ID-urile grupurilor țintă (separate prin virgulă)
5. Opțional: Încărcați un fișier text cu mesajele de trimis
6. Apăsați butonul "Start" pentru a începe trimiterea de mesaje
7. Monitorizați activitatea în secțiunea "Jurnal activitate"
8. Pentru a opri trimiterea, apăsați butonul "Stop"

## Note importante

- Fișierul creds.json trebuie să fie unul valid, obținut dintr-o sesiune anterioară WhatsApp Web
- Aplicația nu necesită scanarea unui cod QR, folosește direct sesiunea salvată
- Numerele de telefon pentru ținte trebuie introduse în format internațional (fără "+" la început)
- Pentru deploy pe Render, utilizați setările standard pentru Node.js