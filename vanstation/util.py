import frappe


@frappe.whitelist()
def get_item_price(self, price_list=None):
    """get both purchase and selling """