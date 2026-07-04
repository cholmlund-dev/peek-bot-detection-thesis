# Katt och Råtta i Webbläsaren
**Avvägningen mellan bot-detektion och användarens personliga integritet**

🔗 **[Läs hela examensarbetet på DiVA Portal](http://www.diva-portal.org/smash/record.jsf?pid=diva2:2082795)**

Detta repository innehåller den praktiska prototypen och testmiljön för examensarbetet med ovanstående titel, skapat av **Jakob Fransson** och **Carl Holmlund**. 

Syftet med koden är att demonstrera den iterativa "katt-och-råtta"-leken mellan bot-detektionssystem (CAPTCHA) och automatiserade skript (bottar). Genom tre versioner (V1, V2 och V3) illustreras hur beteendebaserad analys och teknisk profilering kan användas för att identifiera bottar, samt hur dessa detektionsmekanismer kan kringgås av en anpassningsbar angripare.

## Abstract
Automated bots represent an increasing threat to web security, leading to an ongoing arms race with CAPTCHA technologies. As traditional interactive challenges become more susceptible to machine learning and negatively impact user experience, there is a shift toward invisible authentication methods based on behavioral biometrics and technical profiling. At the same time, this extensive collection of background data introduces a fundamental tension between security and user privacy.

This thesis examines both the effectiveness of modern CAPTCHA systems and their implications for privacy. Using methodological triangulation, the study integrates an iterative technical experiment with a quantitative user survey. The experiment assessed three system versions against modified bots: V1 (static rules and honeypots), V2 (behavioral biometrics), and V3 (technical fingerprinting).

The technical findings show that superficial behavioral patterns (V2) can be bypassed with relative ease. Effective detection (V3) instead depends on in-depth analysis of the user’s hardware and network characteristics. At the same time, the survey highlights a user paradox: although traditional CAPTCHAs are perceived as frustrating, users are highly critical of the technical profiling used in modern approaches. Background data collection is often viewed as intrusive, and respondents express concern about “function creep”, where data gathered for security purposes is later used for commercial profiling.
  
The study concludes that verifying a “human” user has moved from explicit interaction toward passive technical identification. As a result, the most accurate detection methods are also those perceived as most intrusive. Addressing this trade-off requires context-aware authentication, where the extent of data collection is adjusted based on the specific security requirements of a service.


## Projektstruktur

Projektet är uppdelat i tre iterationer. Varje version innehåller en fristående Node/Express-server med detektionslogik, en webb-frontend för registrering, samt ett Puppeteer-skript som agerar angripare (bot).

* **V1peek (Grundläggande Analys):** 
  Testar tidsåtgång, `navigator.webdriver`-flaggor och honeypot-fält. En naiv bot demonstrerar hur snabbt grundläggande skydd kan forceras.
* **V2peek (Interaktionsanalys):** 
  Servern utökas med beteendebiometri som analyserar musrörelsernas varians och scroll-mönster. Boten uppgraderas för att efterlikna mänskligt beteende med hjälp av Bézier-kurvor och dynamisk scrollhastighet.
* **V3peek (Teknisk Profilering & Nätverksanalys):** 
  Det slutgiltiga försvaret. Istället för att lita på beteende granskar servern webbläsarens integritet genom att mäta hårdvarukapacitet (CPU/RAM), renderingstider (Canvas/Audio) och IP-adressens geografiska/nätverksmässiga ursprung.


## Hur man kör koden

### Förkrav
För att köra koden lokalt behöver du [Node.js](https://nodejs.org/) installerat på din maskin.

### Installation & Körning
Varje version körs helt fristående från de andra. För att testa ett scenario (till exempel V3), följ dessa steg:

1. **Navigera till rätt mapp i en terminal:**
   ```bash
   cd V1peek/captcha-app
   ```

2. **Installera beroenden**:
   ```bash
   npm install
   ```

3. **Starta CAPTCHA-servern:**
   ```bash
   node server.js
   ```
   Servern startar nu och lyssnar på `http://localhost:3000`. Du kan själv öppna länken i din webbläsare och fylla i formuläret för att se hur systemet bedömer en verklig människa.

4. **Starta Boten (Angriparen):**
   Öppna en *ny* terminalflik, navigera till samma mapp och kör test-skriptet:
   ```bash
   node puppeteer.js
   ```
   Detta kommer att starta en automatiserad webbläsare som försöker ta sig förbi systemets skydd.

5. **Granska Resultatet:**
   När sessionen är slutförd, titta i terminalen där `server.js` körs. Systemet skriver ut en utförlig "SESSION ANALYSIS" som visar poängsättningen, vilka kontroller som triggades, och det slutgiltiga beslutet (HUMAN eller BOT DETECTED).

   
