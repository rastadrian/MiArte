include .env

TZ     := $(TIZEN_SDK)/tizen-core/tz
SDB    := $(TIZEN_SDK)/sdb
DEVICE := $(DEVICE_IP):$(DEVICE_PORT)
WGT    := $(BUILD_TYPE)/TuArte.wgt

.PHONY: all connect devices duid check-duid build install run deploy uninstall clean profiles help

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

build: ## Build and sign the .wgt package
	$(TZ) build -s $(SIGN_PROFILE) -b $(BUILD_TYPE) .
	$(TZ) pack .

install: connect ## Install the package on the device
	$(TZ) install -e $(DEVICE) -p $(WGT) .

run: connect ## Launch the app on the device
	$(TZ) run -e $(DEVICE) .

deploy: build install run ## Build, install and launch

uninstall: connect ## Remove the app from the device
	$(TZ) uninstall -e $(DEVICE) -p $(PACKAGE_ID) .

clean: ## Remove build output
	rm -rf $(BUILD_TYPE) .buildResult

profiles: ## List signing profiles
	@$(TZ) security-profiles list
