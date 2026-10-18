# -*- coding: utf-8 -*-
"""Upgrade from 1.0, where the letterhead and the stamp were image files inside the module.

They are now settings of the company (Settings > Invoicing > Customer Statements). Copy the
images that version 1.0 printed onto the companies that have none yet, so statements look the
same after the upgrade. Bank details and wording are now taken from the company settings too.
"""
import base64
import logging

from odoo import SUPERUSER_ID, api
from odoo.tools.misc import file_open

_logger = logging.getLogger(__name__)

LEGACY_IMAGES = {
    'statement_header_image': 'tk_customer_statements/static/img/header.jpeg',
    'statement_signature': 'tk_customer_statements/static/img/stamp.jpeg',
}


def migrate(cr, version):
    if not version:
        return
    env = api.Environment(cr, SUPERUSER_ID, {})
    companies = env['res.company'].search([])
    for field_name, path in LEGACY_IMAGES.items():
        try:
            with file_open(path, 'rb') as image:
                content = base64.b64encode(image.read())
        except FileNotFoundError:
            continue
        targets = companies.filtered(lambda company: not company[field_name])
        if targets:
            targets.write({field_name: content})
            _logger.info("Customer statements: %s copied to %s", path, ', '.join(targets.mapped('name')))
