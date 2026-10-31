// Fetches photos from the Unsplash API in batches and hands them out one at a time.
// API guidelines: https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines
(function (MiArte) {
    'use strict';

    var API_URL = 'https://api.unsplash.com';
    var BATCH_SIZE = 30;    // max allowed by /photos/random; keeps us well under the 50 req/h demo limit
    var RECENT_LIMIT = 90;  // avoid repeating photos shown in the last few batches

    function UnsplashSource(accessKey) {
        this.accessKey = accessKey;
        this.query = '';
        this.queue = [];
        this.recentIds = [];
        this.generation = 0;
    }

    UnsplashSource.prototype.setQuery = function (query) {
        query = (query || '').trim();
        if (query !== this.query) {
            this.query = query;
            this.reset();
        }
    };

    UnsplashSource.prototype.reset = function () {
        this.queue = [];
        this.generation++;
    };

    // Resolves with { id, url, photographer, photographerUrl, downloadLocation }.
    UnsplashSource.prototype.next = function (width, height) {
        var self = this;
        var ready = this.queue.length ? Promise.resolve() : this.fill();
        return ready.then(function () {
            var photo = self.queue.shift();
            self.remember(photo.id);
            return {
                id: photo.id,
                url: imageUrl(photo, width, height),
                description: photo.alt_description || photo.description || '',
                photographer: photo.user.name,
                photographerUrl: photo.user.links.html,
                downloadLocation: photo.links.download_location
            };
        });
    };

    UnsplashSource.prototype.fill = function () {
        var self = this;
        var generation = this.generation;
        var params = 'count=' + BATCH_SIZE + '&orientation=landscape&content_filter=high';
        if (this.query) {
            params += '&query=' + encodeURIComponent(this.query);
        }

        return this.request(API_URL + '/photos/random?' + params)
            .then(function (photos) {
                if (generation !== self.generation) {
                    // The query changed while we were waiting; fetch again for the new one.
                    return self.queue.length ? undefined : self.fill();
                }
                var fresh = photos.filter(function (p) {
                    return self.recentIds.indexOf(p.id) < 0;
                });
                // Small result sets repeat quickly. Reuse old photos rather than showing nothing.
                self.queue = self.queue.concat(fresh.length ? fresh : photos);
                if (!self.queue.length) {
                    throw new Error(noResultsMessage(self.query));
                }
            });
    };

    // Unsplash requires notifying this endpoint when a photo is displayed.
    UnsplashSource.prototype.trackDownload = function (photo) {
        if (photo.downloadLocation) {
            this.request(photo.downloadLocation).catch(function () { /* best effort */ });
        }
    };

    UnsplashSource.prototype.request = function (url) {
        var self = this;
        if (!this.accessKey) {
            return Promise.reject(new Error('Unsplash access key missing. Set UNSPLASH_ACCESS_KEY in .env and rebuild.'));
        }
        // client_id as a query parameter (rather than an Authorization header) keeps this a
        // simple CORS request, so no preflight round trip is needed.
        url += (url.indexOf('?') >= 0 ? '&' : '?') + 'client_id=' + encodeURIComponent(this.accessKey);
        return fetch(url).then(function (res) {
            if (res.ok) {
                return res.json();
            }
            throw new Error(errorMessage(res.status, self.query));
        }, function () {
            throw new Error('Can’t reach Unsplash. Check the network connection.');
        });
    };

    UnsplashSource.prototype.remember = function (id) {
        this.recentIds.push(id);
        if (this.recentIds.length > RECENT_LIMIT) {
            this.recentIds.shift();
        }
    };

    function imageUrl(photo, width, height) {
        // urls.raw accepts imgix parameters, so we request exactly the screen size.
        return photo.urls.raw +
            (photo.urls.raw.indexOf('?') >= 0 ? '&' : '?') +
            'w=' + width + '&h=' + height + '&fit=crop&crop=entropy&fm=jpg&q=85';
    }

    function noResultsMessage(query) {
        return query ? 'No Unsplash photos found for “' + query + '”.' : 'No Unsplash photos found.';
    }

    function errorMessage(status, query) {
        switch (status) {
            case 401: return 'Unsplash rejected the access key. Check UNSPLASH_ACCESS_KEY in .env.';
            case 403: return 'Unsplash rate limit reached. Will retry shortly.';
            case 404: return noResultsMessage(query);
            default: return 'Unsplash request failed (HTTP ' + status + ').';
        }
    }

    MiArte.UnsplashSource = UnsplashSource;
})(window.MiArte = window.MiArte || {});
