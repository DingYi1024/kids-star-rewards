(function initModals(globalObj) {
  function createModalService(options) {
    const {
      uiState,
      pinModal,
      pinVerifyInput,
      uiModal,
      uiModalTitle,
      uiModalMessage,
      uiModalInput,
      uiModalConfirmBtn,
      uiModalCancelBtn
    } = options;

    function openPinModal() {
      pinVerifyInput.value = "";
      uiState.pinFailCount = 0;
      pinModal.classList.remove("hidden");
      pinVerifyInput.focus();
    }

    function closePinModal() {
      pinModal.classList.add("hidden");
    }

    function closeUiModal(result) {
      uiModal.classList.add("hidden");
      uiModalInput.classList.add("hidden");
      const resolver = uiState.uiModalResolver;
      uiState.uiModalResolver = null;
      if (resolver) resolver(result);
    }

    function openUiModal(modalOptions) {
      const {
        title = "提示",
        message = "",
        confirmText = "确认",
        cancelText = "取消",
        showCancel = true,
        input = false,
        inputValue = "",
        inputPlaceholder = ""
      } = modalOptions;

      uiModalTitle.textContent = title;
      uiModalMessage.textContent = message;
      uiModalConfirmBtn.textContent = confirmText;
      uiModalCancelBtn.textContent = cancelText;
      uiModalCancelBtn.classList.toggle("hidden", !showCancel);

      if (input) {
        uiModalInput.classList.remove("hidden");
        uiModalInput.value = inputValue;
        uiModalInput.placeholder = inputPlaceholder;
      } else {
        uiModalInput.classList.add("hidden");
        uiModalInput.value = "";
        uiModalInput.placeholder = "";
      }

      uiModal.classList.remove("hidden");
      if (input) uiModalInput.focus();
      else uiModalConfirmBtn.focus();

      return new Promise((resolve) => {
        uiState.uiModalResolver = resolve;
      });
    }

    async function showAlert(message, title = "提示") {
      await openUiModal({ title, message, confirmText: "我知道了", showCancel: false });
    }

    async function showConfirm(message, title = "确认") {
      const result = await openUiModal({ title, message, confirmText: "确认", cancelText: "取消", showCancel: true });
      return result.confirmed;
    }

    async function showPrompt(message, defaultValue = "", title = "请输入") {
      const result = await openUiModal({
        title,
        message,
        confirmText: "确认",
        cancelText: "取消",
        showCancel: true,
        input: true,
        inputValue: defaultValue,
        inputPlaceholder: "请输入"
      });
      if (!result.confirmed) return null;
      return result.value;
    }

    function bindUiModalEvents() {
      uiModalConfirmBtn.addEventListener("click", () => {
        closeUiModal({ confirmed: true, value: uiModalInput.value });
      });

      uiModalCancelBtn.addEventListener("click", () => {
        closeUiModal({ confirmed: false, value: "" });
      });

      uiModal.addEventListener("click", (event) => {
        if (event.target === uiModal) {
          closeUiModal({ confirmed: false, value: "" });
        }
      });

      uiModalInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          uiModalConfirmBtn.click();
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !uiModal.classList.contains("hidden")) {
          closeUiModal({ confirmed: false, value: "" });
        }
      });
    }

    return {
      openPinModal,
      closePinModal,
      showAlert,
      showConfirm,
      showPrompt,
      bindUiModalEvents
    };
  }

  globalObj.KSRModals = {
    createModalService
  };
}(window));
