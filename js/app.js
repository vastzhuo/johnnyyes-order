(function () {
  const CART_KEY = "johnnyyes-cart-v1";
  const ORDER_KEY = "johnnyyes-order-last";
  const cfg = window.JOHNNYYES || {};

  let products = [];
  let categories = [];
  let bySku = new Map();

  const $ = (id) => document.getElementById(id);

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function money(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return "$0";
    const digits = Number.isInteger(value) ? 0 : 2;
    return "$" + value.toLocaleString("en-AU", {
      minimumFractionDigits: digits,
      maximumFractionDigits: Math.max(digits, 2)
    });
  }

  function clamp(qty) {
    const n = Math.round(Number(qty));
    if (!Number.isFinite(n) || n < 1) return 1;
    if (n > 99) return 99;
    return n;
  }

  function lineKey(sku, option) {
    return sku + "||" + (option || "");
  }

  function readCart() {
    try {
      const data = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (!Array.isArray(data)) return [];
      return data
        .filter((item) => item && typeof item.sku === "string")
        .map((item) => ({
          sku: item.sku,
          option: typeof item.option === "string" ? item.option : "",
          qty: clamp(item.qty)
        }));
    } catch (error) {
      return [];
    }
  }

  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function readOrder() {
    try {
      const order = JSON.parse(sessionStorage.getItem(ORDER_KEY) || "null");
      if (!order || !order.reference || !Array.isArray(order.items)) return null;
      return order;
    } catch (error) {
      return null;
    }
  }

  function writeOrder(order) {
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
  }

  function currentView() {
    const hash = location.hash.replace(/^#/, "");
    if (hash === "cart" || hash === "checkout" || hash === "confirm") return hash;
    return "shop";
  }

  function cartCount(cart) {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function cartSubtotal(cart) {
    return cart.reduce((sum, item) => {
      const product = bySku.get(item.sku);
      if (!product) return sum;
      return sum + Number(product.price) * item.qty;
    }, 0);
  }

  function knownCart() {
    return readCart().filter((item) => bySku.has(item.sku));
  }

  function refresh() {
    const cart = knownCart();
    const count = cartCount(cart);
    const view = currentView();
    $("cart-count").textContent = String(count);
    $("cart-link").setAttribute("aria-label", "Cart, " + count + (count === 1 ? " item" : " items"));
    const showBar = count > 0 && view === "shop";
    $("cart-bar").hidden = !showBar;
    document.body.classList.toggle("has-cart-bar", showBar);
    if (showBar) $("bar-total").textContent = money(cartSubtotal(cart)) + " AUD";
    if (view === "cart") renderCart(cart);
    if (view === "checkout") renderCheckoutSummary(cart);
  }

  function applyView(scroll) {
    let name = currentView();
    if (name === "checkout" && knownCart().length === 0) {
      name = "cart";
      history.replaceState(null, "", "#cart");
    }
    if (name === "confirm" && !readOrder()) {
      name = "shop";
      history.replaceState(null, "", "#shop");
    }
    for (const view of ["shop", "cart", "checkout", "confirm"]) {
      $(view).hidden = view !== name;
    }
    document.body.classList.toggle("is-confirm", name === "confirm");
    const titles = {
      shop: "Johnny Yes | Order tyre repair supplies",
      cart: "Your order | Johnny Yes",
      checkout: "Checkout | Johnny Yes"
    };
    if (titles[name]) document.title = titles[name];
    if (name === "confirm") renderConfirm();
    refresh();
    if (scroll) window.scrollTo(0, 0);
  }

  function renderOption(product) {
    const option = product.option;
    if (!option) return "";
    if (option.type === "select") {
      const choices = (option.choices || [])
        .map((choice) => `<option value="${esc(choice)}">${esc(choice)}</option>`)
        .join("");
      return `<label class="option">${esc(option.label)}
        <span class="hint">Same price for each option.</span>
        <select data-option>${choices}</select>
      </label>`;
    }
    return `<label class="option">${esc(option.label)}
      <span class="hint">Optional. Same price either way.</span>
      <input data-option type="text" maxlength="80" placeholder="${esc(option.placeholder || "")}">
    </label>`;
  }

  function renderCard(product) {
    return `<article class="card" data-sku="${esc(product.sku)}">
      <img src="${esc(product.image)}" alt="${esc(product.name)}" width="320" height="320">
      <div class="card-body">
        <div class="card-top">
          <span class="badge">${esc(product.number)}</span>
          <p class="price">${money(product.price)} <abbr title="Australian dollars">AUD</abbr></p>
        </div>
        <h3>${esc(product.name)}</h3>
        <p class="spec">${esc(product.spec).replace(/\n/g, "<br>")}</p>
        <p class="sku">SKU · ${esc(product.sku)}</p>
        ${renderOption(product)}
        <div class="card-actions">
          <div class="qty" role="group" aria-label="Quantity for ${esc(product.name)}">
            <button type="button" data-action="dec" aria-label="Decrease quantity">−</button>
            <input data-qty type="number" min="1" max="99" value="1" inputmode="numeric" aria-label="Quantity">
            <button type="button" data-action="inc" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="btn btn-primary" data-action="add">Add to order</button>
        </div>
      </div>
    </article>`;
  }

  function renderCatalogue() {
    $("category-nav").innerHTML = categories
      .map((category) => `<a class="chip" href="#cat-${esc(category.id)}">${esc(category.name)}</a>`)
      .join("");
    $("catalogue").innerHTML = categories.map((category) => {
      const items = products
        .filter((product) => product.category === category.id)
        .slice()
        .sort((a, b) => a.number.localeCompare(b.number));
      return `<section class="category" id="cat-${esc(category.id)}">
        <h2>${esc(category.name)}</h2>
        <p class="category-summary">${esc(category.summary)}</p>
        <div class="grid">${items.map(renderCard).join("")}</div>
      </section>`;
    }).join("");
  }

  function addLine(sku, option, qty) {
    if (!bySku.has(sku)) return;
    const cart = knownCart();
    const key = lineKey(sku, option);
    const existing = cart.find((item) => lineKey(item.sku, item.option) === key);
    if (existing) existing.qty = clamp(existing.qty + qty);
    else cart.push({ sku, option, qty: clamp(qty) });
    writeCart(cart);
    refresh();
  }

  function renderCart(cart) {
    const empty = cart.length === 0;
    $("cart-empty").hidden = !empty;
    $("cart-filled").hidden = empty;
    if (empty) {
      $("cart-lines").innerHTML = "";
      return;
    }
    $("cart-lines").innerHTML = cart.map((item) => {
      const product = bySku.get(item.sku);
      const key = lineKey(item.sku, item.option);
      const lineTotal = Number(product.price) * item.qty;
      const option = item.option ? `<p class="line-meta">${esc(item.option)}</p>` : "";
      return `<article class="cart-line" data-key="${esc(key)}">
        <img src="${esc(product.image)}" alt="">
        <div>
          <h3>${esc(product.number)} · ${esc(product.name)}</h3>
          <p class="line-meta">SKU · ${esc(product.sku)} · ${money(product.price)} each</p>
          ${option}
          <div class="line-bottom">
            <div class="qty" role="group" aria-label="Quantity for ${esc(product.name)}">
              <button type="button" data-action="dec" aria-label="Decrease quantity">−</button>
              <input data-qty type="number" min="1" max="99" value="${item.qty}" inputmode="numeric" aria-label="Quantity">
              <button type="button" data-action="inc" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" class="remove" data-action="remove">Remove</button>
            <span class="line-total">${money(lineTotal)}</span>
          </div>
        </div>
      </article>`;
    }).join("");
    $("cart-subtotal").textContent = money(cartSubtotal(cart)) + " AUD";
  }

  function renderCheckoutSummary(cart) {
    if (!cart.length) {
      $("checkout-summary").innerHTML = "<p>Your order is empty.</p>";
      return;
    }
    const lines = cart.map((item) => {
      const product = bySku.get(item.sku);
      const option = item.option ? ` (${item.option})` : "";
      const lineTotal = Number(product.price) * item.qty;
      return `<li><span>${esc(product.number)} ${esc(product.name)}${esc(option)} × ${item.qty}</span><span>${money(lineTotal)}</span></li>`;
    }).join("");
    $("checkout-summary").innerHTML = `<ul class="lines">${lines}</ul>
      <p class="subtotal"><span>Subtotal</span><strong>${money(cartSubtotal(cart))} AUD</strong></p>
      <p class="fine">Melbourne metro delivery. Johnny confirms the final total and delivery. Payment is arranged offline.</p>`;
  }

  function formatDate(iso) {
    const parts = iso.split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !part)) return iso;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  }

  function buildOrderText(order) {
    const lines = [
      `Johnny Yes order ${order.reference}`,
      "Retail order. Payment is arranged offline. There is no card payment on this site.",
      "Johnny confirms the final total and delivery.",
      "",
      `Business: ${order.business}`,
      `Contact: ${order.contact}`,
      `Phone: ${order.phone}`,
      `Email: ${order.email}`,
      "Delivery: Melbourne metro",
      `Address: ${order.address}`,
      `Preferred delivery date: ${order.deliveryDateLabel}`,
      `Payment: ${order.payment}`,
      `Notes: ${order.notes || "None"}`,
      "",
      "Items"
    ];
    for (const item of order.items) {
      const option = item.option ? ` (${item.option})` : "";
      lines.push(`${item.number} ${item.sku} ${item.name}${option} x${item.qty} @ ${money(item.unitPrice)} = ${money(item.lineTotal)}`);
    }
    lines.push("");
    lines.push(`Subtotal: ${money(order.subtotal)} AUD`);
    lines.push("Public retail prices. Johnny confirms the final total and delivery.");
    return lines.join("\n");
  }

  function buildMailto(order) {
    const subject = encodeURIComponent(`Johnny Yes order ${order.reference}`);
    const body = encodeURIComponent(buildOrderText(order).replace(/\n/g, "\r\n"));
    return `mailto:${cfg.email || "info@johnnyyes.com.au"}?subject=${subject}&body=${body}`;
  }

  function buildSms(order) {
    const body = encodeURIComponent(buildOrderText(order));
    const number = cfg.smsNumber || "0415699319";
    const ua = navigator.userAgent || "";
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return ios ? `sms:${number}&body=${body}` : `sms:${number}?body=${body}`;
  }

  function detailsHtml(order) {
    const rows = [
      ["Business", order.business],
      ["Contact", order.contact],
      ["Phone", order.phone],
      ["Email", order.email],
      ["Delivery", "Melbourne metro"],
      ["Address", order.address],
      ["Preferred delivery date", order.deliveryDateLabel],
      ["Payment", order.payment],
      ["Notes", order.notes || "None"]
    ];
    const items = order.items.map((item) => {
      const option = item.option ? ` (${item.option})` : "";
      return `<li><span>${esc(item.number)} ${esc(item.sku)} ${esc(item.name)}${esc(option)} × ${item.qty}</span><span>${money(item.lineTotal)}</span></li>`;
    }).join("");
    return `<dl>${rows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>
      <h2>Items</h2>
      <ul class="lines">${items}</ul>
      <p class="subtotal"><span>Subtotal</span><strong>${money(order.subtotal)} AUD</strong></p>
      <p class="fine">Public retail prices. Johnny confirms the final total and delivery. There is no card payment on this site.</p>`;
  }

  function paintFormStatus(order) {
    const status = $("send-status");
    if (!order) return;
    if (order.formResult === "sending") {
      status.textContent = "Sending a copy through the order form…";
    } else if (order.formResult === "sent") {
      status.textContent = "A copy was submitted through the order form. You can also email or text Johnny. Nothing has been charged on this site.";
    } else if (order.formResult === "failed") {
      status.textContent = "The order form could not be reached (" + (order.formError || "request failed") + "). Send the order by email, SMS, or copy. Nothing has been charged.";
    } else {
      status.textContent = "This order stays on this device until you send it. Email, text, or copy it to Johnny. Nothing has been charged, and there is no card payment on this site.";
    }
  }

  function renderConfirm() {
    const order = readOrder();
    if (!order) return;
    document.title = `Order ${order.reference} | Johnny Yes`;
    $("order-reference").textContent = `Order ${order.reference}`;
    const text = buildOrderText(order);
    $("order-text").textContent = text;
    $("send-email").href = buildMailto(order);
    $("send-sms").href = buildSms(order);
    $("order-details").innerHTML = detailsHtml(order);
    paintFormStatus(order);
  }

  function showErrors(errors) {
    const box = $("form-errors");
    const form = $("checkout-form");
    for (const el of form.querySelectorAll("[aria-invalid]")) el.removeAttribute("aria-invalid");
    if (!errors.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = `<p>Please fix the following:</p><ul>${errors.map((error) => `<li>${esc(error[1])}</li>`).join("")}</ul>`;
    for (const [name] of errors) {
      if (name === "payment") {
        $("payment-field").setAttribute("aria-invalid", "true");
        continue;
      }
      const field = form.querySelector(`[name="${name}"]`);
      if (field) field.setAttribute("aria-invalid", "true");
    }
  }

  function validate(form) {
    const payment = form.querySelector('input[name="payment"]:checked');
    const data = {
      business: form.business.value.trim(),
      contact: form.contact.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      deliveryDate: form.deliveryDate.value,
      notes: form.notes.value.trim(),
      payment: payment ? payment.value : ""
    };
    const errors = [];
    if (!data.business) errors.push(["business", "Enter the business or shop name."]);
    if (!data.contact) errors.push(["contact", "Enter a contact name."]);
    if (data.phone.replace(/\D/g, "").length < 8) errors.push(["phone", "Enter a phone number."]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push(["email", "Enter a valid email address."]);
    if (data.address.length < 8) errors.push(["address", "Enter the Melbourne metro delivery address."]);
    if (data.deliveryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const chosen = new Date(data.deliveryDate + "T00:00:00");
      if (Number.isNaN(chosen.getTime()) || chosen < today) {
        errors.push(["deliveryDate", "Choose today or a future delivery date, or leave it blank."]);
      }
    }
    if (!data.payment) errors.push(["payment", "Choose how you would like to pay."]);
    return { data, errors };
  }

  function makeReference() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    let suffix = "";
    for (const byte of bytes) suffix += alphabet[byte % alphabet.length];
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `JY-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${suffix}`;
  }

  async function submitFormEndpoint(order) {
    const endpoint = String(cfg.formEndpoint || "").trim();
    if (!endpoint) return;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          _subject: `Johnny Yes order ${order.reference}`,
          order_text: buildOrderText(order),
          ...order
        })
      });
      if (!response.ok) throw new Error("status " + response.status);
      order.formResult = "sent";
    } catch (error) {
      order.formResult = "failed";
      order.formError = error && error.message ? error.message : "request failed";
    }
    writeOrder(order);
    if (currentView() === "confirm") paintFormStatus(order);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (copyError) { ok = false; }
      area.remove();
      return ok;
    }
  }

  function bind() {
    $("catalogue").addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const card = button.closest("[data-sku]");
      if (!card) return;
      const qtyInput = card.querySelector("[data-qty]");
      if (button.dataset.action === "inc" || button.dataset.action === "dec") {
        const delta = button.dataset.action === "inc" ? 1 : -1;
        qtyInput.value = String(clamp((parseInt(qtyInput.value, 10) || 1) + delta));
        return;
      }
      if (button.dataset.action === "add") {
        const optionEl = card.querySelector("[data-option]");
        const option = optionEl ? optionEl.value.trim() : "";
        addLine(card.dataset.sku, option, clamp(qtyInput.value));
        qtyInput.value = "1";
        button.textContent = "Added";
        window.setTimeout(() => { button.textContent = "Add to order"; }, 900);
      }
    });

    $("cart-lines").addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const row = button.closest("[data-key]");
      if (!row) return;
      const key = row.dataset.key;
      const cart = knownCart();
      const item = cart.find((line) => lineKey(line.sku, line.option) === key);
      if (!item) return;
      if (button.dataset.action === "remove") {
        writeCart(cart.filter((line) => lineKey(line.sku, line.option) !== key));
      } else if (button.dataset.action === "inc" || button.dataset.action === "dec") {
        item.qty = clamp(item.qty + (button.dataset.action === "inc" ? 1 : -1));
        writeCart(cart);
      } else {
        return;
      }
      refresh();
    });

    $("cart-lines").addEventListener("change", (event) => {
      if (!event.target.matches("[data-qty]")) return;
      const row = event.target.closest("[data-key]");
      const cart = knownCart();
      const item = cart.find((line) => lineKey(line.sku, line.option) === row.dataset.key);
      if (!item) return;
      item.qty = clamp(event.target.value);
      writeCart(cart);
      refresh();
    });

    $("checkout-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const { data, errors } = validate(form);
      const cart = knownCart();
      if (!cart.length) errors.unshift(["", "Your order is empty."]);
      showErrors(errors);
      if (errors.length) {
        const first = errors[0][0] && form.querySelector(`[name="${errors[0][0]}"]`);
        if (first) first.focus();
        else $("form-errors").focus?.();
        return;
      }
      const items = cart.map((item) => {
        const product = bySku.get(item.sku);
        const lineTotal = Number(product.price) * item.qty;
        return {
          number: product.number,
          sku: product.sku,
          name: product.name,
          option: item.option,
          qty: item.qty,
          unitPrice: Number(product.price),
          lineTotal
        };
      });
      const endpoint = String(cfg.formEndpoint || "").trim();
      const order = {
        reference: makeReference(),
        business: data.business,
        contact: data.contact,
        phone: data.phone,
        email: data.email,
        address: data.address,
        deliveryDate: data.deliveryDate,
        deliveryDateLabel: data.deliveryDate ? formatDate(data.deliveryDate) : "Not specified",
        payment: data.payment,
        notes: data.notes,
        items,
        subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
        formResult: endpoint ? "sending" : "skipped"
      };
      writeOrder(order);
      writeCart([]);
      if (location.hash === "#confirm") applyView(true);
      else location.hash = "#confirm";
      submitFormEndpoint(order);
    });

    $("copy-order").addEventListener("click", async () => {
      const order = readOrder();
      if (!order) return;
      const ok = await copyText(buildOrderText(order));
      $("copy-status").textContent = ok
        ? "Order copied."
        : "Could not copy automatically. Select the message below and copy it.";
    });

    $("print-order").addEventListener("click", () => window.print());
    window.addEventListener("hashchange", () => {
      const hash = location.hash.replace(/^#/, "");
      const major = hash === "" || hash === "shop" || hash === "cart" || hash === "checkout" || hash === "confirm";
      applyView(major);
    });
  }

  async function init() {
    const date = $("delivery-date");
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    date.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    bind();
    try {
      const response = await fetch("data/products.json");
      if (!response.ok) throw new Error("status " + response.status);
      const data = await response.json();
      categories = data.categories || [];
      products = data.products || [];
      bySku = new Map(products.map((product) => [product.sku, product]));
      const cleaned = knownCart();
      if (cleaned.length !== readCart().length) writeCart(cleaned);
      renderCatalogue();
    } catch (error) {
      $("catalogue").innerHTML = `<p class="notice">The catalogue could not be loaded. Call Johnny on <a href="tel:0415699319">${esc(cfg.phoneDisplay || "0415 699 319")}</a> or email <a href="mailto:${esc(cfg.email || "info@johnnyyes.com.au")}">${esc(cfg.email || "info@johnnyyes.com.au")}</a>.</p>`;
    }
    applyView(false);
    const hash = location.hash.replace(/^#/, "");
    if (hash.startsWith("cat-") || hash === "catalogue") {
      const target = document.getElementById(hash);
      if (target) target.scrollIntoView();
    }
  }

  init();
})();
