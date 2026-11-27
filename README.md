# Johnny Yes online order

Retail ordering page for [Johnny Yes](https://www.johnnyyes.com.au), a Melbourne tyre repair and workshop supplies business. Public prices come from the Johnny Yes product catalogue. Trade customers still apply on the main site for wholesale pricing after review.

Live shop: https://shop.johnnyyes.com.au/

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

Place order sends the order to `info@johnnyyes.com.au` through [FormSubmit](https://formsubmit.co). The endpoint is `formEndpoint` in [`js/config.js`](js/config.js):

`https://formsubmit.co/ajax/info@johnnyyes.com.au`

No account or API key is required. The browser POSTs JSON. The message includes the order reference, customer and business names, phone, email, delivery address, payment preference, notes, each line (SKU, name, option, quantity, unit price, line total), and the subtotal.

FormSubmit needs a one-time activation. The first submission sends an activation email to `info@johnnyyes.com.au`. Someone has to open that email and click the confirmation link. Until that is done, orders do not arrive as normal messages. After activation, FormSubmit can show a random alias. To hide the inbox address, replace `formEndpoint` with `https://formsubmit.co/ajax/` plus that alias.

If FormSubmit cannot be reached, the confirmation page explains that and still offers email, SMS, and copy. Those three stay on the confirmation page after a successful send as well. Nothing is charged on the site. Johnny confirms the final total and delivery.

## GitHub Pages

Pushes to `main` run [`.github/workflows/pages.yml`](.github/workflows/pages.yml), which publishes this folder with GitHub Actions.

The deploy workflow asks GitHub to turn Pages on and publish with GitHub Actions. If that is blocked, open **Settings → Pages → Build and deployment**, set the source to **GitHub Actions**, then re-run **Deploy GitHub Pages**. The public URL is:

https://shop.johnnyyes.com.au/

Links and images are relative, so the same files work on that domain and from a local server.

## Custom domain (`shop.johnnyyes.com.au`)

The shop is served at https://shop.johnnyyes.com.au/. There is **no `CNAME` file** in this repository. The custom domain is set in GitHub Pages, not by a file here. Do not add a `CNAME` file, and do not change the Pages custom-domain setting from this repo.

The DNS record for `shop` points at `vastzhuo.github.io`. That hostname is the Pages target, not a second copy of the shop. Do not point the apex domain or `www` at this shop. Those stay on the existing marketing site. Relative links already work from the site root.

## Contact

Johnny Yes  
0415 699 319  
info@johnnyyes.com.au  
https://www.johnnyyes.com.au  
Melbourne metro delivery
