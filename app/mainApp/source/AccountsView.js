enyo.kind({
	name: "AccountsView",
	kind: "Pane",
	transitionKind: "TestTransition",
	published: {
		accounts: [],
	},
	events: {
		"onSelectedAccount": "",
	},
	accountsResponse: function(inSender, inResponse) {
		this.log(inResponse);
	},
	accountInfoFailed: function(inSender, inResponse) {
		this.log(inResponse);
	},
	toggleSetting: function(inSender) {
		this.log("toggling", inSender.key, inSender.getState());
		var params = {};
		params[inSender.key] = inSender.getState();
		this.$.Preferences.call(params, { method: "setPreferences" });
	},
	prefsSuccess: function(inSender, inResponse, inRequest) {
		this.log(inResponse);
		this.log(inRequest);
		if(inRequest.method == "getPreferences") {
			if(inResponse.synergvSyncOutgoing === undefined) {
			    inResponse.synergvSyncOutgoing = false;
				this.$.Preferences.call({ synergvSyncOutgoing: false }, { method: "setPreferences" });
			}
			if(inResponse.synergvMarkReadOnSync === undefined) {
				inResponse.synergvMarkReadOnSync = true;
				this.$.Preferences.call({ synergvMarkReadOnSync: true }, { method: "setPreferences" });
			}
			if(inResponse.synergvSyncTime === undefined) {
				inResponse.synergvSyncTime = 5;
				this.$.Preferences.call({ synergvSyncTime: 5 }, { method: "setPreferences" });
			}
			if(inResponse.synergvSyncPlacedCalls === undefined) {
				inResponse.synergvSyncPlacedCalls = true;
				this.$.Preferences.call({ synergvSyncPlacedCalls: true }, { method: "setPreferences" });
			}
			if(inResponse.synergvSyncOutgoing !== undefined)
				this.$.OutgoingToggle.setState(inResponse.synergvSyncOutgoing);
			if(inResponse.synergvMarkReadOnSync !== undefined)
				this.$.MarkReadToggle.setState(inResponse.synergvMarkReadOnSync);
			if(inResponse.synergvSyncTime !== undefined) {
			    this.$.SyncTimeSlider.setPosition(inResponse.synergvSyncTime);
				this.$.SyncTimeCaption.setContent(inResponse.synergvSyncTime + " minute" + (inResponse.synergvSyncTime != 1 ? "s" : ""));
			}
			if(inResponse.synergvSyncPlacedCalls !== undefined) {
				this.$.SyncPlacedToggle.setState(inResponse.synergvSyncPlacedCalls);
			}
		}
	},
	syncTimeChanged: function(inSender) {
		this.log();
		this.$.Preferences.call({ synergvSyncTime: this.$.SyncTimeSlider.getPosition() }, { method: "setPreferences" });		
		this.$.SyncTimeCaption.setContent(this.$.SyncTimeSlider.getPosition() + " minute" + (this.$.SyncTimeSlider.getPosition() != 1 ? "s" : ""));
	},
	syncTimeChanging: function(inSender) {
		this.$.SyncTimeCaption.setContent(this.$.SyncTimeSlider.getPosition() + " minute" + (this.$.SyncTimeSlider.getPosition() != 1 ? "s" : ""));		
	},
	components: [
		{ name: "LoadingAccounts", kind: "VFlexBox", components:
			[
				{ content: "Loading Accounts..." },
				{ kind: "Spinner", name: "AccountLoadSpinner", showing: true },
			]
		},
		// TODO: we should have a watch on the accounts, if possible, rather than just hoping we catch the accounts done event in here, so if someone adds an account outside the app
		// while it is running, we update
		{ name: "Preferences", kind: "PalmService", service: "palm://com.palm.systemservice/", onSuccess: "prefsSuccess", onFailure: "prefsFailure" },
		{ name: "getAccounts", kind: "PalmService",
			service: "palm://com.ericblade.synergv.service/", method: "getAccounts",
			onSuccess: "accountsReceived", onFailure: "accountsFailed", 
		},
		{ name: "getAccountInfo", kind: "PalmService",
			service: "palm://com.palm.service.accounts/", method: "getAccountInfo",
			onSuccess: "accountInfoReceived", onFailure: "accountInfoFailed", },
		{ name: "deleteAccount", kind: "PalmService", service: "palm://com.palm.service.accounts", method: "deleteAccount", onSuccess: "accountDeleted" },
		{name: "templates", kind: "Accounts.getTemplates", onGetTemplates_TemplatesAvailable: "onTemplatesAvailable"},
		//{kind: "Accounts.addAccountView", name: "addAccountView", onAddAccount_AccountSelected: "editAccount", onAddAccount_Cancel: "addCancel", capability: ["MESSAGING"], },
		{kind: "AccountsUI", name: "addAccountView", capability: "MESSAGING", onAccountsUI_Done: "addAccountsDone"},
		{ name: "AccountsView", kind: "HFlexBox", components:
			[
				{ kind: "FadeScroller", flex: 1, components:
					[
						{ kind: "Control", className: "box-center", components:
							[
								{ kind: "RowGroup", caption: "Tap an account to use - Swipe an account to delete", components:
									[
										{ name: "AccountRepeater", kind: "VirtualRepeater", onclick: "selectAccount", onSetupRow: "setupAccountRow", components:
											[
												{ name: "AccountItem", kind: "SwipeableItem", onConfirm: "deleteAccount",
												  tapHighlight: true, components:
													[
														{ kind: "HFlexBox", components:
															[
																{ kind: "Image", pack: "center", name: "accountIcon", style: "padding-right: 2px;" },
																{ kind: "VFlexBox", flex: 1, components:
																	[
																		{ name: "accountName" },
																		{ name: "emailAddress", className: "email-address", flex: 1, },
																	]
																}
															]
														},
													]
												}
											]
										},
									]
								},
								{ className: "enyo-item-ternary", content: "Adding an account will sync the last 10 Google Voice conversations automatically." },
								{ className: "enyo-item-ternary", content: "This may take some time to complete, please be patient." },
								{ className: "enyo-item-ternary", content: "You may add as many accounts as you like, but due to limitations in the Messaging app, you will only be able to send messages from the first account added." },
								{ kind: "Button", caption: "Add Account", onclick: "addAccount" },
								{ content: "If you don't have Google Voice(tm) yet, sign up by pressing this:" },
								{ kind: "Button", caption: "Sign up for Google Voice", onclick: "signup" },
								{ kind: "RowGroup", caption: "General Configuration", components:
									[
										{ kind: "Item", layoutKind: "VFlexLayout", components:
											[
												{ kind: "HFlexBox", align: "center", components:
													[
														{ content: "Sync Outgoing Messages", flex: 1 },
														{ name: "OutgoingToggle", kind: "ToggleButton", onChange: "toggleSetting", key: "synergvSyncOutgoing" },
													]
												},
												{ className: "enyo-item-ternary", allowHtml: true, content:
		"Sync sent messages - you may want this if you use other methods to send Google Voice messages, but messages sent from your TouchPad will appear duplicated."},								
											]
										},
										{ kind: "Item", layoutKind: "VFlexLayout", components:
											[
												{ kind: "HFlexBox", align: "center", components:
													[
														{ content: "Mark Synced Messages Read", flex: 1 },
														{ name: "MarkReadToggle", kind: "ToggleButton", onChange: "toggleSetting", key: "synergvMarkReadOnSync" },
													]
												},
												{ className: "enyo-item-ternary", allowHtml: true, content:
		"Mark synced messages Read on the server automatically -- Speeds up future syncs, and conserves battery power." },
											]
										},
										{ kind: "Item", layoutKind: "VFlexLayout", components:
											[
												{ content: "Time delay between syncs" },
												{ className: "enyo-item-ternary", allowHtml: true, content: "A longer delay will result in better battery performance at the expense of longer times between receiving messages" },
												{ name: "SyncTimeSlider", kind: "Slider", maximum: 30, minimum: 1, position: 5, snap: true, onChange: "syncTimeChanged", onChanging: "syncTimeChanging" },
												{ kind: "HFlexBox", pack: "center", components:
													[
														{ name: "SyncTimeCaption", className: "enyo-item-secondary", content: "5 minutes" },
													]
												},
											]
										},
										{ kind: "Item", layoutKind: "VFlexLayout", components:
											[
												{ kind: "HFlexBox", align: "center", components:
													[
														{ content: "Sync Placed Calls to Messaging", flex: 1 },
														{ name: "SyncPlacedToggle", kind: "ToggleButton", onChange: "toggleSetting", key: "synergvSyncPlacedCalls" },
													]
												},
											]
										},
									]
								},
								
								{ name: "BackButton", kind: "Button", caption: "Back to SynerGV", showing: false, onclick: "parentBack", },
							]
						}
					]
				},
			]
		},
		{ name: "WebView", kind: "VFlexBox", lazy: true, components:
			[
				{ kind: "Toolbar", components:
					[
						{ caption: "Return to SynerGV", onclick: "switchToAccountsView" },
					]
				},
				{ kind: "WebView", url: "https://accounts.google.com/NewAccount", flex: 1 },
			]
		}
	],
	deleteAccount: function(inSender, inRow) {
		this.$.deleteAccount.call({ accountId: this.accounts[inRow]._id });
		// time delay to hopefully let us account for the time it takes the system to process the add/remove
		this.selectViewByName("LoadingAccounts");
		setTimeout(enyo.bind(this, function() { this.$.getAccounts.call({}); }), 15000);
	},
	accountDeleted: function(inSender, inEvent, inRequest) {
		// time delay to hopefully let us account for the time it takes the system to process the add/remove
		//this.selectViewByName("LoadingAccounts");
		//setTimeout(enyo.bind(this, this.$.getAccounts.call, { }), 5000);
	},
	addAccount: function() {
		this.selectViewByName("addAccountView");
		this.$.addAccountView.AddAccount([ this.myTemplate ], "MESSAGING");		
	},
	onTemplatesAvailable: function(inSender, inResponse, inRequest) {
		this.log("inResponse=", JSON.stringify(inResponse));
		for(var x = 0; x < inResponse.length; x++) {
			for(var y = 0; y < inResponse[x].capabilityProviders.length; y++) {
				if(inResponse[x].capabilityProviders[y].id == "com.ericblade.synergv.account.im")
				{
					this.myTemplate = inResponse[x]; //.capabilityProviders[y];
					this.log("account template=", JSON.stringify(this.myTemplate));
					break;
				}
			}
		}
		if(this.myTemplate === undefined) {
			console.log("************ DID NOT FIND ACCOUNT TEMPLATE");
		}
	},
	addAccountsDone: function() {
		// time delay to hopefully let us account for the time it takes the system to process the add/remove
		this.selectViewByName("LoadingAccounts");
		setTimeout(enyo.bind(this, function() { this.$.getAccounts.call({}); }), 5000);
	},
	parentBack: function() {
		this.parent.back();
	},
	selectAccount: function(inSender, inEvent) {
		this.doSelectedAccount({ accountId: this.accounts[inEvent.rowIndex]["_id"], num: inEvent.rowIndex });
	},
	rendered: function() {
		this.log();
		this.inherited(arguments);
		if(this.parent.history && this.parent.history.length > 0)
		    this.showBackButton();
		this.$.Preferences.call({ keys: ["synergvSyncOutgoing", "synergvMarkReadOnSync", "synergvSyncTime", "synergvSyncPlacedCalls" ] }, { method: "getPreferences" });
	},
	
	signup: function() {
		this.selectViewByName("WebView");
	},
	switchToAccountsView: function() {
		this.selectViewByName("AccountsView");
	},
	create: function() {
		this.inherited(arguments);
		this.$.getAccounts.call({ });
		if(this.$.BackButton)
			this.$.BackButton.hide();
		this.$.templates.getAccountTemplates({ capability: "MESSAGING", capabilitySubtype: "IM", id: "com.ericblade.synergv.account.im" });
		//this.$.accountsList.getAccountsList();
		//this.$.accounts.getAccounts();
	},
	showBackButton: function() {
		this.$.BackButton.show();
	},
	accountsReceived: function(inSender, inResults, inRequest) {
		if(ServiceResponseLogging)
			this.log("accountsReceived results=", inResults);
		this.accounts = [];
		this.numAccounts = inResults.accounts.length;
		this.numActiveAccounts = 0;
		this.numAccountsReceived = 0;
		for(var x = 0; x < inResults.accounts.length; x++) {
			this.log("querying account", inResults.accounts[x]);
			this.$.getAccountInfo.call({ accountId: inResults.accounts[x] });
		}
		if(this.numAccounts == 0)
		    this.switchToAccountsView();
		this.log("accountsReceived: i expect details on", this.numAccounts, "accounts!");
	},
	accountInfoReceived: function(inSender, inResults, inRequest) {
		this.switchToAccountsView();
		this.$.AccountLoadSpinner.hide();
		if(!inResults.result.beingDeleted)
		{
			this.accounts.push(inResults.result);
			if(this.$.AccountRepeater)
				this.$.AccountRepeater.render();
			this.numActiveAccounts++;
		}
		this.numAccountsReceived++;
		this.log("numAccountsReceived==", this.numAccountsReceived, this.numActiveAccounts);
		if(!this.noAutoClose)
		{
			if(enyo.application.desiredAccountId && enyo.application.desiredAccountId === inResults.result["_id"]) {
				enyo.application.desiredAccountId = undefined;
				this.doSelectedAccount({ accountId: inResults.result["_id"], num: this.accounts.length-1 });
				return;
			}
			if(this.numAccountsReceived >= this.numAccounts && this.numActiveAccounts == 1)
			{
				enyo.application.desiredAccountId = undefined;
				this.doSelectedAccount({ accountId: inResults.result["_id"], num: 0 });
				return;
			}
		}
	},
	setupAccountRow: function(inSender, inRow) {
		if(this.accounts && this.accounts[inRow])
		{
			this.$.AccountItem.addRemoveClass("enyo-single", this.accounts.length == 1);
			this.$.AccountItem.addRemoveClass("enyo-first", this.accounts.length > 1 && inRow === 0)
			this.$.AccountItem.addRemoveClass("enyo-last", inRow == this.accounts.length - 1);
			this.$.AccountItem.addRemoveClass("enyo-middle", this.accounts.length > 1 && inRow > 0 && inRow < this.accounts.length - 1);
			var a = this.accounts[inRow];
			//if(a.icon && a.icon.loc_32x32)
			//    this.$.accountIcon.setSrc(a.icon.loc_32x32);
			this.$.accountIcon.setSrc("images/gvoice32.png");
			this.$.accountName.setContent(a.alias || a.loc_name);
			this.$.emailAddress.setContent(a.username);
			return true;
		}
		return false;
	}
});
