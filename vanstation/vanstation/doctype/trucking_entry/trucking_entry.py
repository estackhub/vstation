# Copyright (c) 2022, Gross Invents and contributors
# For license information, please see license.txt

from re import S
import frappe
from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import now, nowtime

class TruckingEntry(Document):
	#pass		

	def before_insert(self):
		"""get started"""
		coy = frappe.get_doc('Company', self.company)
		# coy = frappe.db.sql(
		# 	"""SELECT abbr FROM `tabCompany` WHERE company_name ='{0}' """
		# 	.format(self.company), as_dict=1,
		# )
		print(f'\n\n\n\n inside  : {coy[0].abbr} \n\n\n\n')
		print(f'\n\n\n\n valid  : {coy.abbr} \n\n\n\n')
		
	
	def autoname(self):
		name_key = self.request_series
		self.name = make_autoname(name_key)
		self.trucking_name = self.name
		#print(f'\n\n\n\n producer : {self.name}\n\n')

	"""
	item_prices_data = frappe.get_all(
            "Item Price",
            fields=["item_code", "price_list_rate", "currency"],
            filters={"price_list": price_list, "item_code": ["in", items]},
        )

        item_prices = {}
        for d in item_prices_data:
            item_prices[d.item_code] = d
		for item in items_data:
            item_code = item.item_code
            item_price = item_prices.get(item_code) or {}
	"""