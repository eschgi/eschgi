// eschgi.com — Name that language, on the Lab page: ten code snippets in the languages from the
// front page's expertise, four guesses each. After every answer it says what gave the language
// away; the best score is kept in localStorage.
//
// The highlighting colours keywords, strings and numbers from one list shared by all languages,
// so the colours never give an answer away. A classic deferred script, like the others.
(function () {
  "use strict";

  var quiz = document.querySelector("[data-quiz]");
  if (!quiz) return;

  var ROUNDS = 10;
  var BEST_KEY = "eschgi.quiz.best";

  // Each snippet: its language, the file it might live in, the code, and what gives it away.
  var SNIPPETS = [
    {
      language: "C#",
      file: "Orders.cs",
      code: "var expensive = await db.Orders\n    .Where(order => order.Total > 100m)\n    .OrderByDescending(order => order.Total)\n    .ToListAsync(cancellationToken);",
      tell: "The m in 100m makes a decimal, and ToListAsync is Entity Framework Core.",
    },
    {
      language: "C#",
      file: "Punnet.cs",
      code: "public record Punnet(string Product, decimal Grams)\n{\n    public decimal Giveaway(decimal target) =>\n        Math.Max(0, Grams - target);\n}",
      tell: "A positional record with decimal amounts: modern C#.",
    },
    {
      language: "C++",
      file: "weights.cpp",
      code: "std::vector<int> weights{251, 249, 253};\nstd::ranges::sort(weights);\nfor (const auto& weight : weights)\n    std::cout << weight << '\\n';",
      tell: "std::ranges and std::cout: C++20.",
    },
    {
      language: "C++",
      file: "clamp.hpp",
      code: "template <typename T>\nT clamp_to(T value, T low, T high) {\n    return std::max(low, std::min(value, high));\n}",
      tell: "template <typename T> is how C++ writes generic code.",
    },
    {
      language: "Python",
      file: "report.py",
      code: 'evens = [n * n for n in range(10) if n % 2 == 0]\nwith open("report.txt", "w") as file:\n    file.write(", ".join(map(str, evens)))',
      tell: "A list comprehension and a with block: Python.",
    },
    {
      language: "Python",
      file: "order.py",
      code: "@dataclass\nclass Order:\n    id: int\n    lines: list[str] = field(default_factory=list)",
      tell: "@dataclass and field(default_factory=…) are Python's.",
    },
    {
      language: "TypeScript",
      file: "total.ts",
      code: "interface Order { id: number; total: number }\n\nconst total = (orders: Order[]): number =>\n  orders.reduce((sum, order) => sum + order.total, 0);",
      tell: "Type annotations on an arrow function: TypeScript.",
    },
    {
      language: "TypeScript",
      file: "status.ts",
      code: 'type Status = "under" | "ok" | "over";\n\nfunction light(status: Status): string {\n  return status === "ok" ? "green" : "red";\n}',
      tell: "A union of string literals as a type: TypeScript.",
    },
    {
      language: "JavaScript",
      file: "cards.js",
      code: 'document.querySelectorAll(".case").forEach((card) => {\n  card.addEventListener("click", () => {\n    card.classList.toggle("open");\n  });\n});',
      tell: "The DOM, with no types anywhere: plain JavaScript.",
    },
    {
      language: "JavaScript",
      file: "stats.js",
      code: 'const response = await fetch("stats.json");\nconst { contributions } = await response.json();\nconsole.log(`${contributions} contributions`);',
      tell: "fetch, destructuring and a template literal, untyped: JavaScript.",
    },
    {
      language: "Go",
      file: "orders.go",
      code: 'orders, err := store.Load(ctx)\nif err != nil {\n    return fmt.Errorf("load orders: %w", err)\n}',
      tell: ":= and if err != nil are as Go as it gets.",
    },
    {
      language: "Go",
      file: "weigh.go",
      code: "results := make(chan int)\ngo func() {\n    results <- weigh(punnet)\n}()\nfmt.Println(<-results)",
      tell: "A goroutine and a channel.",
    },
    {
      language: "SQL",
      file: "giveaway.sql",
      code: "SELECT product, AVG(net_grams - target_grams) AS giveaway\nFROM packs\nGROUP BY product\nHAVING COUNT(*) > 100;",
      tell: "SELECT … GROUP BY … HAVING: SQL.",
    },
    {
      language: "SQL",
      file: "orders.sql",
      code: "CREATE TABLE orders (\n    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n    placed_at timestamptz NOT NULL DEFAULT now()\n);",
      tell: "CREATE TABLE with an identity column and timestamptz: SQL, PostgreSQL's dialect.",
    },
    {
      language: "Java",
      file: "Names.java",
      code: "List<String> names = users.stream()\n    .filter(User::isActive)\n    .map(User::getName)\n    .toList();",
      tell: "A stream with method references and a getter called getName: Java.",
    },
    {
      language: "Java",
      file: "Scale.java",
      code: "public final class Scale {\n    private final BigDecimal target;\n\n    public Scale(BigDecimal target) {\n        this.target = target;\n    }\n}",
      tell: "BigDecimal and a constructor assigning this.target: Java.",
    },
    {
      language: "Kotlin",
      file: "Names.kt",
      code: 'val names = users\n    .filter { it.active }\n    .map { it.name }\nprintln("Active: ${names.joinToString()}")',
      tell: "val, it and a ${…} string template: Kotlin.",
    },
    {
      language: "Kotlin",
      file: "Punnet.kt",
      code: "data class Punnet(val product: String, val grams: Int)\n\nfun Punnet.isShort(target: Int) = grams < target",
      tell: "A data class and an extension function: Kotlin.",
    },
    {
      language: "Dart",
      file: "prices.dart",
      code: "final prices = <double>[2.5, 3.0, 4.25];\nfinal total = prices.fold<double>(0, (sum, price) => sum + price);\nprint('Total: $total');",
      tell: "final, fold<double> and $total in a single-quoted string: Dart.",
    },
    {
      language: "Dart",
      file: "greeting.dart",
      code: "class Greeting extends StatelessWidget {\n  const Greeting({super.key});\n\n  @override\n  Widget build(BuildContext context) => const Text('Hello');\n}",
      tell: "A Flutter widget, and Flutter is written in Dart.",
    },
    {
      language: "Delphi",
      file: "MainForm.pas",
      code: "procedure TMainForm.PackButtonClick(Sender: TObject);\nbegin\n  ShowMessage('Packed ' + IntToStr(Count) + ' punnets');\nend;",
      tell: "begin … end and a TObject sender: Delphi's Object Pascal.",
    },
    {
      language: "Delphi",
      file: "Scales.pas",
      code: "type\n  TScale = class\n  private\n    FTarget: Integer;\n  public\n    property Target: Integer read FTarget write FTarget;\n  end;",
      tell: "A class with an F-prefixed field and a property: Delphi.",
    },
  ];

  // The languages that look most alike, so the wrong answers are tempting ones.
  var LOOKALIKES = {
    "C#": ["Java", "TypeScript", "Kotlin", "C++"],
    "C++": ["C#", "Java", "Go"],
    Python: ["Kotlin", "Go", "TypeScript"],
    TypeScript: ["JavaScript", "C#", "Dart"],
    JavaScript: ["TypeScript", "Dart", "Java"],
    Go: ["C++", "Kotlin", "Python"],
    SQL: ["Python", "Delphi", "Go"],
    Java: ["C#", "Kotlin", "C++"],
    Kotlin: ["Java", "Dart", "TypeScript", "Go"],
    Dart: ["Kotlin", "TypeScript", "Java", "C#"],
    Delphi: ["SQL", "Python", "C++"],
  };
  var LANGUAGES = Object.keys(LOOKALIKES);

  // One keyword list for every language: colouring them can't point at an answer.
  var KEYWORDS = (
    "abstract as async await begin break case catch chan class const constructor continue create data def default " +
    "defer do else end extends false final for from fun func function go group having if implements import in " +
    "interface is let new not null override package primary private procedure property protected public read " +
    "record return select static struct super table template then this throw true try type typename val var " +
    "void when where while with write yield"
  ).split(" ");

  var codeView = quiz.querySelector("[data-quiz-code]");
  var fileText = quiz.querySelector("[data-quiz-file]");
  var scoreText = quiz.querySelector("[data-quiz-score]");
  var choiceList = quiz.querySelector("[data-quiz-choices]");
  var statusText = quiz.querySelector("[data-quiz-status]");
  var nextButton = quiz.querySelector("[data-quiz-next]");
  var bestText = document.querySelector("[data-quiz-best]");
  if (!codeView || !choiceList || !nextButton) return;

  var round = [];
  var index = 0;
  var right = 0;
  var answered = false;

  function shuffle(items) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  }

  function escapeHtml(text) {
    return text.replace(/[&<>]/g, function (c) {
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
    });
  }

  // Strings, numbers and keywords, in one pass; everything else stays plain.
  function highlight(code) {
    var token = /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`[^`]*`)|(\b\d+(?:\.\d+)?[a-z]?\b)|([A-Za-z_][A-Za-z0-9_]*)/g;
    var html = "";
    var last = 0;
    var match;
    while ((match = token.exec(code))) {
      html += escapeHtml(code.slice(last, match.index));
      if (match[1]) html += '<span class="q-str">' + escapeHtml(match[1]) + "</span>";
      else if (match[2]) html += '<span class="q-num">' + match[2] + "</span>";
      else if (KEYWORDS.indexOf(match[3].toLowerCase()) >= 0) html += '<span class="q-key">' + match[3] + "</span>";
      else html += escapeHtml(match[3]);
      last = token.lastIndex;
    }
    return html + escapeHtml(code.slice(last));
  }

  // Two lookalikes and one more, shuffled in with the answer.
  function choicesFor(language) {
    var lookalikes = shuffle(LOOKALIKES[language]).slice(0, 2);
    var others = shuffle(
      LANGUAGES.filter(function (name) {
        return name !== language && lookalikes.indexOf(name) < 0;
      })
    );
    return shuffle([language].concat(lookalikes, others.slice(0, 1)));
  }

  function loadBest() {
    try {
      return parseInt(window.localStorage.getItem(BEST_KEY), 10) || 0;
    } catch (error) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      window.localStorage.setItem(BEST_KEY, String(value));
    } catch (error) {
      // Storage can be unavailable; the best score just isn't kept.
    }
  }

  function showBest() {
    if (bestText) bestText.textContent = String(loadBest());
  }

  function start() {
    // At most one snippet a language per round, so ten rounds show ten different languages.
    var seen = {};
    round = shuffle(SNIPPETS)
      .filter(function (snippet) {
        if (seen[snippet.language]) return false;
        seen[snippet.language] = true;
        return true;
      })
      .slice(0, ROUNDS);
    index = 0;
    right = 0;
    show();
  }

  function show() {
    var snippet = round[index];
    answered = false;
    codeView.innerHTML = highlight(snippet.code);
    fileText.textContent = snippet.file.replace(/\.[a-z]+$/i, ".???");
    scoreText.textContent = index + 1 + " of " + round.length + " · " + right + " right";
    statusText.textContent = "Which language is this?";
    nextButton.hidden = true;
    choiceList.innerHTML = "";
    choicesFor(snippet.language).forEach(function (language, position) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "play__button quiz__choice";
      button.setAttribute("data-language", language);
      button.innerHTML = '<span class="quiz__key">' + (position + 1) + "</span>" + escapeHtml(language);
      button.addEventListener("click", function () {
        answer(language);
      });
      choiceList.appendChild(button);
    });
  }

  function answer(language) {
    if (answered) return;
    answered = true;
    var snippet = round[index];
    var correct = language === snippet.language;
    if (correct) right += 1;
    Array.prototype.forEach.call(choiceList.children, function (button) {
      var name = button.getAttribute("data-language");
      button.disabled = true;
      if (name === snippet.language) button.classList.add("is-right");
      else if (name === language) button.classList.add("is-wrong");
    });
    fileText.textContent = snippet.file;
    scoreText.textContent = index + 1 + " of " + round.length + " · " + right + " right";
    statusText.textContent = (correct ? "Right. " : "It's " + snippet.language + ". ") + snippet.tell;
    var last = index === round.length - 1;
    nextButton.textContent = last ? "See the score" : "Next snippet";
    nextButton.hidden = false;
    nextButton.focus({ preventScroll: true });
  }

  function next() {
    if (!answered) return;
    if (index < round.length - 1) {
      index += 1;
      show();
      return;
    }
    var best = loadBest();
    var line = "You named " + right + " of " + round.length + ".";
    if (right > best) {
      saveBest(right);
      line += best ? " A new best." : "";
    } else {
      line += " Your best is " + best + ".";
    }
    if (right === round.length) line += " Flawless: polyglot confirmed.";
    showBest();
    codeView.innerHTML = highlight("// " + right + " / " + round.length + "\nconsole.log(\"Thanks for playing!\");");
    fileText.textContent = "score.txt";
    choiceList.innerHTML = "";
    statusText.textContent = line;
    nextButton.textContent = "Play again";
    nextButton.hidden = false;
    answered = true;
    index = round.length; // the next press starts a new round
  }

  nextButton.addEventListener("click", function () {
    if (index >= round.length) start();
    else next();
  });

  // Keys 1 to 4 answer while the quiz has focus; Enter moves on through the Next button itself.
  quiz.addEventListener("keydown", function (event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    var number = parseInt(event.key, 10);
    if (number >= 1 && number <= 4 && !answered) {
      var button = choiceList.children[number - 1];
      if (button) {
        event.preventDefault();
        button.click();
      }
    }
  });

  showBest();
  start();
})();
