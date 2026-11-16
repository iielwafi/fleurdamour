# Fleur d’Amour

A responsive static storefront starter for a handmade satin-flower bouquet brand.

## Current experience
- French-language home page with an abstract Canvas halftone hero illustration
- Product catalogue with search, category filters and product detail dialog
- Basket saved in the visitor's browser, with quantity controls
- Quote-request form with customer contact and delivery details
- Quote summary can be copied and sent manually by the customer

## Stack
- HTML5, CSS3 and Vanilla JavaScript
- Canvas for the decorative halftone illustration
- Playwright for browser tests
- CircleCI configuration in `.circleci/config.yml`
- Netlify static hosting configuration in `netlify.toml`

## Run locally
```bash
npm install
npx playwright install chromium
npm test
```

Or serve the project root with any static HTTP server.

## Important before accepting real orders
- Product artwork is currently illustrative placeholders, not actual product photographs.
- Product names and descriptions are draft examples; confirm them against the real catalogue.
- No prices, stock, shipping fees, payments, customer database, or order backend are configured.
- The quote form copies a formatted request to the customer's clipboard; it does not send or store the request on a server.
- Add a verified business email or WhatsApp integration before inviting customers to order.
- Configure and test the live Netlify deployment before publishing it.
