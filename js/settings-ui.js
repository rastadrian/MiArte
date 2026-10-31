// Settings dialog, navigable with the TV remote (arrows, OK, Back) or a mouse.
(function (MiArte) {
    'use strict';

    var KEY = MiArte.KEY;

    function SettingsUI(root, options) {
        var self = this;
        this.root = root;
        this.onSave = options.onSave;
        this.rows = Array.prototype.slice.call(root.querySelectorAll('[data-row]'));
        this.options = Array.prototype.slice.call(root.querySelectorAll('.option'));
        this.actions = Array.prototype.slice.call(root.querySelectorAll('.action'));
        this.input = root.querySelector('#query-input');
        this.rowIndex = 0;
        this.actionIndex = 0;
        this.draft = null;

        this.options.forEach(function (button) {
            button.addEventListener('click', function () {
                self.draft.intervalMinutes = Number(button.dataset.value);
                self.rowIndex = self.indexOfRow('interval');
                self.render();
            });
        });
        this.actions.forEach(function (button, i) {
            button.addEventListener('click', function () {
                self.actionIndex = i;
                self.activateAction();
            });
        });
        this.input.addEventListener('focus', function () {
            self.rowIndex = self.indexOfRow('query');
            self.render();
        });
    }

    SettingsUI.prototype.isOpen = function () {
        return !this.root.classList.contains('hidden');
    };

    SettingsUI.prototype.open = function (settings) {
        this.draft = { intervalMinutes: settings.intervalMinutes, query: settings.query };
        this.input.value = settings.query;
        this.rowIndex = 0;
        this.actionIndex = 0;
        this.root.classList.remove('hidden');
        this.render();
    };

    SettingsUI.prototype.close = function () {
        this.input.blur();
        this.root.classList.add('hidden');
    };

    SettingsUI.prototype.handleKey = function (e) {
        var key = e.keyCode;

        // While the text field has focus, let the IME/typing handle most keys.
        if (document.activeElement === this.input) {
            if (key === KEY.ENTER || key === KEY.IME_DONE || key === KEY.IME_CANCEL || key === KEY.BACK) {
                e.preventDefault();
                this.input.blur();
            } else if (key === KEY.UP || key === KEY.DOWN) {
                e.preventDefault();
                this.input.blur();
                this.moveRow(key === KEY.UP ? -1 : 1);
            }
            return;
        }

        switch (key) {
            case KEY.UP: this.moveRow(-1); break;
            case KEY.DOWN: this.moveRow(1); break;
            case KEY.LEFT: this.moveHorizontal(-1); break;
            case KEY.RIGHT: this.moveHorizontal(1); break;
            case KEY.ENTER: this.activate(); break;
            case KEY.BACK:
            case KEY.ESCAPE: this.close(); break;
            default: return;
        }
        e.preventDefault();
    };

    SettingsUI.prototype.moveRow = function (delta) {
        this.rowIndex = Math.max(0, Math.min(this.rows.length - 1, this.rowIndex + delta));
        this.render();
    };

    SettingsUI.prototype.moveHorizontal = function (delta) {
        var row = this.currentRow();
        if (row === 'interval') {
            var values = MiArte.Settings.INTERVAL_OPTIONS;
            var i = values.indexOf(this.draft.intervalMinutes) + delta;
            this.draft.intervalMinutes = values[Math.max(0, Math.min(values.length - 1, i))];
        } else if (row === 'actions') {
            this.actionIndex = Math.max(0, Math.min(this.actions.length - 1, this.actionIndex + delta));
        }
        this.render();
    };

    SettingsUI.prototype.activate = function () {
        switch (this.currentRow()) {
            case 'interval': this.moveRow(1); break;
            case 'query': this.input.focus(); break; // opens the on-screen keyboard on the TV
            case 'actions': this.activateAction(); break;
        }
    };

    SettingsUI.prototype.activateAction = function () {
        if (this.actions[this.actionIndex].dataset.action === 'save') {
            this.draft.query = this.input.value.trim();
            this.onSave(this.draft);
        }
        this.close();
    };

    SettingsUI.prototype.currentRow = function () {
        return this.rows[this.rowIndex].dataset.row;
    };

    SettingsUI.prototype.indexOfRow = function (name) {
        return this.rows.findIndex(function (row) { return row.dataset.row === name; });
    };

    SettingsUI.prototype.render = function () {
        var self = this;
        var row = this.currentRow();
        this.rows.forEach(function (el, i) {
            el.classList.toggle('focused', i === self.rowIndex);
        });
        this.options.forEach(function (el) {
            el.classList.toggle('selected', Number(el.dataset.value) === self.draft.intervalMinutes);
        });
        this.actions.forEach(function (el, i) {
            el.classList.toggle('focused', row === 'actions' && i === self.actionIndex);
        });
    };

    MiArte.SettingsUI = SettingsUI;
})(window.MiArte = window.MiArte || {});
