/* ============================================================================
   SAMPLE COMPANY & NEW-COMPANY TEMPLATE
   Everything below is ordinary book data, not code-level master data, so a
   customer can clear the sample and keep the setup (accounts, categories,
   expense items, payment methods). The sample ledger is generated for the
   twelve months up to the day the books are first opened, so the dashboard,
   aging and VAT screens always describe a living business.
   ========================================================================== */

const SAMPLE_VERSION = 1;

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

/* A storable product: id, code, name, brand, category, price, cost, reorder level, monthly units, packing, unit. */
const _g = (id, code, name, brand, category, price, cost, reorder, pace, packing = "Box of 1", uom = "Units") =>
  ({ id, code, name, brand, category, kind: "goods", uom, packing, price, cost, tax: "s5", reorder, pace });
const _s = (id, code, name, category, uom, price, cost = 0) =>
  ({ id, code, name, brand: "", category, kind: "service", uom, packing: "", price, cost, tax: "s5", reorder: 0, pace: 0 });
const SAMPLE_PRODUCTS = [
  _g("g1", "LT-EB14", 'HP EliteBook 840 G10 14" i7 / 16GB / 512GB', "HP", "cat_laptops", 3450, 2480, 6, 14),
  _g("g2", "LT-TP15", 'Lenovo ThinkPad E15 15.6" i5 / 16GB / 1TB', "Lenovo", "cat_laptops", 4180, 3010, 5, 9),
  _g("g7", "LT-LAT54", 'Dell Latitude 5440 14" i5 / 16GB / 512GB', "Dell", "cat_laptops", 3290, 2390, 6, 11),
  _g("g8", "LT-MBA13", 'Apple MacBook Air 13" M3 / 16GB / 512GB', "Apple", "cat_laptops", 5199, 4290, 3, 4),
  _g("g9", "LT-PB450", 'HP ProBook 450 G10 15.6" i5 / 8GB / 512GB', "HP", "cat_laptops", 2650, 1920, 8, 13),
  _g("g10", "LT-IP5", 'Lenovo IdeaPad Slim 5 14" Ryzen 7 / 16GB', "Lenovo", "cat_laptops", 2899, 2140, 4, 6),
  _g("g11", "DT-OPT70", "Dell OptiPlex 7010 SFF i7 / 16GB / 512GB", "Dell", "cat_desktops", 3350, 2460, 4, 8),
  _g("g12", "DT-Z2G9", "HP Z2 G9 Tower Workstation i9 / 32GB / 1TB", "HP", "cat_desktops", 8950, 6880, 2, 2),
  _g("g13", "DT-NUC13", "ASUS NUC 13 Pro Mini PC i5 / 16GB / 512GB", "ASUS", "cat_desktops", 2390, 1720, 3, 4),
  _g("g3", "MN-27Q", 'LG UltraGear 27" QHD IPS 165Hz Monitor', "LG", "cat_monitors", 1180, 790, 6, 12),
  _g("g14", "MN-P24", 'Dell P2425H 24" FHD IPS Monitor', "Dell", "cat_monitors", 699, 468, 10, 20),
  _g("g15", "MN-S34", 'Samsung ViewFinity 34" Ultrawide WQHD', "Samsung", "cat_monitors", 1890, 1345, 2, 3),
  _g("g16", "MN-E27", 'HP E27 G5 27" FHD IPS Monitor', "HP", "cat_monitors", 820, 560, 6, 9),
  _g("g17", "PR-M404", "HP LaserJet Pro M404dn Mono Printer", "HP", "cat_printers", 1150, 820, 3, 5),
  _g("g18", "PR-L3250", "Epson EcoTank L3250 Wi-Fi All-in-One", "Epson", "cat_printers", 699, 485, 4, 6),
  _g("g19", "PR-MF455", "Canon i-SENSYS MF455dw Laser MFP", "Canon", "cat_printers", 1690, 1210, 2, 3),
  _g("g20", "TN-59A", "HP 59A Black LaserJet Toner Cartridge", "HP", "cat_printers", 389, 262, 10, 18),
  _g("g21", "PP-A480", "Double A A4 Copy Paper 80gsm", "Double A", "cat_printers", 129, 88, 20, 45, "Carton of 5 reams", "Cartons"),
  _g("g22", "NW-C9200", "Cisco Catalyst 9200L 24-Port PoE+ Switch", "Cisco", "cat_network", 6450, 4980, 1, 1.5),
  _g("g23", "NW-U6PRO", "Ubiquiti UniFi U6 Pro Wi-Fi 6 Access Point", "Ubiquiti", "cat_network", 845, 590, 8, 14),
  _g("g24", "NW-ER605", "TP-Link ER605 Gigabit VPN Router", "TP-Link", "cat_network", 289, 185, 5, 7),
  _g("g25", "NW-CAT6", "Cat6 UTP Network Cable 305m", "Schneider", "cat_network", 365, 238, 6, 9, "Box of 305 m", "Boxes"),
  _g("g26", "NW-FG40F", "Fortinet FortiGate 40F Firewall", "Fortinet", "cat_network", 2450, 1820, 2, 2),
  _g("g6", "SSD-T7S2", "Samsung T7 Shield Portable SSD 2TB", "Samsung", "cat_storage", 740, 486, 8, 16),
  _g("g27", "HD-WDR4", "WD Red Plus 4TB NAS Hard Drive", "Western Digital", "cat_storage", 489, 342, 8, 12),
  _g("g28", "NS-DS923", "Synology DS923+ 4-Bay NAS Enclosure", "Synology", "cat_storage", 2390, 1795, 2, 2),
  _g("g29", "RAM-K16", "Kingston FURY 16GB DDR5 4800 SO-DIMM", "Kingston", "cat_storage", 245, 158, 10, 18),
  _g("g30", "USB-SD128", "SanDisk Ultra Flair 128GB USB 3.0 Drive", "SanDisk", "cat_storage", 49, 28, 30, 55, "Pack of 1"),
  _g("g4", "KB-MXM", "Logitech MX Mechanical Wireless Keyboard", "Logitech", "cat_peripherals", 385, 226, 10, 22),
  _g("g31", "MS-MX3S", "Logitech MX Master 3S Wireless Mouse", "Logitech", "cat_peripherals", 369, 245, 10, 20),
  _g("g32", "HS-EV65", "Jabra Evolve2 65 Wireless Headset", "Jabra", "cat_peripherals", 799, 545, 5, 8),
  _g("g33", "WC-C920", "Logitech C920 HD Pro Webcam", "Logitech", "cat_peripherals", 299, 189, 6, 10),
  _g("g34", "BG-TG15", 'Targus 15.6" Classic Laptop Backpack', "Targus", "cat_peripherals", 179, 98, 10, 16),
  _g("g35", "MK-270", "Logitech MK270 Wireless Keyboard & Mouse", "Logitech", "cat_peripherals", 119, 72, 15, 30),
  _g("g5", "DK-WD19", "Dell WD19S USB-C Docking Station", "Dell", "cat_peripherals", 620, 398, 6, 10),
  _g("g36", "UPS-1500", "APC Back-UPS Pro 1500VA", "APC", "cat_power", 1290, 905, 3, 5),
  _g("g37", "UPS-3KRM", "APC Smart-UPS 3000VA Rack-Mount", "APC", "cat_power", 5890, 4420, 1, 1),
  _g("g38", "PS-BLK8", "Belkin 8-Outlet Surge Protector", "Belkin", "cat_power", 139, 82, 10, 16),
  _s("sw1", "SW-M365", "Microsoft 365 Business Standard (annual)", "cat_software", "Licences", 520, 410),
  _s("sw2", "SW-W11P", "Windows 11 Pro Licence", "cat_software", "Licences", 699, 545),
  _s("sw3", "SW-ESET", "ESET PROTECT Endpoint Security (1 year)", "cat_software", "Licences", 145, 96),
  _s("sw4", "SW-ACLT", "Autodesk AutoCAD LT (annual)", "cat_software", "Licences", 2150, 1790),
  _s("s1", "SV-INST", "On-site Installation & Configuration", "cat_services", "Hours", 220),
  _s("s4", "SV-CABL", "Structured Cabling — per Network Point", "cat_services", "Points", 185),
  _s("s2", "SV-AMC", "Annual Maintenance Contract (monthly fee)", "cat_amc", "Months", 1500),
  _s("s5", "SV-HELP", "Remote Helpdesk Support", "cat_amc", "Hours", 160),
  _s("s3", "SV-CONS", "IT Infrastructure Consultancy", "cat_consult", "Days", 2600),
  _s("s6", "SV-BKUP", "Backup & Disaster Recovery Setup", "cat_consult", "Projects", 950),
];

/* Internal-use barcodes (GS1 prefix 2 is reserved for in-store numbering). */
function sampleBarcode(n) {
  const body = "2" + String(4800000000 + n * 7919).padStart(11, "0").slice(-11);
  const sum = body.split("").reduce((s, d, i) => s + +d * (i % 2 ? 3 : 1), 0);
  return body + ((10 - (sum % 10)) % 10);
}

const _cu = (id, name, emirate, terms, trn, address, contact, phone, extra = {}) =>
  ({ id, name, role: "customer", emirate, terms, trn, address, contact, phone, salesman: "", pricelist: "", ...extra });
const _ve = (id, name, emirate, terms, trn, address, contact, phone, extra = {}) =>
  ({ id, name, role: "vendor", emirate, terms, trn, address, contact, phone, salesman: "", pricelist: "", ...extra });
const SAMPLE_PARTNERS = [
  _cu("p1", "Al Futtaim Electronics L.L.C.", "Dubai", 30, "100234567800003", "Festival Plaza, Dubai Festival City", "ap@afelectronics.ae", "+971501234567", { salesman: "u3", pricelist: "pl_trade" }),
  _cu("p2", "Jumeirah Hospitality Group", "Dubai", 45, "100889221400003", "Umm Suqeim 3, Jumeirah Road", "finance@jhg.ae", "+971502345678", { salesman: "sp_rashid", pricelist: "pl_corporate" }),
  _cu("p3", "Gulf Marine Supplies FZE", "Sharjah", 30, "100561203900003", "Hamriyah Free Zone, Phase 2", "accounts@gulfmarine.ae", "+971503456789", { salesman: "sp_meera", designatedZone: true }),
  _cu("p4", "Capital Business Centre — Abu Dhabi", "Abu Dhabi", 60, "100556677800003", "Al Maryah Island, Tower B", "payables@cbc.ae", "+971504567890", { salesman: "sp_rashid", pricelist: "pl_corporate" }),
  _cu("p5", "Nova Retail Concepts L.L.C.", "Dubai", 15, "100774411900003", "Al Quoz Industrial 3", "hello@novaretail.ae", "+971505678901", { salesman: "u3", pricelist: "pl_trade" }),
  _cu("p6", "Riyadh Tech Distribution Co.", "Export", 30, "", "Olaya District, Riyadh, KSA", "po@riyadhtech.sa", "+966501234567", { salesman: "u1", export: true }),
  _cu("p7", "Emirates Schools Group", "Abu Dhabi", 45, "100312458800003", "Khalifa City A, Street 14", "procurement@esg.ae", "+971506781234", { salesman: "sp_meera", pricelist: "pl_edu" }),
  _cu("p8", "Desert Rose Clinics L.L.C.", "Dubai", 30, "100423987100003", "Al Wasl Road, Jumeirah 1", "accounts@desertroseclinics.ae", "+971507892345", { salesman: "sp_meera", pricelist: "pl_edu" }),
  _cu("p9", "Sharjah Logistics Hub FZE", "Sharjah", 30, "100678345200003", "Sharjah Airport Free Zone, Q3-112", "finance@shjlogistics.ae", "+971508903456", { salesman: "u3" }),
  _cu("p10", "Al Noor Engineering Consultants", "Abu Dhabi", 45, "100198763500003", "Electra Street, Abu Dhabi", "ap@alnoor-eng.ae", "+971509014567", { salesman: "sp_rashid", pricelist: "pl_corporate" }),
  _cu("p11", "Bluewave Marketing Studio", "Dubai", 15, "100845612700003", "Dubai Design District, Building 7", "studio@bluewave.ae", "+971521125678", { salesman: "u3" }),
  _cu("p12", "Ras Al Khaimah Ceramics Trading", "Ras Al Khaimah", 60, "100367189400003", "Al Hamra Industrial Zone", "accounts@rakceramicstrading.ae", "+971522236789", { salesman: "sp_rashid" }),
  _cu("p13", "Fujairah Port Services L.L.C.", "Fujairah", 45, "100734590600003", "Port of Fujairah, Admin Block", "finance@fujportservices.ae", "+971523347890", { salesman: "u1" }),
  _cu("p14", "Crescent Coworking — Ajman", "Ajman", 15, "100926471300003", "Ajman Corniche, Crescent Tower", "admin@crescentcowork.ae", "+971524458901", { salesman: "u3" }),
  _cu("p15", "Oasis Real Estate Brokers", "Dubai", 30, "100583217600003", "Marina Plaza, Dubai Marina", "office@oasisrealestate.ae", "+971525569012", { salesman: "sp_meera" }),
  _cu("p16", "Muscat Digital Solutions L.L.C.", "Export", 30, "", "Al Khuwair, Muscat, Oman", "orders@muscatdigital.om", "+96891234567", { salesman: "u1", pricelist: "pl_trade", export: true }),
  _cu("p17", "Walk-in Customer — Cash Sales", "Dubai", 0, "", "Showroom counter", "", "", { salesman: "u3" }),
  _cu("p18", "Golden Sands Hotel Apartments", "Dubai", 30, "100651928300003", "Al Barsha 1, Sheikh Zayed Road", "accounts@goldensandsha.ae", "+971526670123", { salesman: "sp_rashid" }),
  _cu("p19", "Al Ain Medical Centre", "Abu Dhabi", 45, "100472836900003", "Al Jimi District, Al Ain", "finance@alainmedical.ae", "+971527781234", { salesman: "sp_meera", pricelist: "pl_edu" }),
  _cu("p20", "UAQ Marine Club", "Umm Al Quwain", 30, "100219384700003", "Marine Club Road, Umm Al Quwain", "office@uaqmarineclub.ae", "+971528892345", { salesman: "u3" }),
  _ve("v1", "Shenzhen Kingtech Industrial Ltd.", "Import", 30, "", "Bao'an District, Shenzhen, China", "sales@kingtech.cn", "+8675512345678", { import: true }),
  _ve("v2", "Emirates Computer Trading L.L.C.", "Dubai", 30, "100331122500003", "Al Fahidi Street, Bur Dubai", "ar@ectdubai.ae", "+97143531200"),
  _ve("v3", "Falcon Logistics & Clearing", "Dubai", 15, "100998877600003", "Jebel Ali Free Zone, South", "billing@falconlog.ae", "+97148812300"),
  _ve("v4", "Burlington Tower Facilities", "Dubai", 7, "100445566700003", "Business Bay, Dubai", "leasing@burlington.ae", "+97145127700"),
  _ve("v5", "Meridian Audit & Advisory", "Dubai", 30, "100112233400003", "One Central, DWTC", "invoices@meridianaudit.ae", "+97143316600"),
  _ve("v6", "Gulf IT Distribution FZCO", "Dubai", 45, "100287461900003", "JAFZA South, Warehouse 21", "credit@gulfitdist.ae", "+97148836400", { pricelist: "pl_gitd" }),
  _ve("v7", "Netlink Middle East FZE", "Dubai", 30, "100516732800003", "Dubai Silicon Oasis, Block C", "ar@netlinkme.ae", "+97143726500"),
  _ve("v8", "Dubai Electricity & Water Authority", "Dubai", 15, "100031457200003", "Al Garhoud, Dubai", "customercare@dewa.gov.ae", "+97146019999"),
  _ve("v9", "Etisalat Business Services", "Dubai", 15, "100027684100003", "Etisalat Business Centre, Deira", "business@etisalat.ae", "+97144000101"),
  _ve("v10", "Arabian Motors Trading L.L.C.", "Dubai", 0, "100734862500003", "Al Aweer Auto Market, Dubai", "fleet@arabianmotors.ae", "+97143345500"),
  _ve("v11", "Gulf Shield Insurance P.S.C.", "Dubai", 30, "100183746500003", "Port Saeed, Deira", "corporate@gulfshield.ae", "+97142946100"),
  _ve("v12", "Smart Office Supplies Trading", "Sharjah", 30, "100628374100003", "Industrial Area 4, Sharjah", "orders@smartoffice.ae", "+97165437700"),
  _ve("v13", "Spark Digital Advertising L.L.C.", "Dubai", 30, "100847261300003", "Media City, Building 3", "billing@sparkdigital.ae", "+97144529900"),
  _ve("v14", "CloudSoft Licensing FZ-LLC", "Dubai", 30, "100392847600003", "Dubai Internet City, Building 14", "licensing@cloudsoft.ae", "+97143908800"),
  _ve("v15", "Swift Courier Services L.L.C.", "Dubai", 15, "100561839200003", "Al Qusais Industrial 2", "accounts@swiftcourier.ae", "+97142673300"),
  _ve("v16", "Bayan Government Services Centre", "Dubai", 0, "100273819400003", "Al Mankhool, Bur Dubai", "pro@bayanservices.ae", "+97143579900"),
  _ve("v17", "Al Bustan Fuel Station L.L.C.", "Dubai", 0, "100918273600003", "Al Khail Road, Al Quoz", "", "+97143381100"),
];

const SAMPLE_SALESPEOPLE = [
  { id: "u3", name: "Omar Siddiqui", active: true },
  { id: "sp_rashid", name: "Rashid Al Mansoori", active: true },
  { id: "sp_meera", name: "Meera Pillai", active: true },
  { id: "u1", name: "Haider Ali", active: true },
];

/* What each customer tends to buy: category weights, order size, orders per month and payment habit. */
const SAMPLE_PROFILES = {
  p1: { mix: { cat_peripherals: 4, cat_storage: 3, cat_monitors: 2, cat_laptops: 2, cat_power: 1 }, size: 2.6, freq: 2.0, pay: "prompt" },
  p2: { mix: { cat_monitors: 2, cat_desktops: 2, cat_printers: 2, cat_network: 2, cat_power: 1 }, size: 1.6, freq: 1.1, pay: "slow", amc: 2 },
  p3: { mix: { cat_laptops: 3, cat_network: 2, cat_power: 1, cat_software: 1 }, size: 1.0, freq: 0.7, pay: "prompt", consult: true },
  p4: { mix: { cat_laptops: 3, cat_monitors: 2, cat_network: 1, cat_desktops: 1, cat_software: 1 }, size: 1.7, freq: 0.9, pay: "partial", amc: 1 },
  p5: { mix: { cat_peripherals: 4, cat_storage: 2, cat_printers: 2, cat_power: 1 }, size: 1.5, freq: 1.2, pay: "prompt" },
  p6: { mix: { cat_laptops: 4, cat_storage: 2, cat_monitors: 1 }, size: 2.8, freq: 0.6, pay: "prompt" },
  p7: { mix: { cat_laptops: 4, cat_printers: 2, cat_network: 2, cat_software: 2 }, size: 2.6, freq: 0.7, pay: "slow", school: true },
  p8: { mix: { cat_desktops: 3, cat_printers: 2, cat_power: 2, cat_software: 1 }, size: 1.3, freq: 0.7, pay: "prompt", amc: 1 },
  p9: { mix: { cat_laptops: 2, cat_network: 2, cat_power: 1, cat_peripherals: 1 }, size: 1.1, freq: 0.6, pay: "prompt" },
  p10: { mix: { cat_desktops: 3, cat_monitors: 3, cat_software: 2, cat_storage: 1 }, size: 1.3, freq: 0.6, pay: "slow", consult: true },
  p11: { mix: { cat_laptops: 2, cat_monitors: 2, cat_peripherals: 2 }, size: 0.6, freq: 0.5, pay: "prompt" },
  p12: { mix: { cat_desktops: 2, cat_printers: 2, cat_power: 1, cat_peripherals: 1 }, size: 1.1, freq: 0.5, pay: "late" },
  p13: { mix: { cat_network: 3, cat_power: 2, cat_laptops: 1 }, size: 1.4, freq: 0.4, pay: "slow", consult: true },
  p14: { mix: { cat_network: 2, cat_monitors: 2, cat_peripherals: 2 }, size: 0.7, freq: 0.5, pay: "prompt" },
  p15: { mix: { cat_laptops: 2, cat_printers: 2, cat_software: 2 }, size: 0.8, freq: 0.5, pay: "prompt" },
  p16: { mix: { cat_storage: 3, cat_peripherals: 3, cat_network: 1 }, size: 2.0, freq: 0.4, pay: "prompt" },
  p17: { mix: { cat_peripherals: 4, cat_storage: 3, cat_printers: 2 }, size: 0.25, freq: 3.2, pay: "cash" },
  p18: { mix: { cat_monitors: 2, cat_network: 2, cat_power: 1 }, size: 0.9, freq: 0.5, pay: "slow" },
  p19: { mix: { cat_desktops: 3, cat_printers: 2, cat_power: 1, cat_software: 1 }, size: 1.1, freq: 0.5, pay: "slow" },
  p20: { mix: { cat_laptops: 2, cat_peripherals: 2, cat_network: 1 }, size: 0.5, freq: 0.3, pay: "prompt" },
};

/* Which supplier restocks each category. */
const SAMPLE_SUPPLY = {
  cat_laptops: "v6", cat_desktops: "v6", cat_monitors: "v1", cat_printers: "v6", cat_power: "v6",
  cat_network: "v7", cat_storage: "v1", cat_peripherals: "v1", cat_goods: "v2",
};

function samplePriceLists(start, today) {
  const y = today.slice(0, 4);
  const promoFrom = addDays(som(addMonths(som(today), -2)), 14), promoTo = addDays(promoFrom, 30);
  return [
    { id: "pl_trade", name: "Trade partners — resellers", side: "sale", active: true, from: "", to: "",
      rules: [{ id: "r_t1", product: "", category: "", minQty: 1, mode: "percent", value: 6 },
        { id: "r_t2", product: "", category: "cat_laptops", minQty: 10, mode: "percent", value: 8 },
        { id: "r_t3", product: "g4", category: "", minQty: 20, mode: "fixed", value: 339 },
        { id: "r_t4", product: "g30", category: "", minQty: 50, mode: "fixed", value: 42 }] },
    { id: "pl_corporate", name: "Corporate volume tiers", side: "sale", active: true, from: "", to: "",
      rules: [{ id: "r_c1", product: "", category: "cat_laptops", minQty: 5, mode: "percent", value: 4 },
        { id: "r_c2", product: "", category: "cat_laptops", minQty: 20, mode: "percent", value: 7 },
        { id: "r_c3", product: "", category: "cat_monitors", minQty: 10, mode: "percent", value: 5 },
        { id: "r_c4", product: "", category: "cat_desktops", minQty: 5, mode: "percent", value: 4 }] },
    { id: "pl_edu", name: "Education & healthcare", side: "sale", active: true, from: start, to: y + "-12-31",
      rules: [{ id: "r_e1", product: "", category: "", minQty: 1, mode: "percent", value: 8 },
        { id: "r_e2", product: "sw1", category: "", minQty: 1, mode: "fixed", value: 455 }] },
    { id: "pl_promo", name: "Back-to-business laptop offer", side: "sale", active: true, from: promoFrom, to: promoTo,
      rules: [{ id: "r_p1", product: "", category: "cat_laptops", minQty: 1, mode: "percent", value: 10 },
        { id: "r_p2", product: "", category: "cat_peripherals", minQty: 1, mode: "percent", value: 15 }] },
    { id: "pl_gitd", name: "Gulf IT Distribution — cost sheet", side: "purchase", active: true, from: "", to: "",
      rules: [{ id: "r_g1", product: "", category: "cat_laptops", minQty: 10, mode: "percent", value: 3 },
        { id: "r_g2", product: "g12", category: "", minQty: 1, mode: "fixed", value: 6750 }] },
  ];
}

function sampleRandom(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* The full sample company: masters, a year of trading, payments, journals, counts and scrap. */
function buildSampleBooks(today = TODAY) {
  const rnd = sampleRandom(+today.replace(/-/g, "").slice(2) || 1);
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const chance = (p) => rnd() < p;
  const wpick = (weights) => { const e = Object.entries(weights), t = e.reduce((s, [, w]) => s + w, 0);
    let r = rnd() * t; for (const [k, w] of e) { r -= w; if (r <= 0) return k; } return e[0][0]; };
  const start = addMonths(som(today), -11);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(start, i));
  const day = (m, d) => m.slice(0, 8) + String(Math.max(1, Math.min(d, +eom(m).slice(8)))).padStart(2, "0");
  const season = (m) => [0.9, 0.95, 1.05, 0.9, 1.0, 0.95, 0.8, 1.15, 1.2, 1.05, 1.1, 1.15][+m.slice(5, 7) - 1];
  const monthName = (m) => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][+m.slice(5, 7) - 1] + " " + m.slice(0, 4);

  const catMap = Object.fromEntries(TEMPLATE_CATEGORIES.map((c) => [c.id, c]));
  const products = [...SAMPLE_PRODUCTS.map(({ pace, ...p }, i) => ({ ...p, barcode: p.kind === "goods" ? sampleBarcode(i + 1) : "" })),
    ...TEMPLATE_EXPENSE_ITEMS.map((p) => ({ ...p }))];
  const P = Object.fromEntries(products.map((p) => [p.id, { ...p, ...accountSnapshot({ ...catMap[p.category], adjustment: catMap[p.category].adjustment }) }]));
  const VOL = 1.35;                                    // overall trading volume
  const pace = Object.fromEntries(SAMPLE_PRODUCTS.map((p) => [p.id, p.pace * VOL]));
  const partners = SAMPLE_PARTNERS.map((p) => ({ ...p }));
  const PM = Object.fromEntries(partners.map((p) => [p.id, p]));
  const priceLists = samplePriceLists(start, today);
  const pricingState = { priceLists };

  const docs = [], ops = [], manual = [], payments = [], assets = [];
  const stock = {};                                   // product -> qty on hand
  const goods = SAMPLE_PRODUCTS.filter((p) => p.kind === "goods");
  const byCat = {}; SAMPLE_PRODUCTS.forEach((p) => (byCat[p.category] = byCat[p.category] || []).push(p.id));
  const lowAtEnd = new Set(["g15", "g26", "g32", "g19"]);
  let order = 0, invCount = 0, returnsMade = 0, billCount = 0, debitsMade = 0;

  const line = (pid, qty, price, opts = {}) => {
    const p = P[pid];
    return { id: uid("l"), product: pid, desc: opts.desc || p.name, qty, price: R2(price), disc: opts.disc || 0,
      tax: opts.tax || (p.tax === "rc5" ? "s5" : p.tax), account: opts.account || null,
      priceSource: opts.source || (opts.manual ? "Manual price" : "Product price"), manualPricing: !!opts.manual };
  };
  const snap = (d) => ({ ...d, lines: d.lines.map((l) => ({ ...l, accounts: { income: P[l.product].income, expense: P[l.product].expense,
    inventory: P[l.product].inventory, adjustment: P[l.product].adjustment } })) });
  const addDoc = (type, partner, date, lines, opts = {}) => {
    const p = PM[partner];
    const d = { id: uid("d"), type, number: "", partner, salesman: type === "invoice" || type === "quote" || type === "credit_note" ? p.salesman || "" : "",
      pricelist: opts.pricelist != null ? opts.pricelist : p.pricelist || "", date, due: addDays(date, opts.terms != null ? opts.terms : p.terms || 0),
      lines, ref: opts.ref || "", note: opts.note || "", state: opts.state || "posted", seq: 0, emirate: p.emirate,
      _pri: opts.pri || 1, _o: ++order };
    docs.push(d); return d;
  };
  const salePrice = (pid, qty, date, list) => pricingFor(pricingState, P[pid], qty, date, list, "sale");

  /* ---- opening position: stock, assets and balances brought forward ---- */
  let openingStock = 0;
  const openLines = goods.map((p) => {
    const q = Math.round(pace[p.id] * 1.6) + p.reorder; stock[p.id] = q; openingStock = R2(openingStock + q * p.cost);
    return { id: uid("countline"), product: p.id, counted: q, expected: 0, delta: q, unit: p.cost,
      accounts: { inventory: P[p.id].inventory, adjustment: "3900" } };
  });
  ops.push({ id: uid("stockop"), kind: "count", date: start, reason: "Opening stock brought forward", lines: openLines,
    number: "", state: "posted", seq: 0, postedAt: start + "T08:00:00.000Z", _pri: -1, _o: ++order });
  const openingCredit = { "2500": 240000, "2400": 38000, "3100": 500000 };
  const openingDebit = { "1120": 520000, "1130": 85000, "1110": 8000, "1260": 35000, "1610": 120000, "1630": 46000 };
  const re = R2(Object.values(openingDebit).reduce((s, v) => s + v, 0) + openingStock - Object.values(openingCredit).reduce((s, v) => s + v, 0));
  manual.push({ id: uid("je"), number: `OPEN/${start.slice(0, 4)}/0001`, date: start, ref: `Opening balances — ${dmy(start)}`, journal: "Miscellaneous",
    lines: [
      ...Object.entries(openingDebit).map(([acc, v]) => ({ acc, debit: v, credit: 0, label: "Balance brought forward", partner: null })),
      { acc: "3900", debit: openingStock, credit: 0, label: "Opening stock — cleared to equity", partner: null },
      ...Object.entries(openingCredit).map(([acc, v]) => ({ acc, debit: 0, credit: v, label: "Balance brought forward", partner: null })),
      { acc: "3200", debit: 0, credit: re, label: "Retained earnings brought forward", partner: null },
    ] });
  assets.push(
    { id: "fa1", code: "FA-001", name: "Office furniture and fit-out", cost: 78000, salvage: 0, life: 5, acquired: start, acc: "1610", accum: "1620", exp: "6700" },
    { id: "fa2", code: "FA-002", name: "Warehouse racking and shelving", cost: 42000, salvage: 2000, life: 8, acquired: start, acc: "1610", accum: "1620", exp: "6700" },
    { id: "fa3", code: "FA-003", name: "Staff laptops and office server", cost: 46000, salvage: 0, life: 3, acquired: start, acc: "1630", accum: "1635", exp: "6700" });

  /* ---- events, processed strictly in date order so stock never goes negative ---- */
  const queue = [];
  const at = (date, pri, run) => { if (date >= start && date <= today) queue.push({ date, pri, o: ++order, run }); };

  const restock = (m, date, final) => {
    const orders = {};
    goods.forEach((p) => {
      if (final && lowAtEnd.has(p.id)) return;
      const target = Math.ceil(pace[p.id] * season(m) * 1.9) + p.reorder;
      if ((stock[p.id] || 0) >= target * 0.7) return;
      const qty = Math.max(p.reorder, target - (stock[p.id] || 0));
      const v = SAMPLE_SUPPLY[p.category] || "v2";
      (orders[v] = orders[v] || []).push([p.id, qty]);
    });
    Object.entries(orders).forEach(([v, rows]) => {
      const imp = v === "v1";
      const lines = rows.map(([pid, q]) => {
        const base = v === "v6" ? pricingFor(pricingState, P[pid], q, date, "pl_gitd", "purchase") : { price: P[pid].cost * (0.97 + rnd() * 0.06), priceSource: "Product cost" };
        stock[pid] += q;
        return line(pid, q, base.price, { tax: imp ? "rc5" : "s5", source: base.priceSource });
      });
      const ref = { v1: "KT-INV-", v6: "GITD-", v7: "NLME-", v2: "ECT/" }[v] + int(10000, 99999);
      const bill = addDoc("bill", v, date, lines, { ref, pri: 0 });
      if ((v === "v1" || v === "v6") && debitsMade < 3 && ++billCount % 4 === 2) {
        const l = lines[0], dd = addDays(date, int(6, 16)); debitsMade++;
        at(dd, 2, () => { const q = Math.min(2, Math.floor((stock[l.product] || 0) / 2)); if (q < 1) return; stock[l.product] -= q;
          const dn = addDoc("debit_note", v, dd, [line(l.product, q, l.price, { tax: l.tax, source: "Returned to supplier" })],
            { ref: "", terms: 0, pri: 2, note: `${q} × ${P[l.product].code} returned to supplier — dead on arrival.` });
          dn._bill = bill.id; });
      }
      if (imp) {
        const value = lines.reduce((s, l) => s + l.qty * l.price, 0);
        const fd = addDays(date, int(4, 9));
        at(fd, 0, () => addDoc("bill", "v3", fd, [
          line("e2", 1, R2(1200 + value * 0.018), { desc: `Sea freight & clearance — ${ref}`, manual: true }),
          line("e2", 1, R2(value * 0.05), { desc: `Customs duty 5% — ${ref}`, tax: "nt", manual: true })],
          { ref: "FL-" + int(2000, 9999), pri: 0 }));
      }
    });
  };
  const topUp = (date) => {
    const rows = goods.filter((p) => !lowAtEnd.has(p.id) && (stock[p.id] || 0) <= p.reorder).slice(0, 4);
    if (!rows.length) return;
    addDoc("bill", "v2", date, rows.map((p) => { const q = p.reorder * 2; stock[p.id] += q; return line(p.id, q, R2(p.cost * 1.04), { source: "Local top-up" }); }),
      { ref: "ECT/" + int(10000, 99999), pri: 0 });
  };

  const licencesSold = {};                             // month -> { product: qty }
  const invoiceFor = (cid, date, m) => {
    const prof = SAMPLE_PROFILES[cid], cust = PM[cid];
    const list = cust.pricelist || "";
    const promo = priceLists[3], promoOn = !list && date >= promo.from && date <= promo.to;
    const usedList = promoOn && chance(0.6) ? "pl_promo" : list;
    const lines = [], picked = new Set();
    const n = cid === "p17" ? int(1, 2) : int(1, prof.size > 1.5 ? 4 : 3);
    for (let i = 0; i < n * 2 && lines.length < n; i++) {
      const cat = wpick(prof.mix), pid = byCat[cat][int(0, byCat[cat].length - 1)];
      if (picked.has(pid)) continue; picked.add(pid);
      const p = P[pid], unitPace = pace[pid] || 1;
      let qty = Math.max(1, Math.round((p.kind === "goods" ? Math.min(unitPace, 12) : 6) * prof.size * (0.35 + rnd() * 0.65)));
      if (prof.school && /-0[89]-/.test(date) && cat === "cat_laptops") qty = Math.round(qty * 1.6);
      if (p.kind === "goods") {
        const free = (stock[pid] || 0) - (lowAtEnd.has(pid) ? 0 : 1);
        qty = Math.min(qty, free);
        if (qty < 1) continue;
        stock[pid] -= qty;
      } else {
        const mm = (licencesSold[m] = licencesSold[m] || {}); mm[pid] = (mm[pid] || 0) + qty;
      }
      const pr = salePrice(pid, qty, date, usedList);
      const disc = !usedList && cid !== "p17" && chance(0.18) ? [2, 3, 5][int(0, 2)] : 0;
      lines.push(line(pid, qty, pr.price, { source: pr.priceSource, disc, tax: cust.export ? "z0" : "s5" }));
    }
    if (!lines.length) return null;
    const hasKit = lines.some((l) => ["cat_laptops", "cat_desktops", "cat_network"].includes(P[l.product].category));
    if (cid !== "p17" && hasKit && chance(0.45)) lines.push(line("s1", int(3, 14), 220, { tax: cust.export ? "z0" : "s5" }));
    const tax = cust.export ? "z0" : "s5";
    if (lines.some((l) => P[l.product].category === "cat_network") && chance(0.4)) lines.push(line("s4", int(8, 36), 185, { tax }));
    if (prof.consult && chance(0.3)) lines.push(line("s3", int(1, 4), 2600, { tax }));
    if (cid !== "p17" && chance(0.08)) lines.push(line("s6", 1, 950, { tax }));
    const d = addDoc("invoice", cid, date, lines, { pricelist: usedList, terms: prof.pay === "cash" ? 0 : cust.terms,
      note: cust.export ? "Export of goods — zero-rated under Article 45. Exit documents on file." : "" });
    const back = lines.find((x) => P[x.product].kind === "goods");
    if (cid !== "p17" && back && returnsMade < 6 && ++invCount % 17 === 9) {
      const k = returnsMade++, cd = addDays(date, int(4, 18));
      at(cd, 2, () => {
        const q = Math.max(1, Math.min(back.qty, Math.round(back.qty * 0.2))); stock[back.product] += q;
        const cn = addDoc("credit_note", cid, cd, [line(back.product, q, back.price, { disc: back.disc, tax: back.tax, source: back.priceSource })],
          { ref: "", terms: 0, pri: 2, pricelist: d.pricelist, note: [`${q} × ${P[back.product].code} returned — faulty on delivery.`,
            "Returned unit(s) failed burn-in test; customer chose a credit.", "Customer returned surplus quantity within 14 days."][k % 3] });
        cn._invoice = d.id;
      });
    }
    return d;
  };

  months.forEach((m, mi) => {
    const final = mi >= 10, s = season(m);
    at(day(m, mi === 0 ? 1 : 2), 0, () => restock(m, day(m, mi === 0 ? 1 : 2), final));
    at(day(m, 15), 0, () => topUp(day(m, 15)));
    /* overheads */
    at(day(m, 1), 0, () => addDoc("bill", "v4", day(m, 1), [line("e1", 1, 12500, { desc: `Office & warehouse rent — ${monthName(m)}`, manual: true })], { ref: "BT-RENT-" + m.slice(0, 7).replace("-", ""), pri: 0 }));
    at(day(m, 5), 0, () => addDoc("bill", "v9", day(m, 5), [line("e6", 1, 1850, { desc: `Business fibre 500 Mbps + 6 mobile lines — ${monthName(m)}`, manual: true })], { ref: "ETB-" + int(100000, 999999), pri: 0 }));
    at(day(m, 9), 0, () => addDoc("bill", "v8", day(m, 9), [line("e5", 1, R2((/-(0[5-9]|10)-/.test(m) ? 4300 : 2700) + int(-300, 400)), { desc: `Electricity & water — ${monthName(m)}`, manual: true })], { ref: "DEWA-" + int(2000000, 9999999), pri: 0 }));
    at(day(m, 3), 0, () => addDoc("bill", "v14", day(m, 3), [line("e13", 1, 1200, { desc: `Microsoft 365, backup and web hosting — ${monthName(m)}`, manual: true })], { ref: "CSL-" + int(10000, 99999), pri: 0 }));
    if (mi % 2 === 1) at(day(m, 12), 0, () => addDoc("bill", "v13", day(m, 12), [line("e4", 1, int(40, 95) * 100, { desc: ["Google Ads & LinkedIn campaign", "Exhibition stand — GITEX week", "Social media management", "Email & SEO campaign"][int(0, 3)] + " — " + monthName(m), manual: true })], { ref: "SDA-" + int(1000, 9999), pri: 0 }));
    if (mi === 3) at(day(m, 8), 0, () => addDoc("bill", "v5", day(m, 8), [line("e3", 1, 18000, { desc: "Statutory audit — prior financial year", manual: true })], { ref: "MAA-" + int(1000, 1999), pri: 0 }));
    if (mi === 9) at(day(m, 10), 0, () => addDoc("bill", "v5", day(m, 10), [line("e3", 1, 6500, { desc: "VAT health check & corporate tax registration support", manual: true })], { ref: "MAA-" + int(2000, 2999), pri: 0 }));
    if (mi === 1) at(day(m, 6), 0, () => addDoc("bill", "v11", day(m, 6), [
      line("e7", 1, 9800, { desc: "Property all-risks & money insurance — annual premium", manual: true }),
      line("e7", 1, 31200, { desc: "Staff medical insurance — annual premium (12 staff)", account: "6120", manual: true })], { ref: "GSI-POL-" + int(10000, 99999), pri: 0 }));
    if (mi % 3 === 2) at(day(m, 11), 0, () => addDoc("bill", "v16", day(m, 11), [
      line("e11", 2, 3450, { desc: "Employment visa renewals — government fees", tax: "nt", manual: true }),
      line("e11", 1, 650, { desc: "PRO service charge", tax: "s5", manual: true })], { ref: "BGS-" + int(10000, 99999), pri: 0 }));
    if (mi === 4) at(day(m, 10), 0, () => {
      addDoc("bill", "v10", day(m, 10), [line("e15", 1, 98000, { desc: "Toyota Hiace delivery van 2025 — chassis JTFSX23P0R6", account: "1640", manual: true })], { ref: "AMT-" + int(1000, 9999), pri: 0, terms: 0 });
      assets.push({ id: "fa4", code: "FA-004", name: "Delivery van — Toyota Hiace", cost: 98000, salvage: 18000, life: 5, acquired: day(m, 10), acc: "1640", accum: "1645", exp: "6700" });
    });
    /* small expenses booked through the Expenses screen */
    [[v => "v12", "e9", () => int(5, 14) * 100 + int(0, 99), "Stationery, printer paper and pantry supplies", "cash"],
      [v => "v15", "e10", () => int(30, 90) * 10, "Courier — customer deliveries", "cash"],
      [v => "v17", "e8", () => (mi >= 4 ? int(110, 160) : int(40, 70)) * 10, "Fuel — delivery vehicles", "cash"]]
      .forEach(([vf, pid, amt, memo, how], k) => {
        const d = day(m, 7 + k * 6 + int(0, 3));
        at(d, 0, () => { const b = addDoc("bill", vf(), d, [line(pid, 1, amt(), { desc: memo, account: P[pid].expense, manual: true })], { note: "Recorded through Expenses", pri: 0, terms: 0 }); b._paidNow = how; });
      });
    /* sales */
    Object.entries(SAMPLE_PROFILES).forEach(([cid, prof]) => {
      let n = prof.freq * s * VOL; if (prof.school && /-0[89]-/.test(m)) n *= 1.8;
      let count = Math.floor(n) + (chance(n - Math.floor(n)) ? 1 : 0);
      if (prof.pay === "late" && mi >= 5 && mi <= 9) count = Math.max(count, 1);
      for (let i = 0; i < count; i++) { const d = day(m, int(3, 27)); at(d, 1, () => invoiceFor(cid, d, m)); }
      if (prof.amc) at(day(m, 1), 1, () => { const pr = salePrice("s2", prof.amc, day(m, 1), PM[cid].pricelist);
        addDoc("invoice", cid, day(m, 1), [line("s2", prof.amc, pr.price, { source: pr.priceSource, desc: `Annual maintenance contract — ${monthName(m)} (${prof.amc} site${prof.amc > 1 ? "s" : ""})` })]); });
    });
    /* software licences are bought as they are sold */
    at(day(m, 28), 0.5, () => { const sold = licencesSold[m]; if (!sold || !Object.keys(sold).length) return;
      addDoc("bill", "v14", day(m, 28), Object.entries(sold).map(([pid, q]) => line(pid, q, P[pid].cost, { source: "Product cost" })), { ref: "CSL-LIC-" + int(10000, 99999), pri: 0.5 }); });
    /* a damaged item now and then */
    if (mi === 3 || mi === 8) at(day(m, 27), 3, () => {
      const pid = ["g14", "g3", "g18"][mi === 3 ? 0 : 1], q = Math.min(2, stock[pid] || 0); if (q < 1) return;
      const expected = stock[pid]; stock[pid] -= q;
      ops.push({ id: uid("stockop"), kind: "scrap", date: day(m, 27), reason: mi === 3 ? "Transit damage — cracked panels" : "Water damage in warehouse corner",
        lines: [{ id: uid("countline"), product: pid, counted: q, expected, delta: -q, unit: P[pid].cost, accounts: { inventory: "1300", adjustment: "5300" } }],
        number: "", state: "posted", seq: 0, postedAt: day(m, 27) + "T16:00:00.000Z", _pri: 3, _o: ++order });
    });
    /* quarter-end physical count */
    if ([2, 5, 8].includes(mi)) at(eom(m), 3, () => {
      const counted = goods.filter((_, i) => (i + mi) % 3 === 0).map((p) => {
        const expected = stock[p.id] || 0, diff = chance(0.3) ? (chance(0.5) ? -1 : 1) : 0, c = Math.max(0, expected + diff);
        stock[p.id] = c;
        return { id: uid("countline"), product: p.id, counted: c, expected, delta: c - expected, unit: p.cost, accounts: { inventory: "1300", adjustment: "5300" } };
      });
      ops.push({ id: uid("stockop"), kind: "count", date: eom(m), reason: `Quarter-end warehouse count — ${monthName(m)}`, lines: counted,
        number: "", state: "posted", seq: 0, postedAt: eom(m) + "T18:00:00.000Z", _pri: 3, _o: ++order });
    });
  });

  for (let guard = 0; queue.length && guard < 20000; guard++) {
    queue.sort((a, b) => a.date.localeCompare(b.date) || a.pri - b.pri || a.o - b.o);
    queue.shift().run();
  }

  const posted = (t) => docs.filter((d) => d.type === t && d.state === "posted");

  /* ---- quotations and drafts ---- */
  const bigInvoices = posted("invoice").filter((d) => d.partner !== "p17" && amounts(d).net > 15000);
  bigInvoices.filter((_, i) => i % 4 === 1).slice(0, 9).forEach((inv) => {
    const qd = addDays(inv.date, -int(4, 12));
    const q = addDoc("quote", inv.partner, qd < start ? start : qd, inv.lines.map((l) => ({ ...l, id: uid("l") })),
      { state: "invoiced", terms: 30, pricelist: inv.pricelist });
    inv._quote = q.id;
  });
  const recentCust = ["p2", "p4", "p7", "p10", "p13", "p8", "p18", "p3", "p15"];
  [["sent", 6], ["sent", 11], ["accepted", 9], ["sent", 3], ["draft", 1], ["accepted", 15], ["declined", 34], ["declined", 52], ["sent", 20]]
    .forEach(([st, ago], i) => {
      const cid = recentCust[i], prof = SAMPLE_PROFILES[cid], d = addDays(today, -ago);
      const lines = Object.keys(prof.mix).slice(0, 3).map((cat, k) => { const pid = byCat[cat][(i + k) % byCat[cat].length];
        const q = Math.max(2, Math.round((pace[pid] || 4) * prof.size * 0.8)); const pr = salePrice(pid, q, d, PM[cid].pricelist);
        return line(pid, q, pr.price, { source: pr.priceSource }); });
      lines.push(line("s1", int(6, 16), 220));
      addDoc("quote", cid, d, lines, { state: st, terms: 30, note: st === "declined" ? "Customer chose a lower-spec alternative." : "Prices valid for 30 days. Delivery 3–5 working days from order." });
    });
  const di = (cid, ago, rows) => addDoc("invoice", cid, addDays(today, -ago), rows.map(([pid, q]) => {
    const pr = salePrice(pid, q, addDays(today, -ago), PM[cid].pricelist); return line(pid, q, pr.price, { source: pr.priceSource }); }), { state: "draft" });
  di("p4", 1, [["g1", 4], ["g16", 4], ["s1", 6]]);
  di("p11", 0, [["g8", 2], ["g31", 2]]);
  addDoc("bill", "v7", addDays(today, -1), [line("g23", 10, 590), line("g25", 4, 238)], { state: "draft", ref: "NLME-" + int(10000, 99999) });

  /* ---- numbering and posting order ---- */
  const live = [...docs.filter((d) => d.state === "posted" && d.type !== "quote"), ...ops]
    .sort((a, b) => a.date.localeCompare(b.date) || a._pri - b._pri || a._o - b._o);
  live.forEach((d, i) => (d.seq = i + 1));
  const numberAll = (list, prefix) => list.slice().sort((a, b) => a.date.localeCompare(b.date) || (a.seq || 0) - (b.seq || 0) || a._o - b._o)
    .forEach((d, i) => (d.number = `${prefix}/${d.date.slice(0, 4)}/${String(i + 1).padStart(4, "0")}`));
  Object.entries(DOCMETA).forEach(([t, meta]) => numberAll(docs.filter((d) => d.type === t), meta.prefix));
  numberAll(ops.filter((o) => o.kind === "count"), "COUNT");
  numberAll(ops.filter((o) => o.kind === "scrap"), "SCRAP");
  const byId = Object.fromEntries(docs.map((d) => [d.id, d]));
  docs.forEach((d) => {
    if (d._invoice || d._bill) d.ref = byId[d._invoice || d._bill].number;
    if (d._quote) { d.ref = byId[d._quote].number; d.note = `Raised from quotation ${byId[d._quote].number}`; }
  });

  /* ---- receipts and payments ---- */
  const pays = [];
  const pay = (kind, partner, date, amount, method, account, memo) => {
    if (date > today || amount <= 0.004) return;
    pays.push({ id: uid("pm"), kind, number: "", partner, date, amount: R2(amount), method, account, memo });
  };
  let cheque = 445100;
  const credited = (d) => R2(docs.filter((x) => x._invoice === d.id || x._bill === d.id).reduce((s, x) => s + amounts(x).total, 0));
  posted("invoice").sort((a, b) => a.date.localeCompare(b.date) || a.seq - b.seq).forEach((inv) => {
    const prof = SAMPLE_PROFILES[inv.partner] || { pay: "prompt" }, total = R2(amounts(inv).total - credited(inv));
    const memo = (extra) => [`Settlement of ${inv.number}`, extra].filter(Boolean).join(" · ");
    if (prof.pay === "cash") {
      const m = chance(0.55) ? "m2" : chance(0.7) ? "m4" : "m5";
      return pay("in", inv.partner, inv.date, total, m, m === "m2" ? "1110" : "1120", memo(m === "m4" ? "Auth " + int(100000, 999999) : m === "m5" ? "TXN" + int(1000000, 9999999) : ""));
    }
    if (prof.pay === "late" && inv.date > addMonths(som(today), -6)) return;
    const lag = prof.pay === "prompt" ? int(-12, 3) : prof.pay === "slow" ? int(0, 28) : int(-5, 15);
    const d = addDays(inv.due, lag) < addDays(inv.date, 3) ? addDays(inv.date, 3) : addDays(inv.due, lag);
    const viaCheque = chance(0.25), viaAdcb = !viaCheque && chance(0.25);
    const method = viaCheque ? "m3" : viaAdcb ? "m6" : "m1", account = viaAdcb ? "1130" : "1120";
    const ref = viaCheque ? "Cheque " + ++cheque : "TT " + int(10000000, 99999999);
    if (prof.pay === "partial" && total > 20000) {
      const half = R2(Math.round(total * 0.5));
      pay("in", inv.partner, d, half, method, account, memo(ref + " · part payment"));
      pay("in", inv.partner, addDays(d, int(20, 35)), R2(total - half), "m1", "1120", memo("TT " + int(10000000, 99999999) + " · balance"));
    } else pay("in", inv.partner, d, total, method, account, memo(ref));
  });
  posted("bill").sort((a, b) => a.date.localeCompare(b.date) || a.seq - b.seq).forEach((b) => {
    const total = R2(amounts(b).total - credited(b)), memo = (x) => [`Settlement of ${b.number}`, x].filter(Boolean).join(" · ");
    if (b._paidNow) return pay("out", b.partner, b.date, total, "m2", "1110", [`Paid — ${b.lines[0].desc}`].join(""));
    if (b.partner === "v4") return pay("out", b.partner, b.date, total, "m3", "1120", memo("PDC " + (5100 + +b.date.slice(5, 7))));
    if (b.partner === "v10" || b.partner === "v16") return pay("out", b.partner, b.date, total, "m1", "1120", memo("TT"));
    const lag = b.partner === "v1" ? int(-5, 3) : ["v8", "v9", "v14", "v15"].includes(b.partner) ? int(-6, 0) : int(-3, 12);
    pay("out", b.partner, addDays(b.due, lag) < b.date ? b.date : addDays(b.due, lag), total, "m1", "1120", memo(b.partner === "v1" ? "SWIFT USD — converted" : "TT"));
  });
  const numberPays = (kind, prefix) => pays.filter((p) => p.kind === kind).sort((a, b) => a.date.localeCompare(b.date))
    .forEach((p, i) => (p.number = `${prefix}/${p.date.slice(0, 4)}/${String(i + 1).padStart(4, "0")}`));
  numberPays("in", "RCPT"); numberPays("out", "PAYM");
  payments.push(...pays);

  /* ---- monthly journals: payroll, loan, petty cash, depreciation, VAT ---- */
  const je = (prefix, date, ref, lines) => { if (date <= today) manual.push({ id: uid("je"), number: prefix, date, ref, journal: "Miscellaneous", lines: lines.map((l) => ({ partner: null, ...l })) }); };
  let loan = 240000;
  months.forEach((m, mi) => {
    const wages = R2(61500 + int(-12, 18) * 100), comm = R2(int(28, 52) * 100), grat = 3900;
    je("JE", eom(m), `Payroll — ${monthName(m)} (WPS)`, [
      { acc: "6100", debit: wages, credit: 0, label: "Basic salary & allowances" },
      { acc: "6110", debit: comm, credit: 0, label: "Sales commission" },
      { acc: "6130", debit: grat, credit: 0, label: "Gratuity accrual" },
      { acc: "2400", debit: 0, credit: grat, label: "End-of-service provision" },
      { acc: "1120", debit: 0, credit: R2(wages + comm), label: "Salaries transferred via WPS" }]);
    const interest = R2(loan * 0.068 / 12);
    je("JE", day(m, 15), `Term loan instalment — ${monthName(m)}`, [
      { acc: "2500", debit: 10000, credit: 0, label: "Principal repayment" },
      { acc: "6460", debit: interest, credit: 0, label: "Interest at 6.8% p.a." },
      { acc: "1120", debit: 0, credit: R2(10000 + interest), label: "Debited by Emirates NBD" }]);
    if (day(m, 15) <= today) loan -= 10000;
    je("TRF", day(m, 2), "Petty cash top-up", [
      { acc: "1110", debit: 3000, credit: 0, label: "Funds in" }, { acc: "1120", debit: 0, credit: 3000, label: "Funds out" }]);
    const cashIn = R2(pays.filter((p) => p.kind === "in" && p.account === "1110" && p.date.slice(0, 7) === m.slice(0, 7)).reduce((s, p) => s + p.amount, 0));
    if (cashIn > 1000) je("TRF", day(m, 28), "Cash sales deposited to bank", [
      { acc: "1120", debit: R2(Math.floor(cashIn * 0.9 / 100) * 100), credit: 0, label: "Funds in" },
      { acc: "1110", debit: 0, credit: R2(Math.floor(cashIn * 0.9 / 100) * 100), label: "Funds out" }]);
    const adcbIn = R2(pays.filter((p) => p.account === "1130" && p.date.slice(0, 7) === m.slice(0, 7) && p.date <= day(m, 26)).reduce((s, p) => s + p.amount, 0));
    const sweep = Math.floor(adcbIn * 0.85 / 5000) * 5000;
    if (sweep > 0) je("TRF", day(m, 26), "Sweep from ADCB to Emirates NBD operating account", [
      { acc: "1120", debit: sweep, credit: 0, label: "Funds in" }, { acc: "1130", debit: 0, credit: sweep, label: "Funds out" }]);
  });
  const monthly = (a) => R2((a.cost - (+a.salvage || 0)) / (+a.life * 12));
  const monthsTo = (a, d) => (+d.slice(0, 4) - +a.acquired.slice(0, 4)) * 12 + (+d.slice(5, 7) - +a.acquired.slice(5, 7)) + 1;
  months.filter((m) => [2, 5, 8, 11].includes(+m.slice(5, 7) - 1)).map((m) => eom(m)).filter((q) => q <= today).forEach((q) => {
    assets.forEach((a) => {
      if (a.acquired > q) return;
      const prevQ = eom(addMonths(som(q), -3));
      const n = monthsTo(a, q) - (a.acquired > prevQ ? 0 : monthsTo(a, prevQ));
      const amt = R2(Math.min(monthly(a) * n, a.cost - a.salvage));
      if (amt > 0) je("DEP", q, `Depreciation — ${a.code}`, [
        { acc: a.exp, debit: amt, credit: 0, label: `Depreciation on ${a.name}` },
        { acc: a.accum, debit: 0, credit: amt, label: "Accumulated depreciation" }]);
    });
  });
  /* VAT returns are filed quarterly and paid by the 28th of the following month. */
  const vatOf = (from, to) => { let out = 0, inp = 0;
    docs.filter((d) => d.state === "posted" && d.type !== "quote" && d.date >= from && d.date <= to).forEach((d) => {
      const a = amounts(d), s = SIGNS[d.type];
      if (DOCMETA[d.type].side === "sale") out += s * a.vat; else { inp += s * (a.vat + a.rcm); out += s * a.rcm; } });
    return { out: R2(out), inp: R2(inp) }; };
  months.filter((m) => [2, 5, 8, 11].includes(+m.slice(5, 7) - 1)).forEach((m) => {
    const to = eom(m), from = soq(m) < start ? start : soq(m), due = addDays(to, 28);
    if (due > today) return;
    const v = vatOf(from, to), net = R2(v.out - v.inp);
    je("JE", due, `VAT return ${from.slice(0, 7)} to ${to.slice(0, 7)} — paid to FTA`, [
      { acc: "2200", debit: v.out, credit: 0, label: "Output VAT for the period" },
      { acc: "1400", debit: 0, credit: v.inp, label: "Input VAT recovered" },
      net >= 0 ? { acc: "1120", debit: 0, credit: net, label: "Paid via FTA e-Dirham / GIBAN" }
        : { acc: "1120", debit: -net, credit: 0, label: "VAT refund received" }]);
  });
  const prefixes = {};
  manual.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => {
    if (e.number.includes("/")) return;
    prefixes[e.number] = (prefixes[e.number] || 0) + 1;
    e.number = `${e.number}/${e.date.slice(0, 4)}/${String(prefixes[e.number]).padStart(4, "0")}`;
  });

  const clean = (x) => { const { _pri, _o, _invoice, _bill, _quote, _paidNow, ...rest } = x; return rest; };
  return {
    schemaVersion: 5,
    sample: { version: SAMPLE_VERSION, generated: today, from: start },
    docs: docs.map((d) => clean(d.state === "posted" && d.type !== "quote" ? snap(d) : d)),
    payments, manual, stockOps: ops.map(clean), assets,
    accounts: TEMPLATE_ACCOUNTS.map((a) => ({ ...a })),
    categories: TEMPLATE_CATEGORIES.map((c) => ({ ...c })),
    products, partners, priceLists, salespeople: SAMPLE_SALESPEOPLE.map((s) => ({ ...s })),
    methods: [{ id: "m6", name: "ADCB bank transfer", kind: "bank", account: "1130", needsRef: true, refLabel: "TT reference", direction: "both", active: true }],
    users: SEED_USERS, einv: {}, costing: "avco",
  };
}

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
