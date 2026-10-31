# MiArte

Tizen web app for Samsung TVs/monitors (`tv-samsung` profile, app ID `4rsM4dVtKo.MiArte`).

MiArte shows a full-screen photo gallery from [Unsplash](https://unsplash.com/developers). It displays a photo, waits for the configured interval, fully loads the next photo, then cross-fades to it, indefinitely.

## Using the app

| Remote key       | Action                                     |
| ---------------- | ------------------------------------------ |
| OK               | Open settings                              |
| Up / Down        | Move between settings rows                 |
| Left / Right     | Change the interval, or pick Save / Cancel |
| OK on the search | Open the on-screen keyboard                |
| Back             | Close settings without saving, or exit     |

Settings: the rotation interval (2, 5 or 10 minutes) and the Unsplash search term (leave it empty for random photos). They're saved on the device in `localStorage`.

## How it works

| File                 | Role                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| `js/main.js`         | Entry point: wires everything up, handles remote keys, keeps the screen on |
| `js/gallery.js`      | Rotation timer, preloading into a hidden layer, cross-fade, retry backoff |
| `js/unsplash.js`     | Fetches photos in batches of 30 from `/photos/random`; attribution and download tracking |
| `js/settings.js`     | Loads and saves settings                                                 |
| `js/settings-ui.js`  | Remote-navigable settings dialog                                         |
| `js/keys.js`         | Remote key codes                                                         |
| `js/config.js`       | **Generated** from `.env` by `make config` (gitignored)                  |

The Unsplash demo tier allows 50 requests/hour. The app makes one request per 30 photos, plus the download ping Unsplash requires for each photo shown, so it stays under the limit even at the 2-minute interval. As the API guidelines require, each photo shows a "Photo by … on Unsplash" credit.

## Prerequisites

- Tizen Studio installed at `~/tizen-studio`, including the `tizen-core` tools.
- Samsung certificates in `~/SamsungCertificate/MiArte`, registered as the `MiArte` signing profile.
- A target device with Developer Mode enabled that lists this machine as its trusted host. Its DUID must be in the distributor certificate (`device-profile.xml`).

## Configuration

Device, signing and tooling settings live in `.env`, which the `Makefile` includes. To get started, copy `.env-template` to `.env` and fill in the values:

| Variable       | Purpose                                                   |
| -------------- | --------------------------------------------------------- |
| `DEVICE_MODEL` | Model code of the target device (informational)           |
| `DEVICE_IP`    | Device IP address                                         |
| `DEVICE_PORT`  | sdb port (default `26101`)                                |
| `DEVICE_DUID`  | Expected device DUID, checked by `make check-duid`        |
| `SIGN_PROFILE` | Tizen signing profile name                                |
| `CERT_DIR`     | Certificate folder (contains `device-profile.xml`)        |
| `APP_ID`       | Tizen application ID (used by `make uninstall`)           |
| `PACKAGE_ID`   | Tizen package ID                                          |
| `BUILD_TYPE`   | `Debug` / `Release` / `Test`; also the output folder name |
| `TIZEN_SDK`    | Path to the Tizen Studio `tools` folder                   |
| `UNSPLASH_ACCESS_KEY` | Unsplash API access key, embedded in `js/config.js` |
| `UNSPLASH_APP_ID`, `UNSPLASH_SECRET_KEY` | Not used by the app. The secret key is never packaged |
| `DEFAULT_QUERY` | Optional. Initial search term (default `Autumnal`)       |
| `DEFAULT_INTERVAL_MINUTES` | Optional. Initial interval: `2`, `5` or `10` (default `2`) |

You can override any of them for a single run, e.g. `make deploy DEVICE_IP=192.168.178.50`.

## Build, sign, deploy

```sh
make deploy      # build + sign + install + launch (also the default target)
```

Individual targets (`make help` lists them all):

| Target            | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `make connect`    | Connect sdb to the device                            |
| `make devices`    | List connected devices                               |
| `make duid`       | Print the device DUID                                |
| `make check-duid` | Check the device DUID against `.env` and the cert    |
| `make config`     | Generate `js/config.js` from `.env`                  |
| `make build`      | Generate config, build and sign `$(BUILD_TYPE)/<folder>.wgt`|
| `make install`    | Install the package on the device                    |
| `make run`        | Launch the app on the device                         |
| `make uninstall`  | Remove the app from the device                       |
| `make clean`      | Remove build output                                  |
| `make profiles`   | List signing profiles                                |

### Underlying commands

The Makefile wraps these commands:

```sh
TZ=~/tizen-studio/server/sdktools/data/tools/tizen-core/tz
SDB=~/tizen-studio/server/sdktools/data/tools/sdb
DEVICE=192.168.178.31:26101

$SDB connect $DEVICE
$SDB -s $DEVICE shell 0 getduid
$TZ build -s MiArte -b Debug . && $TZ pack .
$TZ install -e $DEVICE -p Debug/MiArte.wgt .
$TZ run -e $DEVICE .
$SDB -s $DEVICE shell 0 vd_appuninstall 4rsM4dVtKo.MiArte
```

`Makefile`, `.env`, `.env-template`, `README.md`, `.git/` and `.gitignore` are listed under `excludes` in `tizen_web_project.yaml`, so they stay out of the `.wgt`. Add any other non-app files there too.

## Testing in a desktop browser

Run `make config`, then serve the folder (e.g. `python3 -m http.server`) and open `index.html`. Esc stands in for the Back key. The `$WEBAPIS` script and screensaver control are only available on the TV, so a 404 for that script is expected.

## Troubleshooting

- **The app shows "Unsplash rate limit reached".** The demo tier's 50 requests/hour are used up. The app keeps retrying with backoff. Apply for production access on the Unsplash developer dashboard to raise the limit.

- **The legacy `tizen build-web` CLI fails with `NoClassDefFoundError: org/tizen/web/common/WebConstant`.** That CLI is broken in this install; use `tz` instead.
- **`sdb` fails with `server listener(26099) cannot bind`.** Something is blocking the local sdb server port, such as a sandbox or another sdb instance. Run `$SDB kill-server`, then connect again.
- **Install fails with a certificate or privilege error.** Check that the device DUID (`$SDB shell 0 getduid`) is listed in `~/SamsungCertificate/MiArte/device-profile.xml`.
