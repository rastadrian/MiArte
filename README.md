# TuArte

Tizen web app for Samsung TVs/monitors (`tv-samsung` profile, app ID `4rsM4dVtKo.TuArte`).

## Prerequisites

- Tizen Studio installed at `~/tizen-studio`, including the `tizen-core` tools.
- Samsung certificates in `~/SamsungCertificate/TuArte`, registered as the `TuArte` signing profile.
- A target device with Developer Mode enabled that lists this machine as its trusted host. Its DUID must be in the distributor certificate (`device-profile.xml`).

## Configuration

Device, signing and tooling settings live in `.env`, which the `Makefile` includes:

| Variable       | Purpose                                                   |
| -------------- | --------------------------------------------------------- |
| `DEVICE_MODEL` | Model code of the target device (informational)           |
| `DEVICE_IP`    | Device IP address                                         |
| `DEVICE_PORT`  | sdb port (default `26101`)                                |
| `DEVICE_DUID`  | Expected device DUID, checked by `make check-duid`        |
| `SIGN_PROFILE` | Tizen signing profile name                                |
| `CERT_DIR`     | Certificate folder (contains `device-profile.xml`)        |
| `APP_ID`       | Tizen application ID                                      |
| `PACKAGE_ID`   | Tizen package ID (used by `make uninstall`)               |
| `BUILD_TYPE`   | `Debug` / `Release` / `Test`; also the output folder name |
| `TIZEN_SDK`    | Path to the Tizen Studio `tools` folder                   |

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
| `make build`      | Build and sign `$(BUILD_TYPE)/TuArte.wgt`            |
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
$TZ build -s TuArte -b Debug . && $TZ pack .
$TZ install -e $DEVICE -p Debug/TuArte.wgt .
$TZ run -e $DEVICE .
$TZ uninstall -e $DEVICE -p 4rsM4dVtKo .
```

`Makefile`, `.env` and `README.md` are listed under `excludes` in `tizen_web_project.yaml`, so they stay out of the `.wgt`. Add any other non-app files there too.

## Troubleshooting

- **The legacy `tizen build-web` CLI fails with `NoClassDefFoundError: org/tizen/web/common/WebConstant`.** That CLI is broken in this install; use `tz` instead.
- **`sdb` fails with `server listener(26099) cannot bind`.** Something is blocking the local sdb server port, such as a sandbox or another sdb instance. Run `$SDB kill-server`, then connect again.
- **Install fails with a certificate or privilege error.** Check that the device DUID (`$SDB shell 0 getduid`) is listed in `~/SamsungCertificate/TuArte/device-profile.xml`.
