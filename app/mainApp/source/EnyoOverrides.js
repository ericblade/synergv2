enyo.kind({
	name: "synergv.DeletePrompt",
	kind: "enyo.DialogPrompt",
	components: [
		{name: "client", className: "enyo-dialog-inner", components: [
			{name: "title", className: "enyo-dialog-prompt-title"},
			{className: "enyo-dialog-prompt-content", components: [
				{name: "message", className: "enyo-dialog-prompt-message"},
				{ kind: "HFlexBox", align: "center", pack: "center", components:
					[
						{name: "acceptButton", className: "enyo-button-negative", flex: 1, kind: "Button", onclick: "acceptClick"},
						{name: "cancelButton", flex: 1, kind: "Button", onclick: "cancelClick"}						
					]
				}
			]}
		]}
	],
});

enyo.kind({
	name: "synergv.ListSelector",
	kind: "ListSelector",
	makePopup: function() {
		this.popup = this.createComponent({
			kind: "PopupList",
			onSelect: "popupSelect",
			onBeforeOpen: "popupBeforeOpen",
			onOpen: "popupOpen",
			onSetupItem: "popupSetupItem",
			defaultKind: this.itemKind,
			className: "list-popup",
			onClose: "popupClose",
		});
	},
	popupOpen: function() {
		var node = this.popup.hasNode();
		Firmin.animate(node, { opacity: 1 }, "0.25s");
	},
	popupClose: function() {
		var node = this.popup.hasNode();
		// haaaaaaaaaax we have to show it again since the close doesn't call this till after. doh.
		this.popup.show();
		Firmin.animate(node, { opacity: 0 }, "0.25s");
	}
})

enyo.kind({
	name: "synergv.Picker",
	kind: "Picker",
	makePopup: function() {
		this.popup = this.createComponent({
			kind: "PopupList",
			className: "enyo-picker-popup list-popup",
			onSelect: "popupSelect",
			onClose: "popupClose",
			onclick: "popupClick",
			onOpen: "popupOpen",
			scrim: this.scrim,
			modal: this.modal
		});
	},
	popupOpen: function() {
		var node = this.popup.hasNode();
		Firmin.animate(node, { opacity: 1 }, "0.25s");
	},
	popupClose: function() {
		this.inherited(arguments);
		var node = this.popup.hasNode();
		this.popup.show();
		Firmin.animate(node, { opacity: 0 }, "0.25s");
	}
});

enyo.kind({
	name: "synergv.IntegerPicker",
	kind: "IntegerPicker",
	components: [
		{name: "label", className: "enyo-picker-label enyo-label"},
		{name: "picker", kind: "synergv.Picker"}
	],	
});