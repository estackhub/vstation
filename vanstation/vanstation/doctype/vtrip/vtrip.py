# Copyright (c) 2022, Gross Invents and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.naming import make_autoname

class VTrip(Document):
	#pass
	def autoname(self):
		"""get company abbrivation and apply to name"""		
		#coy = frappe.get_doc('Company', self.company)
		coy = frappe.db.sql("select abbr from tabCompany where name=%s", self.company)[0][0]
		
		#print(f'\n\n\n\n valid  : {coy.abbr} \n\n\n\n')
		name_key = coy+'-TC.YYYY.'+'-.######' 
		self.name = make_autoname(name_key)
		self.trip_code = self.name
		
		
