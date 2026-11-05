# Store languages

The navigation language switch selects English or Arabic. The selection is saved
under `salebeast-language`; a first visit uses the browser language. Arabic sets
the document language to `ar` and direction to `rtl`.

Use `useLanguage()` for interface strings (`t`), prices (`formatPrice`), errors
(`errorText`), and product content (`productText`). Interface translation keys are
the English text, with Arabic values in `ar.json`. Variables use `{name}` syntax.

`productText(product, field)` reads `ar_name`, `ar_desc`, or `ar_key_features` in
Arabic. Null, missing, and whitespace-only translations fall back independently
to the corresponding English field. Keep the original product object in the cart
so switching languages can resolve both names without changing prices or quantities.

Categories and delivery locations use `dataName(record)`, preferring a nonempty
`ar_name`, then a known interface translation, then the original name. The location
API and product category lookup safely read optional Arabic fields, so those tables
do not require a schema change. Add Arabic names there for complete data coverage.

Run `npm test`, `npm run lint`, and `npm run build` from `frontend`, and `npm test`
from `backend`. Deploy both applications to enable Arabic product responses and search.
