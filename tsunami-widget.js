/*!
 * 津波情報 埋め込みバナー (tsunami-widget.js)
 * ------------------------------------------------------
 * 使い方: 既存ページの </body> 直前にこの1行を追加するだけ。
 *   <script src="tsunami-widget.js"></script>
 *
 * ・平常時（津波注意報/警報が発表されていない時）は何も表示されません。
 * ・津波注意報・警報・大津波警報が発表されると、ページ上部に自動でバナーが出現します。
 * ・データ提供元: P2P地震情報 JSON API (https://www.p2pquake.net/)
 *   気象庁の津波予報を基にした二次配信データです。CORSが許可されているため
 *   GitHub Pages 等の静的ホスティングからプロキシなしで直接 fetch できます。
 */
(function () {
  var API_URL = 'https://api.p2pquake.net/v2/history?codes=552&limit=1';
  var CHECK_INTERVAL_MS = 30000; // 30秒ごとにチェック

  var GRADE_LABEL = {
    MajorWarning: '大津波警報',
    Warning: '津波警報',
    Watch: '津波注意報',
    Unknown: '不明'
  };
  var LEVEL_ORDER = { MajorWarning: 3, Warning: 2, Watch: 1, Unknown: 0 };

  var STYLE_ID = 'tsunami-widget-style';
  var BANNER_ID = 'tsunami-widget-banner';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = ''
      + '#' + BANNER_ID + '{'
      + '  position:fixed; top:0; left:0; right:0; z-index:2147483647;'
      + '  display:none; font-family:"Hiragino Sans","Yu Gothic",sans-serif;'
      + '  box-shadow:0 2px 14px rgba(0,0,0,0.25);'
      + '}'
      + '#' + BANNER_ID + ' .tw-inner{'
      + '  max-width:1000px; margin:0 auto; padding:12px 44px 12px 16px;'
      + '  display:flex; align-items:center; gap:14px; flex-wrap:wrap; position:relative;'
      + '}'
      + '#' + BANNER_ID + ' .tw-msg{ font-weight:700; font-size:15px; line-height:1.4; }'
      + '#' + BANNER_ID + ' .tw-areas{ font-size:12.5px; opacity:0.92; line-height:1.5; }'
      + '#' + BANNER_ID + ' .tw-areas b{ font-weight:600; }'
      + '#' + BANNER_ID + ' .tw-close{'
      + '  position:absolute; right:10px; top:50%; transform:translateY(-50%);'
      + '  background:rgba(255,255,255,0.18); border:none; color:inherit;'
      + '  width:26px; height:26px; border-radius:50%; cursor:pointer; font-size:15px;'
      + '  line-height:1; display:flex; align-items:center; justify-content:center;'
      + '}'
      + '#' + BANNER_ID + ' .tw-close:hover{ background:rgba(255,255,255,0.3); }'
      + '#' + BANNER_ID + '.tw-advisory{ background:#FBBF24; color:#3A2E08; }'
      + '#' + BANNER_ID + '.tw-warning{ background:#E23B3B; color:#fff; }'
      + '#' + BANNER_ID + '.tw-major{ background:#B00E0E; color:#fff; animation:tw-blink 1s step-start infinite; }'
      + '@keyframes tw-blink{ 0%,49%{ background-color:#B00E0E; } 50%,100%{ background-color:#5A0707; } }'
      + '@media (prefers-reduced-motion: reduce){ #' + BANNER_ID + '.tw-major{ animation:none; background:#8A0B0B; } }'
      + '@media (max-width:600px){ #' + BANNER_ID + ' .tw-msg{ font-size:13.5px; } #' + BANNER_ID + ' .tw-areas{ font-size:11.5px; } }';
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ensureBanner() {
    var el = document.getElementById(BANNER_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = BANNER_ID;
    el.innerHTML =
      '<div class="tw-inner">' +
        '<div>' +
          '<div class="tw-msg" data-tw="msg"></div>' +
          '<div class="tw-areas" data-tw="areas"></div>' +
        '</div>' +
        '<button class="tw-close" type="button" aria-label="閉じる" data-tw="close">✕</button>' +
      '</div>';
    document.body.insertBefore(el, document.body.firstChild);
    el.querySelector('[data-tw="close"]').addEventListener('click', function () {
      el.style.display = 'none';
      el.dataset.dismissed = 'true';
    });
    return el;
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pickHighestLevel(areas) {
    var top = null;
    for (var i = 0; i < areas.length; i++) {
      var g = areas[i].grade;
      if (!top || (LEVEL_ORDER[g] || 0) > (LEVEL_ORDER[top] || 0)) top = g;
    }
    return top;
  }

  function showBanner(level, areas) {
    var el = ensureBanner();
    // 手動で閉じている間は、レベルが変わらない限り再表示しない
    var prevLevel = el.dataset.level;
    if (el.dataset.dismissed === 'true' && prevLevel === level) return;
    el.dataset.dismissed = 'false';
    el.dataset.level = level;

    el.className = level === 'MajorWarning' ? 'tw-major'
      : level === 'Warning' ? 'tw-warning'
      : 'tw-advisory';

    var msg;
    if (level === 'MajorWarning') msg = '🚨【大津波警報】今すぐ高台へ逃げてください！';
    else if (level === 'Warning') msg = '⚠️【津波警報】今すぐ海岸や川から離れて逃げてください！';
    else msg = '🟡【津波注意報】海から上がり、海岸から離れてください';

    el.querySelector('[data-tw="msg"]').textContent = msg;

    var areaText = '';
    if (areas && areas.length) {
      areaText = '対象地域: ' + areas.map(function (a) {
        return escapeHTML(a.name) + '（' + (GRADE_LABEL[a.grade] || a.grade) + '）';
      }).join('、');
    }
    el.querySelector('[data-tw="areas"]').innerHTML = areaText;

    el.style.display = 'block';
  }

  function hideBanner() {
    var el = document.getElementById(BANNER_ID);
    if (el) {
      el.style.display = 'none';
      el.dataset.dismissed = 'false';
      el.dataset.level = '';
    }
  }

  function check() {
    fetch(API_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || data.length === 0) { hideBanner(); return; }
        var latest = data[0];
        var areas = Array.isArray(latest.areas) ? latest.areas : [];
        if (latest.cancelled === true || areas.length === 0) {
          hideBanner();
        } else {
          var level = pickHighestLevel(areas);
          showBanner(level, areas);
        }
      })
      .catch(function (err) {
        // 埋め込みウィジェットのため、通信エラー時は静かに失敗させ、
        // 既存ページの表示を妨げない（コンソールにのみ記録）。
        console.warn('[tsunami-widget] 取得失敗:', err.message);
      });
  }

  function init() {
    injectStyles();
    check();
    setInterval(check, CHECK_INTERVAL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
