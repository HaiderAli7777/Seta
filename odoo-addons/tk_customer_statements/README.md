# Customer Statements (Odoo 19)

Statements of account for customers, as PDF, Excel or email.

## Statements

| Statement | Shows |
|---|---|
| **Account Activity** | Opening balance on the start date, then every invoice, credit note, payment, refund and manual entry of the period with a running balance, then the closing balance. |
| **Outstanding Invoices** | Everything still open on the statement date (invoices, credit notes, unapplied payments) with due date and days overdue. Payments made after that date don't count, so a past statement can be reprinted exactly as it was. |

Both can show an **aging summary** (Not Due, 1-30, 31-60, 61-90, 91-120, over 120 days; the interval is a setting).

Figures come from the posted entries on the customer's receivable accounts, in company currency, so the statement always agrees with the customer ledger. Drafts and cancelled entries never appear. Contacts are grouped under their company. Customer payments that are still *In Process* without a journal entry (a payment method with no outstanding account, in Odoo 19 with the Accounting app) are counted too, against the invoices they were registered for.

## Where

* **Invoicing > Customers > Statements**, **Invoicing > Reporting > Partner Reports > Customer Statements**, **Contacts > Customer Statements**
* **Action > Customer Statement** on any customer list (several customers at once) or form
* **Print > Customer Statement** on a customer: what is outstanding today, in one click

In the wizard: choose the statement, the dates, the customers (or *All Customers* for month-end runs), then

* **Print PDF**: one statement per customer, each in the customer's language
* **Export Excel**: one sheet per customer, plus a summary sheet with balances and aging when there are several
* **Send by Email**: one customer opens the email editor with the PDF attached, to check before sending. Several customers are sent at once and each email is logged on the customer. Emails go to the customer's *Invoice* address contact if there is one. The text is the email template *Customer Statement: Send by email*.

## Settings

**Settings > Invoicing > Customer Statements** (per company):

* Introduction and payment instruction texts (translatable)
* Bank accounts to print (empty: all bank accounts of the company)
* Aging interval in days
* Letterhead: a banner printed across the top of each page instead of the standard company header (*Settings > General > Document Layout*)
* Signature / stamp image, printed above *Authorised Signatory*

## Access

Billing and accounting users can use statements. Give other users (for example sales people) the group **Customer Statements** to let them print and send statements without other accounting access.

## Upgrading from 1.0

* The letterhead banner and the stamp that 1.0 printed are copied into the company settings on upgrade, so statements keep their look.
* Bank details are no longer written in the report: add the company's bank account under *Settings > Invoicing > Customer Statements > Bank Accounts* (or on the company's contact).
* The wording ("Dear Sir", payment terms) now comes from the two text settings; adjust them once after upgrading.
