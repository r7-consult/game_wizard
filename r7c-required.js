(function (window, document) {
  'use strict';

  var options = window.__R7CGuardOptions || {};
  var REQUIRED_GUID = 'asc.{AA2EA9B6-9EC2-415F-9762-634EE8D9A95E}';
  var INSTALL_URL = options.installUrl || 'https://r7-consult.ru/r7_market';
  var PLUGIN_NAME = options.pluginName || document.title || 'Plugin';
  var MANAGER_NAME = options.managerName || '{r7} consult';
  var MIN_MANAGER_VERSION = options.minManagerVersion || '';

  var state = {
    inFlight: null,
    result: null,
    overlay: null,
    startQueue: [],
    pendingTimer: null,
    bootstrapTimer: null,
    initPatched: false
  };

  function hasHost() {
    return !!(window.Asc && window.Asc.plugin);
  }

  function canExecuteMethods() {
    return !!(hasHost() && typeof window.Asc.plugin.executeMethod === 'function');
  }

  function getLanguage() {
    var raw = '';
    try {
      raw = String((window.Asc && window.Asc.plugin && window.Asc.plugin.info && window.Asc.plugin.info.lang) || 'ru');
    } catch (_) {
      raw = 'ru';
    }
    raw = raw.substring(0, 2).toLowerCase();
    return raw === 'ru' ? 'ru' : 'en';
  }

  function tr(ruText, enText) {
    return getLanguage() === 'ru' ? ruText : enText;
  }

  function compareVersions(left, right) {
    var a = String(left || '0').split('.');
    var b = String(right || '0').split('.');
    var max = Math.max(a.length, b.length);
    var index;

    for (index = 0; index < max; index += 1) {
      var leftPart = parseInt(a[index] || '0', 10);
      var rightPart = parseInt(b[index] || '0', 10);

      if (leftPart > rightPart) return 1;
      if (leftPart < rightPart) return -1;
    }

    return 0;
  }

  function normalizeGuid(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getManagerVersion(pluginRecord) {
    if (!pluginRecord || !pluginRecord.obj || !pluginRecord.obj.version) {
      return '';
    }
    return String(pluginRecord.obj.version || '').trim();
  }

  function isDarkTheme(theme) {
    var rawType = '';
    if (theme && typeof theme === 'object' && theme.type) {
      rawType = String(theme.type);
    } else if (typeof theme === 'string') {
      rawType = String(theme);
    }
    return rawType.toLowerCase().indexOf('dark') !== -1;
  }

  function getTheme() {
    if (!hasHost()) return null;
    return (window.Asc.plugin.theme || (window.Asc.plugin.info && window.Asc.plugin.info.theme) || null);
  }

  function ensureStyles() {
    if (document.getElementById('r7c-manager-guard-styles')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'r7c-manager-guard-styles';
        style.textContent = [
      'html.r7c-guard-pending body > :not(#r7c-manager-guard),',
      'html.r7c-guard-blocked body > :not(#r7c-manager-guard) {',
      '  visibility: hidden !important;',
      '}',
      '#r7c-manager-guard {',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 2147483647;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 16px;',
      '  box-sizing: border-box;',
      '  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif;',
      '  --pm-surface: #ffffff;',
      '  --pm-surface-alt: #f3f3f3;',
      '  --pm-border: #cfcfcf;',
      '  --pm-text: #333333;',
      '  --pm-text-muted: #8a8a8a;',
      '  --pm-button: #e9e9e9;',
      '  --pm-accent: #007acc;',
      '  --pm-overlay: rgba(15, 23, 42, 0.34);',
      '  --pm-shadow: 0 22px 48px rgba(15, 23, 42, 0.18);',
      '}',
      '#r7c-manager-guard[hidden] {',
      '  display: none !important;',
      '}',
      '#r7c-manager-guard.r7c-guard--dark {',
      '  --pm-surface: #1e1e1e;',
      '  --pm-surface-alt: #252526;',
      '  --pm-border: #3e3e42;',
      '  --pm-text: #d4d4d4;',
      '  --pm-text-muted: #8a8a8a;',
      '  --pm-button: #313135;',
      '  --pm-accent: #0090f1;',
      '  --pm-overlay: rgba(0, 0, 0, 0.54);',
      '  --pm-shadow: 0 24px 54px rgba(0, 0, 0, 0.34);',
      '}',
      '.r7c-guard__backdrop {',
      '  position: absolute;',
      '  inset: 0;',
      '  background: var(--pm-overlay);',
      '  backdrop-filter: blur(6px);',
      '}',
      '.r7c-guard__panel {',
      '  position: relative;',
      '  width: min(100%, 580px);',
      '  border: 1px solid var(--pm-border);',
      '  border-radius: 10px;',
      '  background: var(--pm-surface);',
      '  color: var(--pm-text);',
      '  box-shadow: var(--pm-shadow);',
      '  overflow: hidden;',
      '}',
      '.r7c-guard__header {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  gap: 12px;',
      '  padding: 12px 16px;',
      '  border-bottom: 1px solid var(--pm-border);',
      '}',
      '.r7c-guard__brand {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 12px;',
      '  min-width: 0;',
      '}',
      '.r7c-guard__brand-badge {',
      '  width: 36px;',
      '  height: 36px;',
      '  min-width: 36px;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  border-radius: 8px;',
      '  background: linear-gradient(136.1deg, #FF8E3D -1.99%, #FF6F3D 100%);',
      '  color: #ffffff;',
      '  font-size: 14px;',
      '  font-weight: 700;',
      '  letter-spacing: 0.02em;',
      '}',
      '.r7c-guard__brand-text {',
      '  min-width: 0;',
      '}',
      '.r7c-guard__brand-title {',
      '  font-size: 16px;',
      '  font-weight: 700;',
      '  color: var(--pm-text);',
      '  line-height: 1.2;',
      '}',
      '.r7c-guard__brand-subtitle {',
      '  margin-top: 2px;',
      '  font-size: 12px;',
      '  color: var(--pm-text-muted);',
      '  line-height: 1.35;',
      '}',
      '.r7c-guard__icon-button {',
      '  width: 28px;',
      '  height: 28px;',
      '  min-width: 28px;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 0;',
      '  border: 1px solid var(--pm-border);',
      '  border-radius: 6px;',
      '  background: var(--pm-button);',
      '  color: var(--pm-text-muted);',
      '  cursor: pointer;',
      '  appearance: none;',
      '  -webkit-appearance: none;',
      '}',
      '.r7c-guard__icon-button:hover {',
      '  border-color: var(--pm-accent);',
      '  color: var(--pm-text);',
      '}',
      '.r7c-guard__icon-button svg {',
      '  width: 16px;',
      '  height: 16px;',
      '  stroke: currentColor;',
      '  fill: none;',
      '  stroke-width: 1.8;',
      '  stroke-linecap: round;',
      '  stroke-linejoin: round;',
      '}',
      '.r7c-guard__body {',
      '  padding: 16px;',
      '}',
      '.r7c-guard__badge {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  min-height: 22px;',
      '  padding: 0 10px;',
      '  border-radius: 999px;',
      '  background: rgba(14, 99, 156, 0.14);',
      '  border: 1px solid rgba(14, 99, 156, 0.35);',
      '  color: var(--pm-accent);',
      '  font-size: 11px;',
      '  font-weight: 700;',
      '  line-height: 1;',
      '}',
      '.r7c-guard__title {',
      '  margin: 14px 0 8px;',
      '  font-size: 22px;',
      '  font-weight: 700;',
      '  line-height: 1.2;',
      '  color: var(--pm-text);',
      '}',
      '.r7c-guard__message {',
      '  margin: 0;',
      '  font-size: 14px;',
      '  line-height: 1.55;',
      '  color: var(--pm-text-muted);',
      '}',
      '.r7c-guard__details {',
      '  margin-top: 14px;',
      '  padding: 14px 16px;',
      '  border: 1px solid var(--pm-border);',
      '  border-radius: 8px;',
      '  background: var(--pm-surface-alt);',
      '  color: var(--pm-text);',
      '  font-size: 13px;',
      '  line-height: 1.5;',
      '}',
      '.r7c-guard__pending {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 12px;',
      '  margin-top: 16px;',
      '  padding: 14px 16px;',
      '  border: 1px solid var(--pm-border);',
      '  border-radius: 8px;',
      '  background: var(--pm-surface-alt);',
      '  color: var(--pm-text);',
      '  font-size: 13px;',
      '}',
      '.r7c-guard__spinner {',
      '  width: 18px;',
      '  height: 18px;',
      '  border-radius: 50%;',
      '  border: 2px solid rgba(14, 99, 156, 0.18);',
      '  border-top-color: var(--pm-accent);',
      '  animation: r7c-guard-spin 0.8s linear infinite;',
      '}',
      '.r7c-guard__footer {',
      '  display: flex;',
      '  justify-content: flex-end;',
      '  gap: 8px;',
      '  padding: 14px 16px;',
      '  border-top: 1px solid var(--pm-border);',
      '}',
      '.r7c-guard__button {',
      '  height: 28px;',
      '  padding: 0 12px;',
      '  border-radius: 6px;',
      '  border: 1px solid var(--pm-border);',
      '  background: var(--pm-button);',
      '  color: var(--pm-text);',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  cursor: pointer;',
      '}',
      '.r7c-guard__button:hover {',
      '  border-color: var(--pm-accent);',
      '}',
      '.r7c-guard__button--primary {',
      '  border-color: rgba(14, 99, 156, 0.45);',
      '  background: var(--pm-accent);',
      '  color: #ffffff;',
      '}',
      '.r7c-guard__button--primary:hover {',
      '  border-color: var(--pm-accent);',
      '  background: #1177bb;',
      '}',
      '.r7c-guard__button--ghost {',
      '  background: var(--pm-button);',
      '  color: var(--pm-text);',
      '}',
      '.r7c-guard__icon-button[hidden],',
      '.r7c-guard__footer[hidden],',
      '.r7c-guard__details[hidden],',
      '.r7c-guard__pending[hidden] {',
      '  display: none !important;',
      '}',
      '@keyframes r7c-guard-spin {',
      '  to { transform: rotate(360deg); }',
      '}',
      '@media (max-width: 640px) {',
      '  #r7c-manager-guard {',
      '    padding: 12px;',
      '  }',
      '  .r7c-guard__panel {',
      '    width: 100%;',
      '  }',
      '  .r7c-guard__footer {',
      '    flex-direction: column;',
      '  }',
      '  .r7c-guard__button {',
      '    width: 100%;',
      '  }',
      '}'
    ].join('\n');

    document.head.appendChild(style);
  }

  function mountWhenReady(callback) {
    if (document.body) {
      callback();
      return;
    }

    document.addEventListener('DOMContentLoaded', function onReady() {
      document.removeEventListener('DOMContentLoaded', onReady);
      callback();
    }, { once: true });
  }

  function ensureOverlay() {
    mountWhenReady(function () {
      if (state.overlay) {
        return;
      }

      ensureStyles();

      var root = document.createElement('div');
      root.id = 'r7c-manager-guard';
      root.hidden = true;
            root.innerHTML = [
        '<div class="r7c-guard__backdrop"></div>',
        '<section class="r7c-guard__panel" role="dialog" aria-modal="true" aria-labelledby="r7c-guard-title">',
        '  <div class="r7c-guard__header">',
        '    <div class="r7c-guard__brand">',
        '      <div class="r7c-guard__brand-badge">{r7}</div>',
        '      <div class="r7c-guard__brand-text">',
        '        <div class="r7c-guard__brand-title" id="r7c-guard-brand-title"></div>',
        '        <div class="r7c-guard__brand-subtitle" id="r7c-guard-brand-subtitle"></div>',
        '      </div>',
        '    </div>',
        '    <button class="r7c-guard__icon-button" type="button" data-action="retry" hidden>',
        '      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
        '        <path d="M20 11a8 8 0 1 1-2.34-5.66"></path>',
        '        <path d="M20 4v6h-6"></path>',
        '      </svg>',
        '    </button>',
        '  </div>',
        '  <div class="r7c-guard__body">',
        '    <div class="r7c-guard__badge" id="r7c-guard-badge"></div>',
        '    <h1 class="r7c-guard__title" id="r7c-guard-title"></h1>',
        '    <p class="r7c-guard__message" id="r7c-guard-message"></p>',
        '    <div class="r7c-guard__pending" id="r7c-guard-pending">',
        '      <div class="r7c-guard__spinner" aria-hidden="true"></div>',
        '      <span id="r7c-guard-pending-text"></span>',
        '    </div>',
        '    <div class="r7c-guard__details" id="r7c-guard-details"></div>',
        '  </div>',
        '  <div class="r7c-guard__footer" id="r7c-guard-actions">',
        '    <button class="r7c-guard__button r7c-guard__button--primary" type="button" data-action="install"></button>',
        '    <button class="r7c-guard__button r7c-guard__button--ghost" type="button" data-action="close"></button>',
        '  </div>',
        '</section>'
      ].join('');

      document.body.appendChild(root);
      state.overlay = root;
      state.overlay.querySelector('#r7c-guard-brand-title').textContent = MANAGER_NAME;
      state.overlay.querySelector('#r7c-guard-brand-subtitle').textContent = tr('Менеджер плагинов R7', 'R7 plugin manager');

      root.querySelector('[data-action="install"]').addEventListener('click', function () {
        openInstallUrl();
      });

      root.querySelector('[data-action="retry"]').addEventListener('click', function () {
        verify(true).then(function (result) {
          if (result && result.ok) {
            flushQueue();
          }
        });
      });

      root.querySelector('[data-action="close"]').addEventListener('click', function () {
        closePlugin();
      });

      applyTheme(getTheme());
    });
  }

  function applyTheme(theme) {
    if (!state.overlay) return;
    state.overlay.classList.toggle('r7c-guard--dark', isDarkTheme(theme));
  }

  function setHtmlState(nextState) {
    document.documentElement.classList.remove('r7c-guard-pending', 'r7c-guard-blocked');
    if (nextState) {
      document.documentElement.classList.add(nextState);
    }
  }

  function schedulePending() {
    clearTimeout(state.pendingTimer);
    state.pendingTimer = setTimeout(function () {
      showPending();
    }, 120);
  }

  function cancelPending() {
    clearTimeout(state.pendingTimer);
    state.pendingTimer = null;
  }

  function showPending() {
    ensureOverlay();
    mountWhenReady(function () {
      if (!state.overlay) return;
      setHtmlState('r7c-guard-pending');
      state.overlay.hidden = false;
      state.overlay.querySelector('#r7c-guard-badge').textContent = tr('Проверка зависимости', 'Dependency check');
      state.overlay.querySelector('#r7c-guard-title').textContent = tr('Подготавливаем запуск', 'Preparing startup');
      state.overlay.querySelector('#r7c-guard-message').textContent = tr(
        'Проверяем, установлен ли менеджер плагинов ' + MANAGER_NAME + ' для запуска "' + PLUGIN_NAME + '".',
        'Checking whether ' + MANAGER_NAME + ' is installed before starting "' + PLUGIN_NAME + '".'
      );
      state.overlay.querySelector('#r7c-guard-pending-text').textContent = tr(
        'Это занимает пару секунд.',
        'This usually takes a couple of seconds.'
      );
      state.overlay.querySelector('[data-action="retry"]').hidden = true;
      state.overlay.querySelector('#r7c-guard-pending').hidden = false;
      state.overlay.querySelector('#r7c-guard-details').hidden = true;
      state.overlay.querySelector('#r7c-guard-actions').hidden = true;
      applyTheme(getTheme());
    });
  }

  function getFailureCopy(result) {
    var reason = result && result.reason ? result.reason : 'unavailable';
    var managerVersion = result && result.managerVersion ? result.managerVersion : '';

    if (reason === 'missing') {
      return {
        badge: tr('Нужен менеджер', 'Manager required'),
        title: tr('Нужен ' + MANAGER_NAME, MANAGER_NAME + ' is required'),
        message: tr(
          'Плагин "' + PLUGIN_NAME + '" работает только вместе с менеджером плагинов ' + MANAGER_NAME + '.',
          '"' + PLUGIN_NAME + '" works only together with the ' + MANAGER_NAME + ' plugin manager.'
        ),
        details: tr(
          'Установите ' + MANAGER_NAME + ', затем откройте этот плагин снова.',
          'Install ' + MANAGER_NAME + ' and then reopen this plugin.'
        ),
        primary: tr('Как установить', 'How to install')
      };
    }

    if (reason === 'outdated') {
      return {
        badge: tr('Нужно обновление', 'Update required'),
        title: tr('Обновите ' + MANAGER_NAME, 'Update ' + MANAGER_NAME),
        message: tr(
          'Найден установленный менеджер плагинов, но его версия слишком старая для "' + PLUGIN_NAME + '".',
          'The plugin manager is installed, but its version is too old for "' + PLUGIN_NAME + '".'
        ),
        details: tr(
          'Текущая версия: ' + (managerVersion || 'unknown') + '. Требуемая версия: ' + MIN_MANAGER_VERSION + ' или выше.',
          'Current version: ' + (managerVersion || 'unknown') + '. Required version: ' + MIN_MANAGER_VERSION + ' or newer.'
        ),
        primary: tr('Как обновить', 'How to update')
      };
    }

    return {
      badge: tr('Проверка не выполнена', 'Check failed'),
      title: tr('Не удалось проверить ' + MANAGER_NAME, 'Unable to verify ' + MANAGER_NAME),
      message: tr(
        'Редактор не смог получить список установленных плагинов перед запуском "' + PLUGIN_NAME + '".',
        'The editor could not get the list of installed plugins before starting "' + PLUGIN_NAME + '".'
      ),
      details: tr(
        'Нажмите "Повторить проверку". Если проблема повторится, перезапустите редактор и проверьте, что ' + MANAGER_NAME + ' установлен.',
        'Click "Retry check". If the problem persists, restart the editor and verify that ' + MANAGER_NAME + ' is installed.'
      ),
      primary: tr('Открыть сайт', 'Open website')
    };
  }

  function showBlocked(result) {
    ensureOverlay();
    cancelPending();

    mountWhenReady(function () {
      if (!state.overlay) return;

      var copy = getFailureCopy(result);
      setHtmlState('r7c-guard-blocked');
      state.overlay.hidden = false;
      state.overlay.querySelector('#r7c-guard-badge').textContent = copy.badge;
      state.overlay.querySelector('#r7c-guard-title').textContent = copy.title;
      state.overlay.querySelector('#r7c-guard-message').textContent = copy.message;
      state.overlay.querySelector('#r7c-guard-details').textContent = copy.details;
      state.overlay.querySelector('#r7c-guard-details').hidden = false;
      state.overlay.querySelector('#r7c-guard-pending').hidden = true;
      state.overlay.querySelector('#r7c-guard-actions').hidden = false;
      state.overlay.querySelector('[data-action="install"]').textContent = copy.primary;
      state.overlay.querySelector('[data-action="retry"]').hidden = false;
      state.overlay.querySelector('[data-action="retry"]').title = tr('Повторить проверку', 'Retry check');
      state.overlay.querySelector('[data-action="retry"]').setAttribute('aria-label', tr('Повторить проверку', 'Retry check'));
      state.overlay.querySelector('[data-action="close"]').textContent = tr('Закрыть плагин', 'Close plugin');
      applyTheme(getTheme());
    });
  }

  function hideOverlay() {
    cancelPending();
    setHtmlState('');
    if (state.overlay) {
      state.overlay.hidden = true;
    }
  }

  function flushQueue() {
    var queue = state.startQueue.slice();
    state.startQueue.length = 0;
    hideOverlay();
    clearTimeout(state.bootstrapTimer);
    state.bootstrapTimer = null;

    queue.forEach(function (callback) {
      try {
        callback();
      } catch (error) {
        console.error('[R7C Guard] Failed to continue plugin startup', error);
      }
    });
  }

  function closePlugin() {
    try {
      if (window.Asc && window.Asc.plugin && typeof window.Asc.plugin.executeCommand === 'function') {
        window.Asc.plugin.executeCommand('close', '');
        return;
      }
    } catch (_) {}

    try {
      window.close();
    } catch (_) {}
  }

  function openInstallUrl() {
    if (!INSTALL_URL) {
      return;
    }

    try {
      if (window.Asc && window.Asc.plugin && typeof window.Asc.plugin.executeMethod === 'function') {
        window.Asc.plugin.executeMethod('OpenLink', [INSTALL_URL]);
      }
    } catch (_) {}

    try {
      window.open(INSTALL_URL, '_blank', 'noopener,noreferrer');
    } catch (_) {}
  }

  function findManager(installedPlugins) {
    if (!Array.isArray(installedPlugins)) {
      return null;
    }

    var requiredGuid = normalizeGuid(REQUIRED_GUID);
    var index;

    for (index = 0; index < installedPlugins.length; index += 1) {
      var current = installedPlugins[index];
      if (normalizeGuid(current && current.guid) === requiredGuid) {
        return current;
      }
    }

    return null;
  }

  function verify(force) {
    if (!canExecuteMethods()) {
      hideOverlay();
      return Promise.resolve({ ok: true, skipped: true });
    }

    if (!force && state.result) {
      return Promise.resolve(state.result);
    }

    if (!force && state.inFlight) {
      return state.inFlight;
    }

    state.result = null;
    schedulePending();

    state.inFlight = new Promise(function (resolve) {
      var resolved = false;
      var timeoutId = setTimeout(function () {
        finish({ ok: false, reason: 'unavailable' });
      }, 4000);

      function finish(result) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        state.inFlight = null;
        state.result = result;

        if (result && result.ok) {
          flushQueue();
        } else {
          showBlocked(result || { ok: false, reason: 'unavailable' });
        }

        resolve(result);
      }

      try {
        window.Asc.plugin.executeMethod('GetInstalledPlugins', null, function (result) {
          if (!Array.isArray(result)) {
            finish({ ok: false, reason: 'unavailable' });
            return;
          }

          var manager = findManager(result);

          if (!manager) {
            finish({ ok: false, reason: 'missing' });
            return;
          }

          var managerVersion = getManagerVersion(manager);
          if (MIN_MANAGER_VERSION && compareVersions(managerVersion, MIN_MANAGER_VERSION) < 0) {
            finish({
              ok: false,
              reason: 'outdated',
              managerVersion: managerVersion
            });
            return;
          }

          finish({
            ok: true,
            managerVersion: managerVersion
          });
        });
      } catch (error) {
        finish({
          ok: false,
          reason: 'unavailable',
          error: error && error.message ? error.message : ''
        });
      }
    });

    return state.inFlight;
  }

  function queueStart(callback) {
    if (typeof callback === 'function') {
      state.startQueue.push(callback);
    }

    return verify(false);
  }

  function patchProperty(name, wrapperFactory) {
    var plugin = window.Asc.plugin;
    var currentValue = plugin[name];

    Object.defineProperty(plugin, name, {
      configurable: true,
      enumerable: true,
      get: function () {
        return currentValue;
      },
      set: function (nextValue) {
        if (typeof nextValue !== 'function') {
          currentValue = nextValue;
          return;
        }

        if (nextValue.__r7cGuardWrapped) {
          currentValue = nextValue;
          return;
        }

        var wrapped = wrapperFactory(nextValue);
        wrapped.__r7cGuardWrapped = true;
        currentValue = wrapped;
      }
    });

    if (typeof currentValue === 'function') {
      plugin[name] = currentValue;
    }
  }

  function patchPluginHooks() {
    if (!hasHost() || state.initPatched) {
      return;
    }

    state.initPatched = true;

    patchProperty('init', function (originalHandler) {
      return function () {
        var args = arguments;
        var context = this;

        return queueStart(function () {
          originalHandler.apply(context, args);
        });
      };
    });

    patchProperty('onThemeChanged', function (originalHandler) {
      return function () {
        applyTheme(arguments[0]);
        return originalHandler.apply(this, arguments);
      };
    });

    if (typeof window.Asc.plugin.onThemeChanged === 'function') {
      window.Asc.plugin.onThemeChanged = window.Asc.plugin.onThemeChanged;
    }
  }

  function init() {
    if (!hasHost()) {
      return;
    }

    ensureStyles();
    patchPluginHooks();
    setHtmlState('r7c-guard-pending');
    ensureOverlay();
    clearTimeout(state.bootstrapTimer);
    state.bootstrapTimer = setTimeout(function () {
      if (!state.result && !state.inFlight) {
        showBlocked({ ok: false, reason: 'unavailable' });
      }
    }, 6000);
  }

  window.R7CManagerGuard = {
    verify: verify,
    queueStart: queueStart,
    flushQueue: flushQueue
  };

  init();
})(window, document);
