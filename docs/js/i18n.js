// eschgi.com — the site in English, German and Italian.
//
// The pages and scripts are written in English, and the English is the key: every text on a page
// that a visitor reads is marked data-i18n (its content, as HTML) or data-i18n-attr="alt aria-label"
// (those attributes), and the scripts pass their words through eschgi.t("…"). STRINGS below gives
// the German and Italian for each. A reworded English text shows in English until it is translated
// again; scripts/check-i18n.mjs lists what is missing, what is no longer used and translations whose
// placeholders or markup differ from the English.
//
// The language is picked by an inline script in each page's head before anything is drawn: the one
// chosen here before, else the first of the browser's languages the site speaks, else English. A
// page that is to be in German or Italian stays hidden until this script has put it into that
// language. The switch in the header changes it at any time, in place: the page is translated again
// and the other scripts, told by an "eschgi:language" event, say their words again.
//
// A classic deferred script, like the others, and the first of them, so they can use eschgi.t() as
// they start. Each of them still speaks English without it.
(function () {
  "use strict";

  var LANGUAGES = ["en", "de", "it"];
  var LOCALES = { en: "en-US", de: "de-DE", it: "it-IT" };
  var STORAGE_KEY = "eschgi.lang";

  // ------------------------------------------------------------------ the words
  // English → German and Italian. Page text is keyed by its HTML with the white space collapsed, as
  // the browser gives it (& as &amp;, <br> without a slash). A text with forms by number, passed a
  // count, has them for English too: { one: …, other: … }.
  var STRINGS = {
    // ---- Both pages: head, header and footer
    "Stefan Eschgfäller — Software Engineer": { de: "Stefan Eschgfäller – Softwareentwickler", it: "Stefan Eschgfäller – Sviluppatore software" },
    "Stefan Eschgfäller, software engineer. Reliable software, end to end: backends on ASP.NET Core and PostgreSQL, and the desktop, web and mobile applications that use them — almost two decades of C#, C++ and Python.": {
      de: "Stefan Eschgfäller, Softwareentwickler. Zuverlässige Software, durch und durch: Backends mit ASP.NET Core und PostgreSQL und die Desktop-, Web- und Mobile-Anwendungen, die sie nutzen – fast zwei Jahrzehnte C#, C++ und Python.",
      it: "Stefan Eschgfäller, sviluppatore software. Software affidabile, da cima a fondo: backend con ASP.NET Core e PostgreSQL e le applicazioni desktop, web e mobile che li usano – quasi vent'anni di C#, C++ e Python.",
    },
    "Skip to content": { de: "Zum Inhalt springen", it: "Vai al contenuto" },
    "Main": { de: "Hauptmenü", it: "Menu principale" },
    "Work": { de: "Projekte", it: "Progetti" },
    "How I work": { de: "Arbeitsweise", it: "Come lavoro" },
    "Expertise": { de: "Kompetenzen", it: "Competenze" },
    "Activity": { de: "Aktivität", it: "Attività" },
    "Contact": { de: "Kontakt", it: "Contatti" },
    "Language": { de: "Sprache", it: "Lingua" },
    "Menu": { de: "Menü", it: "Menu" },
    "Hand-built, no trackers": { de: "Handgemacht, ohne Tracker", it: "Fatto a mano, senza tracker" },
    "Tech sphere": { de: "Tech-Kugel", it: "Sfera tech" },
    "Terminal": { de: "Terminal", it: "Terminale" },

    // ---- Front page: hero and facts
    "Software engineer · almost two decades of C#, C++ and Python": {
      de: "Softwareentwickler · fast zwei Jahrzehnte C#, C++ und Python",
      it: "Sviluppatore software · quasi vent'anni di C#, C++ e Python",
    },
    "Reliable software,<br> end to end.": { de: "Zuverlässige Software,<br> durch und durch.", it: "Software affidabile,<br> da cima a fondo." },
    "Backends on ASP.NET Core and PostgreSQL, and the applications that use them: desktop with Qt, web with React, mobile with Flutter. I work with AI coding agents; the architecture and the review stay with me.": {
      de: "Backends mit ASP.NET Core und PostgreSQL und die Anwendungen, die sie nutzen: Desktop mit Qt, Web mit React, Mobile mit Flutter. Ich arbeite mit KI-Coding-Agenten; Architektur und Review bleiben bei mir.",
      it: "Backend con ASP.NET Core e PostgreSQL e le applicazioni che li usano: desktop con Qt, web con React, mobile con Flutter. Lavoro con agenti di programmazione IA; l'architettura e la revisione restano compito mio.",
    },
    "Selected work": { de: "Ausgewählte Projekte", it: "Progetti selezionati" },
    "Portrait of Stefan Eschgfäller": { de: "Porträt von Stefan Eschgfäller", it: "Ritratto di Stefan Eschgfäller" },
    "of production software": { de: "Software im Produktiveinsatz", it: "di software in produzione" },
    "~20 years": { de: "~20 Jahre", it: "~20 anni" },
    "primary languages": { de: "Hauptsprachen", it: "linguaggi principali" },
    "one at work, two in my free time": { de: "eines bei der Arbeit, zwei in meiner Freizeit", it: "uno al lavoro, due nel tempo libero" },
    "3 products": { de: "3 Produkte", it: "3 prodotti" },
    "GitHub contributions, last 12 months": { de: "GitHub-Beiträge der letzten 12 Monate", it: "contributi su GitHub negli ultimi 12 mesi" },

    // ---- Front page: work
    "At work, and in my free time.": { de: "Bei der Arbeit und in meiner Freizeit.", it: "Al lavoro e nel tempo libero." },
    "foodProcess is what I build at work. The self-hosted trading software, kept private, and Share, an open-source app for sharing photos, are my own projects, built in my free time.": {
      de: "foodProcess entwickle ich bei der Arbeit. Die selbst gehostete Trading-Software, die privat bleibt, und Share, eine Open-Source-App zum Teilen von Fotos, sind eigene Projekte, entstanden in meiner Freizeit.",
      it: "foodProcess è ciò che sviluppo al lavoro. Il software di trading self-hosted, che resta privato, e Share, un'app open source per condividere foto, sono progetti miei, nati nel tempo libero.",
    },
    "At work": { de: "Bei der Arbeit", it: "Al lavoro" },
    "In my free time": { de: "In meiner Freizeit", it: "Nel tempo libero" },
    "Built with": { de: "Gebaut mit", it: "Realizzato con" },

    // foodProcess, and the scale beside it (also js/scale.js)
    "Production software for food packing. Its main goal is to reduce giveaway: the extra product packed above the weight on the label. It connects to the scales that weigh punnets of strawberries, blueberries, tomatoes and more, sends orders from the ERP to the packing lines, monitors and controls the lines in real time, and records every batch from goods receipt to dispatch.": {
      de: "Produktionssoftware für das Verpacken von Lebensmitteln. Ihr wichtigstes Ziel ist, die Überfüllung zu senken: das Produkt, das über das Gewicht auf dem Etikett hinaus verpackt wird. Sie bindet die Waagen an, die Schalen mit Erdbeeren, Heidelbeeren, Tomaten und mehr wiegen, schickt Aufträge aus dem ERP an die Packlinien, überwacht und steuert die Linien in Echtzeit und erfasst jede Charge vom Wareneingang bis zum Versand.",
      it: "Software di produzione per il confezionamento alimentare. Il suo obiettivo principale è ridurre il sovrappeso: il prodotto in più confezionato oltre il peso indicato in etichetta. Si collega alle bilance che pesano le vaschette di fragole, mirtilli, pomodori e altro ancora, invia gli ordini dall'ERP alle linee di confezionamento, monitora e controlla le linee in tempo reale e registra ogni lotto dal ricevimento merci alla spedizione.",
    },
    "the main goal: less of it": { de: "das Hauptziel: weniger davon", it: "l'obiettivo principale: ridurlo" },
    "Giveaway": { de: "Überfüllung", it: "Sovrappeso" },
    "weighing every punnet": { de: "wiegen jede Schale", it: "pesano ogni vaschetta" },
    "Scales": { de: "Waagen", it: "Bilance" },
    "per order, line and user": { de: "pro Auftrag, Linie und Benutzer", it: "per ordine, linea e utente" },
    "KPIs": { de: "KPIs", it: "KPI" },
    "Product page": { de: "Produktseite", it: "Pagina del prodotto" },
    "Try the scale": { de: "Probier die Waage aus", it: "Prova la bilancia" },
    "Net": { de: "Netto", it: "Netto" },
    "STABLE": { de: "STABIL", it: "STABILE" },
    "Fruit": { de: "Produkt", it: "Prodotto" },
    "Blueberries": { de: "Heidelbeeren", it: "Mirtilli" },
    "Strawberries": { de: "Erdbeeren", it: "Fragole" },
    "Tomatoes": { de: "Tomaten", it: "Pomodori" },
    // The fruit as a sentence names it: "a new best for strawberries".
    "blueberries": { de: "Heidelbeeren", it: "i mirtilli" },
    "strawberries": { de: "Erdbeeren", it: "le fragole" },
    "tomatoes": { de: "Tomaten", it: "i pomodori" },
    "giveaway": { de: "Überfüllung", it: "sovrappeso" },
    "punnets a minute": { de: "Schalen pro Minute", it: "vaschette al minuto" },
    "rejected": { de: "aussortiert", it: "scartate" },
    "Start packing": { de: "Packen starten", it: "Inizia a confezionare" },
    "Pack another order": { de: "Noch einen Auftrag packen", it: "Confeziona un altro ordine" },
    "Fill <small>hold</small>": { de: "Füllen <small>halten</small>", it: "Riempi <small>tieni premuto</small>" },
    "Take one out": { de: "Entnehmen", it: "Togline uno" },
    "Pack": { de: "Packen", it: "Confeziona" },
    "A mini game, not the product. On a real line every scale reports to foodProcess, which helps bring the giveaway down.": {
      de: "Ein Minispiel, nicht das Produkt. An einer echten Linie meldet jede Waage an foodProcess, das hilft, die Überfüllung zu senken.",
      it: "Un minigioco, non il prodotto. Su una linea vera ogni bilancia comunica con foodProcess, che aiuta a ridurre il sovrappeso.",
    },
    "Station 1": { de: "Station 1", it: "Postazione 1" },
    "Operator: you": { de: "Bediener: du", it: "Operatore: tu" },
    "Goal: least giveaway": { de: "Ziel: möglichst wenig Überfüllung", it: "Obiettivo: meno sovrappeso possibile" },
    "Best: {share} % giveaway": { de: "Bestwert: {share} % Überfüllung", it: "Record: {share} % di sovrappeso" },
    "Punnet {number} of {total} · {giveaway} g giveaway": {
      de: "Schale {number} von {total} · {giveaway} g Überfüllung",
      it: "Vaschetta {number} di {total} · {giveaway} g di sovrappeso",
    },
    "Order done": { de: "Auftrag fertig", it: "Ordine completato" },
    "Fill five punnets to at least their target weight. Every gram above it is giveaway, so keep it as low as you can.": {
      de: "Fülle fünf Schalen mindestens bis zu ihrem Sollgewicht. Jedes Gramm darüber ist Überfüllung, halte sie also so gering wie möglich.",
      it: "Riempi cinque vaschette almeno fino al loro peso nominale. Ogni grammo in più è sovrappeso: tienilo più basso che puoi.",
    },
    "Hold Fill to pour, tap it for a single piece. Pack once the reading settles.": {
      de: "Halte Füllen gedrückt zum Einfüllen; einmal tippen gibt ein einzelnes Stück. Tippe auf Packen, sobald die Anzeige ruhig steht.",
      it: "Tieni premuto Riempi per versare, toccalo per un pezzo solo. Premi Confeziona quando la lettura si stabilizza.",
    },
    "{weight} g of {target} g.": { de: "{weight} g von {target} g.", it: "{weight} g su {target} g." },
    "The punnet is full. Take some out, or pack it.": {
      de: "Die Schale ist voll. Nimm etwas heraus oder pack sie.",
      it: "La vaschetta è piena. Togline un po' o confezionala.",
    },
    "Took out {weight} g.": { de: "{weight} g entnommen.", it: "Tolti {weight} g." },
    "Packed {net} g: {extra} g giveaway ({share} %).": {
      de: "{net} g verpackt: {extra} g Überfüllung ({share} %).",
      it: "Confezionati {net} g: {extra} g di sovrappeso ({share} %).",
    },
    "Rejected: {grams} g under. Short punnets can't be sold.": {
      de: "Aussortiert: {grams} g zu wenig. Untergewichtige Schalen sind unverkäuflich.",
      it: "Scartata: {grams} g in meno. Le vaschette sottopeso non si possono vendere.",
    },
    "Order packed with {share} % giveaway: a new best for {fruit}.": {
      de: "Auftrag verpackt mit {share} % Überfüllung: neuer Bestwert für {fruit}.",
      it: "Ordine confezionato, sovrappeso {share} %: nuovo record per {fruit}.",
    },
    "Order packed with {share} % giveaway. Now try to get it lower.": {
      de: "Auftrag verpackt mit {share} % Überfüllung. Jetzt versuch, sie zu senken.",
      it: "Ordine confezionato, sovrappeso {share} %. Ora prova ad abbassarlo.",
    },
    "Order done, with {count} rejected. Underweight costs more than giveaway.": {
      en: {
        one: "Order done, with {count} rejected. Underweight costs more than giveaway.",
        other: "Order done, with {count} rejected. Underweight costs more than giveaway.",
      },
      de: {
        one: "Auftrag fertig, {count} Schale aussortiert. Untergewicht kostet mehr als Überfüllung.",
        other: "Auftrag fertig, {count} Schalen aussortiert. Untergewicht kostet mehr als Überfüllung.",
      },
      it: {
        one: "Ordine completato, con {count} vaschetta scartata. Il sottopeso costa più del sovrappeso.",
        other: "Ordine completato, con {count} vaschette scartate. Il sottopeso costa più del sovrappeso.",
      },
    },
    "Order packed. Your best for {fruit}: {share} % giveaway.": {
      de: "Auftrag verpackt. Dein Bestwert für {fruit}: {share} % Überfüllung.",
      it: "Ordine confezionato. Il tuo record per {fruit}: {share} % di sovrappeso.",
    },

    // The trading software, and the backtest beside it (also js/backtest.js)
    "private, in development": { de: "privat, in Entwicklung", it: "privato, in sviluppo" },
    "Self-hosted trading software": { de: "Selbst gehostete Trading-Software", it: "Software di trading self-hosted" },
    "Automated trading agents for crypto, stocks and forex that run on a server of your own — each with its own capital and strategy, and each explaining what it does and why. Strategies are backtested against holding everything and against a random control before they get money.": {
      de: "Automatisierte Trading-Agenten für Krypto, Aktien und Forex, die auf einem eigenen Server laufen – jeder mit eigenem Kapital und eigener Strategie, und jeder erklärt, was er tut und warum. Bevor Strategien Geld bekommen, laufen sie im Backtest gegen reines Halten und gegen eine Zufallsstrategie.",
      it: "Agenti di trading automatici per cripto, azioni e forex che girano su un proprio server: ognuno con il suo capitale e la sua strategia, e ognuno spiega cosa fa e perché. Prima di ricevere denaro, le strategie vengono messe alla prova in un backtest contro «tenere tutto» e contro una strategia casuale.",
    },
    "connectors": { de: "Konnektoren", it: "connettori" },
    "client apps": { de: "Client-Apps", it: "app client" },
    "plugin SDKs": { de: "Plugin-SDKs", it: "SDK per plugin" },
    "Hold everything": { de: "Alles halten", it: "Tenere tutto" },
    "Random control": { de: "Zufallsstrategie", it: "Strategia casuale" },
    "Market": { de: "Markt", it: "Mercato" },
    "Crypto": { de: "Krypto", it: "Cripto" },
    "volatile": { de: "volatil", it: "volatile" },
    "Stock": { de: "Aktie", it: "Azione" },
    "trending": { de: "im Trend", it: "in tendenza" },
    "ranging": { de: "seitwärts", it: "laterale" },
    "your return": { de: "deine Rendite", it: "il tuo rendimento" },
    "hold everything": { de: "alles halten", it: "tenere tutto" },
    "random control": { de: "Zufallsstrategie", it: "strategia casuale" },
    "Start a backtest": { de: "Backtest starten", it: "Avvia un backtest" },
    "Run another backtest": { de: "Weiteren Backtest starten", it: "Avvia un altro backtest" },
    "Buy": { de: "Kaufen", it: "Compra" },
    "Sell": { de: "Verkaufen", it: "Vendi" },
    "Next day <small>hold</small>": { de: "Nächster Tag <small>halten</small>", it: "Giorno dopo <small>tieni premuto</small>" },
    "A mini game with demo data, not the software itself.": {
      de: "Ein Minispiel mit Demodaten, nicht die Software selbst.",
      it: "Un minigioco con dati demo, non il software vero e proprio.",
    },
    "Backtest: a strategy against its opponents": { de: "Backtest: eine Strategie gegen ihre Gegner", it: "Backtest: una strategia contro i suoi avversari" },
    "Backtest: you against two opponents": { de: "Backtest: du gegen zwei Gegner", it: "Backtest: tu contro due avversari" },
    "Strategy": { de: "Strategie", it: "Strategia" },
    "You": { de: "Du", it: "Tu" },
    "history": { de: "Historie", it: "storico" },
    "Goal: beat both opponents": { de: "Ziel: beide Gegner schlagen", it: "Obiettivo: battere entrambi gli avversari" },
    "Best: {points} points ahead": { de: "Bestwert: {points} Punkte Vorsprung", it: "Record: {points} punti di vantaggio" },
    "Day {day} of {total}": { de: "Tag {day} von {total}", it: "Giorno {day} di {total}" },
    "{count} trades, {days} days": {
      en: { one: "{count} trade, {days} days", other: "{count} trades, {days} days" },
      de: { one: "{count} Trade, {days} Tage", other: "{count} Trades, {days} Tage" },
      it: { one: "{count} operazione, {days} giorni", other: "{count} operazioni, {days} giorni" },
    },
    "Trade a demo market for 60 days. Make money and beat holding everything and a random control, and your strategy would get money. Each trade costs 0.1 %.": {
      de: "Handle 60 Tage lang an einem Demo-Markt. Mach Gewinn und schlag reines Halten und eine Zufallsstrategie, dann bekäme deine Strategie Geld. Jeder Trade kostet 0,1 %.",
      it: "Fai trading su un mercato demo per 60 giorni. Guadagna e fai meglio sia di tenere tutto sia di una strategia casuale, e la tua strategia riceverebbe denaro. Ogni operazione costa lo 0,1 %.",
    },
    "30 days of history are on the chart. Tap Next day to move on a day, or hold it to let the days run. Buy and sell trade at the latest close.": {
      de: "Auf dem Chart sind 30 Tage Historie. Tippe auf Nächster Tag, um einen Tag weiterzugehen, oder halte die Taste gedrückt, damit die Tage laufen. Kaufen und Verkaufen handeln zum letzten Schlusskurs.",
      it: "Sul grafico ci sono 30 giorni di storico. Tocca Giorno dopo per avanzare di un giorno, o tienilo premuto per far scorrere i giorni. Compra e Vendi operano all'ultimo prezzo di chiusura.",
    },
    "Bought at the close of day {day}. You're in the market.": {
      de: "Gekauft zum Schlusskurs von Tag {day}. Du bist investiert.",
      it: "Comprato alla chiusura del giorno {day}. Ora sei nel mercato.",
    },
    "Sold at the close of day {day}: {change} on that trade, after fees.": {
      de: "Verkauft zum Schlusskurs von Tag {day}: {change} mit diesem Trade, nach Gebühren.",
      it: "Venduto alla chiusura del giorno {day}: {change} su questa operazione, al netto delle commissioni.",
    },
    "You made {result}, beating holding everything and the random control. This strategy would get money.": {
      de: "Du hast {result} gemacht und reines Halten und die Zufallsstrategie geschlagen. Diese Strategie würde Geld bekommen.",
      it: "Hai fatto {result}, meglio di tenere tutto e della strategia casuale. Questa strategia riceverebbe denaro.",
    },
    "A new best: {points} points ahead.": { de: "Neuer Bestwert: {points} Punkte Vorsprung.", it: "Nuovo record: {points} punti di vantaggio." },
    "You beat both opponents but still lost money ({result}). A strategy has to make money too. No money yet.": {
      de: "Du hast beide Gegner geschlagen, aber trotzdem Geld verloren ({result}). Eine Strategie muss auch Gewinn machen. Noch kein Geld.",
      it: "Hai battuto entrambi gli avversari, ma hai comunque perso denaro ({result}). Una strategia deve anche guadagnare. Niente denaro, per ora.",
    },
    "Better than the random control, but holding everything did better. No money yet.": {
      de: "Besser als die Zufallsstrategie, aber reines Halten war besser. Noch kein Geld.",
      it: "Meglio della strategia casuale, ma tenere tutto ha reso di più. Niente denaro, per ora.",
    },
    "Better than holding everything, but no better than chance: the random control did as well. No money yet.": {
      de: "Besser als reines Halten, aber nicht besser als der Zufall: Die Zufallsstrategie war genauso gut. Noch kein Geld.",
      it: "Meglio di tenere tutto, ma non meglio del caso: la strategia casuale ha fatto altrettanto. Niente denaro, per ora.",
    },
    "Holding everything and the random control both did better. No money yet.": {
      de: "Reines Halten und die Zufallsstrategie waren beide besser. Noch kein Geld.",
      it: "Tenere tutto e la strategia casuale hanno fatto entrambi meglio. Niente denaro, per ora.",
    },
    "No trades, no strategy: holding cash made {result}. No money yet.": {
      de: "Keine Trades, keine Strategie: Bargeld halten brachte {result}. Noch kein Geld.",
      it: "Nessuna operazione, nessuna strategia: tenere la liquidità ha reso {result}. Niente denaro, per ora.",
    },

    // Share
    "open source": { de: "Open Source", it: "open source" },
    "built with AI, for myself": { de: "mit KI gebaut, für mich selbst", it: "creato con l'IA, per me stesso" },
    "A self-hosted place where family and friends drop photos, videos and documents: sending with a PIN and no account, folders with their own people, and end-to-end encryption per folder.": {
      de: "Ein selbst gehosteter Ort, an dem Familie und Freunde Fotos, Videos und Dokumente ablegen: Senden mit PIN und ohne Konto, Ordner mit jeweils eigenen Mitgliedern und Ende-zu-Ende-Verschlüsselung pro Ordner.",
      it: "Uno spazio self-hosted dove familiari e amici lasciano foto, video e documenti: invio con un PIN e senza account, cartelle con i propri membri e crittografia end-to-end per cartella.",
    },
    "server, one binary": { de: "Server, eine einzige Binärdatei", it: "server, un unico binario" },
    "Flutter app": { de: "Flutter-App", it: "app Flutter" },
    "per folder": { de: "pro Ordner", it: "per cartella" },
    "Source": { de: "Quellcode", it: "Codice sorgente" },
    "Latest release": { de: "Neuestes Release", it: "Ultima release" },
    // The folder names and the quoted words are what the screenshots show, in English.
    "Share's library on a computer: the folders Family, Wedding Anna & Marco, Kindergarten and Taxes 2026 beside the photos, grouped by day": {
      de: "Die Bibliothek von Share auf einem Computer: die Ordner Family, Wedding Anna & Marco, Kindergarten und Taxes 2026 neben den Fotos, nach Tagen gruppiert",
      it: "La libreria di Share su un computer: le cartelle Family, Wedding Anna & Marco, Kindergarten e Taxes 2026 accanto alle foto, raggruppate per giorno",
    },
    "Sending on a phone with a PIN: Send your files. Photos, videos, documents, anything. No app, no account.": {
      de: "Senden mit PIN auf einem Smartphone: „Send your files. Photos, videos, documents, anything. No app, no account.“",
      it: "Invio con un PIN da uno smartphone: «Send your files. Photos, videos, documents, anything. No app, no account.»",
    },

    // ---- Front page: how I work
    "Four habits, with or without AI.": { de: "Vier Gewohnheiten, mit oder ohne KI.", it: "Quattro abitudini, con o senza IA." },
    "Like most engineers today, I use AI to build new software and to extend existing codebases. Coding agents such as Claude Code work under written rules and hooks, tests decide when a change is done, and the merge stays with me.": {
      de: "Wie die meisten Entwickler heute nutze ich KI, um neue Software zu bauen und bestehende Codebasen zu erweitern. Coding-Agenten wie Claude Code arbeiten nach schriftlichen Regeln und Hooks, Tests entscheiden, wann eine Änderung fertig ist, und der Merge bleibt bei mir.",
      it: "Come la maggior parte degli sviluppatori oggi, uso l'IA per creare nuovo software e per estendere codebase esistenti. Agenti di programmazione come Claude Code lavorano secondo regole scritte e hook, i test decidono quando una modifica è finita, e il merge resta a me.",
    },
    "Readable first": { de: "Lesbarkeit zuerst", it: "Prima la leggibilità" },
    "Code is read far more often than it is written; names and structure come before cleverness.": {
      de: "Code wird viel öfter gelesen als geschrieben; Namen und Struktur gehen vor Raffinesse.",
      it: "Il codice si legge molto più spesso di quanto si scriva; nomi e struttura vengono prima dell'astuzia.",
    },
    "Tests define done": { de: "Tests definieren „fertig“", it: "Sono i test a dire «finito»" },
    "A change is finished when it builds without warnings and its tests pass — whoever, or whatever, typed it.": {
      de: "Eine Änderung ist fertig, wenn sie ohne Warnungen baut und ihre Tests bestehen – egal, wer oder was sie getippt hat.",
      it: "Una modifica è finita quando compila senza warning e i suoi test passano, chiunque (o qualunque cosa) l'abbia scritta.",
    },
    "Measure, then optimize": { de: "Erst messen, dann optimieren", it: "Prima misura, poi ottimizza" },
    "Profiles, traces and metrics beat guesses about where the time goes.": {
      de: "Profile, Traces und Metriken schlagen Vermutungen darüber, wo die Zeit bleibt.",
      it: "Profili, trace e metriche battono le ipotesi su dove se ne va il tempo.",
    },
    "AI with guardrails": { de: "KI mit Leitplanken", it: "IA con dei paletti" },
    "Agents draft and refactor under written rules and hooks; a human reviews the diff and merges.": {
      de: "Agenten entwerfen und refaktorieren nach schriftlichen Regeln und Hooks; ein Mensch prüft den Diff und merged.",
      it: "Gli agenti scrivono bozze e fanno refactoring secondo regole scritte e hook; una persona rivede il diff e fa il merge.",
    },

    // ---- Front page: expertise (the Lab's sphere and the terminal read these headings)
    "Languages and tools.": { de: "Sprachen und Werkzeuge.", it: "Linguaggi e strumenti." },
    "What I reach for, from the languages to the infrastructure around them.": {
      de: "Womit ich arbeite, von den Sprachen bis zur Infrastruktur drumherum.",
      it: "Ciò che uso, dai linguaggi all'infrastruttura che li circonda.",
    },
    "See them as a sphere": { de: "Als Kugel ansehen", it: "Guardali come sfera" },
    "Languages": { de: "Sprachen", it: "Linguaggi" },
    "Frameworks &amp; APIs": { de: "Frameworks &amp; APIs", it: "Framework e API" },
    "Databases": { de: "Datenbanken", it: "Database" },
    "DevOps &amp; observability": { de: "DevOps &amp; Observability", it: "DevOps e osservabilità" },
    "AI-assisted engineering": { de: "KI-gestützte Entwicklung", it: "Sviluppo assistito dall'IA" },

    // ---- Front page: activity (also js/site.js)
    "A year on GitHub.": { de: "Ein Jahr auf GitHub.", it: "Un anno su GitHub." },
    "Public and private contributions over the last twelve months, collected daily by a GitHub Action.": {
      de: "Öffentliche und private Beiträge der letzten zwölf Monate, täglich von einer GitHub Action gesammelt.",
      it: "Contributi pubblici e privati degli ultimi dodici mesi, raccolti ogni giorno da una GitHub Action.",
    },
    "contributions": { de: "Beiträge", it: "contributi" },
    "commits": { de: "Commits", it: "commit" },
    "pull requests": { de: "Pull Requests", it: "pull request" },
    "active days": { de: "aktive Tage", it: "giorni attivi" },
    "The numbers live on": { de: "Die Zahlen stehen auf", it: "I numeri sono su" },
    "Contributions per week, last 12 months": { de: "Beiträge pro Woche, letzte 12 Monate", it: "Contributi per settimana, ultimi 12 mesi" },
    // Italian puts no article before the date, which would have to change with it ("dell'8 nov").
    "Week of {date}: {count} contributions": {
      en: { one: "Week of {date}: {count} contribution", other: "Week of {date}: {count} contributions" },
      de: { one: "Woche vom {date}: {count} Beitrag", other: "Woche vom {date}: {count} Beiträge" },
      it: { one: "Inizio settimana {date}: {count} contributo", other: "Inizio settimana {date}: {count} contributi" },
    },
    "Week of {date}: no contributions": { de: "Woche vom {date}: keine Beiträge", it: "Inizio settimana {date}: nessun contributo" },
    "Contributions per week over the last twelve months; the busiest week had {count}.": {
      de: "Beiträge pro Woche in den letzten zwölf Monaten; die aktivste Woche hatte {count}.",
      it: "Contributi per settimana negli ultimi dodici mesi; la settimana più attiva ne ha avuti {count}.",
    },
    "Most code in": { de: "Der meiste Code in", it: "La maggior parte del codice in" },
    "Updated {date} · github.com/{login}": { de: "Aktualisiert am {date} · github.com/{login}", it: "Aggiornato: {date} · github.com/{login}" },

    // ---- Front page: contact
    "Not looking for a new role — but always happy to talk about software.": {
      de: "Nicht auf Jobsuche – aber ich rede immer gern über Software.",
      it: "Non cerco un nuovo lavoro, ma parlo sempre volentieri di software.",
    },

    // ---- Lab page
    "The playful side of eschgi.com: Bug Bash, a game about squashing bugs before they reach production; the languages and tools as a 3D sphere; and a terminal with a few easter eggs.": {
      de: "Die verspielte Seite von eschgi.com: Bug Bash, ein Spiel übers Zerquetschen von Bugs, bevor sie in Produktion gehen; die Sprachen und Werkzeuge als 3D-Kugel; und ein Terminal mit ein paar Easter Eggs.",
      it: "Il lato giocoso di eschgi.com: Bug Bash, un gioco in cui schiacci i bug prima che arrivino in produzione; i linguaggi e gli strumenti come sfera 3D; e un terminale con qualche easter egg.",
    },
    "The playful side.": { de: "Die verspielte Seite.", it: "Il lato giocoso." },
    "A game, a sphere and a terminal: kept off the front page, built with the same care.": {
      de: "Ein Spiel, eine Kugel und ein Terminal: nicht auf der Startseite, aber mit derselben Sorgfalt gebaut.",
      it: "Un gioco, una sfera e un terminale: fuori dalla pagina principale, fatti con la stessa cura.",
    },
    "On this page": { de: "Auf dieser Seite", it: "In questa pagina" },
    "<span>02</span>Tech sphere": { de: "<span>02</span>Tech-Kugel", it: "<span>02</span>Sfera tech" },
    "<span>03</span>Terminal": { de: "<span>03</span>Terminal", it: "<span>03</span>Terminale" },
    "← Back to eschgi.com": { de: "← Zurück zu eschgi.com", it: "← Torna a eschgi.com" },

    // Bug Bash (also js/bugbash.js)
    "Squash the bugs before they reach production.": {
      de: "Zerquetsch die Bugs, bevor sie in Produktion gehen.",
      it: "Schiaccia i bug prima che arrivino in produzione.",
    },
    "A little game for everyone who has ever deployed on a Friday. Click the bugs crawling through the code, but leave the features alone.": {
      de: "Ein kleines Spiel für alle, die schon einmal an einem Freitag deployt haben. Klick die Bugs an, die durch den Code krabbeln, aber lass die Features in Ruhe.",
      it: "Un piccolo gioco per chiunque abbia mai fatto un deploy di venerdì. Clicca i bug che strisciano nel codice, ma lascia stare le feature.",
    },
    "Your best:": { de: "Dein Bestwert:", it: "Il tuo record:" },
    "Score": { de: "Punkte", it: "Punti" },
    "Time": { de: "Zeit", it: "Tempo" },
    "Tests": { de: "Tests", it: "Test" },
    "Bug Bash game board": { de: "Spielfeld von Bug Bash", it: "Campo di gioco di Bug Bash" },
    "Ready to debug?": { de: "Bereit zum Debuggen?", it: "Tutto pronto per il debug?" },
    "45 seconds. Every bug that crawls off the board escapes to production and costs you SLA.": {
      de: "45 Sekunden. Jeder Bug, der vom Spielfeld krabbelt, entkommt in die Produktion und kostet dich SLA.",
      it: "45 secondi. Ogni bug che esce dal campo scappa in produzione e ti costa SLA.",
    },
    "<strong>Bug</strong>+10, the classic": { de: "<strong>Bug</strong>+10, der Klassiker", it: "<strong>Bug</strong>+10, il classico" },
    "<strong>Race condition</strong>+20, fast, comes in pairs": {
      de: "<strong>Race Condition</strong>+20, schnell, kommt paarweise",
      it: "<strong>Race condition</strong>+20, veloce, arriva in coppia",
    },
    "<strong>Heisenbug</strong>+30, moves when observed": {
      de: "<strong>Heisenbug</strong>+30, bewegt sich, wenn man hinsieht",
      it: "<strong>Heisenbug</strong>+30, si sposta se lo osservi",
    },
    "<strong>Memory leak</strong>+25, grows, takes 3 hits": {
      de: "<strong>Memory Leak</strong>+25, wächst, braucht 3 Treffer",
      it: "<strong>Memory leak</strong>+25, cresce, servono 3 colpi",
    },
    "<strong>Feature</strong>not a bug. Don't squash!": {
      de: "<strong>Feature</strong>kein Bug. Nicht zerquetschen!",
      it: "<strong>Feature</strong>non è un bug. Non schiacciarla!",
    },
    "Coffee": { de: "Kaffee", it: "Caffè" },
    "slows bugs": { de: "bremst Bugs", it: "rallenta i bug" },
    "AI pair": { de: "KI-Partner", it: "Partner IA" },
    "fixes a few": { de: "behebt ein paar", it: "ne sistema qualcuno" },
    "catch escapes": { de: "fangen Ausreißer ab", it: "fermano le fughe" },
    "Start debugging": { de: "Debuggen starten", it: "Inizia il debug" },
    "Click to squash · P or Esc pauses": { de: "Klicken zum Zerquetschen · P oder Esc pausiert", it: "Clicca per schiacciare · P o Esc per la pausa" },
    "Tap to squash": { de: "Tippen zum Zerquetschen", it: "Tocca per schiacciare" },
    "Fixed!": { de: "Behoben!", it: "Sistemato!" },
    "Resolved": { de: "Gelöst", it: "Risolto" },
    "Closed": { de: "Geschlossen", it: "Chiuso" },
    "Squashed!": { de: "Zerquetscht!", it: "Schiacciato!" },
    "Escaped to prod!": { de: "In die Produktion entkommen!", it: "Scappato in produzione!" },
    "A customer found it": { de: "Ein Kunde hat ihn gefunden", it: "L'ha trovato un cliente" },
    "Hotfix needed 🔥": { de: "Hotfix nötig 🔥", it: "Serve un hotfix 🔥" },
    "📟 On-call paged": { de: "📟 Bereitschaft alarmiert", it: "📟 Reperibile allertato" },
    "Works on my machine": { de: "Bei mir läuft's", it: "Sul mio PC funziona" },
    "Reopened": { de: "Wieder geöffnet", it: "Riaperto" },
    "miss": { de: "daneben", it: "mancato" },
    "false positive": { de: "Fehlalarm", it: "falso positivo" },
    "can't reproduce": { de: "nicht reproduzierbar", it: "non riproducibile" },
    "not a bug": { de: "kein Bug", it: "non è un bug" },
    "Intern with a flyswatter": { de: "Praktikant mit Fliegenklatsche", it: "Stagista con lo scacciamosche" },
    "Junior Debugger": { de: "Junior-Debugger", it: "Debugger junior" },
    "Senior Bug Hunter": { de: "Senior-Bugjäger", it: "Cacciatore di bug senior" },
    "Staff Exterminator": { de: "Staff-Kammerjäger", it: "Disinfestatore staff" },
    "Principal Debugger": { de: "Principal-Debugger", it: "Debugger principal" },
    "10x Engineer 🦄": { de: "10x-Engineer 🦄", it: "Ingegnere 10x 🦄" },
    "Synchronized! +30": { de: "Synchronisiert! +30", it: "Sincronizzati! +30" },
    "AI fixed it 🤖": { de: "Die KI hat's behoben 🤖", it: "L'ha sistemato l'IA 🤖" },
    "Feature shipped 🚀": { de: "Feature ausgeliefert 🚀", it: "Feature rilasciata 🚀" },
    "Caught in CI ✅": { de: "In der CI erwischt ✅", it: "Fermato in CI ✅" },
    "Out of memory in prod!": { de: "Out of Memory in Produktion!", it: "Memoria esaurita in produzione!" },
    "Coffee! Bugs slowed ☕": { de: "Kaffee! Bugs gebremst ☕", it: "Caffè! Bug rallentati ☕" },
    "AI pair programmer on 🤖": { de: "KI-Pair-Programmer an 🤖", it: "Pair programmer IA attivo 🤖" },
    "Test suite +2 ✅": { de: "Testsuite +2 ✅", it: "Suite di test +2 ✅" },
    "AI introduced a regression 🙃": { de: "Die KI hat eine Regression eingebaut 🙃", it: "L'IA ha introdotto una regressione 🙃" },
    "AI pair: done ✓": { de: "KI-Partner: fertig ✓", it: "Partner IA: fatto ✓" },
    "it moved!": { de: "er hat sich bewegt!", it: "si è spostato!" },
    "observed!": { de: "beobachtet!", it: "osservato!" },
    "That was a feature! 🙃": { de: "Das war ein Feature! 🙃", it: "Era una feature! 🙃" },
    "Not a bug! −25": { de: "Kein Bug! −25", it: "Non è un bug! −25" },
    "Product is calling 📞": { de: "Der PM ruft an 📞", it: "Chiama il PM 📞" },
    "You pressed pause. Even debuggers need a break.": {
      de: "Du hast Pause gedrückt. Auch Debugger brauchen mal eine Pause.",
      it: "Hai messo in pausa. Anche chi fa debug ha bisogno di una pausa.",
    },
    "The tab went to the background, so the bugs are waiting for you.": {
      de: "Der Tab ist in den Hintergrund gerückt, also warten die Bugs auf dich.",
      it: "La scheda è passata in secondo piano, quindi i bug ti aspettano.",
    },
    "The board scrolled out of view, so the bugs are waiting for you.": {
      de: "Das Spielfeld ist aus dem Bild gescrollt, also warten die Bugs auf dich.",
      it: "Il campo è uscito dalla vista, quindi i bug ti aspettano.",
    },
    "Production is down and somewhere a pager is buzzing. Maybe write a few more tests?": {
      de: "Die Produktion ist down, und irgendwo piept ein Pager. Vielleicht ein paar Tests mehr schreiben?",
      it: "La produzione è giù e da qualche parte suona un cercapersone. Magari scrivi qualche test in più?",
    },
    "You squashed {count} features. Product would like a word.": {
      de: "Du hast {count} Features zerquetscht. Das Produktmanagement möchte dich sprechen.",
      it: "Hai schiacciato {count} feature. Il product manager vuole parlarti.",
    },
    "Zero bugs reached production. Deploy it — even on a Friday.": {
      de: "Kein einziger Bug hat die Produktion erreicht. Deploy es – sogar an einem Freitag.",
      it: "Nessun bug è arrivato in produzione. Fai il deploy, anche di venerdì.",
    },
    "Lots of false positives. Have you tried reading the stack trace?": {
      de: "Viele Fehlalarme. Schon mal den Stacktrace gelesen?",
      it: "Tanti falsi positivi. Hai provato a leggere lo stack trace?",
    },
    "The backlog thanks you.": { de: "Das Backlog dankt dir.", it: "Il backlog ti ringrazia." },
    "Solid work. Time for a coffee ☕": { de: "Solide Arbeit. Zeit für einen Kaffee ☕", it: "Bel lavoro. È ora di un caffè ☕" },
    "They'll be back. Bugs always are.": { de: "Sie kommen wieder. Bugs kommen immer wieder.", it: "Torneranno. I bug tornano sempre." },
    "Not bad — merge approved.": { de: "Nicht schlecht – Merge genehmigt.", it: "Niente male: merge approvato." },
    "Production is down 🔥": { de: "Produktion ist down 🔥", it: "La produzione è giù 🔥" },
    "Flawless release 🚀": { de: "Fehlerfreies Release 🚀", it: "Rilascio impeccabile 🚀" },
    "SLA breached": { de: "SLA verletzt", it: "SLA violato" },
    "Time's up": { de: "Zeit abgelaufen", it: "Tempo scaduto" },
    "New personal best": { de: "Neuer persönlicher Bestwert", it: "Nuovo record personale" },
    "Your best: {score}": { de: "Dein Bestwert: {score}", it: "Il tuo record: {score}" },
    "Fixed": { de: "Behoben", it: "Risolti" },
    "Escaped": { de: "Entkommen", it: "Scappati" },
    "Accuracy": { de: "Trefferquote", it: "Precisione" },
    "Best combo": { de: "Beste Combo", it: "Combo migliore" },
    "Play again": { de: "Noch mal spielen", it: "Gioca ancora" },
    "Paused": { de: "Pausiert", it: "In pausa" },
    "Taking a break ⏸": { de: "Kurze Pause ⏸", it: "Una pausa ⏸" },
    "Resume": { de: "Weiter", it: "Riprendi" },
    "Restart": { de: "Neu starten", it: "Ricomincia" },
    "P resumes": { de: "P setzt fort", it: "P riprende" },
    "A bug escaped into the page. Squash it!": { de: "Ein Bug ist in die Seite entkommen. Zerquetsch ihn!", it: "Un bug è scappato nella pagina. Schiaccialo!" },
    "Nice catch! 🐛 Its friends are hiding in Bug Bash.": {
      de: "Gut gefangen! 🐛 Seine Freunde verstecken sich in Bug Bash.",
      it: "Bella presa! 🐛 I suoi amici si nascondono in Bug Bash.",
    },
    "Play": { de: "Spielen", it: "Gioca" },

    // Tech sphere
    "02 · Tech sphere": { de: "02 · Tech-Kugel", it: "02 · Sfera tech" },
    "Languages and tools, in three dimensions.": { de: "Sprachen und Werkzeuge, dreidimensional.", it: "Linguaggi e strumenti, in tre dimensioni." },
    "Drag the sphere, or point at a group to light it up.": {
      de: "Zieh an der Kugel oder zeig auf eine Gruppe, um sie hervorzuheben.",
      it: "Trascina la sfera o punta un gruppo per illuminarlo.",
    },
    "Drag the sphere to spin it.": { de: "Zieh an der Kugel, um sie zu drehen.", it: "Trascina la sfera per farla girare." },
    "The same lists, flat and readable, are on the <a href=\"./#expertise\">front page</a>.": {
      de: "Dieselben Listen, flach und gut lesbar, stehen auf der <a href=\"./#expertise\">Startseite</a>.",
      it: "Le stesse liste, piatte e leggibili, sono nella <a href=\"./#expertise\">pagina principale</a>.",
    },
    "Groups": { de: "Gruppen", it: "Gruppi" },
    "The lists live on the <a href=\"./#expertise\">front page</a>.": {
      de: "Die Listen stehen auf der <a href=\"./#expertise\">Startseite</a>.",
      it: "Le liste sono nella <a href=\"./#expertise\">pagina principale</a>.",
    },

    // Terminal (also js/terminal.js). The commands and file names stay as they are.
    "03 · Terminal": { de: "03 · Terminal", it: "03 · Terminale" },
    "Prefer the command line?": { de: "Lieber die Kommandozeile?", it: "Preferisci la riga di comando?" },
    "Type <code class=\"inline-code\">help</code> and press Enter. Not every command is in the help; curiosity is rewarded.": {
      de: "Tippe <code class=\"inline-code\">help</code> und drücke Enter. Nicht jeder Befehl steht in der Hilfe; Neugier wird belohnt.",
      it: "Scrivi <code class=\"inline-code\">help</code> e premi Invio. Non tutti i comandi sono nell'aiuto; la curiosità viene premiata.",
    },
    "Command output": { de: "Befehlsausgabe", it: "Output dei comandi" },
    "Welcome to eschgi.com — type <span class=\"cli__key\">help</span> to get started.": {
      de: "Willkommen auf eschgi.com – tippe <span class=\"cli__key\">help</span>, um loszulegen.",
      it: "Ti diamo il benvenuto su eschgi.com: scrivi <span class=\"cli__key\">help</span> per iniziare.",
    },
    "Type a command and press Enter": { de: "Befehl eintippen und Enter drücken", it: "Scrivi un comando e premi Invio" },
    "available commands:": { de: "verfügbare Befehle:", it: "comandi disponibili:" },
    "who I am": { de: "wer ich bin", it: "chi sono" },
    "foodProcess, what I build at work": { de: "foodProcess, was ich bei der Arbeit entwickle", it: "foodProcess, ciò che sviluppo al lavoro" },
    "the self-hosted trading software, in my free time": {
      de: "die selbst gehostete Trading-Software, in meiner Freizeit",
      it: "il software di trading self-hosted, nel tempo libero",
    },
    "the app I built with AI, for myself": { de: "die App, die ich mit KI für mich gebaut habe", it: "l'app che ho creato con l'IA, per me stesso" },
    "all three": { de: "alle drei", it: "tutti e tre" },
    "languages & technologies (e.g. stack data)": { de: "Sprachen & Technologien (z. B. stack data)", it: "linguaggi e tecnologie (es. stack data)" },
    "how I work with AI": { de: "wie ich mit KI arbeite", it: "come lavoro con l'IA" },
    "GitHub numbers": { de: "Zahlen von GitHub", it: "numeri da GitHub" },
    "where to find me": { de: "wo du mich findest", it: "dove trovarmi" },
    "play Bug Bash": { de: "Bug Bash spielen", it: "gioca a Bug Bash" },
    "the site in English, German or Italian (e.g. lang de)": {
      de: "die Seite auf Englisch, Deutsch oder Italienisch (z. B. lang de)",
      it: "il sito in inglese, tedesco o italiano (es. lang it)",
    },
    "browse the \"files\"": { de: "die „Dateien“ durchstöbern", it: "sfoglia i «file»" },
    "… and a few that are not listed. Tab completes, ↑/↓ walk the history.": {
      de: "… und ein paar, die nicht aufgeführt sind. Tab vervollständigt, ↑/↓ blättern im Verlauf.",
      it: "… e qualcuno che non è in elenco. Tab completa, ↑/↓ scorrono la cronologia.",
    },
    "language:": { de: "Sprache:", it: "lingua:" },
    "lang: no such language: {language} (try: en, de, it)": {
      de: "lang: keine solche Sprache: {language} (versuch: en, de, it)",
      it: "lang: lingua inesistente: {language} (prova: en, de, it)",
    },
    "couldn't read the front page; it's all on eschgi.com": {
      de: "konnte die Startseite nicht lesen; alles steht auf eschgi.com",
      it: "impossibile leggere la pagina principale; è tutto su eschgi.com",
    },
    "{name}: nothing to show": { de: "{name}: nichts anzuzeigen", it: "{name}: niente da mostrare" },
    "product": { de: "Produkt", it: "prodotto" },
    "source": { de: "Quellcode", it: "sorgente" },
    "link": { de: "Link", it: "link" },
    "stack: no such group: {group} (try: languages, frameworks, data, ops, ai)": {
      de: "stack: keine solche Gruppe: {group} (versuch: languages, frameworks, data, ops, ai)",
      it: "stack: gruppo inesistente: {group} (prova: languages, frameworks, data, ops, ai)",
    },
    "stats: no numbers here; they live on github.com/eschgi": {
      de: "stats: hier keine Zahlen; sie stehen auf github.com/eschgi",
      it: "stats: qui niente numeri; sono su github.com/eschgi",
    },
    "stats: no numbers yet; they live on github.com/eschgi": {
      de: "stats: noch keine Zahlen; sie stehen auf github.com/eschgi",
      it: "stats: ancora nessun numero; sono su github.com/eschgi",
    },
    "{contributions} contributions  ·  {commits} commits  ·  {pullRequests} pull requests  ·  {issues} issues  (last 12 months)": {
      de: "{contributions} Beiträge  ·  {commits} Commits  ·  {pullRequests} Pull Requests  ·  {issues} Issues  (letzte 12 Monate)",
      it: "{contributions} contributi  ·  {commits} commit  ·  {pullRequests} pull request  ·  {issues} issue  (ultimi 12 mesi)",
    },
    "top languages": { de: "Top-Sprachen", it: "linguaggi principali" },
    "The weekly chart is on the <a href=\"./#activity\">front page</a>.": {
      de: "Das Wochendiagramm ist auf der <a href=\"./#activity\">Startseite</a>.",
      it: "Il grafico settimanale è nella <a href=\"./#activity\">pagina principale</a>.",
    },
    "Spawning bugs in production.ts… 🐛 good luck.": { de: "Setze Bugs in production.ts aus… 🐛 viel Glück.", it: "Genero bug in production.ts… 🐛 buona fortuna." },
    "Bug Bash lives in the Lab. On my way…": { de: "Bug Bash wohnt im Lab. Bin unterwegs…", it: "Bug Bash abita nel Lab. Arrivo…" },
    "// it's crawling with bugs 🐛 — try `bugbash`": { de: "// hier wimmelt es von Bugs 🐛 – probier `bugbash`", it: "// pullula di bug 🐛 – prova `bugbash`" },
    "cat: missing file operand (try: cat about.txt)": {
      de: "cat: Dateioperand fehlt (versuch: cat about.txt)",
      it: "cat: manca l'operando file (prova: cat about.txt)",
    },
    "cat: {file}: No such file or directory": { de: "cat: {file}: Datei oder Verzeichnis nicht gefunden", it: "cat: {file}: File o directory non esistente" },
    "no history yet": { de: "noch kein Verlauf", it: "ancora nessuna cronologia" },
    "up almost two decades, 1 user, load average: coffee, code, review": {
      de: "läuft seit fast zwei Jahrzehnten, 1 Benutzer, Load Average: Kaffee, Code, Review",
      it: "attivo da quasi vent'anni, 1 utente, carico medio: caffè, codice, review",
    },
    "☕ brewing… done. Focus +10, bugs −1.": { de: "☕ brühe auf… fertig. Fokus +10, Bugs −1.", it: "☕ preparo… fatto. Concentrazione +10, bug −1." },
    "Hi there! 👋 Type 'help' to look around.": { de: "Hallo! 👋 Tippe 'help', um dich umzusehen.", it: "Ciao! 👋 Scrivi 'help' per dare un'occhiata." },
    "Opening vim… just kidding — you might never get out. 🙂": {
      de: "Öffne vim… nur ein Scherz – du kämst vielleicht nie wieder raus. 🙂",
      it: "Apro vim… scherzavo: potresti non uscirne mai più. 🙂",
    },
    "M-x butterfly 🦋 — careful, in Bug Bash that's a feature.": {
      de: "M-x butterfly 🦋 – Vorsicht, in Bug Bash ist das ein Feature.",
      it: "M-x butterfly 🦋 – attenzione, in Bug Bash è una feature.",
    },
    "There is no exit. There is only Bug Bash.": { de: "Es gibt keinen Ausgang. Es gibt nur Bug Bash.", it: "Non c'è via d'uscita. C'è solo Bug Bash." },
    "rm: refusing to remove '/': this site is read-only (and backed up)": {
      de: "rm: '/' wird nicht entfernt: diese Seite ist schreibgeschützt (und gesichert)",
      it: "rm: mi rifiuto di rimuovere '/': questo sito è in sola lettura (e ha un backup)",
    },
    "rm: missing operand": { de: "rm: Operand fehlt", it: "rm: operando mancante" },
    "A hook stopped you: force pushes need a human's approval. 🛑": {
      de: "Ein Hook hat dich gestoppt: Force-Pushes brauchen die Freigabe eines Menschen. 🛑",
      it: "Un hook ti ha fermato: i force push richiedono l'approvazione di una persona. 🛑",
    },
    "It was me. It's always me.": { de: "Ich war's. Ich bin's immer.", it: "Sono stato io. Sono sempre io." },
    "On branch main. Nothing to commit, working tree clean ✨": {
      de: "Auf Branch main. Nichts zu committen, Arbeitsverzeichnis unverändert ✨",
      it: "Sul branch main. Niente di cui fare il commit, l'albero di lavoro è pulito ✨",
    },
    "git: try 'git status', 'git blame', 'git log' or 'git push --force'": {
      de: "git: versuch 'git status', 'git blame', 'git log' oder 'git push --force'",
      it: "git: prova 'git status', 'git blame', 'git log' o 'git push --force'",
    },
    "Okay. 🥪": { de: "Okay. 🥪", it: "Va bene. 🥪" },
    "Permission denied: nice try 😏": { de: "Zugriff verweigert: netter Versuch 😏", it: "Permesso negato: bel tentativo 😏" },
    "command not found: {name} — type 'help'": { de: "Befehl nicht gefunden: {name} – tippe 'help'", it: "comando non trovato: {name} – scrivi 'help'" },
    "hack: operation already in progress…": { de: "hack: Operation läuft bereits…", it: "hack: operazione già in corso…" },
    "ACCESS GRANTED": { de: "ZUGRIFF GEWÄHRT", it: "ACCESSO CONSENTITO" },
    "…just kidding. It's a static site — nothing to steal but good vibes 😄": {
      de: "…nur ein Scherz. Das ist eine statische Seite – hier gibt's nichts zu holen außer guter Laune 😄",
      it: "…scherzavo. È un sito statico: niente da rubare, solo buone vibrazioni 😄",
    },
    "(try `help`, or `snake`)": { de: "(probier `help` oder `snake`)", it: "(prova `help` o `snake`)" },
    "> initializing exploit framework…": { de: "> initialisiere Exploit-Framework…", it: "> inizializzo il framework di exploit…" },
    "> establishing uplink to {target}…": { de: "> baue Uplink zu {target} auf…", it: "> stabilisco l'uplink con {target}…" },
    "> bypassing firewall… done": { de: "> umgehe Firewall… fertig", it: "> aggiro il firewall… fatto" },
    "> scanning ports  [{bar}] {percent}%": { de: "> scanne Ports  [{bar}] {percent}%", it: "> scansione delle porte  [{bar}] {percent}%" },
    "> firewall breached. dumping memory:": { de: "> Firewall durchbrochen. Speicherauszug:", it: "> firewall violato. dump della memoria:" },
    "> cracking root credentials… ✓": { de: "> knacke Root-Zugangsdaten… ✓", it: "> forzo le credenziali di root… ✓" },

    // The terminal's easter eggs
    "Hidden Snake game": { de: "Verstecktes Snake-Spiel", it: "Gioco Snake nascosto" },
    "Close game": { de: "Spiel schließen", it: "Chiudi il gioco" },
    "score": { de: "Punkte", it: "punti" },
    "hi": { de: "Rekord", it: "record" },
    "Up": { de: "Hoch", it: "Su" },
    "Left": { de: "Links", it: "Sinistra" },
    "Pause or resume": { de: "Pause oder weiter", it: "Pausa o riprendi" },
    "Right": { de: "Rechts", it: "Destra" },
    "Down": { de: "Runter", it: "Giù" },
    "swipe or use the pad · tap the board to pause · ✕ quits": {
      de: "wischen oder Pad nutzen · aufs Feld tippen pausiert · ✕ beendet",
      it: "scorri o usa il pad · tocca il campo per la pausa · ✕ esce",
    },
    "arrows / wasd · p pause · r restart · esc quit": {
      de: "Pfeile / wasd · p Pause · r Neustart · esc Ende",
      it: "frecce / wasd · p pausa · r ricomincia · esc esci",
    },
    "score {score}": { de: "Punkte: {score}", it: "punti: {score}" },
    "new high!": { de: "neuer Rekord!", it: "nuovo record!" },
    "tap to retry · ✕ to quit": { de: "tippen für neuen Versuch · ✕ zum Beenden", it: "tocca per riprovare · ✕ per uscire" },
    "press r to retry · esc to quit": { de: "r für neuen Versuch · esc zum Beenden", it: "premi r per riprovare · esc per uscire" },
    "paused": { de: "Pause", it: "in pausa" },
    "launching nibbles.exe…": { de: "starte nibbles.exe…", it: "avvio nibbles.exe…" },
    "crt mode:": { de: "CRT-Modus:", it: "modalità CRT:" },
    "matrix: the rain is off in reduced-motion mode — there is no spoon.": {
      de: "matrix: Bei reduzierter Bewegung regnet es nicht – es gibt keinen Löffel.",
      it: "matrix: con il movimento ridotto la pioggia è spenta. Il cucchiaio non esiste.",
    },
    "Wake up, Neo… 🐇 follow the white rabbit.": { de: "Wach auf, Neo… 🐇 Folge dem weißen Kaninchen.", it: "Svegliati, Neo… 🐇 Segui il coniglio bianco." },
    "unplugged.": { de: "ausgestöpselt.", it: "scollegato." },
    "matrix mode:": { de: "Matrix-Modus:", it: "modalità Matrix:" },
    "physics is off in reduced-motion mode — everything stays where it belongs.": {
      de: "bei reduzierter Bewegung ist die Physik aus – alles bleibt, wo es hingehört.",
      it: "con il movimento ridotto la fisica è spenta: tutto resta al suo posto.",
    },
    "Detaching the DOM… mind your head. (Esc or the button rebuilds it)": {
      de: "Löse das DOM… Kopf einziehen. (Esc oder der Button baut es wieder auf)",
      it: "Stacco il DOM… attento alla testa. (Esc o il pulsante lo ricostruiscono)",
    },
    "Rebuild the page": { de: "Seite wieder aufbauen", it: "Ricostruisci la pagina" },
    "spacetime stays flat in reduced-motion mode.": {
      de: "bei reduzierter Bewegung bleibt die Raumzeit flach.",
      it: "con il movimento ridotto lo spaziotempo resta piatto.",
    },
    "Crossing the event horizon… 🕳️ (Esc to escape)": {
      de: "Überquere den Ereignishorizont… 🕳️ (Esc zum Entkommen)",
      it: "Attraverso l'orizzonte degli eventi… 🕳️ (Esc per scappare)",
    },
    "🚀 liftoff! (the animation is off in reduced-motion mode) — in orbit ✨": {
      de: "🚀 Abheben! (bei reduzierter Bewegung ohne Animation) – im Orbit ✨",
      it: "🚀 decollo! (con il movimento ridotto niente animazione) – in orbita ✨",
    },
    "Ignition sequence start… 🚀 (Esc aborts)": { de: "Zündsequenz gestartet… 🚀 (Esc bricht ab)", it: "Sequenza di accensione avviata… 🚀 (Esc annulla)" },
    "LIFTOFF": { de: "ABHEBEN", it: "DECOLLO" },
    "in orbit ✨": { de: "im Orbit ✨", it: "in orbita ✨" },
  };

  // ------------------------------------------------------------------ the engine
  var root = document.documentElement;
  var eschgi = (window.eschgi = window.eschgi || {});
  var current = "en";
  var sources = new WeakMap(); // element → its English, as the page had it
  var documents = [document]; // kept in the current language: the page, and the front page the Lab reads
  var missing = {};
  var numberFormats = {};
  var pluralRules = {};

  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function keyOf(html) {
    return html.replace(/\s+/g, " ").trim();
  }

  // The German or Italian for a page's English, or null for English and for what isn't translated.
  function translation(english) {
    if (current === "en") return null;
    var entry = own(STRINGS, english) ? STRINGS[english] : null;
    if (entry && typeof entry[current] === "string") return entry[current];
    missing[english] = true;
    return null;
  }

  function formatNumber(value, digits) {
    var id = current + (digits === undefined ? "" : ":" + digits);
    if (!numberFormats[id]) {
      numberFormats[id] = new Intl.NumberFormat(
        LOCALES[current],
        digits === undefined ? undefined : { minimumFractionDigits: digits, maximumFractionDigits: digits }
      );
    }
    return numberFormats[id].format(value);
  }

  function pluralOf(count) {
    if (typeof count !== "number") return "other";
    try {
      if (!pluralRules[current]) pluralRules[current] = new Intl.PluralRules(LOCALES[current]);
      return pluralRules[current].select(count);
    } catch (error) {
      return count === 1 ? "one" : "other";
    }
  }

  // Puts the values into a text's {placeholders}; numbers are written the language's way.
  function fill(text, params) {
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, function (match, name) {
      if (!own(params, name)) return match;
      var value = params[name];
      return typeof value === "number" ? formatNumber(value) : String(value);
    });
  }

  // A script's words in the current language: t("Day {day} of {total}", { day: 3, total: 60 }).
  function t(english, params) {
    var entry = own(STRINGS, english) ? STRINGS[english] : null;
    var value = entry && entry[current] !== undefined ? entry[current] : null;
    if (value === null) {
      if (current !== "en") missing[english] = true;
      value = entry && entry.en !== undefined ? entry.en : english;
    }
    if (typeof value === "object") value = value[pluralOf(params && params.count)] || value.other;
    return fill(value, params);
  }

  function setContent(element, html) {
    if (/[<&]/.test(html)) element.innerHTML = html;
    else element.textContent = html;
  }

  // The first time an element is met, its English is kept; after that it is put into whichever
  // language is current, from that English.
  function translateElement(element) {
    var source = sources.get(element);
    if (!source) {
      source = { lang: "en", attributes: {} };
      if (element.hasAttribute("data-i18n")) source.html = element.innerHTML;
      (element.getAttribute("data-i18n-attr") || "").split(/\s+/).forEach(function (name) {
        if (name && element.hasAttribute(name)) source.attributes[name] = element.getAttribute(name);
      });
      sources.set(element, source);
    }
    if (source.lang === current) return;
    source.lang = current;
    if (source.html !== undefined) {
      var html = translation(keyOf(source.html));
      setContent(element, html === null ? source.html : html);
    }
    Object.keys(source.attributes).forEach(function (name) {
      var value = translation(keyOf(source.attributes[name]));
      element.setAttribute(name, value === null ? source.attributes[name] : value);
    });
  }

  function translateTree(node) {
    if (node.nodeType === 1 && (node.hasAttribute("data-i18n") || node.hasAttribute("data-i18n-attr"))) {
      translateElement(node);
    }
    Array.prototype.forEach.call(node.querySelectorAll("[data-i18n], [data-i18n-attr]"), translateElement);
  }

  function switchButtons() {
    return document.querySelectorAll("[data-lang-switch] button[lang]");
  }

  function apply(lang) {
    current = lang;
    documents.forEach(function (doc) {
      translateTree(doc);
      doc.documentElement.setAttribute("lang", lang);
    });
    Array.prototype.forEach.call(switchButtons(), function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("lang") === lang));
    });
    root.classList.remove("i18n-pending");
  }

  // Text in another language is longer or shorter, and everything below it moves; the first text
  // in view keeps its place on screen, so the visitor doesn't lose the line they were reading.
  function readingPlace() {
    if (window.scrollY < 1) return null;
    var header = document.querySelector(".site-header");
    var top = header ? header.getBoundingClientRect().bottom : 0;
    var candidates = document.querySelectorAll("main [data-i18n], main h2, main h3, main p, main li, main figure");
    for (var i = 0; i < candidates.length; i++) {
      var box = candidates[i].getBoundingClientRect();
      if (box.height && box.top >= top) return { element: candidates[i], top: box.top };
    }
    return null;
  }

  function keepPlace(place) {
    if (!place || !place.element.isConnected) return;
    var moved = place.element.getBoundingClientRect().top - place.top;
    if (Math.abs(moved) < 1) return;
    var style = root.style;
    var behavior = style.scrollBehavior;
    style.scrollBehavior = "auto"; // at once, not smoothly
    window.scrollBy(0, moved);
    style.scrollBehavior = behavior;
  }

  // ------------------------------------------------------------------ for the other scripts
  Object.defineProperty(eschgi, "lang", {
    get: function () {
      return current;
    },
  });
  Object.defineProperty(eschgi, "locale", {
    get: function () {
      return LOCALES[current];
    },
  });
  eschgi.t = t;
  eschgi.formatNumber = formatNumber;

  // Puts a document into the current language and keeps it there: site.js hands over the front
  // page it fetches for the Lab. (An element added to the page with its English works too.)
  eschgi.translate = function (node) {
    if (node.nodeType === 9 && documents.indexOf(node) < 0) documents.push(node);
    translateTree(node);
    if (node.nodeType === 9) node.documentElement.setAttribute("lang", current);
  };

  // Changes the language and remembers the choice; returns false for a language the site doesn't speak.
  eschgi.setLanguage = function (lang) {
    if (LANGUAGES.indexOf(lang) < 0) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      // Storage can be unavailable; the choice then lasts as long as the page.
    }
    if (lang === current) return true;
    var place = readingPlace();
    apply(lang);
    document.dispatchEvent(new CustomEvent("eschgi:language", { detail: { lang: lang } }));
    keepPlace(place);
    return true;
  };

  // For a look in the browser's console: the words, and the English met with no translation.
  eschgi.i18n = {
    strings: STRINGS,
    missing: function () {
      return Object.keys(missing);
    },
  };

  Array.prototype.forEach.call(switchButtons(), function (button) {
    button.addEventListener("click", function () {
      eschgi.setLanguage(button.getAttribute("lang"));
    });
  });

  var wanted = root.getAttribute("data-lang");
  root.removeAttribute("data-lang");
  apply(LANGUAGES.indexOf(wanted) >= 0 ? wanted : "en");
})();
