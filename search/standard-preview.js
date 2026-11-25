"use strict";

// Reader summaries are already in the document. Search creates the same markup
// from the local index, then enhances it when a results group is inserted.
function standardPreviewLink(code, href, summary, id) {
  const group = document.createElement("span");
  group.className = "standard-ref";
  const link = document.createElement("a");
  link.href = href;
  link.id = id;
  link.textContent = code;

  const panel = document.createElement("span");
  panel.className = "standard-panel";
  panel.id = id + "-panel";
  panel.hidden = true;
  const description = document.createElement("span");
  description.className = "standard-summary";
  description.id = panel.id + "-summary";
  description.textContent = "Standard summary: " + summary;
  const notice = document.createElement("a");
  notice.href = "#standards-notice";
  notice.textContent = "Standards attribution";
  panel.append(description, " ", notice);
  group.append(link, " ", panel);
  return group;
}

(() => {
  let current = null;
  let pinned = false;

  function hide(restore = false) {
    if (!current) return;
    const group = current;
    const panel = group.querySelector(".standard-panel");
    const button = group.querySelector(".standard-toggle");
    // Restore focus before clearing current so focusin cannot reopen it.
    if (restore && panel.contains(document.activeElement)) button.focus({preventScroll: true});
    current = null;
    pinned = false;
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    for (const trigger of [group.firstElementChild, button]) trigger.removeAttribute("aria-describedby");
  }

  function show(group) {
    if (group === current) return;
    hide();
    current = group;
    const panel = group.querySelector(".standard-panel");
    const button = group.querySelector(".standard-toggle");
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    for (const trigger of [group.firstElementChild, button]) {
      trigger.setAttribute("aria-describedby", panel.querySelector(".standard-summary").id);
    }
  }

  function enable(container) {
    for (const group of container.querySelectorAll(".standard-ref")) {
      if (group.querySelector(".standard-toggle")) continue;
      const link = group.firstElementChild;
      const panel = group.querySelector(".standard-panel");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "standard-toggle";
      button.textContent = "Preview";
      button.setAttribute("aria-label", "Preview standard " + link.textContent);
      button.setAttribute("aria-controls", panel.id);
      button.setAttribute("aria-expanded", "false");
      const close = document.createElement("button");
      close.type = "button";
      close.className = "standard-close";
      close.textContent = "Close preview";
      panel.before(button, " ");
      panel.append(" ", close);

      group.addEventListener("pointerenter", event => {
        if (event.pointerType !== "touch") show(group);
      });
      group.addEventListener("pointerleave", event => {
        if (current === group && !pinned && event.pointerType !== "touch" &&
            !group.contains(document.activeElement)) hide();
      });
      group.addEventListener("focusin", event => {
        if (event.target === link || event.target === button) show(group);
      });
      group.addEventListener("focusout", event => {
        if (current === group && !group.contains(event.relatedTarget)) hide();
      });
      button.addEventListener("click", () => {
        if (current === group && pinned) hide();
        else {
          show(group);
          pinned = true;
        }
      });
      // WebKit can blur the trigger before delivering a click inside its panel.
      // Keep the target available through activation, including modified link clicks.
      panel.addEventListener("mousedown", event => {
        if (event.button === 0 && group.contains(document.activeElement) &&
            event.target.closest("a, button")) event.preventDefault();
      });
      close.addEventListener("click", () => {
        // WebKit may leave focus on the body when a native button is tapped.
        button.focus({preventScroll: true});
        hide();
      });
    }
  }

  document.addEventListener("keydown", event => {
    if (current && event.key === "Escape") {
      event.preventDefault();
      hide(true);
    }
  });
  document.addEventListener("pointerdown", event => {
    if (current && !current.contains(event.target)) hide();
  });
  window.addEventListener("pagehide", () => hide());
  window.enableStandardPreviews = enable;
  enable(document);
})();
