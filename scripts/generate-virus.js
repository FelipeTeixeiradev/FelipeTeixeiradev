const https = require("https");
const fs = require("fs");

const USERNAME = "FelipeTeixeiradev";
const API_URL = `https://github-contributions-api.jogruber.de/v4/${USERNAME}?y=last`;

function getData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Erro HTTP: ${res.statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", reject);
  });
}

function createVirus() {
  return `
    <g id="virus">

      <rect x="-15" y="-15" width="30" height="30" rx="5"
            fill="#ffffff"/>

      <rect x="-21" y="-5" width="6" height="10" fill="#ffffff"/>
      <rect x="15" y="-5" width="6" height="10" fill="#ffffff"/>
      <rect x="-5" y="-21" width="10" height="6" fill="#ffffff"/>
      <rect x="-5" y="15" width="10" height="6" fill="#ffffff"/>

      <rect x="-18" y="-18" width="7" height="7" fill="#ffffff"/>
      <rect x="11" y="-18" width="7" height="7" fill="#ffffff"/>
      <rect x="-18" y="11" width="7" height="7" fill="#ffffff"/>
      <rect x="11" y="11" width="7" height="7" fill="#ffffff"/>

      <rect x="-9" y="-7" width="6" height="6" fill="#000000"/>
      <rect x="3" y="-7" width="6" height="6" fill="#000000"/>

      <rect x="-7" y="4" width="14" height="4" fill="#000000"/>
      <rect x="-3" y="8" width="6" height="3" fill="#000000"/>

    </g>
  `;
}

function generateSVG(data) {
  const CELL = 12;
  const GAP = 4;
  const LEFT = 30;
  const TOP = 55;

  const WEEK_WIDTH = CELL + GAP;
  const ROW_HEIGHT = CELL + GAP;

  const contributions = data.contributions || [];

  if (!contributions.length) {
    throw new Error("Nenhuma contribuição encontrada.");
  }

  const days = new Map();

  for (const item of contributions) {
    days.set(item.date, item);
  }

  const firstDate = new Date(contributions[0].date + "T00:00:00");
  const lastDate = new Date(
    contributions[contributions.length - 1].date + "T00:00:00"
  );

  const start = new Date(firstDate);
  start.setDate(start.getDate() - start.getDay());

  const end = new Date(lastDate);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const weeks = [];
  let current = new Date(start);

  while (current <= end) {
    const week = [];

    for (let row = 0; row < 7; row++) {
      const date = new Date(current);
      date.setDate(current.getDate() + row);

      const dateString = date.toISOString().slice(0, 10);

      week.push({
        date: dateString,
        data: days.get(dateString) || {
          date: dateString,
          count: 0,
          level: 0,
        },
      });
    }

    weeks.push(week);
    current.setDate(current.getDate() + 7);
  }

  const width = LEFT * 2 + weeks.length * WEEK_WIDTH;
  const height = TOP + 7 * ROW_HEIGHT + 35;

  let cells = "";
  let virusPositions = [];

  weeks.forEach((week, column) => {
    week.forEach((day, row) => {
      const x = LEFT + column * WEEK_WIDTH;
      const y = TOP + row * ROW_HEIGHT;
      const level = day.data.level || 0;

      // Preto = nenhum commit
      // Branco = contribuição
      const fill = level > 0 ? "#ffffff" : "#000000";

      cells += `
        <rect
          id="day-${column}-${row}"
          x="${x}"
          y="${y}"
          width="${CELL}"
          height="${CELL}"
          rx="2"
          fill="${fill}"
        />
      `;

      if (level > 0) {
        virusPositions.push({
          x: x + CELL / 2,
          y: y + CELL / 2,
        });
      }
    });
  });

  let virusAnimation = "";

  if (virusPositions.length > 0) {
    const values = virusPositions
      .map((position) => `${position.x},${position.y}`)
      .join(";");

    const keyTimes = virusPositions
      .map((_, index) => {
        if (virusPositions.length === 1) {
          return "0";
        }

        return (
          index / (virusPositions.length - 1)
        ).toFixed(4);
      })
      .join(";");

    virusAnimation = `
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="${values}"
          keyTimes="${keyTimes}"
          dur="3s"
          repeatCount="indefinite"
        />

        ${createVirus()}
      </g>
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
>

  <rect
    width="100%"
    height="100%"
    fill="#000000"
  />

  <text
    x="${LEFT}"
    y="28"
    fill="#ffffff"
    font-family="monospace"
    font-size="14"
    font-weight="bold"
  >
    FELIPETEIXIRADEV • GITHUB CONTRIBUTIONS
  </text>

  ${cells}

  ${virusAnimation}

</svg>
`;
}

async function main() {
  console.log("🦠 Buscando contribuições do GitHub...");
  console.log(`👤 Usuário: ${USERNAME}`);

  const data = await getData(API_URL);

  console.log(
    `📊 ${data.total?.lastYear || 0} contribuições no último ano`
  );

  const svg = generateSVG(data);

  fs.mkdirSync("dist", {
    recursive: true,
  });

  fs.writeFileSync(
    "dist/github-contribution-virus.svg",
    svg,
    "utf8"
  );

  console.log("✅ Vírus gerado!");
}

main().catch((error) => {
  console.error("❌ Erro:");
  console.error(error);
  process.exit(1);
});
