/* ============================================================================
   NEW-COMPANY TEMPLATE
   Everything below is ordinary book data, not code-level master data, so a
   customer can clear the sample and keep the setup (accounts, categories,
   expense items, payment methods). The sample ledger is generated for the
   twelve months up to the day the books are first opened, so the dashboard,
   aging and VAT screens always describe a living business.
   ========================================================================== */


/* Accounts added on top of the core chart. `std` marks them as part of the
   standard template rather than something the user created. */
const TEMPLATE_ACCOUNTS = [
  ["1130", "Bank — ADCB Business A/C", "bank"],
  ["1210", "Post-dated Cheques Received", "casset"],
  ["1250", "Staff Advances", "casset"],
  ["1260", "Security Deposits", "casset"],
  ["1310", "Goods in Transit", "inventory"],
  ["1630", "Computer Equipment", "fasset"],
  ["1635", "Accumulated Depreciation — Computers", "fasset"],
  ["1640", "Motor Vehicles", "fasset"],
  ["1645", "Accumulated Depreciation — Vehicles", "fasset"],
  ["2110", "Post-dated Cheques Issued", "cliab"],
  ["2150", "Customer Advances & Deposits", "cliab"],
  ["2310", "Salaries Payable", "cliab"],
  ["2320", "Corporate Tax Payable", "cliab"],
  ["2500", "Bank Loan — Term Facility", "ncliab"],
  ["3150", "Owner's Current Account", "equity"],
  ["3900", "Opening Balance Equity", "equity"],
  ["4150", "Revenue — Software & Licences", "income"],
  ["4250", "Revenue — Support & Maintenance", "income"],
  ["5150", "Cost of Software & Licences", "cogs"],
  ["5300", "Stock Adjustments & Shrinkage", "cogs"],
  ["6110", "Sales Commission & Incentives", "expense"],
  ["6120", "Staff Medical Insurance", "expense"],
  ["6130", "End-of-Service Gratuity Expense", "expense"],
  ["6360", "Software Subscriptions & Hosting", "expense"],
  ["6460", "Loan Interest & Finance Charges", "expense"],
  ["6610", "Travel & Accommodation", "expense"],
  ["6650", "Vehicle Fuel & Maintenance", "expense"],
  ["6800", "Insurance", "expense"],
  ["6810", "Repairs & Maintenance", "expense"],
  ["6820", "Office Supplies & Stationery", "expense"],
  ["6830", "Courier & Postage", "expense"],
  ["6850", "Bad Debts Written Off", "expense"],
  ["6950", "Corporate Tax (9%)", "expense"],
].map(([code, name, type]) => ({ id: code, code, name, type, std: true }));

const _cat = (id, name, income, expense, adjustment = "5300") => ({ id, name, income, expense, inventory: "1300", adjustment });
const TEMPLATE_CATEGORIES = [
  _cat("cat_laptops", "Laptops & notebooks", "4100", "5100"),
  _cat("cat_desktops", "Desktops & workstations", "4100", "5100"),
  _cat("cat_monitors", "Monitors & displays", "4100", "5100"),
  _cat("cat_printers", "Printers & consumables", "4100", "5100"),
  _cat("cat_network", "Networking & security", "4100", "5100"),
  _cat("cat_storage", "Storage & memory", "4100", "5100"),
  _cat("cat_peripherals", "Peripherals & accessories", "4100", "5100"),
  _cat("cat_power", "Power & UPS", "4100", "5100"),
  _cat("cat_goods", "Other trading goods", "4100", "5100"),
  _cat("cat_software", "Software & licences", "4150", "5150"),
  _cat("cat_services", "Installation & cabling", "4200", "5200"),
  _cat("cat_amc", "Support & maintenance", "4250", "5200"),
  _cat("cat_consult", "IT consultancy", "4200", "5200"),
  ...[["6200", "Rent"], ["6300", "Utilities"], ["6350", "Telecom & internet"], ["6400", "Freight & clearing"],
    ["6500", "Professional fees"], ["6600", "Marketing"], ["6150", "Visa & PRO services"], ["6360", "Software subscriptions"],
    ["6650", "Vehicle running costs"], ["6800", "Insurance"], ["6820", "Office supplies"], ["6830", "Courier & postage"],
    ["6610", "Travel"], ["1630", "Capital purchases (fixed assets)"]]
    .map(([expense, name]) => _cat("cat_" + expense, name, "4900", expense, "6900")),
];

/* Expense items are part of the setup: bills and the Expenses screen need them. */
const _ex = (id, code, name, cat, uom, cost, tax = "s5") =>
  ({ id, code, name, category: cat, kind: "service", uom, price: 0, cost, tax, brand: "", packing: "", barcode: "", reorder: 0 });
const TEMPLATE_EXPENSE_ITEMS = [
  _ex("e1", "EX-RENT", "Office & Warehouse Rent", "cat_6200", "Months", 12500),
  _ex("e2", "EX-FRT", "Freight, Customs & Clearing", "cat_6400", "Shipments", 0),
  _ex("e3", "EX-PROF", "Audit & Professional Services", "cat_6500", "Engagements", 0),
  _ex("e4", "EX-MKT", "Marketing & Advertising", "cat_6600", "Campaigns", 0),
  _ex("e5", "EX-UTIL", "Electricity, Water & Cooling", "cat_6300", "Months", 0),
  _ex("e6", "EX-TEL", "Telephone & Internet", "cat_6350", "Months", 1850),
  _ex("e7", "EX-INS", "Insurance Premium", "cat_6800", "Policies", 0),
  _ex("e8", "EX-VEH", "Vehicle Fuel & Service", "cat_6650", "Bills", 0),
  _ex("e9", "EX-OFF", "Office Supplies & Stationery", "cat_6820", "Orders", 0),
  _ex("e10", "EX-COUR", "Courier & Postage", "cat_6830", "Bills", 0),
  _ex("e11", "EX-GOV", "Visa, Labour Card & PRO Fees", "cat_6150", "Applications", 0, "nt"),
  _ex("e13", "EX-SUBS", "Software Subscriptions & Hosting", "cat_6360", "Months", 1200),
  _ex("e14", "EX-TRVL", "Travel & Accommodation", "cat_6610", "Trips", 0),
  _ex("e15", "EX-ASSET", "Fixed Asset Purchase", "cat_1630", "Units", 0),
];

/* A clean company that keeps the setup. Options keep the sample masters if the customer wants them. */
function freshBooks(current, keep = {}) {
  const products = keep.products ? (current.products || []) : TEMPLATE_EXPENSE_ITEMS.map((p) => {
    const mine = (current.products || []).find((x) => x.id === p.id); return mine ? { ...mine } : { ...p }; });
  const partners = keep.partners ? (current.partners || []).map(({ pricelist, salesman, ...p }) => ({
    ...p, pricelist: keep.pricing ? pricelist || "" : "", salesman: keep.pricing ? salesman || "" : "" })) : [];
  return {
    schemaVersion: 5,
    docs: [], payments: [], manual: [], stockOps: [], assets: [], einv: {},
    accounts: current.accounts && current.accounts.length ? current.accounts : TEMPLATE_ACCOUNTS.map((a) => ({ ...a })),
    categories: current.categories && current.categories.length ? current.categories : TEMPLATE_CATEGORIES.map((c) => ({ ...c })),
    methods: current.methods || [],
    products, partners,
    priceLists: keep.pricing ? current.priceLists || [] : [],
    salespeople: keep.pricing ? current.salespeople || [] : [],
    users: keep.users || current.users || SEED_USERS,
    costing: current.costing || "avco",
  };
}
