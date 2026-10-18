# -*- coding: utf-8 -*-
from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    statement_intro = fields.Html(related='company_id.statement_intro', readonly=False)
    statement_payment_terms = fields.Html(related='company_id.statement_payment_terms', readonly=False)
    statement_bank_ids = fields.Many2many(related='company_id.statement_bank_ids', readonly=False)
    statement_signature = fields.Image(related='company_id.statement_signature', readonly=False)
    statement_header_image = fields.Image(related='company_id.statement_header_image', readonly=False)
    statement_aging_interval = fields.Integer(related='company_id.statement_aging_interval', readonly=False)
