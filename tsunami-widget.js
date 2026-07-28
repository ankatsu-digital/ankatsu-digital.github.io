/*!
 * 津波情報 埋め込みバナー (tsunami-widget.js)
 * ------------------------------------------------------
 * 使い方: 既存ページの </body> 直前にこの1行を追加するだけ。
 *   <script src="tsunami-widget.js"></script>
 *
 * ・平常時（津波注意報/警報が発表されていない時）は何も表示されません。
 * ・津波注意報・警報・大津波警報が発表されると、ページの一番上に帯（バナー）が
 *   自動で追加されます。position:fixed ではなく通常のページの一部として
 *   挿入されるので、既存のヘッダーやコンテンツと重なりません
 *   （バナーの分だけページが下にずれるイメージです）。
 * ・危険を知らせる表示のため、閉じるボタンは付けていません。
 *   状況が解除されれば自動で消えます。
 *
 * データ提供元: P2P地震情報 JSON API (https://www.p2pquake.net/)
 * 気象庁の津波予報を基にした二次配信データです。
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
      + '  display:none; width:100%; box-sizing:border-box;'
      + '  font-family:"Hiragino Sans","Yu Gothic",sans-serif;'
      + '  border-bottom:3px solid rgba(0,0,0,0.15);'
      + '}'
      + '#' + BANNER_ID + ' .tw-inner{'
      + '  max-width:1000px; margin:0 auto; padding:16px 20px;'
      + '}'
      + '#' + BANNER_ID + ' .tw-title{'
      + '  font-weight:900; font-size:17px; line-height:1.5; margin:0 0 4px;'
      + '  display:flex; align-items:center; gap:8px;'
      + '}'
      + '#' + BANNER_ID + ' .tw-sub{ font-size:13.5px; line-height:1.6; margin:0 0 8px; opacity:0.95; }'
      + '#' + BANNER_ID + ' .tw-areas{'
      + '  font-size:13px; line-height:1.7; background:rgba(255,255,255,0.18);'
      + '  border-radius:8px; padding:8px 10px;'
      + '}'
      + '#' + BANNER_ID + ' .tw-areas b{ font-weight:700; }'
      + '#' + BANNER_ID + '.tw-advisory{ background:#FBBF24; color:#3A2E08; }'
      + '#' + BANNER_ID + '.tw-warning{ background:#E23B3B; color:#fff; }'
      + '#' + BANNER_ID + '.tw-major{ background:#B00E0E; color:#fff; animation:tw-blink 1s step-start infinite; }'
      + '@keyframes tw-blink{ 0%,49%{ background-color:#B00E0E; } 50%,100%{ background-color:#5A0707; } }'
      + '@media (prefers-reduced-motion: reduce){ #' + BANNER_ID + '.tw-major{ animation:none; background:#8A0B0B; } }'
      + '@media (max-width:600px){ #' + BANNER_ID + ' .tw-title{ font-size:15px; } #' + BANNER_ID + ' .tw-sub, #' + BANNER_ID + ' .tw-areas{ font-size:12px; } }';
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
        '<p class="tw-title" data-tw="title"></p>' +
        '<p class="tw-sub" data-tw="sub"></p>' +
        '<div class="tw-areas" data-tw="areas"></div>' +
      '</div>';
    // 通常のフロー要素として、bodyの一番上に挿入する（重なり防止）
    document.body.insertBefore(el, document.body.firstChild);
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
    el.className = level === 'MajorWarning' ? 'tw-major'
      : level === 'Warning' ? 'tw-warning'
      : 'tw-advisory';

    var title, sub;
    if (level === 'MajorWarning') {
      title = '🚨 大津波警報が発表されています';
      sub = '今すぐ高台や避難場所へ逃げてください。海岸や川に絶対に近づかないでください。';
    } else if (level === 'Warning') {
      title = '⚠️ 津波警報が発表されています';
      sub = '今すぐ海岸や川から離れ、安全な高い場所へ避難してください。';
    } else {
      title = '🟡 津波注意報が発表されています';
      sub = '海水浴・磯遊び・漁業など海での活動をやめ、海岸から離れてください。';
    }

    el.querySelector('[data-tw="title"]').textContent = title;
    el.querySelector('[data-tw="sub"]').textContent = sub;

    var areaHtml = '';
    if (areas && areas.length) {
      areaHtml = '<b>対象地域：</b>' + areas.map(function (a) {
        return escapeHTML(a.name) + '（' + (GRADE_LABEL[a.grade] || a.grade) + '）';
      }).join('、');
    }
    el.querySelector('[data-tw="areas"]').innerHTML = areaHtml;

    el.style.display = 'block';
  }

  function hideBanner() {
    var el = document.getElementById(BANNER_ID);
    if (el) el.style.display = 'none';
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
        // 埋め込みウィジェットのため、通信エラー時は既存ページの表示を妨げないよう
        // 静かに失敗させ、コンソールにのみ記録する。
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
