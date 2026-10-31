include .env

TZ     := $(TIZEN_SDK)/tizen-core/tz
SDB    := $(TIZEN_SDK)/sdb
DEVICE := $(DEVICE_IP):$(DEVICE_PORT)
# tz names the package after the project folder, not output_name in tizen_web_project.yaml
WGT    := $(BUILD_TYPE)/$(notdir $(CURDIR)).wgt

# App defaults (override in .env)
DEFAULT_QUERY            ?= Autumnal
DEFAULT_INTERVAL_MINUTES ?= 2

.PHONY: all config connect devices duid check-duid build install run deploy uninstall clean profiles help

all: deploy

help: ## Show available targets
	@grep -E '^[a-z-]+:.*## ' $(firstword $(MAKEFILE_LIST)) | awk -F ':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

connect: ## Connect sdb to the device
	@$(SDB) connect $(DEVICE_IP):$(DEVICE_PORT)

devices: ## List connected devices
	@$(SDB) devices

duid: connect ## Print the device DUID
	@$(SDB) -s $(DEVICE) shell 0 getduid

check-duid: connect ## Verify device DUID matches .env and the distributor cert
	@actual=$$($(SDB) -s $(DEVICE) shell 0 getduid | tr -d '[:space:]'); \
	if [ "$$actual" != "$(DEVICE_DUID)" ]; then echo "DUID mismatch: device=$$actual .env=$(DEVICE_DUID)"; exit 1; fi; \
	if ! grep -q "$(DEVICE_DUID)" "$(CERT_DIR)/device-profile.xml"; then echo "DUID $(DEVICE_DUID) not in $(CERT_DIR)/device-profile.xml"; exit 1; fi; \
	echo "DUID OK: $$actual ($(DEVICE_MODEL))"

config: ## Generate js/config.js from .env
	$(if $(UNSPLASH_ACCESS_KEY),,$(error UNSPLASH_ACCESS_KEY is not set in .env))
	@printf '%s\n' \
		'// Generated from .env by `make config`. Do not edit or commit.' \
		'window.MiArte = window.MiArte || {};' \
		'window.MiArte.config = {' \
		'    unsplashAccessKey: "$(UNSPLASH_ACCESS_KEY)",' \
		'    defaultQuery: "$(DEFAULT_QUERY)",' \
		'    defaultIntervalMinutes: $(DEFAULT_INTERVAL_MINUTES)' \
		'};' > js/config.js
	@echo "Wrote js/config.js"

build: config ## Build and sign the .wgt package
	$(TZ) build -s $(SIGN_PROFILE) -b $(BUILD_TYPE) .
	$(TZ) pack .

install: connect ## Install the package on the device
	$(TZ) install -e $(DEVICE) -p $(WGT) .

run: connect ## Launch the app on the device
	$(TZ) run -e $(DEVICE) .

deploy: build install run ## Build, install and launch

uninstall: connect ## Remove the app from the device
	$(SDB) -s $(DEVICE) shell 0 vd_appuninstall $(APP_ID)

clean: ## Remove build output
	rm -rf $(BUILD_TYPE) .buildResult

profiles: ## List signing profiles
	@$(TZ) security-profiles list
