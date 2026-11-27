# Johnny Yes online order

Retail ordering page for [Johnny Yes](https://www.johnnyyes.com.au), a Melbourne tyre repair and workshop supplies business. Public prices come from the Johnny Yes product catalogue. Trade customers still apply on the main site for wholesale pricing after review.

Live shop: https://vastzhuo.github.io/johnnyyes-order/

Delivery is across Melbourne metro only. Payment is arranged offline. The page does not take card payments, and it does not state a GST treatment or a delivery fee. Johnny confirms the final total and delivery.

## Edit products and prices

All retail items live in [`data/products.json`](data/products.json).

- `price` is a number in Australian dollars, with no `$` sign. Every option of an item uses that same price.
- `spec` is the catalogue line. Use a real newline in the JSON string when the catalogue wraps the spec onto a second line.
- `category` is one of `consumables`, `tools`, `wheel`, or `valve`.
- `option` is optional:
  - `"type": "select"` with `choices` when the catalogue names the choices (pack size, scraper colour).
  - `"type": "text"` when the catalogue says there are options but does not list them (cutter shape, wrench size). Leave the price unchanged.

Shop settings, including the contact email, SMS number, and the optional form backend, are in [`js/config.js`](js/config.js).

## Run it locally

The catalogue is loaded with `fetch`, so open the site through a local web server rather than as a file.

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080/

## How an order is sent

There is no server. Checkout stores the cart in `localStorage` and, when the customer continues, builds an order summary on the device. The summary includes the order reference, items, SKUs, options, quantities, line totals, subtotal, and the customer details.

The customer can then:

- email `info@johnnyyes.com.au` with the subject and body filled in
- text `0415 699 319`
- copy the full summary
- print the confirmation

If an email or messages app shortens the link, the full summary is on the confirmation page and can be copied.

### Add a form backend later

In `js/config.js`, set `formEndpoint` to a URL that accepts `POST` with `Content-Type: application/json`. Leave it as `""` until then. The shop does not need an account or an API key.

Two services that fit:

- **Formspree:** use the form endpoint, for example `https://formspree.io/f/xxxxxxxx`. The JSON includes `_subject` and `order_text`, which Formspree will show in the submission.
- **Google Sheets:** deploy a Google Apps Script web app that accepts a JSON POST and appends a row, then paste that web app URL into `formEndpoint`.

When `formEndpoint` is set, the page also POSTs the order. Email, SMS, and copy stay available either way. A failed POST does not discard the summary.

## GitHub Pages

Pushes to `main` run [`.github/workflows/pages.yml`](.github/workflows/pages.yml), which publishes this folder with GitHub Actions.

The Pages source must be **GitHub Actions** (Settings → Pages → Build and deployment). The public URL is:

https://vastzhuo.github.io/johnnyyes-order/

Links and images are relative, so the same files work at that path and, later, at a subdomain served from the site root.

## Custom domain later (`shop.johnnyyes.com.au`)

DNS for `johnnyyes.com.au` is not controlled from this repository. There is **no `CNAME` file** on purpose, so GitHub Pages keeps serving https://vastzhuo.github.io/johnnyyes-order/ and does not claim the subdomain yet.

When you can edit DNS:

1. At the DNS host for `johnnyyes.com.au`, add a **CNAME** record:
   - Host: `shop`
   - Target: `vastzhuo.github.io`
2. Wait until `shop.johnnyyes.com.au` resolves to `vastzhuo.github.io`.
3. In this repository, open **Settings → Pages → Custom domain** and enter `shop.johnnyyes.com.au`. Saving that setting is what adds the `CNAME` file. Do that only after step 1 is in place.
4. After the check succeeds, turn on **Enforce HTTPS**.

Do not point the apex domain or `www` at this shop. Those stay on the existing marketing site. No code change is required for the subdomain: relative URLs already work from the site root.

## Contact

Johnny Yes  
0415 699 319  
info@johnnyyes.com.au  
https://www.johnnyyes.com.au  
Melbourne metro delivery
