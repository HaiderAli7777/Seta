# -*- coding: utf-8 -*-
import base64
import io
import re

import xlsxwriter

from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError
from odoo.tools.misc import format_date

from ..report.customer_statement_details import STATEMENT_TYPES

REPORT_XMLID = 'tk_customer_statements.customer_report_template_action'


class CustomerStatementWizard(models.TransientModel):
    """
    Prints, exports or emails customer statements for one or several customers.
    """
    _name = 'customer.statement.wizard'
    _description = "Customer Statement"

    def _default_partner_ids(self):
        if self.env.context.get('active_model') == 'res.partner':
            return self.env['res.partner'].browse(self.env.context.get('active_ids') or [])
        return self.env['res.partner']

    def _default_date_from(self):
        today = fields.Date.context_today(self)
        return self.env.company.compute_fiscalyear_dates(today)['date_from']

    company_id = fields.Many2one(
        'res.company', string="Company", required=True,
        default=lambda self: self.env.company,
        domain=lambda self: [('id', 'in', self.env.companies.ids)],
    )
    statement_type = fields.Selection(
        STATEMENT_TYPES, string="Statement", required=True, default='activity',
        help="Account Activity: opening balance, every invoice, credit note and payment of the period, "
             "running balance and closing balance.\n"
             "Outstanding Invoices: what is still open on the statement date, with days overdue.",
    )
    date_from = fields.Date(string="Start Date", default=_default_date_from)
    date_to = fields.Date(string="Statement Date", required=True, default=fields.Date.context_today)
    all_customers = fields.Boolean(
        string="All Customers",
        help="Every customer with a balance or activity for the chosen dates, e.g. for month-end statements.",
    )
    partner_ids = fields.Many2many(
        'res.partner', string="Customers", default=_default_partner_ids,
        help="Contacts are grouped under their company: the statement covers the whole company.",
    )
    show_aging = fields.Boolean(string="Show Aging", default=True)
    skip_empty = fields.Boolean(
        string="Skip Customers Without Activity", default=True,
        help="Leave out customers with no balance and no transactions for the chosen dates.",
    )
    report_file = fields.Binary(string="Report File", readonly=True, attachment=False)
    report_filename = fields.Char(string="Report Filename", readonly=True)

    @api.constrains('date_from', 'date_to', 'statement_type')
    def _check_dates(self):
        for wizard in self:
            if wizard.statement_type == 'activity' and not wizard.date_from:
                raise ValidationError(_("Set a start date for an account activity statement."))
            if wizard.statement_type == 'activity' and wizard.date_from > wizard.date_to:
                raise ValidationError(_("The start date cannot be after the statement date."))

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_report_options(self):
        """Options for the report engine, JSON-serialisable as they travel to the PDF route."""
        self.ensure_one()
        return {
            'company_id': self.company_id.id,
            'statement_type': self.statement_type,
            'date_from': fields.Date.to_string(self.date_from) if self.statement_type == 'activity' else False,
            'date_to': fields.Date.to_string(self.date_to),
            'show_aging': self.show_aging,
            'skip_empty': self.skip_empty,
        }

    def _get_customers(self):
        self.ensure_one()
        if not self.all_customers:
            if not self.partner_ids:
                raise UserError(_("Select the customers to include, or tick All Customers."))
            return self.partner_ids.commercial_partner_id
        groups = self.env['account.move.line'].sudo()._read_group([
            ('account_id.account_type', '=', 'asset_receivable'),
            ('parent_state', '=', 'posted'),
            ('company_id', 'child_of', self.company_id.id),
            ('date', '<=', self.date_to),
            ('partner_id', '!=', False),
        ], ['partner_id'], [])
        return self.env['res.partner'].browse([partner.id for partner, in groups]).commercial_partner_id

    def _get_statements(self):
        """Statements to produce, with customers that have nothing to report already left out."""
        self.ensure_one()
        report = self.env['report.tk_customer_statements.customer_report_template']
        options = report._get_options({'options': self._get_report_options()})
        statements = report._get_statements(self._get_customers(), options)
        if not statements:
            raise UserError(_("No statement to produce: the selected customers have no balance "
                              "and no transactions for these dates."))
        return statements, options

    def _render_statement_pdf(self, partner):
        content, _report_format = self.env['ir.actions.report']._render_qweb_pdf(
            REPORT_XMLID, res_ids=partner.ids, data={'options': self._get_report_options()})
        filename = _("Statement - %(partner)s - %(date)s.pdf",
                     partner=partner.name, date=fields.Date.to_string(self.date_to))
        return self.env['ir.attachment'].create({
            'name': filename,
            'raw': content,
            'mimetype': 'application/pdf',
            'res_model': 'res.partner',
            'res_id': partner.id,
        })

    # ------------------------------------------------------------------
    # Actions
    # ------------------------------------------------------------------

    def action_print_pdf(self):
        self.ensure_one()
        statements, _options = self._get_statements()
        partners = self.env['res.partner'].browse([statement['partner'].id for statement in statements])
        return self.env.ref(REPORT_XMLID).report_action(partners, data={'options': self._get_report_options()})

    def action_export_xlsx(self):
        self.ensure_one()
        statements, options = self._get_statements()
        self.write({
            'report_file': base64.b64encode(self._build_xlsx(statements, options)),
            'report_filename': self._get_xlsx_filename(statements),
        })
        return {
            'type': 'ir.actions.act_url',
            'url': '/web/content/?model=%s&id=%s&field=report_file&filename_field=report_filename&download=true'
                   % (self._name, self.id),
            'target': 'self',
        }

    def action_send_email(self):
        """One customer: open the email composer with the statement attached, to review before sending.
        Several customers: send each one their statement and report what was sent."""
        self.ensure_one()
        statements, _options = self._get_statements()
        template = self.env.ref('tk_customer_statements.mail_template_customer_statement')
        partners = self.env['res.partner'].browse([statement['partner'].id for statement in statements])

        if len(partners) == 1:
            attachment = self._render_statement_pdf(partners)
            return {
                'type': 'ir.actions.act_window',
                'name': _("Send Statement"),
                'res_model': 'mail.compose.message',
                'view_mode': 'form',
                'views': [(False, 'form')],
                'target': 'new',
                'context': {
                    'default_composition_mode': 'comment',
                    'default_model': 'res.partner',
                    'default_res_ids': partners.ids,
                    'default_template_id': template.id,
                    'default_attachment_ids': [attachment.id],
                },
            }

        sent, skipped = self.env['res.partner'], self.env['res.partner']
        for partner in partners:
            recipient = self.env['res.partner'].browse(partner.address_get(['invoice'])['invoice'])
            if not recipient.email:
                skipped |= partner
                continue
            attachment = self._render_statement_pdf(partner)
            partner.message_post_with_source(
                template,
                message_type='comment',
                subtype_xmlid='mail.mt_comment',
                attachment_ids=attachment.ids,
            )
            sent |= partner

        message = _("%s statement(s) sent.", len(sent))
        if skipped:
            message += " " + _("Not sent, no email address: %s.", ", ".join(skipped.mapped('name')))
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _("Customer Statements"),
                'message': message,
                'type': 'warning' if skipped else 'success',
                'sticky': bool(skipped),
                'next': {'type': 'ir.actions.act_window_close'},
            },
        }

    # ------------------------------------------------------------------
    # Excel
    # ------------------------------------------------------------------

    def _get_xlsx_filename(self, statements):
        if len(statements) == 1:
            name = statements[0]['partner'].name
        else:
            name = _("Customers")
        return "%s - %s - %s.xlsx" % (_("Statement"), name, fields.Date.to_string(self.date_to))

    def _build_xlsx(self, statements, options):
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        company = options['company']
        currency = company.currency_id
        decimals = '0.' + '0' * currency.decimal_places if currency.decimal_places else '0'
        money = '#,##%s;[Red]-#,##%s' % (decimals, decimals)
        styles = {
            'title': workbook.add_format({'bold': True, 'font_size': 16}),
            'subtitle': workbook.add_format({'bold': True, 'font_size': 11, 'font_color': '#555555'}),
            'label': workbook.add_format({'bold': True}),
            'text': workbook.add_format({'valign': 'top'}),
            'wrap': workbook.add_format({'text_wrap': True, 'valign': 'top'}),
            'date': workbook.add_format({'num_format': 'yyyy-mm-dd', 'align': 'left'}),
            'head': workbook.add_format({'bold': True, 'bg_color': '#E9ECEF', 'border': 1, 'text_wrap': True, 'valign': 'vcenter'}),
            'head_num': workbook.add_format({'bold': True, 'bg_color': '#E9ECEF', 'border': 1, 'align': 'right', 'text_wrap': True, 'valign': 'vcenter'}),
            'cell': workbook.add_format({'border': 1}),
            'cell_date': workbook.add_format({'border': 1, 'num_format': 'yyyy-mm-dd', 'align': 'left'}),
            'cell_money': workbook.add_format({'border': 1, 'num_format': money}),
            'cell_int': workbook.add_format({'border': 1, 'num_format': '0'}),
            'italic': workbook.add_format({'border': 1, 'italic': True}),
            'italic_money': workbook.add_format({'border': 1, 'italic': True, 'num_format': money}),
            'total': workbook.add_format({'border': 1, 'bold': True, 'top': 2}),
            'total_money': workbook.add_format({'border': 1, 'bold': True, 'top': 2, 'num_format': money}),
        }
        report = self.env['report.tk_customer_statements.customer_report_template']
        title = report._get_statement_title(options)

        if len(statements) > 1:
            self._write_xlsx_summary(workbook, styles, statements, options, title)
        used_names = set()
        for statement in statements:
            sheet = workbook.add_worksheet(self._get_sheet_name(statement['partner'], used_names))
            self._write_xlsx_statement(sheet, styles, statement, options, title)
        workbook.close()
        return output.getvalue()

    @api.model
    def _get_sheet_name(self, partner, used_names):
        base = re.sub(r'[\[\]:*?/\\]', ' ', partner.name or str(partner.id)).strip()[:28] or str(partner.id)
        name, index = base, 1
        while name.lower() in used_names:
            index += 1
            name = "%s %s" % (base[:28 - len(str(index))], index)
        used_names.add(name.lower())
        return name

    def _write_xlsx_summary(self, workbook, styles, statements, options, title):
        sheet = workbook.add_worksheet(_("Summary"))
        company = options['company']
        sheet.write(0, 0, "%s - %s" % (title, company.name), styles['title'])
        sheet.write(1, 0, _("Statement date: %s", format_date(self.env, options['date_to'])), styles['subtitle'])
        headers = [_("Customer"), _("Customer Code")]
        if options['date_from']:
            headers += [_("Opening Balance"), _("Debit"), _("Credit")]
        headers += [_("Balance Due"), _("Overdue")]
        if options['show_aging']:
            headers += [bucket['label'] for bucket in statements[0]['aging']]
        for col, header in enumerate(headers):
            sheet.write(3, col, header, styles['head'] if col < 2 else styles['head_num'])
        row = 4
        for statement in statements:
            values = [statement['partner'].name, statement['partner'].ref or '']
            if options['date_from']:
                values += [statement['opening_balance'], statement['total_debit'], statement['total_credit']]
            values += [statement['closing_balance'], statement['overdue']]
            if options['show_aging']:
                values += [bucket['amount'] for bucket in statement['aging']]
            for col, value in enumerate(values):
                sheet.write(row, col, value, styles['cell'] if col < 2 else styles['cell_money'])
            row += 1
        sheet.write(row, 0, _("Total"), styles['total'])
        sheet.write(row, 1, '', styles['total'])
        for col in range(2, len(headers)):
            column = xlsxwriter.utility.xl_col_to_name(col)
            sheet.write_formula(row, col, '=SUM(%s5:%s%s)' % (column, column, row), styles['total_money'])
        sheet.set_column(0, 0, 36)
        sheet.set_column(1, 1, 14)
        sheet.set_column(2, len(headers) - 1, 15)
        sheet.freeze_panes(4, 1)

    def _write_xlsx_statement(self, sheet, styles, statement, options, title):
        partner = statement['partner']
        company = options['company']
        sheet.write(0, 0, title, styles['title'])
        sheet.write(1, 0, company.name, styles['subtitle'])

        address = "\n".join(filter(None, [partner.name, partner._display_address(without_company=True)]))
        sheet.merge_range(3, 0, 6, 2, address, styles['wrap'])
        info = [(_("Statement Date"), options['date_to'])]
        if options['date_from']:
            info.append((_("Period Start"), options['date_from']))
        info.append((_("Currency"), statement['currency'].name))
        if partner.ref:
            info.append((_("Customer Code"), partner.ref))
        if partner.vat:
            info.append((company.account_fiscal_country_id.vat_label or _("Tax ID"), partner.vat))
        for offset, (label, value) in enumerate(info):
            sheet.write(3 + offset, 4, label, styles['label'])
            if hasattr(value, 'year'):
                sheet.write_datetime(3 + offset, 5, fields.Datetime.to_datetime(value), styles['date'])
            else:
                sheet.write(3 + offset, 5, value, styles['text'])

        row = max(8, 4 + len(info))
        if options['date_from']:
            headers = [_("Date"), _("Number"), _("Type"), _("Reference"), _("Due Date"), _("Debit"), _("Credit"), _("Balance")]
            for col, header in enumerate(headers):
                sheet.write(row, col, header, styles['head'] if col < 5 else styles['head_num'])
            row += 1
            sheet.write_datetime(row, 0, fields.Datetime.to_datetime(options['date_from']), styles['cell_date'])
            sheet.merge_range(row, 1, row, 6, _("Opening Balance"), styles['italic'])
            sheet.write(row, 7, statement['opening_balance'], styles['italic_money'])
            row += 1
            for entry in statement['activity']:
                sheet.write_datetime(row, 0, fields.Datetime.to_datetime(entry['date']), styles['cell_date'])
                sheet.write(row, 1, entry['name'], styles['cell'])
                sheet.write(row, 2, entry['type'], styles['cell'])
                sheet.write(row, 3, entry['reference'] or '', styles['cell'])
                if entry['due_date']:
                    sheet.write_datetime(row, 4, fields.Datetime.to_datetime(entry['due_date']), styles['cell_date'])
                else:
                    sheet.write_blank(row, 4, None, styles['cell'])
                sheet.write(row, 5, entry['debit'] or None, styles['cell_money'])
                sheet.write(row, 6, entry['credit'] or None, styles['cell_money'])
                sheet.write(row, 7, entry['balance'], styles['cell_money'])
                row += 1
            sheet.merge_range(row, 0, row, 4, _("Closing Balance"), styles['total'])
            sheet.write(row, 5, statement['total_debit'], styles['total_money'])
            sheet.write(row, 6, statement['total_credit'], styles['total_money'])
            sheet.write(row, 7, statement['closing_balance'], styles['total_money'])
        else:
            headers = [_("Date"), _("Number"), _("Reference"), _("Due Date"), _("Days Overdue"), _("Amount"), _("Paid"), _("Balance Due")]
            for col, header in enumerate(headers):
                sheet.write(row, col, header, styles['head'] if col < 4 else styles['head_num'])
            row += 1
            for item in statement['outstanding']:
                sheet.write_datetime(row, 0, fields.Datetime.to_datetime(item['date']), styles['cell_date'])
                sheet.write(row, 1, item['name'], styles['cell'])
                sheet.write(row, 2, item['reference'] or item['type'], styles['cell'])
                sheet.write_datetime(row, 3, fields.Datetime.to_datetime(item['due_date']), styles['cell_date'])
                sheet.write(row, 4, item['days_overdue'] or None, styles['cell_int'])
                sheet.write(row, 5, item['amount'], styles['cell_money'])
                sheet.write(row, 6, item['paid'], styles['cell_money'])
                sheet.write(row, 7, item['residual'], styles['cell_money'])
                row += 1
            sheet.merge_range(row, 0, row, 4, _("Total"), styles['total'])
            sheet.write(row, 5, statement['total_amount'], styles['total_money'])
            sheet.write(row, 6, statement['total_paid'], styles['total_money'])
            sheet.write(row, 7, statement['amount_due'], styles['total_money'])

        if options['show_aging']:
            row += 2
            sheet.write(row, 0, _("Aging of Balance Due"), styles['label'])
            row += 1
            for col, bucket in enumerate(statement['aging']):
                sheet.write(row, col, bucket['label'], styles['head_num'])
                sheet.write(row + 1, col, bucket['amount'], styles['cell_money'])
            col = len(statement['aging'])
            sheet.write(row, col, _("Total Due"), styles['head_num'])
            sheet.write(row + 1, col, statement['amount_due'], styles['total_money'])

        sheet.set_column(0, 0, 12)
        sheet.set_column(1, 1, 20)
        sheet.set_column(2, 2, 16)
        sheet.set_column(3, 3, 28)
        sheet.set_column(4, 4, 14)
        sheet.set_column(5, 7, 15)
        sheet.set_paper(9)  # A4
        sheet.fit_to_pages(1, 0)
        sheet.set_landscape()
