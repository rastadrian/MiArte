// Remote-control key codes. Arrows, OK (Enter) and Back are delivered to Tizen
// TV web apps without registering them through tizen.tvinputdevice.
(function (MiArte) {
    'use strict';

    MiArte.KEY = {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        ENTER: 13,
        ESCAPE: 27,       // desktop stand-in for Back
        BACK: 10009,
        IME_DONE: 65376,  // on-screen keyboard "Done"
        IME_CANCEL: 65385 // on-screen keyboard "Cancel"
    };
})(window.MiArte = window.MiArte || {});
