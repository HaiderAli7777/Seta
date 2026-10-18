# -*- coding: utf-8 -*-
# Copyright 2020-Today TechKhedut.
# Part of TechKhedut. See LICENSE file for full copyright and licensing details.
from collections import defaultdict

from odoo import _, api, fields, models
from odoo.exceptions import AccessError, UserError

STATEMENT_TYPES = [
    ('activity', "Account Activity"),
    ('outstanding', "Outstanding Invoices"),
]


class CustomerStatementReport(models.AbstractModel):
    """
    Builds customer statements from the receivable journal items, so that invoices,
    credit notes, payments, refunds and manual entries all count, and the balance
    printed always agrees with the customer's receivable account.

    The same data feeds the PDF, the Excel export and the emails sent from the wizard.
    """
    _name = 'report.tk_customer_statements.customer_report_template'
    _description = 'Customer Statement Report'

    # ------------------------------------------------------------------
    # Options
    # ------------------------------------------------------------------

    @api.model
    def _get_options(self, data=None):
        """Normalise the options given by the wizard (``data['options']``) or the context.

        Without options (printing from the Print menu or an email template), the
        statement lists what is outstanding today.
        """
        given = dict((data or {}).get('options') or self.env.context.get('customer_statement_options') or {})
        company = self.env['res.company'].browse(given.get('company_id') or self.env.company.id)
        if company not in self.env.user.company_ids:
            raise AccessError(_("You cannot print statements for %s.", company.display_name))
        date_to = fields.Date.to_date(given.get('date_to')) or fields.Date.context_today(self)
        statement_type = given.get('statement_type') or 'outstanding'
        date_from = fields.Date.to_date(given.get('date_from'))
        if statement_type == 'activity' and not date_from:
            date_from = company.compute_fiscalyear_dates(date_to)['date_from']
        if date_from and date_from > date_to:
            raise UserError(_("The start date cannot be after the end date."))
        return {
            'company': company,
            'statement_type': statement_type,
            'date_from': date_from if statement_type == 'activity' else False,
            'date_to': date_to,
            'show_aging': given.get('show_aging', True),
            'skip_empty': given.get('skip_empty', False),
        }

    # ------------------------------------------------------------------
    # Data
    # ------------------------------------------------------------------

    @api.model
    def _get_receivable_domain(self, partners, company, date_to):
        return [
            ('partner_id', 'child_of', partners.ids),
            ('account_id.account_type', '=', 'asset_receivable'),
            ('parent_state', '=', 'posted'),
            ('company_id', 'child_of', company.id),
            ('date', '<=', date_to),
        ]

    @api.model
    def _get_entry_label(self, move):
        if move.move_type == 'out_invoice':
            return _("Invoice")
        if move.move_type == 'out_refund':
            return _("Credit Note")
        if move.move_type == 'out_receipt':
            return _("Receipt")
        if move.origin_payment_id:
            return _("Refund") if move.origin_payment_id.payment_type == 'outbound' else _("Payment")
        if move.statement_line_id:
            return _("Bank Payment")
        return _("Journal Entry")

    @api.model
    def _get_entry_reference(self, move, lines):
        if move.origin_payment_id and move.origin_payment_id.memo:
            return move.origin_payment_id.memo
        if move.ref:
            return move.ref
        names = {name for name in lines.mapped('name') if name and name != move.name}
        return ', '.join(sorted(names))

    @api.model
    def _get_residual_at_date(self, line, date_to):
        """Residual of a receivable line on ``date_to``: reconciliations dated later don't count yet."""
        residual = line.balance
        residual -= sum(p.amount for p in line.matched_credit_ids if p.max_date <= date_to)
        residual += sum(p.amount for p in line.matched_debit_ids if p.max_date <= date_to)
        return residual

    @api.model
    def _get_aging_columns(self, company):
        step = company.statement_aging_interval or 30
        columns = [{'key': 'current', 'label': _("Not Due"), 'max': 0}]
        for index in range(4):
            low, high = index * step + 1, (index + 1) * step
            columns.append({'key': 'p%s' % index, 'label': "%s-%s" % (low, high), 'max': high})
        columns.append({'key': 'older', 'label': _("Over %s", 4 * step), 'max': None})
        return columns

    @api.model
    def _get_pending_payments(self, partner_ids, company, date_to):
        """Customer payments registered without a journal entry yet (payment method without an
        outstanding account, 'In Process' until the bank statement is reconciled). They are not
        in the receivable account, but the customer has paid: the statement must show them."""
        return self.env['account.payment'].sudo().search([
            ('partner_id', 'in', partner_ids),
            ('partner_type', '=', 'customer'),
            ('state', '=', 'in_process'),
            ('move_id', '=', False),
            ('company_id', 'child_of', company.id),
            ('date', '<=', date_to),
        ], order='date, id')

    @api.model
    def _get_statements(self, partners, options):
        """Return one statement dict per commercial partner, in the order of ``partners``."""
        company = options['company']
        currency = company.currency_id
        date_from, date_to = options['date_from'], options['date_to']
        commercial_partners = partners.commercial_partner_id
        if not commercial_partners:
            return []

        # Statements are needed by sales people and managers who may not read accounting
        # entries themselves: access is granted by the menu/wizard groups, data is limited
        # to the company checked in _get_options.
        AccountMoveLine = self.env['account.move.line'].sudo()
        domain = self._get_receivable_domain(commercial_partners, company, date_to)
        partner_ids = self.env['res.partner'].with_context(active_test=False).search(
            [('id', 'child_of', commercial_partners.ids)]).ids

        # Outstanding items on date_to: not reconciled yet, or reconciled only afterwards.
        late_partials = self.env['account.partial.reconcile'].sudo().search([
            ('max_date', '>', date_to),
            ('company_id', 'child_of', company.id),
            '|', ('debit_move_id.partner_id', 'in', partner_ids), ('credit_move_id.partner_id', 'in', partner_ids),
        ])
        late_line_ids = (late_partials.debit_move_id | late_partials.credit_move_id).ids
        open_lines = AccountMoveLine.search(
            domain + ['|', ('reconciled', '=', False), ('id', 'in', late_line_ids)],
            order='date_maturity, date, id',
        )
        open_by_partner = defaultdict(lambda: AccountMoveLine)
        for line in open_lines:
            open_by_partner[line.partner_id.commercial_partner_id] |= line

        pending_by_partner = defaultdict(lambda: self.env['account.payment'])
        for payment in self._get_pending_payments(partner_ids, company, date_to):
            pending_by_partner[payment.partner_id.commercial_partner_id] |= payment

        opening = defaultdict(float)
        lines_by_partner = defaultdict(lambda: AccountMoveLine)
        if date_from:
            for partner, balance in AccountMoveLine._read_group(
                    domain + [('date', '<', date_from)], ['partner_id'], ['balance:sum']):
                opening[partner.commercial_partner_id] += balance
            for line in AccountMoveLine.search(domain + [('date', '>=', date_from)], order='date, move_name, id'):
                lines_by_partner[line.partner_id.commercial_partner_id] |= line

        aging_columns = self._get_aging_columns(company)
        statements = []
        for partner in commercial_partners:
            pending = pending_by_partner[partner]
            opening_balance = 0.0
            activity = []
            if date_from:
                opening_balance = currency.round(opening[partner] + sum(
                    -payment.amount_company_currency_signed for payment in pending if payment.date < date_from))
                activity = self._get_activity(
                    lines_by_partner[partner], pending.filtered(lambda p: p.date >= date_from),
                    opening_balance, currency)
            outstanding = self._get_outstanding(open_by_partner[partner], pending, date_to, currency)

            if options['skip_empty'] and not activity and not outstanding and currency.is_zero(opening_balance):
                continue

            aging = dict.fromkeys([column['key'] for column in aging_columns], 0.0)
            for item in outstanding:
                for column in aging_columns:
                    if column['max'] is None or item['days_overdue'] <= column['max']:
                        aging[column['key']] += item['residual']
                        break
            total_debit = currency.round(sum(entry['debit'] for entry in activity))
            total_credit = currency.round(sum(entry['credit'] for entry in activity))
            amount_due = currency.round(sum(item['residual'] for item in outstanding))
            statements.append({
                'partner': partner,
                'currency': currency,
                'opening_balance': opening_balance,
                'total_debit': total_debit,
                'total_credit': total_credit,
                'closing_balance': currency.round(opening_balance + total_debit - total_credit) if date_from else amount_due,
                'activity': activity,
                'outstanding': outstanding,
                'total_amount': currency.round(sum(item['amount'] for item in outstanding)),
                'total_paid': currency.round(sum(item['paid'] for item in outstanding)),
                'amount_due': amount_due,
                'overdue': currency.round(sum(item['residual'] for item in outstanding
                                              if item['days_overdue'] > 0 and item['residual'] > 0)),
                'aging': [dict(column, amount=currency.round(aging[column['key']])) for column in aging_columns],
            })
        return statements

    @api.model
    def _get_activity(self, lines, pending_payments, opening_balance, currency):
        """One row per journal entry (and per pending payment) of the period, with running balance."""
        entries = []
        moves = defaultdict(lambda: lines.browse())
        for line in lines:
            moves[line.move_id] |= line
        for move, move_lines in moves.items():
            maturities = [d for d in move_lines.mapped('date_maturity') if d]
            entries.append({
                'date': move_lines[0].date,
                'name': move.name,
                'type': self._get_entry_label(move),
                'reference': self._get_entry_reference(move, move_lines),
                'due_date': min(maturities) if move.is_invoice(include_receipts=True) and maturities else False,
                'amount': currency.round(sum(move_lines.mapped('balance'))),
            })
        for payment in pending_payments:
            entries.append({
                'date': payment.date,
                'name': payment.name,
                'type': _("Payment") if payment.payment_type == 'inbound' else _("Refund"),
                'reference': payment.memo or '',
                'due_date': False,
                'amount': currency.round(-payment.amount_company_currency_signed),
            })
        entries.sort(key=lambda entry: (entry['date'], entry['name'] or ''))

        activity = []
        running = opening_balance
        for entry in entries:
            amount = entry.pop('amount')
            if currency.is_zero(amount):
                continue
            running = currency.round(running + amount)
            activity.append(dict(
                entry,
                debit=amount if amount > 0 else 0.0,
                credit=-amount if amount < 0 else 0.0,
                balance=running,
            ))
        return activity

    @api.model
    def _get_outstanding(self, open_lines, pending_payments, date_to, currency):
        """Items open on ``date_to``. Pending payments settle the invoices they were registered
        for, earliest due first; what is left of them is shown as an unapplied credit."""
        items = []
        for line in open_lines:
            residual = currency.round(self._get_residual_at_date(line, date_to))
            if currency.is_zero(residual):
                continue
            move = line.move_id
            items.append({
                'move': move,
                'date': move.invoice_date or line.date,
                'due_date': line.date_maturity or line.date,
                'name': move.name,
                'type': self._get_entry_label(move),
                'reference': self._get_entry_reference(move, line),
                'amount': line.balance,
                'residual': residual,
            })
        for payment in pending_payments:
            remaining = currency.round(-payment.amount_company_currency_signed)
            if remaining < 0:
                for item in sorted(items, key=lambda item: item['due_date']):
                    if item['move'] in payment.invoice_ids and item['residual'] > 0:
                        applied = min(item['residual'], -remaining)
                        item['residual'] = currency.round(item['residual'] - applied)
                        remaining = currency.round(remaining + applied)
                        if currency.is_zero(remaining):
                            break
            if not currency.is_zero(remaining):
                items.append({
                    'move': False,
                    'date': payment.date,
                    'due_date': payment.date,
                    'name': payment.name,
                    'type': _("Payment") if payment.payment_type == 'inbound' else _("Refund"),
                    'reference': payment.memo or '',
                    'amount': remaining,
                    'residual': remaining,
                })

        outstanding = []
        for item in sorted(items, key=lambda item: (item['due_date'], item['name'] or '')):
            if currency.is_zero(item['residual']):
                continue
            item.pop('move')
            item['paid'] = currency.round(item['amount'] - item['residual'])
            item['days_overdue'] = max((date_to - item['due_date']).days, 0) if item['residual'] > 0 else 0
            outstanding.append(item)
        return outstanding

    # ------------------------------------------------------------------
    # QWeb
    # ------------------------------------------------------------------

    @api.model
    def _get_report_values(self, docids, data=None):
        options = self._get_options(data)
        partner_ids = docids or (data or {}).get('partner_ids') or []
        partners = self.env['res.partner'].browse(partner_ids)
        if not partners:
            raise UserError(_("Select at least one customer to print a statement."))
        statements = self._get_statements(partners, options)
        company = options['company']
        return {
            'doc_ids': partners.ids,
            'doc_model': 'res.partner',
            'docs': partners,
            'statements': statements,
            'options': options,
            'company': company,
            'statement_title': self._get_statement_title(options),
            'bank_accounts': company.sudo()._get_statement_bank_accounts(),
            'vat_label': company.account_fiscal_country_id.vat_label or _("Tax ID"),
        }

    @api.model
    def _get_statement_title(self, options):
        if options['statement_type'] == 'activity':
            return _("Statement of Account")
        return _("Statement of Outstanding Invoices")
