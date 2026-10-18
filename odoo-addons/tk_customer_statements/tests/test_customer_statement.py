# -*- coding: utf-8 -*-
import base64
import io
import zipfile
from unittest.mock import patch

from odoo import fields
from odoo.exceptions import UserError, ValidationError
from odoo.tests import Form, tagged

from odoo.addons.account.tests.common import AccountTestInvoicingCommon


@tagged('post_install', '-at_install', 'customer_statement')
class TestCustomerStatement(AccountTestInvoicingCommon):
    """
    Customer with, in company currency:

    =========== ======================= ====== ===========
    Date        Document                Amount Due
    =========== ======================= ====== ===========
    2025-12-15  Invoice 0               400    2026-01-14
    2026-01-10  Invoice 1 (to contact)  1000   2026-02-09
    2026-02-05  Invoice 2               500    2026-03-07
    2026-02-20  Payment on invoice 1    -300
    2026-02-25  Credit note             -100
    2026-03-10  Payment on invoice 0    -400
    =========== ======================= ====== ===========
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.term_30 = cls.env.ref('account.account_payment_term_30days')
        cls.customer = cls.env['res.partner'].create({
            'name': 'Statement Customer LLC',
            'is_company': True,
            'email': 'customer@example.com',
            'vat': '100200300400500',
            'ref': 'C-042',
            'property_payment_term_id': cls.term_30.id,
        })
        cls.contact = cls.env['res.partner'].create({
            'name': 'Accounts Department',
            'type': 'invoice',
            'email': 'accounts@example.com',
            'parent_id': cls.customer.id,
        })
        cls.other_customer = cls.env['res.partner'].create({'name': 'Quiet Customer'})

        cls.invoice_0 = cls._create_customer_invoice(cls.customer, '2025-12-15', 400)
        cls.invoice_1 = cls._create_customer_invoice(cls.contact, '2026-01-10', 1000)
        cls.invoice_2 = cls._create_customer_invoice(cls.customer, '2026-02-05', 500)
        cls.credit_note = cls._create_customer_invoice(cls.customer, '2026-02-25', 100, move_type='out_refund')
        cls.env['account.move'].create({
            'move_type': 'out_invoice',
            'partner_id': cls.customer.id,
            'invoice_date': '2026-01-20',
            'invoice_line_ids': [cls._prepare_invoice_line(price_unit=999, tax_ids=[])],
        })  # draft: never on a statement
        cls._pay(cls.invoice_1, 300, '2026-02-20')
        cls._pay(cls.invoice_0, 400, '2026-03-10')

        cls.report = cls.env['report.tk_customer_statements.customer_report_template']
        # A configured document layout, else printing first opens the layout configurator.
        cls.env.company.external_report_layout_id = cls.env.ref('web.external_layout_standard')

    @classmethod
    def _create_customer_invoice(cls, partner, invoice_date, amount, move_type='out_invoice'):
        return cls._create_invoice_one_line(
            move_type=move_type,
            partner_id=partner,
            invoice_date=invoice_date,
            invoice_payment_term_id=cls.term_30,
            price_unit=amount,
            tax_ids=[],
            post=True,
        )

    @classmethod
    def _pay(cls, invoice, amount, date):
        # Journal entries are forced so that the receivable account itself is reconciled,
        # with or without the Accounting app.
        return cls.env['account.payment.register'].with_context(
            active_model='account.move', active_ids=invoice.ids, force_payment_move=True,
        ).create({'amount': amount, 'payment_date': date})._create_payments()

    def _statement(self, statement_type='activity', date_from='2026-01-01', date_to='2026-02-28', partners=None, **options):
        options = self.report._get_options({'options': {
            'statement_type': statement_type,
            'date_from': date_from,
            'date_to': date_to,
            **options,
        }})
        statements = self.report._get_statements(partners or self.customer, options)
        return statements[0] if statements else None

    def _wizard(self, **values):
        return self.env['customer.statement.wizard'].create({
            'statement_type': 'activity',
            'date_from': '2026-01-01',
            'date_to': '2026-02-28',
            'partner_ids': [fields.Command.set(self.customer.ids)],
            **values,
        })

    # ------------------------------------------------------------------
    # Figures
    # ------------------------------------------------------------------

    def test_activity_statement(self):
        statement = self._statement()
        self.assertEqual(statement['partner'], self.customer)
        self.assertAlmostEqual(statement['opening_balance'], 400)
        self.assertEqual(
            [(entry['name'], entry['debit'], entry['credit'], entry['balance']) for entry in statement['activity']],
            [
                (self.invoice_1.name, 1000, 0, 1400),
                (self.invoice_2.name, 500, 0, 1900),
                (self.invoice_1.matched_payment_ids.move_id.name or self.invoice_1.matched_payment_ids.name, 0, 300, 1600),
                (self.credit_note.name, 0, 100, 1500),
            ],
        )
        self.assertEqual([entry['type'] for entry in statement['activity']],
                         ['Invoice', 'Invoice', 'Payment', 'Credit Note'])
        self.assertAlmostEqual(statement['total_debit'], 1500)
        self.assertAlmostEqual(statement['total_credit'], 400)
        self.assertAlmostEqual(statement['closing_balance'], 1500)
        # The closing balance and the open items always agree.
        self.assertAlmostEqual(statement['amount_due'], statement['closing_balance'])

    def test_outstanding_on_past_date_ignores_later_payments(self):
        statement = self._statement('outstanding', date_to='2026-02-28')
        by_name = {item['name']: item for item in statement['outstanding']}
        self.assertEqual(set(by_name), {self.invoice_0.name, self.invoice_1.name, self.invoice_2.name, self.credit_note.name})
        # Invoice 0 was paid on 2026-03-10, after the statement date: still due then.
        self.assertAlmostEqual(by_name[self.invoice_0.name]['residual'], 400)
        self.assertEqual(by_name[self.invoice_0.name]['days_overdue'], 45)
        self.assertAlmostEqual(by_name[self.invoice_1.name]['paid'], 300)
        self.assertAlmostEqual(by_name[self.invoice_1.name]['residual'], 700)
        self.assertEqual(by_name[self.invoice_1.name]['days_overdue'], 19)
        self.assertEqual(by_name[self.invoice_2.name]['days_overdue'], 0)
        self.assertAlmostEqual(by_name[self.credit_note.name]['residual'], -100)
        self.assertAlmostEqual(statement['amount_due'], 1500)
        self.assertAlmostEqual(statement['overdue'], 1100)
        aging = {bucket['key']: bucket['amount'] for bucket in statement['aging']}
        self.assertAlmostEqual(aging['current'], 400)  # invoice 2 and the credit note
        self.assertAlmostEqual(aging['p0'], 700)  # 1-30 days
        self.assertAlmostEqual(aging['p1'], 400)  # 31-60 days
        self.assertAlmostEqual(sum(aging.values()), statement['amount_due'])

    def test_outstanding_after_payment(self):
        statement = self._statement('outstanding', date_to='2026-03-31')
        self.assertNotIn(self.invoice_0.name, [item['name'] for item in statement['outstanding']])
        self.assertAlmostEqual(statement['amount_due'], 1100)

    def test_aging_interval_setting(self):
        self.env.company.statement_aging_interval = 15
        statement = self._statement('outstanding', date_to='2026-02-28')
        self.assertEqual([bucket['label'] for bucket in statement['aging']],
                         ['Not Due', '1-15', '16-30', '31-45', '46-60', 'Over 60'])
        aging = {bucket['key']: bucket['amount'] for bucket in statement['aging']}
        self.assertAlmostEqual(aging['p1'], 700)  # 19 days
        self.assertAlmostEqual(aging['p2'], 400)  # 45 days
        with self.assertRaises(ValidationError):
            self.env.company.statement_aging_interval = 0

    def test_contact_rolls_up_to_company(self):
        statement = self._statement(partners=self.contact)
        self.assertEqual(statement['partner'], self.customer)
        self.assertAlmostEqual(statement['closing_balance'], 1500)

    def test_pending_payment_without_journal_entry(self):
        """A payment 'In Process' (no outstanding account) has no journal entry yet: it still counts."""
        # Behave as with the Accounting app and a payment method without outstanding account.
        self.company_data['default_journal_bank'].inbound_payment_method_line_ids.payment_account_id = False
        with patch.object(type(self.env['account.move']), '_get_invoice_in_payment_state', lambda move: 'in_payment'):
            payment = self._register_payment(self.invoice_2, amount=200, payment_date='2026-02-26')
        self.assertFalse(payment.move_id)
        self.assertEqual(payment.state, 'in_process')
        statement = self._statement()
        self.assertEqual(statement['activity'][-1]['credit'], 200)
        self.assertAlmostEqual(statement['closing_balance'], 1300)
        outstanding = self._statement('outstanding')
        by_name = {item['name']: item for item in outstanding['outstanding']}
        self.assertAlmostEqual(by_name[self.invoice_2.name]['residual'], 300)
        self.assertAlmostEqual(outstanding['amount_due'], 1300)

    def test_skip_empty(self):
        self.assertIsNone(self._statement(partners=self.other_customer, skip_empty=True))
        statement = self._statement(partners=self.other_customer, skip_empty=False)
        self.assertEqual(statement['closing_balance'], 0)

    def test_other_company_is_refused(self):
        other_company = self.env['res.company'].create({'name': 'Not Mine'})
        user = self.env['res.users'].create({
            'name': 'Billing user',
            'login': 'statement_billing_user',
            'group_ids': [fields.Command.set([self.env.ref('account.group_account_invoice').id])],
        })
        with self.assertRaises(Exception):
            self.report.with_user(user)._get_options({'options': {'company_id': other_company.id}})

    # ------------------------------------------------------------------
    # Wizard and outputs
    # ------------------------------------------------------------------

    def test_wizard_defaults_from_customers(self):
        wizard = self.env['customer.statement.wizard'].with_context(
            active_model='res.partner', active_ids=self.customer.ids).create({})
        self.assertEqual(wizard.partner_ids, self.customer)
        self.assertEqual(wizard.statement_type, 'activity')
        self.assertTrue(wizard.date_from)

    def test_wizard_dates_check(self):
        with self.assertRaises(ValidationError):
            self._wizard(date_from='2026-03-01', date_to='2026-02-01')

    def test_wizard_nothing_to_print(self):
        wizard = self._wizard(partner_ids=[fields.Command.set(self.other_customer.ids)])
        with self.assertRaises(UserError):
            wizard.action_print_pdf()

    def test_print_pdf_action_and_html(self):
        action = self._wizard().action_print_pdf()
        self.assertEqual(action['type'], 'ir.actions.report')
        self.assertEqual(action['report_name'], 'tk_customer_statements.customer_report_template')
        html = self.env['ir.actions.report']._render_qweb_html(
            'tk_customer_statements.customer_report_template_action', self.customer.ids, data=action['data'])[0]
        html = html.decode()
        for expected in ('Statement of Account', self.customer.name, self.invoice_1.name, 'Opening Balance',
                         'Aging of Balance Due', 'Authorised Signatory'):
            self.assertIn(expected, html)

    def test_print_from_partner_without_options(self):
        """Printing from the Print menu of a customer gives what is outstanding today."""
        html = self.env['ir.actions.report']._render_qweb_html(
            'tk_customer_statements.customer_report_template_action', self.customer.ids)[0].decode()
        self.assertIn('Statement of Outstanding Invoices', html)
        self.assertIn(self.invoice_2.name, html)

    def test_letterhead_layout(self):
        self.env.company.statement_header_image = base64.b64encode(
            b'GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,'
            b'\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;')
        report = self.env.ref('tk_customer_statements.customer_report_template_action')
        self.assertEqual(report.get_paperformat(), self.env.ref('tk_customer_statements.paperformat_customer_statement'))
        html = self.env['ir.actions.report']._render_qweb_html(report, self.customer.ids)[0].decode()
        self.assertIn('alt="Letterhead"', html)

    def test_export_xlsx(self):
        wizard = self._wizard(partner_ids=[fields.Command.set((self.customer | self.other_customer).ids)], skip_empty=False)
        action = wizard.action_export_xlsx()
        self.assertEqual(action['type'], 'ir.actions.act_url')
        self.assertIn('field=report_file', action['url'])
        self.assertTrue(wizard.report_filename.endswith('.xlsx'))
        content = base64.b64decode(wizard.report_file)
        with zipfile.ZipFile(io.BytesIO(content)) as xlsx:
            workbook = xlsx.read('xl/workbook.xml').decode()
            shared = xlsx.read('xl/sharedStrings.xml').decode()
        self.assertIn('Summary', workbook)
        self.assertIn(self.customer.name, workbook)
        self.assertIn(self.invoice_1.name, shared)

    def test_send_email_single_opens_composer(self):
        action = self._wizard().action_send_email()
        self.assertEqual(action['res_model'], 'mail.compose.message')
        composer = Form(self.env['mail.compose.message'].with_context(action['context']))
        self.assertEqual(len(composer.attachment_ids), 1)
        self.assertIn(self.contact, composer.partner_ids)
        composer.save().action_send_mail()
        message = self.customer.message_ids[0]
        self.assertEqual(len(message.attachment_ids), 1)
        self.assertIn(self.contact, message.partner_ids)

    def test_send_email_batch(self):
        second = self.env['res.partner'].create({'name': 'Second Customer', 'email': 'second@example.com'})
        self._create_customer_invoice(second, '2026-02-01', 250)
        no_email = self.env['res.partner'].create({'name': 'No Email Customer'})
        self._create_customer_invoice(no_email, '2026-02-01', 50)
        wizard = self._wizard(partner_ids=[fields.Command.set((self.customer | second | no_email).ids)])
        action = wizard.action_send_email()
        self.assertEqual(action['tag'], 'display_notification')
        self.assertIn('2 statement(s) sent', action['params']['message'])
        self.assertIn('No Email Customer', action['params']['message'])
        for partner, recipient in ((self.customer, self.contact), (second, second)):
            message = partner.message_ids[0]
            self.assertEqual(len(message.attachment_ids), 1)
            self.assertIn(recipient, message.partner_ids)
        self.assertFalse(no_email.message_ids.filtered(lambda m: m.attachment_ids))

    def test_all_customers(self):
        wizard = self._wizard(all_customers=True, partner_ids=False)
        statements, _options = wizard._get_statements()
        self.assertIn(self.customer, [statement['partner'] for statement in statements])
        self.assertNotIn(self.other_customer, [statement['partner'] for statement in statements])
