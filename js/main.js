// App entry point: wires the gallery, Unsplash source, settings and remote control together.
(function (MiArte) {
    'use strict';

    var KEY = MiArte.KEY;
    var HINT_MS = 6000;

    var settings = MiArte.Settings.load();
    var source = new MiArte.UnsplashSource((MiArte.config || {}).unsplashAccessKey);
    var statusEl = document.getElementById('status');
    var hintEl = document.getElementById('hint');

    var gallery = new MiArte.Gallery({
        layers: Array.prototype.slice.call(document.querySelectorAll('#stage .layer')),
        credit: document.getElementById('credit'),
        source: source,
        onStatus: function (message) {
            statusEl.textContent = message || '';
            statusEl.classList.toggle('hidden', !message);
        }
    });

    var settingsUI = new MiArte.SettingsUI(document.getElementById('settings'), {
        onSave: function (draft) {
            var previous = settings;
            settings = MiArte.Settings.save(draft);
            source.setQuery(settings.query);
            if (settings.query !== previous.query) {
                gallery.restart(minutes(settings.intervalMinutes));
            } else if (settings.intervalMinutes !== previous.intervalMinutes) {
                gallery.setIntervalMs(minutes(settings.intervalMinutes));
            }
        }
    });

    document.addEventListener('keydown', function (e) {
        if (settingsUI.isOpen()) {
            settingsUI.handleKey(e);
            return;
        }
        if (e.keyCode === KEY.ENTER) {
            hintEl.classList.add('hidden');
            settingsUI.open(settings);
        } else if (e.keyCode === KEY.BACK) {
            exitApp();
        }
    });

    // Don't rotate photos while the app is in the background.
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            gallery.pause();
        } else {
            keepScreenOn();
            gallery.resume();
        }
    });

    function minutes(n) {
        return n * 60 * 1000;
    }

    // Stop the TV screensaver from covering the gallery.
    function keepScreenOn() {
        try {
            var appcommon = window.webapis && window.webapis.appcommon;
            if (appcommon) {
                appcommon.setScreenSaver(appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF);
            }
        } catch (e) {
            console.warn('MiArte: could not disable screensaver', e);
        }
    }

    function exitApp() {
        try {
            tizen.application.getCurrentApplication().exit();
        } catch (e) {
            console.warn('MiArte: exit is only available on Tizen', e);
        }
    }

    keepScreenOn();
    source.setQuery(settings.query);
    gallery.start(minutes(settings.intervalMinutes));

    hintEl.classList.remove('hidden');
    setTimeout(function () { hintEl.classList.add('hidden'); }, HINT_MS);
})(window.MiArte = window.MiArte || {});
