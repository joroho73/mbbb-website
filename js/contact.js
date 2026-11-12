(() => {
  const form = document.getElementById("enquiry-form");
  if (!form) return;
  const button = form.querySelector('[type="submit"]');
  const status = document.getElementById("enquiry-status");
  let sending = false;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    sending = true;
    button.disabled = true;
    form.setAttribute("aria-busy", "true");
    status.classList.remove("is-success");
    status.textContent = "Sending your enquiry…";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        throw new Error(result.message || "Your enquiry could not be sent.");
      }
      status.textContent = result.message;
      status.classList.add("is-success");
      form.reset();
    } catch (error) {
      status.textContent = error instanceof SyntaxError || error instanceof TypeError
        ? "We could not confirm that your enquiry was sent. Your details are still here. Please try again or use the email link below."
        : `${error.message} Your details are still here.`;
    } finally {
      sending = false;
      button.disabled = false;
      form.removeAttribute("aria-busy");
    }
  });
  button.disabled = false;
})();

