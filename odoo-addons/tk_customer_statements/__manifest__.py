# -*- coding: utf-8 -*-
{
    'name': 'Customer Statement Report | Customer Statement Aging',
    'summary': 'Statement of account and outstanding invoices with aging, '
               'in PDF and Excel, printed or emailed to one or many customers',
    'description': """
Customer Statements
===================
* Account activity statement: opening balance, invoices, credit notes,
  payments and running balance over a period, closing balance.
* Outstanding statement: invoices still open on a date, with days overdue.
* Aging summary (current, 1-30, 31-60, 61-90, 91-120, older), interval configurable.
* Customer contacts roll up to their company; amounts in company currency.
* PDF (company layout or your own letterhead banner), Excel (.xlsx) with a
  summary sheet for several customers, and email with the PDF attached.
* Print or send from the Customers menu, from Contacts, or from the Action
  menu of any customer list or form.
* Statement wording, payment instructions, bank accounts and signature/stamp
  are set per company in Settings, nothing is hardcoded.
    """,
    'version': '19.0.2.0.0',
    'category': 'Accounting/Accounting',
    'author': 'TechKhedut Inc.',
    'company': 'TechKhedut Inc.',
    'maintainer': 'TechKhedut Inc.',
    'website': "https://www.techkhedut.com",
    'depends': [
        'contacts',
        'account',
        'mail',
    ],
    'data': [
        # Security
        'security/security_access.xml',
        'security/ir.model.access.csv',
        # Report
        'report/customer_statement_report_pdf.xml',
        # Data
        'data/mail_template_data.xml',
        # Wizard
        'wizard/customer_statement_view.xml',
        # Views
        'views/res_config_settings_views.xml',
        'views/menus.xml',
    ],
    'images': ['static/description/banner.png'],
    'license': 'LGPL-3',
    'installable': True,
    'application': False,
    'auto_install': False,
}
