// 메인 프로세스용 표시 언어 헬퍼.
// 렌더러는 shared/i18n.js(키 + 사전)를 쓰고, 메인은 알림 문구와 질문 데이터처럼
// 항목마다 { ko, en }을 들고 있는 서사 데이터를 골라 쓰기만 하면 되므로 이 정도로 충분하다.
//
// store를 직접 읽지 않는다. evolution.js가 이 모듈을 쓰는데, 그 파일은 electron 없이
// 테스트에서 그대로 돌아가야 하기 때문이다(순수 데이터 + 계산). 실제 값은 앱 시작 시와
// 설정 변경 시 main.js가 setLocale로 넣어 준다.
let current = "ko";

function setLocale(locale) {
  current = locale === "en" ? "en" : "ko";
}

function locale() {
  return current;
}

// { ko, en } 형태에서 현재 언어를 고른다. 번역이 없으면 한국어로 떨어진다.
function pick(bilingual) {
  if (bilingual == null || typeof bilingual === "string") return bilingual;
  return bilingual[current] ?? bilingual.ko;
}

module.exports = { setLocale, locale, pick };
