robenie APK: „Keď zmením kód → vždy npm run build → vždy npx cap sync android → až potom Android build.“



2️⃣ ZMENA VERZIE (POVINNÉ)

V súbore package.json vždy zvýš verziu:

"version": "1.0.1"


📌 Bez zmeny verzie auto-updater update nenájde.

3️⃣ ULOŽENIE ZMIEN DO GITHUBU (GIT BASH)

Otvor Git Bash v priečinku projektu
a zadaj príkazy PO JEDNOM:

git add .

git commit -m "Release 1.0.1"

git push


➡️ Týmto je nový kód uložený na GitHube.

4️⃣ BUILD APLIKÁCIE (VYROBENIE UPDATE)

V tom istom priečinku spusti:

npm run dist


Tento príkaz:

zabalí React + Electron

vytvorí inštalačné súbory

uloží ich do priečinka:

dist/


Typicky tam vznikne:

.exe (inštalátor)

latest.yml

.blockmap

⚠️ Všetky tieto súbory sú nutné pre update.

5️⃣ GITHUB RELEASE (SPUSTENIE UPDATE)
Otvor:
https://github.com/javorcikivan1-ux/mojastavba-app

Postup:

Vpravo klikni Releases → Create a new release

Vyplň:

Tag version:

v1.0.1


(vyber „Create new tag on publish“)

Target:

main


Release title:

v1.0.1 – Update


Description (ľubovoľné):

Aktualizácia aplikácie MojaStavba.


Do sekcie Assets nahraj VŠETKY súbory z dist/

Klikni Publish release

✅ HOTOVO – ČO TO ZNAMENÁ

Release existuje

updater vidí latest.yml

aplikácia vie, že existuje nová verzia

Používateľ po otvorení aplikácie:

dostane hlásenie o update

klikne „Aktualizovať“

aplikácia sa sama aktualizuje

🧪 TEST UPDATE

Spusti aplikáciu

Otvor sekciu Aktualizácie

Skontroluj:

Aktuálna verzia: 1.0.1

❗ DÔLEŽITÉ UPOZORNENIA

❌ nikdy nemaž staré releases

❌ nikdy nemeníš GitHub repo

❌ build bez Release = žiadny update

✅ verzia v package.json MUSÍ sedieť s tagom (v1.0.1)