// Copyright (c) 2022, Gross Invents and contributors
// For license information, please see license.txt

frappe.ui.form.on('Trucking Entry', {
	//refresh: function(frm) {
		//console.table(frm.doc);
	//}
	
	set_basic_rate: function(frm, cdt, cdn) {
		const item = locals[cdt][cdn];
		item.transfer_qty = flt(item.qty) * 1;

		const args = {
			'item_code'			: item.item_code,
			'posting_date'		: frm.doc.posting_date,
			'posting_time'		: frm.doc.posting_time,
			'warehouse'			: cstr(item.s_warehouse) || cstr(item.t_warehouse),
			'serial_no'			: item.serial_no,
			'company'			: frm.doc.company,
			'qty'				: item.s_warehouse ? -1*flt(item.transfer_qty) : flt(item.transfer_qty),
			'voucher_type'		: frm.doc.doctype,
			'voucher_no'		: item.name,
			'allow_zero_valuation': 1,
		};

		if (item.item_code || item.serial_no) {
			frappe.call({
				method: "erpnext.stock.utils.get_incoming_rate",
				args: {
					args: args
				},
				callback: function(r) {
					frappe.model.set_value(cdt, cdn, 'ste_rate', (r.message || 0.0));
					//frm.events.calculate_basic_amount(frm, item);
				}
			});
		}
	},
	item_code: function(doc, cdt, cdn) {
		var me = this;
		var item = frappe.get_doc(cdt, cdn);
		var update_stock = 0, show_batch_dialog = 0;

		item.weight_per_unit = 0;
		item.weight_uom = '';

		if(['Sales Invoice'].includes(this.frm.doc.doctype)) {
			update_stock = cint(me.frm.doc.update_stock);
			show_batch_dialog = update_stock;

		}
		
		if(item.item_code || item.barcode || item.serial_no) {
			if(!this.validate_company_and_party()) {
				this.frm.fields_dict["items"].grid.grid_rows[item.idx - 1].remove();
			} else {
				return this.frm.call({
					method: "erpnext.stock.get_item_details.get_item_details",
					child: item,
					args: {
						doc: me.frm.doc,
						args: {
							item_code: item.item_code,
							barcode: item.barcode,
							serial_no: item.serial_no,
							batch_no: item.batch_no,
							set_warehouse: me.frm.doc.set_warehouse,
							warehouse: item.warehouse,
							customer: me.frm.doc.customer || me.frm.doc.party_name,
							quotation_to: me.frm.doc.quotation_to,
							supplier: me.frm.doc.supplier,
							currency: me.frm.doc.currency,
							update_stock: update_stock,
							conversion_rate: me.frm.doc.conversion_rate,
							price_list: me.frm.doc.selling_price_list || me.frm.doc.buying_price_list,
							price_list_currency: me.frm.doc.price_list_currency,
							plc_conversion_rate: me.frm.doc.plc_conversion_rate,
							company: me.frm.doc.company,
							order_type: me.frm.doc.order_type,
							is_pos: cint(me.frm.doc.is_pos),
							is_return: cint(me.frm.doc.is_return),
							is_subcontracted: me.frm.doc.is_subcontracted,
							transaction_date: me.frm.doc.transaction_date || me.frm.doc.posting_date,
							ignore_pricing_rule: me.frm.doc.ignore_pricing_rule,
							doctype: me.frm.doc.doctype,
							name: me.frm.doc.name,
							project: item.project || me.frm.doc.project,
							qty: item.qty || 1,
							net_rate: item.rate,
							stock_qty: item.stock_qty,
							conversion_factor: item.conversion_factor,
							weight_per_unit: item.weight_per_unit,
							weight_uom: item.weight_uom,
							manufacturer: item.manufacturer,
							stock_uom: item.stock_uom,
							pos_profile: cint(me.frm.doc.is_pos) ? me.frm.doc.pos_profile : '',
							cost_center: item.cost_center,
							tax_category: me.frm.doc.tax_category,
							item_tax_template: item.item_tax_template,
							child_docname: item.name
						}
					},

					callback: function(r) {
						if(!r.exc) {
							frappe.run_serially([								
								() => {
									// for internal customer instead of pricing rule directly apply valuation rate on item
									if (me.frm.doc.is_internal_customer || me.frm.doc.is_internal_supplier) {
										me.get_incoming_rate(item, me.frm.posting_date, me.frm.posting_time,
											me.frm.doc.doctype, me.frm.doc.company);
									} else {
										me.frm.script_manager.trigger("price_list_rate", cdt, cdn);
									}
								},
								() => me.toggle_conversion_factor(item),
								() => me.conversion_factor(doc, cdt, cdn, true)
							]);
						}
					}
				});
			}
		}
	},
	price_list_rate: function(doc, cdt, cdn) {
		var item = frappe.get_doc(cdt, cdn);
		frappe.model.round_floats_in(item, ["price_list_rate", "discount_percentage"]);

		// check if child doctype is Sales Order Item/Quotation Item and calculate the rate
		if (in_list(["Quotation Item", "Sales Order Item", "Delivery Note Item", "Sales Invoice Item", "POS Invoice Item", "Purchase Invoice Item", "Purchase Order Item", "Purchase Receipt Item"]), cdt)
			this.apply_pricing_rule_on_item(item);
		else
			item.rate = flt(item.price_list_rate * (1 - item.discount_percentage / 100.0),
				precision("rate", item));

		this.calculate_taxes_and_totals();
	},
	
	get_incoming_rate: function(item, posting_date, posting_time, voucher_type, company) {

		let item_args = {
			'item_code': item.item_code,
			'warehouse': in_list('Purchase Receipt', 'Purchase Invoice') ? item.from_warehouse : item.warehouse,
			'posting_date': posting_date,
			'posting_time': posting_time,
			'qty': item.qty * item.conversion_factor,
			'serial_no': item.serial_no,
			'voucher_type': voucher_type,
			'company': company,
			'allow_zero_valuation_rate': item.allow_zero_valuation_rate
		}

		frappe.call({
			method: 'erpnext.stock.utils.get_incoming_rate',
			args: {
				args: item_args
			},
			callback: function(r) {
				frappe.model.set_value(item.doctype, item.name, 'rate', r.message * item.conversion_factor);
			}
		});
	},

	calculate_basic_amount: function(frm, item) {
		item.basic_amount = flt(flt(item.transfer_qty) * flt(item.basic_rate),
			precision("basic_amount", item));
		frm.events.calculate_total_additional_costs(frm);
	},
	
});

frappe.ui.form.on('Trucking Entry Detail', {
	/* refresh(frm){
		console.log(' -- got here: ');
		const item = locals[cdt][cdn];
		if (item.item_code) {
			console.log('return against in refresh -- got here: '+ item.item_code);
		}
	}, */
	item_code: function(frm, cdt, cdn) {
		//console.log('return against in refresh -- got here: ');
		frm.events.set_basic_rate(frm, cdt, cdn);
	},
	qty: function(frm, cdt, cdn) {
		frm.events.set_basic_rate(frm, cdt, cdn);
	},

	conversion_factor: function(frm, cdt, cdn) {
		frm.events.set_basic_rate(frm, cdt, cdn);
	},

	s_warehouse: function(frm, cdt, cdn) {
		frm.events.set_serial_no(frm, cdt, cdn, () => {
			frm.events.get_warehouse_details(frm, cdt, cdn);
		});
	},

	t_warehouse: function(frm, cdt, cdn) {
		frm.events.get_warehouse_details(frm, cdt, cdn);
	},

	basic_rate: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		frm.events.calculate_basic_amount(frm, item);
	},
	
});
