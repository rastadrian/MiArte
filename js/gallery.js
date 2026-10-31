// Shows a photo, waits for the configured interval, fully loads the next photo
// into a hidden layer, then cross-fades to it. Repeats indefinitely.
(function (MiArte) {
    'use strict';

    var FADE_MS = 3000;           // keep in sync with .layer transition in style.css
    var MIN_RETRY_MS = 15 * 1000;
    var MAX_RETRY_MS = 5 * 60 * 1000;
    var MAX_IMAGE_SIZE = 3840;

    function Gallery(options) {
        this.layers = options.layers;
        this.credit = options.credit;
        this.source = options.source;
        this.onStatus = options.onStatus || function () {};
        this.front = -1;          // index of the visible layer, -1 before the first photo
        this.intervalMs = 0;
        this.timer = null;
        this.token = 0;           // increments to cancel in-flight loads
        this.retryMs = MIN_RETRY_MS;
        this.paused = false;
    }

    Gallery.prototype.start = function (intervalMs) {
        this.intervalMs = intervalMs;
        this.advance();
    };

    // Applies a new interval, counted from now.
    Gallery.prototype.setIntervalMs = function (intervalMs) {
        this.intervalMs = intervalMs;
        this.schedule(intervalMs);
    };

    // Shows a new photo right away (e.g. after the search changed).
    Gallery.prototype.restart = function (intervalMs) {
        this.intervalMs = intervalMs;
        this.retryMs = MIN_RETRY_MS;
        this.advance();
    };

    Gallery.prototype.pause = function () {
        this.paused = true;
        clearTimeout(this.timer);
    };

    Gallery.prototype.resume = function () {
        this.paused = false;
        this.schedule(this.intervalMs);
    };

    Gallery.prototype.schedule = function (delayMs) {
        var self = this;
        clearTimeout(this.timer);
        if (!this.paused) {
            this.timer = setTimeout(function () { self.advance(); }, delayMs);
        }
    };

    Gallery.prototype.advance = function () {
        var self = this;
        var token = ++this.token;
        var size = screenSize();
        var back = this.layers[this.front === 0 ? 1 : 0];
        var photo;

        clearTimeout(this.timer);

        return this.source.next(size.width, size.height)
            .then(function (p) {
                photo = p;
                if (token === self.token) {
                    return loadInto(back, photo.url);
                }
            })
            .then(function () {
                if (token !== self.token) {
                    return;
                }
                back.alt = photo.description;
                self.crossfade(back, photo);
                self.source.trackDownload(photo);
                self.retryMs = MIN_RETRY_MS;
                self.onStatus(null);
                self.schedule(self.intervalMs);
            })
            .catch(function (err) {
                if (token !== self.token) {
                    return;
                }
                console.error('MiArte:', err);
                self.onStatus(err.message);
                self.schedule(self.retryMs);
                self.retryMs = Math.min(self.retryMs * 2, MAX_RETRY_MS);
            });
    };

    Gallery.prototype.crossfade = function (layer, photo) {
        var credit = this.credit;
        var previous = this.layers[this.front];

        layer.classList.add('visible');
        if (previous) {
            previous.classList.remove('visible');
        }
        this.front = this.layers.indexOf(layer);

        credit.classList.remove('visible');
        setTimeout(function () {
            credit.textContent = 'Photo by ' + photo.photographer + ' on Unsplash';
            credit.classList.add('visible');
        }, FADE_MS / 2);
    };

    function loadInto(img, url) {
        return new Promise(function (resolve, reject) {
            img.onload = function () {
                // decode() ensures the fade doesn't stutter while the image is decoded.
                if (img.decode) {
                    img.decode().then(resolve, resolve);
                } else {
                    resolve();
                }
            };
            img.onerror = function () {
                reject(new Error('Couldn’t load the image. Trying another one shortly.'));
            };
            img.src = url;
        });
    }

    function screenSize() {
        var ratio = window.devicePixelRatio || 1;
        var width = Math.round(window.innerWidth * ratio);
        var height = Math.round(window.innerHeight * ratio);
        var scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(width, height));
        return {
            width: Math.round(width * scale),
            height: Math.round(height * scale)
        };
    }

    MiArte.Gallery = Gallery;
})(window.MiArte = window.MiArte || {});
