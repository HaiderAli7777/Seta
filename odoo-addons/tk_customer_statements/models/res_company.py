# -*- coding: utf-8 -*-
from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class ResCompany(models.Model):
    _inherit = 'res.company'

    def _default_statement_intro(self):
        return _(
            "<p>Please find below the statement of your account as it stands in our books. "
            "If any entry does not agree with your records, kindly let us know within 15 days "
            "of the statement date; otherwise the balance will be considered confirmed.</p>"
        )

    def _default_statement_payment_terms(self):
        return _(
            "<p>Please settle the amount due by bank transfer or cheque on or before the due dates shown. "
            "Quote the invoice numbers as payment reference, or send a copy of this statement "
            "with your payment, so that we can credit your account correctly.</p>"
        )

    statement_intro = fields.Html(
        string="Statement Introduction",
        translate=True,
        default=_default_statement_intro,
        help="Text printed above the transactions on customer statements.",
    )
    statement_payment_terms = fields.Html(
        string="Statement Payment Instructions",
        translate=True,
        default=_default_statement_payment_terms,
        help="Text printed below the transactions on customer statements.",
    )
    statement_bank_ids = fields.Many2many(
        'res.partner.bank',
        'res_company_statement_bank_rel', 'company_id', 'bank_id',
        string="Statement Bank Accounts",
        help="Bank accounts printed on customer statements. "
             "Leave empty to print every bank account of the company.",
    )
    statement_signature = fields.Image(
        string="Statement Signature / Stamp",
        max_width=600, max_height=600,
        help="Image printed above 'Authorised Signatory' on customer statements.",
    )
    statement_header_image = fields.Image(
        string="Statement Letterhead",
        max_width=2400, max_height=800,
        help="Full-width banner printed at the top of every statement page instead of the "
             "standard company header (Settings > General > Document Layout).",
    )
    statement_aging_interval = fields.Integer(
        string="Aging Interval (days)",
        default=30,
        help="Width of each aging column on statements: 30 gives 1-30, 31-60, 61-90, 91-120 and older.",
    )

    @api.constrains('statement_aging_interval')
    def _check_statement_aging_interval(self):
        for company in self:
            if company.statement_aging_interval < 1:
                raise ValidationError(_("The statement aging interval must be at least one day."))

    def _get_statement_bank_accounts(self):
        """Bank accounts to print on statements: the chosen ones, else all of the company's."""
        self.ensure_one()
        banks = self.statement_bank_ids or self.partner_id.bank_ids
        return banks.filtered('active') if 'active' in banks._fields else banks
