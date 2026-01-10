postup:

1. zmen verziu v  package.json na vyssiu
2. npm run electron:build  (urobis .exe)
3. premenuj subor .exe na pomlcky! = appka sa  musi volat: MojaStavba-Setup-4.0.4. S BODKOU NA KONCI. (menis cislo podla package.json) a nasledne v gite v4.0.4 alebo vX.X.X
NEZABUDNI TAM NAHRAT AJ TIE DALSIE SUBORY Z PRIECNKA!!!!

5. Urob APK: npm run build
6. npx cap sync android
7. urob APK v Android Studio a premenuj APK na MojaStavba.apk
8. nahraj MojaStavba.apk a exe subor s ostatnými subormi na git ako release! 
9. nahraj MojaStavba.apk a MojaStavba.exe do druhého repoziata kvôli funkcnym download linkom

10. pushni na git pre vercel: TOTO ROB AKO POSLEDNE
push na git pre web: 
git add .
git commit -m "Aktualizácia MojaStavba"
git push




NEZABUDNI: zmenit build.gradle!!!!!!!!!!


KAMERA:
B. Povolenia (Permissions):
V metadata.json máš kameru. Pre App Store a Google Play musíš v kóde (plist a manifest) definovať textové zdôvodnenie, prečo tú kameru chceš (napr. "Potrebujeme prístup k fotoaparátu, aby ste mohli pridávať fotky k záznamom v denníku"). Ak to tam nebude, vyhodia ťa hneď v prvom kole.

robenie APK: „Keď zmením kód → vždy npm run build → vždy npx cap sync android → až potom Android build.“


exe: 
npm run build
npm run electron:build


push na git pre web: 
git add .
git commit -m "moja zmena"
git push


VERCEL_MOJASTAVBA AKTUALIZACIE!!!!!!!!!!!!!!
APK:

 ZHRNUTIE: Tvoj postup pre verziu X.X.X
Krok	Čo urobiť	Súbor / Miesto
1.	Zmeniť verziu na X.X.X	package.json
2.	Spustiť npm run build	Terminál
3.	Zazipovať priečinok dist	Súbor: MojaStavba.zip
4.	Spustiť npx cap sync android	Terminál
5.	Zmeniť versionCode 406 a versionName "X.X.X"	app/build.gradle (Android Studio)
6.	Vygenerovať APK	Android Studio
7.	Nahrať ZIP aj APK na GitHub	GitHub Releases (vX.X.X)
Dôležité upozornenie k ZIPovaniu:
Keď otvoria používatelia tvoj ZIP, nesmú tam vidieť priečinok dist. Musia tam vidieť priamo súbory index.html, assets/ atď.



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