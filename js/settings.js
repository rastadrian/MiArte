// User settings, persisted in localStorage.
(function (MiArte) {
    'use strict';

    var STORAGE_KEY = 'miarte.settings';
    var INTERVAL_OPTIONS = [2, 5, 10]; // minutes

    function defaults() {
        var config = MiArte.config || {};
        var interval = Number(config.defaultIntervalMinutes);
        return {
            intervalMinutes: INTERVAL_OPTIONS.indexOf(interval) >= 0 ? interval : INTERVAL_OPTIONS[0],
            query: typeof config.defaultQuery === 'string' ? config.defaultQuery : ''
        };
    }

    function normalize(raw) {
        var result = defaults();
        if (raw && INTERVAL_OPTIONS.indexOf(Number(raw.intervalMinutes)) >= 0) {
            result.intervalMinutes = Number(raw.intervalMinutes);
        }
        if (raw && typeof raw.query === 'string') {
            result.query = raw.query.trim();
        }
        return result;
    }

    MiArte.Settings = {
        INTERVAL_OPTIONS: INTERVAL_OPTIONS,

        load: function () {
            try {
                return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)));
            } catch (e) {
                return defaults();
            }
        },

        save: function (settings) {
            var normalized = normalize(settings);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            } catch (e) {
                console.warn('MiArte: could not persist settings', e);
            }
            return normalized;
        }
    };
})(window.MiArte = window.MiArte || {});
