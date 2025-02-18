function saveOptions() {
  const triggerKey = (document.getElementById("triggerKey") as HTMLInputElement)
    .value;
  chrome.storage.sync.set({ triggerKey }, () => {
    const saved = document.getElementById("saved");
    if (saved) {
      saved.classList.add("visible");
      setTimeout(() => {
        saved.classList.remove("visible");
      }, 2000);
    }
  });
}

function restoreOptions() {
  chrome.storage.sync.get({ triggerKey: "" }, (items) => {
    (document.getElementById("triggerKey") as HTMLInputElement).value =
      items.triggerKey;
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
(document.getElementById("triggerKey") as HTMLInputElement).addEventListener(
  "input",
  saveOptions,
);
