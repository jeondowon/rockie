#!/usr/bin/env node
/**
 * 배포물에 동봉할 오픈소스 라이선스 고지를 생성한다.
 *
 *   node scripts/gen-notices.js
 *   → assets/licenses/THIRD-PARTY-NOTICES.md
 *
 * MIT·BSD·ISC·Apache-2.0은 바이너리 배포물에 저작권 고지와 라이선스 전문을
 * 포함할 것을 요구한다. 목록만으로는 조건을 못 채우므로 전문을 그대로 싣는다.
 *
 * 대상은 앱에 실제로 실려 나가는 것만이다.
 * - dependencies 트리 전체 (devDependencies는 빌드에만 쓰이므로 제외)
 * - Electron 런타임 (devDependency지만 앱 안에 통째로 들어간다)
 * - 번들한 폰트
 *
 * 의존성을 추가·갱신하면 다시 돌려야 한다.
 *
 * 출력에 앱 버전은 넣지 않는다. release.sh의 사전 점검이 이 파일을 다시 만들어
 * 달라지는지로 "의존성이 바뀌었는데 안 만들었다"를 잡는데, 버전을 적으면
 * 릴리스마다 달라져 점검이 매번 걸린다.
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets/licenses/THIRD-PARTY-NOTICES.md");

// 패키지 폴더에서 라이선스 전문이 담긴 파일을 찾는다.
// 이름이 제각각이라(LICENSE / LICENCE / LICENSE-MIT / COPYING) 패턴으로 훑는다.
function readLicenseText(dir) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return null;
  }
  const hit = names.find((n) => /^(licen[cs]e|copying|notice)/i.test(n));
  if (!hit) return null;
  const file = path.join(dir, hit);
  if (!fs.statSync(file).isFile()) return null;
  return fs.readFileSync(file, "utf8").trim();
}

// npm ls의 중첩 트리를 {name@version: {version, path, license}} 로 평탄화한다.
// 같은 패키지가 여러 번 나오므로 키로 중복을 제거한다.
function flatten(node, acc) {
  for (const [name, info] of Object.entries(node.dependencies || {})) {
    // deduped 항목은 version만 있고 path가 없다. 어딘가 다른 자리에 실체가 있다.
    if (!info.path) continue;
    const key = `${name}@${info.version}`;
    if (!acc.has(key)) {
      acc.set(key, { name, version: info.version, dir: info.path });
    }
    flatten(info, acc);
  }
  return acc;
}

function pkgMeta(dir) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  const license =
    typeof meta.license === "string"
      ? meta.license
      : meta.license?.type || meta.licenses?.[0]?.type || "UNKNOWN";
  return { license, homepage: meta.homepage || "" };
}

function section(title, body) {
  return `### ${title}\n\n\`\`\`\n${body}\n\`\`\`\n`;
}

const tree = JSON.parse(
  execFileSync("npm", ["ls", "--omit=dev", "--all", "--json", "--long"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }),
);

const pkgs = [...flatten(tree, new Map()).values()]
  .map((p) => ({ ...p, ...pkgMeta(p.dir), text: readLicenseText(p.dir) }))
  .sort((a, b) => a.name.localeCompare(b.name));

const missing = pkgs.filter((p) => !p.text);

// Electron은 devDependency지만 런타임이 앱 안에 통째로 들어간다.
const electronDir = path.join(ROOT, "node_modules/electron");
const electron = {
  version: JSON.parse(fs.readFileSync(path.join(electronDir, "package.json"), "utf8")).version,
  text: fs.readFileSync(path.join(electronDir, "LICENSE"), "utf8").trim(),
};

const galmuri = fs
  .readFileSync(path.join(ROOT, "assets/fonts/OFL.txt"), "utf8")
  .trim();

const rows = pkgs
  .map((p) => `| ${p.name} | ${p.version} | ${p.license} |`)
  .join("\n");

const out = `# 오픈소스 라이선스 고지

Rockie는 아래 오픈소스 소프트웨어를 포함하고 있습니다. 각 저작권자와 라이선스 전문을 아래에 그대로 싣습니다.

이 문서는 \`scripts/gen-notices.js\`가 생성합니다. 직접 고치지 마세요.

- 포함 대상: 앱 실행에 필요한 런타임 의존성 ${pkgs.length}개, Electron ${electron.version}, 번들 폰트

---

## 1. Electron

Electron ${electron.version} (MIT License)

${section("Electron", electron.text)}

Electron에는 Chromium과 그 하위 구성요소가 포함되어 있습니다. Chromium 및 관련 구성요소의 라이선스 전문은 앱과 함께 배포되는 \`LICENSES.chromium.html\` 파일에서 확인할 수 있습니다.

---

## 2. 폰트

Galmuri11 · Galmuri14 — Copyright (c) 2019–2025 Lee Minseo (quiple@quiple.dev), SIL Open Font License 1.1
원본: https://github.com/quiple/galmuri

${section("SIL Open Font License 1.1", galmuri)}

---

## 3. npm 패키지

| 패키지 | 버전 | 라이선스 |
| --- | --- | --- |
${rows}

---

## 4. npm 패키지 라이선스 전문

${pkgs
  .filter((p) => p.text)
  .map((p) => section(`${p.name} ${p.version} (${p.license})`, p.text))
  .join("\n")}
${
  missing.length
    ? `---

## 5. 라이선스 파일이 동봉되지 않은 패키지

아래 패키지는 배포본에 라이선스 파일을 포함하지 않아, 패키지가 선언한 라이선스 식별자만 표기합니다.

${missing.map((p) => `- ${p.name} ${p.version} — ${p.license}${p.homepage ? ` (${p.homepage})` : ""}`).join("\n")}
`
    : ""
}`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);

console.log(`${path.relative(ROOT, OUT)} 생성 — npm 패키지 ${pkgs.length}개`);
if (missing.length) {
  console.log(`라이선스 파일 없는 패키지 ${missing.length}개: ${missing.map((p) => p.name).join(", ")}`);
}
