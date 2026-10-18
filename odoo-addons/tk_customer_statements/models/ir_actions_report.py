# -*- coding: utf-8 -*-
from odoo import models

STATEMENT_REPORT = 'tk_customer_statements.customer_report_template'


class IrActionsReport(models.Model):
    _inherit = 'ir.actions.report'

    def get_paperformat(self):
        # A letterhead banner needs its own top margin; the standard layout uses the company's format.
        if self.report_name == STATEMENT_REPORT and self.env.company.statement_header_image:
            paperformat = self.env.ref('tk_customer_statements.paperformat_customer_statement',
                                       raise_if_not_found=False)
            if paperformat:
                return paperformat
        return super().get_paperformat()
