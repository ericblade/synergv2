enyo.kind({
	name: "TelephoneView",
	kind: "VFlexBox",
	published: {
		"phoneNumber":"",
		"phones":"",
	},
	events: {
		"onDialpadClick":"",
		"onBack":"",
	},
	components: [
		{ name: "PlaceCall", kind: "PalmService", service: "palm://com.ericblade.synergv.service", method: "startCall", onSuccess: "callStarted", onFailure: "callFailed" },
		{ name: "EndCall", kind: "PalmService", service: "palm://com.ericblade.synergv.service", method: "cancelCall", onSuccess: "callEnded", onFailure: "callEndFailed" },
		{ kind: "HFlexBox", flex: 1, components:
			[
				{ kind: "Spacer", },
				{ kind: "VFlexBox", components:
					[
						{ kind: "Group", caption: "Call Info", style: "max-width: 480px;", components:
							[
								{ kind: "HFlexBox", components:
									[
										{ content: "To", pack: "center", align: "center", },
										{ name: "toInput", kind: "Input" },
										{ kind: "Button", caption: "<<", onclick: "deleteLastNumber" },
									]
								}
							]
						},
						{ kind: "Group", caption: "Dialpad", style: "max-width: 480px;", components:
							[
								{ kind: "HFlexBox", components:
									[
										{ kind: "Button", flex: 1, content: "1", className: "dialpadbutton", onclick: "dialpadClick", components:
											[
												{ content: "" },
												{ content: "1" },
											]
										},
										{ kind: "Button", flex: 1, content: "2", className: "dialpadbutton", onclick: "dialpadClick", components:
											[
												{ content: "ABC" },
												{ content: "2" },
											]
										},
										{ kind: "Button", flex: 1, content: "3", className: "dialpadbutton", onclick: "dialpadClick", components:
											[
												{ content: "DEF" },
												{ content: "3" },
											]
										},
									]
								},
								{ kind: "HFlexBox", components:
									[
										{ kind: "Button", flex: 1, content: "4", className: "dialpadbutton", onclick: "dialpadClick", components:
											[
												{ content: "GHI" },
												{ content: "4" },
											]
										},
										{ kind: "Button", flex: 1, content: "5", className: "dialpadbutton", onclick: "dialpadClick", components:
											[
												{ content: "JKL" },
												{ content: "5" },
											]
										},
										{ kind: "Button", flex: 1, content: "6", className: "dialpadbutton", onclick: "dialpadClick", components:
											[
												{ content: "MNO" },
												{ content: "6" },
											]
										},
									]
								},
								{ kind: "HFlexBox", components:
									[
										{ kind: "Button", flex: 1, content: "7", className: "dialpadbutton", onclick: "dialpadClick", components:
											[
												{ content: "PQRS" },
												{ content: "7" },
											]
										},
										{ kind: "Button", flex: 1, content: "8", className: "dialpadbutton", onclick: "dialpadClick", components:
											[
												{ content: "TUV" },
												{ content: "8" },
											]
										},
										{ kind: "Button", flex: 1, content: "9", className: "dialpadbutton", onclick: "dialpadClick", components:
											[
												{ content: "WXYZ" },
												{ content: "9" },
											]
										},
									]
								},
								{ kind: "HFlexBox", components:
									[
										{ kind: "Button", flex: 1, content: "*", className: "dialpadbutton", onclick: "dialpadClick", components:
											[
												{ content: "*" },
												{ content: "" },
											]
										},
										{ kind: "Button", flex: 1, content: "0", className: "dialpadbutton", onclick: "dialpadClick", components:
											[
												{ content: "0" },
												{ content: "" },
											]
										},
										{ kind: "Button", flex: 1, content: "#", className: "dialpadbutton", onclick: "dialpadClick", components:
											[
												{ content: "#" },
												{ content: "" },
											]
										},
									]
								},
								
							]
						},
						{ kind: "Group", caption: "Origination Phone", components:
							[
								{ kind: "HFlexBox", components:
									[
										{ name: "PhoneSelector", kind: "ListSelector", style: "padding-left: 2px; padding-right: 2px;", flex: 1, value: "My Cell", items: [ "Select Phone", "My Cell", "Home", "Work" ] },
									]
								}
							]
						},
						{ name: "PlaceCallButton", kind: "Button", caption: "Place Call", className: "enyo-button-affirmative", onclick: "placeOrEndCall" },
					]
				},
				{ kind: "Spacer" },
			]
		},
		{ kind: "Toolbar", components:
			[
				{ name: "BackButton", icon: "images/back.png", onclick: "doBack" },
				{ name: "RedialButton", caption: "Redial", onclick: "redial", disabled: true },
			]
		}
    ],
	// TODO: should we keep track of call history? i guess there's a "Placed" button for that. We could theoretically load Placed, Received, Missed together .. hmm
	redial: function() {
		if(this.lastNumberCalled) {
			this.setPhoneNumber(this.lastNumberCalled);
			this.placeOrEndCall();
		}
	},
	callStarted: function() {
		this.log("callStarted");
		this.onCall = true;
		this.$.RedialButton.setDisabled(true);
		this.$.PlaceCallButton.setCaption("End Call");
		this.$.PlaceCallButton.addRemoveClass("enyo-button-negative", this.onCall);
	},
	callFailed: function() {
		// TODO: implement a UI message
		this.log("callFailed");
		this.onCall = false;
		this.$.RedialButton.setDisabled(false);
		this.$.PlaceCallButton.setCaption("Place Call");
		this.$.PlaceCallButton.addRemoveClass("enyo-button-negative", this.onCall);
	},
	callEnded: function() {
		this.log("callEnded");
		this.onCall = false;
		this.$.RedialButton.setDisabled(false);
		this.$.PlaceCallButton.setCaption("Place Call");
		this.$.PlaceCallButton.addRemoveClass("enyo-button-negative", this.onCall);
	},
	callEndFailed: function() {
		// TODO: implement a UI message
		this.log("callEndFailed");
	},
	placeOrEndCall: function(inSender, inEvent)
	{
		if(this.onCall)
		{
			this.$.EndCall.call({ accountId: enyo.application.accountId }); 
			this.$.PlaceCallButton.setCaption("Place Call");
			this.onCall = false;
		} else {
			this.onCall = true;
			this.$.RedialButton.setDisabled(true);
			var phone = this.getPhoneIndexByName(this.$.PhoneSelector.getValue());
			
			this.lastNumberCalled = this.$.toInput.getValue();
			
			this.$.PlaceCall.call({
				accountId: enyo.application.accountId,
				outgoingNumber: this.$.toInput.getValue(),
				forwardingNumber: this.phones[phone].phoneNumber,
				phoneType: this.phones[phone].type
			});
			this.$.PlaceCallButton.setCaption("End Call"); // yes, keep the multiple settings of it, just so we're sure
		}
		this.$.PlaceCallButton.addRemoveClass("enyo-button-negative", this.onCall);
	},
	phonesChanged: function() {
		var phoneItems = [];
		if(this.phones.length > 0) {
			for(var x = 0; x < this.phones.length; x++) {
				phoneItems.push(this.phones[x].name);
			}
			this.$.PhoneSelector.setItems(phoneItems);
			this.$.PhoneSelector.setValue(this.phones[0].name); // TODO: need to save the last selected phone for this account, and restore it
		} else {
			this.$.PhoneSelector.setItems([ "NO PHONES CONFIGURED!" ]);
			this.$.PhoneSelect.setValue("NO PHONES CONFIGURED!");
		}
	},
	getPhoneIndexByName: function(str) {
		var phoneItems = [];
		for(var x = 0; x < this.phones.length; x++) {
			phoneItems.push(this.phones[x].name);
		}
		return phoneItems.indexOf(str);
	},
	phoneNumberChanged: function() {
		this.$.toInput.setValue(this.phoneNumber);
	},
    dialpadClick: function(inSender, inEvent)
    {
        this.log("dialpadClick", inSender, inEvent);
        this.doDialpadClick(inSender.content);
		this.$.toInput.setValue(this.$.toInput.getValue() + inSender.content.substring(0,1));
        inEvent.stopPropagation();
        return true;
    },
	deleteLastNumber: function(inSender, inEvent)
	{
		var str = this.$.toInput.getValue();
		this.$.toInput.setValue(str.substring(0, str.length-1));
		inEvent.stopPropagation();
		return true;
	}
});
